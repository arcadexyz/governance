import { ethers } from "hardhat";

import {
    APPROVE_LARGE_SPEND,
    APPROVE_LARGE_SPEND_QUORUM,
    APPROVE_MEDIUM_SPEND,
    APPROVE_MEDIUM_SPEND_QUORUM,
    INCREASE_TIME,
    INCREASE_TIME_QUORUM,
    LARGE_SPEND,
    LARGE_SPEND_QUORUM,
    LOAN_CORE_ADDR,
    MEDIUM_SPEND,
    MEDIUM_SPEND_QUORUM,
    MINT_TOKENS,
    MINT_TOKENS_QUORUM,
    ORIGINATION_CONTROLLER_ADDR,
    PAUSE,
    PAUSE_QUORUM,
    REGISTER_CALL,
    REGISTER_CALL_QUORUM,
    SET_AIRDROP_CONTRACT,
    SET_AIRDROP_CONTRACT_QUORUM,
    SET_ALLOWED_PAYABLE_CURRENCIES,
    SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM,
    SET_ALLOWED_VERIFIERS,
    SET_ALLOWED_VERIFIERS_QUORUM,
    SET_MINTER,
    SET_MINTER_QUORUM,
    SET_WAIT_TIME,
    SET_WAIT_TIME_QUORUM,
    UNLOCK,
    UNLOCK_QUORUM,
} from "./config/custom-quorum-params";
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
    VESTING_MANAGER,
} from "./config/deployment-params";
import {
    APE_ADDRESS,
    APE_LARGE,
    APE_MEDIUM,
    APE_SMALL,
    ARCD_LARGE,
    ARCD_MEDIUM,
    ARCD_SMALL,
    DAI_ADDRESS,
    DAI_LARGE,
    DAI_MEDIUM,
    DAI_SMALL,
    ETH_ADDRESS,
    ETH_LARGE,
    ETH_MEDIUM,
    ETH_SMALL,
    USDC_ADDRESS,
    USDC_LARGE,
    USDC_MEDIUM,
    USDC_SMALL,
    USDT_ADDRESS,
    USDT_LARGE,
    USDT_MEDIUM,
    USDT_SMALL,
    WBTC_ADDRESS,
    WBTC_LARGE,
    WBTC_MEDIUM,
    WBTC_SMALL,
    WETH_ADDRESS,
    WETH_LARGE,
    WETH_MEDIUM,
    WETH_SMALL,
} from "./config/treasury-thresholds";
import { DeployedResources, SUBSECTION_SEPARATOR, loadContracts } from "./test/utils";
import { SECTION_SEPARATOR } from "./test/utils";

