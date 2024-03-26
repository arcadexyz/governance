// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/INFTBoostVault.sol";

import { AA_ClaimingExpired, AA_AlreadyClaimed, AA_NonParticipant } from "../errors/Airdrop.sol";

/**
 * @title Arcade Merkle Rewards
 * @author Non-Fungible Technologies, Inc.
 *
 * This contract validates merkle proofs and allows users to claim their airdrop. It is designed to
 * be inherited by other contracts. This contract does not have a way to transfer tokens out of it
 * or change the merkle root.
 */
abstract contract ArcadeMerkleRewards {
    // ============================================ STATE ==============================================
    /// @notice the merkle root with deposits encoded into it as hash [address, amount]
    bytes32 public rewardsRoot;

    /// @notice the timestamp expiration of the rewards root
    uint256 public expiration;

    /// @notice user claim history by merkle root used to claim
    mapping(address => mapping(bytes32 => uint256)) public claimed;

    // ========================================== CONSTRUCTOR ===========================================

    /**
     * @notice Initiate the contract with a merkle tree root and an expiration time for claims.
     *
     * @param _rewardsRoot           The merkle root with deposits encoded into it as hash [address, amount]
     * @param _expiration            The expiration of the airdrop
     */
    constructor(bytes32 _rewardsRoot, uint256 _expiration) {
        if (_expiration <= block.timestamp) revert AA_ClaimingExpired();

        rewardsRoot = _rewardsRoot;
        expiration = _expiration;
    }

    // ======================================= REWARDS VALIDATION ========================================

    /**
     * @notice Validate a withdraw attempt by checking merkle proof and ensuring the user has not
     *         previously withdrawn.
     *
     * @param totalGrant             The total amount of tokens the user was granted
     * @param merkleProof            The merkle proof showing the user is in the merkle tree
     */
    function _validateWithdraw(uint256 totalGrant, bytes32[] memory merkleProof) internal {
        // validate proof and leaf hash
        bytes32 leafHash = keccak256(abi.encodePacked(msg.sender, totalGrant));
        if (!MerkleProof.verify(merkleProof, rewardsRoot, leafHash)) revert AA_NonParticipant();

        // ensure the user has not already claimed the airdrop for this merkle root
        if (claimed[msg.sender][rewardsRoot] != 0) revert AA_AlreadyClaimed();
        claimed[msg.sender][rewardsRoot] = totalGrant;
    }
}
