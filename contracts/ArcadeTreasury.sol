// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {
    T_ZeroAddress,
    T_ZeroAmount,
    T_ThresholdNotSet,
    T_ThresholdsNotAscending,
    T_ArrayLengthMismatch,
    T_CallFailed,
    T_BlockSpendLimit,
    T_InvalidTarget,
    T_Unauthorized,
    T_GSCSpendLimitReached
} from "./errors/Treasury.sol";

/**
 * @title ArcadeTreasury
 * @author Non-Fungible Technologies, Inc.
 *
 * This contract is used to hold funds for the Arcade treasury. Each token held by this
 * contract has three thresholds associated with it: (1) large amount, (2) medium amount,
 * and (3) small amount. The only way to modify these thresholds is via the governance
 * timelock.
 *
 * For each spend threshold, there is a corresponding spend function which can be called by
 * an authorized address. For small spends either General Core Voting or the GSC Core Voting
 *  contracts can execute transfer or approvals. For medium and larger spends, only General Core
 * Voting is able to make calls to these functions. In both Core Voting contracts, a custom
 * quorum for each spend function shall be set to the appropriate threshold.
 *
 * Since the GSC has the ability to execute small spends without passing a vote through the
 * GSC Core Voting contract, the GSC is limited to 5 small spends. This is to prevent the GSC
 * from executing a large number of small spends which could be done to drain the treasury.
 * If the GSC runs out of small spends and needs more the General Core Voting voters can pass
 * a vote to reset the GSC's small spend counter.
 */
