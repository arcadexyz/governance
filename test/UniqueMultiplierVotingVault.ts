import { expect } from "chai";
import { BigNumberish, constants } from "ethers";
import { ethers, waffle } from "hardhat";

import { TestContextVotingVault, votingVaultFixture } from "./utils/votingVaultFixture";

const { provider } = waffle;

describe("Vote Execution with Unique Multiplier Voting Vault", async () => {
    let ctxVault: TestContextVotingVault;

    const ONE = ethers.utils.parseEther("1");
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    beforeEach(async function () {
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
                reputationNft,
                reputationNft2, // other ERC1155 reputation NFT w/ different multiplier
                mintNfts,
                feeController,
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

            // signers[0] approves tokens to unique multiplier vault and approves reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[0] registers reputation NFT, deposits tokens and delegates to signers[1]
            const tx = await uniqueMultiplierVotingVault.addNftAndDelegate(
                ONE,
                1,
                reputationNft.address,
                signers[1].address,
            );

            const votingPower = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx.blockNumber,
            );
            expect(votingPower).to.be.eq(ONE.mul(multiplierA));

            // approve signer tokens to unique multiplier voting vault and approves reputation nft
            await token.connect(signers[2]).approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            await reputationNft.connect(signers[2]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[2] registers reputation NFT, deposits 5 tokens and delegates to signers[1]
            const tx1 = await uniqueMultiplierVotingVault
                .connect(signers[2])
                .addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[1].address);

            // view query voting power of signers 1
            const votingPower1 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx1.blockNumber,
            );
            expect(votingPower1).to.be.eq(ONE.mul(5).add(ONE).mul(multiplierA));

            // approve signer tokens to unique multiplier voting vault
            await token.connect(signers[3]).approve(uniqueMultiplierVotingVault.address, ONE.mul(3));
            await reputationNft2.connect(signers[3]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);
            // signers[3] registers reputation NFT type 2, deposits three tokens and delegates to signers[0]
            const tx2 = await uniqueMultiplierVotingVault
                .connect(signers[3])
                .addNftAndDelegate(ONE.mul(3), 1, reputationNft2.address, signers[0].address);

            // view query voting power of signers[0]
            const votingPower2 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[0].address,
                tx2.blockNumber,
            );
            expect(votingPower2).to.be.eq(ONE.mul(3).mul(multiplierB));

            // signers[1] approved ONE tokens to pVault and approves reputation nft
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to signers[2]
            const tx3 = await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[2].address);

            // view query voting power of signers[2]
            const votingPower3 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[2].address,
                tx3.blockNumber,
            );
            expect(votingPower3).to.be.eq(ONE.mul(multiplierA));

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
            // invoke the fixture function
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, getBlock } = ctxVault;

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

            // initialize history for signers[1]
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);
            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to self
            await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            // signers[0] approves 5 tokens to unique multiplier voting vault and approves reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);
            // signers[0] registers reputation NFT, deposits 5 tokens and delegates to signers[1]
            const tx = await uniqueMultiplierVotingVault.addNftAndDelegate(
                ONE.mul(5),
                1,
                reputationNft.address,
                signers[1].address,
            );
            await tx.wait();

            // get contract balance after these 2 txns
            const contractBalance = await token.balanceOf(uniqueMultiplierVotingVault.address);

            // get delegatee voting power amount
            const votingPower = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx.blockNumber,
            );
            expect(votingPower).to.be.eq(ONE.mul(6).mul(multiplierA));

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
            expect(votingPowerAfter).to.eq(votingPower.sub(ONE.mul(multiplierA)));
        });

        it("All token withdrawal reduces delegatee voting power and withdrawn tokens transferred back user", async () => {
            // invoke the fixture
            ctxVault = await votingVaultFixture();

            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, getBlock } = ctxVault;

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

            // initialize history for signers[1]
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to self
            await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            const now = getBlock();
            // get signers[1] voting power before they receive any further delegation
            const votingPowerBefore = await uniqueMultiplierVotingVault.queryVotePowerView(signers[1].address, now);
            expect(votingPowerBefore).to.eq(ONE.mul(multiplierA));

            // signers[0] approves 5 tokens to unique multiplier voting vaut and reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[0] registers reputation NFT, deposits FIVE tokens and delegates to signers[1]
            const tx = await (
                await uniqueMultiplierVotingVault.addNftAndDelegate(
                    ONE.mul(5),
                    1,
                    reputationNft.address,
                    signers[1].address,
                )
            ).wait();

            // confirm that signers[0] no longer holds their reputation nft. it is held by the contract
            const erc1155Bal = await reputationNft.balanceOf(signers[0].address, 1);
            expect(erc1155Bal).to.be.eq(0);

            // get contract balance after these 2 txns
            const contractBalance = await token.balanceOf(uniqueMultiplierVotingVault.address);

            // get delegatee total voting power amount
            const votingPower = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx.blockNumber,
            );
            expect(votingPower).to.be.eq(ONE.mul(6).mul(multiplierA));

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
            expect(votingPowerAfter).to.eq(ONE.mul(multiplierA));

            // signers[0] balance after withdraw
            const withdrawerBalAfter = await token.balanceOf(signers[0].address);
            // confirm that signers[0] balance voting is more than before token withdrawal
            expect(withdrawerBalAfter).to.eq(withdrawerBalBefore.add(ONE.mul(5)));
            // confirm that signers[0] now holds their reputation nft
            const erc1155Bal2 = await reputationNft.balanceOf(signers[0].address, 1);
            expect(erc1155Bal2).to.be.eq(1);
        });

        it("It reduces the correct amount of voting power from a delegate when a user changes their delegation", async () => {
            // invoke the fixture
            ctxVault = await votingVaultFixture();

            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, getBlock } = ctxVault;

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

            // initialize history for signers[1]
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to self
            await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            // signers[0] approves 5 tokens to unique multiplier voting vault and reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[0] registers reputation NFT, deposits FIVE tokens and delegates to signers[1]
            const tx = await (
                await uniqueMultiplierVotingVault.addNftAndDelegate(
                    ONE.mul(5),
                    1,
                    reputationNft.address,
                    signers[1].address,
                )
            ).wait();

            // get delegatee total voting power amount
            const votingPowerSignersOne = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx.blockNumber,
            );
            expect(votingPowerSignersOne).to.be.eq(ONE.mul(6).mul(multiplierA));

            // approve signer tokens to unique multiplier voting vault and approves reputation nft
            await token.connect(signers[3]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[3]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);
            // signers[3] registers reputation NFT, deposits ONE tokens and delegates to signers[0]
            const tx2 = await uniqueMultiplierVotingVault
                .connect(signers[3])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[0].address);

            // view query voting power of signers[0]
            const votingPowerSignersZero = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[0].address,
                tx2.blockNumber,
            );
            expect(votingPowerSignersZero).to.be.eq(ONE.mul(multiplierA));

            // signers[0] changes their delegation from users[1] to users[3]
            await (await uniqueMultiplierVotingVault.connect(signers[0]).delegate(signers[3].address)).wait();

            const afterBlock = getBlock();

            // confirm that signers[1] lost signers[0]'s voting power
            const votingPowerSignersOneAfter = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                afterBlock,
            );
            expect(votingPowerSignersOneAfter).to.eq(votingPowerSignersOne.sub(ONE.mul(5).mul(multiplierA)));

            // confirm that signers[3] has received signers[0]'s voting power
            const votingPowerSignersThreeAfter = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[3].address,
                afterBlock,
            );
            expect(votingPowerSignersThreeAfter).to.eq(ONE.mul(5).mul(multiplierA));
        });
    });

    describe("Multiplier functionality", async () => {
        it("Sets the multiplier", async () => {
            // invoke the fixture function
            ctxVault = await votingVaultFixture();

            const { signers, uniqueMultiplierVotingVault, reputationNft } = ctxVault;

            // manager updates the value of the token address multiplier
            await uniqueMultiplierVotingVault
                .connect(signers[0])
                .setMultiplier(reputationNft.address, 1, ethers.utils.parseEther("1.2"));

            // get new multiplier value
            const multiplierVal = await uniqueMultiplierVotingVault.getMultiplier(reputationNft.address, 1);
            await expect(multiplierVal).to.eq(ethers.utils.parseEther("1.2"));
        });

        it("Sets a multiplier for each different tokenId of the same ERC1155 address", async () => {
            // invoke the fixture function
            ctxVault = await votingVaultFixture();

            const { signers, uniqueMultiplierVotingVault, reputationNft } = ctxVault;

            // manager sets the value of the multiplier for ERC1155's token id 1
            await uniqueMultiplierVotingVault
                .connect(signers[0])
                .setMultiplier(reputationNft.address, 1, ethers.utils.parseEther("1.2"));

            // manager sets the value of the multiplier for ERC1155's token id 2
            await uniqueMultiplierVotingVault
                .connect(signers[0])
                .setMultiplier(reputationNft.address, 2, ethers.utils.parseEther("1.4"));

            // get multiplier value for tokenId 1
            const multiplier1Val = await uniqueMultiplierVotingVault.getMultiplier(reputationNft.address, 1);
            await expect(multiplier1Val).to.eq(ethers.utils.parseEther("1.2"));

            // get multiplier value for tokenId 2
            const multiplier2Val = await uniqueMultiplierVotingVault.getMultiplier(reputationNft.address, 2);
            await expect(multiplier2Val).to.eq(ethers.utils.parseEther("1.4"));
        });

        it("Fails if the caller is not the manager", async () => {
            // invoke the fixture function
            ctxVault = await votingVaultFixture();

            const { signers, uniqueMultiplierVotingVault, reputationNft } = ctxVault;

            // non-manager account to try to update the value of the token address multiplier
            const tx = uniqueMultiplierVotingVault
                .connect(signers[2])
                .setMultiplier(reputationNft.address, 1, ethers.utils.parseEther("1.2"));
            await expect(tx).to.be.revertedWith("!manager");
        });

        it("Only manager can set a new manager", async () => {
            // invoke the fixture function
            ctxVault = await votingVaultFixture();

            const { signers, uniqueMultiplierVotingVault } = ctxVault;

            // get the address of the current manager
            const manager = await uniqueMultiplierVotingVault.manager();
            await expect(manager).to.be.eq(signers[0].address);

            // manager, sets a new manager
            const tx = await uniqueMultiplierVotingVault.connect(signers[0]).setManager(signers[5].address);
            tx.wait();

            const newManager = await uniqueMultiplierVotingVault.manager();
            await expect(await uniqueMultiplierVotingVault.manager()).to.be.eq(newManager);
        });

        it("Correctly updates the value of multiplier", async () => {
            // invoke the fixture function
            ctxVault = await votingVaultFixture();

            const { signers, uniqueMultiplierVotingVault, reputationNft } = ctxVault;

            // manager sets the value of the token address multiplier
            await uniqueMultiplierVotingVault
                .connect(signers[0])
                .setMultiplier(reputationNft.address, 1, ethers.utils.parseEther("1.2"));

            // get the current multiplier
            const multiplier = await uniqueMultiplierVotingVault.getMultiplier(reputationNft.address, 1);
            await expect(multiplier).to.eq(ethers.utils.parseEther("1.2"));

            // manager updates the value of the multiplier
            await uniqueMultiplierVotingVault
                .connect(signers[0])
                .setMultiplier(reputationNft.address, 1, ethers.utils.parseEther("1.4"));

            // get new multiplier value
            const newMultiplier = await uniqueMultiplierVotingVault.getMultiplier(reputationNft.address, 1);
            await expect(newMultiplier).to.eq(ethers.utils.parseEther("1.4"));
        });

        it("Return zero if multiplier() is called on a non-zero ERC1155 token that does not have a multiplier", async () => {
            // invoke the fixture function
            ctxVault = await votingVaultFixture();
            const { uniqueMultiplierVotingVault, reputationNft } = ctxVault;

            // get the current multiplier
            const multiplier = await uniqueMultiplierVotingVault.getMultiplier(reputationNft.address, 1);
            await expect(multiplier).to.eq(0);
        });

        it("Reverts if user is trying to register an ERC1155 token that does not have a multiplier", async () => {
            // invoke the fixture function
            ctxVault = await votingVaultFixture();

            const { signers, uniqueMultiplierVotingVault, reputationNft, token, mintNfts } = ctxVault;

            // mint nft for user
            await mintNfts();

            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            const tx = uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[0].address);

            await expect(tx).to.be.revertedWith("UMVV_NoMultiplierSet");
        });

        it("Multiplier value is set to one when addNftAndDelegate() is called with ERC1155 token address zero", async () => {
            // invoke the fixture function
            ctxVault = await votingVaultFixture();

            const { uniqueMultiplierVotingVault, signers, token, reputationNft } = ctxVault;

            // signers[0] approves 5 tokens to unique multiplier voting vault and approves reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[0] registers reputation NFT as address zero, deposits FIVE tokens and delegates to self
            const tx = await uniqueMultiplierVotingVault.addNftAndDelegate(
                ONE.mul(5),
                0,
                ethers.constants.AddressZero,
                signers[0].address,
            );

            // get total voting power amount
            const votingPower = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[0].address,
                tx.blockNumber,
            );

            // get the current multiplier
            const multiplier = await uniqueMultiplierVotingVault.getMultiplier(constants.AddressZero, 0);
            await expect(multiplier).to.eq(ethers.utils.parseEther("1"));
            expect(votingPower).to.be.eq(ONE.mul(5).mul(multiplier));
        });
    });

    describe("ERC1155 functionality", async () => {
        it("UMVV becomes holder of reputation nft when addNftAndDelegate() is called", async () => {
            // invoke the fixture function
            ctxVault = await votingVaultFixture();

            const { uniqueMultiplierVotingVault, signers, token, reputationNft, mintNfts } = ctxVault;

            // mint user some nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await uniqueMultiplierVotingVault.setMultiplier(reputationNft.address, 1, ethers.utils.parseEther("1.2"));

            // check that the user is holding a reputation nft
            const userErc1155Bal = await reputationNft.balanceOf(signers[0].address, 1);
            expect(userErc1155Bal).to.be.eq(1);

            // signers[0] approves ONE tokens to unique multiplier voting vault and approves reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[0] registers reputation NFT as address zero, deposits tokens and delegates to self
            await uniqueMultiplierVotingVault.addNftAndDelegate(ONE, 1, reputationNft.address, signers[0].address);

            // check that the user balance for reputation nft is now zero
            const userErc1155Bal2 = await reputationNft.balanceOf(signers[0].address, 1);
            expect(userErc1155Bal2).to.be.eq(0);

            // check that the contract is now the holder of the reputation nft
            const erc1155Bal = await reputationNft.balanceOf(uniqueMultiplierVotingVault.address, 1);
            expect(erc1155Bal).to.be.eq(1);
        });

        it("Transfers reputation nft back to user when withdrawNft() is called", async () => {
            // invoke the fixture function
            ctxVault = await votingVaultFixture();

            const { uniqueMultiplierVotingVault, signers, token, reputationNft, mintNfts } = ctxVault;

            // mint user some nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await uniqueMultiplierVotingVault.setMultiplier(reputationNft.address, 1, ethers.utils.parseEther("1.2"));

            // signers[0] approves ONE tokens to unique multiplier voting vault and approves reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[0] registers reputation NFT as address zero, deposits tokens and delegates to self
            await uniqueMultiplierVotingVault.addNftAndDelegate(ONE, 1, reputationNft.address, signers[0].address);

            // check that the user balance for reputation nft is now zero
            const userErc1155Bal = await reputationNft.balanceOf(signers[0].address, 1);
            expect(userErc1155Bal).to.be.eq(0);

            // check that the contract is the holder of the reputation nft
            const erc1155Bal = await reputationNft.balanceOf(uniqueMultiplierVotingVault.address, 1);
            expect(erc1155Bal).to.be.eq(1);

            // user withdraws ERC1155
            await uniqueMultiplierVotingVault.withdrawNft();

            // check that the user balance for reputation nft is now zero
            const userErc1155Bal2 = await reputationNft.balanceOf(signers[0].address, 1);
            expect(userErc1155Bal2).to.be.eq(1);
        });

        it("Reverts if withdrawNft() is called and the user has not deposited a reputationNFT", async () => {
            // invoke the fixture function
            ctxVault = await votingVaultFixture();

            const { uniqueMultiplierVotingVault, signers, token, reputationNft } = ctxVault;

            // signers[0] approves 5 tokens to unique multiplier voting vault and approves reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[0] registers reputation NFT as address zero, deposits FIVE tokens and delegates to self
            await uniqueMultiplierVotingVault.addNftAndDelegate(
                ONE,
                0,
                ethers.constants.AddressZero,
                signers[0].address,
            );

            // user calls withdraws ERC1155
            const tx = uniqueMultiplierVotingVault.withdrawNft();
            await expect(tx).to.be.revertedWith("UMVV_DoesNotOwn");
        });

        it("Reduces delegatee votingPower if withdrawNft() is called and user tokens are still locked", async () => {
            // invoke the fixture function
            ctxVault = await votingVaultFixture();

            const { uniqueMultiplierVotingVault, signers, token, reputationNft, mintNfts } = ctxVault;

            // mint user some nfts
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

            // initialize history for signers[1]
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);
            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to self
            await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            // signers[0] approves 5 tokens to unique multiplier voting vault and approves reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);
            // signers[0] registers reputation NFT, deposits 5 tokens and delegates to signers[1]
            const tx = await uniqueMultiplierVotingVault.addNftAndDelegate(
                ONE.mul(5),
                1,
                reputationNft.address,
                signers[1].address,
            );
            await tx.wait();

            // get delegatee voting power amount
            const votingPower = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx.blockNumber,
            );
            expect(votingPower).to.be.eq(ONE.mul(6).mul(multiplierA));

            // user withdraws ERC1155
            const tx2 = await uniqueMultiplierVotingVault.withdrawNft();
            await tx2.wait();

            // get delegatee voting power amount
            const votingPowerAfter = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx2.blockNumber,
            );
            // expect only the votinPower amount associated with signers 0 to have the multiplier value eliminated
            expect(votingPowerAfter).to.be.eq(ONE.mul(multiplierA).add(ONE.mul(5)));
        });

        it("When can change their reputation nft wiht updateNft()", async () => {
            // invoke the fixture function
            ctxVault = await votingVaultFixture();

            const {
                signers,
                token,
                uniqueMultiplierVotingVault,
                reputationNft,
                reputationNft2, // other ERC1155 reputation NFT w/ different multiplier
                mintNfts,
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

            // signers[0] approves tokens to unique multiplier vault and approves reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[0] registers reputation NFT, deposits tokens and delegates to signers[1]
            const tx = await uniqueMultiplierVotingVault.addNftAndDelegate(
                ONE,
                1,
                reputationNft.address,
                signers[1].address,
            );

            const votingPower = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx.blockNumber,
            );
            expect(votingPower).to.be.eq(ONE.mul(multiplierA));

            // approve signers 1 tokens to unique multiplier voting vault and approves reputation nft
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] registers reputation NFT, deposits 5 tokens and delegates to self
            const tx1 = await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE.mul(5), 1, reputationNft.address, signers[1].address);

            // view query voting power of signers 1
            const votingPower1 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx1.blockNumber,
            );
            expect(votingPower1).to.be.eq(ONE.mul(5).add(ONE).mul(multiplierA));

            // signers[0] updates their reputation nft to reputationNft2 which is associated with multiplierB
            const tx2 = await uniqueMultiplierVotingVault.updateNft(1, reputationNft2.address);

            // they are now again holding the reputation nft they have replaced
            const userErc1155Bal = await reputationNft.balanceOf(signers[0].address, 1);
            expect(userErc1155Bal).to.be.eq(1);

            // their delegatee voting power changes based on the mulitplier value of their new badge
            // view query voting power of signers 1
            const votingPower2 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx2.blockNumber,
            );
            expect(votingPower2).to.be.eq(ONE.mul(5).mul(multiplierA).add(ONE.mul(multiplierB)));
        });
    });
});
