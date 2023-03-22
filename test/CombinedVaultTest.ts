import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers, waffle } from "hardhat";

import { TestContext, fixture } from "./utils/fixture";
import { TestContextVault, vaultFixture } from "./utils/vaultFixture";

const { provider } = waffle;

describe("Vote Execution with Locking and Promissory Voting Vaults", async () => {
    let ctxVault: TestContextVault;
    let ctx: TestContext;

    const ONE = ethers.utils.parseEther("1");
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    before(async function () {
        ctxVault = await vaultFixture();
        ctx = await fixture();
    });

    describe("Governance flow with combination of voting vaults types", async () => {
        it("Executes V2 OriginationFee update with a vote: YES", async () => {
            ctxVault = await vaultFixture();
            ctx = await fixture();

            const { signers, coreVoting, lockingVault, votingVaults, increaseBlockNumber, token, promissoryVault } =
                ctxVault;

            const { feeController, pNote, mintPnote } = ctx;

            // mint users of PromissoryVault some promissory notes
            for (const signer of signers) {
                await mintPnote(signer.address, 3, pNote);
            }

            // LockingVault users: deposits and delegation
            // query voting power to initialize history for every governance participant
            const tx = await (await lockingVault.deposit(signers[2].address, ONE.mul(3), signers[0].address)).wait();
            // view query voting power of signers[0]
            const votingPower = await lockingVault.queryVotePowerView(signers[0].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(3));

            const tx2 = await (await lockingVault.deposit(signers[1].address, ONE, signers[2].address)).wait();
            // view query voting power of signers[2]
            const votingPower2 = await lockingVault.queryVotePowerView(signers[2].address, tx2.blockNumber);
            expect(votingPower2).to.be.eq(ONE);

            const tx3 = await (await lockingVault.deposit(signers[4].address, ONE, signers[1].address)).wait();
            // view query voting power of signers[1]
            const votingPower3 = await lockingVault.queryVotePowerView(signers[1].address, tx3.blockNumber);
            expect(votingPower3).to.be.eq(ONE);

            // PromissoryVault users: Pnote registration and delegation
            const multiplier: BigNumberish = await promissoryVault.multiplier();

            // approve signers[0] tokens to pVault
            await token.approve(promissoryVault.address, ONE);
            // get signers[0] pNoteId
            const pNoteId0 = await pNote.tokenOfOwnerByIndex(signers[0].address, 2);
            // signers[0] deposits tokens and delegates to signers[1]
            const tx4 = await (
                await promissoryVault.addPnoteAndDelegate(ONE, pNoteId0, pNote.address, signers[1].address)
            ).wait();
            // view query voting power of signers[1]
            const votingPower4 = await promissoryVault.queryVotePowerView(signers[1].address, tx4.blockNumber);
            expect(votingPower4).to.be.eq(ONE.mul(multiplier));

            // get signers[2] pNoteId
            const pNoteId2 = await pNote.tokenOfOwnerByIndex(signers[2].address, 2);
            // approve signers[2] tokens to pVault
            await token.connect(signers[2]).approve(promissoryVault.address, ONE.mul(5));
            // signers[2] deposits 5 tokens and delegates to  signers[1]
            const tx5 = await (
                await promissoryVault
                    .connect(signers[2])
                    .addPnoteAndDelegate(ONE.mul(5), pNoteId2, pNote.address, signers[1].address)
            ).wait();
            // view query voting power of signers[1]
            const votingPower5 = await promissoryVault.queryVotePowerView(signers[1].address, tx5.blockNumber);
            expect(votingPower5).to.be.eq(ONE.mul(5).add(ONE).mul(multiplier));

            // get signers[3] pNoteId
            const pNoteId3 = await pNote.tokenOfOwnerByIndex(signers[3].address, 2);
            // approve signers[3] tokens to pVault
            await token.connect(signers[3]).approve(promissoryVault.address, ONE);
            // signers[3] deposits ONE tokens and delegates to  signers[0]
            const tx6 = await (
                await promissoryVault
                    .connect(signers[3])
                    .addPnoteAndDelegate(ONE, pNoteId3, pNote.address, signers[0].address)
            ).wait();
            // view query voting power of signers[0]
            const votingPower6 = await promissoryVault.queryVotePowerView(signers[0].address, tx6.blockNumber);
            expect(votingPower6).to.be.eq(ONE.mul(multiplier));

            // get signers[1] pNoteId
            const pNoteId1 = await pNote.tokenOfOwnerByIndex(signers[1].address, 2);
            // approve signers[1] tokens to pVault
            await token.connect(signers[1]).approve(promissoryVault.address, ONE.mul(8));
            // signers[1] deposits 8 tokens and delegates to  signers[2]
            const tx7 = await (
                await promissoryVault
                    .connect(signers[1])
                    .addPnoteAndDelegate(ONE.mul(8), pNoteId1, pNote.address, signers[2].address)
            ).wait();
            // view query voting power of signers[2]
            const votingPower7 = await promissoryVault.queryVotePowerView(signers[2].address, tx7.blockNumber);
            expect(votingPower7).to.be.eq(ONE.mul(8).mul(multiplier));

            // create proposal to update V2 originationFee
            // get current originationFee value
            const currentOgFee = (await feeController.getOriginationFee()).toString();

            const newFee = 60;
            const targetAddress = [feeController.address];
            // create an interface to access feeController abi
            const fcFactory = await ethers.getContractFactory("FeeController");
            // encode function signature and new fee amount to pass in proposal
            const feeContCalldata = fcFactory.interface.encodeFunctionData("setOriginationFee", [newFee]);

            // signer holding enough voting power for proposal creation creates proposal
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

        it("Executes the correct proposal out of many", async () => {
            ctxVault = await vaultFixture();
            ctx = await fixture();

            const { signers, coreVoting, lockingVault, votingVaults, increaseBlockNumber, token, promissoryVault } =
                ctxVault;

            const { feeController, pNote, mintPnote } = ctx;

            // mint users of PromissoryVault some promissory notes
            for (const signer of signers) {
                await mintPnote(signer.address, 1, pNote);
            }

            // LockingVault users: deposits and delegation
            // query voting power to initialize history for every governance participant
            const tx = await (await lockingVault.deposit(signers[2].address, ONE.mul(3), signers[0].address)).wait();
            // view query voting power of signers[0]
            const votingPower = await lockingVault.queryVotePowerView(signers[0].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(3));

            const tx2 = await (await lockingVault.deposit(signers[1].address, ONE, signers[2].address)).wait();
            // view query voting power of signers[2]
            const votingPower2 = await lockingVault.queryVotePowerView(signers[2].address, tx2.blockNumber);
            expect(votingPower2).to.be.eq(ONE);

            const tx3 = await (await lockingVault.deposit(signers[4].address, ONE, signers[1].address)).wait();
            // view query voting power of signers[1]
            const votingPower3 = await lockingVault.queryVotePowerView(signers[1].address, tx3.blockNumber);
            expect(votingPower3).to.be.eq(ONE);

            // PromissoryVault users: Pnote registration and delegation
            // get votingPower multiplier
            const multiplier: BigNumberish = await promissoryVault.multiplier();

            // approve signers[0] tokens to pVault
            await token.approve(promissoryVault.address, ONE);
            // get signers[0] pNoteId
            const pNoteId0 = await pNote.tokenOfOwnerByIndex(signers[0].address, 0);
            // signers[0] deposits ONE token and delegates to signers[1]
            const tx4 = await (
                await promissoryVault.addPnoteAndDelegate(ONE, pNoteId0, pNote.address, signers[1].address)
            ).wait();
            const votingPower4 = await promissoryVault.queryVotePowerView(signers[1].address, tx4.blockNumber);
            expect(votingPower4).to.be.eq(ONE.mul(multiplier));

            // get signers[2] pNoteId
            const pNoteId2 = await pNote.tokenOfOwnerByIndex(signers[2].address, 0);
            // approve signers[2] tokens to pVault
            await token.connect(signers[2]).approve(promissoryVault.address, ONE.mul(5));
            // signers[2] deposits 5 tokens and delegates to  signers[1]
            const tx5 = await (
                await promissoryVault
                    .connect(signers[2])
                    .addPnoteAndDelegate(ONE.mul(5), pNoteId2, pNote.address, signers[1].address)
            ).wait();
            // view query voting power of signer[1]
            const votingPower5 = await promissoryVault.queryVotePowerView(signers[1].address, tx5.blockNumber);
            expect(votingPower5).to.be.eq(ONE.mul(5).add(ONE).mul(multiplier));

            // get signers[3] pNoteId
            const pNoteId3 = await pNote.tokenOfOwnerByIndex(signers[3].address, 0);
            // approve signers[3] tokens to pVault
            await token.connect(signers[3]).approve(promissoryVault.address, ONE);
            // signers[3] deposits ONE tokens and delegates to  signers[0]
            const tx6 = await (
                await promissoryVault
                    .connect(signers[3])
                    .addPnoteAndDelegate(ONE, pNoteId3, pNote.address, signers[0].address)
            ).wait();
            // view query voting power of signers[0]
            const votingPower6 = await promissoryVault.queryVotePowerView(signers[0].address, tx6.blockNumber);
            expect(votingPower6).to.be.eq(ONE.mul(multiplier));

            // get signers[1] pNoteId
            const pNoteId1 = await pNote.tokenOfOwnerByIndex(signers[1].address, 0);
            // approve signers[1] tokens to pVault
            await token.connect(signers[1]).approve(promissoryVault.address, ONE.mul(8));
            // signers[1] deposits 8 tokens and delegates to  signers[2]
            const tx7 = await (
                await promissoryVault
                    .connect(signers[1])
                    .addPnoteAndDelegate(ONE.mul(8), pNoteId1, pNote.address, signers[2].address)
            ).wait();
            // view query voting power of signers[2]
            const votingPower7 = await promissoryVault.queryVotePowerView(signers[2].address, tx7.blockNumber);
            expect(votingPower7).to.be.eq(ONE.mul(8).mul(multiplier));

            // prepare proposal data
            const newRolloverFee = 62;
            const targetAddress = [feeController.address];
            const fcFactory = await ethers.getContractFactory("FeeController");
            // encode function signature and new rolloverfee amount to pass in proposal
            const rolloverFeeCalldata = fcFactory.interface.encodeFunctionData("setRolloverFee", [newRolloverFee]);
            // generate proposal => proposalId # 0
            await coreVoting
                .connect(signers[0])
                .proposal(votingVaults, zeroExtraData, targetAddress, [rolloverFeeCalldata], MAX, 0);

            // get current originationFee value
            const currentOgFee = (await feeController.getOriginationFee()).toString();
            const newFee = 60;
            // encode function signature and new fee origination fee amount
            const feeContCalldata = fcFactory.interface.encodeFunctionData("setOriginationFee", [newFee]);

            // create an alternate proposal
            await coreVoting
                .connect(signers[0])
                .proposal(votingVaults, zeroExtraData, targetAddress, [feeContCalldata], MAX, 0);

            // pass proposal with YES majority
            await coreVoting.connect(signers[2]).vote(votingVaults, zeroExtraData, 1, 0); // yes vote on proposalId 1

            await coreVoting.connect(signers[1]).vote(votingVaults, zeroExtraData, 1, 1); // no vote on proposalId 1

            //increase blockNumber to exceed 3 day default lock duration set in coreVoting
            await increaseBlockNumber(provider, 19488);

            // execute proposalId #1
            await coreVoting.connect(signers[0]).execute(1, targetAddress, [feeContCalldata]);
            const originationFee = await feeController.getOriginationFee();
            expect(originationFee).to.not.equal(currentOgFee);
            expect(originationFee).to.equal(newFee);
        });
    });
});
