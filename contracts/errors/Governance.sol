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

// ==================================== PROMISSORY VAULT ======================================
/// @notice All errors prefixed with PV_, to separate from other contracts in governance.

/**
 * @notice Ensure caller promissoryNote ownership PromissoryVault operations.
 *
 */
error PV_DoesNotOwn();

/**
 * @notice Ensure caller has not already registered a Pnote.
 *
 */
error PV_HasPnote();
