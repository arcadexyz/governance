// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/**
 * @title MerkleVerifier
 * @dev Utility functions for Merkle tree computations
 *
 * This contract was sourced from the Blur project the source code for which can be found here:
 * https://etherscan.io/address/0xf2d15c0a89428c9251d71a0e29b39ff1e86bce25#code
 * Unlike the airdropper contract, this contract has not been modified.
 */
library MerkleVerifier {
    error InvalidProof();

    /**
     * @dev Verify the merkle proof
     * @param leaf leaf
     * @param root root
     * @param proof proof
     */
    function _verifyProof(bytes32 leaf, bytes32 root, bytes32[] memory proof) public pure {
        bytes32 computedRoot = _computeRoot(leaf, proof);
        if (computedRoot != root) {
            revert InvalidProof();
        }
    }

    /**
     * @dev Compute the merkle root
     * @param leaf leaf
     * @param proof proof
     */
    function _computeRoot(bytes32 leaf, bytes32[] memory proof) public pure returns (bytes32) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            computedHash = _hashPair(computedHash, proofElement);
        }
        return computedHash;
    }

    function _hashPair(bytes32 a, bytes32 b) private pure returns (bytes32) {
        return a < b ? _efficientHash(a, b) : _efficientHash(b, a);
    }

    function _efficientHash(bytes32 a, bytes32 b) private pure returns (bytes32 value) {
        assembly {
            mstore(0x00, a)
            mstore(0x20, b)
            value := keccak256(0x00, 0x40)
        }
    }
}
