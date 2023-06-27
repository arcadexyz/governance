// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

/**
 * @title GovernanceErrors
 * @author Non-Fungible Technologies, Inc.
 *
 * This file contains custom errors for the Arcade governance vault contracts. All errors
 * are prefixed by the contract that throws them (e.g., "NBV_" for NFTBoostVault).
 * Errors located in one place to make it possible to holistically look at all
 * governance failure cases.
 */

// ======================================== NFT BOOST VAULT ==========================================
/// @notice All errors prefixed with NBV_, to separate from other contracts in governance.

/**
 * @notice Ensure caller ERC1155 token ownership for NFTBoostVault operations.
 *
 */
error NBV_DoesNotOwn();

/**
 * @notice Ensure caller has not already registered.
 */
error NBV_HasRegistration();

/**
 * @notice Caller has not already registered.
 */
error NBV_NoRegistration();

/**
 * @notice Ensure delegatee is not already registered as the delegate in user's Registration.
 */
error NBV_AlreadyDelegated();

/**
 * @notice Contract balance has to be bigger than amount being withdrawn.
 */
error NBV_InsufficientBalance();

/**
 * @notice Withdrawable tokens less than withdraw request amount.
 *
 * @param withdrawable              The returned withdrawable amount from
 *                                  a user's registration.
 */
error NBV_InsufficientWithdrawableBalance(uint256 withdrawable);

/**
 * @notice Multiplier limit exceeded.
 */
error NBV_MultiplierLimit();

/**
 * @notice No multiplier has been set for token.
 */
error NBV_NoMultiplierSet();

/**
 * @notice The provided token address and token id are invalid.
 *
 * @param tokenAddress              The token address provided.
 * @param tokenId                   The token id provided.
 */
error NBV_InvalidNft(address tokenAddress, uint256 tokenId);

/**
 * @notice User is calling withdraw() with zero amount.
 */
error NBV_ZeroAmount();

/**
 * @notice Cannot pass zero address as an address parameter.
 */
error NBV_ZeroAddress();

/**
 * @notice Provided addresses array holds more than 50 addresses.
 */
error NBV_ArrayTooManyElements();

/** @notice NFT Boost Voting Vault has already been unlocked.
 */
error NBV_AlreadyUnlocked();

/**
 * @notice ERC20 withdrawals from NFT Boost Voting Vault are frozen.
 */
error NBV_Locked();

/**
 * @notice Airdrop contract is not the caller.
 */
error NBV_NotAirdrop();

/**
 * @notice If a user already has a registration, they cannot change their
 *         delegatee when claiming subsequent airdrops.
 */
error NBV_NewDelegatee(address newDelegate, address currentDelegate);

// =================================== FROZEN LOCKING VAULT =====================================
/// @notice All errors prefixed with FLV_, to separate from other contracts in governance.

/**
 * @notice Withdraws from vault are frozen.
 */
error FLV_WithdrawsFrozen();

// ==================================== VESTING VOTING VAULT ======================================
/// @notice All errors prefixed with AVV_, to separate from other contracts in governance.

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
 *
 * @param amountAvailable           The amount available in the vault.
 */
error AVV_InsufficientBalance(uint256 amountAvailable);

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
 *
 * @param cliffBlock                The block number when grant claims begin.
 */
error AVV_CliffNotReached(uint256 cliffBlock);

/**
 * @notice Tokens cannot be re-delegated to the same address.
 */
error AVV_AlreadyDelegated();

/**
 * @notice Cannot withdraw zero tokens.
 */
error AVV_InvalidAmount();

/**
 * @notice Cannot pass zero address as an address parameter.
 */
error AVV_ZeroAddress();

// ==================================== IMMUTABLE VESTING VAULT ======================================

/**
 * @notice Grants cannot be revoked from the immutable vesting vault.
 */
error IVV_ImmutableGrants();

// ====================================== BASE VOTING VAULT ======================================

/**
 * @notice Caller is not the manager.
 */
error BVV_NotManager();

/**
 * @notice Caller is not the timelock.
 */
error BVV_NotTimelock();

/**
 * @notice Cannot pass zero address as an address parameter.
 */
error BVV_ZeroAddress();
