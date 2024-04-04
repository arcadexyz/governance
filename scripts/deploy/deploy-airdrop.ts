import hre, { ethers } from "hardhat";

// Deployment parameters
const airdropSeason = "1";
const ARCD = "0x26839364Ea94a8F5758539605E75dCf2522CF34e"; // Sepolia
const AIRDROP_MERKLE_ROOT = "0xc90144e92e6e1ac18d38d380b497cb110d58656fca962ac72c7002530d05c3dd"; // 8 team accounts for testing
const AIRDROP_EXPIRATION = 1727820209; // timestamp
const VOTING_VAULT = "0xe430896c67241fb2349922619764DAEe6aeB412c"; // ArcadeSingleSidedStaking Sepolia

// Post-deployment configuration parameters
const OWNER = "0x21aDafAA34d250a4fa0f8A4d2E2424ABa0cEE563";


/**
 * Deploys and configures an airdrop contract.
 *
 * To run this script, use the following command:
 * npx hardhat run scripts/deploy/deploy-airdrop.ts --network [network]
 */
export async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Airdrop deployer: ${deployer.address}`);

    const airdropFactory = await ethers.getContractFactory(`AirdropSeason${airdropSeason}`);
    const airdrop = await airdropFactory.deploy(ARCD, AIRDROP_MERKLE_ROOT, AIRDROP_EXPIRATION, VOTING_VAULT);
    await airdrop.deployed();
    const airdropAddress = airdrop.address;
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

    // verify contract on etherscan
    await hre.run("verify:verify", {
        address: airdropAddress,
        constructorArguments: [ARCD, AIRDROP_MERKLE_ROOT, AIRDROP_EXPIRATION, VOTING_VAULT],
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
