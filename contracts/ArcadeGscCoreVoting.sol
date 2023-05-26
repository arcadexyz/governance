// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "./external/council/CoreVoting.sol";

/**
 * @title ArcadeGSCCoreVoting
 * @author Non-Fungible Technologies, Inc.
 *
 * The Arcade GSC Core Voting contract allows members of the GSV vault to vote on and execute proposals
 * in a separate instance of governance separate for all general governance votes.
 *
 * The GSC Core Voting contract cannot add proposals to the timelock. It can only extend the waiting
 * period of queued proposals in the timelock. In addition, the GSC Core Voting contract can submit
 * proposals to the General Core Voting contract without meeting the quorum threshold.
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
