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
    SHUTDOWN,
    SHUTDOWN_QUORUM,
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

    // ================= ArcadeAirdrop =================
    console.log("Transferring airdrop contract ownership to multisig...");
    const tx2 = await arcadeAirdrop.setOwner(LAUNCH_PARTNER_MULTISIG);
    await tx2.wait();

    // ================= NFTBoostVault =================
    console.log("Setting airdrop contract in nftBoostVault...");
    const tx3 = await nftBoostVault.setAirdropContract(arcadeAirdrop.address);
    await tx3.wait();
    console.log("Transferring nftBoostVault manager role to multisig...");
    const tx4 = await nftBoostVault.setManager(LAUNCH_PARTNER_MULTISIG);
    await tx4.wait();
    console.log("Transferring nftBoostVault timelock role to ArcadeCoreVoting...");
    const tx5 = await nftBoostVault.setTimelock(arcadeCoreVoting.address);
    await tx5.wait();

    // ================== ArcadeCoteVoting ==================
    console.log("Setting custom quorum thresholds in CoreVoting...");
    // ArcadeToken
    const tx6 = await arcadeCoreVoting.setCustomQuorum(arcadeToken.address, MINT_TOKENS, MINT_TOKENS_QUORUM);
    await tx6.wait();
    const tx7 = await arcadeCoreVoting.setCustomQuorum(arcadeToken.address, SET_MINTER, SET_MINTER_QUORUM);
    await tx7.wait();
    // NFTBoostVault
    const tx8 = await arcadeCoreVoting.setCustomQuorum(
        nftBoostVault.address,
        SET_AIRDROP_CONTRACT,
        SET_AIRDROP_CONTRACT_QUORUM,
    );
    await tx8.wait();
    const tx9 = await arcadeCoreVoting.setCustomQuorum(nftBoostVault.address, UNLOCK, UNLOCK_QUORUM);
    await tx9.wait();
    // Timelock
    const tx10 = await arcadeCoreVoting.setCustomQuorum(timelock.address, REGISTER_CALL, REGISTER_CALL_QUORUM);
    await tx10.wait();
    const tx11 = await arcadeCoreVoting.setCustomQuorum(timelock.address, SET_WAIT_TIME, SET_WAIT_TIME_QUORUM);
    await tx11.wait();
    // ArcadeTreasury
    const tx12 = await arcadeCoreVoting.setCustomQuorum(arcadeTreasury.address, MEDIUM_SPEND, MEDIUM_SPEND_QUORUM);
    await tx12.wait();
    const tx13 = await arcadeCoreVoting.setCustomQuorum(
        arcadeTreasury.address,
        APPROVE_MEDIUM_SPEND,
        APPROVE_MEDIUM_SPEND_QUORUM,
    );
    await tx13.wait();
    const tx14 = await arcadeCoreVoting.setCustomQuorum(arcadeTreasury.address, LARGE_SPEND, LARGE_SPEND_QUORUM);
    await tx14.wait();
    const tx15 = await arcadeCoreVoting.setCustomQuorum(
        arcadeTreasury.address,
        APPROVE_LARGE_SPEND,
        APPROVE_LARGE_SPEND_QUORUM,
    );
    await tx15.wait();
    // OriginationController
    const tx16 = await arcadeCoreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_VERIFIERS,
        SET_ALLOWED_VERIFIERS_QUORUM,
    );
    await tx16.wait();
    const tx17 = await arcadeCoreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_PAYABLE_CURRENCIES,
        SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM,
    );
    await tx17.wait();

    console.log("Decentralize ArcadeCoreVoting...");
    const tx18 = await arcadeCoreVoting.authorize(arcadeGSCCoreVoting.address);
    await tx18.wait();
    const tx19 = await arcadeCoreVoting.setOwner(timelock.address);
    await tx19.wait();

    // ================= Timelock =================
    console.log("Decentralize Timelock...");
    const tx20 = await timelock.deauthorize(deployer.address);
    await tx20.wait();
    const tx21 = await timelock.authorize(arcadeGSCCoreVoting.address);
    await tx21.wait();
    const tx22 = await timelock.setOwner(arcadeCoreVoting.address);
    await tx22.wait();

    // ================= ArcadeGSCCoreVoting =================
    console.log("Setting custom quorum thresholds in ArcadeGSCCoreVoting...");
    // LoanCore
    const tx23 = await arcadeGSCCoreVoting.setCustomQuorum(LOAN_CORE_ADDR, SHUTDOWN, SHUTDOWN_QUORUM);
    await tx23.wait();
    // timelock
    const tx24 = await arcadeGSCCoreVoting.setCustomQuorum(timelock.address, INCREASE_TIME, INCREASE_TIME_QUORUM);
    await tx24.wait();
    console.log("Changing min lock time for GSC proposals from 3 days to 8 hours...");
    const tx25 = await arcadeGSCCoreVoting.setLockDuration(GSC_MIN_LOCK_DURATION);
    await tx25.wait();
    console.log("Decentralize ArcadeGSCCoreVoting...");
    const tx26 = await arcadeGSCCoreVoting.setOwner(timelock.address);
    await tx26.wait();

    // ================= ArcadeTreasury =================
    console.log("Setting spend thresholds in ArcadeTreasury...");
    const tx27 = await arcadeTreasury.setThreshold(arcadeToken.address, {
        small: ARCD_SMALL,
        medium: ARCD_MEDIUM,
        large: ARCD_LARGE,
    });
    await tx27.wait();
    const tx28 = await arcadeTreasury.setThreshold(ETH_ADDRESS, {
        small: ETH_SMALL,
        medium: ETH_MEDIUM,
        large: ETH_LARGE,
    });
    await tx28.wait();
    const tx29 = await arcadeTreasury.setThreshold(WETH_ADDRESS, {
        small: WETH_SMALL,
        medium: WETH_MEDIUM,
        large: WETH_LARGE,
    });
    await tx29.wait();
    const tx30 = await arcadeTreasury.setThreshold(USDC_ADDRESS, {
        small: USDC_SMALL,
        medium: USDC_MEDIUM,
        large: USDC_LARGE,
    });
    await tx30.wait();
    const tx31 = await arcadeTreasury.setThreshold(USDT_ADDRESS, {
        small: USDT_SMALL,
        medium: USDT_MEDIUM,
        large: USDT_LARGE,
    });
    await tx31.wait();
    const tx32 = await arcadeTreasury.setThreshold(DAI_ADDRESS, {
        small: DAI_SMALL,
        medium: DAI_MEDIUM,
        large: DAI_LARGE,
    });
    await tx32.wait();
    const tx33 = await arcadeTreasury.setThreshold(WBTC_ADDRESS, {
        small: WBTC_SMALL,
        medium: WBTC_MEDIUM,
        large: WBTC_LARGE,
    });
    await tx33.wait();
    const tx34 = await arcadeTreasury.setThreshold(APE_ADDRESS, {
        small: APE_SMALL,
        medium: APE_MEDIUM,
        large: APE_LARGE,
    });
    await tx34.wait();

    console.log("Grant ArcadeTreasury permissions to foundation multisig...");
    const tx35 = await arcadeTreasury.grantRole(GSC_CORE_VOTING_ROLE, FOUNDATION_MULTISIG);
    await tx35.wait();
    const tx36 = await arcadeTreasury.grantRole(CORE_VOTING_ROLE, FOUNDATION_MULTISIG);
    await tx36.wait();
    const tx37 = await arcadeTreasury.grantRole(ADMIN_ROLE, FOUNDATION_MULTISIG);
    await tx37.wait();
    const tx38 = await arcadeTreasury.renounceRole(ADMIN_ROLE, deployer.address);
    await tx38.wait();

    // ================= ReputationBadge =================
    console.log("Setup ReputationBadge roles...");
    const tx39 = await reputationBadge.grantRole(BADGE_MANAGER_ROLE, LAUNCH_PARTNER_MULTISIG);
    await tx39.wait();
    const tx40 = await reputationBadge.grantRole(RESOURCE_MANAGER_ROLE, LAUNCH_PARTNER_MULTISIG);
    await tx40.wait();
    const tx41 = await reputationBadge.grantRole(FEE_CLAIMER_ROLE, arcadeTreasury.address);
    await tx41.wait();
    const tx42 = await reputationBadge.grantRole(ADMIN_ROLE, LAUNCH_PARTNER_MULTISIG);
    await tx42.wait();
    const tx43 = await reputationBadge.renounceRole(ADMIN_ROLE, deployer.address);
    await tx43.wait();

    // ================ Badge Descriptor ==================
    console.log("Transferring BadgeDescriptor ownership to multisig...");
    const tx44 = await badgeDescriptor.transferOwnership(LAUNCH_PARTNER_MULTISIG);
    await tx44.wait();

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
