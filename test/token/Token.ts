import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { AirdropSeason1, MockSingleSidedStaking } from "../../src/types";
import { deploy } from "../utils/deploy";
import { Account, getMerkleTree } from "../utils/external/council/helpers/merkle";
import { TestContextToken, tokenFixture } from "../utils/tokenFixture";

const { loadFixture } = waffle;
/**
 * Test suite for the ArcadeToken, ArcadeTokenDistributor, and Airdrop contracts.
 */
describe("ArcadeToken", function () {
    let ctxToken: TestContextToken;
    let fixtureToken: () => Promise<TestContextToken>;
    const totalAirdropAmount = ethers.utils.parseEther("6000000");

    beforeEach(async function () {
        fixtureToken = await loadFixture(tokenFixture);
        ctxToken = await fixtureToken();
    });

    describe("Deployment", function () {
        it("Verify name and symbol of the token", async () => {
            const { arcdToken } = ctxToken;

            expect(await arcdToken.name()).to.equal("Arcade");
            expect(await arcdToken.symbol()).to.equal("ARCD");
        });

        it("Check the initial state of the transfer booleans", async () => {
            const { arcdDst } = ctxToken;

            expect(await arcdDst.governanceTreasurySent()).to.be.false;
            expect(await arcdDst.foundationTreasurySent()).to.be.false;
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

        it("Invalid ArcadeToken deployment parameters", async () => {
            const { deployer } = ctxToken;

            await expect(
                deploy("ArcadeToken", deployer, [deployer.address, ethers.constants.AddressZero]),
            ).to.be.revertedWith(`AT_ZeroAddress("initialDistribution")`);

            await expect(
                deploy("ArcadeToken", deployer, [ethers.constants.AddressZero, deployer.address]),
            ).to.be.revertedWith(`AT_ZeroAddress("minter")`);
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
                    `AT_ZeroAddress("newMinter")`,
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
                    `AT_ZeroAddress("to")`,
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
                govTreasury,
                foundationTreasury,
                devPartner,
                communityRewardsPool,
                arcdAirdrop,
                vestingTeamMultisig,
                vestingPartner,
            } = ctxToken;

            await expect(await arcdDst.connect(deployer).toGovernanceTreasury(govTreasury.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, govTreasury.address, ethers.utils.parseEther("25499484"));
            await expect(await arcdDst.connect(deployer).toFoundationTreasury(foundationTreasury.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, foundationTreasury.address, ethers.utils.parseEther("10000000"));
            await expect(await arcdDst.connect(deployer).toDevPartner(devPartner.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, devPartner.address, ethers.utils.parseEther("1081284"));
            await expect(await arcdDst.connect(deployer).toCommunityRewards(communityRewardsPool.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, communityRewardsPool.address, ethers.utils.parseEther("9000000"));
            await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcdAirdrop.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, arcdAirdrop.address, ethers.utils.parseEther("6000000"));
            await expect(await arcdDst.connect(deployer).toPartnerVesting(vestingPartner.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, vestingPartner.address, ethers.utils.parseEther("32872762"));
            await expect(await arcdDst.connect(deployer).toTeamVesting(vestingTeamMultisig.address))
                .to.emit(arcdDst, "Distribute")
                .withArgs(arcdToken.address, vestingTeamMultisig.address, ethers.utils.parseEther("15546470"));

            expect(await arcdDst.governanceTreasurySent()).to.be.true;
            expect(await arcdDst.foundationTreasurySent()).to.be.true;
            expect(await arcdDst.devPartnerSent()).to.be.true;
            expect(await arcdDst.communityRewardsSent()).to.be.true;
            expect(await arcdDst.communityAirdropSent()).to.be.true;
            expect(await arcdDst.vestingTeamSent()).to.be.true;
            expect(await arcdDst.vestingPartnerSent()).to.be.true;

            expect(await arcdToken.balanceOf(govTreasury.address)).to.equal(ethers.utils.parseEther("25499484"));
            expect(await arcdToken.balanceOf(foundationTreasury.address)).to.equal(ethers.utils.parseEther("10000000"));
            expect(await arcdToken.balanceOf(devPartner.address)).to.equal(ethers.utils.parseEther("1081284"));
            expect(await arcdToken.balanceOf(communityRewardsPool.address)).to.equal(
                ethers.utils.parseEther("9000000"),
            );
            expect(await arcdToken.balanceOf(arcdAirdrop.address)).to.equal(ethers.utils.parseEther("6000000"));
            expect(await arcdToken.balanceOf(vestingPartner.address)).to.equal(ethers.utils.parseEther("32872762"));
            expect(await arcdToken.balanceOf(vestingTeamMultisig.address)).to.equal(
                ethers.utils.parseEther("15546470"),
            );

            expect(await arcdToken.balanceOf(arcdDst.address)).to.equal(0);

            expect(await arcdToken.totalSupply()).to.equal(ethers.utils.parseEther("100000000"));
        });

        it("Cannot distribute to the zero address", async () => {
            const { arcdDst, deployer } = ctxToken;

            await expect(
                arcdDst.connect(deployer).toGovernanceTreasury(ethers.constants.AddressZero),
            ).to.be.revertedWith(`AT_ZeroAddress("govTreasury")`);
            await expect(
                arcdDst.connect(deployer).toFoundationTreasury(ethers.constants.AddressZero),
            ).to.be.revertedWith(`AT_ZeroAddress("foundationTreasury")`);
            await expect(arcdDst.connect(deployer).toDevPartner(ethers.constants.AddressZero)).to.be.revertedWith(
                `AT_ZeroAddress("devPartner")`,
            );
            await expect(arcdDst.connect(deployer).toCommunityRewards(ethers.constants.AddressZero)).to.be.revertedWith(
                `AT_ZeroAddress("communityRewards")`,
            );
            await expect(arcdDst.connect(deployer).toCommunityAirdrop(ethers.constants.AddressZero)).to.be.revertedWith(
                `AT_ZeroAddress("communityAirdrop")`,
            );
            await expect(arcdDst.connect(deployer).toTeamVesting(ethers.constants.AddressZero)).to.be.revertedWith(
                `AT_ZeroAddress("vestingTeam")`,
            );
            await expect(arcdDst.connect(deployer).toPartnerVesting(ethers.constants.AddressZero)).to.be.revertedWith(
                `AT_ZeroAddress("vestingPartner")`,
            );

            // owner tries to set the token address to the zero address
            await expect(arcdDst.connect(deployer).setToken(ethers.constants.AddressZero)).to.be.revertedWith(
                `AT_ZeroAddress("arcadeToken")`,
            );
        });

        it("Cannot distribute before token is set", async () => {
            const { deployer } = ctxToken;

            // get distributor contract factory
            const arcdDistFact = await ethers.getContractFactory("ArcadeTokenDistributor");
            const arcdDst = await arcdDistFact.deploy();
            await arcdDst.deployed();

            // call all the distribution functions
            await expect(arcdDst.toGovernanceTreasury(deployer.address)).to.be.revertedWith(
                `AT_ZeroAddress("arcadeToken")`,
            );

            await expect(arcdDst.toFoundationTreasury(deployer.address)).to.be.revertedWith(
                `AT_ZeroAddress("arcadeToken")`,
            );

            await expect(arcdDst.toDevPartner(deployer.address)).to.be.revertedWith(`AT_ZeroAddress("arcadeToken")`);

            await expect(arcdDst.toCommunityRewards(deployer.address)).to.be.revertedWith(
                `AT_ZeroAddress("arcadeToken")`,
            );

            await expect(arcdDst.toCommunityAirdrop(deployer.address)).to.be.revertedWith(
                `AT_ZeroAddress("arcadeToken")`,
            );

            await expect(arcdDst.toTeamVesting(deployer.address)).to.be.revertedWith(`AT_ZeroAddress("arcadeToken")`);

            await expect(arcdDst.toPartnerVesting(deployer.address)).to.be.revertedWith(
                `AT_ZeroAddress("arcadeToken")`,
            );
        });

        it("Verifies all transfer functions can only be called by the contract owner", async () => {
            const {
                arcdToken,
                arcdDst,
                other,
                govTreasury,
                foundationTreasury,
                devPartner,
                communityRewardsPool,
                arcdAirdrop,
                vestingTeamMultisig,
                vestingPartner,
            } = ctxToken;

            await expect(arcdDst.connect(other).toGovernanceTreasury(govTreasury.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcdDst.connect(other).toFoundationTreasury(foundationTreasury.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcdDst.connect(other).toDevPartner(devPartner.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcdDst.connect(other).toCommunityRewards(communityRewardsPool.address)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
            await expect(arcdDst.connect(other).toCommunityAirdrop(arcdAirdrop.address)).to.be.revertedWith(
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
                arcdDst,
                deployer,
                govTreasury,
                foundationTreasury,
                devPartner,
                communityRewardsPool,
                arcdAirdrop,
                vestingTeamMultisig,
                vestingPartner,
            } = ctxToken;

            await arcdDst.connect(deployer).toGovernanceTreasury(govTreasury.address);
            await arcdDst.connect(deployer).toFoundationTreasury(foundationTreasury.address);
            await arcdDst.connect(deployer).toDevPartner(devPartner.address);
            await arcdDst.connect(deployer).toCommunityRewards(communityRewardsPool.address);
            await arcdDst.connect(deployer).toCommunityAirdrop(arcdAirdrop.address);
            await arcdDst.connect(deployer).toTeamVesting(vestingTeamMultisig.address);
            await arcdDst.connect(deployer).toPartnerVesting(vestingPartner.address);

            await expect(arcdDst.connect(deployer).toGovernanceTreasury(govTreasury.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(arcdDst.connect(deployer).toFoundationTreasury(foundationTreasury.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(arcdDst.connect(deployer).toDevPartner(devPartner.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(arcdDst.connect(deployer).toCommunityRewards(communityRewardsPool.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(arcdDst.connect(deployer).toCommunityAirdrop(arcdAirdrop.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(arcdDst.connect(deployer).toTeamVesting(vestingTeamMultisig.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
            await expect(arcdDst.connect(deployer).toPartnerVesting(vestingPartner.address)).to.be.revertedWith(
                "AT_AlreadySent()",
            );
        });

        it("Cannot set new token address more than once", async () => {
            const { arcdToken, arcdDst, deployer } = ctxToken;

            await expect(arcdDst.connect(deployer).setToken(arcdToken.address)).to.be.revertedWith(
                "AT_TokenAlreadySet()",
            );
        });
    });

    describe("ArcadeToken Airdrop", () => {
        describe("AirdropSeason0", function () {
            it("Verify the deployer is the owner of AirdropSeason0", async () => {
                const { arcdToken, deployer, merkleTrie, expiration, other } = ctxToken;

                const governanceAddress = other.address;

                const arcadeAirdropContract = await deploy("AirdropSeason0", deployer, [
                    arcdToken.address,
                    merkleTrie.getHexRoot(),
                    expiration,
                    deployer.address,
                ]);

                // query owner of airdropSeason0
                const arcadeAirdropOwner = await arcadeAirdropContract.owner();

                // confirm that the returned owner is the address assigned in the constructor
                expect(arcadeAirdropOwner).to.equal(deployer.address);

                // deployer transfers ownership to governance address
                await arcadeAirdropContract.setOwner(governanceAddress);

                // query owner of airdropSeason0
                const arcadeAirdropOwnerAfterTransfer = await arcadeAirdropContract.owner();

                // confirm that the returned owner is governance address
                expect(arcadeAirdropOwnerAfterTransfer).to.equal(governanceAddress);
            });

            it("Invalid AirdropSeason0 deployment parameters", async () => {
                const { arcdToken, deployer, merkleTrie, expiration } = ctxToken;

                // get current block number
                const currentBlock = 10;

                await expect(
                    deploy("AirdropSeason0", deployer, [
                        arcdToken.address,
                        merkleTrie.getHexRoot(),
                        expiration,
                        ethers.constants.AddressZero,
                    ]),
                ).to.be.revertedWith(`AA_ZeroAddress("votingVault")`);

                await expect(
                    deploy("AirdropSeason0", deployer, [
                        ethers.constants.AddressZero,
                        merkleTrie.getHexRoot(),
                        expiration,
                        deployer.address,
                    ]),
                ).to.be.revertedWith(`AA_ZeroAddress("token")`);

                await expect(
                    deploy("AirdropSeason0", deployer, [
                        arcdToken.address,
                        merkleTrie.getHexRoot(),
                        currentBlock,
                        deployer.address,
                    ]),
                ).to.be.revertedWith(`AA_ClaimingExpired()`);

                await expect(
                    deploy("AirdropSeason0", deployer, [
                        arcdToken.address,
                        merkleTrie.getHexRoot(),
                        currentBlock - 5,
                        deployer.address,
                    ]),
                ).to.be.revertedWith(`AA_ClaimingExpired()`);
            });

            it("all recipients claim airdrop and delegate to themselves", async function () {
                const {
                    arcdToken,
                    arcdDst,
                    arcdAirdrop,
                    deployer,
                    other,
                    other2,
                    recipients,
                    merkleTrie,
                    mockNFTBoostVault,
                    root,
                } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcdAirdrop.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, arcdAirdrop.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );
                const proofOther = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[1].address, recipients[1].value],
                    ),
                );
                const proofOther2 = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[2].address, recipients[2].value],
                    ),
                );

                expect(await arcdAirdrop.getClaimed(recipients[0].address, root)).to.equal(0);
                expect(await arcdAirdrop.getClaimed(recipients[1].address, root)).to.equal(0);
                expect(await arcdAirdrop.getClaimed(recipients[2].address, root)).to.equal(0);

                // claim and delegate to self
                await expect(
                    await arcdAirdrop.connect(deployer).claimAndDelegate(
                        recipients[0].address, // address to delegate voting power to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(arcdAirdrop.address, mockNFTBoostVault.address, recipients[0].value);

                await expect(
                    await arcdAirdrop.connect(other).claimAndDelegate(
                        recipients[1].address, // address to delegate voting power to
                        recipients[1].value, // total claimable amount
                        proofOther, // merkle proof
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(arcdAirdrop.address, mockNFTBoostVault.address, recipients[1].value);
                await expect(
                    await arcdAirdrop.connect(other2).claimAndDelegate(
                        recipients[2].address, // address to delegate voting power to
                        recipients[2].value, // total claimable amount
                        proofOther2, // merkle proof
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(arcdAirdrop.address, mockNFTBoostVault.address, recipients[2].value);

                expect(await arcdToken.balanceOf(mockNFTBoostVault.address)).to.equal(
                    recipients[0].value.add(recipients[1].value).add(recipients[2].value),
                );
                expect(await arcdToken.balanceOf(arcdAirdrop.address)).to.equal(
                    totalAirdropAmount.sub(recipients[0].value).sub(recipients[1].value).sub(recipients[2].value),
                );
                expect(await arcdToken.balanceOf(recipients[0].address)).to.equal(0);

                expect(await arcdAirdrop.getClaimed(recipients[0].address, root)).to.equal(recipients[0].value);
                expect(await arcdAirdrop.getClaimed(recipients[1].address, root)).to.equal(recipients[1].value);
                expect(await arcdAirdrop.getClaimed(recipients[2].address, root)).to.equal(recipients[2].value);
            });

            it("user claims airdrop then call to addNftAndDelegate reverts", async function () {
                const { arcdToken, arcdDst, arcdAirdrop, deployer, recipients, merkleTrie, mockNFTBoostVault } =
                    ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcdAirdrop.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, arcdAirdrop.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );

                // claim and delegate to self
                await expect(
                    await arcdAirdrop.connect(deployer).claimAndDelegate(
                        recipients[0].address, // address to delegate voting power to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(arcdAirdrop.address, mockNFTBoostVault.address, recipients[0].value);

                expect(await arcdToken.balanceOf(mockNFTBoostVault.address)).to.equal(recipients[0].value);
                expect(await arcdToken.balanceOf(arcdAirdrop.address)).to.equal(
                    totalAirdropAmount.sub(recipients[0].value),
                );
                expect(await arcdToken.balanceOf(recipients[0].address)).to.equal(0);

                await expect(
                    mockNFTBoostVault
                        .connect(deployer)
                        .addNftAndDelegate(
                            recipients[0].value,
                            0,
                            ethers.constants.AddressZero,
                            ethers.constants.AddressZero,
                        ),
                ).to.be.revertedWith("NBV_HasRegistration()");
            });

            it("user claims airdrop twice", async function () {
                const {
                    arcdToken,
                    arcdDst,
                    arcdAirdrop,
                    deployer,
                    other,
                    recipients,
                    merkleTrie,
                    mockNFTBoostVault,
                    blockchainTime,
                } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcdAirdrop.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, arcdAirdrop.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );

                // claim and delegate to self
                await expect(
                    arcdAirdrop.connect(deployer).claimAndDelegate(
                        recipients[0].address, // address to delegate voting power to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(arcdAirdrop.address, mockNFTBoostVault.address, recipients[0].value);

                expect(await arcdToken.balanceOf(mockNFTBoostVault.address)).to.equal(recipients[0].value);
                expect(await arcdToken.balanceOf(arcdAirdrop.address)).to.equal(
                    totalAirdropAmount.sub(recipients[0].value),
                );
                expect(await arcdToken.balanceOf(recipients[0].address)).to.equal(0);

                // set new root and expiration, then user claims again

                // airdrop claims data
                const recipients2: Account = [
                    {
                        address: deployer.address,
                        value: ethers.utils.parseEther("100"),
                    },
                    {
                        address: other.address,
                        value: ethers.utils.parseEther("200"),
                    },
                ];

                // hash leaves
                const merkleTrie2 = await getMerkleTree(recipients2);
                const root = merkleTrie2.getHexRoot();

                // airdrop claim expiration is current unix stamp + 1 hour
                const expiration = await blockchainTime.secondsFromNow(3600);

                // owner resets merkle root and expiration
                await expect(arcdAirdrop.connect(deployer).setMerkleRoot(root, expiration))
                    .to.emit(arcdAirdrop, "SetMerkleRoot")
                    .withArgs(root, expiration);

                // create proof for deployer
                const proofDeployer2 = merkleTrie2.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients2[0].address, recipients2[0].value],
                    ),
                );

                await expect(
                    arcdAirdrop.connect(deployer).claimAndDelegate(
                        recipients2[0].address, // address to delegate voting power to
                        recipients2[0].value, // total claimable amount
                        proofDeployer2, // merkle proof
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(arcdAirdrop.address, mockNFTBoostVault.address, recipients2[0].value);
            });

            it("user claims airdrop and delegates to self using address(0)", async function () {
                const { arcdToken, arcdDst, arcdAirdrop, deployer, recipients, merkleTrie, mockNFTBoostVault } =
                    ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcdAirdrop.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, arcdAirdrop.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );

                // claim and delegate to self
                await expect(
                    arcdAirdrop.connect(deployer).claimAndDelegate(
                        ethers.constants.AddressZero, // address to delegate voting power to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(arcdAirdrop.address, mockNFTBoostVault.address, recipients[0].value);
            });

            it("user tries to claim airdrop with invalid proof", async function () {
                const { arcdToken, arcdDst, arcdAirdrop, deployer, other, recipients, merkleTrie } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcdAirdrop.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, arcdAirdrop.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofNotUser = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );
                // try to claim with invalid proof
                await expect(
                    arcdAirdrop.connect(other).claimAndDelegate(
                        other.address, // address to delegate to
                        recipients[0].value, // total claimable amount
                        proofNotUser, // invalid merkle proof
                    ),
                ).to.be.revertedWith("AA_NonParticipant()");
            });

            it("user tries to claim same airdrop twice", async function () {
                const { arcdToken, arcdDst, arcdAirdrop, deployer, recipients, merkleTrie, mockNFTBoostVault } =
                    ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcdAirdrop.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, arcdAirdrop.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );

                // claim and delegate to self
                await expect(
                    arcdAirdrop.connect(deployer).claimAndDelegate(
                        recipients[0].address, // address to delegate to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(arcdAirdrop.address, mockNFTBoostVault.address, recipients[0].value);

                // try to claim again
                await expect(
                    arcdAirdrop.connect(deployer).claimAndDelegate(
                        recipients[0].address, // address to delegate to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                    ),
                ).to.be.revertedWith("AA_AlreadyClaimed()");
            });

            it("user tries to claim airdrop after expiration", async function () {
                const { arcdToken, arcdDst, arcdAirdrop, deployer, recipients, merkleTrie, blockchainTime } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcdAirdrop.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, arcdAirdrop.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // fast forward to after the end of the airdrop claim period
                await blockchainTime.increaseTime(3600);

                // owner reclaims tokens
                await expect(await arcdAirdrop.connect(deployer).reclaim(deployer.address))
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(arcdAirdrop.address, deployer.address, totalAirdropAmount);

                // create proof for deployer
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );

                // claims
                await expect(
                    arcdAirdrop.connect(deployer).claimAndDelegate(
                        recipients[0].address, // address to delegate to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                    ),
                ).to.be.revertedWith("AA_ClaimingExpired()");
            });

            it("user tries to claim airdrop without merkle root set", async function () {
                const { arcdToken, arcdDst, arcdAirdrop, deployer, recipients, merkleTrie, expiration } = ctxToken;

                // manager sets merkle root to bytes32(0)
                await expect(arcdAirdrop.connect(deployer).setMerkleRoot(ethers.constants.HashZero, expiration))
                    .to.emit(arcdAirdrop, "SetMerkleRoot")
                    .withArgs(ethers.constants.HashZero, expiration);

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcdAirdrop.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, arcdAirdrop.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );
                // try to claim with invalid proof
                await expect(
                    arcdAirdrop.connect(deployer).claimAndDelegate(
                        recipients[0].address, // address to delegate to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // invalid merkle proof
                    ),
                ).to.be.revertedWith("AA_NotInitialized()");
            });

            it("owner reclaims all unclaimed tokens", async function () {
                const {
                    arcdToken,
                    arcdDst,
                    arcdAirdrop,
                    deployer,
                    other,
                    recipients,
                    merkleTrie,
                    blockchainTime,
                    mockNFTBoostVault,
                } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcdAirdrop.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, arcdAirdrop.address, totalAirdropAmount);

                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );
                const proofOther = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[1].address, recipients[1].value],
                    ),
                );

                // claims
                await expect(
                    await arcdAirdrop.connect(deployer).claimAndDelegate(
                        recipients[0].address, // address to delegate to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(arcdAirdrop.address, mockNFTBoostVault.address, recipients[0].value);

                await expect(
                    await arcdAirdrop.connect(other).claimAndDelegate(
                        recipients[1].address, // address to delegate to
                        recipients[1].value, // total claimable amount
                        proofOther, // merkle proof
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(arcdAirdrop.address, mockNFTBoostVault.address, recipients[1].value);

                expect(await arcdToken.balanceOf(deployer.address)).to.equal(0);
                expect(await arcdToken.balanceOf(other.address)).to.equal(0);
                expect(await arcdToken.balanceOf(mockNFTBoostVault.address)).to.equal(
                    recipients[0].value.add(recipients[1].value),
                );
                expect(await arcdToken.balanceOf(arcdAirdrop.address)).to.equal(
                    totalAirdropAmount.sub(recipients[0].value).sub(recipients[1].value),
                );

                // advance time past claiming period
                await blockchainTime.increaseTime(3600);

                // reclaim all tokens
                await expect(await arcdAirdrop.connect(deployer).reclaim(deployer.address))
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(
                        arcdAirdrop.address,
                        deployer.address,
                        totalAirdropAmount.sub(recipients[0].value).sub(recipients[1].value),
                    );

                expect(await arcdToken.balanceOf(deployer.address)).to.equal(
                    totalAirdropAmount.sub(recipients[0].value).sub(recipients[1].value),
                );
            });

            it("owner tries to reclaim token to zero address", async function () {
                const {
                    arcdToken,
                    arcdDst,
                    arcdAirdrop,
                    deployer,
                    other,
                    recipients,
                    merkleTrie,
                    blockchainTime,
                    mockNFTBoostVault,
                } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcdAirdrop.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, arcdAirdrop.address, totalAirdropAmount);

                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );
                const proofOther = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[1].address, recipients[1].value],
                    ),
                );

                // claims
                await expect(
                    await arcdAirdrop.connect(deployer).claimAndDelegate(
                        recipients[0].address, // address to delegate to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(arcdAirdrop.address, mockNFTBoostVault.address, recipients[0].value);

                await expect(
                    await arcdAirdrop.connect(other).claimAndDelegate(
                        recipients[1].address, // address to delegate to
                        recipients[1].value, // total claimable amount
                        proofOther, // merkle proof
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(arcdAirdrop.address, mockNFTBoostVault.address, recipients[1].value);

                expect(await arcdToken.balanceOf(deployer.address)).to.equal(0);
                expect(await arcdToken.balanceOf(other.address)).to.equal(0);
                expect(await arcdToken.balanceOf(mockNFTBoostVault.address)).to.equal(
                    recipients[0].value.add(recipients[1].value),
                );
                expect(await arcdToken.balanceOf(arcdAirdrop.address)).to.equal(
                    totalAirdropAmount.sub(recipients[0].value).sub(recipients[1].value),
                );

                // advance time past claiming period
                await blockchainTime.increaseTime(3600);

                // reclaim all tokens
                await expect(arcdAirdrop.connect(deployer).reclaim(ethers.constants.AddressZero)).to.be.revertedWith(
                    `AA_ZeroAddress("destination")`,
                );
            });

            it("non-owner tries to reclaim all unclaimed tokens", async function () {
                const { arcdToken, arcdDst, arcdAirdrop, deployer, other, blockchainTime } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcdAirdrop.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, arcdAirdrop.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // fast forward to after the end of the airdrop claim period
                await blockchainTime.increaseTime(3600);

                // non-owner tries to reclaim tokens
                await expect(arcdAirdrop.connect(other).reclaim(other.address)).to.be.revertedWith("Sender not owner");
            });

            it("owner tries to reclaim tokens before claiming period is over", async function () {
                const { arcdToken, arcdDst, arcdAirdrop, deployer, blockchainTime } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(arcdAirdrop.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, arcdAirdrop.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // get airdrop expiration time
                const airdropExpiration = await arcdAirdrop.expiration();
                // get current time
                const currentTime = await blockchainTime.secondsFromNow(0);
                expect(airdropExpiration).to.be.greaterThan(currentTime);

                // non-owner tries to reclaim tokens
                await expect(arcdAirdrop.connect(deployer).reclaim(deployer.address)).to.be.revertedWith(
                    "AA_ClaimingNotExpired()",
                );
            });

            it("owner changes merkle root", async function () {
                const { arcdAirdrop, deployer, blockchainTime } = ctxToken;

                // owner changes merkle root
                const newMerkleRoot = ethers.utils.solidityKeccak256(["bytes32"], [ethers.utils.randomBytes(32)]);

                // create expiration timestamp
                const expirationTime = await blockchainTime.secondsFromNow(100);

                await expect(await arcdAirdrop.connect(deployer).setMerkleRoot(newMerkleRoot, expirationTime))
                    .to.emit(arcdAirdrop, "SetMerkleRoot")
                    .withArgs(newMerkleRoot, expirationTime);

                expect(await arcdAirdrop.rewardsRoot()).to.equal(newMerkleRoot);
                expect(await arcdAirdrop.expiration()).to.equal(expirationTime);
            });

            it("owner tries to set invalid expiration time", async function () {
                const { arcdAirdrop, deployer, blockchainTime } = ctxToken;

                // owner changes merkle root
                const newMerkleRoot = ethers.utils.solidityKeccak256(["bytes32"], [ethers.utils.randomBytes(32)]);
                // create expiration timestamp
                const expirationTime = await blockchainTime.secondsFromNow(0);

                // owner tries to set invalid expiration time
                await expect(
                    arcdAirdrop.connect(deployer).setMerkleRoot(newMerkleRoot, expirationTime),
                ).to.be.revertedWith("AA_ClaimingExpired()");
            });

            it("non-owner tries to set a new merkle root", async function () {
                const { arcdAirdrop, other, blockchainTime } = ctxToken;

                // create expiration timestamp
                const expirationTime = await blockchainTime.secondsFromNow(100);

                // non-owner tries to change merkle root
                const newMerkleRoot = ethers.utils.solidityKeccak256(["bytes32"], [ethers.utils.randomBytes(32)]);
                await expect(
                    arcdAirdrop.connect(other).setMerkleRoot(newMerkleRoot, expirationTime),
                ).to.be.revertedWith("Sender not owner");
            });
        });

        describe("AirdropSeason1", function () {
            let airdropSeason1: AirdropSeason1;
            let mockStakingVault: MockSingleSidedStaking;

            beforeEach(async function () {
                const { arcdToken, expiration, root } = ctxToken;

                // deploy mock staking vault
                const mockStakingVaultFact = await ethers.getContractFactory("MockSingleSidedStaking");
                mockStakingVault = await mockStakingVaultFact.deploy(arcdToken.address);

                // deploy season 1 airdrop
                const airdropSeason1Fact = await ethers.getContractFactory("AirdropSeason1");
                airdropSeason1 = await airdropSeason1Fact.deploy(
                    arcdToken.address,
                    root,
                    expiration,
                    mockStakingVault.address,
                );
            });

            it("Verify the deployer is the owner of AirdropSeason0", async () => {
                const { arcdToken, deployer, merkleTrie, expiration, other } = ctxToken;

                const governanceAddress = other.address;

                const arcadeAirdropContract = await deploy("AirdropSeason1", deployer, [
                    arcdToken.address,
                    merkleTrie.getHexRoot(),
                    expiration,
                    deployer.address,
                ]);

                // query owner of airdropSeason0
                const arcadeAirdropOwner = await arcadeAirdropContract.owner();

                // confirm that the returned owner is the address assigned in the constructor
                expect(arcadeAirdropOwner).to.equal(deployer.address);

                // deployer transfers ownership to governance address
                await arcadeAirdropContract.setOwner(governanceAddress);

                // query owner of airdropSeason0
                const arcadeAirdropOwnerAfterTransfer = await arcadeAirdropContract.owner();

                // confirm that the returned owner is governance address
                expect(arcadeAirdropOwnerAfterTransfer).to.equal(governanceAddress);
            });

            it("Invalid AirdropSeason0 deployment parameters", async () => {
                const { arcdToken, deployer, merkleTrie, expiration } = ctxToken;

                // get current block number
                const currentBlock = 10;

                await expect(
                    deploy("AirdropSeason1", deployer, [
                        arcdToken.address,
                        merkleTrie.getHexRoot(),
                        expiration,
                        ethers.constants.AddressZero,
                    ]),
                ).to.be.revertedWith(`AA_ZeroAddress("votingVault")`);

                await expect(
                    deploy("AirdropSeason1", deployer, [
                        ethers.constants.AddressZero,
                        merkleTrie.getHexRoot(),
                        expiration,
                        deployer.address,
                    ]),
                ).to.be.revertedWith(`AA_ZeroAddress("token")`);

                await expect(
                    deploy("AirdropSeason1", deployer, [
                        arcdToken.address,
                        merkleTrie.getHexRoot(),
                        currentBlock,
                        deployer.address,
                    ]),
                ).to.be.revertedWith(`AA_ClaimingExpired()`);

                await expect(
                    deploy("AirdropSeason1", deployer, [
                        arcdToken.address,
                        merkleTrie.getHexRoot(),
                        currentBlock - 5,
                        deployer.address,
                    ]),
                ).to.be.revertedWith(`AA_ClaimingExpired()`);
            });

            it("all recipients claim airdrop to vault and delegate to themselves", async function () {
                const { arcdToken, arcdDst, deployer, other, other2, recipients, merkleTrie, root } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(airdropSeason1.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, airdropSeason1.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );
                const proofOther = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[1].address, recipients[1].value],
                    ),
                );
                const proofOther2 = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[2].address, recipients[2].value],
                    ),
                );

                expect(await airdropSeason1.getClaimed(recipients[0].address, root)).to.equal(0);
                expect(await airdropSeason1.getClaimed(recipients[1].address, root)).to.equal(0);
                expect(await airdropSeason1.getClaimed(recipients[2].address, root)).to.equal(0);

                // claim and delegate to self
                await expect(
                    await airdropSeason1.connect(deployer).claimAndStake(
                        recipients[0].address, // address to delegate voting power to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                        1,
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(airdropSeason1.address, mockStakingVault.address, recipients[0].value);

                await expect(
                    await airdropSeason1.connect(other).claimAndStake(
                        recipients[1].address, // address to delegate voting power to
                        recipients[1].value, // total claimable amount
                        proofOther, // merkle proof
                        1,
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(airdropSeason1.address, mockStakingVault.address, recipients[1].value);
                await expect(
                    await airdropSeason1.connect(other2).claimAndStake(
                        recipients[2].address, // address to delegate voting power to
                        recipients[2].value, // total claimable amount
                        proofOther2, // merkle proof
                        1,
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(airdropSeason1.address, mockStakingVault.address, recipients[2].value);

                expect(await arcdToken.balanceOf(mockStakingVault.address)).to.equal(
                    recipients[0].value.add(recipients[1].value).add(recipients[2].value),
                );
                expect(await arcdToken.balanceOf(airdropSeason1.address)).to.equal(
                    totalAirdropAmount.sub(recipients[0].value).sub(recipients[1].value).sub(recipients[2].value),
                );
                expect(await arcdToken.balanceOf(recipients[0].address)).to.equal(0);

                expect(await airdropSeason1.getClaimed(recipients[0].address, root)).to.equal(recipients[0].value);
                expect(await airdropSeason1.getClaimed(recipients[1].address, root)).to.equal(recipients[1].value);
                expect(await airdropSeason1.getClaimed(recipients[2].address, root)).to.equal(recipients[2].value);
            });

            it("all recipients claim airdrop to themselves", async function () {
                const { arcdToken, arcdDst, deployer, other, other2, recipients, merkleTrie } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(airdropSeason1.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, airdropSeason1.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );
                const proofOther = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[1].address, recipients[1].value],
                    ),
                );
                const proofOther2 = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[2].address, recipients[2].value],
                    ),
                );

                // claim and delegate to self
                await expect(
                    await airdropSeason1.connect(deployer).claim(
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(airdropSeason1.address, recipients[0].address, recipients[0].value);

                await expect(
                    await airdropSeason1.connect(other).claim(
                        recipients[1].value, // total claimable amount
                        proofOther, // merkle proof
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(airdropSeason1.address, recipients[1].address, recipients[1].value);
                await expect(
                    await airdropSeason1.connect(other2).claim(
                        recipients[2].value, // total claimable amount
                        proofOther2, // merkle proof
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(airdropSeason1.address, recipients[2].address, recipients[2].value);

                expect(await arcdToken.balanceOf(recipients[0].address)).to.equal(recipients[0].value);
                expect(await arcdToken.balanceOf(recipients[1].address)).to.equal(recipients[1].value);
                expect(await arcdToken.balanceOf(recipients[2].address)).to.equal(recipients[2].value);

                expect(await arcdToken.balanceOf(airdropSeason1.address)).to.equal(
                    totalAirdropAmount.sub(recipients[0].value).sub(recipients[1].value).sub(recipients[2].value),
                );
            });

            it("user claims airdrop twice", async function () {
                const { arcdToken, arcdDst, deployer, other, recipients, merkleTrie, blockchainTime } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(airdropSeason1.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, airdropSeason1.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );

                // claim and delegate to self
                await expect(
                    airdropSeason1.connect(deployer).claimAndStake(
                        recipients[0].address, // address to delegate voting power to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                        2,
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(airdropSeason1.address, mockStakingVault.address, recipients[0].value);

                expect(await arcdToken.balanceOf(mockStakingVault.address)).to.equal(recipients[0].value);
                expect(await arcdToken.balanceOf(airdropSeason1.address)).to.equal(
                    totalAirdropAmount.sub(recipients[0].value),
                );
                expect(await arcdToken.balanceOf(recipients[0].address)).to.equal(0);

                // set new root and expiration, then user claims again

                // airdrop claims data
                const recipients2: Account[] = [
                    {
                        address: deployer.address,
                        value: ethers.utils.parseEther("100"),
                    },
                    {
                        address: other.address,
                        value: ethers.utils.parseEther("200"),
                    },
                ];

                // hash leaves
                const merkleTrie2 = await getMerkleTree(recipients2);
                const root = merkleTrie2.getHexRoot();

                // airdrop claim expiration is current unix stamp + 1 hour
                const expiration = await blockchainTime.secondsFromNow(3600);

                // owner resets merkle root and expiration
                await expect(airdropSeason1.connect(deployer).setMerkleRoot(root, expiration))
                    .to.emit(airdropSeason1, "SetMerkleRoot")
                    .withArgs(root, expiration);

                // create proof for deployer
                const proofDeployer2 = merkleTrie2.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients2[0].address, recipients2[0].value],
                    ),
                );

                await expect(
                    airdropSeason1.connect(deployer).claimAndStake(
                        recipients2[0].address, // address to delegate voting power to
                        recipients2[0].value, // total claimable amount
                        proofDeployer2, // merkle proof
                        2,
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(airdropSeason1.address, mockStakingVault.address, recipients2[0].value);
            });

            it("user tries to claim airdrop with invalid proof", async function () {
                const { arcdToken, arcdDst, deployer, other, recipients, merkleTrie, root } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(airdropSeason1.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, airdropSeason1.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofNotUser = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );

                expect(await airdropSeason1.getClaimed(recipients[0].address, root)).to.equal(0);

                // try to claim with invalid proof
                await expect(
                    airdropSeason1.connect(other).claim(
                        recipients[0].value, // total claimable amount
                        proofNotUser, // invalid merkle proof
                    ),
                ).to.be.revertedWith("AA_NonParticipant()");

                // try to claim with invalid proof
                await expect(
                    airdropSeason1.connect(other).claimAndStake(
                        recipients[0].address, // address to delegate voting power to
                        recipients[0].value, // total claimable amount
                        proofNotUser, // invalid merkle proof
                        2,
                    ),
                ).to.be.revertedWith("AA_NonParticipant()");

                expect(await airdropSeason1.getClaimed(recipients[0].address, root)).to.equal(0);
            });

            it("user tries to claim same airdrop twice", async function () {
                const { arcdToken, arcdDst, deployer, recipients, merkleTrie } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(airdropSeason1.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, airdropSeason1.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );

                // claim and delegate to self
                await expect(
                    airdropSeason1.connect(deployer).claimAndStake(
                        recipients[0].address, // address to delegate to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                        1,
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(airdropSeason1.address, mockStakingVault.address, recipients[0].value);

                // try to claim again
                await expect(
                    airdropSeason1.connect(deployer).claimAndStake(
                        recipients[0].address, // address to delegate to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                        2,
                    ),
                ).to.be.revertedWith("AA_AlreadyClaimed()");

                // try to use claim()
                await expect(
                    airdropSeason1.connect(deployer).claim(
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                    ),
                ).to.be.revertedWith("AA_AlreadyClaimed()");
            });

            it("user tries to claim airdrop after expiration", async function () {
                const { arcdToken, arcdDst, deployer, recipients, merkleTrie, blockchainTime } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(airdropSeason1.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, airdropSeason1.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // fast forward to after the end of the airdrop claim period
                await blockchainTime.increaseTime(3600);

                // owner reclaims tokens
                await expect(await airdropSeason1.connect(deployer).reclaim(deployer.address))
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(airdropSeason1.address, deployer.address, totalAirdropAmount);

                // create proof for deployer
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );

                // claims
                await expect(
                    airdropSeason1.connect(deployer).claimAndStake(
                        recipients[0].address, // address to delegate to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                        1,
                    ),
                ).to.be.revertedWith("AA_ClaimingExpired()");

                // try to claim again
                await expect(
                    airdropSeason1.connect(deployer).claim(
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                    ),
                ).to.be.revertedWith("AA_ClaimingExpired()");
            });

            it("user tries to claim airdrop without merkle root set", async function () {
                const { arcdToken, arcdDst, deployer, recipients, merkleTrie, expiration } = ctxToken;

                // manager sets merkle root to bytes32(0)
                await expect(airdropSeason1.connect(deployer).setMerkleRoot(ethers.constants.HashZero, expiration))
                    .to.emit(airdropSeason1, "SetMerkleRoot")
                    .withArgs(ethers.constants.HashZero, expiration);

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(airdropSeason1.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, airdropSeason1.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );
                // try to claim with invalid proof
                await expect(
                    airdropSeason1.connect(deployer).claimAndStake(
                        recipients[0].address, // address to delegate to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // invalid merkle proof
                        1,
                    ),
                ).to.be.revertedWith("AA_NotInitialized()");

                // try to claim with invalid proof
                await expect(
                    airdropSeason1.connect(deployer).claim(
                        recipients[0].value, // total claimable amount
                        proofDeployer, // invalid merkle proof
                    ),
                ).to.be.revertedWith("AA_NotInitialized()");
            });

            it("owner reclaims all unclaimed tokens", async function () {
                const { arcdToken, arcdDst, deployer, other, recipients, merkleTrie, blockchainTime } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(airdropSeason1.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, airdropSeason1.address, totalAirdropAmount);

                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );
                const proofOther = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[1].address, recipients[1].value],
                    ),
                );

                // claims
                await expect(
                    await airdropSeason1.connect(deployer).claimAndStake(
                        recipients[0].address, // address to delegate to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                        1,
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(airdropSeason1.address, mockStakingVault.address, recipients[0].value);

                await expect(
                    await airdropSeason1.connect(other).claimAndStake(
                        recipients[1].address, // address to delegate to
                        recipients[1].value, // total claimable amount
                        proofOther, // merkle proof
                        1,
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(airdropSeason1.address, mockStakingVault.address, recipients[1].value);

                expect(await arcdToken.balanceOf(deployer.address)).to.equal(0);
                expect(await arcdToken.balanceOf(other.address)).to.equal(0);
                expect(await arcdToken.balanceOf(mockStakingVault.address)).to.equal(
                    recipients[0].value.add(recipients[1].value),
                );
                expect(await arcdToken.balanceOf(airdropSeason1.address)).to.equal(
                    totalAirdropAmount.sub(recipients[0].value).sub(recipients[1].value),
                );

                // advance time past claiming period
                await blockchainTime.increaseTime(3600);

                // reclaim all tokens
                await expect(await airdropSeason1.connect(deployer).reclaim(deployer.address))
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(
                        airdropSeason1.address,
                        deployer.address,
                        totalAirdropAmount.sub(recipients[0].value).sub(recipients[1].value),
                    );

                expect(await arcdToken.balanceOf(deployer.address)).to.equal(
                    totalAirdropAmount.sub(recipients[0].value).sub(recipients[1].value),
                );
            });

            it("owner tries to reclaim token to zero address", async function () {
                const { arcdToken, arcdDst, deployer, other, recipients, merkleTrie, blockchainTime } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(airdropSeason1.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, airdropSeason1.address, totalAirdropAmount);

                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // create proof for deployer and other
                const proofDeployer = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[0].address, recipients[0].value],
                    ),
                );
                const proofOther = merkleTrie.getHexProof(
                    ethers.utils.solidityKeccak256(
                        ["address", "uint256"],
                        [recipients[1].address, recipients[1].value],
                    ),
                );

                // claims
                await expect(
                    await airdropSeason1.connect(deployer).claimAndStake(
                        recipients[0].address, // address to delegate to
                        recipients[0].value, // total claimable amount
                        proofDeployer, // merkle proof
                        1,
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(airdropSeason1.address, mockStakingVault.address, recipients[0].value);

                await expect(
                    await airdropSeason1.connect(other).claimAndStake(
                        recipients[1].address, // address to delegate to
                        recipients[1].value, // total claimable amount
                        proofOther, // merkle proof
                        1,
                    ),
                )
                    .to.emit(arcdToken, "Transfer")
                    .withArgs(airdropSeason1.address, mockStakingVault.address, recipients[1].value);

                expect(await arcdToken.balanceOf(deployer.address)).to.equal(0);
                expect(await arcdToken.balanceOf(other.address)).to.equal(0);
                expect(await arcdToken.balanceOf(mockStakingVault.address)).to.equal(
                    recipients[0].value.add(recipients[1].value),
                );
                expect(await arcdToken.balanceOf(airdropSeason1.address)).to.equal(
                    totalAirdropAmount.sub(recipients[0].value).sub(recipients[1].value),
                );

                // advance time past claiming period
                await blockchainTime.increaseTime(3600);

                // reclaim all tokens
                await expect(airdropSeason1.connect(deployer).reclaim(ethers.constants.AddressZero)).to.be.revertedWith(
                    `AA_ZeroAddress("destination")`,
                );
            });

            it("non-owner tries to reclaim all unclaimed tokens", async function () {
                const { arcdToken, arcdDst, deployer, other, blockchainTime } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(airdropSeason1.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, airdropSeason1.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // fast forward to after the end of the airdrop claim period
                await blockchainTime.increaseTime(3600);

                // non-owner tries to reclaim tokens
                await expect(airdropSeason1.connect(other).reclaim(other.address)).to.be.revertedWith(
                    "Sender not owner",
                );
            });

            it("owner tries to reclaim tokens before claiming period is over", async function () {
                const { arcdToken, arcdDst, deployer, blockchainTime } = ctxToken;

                await expect(await arcdDst.connect(deployer).toCommunityAirdrop(airdropSeason1.address))
                    .to.emit(arcdDst, "Distribute")
                    .withArgs(arcdToken.address, airdropSeason1.address, totalAirdropAmount);
                expect(await arcdDst.communityAirdropSent()).to.be.true;

                // get airdrop expiration time
                const airdropExpiration = await airdropSeason1.expiration();
                // get current time
                const currentTime = await blockchainTime.secondsFromNow(0);
                expect(airdropExpiration).to.be.greaterThan(currentTime);

                // non-owner tries to reclaim tokens
                await expect(airdropSeason1.connect(deployer).reclaim(deployer.address)).to.be.revertedWith(
                    "AA_ClaimingNotExpired()",
                );
            });

            it("owner changes merkle root", async function () {
                const { deployer, blockchainTime } = ctxToken;

                // owner changes merkle root
                const newMerkleRoot = ethers.utils.solidityKeccak256(["bytes32"], [ethers.utils.randomBytes(32)]);

                // create expiration timestamp
                const expirationTime = await blockchainTime.secondsFromNow(100);

                await expect(await airdropSeason1.connect(deployer).setMerkleRoot(newMerkleRoot, expirationTime))
                    .to.emit(airdropSeason1, "SetMerkleRoot")
                    .withArgs(newMerkleRoot, expirationTime);

                expect(await airdropSeason1.rewardsRoot()).to.equal(newMerkleRoot);
                expect(await airdropSeason1.expiration()).to.equal(expirationTime);
            });

            it("owner tries to set invalid expiration time", async function () {
                const { deployer, blockchainTime } = ctxToken;

                // owner changes merkle root
                const newMerkleRoot = ethers.utils.solidityKeccak256(["bytes32"], [ethers.utils.randomBytes(32)]);
                // create expiration timestamp
                const expirationTime = await blockchainTime.secondsFromNow(0);

                // owner tries to set invalid expiration time
                await expect(
                    airdropSeason1.connect(deployer).setMerkleRoot(newMerkleRoot, expirationTime),
                ).to.be.revertedWith("AA_ClaimingExpired()");
            });

            it("non-owner tries to set a new merkle root", async function () {
                const { other, blockchainTime } = ctxToken;

                // create expiration timestamp
                const expirationTime = await blockchainTime.secondsFromNow(100);

                // non-owner tries to change merkle root
                const newMerkleRoot = ethers.utils.solidityKeccak256(["bytes32"], [ethers.utils.randomBytes(32)]);
                await expect(
                    airdropSeason1.connect(other).setMerkleRoot(newMerkleRoot, expirationTime),
                ).to.be.revertedWith("Sender not owner");
            });
        });
    });
});
