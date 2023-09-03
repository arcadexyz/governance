import { ethers } from "hardhat";

import { VESTING_MANAGER } from "./config/deployment-params";
import investorVestingData from "./config/vesting-data/investor-vesting-data.json";
import teamVestingData from "./config/vesting-data/team-vesting-data.json";
import { DeployedResources, SECTION_SEPARATOR, SUBSECTION_SEPARATOR, loadContracts } from "./test/utils";

/**
 * This script uses the deployer wallet to initialize all vesting grants for the team and early investors.
 * After all grants are initialized, the deployer wallet is removed from the vesting manager role and the
 * timelock contract is set as the timelock role for both vesting vaults.
 *
 * To run this script use:
 * `npx hardhat run scripts/deploy/create-vesting-grants.ts --network <networkName>`
 */

export async function createVestingGrants(resources: DeployedResources) {
    // deployer wallet transfers all ARCD Tokens to the vesting vaults
    console.log(SECTION_SEPARATOR);
    console.log("Depositing ARCD to team vesting vault...");
    const totalTeamVestingAmount = await resources.arcadeTokenDistributor.vestingTeamAmount();
    const tx1 = await resources.arcadeToken.approve(resources.teamVestingVault.address, totalTeamVestingAmount);
    await tx1.wait();
    const tx2 = await resources.teamVestingVault.deposit(totalTeamVestingAmount);
    await tx2.wait();
    console.log("Depositing ARCD to early investor vesting vault...");
    const totalInvestorVestingAmount = await resources.arcadeTokenDistributor.vestingPartnerAmount();
    const tx3 = await resources.arcadeToken.approve(resources.partnerVestingVault.address, totalInvestorVestingAmount);
    await tx3.wait();
    const tx4 = await resources.partnerVestingVault.deposit(totalInvestorVestingAmount);
    await tx4.wait();
    console.log(SUBSECTION_SEPARATOR);
    console.log("All ARCD deposited to vesting vaults.");
    console.log(SECTION_SEPARATOR);

    // global vesting parameters
    const grantDurationInBlocks = 5229850; // (3600*24*365*2) / 12.06; // ~2 years in blocks
    const currentBlock = await ethers.provider.getBlockNumber();
    const grantCliffBlock = currentBlock + grantDurationInBlocks / 2;
    const expirationBlock = currentBlock + grantDurationInBlocks;

    console.log("Creating team vesting schedules...");
    for (const grant of teamVestingData) {
        // calculate cliff amount
        const cliffAmount = grant.value / 2;
        // create grant
        const tx = await resources.teamVestingVault.addGrantAndDelegate(
            grant.address,
            ethers.utils.parseEther(grant.value.toString()),
            ethers.utils.parseEther(cliffAmount.toString()),
            expirationBlock,
            grantCliffBlock,
            ethers.constants.AddressZero,
        );
        await tx.wait();
        console.log("Grant created for team member: ", grant.address);
    }
    console.log("All team grants created.");

    console.log(SUBSECTION_SEPARATOR);
    console.log("Creating early investor vesting schedules...");
    for (const grant of investorVestingData) {
        // calculate cliff amount
        const cliffAmount = grant.value / 2;
        // create grant
        const tx = await resources.partnerVestingVault.addGrantAndDelegate(
            grant.address,
            ethers.utils.parseEther(grant.value.toString()),
            ethers.utils.parseEther(cliffAmount.toString()),
            expirationBlock,
            grantCliffBlock,
            ethers.constants.AddressZero,
        );
        await tx.wait();
        console.log("Grant created for early investor: ", grant.address);
    }
    console.log("All early investor grants created.");

    console.log(SECTION_SEPARATOR);
    console.log("Transferring team vesting vault manager role...");
    const tx5 = await resources.teamVestingVault.setManager(VESTING_MANAGER);
    await tx5.wait();
    console.log("Transferring team vesting vault timelock role...");
    const tx6 = await resources.teamVestingVault.setTimelock(resources.timelock.address);
    await tx6.wait();
    console.log("Transferring early investor vesting vault manager role...");
    const tx7 = await resources.partnerVestingVault.setManager(VESTING_MANAGER);
    await tx7.wait();
    console.log("Transferring early investor vesting vault timelock role...");
    const tx8 = await resources.partnerVestingVault.setTimelock(resources.timelock.address);
    await tx8.wait();

    console.log(SECTION_SEPARATOR);
    console.log("✅ All vesting grants have been set up.");
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
