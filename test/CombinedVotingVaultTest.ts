import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers, waffle } from "hardhat";

import { TestContextVotingVault, votingVaultFixture } from "./utils/votingVaultFixture";

const { provider } = waffle;

describe("Vote Execution with Locking and Unique Multiplier Voting Vaults", async () => {
    let ctxVault: TestContextVotingVault;

    const ONE = ethers.utils.parseEther("1");
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    beforeEach(async function () {
        ctxVault = await votingVaultFixture();
    });

    describe("Governance flow with combination of voting vaults types", async () => {
        it("Executes V2 OriginationFee update with a vote: YES", async () => {
            // invoke the fixture function
            ctxVault = await votingVaultFixture();

            const {
                signers,
                coreVoting,
                increaseBlockNumber,
                token,
                uniqueMultiplierVotingVault,
                lockingVotingVault,
                reputationNft,
                reputationNft2,
                mintNfts,
                feeController,
                votingVaults,
            } = ctxVault;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const txA = await uniqueMultiplierVotingVault
                .connect(signers[0])
                .setMultiplier(reputationNft.address, 1, ethers.utils.parseEther("1.2"));
            const receiptA = await txA.wait();

            // get votingPower multiplier A
            let multiplierA: BigNumberish;
            if (receiptA && receiptA.events) {
                const userMultiplier = new ethers.utils.Interface([
                    "event MultiplierSet(address tokenAddress, uint128 tokenId, uint128 multiplier)",
                ]);
                const log = userMultiplier.parseLog(receiptA.events[receiptA.events.length - 1]);
                multiplierA = log.args.multiplier;
            } else {
                throw new Error("Multiplier not set");
            }

            // manager sets the value of the reputation NFT 2's multiplier
            const txB = await uniqueMultiplierVotingVault
                .connect(signers[0])
                .setMultiplier(reputationNft2.address, 1, ethers.utils.parseEther("1.4"));
            const receiptB = await txB.wait();

            // get votingPower multiplier B
            let multiplierB: BigNumberish;
            if (receiptB && receiptB.events) {
                const userMultiplier = new ethers.utils.Interface([
                    "event MultiplierSet(address tokenAddress, uint128 tokenId, uint128 multiplier)",
                ]);
                const log = userMultiplier.parseLog(receiptB.events[receiptB.events.length - 1]);
                multiplierB = log.args.multiplier;
            } else {
                throw new Error("Multiplier not set");
            }

            // LockingVault users: deposits and delegation
            // query voting power to initialize history for every governance participant
            const tx = await (
                await lockingVotingVault.deposit(signers[2].address, ONE.mul(3), signers[0].address)
            ).wait();
            // view query voting power of signers[0]
            const votingPower = await lockingVotingVault.queryVotePowerView(signers[0].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(3));

            const tx2 = await (await lockingVotingVault.deposit(signers[1].address, ONE, signers[2].address)).wait();
            // view query voting power of signers[2]
            const votingPower2 = await lockingVotingVault.queryVotePowerView(signers[2].address, tx2.blockNumber);
            expect(votingPower2).to.be.eq(ONE);

            const tx3 = await (await lockingVotingVault.deposit(signers[4].address, ONE, signers[1].address)).wait();
            // view query voting power of signers[1]
            const votingPower3 = await lockingVotingVault.queryVotePowerView(signers[1].address, tx3.blockNumber);
            expect(votingPower3).to.be.eq(ONE);

            // approve signers[0] tokens to unique multiplier voting vault
            await token.approve(uniqueMultiplierVotingVault.address, ONE);
            // signers[0] registers reputation NFT, deposits tokens and delegates to signers[1]
            const tx4 = await uniqueMultiplierVotingVault.addNftAndDelegate(
                ONE,
                1,
                reputationNft.address,
                signers[1].address,
            );
            // view query voting power of signers[1]
            const votingPower4 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx4.blockNumber,
            );
            expect(votingPower4).to.be.eq(ONE.mul(multiplierA));

            // approve signers[2] tokens to unique multiplier voting vault
            await token.connect(signers[2]).approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            // signers[2] registers reputation NFT, deposits 5 tokens and delegates to signers[1]
            const tx5 = await (
                await uniqueMultiplierVotingVault
                    .connect(signers[2])
                    .addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[1].address)
            ).wait();
            // view query voting power of signers[1]
            const votingPower5 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx5.blockNumber,
            );
            expect(votingPower5).to.be.eq(ONE.mul(5).add(ONE).mul(multiplierA));

            // approve signers[3] tokens to unique multiplier voting vault
            await token.connect(signers[3]).approve(uniqueMultiplierVotingVault.address, ONE);
            // signers[3] registers reputation NFT, deposits ONE tokens and delegates to signers[0]
            const tx6 = await uniqueMultiplierVotingVault
                .connect(signers[3])
                .addNftAndDelegate(ONE, 1, reputationNft2.address, signers[0].address);

            // view query voting power of signers[0]
            const votingPower6 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[0].address,
                tx6.blockNumber,
            );
            expect(votingPower6).to.be.eq(ONE.mul(multiplierB));

            // approve signers[1] tokens to unique multiplier voting vault
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE.mul(8));
            // signers[1] registers reputation NFT, deposits 8 tokens and delegates to signers[2]
            const tx7 = await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE.mul(8), 1, reputationNft.address, signers[2].address);

            // view query voting power of signers[2]
            const votingPower7 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[2].address,
                tx7.blockNumber,
            );
            expect(votingPower7).to.be.eq(ONE.mul(8).mul(multiplierA));

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
            // invoke the fixture function
            ctxVault = await votingVaultFixture();

            const {
                signers,
                coreVoting,
                increaseBlockNumber,
                token,
                uniqueMultiplierVotingVault,
                lockingVotingVault,
                reputationNft,
                mintNfts,
                feeController,
                votingVaults,
            } = ctxVault;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const txA = await uniqueMultiplierVotingVault
                .connect(signers[0])
                .setMultiplier(reputationNft.address, 1, ethers.utils.parseEther("1.2"));
            const receiptA = await txA.wait();

            // get votingPower multiplier A
            let multiplierA: BigNumberish;
            if (receiptA && receiptA.events) {
                const userMultiplier = new ethers.utils.Interface([
                    "event MultiplierSet(address tokenAddress, uint128 tokenId, uint128 multiplier)",
                ]);
                const log = userMultiplier.parseLog(receiptA.events[receiptA.events.length - 1]);
                multiplierA = log.args.multiplier;
            } else {
                throw new Error("Multiplier not set");
            }

            // LockingVault users: deposits and delegation
            // query voting power to initialize history for every governance participant
            const tx = await (
                await lockingVotingVault.deposit(signers[2].address, ONE.mul(3), signers[0].address)
            ).wait();
            // view query voting power of signers[0]
            const votingPower = await lockingVotingVault.queryVotePowerView(signers[0].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(3));

            const tx2 = await (await lockingVotingVault.deposit(signers[1].address, ONE, signers[2].address)).wait();
            // view query voting power of signers[2]
            const votingPower2 = await lockingVotingVault.queryVotePowerView(signers[2].address, tx2.blockNumber);
            expect(votingPower2).to.be.eq(ONE);

            const tx3 = await (await lockingVotingVault.deposit(signers[4].address, ONE, signers[1].address)).wait();
            // view query voting power of signers[1]
            const votingPower3 = await lockingVotingVault.queryVotePowerView(signers[1].address, tx3.blockNumber);
            expect(votingPower3).to.be.eq(ONE);

            // Unique multiplier voting vault users: Badge registration and delegation

            // approve signers[0] tokens to unique multiplier voting vault
            await token.approve(uniqueMultiplierVotingVault.address, ONE);

            // signers[0] registers reputation NFT, deposits ONE tokens and delegates to signers[1]
            const tx4 = await uniqueMultiplierVotingVault.addNftAndDelegate(
                ONE,
                1,
                reputationNft.address,
                signers[1].address,
            );

            const votingPower4 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx4.blockNumber,
            );
            expect(votingPower4).to.be.eq(ONE.mul(multiplierA));

            // approve signers[2] tokens to unique multiplier voting vault
            await token.connect(signers[2]).approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            // signers[2] registers reputation NFT, deposits 5 tokens and delegates to signers[1]
            const tx5 = await (
                await uniqueMultiplierVotingVault
                    .connect(signers[2])
                    .addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[1].address)
            ).wait();

            // view query voting power of signer[1]
            const votingPower5 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx5.blockNumber,
            );
            expect(votingPower5).to.be.eq(ONE.mul(5).add(ONE).mul(multiplierA));

            // approve signers[3] tokens to unique multiplier voting vault
            await token.connect(signers[3]).approve(uniqueMultiplierVotingVault.address, ONE);
            // signers[3] registers reputation NFT, deposits ONE tokens and delegates to signers[0]
            const tx6 = await uniqueMultiplierVotingVault
                .connect(signers[3])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[0].address);

            // view query voting power of signers[0]
            const votingPower6 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[0].address,
                tx6.blockNumber,
            );
            expect(votingPower6).to.be.eq(ONE.mul(multiplierA));

            // approve signers[1] tokens to unique multiplier voting vault
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE.mul(8));
            // signers[1] registers reputation NFT, deposits 8 tokens and delegates to signers[2]
            const tx7 = await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE.mul(8), 1, reputationNft.address, signers[2].address);

            // view query voting power of signers[2]
            const votingPower7 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[2].address,
                tx7.blockNumber,
            );
            expect(votingPower7).to.be.eq(ONE.mul(8).mul(multiplierA));

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
