import { expect } from "chai";
import { ethers } from "hardhat";

import { TestContextGovernance, governanceFixture } from "./utils/governanceFixture";
import { TestContextToken, tokenFixture } from "./utils/tokenFixture";

const { provider } = waffle;

/**
 * Test suite for the Arcade vesting contracts.
 */
describe.only("Vesting voting vault", function () {
    let ctxToken: TestContextToken;
    let ctxGovernance: TestContextGovernance;

    beforeEach(async function () {
        ctxToken = await tokenFixture();
        ctxGovernance = await governanceFixture(ctxToken.arcdToken);
    });

    describe("Manager only functions", function () {
        it("check manager address", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const MANAGER_ADDRESS = signers[1].address;

            expect(await vestingVotingVault.manager()).to.equal(MANAGER_ADDRESS);
        });

        it("manager cannot set new manager", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const OTHER_ADDRESS = signers[0].address;
            const MANAGER = signers[1];

            await expect(vestingVotingVault.connect(MANAGER).setManager(OTHER_ADDRESS)).to.be.revertedWith(
                "AVV_NotTimelock()",
            );
        });

        it("manager cannot set new timelock", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const OTHER_ADDRESS = signers[0].address;
            const MANAGER = signers[1];

            await expect(vestingVotingVault.connect(MANAGER).setTimelock(OTHER_ADDRESS)).to.be.revertedWith(
                "AVV_NotTimelock()",
            );
        });

        it("current timelock sets new manager and timelock accounts", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const OTHER_ADDRESS = signers[0].address;
            const TIMELOCK = signers[2];

            await vestingVotingVault.connect(TIMELOCK).setManager(OTHER_ADDRESS);
            expect(await vestingVotingVault.manager()).to.equal(OTHER_ADDRESS);
            await vestingVotingVault.connect(TIMELOCK).setTimelock(OTHER_ADDRESS);
            expect(await vestingVotingVault.timelock()).to.equal(OTHER_ADDRESS);
        });

        it("non-manager tries to deposit and withdraws tokens from the vv", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // transfer tokens to non-manager account for test
            await arcdToken.connect(MANAGER).transfer(OTHER_ADDRESS, ethers.utils.parseEther("100"));
            // non-manager (other) account tries to deposit
            await arcdToken.connect(OTHER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await expect(vestingVotingVault.connect(OTHER).deposit(ethers.utils.parseEther("100"))).to.be.revertedWith(
                "AVV_NotManager()",
            );
            // real manager deposits tokens into vesting vault
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // non-manager (other) account tries to withdraw
            await expect(
                vestingVotingVault.connect(OTHER).withdraw(ethers.utils.parseEther("100"), OTHER_ADDRESS),
            ).to.be.revertedWith("AVV_NotManager()");
            // real manager withdraws tokens from vesting vault
            await vestingVotingVault.connect(MANAGER).withdraw(ethers.utils.parseEther("100"), MANAGER_ADDRESS);
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(
                partnerVestingAmount.add(teamVestingAmount).sub(ethers.utils.parseEther("100")),
            );
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(ethers.utils.parseEther("100"));
        });

        it("add grant and delegate then check voting power", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // get grant
            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.cliffClaimed).to.equal(false);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("100"),
            );
        });

        it("non-manager tries to add a grant", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            const tx = vestingVotingVault.connect(OTHER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );
            await expect(tx).to.be.revertedWith("AVV_NotManager()");
        });

        it("manager tries to add grant with out locking funds", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // add grant without locking funds
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            const tx = vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );
            await expect(tx).to.be.revertedWith("AVV_InsufficientBalance()");
        });

        it("add grant and delegate then manager tries to withdraw", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // get grant
            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(ethers.utils.parseEther("0"));
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.cliffClaimed).to.equal(false);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // manager tries to withdraw
            await expect(
                vestingVotingVault.connect(MANAGER).withdraw(ethers.utils.parseEther("100"), MANAGER_ADDRESS),
            ).to.be.revertedWith("AVV_InsufficientBalance()");
        });

        it("manager tries to add grant for account that already exists", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("10000"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("10000"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("10000"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // add another grant for the same account
            await expect(
                vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                    OTHER_ADDRESS, // recipient
                    ethers.utils.parseEther("1000"), // grant amount
                    ethers.utils.parseEther("500"), // cliff unlock amount
                    0, // start time is current block
                    expiration,
                    cliff,
                    OTHER_ADDRESS, // voting power delegate
                ),
            ).to.be.revertedWith("AVV_HasGrant()");
        });

        it("cliff amount greater than grant amount", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            const tx = vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("100.1"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );
            await expect(tx).to.be.revertedWith("AVV_InvalidCliffAmount()");
        });

        it("cliff time greater than expiration", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant cliff to high
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            const tx = vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff + 100,
                OTHER_ADDRESS, // voting power delegate
            );
            await expect(tx).to.be.revertedWith("AVV_InvalidSchedule()");

            // add grant cliff to low
            const currentTime2 = await ethers.provider.getBlock("latest");
            const currentBlock2 = currentTime2.number;
            const grantCreatedBlock2 = currentBlock2 + 1; // 1 block in the future
            const expiration2 = grantCreatedBlock2 + 200; // 200 blocks in the future
            const tx2 = vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration2,
                grantCreatedBlock2,
                OTHER_ADDRESS, // voting power delegate
            );
            await expect(tx2).to.be.revertedWith("AVV_InvalidSchedule()");

            // add grant cliff to low
            const currentTime3 = await ethers.provider.getBlock("latest");
            const currentBlock3 = currentTime3.number;
            const grantCreatedBlock3 = currentBlock3 + 1; // 1 block in the future
            const cliff3 = grantCreatedBlock3 + 100; // 100 blocks in the future
            const tx3 = vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                grantCreatedBlock3,
                cliff3,
                OTHER_ADDRESS, // voting power delegate
            );
            await expect(tx3).to.be.revertedWith("AVV_InvalidSchedule()");
        });

        it("manager removes grant and receives granted tokens", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));
            const managerBalanceBefore = await arcdToken.balanceOf(MANAGER_ADDRESS);

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // manager removes grant before any tokens are claimed
            await vestingVotingVault.connect(MANAGER).removeGrant(OTHER_ADDRESS);
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(
                managerBalanceBefore.add(ethers.utils.parseEther("100")),
            );

            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(0);
            expect(grant.cliffAmount).to.equal(0);
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(0);
            expect(grant.expiration).to.equal(0);
            expect(grant.cliff).to.equal(0);
            expect(grant.cliffClaimed).to.equal(false);
            expect(grant.latestVotingPower).to.equal(0);
            expect(grant.delegatee).to.equal(ethers.constants.AddressZero);
        });

        it("manager removes grant and receives fraction of granted tokens", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));
            const managerBalanceBefore = await arcdToken.balanceOf(MANAGER_ADDRESS);

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // grant recipient claims tokens after 75% of expiration
            // increase 75% of the way to expiration
            for (let i = 0; i < 149; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims after cliff
            const claimable = await vestingVotingVault.connect(OTHER).claimable(OTHER_ADDRESS);
            await vestingVotingVault.connect(OTHER).claim(claimable);
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(claimable);

            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(claimable);
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.cliffClaimed).to.equal(true);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100").sub(claimable));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("100").sub(claimable),
            );

            // manager removes grant after 75% of tokens are claimed
            await vestingVotingVault.connect(MANAGER).removeGrant(OTHER_ADDRESS);
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(
                managerBalanceBefore.add(ethers.utils.parseEther("100").sub(claimable)),
            );

            const grant2 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant2.allocation).to.equal(0);
            expect(grant2.cliffAmount).to.equal(0);
            expect(grant2.withdrawn).to.equal(0);
            expect(grant2.created).to.equal(0);
            expect(grant2.expiration).to.equal(0);
            expect(grant2.cliff).to.equal(0);
            expect(grant2.cliffClaimed).to.equal(false);
            expect(grant2.latestVotingPower).to.equal(0);
            expect(grant2.delegatee).to.equal(ethers.constants.AddressZero);
        });

        it("non-manager tries to remove grant", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // other account tries to add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            const tx = vestingVotingVault.connect(OTHER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );
            await expect(tx).to.be.revertedWith("AVV_NotManager()");
        });

        it("manager tries to remove grant that does not exist", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // manager removes grant non-existent grant
            const tx2 = vestingVotingVault.connect(MANAGER).removeGrant(OTHER_ADDRESS);
            await expect(tx2).to.be.revertedWith("AVV_NoGrantSet()");
        });
    });

    describe("Grant claiming", () => {
        it("grant recipient tries to claim before cliff", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));
            // manager deposits tokens into the vesting vault
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );
            // increase blocks to right before cliff
            for (let i = 0; i < 98; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims before cliff but no tokens are transferred
            const tx2 = vestingVotingVault.connect(OTHER).claim(ethers.utils.parseEther("1"));

            await expect(tx2).to.be.revertedWith("AVV_CliffNotReached()");
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(0);
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));
        });

        it("grant recipient claims at cliff, and check voting power", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens into vesting vault
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));
            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.cliffClaimed).to.equal(false);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // increase blocks to cliff block
            for (let i = 0; i < 99; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims after cliff but no tokens are transferred
            await vestingVotingVault.connect(OTHER).claim(ethers.utils.parseEther("50"));
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(ethers.utils.parseEther("50"));

            const grant2 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant2.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant2.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.withdrawn).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.created).to.equal(grantCreatedBlock);
            expect(grant2.expiration).to.equal(expiration);
            expect(grant2.cliff).to.equal(cliff);
            expect(grant2.cliffClaimed).to.equal(true);
            expect(grant2.latestVotingPower).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("50"),
            );
        });

        it("recipient claims fraction of total after cliff, then check voting power", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens into vesting vault
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));
            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.cliffClaimed).to.equal(false);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // increase blocks past cliff
            for (let i = 0; i < 100; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims after cliff but no tokens are transferred
            const claimable = await vestingVotingVault.connect(OTHER).claimable(OTHER_ADDRESS);
            await vestingVotingVault.connect(OTHER).claim(claimable);
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(claimable);

            const grant2 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant2.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant2.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.withdrawn).to.equal(claimable);
            expect(grant2.created).to.equal(grantCreatedBlock);
            expect(grant2.expiration).to.equal(expiration);
            expect(grant2.cliff).to.equal(cliff);
            expect(grant2.cliffClaimed).to.equal(true);
            expect(grant2.latestVotingPower).to.equal(ethers.utils.parseEther("100").sub(claimable));
            expect(grant2.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("100").sub(claimable),
            );
        });

        it("grant recipient claims entire amount after expiration, check voting power", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens into vesting vault
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));
            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.cliffClaimed).to.equal(false);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // increase blocks past expiration
            for (let i = 0; i < 201; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims after expiration, all tokens are transferred
            const claimable = await vestingVotingVault.connect(OTHER).claimable(OTHER_ADDRESS);
            expect(claimable).to.equal(ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(OTHER).claim(claimable);
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(claimable);

            const grant2 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant2.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant2.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.withdrawn).to.equal(claimable);
            expect(grant2.created).to.equal(grantCreatedBlock);
            expect(grant2.expiration).to.equal(expiration);
            expect(grant2.cliff).to.equal(cliff);
            expect(grant2.cliffClaimed).to.equal(true);
            expect(grant2.latestVotingPower).to.equal(ethers.utils.parseEther("0"));
            expect(grant2.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("0"),
            );
        });

        it("grant recipient claims 3 times for entire amount", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens into vesting vault
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));
            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.cliffClaimed).to.equal(false);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // increase blocks past cliff
            for (let i = 0; i < 99; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims after cliff but no tokens are transferred
            await vestingVotingVault.connect(OTHER).claim(ethers.utils.parseEther("50"));
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(ethers.utils.parseEther("50"));

            const grant2 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant2.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant2.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.withdrawn).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.created).to.equal(grantCreatedBlock);
            expect(grant2.expiration).to.equal(expiration);
            expect(grant2.cliff).to.equal(cliff);
            expect(grant2.cliffClaimed).to.equal(true);
            expect(grant2.latestVotingPower).to.equal(ethers.utils.parseEther("50"));
            expect(grant2.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("50"),
            );

            // increase 75% of the way to expiration
            for (let i = 0; i < 49; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims after cliff but no tokens are transferred
            const claimable = await vestingVotingVault.connect(OTHER).claimable(OTHER_ADDRESS);
            await vestingVotingVault.connect(OTHER).claim(claimable);
            const totalClaimed = ethers.utils.parseEther("50").add(claimable);
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(totalClaimed);

            const grant3 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant3.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant3.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant3.withdrawn).to.equal(totalClaimed);
            expect(grant3.created).to.equal(grantCreatedBlock);
            expect(grant3.expiration).to.equal(expiration);
            expect(grant3.cliff).to.equal(cliff);
            expect(grant3.cliffClaimed).to.equal(true);
            expect(grant3.latestVotingPower).to.equal(ethers.utils.parseEther("100").sub(totalClaimed));
            expect(grant3.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock2 = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock2.number)).to.equal(
                ethers.utils.parseEther("100").sub(totalClaimed),
            );

            // increase 100% of the way to expiration
            for (let i = 0; i < 50; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // user claims after cliff but no tokens are transferred
            const claimable2 = await vestingVotingVault.connect(OTHER).claimable(OTHER_ADDRESS);
            await vestingVotingVault.connect(OTHER).claim(claimable2);
            expect(await arcdToken.balanceOf(OTHER_ADDRESS)).to.equal(ethers.utils.parseEther("100"));

            const grant4 = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant4.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant4.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant4.withdrawn).to.equal(ethers.utils.parseEther("100"));
            expect(grant4.created).to.equal(grantCreatedBlock);
            expect(grant4.expiration).to.equal(expiration);
            expect(grant4.cliff).to.equal(cliff);
            expect(grant4.cliffClaimed).to.equal(true);
            expect(grant4.latestVotingPower).to.equal(ethers.utils.parseEther("0"));
            expect(grant4.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock3 = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock3.number)).to.equal(
                ethers.utils.parseEther("0"),
            );
        });
    });

    describe("Voting power delegation", function () {
        it("User changes vote delegation", async function () {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // get grant
            const grant = await vestingVotingVault.getGrant(OTHER_ADDRESS);
            expect(grant.allocation).to.equal(ethers.utils.parseEther("100"));
            expect(grant.cliffAmount).to.equal(ethers.utils.parseEther("50"));
            expect(grant.withdrawn).to.equal(0);
            expect(grant.created).to.equal(grantCreatedBlock);
            expect(grant.expiration).to.equal(expiration);
            expect(grant.cliff).to.equal(cliff);
            expect(grant.cliffClaimed).to.equal(false);
            expect(grant.latestVotingPower).to.equal(ethers.utils.parseEther("100"));
            expect(grant.delegatee).to.equal(OTHER_ADDRESS);

            // check voting power
            const checkBlock = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock.number)).to.equal(
                ethers.utils.parseEther("100"),
            );

            // user changes vote delegation
            await vestingVotingVault.connect(OTHER).delegate(signers[2].address);
            const checkBlock2 = await ethers.provider.getBlock("latest");
            expect(await vestingVotingVault.queryVotePowerView(OTHER_ADDRESS, checkBlock2.number)).to.equal(
                ethers.utils.parseEther("0"),
            );
            expect(await vestingVotingVault.queryVotePowerView(signers[2].address, checkBlock2.number)).to.equal(
                ethers.utils.parseEther("100"),
            );
        });

        it("User changes vote delegation to same account", async function () {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // user changes vote delegation to same account already delegated to
            const tx2 = vestingVotingVault.connect(OTHER).delegate(OTHER_ADDRESS);
            await expect(tx2).to.be.revertedWith("AVV_AlreadyDelegated()");
        });
    });

    describe("Voting on proposal", function () {
        it("User executes vote via vesting vault voting power", async function () {
            const { signers, vestingVotingVault, coreVoting, feeController, votingVaults, increaseBlockNumber } =
                ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = signers[1];
            const MANAGER_ADDRESS = signers[1].address;
            const OTHER_ADDRESS = signers[0].address;
            const OTHER = signers[0];
            const zeroExtraData = ["0x", "0x", "0x", "0x"];
            const MAX = ethers.constants.MaxUint256;

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(deployer).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(deployer).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            // manager deposits tokens
            await arcdToken.connect(MANAGER).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(MANAGER).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            // add grant
            const currentTime = await ethers.provider.getBlock("latest");
            const currentBlock = currentTime.number;
            const grantCreatedBlock = currentBlock + 1; // 1 block in the future
            const cliff = grantCreatedBlock + 100; // 100 blocks in the future
            const expiration = grantCreatedBlock + 200; // 200 blocks in the future
            await vestingVotingVault.connect(MANAGER).addGrantAndDelegate(
                OTHER_ADDRESS, // recipient
                ethers.utils.parseEther("100"), // grant amount
                ethers.utils.parseEther("50"), // cliff unlock amount
                0, // start time is current block
                expiration,
                cliff,
                OTHER_ADDRESS, // voting power delegate
            );

            // create proposal to update V2 originationFee
            const newFee = 60;
            const targetAddress = [feeController.address];
            // create an interface to access feeController abi
            const fcFactory = await ethers.getContractFactory("FeeController");
            // encode function signature and new fee amount to pass in proposal
            const feeContCalldata = fcFactory.interface.encodeFunctionData("setOriginationFee", [newFee]);

            // signer holding enough voting power for proposal creation creates proposal
            await coreVoting
                .connect(OTHER)
                .proposal([votingVaults[2]], zeroExtraData, targetAddress, [feeContCalldata], MAX, 0);

            // vote on proposal
            await coreVoting.connect(OTHER).vote([votingVaults[2]], ["0x"], 0, 0); // yes vote

            // increase blockNumber to exceed 3 day default lock duration set in coreVoting
            await increaseBlockNumber(provider, 19488);

            // proposal execution
            await coreVoting.connect(OTHER).execute(0, targetAddress, [feeContCalldata]);
            const originationFee = await feeController.getOriginationFee();
            expect(originationFee).to.equal(newFee);
        });
    });
});
