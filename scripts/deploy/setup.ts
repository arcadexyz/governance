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
        launchPartnerVestingVault,
        partnerVestingVault,
        nftBoostVault,
        arcadeGSCCoreVoting,
        arcadeTreasury,
        airdropSeason0,
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

    // ================= AirdropSeason0 =================
    console.log("Transferring airdrop contract ownership to multisig...");
    const tx3 = await airdropSeason0.setOwner(LAUNCH_PARTNER_MULTISIG);
    await tx3.wait();

    // ================= ARCDVestingVault =================
    console.log("Transferring team vesting vault timelock role...");
    const tx4 = await launchPartnerVestingVault.setTimelock(timelock.address);
    await tx4.wait();

    // ================= ImmutableVestingVault =================
    console.log("Transferring early investor vesting vault timelock role...");
    const tx5 = await partnerVestingVault.setTimelock(timelock.address);
    await tx5.wait();

    // ================= NFTBoostVault =================
    console.log("Setting airdrop contract in nftBoostVault...");
    const tx6 = await nftBoostVault.setAirdropContract(airdropSeason0.address);
    await tx6.wait();
    console.log("Transferring nftBoostVault manager role to multisig...");
    const tx7 = await nftBoostVault.setManager(LAUNCH_PARTNER_MULTISIG);
    await tx7.wait();
    console.log("Transferring nftBoostVault timelock role to ArcadeCoreVoting...");
    const tx8 = await nftBoostVault.setTimelock(arcadeCoreVoting.address);
    await tx8.wait();

    // ================== ArcadeCoreVoting ==================
    console.log("Decentralize ArcadeCoreVoting...");
    const tx9 = await arcadeCoreVoting.authorize(arcadeGSCCoreVoting.address);
    await tx9.wait();
    const tx10 = await arcadeCoreVoting.setOwner(timelock.address);
    await tx10.wait();

    // ================= Timelock =================
    console.log("Decentralize Timelock...");
    const tx11 = await timelock.deauthorize(deployer.address);
    await tx11.wait();
    const tx12 = await timelock.authorize(arcadeGSCCoreVoting.address);
    await tx12.wait();
    const tx13 = await timelock.setOwner(arcadeCoreVoting.address);
    await tx13.wait();

    // ================= ArcadeGSCCoreVoting =================
    console.log("Changing min lock time for GSC proposals from 3 days to 8 hours...");
    const tx14 = await arcadeGSCCoreVoting.setLockDuration(GSC_MIN_LOCK_DURATION);
    await tx14.wait();
    console.log("Decentralize ArcadeGSCCoreVoting...");
    const tx15 = await arcadeGSCCoreVoting.setOwner(timelock.address);
    await tx15.wait();

    // ================= ArcadeTreasury =================
    console.log("Grant ArcadeTreasury permissions to foundation multisig...");
    const tx16 = await arcadeTreasury.grantRole(GSC_CORE_VOTING_ROLE, FOUNDATION_MULTISIG);
    await tx16.wait();
    const tx17 = await arcadeTreasury.grantRole(CORE_VOTING_ROLE, FOUNDATION_MULTISIG);
    await tx17.wait();
    const tx18 = await arcadeTreasury.grantRole(ADMIN_ROLE, FOUNDATION_MULTISIG);
    await tx18.wait();
    const tx19 = await arcadeTreasury.renounceRole(ADMIN_ROLE, deployer.address);
    await tx19.wait();

    // ================= ReputationBadge =================
    console.log("Setup ReputationBadge roles...");
    const tx20 = await reputationBadge.grantRole(BADGE_MANAGER_ROLE, LAUNCH_PARTNER_MULTISIG);
    await tx20.wait();
    const tx21 = await reputationBadge.grantRole(RESOURCE_MANAGER_ROLE, LAUNCH_PARTNER_MULTISIG);
    await tx21.wait();
    const tx22 = await reputationBadge.grantRole(FEE_CLAIMER_ROLE, arcadeTreasury.address);
    await tx22.wait();
    const tx23 = await reputationBadge.grantRole(ADMIN_ROLE, LAUNCH_PARTNER_MULTISIG);
    await tx23.wait();
    const tx24 = await reputationBadge.renounceRole(ADMIN_ROLE, deployer.address);
    await tx24.wait();

    // ================ Badge Descriptor ==================
    console.log("Transferring BadgeDescriptor ownership to multisig...");
    const tx25 = await badgeDescriptor.transferOwnership(LAUNCH_PARTNER_MULTISIG);
    await tx25.wait();

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
