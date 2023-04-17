import hre, { ethers } from "hardhat";

import {
    DEPLOYER_ADDRESS,
    TIMELOCK_WAIT_TIME,
    STALE_BLOCK_LAG,
    BASE_QUORUM,
    MIN_PROPOSAL_POWER,
    BASE_QUORUM_GSC,
    MIN_PROPOSAL_POWER_GSC,
    GSC_THRESHOLD
} from "./deployment-params";
import {
    ArcadeToken,
    ArcadeTokenDistributor,
    Timelock,
    CoreVoting,
    SimpleProxy,
    FrozenLockingVault,
    Treasury,
} from "../../typechain";

import { writeJson } from "./write-json";
import { SECTION_SEPARATOR, SUBSECTION_SEPARATOR } from "./test/utils";

export interface DeployedResources {
    arcadeTokenDistributor: ArcadeTokenDistributor;
    arcadeToken: ArcadeToken;
    coreVoting: CoreVoting;
    gscCoreVoting: CoreVoting;
    timelock: Timelock;
    frozenLockingVaultImpl: FrozenLockingVault;
    simpleProxy: SimpleProxy;
    frozenLockingVault: FrozenLockingVault;
    treasury: Treasury; 
}

export async function main(): Promise<DeployedResources> {
    // Hardhat always runs the compile task when running scripts through it.
    // If this runs in a standalone fashion you may want to call compile manually
    // to make sure everything is compiled
    // await run("compile");

    console.log(SECTION_SEPARATOR);
    console.log("Deploying ARCD token and token distributor...");

    // token distributor
    const ARCDDist = await ethers.getContractFactory("ArcadeTokenDistributor");
    const arcdDist = <ArcadeTokenDistributor>await ARCDDist.deploy();
    await arcdDist.deployed();

    const arcdDistAddress = arcdDist.address;
    console.log("ArcadeTokenDistributor deployed to:", arcdDistAddress);
    console.log(SUBSECTION_SEPARATOR);

    // token
    const ARCDToken = await ethers.getContractFactory("ArcadeToken");
    const arcdToken = <ArcadeToken>await ARCDToken.deploy(DEPLOYER_ADDRESS, arcdDist.address);
    await arcdToken.deployed();

    const arcdTokenAddress = arcdToken.address;
    console.log("ArcadeToken deployed to:", arcdTokenAddress);
    console.log(SUBSECTION_SEPARATOR);

    console.log(SECTION_SEPARATOR);
    console.log("Deploying goverance...");

    // core voting
    const CoreVoting = await ethers.getContractFactory("CoreVoting");
    const coreVoting = await CoreVoting.deploy(
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
    const gscCoreVoting = await CoreVoting.deploy(
        DEPLOYER_ADDRESS,
        BASE_QUORUM_GSC,
        MIN_PROPOSAL_POWER_GSC,
        ethers.constants.AddressZero,
        []
    );
    await gscCoreVoting.deployed();

    const gscCoreVotingAddress = gscCoreVoting.address;
    console.log("GSC CoreVoting deployed to:", gscCoreVotingAddress);
    console.log(SUBSECTION_SEPARATOR);

    // timelock
    const timelockDeployer = await ethers.getContractFactory("Timelock");
    const timelock = await timelockDeployer.deploy(TIMELOCK_WAIT_TIME, DEPLOYER_ADDRESS, DEPLOYER_ADDRESS);
    await timelock.deployed();

    const timelockAddress = timelock.address;
    console.log("Timelock deployed to:", timelockAddress);
    console.log(SUBSECTION_SEPARATOR);

    // frozen locking vault
    const FrozenLockingVault = await ethers.getContractFactory("FrozenLockingVault");
    const frozenLockingVaultImp = await FrozenLockingVault.deploy(arcdToken.address, STALE_BLOCK_LAG);
    await frozenLockingVaultImp.deployed();

    const frozenLockingVaultImpAddress = frozenLockingVaultImp.address;
    console.log("FrozenLockingVault Implementation deployed to:", frozenLockingVaultImpAddress);
    console.log(SUBSECTION_SEPARATOR);

    const simpleProxyFactory = await ethers.getContractFactory("SimpleProxy");
    const simpleProxy = await simpleProxyFactory.deploy(DEPLOYER_ADDRESS, frozenLockingVaultImp.address);

    const simpleProxyAddress = simpleProxy.address;
    console.log("SimpleProxy deployed to:", simpleProxyAddress);
    console.log(SUBSECTION_SEPARATOR);

    // const frozenLockingVault = await frozenLockingVaultImp.attach(simpleProxy.address);

    // GSC vault
    const gscDeployer = await ethers.getContractFactory("GSCVault");
    const gscVault = await gscDeployer.deploy(
        coreVoting.address,
        GSC_THRESHOLD,
        timelock.address
    );
    await gscVault.deployed();

    const gscVaultAddress = gscVault.address;
    console.log("GSCVault deployed to:", gscVaultAddress);
    console.log(SUBSECTION_SEPARATOR);

    // treasury
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(DEPLOYER_ADDRESS); // council has this as the timelock
    await treasury.deployed();

    const treasuryAddress = treasury.address;
    console.log("Treasury deployed to:", treasuryAddress);
    console.log(SUBSECTION_SEPARATOR);
    
    await writeJson(
        arcdDistAddress,
        arcdTokenAddress,
        coreVotingAddress,
        gscCoreVotingAddress,
        timelockAddress,
        frozenLockingVaultImpAddress,
        simpleProxyAddress,
        gscVaultAddress,
        treasuryAddress
    );

    console.log(SECTION_SEPARATOR);

    return {
        arcdDist,
        arcdToken,
        coreVoting,
        gscCoreVoting,
        timelock,
        frozenLockingVaultImp,
        simpleProxy,
        gscVault,
        treasury
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