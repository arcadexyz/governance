// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./ArcadeAirdropBase.sol";

import "../../external/dao-contracts/interfaces/IAirdropSingleSidedStaking.sol";

import { AA_ZeroAddress } from "../../errors/Airdrop.sol";

/**
 * @title Airdrop Season 1
 * @author Non-Fungible Technologies, Inc.
 *
 * This contract is used to distribute tokens to users who have been airdropped
 * tokens. The tokens are distributed to the users directly, or users can choose
 * to have thier allocation staked in the ArcadeSingleSidedStaking contract.
 */
contract AirdropSeason1 is ArcadeAirdropBase, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================ STATE ==============================================
    /// @notice the voting vault vault which receives airdropped tokens
    IAirdropSingleSidedStaking public immutable votingVault;

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
     * @notice Claims an amount of tokens in the tree and stakes the tokens in the ArcadeSingleSidedStaking
     *         contract. The caller can choose who to delegate their voting power to by passing in the
     *         address of their delegate. If a user already has an active stake in the ArcadeSingleSidedStaking
     *         voting vault they must use the same delegate address they are already delegating to.
     *
     * @param delegate               The address the user will delegate to
     * @param totalGrant             The total amount of tokens the user was granted
     * @param merkleProof            The merkle proof showing the user is in the merkle tree
     * @param lock                   The locking period to apply to the staked tokens
     */
    function claimAndStake(
        address delegate,
        uint128 totalGrant,
        bytes32[] calldata merkleProof,
        IAirdropSingleSidedStaking.Lock lock
    ) external {
        _validateWithdraw(totalGrant, merkleProof);

        _setClaimed(msg.sender, totalGrant);

        // approve the voting vault to transfer tokens
        token.approve(address(votingVault), uint256(totalGrant));
        // stake tokens in voting vault for this msg.sender and delegate
        votingVault.airdropReceive(msg.sender, totalGrant, delegate, lock);

        emit Claimed(msg.sender, totalGrant);
    }

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
