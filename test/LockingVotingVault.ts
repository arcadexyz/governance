import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { TokenTestContext, tokenFixture } from "./utils/tokenFixture";
import { TestContextVotingVault, votingVaultFixture } from "./utils/votingVaultFixture";

const { provider } = waffle;

describe("Governance Operations with Locking Voting Vault", async () => {
    let ctxToken: TokenTestContext;
    let ctxVotingVault: TestContextVotingVault;

    const ONE = ethers.utils.parseEther("1");
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    beforeEach(async function () {
        ctxToken = await tokenFixture();
        const { arcdToken, arcdDst, deployer } = ctxToken;
        ctxVotingVault = await votingVaultFixture(arcdToken);
        const { signers, lockingVotingVault } = ctxVotingVault;

        // distribute tokens to signers[0]/ deployer for testing
        await arcdDst.connect(deployer).setToken(arcdToken.address);
        expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);
        // mint tokens take tokens from the distributor for use in tests
        await expect(await arcdDst.connect(deployer).toPartnerVesting(signers[0].address))
            .to.emit(arcdDst, "Distribute")
            .withArgs(arcdToken.address, signers[0].address, ethers.utils.parseEther("32700000"));
        expect(await arcdDst.vestingPartnerSent()).to.be.true;

        // transfer tokens to signers and approve locking vault to spend
        for (let i = 0; i < signers.length; i++) {
            await arcdToken.connect(signers[0]).transfer(signers[i].address, ONE.mul(100));
            await arcdToken.connect(signers[i]).approve(lockingVotingVault.address, MAX);
        }
    });

    describe("Locking voting vault", async () => {
        it("Executes V2 OriginationFee update with a vote: YES", async () => {
            const { signers, coreVoting, lockingVotingVault, increaseBlockNumber, feeController } = ctxVotingVault;

            // LockingVotingVault users deposits and delegation
            // query voting power to initialize history for every governance participant
            const tx = await (
                await lockingVotingVault.deposit(signers[2].address, ONE.mul(3), signers[0].address)
            ).wait();
            // view query voting power of signer 0
            const votingPower = await lockingVotingVault.queryVotePowerView(signers[0].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(3));

            const tx2 = await (
                await lockingVotingVault.deposit(signers[1].address, ONE.mul(3), signers[2].address)
            ).wait();
            // view query voting power of signer 2
            const votingPower2 = await lockingVotingVault.queryVotePowerView(signers[2].address, tx2.blockNumber);
            expect(votingPower2).to.be.eq(ONE.mul(3));

            const tx3 = await (await lockingVotingVault.deposit(signers[4].address, ONE, signers[1].address)).wait();
            // view query voting power of signer 1
            const votingPower3 = await lockingVotingVault.queryVotePowerView(signers[1].address, tx3.blockNumber);
            expect(votingPower3).to.be.eq(ONE);

            // proposal creation to update originationFee in FeeController
            const newFee = 55;
            const targetAddress = [feeController.address];
            // create an interface to access feeController abi
            const fcFactory = await ethers.getContractFactory("FeeController");
            // encode function signature and new fee amount to pass in proposal execution if majority votes YES
            const feeContCalldata = fcFactory.interface.encodeFunctionData("setOriginationFee", [newFee]);

            // a signer that holds enough voting power for proposal creation, creates the proposal
            // with a YES ballot
            await coreVoting
                .connect(signers[0])
                .proposal([lockingVotingVault.address], zeroExtraData, targetAddress, [feeContCalldata], MAX, 0);

            // pass proposal with YES majority
            await coreVoting.connect(signers[2]).vote([lockingVotingVault.address], zeroExtraData, 0, 0); // yes vote

            await coreVoting.connect(signers[1]).vote([lockingVotingVault.address], zeroExtraData, 0, 1); // no vote

            //increase blockNumber to exceed 3 day default lock duration set in coreVoting
            await increaseBlockNumber(provider, 19488);

            // proposal execution
            await coreVoting.connect(signers[0]).execute(0, targetAddress, [feeContCalldata]);
            const originationFee = await feeController.getOriginationFee();
            expect(originationFee).to.equal(newFee);
        });
    });
});
