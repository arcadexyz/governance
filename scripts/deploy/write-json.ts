import fs from "fs";
import path from "path";
import hre, { upgrades } from "hardhat";
import { BigNumberish } from "ethers";

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

export interface ContractData {
    contractAddress: string;
    contractImplementationAddress?: string;
    constructorArgs: BigNumberish[];
}

export interface DeploymentData {
    [contractName: string]: ContractData;
}

export async function writeJson(
    arcdDistAddress: string,
    arcdTokenAddress: string,
    coreVotingAddress: string,
    gscCoreVotingAddress: string,
    timelockAddress: string,
    frozenLockingVaultImpAddress: string,
    frozenLockingVaultProxyAddress: string,
    vestingVaultImpAddress: string,
    vestingVaultProxyAddress: string,
    gscVaultAddress: string,
    treasuryAddress: string
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
        arcdDistAddress,
        arcdTokenAddress,
        coreVotingAddress,
        gscCoreVotingAddress,
        timelockAddress,
        frozenLockingVaultImpAddress,
        frozenLockingVaultProxyAddress,
        vestingVaultImpAddress,
        vestingVaultProxyAddress,
        gscVaultAddress,
        treasuryAddress
    );

    fs.writeFileSync(
        path.join(networkFolderPath, jsonFile),
        JSON.stringify(contractInfo, undefined, 2)
    );

    console.log("Contract info written to: ", path.join(networkFolderPath, jsonFile));
}

export async function createInfo(
    arcdDistAddress: string,
    arcdTokenAddress: string,
    coreVotingAddress: string,
    gscCoreVotingAddress: string,
    timelockAddress: string,
    frozenLockingVaultImpAddress: string,
    frozenLockingVaultProxyAddress: string,
    vestingVaultImpAddress: string,
    vestingVaultProxyAddress: string,
    gscVaultAddress: string,
    treasuryAddress: string
): Promise<DeploymentData> {
    const contractInfo: DeploymentData = {};

    contractInfo["ArcadeTokenDistributor"] = {
        contractAddress: arcdDistAddress,
        contractImplementationAddress: "",
        constructorArgs: []
    };

    contractInfo["ArcadeToken"] = {
        contractAddress: arcdTokenAddress,
        contractImplementationAddress: "",
        constructorArgs: [DEPLOYER_ADDRESS, arcdDistAddress]
    };

    contractInfo["CoreVoting"] = {
        contractAddress: coreVotingAddress,
        contractImplementationAddress: "",
        constructorArgs: [
            DEPLOYER_ADDRESS,
            BASE_QUORUM,
            MIN_PROPOSAL_POWER,
            ethers.constants.AddressZero,
            []
        ]
    };

    contractInfo["CoreVotingGSC"] = {
        contractAddress: gscCoreVotingAddress,
        contractImplementationAddress: "",
        constructorArgs: [
            DEPLOYER_ADDRESS,
            BASE_QUORUM_GSC,
            MIN_PROPOSAL_POWER_GSC,
            ethers.constants.AddressZero,
            []
        ]
    };

    contractInfo["Timelock"] = {
        contractAddress: timelockAddress,
        constructorArgs: [
            TIMELOCK_WAIT_TIME,
            DEPLOYER_ADDRESS,
            DEPLOYER_ADDRESS
        ]
    };

    contractInfo["FrozenLockingVault"] = {
        contractAddress: frozenLockingVaultImpAddress,
        constructorArgs: [arcdTokenAddress, STALE_BLOCK_LAG]
    };

    contractInfo["FrozenLockingVaultProxy"] = {
        contractAddress: frozenLockingVaultProxyAddress,
        contractImplementationAddress: frozenLockingVaultImpAddress,
        constructorArgs: [timelockAddress, frozenLockingVaultImpAddress],
    };

    contractInfo["VestingVault"] = {
        contractAddress: vestingVaultImpAddress,
        constructorArgs: [arcdTokenAddress, STALE_BLOCK_LAG]
    };

    contractInfo["VestingVaultProxy"] = {
        contractAddress: vestingVaultProxyAddress,
        contractImplementationAddress: vestingVaultImpAddress,
        constructorArgs: [timelockAddress, vestingVaultImpAddress],
    };

    contractInfo["GSCVault"] = {
        contractAddress: gscVaultAddress,
        contractImplementationAddress: "",
        constructorArgs: [
            coreVotingAddress,
            GSC_THRESHOLD,
            timelockAddress
        ]
    };

    contractInfo["Treasury"] = {
        contractAddress: treasuryAddress,
        contractImplementationAddress: "",
        constructorArgs: [DEPLOYER_ADDRESS]
    };

    return contractInfo;
}