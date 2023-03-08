import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers, waffle } from "hardhat";

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

    const ONE = ethers.utils.parseEther("1");
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    before(async function () {
        /**
         * Helper function in Council test utils that utilizes the hardhat network method
         * "evm_snapshot" to get and store ids of snapshots of the state of the blockchain
         * at various blocks in an array for use in testing. These IDs help track users'
         * voting power and delegations at different blocks.
         */
        await createSnapshot(provider);

        ctxCouncil = await loadFixture(councilFixture);
        const { signers, token, coreVoting, votingVaults } = ctxCouncil;

        // give users some balance and set their allowance
        for (const signer of signers) {
            await token.setBalance(signer.address, ethers.utils.parseEther("100000"));
        }

        return { signers, token, coreVoting, votingVaults };
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

    describe.only("PromissoryVault governance flow", async () => {
        it("Executes V2 OriginationFee update with a vote: YES", async () => {
            // load the Council fixture
            ctxCouncil = await loadFixture(councilFixture);
            const { signers, coreVoting, votingVaults, increaseBlockNumber, token, promissoryVault } = ctxCouncil;
            // load the Arcade fixture
            ctx = await loadFixture(fixture);
            const { feeController, pNote, mintPnote } = ctx;

            // mint users some promissory notes
            for (const signer of signers) {
                await mintPnote(signer.address, 3, pNote);
            }

            // get votingPower multiplier
            const multiplier: BigNumberish = await promissoryVault.multiplier();

            // approve signer tokens to pVault
            await token.approve(promissoryVault.address, ONE);
            // get signers[0] pNoteId
            const pNoteId0 = await pNote.tokenOfOwnerByIndex(signers[0].address, 2);
            // signers[0] performs first pNote registration and initializes voting power
            // signers[0] deposits tokens and delegates to signers[1]
            const tx = await (
                await promissoryVault.addPnoteAndDelegate(ONE, 0, pNoteId0, pNote.address, signers[1].address)
            ).wait();
            const votingPower = await promissoryVault.queryVotePowerView(signers[1].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(multiplier));

            // get signers[2] pNoteId
            const pNoteId2 = await pNote.tokenOfOwnerByIndex(signers[2].address, 2);
            // approve signer tokens to pVault
            await token.connect(signers[2]).approve(promissoryVault.address, ONE.mul(5));
            // signers[2] deposits 5 tokens and delegates to  signers[1]
            const tx2 = await (
                await promissoryVault
                    .connect(signers[2])
                    .addPnoteAndDelegate(ONE.mul(5), 0, pNoteId2, pNote.address, signers[1].address)
            ).wait();
            // view query voting power of signer 2
            const votingPower2 = await promissoryVault.queryVotePowerView(signers[1].address, tx2.blockNumber);
            expect(votingPower2).to.be.eq(ONE.mul(5).add(ONE).mul(multiplier));

            // get signers[3] pNoteId
            const pNoteId3 = await pNote.tokenOfOwnerByIndex(signers[3].address, 2);
            // approve signer tokens to pVault
            await token.connect(signers[3]).approve(promissoryVault.address, ONE);
            // signers[3] deposits ONE tokens and delegates to  signers[0]
            const tx3 = await (
                await promissoryVault
                    .connect(signers[3])
                    .addPnoteAndDelegate(ONE, 0, pNoteId3, pNote.address, signers[0].address)
            ).wait();

            // view query voting power of signer 0
            const votingPower3 = await promissoryVault.queryVotePowerView(signers[0].address, tx3.blockNumber);
            expect(votingPower3).to.be.eq(ONE.mul(multiplier));

            // get signers[1] pNoteId
            const pNoteId1 = await pNote.tokenOfOwnerByIndex(signers[1].address, 2);
            // approve signer tokens to pVault
            await token.connect(signers[1]).approve(promissoryVault.address, ONE.mul(8));
            // signers[1] deposits ONE tokens and delegates to  signers[1]
            const tx4 = await (
                await promissoryVault
                    .connect(signers[1])
                    .addPnoteAndDelegate(ONE.mul(8), 0, pNoteId1, pNote.address, signers[2].address)
            ).wait();

            // view query voting power of signer 1
            const votingPower4 = await promissoryVault.queryVotePowerView(signers[2].address, tx4.blockNumber);
            expect(votingPower4).to.be.eq(ONE.mul(8).mul(multiplier));

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
