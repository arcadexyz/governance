// SPDX-License-Identifier: MIT

pragma solidity >=0.8.18;

/* solhint-disable no-global-import */
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "./external/council/libraries/History.sol";
import "./external/council/libraries/Storage.sol";
import "./external/council/interfaces/IERC20.sol";
import "./BaseVotingVault.sol";
import "./libraries/PromissoryVaultStorage.sol";

import {
    PV_DoesNotOwn,
    PV_HasPnote,
    PV_AlreadyDelegated,
    PV_InsufficientBalance,
    PV_InsufficientPnoteBalance
} from "./errors/Governance.sol";

/**
 *
 * @title PromissoryVault
 * @author Non-Fungible Technologies, Inc.
 *
 * This contract enables holders of Arcade promissory notes to gain an advantage wrt
 * voting power for participation in governance. Users send their tokens to the contract
 * and provide their promissoryNote id as calldata. Once the contract confirms their ownership
 * of the promissory note id, they are able to delegate their voting power for participation in
 * governance.
 * Voting power for participants in this vault is enhanced by a multiplier.
 * This contract is Simple Proxy upgradeable which is the upgradeability system used for vaults
 * in Council.
 *
 * @dev There is no emergency withdrawal in this contract, any funds not sent via
 *      addPnoteAndDelegate() are unrecoverable by this version of the PromissoryVault.
 *
 *      This contract is a proxy so we use the custom state management system from
 *      storage and return the following as methods to isolate that call.
 */

