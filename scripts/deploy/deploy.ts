import hre, { ethers } from "hardhat";

import {
    DEPLOYER_ADDRESS,
    TREASURY_OWNER,
    TIMELOCK_WAIT_TIME,
    BASE_QUORUM,
    MIN_PROPOSAL_POWER,
    BASE_QUORUM_GSC,
    MIN_PROPOSAL_POWER_GSC,
    GSC_THRESHOLD
} from "./deployment-params";
import {
    ArcadeToken,
    ArcadeTokenDistributor,
    CoreVoting,
    Timelock,
    ARCDVestingVault,
    ImmutableVestingVault,
    NFTBoostVault,
    ArcadeGSCVault,
    Treasury,
    ArcadeAirdrop
} from "../../typechain";

import { writeJson } from "./write-json";
import { SECTION_SEPARATOR, SUBSECTION_SEPARATOR } from "./test/utils";

export interface DeployedResources {
    arcadeTokenDistributor: ArcadeTokenDistributor;
    arcadeToken: ArcadeToken;
    coreVoting: CoreVoting;
    arcadeGSCCoreVoting: CoreVoting;
    timelock: Timelock;
    teamVestingVault: ARCDVestingVault;
    partnerVestingVault: ImmutableVestingVault;
    NFTBoostVault: NFTBoostVault;
    arcadeGSCVault: ArcadeGSCVault;
    ArcadeTreasury: Treasury;
    arcadeAirdrop: ArcadeAirdrop;
}

