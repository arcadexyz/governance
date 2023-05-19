// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "../interfaces/IReputationBadge.sol";

import { RB_InvalidMerkleProof, RB_InvalidMintFee, RB_AlreadyClaimed, RB_ZeroAddress } from "../errors/Badge.sol";

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
 * Only the manager of the contract can update the merkle trie. Additionally, there is an
 * optional mint price which can be set and claimed by the manager.
 */
contract ReputationBadge is ERC1155, AccessControl, ERC1155Burnable, IReputationBadge {
    using Strings for uint256;

    /// @notice access control roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER");
    bytes32 public constant RESOURCE_MANAGER_ROLE = keccak256("RESOURCE_MANAGER");

    /// @notice The merkle root with tokenId encoded into it as hash [address, tokenId]
    bytes32 public rewardsRoot;

    /// @notice The mint price for a badge
    uint256 public mintPrice;

    /// @notice The base URI for the badge NFTs
    string public baseURI;

    /// @notice user to tokenId claim mapping to prevent double claiming
    mapping(address => mapping(uint256 => bool)) public claimed;

    /**
     * @notice Constructor for the contract. Sets the merkle root and specifies owner and
     *         manager addresses.
     *
     * @param _root          Initial merkle root to use claims.
     * @param _mintPrice     The mint price for a badge.
     * @param _owner         The owner of the contract.
     */
    constructor(bytes32 _root, uint256 _mintPrice, address _owner) ERC1155("") {
        if (_owner == address(0)) revert RB_ZeroAddress();

        _setupRole(ADMIN_ROLE, _owner);
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
        _setRoleAdmin(MANAGER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(RESOURCE_MANAGER_ROLE, ADMIN_ROLE);

        rewardsRoot = _root;
        mintPrice = _mintPrice;
    }

    // =============================== BADGE FUNCTIONS ==============================

    /**
     * @notice Mint a badge to a user who has a valid claim.
     *
     * @param recipient         The address of the user to mint the badge to.
     * @param tokenId           The ID of the badge to mint.
     * @param merkleProof       The merkle proof to verify the claim.
     */
    function mint(
        address recipient,
        uint256 tokenId,
        bytes32[] calldata merkleProof
    ) public payable onlyRole(MINTER_ROLE) {
        if (msg.value < mintPrice) revert RB_InvalidMintFee(mintPrice, msg.value);
        if (claimed[recipient][tokenId]) revert RB_AlreadyClaimed();
        if (!_verifyClaim(recipient, tokenId, merkleProof)) revert RB_InvalidMerkleProof();

        claimed[recipient][tokenId] = true;

        _mint(recipient, tokenId, 1, "");
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
     * @notice Set the merkle root for the contract.
     *
     * @param _root         The new merkle root to use for claims.
     */
    function setMerkleRoot(bytes32 _root) external onlyRole(MANAGER_ROLE) {
        rewardsRoot = _root;
    }

    /**
     * @notice Set the mint price for the contract.
     *
     * @param _mintPrice    The new mint price to use for claims.
     */
    function setMintPrice(uint256 _mintPrice) external onlyRole(MANAGER_ROLE) {
        mintPrice = _mintPrice;
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
     * @param merkleProof       The merkle proof to verify the claim.
     *
     * @return bool             Whether or not the claim is valid.
     */
    function _verifyClaim(
        address recipient,
        uint256 tokenId,
        bytes32[] calldata merkleProof
    ) internal view returns (bool) {
        bytes32 leafHash = keccak256(abi.encodePacked(recipient, tokenId));

        return MerkleProof.verify(merkleProof, rewardsRoot, leafHash);
    }

    /// @notice function override to support AccessControl
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155, AccessControl, IERC165) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
