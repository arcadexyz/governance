// SPDX-License-Identifier: MIT

pragma solidity >=0.8.18;

import "./external/council/vaults/GSCVault.sol";

/**
 *
 * @title ArcadeGSCCoreVoting
 * @author Non-Fungible Technologies, Inc.
 *
 *
 * The Arcade GSC voting vault contract enables the council members to vote on proposals and
 * execute them only with agreement from the council.
 *
 */

contract ArcadeGSCVotingVault is GSCVault {
    // ==================================== CONSTRUCTOR ================================================

    /**
     * @notice Constructs the contract and initial variables.
     *
     * @param coreVoting                The core voting contract associated with this vault.
     * @param votingPowerBound          The amount of voting power needed to be on the GSC.
     * @param owner                     The owner of this contract.
     */
    constructor(
        ICoreVoting coreVoting,
        uint256 votingPowerBound,
        address owner
    ) GSCVault(coreVoting, votingPowerBound, owner) {}
}
