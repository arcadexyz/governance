import { ethers } from "hardhat";

import {
    ARCDVestingVault,
    ArcadeAirdrop,
    ArcadeCoreVoting,
    ArcadeGSCCoreVoting,
    ArcadeGSCVault,
    ArcadeToken,
    ArcadeTokenDistributor,
    ArcadeTreasury,
    BadgeDescriptor,
    ImmutableVestingVault,
    NFTBoostVault,
    ReputationBadge,
    Timelock,
} from "../../src/types";
import {
    AIRDROP_EXPIRATION,
    BADGE_DESCRIPTOR_BASE_URI,
    BASE_QUORUM,
    BASE_QUORUM_GSC,
    DEPLOYER_ADDRESS,
    GSC_THRESHOLD,
    MIN_PROPOSAL_POWER_CORE_VOTING,
    MIN_PROPOSAL_POWER_GSC,
    STALE_BLOCK_LAG,
    TIMELOCK_WAIT_TIME,
    VESTING_MANAGER,
} from "./config/deployment-params";
import { SECTION_SEPARATOR, SUBSECTION_SEPARATOR } from "./test/utils";
import { writeJson } from "./write-json";

export interface DeployedResources {
    arcadeTokenDistributor: ArcadeTokenDistributor;
    arcadeToken: ArcadeToken;
    arcadeCoreVoting: ArcadeCoreVoting;
    arcadeGSCCoreVoting: ArcadeGSCCoreVoting;
    timelock: Timelock;
    teamVestingVault: ARCDVestingVault;
    partnerVestingVault: ImmutableVestingVault;
    nftBoostVault: NFTBoostVault;
    arcadeGSCVault: ArcadeGSCVault;
    arcadeTreasury: ArcadeTreasury;
    arcadeAirdrop: ArcadeAirdrop;
    badgeDescriptor: BadgeDescriptor;
    reputationBadge: ReputationBadge;
}

