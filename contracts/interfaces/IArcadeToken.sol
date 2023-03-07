// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

interface IArcadeToken {
    // ================= MINTING OPERATIONS =================

    function mintToTreasury(address to) external;

    function mintToDevPartner(address to) external;

    function mintToCommunityRewards(address to) external;

    function mintToCommunityAirdrop(address to) external;

    function mintToVesting(address to) external;
}
