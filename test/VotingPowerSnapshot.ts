import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { TestContextCouncil, councilFixture } from "./utils/councilFixture";

const { loadFixture, provider } = waffle;

/**
 * Executes a vote on the council governance framework which looks at a specific
 * block number and uses the voting power snapshot at that block to determine the
 * outcome of the vote.
 */
describe("Council Vote counting", function () {
    let ctxCouncil: TestContextCouncil;

    const ONE = ethers.utils.parseEther("1");
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    before(async function () {
        ctxCouncil = await loadFixture(councilFixture);
    });

    describe("Verify voting power", async () => {
        it("User cannot obtain more voting power after proposal is created", async () => {
            const { signers, coreVoting, lockingVault, increaseBlockNumber, getBlock } = ctxCouncil;

            // delegate voting power to the proposer (min 3 to create a proposal) (allowance set in fixture)
            await lockingVault.connect(signers[0]).deposit(signers[0].address, ONE.mul(3), signers[0].address);
            // delegate voting power to signers[1] (other)
            await lockingVault.connect(signers[1]).deposit(signers[1].address, ONE, signers[1].address);

            // get signers[1] voting power before creating a proposal
            let currentBlock = await getBlock(); // block 50
            const votingPowerBefore = await lockingVault.queryVotePowerView(signers[1].address, currentBlock);
            expect(votingPowerBefore).to.be.eq(ONE);

            await increaseBlockNumber(provider, 10); // block 60 (past stale period)

            // create a proposal with signers[0]
            await coreVoting
                .connect(signers[0])
                .proposal([lockingVault.address], zeroExtraData, [lockingVault.address], ["0x"], MAX, 0);

            // signers[1] votes, voting power is returned in tx
            const _votingPowerBeforeBuy = await coreVoting
                .connect(signers[1])
                .callStatic.vote([lockingVault.address], ["0x"], 0, 0);
            expect(_votingPowerBeforeBuy).to.be.eq(ONE);

            // delegate more tokens to signer 1 after proposal is created
            await lockingVault.connect(signers[1]).deposit(signers[1].address, ONE, signers[1].address);

            // get signers[1] voting power after depositing more tokens after proposal is created
            const _votingPowerAfterBuy = await coreVoting
                .connect(signers[1])
                .callStatic.vote([lockingVault.address], ["0x"], 0, 0);
            // voting power should be the same as before
            expect(_votingPowerAfterBuy).to.be.eq(ONE);

            // get signers[1] voting power after depositing more tokens but read from the current block
            currentBlock = await getBlock(); // block 62
            const votingPowerAfter = await lockingVault.queryVotePowerView(signers[1].address, currentBlock);
            expect(votingPowerAfter).to.be.eq(ONE.mul(2));
        });
    });
});
