import { Contract } from "ethers";
import fs from "fs";
import { ethers } from "hardhat";

import {
    ADD_APPROVAL,
    ADD_APPROVAL_QUORUM,
    ADD_CALL,
    ADD_CALL_QUORUM,
    CALL_WHITELIST_ADDR,
    CALL_WHITELIST_APPROVALS_ADDR,
    LARGE_SPEND,
    LARGE_SPEND_QUORUM,
    LOAN_CORE_ADDR,
    MEDIUM_SPEND,
    MEDIUM_SPEND_QUORUM,
    MINT_TOKENS,
    MINT_TOKENS_QUORUM,
    ORIGINATION_CONTROLLER_ADDR,
    PAUSE,
    PAUSE_QUORUM,
    SET_ALLOWED_PAYABLE_CURRENCIES,
    SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM,
    SET_ALLOWED_VERIFIER,
    SET_ALLOWED_VERIFIER_BATCH,
    SET_ALLOWED_VERIFIER_BATCH_QUORUM,
    SET_ALLOWED_VERIFIER_QUORUM,
    SET_FEE_CONTROLLER,
    SET_FEE_CONTROLLER_QUORUM,
    SET_MINTER,
    SET_MINTER_QUORUM,
} from "./custom-quorum-params";
import { ADMIN_ADDRESS, AIRDROP_MERKLE_ROOT, GSC_MIN_LOCK_DURATION } from "./deployment-params";
import { SECTION_SEPARATOR, SUBSECTION_SEPARATOR } from "./test/utils";

const jsonContracts: { [key: string]: string } = {
    ArcadeTokenDistributor: "arcadeTokenDistributor",
    ArcadeToken: "arcadeToken",
    CoreVoting: "coreVoting",
    ArcadeGSCCoreVoting: "arcadeGSCCoreVoting",
    Timelock: "timelock",
    ARCDVestingVault: "teamVestingVault",
    ImmutableVestingVault: "partnerVestingVault",
    NFTBoostVault: "nftBoostVault",
    ArcadeGSCVault: "arcadeGSCVault",
    ArcadeTreasury: "arcadeTreasury",
    ArcadeAirdrop: "arcadeAirdrop",
};

type ContractArgs = {
    arcadeTokenDistributor: Contract;
    arcadeToken: Contract;
    coreVoting: Contract;
    arcadeGSCCoreVoting: Contract;
    timelock: Contract;
    teamVestingVault: Contract;
    partnerVestingVault: Contract;
    nftBoostVault: Contract;
    arcadeGSCVault: Contract;
    arcadeTreasury: Contract;
    arcadeAirdrop?: Contract;
};

