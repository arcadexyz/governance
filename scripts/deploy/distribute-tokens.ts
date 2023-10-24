import { VESTING_MANAGER_MULTISIG } from "./config/deployment-params";
import { DeployedResources, SECTION_SEPARATOR, SUBSECTION_SEPARATOR, loadContracts } from "./test/utils";

/**
 * This script sets the Arcade Tokens as the token type for distribution in the ArcadeTokenDistributor contract.
 * It also distributes tokens to the ArcadeTreasury, ArcadeAirdrop, and the deployer for vesting setup.
 * Lastly, ownership of the ArcadeTokenDistributor contract is transferred to the Launch Partner Multisig. So,
 * the Launch Partner Multisig can distribute the remainder of the tokens in the distributor.
 *
 * To run this script use:
 * `npx hardhat run scripts/deploy/distribute-tokens.ts --network <networkName>`
 */

export async function distributeTokens(resources: DeployedResources) {
    console.log(SECTION_SEPARATOR);
    const { arcadeTokenDistributor, arcadeToken, arcadeTreasury, arcadeAirdrop } = resources;

    console.log("Setting ArcadeToken in ArcadeTokenDistributor...");
    const tx1 = await arcadeTokenDistributor.setToken(arcadeToken.address);
    await tx1.wait();
    console.log(SUBSECTION_SEPARATOR);

    console.log("Distributing ARCD to ArcadeTreasury...");
    const tx2 = await arcadeTokenDistributor.toGovernanceTreasury(arcadeTreasury.address);
    await tx2.wait();
    console.log("Distributing ARCD to ArcadeAirdrop...");
    const tx3 = await arcadeTokenDistributor.toCommunityAirdrop(arcadeAirdrop.address);
    await tx3.wait();
    console.log("Distributing ARCD to vesting multisig for team vesting...");
    const tx4 = await arcadeTokenDistributor.toTeamVesting(VESTING_MANAGER_MULTISIG);
    await tx4.wait();
    console.log("Distributing ARCD to vesting multisig for early investor vesting...");
    const tx5 = await arcadeTokenDistributor.toPartnerVesting(VESTING_MANAGER_MULTISIG);
    await tx5.wait();
    console.log("Distributing ARCD to vesting multisig for foundation vesting...");
    const tx6 = await arcadeTokenDistributor.toFoundationTreasury(VESTING_MANAGER_MULTISIG);
    await tx6.wait();
    console.log("Distributing ARCD to dev partner multisig for dev partner vesting...");
    const tx7 = await arcadeTokenDistributor.toDevPartner(VESTING_MANAGER_MULTISIG);
    await tx7.wait();
    console.log(SUBSECTION_SEPARATOR);
    console.log(SECTION_SEPARATOR);
    console.log("✅ Distribution complete.");
    console.log(SECTION_SEPARATOR);
}

if (require.main === module) {
    // retrieve deployments file from .env
    const file = process.env.DEPLOYMENT_FILE;

    // if file not in .env, exit
    if (!file) {
        console.error("No deployment file provided");
        process.exit(1);
    }

    console.log("File:", file);

    void loadContracts(file)
        .then(distributeTokens)
        .then(() => process.exit(0))
        .catch((error: Error) => {
            console.error(error);
            process.exit(1);
        });
}
