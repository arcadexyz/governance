// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.18;

/**
 * @title GovernanceErrors
 * @author Non-Fungible Technologies, Inc.
 *
 * This file contains custom errors for the Arcade governance contracts, with errors
 * prefixed by the contract that throws them (e.g., "PV_" for PromissoryVault).
 * Errors located in one place to make it possible to holistically look at all
 * governance failure cases.
 */

// ==================================== PROMISSORY VOTING VAULT ======================================
/// @notice All errors prefixed with PVV_, to separate from other contracts in governance.

/**
 * @notice Ensure caller promissoryNote ownership PromissoryVault operations.
 *
 */
error PVV_DoesNotOwn();

/**
 * @notice Ensure caller has not already registered.
 *
 */
error PVV_HasRegistration();

/**
 * @notice Ensure delegatee is not already registered as the delegate in user's Registration.
 *
 */
error PVV_AlreadyDelegated();

/**
 * @notice Contract balance has to be bigger than amount being withdrawn.
 *
 */
error PVV_InsufficientBalance();

/**
 * @notice Deposited tokens less than withdraw amount.
 *
 */
error PVV_InsufficientRegistrationBalance();

// ==================================== BASE VOTING VAULT ======================================
/// @notice All errors prefixed with BVV_, to separate from other contracts in governance.

/**
 * @notice Multiplier limit exceeded.
 *
 */
error BVV_MultiplierLimit();
