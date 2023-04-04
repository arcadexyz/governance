// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../external/council/libraries/Authorizable.sol";
import "../external/council/libraries/MerkleRewards.sol";

/**
 * @title Arcade Airdrop
 *
 * This contract was sourced from the DELV (Element.Fi) source code for which can be found here:
 * https://etherscan.io/address/0xd04a459FFD3A5E3C93d5cD8BB13d26a9845716c2#code
 *
 * This contract recieves tokens from the ArcadeTokenDistributor contract and allows users to claim
 * their tokens. The contract is owned by the ArcadeGovernance contract which can reclaim the tokens
 * once the airdrop is over.
 *
 * As users claim their tokens, the contract will deposit them into a FrozenLockingVault contract for
 *  use in Arcade Governance. The claim function is disabled and users can claim tokens after the
 * FrozenLockingVault contract has withdraws enabled by and authorized account.
 */
contract Airdrop is MerkleRewards, Authorizable {
    // The time after which the token cannot be claimed
    uint256 public immutable expiration;

    /// @notice Constructs the contract and sets state and immutable variables
    /// @param _governance The address which can withdraw funds when the drop expires
    /// @param _merkleRoot The root a keccak256 merkle tree with leaves which are address amount pairs
    /// @param _token The erc20 contract which will be sent to the people with claims on the contract
    /// @param _expiration The unix second timestamp when the airdrop expires
    /// @param _lockingVault The governance vault which this deposits to on behalf of users
    constructor(
        address _governance,
        bytes32 _merkleRoot,
        IERC20 _token,
        uint256 _expiration,
        ILockingVault _lockingVault
    ) MerkleRewards(_merkleRoot, _token, _lockingVault) {
        // Set expiration immutable and governance to the owner
        expiration = _expiration;
        setOwner(_governance);
    }

    /// @notice Allows governance to remove the funds in this contract once the airdrop is over.
    ///         Claims aren't blocked the airdrop ending at expiration is optional and gov has to
    ///         manually end it.
    /// @param destination The treasury contract which will hold the freed tokens
    function reclaim(address destination) external onlyOwner {
        require(block.timestamp > expiration, "Not expired");
        uint256 unclaimed = token.balanceOf(address(this));
        token.transfer(destination, unclaimed);
    }

    /// @notice Claims an amount of tokens which are in the tree and send them to the user
    /// @param amount The amount of tokens to claim
    /// @param totalGrant The total amount of tokens the user was granted
    /// @param merkleProof The merkle de-commitment which proves the user is in the merkle root
    /// @param destination The address which will be credited with funds
    function claim(
        uint256 amount,
        uint256 totalGrant,
        bytes32[] calldata merkleProof,
        address destination
    ) external virtual override {
        revert("Not Allowed to claim");
    }
}