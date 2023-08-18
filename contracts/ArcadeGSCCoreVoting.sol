// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "./ArcadeCoreVoting.sol";

/**
 * @title ArcadeGSCCoreVoting
 * @author Non-Fungible Technologies, Inc.
 *
 * The Arcade GSC Core Voting contract allows members of the GSC vault to vote on and execute proposals
 * in an instance of governance separate from general governance votes.
 *
 * The GSC version of the core voting contract is identical to the general core voting contract except
 * that new vaults cannot be added after deployment.
 */
contract ArcadeGSCCoreVoting is ArcadeCoreVoting {
    // ==================================== CONSTRUCTOR ================================================

    /**
     * @notice Constructs the contract by setting deployment variables.
     *
     * @param timelock                  The timelock contract.
     * @param baseQuorum                The default quorum for all functions with no set quorum.
     * @param minProposalPower          The minimum voting power needed to submit a proposal.
     * @param gsc                       The governance steering committee contract.
     * @param votingVaults              The initial approved voting vaults.
     */
    constructor(
        address timelock,
        uint256 baseQuorum,
        uint256 minProposalPower,
        address gsc,
        address[] memory votingVaults
    ) ArcadeCoreVoting(timelock, baseQuorum, minProposalPower, gsc, votingVaults, false) {}
}
