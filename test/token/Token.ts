import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { TokenTestContext, tokenFixture } from "../utils/tokenFixture";

const { loadFixture } = waffle;

/**
 * Test suite for the ArcadeToken and ArcadeTokenDistributor contracts.
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
            expect(await arcToken.symbol()).to.equal("ARCD");
        });

        it("Check the initial state of the transfer booleans", async () => {
            const { arcDst } = ctxToken;

            expect(await arcDst.treasurySent()).to.be.false;
            expect(await arcDst.devPartnerSent()).to.be.false;
            expect(await arcDst.communityRewardsSent()).to.be.false;
            expect(await arcDst.communityAirdropSent()).to.be.false;
            expect(await arcDst.vestingSent()).to.be.false;
        });

        it("Check the initial supply was minted to the distributor contract", async () => {
            const { arcToken, arcDst, deployer } = ctxToken;

            expect(await arcToken.balanceOf(arcDst.address)).to.equal(ethers.utils.parseEther("100000000"));
            expect(await arcToken.balanceOf(deployer.address)).to.equal(0);
            expect(await arcToken.minter()).to.equal(arcDst.address);
        });
    });

    describe("Mint", function () {
        describe("Minter role", function () {
            it("Only the minter contract can mint tokens", async () => {
                const { arcToken, arcDst, other } = ctxToken;

                expect(await arcToken.minter()).to.equal(arcDst.address);
                await expect(arcToken.connect(other).mint(other.address, 100)).to.be.revertedWith(
                    `AT_MinterNotCaller("${arcDst.address}")`,
                );
            });

            it("Only the current minter can set the new minter address", async () => {
                const { arcToken, arcDst, other } = ctxToken;

                await expect(arcToken.connect(other).setMinter(other.address)).to.be.revertedWith(
                    `AT_MinterNotCaller("${arcDst.address}")`,
                );
            });

            it("Minter role sets the new minter address", async () => {
                const { arcToken, arcDst, deployer, other } = ctxToken;
                expect(await arcToken.minter()).to.equal(arcDst.address);

                await expect(await arcDst.connect(deployer).transferMinterRole(arcToken.address, other.address))
                    .to.emit(arcToken, "MinterUpdated")
                    .withArgs(other.address);
                expect(await arcToken.minter()).to.equal(other.address);

                await expect(await arcToken.connect(other).setMinter(deployer.address))
                    .to.emit(arcToken, "MinterUpdated")
                    .withArgs(deployer.address);
                expect(await arcToken.minter()).to.equal(deployer.address);
            });
        });

        describe("Minting tokens", function () {
            it("Cannot mint before start time", async () => {
                const { arcToken, arcDst, deployer, other } = ctxToken;

                await arcDst.connect(deployer).transferMinterRole(arcToken.address, other.address);

                await expect(arcToken.connect(other).mint(other.address, 100)).to.be.reverted;
            });

            it("Can mint after start time", async () => {
                const { arcToken, arcDst, deployer, other, blockchainTime } = ctxToken;

                await arcDst.connect(deployer).transferMinterRole(arcToken.address, other.address);
                await blockchainTime.increaseTime(3600);

                await arcToken.connect(other).mint(other.address, 100);

                expect(await arcToken.balanceOf(other.address)).to.equal(100);
            });

            it("Cannot mint to the zero address", async () => {
                const { arcToken, arcDst, deployer, other, blockchainTime } = ctxToken;

                await arcDst.connect(deployer).transferMinterRole(arcToken.address, other.address);
                await blockchainTime.increaseTime(3600);

                await expect(arcToken.connect(other).mint(ethers.constants.AddressZero, 100)).to.be.revertedWith(
                    "AT_ZeroAddress()",
                );
            });

            it("Cannot mint amount of zero tokens", async () => {
                const { arcToken, arcDst, deployer, other, blockchainTime } = ctxToken;

                await arcDst.connect(deployer).transferMinterRole(arcToken.address, other.address);
                await blockchainTime.increaseTime(3600);

                await expect(arcToken.connect(other).mint(other.address, 0)).to.be.revertedWith("AT_ZeroMintAmount()");
            });

            it("Cannot mint more than the max supply", async () => {
                const { arcToken, arcDst, deployer, other, blockchainTime } = ctxToken;

                await arcDst.connect(deployer).transferMinterRole(arcToken.address, other.address);
                await blockchainTime.increaseTime(3600);

                const _totalSupply = await arcToken.connect(deployer).totalSupply();
                await expect(
                    arcToken.connect(other).mint(other.address, _totalSupply.mul(2).div(100).add(1)),
                ).to.be.revertedWith(
                    `AT_MintingCapExceeded(${_totalSupply}, ${_totalSupply.mul(2).div(100)}, ${_totalSupply
                        .mul(2)
                        .div(100)
                        .add(1)})`,
                );
            });

            it("Must wait minimum wait duration between mints", async () => {
                const { arcToken, arcDst, deployer, other, blockchainTime } = ctxToken;

                await arcDst.connect(deployer).transferMinterRole(arcToken.address, other.address);
                await blockchainTime.increaseTime(3600);

                await arcToken.connect(other).mint(other.address, 100);
                await blockchainTime.increaseTime(3600);
                await expect(arcToken.connect(other).mint(other.address, 100)).to.be.reverted;
            });

            it("Can mint max tokens after minimum wait duration", async () => {
                const { arcToken, arcDst, deployer, other, blockchainTime } = ctxToken;

                await arcDst.connect(deployer).transferMinterRole(arcToken.address, other.address);
                await blockchainTime.increaseTime(3600);

                let amountAvailableToMint = await arcToken.connect(other).totalSupply();
                expect(amountAvailableToMint.mul(2).div(100)).to.equal(ethers.utils.parseEther("2000000"));
                await arcToken.connect(other).mint(other.address, amountAvailableToMint.mul(2).div(100));

                await blockchainTime.increaseTime(3600 * 24 * 365);

                amountAvailableToMint = await arcToken.connect(other).totalSupply();
                expect(amountAvailableToMint.mul(2).div(100)).to.equal(ethers.utils.parseEther("2040000"));
                await arcToken.connect(other).mint(other.address, amountAvailableToMint.mul(2).div(100));

                expect(await arcToken.balanceOf(other.address)).to.equal(ethers.utils.parseEther("4040000"));
            });
        });
    });

    describe("ArcadeToken Distribution", function () {
        it("Dst contract owner distributes each token allocation", async () => {
            const { arcToken, arcDst, deployer, treasury, devPartner, communityRewardsPool, airdrop, vestingMultisig } =
                ctxToken;

            await arcDst.connect(deployer).toTreasury(arcToken.address, treasury.address);
            await arcDst.connect(deployer).toDevPartner(arcToken.address, devPartner.address);
            await arcDst.connect(deployer).toCommunityRewards(arcToken.address, communityRewardsPool.address);
            await arcDst.connect(deployer).toCommunityAirdrop(arcToken.address, airdrop.address);
            await arcDst.connect(deployer).toVesting(arcToken.address, vestingMultisig.address);

            expect(await arcDst.treasurySent()).to.be.true;
            expect(await arcDst.devPartnerSent()).to.be.true;
            expect(await arcDst.communityRewardsSent()).to.be.true;
            expect(await arcDst.communityAirdropSent()).to.be.true;
            expect(await arcDst.vestingSent()).to.be.true;

            expect(await arcToken.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("25500000"));
            expect(await arcToken.balanceOf(devPartner.address)).to.equal(ethers.utils.parseEther("600000"));
            expect(await arcToken.balanceOf(communityRewardsPool.address)).to.equal(
                ethers.utils.parseEther("15000000"),
            );
            expect(await arcToken.balanceOf(airdrop.address)).to.equal(ethers.utils.parseEther("10000000"));
            expect(await arcToken.balanceOf(vestingMultisig.address)).to.equal(ethers.utils.parseEther("48900000"));

            expect(await arcToken.totalSupply()).to.equal(ethers.utils.parseEther("100000000"));
        });

        it("Cannot distribute to the zero address", async () => {
            const { arcToken, arcDst, deployer } = ctxToken;

            await expect(
                arcDst.connect(deployer).toTreasury(arcToken.address, ethers.constants.AddressZero),
            ).to.be.revertedWith("AT_ZeroAddress()");
            await expect(
                arcDst.connect(deployer).toDevPartner(arcToken.address, ethers.constants.AddressZero),
            ).to.be.revertedWith("AT_ZeroAddress()");
            await expect(
                arcDst.connect(deployer).toCommunityRewards(arcToken.address, ethers.constants.AddressZero),
            ).to.be.revertedWith("AT_ZeroAddress()");
            await expect(
                arcDst.connect(deployer).toCommunityAirdrop(arcToken.address, ethers.constants.AddressZero),
            ).to.be.revertedWith("AT_ZeroAddress()");
            await expect(
                arcDst.connect(deployer).toVesting(arcToken.address, ethers.constants.AddressZero),
            ).to.be.revertedWith("AT_ZeroAddress()");
        });

        it("Verifies all transfer functions can only be called by the contract owner", async () => {
            const { arcToken, arcDst, other, treasury, devPartner, communityRewardsPool, airdrop, vestingMultisig } =
                ctxToken;

            await expect(arcDst.connect(other).toTreasury(arcToken.address, treasury.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcDst.connect(other).toDevPartner(arcToken.address, devPartner.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(
                arcDst.connect(other).toCommunityRewards(arcToken.address, communityRewardsPool.address),
            ).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(
                arcDst.connect(other).toCommunityAirdrop(arcToken.address, airdrop.address),
            ).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(arcDst.connect(other).toVesting(arcToken.address, vestingMultisig.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
        });

        it("Verifies all transfer functions can only be called once by contract owner", async () => {
            const { arcToken, arcDst, deployer, treasury, devPartner, communityRewardsPool, airdrop, vestingMultisig } =
                ctxToken;

            await arcDst.connect(deployer).toTreasury(arcToken.address, treasury.address);
            await arcDst.connect(deployer).toDevPartner(arcToken.address, devPartner.address);
            await arcDst.connect(deployer).toCommunityRewards(arcToken.address, communityRewardsPool.address);
            await arcDst.connect(deployer).toCommunityAirdrop(arcToken.address, airdrop.address);
            await arcDst.connect(deployer).toVesting(arcToken.address, vestingMultisig.address);

            await expect(arcDst.connect(deployer).toTreasury(arcToken.address, treasury.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(
                arcDst.connect(deployer).toDevPartner(arcToken.address, devPartner.address),
            ).to.be.revertedWith("AT_AlreadySent()");
            await expect(
                arcDst.connect(deployer).toCommunityRewards(arcToken.address, communityRewardsPool.address),
            ).to.be.revertedWith("AT_AlreadySent()");
            await expect(
                arcDst.connect(deployer).toCommunityAirdrop(arcToken.address, airdrop.address),
            ).to.be.revertedWith("AT_AlreadySent()");
            await expect(
                arcDst.connect(deployer).toVesting(arcToken.address, vestingMultisig.address),
            ).to.be.revertedWith("AT_AlreadySent()");
        });
    });
});