export async function main(): Promise<DeployedResources> {
    // Hardhat always runs the compile task when running scripts through it.
    // If this runs in a standalone fashion you may want to call compile manually
    // to make sure everything is compiled
    // await run("compile");

    // ================= TOKEN + DISTRIBUTOR =================

    console.log(SECTION_SEPARATOR);
    console.log("Deploying ARCD token and ArcadeTokenDistributor contracts...");

    // token distributor
    const ArcadeTokenDistributorFactory = await ethers.getContractFactory("ArcadeTokenDistributor");
    const arcadeTokenDistributor = <ArcadeTokenDistributor>await ArcadeTokenDistributorFactory.deploy();
    await arcadeTokenDistributor.deployed();
    console.log("ArcadeTokenDistributor deployed to:", arcadeTokenDistributor.address);
    console.log(SUBSECTION_SEPARATOR);

    // token
    const ArcadeTokenFactory = await ethers.getContractFactory("ArcadeToken");
    const arcadeToken = <ArcadeToken>await ArcadeTokenFactory.deploy(DEPLOYER_ADDRESS, arcadeTokenDistributor.address);
    await arcadeToken.deployed();
    console.log("ArcadeToken deployed to:", arcadeToken.address);
    console.log(SUBSECTION_SEPARATOR);

    // ================= GOVERNANCE =================

    console.log(SECTION_SEPARATOR);
    console.log("Deploying governance...");

    // ======= TIMELOCK =======

    // timelock
    const TimelockFactory = await ethers.getContractFactory("Timelock");
    const timelock = await TimelockFactory.deploy(TIMELOCK_WAIT_TIME, DEPLOYER_ADDRESS, DEPLOYER_ADDRESS);
    await timelock.deployed();
    console.log("Timelock deployed to:", timelock.address);
    console.log(SUBSECTION_SEPARATOR);

    // ======= VAULTS =======

    // ARCDVestingVault
    const TeamVestingVaultFactory = await ethers.getContractFactory("ARCDVestingVault");
    const teamVestingVault = await TeamVestingVaultFactory.deploy(
        arcadeToken.address,
        STALE_BLOCK_LAG,
        VESTING_MANAGER,
        timelock.address,
    );
    await teamVestingVault.deployed();
    console.log("ARCDVestingVault deployed to:", teamVestingVault.address);
    console.log(SUBSECTION_SEPARATOR);

    // ImmutableVestingVault
    const PartnerVestingVaultFactory = await ethers.getContractFactory("ImmutableVestingVault");
    const partnerVestingVault = await PartnerVestingVaultFactory.deploy(
        arcadeToken.address,
        STALE_BLOCK_LAG,
        VESTING_MANAGER,
        timelock.address,
    );
    await partnerVestingVault.deployed();
    console.log("ImmutableVestingVault deployed to:", partnerVestingVault.address);
    console.log(SUBSECTION_SEPARATOR);

    // NFTBoostVault
    const NFTBoostVaultFactory = await ethers.getContractFactory("NFTBoostVault");
    const nftBoostVault = await NFTBoostVaultFactory.deploy(
        arcadeToken.address,
        STALE_BLOCK_LAG,
        DEPLOYER_ADDRESS,
        DEPLOYER_ADDRESS,
    );
    await nftBoostVault.deployed();
    console.log("NFTBoostVault deployed to:", nftBoostVault.address);
    console.log(SUBSECTION_SEPARATOR);

    // ======= ARCADE CORE VOTING =======

    // arcade core voting
    const ArcadeCoreVotingFactory = await ethers.getContractFactory("ArcadeCoreVoting");
    const arcadeCoreVoting = await ArcadeCoreVotingFactory.deploy(
        DEPLOYER_ADDRESS,
        BASE_QUORUM,
        MIN_PROPOSAL_POWER_CORE_VOTING,
        ethers.constants.AddressZero,
        [teamVestingVault.address, partnerVestingVault.address, nftBoostVault.address],
        true,
    );
    await arcadeCoreVoting.deployed();
    console.log("ArcadeCoreVoting deployed to:", arcadeCoreVoting.address);
    console.log(SUBSECTION_SEPARATOR);

    // ======= ARCADE GSC CORE VOTING =======

    // GSC vault
    const ArcadeGSCVaultFactory = await ethers.getContractFactory("ArcadeGSCVault");
    const arcadeGSCVault = await ArcadeGSCVaultFactory.deploy(
        arcadeCoreVoting.address,
        GSC_THRESHOLD,
        timelock.address,
    );
    await arcadeGSCVault.deployed();
    console.log("ArcadeGSCVault deployed to:", arcadeGSCVault.address);
    console.log(SUBSECTION_SEPARATOR);

    // GSC cote voting
    const ArcadeGSCCoreVotingFactory = await ethers.getContractFactory("ArcadeGSCCoreVoting");
    const arcadeGSCCoreVoting = await ArcadeGSCCoreVotingFactory.deploy(
        DEPLOYER_ADDRESS,
        BASE_QUORUM_GSC,
        MIN_PROPOSAL_POWER_GSC,
        ethers.constants.AddressZero,
        [arcadeGSCVault.address],
    );
    await arcadeGSCCoreVoting.deployed();
    console.log("ArcadeGSCCoreVoting deployed to:", arcadeGSCCoreVoting.address);
    console.log(SUBSECTION_SEPARATOR);

    // ================= TREASURY =================

    // treasury
    const ArcadeTreasuryFactory = await ethers.getContractFactory("ArcadeTreasury");
    const arcadeTreasury = await ArcadeTreasuryFactory.deploy(DEPLOYER_ADDRESS);
    await arcadeTreasury.deployed();
    console.log("ArcadeTreasury deployed to:", arcadeTreasury.address);
    console.log(SUBSECTION_SEPARATOR);

    // ================== AIRDROP ==================

    console.log(SECTION_SEPARATOR);
    console.log("Deploying Airdrop contract...");

    // airdrop
    const ArcadeAirdropFactory = await ethers.getContractFactory("ArcadeAirdrop");
    const arcadeAirdrop = await ArcadeAirdropFactory.deploy(
        DEPLOYER_ADDRESS,
        ethers.constants.HashZero,
        arcadeToken.address,
        AIRDROP_EXPIRATION,
        nftBoostVault.address,
    );
    await arcadeAirdrop.deployed();
    console.log("ArcadeAirdrop deployed to:", arcadeAirdrop.address);

    // =============== REPUTATION BADGE ===============
    console.log(SECTION_SEPARATOR);
    console.log("Deploying ReputationBadge contracts...");

    const BadgeDescriptorFactory = await ethers.getContractFactory("BadgeDescriptor");
    const badgeDescriptor = await BadgeDescriptorFactory.deploy(BADGE_DESCRIPTOR_BASE_URI);
    await badgeDescriptor.deployed();
    console.log("BadgeDescriptor deployed to:", badgeDescriptor.address);

    const ReputationBadgeFactory = await ethers.getContractFactory("ReputationBadge");
    const reputationBadge = await ReputationBadgeFactory.deploy(DEPLOYER_ADDRESS, badgeDescriptor.address);
    await reputationBadge.deployed();
    console.log("ReputationBadge deployed to:", reputationBadge.address);
    console.log(SECTION_SEPARATOR);

    // ================= SAVE ARTIFACTS =================

    await writeJson(
        arcadeTokenDistributor.address,
        arcadeToken.address,
        arcadeCoreVoting.address,
        arcadeGSCCoreVoting.address,
        timelock.address,
        teamVestingVault.address,
        partnerVestingVault.address,
        nftBoostVault.address,
        arcadeGSCVault.address,
        arcadeTreasury.address,
        arcadeAirdrop.address,
        badgeDescriptor.address,
        reputationBadge.address,
    );

    console.log(SECTION_SEPARATOR);

    return {
        arcadeTokenDistributor,
        arcadeToken,
        arcadeCoreVoting,
        arcadeGSCCoreVoting,
        timelock,
        teamVestingVault,
        partnerVestingVault,
        nftBoostVault,
        arcadeGSCVault,
        arcadeTreasury,
        arcadeAirdrop,
        badgeDescriptor,
        reputationBadge,
    };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error: Error) => {
            console.error(error);
            process.exit(1);
        });
}
