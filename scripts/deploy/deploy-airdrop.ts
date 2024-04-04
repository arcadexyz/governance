import hre, { ethers } from "hardhat";
import { AirdropSeason1L2 } from "../../src/types";

// Deployment parameters
const airdropSeason = "1";
const ARCD = "0x4ed4e862860bed51a9570b96d89af5e1b0efefed"; // set address after the tokens are bridged to base
const AIRDROP_MERKLE_ROOT = ethers.constants.HashZero; // set after the merkle root is generated
const AIRDROP_EXPIRATION = 1811477843; // timestamp

// Post-deployment configuration parameters
const OWNER = "0x21aDafAA34d250a4fa0f8A4d2E2424ABa0cEE563";

export async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Airdrop deployer: ${deployer.address}`);

    const airdropFactory = await ethers.getContractFactory(`AirdropSeason${airdropSeason}L2`);
    const airdrop = <AirdropSeason1L2>await airdropFactory.deploy(ARCD, AIRDROP_MERKLE_ROOT, AIRDROP_EXPIRATION);
    await airdrop.deployed();
    console.log(`AirdropSeason${airdropSeason} deployed to: ${airdrop.address}`);

    const setOwnerTx = await airdrop.setOwner(OWNER);
    await setOwnerTx.wait();
    console.log(`AirdropSeason${airdropSeason} owner set to: ${OWNER}`);

    // check that the owner was set correctly
    const owner = await airdrop.owner();
    if (owner !== OWNER) {
        throw new Error(`AirdropSeason${airdropSeason} owner was not set correctly`);
    }
    // check that the deployer is not authorized
    const isAuthorized = await airdrop.isAuthorized(deployer.address);
    if (isAuthorized) {
        throw new Error(`Deployer is authorized`);
    }

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
