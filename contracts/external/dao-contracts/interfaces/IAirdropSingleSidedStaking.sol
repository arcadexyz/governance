// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

interface IAirdropSingleSidedStaking {
    enum Lock {
        Short,
        Medium,
        Long
    }

    function airdropReceive(
        address recipient,
        uint256 amount,
        address delegation,
        Lock lock
    ) external;
}