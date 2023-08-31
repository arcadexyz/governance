import { expect } from "chai";
import { Contract } from "ethers";
import fs from "fs";
import hre, { ethers } from "hardhat";
import fetch from "node-fetch";
import path from "path";
import { URLSearchParams } from "url";

import {
    ARCDVestingVault,
    ArcadeAirdrop,
    ArcadeCoreVoting,
    ArcadeGSCCoreVoting,
    ArcadeGSCVault,
    ArcadeToken,
    ArcadeTokenDistributor,
    ArcadeTreasury,
    BadgeDescriptor,
    ImmutableVestingVault,
    NFTBoostVault,
    ReputationBadge,
    Timelock,
} from "../../../src/types";

export interface DeployedResources {
    arcadeTokenDistributor: ArcadeTokenDistributor;
    arcadeToken: ArcadeToken;
    timelock: Timelock;
    teamVestingVault: ARCDVestingVault;
    partnerVestingVault: ImmutableVestingVault;
    nftBoostVault: NFTBoostVault;
    arcadeCoreVoting: ArcadeCoreVoting;
    arcadeGSCVault: ArcadeGSCVault;
    arcadeGSCCoreVoting: ArcadeGSCCoreVoting;
    arcadeTreasuryTimelock: Timelock;
    arcadeTreasury: ArcadeTreasury;
    arcadeAirdrop: ArcadeAirdrop;
    badgeDescriptor: BadgeDescriptor;
    reputationBadge: ReputationBadge;
}

export const NETWORK = hre.network.name;
export const ROOT_DIR = path.join(__dirname, "../../../");
export const DEPLOYMENTS_DIR = path.join(ROOT_DIR, ".deployments", NETWORK);

export const SECTION_SEPARATOR = "\n" + "=".repeat(80) + "\n";
export const SUBSECTION_SEPARATOR = "-".repeat(10);

export const jsonContracts: { [key: string]: string } = {
    ArcadeTokenDistributor: "arcadeTokenDistributor",
    ArcadeToken: "arcadeToken",
    Timelock: "timelock",
    ARCDVestingVault: "teamVestingVault",
    ImmutableVestingVault: "partnerVestingVault",
    NFTBoostVault: "nftBoostVault",
    ArcadeCoreVoting: "arcadeCoreVoting",
    ArcadeGSCVault: "arcadeGSCVault",
    ArcadeGSCCoreVoting: "arcadeGSCCoreVoting",
    ArcadeTreasuryTimelock: "arcadeTreasuryTimelock",
    ArcadeTreasury: "arcadeTreasury",
    ArcadeAirdrop: "arcadeAirdrop",
    BadgeDescriptor: "badgeDescriptor",
    ReputationBadge: "reputationBadge",
};

export const getLatestDeploymentFile = (): string => {
    // Make sure JSON file exists
    const files = fs.readdirSync(DEPLOYMENTS_DIR);
    expect(files.length).to.be.gt(0);

    const { filename } = files.slice(1).reduce(
        (result, file) => {
            const stats = fs.statSync(path.join(DEPLOYMENTS_DIR, file));

            if (stats.ctime > result.ctime) {
                result = {
                    filename: file,
                    ctime: stats.ctime,
                };
            }

            return result;
        },
        {
            filename: files[0],
            ctime: fs.statSync(path.join(DEPLOYMENTS_DIR, files[0])).ctime,
        },
    );

    return path.join(DEPLOYMENTS_DIR, filename);
};

export const getLatestDeployment = (): Record<string, any> => {
    const fileData = fs.readFileSync(getLatestDeploymentFile(), "utf-8");
    const deployment = JSON.parse(fileData);

    return deployment;
};

export const getVerifiedABI = async (address: string): Promise<any> => {
    // Wait 1 sec to get around rate limits
    await new Promise(done => setTimeout(done, 1000));

    const params = new URLSearchParams({
        module: "contract",
        action: "getabi",
        address,
        apikey: process.env.ETHERSCAN_API_KEY as string,
    });

    const NETWORK = hre.network.name;
    const BASE_URL = NETWORK === "mainnet" ? "api.etherscan.io" : `api-${NETWORK}.etherscan.io`;

    const res = <any>await fetch(`https://${BASE_URL}/api?${params}`);
    const { result } = await res.json();

    return JSON.parse(result);
};

export const loadContracts = async (jsonFile: string): Promise<DeployedResources> => {
    const readData = fs.readFileSync(jsonFile, "utf-8");
    const jsonData = JSON.parse(readData);
    const contracts: { [key: string]: Contract } = {};

    for await (const key of Object.keys(jsonData)) {
        if (!(key in jsonContracts)) continue;

        const argKey = jsonContracts[key];
        console.log(`Key: ${key}, address: ${jsonData[key]["contractAddress"]}`);

        const contract: Contract = await ethers.getContractAt(key, jsonData[key]["contractAddress"]);

        contracts[argKey] = contract;
    }

    return contracts as unknown as DeployedResources;
};
