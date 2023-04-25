import { expect } from "chai";
import { ethers } from "hardhat";

import { TestContextGovernance, governanceFixture } from "./utils/governanceFixture";
import { TestContextToken, tokenFixture } from "./utils/tokenFixture";

/**
 * Test suite for the Arcade vesting contracts.
 */
describe("Vesting voting vault", function () {
    let ctxToken: TestContextToken;
    let ctxGovernance: TestContextGovernance;

    beforeEach(async function () {
        ctxToken = await tokenFixture();
        ctxGovernance = await governanceFixture(ctxToken.arcdToken);
    });

    describe.only("Manager only functions", function () {
        it("check manager address", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const MANAGER_ADDRESS = signers[1].address;

            expect(await vestingVotingVault.manager()).to.equal(MANAGER_ADDRESS);
        });

        it("cannot set new manager", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const OTHER_ADDRESS = signers[0].address;
            const MANAGER_ADDRESS = signers[1].address;

            await expect(vestingVotingVault.connect(MANAGER_ADDRESS).setManager(signers[0].address)).to.be.revertedWith(
                "!timelock",
            );
        });

        it("manager deposits and withdraws tokens from the vv", async () => {
            const { signers, vestingVotingVault } = ctxGovernance;
            const { arcdToken, arcdDst, deployer } = ctxToken;
            const MANAGER = deployer;
            const MANAGER_ADDRESS = signers[1].address;

            // distribute tokens to the vesting vault manager
            await arcdDst.connect(MANAGER).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            const partnerVestingAmount = await arcdDst.vestingPartnerAmount();
            const teamVestingAmount  = await arcdDst.vestingTeamAmount();
            await expect(await arcdDst.connect(MANAGER).toPartnerVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, partnerVestingAmount);
            await expect(await arcdDst.connect(MANAGER).toTeamVesting(MANAGER_ADDRESS))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, MANAGER_ADDRESS, teamVestingAmount);
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;

            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));

            await arcdToken.connect(signers[1]).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(signers[1]).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            await vestingVotingVault.connect(signers[1]).withdraw(ethers.utils.parseEther("100"), MANAGER_ADDRESS);
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await arcdToken.balanceOf(MANAGER_ADDRESS)).to.equal(partnerVestingAmount.add(teamVestingAmount));
        });

        it("non manager tries to deposit and withdraws tokens from the vv", async () => {
            
        });

        it("add grant and delegate then check voting power", async () => {

        });

        it("non-manager tries to add a grant", async () => {

        });

        it("manager tries to add grant with out locking funds", async () => {

        });

        it("add grant and delegate then manager tries to withdraw", async () => {

        });

        it("grant recipient tries to claim before cliff", async () => {
                
        });

        it("grant recipient claims after cliff, then check voting power", async () => {
                
        });

        it("grant recipient claims fraction of total after cliff, then check voting power", async () => {
                
        });

        it("grant recipient claims entire amount, then check voting power", async () => {

        });

        it("grant recipient tries to claim more than withdrawable amount", async () => {

        });

        it("manager removes grant and receives granted tokens", async () => {
                
        });

        it("non-manager tries to remove grant", async () => {
                    
        });

        it("manager removes grant after recipient has claimed", async () => {

        });   
    });
});
