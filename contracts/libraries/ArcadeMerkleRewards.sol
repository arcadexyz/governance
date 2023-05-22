// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import "../external/council/interfaces/IERC20.sol";
import "../external/council/interfaces/ILockingVault.sol";

import { AA_ClaimingExpired, AA_AlreadyClaimed, AA_NonParticipant, AA_ZeroAddress } from "../errors/Airdrop.sol";

/**
 * @title Arcade Merkle Rewards
 * @author Non-Fungible Technologies, Inc.
 *
 * This contract validates merkle proofs and allows users to claim their airdrop. It is designed to
 * be inherited by other contracts. This contract does not have a way to transfer tokens out of it
 * or change the merkle root.
 *
 * As users claim their tokens, this contract will deposit them into a frozen locking vault for
 * use in Arcade Governance. When claiming, the user can delegate voting power to themselves or
 * another account.
 */
contract ArcadeMerkleRewards {
    // ============================================ STATE ==============================================

    // =================== Immutable references =====================

    /// @notice the token to airdrop
    IERC20 public immutable token;
    /// @notice the expiration of the airdrop
    uint256 public immutable expiration;

    // ==================== Reward Claim State ======================

    /// @notice the merkle root with deposits encoded into it as hash [address, amount]
    bytes32 public rewardsRoot;

    /// @notice past user claims
    mapping(address => uint256) public claimed;

    /// @notice the locking vault to deposit tokens to
    ILockingVault public lockingVault;

    // ========================================== CONSTRUCTOR ===========================================

    /**
     * @notice Instanatiate the contract with a merkle tree root, a token for distribution,
     *         an expiration time for claims, and the voting vault that tokens will be
     *         airdropped into.
     *
     * @param _rewardsRoot           The merkle root with deposits encoded into it as hash [address, amount]
     * @param _token                 The token to airdrop
     * @param _expiration            The expiration of the airdrop
     * @param _lockingVault          The locking vault to deposit tokens to
     */
    constructor(bytes32 _rewardsRoot, IERC20 _token, uint256 _expiration, ILockingVault _lockingVault) {
        rewardsRoot = _rewardsRoot;
        token = _token;
        expiration = _expiration;
        lockingVault = _lockingVault;

        // we approve the locking vault so that it can deposit on behalf of users
        _token.approve(address(lockingVault), type(uint256).max);
    }

    // ===================================== CLAIM FUNCTIONALITY ========================================

    /**
     * @notice Claims an amount of tokens in the tree and delegates to governance.
     *
     * @param delegate               The address the user will delegate to
     * @param totalGrant             The total amount of tokens the user was granted
     * @param merkleProof            The merkle proof showing the user is in the merkle tree
     */
    function claimAndDelegate(address delegate, uint256 totalGrant, bytes32[] calldata merkleProof) external {
        // must be before the expiration time
        if (block.timestamp > expiration) revert AA_ClaimingExpired();
        // no delegating to zero address
        if (delegate == address(0)) revert AA_ZeroAddress();
        // validate the withdraw
        _validateWithdraw(totalGrant, merkleProof);
        // deposit for this sender into locking vault and delegate
        lockingVault.deposit(msg.sender, totalGrant, delegate);
    }

    // =========================================== HELPERS ==============================================

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

        // ensure the user has not already claimed the airdrop
        if (claimed[msg.sender] != 0) revert AA_AlreadyClaimed();
        claimed[msg.sender] = totalGrant;
    }
}
