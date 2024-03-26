import { ethers } from "hardhat";

// Deployment parameters
const airdropSeason = "1";
const ARCD = "0xe020B01B6fbD83066aa2e8ee0CCD1eB8d9Cc70bF";
const AIRDROP_MERKLE_ROOT = ethers.constants.HashZero;
const AIRDROP_EXPIRATION = 1711477843; // timestamp
const VOTING_VAULT = "0x";

// Post-deployment configuration parameters
const OWNER = "0x398e92C827C5FA0F33F171DC8E20570c5CfF330e"; // launch partner multisig

export async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Airdrop deployer: ${deployer.address}`);

    const airdropFactory = await ethers.getContractFactory(`AirdropSeason${airdropSeason}`);
    const airdrop = await airdropFactory.deploy(
        ARCD,
        AIRDROP_MERKLE_ROOT,
        AIRDROP_EXPIRATION,
        VOTING_VAULT,
    );
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
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error: Error) => {
            console.error(error);
            process.exit(1);
        });
}