import { ethers } from "hardhat";

import { SECTION_SEPARATOR, getLatestDeployment } from "./test/utils";

/**
 * To run this script use:
 * `yarn clean && yarn compile && npx hardhat test scripts/deploy/distribute-tokens.ts --network <networkName>`
 */

export async function main() {
    console.log(SECTION_SEPARATOR);

    // Get latest deployment on the specified network
    const deployment = getLatestDeployment();

    // Attach to deployed distributor contract
    const ARCDDist = await ethers.getContractFactory("ArcadeTokenDistributor");
    const arcdDist = await ARCDDist.attach(deployment["ArcadeTokenDistributor"].contractAddress);

    // Distribute tokens to all recipient addresses
    const res1 = await arcdDist.toGovernanceTreasury(deployment["ArcadeTreasury"].contractAddress);
    await res1.wait();
    const res2 = await arcdDist.toCommunityAirdrop(deployment["ArcadeAirdrop"].contractAddress);
    await res2.wait();

    console.log(SECTION_SEPARATOR);
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
