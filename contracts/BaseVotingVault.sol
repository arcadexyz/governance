// SPDX-License-Identifier: MIT

pragma solidity >=0.8.18;

/* solhint-disable no-global-import */
import "./external/council/libraries/History.sol";
import "./external/council/libraries/Storage.sol";
import "./external/council/interfaces/IERC20.sol";
import "./external/council/interfaces/IVotingVault.sol";

import "./libraries/HashedStorageReentrancyBlock.sol";

import { BVV_MultiplierLimit } from "./errors/Governance.sol";

/**
 *
 * @title PromissoryVotingVault
 * @author Non-Fungible Technologies, Inc.
 *
 * This contract is a base voting vault contract for Arcade voting vaults.
 * It includes the basic structure of a voting vault as well as query, and
 * setter / getter voting vault operations.
 *
 * @dev This contract is a proxy so we use the custom state management system from
 *      storage and return the following as methods to isolate that call.
 */

abstract contract BaseVotingVault is HashedStorageReentrancyBlock, IVotingVault {
    // ======================================== STATE ==================================================

    // Bring libraries into scope
    using History for History.HistoricalBalances;

    // Immutables are in bytecode so don't need special storage treatment
    IERC20 public immutable token;

    // A constant which determines the block before which blocks are ignored
    uint256 public immutable staleBlockLag;

    // ========================================== CONSTRUCTOR ===========================================

    /**
     * @notice Constructs the contract by setting immutables.
     *
     * @param _token                     The external erc20 token contract.
     * @param _staleBlockLag             The number of blocks before which the delegation history is forgotten.
     */
    constructor(IERC20 _token, uint256 _staleBlockLag) {
        token = _token;
        staleBlockLag = _staleBlockLag;
    }

    // ============================================ EVENTS ===============================================

    // Event to track delegation data
    event VoteChange(address indexed from, address indexed to, int256 amount);

    // ========================================== MODIFIER ==============================================

    modifier onlyTimelock() {
        require(msg.sender == _timelock().data, "!timelock");
        _;
    }

    modifier onlyManager() {
        require(msg.sender == _manager().data, "!manager");
        _;
    }

    // ================================ BASE VOTING VAULT FUNCTIONALITY ===================================
    /**
     * @notice Loads the voting power of a user.
     *
     * @param user                       The address we want to load the voting power of.
     * @param blockNumber                Block number to query the user's voting power at.
     * @param extraData                  The extra calldata is unused in this contract.
     *
     * @return                           The number of votes.
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
     * @notice Loads the voting power of a user without changing state.
     *
     * @param user                       The address we want to load the voting power of.
     * @param blockNumber                Block number to query the user's voting power at.
     *
     * @return                           The number of votes.
     */
    function queryVotePowerView(address user, uint256 blockNumber) external view returns (uint256) {
        // Get our reference to historical data
        History.HistoricalBalances memory votingPower = _votingPower();
        // Find the historical datum
        return votingPower.find(user, blockNumber);
    }

    /**
     * @notice timelock-only multiplier update function.
     *
     * @dev Allows the timelock to update the multiplier.
     *
     * @param multiplier_                The new multiplier value.
     */
    function setMultiplier(uint256 multiplier_) public onlyTimelock {
        if (multiplier_ <= 10) revert BVV_MultiplierLimit();
        Storage.set(Storage.uint256Ptr("multiplier"), multiplier_);
    }

    /**
     * @notice timelock-only timelock update function.
     *
     * @dev Allows the timelock to update the timelock address.
     *
     * @param timelock_                  The new timelock.
     */
    function setTimelock(address timelock_) public onlyTimelock {
        Storage.set(Storage.addressPtr("timelock"), timelock_);
    }

    /**
     * @notice A function to access the storage of the timelock address.
     *
     * @dev The timelock can access all functions with the onlyTimelock modifier.
     *
     * @return                          The timelock address.
     */
    function timelock() public pure returns (address) {
        return _timelock().data;
    }

    /**
     * @notice A function to access the storage of the token vote power multiplier.
     *
     * @return                          The token multiplier.
     */
    function multiplier() external pure returns (uint256) {
        return _multiplier().data;
    }

    /**
     * @notice A function to access the storage of the manager address.
     *
     * @dev The manager can access all functions with the onlyManager modifier.
     *
     * @return                          The manager address.
     */
    function manager() public pure returns (address) {
        return _manager().data;
    }

    /**
     * @notice Timelock-only manager update function.
     *
     * @dev Allows the timelock to update the manager address.
     *
     * @param manager_                  The new manager address.
     */
    function setManager(address manager_) public onlyTimelock {
        Storage.set(Storage.addressPtr("manager"), manager_);
    }

    // ================================ HELPER FUNCTIONS ===================================

    /**
     * @notice A function to access the storage of the token value
     *
     * @return                          A struct containing the balance uint.
     */
    function _balance() internal pure returns (Storage.Uint256 storage) {
        return Storage.uint256Ptr("balance");
    }

    /**
     * @notice A function to access the storage of the timelock address.
     *
     * @dev The timelock can access all functions with the onlyTimelock modifier.
     *
     * @return                          A struct containing the timelock address.
     */
    function _timelock() internal pure returns (Storage.Address memory) {
        return Storage.addressPtr("timelock");
    }

    /**
     * @notice A function to access the storage of the multiplier value.
     *
     * @dev The multiplier is a number that boosts the voting power of a user's
     * governance tokens because of that user simultaneously holding an active loan.
     * The voting power of the user would equal the product of the number of tokens
     * deposited into the voting vault multiplied by the value of the multiplier.
     *
     * @return                          A struct containing the multiplier uint.
     */
    function _multiplier() internal pure returns (Storage.Uint256 memory) {
        return Storage.uint256Ptr("multiplier");
    }

    /**
     * @notice A function to access the storage of the manager address.
     *
     * @dev The manager can access all functions with the onlyManager modifier.
     *
     * @return                          A struct containing the manager address.
     */
    function _manager() internal pure returns (Storage.Address memory) {
        return Storage.addressPtr("manager");
    }

    /**
     * @notice Returns the historical voting power tracker.
     *
     * @return                            A struct which can push to and find items in block
     *                                    indexed storage.
     */
    function _votingPower() internal pure returns (History.HistoricalBalances memory) {
        // This call returns a storage mapping with a unique non overwrite-able storage location
        // which can be persisted through upgrades, even if they change storage layout.
        return (History.load("votingPower"));
    }
}
