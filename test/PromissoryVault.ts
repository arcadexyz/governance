import { waffle } from "hardhat";

import { TestContextCouncil, councilFixture } from "./utils/councilFixture";
import { createSnapshot, restoreSnapshot } from "./utils/external/council/utils/snapshots";
import { TestContext, fixture } from "./utils/fixture";

const { loadFixture, provider } = waffle;

/**
 * TKTKTKTKT
 * TKTKTKTKT
 * TKTKTKTKT
 * TKTKTKTKT
 * TKTKTKTKT
 * TKTKTKTKT
 * TKTKTKTKT
 */

describe("Arcade Vote Execution via PromissoryVault", function () {
    let ctxCouncil: TestContextCouncil;
    let ctx: TestContext;

    before(async function () {
        // Helper function in Council test utils that utilizes the hardhat network method
        // "evm_snapshot" to get and store ids of snapshots of the state of the blockchain
        // at various blocks in an array for use in testing. These IDs help track users'
        // voting power and delegations at different blocks.
        await createSnapshot(provider);

        ctxCouncil = await loadFixture(councilFixture);
        const { signers, token, lockingVault, coreVoting, votingVaults } = ctxCouncil;

        return { signers, token, lockingVault, coreVoting, votingVaults };
    });

    after(async () => {
        // Helper function that utilizes the hardhat network method "evm_revert", to clear
        // the array of snapshot ids.
        await restoreSnapshot(provider);
    });

    beforeEach(async () => {
        // Before each get a snapshot
        await createSnapshot(provider);
    });

    afterEach(async () => {
        // After each, reset our state in the fork
        await restoreSnapshot(provider);
    });

    describe("PromissoryVault governance flow", async () => {
        it("Executes V2 OriginationFee update with a vote: YES", async () => {
            // load the Council fixture
            ctxCouncil = await loadFixture(councilFixture);
            const { votingVaults } = ctxCouncil;
            // load the Arcade fixture
            ctx = await loadFixture(fixture);
            const { promissoryVault, pNoteId } = ctx;

            votingVaults.push(promissoryVault.address);

            console.log("TEST 67 =============", pNoteId);
        });
    });
});
