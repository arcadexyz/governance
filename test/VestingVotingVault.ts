import { expect } from "chai";
import { ethers } from "hardhat";

import { TestContextVotingVault, governanceFixture } from "./utils/governanceFixture";
import { TestContextToken, tokenFixture } from "./utils/tokenFixture";

/**
 * Test suite for the Arcade vesting contracts.
 */
describe("Vesting voting vault", function () {
    let ctxToken: TestContextToken;
    let ctxVotingVault: TestContextVotingVault;

    beforeEach(async function () {
        ctxToken = await tokenFixture();
        ctxVotingVault = await governanceFixture(ctxToken.arcdToken);
    });

    describe("Manager only functions", function () {
        it("check manager address", async () => {
            const { signers, vestingVotingVault } = ctxVotingVault;
            expect(await vestingVotingVault.manager()).to.equal(signers[1].address);
        });
        it("cannot set new manager", async () => {
            const { signers, vestingVotingVault } = ctxVotingVault;

            await expect(vestingVotingVault.connect(signers[1]).setManager(signers[0].address)).to.be.revertedWith(
                "!timelock",
            );
        });
        it("deposit and withdraw tokens from the vv", async () => {
            const { signers, vestingVotingVault } = ctxVotingVault;
            const { arcdToken, arcdDst, deployer } = ctxToken;

            // distribute tokens to the vesting vault manager (signers[1])
            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            await expect(await arcdDst.connect(deployer).toPartnerVesting(signers[1].address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, signers[1].address, ethers.utils.parseEther("32700000"));
            await expect(await arcdDst.connect(deployer).toTeamVesting(signers[1].address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, signers[1].address, ethers.utils.parseEther("16200000"));
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;

            expect(await arcdToken.balanceOf(signers[1].address)).to.equal(ethers.utils.parseEther("48900000"));

            await arcdToken.connect(signers[1]).approve(vestingVotingVault.address, ethers.utils.parseEther("100"));
            await vestingVotingVault.connect(signers[1]).deposit(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("100"));

            await vestingVotingVault.connect(signers[1]).withdraw(ethers.utils.parseEther("100"), signers[1].address);
            expect(await arcdToken.balanceOf(vestingVotingVault.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await arcdToken.balanceOf(signers[1].address)).to.equal(ethers.utils.parseEther("48900000"));
        });
    });
});
