import {
    APE_ADDRESS,
    APE_LARGE,
    APE_MEDIUM,
    APE_SMALL,
    ARCD_LARGE,
    ARCD_MEDIUM,
    ARCD_SMALL,
    DAI_ADDRESS,
    DAI_LARGE,
    DAI_MEDIUM,
    DAI_SMALL,
    ETH_ADDRESS,
    ETH_LARGE,
    ETH_MEDIUM,
    ETH_SMALL,
    USDC_ADDRESS,
    USDC_LARGE,
    USDC_MEDIUM,
    USDC_SMALL,
    USDT_ADDRESS,
    USDT_LARGE,
    USDT_MEDIUM,
    USDT_SMALL,
    WBTC_ADDRESS,
    WBTC_LARGE,
    WBTC_MEDIUM,
    WBTC_SMALL,
    WETH_ADDRESS,
    WETH_LARGE,
    WETH_MEDIUM,
    WETH_SMALL,
} from "./config/treasury-thresholds";
import { DeployedResources, SECTION_SEPARATOR, loadContracts } from "./test/utils";

/**
 * This script sets all spend thresholds in the ArcadeTreasury contract. Commonly used payable currencies
 * are whitelisted with 3 spend thresholds, small, medium, and large. These spend thresholds correspond to
 * the amount of tokens that can be spent in a single transaction. The three thresholds require different
 * voting quorum thresholds to be enacted.
 *
 * To run this script use:
 * `npx hardhat run scripts/deploy/set-treasury-thresholds.ts --network <networkName>`
 */

export async function setTreasuryThresholds(resources: DeployedResources) {
    const { arcadeToken, arcadeTreasury } = resources;

    console.log(SECTION_SEPARATOR);

    console.log("Setting spend thresholds in ArcadeTreasury...");
    const tx1 = await arcadeTreasury.setThreshold(arcadeToken.address, {
        small: ARCD_SMALL,
        medium: ARCD_MEDIUM,
        large: ARCD_LARGE,
    });
    await tx1.wait();
    const tx2 = await arcadeTreasury.setThreshold(ETH_ADDRESS, {
        small: ETH_SMALL,
        medium: ETH_MEDIUM,
        large: ETH_LARGE,
    });
    await tx2.wait();
    const tx3 = await arcadeTreasury.setThreshold(WETH_ADDRESS, {
        small: WETH_SMALL,
        medium: WETH_MEDIUM,
        large: WETH_LARGE,
    });
    await tx3.wait();
    const tx4 = await arcadeTreasury.setThreshold(USDC_ADDRESS, {
        small: USDC_SMALL,
        medium: USDC_MEDIUM,
        large: USDC_LARGE,
    });
    await tx4.wait();
    const tx5 = await arcadeTreasury.setThreshold(USDT_ADDRESS, {
        small: USDT_SMALL,
        medium: USDT_MEDIUM,
        large: USDT_LARGE,
    });
    await tx5.wait();
    const tx6 = await arcadeTreasury.setThreshold(DAI_ADDRESS, {
        small: DAI_SMALL,
        medium: DAI_MEDIUM,
        large: DAI_LARGE,
    });
    await tx6.wait();
    const tx7 = await arcadeTreasury.setThreshold(WBTC_ADDRESS, {
        small: WBTC_SMALL,
        medium: WBTC_MEDIUM,
        large: WBTC_LARGE,
    });
    await tx7.wait();
    const tx8 = await arcadeTreasury.setThreshold(APE_ADDRESS, {
        small: APE_SMALL,
        medium: APE_MEDIUM,
        large: APE_LARGE,
    });
    await tx8.wait();

    console.log(SECTION_SEPARATOR);
    console.log("✅ All treasury spend thresholds have been set.");
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
        .then(setTreasuryThresholds)
        .then(() => process.exit(0))
        .catch((error: Error) => {
            console.error(error);
            process.exit(1);
        });
}
