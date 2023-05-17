// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

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
contract ReputationBadge is ERC1155, AccessControl {
    /// @notice access control roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER");

    /// @notice The merkle root with tokenId encoded into it as hash [address, tokenId]
    bytes32 public rewardsRoot;

    /// @notice The mint price for a badge
    uint256 public mintPrice;

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
        _setupRole(ADMIN_ROLE, _owner);
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
        _setRoleAdmin(MANAGER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);

        rewardsRoot = _root;
        mintPrice = _mintPrice;
    }

    // =============================== MINTER FUNCTIONS ==============================

    function mint(
        address recipient,
        uint256 tokenId,
        bytes32[] calldata merkleProof
    ) public payable onlyRole(MINTER_ROLE) {
        require(msg.value >= mintPrice, "ReputationBadge: Insufficient mint fee");
        require(!claimed[recipient][tokenId], "ReputationBadge: badge type already claimed");
        require(_verifyClaim(recipient, tokenId, merkleProof), "ReputationBadge: Invalid claim");

        claimed[recipient][tokenId] = true;

        _mint(recipient, tokenId, 1, "");
    }

    // =========================== MANAGER FUNCTIONS ===========================

    function setURI(string memory _uri) public onlyRole(MANAGER_ROLE) {
        _setURI(_uri);
    }

    function setMerkleRoot(bytes32 _root) external onlyRole(MANAGER_ROLE) {
        rewardsRoot = _root;
    }

    function setMintPrice(uint256 _mintPrice) external onlyRole(MANAGER_ROLE) {
        mintPrice = _mintPrice;
    }

    function withdrawFees() external onlyRole(MANAGER_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }

    // =================================== HELPERS ===================================

    function _verifyClaim(
        address recipient,
        uint256 tokenId,
        bytes32[] calldata merkleProof
    ) internal view returns (bool) {
        bytes32 leafHash = keccak256(abi.encodePacked(recipient, tokenId));

        return MerkleProof.verify(merkleProof, rewardsRoot, leafHash);
    }

    /// @notice function override to support AccessControl
    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
