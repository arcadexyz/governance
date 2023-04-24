import { expect } from "chai";
import { ethers } from "hardhat";

import { TokenTestContext, tokenFixture } from "../utils/tokenFixture";

/**
 * Test suite for the ArcadeToken, ArcadeTokenDistributor, and Airdrop contracts.
 */
describe("ArcadeToken", function () {
    let ctxToken: TokenTestContext;

    beforeEach(async function () {
        ctxToken = await tokenFixture();
    });

    describe("Deployment", function () {
        it("Verify name and symbol of the token", async () => {
            const { arcdToken } = ctxToken;

            expect(await arcdToken.name()).to.equal("Arcade");
            expect(await arcdToken.symbol()).to.equal("ARCD");
        });

        it("Check the initial state of the transfer booleans", async () => {
            const { arcdDst } = ctxToken;

            expect(await arcdDst.treasurySent()).to.be.false;
            expect(await arcdDst.devPartnerSent()).to.be.false;
            expect(await arcdDst.communityRewardsSent()).to.be.false;
            expect(await arcdDst.communityAirdropSent()).to.be.false;
            expect(await arcdDst.vestingTeamSent()).to.be.false;
            expect(await arcdDst.vestingPartnerSent()).to.be.false;
        });

        it("Check the initial supply was minted to the distributor contract", async () => {
            const { arcdToken, arcdDst, deployer } = ctxToken;

            expect(await arcdToken.balanceOf(arcdDst.address)).to.equal(ethers.utils.parseEther("100000000"));
            expect(await arcdToken.balanceOf(deployer.address)).to.equal(0);
            expect(await arcdToken.minter()).to.equal(deployer.address);
        });
    });

    describe("Mint", function () {
        describe("Minter role", function () {
            it("Only the minter contract can mint tokens", async () => {
                const { arcdToken, deployer, other } = ctxToken;

                expect(await arcdToken.minter()).to.equal(deployer.address);
                await expect(arcdToken.connect(other).mint(other.address, 100)).to.be.revertedWith(
                    `AT_MinterNotCaller("${deployer.address}")`,
                );
            });

            it("Only the current minter can set the new minter address", async () => {
                const { arcdToken, deployer, other } = ctxToken;

                await expect(arcdToken.connect(other).setMinter(other.address)).to.be.revertedWith(
                    `AT_MinterNotCaller("${deployer.address}")`,
                );
            });

            it("Minter role sets the new minter address", async () => {
                const { arcdToken, deployer, other } = ctxToken;

                await expect(await arcdToken.connect(deployer).setMinter(other.address))
                    .to.emit(arcdToken, "MinterUpdated")
                    .withArgs(other.address);
                expect(await arcdToken.minter()).to.equal(other.address);
            });

            it("Cannot set the minter address to the zero address", async () => {
                const { arcdToken, deployer } = ctxToken;

                await expect(arcdToken.connect(deployer).setMinter(ethers.constants.AddressZero)).to.be.revertedWith(
                    "AT_ZeroAddress()",
                );
            });
        });

        describe("Minting tokens", function () {
            it("Cannot mint before start time", async () => {
                const { arcdToken, deployer, other } = ctxToken;

                await expect(arcdToken.connect(deployer).mint(other.address, 100)).to.be.reverted;
            });

            it("Can mint after start time", async () => {
                const { arcdToken, deployer, other, blockchainTime } = ctxToken;

                await blockchainTime.increaseTime(3600 * 24 * 365);

                await arcdToken.connect(deployer).mint(other.address, 100);

                expect(await arcdToken.balanceOf(other.address)).to.equal(100);
            });

            it("multiple mints", async () => {
                const { arcdToken, deployer, other, blockchainTime } = ctxToken;

                await blockchainTime.increaseTime(3600 * 24 * 365);

                await arcdToken.connect(deployer).mint(other.address, 100);

                await blockchainTime.increaseTime(3600 * 24 * 365);

                await arcdToken.connect(deployer).mint(other.address, 100);

                expect(await arcdToken.balanceOf(other.address)).to.equal(200);
            });

            it("Cannot mint to the zero address", async () => {
                const { arcdToken, deployer, blockchainTime } = ctxToken;

                await blockchainTime.increaseTime(3600 * 24 * 365);

                await expect(arcdToken.connect(deployer).mint(ethers.constants.AddressZero, 100)).to.be.revertedWith(
                    "AT_ZeroAddress()",
                );
            });

            it("Cannot mint amount of zero tokens", async () => {
                const { arcdToken, deployer, other, blockchainTime } = ctxToken;

                await blockchainTime.increaseTime(3600 * 24 * 365);

                await expect(arcdToken.connect(deployer).mint(other.address, 0)).to.be.revertedWith(
                    "AT_ZeroMintAmount()",
                );
            });

            it("Cannot mint more than the max supply", async () => {
                const { arcdToken, deployer, other, blockchainTime } = ctxToken;

                await blockchainTime.increaseTime(3600 * 24 * 365);

                const _totalSupply = await arcdToken.connect(deployer).totalSupply();
                await expect(
                    arcdToken.connect(deployer).mint(other.address, _totalSupply.mul(2).div(100).add(1)),
                ).to.be.revertedWith(
                    `AT_MintingCapExceeded(${_totalSupply}, ${_totalSupply.mul(2).div(100)}, ${_totalSupply
                        .mul(2)
                        .div(100)
                        .add(1)})`,
                );
            });

            it("Must wait minimum wait duration between mints", async () => {
                const { arcdToken, deployer, other, blockchainTime } = ctxToken;

                await blockchainTime.increaseTime(3600 * 24 * 365);

                await arcdToken.connect(deployer).mint(other.address, 100);
                await blockchainTime.increaseTime(3600);
                await expect(arcdToken.connect(deployer).mint(other.address, 100)).to.be.reverted;
            });

            it("Can mint max tokens after minimum wait duration", async () => {
                const { arcdToken, deployer, other, blockchainTime } = ctxToken;

                await blockchainTime.increaseTime(3600 * 24 * 365);

                let amountAvailableToMint = await arcdToken.connect(other).totalSupply();
                expect(amountAvailableToMint.mul(2).div(100)).to.equal(ethers.utils.parseEther("2000000"));
                await arcdToken.connect(deployer).mint(other.address, amountAvailableToMint.mul(2).div(100));

                await blockchainTime.increaseTime(3600 * 24 * 365);

                amountAvailableToMint = await arcdToken.connect(other).totalSupply();
                expect(amountAvailableToMint.mul(2).div(100)).to.equal(ethers.utils.parseEther("2040000"));
                await arcdToken.connect(deployer).mint(other.address, amountAvailableToMint.mul(2).div(100));

                expect(await arcdToken.balanceOf(other.address)).to.equal(ethers.utils.parseEther("4040000"));
            });
        });
    });

    describe("ArcadeToken Distribution", function () {
        it("Dst contract owner distributes each token allocation", async () => {
            const {
                arcdToken,
                arcdDst,
                deployer,
                treasury,
                devPartner,
                communityRewardsPool,
                arcAirdrop,
                vestingTeamMultisig,
                vestingPartner,
            } = ctxToken;

            await arcdDst.connect(deployer).setToken(arcdToken.address);
            expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

            await expect(await arcdDst.connect(deployer).toTreasury(treasury.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, treasury.address, ethers.utils.parseEther("25500000"));
            await expect(await arcdDst.connect(deployer).toDevPartner(devPartner.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, devPartner.address, ethers.utils.parseEther("600000"));
            await expect(await arcdDst.connect(deployer).toCommunityRewards(communityRewardsPool.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, communityRewardsPool.address, ethers.utils.parseEther("15000000"));
            await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
            await expect(await arcdDst.connect(deployer).toPartnerVesting(vestingPartner.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, vestingPartner.address, ethers.utils.parseEther("32700000"));
            await expect(await arcdDst.connect(deployer).toTeamVesting(vestingTeamMultisig.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, vestingTeamMultisig.address, ethers.utils.parseEther("16200000"));

            expect(await arcdDst.treasurySent()).to.be.true;
            expect(await arcdDst.devPartnerSent()).to.be.true;
            expect(await arcdDst.communityRewardsSent()).to.be.true;
            expect(await arcdDst.communityAirdropSent()).to.be.true;
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;

            expect(await arcdToken.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("25500000"));
            expect(await arcdToken.balanceOf(devPartner.address)).to.equal(ethers.utils.parseEther("600000"));
            expect(await arcdToken.balanceOf(communityRewardsPool.address)).to.equal(
                ethers.utils.parseEther("15000000"),
            );
            expect(await arcdToken.balanceOf(arcAirdrop.address)).to.equal(ethers.utils.parseEther("10000000"));
            expect(await arcdToken.balanceOf(vestingPartner.address)).to.equal(ethers.utils.parseEther("32700000"));
            expect(await arcdToken.balanceOf(vestingTeamMultisig.address)).to.equal(
                ethers.utils.parseEther("16200000"),
            );

            expect(await arcdToken.balanceOf(arcdDst.address)).to.equal(0);

            expect(await arcdToken.totalSupply()).to.equal(ethers.utils.parseEther("100000000"));
        });

        it("Cannot distribute to the zero address", async () => {
            const { arcdToken, arcdDst, deployer } = ctxToken;

            await arcdDst.connect(deployer).setToken(arcdToken.address);

            await expect(arcdDst.connect(deployer).toTreasury(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()",
            );
            await expect(arcdDst.connect(deployer).toDevPartner(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()",
            );
            await expect(arcdDst.connect(deployer).toCommunityRewards(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()",
            );
            await expect(arcdDst.connect(deployer).toCommunityAirdrop(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()",
            );
            await expect(arcdDst.connect(deployer).toTeamVesting(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()",
            );
            await expect(arcdDst.connect(deployer).toPartnerVesting(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()",
            );

            // owner tries to set the token address to the zero address
            await expect(arcdDst.connect(deployer).setToken(ethers.constants.AddressZero)).to.be.revertedWith(
                "AT_ZeroAddress()",
            );
        });

        it("Verifies all transfer functions can only be called by the contract owner", async () => {
            const {
                arcdToken,
                arcdDst,
                deployer,
                other,
                treasury,
                devPartner,
                communityRewardsPool,
                arcAirdrop,
                vestingTeamMultisig,
                vestingPartner,
            } = ctxToken;

            await arcdDst.connect(deployer).setToken(arcdToken.address);

            await expect(arcdDst.connect(other).toTreasury(treasury.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcdDst.connect(other).toDevPartner(devPartner.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcdDst.connect(other).toCommunityRewards(communityRewardsPool.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcdDst.connect(other).toCommunityAirdrop(arcAirdrop.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcdDst.connect(other).toTeamVesting(vestingTeamMultisig.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcdDst.connect(other).toPartnerVesting(vestingPartner.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );

            // 3rd party tries to set the token address
            await expect(arcdDst.connect(other).setToken(arcdToken.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
        });

        it("Verifies all transfer functions can only be called once by contract owner", async () => {
            const {
                arcdToken,
                arcdDst,
                deployer,
                treasury,
                devPartner,
                communityRewardsPool,
                arcAirdrop,
                vestingTeamMultisig,
                vestingPartner,
            } = ctxToken;

            await arcdDst.connect(deployer).setToken(arcdToken.address);

            await arcdDst.connect(deployer).toTreasury(treasury.address);
            await arcdDst.connect(deployer).toDevPartner(devPartner.address);
            await arcdDst.connect(deployer).toCommunityRewards(communityRewardsPool.address);
            await arcdDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address);
            await arcdDst.connect(deployer).toTeamVesting(vestingTeamMultisig.address);
            await arcdDst.connect(deployer).toPartnerVesting(vestingPartner.address);

            await expect(arcdDst.connect(deployer).toTreasury(treasury.address)).to.be.revertedWith("AT_AlreadySent()");
            await expect(arcdDst.connect(deployer).toDevPartner(devPartner.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(arcdDst.connect(deployer).toCommunityRewards(communityRewardsPool.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(arcdDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(arcdDst.connect(deployer).toTeamVesting(vestingTeamMultisig.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(arcdDst.connect(deployer).toPartnerVesting(vestingPartner.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
        });
    });

    describe("ArcadeToken Airdrop", () => {
        it("all recipients claim airdrop and delegate to themselves", async function () {
            const { arcdToken, arcdDst, arcAirdrop, deployer, other, recipients, merkleTrie, frozenLockingVault } =
                ctxToken;

            await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcdDst.communityAirdropSent()).to.be.true;

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
                    recipients[0].address, // address to delegate voting power to
                    recipients[0].value, // total claimable amount
                    proofDeployer, // merkle proof
                ),
            )
                .to.emit(arcdToken, "Transfer")
                .withArgs(arcAirdrop.address, frozenLockingVault.address, recipients[0].value);

            await expect(
                await arcAirdrop.connect(other).claimAndDelegate(
                    recipients[1].address, // address to delegate voting power to
                    recipients[1].value, // total claimable amount
                    proofOther, // merkle proof
                ),
            )
                .to.emit(arcdToken, "Transfer")
                .withArgs(arcAirdrop.address, frozenLockingVault.address, recipients[1].value);

            expect(await arcdToken.balanceOf(frozenLockingVault.address)).to.equal(
                recipients[0].value.add(recipients[1].value),
            );
            expect(await arcdToken.balanceOf(arcAirdrop.address)).to.equal(
                ethers.utils.parseEther("10000000").sub(recipients[0].value).sub(recipients[1].value),
            );
            expect(await arcdToken.balanceOf(recipients[0].address)).to.equal(0);
        });

        it("user tries to claim airdrop with invalid proof", async function () {
            const { arcdToken, arcdDst, arcAirdrop, deployer, other, recipients, merkleTrie } = ctxToken;

            await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcdDst.communityAirdropSent()).to.be.true;

            // create proof for deployer and other
            const proofNotUser = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[0].address, recipients[0].value]),
            );
            // try to claim with invalid proof
            await expect(
                arcAirdrop.connect(other).claimAndDelegate(
                    other.address, // address to delegate to
                    recipients[0].value, // total claimable amount
                    proofNotUser, // invalid merkle proof
                ),
            ).to.be.revertedWith("AA_NonParticipant()");
        });

        it("user tries to claim airdrop twice", async function () {
            const { arcdToken, arcdDst, arcAirdrop, deployer, recipients, merkleTrie, frozenLockingVault } = ctxToken;

            await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcdDst.communityAirdropSent()).to.be.true;

            // create proof for deployer and other
            const proofDeployer = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[0].address, recipients[0].value]),
            );

            // claim and delegate to self
            await expect(
                arcAirdrop.connect(deployer).claimAndDelegate(
                    recipients[0].address, // address to delegate to
                    recipients[0].value, // total claimable amount
                    proofDeployer, // merkle proof
                ),
            )
                .to.emit(arcdToken, "Transfer")
                .withArgs(arcAirdrop.address, frozenLockingVault.address, recipients[0].value);

            // try to claim again
            await expect(
                arcAirdrop.connect(deployer).claimAndDelegate(
                    recipients[0].address, // address to delegate to
                    recipients[0].value, // total claimable amount
                    proofDeployer, // merkle proof
                ),
            ).to.be.revertedWith("AA_AlreadyClaimed()");
        });

        it("user tries to claim airdrop after expiration", async function () {
            const { arcdToken, arcdDst, arcAirdrop, deployer, recipients, merkleTrie, blockchainTime } = ctxToken;

            await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcdDst.communityAirdropSent()).to.be.true;

            // fast forward to after the end of the airdrop claim period
            await blockchainTime.increaseTime(3600);

            // owner reclaims tokens
            await expect(await arcAirdrop.connect(deployer).reclaim(deployer.address))
                .to.emit(arcdToken, "Transfer")
                .withArgs(arcAirdrop.address, deployer.address, ethers.utils.parseEther("10000000"));

            // create proof for deployer
            const proofDeployer = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[0].address, recipients[0].value]),
            );

            // claims
            await expect(
                arcAirdrop.connect(deployer).claimAndDelegate(
                    recipients[0].address, // address to delegate to
                    recipients[0].value, // total claimable amount
                    proofDeployer, // merkle proof
                ),
            ).to.be.revertedWith("AA_ClaimingExpired()");
        });

        it("owner reclaims all unclaimed tokens", async function () {
            const {
                arcdToken,
                arcdDst,
                arcAirdrop,
                deployer,
                other,
                recipients,
                merkleTrie,
                blockchainTime,
                frozenLockingVault,
            } = ctxToken;

            await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));

            expect(await arcdDst.communityAirdropSent()).to.be.true;

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
                    recipients[0].address, // address to delegate to
                    recipients[0].value, // total claimable amount
                    proofDeployer, // merkle proof
                ),
            )
                .to.emit(arcdToken, "Transfer")
                .withArgs(arcAirdrop.address, frozenLockingVault.address, recipients[0].value);

            await expect(
                await arcAirdrop.connect(other).claimAndDelegate(
                    recipients[1].address, // address to delegate to
                    recipients[1].value, // total claimable amount
                    proofOther, // merkle proof
                ),
            )
                .to.emit(arcdToken, "Transfer")
                .withArgs(arcAirdrop.address, frozenLockingVault.address, recipients[1].value);

            expect(await arcdToken.balanceOf(deployer.address)).to.equal(0);
            expect(await arcdToken.balanceOf(other.address)).to.equal(0);
            expect(await arcdToken.balanceOf(frozenLockingVault.address)).to.equal(
                recipients[0].value.add(recipients[1].value),
            );
            expect(await arcdToken.balanceOf(arcAirdrop.address)).to.equal(
                ethers.utils.parseEther("10000000").sub(recipients[0].value).sub(recipients[1].value),
            );

            // advance time past claiming period
            await blockchainTime.increaseTime(3600);

            // reclaim all tokens
            await expect(await arcAirdrop.connect(deployer).reclaim(deployer.address))
                .to.emit(arcdToken, "Transfer")
                .withArgs(
                    arcAirdrop.address,
                    deployer.address,
                    ethers.utils.parseEther("10000000").sub(recipients[0].value).sub(recipients[1].value),
                );

            expect(await arcdToken.balanceOf(deployer.address)).to.equal(
                ethers.utils.parseEther("10000000").sub(recipients[0].value).sub(recipients[1].value),
            );
        });

        it("non-owner tries to reclaim all unclaimed tokens", async function () {
            const { arcdToken, arcdDst, arcAirdrop, deployer, other, blockchainTime } = ctxToken;

            await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcdDst.communityAirdropSent()).to.be.true;

            // fast forward to after the end of the airdrop claim period
            await blockchainTime.increaseTime(3600);

            // non-owner tries to reclaim tokens
            await expect(arcAirdrop.connect(other).reclaim(other.address)).to.be.revertedWith("Sender not owner");
        });

        it("owner tries to reclaim tokens before claiming period is over", async function () {
            const { arcdToken, arcdDst, arcAirdrop, deployer, blockchainTime } = ctxToken;

            await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcdDst.communityAirdropSent()).to.be.true;

            // get airdrop expiration time
            const airdropExpiration = await arcAirdrop.expiration();
            // get current time
            const currentTime = await blockchainTime.secondsFromNow(0);
            expect(airdropExpiration).to.be.greaterThan(currentTime);

            // non-owner tries to reclaim tokens
            await expect(arcAirdrop.connect(deployer).reclaim(deployer.address)).to.be.revertedWith(
                "AA_ClaimingNotExpired()",
            );
        });

        it("owner changes merkle root", async function () {
            const { arcAirdrop, deployer } = ctxToken;

            // owner changes merkle root
            const newMerkleRoot = ethers.utils.solidityKeccak256(["bytes32"], [ethers.utils.randomBytes(32)]);
            await expect(await arcAirdrop.connect(deployer).setMerkleRoot(newMerkleRoot));
            expect(await arcAirdrop.rewardsRoot()).to.equal(newMerkleRoot);
        });

        it("non-owner tries to set a new merkle root", async function () {
            const { arcAirdrop, other } = ctxToken;

            // non-owner tries to change merkle root
            const newMerkleRoot = ethers.utils.solidityKeccak256(["bytes32"], [ethers.utils.randomBytes(32)]);
            await expect(arcAirdrop.connect(other).setMerkleRoot(newMerkleRoot)).to.be.revertedWith("Sender not owner");
        });
    });

    describe("Claiming from upgraded locking vault", function () {
        beforeEach(async function () {
            const { arcdToken, arcdDst, arcAirdrop, deployer, other, recipients, merkleTrie, frozenLockingVault } =
                ctxToken;

            await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcAirdrop.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, arcAirdrop.address, ethers.utils.parseEther("10000000"));
            await expect(await arcdDst.communityAirdropSent()).to.be.true;

            // create proof for other
            const proofOther = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[1].address, recipients[1].value]),
            );

            // claim and delegate to self
            await expect(
                await arcAirdrop.connect(other).claimAndDelegate(
                    recipients[1].address, // address to delegate to
                    recipients[1].value, // total claimable amount
                    proofOther, // merkle proof
                ),
            )
                .to.emit(arcdToken, "Transfer")
                .withArgs(arcAirdrop.address, frozenLockingVault.address, recipients[1].value);

            await expect(await arcdToken.balanceOf(frozenLockingVault.address)).to.equal(recipients[1].value);
            await expect(await arcdToken.balanceOf(arcAirdrop.address)).to.equal(
                ethers.utils.parseEther("10000000").sub(recipients[1].value),
            );
        });

        it("user tries to withdraw from frozen vault", async function () {
            const { other, recipients, frozenLockingVault } = ctxToken;

            // user tries to claim before vault is upgraded
            await expect(frozenLockingVault.connect(other).withdraw(recipients[1].value)).to.be.revertedWith(
                "FLV_WithdrawsFrozen()",
            );
        });

        it("owner upgrades vault", async function () {
            const { arcdToken, deployer, simpleProxy, staleBlockNum } = ctxToken;

            // owner upgrades vault
            const lockingVaultFactory = await ethers.getContractFactory("LockingVault");
            const lockingVault = await lockingVaultFactory.deploy(arcdToken.address, staleBlockNum);

            await simpleProxy.connect(deployer).upgradeProxy(lockingVault.address);
            await expect(await simpleProxy.proxyImplementation()).to.equal(lockingVault.address);
        });

        it("multiple users withdraw after vault upgrade", async function () {
            const {
                arcdToken,
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
                    recipients[0].address, // address to delegate to
                    recipients[0].value, // total claimable amount
                    proofDeployer, // merkle proof
                ),
            )
                .to.emit(arcdToken, "Transfer")
                .withArgs(arcAirdrop.address, frozenLockingVault.address, recipients[0].value);

            await expect(await arcdToken.balanceOf(frozenLockingVault.address)).to.equal(
                recipients[0].value.add(recipients[1].value),
            );
            await expect(await arcdToken.balanceOf(arcAirdrop.address)).to.equal(
                ethers.utils.parseEther("10000000").sub(recipients[0].value).sub(recipients[1].value),
            );

            // deploy new implementation, use same stale block as the frozen vault
            const lockingVaultFactory = await ethers.getContractFactory("LockingVault");
            let lockingVault = await lockingVaultFactory.deploy(arcdToken.address, staleBlockNum);

            // owner upgrades vault
            await simpleProxy.connect(deployer).upgradeProxy(lockingVault.address);
            lockingVault = await lockingVault.attach(simpleProxy.address);

            // other claims
            await expect(await lockingVault.connect(other).withdraw(recipients[1].value))
                .to.emit(arcdToken, "Transfer")
                .withArgs(lockingVault.address, other.address, recipients[1].value);

            // deployer claims
            await expect(await lockingVault.connect(deployer).withdraw(recipients[0].value))
                .to.emit(arcdToken, "Transfer")
                .withArgs(lockingVault.address, deployer.address, recipients[0].value);

            await expect(await arcdToken.balanceOf(deployer.address)).to.equal(recipients[0].value);
            await expect(await arcdToken.balanceOf(other.address)).to.equal(recipients[1].value);
            await expect(await arcdToken.balanceOf(lockingVault.address)).to.equal(0);
        });

        it("user tries to withdraw more than allotted amount", async function () {
            const { arcdToken, deployer, other, recipients, simpleProxy, staleBlockNum } = ctxToken;

            // deploy new implementation, use same stale block as the frozen vault
            const lockingVaultFactory = await ethers.getContractFactory("LockingVault");
            let lockingVault = await lockingVaultFactory.deploy(arcdToken.address, staleBlockNum);

            // owner upgrades vault
            await simpleProxy.connect(deployer).upgradeProxy(lockingVault.address);
            lockingVault = await lockingVault.attach(simpleProxy.address);

            // user tries to claim more than allotted amount
            await expect(lockingVault.connect(other).withdraw(recipients[1].value.add(1))).to.be.reverted;

            await expect(await arcdToken.balanceOf(other.address)).to.equal(0);
        });

        it("user tries to withdraw twice", async function () {
            const { arcdToken, deployer, other, recipients, frozenLockingVault, simpleProxy, staleBlockNum } = ctxToken;

            // deploy new implementation, use same stale block as the frozen vault
            const lockingVaultFactory = await ethers.getContractFactory("LockingVault");
            let lockingVault = await lockingVaultFactory.deploy(arcdToken.address, staleBlockNum);

            // owner upgrades vault
            await simpleProxy.connect(deployer).upgradeProxy(lockingVault.address);
            lockingVault = await lockingVault.attach(simpleProxy.address);

            // user claims
            await expect(await lockingVault.connect(other).withdraw(recipients[1].value))
                .to.emit(arcdToken, "Transfer")
                .withArgs(lockingVault.address, other.address, recipients[1].value);
            // user claims again
            await expect(frozenLockingVault.connect(other).withdraw(recipients[1].value)).to.be.reverted;
        });
    });
});
