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
 * @notice Deposited tokens less than withdraw amount.
 */
error UMVV_InsufficientRegistrationBalance();

/**
 * @notice Multiplier limit exceeded.
 */
 error UMVV_MultiplierLimit();

/**
 * @notice No multiplier has been set for token .
 *
 */
error UMVV_NoMultiplierSet();

// =================================== FROZEN LOCKING VAULT =====================================
/// @notice All errors prefixed with FLV_, to separate from other contracts in governance.

/**
 * @notice Withdraws from vault are frozen.
 */
error FLV_WithdrawsFrozen();