export async function main(): Promise<DeployedResources> {
    // Hardhat always runs the compile task when running scripts through it.
    // If this runs in a standalone fashion you may want to call compile manually
    // to make sure everything is compiled
    // await run("compile");

    // ================= TOKEN + AIRDROP =================

    console.log(SECTION_SEPARATOR);
    console.log("Deploying ARCD token and Distributor contracts...");

    // token distributor
    const ArcadeTokenDistributorFactory = await ethers.getContractFactory("ArcadeTokenDistributor");
    const arcadeTokenDistributor = <ArcadeTokenDistributor>await ArcadeTokenDistributorFactory.deploy();
    await arcadeTokenDistributor.deployed();
    const arcadeTokenDistributorAddress = arcadeTokenDistributor.address;
    console.log("ArcadeTokenDistributor deployed to:", arcadeTokenDistributorAddress);
    console.log(SUBSECTION_SEPARATOR);

    // token
    const ArcadeTokenFactory = await ethers.getContractFactory("ArcadeToken");
    const arcadeToken = <ArcadeToken>await ArcadeTokenFactory.deploy(DEPLOYER_ADDRESS, arcdDist.address);
    await arcadeToken.deployed();
    const arcadeTokenAddress = arcadeToken.address;
    console.log("ArcadeToken deployed to:", arcadeTokenAddress);
    console.log(SUBSECTION_SEPARATOR);

    // ================= GOVERNANCE =================

    console.log(SECTION_SEPARATOR);
    console.log("Deploying governance...");

    // ======= CORE VOTING =======

    // core voting
    const CoreVotingFactory = await ethers.getContractFactory("CoreVoting");
    const coreVoting = await CoreVotingFactory.deploy(
        DEPLOYER_ADDRESS,
        BASE_QUORUM,
        MIN_PROPOSAL_POWER,
        ethers.constants.AddressZero,
        []
    );
    await coreVoting.deployed();
    const coreVotingAddress = coreVoting.address;
    console.log("CoreVoting deployed to:", coreVotingAddress);
    console.log(SUBSECTION_SEPARATOR);

    // GSC cote voting
    const ArcadeGSCCoreVotingFactory = await ethers.getContractFactory("ArcadeGSCCoreVoting");
    const arcadeGSCCoreVoting = await ArcadeGSCCoreVotingFactory.deploy(
        DEPLOYER_ADDRESS,
        BASE_QUORUM_GSC,
        MIN_PROPOSAL_POWER_GSC,
        ethers.constants.AddressZero,
        []
    );
    await arcadeGSCCoreVoting.deployed();
    const arcadeGSCCoreVotingAddress = arcadeGSCCoreVoting.address;
    console.log("GSC CoreVoting deployed to:", arcadeGSCCoreVotingAddress);
    console.log(SUBSECTION_SEPARATOR);

    // timelock
    const TimelockFactory = await ethers.getContractFactory("Timelock");
    const timelock = await TimelockFactory.deploy(TIMELOCK_WAIT_TIME, DEPLOYER_ADDRESS, DEPLOYER_ADDRESS);
    await timelock.deployed();
    const timelockAddress = timelock.address;
    console.log("Timelock deployed to:", timelockAddress);
    console.log(SUBSECTION_SEPARATOR);

    // ======= VAULTS =======

    const staleBlock = await ethers.provider.getBlockNumber();

    // team vesting vault (ARCDVestingVault)
    const TeamVestingVaultFactory = await ethers.getContractFactory("ARCDVestingVault");
    const teamVestingVault = await TeamVestingVaultFactory.deploy(
        arcdToken.address,
        staleBlock,
        TEAM_VESTING_VAULT_MANAGER,
        timelock.address
    );
    await teamVestingVault.deployed();
    const teamVestingVaultAddress = teamVestingVault.address;
    console.log("ARCDVestingVault deployed to:", teamVestingVaultAddress);
    console.log(SUBSECTION_SEPARATOR);
    
    // partner vesting vault (ImmutableVestingVault)
    const PartnerVestingVaultFactory = await ethers.getContractFactory("ImmutableVestingVault");
    const partnerVestingVault = await PartnerVestingVaultFactory.deploy(
        arcdToken.address,
        staleBlock,
        TEAM_VESTING_VAULT_MANAGER,
        timelock.address
    );
    await partnerVestingVault.deployed();
    const partnerVestingVaultAddress = partnerVestingVault.address;
    console.log("ImmutableVestingVault deployed to:", partnerVestingVaultAddress);
    console.log(SUBSECTION_SEPARATOR);

    // NFTBoostVault
    const NFTBoostVaultFactory = await ethers.getContractFactory("NFTBoostVault");
    const NFTBoostVault = await NFTBoostVaultFactory.deploy(
        arcdToken.address,
        staleBlock,
        timelock.address,
        coreVoting.address
    );
    await NFTBoostVault.deployed();
    const NFTBoostVaultAddress = NFTBoostVault.address;
    console.log("NFTBoostVault deployed to:", NFTBoostVaultAddress);
    console.log(SUBSECTION_SEPARATOR);

    // GSC vault
    const ArcadeGSCVaultFactory = await ethers.getContractFactory("ArcadeGSCVault");
    const arcadeGSCVault = await ArcadeGSCVaultFactory.deploy(
        coreVoting.address,
        GSC_THRESHOLD,
        timelock.address
    );
    await arcadeGSCVault.deployed();
    const arcadeGSCVaultAddress = arcadeGSCVault.address;
    console.log("ArcadeGSCVault deployed to:", arcadeGSCVaultAddress);
    console.log(SUBSECTION_SEPARATOR);

    // ================= TREASURY =================

    // treasury
    const ArcadeTreasuryFactory = await ethers.getContractFactory("ArcadeTreasury");
    const arcadeTreasury = await ArcadeTreasuryFactory.deploy(DEPLOYER_ADDRESS);
    await arcadeTreasury.deployed();
    const arcadeTreasuryAddress = arcadeTreasury.address;
    console.log("ArcadeTreasury deployed to:", arcadeTreasuryAddress);
    console.log(SUBSECTION_SEPARATOR);

    // ================== AIRDROP ==================

    const currentBlock = await ethers.provider.getBlockNumber();

    // airdrop
    const ArcadeAirdropFactory = await ethers.getContractFactory("ArcadeAirdrop");
    const arcadeAirdrop = await ArcadeAirdropFactory.deploy(
        coreVoting.address,
        ethers.constants.HashZero,
        arcdToken.address,
        currentBlock + AIRDROP_EXPIRATION,
        NFTBoostVault.address
    );
    await arcadeAirdrop.deployed();
    const arcadeAirdropAddress = arcadeAirdrop.address;
    console.log("ArcadeAirdrop deployed to:", arcadeAirdropAddress);
    console.log(SECTION_SEPARATOR);


    // ================= SAVE ARTIFACTS =================

    console.log("Writing deployment artifacts...");
    await writeJson(
        arcdDistAddress,
        arcdTokenAddress,
        coreVotingAddress,
        arcadeGSCCoreVotingAddress,
        timelockAddress,
        teamVestingVaultAddress,
        partnerVestingVaultAddress,
        NFTBoostVaultAddress,
        arcadeGSCVaultAddress,
        arcadeTreasuryAddress,
        arcadeAirdropAddress
    );

    console.log(SECTION_SEPARATOR);

    return {
        arcdDist,
        arcdToken,
        coreVoting,
        arcadeGSCCoreVoting,
        timelock,
        teamVestingVault,
        partnerVestingVault,
        NFTBoostVault,
        arcadeGSCVault,
        treasury,
        arcadeAirdrop
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