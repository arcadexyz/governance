import { BigNumberish } from "ethers";
import fs from "fs";
import hre from "hardhat";
import path from "path";

import {
    AIRDROP_EXPIRATION,
    BASE_QUORUM,
    BASE_QUORUM_GSC,
    DEPLOYER_ADDRESS,
    GSC_THRESHOLD,
    MIN_PROPOSAL_POWER_CORE_VOTING,
    MIN_PROPOSAL_POWER_GSC,
    STALE_BLOCK_LAG,
    TEAM_VESTING_VAULT_MANAGER,
    TIMELOCK_WAIT_TIME,
} from "./deployment-params";

export interface ContractData {
    contractAddress: string;
    contractImplementationAddress?: string;
    constructorArgs: BigNumberish[];
}

export interface DeploymentData {
    [contractName: string]: ContractData;
}

export async function writeJson(
    arcadeTokenDistributorAddress: string,
    arcadeTokenAddress: string,
    coreVotingAddress: string,
    arcadeGSCCoreVotingAddress: string,
    timelockAddress: string,
    teamVestingVaultAddress: string,
    partnerVestingVaultAddress: string,
    NFTBoostVaultAddress: string,
    arcadeGSCVaultAddress: string,
    arcadeTreasuryAddress: string,
    arcadeAirdropAddress: string,
    staleBlock: number,
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
        coreVotingAddress,
        arcadeGSCCoreVotingAddress,
        timelockAddress,
        teamVestingVaultAddress,
        partnerVestingVaultAddress,
        NFTBoostVaultAddress,
        arcadeGSCVaultAddress,
        arcadeTreasuryAddress,
        arcadeAirdropAddress,
        staleBlock,
    );

    fs.writeFileSync(path.join(networkFolderPath, jsonFile), JSON.stringify(contractInfo, undefined, 2));

    console.log("Contract info written to: ", path.join(networkFolderPath, jsonFile));
}

export async function createInfo(
    arcadeTokenDistributorAddress: string,
    arcadeTokenAddress: string,
    coreVotingAddress: string,
    arcadeGSCCoreVotingAddress: string,
    timelockAddress: string,
    teamVestingVaultAddress: string,
    partnerVestingVaultAddress: string,
    NFTBoostVaultAddress: string,
    arcadeGSCVaultAddress: string,
    arcadeTreasuryAddress: string,
    arcadeAirdropAddress: string,
    staleBlock: number,
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

    contractInfo["CoreVoting"] = {
        contractAddress: coreVotingAddress,
        constructorArgs: [
            DEPLOYER_ADDRESS,
            BASE_QUORUM,
            MIN_PROPOSAL_POWER_CORE_VOTING,
            ethers.constants.AddressZero,
            [],
        ],
    };

    contractInfo["ArcadeGSCCoreVoting"] = {
        contractAddress: arcadeGSCCoreVotingAddress,
        constructorArgs: [DEPLOYER_ADDRESS, BASE_QUORUM_GSC, MIN_PROPOSAL_POWER_GSC, ethers.constants.AddressZero, []],
    };

    contractInfo["Timelock"] = {
        contractAddress: timelockAddress,
        constructorArgs: [TIMELOCK_WAIT_TIME, DEPLOYER_ADDRESS, DEPLOYER_ADDRESS],
    };

    contractInfo["ARCDVestingVault"] = {
        contractAddress: teamVestingVaultAddress,
        constructorArgs: [arcadeTokenAddress, staleBlock, TEAM_VESTING_VAULT_MANAGER, timelockAddress],
    };

    contractInfo["ImmutableVestingVault"] = {
        contractAddress: partnerVestingVaultAddress,
        constructorArgs: [arcadeTokenAddress, staleBlock, TEAM_VESTING_VAULT_MANAGER, timelockAddress],
    };

    contractInfo["NFTBoostVault"] = {
        contractAddress: NFTBoostVaultAddress,
        constructorArgs: [arcadeTokenAddress, staleBlock, timelockAddress, coreVotingAddress],
    };

    contractInfo["ArcadeGSCVault"] = {
        contractAddress: arcadeGSCVaultAddress,
        constructorArgs: [coreVotingAddress, GSC_THRESHOLD, timelockAddress],
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
            NFTBoostVaultAddress,
        ],
    };

    return contractInfo;
}
