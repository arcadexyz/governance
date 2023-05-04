// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

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
contract ArcadeTreasury is Authorizable, HashedStorageReentrancyBlock {
    /// @notice constant which represents ether
    address internal constant ETH_CONSTANT = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    /// @notice struct of a tokens spend thresholds
    struct SpendThresholds {
        uint256 small;
        uint256 medium;
        uint256 large;
    }

    /// @notice mapping of token address to spend thresholds
    mapping(address => SpendThresholds) public spendThresholds;

    /**
     * @notice Mapping storing how much is spent in each block
     *
     * @dev There's minor stability and griefing considerations around tracking the expenditure
     *      per block for all spend limits. Namely two proposals may try to get executed in the
     *      same block and have one fail on accident or on purpose. These are for semi-rare non
     *      contentious spending so we do not consider either a major concern.
     */
    mapping(uint256 => uint256) public blockExpenditure;

    constructor(address _timelock, address _coreVoting, address _gscCoreVoting) {
        setOwner(_timelock);
        _authorize(_coreVoting);
        _authorize(_gscCoreVoting);
    }

    // =========== ONLY AUTHORIZED ===========

    // ===== TRANSFERS =====

    function smallSpend(address token, uint256 amount, address destination) external onlyAuthorized nonReentrant {
        require(destination != address(0), "ArcadeTreasury: cannot send to zero address");
        require(spendThresholds[token].small != 0, "ArcadeTreasury: token not supported");
        require(amount != 0, "ArcadeTreasury: amount cannot be zero");

        // get small spend threshold for this token
        uint256 smallSpendLimit = spendThresholds[address(token)].small;

        _spend(token, amount, destination, smallSpendLimit);
    }

    function mediumSpend(address token, uint256 amount, address destination) external onlyAuthorized nonReentrant {
        require(destination != address(0), "ArcadeTreasury: cannot send to zero address");
        require(spendThresholds[token].small != 0, "ArcadeTreasury: token not supported");
        require(amount != 0, "ArcadeTreasury: amount cannot be zero");

        // get medium spend threshold for this token
        uint256 mediumSpendLimit = spendThresholds[address(token)].medium;

        _spend(token, amount, destination, mediumSpendLimit);
    }

    function largeSpend(address token, uint256 amount, address destination) external onlyAuthorized nonReentrant {
        require(destination != address(0), "ArcadeTreasury: cannot send to zero address");
        require(spendThresholds[token].small != 0, "ArcadeTreasury: token not supported");
        require(amount != 0, "ArcadeTreasury: amount cannot be zero");

        // get high spend threshold for this token
        uint256 highSpendLimit = spendThresholds[address(token)].large;

        _spend(token, amount, destination, highSpendLimit);
    }

    // ===== APPROVALS =====

    function approveSmallSpend(address token, address spender, uint256 amount) external onlyAuthorized nonReentrant {
        require(spender != address(0), "ArcadeTreasury: cannot send approve address");
        require(spendThresholds[token].small != 0, "ArcadeTreasury: token not supported");
        require(amount != 0, "ArcadeTreasury: amount cannot be zero");

        // get small spend threshold for this token
        uint256 smallSpendLimit = spendThresholds[address(token)].small;

        _approve(token, spender, amount, smallSpendLimit);
    }

    function approveMediumSpend(address token, address spender, uint256 amount) external onlyAuthorized nonReentrant {
        require(spender != address(0), "ArcadeTreasury: cannot approve zero address");
        require(spendThresholds[token].small != 0, "ArcadeTreasury: token not supported");
        require(amount != 0, "ArcadeTreasury: amount cannot be zero");

        // get medium spend threshold for this token
        uint256 mediumSpendLimit = spendThresholds[address(token)].medium;

        _approve(token, spender, amount, mediumSpendLimit);
    }

    function approveLargeSpend(address token, address spender, uint256 amount) external onlyAuthorized nonReentrant {
        require(spender != address(0), "ArcadeTreasury: cannot approve zero address");
        require(spendThresholds[token].small != 0, "ArcadeTreasury: token not supported");
        require(amount != 0, "ArcadeTreasury: amount cannot be zero");

        // get large spend threshold for this token
        uint256 largeSpendLimit = spendThresholds[address(token)].large;

        _approve(token, spender, amount, largeSpendLimit);
    }

    // ============== ONLY OWNER ==============

    function setLimits(address token, SpendThresholds memory thresholds) external onlyOwner {
        // verify that the thresholds are in ascending order
        require(
            thresholds.small < thresholds.medium && thresholds.medium < thresholds.large,
            "Thresholds must be in ascending order"
        );
        // verify that the token is not the 0x00 address
        require(token != address(0), "Token cannot be 0x00");

        // Overwrite the spend limits for specified token
        spendThresholds[token] = thresholds;
    }

    function genericCall(address _target, bytes calldata _callData) external onlyOwner nonReentrant {
        // low level call and insist it succeeds
        (bool status, ) = _target.call(_callData);
        require(status, "Call failed");
    }

    // =============== HELPERS ===============

    function _spend(address token, uint256 amount, address destination, uint256 limit) internal {
        // check that after processing this we will not have spent more than the block limit
        uint256 spentThisBlock = blockExpenditure[block.number];
        require(amount + spentThisBlock <= limit, "Spend Limit Exceeded");
        // reentrancy is very unlikely in this context, but we still change state first
        blockExpenditure[block.number] = amount + spentThisBlock;
        // transfer tokens
        if (address(token) == ETH_CONSTANT) {
            payable(destination).transfer(amount);
        } else {
            IERC20(token).transfer(destination, amount);
        }
    }

    function _approve(address token, address spender, uint256 amount, uint256 limit) internal {
        // check that after processing this we will not have spent more than the block limit
        uint256 spentThisBlock = blockExpenditure[block.number];
        require(amount + spentThisBlock <= limit, "Spend Limit Exceeded");
        // reentrancy is very unlikely in this context, but we still change state first
        blockExpenditure[block.number] = amount + spentThisBlock;
        // approve tokens
        IERC20(token).approve(spender, amount);
    }

    // Receive is fine because we don't want to execute code
    receive() external payable {}
}
