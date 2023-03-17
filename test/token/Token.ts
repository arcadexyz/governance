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
            expect(await arcDst.vestingTeamSent()).to.be.false;
            expect(await arcDst.vestingPartnerSent()).to.be.false;
        });

        it("Check the initial supply was minted to the distributor contract", async () => {
            const { arcToken, arcDst, deployer } = ctxToken;

            expect(await arcToken.balanceOf(arcDst.address)).to.equal(ethers.utils.parseEther("100000000"));
            expect(await arcToken.balanceOf(deployer.address)).to.equal(0);
            expect(await arcToken.minter()).to.equal(deployer.address);
        });
    });

    describe("Mint", function () {
        describe("Minter role", function () {
            it("Only the minter contract can mint tokens", async () => {
                const { arcToken, deployer, other } = ctxToken;

                expect(await arcToken.minter()).to.equal(deployer.address);
                await expect(arcToken.connect(other).mint(other.address, 100)).to.be.revertedWith(
                    `AT_MinterNotCaller("${deployer.address}")`,
                );
            });

            it("Only the current minter can set the new minter address", async () => {
                const { arcToken, deployer, other } = ctxToken;

                await expect(arcToken.connect(other).setMinter(other.address)).to.be.revertedWith(
                    `AT_MinterNotCaller("${deployer.address}")`,
                );
            });

            it("Minter role sets the new minter address", async () => {
                const { arcToken, deployer, other } = ctxToken;

                await expect(await arcToken.connect(deployer).setMinter(other.address))
                    .to.emit(arcToken, "MinterUpdated")
                    .withArgs(other.address);
                expect(await arcToken.minter()).to.equal(other.address);
            });

            it("Cannot set the minter address to the zero address", async () => {
                const { arcToken, deployer } = ctxToken;

                await expect(arcToken.connect(deployer).setMinter(ethers.constants.AddressZero)).to.be.revertedWith(
                    "AT_ZeroAddress()",
                );
            });
        });

        describe("Minting tokens", function () {
            it("Cannot mint before start time", async () => {
                const { arcToken, deployer, other } = ctxToken;

                await expect(arcToken.connect(deployer).mint(other.address, 100)).to.be.reverted;
            });

            it("Can mint after start time", async () => {
                const { arcToken, deployer, other, blockchainTime } = ctxToken;

                await blockchainTime.increaseTime(3600 * 24 * 365);

                await arcToken.connect(deployer).mint(other.address, 100);

                expect(await arcToken.balanceOf(other.address)).to.equal(100);
            });

            it("multiple mints", async () => {
                const { arcToken, deployer, other, blockchainTime } = ctxToken;

                await blockchainTime.increaseTime(3600 * 24 * 365);

                await arcToken.connect(deployer).mint(other.address, 100);

                await blockchainTime.increaseTime(3600 * 24 * 365);

                await arcToken.connect(deployer).mint(other.address, 100);

                expect(await arcToken.balanceOf(other.address)).to.equal(200);
            });

            it("Cannot mint to the zero address", async () => {
                const { arcToken, deployer, blockchainTime } = ctxToken;

                await blockchainTime.increaseTime(3600 * 24 * 365);

                await expect(arcToken.connect(deployer).mint(ethers.constants.AddressZero, 100)).to.be.revertedWith(
                    "AT_ZeroAddress()",
                );
            });

            it("Cannot mint amount of zero tokens", async () => {
                const { arcToken, deployer, other, blockchainTime } = ctxToken;

                await blockchainTime.increaseTime(3600 * 24 * 365);

                await expect(arcToken.connect(deployer).mint(other.address, 0)).to.be.revertedWith(
                    "AT_ZeroMintAmount()",
                );
            });

            it("Cannot mint more than the max supply", async () => {
                const { arcToken, deployer, other, blockchainTime } = ctxToken;

                await blockchainTime.increaseTime(3600 * 24 * 365);

                const _totalSupply = await arcToken.connect(deployer).totalSupply();
                await expect(
                    arcToken.connect(deployer).mint(other.address, _totalSupply.mul(2).div(100).add(1)),
                ).to.be.revertedWith(
                    `AT_MintingCapExceeded(${_totalSupply}, ${_totalSupply.mul(2).div(100)}, ${_totalSupply
                        .mul(2)
                        .div(100)
                        .add(1)})`,
                );
            });

            it("Must wait minimum wait duration between mints", async () => {
                const { arcToken, deployer, other, blockchainTime } = ctxToken;

                await blockchainTime.increaseTime(3600 * 24 * 365);

                await arcToken.connect(deployer).mint(other.address, 100);
                await blockchainTime.increaseTime(3600);
                await expect(arcToken.connect(deployer).mint(other.address, 100)).to.be.reverted;
            });

            it("Can mint max tokens after minimum wait duration", async () => {
                const { arcToken, deployer, other, blockchainTime } = ctxToken;

                await blockchainTime.increaseTime(3600 * 24 * 365);

                let amountAvailableToMint = await arcToken.connect(other).totalSupply();
                expect(amountAvailableToMint.mul(2).div(100)).to.equal(ethers.utils.parseEther("2000000"));
                await arcToken.connect(deployer).mint(other.address, amountAvailableToMint.mul(2).div(100));

                await blockchainTime.increaseTime(3600 * 24 * 365);

                amountAvailableToMint = await arcToken.connect(other).totalSupply();
                expect(amountAvailableToMint.mul(2).div(100)).to.equal(ethers.utils.parseEther("2040000"));
                await arcToken.connect(deployer).mint(other.address, amountAvailableToMint.mul(2).div(100));

                expect(await arcToken.balanceOf(other.address)).to.equal(ethers.utils.parseEther("4040000"));
            });
        });
    });

    describe("ArcadeToken Distribution", function () {
        it("Dst contract owner distributes each token allocation", async () => {
            const {
                arcToken,
                arcDst,
                deployer,
                treasury,
                devPartner,
                communityRewardsPool,
                airdrop,
                vestingTeamMultisig,
                vestingPartner,
            } = ctxToken;

            await expect(await arcDst.connect(deployer).toTreasury(treasury.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, treasury.address, ethers.utils.parseEther("25500000"));
            await expect(await arcDst.connect(deployer).toDevPartner(devPartner.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, devPartner.address, ethers.utils.parseEther("600000"));
            await expect(await arcDst.connect(deployer).toCommunityRewards(communityRewardsPool.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, communityRewardsPool.address, ethers.utils.parseEther("15000000"));
            await expect(await arcDst.connect(deployer).toCommunityAirdrop(airdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, airdrop.address, ethers.utils.parseEther("10000000"));
            await expect(await arcDst.connect(deployer).toPartnerVesting(vestingPartner.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, vestingPartner.address, ethers.utils.parseEther("32700000"));
            await expect(await arcDst.connect(deployer).toTeamVesting(vestingTeamMultisig.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, vestingTeamMultisig.address, ethers.utils.parseEther("16200000"));

            expect(await arcDst.treasurySent()).to.be.true;
            expect(await arcDst.devPartnerSent()).to.be.true;
            expect(await arcDst.communityRewardsSent()).to.be.true;
            expect(await arcDst.communityAirdropSent()).to.be.true;
            expect(await arcDst.vestingTeamSent()).to.be.true;
            expect(await arcDst.vestingPartnerSent()).to.be.true;

            expect(await arcToken.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("25500000"));
            expect(await arcToken.balanceOf(devPartner.address)).to.equal(ethers.utils.parseEther("600000"));
            expect(await arcToken.balanceOf(communityRewardsPool.address)).to.equal(
                ethers.utils.parseEther("15000000"),
            );
            expect(await arcToken.balanceOf(airdrop.address)).to.equal(ethers.utils.parseEther("10000000"));
            expect(await arcToken.balanceOf(vestingPartner.address)).to.equal(ethers.utils.parseEther("32700000"));
            expect(await arcToken.balanceOf(vestingTeamMultisig.address)).to.equal(ethers.utils.parseEther("16200000"));

            expect(await arcToken.balanceOf(arcDst.address)).to.equal(0);

            expect(await arcToken.totalSupply()).to.equal(ethers.utils.parseEther("100000000"));
        });

        it("Cannot distribute to the zero address", async () => {
            const { arcDst, deployer } = ctxToken;

            await expect(arcDst.connect(deployer).toTreasury(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()",
            );
            await expect(arcDst.connect(deployer).toDevPartner(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()",
            );
            await expect(arcDst.connect(deployer).toCommunityRewards(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()",
            );
            await expect(arcDst.connect(deployer).toCommunityAirdrop(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()",
            );
            await expect(arcDst.connect(deployer).toTeamVesting(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()",
            );
            await expect(arcDst.connect(deployer).toPartnerVesting(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()",
            );

            // owner tries to set the token address to the zero address
            await expect(arcDst.connect(deployer).setToken(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()",
            );
        });

        it("Verifies all transfer functions can only be called by the contract owner", async () => {
            const {
                arcToken,
                arcDst,
                other,
                treasury,
                devPartner,
                communityRewardsPool,
                airdrop,
                vestingTeamMultisig,
                vestingPartner,
            } = ctxToken;

            await expect(arcDst.connect(other).toTreasury(treasury.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcDst.connect(other).toDevPartner(devPartner.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcDst.connect(other).toCommunityRewards(communityRewardsPool.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcDst.connect(other).toCommunityAirdrop(airdrop.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcDst.connect(other).toTeamVesting(vestingTeamMultisig.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcDst.connect(other).toPartnerVesting(vestingPartner.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );

            // 3rd party tries to set the token address
            await expect(arcDst.connect(other).setToken(arcToken.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
        });

        it("Verifies all transfer functions can only be called once by contract owner", async () => {
            const {
                arcToken,
                arcDst,
                deployer,
                treasury,
                devPartner,
                communityRewardsPool,
                airdrop,
                vestingTeamMultisig,
                vestingPartner,
            } = ctxToken;

            await arcDst.connect(deployer).setToken(arcToken.address);

            await arcDst.connect(deployer).toTreasury(treasury.address);
            await arcDst.connect(deployer).toDevPartner(devPartner.address);
            await arcDst.connect(deployer).toCommunityRewards(communityRewardsPool.address);
            await arcDst.connect(deployer).toCommunityAirdrop(airdrop.address);
            await arcDst.connect(deployer).toTeamVesting(vestingTeamMultisig.address);
            await arcDst.connect(deployer).toPartnerVesting(vestingPartner.address);

            await expect(arcDst.connect(deployer).toTreasury(treasury.address)).to.be.revertedWith("AT_AlreadySent()");
            await expect(arcDst.connect(deployer).toDevPartner(devPartner.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(arcDst.connect(deployer).toCommunityRewards(communityRewardsPool.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(arcDst.connect(deployer).toCommunityAirdrop(airdrop.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(arcDst.connect(deployer).toTeamVesting(vestingTeamMultisig.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(arcDst.connect(deployer).toPartnerVesting(vestingPartner.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
        });
    });
});
