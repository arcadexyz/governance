import { expect } from "chai";
import { ethers } from "hardhat";

import { TestContextVotingVault, votingVaultFixture } from "./utils/votingVaultFixture";
import { TokenTestContext, tokenFixture } from "./utils/tokenFixture";

/**
 * Test suite for the Arcade vesting contracts.
 */
describe("Vesting Vault", function () {
    let ctxVotingVault: TestContextVotingVault;
    let ctxToken: TokenTestContext;

    beforeEach(async function () {
        ctxVotingVault = await votingVaultFixture();
        ctxToken = await tokenFixture();
    });

    describe("Manager only functions", function () {
        it("Check manager address", async () => {
            const { signers, vestingVault } = ctxVotingVault;
            expect(await vestingVault.manager()).to.equal(signers[1].address);
        });
        it("Cannot set new manager", async () => {
            const { signers, vestingVault } = ctxVotingVault;
            
            await expect(vestingVault.connect(signers[1]).setManager(signers[0].address)).to.be.revertedWith("!timelock");
        });
        it("deposits and withdraws tokens from the vv", async () => {
            const { signers, vestingVault } = ctxVotingVault;
            const { arcToken, arcDst, deployer } = ctxToken;

            // distribute tokens to the vesting vault manager (signers[1])
            await arcDst.connect(deployer).setToken(arcToken.address);
            expect(await arcDst.arcadeToken()).to.equal(arcToken.address);

            await expect(await arcDst.connect(deployer).toPartnerVesting(signers[1].address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, signers[1].address, ethers.utils.parseEther("32700000"));
            await expect(await arcDst.connect(deployer).toTeamVesting(signers[1].address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, signers[1].address, ethers.utils.parseEther("16200000"));
            expect(await arcDst.vestingTeamSent()).to.be.true;
            expect(await arcDst.vestingPartnerSent()).to.be.true;

            expect(await arcToken.balanceOf(signers[1].address)).to.equal(ethers.utils.parseEther("48900000"));
            
            await arcToken.connect(signers[1]).approve(vestingVault.address, ethers.utils.parseEther("100"));
            await vestingVault.connect(signers[1]).deposit(ethers.utils.parseEther("100"));
            expect(await arcToken.balanceOf(vestingVault.address)).to.equal(ethers.utils.parseEther("100"));

            await vestingVault.connect(signers[1]).withdraw(ethers.utils.parseEther("100"));
            expect(await arcToken.balanceOf(vestingVault.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await arcToken.balanceOf(signers[1].address)).to.equal(ethers.utils.parseEther("48900000"));
        });
    });
});
