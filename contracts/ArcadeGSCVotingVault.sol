// SPDX-License-Identifier: MIT

pragma solidity >=0.8.18;

import "./external/council/vaults/GSCVault.sol";

/**
 *
 * @title ArcadeGSCCoreVoting
 * @author Non-Fungible Technologies, Inc.
 *
 *
 * The Arcade GSC voting vault contract enables the council members to vote on proposals and execute them only
 * with agreement from the council.
 *
 * The GSC voting vault gives one vote to each member of the GSC council. Members can propose on-chain votes directly
 * without meeting the minimum requirement of voting power for proposal creation (aka spam threshold), and it can
 * move directly to on-chain voting. This is in contrast to the rest of the governance community’s proposal creation
 * process, an off-chain poll and lastly an on-chain vote.
 *
 * The GSC can make calls that have any custom GSC consensus requirement, ranging from one GSC member vote to a
 * supermajority. This means a wide variety of committee-based vote systems can run in parallel to the main voting
 * system! This is accomplished by using a copy of the core voting contract.
 *
 * The GSC is a group of delegates, each of whom has reached a pre-established threshold of delegated voting power,
 * giving them additional governance powers within the system, and as a result, additional responsibilities.
 * GSC members can have different special functions (propose votes directly on chain, spend a portion of treasury
 * funds at their discretion, etc.), different responsibilities (DAO2DAO relationships, collaborations, treasury
 * management, community engagement, etc.), and might (depending upon a vote) be compensated for the time and effort
 * that they dedicate to improving the protocol. All of these functions and responsibilities must be defined and
 * ratified through the governance process.
 *
 * source: //docs.element.fi/governance-council/council-protocol-overview/governance-steering-council
 */

contract ArcadeGSCVotingVault is GSCVault {
    // ==================================== CONSTRUCTOR ================================================

    /**
     * @notice Constructs the contract and initial variables.
     *
     * @param coreVoting                The core voting contract.
     * @param votingPowerBound          The amount of voting power needed to be on the GSC.
     * @param owner                     The owner of this contract.
     */
    constructor(
        ICoreVoting coreVoting,
        uint256 votingPowerBound,
        address owner
    ) GSCVault(coreVoting, votingPowerBound, owner) {}
}
