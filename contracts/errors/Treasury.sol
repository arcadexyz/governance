// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/**
 * @title TreasuryErrors
 * @author Non-Fungible Technologies, Inc.
 *
 * This file contains all custom errors for the Arcade Treasury contract.
 * All errors are prefixed by  "T_" for Treasury. Errors located in one place
 * to make it possible to holistically look at all the failure cases.
 */

/**
 * @notice Thrown when the zero address is passed as input.
 */
error T_ZeroAddress();

/**
 * @notice Cannot pass zero as an amount.
 */
error T_ZeroAmount();

/**
 * @notice Provided token must have a threshold previously set by the owner.
 */
error T_ThresholdNotSet();

/**
 * @notice Thresholds must be in ascending order.
 */
error T_ThresholdsNotAscending();

/**
 * @notice Array lenghts must match.
 */
error T_ArrayLengthMismatch();

/**
 * @notice External call failed.
 */
error T_CallFailed();

/**
 * @notice Cannot withdraw or approve more than each tokens preset spend limits per block.
 */
error T_BlockSpendLimit();

/**
 * @notice Cannot make calls to addresses which have thresholds set. This is also a way to block
 * calls to unwanted addresses or bypass treasury withdraw functions.
 *
 * @param target               Specified address of the target contract.
 */
error T_InvalidTarget(address target);

/**
 * @notice Caller is either not an authorized address or the owner of the contract.
 *
 * @param sender               Function caller.
 */
error T_Unauthorized(address sender);

/**
 * @notice Transfers and approvals are blocked. The GSC has exceeded its spend limit.
 */
error T_GSCSpendLimitReached();
