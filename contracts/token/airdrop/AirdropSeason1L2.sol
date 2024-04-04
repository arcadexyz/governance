// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./ArcadeAirdropBase.sol";

/**
 * @title Airdrop Season 1 L2
 * @author Non-Fungible Technologies, Inc.
 *
 * This contract is used to distribute tokens to users who are eligible for the airdrop.
 */
contract AirdropSeason1L2 is ArcadeAirdropBase, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================ EVENTS =============================================

    event Claimed(address indexed user, uint128 totalGrant);

    // ========================================== CONSTRUCTOR ==========================================
    /**
     * @notice Initiate the contract with a merkle tree root, a token for distribution,
     *         an expiration time for claims, and the voting vault that tokens will be
     *         airdropped into.
     *
     * @param _token                The token to airdrop
     * @param _merkleRoot           The merkle root with deposits encoded into it as hash [address, amount]
     * @param _expiration           The expiration of the airdrop
     */
    constructor(
        IERC20 _token,
        bytes32 _merkleRoot,
        uint256 _expiration
    ) ArcadeAirdropBase(_token, _merkleRoot, _expiration) {}

    // ===================================== CLAIM FUNCTIONALITY =======================================

    /**
     * @notice Claims an amount of tokens in the tree and send them to the caller.
     *
     * @param totalGrant             The total amount of tokens the user was granted
     * @param merkleProof            The merkle proof showing the user is in the merkle tree
     */
    function claim(uint128 totalGrant, bytes32[] calldata merkleProof) external nonReentrant {
        _validateWithdraw(totalGrant, merkleProof);

        _setClaimed(msg.sender, totalGrant);

        // transfer tokens to the caller
        token.safeTransfer(msg.sender, totalGrant);

        emit Claimed(msg.sender, totalGrant);
    }
}
