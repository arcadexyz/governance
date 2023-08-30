import fs from "fs";
import hre from "hardhat";
import path from "path";

import { DeployedResources } from "./test/utils";

export interface ContractData {
    contractAddress: string;
    constructorArgs: any[];
}

export interface DeploymentData {
    [contractName: string]: ContractData;
}

export async function writeJson(
    resources: DeployedResources,
    constructorArgs: { [contractName: string]: any[] },
): Promise<void> {
    const timestamp = Math.floor(new Date().getTime() / 1000);
    const networkName = hre.network.name;
    const deploymentsFolder = `.deployments`;
    const jsonFile = `${networkName}-${timestamp}.json`;

    const deploymentsFolderPath = path.join(__dirname, "../../", deploymentsFolder);
    if (!fs.existsSync(deploymentsFolderPath)) fs.mkdirSync(deploymentsFolderPath);

    const networkFolderPath = path.join(deploymentsFolderPath, networkName);
    if (!fs.existsSync(networkFolderPath)) fs.mkdirSync(networkFolderPath);

    const contractInfo = await createInfo(resources, constructorArgs);

    fs.writeFileSync(path.join(networkFolderPath, jsonFile), JSON.stringify(contractInfo, undefined, 2));

    console.log("Deployment artifacts saved to: ", path.join(networkFolderPath, jsonFile));
}

export async function createInfo(
    resources: DeployedResources,
    constructorArgs: { [contractName: string]: any[] },
): Promise<DeploymentData> {
    const contractInfo: DeploymentData = {};

    contractInfo["ArcadeTokenDistributor"] = {
        contractAddress: resources.arcadeTokenDistributor.address,
        constructorArgs: [],
    };

    contractInfo["ArcadeToken"] = {
        contractAddress: resources.arcadeToken.address,
        constructorArgs: constructorArgs.arcadeToken,
    };

    contractInfo["Timelock"] = {
        contractAddress: resources.timelock.address,
        constructorArgs: constructorArgs.timelock,
    };

    contractInfo["ARCDVestingVault"] = {
        contractAddress: resources.teamVestingVault.address,
        constructorArgs: constructorArgs.teamVestingVault,
    };

    contractInfo["ImmutableVestingVault"] = {
        contractAddress: resources.partnerVestingVault.address,
        constructorArgs: constructorArgs.partnerVestingVault,
    };

    contractInfo["NFTBoostVault"] = {
        contractAddress: resources.nftBoostVault.address,
        constructorArgs: constructorArgs.nftBoostVault,
    };

    contractInfo["ArcadeCoreVoting"] = {
        contractAddress: resources.arcadeCoreVoting.address,
        constructorArgs: constructorArgs.arcadeCoreVoting,
    };

    contractInfo["ArcadeGSCVault"] = {
        contractAddress: resources.arcadeGSCVault.address,
        constructorArgs: constructorArgs.arcadeGSCVault,
    };

    contractInfo["ArcadeGSCCoreVoting"] = {
        contractAddress: resources.arcadeGSCCoreVoting.address,
        constructorArgs: constructorArgs.arcadeGSCCoreVoting,
    };

    contractInfo["ArcadeTreasury"] = {
        contractAddress: resources.arcadeTreasury.address,
        constructorArgs: constructorArgs.arcadeTreasury,
    };

    contractInfo["ArcadeAirdrop"] = {
        contractAddress: resources.arcadeAirdrop.address,
        constructorArgs: constructorArgs.arcadeAirdrop,
    };

    contractInfo["BadgeDescriptor"] = {
        contractAddress: resources.badgeDescriptor.address,
        constructorArgs: constructorArgs.badgeDescriptor,
    };

    contractInfo["ReputationBadge"] = {
        contractAddress: resources.reputationBadge.address,
        constructorArgs: constructorArgs.reputationBadge,
    };

    return contractInfo;
}
