import { ethers } from "hardhat";

import { BalanceQuery } from "../../src/types";
import { SECTION_SEPARATOR, SUBSECTION_SEPARATOR } from "./test/utils";

export interface SnapshotDeployedResources {
    balanceQuery: BalanceQuery;
}

/**
 * To run this script use:
 * `npx hardhat run scripts/deploy/balance-query.ts --network <networkName>`
 */

export async function main(): Promise<SnapshotDeployedResources> {
    console.log(SECTION_SEPARATOR);
    console.log("Deploying BalanceQuery contract...");

    // replace addresses below with mainnet contract addresses to query mainnet snapshot
    const OWNER_ADD = ethers.utils.getAddress("0x6c6F915B21d43107d83c47541e5D29e872d82Da6");
    const NFTBOOSTVAULT_ADD = ethers.utils.getAddress("0xAf627689923fCB745fB33D84c4B920601C0f0955");
    const ARCD_VESTINGVAULT_ADD = ethers.utils.getAddress("0xE59Ce21F937aD3F2A2ccf2cF9E50e8F0EA9d62F7");
    const IMM_VESTINGVAULT_ADD = ethers.utils.getAddress("0xc547C7d049B425F83B96E9696b8756c203fFC90a");
    const ARCADE_GSCVAULT_ADD = ethers.utils.getAddress("0x2fFA6d2277Faae65782187bb80C92ecA1832AD32");

    const BalanceQueryFactory = await ethers.getContractFactory("BalanceQuery");
    const balanceQuery = <BalanceQuery>(
        await BalanceQueryFactory.deploy(OWNER_ADD, [
            NFTBOOSTVAULT_ADD,
            ARCD_VESTINGVAULT_ADD,
            IMM_VESTINGVAULT_ADD,
            ARCADE_GSCVAULT_ADD,
        ])
    );
    await balanceQuery.deployed();
    const balanceQueryAddress = balanceQuery.address;

    console.log("BalanceQuery deployed to:", balanceQueryAddress);
    console.log(SUBSECTION_SEPARATOR);

    // timeout for 3 seconds to wait for etherscan to index the contract
    await new Promise(r => setTimeout(r, 3000));

    console.log("Verifying BalanceQuery contract...");
    await hre.run("verify:verify", {
        address: balanceQueryAddress,
        constructorArguments: [
            OWNER_ADD,
            [NFTBOOSTVAULT_ADD, ARCD_VESTINGVAULT_ADD, IMM_VESTINGVAULT_ADD, ARCADE_GSCVAULT_ADD],
        ],
    });

    console.log(SECTION_SEPARATOR);

    return {
        balanceQuery,
    };
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
