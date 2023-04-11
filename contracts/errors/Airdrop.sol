// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/**
 * @title AirdropErrors
 * @author Non-Fungible Technologies, Inc.
 *
 * This file contains all custom errors for the Arcade Token airdrop contract.
 * All errors are prefixed by  "AA_" for ArcadeAirdrop. Errors located in one place
 * to make it possible to holistically look at all the failure cases.
 */

// ==================================== ARCADE AIRDROP ======================================
/// @notice All errors prefixed with AA_, to separate from other contracts in governance.

/**
 * @notice Ensure airdrop claim period has expired before reclaiming tokens.
 */
error AA_ClaimingNotExpired();

/**
 * @notice Cannot claim tokens after airdrop has expired.
 */
error AA_ClaimingExpired();

/**
 * @notice Cannot claim tokens multiple times.
 */
error AA_AlreadyClaimed();

/**
 * @notice Airdropped tokens cannot be claimed to a users wallet.
 */
error AA_NoClaiming();

/**
 * @notice Merkle proof not verified. User is not a participant in the airdrop.
 */
error AA_NonParticipant();

/**
 * @notice Thrown when a zero address is passed in as a parameter.
 */
error AA_ZeroAddress();
