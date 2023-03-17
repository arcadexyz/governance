import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { TestContextCouncil, councilFixture } from "./utils/councilFixture";
import { createSnapshot, restoreSnapshot } from "./utils/external/council/utils/snapshots";
import { TestContext, fixture } from "./utils/fixture";

const { loadFixture, provider } = waffle;

/**
 * In its simplest form, Arcade governance uses an Arcade/Council LockingVault
 * where users deposit their ARC tokens in exchange for delegating their
 * governance power to vote on a proposal.
 * The Arcade/Council CoreVoting contract calls the LockingVault to get the amount
 * of voting power each governance participant has accumulated to vote.
 * Protocol updates are automatically executed when a when quorum and vote
 * YES requirements are met for a proposal.
 */

describe("Arcade Vote Execution via Council Locking Vault", function () {
    let ctxCouncil: TestContextCouncil;
    let ctx: TestContext;

    const ONE = ethers.utils.parseEther("1");
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

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

    describe("Arcade/Council governance flow", async () => {
        beforeEach(async () => {
            await createSnapshot(provider);
        });

        afterEach(async () => {
            await restoreSnapshot(provider);
        });

        it("Executes V2 OriginationFee update with a vote: YES", async () => {
            // load the Council fixture
            ctxCouncil = await loadFixture(councilFixture);
            const { signers, coreVoting, delegateVotingPower, lockingVault, votingVaults, increaseBlockNumber } =
                ctxCouncil;
            // load the Arcade fixture
            ctx = await loadFixture(fixture);
            // get the feeController contract which will be called to set the new origination fee
            const { feeController } = ctx;

            // users deposit their tokens and delegate voting power
            await delegateVotingPower(signers);

            // query voting power to initialize history for every governance participant
            const tx = await (await lockingVault.deposit(signers[2].address, ONE.mul(3), signers[0].address)).wait();
            // view query voting power of signer 0
            const votingPower = await lockingVault.queryVotePowerView(signers[0].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(4));

            const tx2 = await (await lockingVault.deposit(signers[1].address, ONE, signers[2].address)).wait();
            // view query voting power of signer 2
            const votingPower2 = await lockingVault.queryVotePowerView(signers[2].address, tx2.blockNumber);
            expect(votingPower2).to.be.eq(ONE.mul(11));

            const tx3 = await (await lockingVault.deposit(signers[4].address, ONE.mul(1), signers[1].address)).wait();
            // view query voting power of signer 1
            const votingPower3 = await lockingVault.queryVotePowerView(signers[1].address, tx3.blockNumber);
            expect(votingPower3).to.be.eq(ONE);

            // create proposal to update originationFee in FeeController
            // check current originationFee value
            const currentOgFee = (await feeController.getOriginationFee()).toString();

            const newFee = 60;
            const targetAddress = [feeController.address];
            // create an interface to access feeController abi
            const fcFactory = await ethers.getContractFactory("FeeController");
            // encode function signature and new fee amount to pass in proposal execution if majority votes YES
            const feeContCalldata = fcFactory.interface.encodeFunctionData("setOriginationFee", [newFee]);

            // a signer that holds enough voting power for proposal creation, creates the proposal
            // with a YES ballot
            await coreVoting
                .connect(signers[0])
                .proposal(votingVaults, zeroExtraData, targetAddress, [feeContCalldata], MAX, 0);

            // pass proposal with YES majority
            await coreVoting.connect(signers[2]).vote(votingVaults, zeroExtraData, 0, 0); // yes vote
            await coreVoting.connect(signers[1]).vote(votingVaults, zeroExtraData, 0, 1); // no vote

            //increase blockNumber to exceed 3 day default lock duration set in coreVoting
            await increaseBlockNumber(provider, 19488);

            // proposal execution
            await coreVoting.connect(signers[0]).execute(0, targetAddress, [feeContCalldata]);
            const originationFee = await feeController.getOriginationFee();
            expect(originationFee).to.not.equal(currentOgFee);
            expect(originationFee).to.equal(newFee);
        });
    });
});
