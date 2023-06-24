import { ethers } from "hardhat";

import { SECTION_SEPARATOR, getLatestDeployment } from "./test/utils";
import { COMMUNITY_REWARDS, DEVELOPMENT_PARTNERS } from "./token-recipients";

export async function main() {
    console.log(SECTION_SEPARATOR);

    // Get latest deployment on the specified network
    const deployment = getLatestDeployment();

    // Attach to deployed distributor contract
    const ARCDDist = await ethers.getContractFactory("ArcadeTokenDistributor");
    const arcdDist = await ARCDDist.attach(deployment["ArcadeTokenDistributor"].contractAddress);

    // Distribute tokens to all recipient addresses
    const res1 = await arcdDist.toTreasury(deployment["ArcadeTreasury"].contractAddress);
    await res1.wait();
    const res2 = await arcdDist.toCommunityAirdrop(deployment["ArcadeAirdrop"].contractAddress);
    await res2.wait();
    const res3 = await arcdDist.toTeamVesting(deployment["ARCDVestingVault"].contractAddress);
    await res3.wait();
    const res4 = await arcdDist.toPartnerVesting(deployment["ImmutableVestingVault"].contractAddress);
    await res4.wait();
    const res5 = await arcdDist.toDevPartner(DEVELOPMENT_PARTNERS);
    await res5.wait();
    const res6 = await arcdDist.toCommunityRewards(COMMUNITY_REWARDS);
    await res6.wait();

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
