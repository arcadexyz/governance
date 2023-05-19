// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface IReputationBadge is IERC1155 {
    function mint(address recipient, uint256 tokenId, bytes32[] calldata merkleProof) external payable;

    function setMerkleRoot(bytes32 _root) external;

    function setMintPrice(uint256 _mintPrice) external;

    function mintPrice() external view returns (uint256);

    function rewardsRoot() external view returns (bytes32);

    function claimed(address, uint256) external view returns (bool);

    function baseURI() external view returns (string memory);

    function setBaseURI(string memory) external;

    function withdrawFees() external;
}
