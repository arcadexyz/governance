// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "./external/council/interfaces/IERC20.sol";
import "./external/council/libraries/History.sol";
import "./external/council/libraries/Storage.sol";

import "./libraries/ARCDVestingVaultStorage.sol";
import "./interfaces/IARCDVestingVault.sol";

import {
    AVV_AlreadyInitialized,
    AVV_NotManager,
    AVV_NotTimelock,
    AVV_InvalidSchedule,
    AVV_InvalidCliffAmount,
    AVV_InsufficientBalance,
    AVV_HasGrant,
    AVV_NoGrantSet,
    AVV_CliffNotReached,
    AVV_AlreadyDelegated,
    AVV_InvalidAmount
} from "./errors/Governance.sol";

/**
 * @title ARCDVestingVault
 * @author Non-Fungible Technologies, Inc.
 *
 * This contract is a vesting vault for the Arcade token. It allows for the creation of grants
 * which can be vested over time. The vault has a manager who can add and remove grants.
 * The vault also has a timelock which can change the manager.
 *
 * @dev There is no emergency withdrawal, any funds not sent via deposit() are unrecoverable
 *      by this version of the VestingVault. When grants are added the contracts will not transfer
 *      in tokens on each add but rather check for solvency via state variables.
 */
abstract contract AbstractARCDVestingVault is IARCDVestingVault {
    // Bring our libraries into scope
    using History for *;
    using ARCDVestingVaultStorage for *;
    using Storage for *;

    // The ERC20 token to use for grants
    IERC20 public immutable token;
    // How far back stale blocks are
    uint256 public immutable staleBlockLag;

    event VoteChange(address indexed to, address indexed from, int256 amount);

    /**
     * @notice Constructs the contract.
     *
     * @param _token              The ERC20 token to grant.
     * @param _stale              Stale block used for voting power calculations
     */
    constructor(IERC20 _token, uint256 _stale, address manager_, address timelock_) {
        token = _token;
        staleBlockLag = _stale;

        Storage.set(Storage.addressPtr("manager"), manager_);
        Storage.set(Storage.addressPtr("timelock"), timelock_);
    }

    /**
     * @notice A single function endpoint for loading grant storage. Returns a
     *         storage mapping which can be used to look up grant data.
     *
     * @dev Only one Grant is allowed per address. Grants SHOULD NOT
     *      be modified.
     */
    function _grants() internal pure returns (mapping(address => ARCDVestingVaultStorage.Grant) storage) {
        // This call returns a storage mapping with a unique non overwrite-able storage location
        // which can be persisted through upgrades, even if they change storage layout
        return (ARCDVestingVaultStorage.mappingAddressToGrantPtr("grants"));
    }

    /**
     * @notice A function to access the storage of the unassigned token value.
     *         The unassigned tokens are not part of any grant and can be used for a future
     *         grant or withdrawn by the manager.
     */
    function _unassigned() internal pure returns (Storage.Uint256 storage) {
        return Storage.uint256Ptr("unassigned");
    }

    /**
     * @notice A function to access the storage of the manager address.
     */
    function _manager() internal pure returns (Storage.Address memory) {
        return Storage.addressPtr("manager");
    }

    /**
     * @notice A function to access the storage of the timelock address.
     */
    function _timelock() internal pure returns (Storage.Address memory) {
        return Storage.addressPtr("timelock");
    }

    /**
     * @notice Modifier to check that the caller is the manager.
     */
    modifier onlyManager() {
        if (msg.sender != _manager().data) revert AVV_NotManager();
        _;
    }

    /**
     * @notice Modifier to check that the caller is the manager.
     */
    modifier onlyTimelock() {
        if (msg.sender != _timelock().data) revert AVV_NotTimelock();
        _;
    }

    /**
     * @notice Getter function for the grants mapping.
     *
     * @param _who            The owner of the grant to query
     */
    function getGrant(address _who) external view returns (ARCDVestingVaultStorage.Grant memory) {
        return _grants()[_who];
    }

    /**
     * @notice Adds a new grant. The manager sets who the voting power will be delegated to initially.
     *         This potentially avoids the need for a delegation transaction by the grant recipient.
     *
     * @param _who                       The Grant recipient.
     * @param _amount                    The total grant value.
     * @param _startTime                 Optionally set a non standard start time. If set to zero
     *                                   then the start time will be made the block tx is in.
     * @param _expiration                Timestamp when the grant ends (all tokens count as unlocked).
     * @param _cliff                     Timestamp when the cliff ends. No tokens are unlocked until
     *                                   this timestamp is reached.
     * @param _delegatee                 The address to delegate the voting power to
     */
    function addGrantAndDelegate(
        address _who,
        uint128 _amount,
        uint128 _cliffAmount,
        uint128 _startTime,
        uint128 _expiration,
        uint128 _cliff,
        address _delegatee
    ) public onlyManager {
        // if no custom start time is needed we use this block.
        if (_startTime == 0) {
            _startTime = uint128(block.number);
        }
        // grant schedule check
        if (_cliff >= _expiration || _startTime >= _expiration || _cliff <= _startTime) revert AVV_InvalidSchedule();

        // cliff check
        if (_cliffAmount >= _amount) revert AVV_InvalidCliffAmount();

        Storage.Uint256 storage unassigned = _unassigned();
        if (unassigned.data < _amount) revert AVV_InsufficientBalance();

        // load the grant
        ARCDVestingVaultStorage.Grant storage grant = _grants()[_who];

        // if this address already has a grant, a different address must be provided
        // topping up or editing active grants is not supported.
        if (grant.allocation != 0) revert AVV_HasGrant();

        // load the delegate. Defaults to the grant owner
        _delegatee = _delegatee == address(0) ? _who : _delegatee;

        // calculate the voting power. Assumes all voting power is initially locked.
        // Come back to this assumption.
        uint128 newVotingPower = _amount;

        // set the new grant
        _grants()[_who] = ARCDVestingVaultStorage.Grant(
            _amount,
            _cliffAmount,
            0,
            _startTime,
            _expiration,
            _cliff,
            false,
            newVotingPower,
            _delegatee
        );

        // update the amount of unassigned tokens
        unassigned.data -= _amount;

        // update the delegatee's voting power
        History.HistoricalBalances memory votingPower = _votingPower();
        uint256 delegateeVotes = votingPower.loadTop(grant.delegatee);
        votingPower.push(grant.delegatee, delegateeVotes + newVotingPower);

        emit VoteChange(grant.delegatee, _who, int256(uint256(newVotingPower)));
    }

    /**
     * @notice Removes a grant. Any withdrawable tokens will be sent to the grant owner.
     *
     * @param _who             The grant owner.
     */
    function removeGrant(address _who) public virtual onlyManager {
        // load the grant
        ARCDVestingVaultStorage.Grant storage grant = _grants()[_who];

        // if the grant has already been removed or no grant available, revert
        if (grant.allocation == 0) revert AVV_NoGrantSet();

        // get the amount of withdrawable tokens
        uint256 withdrawable = grant.allocation - grant.withdrawn;
        // transfer the remaining tokens to the vesting manager
        token.transfer(_manager().data, withdrawable);

        // update the delegatee's voting power
        History.HistoricalBalances memory votingPower = _votingPower();
        uint256 delegateeVotes = votingPower.loadTop(grant.delegatee);
        votingPower.push(grant.delegatee, delegateeVotes - grant.latestVotingPower);

        // Emit the vote change event
        emit VoteChange(grant.delegatee, _who, -1 * int256(uint256(grant.latestVotingPower)));

        // delete the grant
        delete _grants()[_who];
    }

    /**
     * @notice Returns the claimable amount for a given grant.
     *
     * @param _who                    Address to query.
     */
    function claimable(address _who) public view returns (uint256) {
        return _getWithdrawableAmount(_grants()[_who]);
    }

    /**
     * @notice Grant owners use to claim all withdrawable value from a grant. Voting power
     *         is recalculated factoring in the amount withdrawn.
     *
     * @param _amount                 The amount to withdraw.
     */
    function claim(uint256 _amount) public virtual {
        // load the grant
        ARCDVestingVaultStorage.Grant storage grant = _grants()[msg.sender];
        if (grant.cliff > block.number) revert AVV_CliffNotReached();

        // get the withdrawable amount
        uint256 withdrawable = _getWithdrawableAmount(grant);
        if (_amount > withdrawable) revert AVV_InsufficientBalance();
        if (_amount == 0) revert AVV_InvalidAmount();

        if (_amount == withdrawable) {
            grant.withdrawn += uint128(withdrawable);
        } else {
            // update the grant's withdrawn amount
            grant.withdrawn += uint128(_amount);
            withdrawable = _amount;
        }

        // update the user's voting power
        _syncVotingPower(msg.sender, grant);

        // if the cliff has not been claimed, check if it can be claimed
        if (!grant.cliffClaimed) {
            grant.cliffClaimed = true;
        }

        // transfer the available amount
        token.transfer(msg.sender, withdrawable);
    }

    /**
     * @notice Changes the caller's token grant voting power delegation.
     *
     * @param _to              The address to delegate to.
     */
    function delegate(address _to) public {
        ARCDVestingVaultStorage.Grant storage grant = _grants()[msg.sender];
        if (_to == grant.delegatee) revert AVV_AlreadyDelegated();

        History.HistoricalBalances memory votingPower = _votingPower();
        uint256 oldDelegateeVotes = votingPower.loadTop(grant.delegatee);
        uint256 newVotingPower = _currentVotingPower(grant);

        // Remove old delegatee's voting power and emit event
        votingPower.push(grant.delegatee, oldDelegateeVotes - grant.latestVotingPower);
        emit VoteChange(grant.delegatee, msg.sender, -1 * int256(uint256(grant.latestVotingPower)));

        // Note - It is important that this is loaded here and not before the previous state change because if
        // _to == grant.delegatee and re-delegation was allowed we could be working with out of date state.
        uint256 newDelegateeVotes = votingPower.loadTop(_to);

        // add voting power to the target delegatee and emit event
        emit VoteChange(_to, msg.sender, int256(newVotingPower));
        votingPower.push(_to, newDelegateeVotes + newVotingPower);

        // update grant info
        grant.latestVotingPower = uint128(newVotingPower);
        grant.delegatee = _to;
    }

    /**
     * @notice Manager-only token deposit function.  Deposited tokens are added to `_unassigned`
     *         and can be used to create grants.
     *
     * @dev This is the only way to deposit tokens into the contract. Any tokens sent via other
     *      means are not recoverable by this contract.
     *
     * @param _amount           The amount of tokens to deposit.
     */
    function deposit(uint256 _amount) public onlyManager {
        Storage.Uint256 storage unassigned = _unassigned();
        // update unassigned value
        unassigned.data += _amount;
        token.transferFrom(msg.sender, address(this), _amount);
    }

    /**
     * @notice Manager-only token withdrawal function. The manager can only withdraw tokens that
     *         are not being used by a grant.
     *
     * @param _amount           The amount to withdraw.
     * @param _recipient        The address to withdraw to.
     */
    function withdraw(uint256 _amount, address _recipient) public virtual onlyManager {
        Storage.Uint256 storage unassigned = _unassigned();
        if (unassigned.data < _amount) revert AVV_InsufficientBalance();
        // update unassigned value
        unassigned.data -= _amount;
        token.transfer(_recipient, _amount);
    }

    /**
     * @notice Helper to update a delegatee's voting power.
     *
     * @param _who            The address who's voting power we need to sync.
     * @param _grant          The storage pointer to the grant of that user.
     */
    function _syncVotingPower(address _who, ARCDVestingVaultStorage.Grant storage _grant) internal {
        History.HistoricalBalances memory votingPower = _votingPower();

        uint256 delegateeVotes = votingPower.loadTop(_grant.delegatee);

        uint256 newVotingPower = _currentVotingPower(_grant);
        // get the change in voting power. Negative if the voting power is reduced
        int256 change = int256(newVotingPower) - int256(uint256(_grant.latestVotingPower));
        // do nothing if there is no change
        if (change < 0) {
            // if the change is negative, we multiply by -1 to avoid underflow when casting
            votingPower.push(_grant.delegatee, delegateeVotes - uint256(change * -1));
            emit VoteChange(_grant.delegatee, _who, change);

            _grant.latestVotingPower = uint128(newVotingPower);
        }
    }

    /**
     * @notice Loads and returns the voting power of a user. Extra calldata is unused
     *         in this contract.
     *
     * @param user                  The address we want to query.
     * @param blockNumber           The block number to query user's voting power at.
     * @param extraData             Unused.
     */
    function queryVotePower(
        address user,
        uint256 blockNumber,
        bytes calldata extraData
    ) external override returns (uint256) {
        // Get our reference to historical data
        History.HistoricalBalances memory votingPower = _votingPower();
        // Find the historical data and clear everything more than 'staleBlockLag' into the past
        return votingPower.findAndClear(user, blockNumber, block.number - staleBlockLag);
    }

    /**
     * @notice Loads and returns the voting power of a user without changing state.
     *         Extra calldata is unused in this contract.
     *
     * @param user                  The address we want to query.
     * @param blockNumber           The block number to query user's voting power at.
     */
    function queryVotePowerView(address user, uint256 blockNumber) external view returns (uint256) {
        // Get our reference to historical data
        History.HistoricalBalances memory votingPower = _votingPower();
        // Find the historical data
        return votingPower.find(user, blockNumber);
    }

    /**
     * @notice Calculates and returns how much a grant owner can withdraw.
     *
     * @param _grant                    The memory location of the loaded grant.
     */
    function _getWithdrawableAmount(ARCDVestingVaultStorage.Grant memory _grant) internal view returns (uint256) {
        if (block.number < _grant.cliff || block.number < _grant.created) {
            return 0;
        }
        if (block.number >= _grant.expiration) {
            return (_grant.allocation - _grant.withdrawn);
        }
        // if cliff amount has not been claimed and after cliff
        if (block.number >= _grant.cliff && !_grant.cliffClaimed) {
            uint256 unlocked = (_grant.allocation * (block.number - _grant.created)) /
                (_grant.expiration - _grant.created);

            return (uint256(_grant.cliffAmount) + (unlocked - _grant.cliffAmount)) - _grant.withdrawn;
        }
        // if cliff amount has been claimed and after cliff
        if (block.number >= _grant.cliff && _grant.cliffClaimed) {
            uint256 unlocked = (_grant.allocation * (block.number - _grant.created)) /
                (_grant.expiration - _grant.created);

            return unlocked - _grant.withdrawn;
        }
    }

    /**
     * @notice Returns the historical voting power tracker. This is a struct which
     *         functions can push to and find items in block indexed storage.
     */
    function _votingPower() internal pure returns (History.HistoricalBalances memory) {
        // This call returns a storage mapping with a unique non overwrite-able storage location
        // which can be persisted through upgrades, even if they change storage layout.
        return (History.load("votingPower"));
    }

    /**
     * @notice Helper that returns the current voting power of a grant.
     *
     * @param _grant               The grant to check for voting power.
     */
    function _currentVotingPower(ARCDVestingVaultStorage.Grant memory _grant) internal view returns (uint256) {
        uint256 withdrawable = _getWithdrawableAmount(_grant);
        uint256 locked = _grant.allocation - (withdrawable + _grant.withdrawn);

        return (withdrawable + locked);
    }

    /**
     * @notice Function where the timelock can update itself. Can be used in case of
     *         a governance migration.
     *
     * @param timelock_            The new timelock address.
     */
    function setTimelock(address timelock_) public onlyTimelock {
        Storage.set(Storage.addressPtr("timelock"), timelock_);
    }

    /**
     * @notice Function where the timelock can update the manager. Can be used in case the
     *         managers wallet is compromised.
     *
     * @param manager_            The new manager address.
     */
    function setManager(address manager_) public onlyTimelock {
        Storage.set(Storage.addressPtr("manager"), manager_);
    }

    /**
     * @notice Function that returns the current timelock address.
     */
    function timelock() public pure returns (address) {
        return _timelock().data;
    }

    /**
     * @notice Function that returns the current manager address.
     */
    function manager() public pure returns (address) {
        return _manager().data;
    }
}

// Deployable version of the abstract contract
contract ARCDVestingVault is AbstractARCDVestingVault {
    constructor(
        IERC20 _token,
        uint256 _stale,
        address manager_,
        address timelock_
    ) AbstractARCDVestingVault(_token, _stale, manager_, timelock_) {}
}
