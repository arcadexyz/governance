import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { TokenTestContext, tokenFixture } from "../utils/tokenFixture";

const { loadFixture, provider } = waffle;

/**
 * Test suite for the ArcadeToken Contract.
 */

describe("ArcadeToken", function () {
    let ctxToken: TokenTestContext;

    beforeEach(async function () {
        ctxToken = await loadFixture(tokenFixture);
    });

    describe("Deployment", function () {
        it("Verify name and symbol of the token", async () => {
            const { arcToken } = ctxToken;

            expect(await arcToken.name()).to.equal("Arcade");
            expect(await arcToken.symbol()).to.equal("ARC");            
        });

        it("Check the initial state of the mint booleans", async () => {
            const { arcToken } = ctxToken;

            expect(await arcToken.treasuryMinted()).to.be.false;
            expect(await arcToken.devPartnerMinted()).to.be.false;
            expect(await arcToken.communityRewardsMinted()).to.be.false;
            expect(await arcToken.communityAirdropMinted()).to.be.false;
            expect(await arcToken.vestingMinted()).to.be.false;
        });

        it("Check that the owner is the deployer", async () => {
            const { arcToken, deployer } = ctxToken;

            expect(await arcToken.owner()).to.equal(deployer.address);
        });
    });

    describe("Minting", function () {
        it("Contract owner mints each token allocation", async () => {
            const { arcToken, deployer, treasury, devPartner, communityRewardsPool, airdrop, vestingMultisig } = ctxToken;

            await arcToken.connect(deployer).mintToTreasury(treasury.address);
            await arcToken.connect(deployer).mintToDevPartner(devPartner.address);
            await arcToken.connect(deployer).mintToCommunityRewards(communityRewardsPool.address);
            await arcToken.connect(deployer).mintToCommunityAirdrop(airdrop.address);
            await arcToken.connect(deployer).mintToVesting(vestingMultisig.address);

            expect(await arcToken.treasuryMinted()).to.be.true;
            expect(await arcToken.devPartnerMinted()).to.be.true;
            expect(await arcToken.communityRewardsMinted()).to.be.true;
            expect(await arcToken.communityAirdropMinted()).to.be.true;
            expect(await arcToken.vestingMinted()).to.be.true;

            expect(await arcToken.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("25500000"));
            expect(await arcToken.balanceOf(devPartner.address)).to.equal(ethers.utils.parseEther("600000"));
            expect(await arcToken.balanceOf(communityRewardsPool.address)).to.equal(ethers.utils.parseEther("15000000"));
            expect(await arcToken.balanceOf(airdrop.address)).to.equal(ethers.utils.parseEther("10000000"));
            expect(await arcToken.balanceOf(vestingMultisig.address)).to.equal(ethers.utils.parseEther("48900000"));

            expect(await arcToken.totalSupply()).to.equal(ethers.utils.parseEther("100000000"));
        });

        it("Cannot mint to the zero address", async () => {
            const { arcToken, deployer } = ctxToken;

            await expect(arcToken.connect(deployer).mintToTreasury(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()"
            );
            await expect(arcToken.connect(deployer).mintToDevPartner(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()"
            );
            await expect(arcToken.connect(deployer).mintToCommunityRewards(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()"
            );
            await expect(arcToken.connect(deployer).mintToCommunityAirdrop(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()"
            );
            await expect(arcToken.connect(deployer).mintToVesting(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()"
            );
        });

        it("Verifies all exposed mint functions can only be called by the contract owner", async () => {
            const { arcToken, other, treasury, devPartner, communityRewardsPool, airdrop, vestingMultisig } = ctxToken;

            await expect(arcToken.connect(other).mintToTreasury(treasury.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
            await expect(arcToken.connect(other).mintToDevPartner(devPartner.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
            await expect(arcToken.connect(other).mintToCommunityRewards(communityRewardsPool.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
            await expect(arcToken.connect(other).mintToCommunityAirdrop(airdrop.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
            await expect(arcToken.connect(other).mintToVesting(vestingMultisig.address)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Verifies exposed mint functions can only be called once by contract owner", async () => {
            const { arcToken, deployer, treasury, devPartner, communityRewardsPool, airdrop, vestingMultisig } = ctxToken;

            await arcToken.connect(deployer).mintToTreasury(treasury.address);
            await arcToken.connect(deployer).mintToDevPartner(devPartner.address);
            await arcToken.connect(deployer).mintToCommunityRewards(communityRewardsPool.address);
            await arcToken.connect(deployer).mintToCommunityAirdrop(airdrop.address);
            await arcToken.connect(deployer).mintToVesting(vestingMultisig.address);

            await expect(arcToken.connect(deployer).mintToTreasury(treasury.address)).to.be.revertedWith(
                "AT_AlreadyMinted()"
            );
            await expect(arcToken.connect(deployer).mintToDevPartner(devPartner.address)).to.be.revertedWith(
                "AT_AlreadyMinted()"
            );
            await expect(arcToken.connect(deployer).mintToCommunityRewards(communityRewardsPool.address)).to.be.revertedWith(
                "AT_AlreadyMinted()"
            );
            await expect(arcToken.connect(deployer).mintToCommunityAirdrop(airdrop.address)).to.be.revertedWith(
                "AT_AlreadyMinted()"
            );
            await expect(arcToken.connect(deployer).mintToVesting(vestingMultisig.address)).to.be.revertedWith(
                "AT_AlreadyMinted()"
            );
        });
    });

    describe("Withdraw tokens", function () {
        it("Verifies that the contract owner can withdraw tokens", async () => {
            const { arcToken, deployer, other } = ctxToken;

            await arcToken.connect(deployer).mintToTreasury(other.address);

            await arcToken.connect(other).transfer(arcToken.address, ethers.utils.parseEther("25500000"));
            expect(await arcToken.balanceOf(other.address)).to.equal(ethers.utils.parseEther("0"));
            expect(await arcToken.balanceOf(arcToken.address)).to.equal(ethers.utils.parseEther("25500000"));

            await arcToken.connect(deployer).withdrawTokens(arcToken.address);

            expect(await arcToken.balanceOf(deployer.address)).to.equal(ethers.utils.parseEther("25500000"));
        });

        it("Cannot pass zero address as the token address", async () => {
            const { arcToken, deployer } = ctxToken;

            await expect(arcToken.connect(deployer).withdrawTokens(ethers.constants.AddressZero))
                .to.be.revertedWith("AT_ZeroAddress()");
        });
    });
});