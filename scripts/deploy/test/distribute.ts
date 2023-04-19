import { execSync } from "child_process";
import { expect } from "chai";
import { ethers, artifacts } from "hardhat";
import assert from "assert";

import { NETWORK, getLatestDeploymentFile, getLatestDeployment } from "./utils";

import { ArcadeToken, ArcadeTokenDistributor } from "../../../typechain";

import {
    TREASURY,
    VESTING_TEAM,
    VESTING_PARTNERS,
    DEVELOPMENT_PARTNERS,
    COMMUNITY_REWARDS,
    COMMUNITY_AIRDROP,
} from "../token-recipients";

/**
 * Note: Against normal conventions, this test is interdependent and meant to run
 * after the e2e deployment test script. This test relies on the state of the previous.
 */
describe("Distribute", function() {
    this.timeout(0);
    this.bail();

    it("distributes tokens to all recipients", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            execSync(`HARDHAT_NETWORK=${NETWORK} ts-node scripts/deploy/distribute-tokens.ts ${filename}`, { stdio: 'inherit' });
        }

        // Make sure recipients recieve the correct amount of tokens
        const ARCDToken = await ethers.getContractFactory("ArcadeToken");
        const arcdToken = <ArcadeToken>await ARCDToken.attach(deployment["ArcadeToken"].contractAddress);
        const ArcadeDist = await ethers.getContractFactory("ArcadeDist");
        const arcdDist = <ArcadeTokenDistributor>await ArcadeDist.attach(deployment["ArcadeTokenDistributor"].contractAddress);

        expect(await arcdToken.balanceOf(TREASURY)).to.equal(await arcdDist.treasuryAmount());
        expect(await arcdToken.balanceOf(DEVELOPMENT_PARTNERS)).to.equal(await arcdDist.devPartnerAmount());
        expect(await arcdToken.balanceOf(COMMUNITY_REWARDS)).to.equal(await arcdDist.communityRewardsAmount());
        expect(await arcdToken.balanceOf(COMMUNITY_AIRDROP)).to.equal(await arcdDist.communityAirdropAmount());
        expect(await arcdToken.balanceOf(VESTING_TEAM)).to.equal(await arcdDist.vestingTeamAmount());
        expect(await arcdToken.balanceOf(VESTING_PARTNERS)).to.equal(await arcdDist.vestingPartnerAmount());
        
    });
});
