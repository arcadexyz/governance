// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/**
 * @title ReputationBadgeErrors
 * @author Non-Fungible Technologies, Inc.
 *
 * This file contains all custom errors for the Reputation Badge NFT contract.
 * All errors are prefixed by  "RB_" for ReputationBadge. Errors located in one place
 * to make it possible to holistically look at all the failure cases.
 */

/**
 * @notice Thrown when the merkle proof provided does not validate the users claim.
 */
error RB_InvalidMerkleProof();

/**
 * @notice Thrown when ETH amount sent to mint is insufficient.
 *
 * @param mintPrice              The price to mint the badge.
 * @param amountSent             The amount of ETH sent to mint the badge.
 */
error RB_InvalidMintFee(uint256 mintPrice, uint256 amountSent);

/**
 * @notice Thrown when the amount to claim is greater than recipients total claimable amount.
 *
 * @param amountToClaim          The amount to claim.
 * @param totalClaimableAmount   The total amount entitled to claim.
 */
error RB_InvalidClaimAmount(uint256 amountToClaim, uint256 totalClaimableAmount);

/**
 * @notice Thrown zero address is provided as input.
 */
error RB_ZeroAddress();

/**
 * @notice Thrown when the claim expiration has passed for a specific merkle root.
 *
 * @param claimExpiration        The expiration date for the claim.
 * @param currentTimestamp       The current timestamp.
 */
error RB_ClaimingExpired(uint48 claimExpiration, uint48 currentTimestamp);

/**
 * @notice Thrown when the claim data array is empty.
 */
error RB_NoClaimData();

/**
 * @notice Thrown when the array is larger than 50 elements.
 */
error RB_ArrayTooLarge();