contract ArcadeTreasury is AccessControl, ReentrancyGuard {
    /// @notice access control roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    bytes32 public constant GSC_CORE_VOTING_ROLE = keccak256("GSC_CORE_VOTING");
    bytes32 public constant CORE_VOTING_ROLE = keccak256("CORE_VOTING");

    /// @notice GSC spend limit
    uint256 public immutable gscSpendLimit;
    /// @notice GSC spend counter
    uint256 public gscSpendCounter;

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
     */
    constructor(address _timelock, uint256 _gscSpendLimit) {
        if (_timelock == address(0)) revert T_ZeroAddress();

        _setupRole(ADMIN_ROLE, _timelock);
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
        _setRoleAdmin(GSC_CORE_VOTING_ROLE, ADMIN_ROLE);
        _setRoleAdmin(CORE_VOTING_ROLE, ADMIN_ROLE);

        gscSpendLimit = _gscSpendLimit;
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
    function smallSpend(address token, uint256 amount, address destination) external nonReentrant {
        bool isGSC = hasRole(GSC_CORE_VOTING_ROLE, msg.sender);

        if (!isGSC && !hasRole(CORE_VOTING_ROLE, msg.sender)) {
            revert T_Unauthorized(msg.sender);
        }
        if (isGSC && gscSpendCounter >= gscSpendLimit) {
            revert T_GSCSpendLimitReached();
        }
        if (destination == address(0)) revert T_ZeroAddress();
        if (amount == 0) revert T_ZeroAmount();

        uint256 spendLimit = spendThresholds[token].small;
        if (spendLimit == 0) revert T_ThresholdNotSet();

        if (isGSC) {
            gscSpendCounter++;
        }

        _spend(token, amount, destination, spendLimit);
    }

    /**
     * @notice function to spend a medium amount of tokens from the treasury. This function
     * should have the middle quorum of the three spend functions.
     *
     * @param token             address of the token to spend
     * @param amount            amount of tokens to spend
     * @param destination       address to send the tokens to
     */
    function mediumSpend(
        address token,
        uint256 amount,
        address destination
    ) external onlyRole(CORE_VOTING_ROLE) nonReentrant {
        if (destination == address(0)) revert T_ZeroAddress();
        if (amount == 0) revert T_ZeroAmount();
        uint256 spendLimit = spendThresholds[token].medium;
        if (spendLimit == 0) revert T_ThresholdNotSet();

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
    function largeSpend(
        address token,
        uint256 amount,
        address destination
    ) external onlyRole(CORE_VOTING_ROLE) nonReentrant {
        if (destination == address(0)) revert T_ZeroAddress();
        if (amount == 0) revert T_ZeroAmount();
        uint256 spendLimit = spendThresholds[token].large;
        if (spendLimit == 0) revert T_ThresholdNotSet();

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
    function approveSmallSpend(address token, address spender, uint256 amount) external nonReentrant {
        bool isGSC = hasRole(GSC_CORE_VOTING_ROLE, msg.sender);

        if (!isGSC && !hasRole(CORE_VOTING_ROLE, msg.sender)) {
            revert T_Unauthorized(msg.sender);
        }
        if (isGSC && gscSpendCounter >= gscSpendLimit) {
            revert T_GSCSpendLimitReached();
        }
        if (spender == address(0)) revert T_ZeroAddress();
        if (amount == 0) revert T_ZeroAmount();

        uint256 spendLimit = spendThresholds[token].small;
        if (spendLimit == 0) revert T_ThresholdNotSet();

        if (isGSC) {
            gscSpendCounter++;
        }

        _approve(token, spender, amount, spendLimit);
    }

    /**
     * @notice function to approve a medium amount of tokens from the treasury. This function
     * should have the middle quorum of the three approve functions.
     *
     * @param token             address of the token to approve
     * @param spender           address to approve
     * @param amount            amount of tokens to approve
     */
    function approveMediumSpend(
        address token,
        address spender,
        uint256 amount
    ) external onlyRole(CORE_VOTING_ROLE) nonReentrant {
        if (spender == address(0)) revert T_ZeroAddress();
        if (amount == 0) revert T_ZeroAmount();
        uint256 spendLimit = spendThresholds[token].medium;
        if (spendLimit == 0) revert T_ThresholdNotSet();

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
    function approveLargeSpend(
        address token,
        address spender,
        uint256 amount
    ) external onlyRole(CORE_VOTING_ROLE) nonReentrant {
        if (spender == address(0)) revert T_ZeroAddress();
        if (amount == 0) revert T_ZeroAmount();
        uint256 spendLimit = spendThresholds[token].large;
        if (spendLimit == 0) revert T_ThresholdNotSet();

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
    function setThreshold(address token, SpendThreshold memory thresholds) external onlyRole(ADMIN_ROLE) {
        // verify thresholds are ascending from small to large
        if (thresholds.large < thresholds.medium || thresholds.medium < thresholds.small) {
            revert T_ThresholdsNotAscending();
        }
        // verify small threshold is not zero
        if (thresholds.small == 0) revert T_ZeroAmount();
        // verify that the token is not the zero address
        if (token == address(0)) revert T_ZeroAddress();

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
    function batchCalls(
        address[] memory targets,
        bytes[] calldata calldatas
    ) external onlyRole(ADMIN_ROLE) nonReentrant {
        if (targets.length != calldatas.length) revert T_ArrayLengthMismatch();
        // execute a package of low level calls
        for (uint256 i = 0; i < targets.length; i++) {
            if (spendThresholds[targets[i]].small != 0) revert T_InvalidTarget(targets[i]);
            (bool success, ) = targets[i].call(calldatas[i]);
            // revert if a single call fails
            if (success == false) revert T_CallFailed();
        }
    }

    function resetGSCSpendCounter() external onlyRole(ADMIN_ROLE) {
        gscSpendCounter = 0;
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
        if (amount + spentThisBlock > limit) revert T_BlockSpendLimit();
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
        if (amount + spentThisBlock > limit) revert T_BlockSpendLimit();
        blockExpenditure[block.number] = amount + spentThisBlock;

        // approve tokens
        IERC20(token).approve(spender, amount);

        emit TreasuryApproval(token, spender, amount);
    }

    /// @notice do not execute code on receiving ether
    receive() external payable {}
}
