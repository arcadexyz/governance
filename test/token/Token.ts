import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { createSnapshot, restoreSnapshot } from "../utils/external/council/utils/snapshots";
import { TokenTestContext, tokenFixture } from "../utils/tokenFixture";

const { loadFixture, provider } = waffle;

/**
 * Test suite for the ArcadeToken, ArcadeTokenDistributor, and Airdrop contracts.
 */

describe("ArcadeToken", function () {
    let ctxToken: TokenTestContext;

    before(async function () {
        ctxToken = await loadFixture(tokenFixture);
        await createSnapshot(provider);
    });
    after(async function () {
        await restoreSnapshot(provider);
    });

    beforeEach(async function () {
        await createSnapshot(provider);
    });
    afterEach(async function () {
        await restoreSnapshot(provider);
    });

    describe("Deployment", function () {
        beforeEach(async function () {
            await createSnapshot(provider);
        });
        afterEach(async function () {
            await restoreSnapshot(provider);
        });

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
        beforeEach(async function () {
            await createSnapshot(provider);
        });
        afterEach(async function () {
            await restoreSnapshot(provider);
        });
        describe("Minter role", function () {
            beforeEach(async function () {
                await createSnapshot(provider);
            });
            afterEach(async function () {
                await restoreSnapshot(provider);
            });
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
        beforeEach(async function () {
            await createSnapshot(provider);
        });
        afterEach(async function () {
            await restoreSnapshot(provider);
        });
        it("Dst contract owner distributes each token allocation", async () => {
            const {
                arcToken,
                arcDst,
                deployer,
                treasury,
                devPartner,
                communityRewardsPool,
                arcAirdrop,
                vestingTeamMultisig,
                vestingPartner,
            } = ctxToken;

            await arcDst.connect(deployer).setToken(arcToken.address);
            expect(await arcDst.arcadeToken()).to.equal(arcToken.address);

            await expect(await arcDst.connect(deployer).toTreasury(treasury.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, treasury.address, ethers.utils.parseEther("25500000"));
            await expect(await arcDst.connect(deployer).toDevPartner(devPartner.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, devPartner.address, ethers.utils.parseEther("600000"));
            await expect(await arcDst.connect(deployer).toCommunityRewards(communityRewardsPool.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, communityRewardsPool.address, ethers.utils.parseEther("15000000"));
            await expect(await arcDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
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
            expect(await arcToken.balanceOf(arcAirdrop.address)).to.equal(ethers.utils.parseEther("10000000"));
            expect(await arcToken.balanceOf(vestingPartner.address)).to.equal(ethers.utils.parseEther("32700000"));
            expect(await arcToken.balanceOf(vestingTeamMultisig.address)).to.equal(ethers.utils.parseEther("16200000"));

            expect(await arcToken.balanceOf(arcDst.address)).to.equal(0);

            expect(await arcToken.totalSupply()).to.equal(ethers.utils.parseEther("100000000"));
        });

        it("Cannot distribute to the zero address", async () => {
            const { arcToken, arcDst, deployer } = ctxToken;

            await arcDst.connect(deployer).setToken(arcToken.address);

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
                deployer,
                other,
                treasury,
                devPartner,
                communityRewardsPool,
                arcAirdrop,
                vestingTeamMultisig,
                vestingPartner,
            } = ctxToken;

            await arcDst.connect(deployer).setToken(arcToken.address);

            await expect(arcDst.connect(other).toTreasury(treasury.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcDst.connect(other).toDevPartner(devPartner.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcDst.connect(other).toCommunityRewards(communityRewardsPool.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcDst.connect(other).toCommunityAirdrop(arcAirdrop.address)).to.be.revertedWith(
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
                arcAirdrop,
                vestingTeamMultisig,
                vestingPartner,
            } = ctxToken;

            await arcDst.connect(deployer).setToken(arcToken.address);

            await arcDst.connect(deployer).toTreasury(treasury.address);
            await arcDst.connect(deployer).toDevPartner(devPartner.address);
            await arcDst.connect(deployer).toCommunityRewards(communityRewardsPool.address);
            await arcDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address);
            await arcDst.connect(deployer).toTeamVesting(vestingTeamMultisig.address);
            await arcDst.connect(deployer).toPartnerVesting(vestingPartner.address);

            await expect(arcDst.connect(deployer).toTreasury(treasury.address)).to.be.revertedWith("AT_AlreadySent()");
            await expect(arcDst.connect(deployer).toDevPartner(devPartner.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(arcDst.connect(deployer).toCommunityRewards(communityRewardsPool.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(arcDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address)).to.be.revertedWith(
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

    describe("ArcadeToken Airdrop", () => {
        beforeEach(async function () {
            await createSnapshot(provider);
        });
        afterEach(async function () {
            await restoreSnapshot(provider);
        });
        it("all recipients claim airdrop and delegate to themselves", async function () {
            const { arcToken, arcDst, arcAirdrop, deployer, other, recipients, merkleTrie, frozenLockingVault } =
                ctxToken;

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcDst.communityAirdropSent()).to.be.true;

            // create proof for deployer and other
            const proofDeployer = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[0].address, recipients[0].value]),
            );
            const proofOther = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[1].address, recipients[1].value]),
            );

            // claim and delegate to self
            await expect(
                await arcAirdrop.connect(deployer).claimAndDelegate(
                    recipients[0].value, // amount to claim
                    recipients[0].address, // address to delegate to
                    recipients[0].value, // total claimable amount
                    proofDeployer, // merkle proof
                    recipients[0].address, // address credit claim to
                ),
            )
                .to.emit(arcToken, "Transfer")
                .withArgs(arcAirdrop.address, frozenLockingVault.address, recipients[0].value);

            await expect(
                await arcAirdrop.connect(other).claimAndDelegate(
                    recipients[1].value, // amount to claim
                    recipients[1].address, // address to delegate to
                    recipients[1].value, // total claimable amount
                    proofOther, // merkle proof
                    recipients[1].address, // address credit claim to
                ),
            )
                .to.emit(arcToken, "Transfer")
                .withArgs(arcAirdrop.address, frozenLockingVault.address, recipients[1].value);

            expect(await arcToken.balanceOf(frozenLockingVault.address)).to.equal(
                recipients[0].value.add(recipients[1].value),
            );
            expect(await arcToken.balanceOf(arcAirdrop.address)).to.equal(
                ethers.utils.parseEther("10000000").sub(recipients[0].value).sub(recipients[1].value),
            );
        });

        it("claim airdrop late but before reclaim is called", async function () {
            const {
                arcToken,
                arcDst,
                arcAirdrop,
                deployer,
                recipients,
                merkleTrie,
                frozenLockingVault,
                blockchainTime,
            } = ctxToken;

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcDst.communityAirdropSent()).to.be.true;

            // increase time past claim deadline
            await blockchainTime.increaseTime(3601);

            // create proof for deployer and other
            const proofDeployer = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[0].address, recipients[0].value]),
            );

            // claim and delegate to self
            await expect(
                await arcAirdrop.connect(deployer).claimAndDelegate(
                    recipients[0].value, // amount to claim
                    recipients[0].address, // address to delegate to
                    recipients[0].value, // total claimable amount
                    proofDeployer, // merkle proof
                    recipients[0].address, // address credit claim to
                ),
            )
                .to.emit(arcToken, "Transfer")
                .withArgs(arcAirdrop.address, frozenLockingVault.address, recipients[0].value);

            expect(await arcToken.balanceOf(frozenLockingVault.address)).to.equal(recipients[0].value);
            expect(await arcToken.balanceOf(arcAirdrop.address)).to.equal(
                ethers.utils.parseEther("10000000").sub(recipients[0].value),
            );
        });

        it("user tries to claim airdrop with invalid proof", async function () {
            const { arcToken, arcDst, arcAirdrop, deployer, other, recipients, merkleTrie } = ctxToken;

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcDst.communityAirdropSent()).to.be.true;

            // create proof for deployer and other
            const proofNotUser = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[0].address, recipients[0].value]),
            );
            // try to claim with invalid proof
            await expect(
                arcAirdrop.connect(other).claimAndDelegate(
                    recipients[0].value, // amount to claim
                    other.address, // address to delegate to
                    recipients[0].value, // total claimable amount
                    proofNotUser, // invalid merkle proof
                    recipients[0].address, // address to credit claim to
                ),
            ).to.be.revertedWith("Invalid Proof");
        });

        it("user tries to claim airdrop twice", async function () {
            const { arcToken, arcDst, arcAirdrop, deployer, recipients, merkleTrie, frozenLockingVault } = ctxToken;

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcDst.communityAirdropSent()).to.be.true;

            // create proof for deployer and other
            const proofDeployer = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[0].address, recipients[0].value]),
            );

            // claim and delegate to self
            await expect(
                arcAirdrop.connect(deployer).claimAndDelegate(
                    recipients[0].value, // amount to claim
                    recipients[0].address, // address to delegate to
                    recipients[0].value, // total claimable amount
                    proofDeployer, // merkle proof
                    recipients[0].address, // address credit claim to
                ),
            )
                .to.emit(arcToken, "Transfer")
                .withArgs(arcAirdrop.address, frozenLockingVault.address, recipients[0].value);

            // try to claim again
            await expect(
                arcAirdrop.connect(deployer).claimAndDelegate(
                    recipients[0].value, // amount to claim
                    recipients[0].address, // address to delegate to
                    recipients[0].value, // total claimable amount
                    proofDeployer, // merkle proof
                    recipients[0].address, // address credit claim to
                ),
            ).to.be.revertedWith("Claimed too much");
        });

        it("user tries to claim airdrop after owner reclaims tokens", async function () {
            const { arcToken, arcDst, arcAirdrop, deployer, recipients, merkleTrie, blockchainTime } = ctxToken;

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcDst.communityAirdropSent()).to.be.true;

            // fast forward to after the end of the airdrop claim period
            await blockchainTime.increaseTime(3600);

            // owner reclaims tokens
            await expect(await arcAirdrop.connect(deployer).reclaim(deployer.address))
                .to.emit(arcToken, "Transfer")
                .withArgs(arcAirdrop.address, deployer.address, ethers.utils.parseEther("10000000"));

            // create proof for deployer
            const proofDeployer = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[0].address, recipients[0].value]),
            );

            // claims
            await expect(
                arcAirdrop.connect(deployer).claimAndDelegate(
                    recipients[0].value, // amount to claim
                    recipients[0].address, // address to delegate to
                    recipients[0].value, // total claimable amount
                    proofDeployer, // merkle proof
                    recipients[0].address, // address credit claim to
                ),
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });

        it("owner reclaims all unclaimed tokens", async function () {
            const {
                arcToken,
                arcDst,
                arcAirdrop,
                deployer,
                other,
                recipients,
                merkleTrie,
                blockchainTime,
                frozenLockingVault,
            } = ctxToken;

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));

            expect(await arcDst.communityAirdropSent()).to.be.true;

            // create proof for deployer and other
            const proofDeployer = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[0].address, recipients[0].value]),
            );
            const proofOther = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[1].address, recipients[1].value]),
            );

            // claims
            await expect(
                await arcAirdrop.connect(deployer).claimAndDelegate(
                    recipients[0].value, // amount to claim
                    recipients[0].address, // address to delegate to
                    recipients[0].value, // total claimable amount
                    proofDeployer, // merkle proof
                    recipients[0].address, // address credit claim to
                ),
            )
                .to.emit(arcToken, "Transfer")
                .withArgs(arcAirdrop.address, frozenLockingVault.address, recipients[0].value);

            await expect(
                await arcAirdrop.connect(other).claimAndDelegate(
                    recipients[1].value, // amount to claim
                    recipients[1].address, // address to delegate to
                    recipients[1].value, // total claimable amount
                    proofOther, // merkle proof
                    recipients[1].address, // address credit claim to
                ),
            )
                .to.emit(arcToken, "Transfer")
                .withArgs(arcAirdrop.address, frozenLockingVault.address, recipients[1].value);

            expect(await arcToken.balanceOf(deployer.address)).to.equal(0);
            expect(await arcToken.balanceOf(other.address)).to.equal(0);
            expect(await arcToken.balanceOf(frozenLockingVault.address)).to.equal(
                recipients[0].value.add(recipients[1].value),
            );
            expect(await arcToken.balanceOf(arcAirdrop.address)).to.equal(
                ethers.utils.parseEther("10000000").sub(recipients[0].value).sub(recipients[1].value),
            );

            // advance time past claiming period
            await blockchainTime.increaseTime(3600);

            // reclaim all tokens
            await expect(await arcAirdrop.connect(deployer).reclaim(deployer.address))
                .to.emit(arcToken, "Transfer")
                .withArgs(
                    arcAirdrop.address,
                    deployer.address,
                    ethers.utils.parseEther("10000000").sub(recipients[0].value).sub(recipients[1].value),
                );

            expect(await arcToken.balanceOf(deployer.address)).to.equal(
                ethers.utils.parseEther("10000000").sub(recipients[0].value).sub(recipients[1].value),
            );
        });

        it("non-owner tries to reclaim all unclaimed tokens", async function () {
            const { arcToken, arcDst, arcAirdrop, deployer, other, blockchainTime } = ctxToken;

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcDst.communityAirdropSent()).to.be.true;

            // fast forward to after the end of the airdrop claim period
            await blockchainTime.increaseTime(3600);

            // non-owner tries to reclaim tokens
            await expect(arcAirdrop.connect(other).reclaim(other.address)).to.be.revertedWith("Sender not owner");
        });

        it("owner tries to reclaim tokens before claiming period is over", async function () {
            const { arcToken, arcDst, arcAirdrop, deployer, blockchainTime } = ctxToken;

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcDst.communityAirdropSent()).to.be.true;

            // get airdrop expiration time
            const airdropExpiration = await arcAirdrop.expiration();
            // get current time
            const currentTime = await blockchainTime.secondsFromNow(0);
            expect(airdropExpiration).to.be.greaterThan(currentTime);

            // non-owner tries to reclaim tokens
            await expect(arcAirdrop.connect(deployer).reclaim(deployer.address)).to.be.revertedWith("Not expired");
        });
    });

    describe("Claiming from upgraded locking vault", function () {
        beforeEach(async function () {
            await createSnapshot(provider);

            const { arcToken, arcDst, arcAirdrop, deployer, other, recipients, merkleTrie, frozenLockingVault } =
                ctxToken;

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
            await expect(await arcDst.communityAirdropSent()).to.be.true;

            // create proof for other
            const proofOther = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[1].address, recipients[1].value]),
            );

            // claim and delegate to self
            await expect(
                await arcAirdrop.connect(other).claimAndDelegate(
                    recipients[1].value, // amount to claim
                    recipients[1].address, // address to delegate to
                    recipients[1].value, // total claimable amount
                    proofOther, // merkle proof
                    recipients[1].address, // address credit claim to
                ),
            )
                .to.emit(arcToken, "Transfer")
                .withArgs(arcAirdrop.address, frozenLockingVault.address, recipients[1].value);

            await expect(await arcToken.balanceOf(frozenLockingVault.address)).to.equal(recipients[1].value);
            await expect(await arcToken.balanceOf(arcAirdrop.address)).to.equal(
                ethers.utils.parseEther("10000000").sub(recipients[1].value),
            );
        });
        afterEach(async function () {
            await restoreSnapshot(provider);
        });

        it("user tries to claim before vault is upgraded", async function () {
            const { other, recipients, frozenLockingVault } = ctxToken;

            // user tries to claim before vault is upgraded
            await expect(frozenLockingVault.connect(other).withdraw(recipients[1].value)).to.be.revertedWith("Frozen");
        });

        it("owner upgrades vault", async function () {
            const { arcToken, deployer, simpleProxy, staleBlockNum } = ctxToken;

            // owner upgrades vault
            const lockingVaultFactory = await ethers.getContractFactory("LockingVault");
            const lockingVault = await lockingVaultFactory.deploy(arcToken.address, staleBlockNum);

            await simpleProxy.connect(deployer).upgradeProxy(lockingVault.address);
            await expect(await simpleProxy.proxyImplementation()).to.equal(lockingVault.address);
        });

        it("owner upgrades vault and user claims", async function () {
            const { arcToken, deployer, other, recipients, simpleProxy, staleBlockNum } = ctxToken;

            // deploy new implementation, use same stale block as the frozen vault
            const lockingVaultFactory = await ethers.getContractFactory("LockingVault");
            let lockingVault = await lockingVaultFactory.deploy(arcToken.address, staleBlockNum);

            // owner upgrades vault
            await simpleProxy.connect(deployer).upgradeProxy(lockingVault.address);
            await expect(await simpleProxy.proxyImplementation()).to.equal(lockingVault.address);

            lockingVault = await lockingVault.attach(simpleProxy.address);

            // user claims
            const res = await lockingVault.connect(other).deposits(other.address);
            await expect(res[1]).to.equal(recipients[1].value);

            await expect(await lockingVault.connect(other).withdraw(recipients[1].value))
                .to.emit(arcToken, "Transfer")
                .withArgs(lockingVault.address, other.address, recipients[1].value);

            const res2 = await lockingVault.connect(other).deposits(other.address);
            await expect(res2[1]).to.equal(0);

            await expect(await arcToken.balanceOf(other.address)).to.equal(recipients[1].value);
            await expect(await arcToken.balanceOf(lockingVault.address)).to.equal(0);
        });

        it("mulitple users claim after upgrade", async function () {
            const {
                arcToken,
                arcAirdrop,
                deployer,
                other,
                recipients,
                frozenLockingVault,
                simpleProxy,
                staleBlockNum,
                merkleTrie,
            } = ctxToken;

            // create proof for other
            const proofDeployer = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[0].address, recipients[0].value]),
            );

            // claim and delegate to self
            await expect(
                await arcAirdrop.connect(deployer).claimAndDelegate(
                    recipients[0].value, // amount to claim
                    recipients[0].address, // address to delegate to
                    recipients[0].value, // total claimable amount
                    proofDeployer, // merkle proof
                    recipients[0].address, // address credit claim to
                ),
            )
                .to.emit(arcToken, "Transfer")
                .withArgs(arcAirdrop.address, frozenLockingVault.address, recipients[0].value);

            await expect(await arcToken.balanceOf(frozenLockingVault.address)).to.equal(
                recipients[0].value.add(recipients[1].value),
            );
            await expect(await arcToken.balanceOf(arcAirdrop.address)).to.equal(
                ethers.utils.parseEther("10000000").sub(recipients[0].value).sub(recipients[1].value),
            );

            // deploy new implementation, use same stale block as the frozen vault
            const lockingVaultFactory = await ethers.getContractFactory("LockingVault");
            let lockingVault = await lockingVaultFactory.deploy(arcToken.address, staleBlockNum);

            // owner upgrades vault
            await simpleProxy.connect(deployer).upgradeProxy(lockingVault.address);
            await expect(await simpleProxy.proxyImplementation()).to.equal(lockingVault.address);

            lockingVault = await lockingVault.attach(simpleProxy.address);

            // other claims
            await expect(await lockingVault.connect(other).withdraw(recipients[1].value))
                .to.emit(arcToken, "Transfer")
                .withArgs(lockingVault.address, other.address, recipients[1].value);

            // deployer claims
            await expect(await lockingVault.connect(deployer).withdraw(recipients[0].value))
                .to.emit(arcToken, "Transfer")
                .withArgs(lockingVault.address, deployer.address, recipients[0].value);

            await expect(await arcToken.balanceOf(deployer.address)).to.equal(recipients[0].value);
            await expect(await arcToken.balanceOf(other.address)).to.equal(recipients[1].value);
            await expect(await arcToken.balanceOf(lockingVault.address)).to.equal(0);
        });

        it("user tries to claim more than allotted amount", async function () {
            const { arcToken, deployer, other, recipients, simpleProxy, staleBlockNum } = ctxToken;

            // deploy new implementation, use same stale block as the frozen vault
            const lockingVaultFactory = await ethers.getContractFactory("LockingVault");
            let lockingVault = await lockingVaultFactory.deploy(arcToken.address, staleBlockNum);

            // owner upgrades vault
            await simpleProxy.connect(deployer).upgradeProxy(lockingVault.address);
            await expect(await simpleProxy.proxyImplementation()).to.equal(lockingVault.address);

            lockingVault = await lockingVault.attach(simpleProxy.address);

            // user tries to claim more than allotted amount
            await expect(lockingVault.connect(other).withdraw(recipients[1].value.add(1))).to.be.reverted;

            await expect(await arcToken.balanceOf(other.address)).to.equal(0);
        });

        it("user tries to claim twice", async function () {
            const { arcToken, deployer, other, recipients, frozenLockingVault, simpleProxy, staleBlockNum } = ctxToken;

            // deploy new implementation, use same stale block as the frozen vault
            const lockingVaultFactory = await ethers.getContractFactory("LockingVault");
            let lockingVault = await lockingVaultFactory.deploy(arcToken.address, staleBlockNum);

            // owner upgrades vault
            await simpleProxy.connect(deployer).upgradeProxy(lockingVault.address);
            await expect(await simpleProxy.proxyImplementation()).to.equal(lockingVault.address);

            lockingVault = await lockingVault.attach(simpleProxy.address);

            // user claims
            await expect(await lockingVault.connect(other).withdraw(recipients[1].value))
                .to.emit(arcToken, "Transfer")
                .withArgs(lockingVault.address, other.address, recipients[1].value);
            // user claims again
            await expect(frozenLockingVault.connect(other).withdraw(recipients[1].value)).to.be.reverted;
        });
    });
});
