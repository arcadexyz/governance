// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../../external/council/libraries/Authorizable.sol";

import {
    AA_ClaimingNotExpired,
    AA_AlreadyClaimed,
    AA_NonParticipant,
    AA_ClaimingExpired,
    AA_ZeroAddress,
    AA_NotInitialized
} from "../../errors/Airdrop.sol";

/**
 * @title Arcade Airdrop
 * @author Non-Fungible Technologies, Inc.
 *
 * This contract contains the base functionality for an airdrop. The contract is ownable, where the
 * owner can reclaim any remaining tokens once the airdrop is over and also change the merkle root
 * and expiration at their discretion.
 */
abstract contract ArcadeAirdropBase is Authorizable {
    using SafeERC20 for IERC20;
    // ============================================ STATE ==============================================
    /// @notice the token to airdrop
    IERC20 public immutable token;

    /// @notice the merkle root with deposits encoded into it as hash [address, amount]
    bytes32 public rewardsRoot;

    /// @notice the timestamp expiration of the rewards root
    uint256 public expiration;

    /// @notice user claim history by merkle root used to claim
    mapping(address => mapping(bytes32 => uint256)) public claimed;

    // ============================================= EVENTS =============================================

    event SetMerkleRoot(bytes32 indexed merkleRoot, uint256 indexed expiration);

    // ========================================== CONSTRUCTOR ===========================================

    /**
     * @notice Initiate the contract with a merkle tree root, a token for distribution,
     *         an expiration time for claims.
     *
     * @param _token                The token to airdrop
     * @param _rewardsRoot          The merkle root with deposits encoded into it as hash [address, amount]
     * @param _expiration           The expiration of the airdrop
     */
    constructor(IERC20 _token, bytes32 _rewardsRoot, uint256 _expiration) {
        if (address(_token) == address(0)) revert AA_ZeroAddress("token");
        if (_expiration <= block.timestamp) revert AA_ClaimingExpired();

        token = _token;
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
    function _validateWithdraw(uint256 totalGrant, bytes32[] memory merkleProof) internal view {
        // merkle root must be set
        if (rewardsRoot == bytes32(0)) revert AA_NotInitialized();
        // can only claim before the expiration time
        if (block.timestamp > expiration) revert AA_ClaimingExpired();

        // validate proof and leaf hash
        bytes32 leafHash = keccak256(abi.encodePacked(msg.sender, totalGrant));
        if (!MerkleProof.verify(merkleProof, rewardsRoot, leafHash)) revert AA_NonParticipant();
    }

    // ========================================== HELPERS ===============================================

    /**
     * @notice Get the claimed amount for a user and merkle root
     *
     * @param user                  The user to check
     * @param merkleRoot            The merkle root to check
     *
     * @return claimed              The amount claimed by the user
     */
    function getClaimed(address user, bytes32 merkleRoot) external view returns (uint256) {
        return claimed[user][merkleRoot];
    }

    /**
     * @notice Set the claimed amount for a user and merkle root. The user
     *         cannot claim twice from the same root.
     *
     * @param user                  The user to set
     * @param totalGrant            The total amount claimed
     */
    function _setClaimed(address user, uint256 totalGrant) internal {
        // ensure the user has not already claimed the airdrop for this merkle root
        if (claimed[user][rewardsRoot] != 0) revert AA_AlreadyClaimed();

        claimed[user][rewardsRoot] = totalGrant;
    }

    // ===================================== ADMIN FUNCTIONALITY ========================================

    /**
     * @notice Allows governance to remove the funds in this contract once the airdrop is over.
     *         This function can only be called after the expiration time.
     *
     * @param destination        The address which will receive the remaining tokens
     */
    function reclaim(address destination) external onlyOwner {
        if (block.timestamp <= expiration) revert AA_ClaimingNotExpired();
        if (destination == address(0)) revert AA_ZeroAddress("destination");

        uint256 unclaimed = token.balanceOf(address(this));
        token.safeTransfer(destination, unclaimed);
    }

    /**
     * @notice Allows the owner to set a merkle root and its expiration timestamp. When creating
     *         a merkle trie, a users address should not be associated with multiple leaves.
     *
     * @param _merkleRoot        The new merkle root
     * @param _expiration        The new expiration timestamp for this root
     */
    function setMerkleRoot(bytes32 _merkleRoot, uint256 _expiration) external onlyOwner {
        if (_expiration <= block.timestamp) revert AA_ClaimingExpired();

        rewardsRoot = _merkleRoot;
        expiration = _expiration;

        emit SetMerkleRoot(_merkleRoot, _expiration);
    }
}
