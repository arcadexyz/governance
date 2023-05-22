// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "./external/council/vaults/LockingVault.sol";

import { FLV_WithdrawsFrozen } from "./errors/Governance.sol";

/**
 * @title FrozenLockingVault
 * @author Non-Fungible Technologies, Inc.
 *
 * Voting vault with does not allow withdrawals.
 */
contract FrozenLockingVault is AbstractLockingVault {
    /// @notice Constructs the contract by setting immutables
    /// @param _token The external erc20 token contract
    /// @param _staleBlockLag The number of blocks before the delegation history is forgotten
    constructor(IERC20 _token, uint256 _staleBlockLag) AbstractLockingVault(_token, _staleBlockLag) {}

    // This function is the only way for tokens to leave the contract
    // Therefore they now revert

    /// @notice Does nothing, always reverts
    function withdraw(uint256) external pure override {
        revert FLV_WithdrawsFrozen();
    }
}
