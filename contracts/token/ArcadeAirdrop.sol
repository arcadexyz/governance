// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "../external/council/libraries/Authorizable.sol";

import "../libraries/ArcadeMerkleRewards.sol";

import { AA_ClaimingNotExpired, AA_ZeroAddress } from "../errors/Airdrop.sol";

/**
 * @title Arcade Airdrop
 * @author Non-Fungible Technologies, Inc.
 *
 * This contract receives tokens from the ArcadeTokenDistributor and facilitates airdrop claims.
 * The contract is ownable, where the owner can reclaim any remaining tokens once the airdrop is
 * over and also change the merkle root at their discretion.
 */
contract ArcadeAirdrop is ArcadeMerkleRewards, Authorizable {
    // ========================================== CONSTRUCTOR ===========================================

    /**
     * @notice Initiate the contract with a merkle tree root, a token for distribution,
     *         an expiration time for claims, and the voting vault that tokens will be
     *         airdropped into. In addition, set a governance parameter for the address that
     *         can reclaim tokens after expiry.
     *
     * @param _governance           The address that can reclaim tokens after expiry
     * @param _merkleRoot           The merkle root with deposits encoded into it as hash [address, amount]
     * @param _token                The token to airdrop
     * @param _expiration           The expiration of the airdrop
     * @param _votingVault         The voting vault to deposit tokens to
     */
    constructor(
        address _governance,
        bytes32 _merkleRoot,
        IERC20 _token,
        uint256 _expiration,
        INFTBoostVault _votingVault
    ) ArcadeMerkleRewards(_merkleRoot, _token, _expiration, _votingVault) {
        if (_governance == address(0)) revert AA_ZeroAddress();

        setOwner(_governance);
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
        if (destination == address(0)) revert AA_ZeroAddress();

        uint256 unclaimed = token.balanceOf(address(this));
        token.transfer(destination, unclaimed);
    }

    /**
     * @notice Allows the owner to change the merkle root.
     *
     * @param _merkleRoot        The new merkle root
     */
    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        rewardsRoot = _merkleRoot;
    }
}
