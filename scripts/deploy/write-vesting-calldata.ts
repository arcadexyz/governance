import { BigNumber } from "ethers";
import fs from "fs";
import { ethers } from "hardhat";
import { mkdirp } from "mkdirp";
import path from "path";

import { VESTING_DURATION } from "./config/deployment-params";
import investorVestingData from "./config/vesting-data/investor-vesting-data.json";
import teamVestingData from "./config/vesting-data/team-vesting-data.json";
import { DeployedResources, NETWORK } from "./test/utils";

export interface TxData {
    functionName: string;
    description: string;
    calldata: string;
}

export interface ContractData {
    [contractAddress: string]: TxData[];
}

export interface VestingData {
    [contractName: string]: ContractData;
}

export async function createVestingData(
    resources: DeployedResources,
    teamAmount: BigNumber,
    investorAmount: BigNumber,
) {
    const vestingFolder = `.vesting/data`;
    const deploymentsFile = `${process.env.DEPLOYMENT_FILE?.split("/")[2]}`;

    const vestingFolderPath = path.join(__dirname, "../../", vestingFolder);
    if (!fs.existsSync(vestingFolderPath)) mkdirp.sync(vestingFolderPath);

    const networkFolderPath = path.join(vestingFolderPath, NETWORK);
    if (!fs.existsSync(networkFolderPath)) fs.mkdirSync(networkFolderPath);

    // create vesting calldata
    const vestingCalldata = await createData(resources, teamAmount, investorAmount);

    fs.writeFileSync(path.join(networkFolderPath, deploymentsFile), JSON.stringify(vestingCalldata, undefined, 2));

    console.log("Vesting calldata saved to: ", path.join(networkFolderPath, deploymentsFile));
}

export async function createData(
    resources: DeployedResources,
    teamAmount: BigNumber,
    investorAmount: BigNumber,
): Promise<VestingData> {
    /**
     * construct calldata on a per function call basis
     */
    const contractInfo: VestingData = {};

    contractInfo["ArcadeToken"] = {
        [resources.arcadeToken.address]: [
            {
                functionName: "approve",
                description: "Approve ARCDVestingVault to transfer tokens",
                calldata: resources.arcadeToken.interface.encodeFunctionData("approve", [
                    resources.launchPartnerVestingVault.address,
                    teamAmount,
                ]),
            },
            {
                functionName: "approve",
                description: "Approve ImmutableVestingVault to transfer tokens",
                calldata: resources.arcadeToken.interface.encodeFunctionData("approve", [
                    resources.partnerVestingVault.address,
                    investorAmount,
                ]),
            },
        ],
    };

    contractInfo["ARCDVestingVault"] = {
        [resources.launchPartnerVestingVault.address]: [
            {
                functionName: "deposit",
                description: "Deposit tokens into ARCDVestingVault contract",
                calldata: resources.launchPartnerVestingVault.interface.encodeFunctionData("deposit", [teamAmount]),
            },
        ],
    };

    contractInfo["ImmutableVestingVault"] = {
        [resources.partnerVestingVault.address]: [
            {
                functionName: "deposit",
                description: "Deposit tokens into ImmutableVestingVault contract",
                calldata: resources.partnerVestingVault.interface.encodeFunctionData("deposit", [investorAmount]),
            },
        ],
    };

    // global vesting parameters
    // const grantDurationInBlocks = VESTING_DURATION;
    // const currentBlock = await ethers.provider.getBlockNumber();
    const grantCliffBlock: number = 21037077; // same as team cliff
    const expirationBlock: number = 23652002; // same as team expiration

    // loop through all team grants and add to the contractInfo
    for (const grant of teamVestingData) {
        // calculate cliff amount
        const cliffAmount = grant.value / 2;
        contractInfo["ARCDVestingVault"][resources.launchPartnerVestingVault.address].push({
            functionName: "addGrantAndDelegate",
            description: `Grant tokens to ${grant.address}`,
            calldata: resources.launchPartnerVestingVault.interface.encodeFunctionData("addGrantAndDelegate", [
                grant.address,
                ethers.utils.parseEther(grant.value.toString()),
                ethers.utils.parseEther(cliffAmount.toString()),
                expirationBlock,
                grantCliffBlock,
                ethers.constants.AddressZero,
            ]),
        });
    }

    // loop through all investor grants and add to the contractInfo
    for (const grant of investorVestingData) {
        // calculate cliff amount
        const cliffAmount = grant.value / 2;
        contractInfo["ImmutableVestingVault"][resources.partnerVestingVault.address].push({
            functionName: "addGrantAndDelegate",
            description: `Grant tokens to ${grant.address}`,
            calldata: resources.partnerVestingVault.interface.encodeFunctionData("addGrantAndDelegate", [
                grant.address,
                ethers.utils.parseEther(grant.value.toString()),
                ethers.utils.parseEther(cliffAmount.toString()),
                expirationBlock,
                grantCliffBlock,
                ethers.constants.AddressZero,
            ]),
        });
    }

    return contractInfo;
}
