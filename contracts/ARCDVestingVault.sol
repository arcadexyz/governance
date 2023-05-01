// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "./external/council/interfaces/IERC20.sol";
import "./external/council/libraries/History.sol";
import "./external/council/libraries/Storage.sol";

import "./libraries/ARCDVestingVaultStorage.sol";
import "./libraries/HashedStorageReentrancyBlock.sol";
import "./interfaces/IARCDVestingVault.sol";

import {
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
 * When a grant is created by a manager, the manager specifies the delegatee. This is the address
 * that will receive the voting power of the grant. The delegatee can be updated by the grant
 * recipient at any time. When a grant is created, there are three time parameters:
 *      created - The block number the grant starts at. If not specified, the current block is used.
 *      cliff - The block number the cliff ends at. No tokens are unlocked until this block is reached.
 *              The cliffAmount parameter is the amount of tokens that will be unlocked at the cliff.
 *      expiration - The block number the grant ends at. All tokens are unlocked at this block.
 *
 * @dev There is no emergency withdrawal, any funds not sent via deposit() are unrecoverable
 *      by this version of the VestingVault. When grants are added the contracts will not transfer
 *      in tokens on each add but rather check for solvency via state variables.
 */
contract ARCDVestingVault is HashedStorageReentrancyBlock, IARCDVestingVault {
    // Bring our libraries into scope
    using History for History.HistoricalBalances;
    using ARCDVestingVaultStorage for ARCDVestingVaultStorage.Grant;
    using Storage for Storage.Address;
    using Storage for Storage.Uint256;

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
     * @param manager_            The address of the manager.
     * @param timelock_           The address of the timelock.
     */
    constructor(IERC20 _token, uint256 _stale, address manager_, address timelock_) {
        token = _token;
        staleBlockLag = _stale;

        Storage.set(Storage.addressPtr("manager"), manager_);
        Storage.set(Storage.addressPtr("timelock"), timelock_);
        Storage.set(Storage.uint256Ptr("entered"), 1);
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

    // ============ Manager Functions ============

    /**
     * @notice Adds a new grant. The manager sets who the voting power will be delegated to initially.
     *         This potentially avoids the need for a delegation transaction by the grant recipient.
     *
     * @param who                        The Grant recipient.
     * @param amount                     The total grant value.
     * @param cliffAmount                The amount of tokens that will be unlocked at the cliff.
     * @param startTime                  Optionally set a non standard start time. If set to zero
     *                                   then the start time will be made the block tx is in.
     * @param expiration                 Timestamp when the grant ends (all tokens count as unlocked).
     * @param cliff                      Timestamp when the cliff ends. No tokens are unlocked until
     *                                   this timestamp is reached.
     * @param delegatee                  The address to delegate the voting power to
     */
    function addGrantAndDelegate(
        address who,
        uint128 amount,
        uint128 cliffAmount,
        uint128 startTime,
        uint128 expiration,
        uint128 cliff,
        address delegatee
    ) public onlyManager {
        // if no custom start time is needed we use this block.
        if (startTime == 0) {
            startTime = uint128(block.number);
        }
        // grant schedule check
        if (cliff >= expiration || startTime >= expiration || cliff < startTime) revert AVV_InvalidSchedule();

        // cliff check
        if (cliffAmount >= amount) revert AVV_InvalidCliffAmount();

        Storage.Uint256 storage unassigned = _unassigned();
        if (unassigned.data < amount) revert AVV_InsufficientBalance();

        // load the grant
        ARCDVestingVaultStorage.Grant storage grant = _grants()[who];

        // if this address already has a grant, a different address must be provided
        // topping up or editing active grants is not supported.
        if (grant.allocation != 0) revert AVV_HasGrant();

        // load the delegate. Defaults to the grant owner
        delegatee = delegatee == address(0) ? who : delegatee;

        // calculate the voting power. Assumes all voting power is initially locked.
        // Come back to this assumption.
        uint128 newVotingPower = amount;

        // set the new grant
        _grants()[who] = ARCDVestingVaultStorage.Grant(
            amount,
            cliffAmount,
            0,
            startTime,
            expiration,
            cliff,
            newVotingPower,
            delegatee
        );

        // update the amount of unassigned tokens
        unassigned.data -= amount;

        // update the delegatee's voting power
        History.HistoricalBalances memory votingPower = _votingPower();
        uint256 delegateeVotes = votingPower.loadTop(grant.delegatee);
        votingPower.push(grant.delegatee, delegateeVotes + newVotingPower);

        emit VoteChange(grant.delegatee, who, int256(uint256(newVotingPower)));
    }

    /**
     * @notice Removes a grant. Any available vested tokens will be sent to the grant recipient.
     *         Any remaining unvested tokens will be sent to the vesting manager.
     *
     * @param who             The grant owner.
     */
    function removeGrant(address who) public virtual onlyManager {
        // load the grant
        ARCDVestingVaultStorage.Grant storage grant = _grants()[who];

        // if the grant has already been removed or no grant available, revert
        if (grant.allocation == 0) revert AVV_NoGrantSet();

        // get the amount of withdrawable tokens
        uint256 withdrawable = _getWithdrawableAmount(grant);
        grant.withdrawn += uint128(withdrawable);
        token.transfer(who, withdrawable);

        // transfer the remaining tokens to the vesting manager
        uint256 remaining = grant.allocation - grant.withdrawn;
        token.transfer(_manager().data, remaining);

        // update the delegatee's voting power
        History.HistoricalBalances memory votingPower = _votingPower();
        uint256 delegateeVotes = votingPower.loadTop(grant.delegatee);
        votingPower.push(grant.delegatee, delegateeVotes - grant.latestVotingPower);

        // Emit the vote change event
        emit VoteChange(grant.delegatee, who, -1 * int256(uint256(grant.latestVotingPower)));

        // delete the grant
        delete _grants()[who];
    }

    /**
     * @notice Manager-only token deposit function.  Deposited tokens are added to `_unassigned`
     *         and can be used to create grants.
     *
     * @dev This is the only way to deposit tokens into the contract. Any tokens sent via other
     *      means are not recoverable by this contract.
     *
     * @param amount           The amount of tokens to deposit.
     */
    function deposit(uint256 amount) public onlyManager {
        Storage.Uint256 storage unassigned = _unassigned();
        // update unassigned value
        unassigned.data += amount;
        token.transferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Manager-only token withdrawal function. The manager can only withdraw tokens that
     *         are not being used by a grant.
     *
     * @param amount           The amount to withdraw.
     * @param recipient        The address to withdraw to.
     */
    function withdraw(uint256 amount, address recipient) public virtual onlyManager {
        Storage.Uint256 storage unassigned = _unassigned();
        if (unassigned.data < amount) revert AVV_InsufficientBalance();
        // update unassigned value
        unassigned.data -= amount;
        token.transfer(recipient, amount);
    }

    // ============ Public Functions ============

    /**
     * @notice Returns the claimable amount for a given grant.
     *
     * @param who                    Address to query.
     */
    function claimable(address who) public view returns (uint256) {
        return _getWithdrawableAmount(_grants()[who]);
    }

    /**
     * @notice Grant owners use to claim all withdrawable value from a grant. Voting power
     *         is recalculated factoring in the amount withdrawn.
     *
     * @param amount                 The amount to withdraw.
     */
    function claim(uint256 amount) public virtual nonReentrant {
        // load the grant
        ARCDVestingVaultStorage.Grant storage grant = _grants()[msg.sender];
        if (grant.cliff > block.number) revert AVV_CliffNotReached();

        // get the withdrawable amount
        uint256 withdrawable = _getWithdrawableAmount(grant);
        if (amount > withdrawable) revert AVV_InsufficientBalance();
        if (amount == 0) revert AVV_InvalidAmount();

        if (amount == withdrawable) {
            grant.withdrawn += uint128(withdrawable);
        } else {
            // update the grant's withdrawn amount
            grant.withdrawn += uint128(amount);
            withdrawable = amount;
        }

        // update the user's voting power
        _syncVotingPower(msg.sender, grant);

        // transfer the available amount
        token.transfer(msg.sender, withdrawable);
    }

    /**
     * @notice Updates the caller's voting power delegatee.
     *
     * @param to              The address to delegate to.
     */
    function delegate(address to) public {
        ARCDVestingVaultStorage.Grant storage grant = _grants()[msg.sender];
        if (to == grant.delegatee) revert AVV_AlreadyDelegated();

        History.HistoricalBalances memory votingPower = _votingPower();
        uint256 oldDelegateeVotes = votingPower.loadTop(grant.delegatee);
        uint256 newVotingPower = _currentVotingPower(grant);

        // Remove old delegatee's voting power and emit event
        votingPower.push(grant.delegatee, oldDelegateeVotes - grant.latestVotingPower);
        emit VoteChange(grant.delegatee, msg.sender, -1 * int256(uint256(grant.latestVotingPower)));

        // Note - It is important that this is loaded here and not before the previous state change because if
        // to == grant.delegatee and re-delegation was allowed we could be working with out of date state.
        uint256 newDelegateeVotes = votingPower.loadTop(to);

        // add voting power to the target delegatee and emit event
        votingPower.push(to, newDelegateeVotes + newVotingPower);

        // update grant info
        grant.latestVotingPower = uint128(newVotingPower);
        grant.delegatee = to;

        emit VoteChange(to, msg.sender, int256(newVotingPower));
    }

    // ============ Timelock Functions ============

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

    // ============ Helper Functions ============

    /**
     * @notice Calculates and returns how many tokens a grant owner can withdraw.
     *
     * @param grant                    The memory location of the loaded grant.
     */
    function _getWithdrawableAmount(ARCDVestingVaultStorage.Grant memory grant) internal view returns (uint256) {
        // if before cliff or created date, no tokens have unlocked
        if (block.number < grant.cliff || block.number < grant.created) {
            return 0;
        }
        // if after expiration, return the full allocation minus what has already been withdrawn
        if (block.number >= grant.expiration) {
            return (grant.allocation - grant.withdrawn);
        }
        // if after cliff, return vested amount minus what has already been withdrawn
        if (block.number >= grant.cliff) {
            uint256 unlocked = (((grant.allocation - grant.cliffAmount) * (block.number - grant.cliff)) /
                (grant.expiration - grant.cliff)) + grant.cliffAmount;

            return unlocked - grant.withdrawn;
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
     * @param grant                The grant to check for voting power.
     *
     * @return                     The current voting power of the grant.
     */
    function _currentVotingPower(ARCDVestingVaultStorage.Grant memory grant) internal pure returns (uint256) {
        return (grant.allocation - grant.withdrawn);
    }

    /**
     * @notice Helper to update a delegatee's voting power.
     *
     * @param who             The address who's voting power we need to sync.
     * @param grant           The storage pointer to the grant of that user.
     */
    function _syncVotingPower(address who, ARCDVestingVaultStorage.Grant storage grant) internal {
        History.HistoricalBalances memory votingPower = _votingPower();

        uint256 delegateeVotes = votingPower.loadTop(grant.delegatee);

        uint256 newVotingPower = _currentVotingPower(grant);
        // get the change in voting power. Negative if the voting power is reduced
        int256 change = int256(newVotingPower) - int256(uint256(grant.latestVotingPower));
        // do nothing if there is no change
        if (change < 0) {
            // if the change is negative, we multiply by -1 to avoid underflow when casting
            votingPower.push(grant.delegatee, delegateeVotes - uint256(change * -1));
            emit VoteChange(grant.delegatee, who, change);

            grant.latestVotingPower = uint128(newVotingPower);
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
     * @notice Getter function for the grants mapping.
     *
     * @param who            The owner of the grant to query
     */
    function getGrant(address who) external view returns (ARCDVestingVaultStorage.Grant memory) {
        return _grants()[who];
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
