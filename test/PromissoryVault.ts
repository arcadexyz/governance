import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers, waffle } from "hardhat";

import { TestContextCouncil, councilFixture } from "./utils/councilFixture";
import { createSnapshot, restoreSnapshot } from "./utils/external/council/utils/snapshots";
import { TestContext, fixture } from "./utils/fixture";

const { provider } = waffle;

describe("Vote Execution with Promissory Voting Vault Only", async () => {
    let ctxCouncil: TestContextCouncil;
    let ctx: TestContext;

    const ONE = ethers.utils.parseEther("1");
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    before(async function () {
        ctxCouncil = await councilFixture();
        ctx = await fixture();

        await createSnapshot(provider);
    });

    describe("Governance flow with promissory vault", async () => {
        beforeEach(async function () {
            await createSnapshot(provider);
        });
        afterEach(async function () {
            await restoreSnapshot(provider);
        });

        it("Executes V2 OriginationFee update with a vote: YES", async () => {
            ctxCouncil = await councilFixture();
            ctx = await fixture();

            const { signers, coreVoting, increaseBlockNumber, token, promissoryVault } = ctxCouncil;

            // get the feeController contract which will be called to set the new origination fee
            const { feeController, pNote, mintPnote } = ctx;

            // mint users of PromissoryVault some promissory notes
            for (const signer of signers) {
                await mintPnote(signer.address, 3, pNote);
            }

            // PromissoryVault users, Pnote registration and delegation begins here
            // get votingPower multiplier
            const multiplier: BigNumberish = await promissoryVault.multiplier();

            // approve signer tokens to pVault
            await token.approve(promissoryVault.address, ONE);

            // get signers[0] pNoteId
            const pNoteId0 = await pNote.tokenOfOwnerByIndex(signers[0].address, 2);
            // signers[0] performs first pNote registration and initializes voting power
            // signers[0] deposits tokens and delegates to signers[1]
            const tx4 = await (
                await promissoryVault.addPnoteAndDelegate(ONE, 0, pNoteId0, pNote.address, signers[1].address)
            ).wait();
            const votingPower4 = await promissoryVault.queryVotePowerView(signers[1].address, tx4.blockNumber);
            expect(votingPower4).to.be.eq(ONE.mul(multiplier));

            // get signers[2] pNoteId
            const pNoteId2 = await pNote.tokenOfOwnerByIndex(signers[2].address, 2);
            // approve signer tokens to pVault
            await token.connect(signers[2]).approve(promissoryVault.address, ONE.mul(5));
            // signers[2] deposits 5 tokens and delegates to  signers[1]
            const tx5 = await (
                await promissoryVault
                    .connect(signers[2])
                    .addPnoteAndDelegate(ONE.mul(5), 0, pNoteId2, pNote.address, signers[1].address)
            ).wait();
            // view query voting power of signer 2
            const votingPower5 = await promissoryVault.queryVotePowerView(signers[1].address, tx5.blockNumber);
            expect(votingPower5).to.be.eq(ONE.mul(5).add(ONE).mul(multiplier));

            // get signers[3] pNoteId
            const pNoteId3 = await pNote.tokenOfOwnerByIndex(signers[3].address, 2);
            // approve signer tokens to pVault
            await token.connect(signers[3]).approve(promissoryVault.address, ONE);
            // signers[3] deposits ONE tokens and delegates to  signers[0]
            const tx6 = await (
                await promissoryVault
                    .connect(signers[3])
                    .addPnoteAndDelegate(ONE, 0, pNoteId3, pNote.address, signers[0].address)
            ).wait();
            // view query voting power of signer 0
            const votingPower6 = await promissoryVault.queryVotePowerView(signers[0].address, tx6.blockNumber);
            expect(votingPower6).to.be.eq(ONE.mul(multiplier));

            // get signers[1] pNoteId
            const pNoteId1 = await pNote.tokenOfOwnerByIndex(signers[1].address, 2);
            // approve signer tokens to pVault
            await token.connect(signers[1]).approve(promissoryVault.address, ONE.mul(8));
            // signers[1] deposits ONE tokens and delegates to  signers[1]
            const tx7 = await (
                await promissoryVault
                    .connect(signers[1])
                    .addPnoteAndDelegate(ONE.mul(8), 0, pNoteId1, pNote.address, signers[2].address)
            ).wait();
            // view query voting power of signer 1
            const votingPower7 = await promissoryVault.queryVotePowerView(signers[2].address, tx7.blockNumber);
            expect(votingPower7).to.be.eq(ONE.mul(8).mul(multiplier));

            // proposal creation to update originationFee in FeeController
            // check current originationFee value
            const currentOgFee = (await feeController.getOriginationFee()).toString();

            const newFee = 62;
            const targetAddress = [feeController.address];
            // create an interface to access feeController abi
            const fcFactory = await ethers.getContractFactory("FeeController");
            // encode function signature and new fee amount to pass in proposal execution if majority votes YES
            const feeContCalldata = fcFactory.interface.encodeFunctionData("setOriginationFee", [newFee]);

            // a signer that holds enough voting power for proposal creation, creates the proposal
            // with a YES ballot
            await coreVoting
                .connect(signers[0])
                .proposal([promissoryVault.address], zeroExtraData, targetAddress, [feeContCalldata], MAX, 0);

            // pass proposal with YES majority
            await coreVoting.connect(signers[2]).vote([promissoryVault.address], zeroExtraData, 0, 0); // yes vote

            await coreVoting.connect(signers[1]).vote([promissoryVault.address], zeroExtraData, 0, 1); // no vote

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
