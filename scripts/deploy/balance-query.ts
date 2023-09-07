import hre, { ethers } from "hardhat";

import { BalanceQuery } from "../../src/types";
import { BALANCE_QUERY_OWNER } from "./config/deployment-params";
import { DeployedResources, SECTION_SEPARATOR, SUBSECTION_SEPARATOR, loadContracts } from "./test/utils";

/**
 * This script deploys the BalanceQuery contract and verifies it on Etherscan.
 * The BalanceQuery contract gives a third party the ability to query the total balance
 * all the governance voting vaults. For example, Snapshot voting.
 *
 * To run this script use:
 * `npx hardhat run scripts/deploy/balance-query.ts --network <networkName>`
 */

export async function deployBalanceQuery(resources: DeployedResources) {
    console.log(SECTION_SEPARATOR);
    console.log("Deploying BalanceQuery contract...");

    // deploy BalanceQuery contract
    const BalanceQueryFactory = await ethers.getContractFactory("BalanceQuery");
    const balanceQuery = <BalanceQuery>(
        await BalanceQueryFactory.deploy(BALANCE_QUERY_OWNER, [
            resources.nftBoostVault.address,
            resources.teamVestingVault.address,
            resources.partnerVestingVault.address,
        ])
    );
    await balanceQuery.deployed();
    console.log("BalanceQuery deployed to:", balanceQuery.address);
    console.log(SUBSECTION_SEPARATOR);

    console.log("Waiting for 5 block confirmations...");
    // timeout for 1 min to wait for etherscan to index the contract
    await new Promise(r => setTimeout(r, 60000));

    console.log("Verifying BalanceQuery contract...");
    try {
        await hre.run("verify:verify", {
            address: balanceQuery.address,
            constructorArguments: [
                BALANCE_QUERY_OWNER,
                [
                    resources.nftBoostVault.address,
                    resources.teamVestingVault.address,
                    resources.partnerVestingVault.address,
                ],
            ],
        });
    } catch (err) {
        if (!err.message.match(/already verified/i)) {
            throw err;
        } else {
            console.log("\nContract already verified.");
        }
    }

    console.log(SECTION_SEPARATOR);
    console.log("✅ BalanceQuery deployment and verification complete.");
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
        .then(deployBalanceQuery)
        .then(() => process.exit(0))
        .catch((error: Error) => {
            console.error(error);
            process.exit(1);
        });
}
