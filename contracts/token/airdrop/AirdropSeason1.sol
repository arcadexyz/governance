// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "./ArcadeAirdropBase.sol";

import "../../external/dao-contracts/interfaces/IAirdropSingleSidedStaking.sol";

import {
    AA_ZeroAddress,
    AA_NotInitialized,
    AA_ClaimingExpired
} from "../../errors/Airdrop.sol";

/**
 * @title Airdrop Season 1
 * @author Non-Fungible Technologies, Inc.
 */
contract AirdropSeason1 is ArcadeAirdropBase {
    // ============================================ STATE ==============================================
    /// @notice the voting vault vault which receives airdropped tokens
    IAirdropSingleSidedStaking public immutable votingVault;

    // ========================================== CONSTRUCTOR ==========================================
    /**
     * @notice Initiate the contract with a merkle tree root, a token for distribution,
     *         an expiration time for claims, and the voting vault that tokens will be
     *         airdropped into.
     *
     * @param _token                The token to airdrop
     * @param _merkleRoot           The merkle root with deposits encoded into it as hash [address, amount]
     * @param _expiration           The expiration of the airdrop
     * @param _votingVault          The voting vault to deposit tokens to
     */
    constructor(
        IERC20 _token,
        bytes32 _merkleRoot,
        uint256 _expiration,
        IAirdropSingleSidedStaking _votingVault
    ) ArcadeAirdropBase(_token, _merkleRoot, _expiration) {
        if (address(_votingVault) == address(0)) revert AA_ZeroAddress("votingVault");

        votingVault = _votingVault;
    }

    // ===================================== CLAIM FUNCTIONALITY =======================================

    /**
     * @notice Claims an amount of tokens in the tree and delegates to governance. If the user has
     *         not received an airdrop, they can claim it and delegate to themselves by passing in
     *         their address as the delegate or address(0). If a user has claimed before, they must
     *         use the same delegate address they are already delegating to.
     *
     * @param delegate               The address the user will delegate to
     * @param totalGrant             The total amount of tokens the user was granted
     * @param merkleProof            The merkle proof showing the user is in the merkle tree
     * @param lock                   The locking period to apply to the staked tokens
     */
    function claimAndDelegate(
        address delegate,
        uint128 totalGrant,
        bytes32[] calldata merkleProof,
        IAirdropSingleSidedStaking.Lock lock
    ) external {
        if (rewardsRoot == bytes32(0)) revert AA_NotInitialized();
        // must be before the expiration time
        if (block.timestamp > expiration) revert AA_ClaimingExpired();
        // validate the withdraw
        _validateWithdraw(totalGrant, merkleProof);

        // approve the voting vault to transfer tokens
        token.approve(address(votingVault), uint256(totalGrant));
        // deposit tokens in voting vault for this msg.sender and delegate
        votingVault.airdropReceive(msg.sender, totalGrant, delegate, lock);
    }
}