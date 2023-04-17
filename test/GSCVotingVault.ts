import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { TestContextVotingVault, votingVaultFixture } from "./utils/votingVaultFixture";

const { provider } = waffle;

/**
 * The GSC voting vault gives one vote to each member of the GSC council. When attached to a core voting contract,
 * it enables the council members to vote on proposals and execute them only with agreement from the council.
 *
 * The GSC can propose on-chain votes directly without meeting the minimum requirement of voting power for proposal
 * creation (aka spam threshold), and it can move directly to on-chain voting. This is in contrast to the rest of
 * the governance community’s proposal creation process, an off-chain poll, and lastly an on-chain vote.
 *
 * The GSC can make calls that have any custom GSC consensus requirement, ranging from one GSC member vote to a
 * supermajority. This means a wide variety of committee-based vote systems can run in parallel to the main voting
 * system! This is accomplished by using a copy of the core voting contract.
 *
 * The GSC is a group of delegates, each of whom has reached a pre-established threshold of delegated voting power,
 * giving them additional governance powers within the system, and as a result, additional responsibilities.
 * GSC members can have different special functions (propose votes directly on chain, spend a portion of treasury
 * funds at their discretion, etc.), different responsibilities (DAO2DAO relationships, collaborations, treasury
 * management, community engagement, etc.), and might (depending upon a vote) be compensated for the time and effort * that they dedicate to improving the protocol. All of these functions and responsibilities must be defined and
 * ratified through the governance process.
 */ souce: //docs.element.fi/governance-council/council-protocol-overview/governance-steering-council

https: describe("Vote Execution with Locking Voting Vault", async () => {
    let ctxVotingVault: TestContextVotingVault;

    const ONE = ethers.utils.parseEther("1");
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    beforeEach(async function () {
        ctxVotingVault = await votingVaultFixture();
    });

    describe("Governance flow with gsc voting vault", async () => {
        it("Executes V2 OriginationFee update with a GSC vote: YES", async () => {
            const { signers, coreVoting, lockingVault, increaseBlockNumber, feeController } = ctxVotingVault;

            // member has to have enough voting power / prove membership
            // owner to automatically have 1K votes
            // make new user wait through idel period before participating in vault
            //
        });
    });
});
