import fs from "fs";
import path from "path";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import fetch from "node-fetch";
import { URLSearchParams } from "url";
import hre, { ethers } from "hardhat";
import { expect } from "chai";
//import { fromRpcSig, ECDSASignature } from "ethereumjs-util";

export const NETWORK = hre.network.name;
//export const IS_MAINNET_FORK = process.env.FORK_MAINNET === "true";
export const ROOT_DIR = path.join(__dirname, "../../../");
export const DEPLOYMENTS_DIR = path.join(ROOT_DIR, ".deployments", NETWORK);

export const SECTION_SEPARATOR = "\n" + "=".repeat(80) + "\n";
export const SUBSECTION_SEPARATOR = "-".repeat(10);

export const getLatestDeploymentFile = (): string => {
    // Make sure JSON file exists
    const files = fs.readdirSync(DEPLOYMENTS_DIR);
    expect(files.length).to.be.gt(0);

    const { filename } = files.slice(1).reduce((result, file) => {
        const stats = fs.statSync(path.join(DEPLOYMENTS_DIR, file));

        if (stats.ctime > result.ctime) {
            result = {
                filename: file,
                ctime: stats.ctime
            };
        }

        return result;
    }, {
        filename: files[0],
        ctime: fs.statSync(path.join(DEPLOYMENTS_DIR, files[0])).ctime
    });

    return path.join(DEPLOYMENTS_DIR, filename);
}

export const getLatestDeployment = (): Record<string, any> => {
    const fileData = fs.readFileSync(getLatestDeploymentFile(), 'utf-8');
    const deployment = JSON.parse(fileData);

    return deployment;
}

export const getVerifiedABI = async (address: string ): Promise<any> => {
    // Wait 1 sec to get around rate limits
    await new Promise(done => setTimeout(done, 1000));

    const params = new URLSearchParams({
        module: 'contract',
        action: 'getabi',
        address,
        apikey: process.env.ETHERSCAN_API_KEY as string
    });

    const NETWORK = hre.network.name;
    const BASE_URL = NETWORK === "mainnet" ? "api.etherscan.io" : `api-${NETWORK}.etherscan.io`;

    const res = <any>await fetch(`https://${BASE_URL}/api?${params}`);
    const { result } = await res.json();

    return JSON.parse(result);
}


interface TypeData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    types: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    primaryType: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildData = (verifyingContract: string, name: string, version: string, message: any, typeData: TypeData) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const chainId = hre.network.config.chainId!;
    return Object.assign({}, typeData, {
        domain: {
            name,
            version,
            chainId,
            verifyingContract,
        },
        message,
    });
};