export async function setupRoles(resources: DeployedResources): Promise<void> {
    const [deployer] = await ethers.getSigners();
    const {
        arcadeToken,
        arcadeTokenDistributor,
        arcadeCoreVoting,
        timelock,
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

    // ================= ArcadeTokenDistributor =================
    console.log("SettingArcadeToken in ArcadeTokenDistributor...");
    const tx2 = await arcadeTokenDistributor.setToken(arcadeToken.address);
    await tx2.wait();

    console.log("Distributing ARCD to treasury, airdrop contract, and vesting manager...");
    const tx3 = await arcadeTokenDistributor.toGovernanceTreasury(arcadeTreasury.address);
    await tx3.wait();
    const tx4 = await arcadeTokenDistributor.toCommunityAirdrop(arcadeAirdrop.address);
    await tx4.wait();
    const tx5 = await arcadeTokenDistributor.toTeamVesting(VESTING_MANAGER);
    await tx5.wait();
    const tx6 = await arcadeTokenDistributor.toPartnerVesting(VESTING_MANAGER);
    await tx6.wait();

    console.log("Transferring ownership of ArcadeTokenDistributor to multisig...");
    const tx7 = await arcadeTokenDistributor.transferOwnership(LAUNCH_PARTNER_MULTISIG);
    await tx7.wait();

    // ================= ArcadeAirdrop =================
    console.log("Transferring airdrop contract ownership to multisig...");
    const tx8 = await arcadeAirdrop.setOwner(LAUNCH_PARTNER_MULTISIG);
    await tx8.wait();

    // ================= NFTBoostVault =================
    console.log("Setting airdrop contract in nftBoostVault...");
    const tx9 = await nftBoostVault.setAirdropContract(arcadeAirdrop.address);
    await tx9.wait();
    console.log("Transferring nftBoostVault manager role to multisig...");
    const tx10 = await nftBoostVault.setManager(LAUNCH_PARTNER_MULTISIG);
    await tx10.wait();
    console.log("Transferring nftBoostVault timelock role to ArcadeCoreVoting...");
    const tx11 = await nftBoostVault.setTimelock(arcadeCoreVoting.address);
    await tx11.wait();

    // ================== ArcadeCoteVoting ==================
    console.log("Setting custom quorum thresholds in CoreVoting...");
    // ArcadeToken
    const tx12 = await arcadeCoreVoting.setCustomQuorum(arcadeToken.address, MINT_TOKENS, MINT_TOKENS_QUORUM);
    await tx12.wait();
    const tx13 = await arcadeCoreVoting.setCustomQuorum(arcadeToken.address, SET_MINTER, SET_MINTER_QUORUM);
    await tx13.wait();
    // NFTBoostVault
    const tx14 = await arcadeCoreVoting.setCustomQuorum(
        nftBoostVault.address,
        SET_AIRDROP_CONTRACT,
        SET_AIRDROP_CONTRACT_QUORUM,
    );
    await tx14.wait();
    const tx15 = await arcadeCoreVoting.setCustomQuorum(nftBoostVault.address, UNLOCK, UNLOCK_QUORUM);
    await tx15.wait();
    // Timelock
    const tx16 = await arcadeCoreVoting.setCustomQuorum(timelock.address, REGISTER_CALL, REGISTER_CALL_QUORUM);
    await tx16.wait();
    const tx17 = await arcadeCoreVoting.setCustomQuorum(timelock.address, SET_WAIT_TIME, SET_WAIT_TIME_QUORUM);
    await tx17.wait();
    // ArcadeTreasury
    const tx18 = await arcadeCoreVoting.setCustomQuorum(arcadeTreasury.address, MEDIUM_SPEND, MEDIUM_SPEND_QUORUM);
    await tx18.wait();
    const tx19 = await arcadeCoreVoting.setCustomQuorum(
        arcadeTreasury.address,
        APPROVE_MEDIUM_SPEND,
        APPROVE_MEDIUM_SPEND_QUORUM,
    );
    await tx19.wait();
    const tx20 = await arcadeCoreVoting.setCustomQuorum(arcadeTreasury.address, LARGE_SPEND, LARGE_SPEND_QUORUM);
    await tx20.wait();
    const tx21 = await arcadeCoreVoting.setCustomQuorum(
        arcadeTreasury.address,
        APPROVE_LARGE_SPEND,
        APPROVE_LARGE_SPEND_QUORUM,
    );
    await tx21.wait();
    // OriginationController
    const tx22 = await arcadeCoreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_VERIFIERS,
        SET_ALLOWED_VERIFIERS_QUORUM,
    );
    await tx22.wait();
    const tx23 = await arcadeCoreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_PAYABLE_CURRENCIES,
        SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM,
    );
    await tx23.wait();

    console.log("Decentralize ArcadeCoreVoting...");
    const tx24 = await arcadeCoreVoting.authorize(arcadeGSCCoreVoting.address);
    await tx24.wait();
    const tx25 = await arcadeCoreVoting.setOwner(timelock.address);
    await tx25.wait();

    // ================= Timelock =================
    console.log("Decentralize Timelock...");
    const tx26 = await timelock.deauthorize(deployer.address);
    await tx26.wait();
    const tx27 = await timelock.authorize(arcadeGSCCoreVoting.address);
    await tx27.wait();
    const tx28 = await timelock.setOwner(arcadeCoreVoting.address);
    await tx28.wait();

    // ================= ArcadeGSCCoreVoting =================
    console.log("Setting custom quorum thresholds in ArcadeGSCCoreVoting...");
    // LoanCore
    const tx29 = await arcadeGSCCoreVoting.setCustomQuorum(LOAN_CORE_ADDR, PAUSE, PAUSE_QUORUM);
    await tx29.wait();
    // timelock
    const tx30 = await arcadeGSCCoreVoting.setCustomQuorum(timelock.address, INCREASE_TIME, INCREASE_TIME_QUORUM);
    await tx30.wait();
    console.log("Changing min lock time for GSC proposals from 3 days to 8 hours...");
    const tx31 = await arcadeGSCCoreVoting.setLockDuration(GSC_MIN_LOCK_DURATION);
    await tx31.wait();
    console.log("Decentralize ArcadeGSCCoreVoting...");
    const tx32 = await arcadeGSCCoreVoting.setOwner(timelock.address);
    await tx32.wait();

    // ================= ArcadeTreasury =================
    console.log("Setting spend thresholds in ArcadeTreasury...");
    const tx33 = await arcadeTreasury.setThreshold(arcadeToken.address, {
        small: ARCD_SMALL,
        medium: ARCD_MEDIUM,
        large: ARCD_LARGE,
    });
    await tx33.wait();
    const tx34 = await arcadeTreasury.setThreshold(ETH_ADDRESS, {
        small: ETH_SMALL,
        medium: ETH_MEDIUM,
        large: ETH_LARGE,
    });
    await tx34.wait();
    const tx35 = await arcadeTreasury.setThreshold(WETH_ADDRESS, {
        small: WETH_SMALL,
        medium: WETH_MEDIUM,
        large: WETH_LARGE,
    });
    await tx35.wait();
    const tx36 = await arcadeTreasury.setThreshold(USDC_ADDRESS, {
        small: USDC_SMALL,
        medium: USDC_MEDIUM,
        large: USDC_LARGE,
    });
    await tx36.wait();
    const tx37 = await arcadeTreasury.setThreshold(USDT_ADDRESS, {
        small: USDT_SMALL,
        medium: USDT_MEDIUM,
        large: USDT_LARGE,
    });
    await tx37.wait();
    const tx38 = await arcadeTreasury.setThreshold(DAI_ADDRESS, {
        small: DAI_SMALL,
        medium: DAI_MEDIUM,
        large: DAI_LARGE,
    });
    await tx38.wait();
    const tx39 = await arcadeTreasury.setThreshold(WBTC_ADDRESS, {
        small: WBTC_SMALL,
        medium: WBTC_MEDIUM,
        large: WBTC_LARGE,
    });
    await tx39.wait();
    const tx40 = await arcadeTreasury.setThreshold(APE_ADDRESS, {
        small: APE_SMALL,
        medium: APE_MEDIUM,
        large: APE_LARGE,
    });
    await tx40.wait();

    console.log("Grant ArcadeTreasury permissions to foundation multisig...");
    const tx41 = await arcadeTreasury.grantRole(GSC_CORE_VOTING_ROLE, FOUNDATION_MULTISIG);
    await tx41.wait();
    const tx42 = await arcadeTreasury.grantRole(CORE_VOTING_ROLE, FOUNDATION_MULTISIG);
    await tx42.wait();
    const tx43 = await arcadeTreasury.grantRole(ADMIN_ROLE, FOUNDATION_MULTISIG);
    await tx43.wait();
    const tx44 = await arcadeTreasury.renounceRole(ADMIN_ROLE, deployer.address);
    await tx44.wait();

    // ================= ReputationBadge =================
    console.log("Setup ReputationBadge roles...");
    const tx45 = await reputationBadge.grantRole(BADGE_MANAGER_ROLE, LAUNCH_PARTNER_MULTISIG);
    await tx45.wait();
    const tx46 = await reputationBadge.grantRole(RESOURCE_MANAGER_ROLE, LAUNCH_PARTNER_MULTISIG);
    await tx46.wait();
    const tx47 = await reputationBadge.grantRole(FEE_CLAIMER_ROLE, arcadeTreasury.address);
    await tx47.wait();
    const tx48 = await reputationBadge.grantRole(ADMIN_ROLE, LAUNCH_PARTNER_MULTISIG);
    await tx48.wait();
    const tx49 = await reputationBadge.renounceRole(ADMIN_ROLE, deployer.address);
    await tx49.wait();

    // ================ Badge Descriptor ==================
    console.log("Transferring BadgeDescriptor ownership to multisig...");
    const tx50 = await badgeDescriptor.transferOwnership(LAUNCH_PARTNER_MULTISIG);
    await tx50.wait();

    console.log(SECTION_SEPARATOR);
    console.log("✅ Setup complete.");
    console.log(SECTION_SEPARATOR);
}

if (require.main === module) {
    // retrieve command line args array
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
