// SPDX-License-Identifier: MIT

pragma solidity >=0.8.18;

/**
 * @title GovernanceErrors
 * @author Non-Fungible Technologies, Inc.
 *
 * This file contains custom errors for the Arcade governance vault contracts. All errors
 * are prefixed by the contract that throws them (e.g., "UMVV_" for UniqueMultiplierVotingVault).
 * Errors located in one place to make it possible to holistically look at all
 * governance failure cases.
 */

// ==================================== UNIQUE MULTIPLIER VOTING VAULT ======================================
/// @notice All errors prefixed with UMVV_, to separate from other contracts in governance.

/**
 * @notice Ensure caller ERC1155 token ownership for UniqueMultiplierVotingVault operations.
 *
 */
error UMVV_DoesNotOwn();

/**
 * @notice Ensure caller has not already registered.
 */
error UMVV_HasRegistration();

/**
 * @notice Ensure delegatee is not already registered as the delegate in user's Registration.
 */
error UMVV_AlreadyDelegated();

/**
 * @notice Contract balance has to be bigger than amount being withdrawn.
 */
error UMVV_InsufficientBalance();

/**
 * @notice Withdrawable tokens less than withdraw request amount.
 *
 * @param withdrawable              The returned withrawable amount from
 *                                  a user's registration.
 */
error UMVV_InsufficientWithdrawableBalance(uint256 withdrawable);

/**
 * @notice Multiplier limit exceeded.
 */
error UMVV_MultiplierLimit();

/**
 * @notice No multiplier has been set for token.
 */
error UMVV_NoMultiplierSet();

/**
 * @notice The provided token address and token id are invalid.
 *
 * @param tokenAddress              The token address provided.
 * @param tokenId                   The token id provided.
 */
error UMVV_InvalidNft(address tokenAddress, uint256 tokenId);

/**
 * @notice User is calling withdraw() with zero amount.
 */
error UMVV_ZeroAmount();

/**
 * @notice Unique Multiplier Voting Vault already initialized.
 */
error UMVV_AlreadyInitialized();

/**
 * @notice Provided addresses array holds more than 50 addresses.
 */
error UMVV_ArrayTooManyElements();

// =================================== FROZEN LOCKING VAULT =====================================
/// @notice All errors prefixed with FLV_, to separate from other contracts in governance.

/**
 * @notice Withdraws from vault are frozen.
 */
error FLV_WithdrawsFrozen();

// ==================================== VESTING VOTING VAULT ======================================
/// @notice All errors prefixed with AVV_, to separate from other contracts in governance.

/**
 * @notice Caller is not the manager.
 */
error AVV_NotManager();

/**
 * @notice Caller is not the timelock.
 */
error AVV_NotTimelock();

/**
 * @notice Block number parameters used to create a grant are invalid. Check that the start time is
 *         before the cliff, and the cliff is before the expiration.
 */
error AVV_InvalidSchedule();

/**
 * @notice Cliff amount should be less than the grant amount.
 */
error AVV_InvalidCliffAmount();

/**
 * @notice Insufficient balance to carry out the transaction.
 */
error AVV_InsufficientBalance();

/**
 * @notice Grant has already been created for specified user.
 */
error AVV_HasGrant();

/**
 * @notice Grant has not been created for the specified user.
 */
error AVV_NoGrantSet();

/**
 * @notice Tokens cannot be claimed before the cliff.
 */
error AVV_CliffNotReached();

/**
 * @notice Tokens cannot be re-delegated to the same address.
 */
error AVV_AlreadyDelegated();

/**
 * @notice The amount provided is either zero or greater than the remaining allocation.
 */
error AVV_InvalidAmount();
