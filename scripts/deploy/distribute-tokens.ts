import { ethers } from "hardhat";

import { SECTION_SEPARATOR, SUBSECTION_SEPARATOR, getLatestDeployment } from "./test/utils";
import {
    COMMUNITY_AIRDROP,
    COMMUNITY_REWARDS,
    DEVELOPMENT_PARTNERS,
    TREASURY,
    VESTING_PARTNERS,
    VESTING_TEAM,
} from "./token-recipients";

export async function main() {
    console.log(SECTION_SEPARATOR);

    // Get latest deployment on the specified network
    const deployment = getLatestDeployment();

    // token distributor
    const ARCDDist = await ethers.getContractFactory("ArcadeTokenDistributor");
    const arcdDist = await ARCDDist.attach(deployment["ArcadeTokenDistributor"].contractAddress);

    try {
        // distribute
        const res1 = await arcdDist.toTreasury(TREASURY);
        await res1.wait();
        const res2 = await arcdDist.toDevPartner(DEVELOPMENT_PARTNERS);
        await res2.wait();
        const res3 = await arcdDist.toCommunityRewards(COMMUNITY_REWARDS);
        await res3.wait();
        const res4 = await arcdDist.toCommunityAirdrop(COMMUNITY_AIRDROP);
        await res4.wait();
        const res5 = await arcdDist.toTeamVesting(VESTING_TEAM);
        await res5.wait();
        const res6 = await arcdDist.toPartnerVesting(VESTING_PARTNERS);
        await res6.wait();
        console.log("All tokens distributed to recipients");
    } catch (error) {
        console.log("Error distributing tokens to recipients", error);
    }

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
