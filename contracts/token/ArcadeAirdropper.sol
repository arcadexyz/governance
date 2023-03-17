// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../lib/MerkleVerifier.sol";

import { AD_AlreadyClaimed, AD_ClaimPeriodActive } from "../errors/Airdrop.sol";

/**
 * @title Arcade Airdropper
 *
 * This contract was sourced from the Blur project the source code for which can be found here:
 * https://etherscan.io/address/0xf2d15c0a89428c9251d71a0e29b39ff1e86bce25#code
 * The original code has been sligthly modified for gas savings by adding custom errors. Also,
 * the reclaim function returns all unclaimed tokens to the owner of the contract, rather than a
 * specific amount.
 *
 * This airdrop contract is to be used to distribute airdrop rewards to Arcade users. This
 * contract is designed to be used with a merkle trie that contains a list of Arcade users and
 * their airdrop token amounts. The merkle trie is generated off chain and the root is stored on
 * chain and is used to verify a user's claim amount.
 *
 * Upon deployment of this contract, the merkle root is set and airdrops are ready to be claimed.
 * After the claiming period has ended, the owner of the contract can reclaim all unclaimed tokens.
 * Claiming of tokens can happen at any time before the reclaim function has been called.
 *
 * The setMerkleRoot function is only to be used in the event that the merkle root needs to be
 * updated. This is unlikely to happen, but is included as a failsafe for post deployment changes
 * to a merkle trie.
 */
contract ArcadeAirdropper is Ownable {
    uint256 public reclaimPeriod;
    address public token;
    bytes32 public merkleRoot;
    mapping(bytes32 => bool) public claimed;

    event Claimed(address account, uint256 amount);

    constructor(address _token, bytes32 _merkleRoot, uint256 reclaimDelay) {
        token = _token;
        merkleRoot = _merkleRoot;
        reclaimPeriod = block.timestamp + reclaimDelay;
    }

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function claim(address account, uint256 amount, bytes32[] memory proof) external {
        bytes32 leaf = keccak256(abi.encodePacked(account, amount));
        if (claimed[leaf]) revert AD_AlreadyClaimed();
        MerkleVerifier._verifyProof(leaf, merkleRoot, proof);
        claimed[leaf] = true;

        IERC20(token).transfer(account, amount);

        emit Claimed(account, amount);
    }

    function reclaim() external onlyOwner {
        if (block.timestamp < reclaimPeriod) revert AD_ClaimPeriodActive();

        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(msg.sender, balance);
    }
}
