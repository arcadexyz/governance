import { expect } from "chai";
import { execSync } from "child_process";
import { ethers } from "hardhat";

import { ArcadeToken, ArcadeTokenDistributor } from "../../../typechain";
import { COMMUNITY_REWARDS, DEVELOPMENT_PARTNERS } from "../token-recipients";
import { NETWORK, getLatestDeployment, getLatestDeploymentFile } from "./utils";

/**
 * Note: Against normal conventions, this test is interdependent and meant to run
 * after the e2e deployment test script.
 *
 * This test is meant to be run after the deployment and setup scripts, and it will
 * distribute tokens to the following recipients:
 *
 * Deployed Contracts:
 * - ArcadeTreasury contract
 * - ArcadeAirdrop contract
 * - ARCDVestingVault contract
 * - ImmutableVestingVault contract
 *
 * Individual Addresses:
 * - Development Partners address (fill in address in the token-recipients.ts file)
 * - Community Rewards (fill in address in the token-recipients.ts file)
 *
 * To run this script use:
 * `npx hardhat test scripts/deploy/test/distribute.ts --network <networkName>`
 */
describe("Distribute", function () {
    this.timeout(0);
    this.bail();

    it("distributes tokens to all recipients", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (process.env.EXEC) {
            console.log(); // whitespace
            execSync(`HARDHAT_NETWORK=${NETWORK} ts-node scripts/deploy/distribute-tokens.ts ${filename}`, {
                stdio: "inherit",
            });
        }

        // Attach to deployed contracts
        const ARCDToken = await ethers.getContractFactory("ArcadeToken");
        const arcdToken = <ArcadeToken>await ARCDToken.attach(deployment["ArcadeToken"].contractAddress);

        const ArcadeDist = await ethers.getContractFactory("ArcadeDist");
        const arcdDist = <ArcadeTokenDistributor>(
            await ArcadeDist.attach(deployment["ArcadeTokenDistributor"].contractAddress)
        );

        // Make sure recipients receive the correct amount of tokens
        expect(await arcdToken.balanceOf(deployment["ArcadeTreasury"].contractAddress)).to.equal(
            await arcdDist.treasuryAmount(),
        );
        expect(await arcdToken.balanceOf(deployment["ArcadeAirdrop"].contractAddress)).to.equal(
            await arcdDist.communityAirdropAmount(),
        );
        expect(await arcdToken.balanceOf(deployment["ARCDVestingVault"].contractAddress)).to.equal(
            await arcdDist.vestingTeamAmount(),
        );
        expect(await arcdToken.balanceOf(deployment["ImmutableVestingVault"].contractAddress)).to.equal(
            await arcdDist.vestingPartnerAmount(),
        );
        expect(await arcdToken.balanceOf(DEVELOPMENT_PARTNERS)).to.equal(await arcdDist.devPartnerAmount());
        expect(await arcdToken.balanceOf(COMMUNITY_REWARDS)).to.equal(await arcdDist.communityRewardsAmount());
    });
});
