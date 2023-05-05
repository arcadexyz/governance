// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./external/council/libraries/Authorizable.sol";
import "./external/council/interfaces/IERC20.sol";

import "./libraries/HashedStorageReentrancyBlock.sol";

/**
 * @title ArcadeTreasury
 * @author Non-Fungible Technologies, Inc.
 *
 * This contract is used to hold funds for the Arcade treasury. Each token held by this
 * contract has three thresholds associated with it: (1) large amount, (2) medium amount,
 *  and (3) small amount. The only way to modify these thresholds is via the governance timelock.
 *
 * For each spend threshold, there is a corresponding spend function which can be called by
 * an authorized address. These authorized addresses are both the base CoreVoting contract
 * and the GSC CoreVoting contract. In each of these CoreVote contracts, the custom quorums
 * for each spend function are set to the appropriate threshold.
 */
contract ArcadeTreasury is Authorizable, ReentrancyGuard {
    /// @notice constant which represents ether
    address internal constant ETH_CONSTANT = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    /// @notice struct of spend thresholds
    struct SpendThreshold {
        uint256 small;
        uint256 medium;
        uint256 large;
    }

    /// @notice mapping of token address to spend thresholds
    mapping(address => SpendThreshold) public spendThresholds;

    /// @notice mapping storing how much is spent or approved in each block.
    mapping(uint256 => uint256) public blockExpenditure;

    /// @notice event emitted when a token's spend thresholds are updated
    event SpendThresholdsUpdated(address indexed token, SpendThreshold thresholds);

    /// @notice event emitted when a token is spent
    event TeasuryTransfer(address indexed token, address indexed destination, uint256 amount);

    /// @notice event emitted when a token is approved
    event TreasuryApproval(address indexed token, address indexed spender, uint256 amount);

    /**
     * @notice contract constructor
     *
     * @param _timelock              address of the timelock contract
     * @param _coreVoting            address of the core voting contract
     * @param _gscCoreVoting         address of the gsc core voting contract
     */
    constructor(address _timelock, address _coreVoting, address _gscCoreVoting) {
        setOwner(_timelock);
        _authorize(_coreVoting);
        _authorize(_gscCoreVoting);
    }

    // =========== ONLY AUTHORIZED ===========

    // ===== TRANSFERS =====

    /**
     * @notice function to spend a small amount of tokens from the treasury. This function
     * should have the lowest quorum of the three spend functions.
     *
     * @param token             address of the token to spend
     * @param amount            amount of tokens to spend
     * @param destination       address to send the tokens to
     */
    function smallSpend(address token, uint256 amount, address destination) external onlyAuthorized nonReentrant {
        require(destination != address(0), "ArcadeTreasury: cannot send to zero address");
        require(amount != 0, "ArcadeTreasury: amount cannot be zero");
        uint256 spendLimit = spendThresholds[token].small;
        require(spendLimit != 0, "ArcadeTreasury: invalid spend limit");

        _spend(token, amount, destination, spendLimit);
    }

    /**
     * @notice function to spend a medium amount of tokens from the treasury. This function
     * should have the medium quorum of the three spend functions.
     *
     * @param token             address of the token to spend
     * @param amount            amount of tokens to spend
     * @param destination       address to send the tokens to
     */
    function mediumSpend(address token, uint256 amount, address destination) external onlyAuthorized nonReentrant {
        require(destination != address(0), "ArcadeTreasury: cannot send to zero address");
        require(amount != 0, "ArcadeTreasury: amount cannot be zero");
        uint256 spendLimit = spendThresholds[token].medium;
        require(spendLimit != 0, "ArcadeTreasury: invalid spend limit");

        _spend(token, amount, destination, spendLimit);
    }

    /**
     * @notice function to spend a large amount of tokens from the treasury. This function
     * should have the highest quorum of the three spend functions.
     *
     * @param token             address of the token to spend
     * @param amount            amount of tokens to spend
     * @param destination       address to send the tokens to
     */
    function largeSpend(address token, uint256 amount, address destination) external onlyAuthorized nonReentrant {
        require(destination != address(0), "ArcadeTreasury: cannot send to zero address");
        require(amount != 0, "ArcadeTreasury: amount cannot be zero");
        uint256 spendLimit = spendThresholds[token].large;
        require(spendLimit != 0, "ArcadeTreasury: invalid spend limit");

        _spend(token, amount, destination, spendLimit);
    }

    // ===== APPROVALS =====

    /**
     * @notice function to approve a small amount of tokens from the treasury. This function
     * should have the lowest quorum of the three approve functions.
     *
     * @param token             address of the token to approve
     * @param spender           address to approve
     * @param amount            amount of tokens to approve
     */
    function approveSmallSpend(address token, address spender, uint256 amount) external onlyAuthorized nonReentrant {
        require(spender != address(0), "ArcadeTreasury: cannot approve zero address");
        require(amount != 0, "ArcadeTreasury: amount cannot be zero");
        uint256 spendLimit = spendThresholds[token].small;
        require(spendLimit != 0, "ArcadeTreasury: invalid spend limit");

        _approve(token, spender, amount, spendLimit);
    }

    /**
     * @notice function to approve a medium amount of tokens from the treasury. This function
     * should have the medium quorum of the three approve functions.
     *
     * @param token             address of the token to approve
     * @param spender           address to approve
     * @param amount            amount of tokens to approve
     */
    function approveMediumSpend(address token, address spender, uint256 amount) external onlyAuthorized nonReentrant {
        require(spender != address(0), "ArcadeTreasury: cannot approve zero address");
        require(amount != 0, "ArcadeTreasury: amount cannot be zero");
        uint256 spendLimit = spendThresholds[token].medium;
        require(spendLimit != 0, "ArcadeTreasury: invalid spend limit");

        _approve(token, spender, amount, spendLimit);
    }

    /**
     * @notice function to approve a large amount of tokens from the treasury. This function
     * should have the highest quorum of the three approve functions.
     *
     * @param token             address of the token to approve
     * @param spender           address to approve
     * @param amount            amount of tokens to approve
     */
    function approveLargeSpend(address token, address spender, uint256 amount) external onlyAuthorized nonReentrant {
        require(spender != address(0), "ArcadeTreasury: cannot approve zero address");
        require(amount != 0, "ArcadeTreasury: amount cannot be zero");
        uint256 spendLimit = spendThresholds[token].large;
        require(spendLimit != 0, "ArcadeTreasury: invalid spend limit");

        _approve(token, spender, amount, spendLimit);
    }

    // ============== ONLY OWNER ==============

    /**
     * @notice function to set the spend/approve thresholds for a token. This function is only
     * callable by the timelock.
     *
     * @param token             address of the token to set the thresholds for
     * @param thresholds        struct containing the thresholds to set
     */
    function setThreshold(address token, SpendThreshold memory thresholds) external onlyOwner {
        // verify that the thresholds are in ascending order
        require(
            thresholds.small < thresholds.medium && thresholds.medium < thresholds.large,
            "Thresholds must be in ascending order"
        );
        // verify none of the thesholds are 0
        require(thresholds.small != 0 && thresholds.medium != 0 && thresholds.large != 0, "Thresholds cannot be 0");
        // verify that the token is not the 0x00 address
        require(token != address(0), "Token cannot be 0x00");

        // Overwrite the spend limits for specified token
        spendThresholds[token] = thresholds;

        emit SpendThresholdsUpdated(token, thresholds);
    }

    /**
     * @notice function to execute arbitrary calls from the treasury. This function is only
     * callable by the timelock. All calls are executed in order, and if any of them fail
     * the entire transaction is reverted.
     *
     * @param targets           array of addresses to call
     * @param calldatas         array of bytes data to use for each call
     */
    function batchCalls(address[] memory targets, bytes[] calldata calldatas) external onlyOwner nonReentrant {
        require(targets.length == calldatas.length, "invalid array lengths");
        // execute a package of low level calls
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, ) = targets[i].call(calldatas[i]);
            // revert if a single call fails
            require(success == true, "call reverted");
        }
    }

    // =============== HELPERS ===============

    /**
     * @notice helper function to send tokens from the treasury. This function is used by the
     * transfer functions to send tokens to their destinations.
     *
     * @param token             address of the token to spend
     * @param amount            amount of tokens to spend
     * @param destination       recipient of the transfer
     * @param limit             max tokens that can be spent/approved in a single block for this threshold
     */
    function _spend(address token, uint256 amount, address destination, uint256 limit) internal {
        // check that after processing this we will not have spent more than the block limit
        uint256 spentThisBlock = blockExpenditure[block.number];
        require(amount + spentThisBlock <= limit, "Spend Limit Exceeded");
        blockExpenditure[block.number] = amount + spentThisBlock;

        // transfer tokens
        if (address(token) == ETH_CONSTANT) {
            payable(destination).transfer(amount);
        } else {
            IERC20(token).transfer(destination, amount);
        }

        emit TeasuryTransfer(token, destination, amount);
    }

    /**
     * @notice helper function to approve tokens from the treasury. This function is used by the
     * approve functions to approve tokens for a spender.
     *
     * @param token             address of the token to approve
     * @param spender           address to approve
     * @param amount            amount of tokens to approve
     * @param limit             max tokens that can be spent/approved in a single block for this threshold
     */
    function _approve(address token, address spender, uint256 amount, uint256 limit) internal {
        // check that after processing this we will not have spent more than the block limit
        uint256 spentThisBlock = blockExpenditure[block.number];
        require(amount + spentThisBlock <= limit, "Spend Limit Exceeded");
        blockExpenditure[block.number] = amount + spentThisBlock;

        // approve tokens
        IERC20(token).approve(spender, amount);

        emit TreasuryApproval(token, spender, amount);
    }

    /// @notice do not execute code on receiving ether
    receive() external payable {}
}
