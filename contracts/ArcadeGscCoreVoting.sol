// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "./external/council/CoreVoting.sol";

/**
 *
 * @title ArcadeGSCCoreVoting
 * @author Non-Fungible Technologies, Inc.
 *
 *
 * The Arcade core voting contract allows a voting process for GSC members who have been allocated
 * governance power to execute proposals via the GSC vault.
 *
 */
contract ArcadeGSCCoreVoting is CoreVoting {
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
    ) CoreVoting(timelock, baseQuorum, minProposalPower, gsc, votingVaults) {}
}
