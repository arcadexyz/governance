// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "../interfaces/IReputationBadge.sol";

import {
    RB_InvalidMerkleProof,
    RB_InvalidMintFee,
    RB_InvalidClaimAmount,
    RB_ZeroAddress,
    RB_ClaimingExpired,
    RB_NoClaimData,
    RB_ArrayTooLarge
} from "../errors/Badge.sol";

/**
 * @title ReputationBadge
 * @author Non-Fungible Technologies, Inc.
 *
 * Reputation badges are ERC1155 tokens that can be minted by a user who meets certain criteria.
 * For example, a user who has completed a certain number of tasks can be awarded a badge.
 * The badge can be used in governance to give a mulitplier to a users voting power. Voting
 * power multipliers associated with each tokenId are stored in the governance vault contracts
 * not the badge contract.
 *
 * This contract uses a merkle trie to determine which users are eligible to mint a badge.
 * Only the manager of the contract can update the merkle roots and claim expirations. Additionally,
 * there is an optional mint price which can be set and claimed by the manager.
 */
contract ReputationBadge is ERC1155, AccessControl, ERC1155Burnable, IReputationBadge {
    using Strings for uint256;

    /// @notice access control roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER");
    bytes32 public constant RESOURCE_MANAGER_ROLE = keccak256("RESOURCE_MANAGER");

    /// @notice The base URI for the badge NFTs
    string public baseURI;

    /// @notice recipient address to tokenId to amount claimed mapping
    mapping(address => mapping(uint256 => uint256)) public amountClaimed;

    /// @notice Claim tree for each tokenId, with the leaf encoding [address, tokenId, totalClaimableAmount]
    mapping(uint256 => bytes32) public claimRoots;

    /// @notice Expiry date for each tokenId claim
    mapping(uint256 => uint48) public claimExpirations;

    /// @notice Mint price for each tokenId
    mapping(uint256 => uint256) public mintPrices;

    /**
     * @notice Constructor for the contract. Sets owner and manager addresses.
     *
     * @param _owner         The owner of the contract.
     */
    constructor(address _owner) ERC1155("") {
        if (_owner == address(0)) revert RB_ZeroAddress();

        _setupRole(ADMIN_ROLE, _owner);
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
        _setRoleAdmin(MANAGER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(RESOURCE_MANAGER_ROLE, ADMIN_ROLE);
    }

    // =============================== BADGE FUNCTIONS ==============================

    /**
     * @notice Mint a specified number of badges to a user who has a valid claim.
     *
     * @param recipient         The address of the user to mint the badge to.
     * @param tokenId           The ID of the badge to mint.
     * @param amount            The amount of a specific badge to claim.
     * @param totalClaimable    The total amount of a specific badge that can be claimed.
     * @param merkleProof       The merkle proof to verify the claim.
     */
    function mint(
        address recipient,
        uint256 tokenId,
        uint256 amount,
        uint256 totalClaimable,
        bytes32[] calldata merkleProof
    ) public payable {
        uint256 mintPrice = mintPrices[tokenId];
        uint48 claimExpiration = claimExpirations[tokenId];

        if (block.timestamp > claimExpiration) revert RB_ClaimingExpired(claimExpiration, uint48(block.timestamp));
        if (msg.value < mintPrice) revert RB_InvalidMintFee(mintPrice, msg.value);
        if (!_verifyClaim(recipient, tokenId, totalClaimable, merkleProof)) revert RB_InvalidMerkleProof();
        if (amountClaimed[recipient][tokenId] + amount > totalClaimable) {
            revert RB_InvalidClaimAmount(amount, totalClaimable);
        }

        // increment amount claimed
        amountClaimed[recipient][tokenId] += amount;

        // mint to recipient
        _mint(recipient, tokenId, amount, "");
    }

    /**
     * @notice Get the URI for a specific ERC1155 token ID.
     *
     * @param tokenId               The ID of the token to get the URI for.
     *
     * @return uri                  The token ID's URI.
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString())) : "";
    }

    // =========================== MANAGER FUNCTIONS ===========================

    /**
     * @notice Update the claim data that is used to validate user claims.
     *
     * @param _claimData        The claim data to update.
     */
    function publishRoots(ClaimData[] calldata _claimData) external onlyRole(MANAGER_ROLE) {
        if (_claimData.length == 0) revert RB_NoClaimData();
        if (_claimData.length > 50) revert RB_ArrayTooLarge();

        for (uint256 i = 0; i < _claimData.length; i++) {
            // expiration check
            if (_claimData[i].claimExpiration <= block.timestamp) {
                revert RB_ClaimingExpired(_claimData[i].claimExpiration, uint48(block.timestamp));
            }

            claimRoots[_claimData[i].tokenId] = _claimData[i].claimRoot;
            claimExpirations[_claimData[i].tokenId] = _claimData[i].claimExpiration;
            mintPrices[_claimData[i].tokenId] = _claimData[i].mintPrice;
        }
    }

    /**
     * @notice Withdraw any ETH fees from the contract.
     */
    function withdrawFees() external onlyRole(MANAGER_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }

    // ======================== RESOURCE MANAGER FUNCTIONS ========================

    /**
     * @notice Set the base URI for the contract.
     *
     * @param _newBaseURI   The new base URI to use for the contract.
     */
    function setBaseURI(string memory _newBaseURI) public onlyRole(RESOURCE_MANAGER_ROLE) {
        baseURI = _newBaseURI;
    }

    // ================================= HELPERS ==================================

    /**
     * @notice Verify a claim for a user using merkle proof.
     *
     * @param recipient         The address of the user to verify the claim for.
     * @param tokenId           The ID of the badge to verify.
     * @param totalClaimable    Total amount of badges a recipient can claim.
     * @param merkleProof       The merkle proof to verify the claim.
     *
     * @return bool             Whether or not the claim is valid.
     */
    function _verifyClaim(
        address recipient,
        uint256 tokenId,
        uint256 totalClaimable,
        bytes32[] calldata merkleProof
    ) internal view returns (bool) {
        bytes32 rewardsRoot = claimRoots[tokenId];
        bytes32 leafHash = keccak256(abi.encodePacked(recipient, tokenId, totalClaimable));

        return MerkleProof.verify(merkleProof, rewardsRoot, leafHash);
    }

    /// @notice function override
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155, AccessControl, IERC165) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
