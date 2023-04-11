import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { TestContextVotingVault, votingVaultFixture } from "./utils/votingVaultFixture";

const { provider } = waffle;

describe("Vote Execution with Locking Voting Vault", async () => {
    let ctxVotingVault: TestContextVotingVault;

    const ONE = ethers.utils.parseEther("1");
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    beforeEach(async function () {
        ctxVotingVault = await votingVaultFixture();
    });

    describe("Governance flow with locking vault", async () => {
        it("Executes V2 OriginationFee update with a vote: YES", async () => {
            const { signers, coreVoting, lockingVault, increaseBlockNumber, feeController } = ctxVotingVault;

            // LockingVault users deposits and delegation
            // query voting power to initialize history for every governance participant
            const tx = await (await lockingVault.deposit(signers[2].address, ONE.mul(3), signers[0].address)).wait();
            // view query voting power of signer 0
            const votingPower = await lockingVault.queryVotePowerView(signers[0].address, tx.blockNumber);
            expect(votingPower).to.be.eq(ONE.mul(3));

            const tx2 = await (await lockingVault.deposit(signers[1].address, ONE.mul(3), signers[2].address)).wait();
            // view query voting power of signer 2
            const votingPower2 = await lockingVault.queryVotePowerView(signers[2].address, tx2.blockNumber);
            expect(votingPower2).to.be.eq(ONE.mul(3));

            const tx3 = await (await lockingVault.deposit(signers[4].address, ONE, signers[1].address)).wait();
            // view query voting power of signer 1
            const votingPower3 = await lockingVault.queryVotePowerView(signers[1].address, tx3.blockNumber);
            expect(votingPower3).to.be.eq(ONE);

            // proposal creation to update originationFee in FeeController
            // check current originationFee value
            const currentOgFee = (await feeController.getOriginationFee()).toString();

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
                .proposal([lockingVault.address], zeroExtraData, targetAddress, [feeContCalldata], MAX, 0);

            // pass proposal with YES majority
            await coreVoting.connect(signers[2]).vote([lockingVault.address], zeroExtraData, 0, 0); // yes vote

            await coreVoting.connect(signers[1]).vote([lockingVault.address], zeroExtraData, 0, 1); // no vote

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
