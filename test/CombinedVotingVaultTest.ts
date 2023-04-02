import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers, waffle } from "hardhat";

import { TestContextVotingVault, votingVaultFixture } from "./utils/votingVaultFixture";

const { provider } = waffle;

describe("Vote Execution with Locking and Promissory Voting Vaults", async () => {
    let ctxVault: TestContextVotingVault;

    const ONE = ethers.utils.parseEther("1");
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    before(async function () {
        ctxVault = await votingVaultFixture();
    });

    describe("Governance flow with combination of voting vaults types", async () => {
        it("Executes V2 OriginationFee update with a vote: YES", async () => {
            ctxVault = await votingVaultFixture();

            const {
                signers,
                coreVoting,
                lockingVault,
                votingVaults,
                increaseBlockNumber,
                token,
                uniqueMultiplierVotingVault,
                goldBadge,
                mintBadge,
                feeController,
            } = ctxVault;

            // mint users of PromissoryVault some promissory notes
            await mintBadge();

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

            // approve signers[0] tokens to pVault
            await token.approve(uniqueMultiplierVotingVault.address, ONE);
            // get signers[0] pNoteId
            const pNoteId0 = await goldBadge.tokenOfOwnerByIndex(signers[0].address, 0);

            // signers[0] deposits tokens and delegates to signers[1]
            const tx4 = await uniqueMultiplierVotingVault.addBadgeAndDelegate(ONE, pNoteId0, 0, signers[1].address);

            const receipt = await tx4.wait();

            // get votingPower multiplier for signers[1]
            let multiplier1: BigNumberish;
            if (receipt && receipt.events) {
                const badgeRegistered = new ethers.utils.Interface([
                    "event TransactionMultiplierSet(address indexed user, address badgeAddress, uint128 tokenId, uint256 multiplier)",
                ]);

                const log = badgeRegistered.parseLog(receipt.events[receipt.events.length - 3]);
                multiplier1 = log.args.multiplier;
            } else {
                throw new Error("Unable to register badge");
            }
            // view query voting power of signers[1]
            const votingPower4 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx4.blockNumber,
            );
            expect(votingPower4).to.be.eq(ONE.mul(multiplier1));

            // get signers[2] pNoteId
            const pNoteId2 = await goldBadge.tokenOfOwnerByIndex(signers[2].address, 0);
            // approve signers[2] tokens to pVault
            await token.connect(signers[2]).approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            // signers[2] deposits 5 tokens and delegates to  signers[1]
            const tx5 = await (
                await uniqueMultiplierVotingVault
                    .connect(signers[2])
                    .addBadgeAndDelegate(ONE.mul(5), pNoteId2, 0, signers[1].address)
            ).wait();
            // view query voting power of signers[1]
            const votingPower5 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx5.blockNumber,
            );
            expect(votingPower5).to.be.eq(ONE.mul(5).add(ONE).mul(multiplier1));

            // get signers[3] pNoteId
            const pNoteId3 = await goldBadge.tokenOfOwnerByIndex(signers[3].address, 0);
            // approve signers[3] tokens to pVault
            await token.connect(signers[3]).approve(uniqueMultiplierVotingVault.address, ONE);
            // signers[3] deposits ONE tokens and delegates to  signers[0]
            const tx6 = await uniqueMultiplierVotingVault
                .connect(signers[3])
                .addBadgeAndDelegate(ONE, pNoteId3, 0, signers[0].address);
            const receipt2 = await tx6.wait();

            // get votingPower multiplier for signers[1]
            let multiplier2: BigNumberish;
            if (receipt2 && receipt2.events) {
                const badgeRegistered = new ethers.utils.Interface([
                    "event TransactionMultiplierSet(address indexed user, address badgeAddress, uint128 tokenId, uint256 multiplier)",
                ]);

                const log = badgeRegistered.parseLog(receipt2.events[receipt2.events.length - 3]);
                multiplier2 = log.args.multiplier;
            } else {
                throw new Error("Unable to register badge");
            }
            // view query voting power of signers[0]
            const votingPower6 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[0].address,
                tx6.blockNumber,
            );
            expect(votingPower6).to.be.eq(ONE.mul(multiplier2));

            // get signers[1] pNoteId
            const pNoteId1 = await goldBadge.tokenOfOwnerByIndex(signers[1].address, 0);
            // approve signers[1] tokens to pVault
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE.mul(8));
            // signers[1] deposits 8 tokens and delegates to  signers[2]
            const tx7 = await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addBadgeAndDelegate(ONE.mul(8), pNoteId1, 0, signers[2].address);
            const receipt3 = await tx7.wait();

            // get votingPower multiplier for signers[1]
            let multiplier3: BigNumberish;
            if (receipt3 && receipt3.events) {
                const badgeRegistered = new ethers.utils.Interface([
                    "event TransactionMultiplierSet(address indexed user, address badgeAddress, uint128 tokenId, uint256 multiplier)",
                ]);

                const log = badgeRegistered.parseLog(receipt3.events[receipt3.events.length - 3]);
                multiplier3 = log.args.multiplier;
            } else {
                throw new Error("Unable to register badge");
            }
            // view query voting power of signers[2]
            const votingPower7 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[2].address,
                tx7.blockNumber,
            );
            expect(votingPower7).to.be.eq(ONE.mul(8).mul(multiplier3));

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
            ctxVault = await votingVaultFixture();

            const {
                signers,
                coreVoting,
                lockingVault,
                votingVaults,
                increaseBlockNumber,
                token,
                uniqueMultiplierVotingVault,
                goldBadge,
                mintBadge,
                feeController,
            } = ctxVault;

            // mint users of PromissoryVault some promissory notes
            await mintBadge();

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

            // approve signers[0] tokens to pVault
            await token.approve(uniqueMultiplierVotingVault.address, ONE);
            // get signers[0] pNoteId
            const pNoteId0 = await goldBadge.tokenOfOwnerByIndex(signers[0].address, 0);
            // signers[0] deposits ONE token and delegates to signers[1]
            const tx4 = await uniqueMultiplierVotingVault.addBadgeAndDelegate(ONE, pNoteId0, 0, signers[1].address);
            const receipt = await tx4.wait();
            // get votingPower multiplier for signers[1]
            let multiplier1: BigNumberish;
            if (receipt && receipt.events) {
                const badgeRegistered = new ethers.utils.Interface([
                    "event TransactionMultiplierSet(address indexed user, address badgeAddress, uint128 tokenId, uint256 multiplier)",
                ]);

                const log = badgeRegistered.parseLog(receipt.events[receipt.events.length - 3]);
                multiplier1 = log.args.multiplier;
            } else {
                throw new Error("Unable to register badge");
            }

            const votingPower4 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx4.blockNumber,
            );
            expect(votingPower4).to.be.eq(ONE.mul(multiplier1));

            // get signers[2] pNoteId
            const pNoteId2 = await goldBadge.tokenOfOwnerByIndex(signers[2].address, 0);
            // approve signers[2] tokens to pVault
            await token.connect(signers[2]).approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            // signers[2] deposits 5 tokens and delegates to  signers[1]
            const tx5 = await (
                await uniqueMultiplierVotingVault
                    .connect(signers[2])
                    .addBadgeAndDelegate(ONE.mul(5), pNoteId2, 0, signers[1].address)
            ).wait();
            // view query voting power of signer[1]
            const votingPower5 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx5.blockNumber,
            );
            expect(votingPower5).to.be.eq(ONE.mul(5).add(ONE).mul(multiplier1));

            // get signers[3] pNoteId
            const pNoteId3 = await goldBadge.tokenOfOwnerByIndex(signers[3].address, 0);
            // approve signers[3] tokens to pVault
            await token.connect(signers[3]).approve(uniqueMultiplierVotingVault.address, ONE);
            // signers[3] deposits ONE tokens and delegates to  signers[0]
            const tx6 = await uniqueMultiplierVotingVault
                .connect(signers[3])
                .addBadgeAndDelegate(ONE, pNoteId3, 0, signers[0].address);
            const receipt2 = await tx6.wait();

            // get votingPower multiplier for signers[1]
            let multiplier2: BigNumberish;
            if (receipt2 && receipt2.events) {
                const badgeRegistered = new ethers.utils.Interface([
                    "event TransactionMultiplierSet(address indexed user, address badgeAddress, uint128 tokenId, uint256 multiplier)",
                ]);

                const log = badgeRegistered.parseLog(receipt2.events[receipt2.events.length - 3]);
                multiplier2 = log.args.multiplier;
            } else {
                throw new Error("Unable to register badge");
            }
            // view query voting power of signers[0]
            const votingPower6 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[0].address,
                tx6.blockNumber,
            );
            expect(votingPower6).to.be.eq(ONE.mul(multiplier2));

            // get signers[1] pNoteId
            const pNoteId1 = await goldBadge.tokenOfOwnerByIndex(signers[1].address, 0);
            // approve signers[1] tokens to pVault
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE.mul(8));
            // signers[1] deposits 8 tokens and delegates to  signers[2]
            const tx7 = await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addBadgeAndDelegate(ONE.mul(8), pNoteId1, 0, signers[2].address);
            const receipt3 = await tx7.wait();
            // get votingPower multiplier for signers[1]
            let multiplier3: BigNumberish;
            if (receipt3 && receipt3.events) {
                const badgeRegistered = new ethers.utils.Interface([
                    "event TransactionMultiplierSet(address indexed user, address badgeAddress, uint128 tokenId, uint256 multiplier)",
                ]);

                const log = badgeRegistered.parseLog(receipt3.events[receipt3.events.length - 3]);
                multiplier3 = log.args.multiplier;
            } else {
                throw new Error("Unable to register badge");
            }

            // view query voting power of signers[2]
            const votingPower7 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[2].address,
                tx7.blockNumber,
            );
            expect(votingPower7).to.be.eq(ONE.mul(8).mul(multiplier3));

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
