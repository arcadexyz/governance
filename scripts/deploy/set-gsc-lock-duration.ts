import { GSC_MIN_LOCK_DURATION } from "./config/deployment-params";
import { DeployedResources, SECTION_SEPARATOR, loadContracts } from "./test/utils";

/**
 * This script changes the minimum voting period for GSC proposals from 3 days to 8 hours.
 *
 * To run this script use:
 * `npx hardhat run scripts/deploy/set-gsc-lock-duration.ts --network <networkName>`
 */

export async function setGSCLockDuration(resources: DeployedResources) {
    const { arcadeGSCCoreVoting } = resources;

    console.log(SECTION_SEPARATOR);

    console.log("Changing min lock time for GSC proposals from 3 days to 8 hours...");
    const tx = await arcadeGSCCoreVoting.setLockDuration(GSC_MIN_LOCK_DURATION);
    await tx.wait();

    console.log(SECTION_SEPARATOR);
    console.log("✅ GSC minimum voting period changed.");
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
        .then(setGSCLockDuration)
        .then(() => process.exit(0))
        .catch((error: Error) => {
            console.error(error);
            process.exit(1);
        });
}
