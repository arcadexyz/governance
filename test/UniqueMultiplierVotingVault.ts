import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers, waffle } from "hardhat";

import { TestContextVotingVault, votingVaultFixture } from "./utils/votingVaultFixture";

const { provider } = waffle;

describe("Vote Execution with Unique Multiplier Voting Vault", async () => {
    let ctxVault: TestContextVotingVault;

    const ONE = ethers.utils.parseEther("1");
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    before(async function () {
        ctxVault = await votingVaultFixture();
    });

    describe("Governance flow with unique multiplier voting vault", async () => {
        it("Executes V2 OriginationFee update with a vote: YES", async () => {
            // invoke the fixture function
            ctxVault = await votingVaultFixture();

            const {
                signers,
                coreVoting,
                increaseBlockNumber,
                token,
                uniqueMultiplierVotingVault,
                goldBadge,
                silverBadge,
                bronzeBadge,
                mintBadge,
                feeController,
            } = ctxVault;

            // mint users some badges
            await mintBadge();

            // signers[0] approves tokens to unique multiplier vault
            await token.approve(uniqueMultiplierVotingVault.address, ONE);

            // get signers[0] badgeId
            const badgeId0 = await goldBadge.tokenOfOwnerByIndex(signers[0].address, 0);
            // signers[0] deposits tokens and delegates to signers[1], uses GOLD badge
            const tx = await uniqueMultiplierVotingVault.addBadgeAndDelegate(ONE, badgeId0, 0, signers[1].address);
            const receipt = await tx.wait();

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

            const votingPower = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx.blockNumber,
            );
            expect(votingPower).to.be.eq(ONE.mul(multiplier1));

            // get signers[2] badgeId
            const badgeId2 = await goldBadge.tokenOfOwnerByIndex(signers[2].address, 0);
            // approve signer tokens to unique multiplier voting vault
            await token.connect(signers[2]).approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            // signers[2] deposits 5 tokens and delegates to  signers[1], uses GOLD badge
            const tx1 = await uniqueMultiplierVotingVault
                .connect(signers[2])
                .addBadgeAndDelegate(ONE.mul(5), badgeId2, 0, signers[1].address);
            // view query voting power of signers 1
            const votingPower1 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx1.blockNumber,
            );
            expect(votingPower1).to.be.eq(ONE.mul(5).add(ONE).mul(multiplier1));

            // get signers[3] badgeId
            const badgeId3 = await silverBadge.tokenOfOwnerByIndex(signers[3].address, 0);
            // approve signer tokens to unique multiplier voting vault
            await token.connect(signers[3]).approve(uniqueMultiplierVotingVault.address, ONE.mul(3));
            // signers[3] deposits three tokens and delegates to  signers[0], uses SILVER badge
            const tx2 = await uniqueMultiplierVotingVault
                .connect(signers[3])
                .addBadgeAndDelegate(ONE.mul(3), badgeId3, 1, signers[0].address);
            const receipt2 = await tx2.wait();

            // get votingPower multiplier for signers[3]
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
            const votingPower2 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[0].address,
                tx2.blockNumber,
            );
            expect(votingPower2).to.be.eq(ONE.mul(3).mul(multiplier2));

            // get signers[1] badgeId
            const badgeId1 = await bronzeBadge.tokenOfOwnerByIndex(signers[1].address, 0);
            // signers[1] approved ONE tokens to pVault
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            // signers[1] deposits ONE tokens and delegates to  signers[2], uses BRONZE badge
            const tx3 = await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addBadgeAndDelegate(ONE, badgeId1, 2, signers[2].address);
            const receipt3 = await tx3.wait();

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
            const votingPower3 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[2].address,
                tx3.blockNumber,
            );
            expect(votingPower3).to.be.eq(ONE.mul(multiplier3));

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
                .proposal(
                    [uniqueMultiplierVotingVault.address],
                    zeroExtraData,
                    targetAddress,
                    [feeContCalldata],
                    MAX,
                    0,
                );

            // pass proposal with YES majority
            await coreVoting.connect(signers[2]).vote([uniqueMultiplierVotingVault.address], zeroExtraData, 0, 0); // yes vote

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
            ctxVault = await votingVaultFixture();

            const { signers, token, uniqueMultiplierVotingVault, getBlock, goldBadge, mintBadge } = ctxVault;

            // mint users some badges
            await mintBadge();

            // initialize history for signers[1]
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            // get signers[1] badgeId
            const badgeId1 = await goldBadge.tokenOfOwnerByIndex(signers[1].address, 0);
            // signers[1] deposits ONE token and delegates to self, uses GOLD badge
            const tx0 = await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addBadgeAndDelegate(ONE, badgeId1, 0, signers[1].address);
            const receipt = await tx0.wait();

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

            // signers[0] approves 5 tokens to unique multiplier voting vault
            await token.approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            // get signers[0] badgeId
            const badgeId = await goldBadge.tokenOfOwnerByIndex(signers[0].address, 0);
            // signers[0] deposits 5 tokens and delegates to signers[1], uses GOLD badge
            const tx = await (
                await uniqueMultiplierVotingVault.addBadgeAndDelegate(ONE.mul(5), badgeId, 0, signers[1].address)
            ).wait();

            // get contract balance after these 2 txns
            const contractBalance = await token.balanceOf(uniqueMultiplierVotingVault.address);

            // get delegatee voting power amount
            const votingPower = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx.blockNumber,
            );
            expect(votingPower).to.be.eq(ONE.mul(6).mul(multiplier1));
            // signers[0] withdraws ONE token
            await uniqueMultiplierVotingVault.connect(signers[0]).withdraw(ONE);

            // get contract balance after withdrawal
            const contractBalanceAfter = await token.balanceOf(uniqueMultiplierVotingVault.address);
            // confirm current contract balance equals previous balance minus ONE
            expect(contractBalanceAfter).to.eq(contractBalance.sub(ONE));

            const nowBlock = getBlock();
            // get delegatee voting power after
            const votingPowerAfter = await uniqueMultiplierVotingVault.queryVotePowerView(signers[1].address, nowBlock);

            // confirm that delegatee voting power is less than before withdrawal
            expect(votingPowerAfter).to.eq(votingPower.sub(ONE.mul(multiplier1)));
        });

        it("All token withdrawal reduces delegatee voting power and withdrawn tokens transferred back user", async () => {
            // invoke the fixture
            ctxVault = await votingVaultFixture();

            const { signers, token, uniqueMultiplierVotingVault, getBlock, goldBadge, mintBadge } = ctxVault;

            // mint users some badges
            await mintBadge();

            // initialize history for signers[1]
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            // get signers[1] badgeId
            const badgeId1 = await goldBadge.tokenOfOwnerByIndex(signers[1].address, 0);
            // signers[1] deposits ONE token and delegates to self, uses GOLD badge
            const tx0 = await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addBadgeAndDelegate(ONE, badgeId1, 0, signers[1].address);
            const receipt = await tx0.wait();

            // get votingPower multiplier for signers[1]
            let multiplier: BigNumberish;
            if (receipt && receipt.events) {
                const badgeRegistered = new ethers.utils.Interface([
                    "event TransactionMultiplierSet(address indexed user, address badgeAddress, uint128 tokenId, uint256 multiplier)",
                ]);
                const log = badgeRegistered.parseLog(receipt.events[receipt.events.length - 3]);
                multiplier = log.args.multiplier;
            } else {
                throw new Error("Unable to register badge");
            }

            const now = getBlock();
            // get signers[1] voting power before they receive any further delegation
            const votingPowerBefore = await uniqueMultiplierVotingVault.queryVotePowerView(signers[1].address, now);

            // signers[0] approves 5 tokens to uinque multiplier voting vaut
            await token.approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            // get signers[0] badgeId
            const badgeId = await goldBadge.tokenOfOwnerByIndex(signers[0].address, 0);
            // signers[0] deposits 5 tokens and delegates to signers[1], uses GOLD badge
            const tx = await (
                await uniqueMultiplierVotingVault.addBadgeAndDelegate(ONE.mul(5), badgeId, 0, signers[1].address)
            ).wait();

            // get contract balance after these 2 txns
            const contractBalance = await token.balanceOf(uniqueMultiplierVotingVault.address);

            // get delegatee total voting power amount
            const votingPower = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx.blockNumber,
            );
            expect(votingPower).to.be.eq(ONE.mul(6).mul(multiplier));

            // signers[0] balance before they withdraw
            const withdrawerBalBefore = await token.balanceOf(signers[0].address);
            // signers[0] withdraws all their deposited tokens
            await uniqueMultiplierVotingVault.connect(signers[0]).withdraw(ONE.mul(5));

            // get contract balance after withdraw txn
            const contractBalanceAfter = await token.balanceOf(uniqueMultiplierVotingVault.address);
            // confirm current contract balance is balance minus amount withdrawn
            expect(contractBalanceAfter).to.eq(contractBalance.sub(ONE.mul(5)));

            const afterBlock = getBlock();
            // get delegatee voting power after token withdrawal
            const votingPowerAfter = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                afterBlock,
            );

            // confirm that the delegatee voting is now less
            expect(votingPowerAfter).to.eq(votingPowerBefore);

            // signers[0] balance after withdraw
            const withdrawerBalAfter = await token.balanceOf(signers[0].address);
            // confirm that the delegatee voting is less than voting power before token withdrawal
            expect(withdrawerBalAfter).to.eq(withdrawerBalBefore.add(ONE.mul(5)));
        });

        it("It reduces the correct amount of voting power from a delegate when a user changes their delegation", async () => {
            // invoke the fixture
            ctxVault = await votingVaultFixture();

            const { signers, token, uniqueMultiplierVotingVault, getBlock, goldBadge, mintBadge } = ctxVault;

            // mint users some badges
            await mintBadge();

            // initialize history for signers[1]
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            // get signers[1] badgeId
            const badgeId1 = await goldBadge.tokenOfOwnerByIndex(signers[1].address, 0);
            // signers[1] deposits ONE token and delegates to self, uses GOLD badge
            const tx0 = await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addBadgeAndDelegate(ONE, badgeId1, 0, signers[1].address);
            const receipt = await tx0.wait();

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

            // signers[0] approves 5 tokens to unique multiplier voting vault
            await token.approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            // get signers[0] badgeId
            const badgeId = await goldBadge.tokenOfOwnerByIndex(signers[0].address, 0);
            // signers[0] deposits 5 tokens and delegates to signers[1], uses GOLD badge
            const tx = await (
                await uniqueMultiplierVotingVault.addBadgeAndDelegate(ONE.mul(5), badgeId, 0, signers[1].address)
            ).wait();

            // get delegatee total voting power amount
            const votingPowerSignersOne = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx.blockNumber,
            );
            expect(votingPowerSignersOne).to.be.eq(ONE.mul(6).mul(multiplier1));

            // get signers[3] badgeId
            const badgeId3 = await goldBadge.tokenOfOwnerByIndex(signers[3].address, 0);
            // approve signer tokens to unique multiplier voting vault
            await token.connect(signers[3]).approve(uniqueMultiplierVotingVault.address, ONE);
            // signers[3] deposits ONE tokens and delegates to  signers[0], uses GOLD badge
            const tx2 = await uniqueMultiplierVotingVault
                .connect(signers[3])
                .addBadgeAndDelegate(ONE, badgeId3, 0, signers[0].address);
            const receipt2 = await tx2.wait();

            // get votingPower multiplier for signers[3]
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
            const votingPowerSignersZero = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[0].address,
                tx2.blockNumber,
            );
            expect(votingPowerSignersZero).to.be.eq(ONE.mul(multiplier2));

            // signers[0] changes their delegation from users[1] to users[3]
            await (await uniqueMultiplierVotingVault.connect(signers[0]).delegate(signers[3].address)).wait();

            const afterBlock = getBlock();

            // confirm that signers[1] lost signers[0]'s voting power
            const votingPowerSignersOneAfter = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                afterBlock,
            );
            expect(votingPowerSignersOneAfter).to.eq(votingPowerSignersOne.sub(ONE.mul(5).mul(multiplier1)));

            // confirm that signers[3] has received signers[0]'s voting power
            const votingPowerSignersThreeAfter = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[3].address,
                afterBlock,
            );
            expect(votingPowerSignersThreeAfter).to.eq(ONE.mul(5).mul(multiplier2));
        });
    });
});
