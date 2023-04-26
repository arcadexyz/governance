import { expect } from "chai";
import { constants } from "ethers";
import { ethers, waffle } from "hardhat";

import { TestContextVotingVault, votingVaultFixture } from "./utils/votingVaultFixture";

const { provider } = waffle;

describe("Vote Execution with Arcade GSC Voting Vault", async () => {
    let ctxVotingVault: TestContextVotingVault;

    const ONE = ethers.utils.parseEther("1");
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    beforeEach(async function () {
        ctxVotingVault = await votingVaultFixture();
    });

    describe("Governance flow with Arcade gsc voting vault", async () => {
        it("Executes proposal to pause V2 Promissory Notes transfers with an Arcade GSC vote: YES", async () => {
            const {
                signers,
                arcadeGSCCoreVoting,
                arcadeGSCVotingVault,
                uniqueMultiplierVotingVault,
                increaseBlockNumber,
                promissoryNote,
                token,
                advanceTime,
                timelock,
            } = ctxVotingVault;

            // using signers[0, 1, 2, 3] as GSC members
            // UniqueMultiplierVotingVault users delegate to members who will become GSC:
            // signers[5] deposits tokens and delegates to signers[1]
            await token.connect(signers[5]).approve(uniqueMultiplierVotingVault.address, ONE.mul(50));
            await uniqueMultiplierVotingVault
                .connect(signers[5])
                .addNftAndDelegate(ONE.mul(50), 0, constants.AddressZero, signers[1].address);

            // signers[6] deposits tokens and delegates to signers[2]
            await token.connect(signers[6]).approve(uniqueMultiplierVotingVault.address, ONE.mul(50));
            await uniqueMultiplierVotingVault
                .connect(signers[6])
                .addNftAndDelegate(ONE.mul(50), 0, constants.AddressZero, signers[2].address);

            // signers[7] deposits tokens and delegates to signers[3]
            await token.connect(signers[7]).approve(uniqueMultiplierVotingVault.address, ONE.mul(50));
            await uniqueMultiplierVotingVault
                .connect(signers[7])
                .addNftAndDelegate(ONE.mul(50), 0, constants.AddressZero, signers[3].address);

            // signers[8] deposits tokens and delegates to signers[0]
            await token.connect(signers[8]).approve(uniqueMultiplierVotingVault.address, ONE.mul(50));
            await uniqueMultiplierVotingVault
                .connect(signers[8])
                .addNftAndDelegate(ONE.mul(50), 0, constants.AddressZero, signers[0].address);

            // check that each of signers[0, 1, 2, 3] meets the GSC membership requirements
            await arcadeGSCVotingVault
                .connect(signers[0])
                .proveMembership([uniqueMultiplierVotingVault.address], zeroExtraData);
            await arcadeGSCVotingVault
                .connect(signers[1])
                .proveMembership([uniqueMultiplierVotingVault.address], zeroExtraData);
            await arcadeGSCVotingVault
                .connect(signers[2])
                .proveMembership([uniqueMultiplierVotingVault.address], zeroExtraData);
            await arcadeGSCVotingVault
                .connect(signers[3])
                .proveMembership([uniqueMultiplierVotingVault.address], zeroExtraData);

            // fast forward 4 days to complete new member idle wait time
            await advanceTime(provider, 345600);

            // query voting power of every GSC governance participants. Each should have one vote
            // view query voting power of signers[1]
            const votingPower = await arcadeGSCVotingVault.queryVotePower(signers[1].address, 20, "0x");
            expect(votingPower).to.be.eq(ONE.div(ONE));

            // view query voting power of signers[2]
            const votingPower2 = await arcadeGSCVotingVault.queryVotePower(signers[2].address, 20, "0x");
            expect(votingPower2).to.be.eq(ONE.div(ONE));

            // view query voting power of signers[3]
            const votingPower3 = await arcadeGSCVotingVault.queryVotePower(signers[3].address, 20, "0x");
            expect(votingPower3).to.be.eq(ONE.div(ONE));

            // view query voting power of signers[0]
            const votingPower4 = await arcadeGSCVotingVault.queryVotePower(signers[0].address, 20, "0x");
            expect(votingPower4).to.be.eq(ONE.div(ONE));

            // view query voting power of the timelock contract who is the owner of this voting vault
            // owner automatically gets 100K voting power on the GSC
            const votingPower5 = await arcadeGSCVotingVault.queryVotePower(timelock.address, 20, "0x");
            expect(votingPower5).to.be.eq(ONE.mul(100000).div(ONE));

            // proposal creation code for setting V2 promissoryNote contract to paused()
            const targetAddress = [promissoryNote.address];
            // create an interface to access promissoryNote abi
            const pNfactory = await ethers.getContractFactory("PromissoryNote");
            // encode function signature and data to pass in proposal execution if majority votes YES
            const pNoteCalldata = pNfactory.interface.encodeFunctionData("setPaused", [true]);

            // any GSC member creates the proposal with a YES ballot
            await arcadeGSCCoreVoting
                .connect(signers[1])
                .proposal([arcadeGSCVotingVault.address], zeroExtraData, targetAddress, [pNoteCalldata], MAX, 0);

            // pass proposal with YES majority
            await arcadeGSCCoreVoting.connect(signers[0]).vote([arcadeGSCVotingVault.address], zeroExtraData, 0, 0); // yes vote
            await arcadeGSCCoreVoting.connect(signers[1]).vote([arcadeGSCVotingVault.address], zeroExtraData, 0, 0); // yes vote
            await arcadeGSCCoreVoting.connect(signers[2]).vote([arcadeGSCVotingVault.address], zeroExtraData, 0, 0); // yes vote

            //increase blockNumber to exceed 3 day default lock duration set in gscCoreVoting
            await increaseBlockNumber(provider, 19488);

            // execute proposal
            await arcadeGSCCoreVoting.connect(signers[1]).execute(0, targetAddress, [pNoteCalldata]);
            // confirm with view function paused() that it is indeed paused
            expect(await promissoryNote.paused()).to.eq(true);
        });
    });
});