export async function main(
    arcadeTokenDistributor: Contract,
    arcadeToken: Contract,
    coreVoting: Contract,
    arcadeGSCCoreVoting: Contract,
    timelock: Contract,
    teamVestingVault: Contract,
    partnerVestingVault: Contract,
    nftBoostVault: Contract,
    arcadeGSCVault: Contract,
    arcadeTreasury: Contract,
    arcadeAirdrop: Contract,
): Promise<void> {
    console.log(SECTION_SEPARATOR);
    console.log("Setup contract state variables and relinquish control...");

    // set airdrop merkle root
    console.log("Setting airdrop merkle root...");
    const tx000 = await arcadeAirdrop.setMerkleRoot(AIRDROP_MERKLE_ROOT);
    await tx000.wait();

    console.log("Setting airdrop contract in nftBoostVault...");
    const tx00 = await nftBoostVault.setAirdropContract(arcadeAirdrop.address);
    await tx00.wait();

    // deployer sets token in distributor
    console.log("Setting token in ArcadeTokenDistributor...");
    const tx0 = await arcadeTokenDistributor.setToken(arcadeToken.address);
    await tx0.wait();

    // change ArcadeToken minter from deployer to CoreVoting
    console.log("Changing ArcadeToken minter from deployer to CoreVoting...");
    const tx = await arcadeToken.setMinter(coreVoting.address);
    await tx.wait();

    // set vaults in core voting
    console.log("Setting up CoreVoting voting vaults...");
    const tx1 = await coreVoting.changeVaultStatus(teamVestingVault.address, true);
    await tx1.wait();
    const tx2 = await coreVoting.changeVaultStatus(partnerVestingVault.address, true);
    await tx2.wait();
    const tx3 = await coreVoting.changeVaultStatus(nftBoostVault.address, true);
    await tx3.wait();

    // set vaults in arcadeGSCCoreVoting
    console.log("Setting up ArcadeGSCCoreVoting voting vaults...");
    const tx4 = await arcadeGSCCoreVoting.changeVaultStatus(arcadeGSCVault.address, true);
    await tx4.wait();

    // change min lock time for GSC proposals from 3 days to 8 hours
    console.log("Changing min lock time for GSC proposals from 3 days to 8 hours...");
    const tx5 = await arcadeGSCCoreVoting.setLockDuration(GSC_MIN_LOCK_DURATION);
    await tx5.wait();

    // before transferring over ownership, set the custom quorum thresholds
    console.log("Setting custom quorum thresholds in CoreVoting...");
    const tx6 = await coreVoting.setCustomQuorum(arcadeToken.address, MINT_TOKENS, MINT_TOKENS_QUORUM);
    await tx6.wait();
    const tx7 = await coreVoting.setCustomQuorum(arcadeToken.address, SET_MINTER, SET_MINTER_QUORUM);
    await tx7.wait();
    const tx8 = await coreVoting.setCustomQuorum(arcadeTreasury.address, MEDIUM_SPEND, MEDIUM_SPEND_QUORUM);
    await tx8.wait();
    const tx9 = await coreVoting.setCustomQuorum(arcadeTreasury.address, LARGE_SPEND, LARGE_SPEND_QUORUM);
    await tx9.wait();
    const tx10 = await coreVoting.setCustomQuorum(CALL_WHITELIST_ADDR, ADD_CALL, ADD_CALL_QUORUM);
    await tx10.wait();
    const tx11 = await coreVoting.setCustomQuorum(CALL_WHITELIST_APPROVALS_ADDR, ADD_APPROVAL, ADD_APPROVAL_QUORUM);
    await tx11.wait();
    const tx12 = await coreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_VERIFIER,
        SET_ALLOWED_VERIFIER_QUORUM,
    );
    await tx12.wait();
    const tx13 = await coreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_VERIFIER_BATCH,
        SET_ALLOWED_VERIFIER_BATCH_QUORUM,
    );
    await tx13.wait();
    const tx14 = await coreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_PAYABLE_CURRENCIES,
        SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM,
    );
    await tx14.wait();
    const tx15 = await coreVoting.setCustomQuorum(LOAN_CORE_ADDR, PAUSE, PAUSE_QUORUM);
    await tx15.wait();
    const tx16 = await coreVoting.setCustomQuorum(LOAN_CORE_ADDR, SET_FEE_CONTROLLER, SET_FEE_CONTROLLER_QUORUM);
    await tx16.wait();

    // authorize gsc vault and change owner to be the coreVoting contract
    console.log("Setup CoreVoting permissions...");
    const tx17 = await coreVoting.deauthorize(ADMIN_ADDRESS);
    await tx17.wait();
    const tx18 = await coreVoting.authorize(arcadeGSCVault.address);
    await tx18.wait();
    const tx19 = await coreVoting.setOwner(timelock.address);
    await tx19.wait();

    // authorize arcadeGSCCoreVoting and change owner to be the coreVoting contract
    console.log("Setup Timelock permissions...");
    const tx20 = await timelock.deauthorize(ADMIN_ADDRESS);
    await tx20.wait();
    const tx21 = await timelock.authorize(arcadeGSCCoreVoting.address);
    await tx21.wait();
    const tx22 = await timelock.setOwner(coreVoting.address);
    await tx22.wait();

    // set owner in arcadeGSCCoreVoting
    console.log("Setup ArcadeGSCCoreVoting permissions...");
    const tx23 = await arcadeGSCCoreVoting.setOwner(timelock.address);
    await tx23.wait();

    // ArcadeTreasury permissions
    console.log("Setup ArcadeTreasury permissions...");
    const tx24 = await arcadeTreasury.grantRole(arcadeTreasury.GSC_CORE_VOTING_ROLE(), arcadeGSCCoreVoting.address);
    await tx24.wait();
    const tx25 = await arcadeTreasury.grantRole(arcadeTreasury.CORE_VOTING_ROLE(), coreVoting.address);
    await tx25.wait();
    const tx26 = await arcadeTreasury.grantRole(arcadeTreasury.ADMIN_ROLE(), timelock.address);
    await tx26.wait();
    const tx27 = await arcadeTreasury.renouceRole(arcadeTreasury.ADMIN_ROLE(), ADMIN_ADDRESS);
    await tx27.wait();

    // ReputationBadge permissions
    console.log("Setup ReputationBadge permissions...");
    const tx28 = await reputationBadge.grantRole(reputationBadge.BADGE_MANAGER_ROLE(), REPUTATION_BADGE_MANAGER);
    await tx28.wait();
    const tx29 = await reputationBadge.grantRole(reputationBadge.RESOURCE_MANAGER_ROLE(), REPUTATION_BADGE_RESOURCE_MANAGER);
    await tx29.wait();
    const tx30 = await reputationBadge.grantRole(reputationBadge.ADMIN_ROLE(), REPUTATION_BADGE_ADMIN);
    await tx30.wait();
    const tx31 = await reputationBadge.renouceRole(reputationBadge.ADMIN_ROLE(), ADMIN_ADDRESS);
    await tx31.wait();


}

async function attachAddresses(jsonFile: string): Promise<ContractArgs> {
    const readData = fs.readFileSync(jsonFile, "utf-8");
    const jsonData = JSON.parse(readData);
    const contracts: { [key: string]: Contract } = {};

    for await (const key of Object.keys(jsonData)) {
        if (!(key in jsonContracts)) continue;

        const argKey = jsonContracts[key];
        // console.log(`Key: ${key}, address: ${jsonData[key]["contractAddress"]}`);

        const contract: Contract = await ethers.getContractAt(key, jsonData[key]["contractAddress"]);

        contracts[argKey] = contract;
    }

    return contracts as ContractArgs;
}

if (require.main === module) {
    // retrieve command line args array
    const [, , file] = process.argv;

    console.log("File:", file);

    // assemble args to access the relevant deployment json in .deployment
    void attachAddresses(file).then((res: ContractArgs) => {
        const {
            arcadeTokenDistributor,
            arcadeToken,
            coreVoting,
            arcadeGSCCoreVoting,
            timelock,
            teamVestingVault,
            partnerVestingVault,
            nftBoostVault,
            arcadeGSCVault,
            arcadeTreasury,
            arcadeAirdrop,
        } = res;

        main(
            arcadeTokenDistributor,
            arcadeToken,
            coreVoting,
            arcadeGSCCoreVoting,
            timelock,
            teamVestingVault,
            partnerVestingVault,
            nftBoostVault,
            arcadeGSCVault,
            arcadeTreasury,
            arcadeAirdrop,
        )
            .then(() => process.exit(0))
            .catch((error: Error) => {
                console.error(error);
                process.exit(1);
            });
    });
}
