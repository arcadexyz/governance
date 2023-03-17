// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/**
 * @title AirdropErrors
 * @author Non-Fungible Technologies, Inc.
 *
 * This file contains all custom errors for the ArcadeAirdropper contract.
 * All errors are prefixed by  "AD_" for ArcadeAirdropper. Errors located in
 * one place to make it possible to holistically look at all the failure cases.
 */

/**
 * @dev Error is thrown when a user attempts to claim an airdrop they have already
 *      claimed.
 */
error AD_AlreadyClaimed();

/**
 * @dev Error is thrown when owner attempts to claim remaining tokens before the
 *      claiming period has ended.
 */
error AD_ClaimPeriodActive();
