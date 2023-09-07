import { DeployedResources, SECTION_SEPARATOR, loadContracts } from "./test/utils";
import { createVestingData } from "./write-vesting-calldata";

/**
 * This script records the vesting calldata for the team and early investor vesting grants.
 * This calldata will be used by the vesting manager multisig to deposit tokens in the vesting
 * vaults and setup grants. Grant data is stored in the scripts/deploy/config/vesting-data/ folder.
 *
 * To run this script use:
 * `npx hardhat run scripts/deploy/create-vesting-grants.ts --network <networkName>`
 */

export async function createVestingGrants(resources: DeployedResources) {
    console.log(SECTION_SEPARATOR);

    // get vesting amounts
    const teamAmount = await resources.arcadeTokenDistributor.vestingTeamAmount();
    const investorAmount = await resources.arcadeTokenDistributor.vestingPartnerAmount();

    // record vesting calldata
    await createVestingData(resources, teamAmount, investorAmount);

    console.log(SECTION_SEPARATOR);
    console.log("✅ Vesting calldata for grant setup recorded.");
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
        .then(createVestingGrants)
        .then(() => process.exit(0))
        .catch((error: Error) => {
            console.error(error);
            process.exit(1);
        });
}
