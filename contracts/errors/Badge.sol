// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/**
 * @title ReputationBadgeErrors
 * @author Non-Fungible Technologies, Inc.
 *
 * This file contains all custom errors for the Reputation Badge NFT contract.
 * All errors are prefixed by  "RB_" for ArcadeToken. Errors located in one place
 * to make it possible to holistically look at all the failure cases.
 */

/**
 * @notice Thrown when the merkle proof provided does not validate the users claim.
 */
error RB_InvalidMerkleProof();

/**
 * @notice Thrown when ETH amount sent to mint is insufficient.
 */
error RB_InvalidMintFee(uint256 mintPrice, uint256 amountSent);

/**
 * @notice Thrown when a user has already claimed a specific tokenId.
 */
error RB_AlreadyClaimed();

/**
 * @notice Thrown zero address is provided as input.
 */
error RB_ZeroAddress();
