import hre, { ethers } from "hardhat";
import { AirdropSeason1L2 } from "../../src/types";

// Deployment parameters
const airdropSeason = "1";
const ARCD = "0x1A37249C4209A6fc1A8f531BaA6Cd3Dda027FC64"; // bridged token on base
const AIRDROP_MERKLE_ROOT = "0xc24f8725849e23850e2f61c165e348cf908e692b922c2f5b834cb73f42b7f944"; // airdropDataFinalBase.json merkle root snapshot taken 4/12/2024
const AIRDROP_EXPIRATION = 1715896450; // 1 month from 4/16/2024

// Post-deployment configuration parameters
const OWNER = "0x21aDafAA34d250a4fa0f8A4d2E2424ABa0cEE563";

export async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Airdrop deployer: ${deployer.address}`);

    const airdropFactory = await ethers.getContractFactory(`AirdropSeason${airdropSeason}L2`);
    const airdrop = <AirdropSeason1L2>await airdropFactory.deploy(ARCD, AIRDROP_MERKLE_ROOT, AIRDROP_EXPIRATION);
    await airdrop.deployed();
    console.log(`AirdropSeason${airdropSeason} deployed to: ${airdrop.address}`);

    // const setOwnerTx = await airdrop.setOwner(OWNER);
    // await setOwnerTx.wait();
    // console.log(`AirdropSeason${airdropSeason} owner set to: ${OWNER}`);

    // // check that the owner was set correctly
    // const owner = await airdrop.owner();
    // if (owner !== OWNER) {
    //     throw new Error(`AirdropSeason${airdropSeason} owner was not set correctly`);
    // }
    // // check that the deployer is not authorized
    // const isAuthorized = await airdrop.isAuthorized(deployer.address);
    // if (isAuthorized) {
    //     throw new Error(`Deployer is authorized`);
    // }

    // verify
    await hre.run("verify:verify", {
        address: airdrop.address,
        constructorArguments: [ARCD, AIRDROP_MERKLE_ROOT, AIRDROP_EXPIRATION],
    });
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error: Error) => {
            console.error(error);
            process.exit(1);
        });
}
