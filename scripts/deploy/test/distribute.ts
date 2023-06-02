import { expect } from "chai";
import { execSync } from "child_process";
import { ethers } from "hardhat";

import { ArcadeToken, ArcadeTokenDistributor } from "../../../typechain";
import {
    COMMUNITY_AIRDROP,
    COMMUNITY_REWARDS,
    DEVELOPMENT_PARTNERS,
    TREASURY,
    VESTING_PARTNERS,
    VESTING_TEAM,
} from "../token-recipients";
import { NETWORK, getLatestDeployment, getLatestDeploymentFile } from "./utils";

/**
 * Note: Against normal conventions, this test is interdependent and meant to run
 * after the e2e deployment test script. This test relies on the state of the previous.
 */
describe("Distribute", function () {
    this.timeout(0);
    this.bail();

    it("distributes tokens to all recipients", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            execSync(`HARDHAT_NETWORK=${NETWORK} ts-node scripts/deploy/distribute-tokens.ts ${filename}`, {
                stdio: "inherit",
            });
        }

        // Make sure recipients recieve the correct amount of tokens
        const ARCDToken = await ethers.getContractFactory("ArcadeToken");
        const arcdToken = <ArcadeToken>await ARCDToken.attach(deployment["ArcadeToken"].contractAddress);
        const ArcadeDist = await ethers.getContractFactory("ArcadeDist");
        const arcdDist = <ArcadeTokenDistributor>(
            await ArcadeDist.attach(deployment["ArcadeTokenDistributor"].contractAddress)
        );

        expect(await arcdToken.balanceOf(TREASURY)).to.equal(await arcdDist.treasuryAmount());
        expect(await arcdToken.balanceOf(DEVELOPMENT_PARTNERS)).to.equal(await arcdDist.devPartnerAmount());
        expect(await arcdToken.balanceOf(COMMUNITY_REWARDS)).to.equal(await arcdDist.communityRewardsAmount());
        expect(await arcdToken.balanceOf(COMMUNITY_AIRDROP)).to.equal(await arcdDist.communityAirdropAmount());
        expect(await arcdToken.balanceOf(VESTING_TEAM)).to.equal(await arcdDist.vestingTeamAmount());
        expect(await arcdToken.balanceOf(VESTING_PARTNERS)).to.equal(await arcdDist.vestingPartnerAmount());
    });
});
