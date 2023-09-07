import { ethers } from "hardhat";

import {
    ADMIN_ROLE,
    BADGE_MANAGER_ROLE,
    CORE_VOTING_ROLE,
    FEE_CLAIMER_ROLE,
    FOUNDATION_MULTISIG,
    GSC_CORE_VOTING_ROLE,
    GSC_MIN_LOCK_DURATION,
    LAUNCH_PARTNER_MULTISIG,
    RESOURCE_MANAGER_ROLE,
} from "./config/deployment-params";
import { DeployedResources, SUBSECTION_SEPARATOR, loadContracts } from "./test/utils";
import { SECTION_SEPARATOR } from "./test/utils";

export async function setupRoles(resources: DeployedResources): Promise<void> {
    const [deployer] = await ethers.getSigners();
    const {
        arcadeToken,
        arcadeTokenDistributor,
        arcadeCoreVoting,
        timelock,
        teamVestingVault,
        partnerVestingVault,
        nftBoostVault,
        arcadeGSCCoreVoting,
        arcadeTreasury,
        arcadeAirdrop,
        badgeDescriptor,
        reputationBadge,
    } = resources;

    console.log(SECTION_SEPARATOR);
    console.log("Setup contract permissions and state variables");
    console.log(SUBSECTION_SEPARATOR);

    // ================= ArcadeToken =================
    console.log("Setting ArcadeToken minter as CoreVoting...");
    const tx1 = await arcadeToken.setMinter(arcadeCoreVoting.address);
    await tx1.wait();

    // ============= ArcadeTokenDistributor ============
    console.log("Transferring ownership of ArcadeTokenDistributor to launch partner multisig...");
    const tx2 = await arcadeTokenDistributor.transferOwnership(LAUNCH_PARTNER_MULTISIG);
    await tx2.wait();

    // ================= ArcadeAirdrop =================
    console.log("Transferring airdrop contract ownership to multisig...");
    const tx3 = await arcadeAirdrop.setOwner(LAUNCH_PARTNER_MULTISIG);
    await tx3.wait();

    // ================= ARCDVestingVault =================
    console.log("Transferring team vesting vault timelock role...");
    const tx5 = await teamVestingVault.setTimelock(timelock.address);
    await tx5.wait();

    // ================= ImmutableVestingVault =================
    console.log("Transferring early investor vesting vault timelock role...");
    const tx7 = await partnerVestingVault.setTimelock(timelock.address);
    await tx7.wait();

    // ================= NFTBoostVault =================
    console.log("Setting airdrop contract in nftBoostVault...");
    const tx8 = await nftBoostVault.setAirdropContract(arcadeAirdrop.address);
    await tx8.wait();
    console.log("Transferring nftBoostVault manager role to multisig...");
    const tx9 = await nftBoostVault.setManager(LAUNCH_PARTNER_MULTISIG);
    await tx9.wait();
    console.log("Transferring nftBoostVault timelock role to ArcadeCoreVoting...");
    const tx10 = await nftBoostVault.setTimelock(arcadeCoreVoting.address);
    await tx10.wait();

    // ================== ArcadeCoreVoting ==================
    console.log("Decentralize ArcadeCoreVoting...");
    const tx11 = await arcadeCoreVoting.authorize(arcadeGSCCoreVoting.address);
    await tx11.wait();
    const tx12 = await arcadeCoreVoting.setOwner(timelock.address);
    await tx12.wait();

    // ================= Timelock =================
    console.log("Decentralize Timelock...");
    const tx13 = await timelock.deauthorize(deployer.address);
    await tx13.wait();
    const tx14 = await timelock.authorize(arcadeGSCCoreVoting.address);
    await tx14.wait();
    const tx15 = await timelock.setOwner(arcadeCoreVoting.address);
    await tx15.wait();

    // ================= ArcadeGSCCoreVoting =================
    console.log("Changing min lock time for GSC proposals from 3 days to 8 hours...");
    const tx = await arcadeGSCCoreVoting.setLockDuration(GSC_MIN_LOCK_DURATION);
    await tx.wait();
    console.log("Decentralize ArcadeGSCCoreVoting...");
    const tx16 = await arcadeGSCCoreVoting.setOwner(timelock.address);
    await tx16.wait();

    // ================= ArcadeTreasury =================
    console.log("Grant ArcadeTreasury permissions to foundation multisig...");
    const tx17 = await arcadeTreasury.grantRole(GSC_CORE_VOTING_ROLE, FOUNDATION_MULTISIG);
    await tx17.wait();
    const tx18 = await arcadeTreasury.grantRole(CORE_VOTING_ROLE, FOUNDATION_MULTISIG);
    await tx18.wait();
    const tx19 = await arcadeTreasury.grantRole(ADMIN_ROLE, FOUNDATION_MULTISIG);
    await tx19.wait();
    const tx20 = await arcadeTreasury.renounceRole(ADMIN_ROLE, deployer.address);
    await tx20.wait();

    // ================= ReputationBadge =================
    console.log("Setup ReputationBadge roles...");
    const tx21 = await reputationBadge.grantRole(BADGE_MANAGER_ROLE, LAUNCH_PARTNER_MULTISIG);
    await tx21.wait();
    const tx22 = await reputationBadge.grantRole(RESOURCE_MANAGER_ROLE, LAUNCH_PARTNER_MULTISIG);
    await tx22.wait();
    const tx23 = await reputationBadge.grantRole(FEE_CLAIMER_ROLE, arcadeTreasury.address);
    await tx23.wait();
    const tx24 = await reputationBadge.grantRole(ADMIN_ROLE, LAUNCH_PARTNER_MULTISIG);
    await tx24.wait();
    const tx25 = await reputationBadge.renounceRole(ADMIN_ROLE, deployer.address);
    await tx25.wait();

    // ================ Badge Descriptor ==================
    console.log("Transferring BadgeDescriptor ownership to multisig...");
    const tx26 = await badgeDescriptor.transferOwnership(LAUNCH_PARTNER_MULTISIG);
    await tx26.wait();

    console.log(SECTION_SEPARATOR);
    console.log("✅ Decentralization complete.");
    console.log(SECTION_SEPARATOR);
}

if (require.main === module) {
    // retrieve deployments file from .env
    const file = process.env.DEPLOYMENT_FILE;

    // if file not in .env, exit
    if (!file) {
        console.error("No deployment file provided");
        process.exit(1);
    }

    console.log("File:", file);

    void loadContracts(file)
        .then(setupRoles)
        .then(() => process.exit(0))
        .catch((error: Error) => {
            console.error(error);
            process.exit(1);
        });
}