abstract contract AbstractPromissoryVault is BaseVotingVault {
    // ======================================== STATE ==================================================

    // Bring History library into scope
    using History for History.HistoricalBalances;

    // Immutables are in bytecode so don't need special storage treatment
    IERC20 public immutable arcdToken;

    // A constant which determines the block before which blocks are ignored
    uint256 public immutable blockLimit;

    // ========================================== CONSTRUCTOR ===========================================

    /**
     * @notice Constructs the contract by setting immutables.
     *
     * @param _token                     The external erc20 token contract.
     * @param _staleBlockLag             The number of blocks before which the delegation history is forgotten.
     */
    constructor(IERC20 _token, uint256 _staleBlockLag) BaseVotingVault(_token, _staleBlockLag) {
        arcdToken = _token;
        blockLimit = _staleBlockLag;
    }

    // ================================ PROMISSORY VAULT FUNCTIONALITY ===================================

    /**
     * @notice initialization function to set initial variables. Can only be called once after deployment.
     *
     * @param timelock_                The timelock address can change the multiplier.
     *
     */
    function initialize(address timelock_) public {
        require(Storage.uint256Ptr("initialized").data == 0, "initialized");
        Storage.set(Storage.uint256Ptr("initialized"), 1);
        Storage.set(Storage.addressPtr("timelock"), timelock_);
        Storage.set(Storage.uint256Ptr("multiplier"), 5);
    }

    /**
     * @notice Registers a new Pnote.
     *
     * @dev User has to own promissoryNote ERC721 for participation in this vault.
     *
     * @param _amount                   Amount of tokens sent to this contract by the user for participation
     *                                  in governance.
     * @param _noteId                   The id of the promissoryNote NFT.
     * @param _promissoryNote           The address of the promissoryNote NFT.
     * @param _delegatee                Optional param. The address to delegate the voting power associated
     *                                  with this Pnote to
     */
    function addPnoteAndDelegate(
        uint128 _amount,
        uint128 _noteId,
        address _promissoryNote,
        address _delegatee
    ) external {
        address _who = msg.sender;
        uint128 withdrawn = 0;
        uint128 blockNumber = uint128(block.number);

        Storage.Uint256 storage balance = _balance();
        Storage.Uint256 memory multiplier = _multiplier();

        // load the pNote
        PromissoryVaultStorage.Pnote storage pNote = _pNotes()[_who];

        // If the address of the promissory is not zero, revert because the Pnote is
        // already initialized. Only one Pnote per msg.sender
        if (pNote.promissoryNote != address(0)) revert PV_HasPnote();

        // confirm this user is the owner of the promissoryNote
        if (IERC721(_promissoryNote).ownerOf(_noteId) != _who) revert PV_DoesNotOwn();

        // load the delegate. Defaults to the pNote owner
        _delegatee = _delegatee == address(0) ? _who : _delegatee;

        // calculate the voting power
        uint128 newVotingPower = _amount * uint128(multiplier.data);

        // set the new pNote
        _pNotes()[_who] = PromissoryVaultStorage.Pnote(
            _amount,
            blockNumber,
            newVotingPower,
            withdrawn,
            _noteId,
            _promissoryNote,
            _delegatee
        );

        // update this contract's balance
        balance.data += _amount;

        address delegatee = pNote.delegatee;

        _grantDelgateeVotingPower(delegatee, newVotingPower);

        // Move the user tokens into this contract
        token.transferFrom(_who, address(this), _amount);

        emit VoteChange(pNote.delegatee, _who, int256(uint256(newVotingPower)));
    }

    /**
     * @notice Getter for the pNotes mapping.
     *
     * @param _who                      The owner of the pNote to query.
     *
     * @return Pnote                    Pnote of the provided address.
     */
    function getPnote(address _who) external view returns (PromissoryVaultStorage.Pnote memory) {
        return _pNotes()[_who];
    }

    /**
     * @notice Changes the caller's token voting power delegation.
     *
     * @dev The total voting power is not guaranteed to go up because the token
     *      multiplier can be updated at any time.
     *
     * @param _to                       The address to delegate to.
     */
    function delegate(address _to) external {
        PromissoryVaultStorage.Pnote storage pNote = _pNotes()[msg.sender];
        // If this address is already the delegate, don't send the tx
        if (_to != pNote.delegatee) revert PV_AlreadyDelegated();
        History.HistoricalBalances memory votingPower = _votingPower();

        uint256 oldDelegateeVotes = votingPower.loadTop(pNote.delegatee);
        // returns the current voting power of a Pnote
        uint256 newVotingPower = _currentVotingPower(pNote);

        // Remove voting power from old delegatee and emit event
        votingPower.push(pNote.delegatee, oldDelegateeVotes - pNote.latestVotingPower);
        emit VoteChange(pNote.delegatee, msg.sender, -1 * int256(uint256(pNote.latestVotingPower)));

        // Note - It is important that this is loaded here and not before the previous state change because if
        // _to == pNote.delegatee and re-delegation was allowed we could be working with out of date state
        uint256 newDelegateeVotes = votingPower.loadTop(_to);

        // add voting power to the target delegatee and emit event
        emit VoteChange(_to, msg.sender, int256(newVotingPower));
        votingPower.push(_to, newDelegateeVotes + newVotingPower);

        // update pNote properties
        pNote.latestVotingPower = uint128(newVotingPower);
        pNote.delegatee = _to;
    }

    /**
     * @notice Removes tokens from this contract and the voting power they represent.
     *
     * @param amount                      The amount of token to withdraw.
     */
    function withdraw(uint128 amount) external virtual {
        // load the pNote
        PromissoryVaultStorage.Pnote storage pNote = _pNotes()[msg.sender];
        // get the withdrawable amount
        uint256 withdrawable = _getWithdrawableAmount(pNote);

        // get this contract's balance
        Storage.Uint256 storage balance = _balance();

        if (balance.data < amount) revert PV_InsufficientBalance();
        if (pNote.amount < amount) revert PV_InsufficientPnoteBalance();

        if ((withdrawable - amount) >= 0) {
            // update contract balance
            balance.data -= amount;
            // update withdrawn amount
            pNote.withdrawn += amount;
            // update the delegatee's voting power
            _syncVotingPower(msg.sender, pNote);
        }
        if ((withdrawable - amount) == 0) {
            delete _pNotes()[msg.sender];
        }
        // transfer the token amount to the user
        token.transfer(msg.sender, amount);
    }

    // ================================ HELPER FUNCTIONS ===================================

    /**
     * @notice Grants the chosen delegate address voting power when a new Pnote is registered.
     *
     * @param delegatee                     The address to delegate the voting power associated
     *                                     with the Pnote to.
     * @param newVotingPower               Amount of votingPower associated with this Pnote to
     *                                     be added to delegates existing votingPower.
     *
     */
    function _grantDelgateeVotingPower(address delegatee, uint128 newVotingPower) internal {
        // update the delegatee's voting power
        History.HistoricalBalances memory votingPower = _votingPower();
        // loads the most recent timestamp of voting power for this delegate
        uint256 delegateeVotes = votingPower.loadTop(delegatee);
        // add block stamp indexed delegation power for this delegate to historical data array
        votingPower.push(delegatee, delegateeVotes + newVotingPower);
    }

    /**
     * @notice A single function endpoint for loading Pnote storage
     *
     * @dev Only one Pnote is allowed per user. Pnotes SHOULD NOT BE MODIFIED
     *
     * @return pNotes                 A storage mapping to look up pNotes data
     */
    function _pNotes() internal pure returns (mapping(address => PromissoryVaultStorage.Pnote) storage) {
        // This call returns a storage mapping with a unique non overwrite-able storage location
        // which can be persisted through upgrades, even if they change storage layout
        return (PromissoryVaultStorage.mappingAddressToPnotePtr("pNotes"));
    }

    /**
     * @notice Helper to update a delegatee's voting power.
     *
     * @param _who                       The address who's voting power we need to sync.
     *
     * @param _pNote                     The storage pointer to the pNote of that user.
     */
    function _syncVotingPower(address _who, PromissoryVaultStorage.Pnote storage _pNote) internal {
        History.HistoricalBalances memory votingPower = _votingPower();

        uint256 delegateeVotes = votingPower.loadTop(_pNote.delegatee);

        uint256 newVotingPower = _currentVotingPower(_pNote);
        // get the change in voting power. Negative if the voting power is reduced
        int256 change = int256(newVotingPower) - int256(uint256(_pNote.latestVotingPower));
        // do nothing if there is no change
        if (change == 0) return;
        if (change > 0) {
            votingPower.push(_pNote.delegatee, delegateeVotes + uint256(change));
        } else {
            // if the change is negative, we multiply by -1 to avoid underflow when casting
            votingPower.push(_pNote.delegatee, delegateeVotes - uint256(change * -1));
        }
        emit VoteChange(_pNote.delegatee, _who, change);
        _pNote.latestVotingPower = uint128(newVotingPower);
    }

    /**
     * @notice Calculates how much a user can withdraw.
     *
     * @param _pNote                      The the memory location of the loaded pNote.
     *
     * @return withdrawable               Amount which can be withdrawn.
     */
    function _getWithdrawableAmount(PromissoryVaultStorage.Pnote memory _pNote) internal view returns (uint256) {
        if (block.number < _pNote.blockNumber) {
            return 0;
        }
        if (_pNote.withdrawn == _pNote.amount) {
            return (0);
        }
        uint256 withdrawable = _pNote.amount - _pNote.withdrawn;
        return (withdrawable);
    }

    /**
     * @notice Helper that returns the current voting power of a pNote.
     *
     * @dev This is not always the recorded voting power since it uses the latest multiplier.
     *
     * @param _pNote                     The pNote to check for voting power.
     *
     * @return                           The current voting power of the pNote.
     */
    function _currentVotingPower(PromissoryVaultStorage.Pnote memory _pNote) internal pure virtual returns (uint256) {
        uint256 locked = _pNote.amount - _pNote.withdrawn;
        return locked * _multiplier().data;
    }
}

contract PromissoryVault is AbstractPromissoryVault {
    // ================================ CONSTRUCTOR ===================================

    /**
     * @notice Constructs the contract by setting immutables.
     *
     * @param _token                     The external erc20 token contract.
     * @param _staleBlockLag             The number of blocks before the delegation history is forgotten.
     */
    constructor(IERC20 _token, uint256 _staleBlockLag) AbstractPromissoryVault(_token, _staleBlockLag) {}
}
