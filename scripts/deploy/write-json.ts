import fs from "fs";
import hre from "hardhat";
import { ethers } from "hardhat";
import path from "path";

import {
    AIRDROP_EXPIRATION,
    BADGE_DESCRIPTOR_BASE_URI,
    BASE_QUORUM,
    BASE_QUORUM_GSC,
    DEPLOYER_ADDRESS,
    GSC_THRESHOLD,
    MIN_PROPOSAL_POWER_CORE_VOTING,
    MIN_PROPOSAL_POWER_GSC,
    NFT_BOOST_VAULT_MANAGER,
    STALE_BLOCK_LAG,
    TIMELOCK_WAIT_TIME,
    VESTING_MANAGER,
} from "./deployment-params";

export interface ContractData {
    contractAddress: string;
    constructorArgs: any[];
}

export interface DeploymentData {
    [contractName: string]: ContractData;
}

export async function writeJson(
    arcadeTokenDistributorAddress: string,
    arcadeTokenAddress: string,
    arcadeCoreVotingAddress: string,
    arcadeGSCCoreVotingAddress: string,
    timelockAddress: string,
    teamVestingVaultAddress: string,
    partnerVestingVaultAddress: string,
    nftBoostVaultAddress: string,
    arcadeGSCVaultAddress: string,
    arcadeTreasuryAddress: string,
    arcadeAirdropAddress: string,
    badgeDescriptorAddress: string,
    reputationBadgeAddress: string,
): Promise<void> {
    const timestamp = Math.floor(new Date().getTime() / 1000);
    const networkName = hre.network.name;
    const deploymentsFolder = `.deployments`;
    const jsonFile = `${networkName}-${timestamp}.json`;

    const deploymentsFolderPath = path.join(__dirname, "../../", deploymentsFolder);
    if (!fs.existsSync(deploymentsFolderPath)) fs.mkdirSync(deploymentsFolderPath);

    const networkFolderPath = path.join(deploymentsFolderPath, networkName);
    if (!fs.existsSync(networkFolderPath)) fs.mkdirSync(networkFolderPath);

    const contractInfo = await createInfo(
        arcadeTokenDistributorAddress,
        arcadeTokenAddress,
        arcadeCoreVotingAddress,
        arcadeGSCCoreVotingAddress,
        timelockAddress,
        teamVestingVaultAddress,
        partnerVestingVaultAddress,
        nftBoostVaultAddress,
        arcadeGSCVaultAddress,
        arcadeTreasuryAddress,
        arcadeAirdropAddress,
        badgeDescriptorAddress,
        reputationBadgeAddress,
    );

    fs.writeFileSync(path.join(networkFolderPath, jsonFile), JSON.stringify(contractInfo, undefined, 2));

    console.log("Deployment artifacts saved to: ", path.join(networkFolderPath, jsonFile));
}

export async function createInfo(
    arcadeTokenDistributorAddress: string,
    arcadeTokenAddress: string,
    arcadeCoreVotingAddress: string,
    arcadeGSCCoreVotingAddress: string,
    timelockAddress: string,
    teamVestingVaultAddress: string,
    partnerVestingVaultAddress: string,
    nftBoostVaultAddress: string,
    arcadeGSCVaultAddress: string,
    arcadeTreasuryAddress: string,
    arcadeAirdropAddress: string,
    badgeDescriptorAddress: string,
    reputationBadgeAddress: string,
): Promise<DeploymentData> {
    const contractInfo: DeploymentData = {};

    contractInfo["ArcadeTokenDistributor"] = {
        contractAddress: arcadeTokenDistributorAddress,
        constructorArgs: [],
    };

    contractInfo["ArcadeToken"] = {
        contractAddress: arcadeTokenAddress,
        constructorArgs: [DEPLOYER_ADDRESS, arcadeTokenDistributorAddress],
    };

    contractInfo["Timelock"] = {
        contractAddress: timelockAddress,
        constructorArgs: [TIMELOCK_WAIT_TIME, DEPLOYER_ADDRESS, DEPLOYER_ADDRESS],
    };

    contractInfo["ARCDVestingVault"] = {
        contractAddress: teamVestingVaultAddress,
        constructorArgs: [arcadeTokenAddress, STALE_BLOCK_LAG, VESTING_MANAGER, timelockAddress],
    };

    contractInfo["ImmutableVestingVault"] = {
        contractAddress: partnerVestingVaultAddress,
        constructorArgs: [arcadeTokenAddress, STALE_BLOCK_LAG, VESTING_MANAGER, timelockAddress],
    };

    contractInfo["NFTBoostVault"] = {
        contractAddress: nftBoostVaultAddress,
        constructorArgs: [arcadeTokenAddress, STALE_BLOCK_LAG, DEPLOYER_ADDRESS, DEPLOYER_ADDRESS],
    };

    contractInfo["ArcadeCoreVoting"] = {
        contractAddress: arcadeCoreVotingAddress,
        constructorArgs: [
            DEPLOYER_ADDRESS,
            BASE_QUORUM,
            MIN_PROPOSAL_POWER_CORE_VOTING,
            ethers.constants.AddressZero,
            [teamVestingVaultAddress, partnerVestingVaultAddress, nftBoostVaultAddress],
            true,
        ],
    };

    contractInfo["ArcadeGSCVault"] = {
        contractAddress: arcadeGSCVaultAddress,
        constructorArgs: [arcadeCoreVotingAddress, GSC_THRESHOLD, timelockAddress],
    };

    contractInfo["ArcadeGSCCoreVoting"] = {
        contractAddress: arcadeGSCCoreVotingAddress,
        constructorArgs: [
            DEPLOYER_ADDRESS,
            BASE_QUORUM_GSC,
            MIN_PROPOSAL_POWER_GSC,
            ethers.constants.AddressZero,
            [arcadeGSCVaultAddress],
        ],
    };

    contractInfo["ArcadeTreasury"] = {
        contractAddress: arcadeTreasuryAddress,
        constructorArgs: [DEPLOYER_ADDRESS],
    };

    contractInfo["ArcadeAirdrop"] = {
        contractAddress: arcadeAirdropAddress,
        constructorArgs: [
            DEPLOYER_ADDRESS,
            ethers.constants.HashZero,
            arcadeTokenAddress,
            AIRDROP_EXPIRATION,
            nftBoostVaultAddress,
        ],
    };

    contractInfo["BadgeDescriptor"] = {
        contractAddress: badgeDescriptorAddress,
        constructorArgs: [BADGE_DESCRIPTOR_BASE_URI],
    };

    contractInfo["ReputationBadge"] = {
        contractAddress: reputationBadgeAddress,
        constructorArgs: [DEPLOYER_ADDRESS, badgeDescriptorAddress],
    };

    return contractInfo;
}
