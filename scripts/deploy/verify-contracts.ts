import { BigNumberish } from "ethers";
import fs from "fs";
import hre from "hardhat";

import { SECTION_SEPARATOR, SUBSECTION_SEPARATOR } from "./test/utils";
import { ContractData } from "./write-json";

async function verifyArtifacts(contractName: string, contractAddress: string, constructorArgs: BigNumberish[]) {
    console.log(`${contractName}: ${contractAddress}`);
    console.log(SUBSECTION_SEPARATOR);

    const address = contractAddress;

    try {
        if (contractName === "NFTBoostVault") {
            await hre.run("verify:verify", {
                address,
                constructorArguments: constructorArgs,
                contract: `contracts/NFTBoostVault.sol:NFTBoostVault`,
            });
        } else if (contractName === "ArcadeCoreVoting") {
            await hre.run("verify:verify", {
                address,
                constructorArguments: constructorArgs,
                contract: `contracts/ArcadeCoreVoting.sol:ArcadeCoreVoting`,
            });
        } else if (contractName === "ArcadeGSCCoreVoting") {
            await hre.run("verify:verify", {
                address,
                constructorArguments: constructorArgs,
                contract: `contracts/ArcadeGSCCoreVoting.sol:ArcadeGSCCoreVoting`,
            });
        } else if (contractName === "ArcadeGSCVault") {
            await hre.run("verify:verify", {
                address,
                constructorArguments: constructorArgs,
                contract: `contracts/ArcadeGSCVault.sol:ArcadeGSCVault`,
            });
        } else if (contractName === "Timelock") {
            await hre.run("verify:verify", {
                address,
                constructorArguments: constructorArgs,
                contract: `contracts/external/council/features/Timelock.sol:Timelock`,
            });
        } else if (contractName === "ArcadeTreasuryTimelock") {
            await hre.run("verify:verify", {
                address,
                constructorArguments: constructorArgs,
                contract: `contracts/ArcadeTreasuryTimelock.sol:ArcadeTreasuryTimelock`,
            });
        } else {
            await hre.run("verify:verify", {
                address,
                constructorArguments: constructorArgs,
            });
        }
    } catch (err: any) {
        if (!err.message.match(/already verified/i)) {
            throw err;
        } else {
            console.log("\nContract already verified.");
        }
    }

    console.log(`${contractName}: ${address}`, "has been verified.");
    console.log(SECTION_SEPARATOR);
}

// get data from deployments json to run verify artifacts
export async function main(): Promise<void> {
    // retrieve command line args array
    const file = process.env.DEPLOYMENT_FILE;

    // if file not in .env, exit
    if (!file) {
        console.error("No deployment file provided");
        process.exit(1);
    }

    console.log("File:", file);

    // read deployment json to get contract addresses and constructor arguments
    const readData = fs.readFileSync(file, "utf-8");
    const jsonData = JSON.parse(readData);

    // loop through jsonData to run verifyArtifacts function
    for (const property in jsonData) {
        const dataFromJson = <ContractData>jsonData[property];

        await verifyArtifacts(property, dataFromJson.contractAddress, dataFromJson.constructorArgs);
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error: Error) => {
            console.error(error);
            process.exit(1);
        });
}
