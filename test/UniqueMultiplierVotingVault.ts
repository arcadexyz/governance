import { expect } from "chai";
import { constants } from "ethers";
import { ethers, waffle } from "hardhat";

import { TestContextVotingVault, votingVaultFixture } from "./utils/votingVaultFixture";

const { provider } = waffle;

describe("Governance Operations with Unique Multiplier Voting Vault", async () => {
    let ctxVault: TestContextVotingVault;

    const ONE = ethers.utils.parseEther("1");
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    beforeEach(async function () {
        ctxVault = await votingVaultFixture();
    });

    describe("Governance flow with unique multiplier voting vault", async () => {
        it("Executes V2 OriginationFee update with a vote: YES", async () => {
            const {
                signers,
                coreVoting,
                increaseBlockNumber,
                token,
                uniqueMultiplierVotingVault,
                reputationNft,
                reputationNft2, // other ERC1155 reputation NFT w/ different multiplier
                mintNfts,
                setMultipliers,
                feeController,
            } = ctxVault;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A, MULTIPLIER_B } = await setMultipliers();

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
            expect(votingPower).to.be.eq(ONE.mul(MULTIPLIER_A).div(ONE));

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
            expect(votingPower1).to.be.eq(ONE.mul(6).mul(MULTIPLIER_A).div(ONE));

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
            expect(votingPower2).to.be.eq(ONE.mul(3).mul(MULTIPLIER_B).div(ONE));

            // signers[1] approves ONE tokens to voting vault and approves reputation nft
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE.mul(3));
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] registers reputation NFT, deposits THREE tokens and delegates to signers[2]
            const tx3 = await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE.mul(3), 1, reputationNft.address, signers[2].address);

            // view query voting power of signers[2]
            const votingPower3 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[2].address,
                tx3.blockNumber,
            );
            expect(votingPower3).to.be.eq(ONE.mul(3).mul(MULTIPLIER_A).div(ONE));

            // proposal creation to update originationFee in FeeController
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

            // proposal 0 execution
            await coreVoting.connect(signers[0]).execute(0, targetAddress, [feeContCalldata]);
            const originationFee = await feeController.getOriginationFee();
            expect(originationFee).to.equal(newFee);
        });

        it("Partial token withdrawal reduces delegatee voting power", async () => {
            // invoke the fixture function
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, getBlock, setMultipliers } =
                ctxVault;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A } = await setMultipliers();

            // initialize history for signers[1]
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to self
            await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            // signers[0] approves 5 tokens to voting vault and approves reputation nft
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

            // get contract balance after these txns
            const contractBalance = await token.balanceOf(uniqueMultiplierVotingVault.address);

            // get delegatee voting power amount
            const votingPower = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx.blockNumber,
            );
            expect(votingPower).to.be.eq(ONE.mul(6).mul(MULTIPLIER_A).div(ONE));

            // signers[0] withdraws ONE token
            await uniqueMultiplierVotingVault.connect(signers[0]).withdraw(ONE);

            // get contract balance after withdrawal
            const contractBalanceAfter = await token.balanceOf(uniqueMultiplierVotingVault.address);
            // confirm current contract balance equals previous balance minus ONE
            expect(contractBalanceAfter).to.eq(contractBalance.sub(ONE));

            const nowBlock = getBlock();
            // get delegatee voting power after
            const votingPowerAfter = await uniqueMultiplierVotingVault.queryVotePowerView(signers[1].address, nowBlock);
            // confirm that delegatee voting power is ONE less than before withdrawal
            expect(votingPowerAfter).to.eq(votingPower.sub(ONE.mul(MULTIPLIER_A).div(ONE)));
        });

        it("Full token withdrawal reduces delegatee voting power. Withdrawn tokens transferred back to user", async () => {
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, getBlock, setMultipliers } =
                ctxVault;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A } = await setMultipliers();

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
            expect(votingPowerBefore).to.eq(ONE.mul(MULTIPLIER_A).div(ONE));

            // signers[0] approves 5 tokens to voting vault and approves reputation nft
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

            // confirm that signers[0] no longer holds their reputation nft, it is held by the contract
            const erc1155Bal = await reputationNft.balanceOf(signers[0].address, 1);
            expect(erc1155Bal).to.be.eq(0);

            // get contract ERC20 balance after these txns
            const contractBalance = await token.balanceOf(uniqueMultiplierVotingVault.address);

            // get delegatee total voting power amount
            const votingPower = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx.blockNumber,
            );
            expect(votingPower).to.be.eq(ONE.mul(6).mul(MULTIPLIER_A).div(ONE));

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
            expect(votingPowerAfter).to.eq(ONE.mul(MULTIPLIER_A).div(ONE));

            // signers[0] balance after withdraw
            const withdrawerBalAfter = await token.balanceOf(signers[0].address);
            // confirm that signers[0] balance voting is more than before token withdrawal
            expect(withdrawerBalAfter).to.eq(withdrawerBalBefore.add(ONE.mul(5)));
            // confirm that signers[0] now holds their reputation nft
            const erc1155Bal2 = await reputationNft.balanceOf(signers[0].address, 1);
            expect(erc1155Bal2).to.be.eq(1);
        });

        it("It reduces the correct amount of voting power from a delegate when a user changes their delegation", async () => {
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, getBlock, setMultipliers } =
                ctxVault;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A } = await setMultipliers();

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
            expect(votingPowerSignersOne).to.be.eq(ONE.mul(6).mul(MULTIPLIER_A).div(ONE));

            // signers [3] approves tokens to voting vault and approves reputation nft
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
            expect(votingPowerSignersZero).to.be.eq(ONE.mul(MULTIPLIER_A).div(ONE));

            // signers[0] changes their delegation from users[1] to users[3]
            await (await uniqueMultiplierVotingVault.connect(signers[0]).delegate(signers[3].address)).wait();

            const afterBlock = getBlock();

            // confirm that signers[1] lost signers[0]'s voting power
            const votingPowerSignersOneAfter = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                afterBlock,
            );
            expect(votingPowerSignersOneAfter).to.eq(votingPowerSignersOne.sub(ONE.mul(5).mul(MULTIPLIER_A).div(ONE)));

            // confirm that signers[3] has received signers[0]'s voting power
            const votingPowerSignersThreeAfter = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[3].address,
                afterBlock,
            );
            expect(votingPowerSignersThreeAfter).to.eq(ONE.mul(5).mul(MULTIPLIER_A).div(ONE));
        });

        it("Reverts a user calls addNftAndDelegate() with an nft they do not own", async () => {
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts } = ctxVault;

            // mint users some ERC1155 nfts
            await mintNfts();

            // signers[1] approves ERC1155 to signers[0]
            await reputationNft.connect(signers[1]).setApprovalForAll(signers[0].address, true);

            // signers[1] transfers their 1 ERC1155 id 1 to signers[0]
            await reputationNft
                .connect(signers[1])
                .safeTransferFrom(signers[1].address, signers[0].address, 1, 1, "0x");

            // confirm that signers[1] no longer owns any ERC1155 id 1
            const userBal = await reputationNft.balanceOf(signers[1].address, 1);
            expect(userBal).to.be.eq(0);

            // signers[1] approves tokens to voting vault
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] tries to add ERC1155 id 1 in their call for registration
            const tx = uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            await expect(tx).to.be.revertedWith("UMVV_DoesNotOwn");
        });

        it("Reverts when user who has an existing registration tries to call addNftAndDelegate() again", async () => {
            const {
                signers,
                token,
                uniqueMultiplierVotingVault,
                reputationNft,
                reputationNft2,
                mintNfts,
                setMultipliers,
            } = ctxVault;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            await setMultipliers();

            // signers[1] approves tokens to voting vault
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] registers
            await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[1].address);

            // signers[1] approves their other ERC1155 to the voting vault
            await reputationNft2.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] tries to register a second time
            const tx2 = uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft2.address, signers[1].address);

            await expect(tx2).to.be.revertedWith("UMVV_HasRegistration");
        });

        it("Allows user to self-delegate", async () => {
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, setMultipliers } = ctxVault;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            await setMultipliers();

            // signers[1] approves tokens to voting vault
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] registers and delegates to self by not specifying a delegation address
            const tx = await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, constants.AddressZero);
            const receipt = await tx.wait();

            // get the delegatee address
            let registrationDelegatee;
            if (receipt && receipt.events) {
                const userDelegatee = new ethers.utils.Interface([
                    "event VoteChange(address indexed from, address indexed to, int256 amount)",
                ]);
                const log = userDelegatee.parseLog(receipt.events[receipt.events.length - 1]);
                registrationDelegatee = log.args.to;
            } else {
                throw new Error("Registration delegatee not set");
            }

            // confirm that the registration delegatee is signers[1]
            await expect(registrationDelegatee).to.eq(signers[1].address);
        });

        it("Returns a user's registration with getRegistration()", async () => {
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, setMultipliers } = ctxVault;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            const { MULTIPLIER_A } = await setMultipliers();

            // signers[1] approves tokens to voting vault
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] registers and delegates to self by not specifying a delegation address
            const tx = await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, constants.AddressZero);
            await tx.wait();

            // get signers[1] registration
            const registration = await uniqueMultiplierVotingVault.getRegistration(signers[1].address);

            // confirm signers[1] registration data
            expect(registration[0]).to.eq(ONE);
            expect(registration[1]).to.eq(ONE.mul(MULTIPLIER_A).div(ONE));
            expect(registration[2]).to.eq(0);
            expect(registration[3]).to.eq(1);
            expect(registration[4]).to.eq(reputationNft.address);
            expect(registration[5]).to.eq(signers[1].address);
        });

        it("Reverts when calling delegate() when 'to' is already the user's delegatee", async () => {
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, setMultipliers } = ctxVault;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            await setMultipliers();

            // signers[1] approves tokens to voting vault
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] registers and delegates signers[2]
            await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[2].address);

            // get signers[1] registration
            const registration = await uniqueMultiplierVotingVault.getRegistration(signers[1].address);
            // confirm that signers[2] is signers[1] delegatee
            expect(registration[5]).to.eq(signers[2].address);

            // signers[1] calls delegate() on signers[2] who is already their delegate
            const tx = uniqueMultiplierVotingVault.connect(signers[1]).delegate(signers[2].address);

            await expect(tx).to.be.revertedWith("UMVV_AlreadyDelegated");
        });

        it("withdraw() correctly transfers all deposited ERC20 tokens back to the user if no ERC1155 nft has been deposited with registration", async () => {
            const { signers, token, uniqueMultiplierVotingVault, mintNfts, setMultipliers } = ctxVault;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // initialize history for signers[1]
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE.mul(5));

            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to self
            await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE.mul(5), 0, constants.AddressZero, signers[1].address);

            // get user balance after deposit
            const balanceBefore = await token.balanceOf(signers[1].address);

            // signers[1] withdraws their deposited token
            await uniqueMultiplierVotingVault.connect(signers[1]).withdraw(ONE.mul(5));

            // get user balance after withdraw
            const balanceAfter = await token.balanceOf(signers[1].address);

            // confirm user balance has grown by 5 tokens after withdraw
            expect(balanceAfter).to.eq(balanceBefore.add(ONE.mul(5)));
        });

        it("full withdraw() transfers nft back to the user if ERC1155 address and ERC1155 id does not equal zero", async () => {
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, setMultipliers } = ctxVault;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            const amountToDeposit = ONE;
            const amountToWithdraw = ONE;

            // initialize history for signers[1]
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, amountToDeposit);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to self
            await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(amountToDeposit, 1, reputationNft.address, signers[1].address);

            // confirm that signers[1] no longer holds their reputation nft, it is deposited in the contract
            const erc1155Bal = await reputationNft.balanceOf(signers[1].address, 1);
            expect(erc1155Bal).to.be.eq(0);

            // confirm that amountToDeposit and amountToWithdraw are equal
            expect(amountToDeposit).to.eq(amountToWithdraw);

            // get signers[1] registration
            const registration = await uniqueMultiplierVotingVault.getRegistration(signers[1].address);
            // confirm that registration.tokenId != 0
            expect(registration.tokenId).to.not.eq(0);
            // confirm that registration.tokenAddress != address(0)
            expect(registration.tokenAddress).to.not.eq(constants.AddressZero);

            // signers[1] withdraws their deposited token
            await uniqueMultiplierVotingVault.connect(signers[1]).withdraw(amountToWithdraw);

            // confirm that signers[1] now is the holder of their reputation nft
            const erc1155Bal2 = await reputationNft.balanceOf(signers[1].address, 1);
            expect(erc1155Bal2).to.be.eq(1);
        });

        it("Reverts if user tries to call withdraw() on amount larger than contract ERC20 balance", async () => {
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, setMultipliers } = ctxVault;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            await setMultipliers();

            // signers[1] approves tokens to voting vault
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] registers and delegates signers[2]
            await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[2].address);

            // signers[1] calls withdraw for FIVE tokens, which is larger than what the contract holds
            const tx = uniqueMultiplierVotingVault.connect(signers[1]).withdraw(ONE.mul(5));

            await expect(tx).to.be.revertedWith("UMVV_InsufficientBalance");
        });

        it("Reverts if user calls withdraw() with an amount larger than their registration amount", async () => {
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, setMultipliers } = ctxVault;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            await setMultipliers();

            // signers[1] approves tokens to voting vault
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] registers depositing ONE tokens and delegating to signers[2]
            await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[2].address);

            // signers[2] approves tokens to voting vault
            await token.connect(signers[2]).approve(uniqueMultiplierVotingVault.address, ONE.mul(10));
            await reputationNft.connect(signers[2]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[2] registers depositing TEN tokens and delegating to self
            await uniqueMultiplierVotingVault
                .connect(signers[2])
                .addNftAndDelegate(ONE.mul(10), 1, reputationNft.address, constants.AddressZero);

            // signers[1] calls withdraw for THREE tokens, which is larger than what they have deposited in their registration
            const tx = uniqueMultiplierVotingVault.connect(signers[1]).withdraw(ONE.mul(3));

            await expect(tx).to.be.revertedWith(`UMVV_InsufficientWithdrawableBalance(${ONE})`);
        });

        it("Reverts if user tries calls withdraw() with ZERO amount", async () => {
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, setMultipliers } = ctxVault;

            // mint users some ERC1155 nfts
            await mintNfts();

            // manager sets the value of the ERC1155 NFT multipliers
            await setMultipliers();

            // signers[2] approves tokens to voting vault
            await token.connect(signers[2]).approve(uniqueMultiplierVotingVault.address, ONE.mul(10));
            await reputationNft.connect(signers[2]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[2] registers depositing TEN tokens and delegating to self
            await uniqueMultiplierVotingVault
                .connect(signers[2])
                .addNftAndDelegate(ONE.mul(10), 1, reputationNft.address, constants.AddressZero);

            // signers[2] calls withdraw for 0 tokens
            const tx = uniqueMultiplierVotingVault.connect(signers[2]).withdraw(0);

            await expect(tx).to.be.revertedWith("UMVV_ZeroAmount");
        });

        it("ERC1155 stays locked when a user withdraws a fraction of their deposited tokens", async () => {
            // invoke the fixture function
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, setMultipliers } = ctxVault;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // signers[0] approves 5 tokens to voting vault and approves reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // confirm the user is holding the erc1155 nft they will deposit
            const userNftBal = await reputationNft.balanceOf(signers[0].address, 1);
            expect(userNftBal).to.be.eq(1);

            // confirm the contract is not holding any erc1155 nft
            const contractNftBal = await reputationNft.balanceOf(uniqueMultiplierVotingVault.address, 1);
            expect(contractNftBal).to.be.eq(0);

            // signers[0] registers reputation NFT, deposits 5 tokens and delegates to signers[1]
            const tx = await uniqueMultiplierVotingVault.addNftAndDelegate(
                ONE.mul(5),
                1,
                reputationNft.address,
                signers[1].address,
            );
            await tx.wait();

            // confirm the user is no longer holding the erc1155 nft they deposited
            const userNftBal1 = await reputationNft.balanceOf(signers[0].address, 1);
            expect(userNftBal1).to.be.eq(0);

            // confirm the contract now holds the erc1155 nft
            const contractNftBal1 = await reputationNft.balanceOf(uniqueMultiplierVotingVault.address, 1);
            expect(contractNftBal1).to.be.eq(1);

            // get the user's current ERC20 balance
            const userErc20Bal = await token.balanceOf(signers[0].address);

            // user calls withdraw() on THREE tokens / partial deposit amount withdrawal
            await uniqueMultiplierVotingVault.withdraw(ONE.mul(3));

            // confirm the user is now holding the withdrawn ERC20 tokens
            const userErc20BalAfter = await token.balanceOf(signers[0].address);
            expect(userErc20BalAfter).to.be.eq(userErc20Bal.add(ONE.mul(3)));

            // confirm the contract is still the holding the erc1155 nft
            const contractNftBal2 = await reputationNft.balanceOf(uniqueMultiplierVotingVault.address, 1);
            expect(contractNftBal2).to.be.eq(1);
        });

        it("Reverts if a user calls withdraw() an ERC20 amount larger than their 'withdrawable' amount", async () => {
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, setMultipliers } = ctxVault;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A } = await setMultipliers();

            // initialize history for signers[1]
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE.mul(8));
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] registers reputation NFT, deposits EIGHT tokens and delegates to self
            const tx = await (
                await uniqueMultiplierVotingVault
                    .connect(signers[1])
                    .addNftAndDelegate(ONE.mul(8), 1, reputationNft.address, signers[1].address)
            ).wait();

            // signers[0] approves 5 tokens to voting vault and approves reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[0] registers reputation NFT, deposits FIVE tokens and delegates to self
            // this deposit is for padding UMVV's ERC20 balance, so that when signers[1] tries to withdraw
            // an amount larger than their registration withdrawable amount, the txn does not revert with
            // custom error "UMVV_InsufficientBalance"
            await uniqueMultiplierVotingVault.addNftAndDelegate(
                ONE.mul(5),
                1,
                reputationNft.address,
                signers[0].address,
            );

            // get signers 1 voting power amount
            const votingPower = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx.blockNumber,
            );
            expect(votingPower).to.be.eq(ONE.mul(8).mul(MULTIPLIER_A).div(ONE));

            // signers 1 withdraws THREE tokens
            const tx2 = await uniqueMultiplierVotingVault.connect(signers[1]).withdraw(ONE.mul(3));
            const votingPower2 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx2.blockNumber,
            );
            expect(votingPower2).to.be.eq(ONE.mul(5).mul(MULTIPLIER_A).div(ONE));

            // calculate sigerns[1] withdrawable amount
            const withdrawable = votingPower2.div(MULTIPLIER_A);
            expect(withdrawable).to.be.eq(ONE.mul(5).div(ONE));

            // signers 1 tries to withdraw SIX tokens (less than registration amount but larger than
            // registration withdrawable amount)
            const tx3 = uniqueMultiplierVotingVault.connect(signers[1]).withdraw(ONE.mul(6));
            await expect(tx3).to.be.revertedWith(`UMVV_InsufficientWithdrawableBalance(${ONE.mul(5)})`);
        });

        it("Transfers reputation nft back to user when withdrawNft() is called", async () => {
            // invoke the fixture function
            ctxVault = await votingVaultFixture();

            const { uniqueMultiplierVotingVault, signers, token, reputationNft, mintNfts } = ctxVault;

            // mint user some nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await uniqueMultiplierVotingVault.setMultiplier(reputationNft.address, 1, ethers.utils.parseEther("1.2"));

            // signers[0] approves ONE tokens to the voting vault and approves reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[0] registers reputation NFT, deposits tokens and delegates to self
            await uniqueMultiplierVotingVault.addNftAndDelegate(ONE, 1, reputationNft.address, signers[0].address);

            // check that the user balance for reputation nft is now zero
            const userErc1155Bal = await reputationNft.balanceOf(signers[0].address, 1);
            expect(userErc1155Bal).to.be.eq(0);

            // check that the contract is the holder of the reputation nft
            const erc1155Bal = await reputationNft.balanceOf(uniqueMultiplierVotingVault.address, 1);
            expect(erc1155Bal).to.be.eq(1);

            // user withdraws ERC1155
            await uniqueMultiplierVotingVault.withdrawNft();

            // check that the user balance for reputation nft is now one
            const userErc1155Bal2 = await reputationNft.balanceOf(signers[0].address, 1);
            expect(userErc1155Bal2).to.be.eq(1);
        });

        it("Reverts when withdrawNft() is called on an invalid token address", async () => {
            // invoke the fixture function
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, setMultipliers } = ctxVault;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // signers[0] approves 5 tokens and erc1155 nft to voting vault
            await token.approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[0] registration deposits 5 tokens, delegates to signers[1] and deposits NO erc1155 nft
            await uniqueMultiplierVotingVault.addNftAndDelegate(
                ONE.mul(5),
                0,
                constants.AddressZero,
                signers[1].address,
            );

            const tx = uniqueMultiplierVotingVault.withdrawNft();

            await expect(tx).to.be.revertedWith(`UMVV_InvalidNft("${constants.AddressZero}", ${0})`);
        });

        it("Reverts when withdrawNft() is called on an invalid token id", async () => {
            // invoke the fixture function
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, setMultipliers } = ctxVault;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // signers[0] approves 5 tokens and erc1155 nft to voting vault
            await token.approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[0] registration deposits 5 tokens, delegates to signers[1] and deposits NO erc1155 nft
            await uniqueMultiplierVotingVault.addNftAndDelegate(
                ONE.mul(5),
                0,
                reputationNft.address,
                signers[1].address,
            );

            const tx = uniqueMultiplierVotingVault.withdrawNft();
            await expect(tx).to.be.revertedWith(`UMVV_InvalidNft("${reputationNft.address}", ${0})`);
        });

        it("Reverts if withdrawNft() is called and the user has not deposited an ERC1155 nft", async () => {
            const { uniqueMultiplierVotingVault, signers, token } = ctxVault;

            // signers[0] approves 5 tokens to voting vault
            await token.approve(uniqueMultiplierVotingVault.address, ONE);

            // signers[0] registers reputation NFT as address zero, deposits FIVE tokens and delegates to self
            await uniqueMultiplierVotingVault.addNftAndDelegate(
                ONE,
                0,
                ethers.constants.AddressZero,
                signers[0].address,
            );

            // user calls withdraws ERC1155
            const tx = uniqueMultiplierVotingVault.withdrawNft();
            await expect(tx).to.be.revertedWith(`UMVV_InvalidNft("0x0000000000000000000000000000000000000000", 0)`);
        });

        it("Reduces delegatee votingPower if withdrawNft() is called and user tokens are still locked", async () => {
            const { uniqueMultiplierVotingVault, signers, token, reputationNft, mintNfts, setMultipliers } = ctxVault;

            // mint user some nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A } = await setMultipliers();

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
            expect(votingPower).to.be.eq(ONE.mul(6).mul(MULTIPLIER_A).div(ONE));

            // signers[0] withdraws ERC1155
            const tx2 = await uniqueMultiplierVotingVault.withdrawNft();
            await tx2.wait();

            // get delegatee voting power amount
            const votingPowerAfter = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx2.blockNumber,
            );
            // expect only the votinPower amount associated with signers[0] to have the multiplier value eliminated
            // from the delegatee's voting power
            expect(votingPowerAfter).to.be.eq(ONE.mul(MULTIPLIER_A).div(ONE).add(ONE.mul(5)));
        });

        it("User can change their multiplier with updateNft()", async () => {
            const {
                signers,
                token,
                uniqueMultiplierVotingVault,
                reputationNft,
                reputationNft2, // other ERC1155 reputation NFT w/ different multiplier
                mintNfts,
                setMultipliers,
            } = ctxVault;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            const { MULTIPLIER_A, MULTIPLIER_B } = await setMultipliers();

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
            expect(votingPower).to.be.eq(ONE.mul(MULTIPLIER_A).div(ONE));

            // signers[1] approves tokens to voting vault and approves reputation nft
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
            expect(votingPower1).to.be.eq(ONE.mul(5).add(ONE).mul(MULTIPLIER_A).div(ONE));

            // signers[0] approves reputation nft 2 to voting vault
            await reputationNft2.setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[0] updates their reputation nft to reputationNft2 which is associated with MULTIPLIER_B
            const tx2 = await uniqueMultiplierVotingVault.updateNft(1, reputationNft2.address);

            // they are now again holding the first reputation nft which they have replaced
            const userErc1155Bal = await reputationNft.balanceOf(signers[0].address, 1);
            expect(userErc1155Bal).to.be.eq(1);

            // their delegatee voting power is updated based on the mulitplier value of their new ERC1155 nft
            // view query voting power of signers 1
            const votingPower2 = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[1].address,
                tx2.blockNumber,
            );
            expect(votingPower2).to.be.eq(ONE.mul(5).mul(MULTIPLIER_A).add(ONE.mul(MULTIPLIER_B)).div(ONE));
        });

        it("Reverts if user calls updateNft() with invalid token address", async () => {
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, setMultipliers } = ctxVault;

            // mint users some ERC1155 nfts
            await mintNfts();

            await setMultipliers();

            // signers[1] approves ERC20 tokens and reputationNft to voting vault
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] deposits ERC20 tokens, reputationNft and delegates to signers[3]
            await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[3].address);

            // signers[1] tries to update ERC1155 in their registration using zero token address and zero token id
            const tx = uniqueMultiplierVotingVault.connect(signers[1]).updateNft(0, constants.AddressZero);
            await expect(tx).to.be.revertedWith(`UMVV_InvalidNft("0x0000000000000000000000000000000000000000", 0)`);
        });

        it("Reverts if user calls updateNft() with invalid token id", async () => {
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, setMultipliers } = ctxVault;

            // mint users some ERC1155 nfts
            await mintNfts();

            await setMultipliers();

            // signers[1] approves ERC20 tokens and reputationNft to voting vault
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] deposits ERC20 tokens, reputationNft and delegates to signers[3]
            await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[3].address);

            // signers[1] tries to update ERC1155 in their registration using zero token address and zero token id
            const tx = uniqueMultiplierVotingVault.connect(signers[1]).updateNft(0, reputationNft.address);
            await expect(tx).to.be.revertedWith(`UMVV_InvalidNft("${reputationNft.address}", 0)`);
        });

        it("Reverts if user calls updateNft() with ERC1155 token they do not own", async () => {
            const {
                signers,
                token,
                uniqueMultiplierVotingVault,
                reputationNft,
                reputationNft2,
                mintNfts,
                setMultipliers,
            } = ctxVault;

            // mint users some ERC1155 nfts
            await mintNfts();

            await setMultipliers();

            // signers[1] approves ERC1155 to signers[0]
            await reputationNft.connect(signers[1]).setApprovalForAll(signers[0].address, true);

            // signers[1] transfers their reputationNft ERC1155 id 1 to signers[0]
            await reputationNft
                .connect(signers[1])
                .safeTransferFrom(signers[1].address, signers[0].address, 1, 1, "0x");

            // confirm that signers[1] no longer owns any reputationNft ERC1155 id 1
            const userBal = await reputationNft.balanceOf(signers[1].address, 1);
            expect(userBal).to.be.eq(0);

            // signers[1] approves ERC20 tokens and reputationNft2 to voting vault
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft2.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] deposits ERC20 tokens, reputationNft2 and delegates to signers[3]
            await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft2.address, signers[3].address);

            // signers[1] tries to update ERC1155 in their registration, replacing reputationNft2 by reputationNft
            const tx = uniqueMultiplierVotingVault.connect(signers[1]).updateNft(1, reputationNft.address);
            await expect(tx).to.be.revertedWith("UMVV_DoesNotOwn");
        });

        it("Returns ZERO when _getWithdrawableAmount() is triggered for a non-registration", async () => {
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, setMultipliers } = ctxVault;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // signers[0] approves 5 tokens to voting vault and approves reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[0] registers reputation NFT, deposits FIVE tokens and delegates to self
            // this deposit is for padding UMVV's ERC20 balance, so that when signers[1] tries to withdraw
            // an amount larger than their registration withdrawable amount, the txn does not revert with
            // custom error "UMVV_InsufficientBalance"
            await uniqueMultiplierVotingVault.addNftAndDelegate(
                ONE.mul(5),
                1,
                reputationNft.address,
                signers[0].address,
            );

            // signers[1] tries to withdraw ONE tokens
            const tx = uniqueMultiplierVotingVault.connect(signers[1]).withdraw(ONE);
            await expect(tx).to.be.revertedWith("UMVV_InsufficientWithdrawableBalance(0)");
        });

        it("Returns ZERO when _getWithdrawableAmount() is triggered where a user's registration withdrawable amount would be overdrawn", async () => {
            const { signers, token, uniqueMultiplierVotingVault, reputationNft, mintNfts, setMultipliers } = ctxVault;

            // mint users some reputation nfts
            await mintNfts();

            // manager sets the value of the reputation NFT multiplier
            await setMultipliers();

            // signers[0] approves 5 tokens to voting vault and approves reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE.mul(5));
            await reputationNft.setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[0] registers reputation NFT, deposits FIVE tokens and delegates to self
            // this deposit is for padding UMVV's ERC20 balance, so that when signers[1] tries to withdraw
            // an amount larger than their registration withdrawable amount, the txn does not revert with
            // custom error "UMVV_InsufficientBalance"
            await uniqueMultiplierVotingVault.addNftAndDelegate(
                ONE.mul(5),
                1,
                reputationNft.address,
                signers[0].address,
            );

            // initialize history for signers[1]
            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE.mul(10));
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            // signers[1] registers reputation NFT, deposits ONE tokens and delegates to self
            await uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE.mul(10), 1, reputationNft.address, signers[1].address);

            // signers[1] withdraws all of their deposited tokens
            await uniqueMultiplierVotingVault.connect(signers[1]).withdraw(ONE.mul(10));

            // signers[1] tries to withdraws another token
            const tx = uniqueMultiplierVotingVault.connect(signers[1]).withdraw(ONE.mul(2));
            await expect(tx).to.be.revertedWith("UMVV_InsufficientWithdrawableBalance(0)");
        });

        it("should fail to initialize if already initialized", async () => {
            const { signers, uniqueMultiplierVotingVault } = ctxVault;

            // call initialize again after initiliation has already run after deployment
            const tx = uniqueMultiplierVotingVault.initialize(signers[0].address, signers[0].address);
            await expect(tx).to.be.revertedWith("UMVV_AlreadyInitialized");
        });
    });

    describe("Multiplier functionality", async () => {
        it("Sets the multiplier value", async () => {
            const { signers, uniqueMultiplierVotingVault, reputationNft } = ctxVault;

            // manager updates the value of the ERC1155 token multiplier
            await uniqueMultiplierVotingVault
                .connect(signers[0])
                .setMultiplier(reputationNft.address, 1, ethers.utils.parseEther("1.2"));

            // get new multiplier value
            const multiplierVal = await uniqueMultiplierVotingVault.getMultiplier(reputationNft.address, 1);
            await expect(multiplierVal).to.eq(ethers.utils.parseEther("1.2"));
        });

        it("Reverts if setMultiplier() is called with a value higher than multiplier limit", async () => {
            const { signers, uniqueMultiplierVotingVault, reputationNft } = ctxVault;

            // manager tries to update the value of the ERC1155 token multiplier w/ value higher than limit
            const tx = uniqueMultiplierVotingVault
                .connect(signers[0])
                .setMultiplier(reputationNft.address, 1, ethers.utils.parseEther("1.8"));

            await expect(tx).to.be.revertedWith("UMVV_MultiplierLimit()");
        });

        it("Sets a multiplier for each different tokenId of the same ERC1155 token address", async () => {
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
            const { signers, uniqueMultiplierVotingVault, reputationNft } = ctxVault;

            // non-manager account to try to update the value of the token address multiplier
            const tx = uniqueMultiplierVotingVault
                .connect(signers[2])
                .setMultiplier(reputationNft.address, 1, ethers.utils.parseEther("1.2"));
            await expect(tx).to.be.revertedWith("!manager");
        });

        it("Only timelock can set a new manager", async () => {
            const { signers, uniqueMultiplierVotingVault } = ctxVault;

            // timelock sets a new manager
            const tx = await uniqueMultiplierVotingVault.connect(signers[0]).setManager(signers[5].address);
            tx.wait();

            await expect(await uniqueMultiplierVotingVault.manager()).to.be.eq(signers[5].address);
        });

        it("Correctly updates the value of multiplier", async () => {
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

        it("Returns ZERO if getMultiplier() is called on a token that does not have a multiplier", async () => {
            const { uniqueMultiplierVotingVault, reputationNft } = ctxVault;

            // no multiplier has been set for reputationNft.address
            // get reputationNft.address multiplier
            const multiplier = await uniqueMultiplierVotingVault.getMultiplier(reputationNft.address, 1);
            await expect(multiplier).to.eq(0);
        });

        it("Reverts if addNftAndDelegate() is called with a token that does not have a multiplier", async () => {
            const { signers, uniqueMultiplierVotingVault, reputationNft, token, mintNfts } = ctxVault;

            // mint nft for user
            await mintNfts();

            // no multiplier has been set for reputationNft.address

            await token.connect(signers[1]).approve(uniqueMultiplierVotingVault.address, ONE);
            await reputationNft.connect(signers[1]).setApprovalForAll(uniqueMultiplierVotingVault.address, true);

            const tx = uniqueMultiplierVotingVault
                .connect(signers[1])
                .addNftAndDelegate(ONE, 1, reputationNft.address, signers[0].address);
            await expect(tx).to.be.revertedWith("UMVV_NoMultiplierSet");
        });

        it("Multiplier value returns ONE when addNftAndDelegate() is called with ERC1155 token address == 0", async () => {
            const { uniqueMultiplierVotingVault, signers, token } = ctxVault;

            // signers[0] approves 5 tokens to unique multiplier voting vault and approves reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE.mul(5));

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
            const multiplier = await uniqueMultiplierVotingVault.getMultiplier(constants.AddressZero, 1);
            await expect(multiplier).to.eq(ethers.utils.parseEther("1"));
            expect(votingPower).to.be.eq(ONE.mul(5).mul(multiplier).div(ONE));
        });

        it("Multiplier value returns ONE when addNftAndDelegate() is called with ERC1155 token id == 0", async () => {
            const { uniqueMultiplierVotingVault, signers, reputationNft, token } = ctxVault;

            // signers[0] approves 5 tokens to unique multiplier voting vault and approves reputation nft
            await token.approve(uniqueMultiplierVotingVault.address, ONE.mul(5));

            // signers[0] registers reputation NFT as address zero, deposits FIVE tokens and delegates to self
            const tx = await uniqueMultiplierVotingVault.addNftAndDelegate(
                ONE.mul(5),
                0,
                reputationNft.address,
                signers[0].address,
            );

            // get total voting power amount
            const votingPower = await uniqueMultiplierVotingVault.queryVotePowerView(
                signers[0].address,
                tx.blockNumber,
            );

            // get the current multiplier
            const multiplier = await uniqueMultiplierVotingVault.getMultiplier(reputationNft.address, 0);
            await expect(multiplier).to.eq(ethers.utils.parseEther("1"));
            expect(votingPower).to.be.eq(ONE.mul(5).mul(multiplier).div(ONE));
        });
    });
});