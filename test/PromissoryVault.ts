import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers, waffle } from "hardhat";

import { TestContext, fixture } from "./utils/fixture";
import { TestContextVault, vaultFixture } from "./utils/vaultFixture";

const { provider } = waffle;

describe("Vote Execution with Promissory Voting Vault", async () => {
    let ctxVault: TestContextVault;
    let ctx: TestContext;

    const ONE = ethers.utils.parseEther("1");
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    before(async function () {
        ctxVault = await vaultFixture();
        ctx = await fixture();
    });

    describe("Governance flow with promissory vault", async () => {
        it("Executes V2 OriginationFee update with a vote: YES", async () => {
            // invoke the fixture functions
            ctxVault = await vaultFixture();
            ctx = await fixture();

            const { signers, coreVoting, increaseBlockNumber, token, promissoryVault } = ctxVault;

            // get the feeController contract which will be called to set the new origination fee
            const { feeController, pNote, mintPnote } = ctx;

            // mint users some promissory notes
            for (const signer of signers) {
                await mintPnote(signer.address, 1, pNote);
            }

            // get votingPower multiplier
            const multiplier: BigNumberish = await promissoryVault.multiplier();

            // signers[0] approves tokens to pVault
            await token.approve(promissoryVault.address, ONE);

            // get signers[0] pNoteId
            const pNoteId0 = await pNote.tokenOfOwnerByIndex(signers[0].address, 0);
            // signers[0] deposits tokens and delegates to signers[1]
            const tx = await (
                await promissoryVault.addPnoteAndDelegate(ONE, pNoteId0, pNote.address, signers[1].address)
            ).wait();
            const votingPower = await promissoryVault.queryVotePowerView(signers[1].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(multiplier));

            // get signers[2] pNoteId
            const pNoteId2 = await pNote.tokenOfOwnerByIndex(signers[2].address, 0);
            // approve signer tokens to pVault
            await token.connect(signers[2]).approve(promissoryVault.address, ONE.mul(5));
            // signers[2] deposits 5 tokens and delegates to  signers[1]
            const tx1 = await (
                await promissoryVault
                    .connect(signers[2])
                    .addPnoteAndDelegate(ONE.mul(5), pNoteId2, pNote.address, signers[1].address)
            ).wait();
            // view query voting power of signer 2
            const votingPower1 = await promissoryVault.queryVotePowerView(signers[1].address, tx1.blockNumber);
            expect(votingPower1).to.be.eq(ONE.mul(5).add(ONE).mul(multiplier));

            // get signers[3] pNoteId
            const pNoteId3 = await pNote.tokenOfOwnerByIndex(signers[3].address, 0);
            // approve signer tokens to pVault
            await token.connect(signers[3]).approve(promissoryVault.address, ONE);
            // signers[3] deposits ONE tokens and delegates to  signers[0]
            const tx2 = await (
                await promissoryVault
                    .connect(signers[3])
                    .addPnoteAndDelegate(ONE, pNoteId3, pNote.address, signers[0].address)
            ).wait();
            // view query voting power of signers[0]
            const votingPower2 = await promissoryVault.queryVotePowerView(signers[0].address, tx2.blockNumber);
            expect(votingPower2).to.be.eq(ONE.mul(multiplier));

            // get signers[1] pNoteId
            const pNoteId1 = await pNote.tokenOfOwnerByIndex(signers[1].address, 0);
            // signers[1] approved ONE tokens to pVault
            await token.connect(signers[1]).approve(promissoryVault.address, ONE);
            // signers[1] deposits ONE tokens and delegates to  signers[2]
            const tx3 = await (
                await promissoryVault
                    .connect(signers[1])
                    .addPnoteAndDelegate(ONE, pNoteId1, pNote.address, signers[2].address)
            ).wait();
            // view query voting power of signers[2]
            const votingPower3 = await promissoryVault.queryVotePowerView(signers[2].address, tx3.blockNumber);
            expect(votingPower3).to.be.eq(ONE.mul(multiplier));

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

            //increase blockNumber to exceed 3 day default lock duration set in coreVoting
            await increaseBlockNumber(provider, 19488);

            // proposal execution
            await coreVoting.connect(signers[0]).execute(0, targetAddress, [feeContCalldata]);
            const originationFee = await feeController.getOriginationFee();
            expect(originationFee).to.not.equal(currentOgFee);
            expect(originationFee).to.equal(newFee);
        });

        it("Partial token withdrawal reduces delegatee voting power", async () => {
            // invoke the fixtures
            ctxVault = await vaultFixture();
            ctx = await fixture();

            const { signers, token, promissoryVault, getBlock } = ctxVault;
            const { pNote, mintPnote } = ctx;

            // mint users some promissory notes
            for (const signer of signers) {
                await mintPnote(signer.address, 1, pNote);
            }

            // PromissoryVault users, Pnote registration and delegation begins here
            // get votingPower multiplier
            const multiplier: BigNumberish = await promissoryVault.multiplier();

            // initialize history for signers[1]
            await token.connect(signers[1]).approve(promissoryVault.address, ONE);
            // get signers[1] pNoteId
            const pNoteId1 = await pNote.tokenOfOwnerByIndex(signers[1].address, 0);
            // signers[1] deposits ONE token and delegates to self
            await (
                await promissoryVault
                    .connect(signers[1])
                    .addPnoteAndDelegate(ONE, pNoteId1, pNote.address, signers[1].address)
            ).wait();

            // signers[0] approves 5 tokens to pVault
            await token.approve(promissoryVault.address, ONE.mul(5));
            // get signers[0] pNoteId
            const pNoteId = await pNote.tokenOfOwnerByIndex(signers[0].address, 0);
            // signers[0] deposits 5 tokens and delegates to signers[1]
            const tx = await (
                await promissoryVault.addPnoteAndDelegate(ONE.mul(5), pNoteId, pNote.address, signers[1].address)
            ).wait();

            // get contract balance after these 2 txns
            const contractBalance = await token.balanceOf(promissoryVault.address);

            // get delegatee voting power amount
            const votingPower = await promissoryVault.queryVotePowerView(signers[1].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(6).mul(multiplier));

            // signers[0] withdraws ONE token
            await promissoryVault.connect(signers[0]).withdraw(ONE);

            // get contract balance after withdrawal
            const contractBalanceAfter = await token.balanceOf(promissoryVault.address);
            // confirm current contract balance equals previous balance minus ONE
            expect(contractBalanceAfter).to.eq(contractBalance.sub(ONE));

            const nowBlock = getBlock();
            // get delegatee voting power after
            const votingPowerAfter = await promissoryVault.queryVotePowerView(signers[1].address, nowBlock);
            // confirm that delegatee voting power is less than before withdrawal
            expect(votingPowerAfter).to.eq(votingPower.sub(ONE.mul(multiplier)));
        });

        it("All token withdrawal reduces delegatee voting power and withdrawn tokens transferred back user", async () => {
            // invoke the fixtures
            ctxVault = await vaultFixture();
            ctx = await fixture();

            const { signers, token, promissoryVault, getBlock } = ctxVault;
            const { pNote, mintPnote } = ctx;

            // mint users some promissory notes
            for (const signer of signers) {
                await mintPnote(signer.address, 1, pNote);
            }

            // get votingPower multiplier
            const multiplier: BigNumberish = await promissoryVault.multiplier();

            // initialize history for signers[1]
            await token.connect(signers[1]).approve(promissoryVault.address, ONE);
            // get signers[1] pNoteId
            const pNoteId1 = await pNote.tokenOfOwnerByIndex(signers[1].address, 0);
            // signers[1] deposits ONE token and delegates to self
            await (
                await promissoryVault
                    .connect(signers[1])
                    .addPnoteAndDelegate(ONE, pNoteId1, pNote.address, signers[1].address)
            ).wait();

            const now = getBlock();
            // get signers[1] voting power before they receive any further delegation
            const votingPowerBefore = await promissoryVault.queryVotePowerView(signers[1].address, now);

            // signers[0] approves 5 tokens to pVault
            await token.approve(promissoryVault.address, ONE.mul(5));
            // get signers[0] pNoteId
            const pNoteId = await pNote.tokenOfOwnerByIndex(signers[0].address, 0);
            // signers[0] deposits 5 tokens and delegates to signers[1]
            const tx = await (
                await promissoryVault.addPnoteAndDelegate(ONE.mul(5), pNoteId, pNote.address, signers[1].address)
            ).wait();

            // get contract balance after these 2 txns
            const contractBalance = await token.balanceOf(promissoryVault.address);

            // get delegatee total voting power amount
            const votingPower = await promissoryVault.queryVotePowerView(signers[1].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(6).mul(multiplier));

            // signers[0] balance before they withdraw
            const withdrawerBalBefore = await token.balanceOf(signers[0].address);
            // signers[0] withdraws all their deposited tokens
            await promissoryVault.connect(signers[0]).withdraw(ONE.mul(5));

            // get contract balance after withdraw txn
            const contractBalanceAfter = await token.balanceOf(promissoryVault.address);
            // confirm current contract balance is balance minus amount withdrawn
            expect(contractBalanceAfter).to.eq(contractBalance.sub(ONE.mul(5)));

            const afterBlock = getBlock();
            // get delegatee voting power after token withdrawal
            const votingPowerAfter = await promissoryVault.queryVotePowerView(signers[1].address, afterBlock);

            // confirm that the delegatee voting is now less
            expect(votingPowerAfter).to.eq(votingPowerBefore);

            // signers[0] balance after withdraw
            const withdrawerBalAfter = await token.balanceOf(signers[0].address);
            // confirm that the delegatee voting is less than voting power before token withdrawal
            expect(withdrawerBalAfter).to.eq(withdrawerBalBefore.add(ONE.mul(5)));
        });
    });
});
