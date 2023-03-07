// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/**
 * @title TokenErrors
 * @author Non-Fungible Technologies, Inc.
 *
 * This file contains all custom errors for the token contract. All errors
 * are prefixed by the contract that throws them (e.g., "AT_" for ArcadeToken).
 * Errors located in one place to make it possible to holistically look at all
 * token failure cases.
 */

// =============================== ARCADE TOKEN ===============================

/**
 * @notice Error thrown when token has already minted to a specific party.
 */
error AT_AlreadyMinted();

/**
 * @notice Minting results in total token supply being exceeded.
 */
error AT_ExceedsTotalSupply(uint256 amount, uint256 totalSupplyRemaining);

/**
 * @notice Thrown when a zero address is passed in as a parameter.
 */
error AT_ZeroAddress();
