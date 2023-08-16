import { mine } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { constants } from "ethers";
import { ethers, waffle } from "hardhat";

import { TestContextGovernance, governanceFixture } from "./utils/governanceFixture";
import { TestContextToken, tokenFixture } from "./utils/tokenFixture";

const { provider, loadFixture } = waffle;

describe("Vote Execution with Arcade GSC Vault", async () => {
    let ctxToken: TestContextToken;
    let ctxGovernance: TestContextGovernance;
    let fixtureToken: () => Promise<TestContextToken>;
    let fixtureGov: () => Promise<TestContextGovernance>;

    const ONE = ethers.utils.parseEther("1");
    const MAX = ethers.constants.MaxUint256;
    const zeroExtraData = ["0x", "0x", "0x", "0x"];

    beforeEach(async function () {
        fixtureToken = await tokenFixture();
        ctxToken = await loadFixture(fixtureToken);

        fixtureGov = await governanceFixture(ctxToken.arcdToken);
        ctxGovernance = await loadFixture(fixtureGov);
    });

    describe("Governance flow with Arcade gsc vault", async () => {
        it("Executes proposal to pause V2 Promissory Notes transfers with an Arcade GSC vote: YES", async () => {
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const {
                signers,
                arcadeGSCCoreVoting,
                arcadeGSCVault,
                nftBoostVault,
                increaseBlockNumber,
                promissoryNote,
                timelock,
                blockchainTime,
            } = ctxGovernance;

            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toTeamVesting(signers[0].address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, signers[0].address, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdToken.balanceOf(signers[0].address)).to.equal(teamVestingAmount);
            // distribute to other users
            for (let i = 5; i < 9; i++) {
                await arcdToken.connect(signers[0]).transfer(signers[i].address, ONE.mul(50));
            }

            // using signers[0, 1, 2, 3] as GSC members
            // NFTBoostVault users delegate to members who will become GSC:
            // signers[5] deposits tokens and delegates to signers[1]
            await arcdToken.connect(signers[5]).approve(nftBoostVault.address, ONE.mul(50));
            await nftBoostVault
                .connect(signers[5])
                .addNftAndDelegate(ONE.mul(50), 0, constants.AddressZero, signers[1].address);

            // signers[6] deposits tokens and delegates to signers[2]
            await arcdToken.connect(signers[6]).approve(nftBoostVault.address, ONE.mul(50));
            await nftBoostVault
                .connect(signers[6])
                .addNftAndDelegate(ONE.mul(50), 0, constants.AddressZero, signers[2].address);

            // signers[7] deposits tokens and delegates to signers[3]
            await arcdToken.connect(signers[7]).approve(nftBoostVault.address, ONE.mul(50));
            await nftBoostVault
                .connect(signers[7])
                .addNftAndDelegate(ONE.mul(50), 0, constants.AddressZero, signers[3].address);

            // signers[8] deposits tokens and delegates to signers[0]
            await arcdToken.connect(signers[8]).approve(nftBoostVault.address, ONE.mul(50));
            await nftBoostVault
                .connect(signers[8])
                .addNftAndDelegate(ONE.mul(50), 0, constants.AddressZero, signers[0].address);

            // check that each of signers[0, 1, 2, 3] meets the GSC membership requirements
            await arcadeGSCVault.connect(signers[0]).proveMembership([nftBoostVault.address], zeroExtraData);
            await arcadeGSCVault.connect(signers[1]).proveMembership([nftBoostVault.address], zeroExtraData);
            await arcadeGSCVault.connect(signers[2]).proveMembership([nftBoostVault.address], zeroExtraData);
            await arcadeGSCVault.connect(signers[3]).proveMembership([nftBoostVault.address], zeroExtraData);

            // fast forward 4 days to complete new member idle wait time
            await blockchainTime.increaseTime(3600 * 24 * 4);

            // query voting power of every GSC governance participants. Each should have one vote
            // view query voting power of signers[1]
            const votingPower = await arcadeGSCVault.queryVotePower(signers[1].address, 20, "0x");
            expect(votingPower).to.be.eq(ONE.div(ONE));

            // view query voting power of signers[2]
            const votingPower2 = await arcadeGSCVault.queryVotePower(signers[2].address, 20, "0x");
            expect(votingPower2).to.be.eq(ONE.div(ONE));

            // view query voting power of signers[3]
            const votingPower3 = await arcadeGSCVault.queryVotePower(signers[3].address, 20, "0x");
            expect(votingPower3).to.be.eq(ONE.div(ONE));

            // view query voting power of signers[0]
            const votingPower4 = await arcadeGSCVault.queryVotePower(signers[0].address, 20, "0x");
            expect(votingPower4).to.be.eq(ONE.div(ONE));

            // view query voting power of the timelock contract who is the owner of this voting vault
            // owner automatically gets 100K voting power on the GSC
            const votingPower5 = await arcadeGSCVault.queryVotePower(timelock.address, 20, "0x");
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
                .proposal([arcadeGSCVault.address], zeroExtraData, targetAddress, [pNoteCalldata], MAX, 0);

            // pass proposal with YES majority
            await arcadeGSCCoreVoting.connect(signers[0]).vote([arcadeGSCVault.address], zeroExtraData, 0, 0); // yes vote
            await arcadeGSCCoreVoting.connect(signers[1]).vote([arcadeGSCVault.address], zeroExtraData, 0, 0); // yes vote
            await arcadeGSCCoreVoting.connect(signers[2]).vote([arcadeGSCVault.address], zeroExtraData, 0, 0); // yes vote

            //increase blockNumber to exceed 3 day default lock duration set in gscCoreVoting
            await increaseBlockNumber(provider, 19488);

            // execute proposal
            await arcadeGSCCoreVoting.connect(signers[1]).execute(0, targetAddress, [pNoteCalldata]);
            // confirm with view function paused() that it is indeed paused
            expect(await promissoryNote.paused()).to.eq(true);
        });
    });

    describe("Unkickable from GSC vault", async () => {
        it("Unkickable from GSC vault", async () => {
            const signers = await ethers.getSigners();
            const owner = signers[0];
            const Alice = signers[1];
            const Bob = signers[2];

            // balance of each user in TestERC20 custom token
            const ALICES_BALANCE = ethers.utils.parseEther("1000000000");
            const BOBS_BALANCE = ethers.utils.parseEther("100"); // enough to join GSC

            const TestERC20Factory = await ethers.getContractFactory("MockERC20");
            const TestERC20 = await TestERC20Factory.deploy();

            // mine some block in the future to resemble mainnet state
            await mine(1_000_000);

            // deploy NFTBoostVault with custom token (TestERC20) - we only need this token to provide some
            // balance to users so that they can stake their tokens in the vault
            const NFTBoostVaultFactory = await ethers.getContractFactory("UnlockedBoostVault");
            const NFTBoostVault = await NFTBoostVaultFactory.deploy(
                TestERC20.address,
                10,
                owner.address,
                owner.address,
            );

            // deploy a CoreVoting contract with a single vault (NFTBoostVault) and set owner
            const CoreVotingFactory = await ethers.getContractFactory("CoreVoting");
            const coreVoting = await CoreVotingFactory.deploy(
                owner.address,
                ethers.utils.parseEther("7"),
                ethers.utils.parseEther("3"),
                ethers.constants.AddressZero,
                [NFTBoostVault.address],
            );
            await coreVoting.deployed();

            await coreVoting.connect(owner).setOwner(owner.address);
            await coreVoting.connect(owner).changeVaultStatus(NFTBoostVault.address, true);

            // deploy ArcadeGSCCoreVoting with a single vault (NFTBoostVault) and set owner
            const ArcadeGSCVaultFactory = await ethers.getContractFactory("ArcadeGSCVault");
            const arcadeGSCVault = await ArcadeGSCVaultFactory.deploy(coreVoting.address, 50, owner.address);

            // mint TestERC20 to users so that they can stake them
            await TestERC20.connect(Alice).mint(Alice.address, ALICES_BALANCE);
            await TestERC20.connect(Bob).mint(Bob.address, BOBS_BALANCE);

            // everyone approves TestERC20, so that they can stake
            await TestERC20.connect(Alice).approve(NFTBoostVault.address, ALICES_BALANCE);
            await TestERC20.connect(Bob).approve(NFTBoostVault.address, BOBS_BALANCE);

            // Alice and Bob add some tokens and delegate
            await NFTBoostVault.connect(Alice).addNftAndDelegate(
                ALICES_BALANCE,
                0,
                constants.AddressZero,
                Alice.address,
            );
            await NFTBoostVault.connect(Bob).addNftAndDelegate(BOBS_BALANCE, 0, constants.AddressZero, Bob.address);

            // Alice becomes GSC member since she has enough voting power
            expect(await arcadeGSCVault.members(Alice.address)).to.eq(0);
            await arcadeGSCVault.connect(Alice).proveMembership([NFTBoostVault.address], ["0x"]);
            expect(await arcadeGSCVault.members(Alice.address)).not.to.eq(0);

            // Bob also becomes GSC member, but when he unstakes his tokens, Alice can kick him out
            await arcadeGSCVault.connect(Bob).proveMembership([NFTBoostVault.address], ["0x"]);
            expect(await arcadeGSCVault.members(Bob.address)).not.to.eq(0);

            await NFTBoostVault.connect(Bob).withdraw(BOBS_BALANCE);
            await arcadeGSCVault.connect(Alice).kick(Bob.address, ["0x"]);
            expect(await arcadeGSCVault.members(Bob.address)).to.eq(0);
            // kicking out Bob succeeds

            // Bob adds tokens again and becomes GSC member, but this time performs the attack
            await TestERC20.connect(Bob).approve(NFTBoostVault.address, BOBS_BALANCE);
            await NFTBoostVault.connect(Bob).addNftAndDelegate(BOBS_BALANCE, 0, constants.AddressZero, Bob.address);
            await arcadeGSCVault.connect(Bob).proveMembership([NFTBoostVault.address], ["0x"]);

            // attack
            // Bob performs it on himself
            let gasUsed = 0;
            for (let i = 0; i < 3500; i++) {
                const tx1 = await NFTBoostVault.connect(Bob).delegate(Alice.address);
                // needed since it's
                // impossible to change current delegatee to the same address
                const tx2 = await NFTBoostVault.connect(Bob).delegate(Bob.address);
                const r1 = await tx1.wait();
                const r2 = await tx2.wait();
                gasUsed += r1.cumulativeGasUsed.toNumber();
                gasUsed += r2.cumulativeGasUsed.toNumber();
            }
            console.log(`Gas used by the attacker: ${gasUsed}`);

            // Bob withdraws his tokens
            await NFTBoostVault.connect(Bob).withdraw(BOBS_BALANCE);

            // Alice cannot kick out Bob
            const tx = arcadeGSCVault.connect(Alice).kick(Bob.address, ["0x"]);
            await expect(await tx).to.emit(arcadeGSCVault, "Kicked");

            // Bob is still GSC member; he can now transfer all his tokens to another account and perform
            // the attack again until he controls > 50% of GSC
            expect(await arcadeGSCVault.members(Bob.address)).to.eq(0);
        }).timeout(500000);
    });
});
