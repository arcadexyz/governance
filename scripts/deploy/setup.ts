import { Contract } from "ethers";
import fs from "fs";
import { ethers } from "hardhat";

import {
    LOAN_CORE_ADDR,
    ORIGINATION_CONTROLLER_ADDR,
    MEDIUM_SPEND,
    MEDIUM_SPEND_QUORUM,
    APPROVE_MEDIUM_SPEND,
    APPROVE_MEDIUM_SPEND_QUORUM,
    LARGE_SPEND,
    LARGE_SPEND_QUORUM,
    APPROVE_LARGE_SPEND,
    APPROVE_LARGE_SPEND_QUORUM,
    MINT_TOKENS,
    MINT_TOKENS_QUORUM,
    PAUSE,
    PAUSE_QUORUM,
    REGISTER_CALL,
    REGISTER_CALL_QUORUM,
    SET_ALLOWED_PAYABLE_CURRENCIES,
    SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM,
    SET_ALLOWED_VERIFIERS,
    SET_ALLOWED_VERIFIERS_QUORUM,
    SET_MINTER,
    SET_MINTER_QUORUM,
    UNPAUSE,
    UNPAUSE_QUORUM,
    INCREASE_TIME,
    INCREASE_TIME_QUORUM,
    SET_WAIT_TIME,
    SET_WAIT_TIME_QUORUM,
} from "./custom-quorum-params";
import {
    ADMIN_ADDRESS,
    AIRDROP_EXPIRATION,
    AIRDROP_MERKLE_ROOT,
    DISTRIBUTION_MULTISIG,
    GSC_MIN_LOCK_DURATION,
    REPUTATION_BADGE_MANAGER,
    REPUTATION_BADGE_RESOURCE_MANAGER,
} from "./deployment-params";
import { SECTION_SEPARATOR } from "./test/utils";

const jsonContracts: { [key: string]: string } = {
    ArcadeTokenDistributor: "arcadeTokenDistributor",
    ArcadeToken: "arcadeToken",
    ArcadeCoreVoting: "arcadeCoreVoting",
    ArcadeGSCCoreVoting: "arcadeGSCCoreVoting",
    Timelock: "timelock",
    ARCDVestingVault: "teamVestingVault",
    ImmutableVestingVault: "partnerVestingVault",
    NFTBoostVault: "nftBoostVault",
    ArcadeGSCVault: "arcadeGSCVault",
    ArcadeTreasury: "arcadeTreasury",
    ArcadeAirdrop: "arcadeAirdrop",
    ReputationBadge: "reputationBadge",
};

type ContractArgs = {
    arcadeTokenDistributor: Contract;
    arcadeToken: Contract;
    arcadeCoreVoting: Contract;
    arcadeGSCCoreVoting: Contract;
    timelock: Contract;
    teamVestingVault: Contract;
    partnerVestingVault: Contract;
    nftBoostVault: Contract;
    arcadeGSCVault: Contract;
    arcadeTreasury: Contract;
    arcadeAirdrop: Contract;
    reputationBadge: Contract;
};

export async function main(
    arcadeTokenDistributor: Contract,
    arcadeToken: Contract,
    arcadeCoreVoting: Contract,
    arcadeGSCCoreVoting: Contract,
    timelock: Contract,
    teamVestingVault: Contract,
    partnerVestingVault: Contract,
    nftBoostVault: Contract,
    arcadeGSCVault: Contract,
    arcadeTreasury: Contract,
    arcadeAirdrop: Contract,
    reputationBadge: Contract,
): Promise<void> {
    console.log(SECTION_SEPARATOR);
    console.log("Setup contract state variables and relinquish control...");

    // set airdrop merkle root
    console.log("Setting airdrop merkle root...");
    const tx1 = await arcadeAirdrop.setMerkleRoot(AIRDROP_MERKLE_ROOT, AIRDROP_EXPIRATION);
    await tx1.wait();

    console.log("Setting airdrop contract in nftBoostVault...");
    const tx2 = await nftBoostVault.setAirdropContract(arcadeAirdrop.address);
    await tx2.wait();

    // deployer sets token in distributor
    console.log("Setting token in ArcadeTokenDistributor...");
    const tx3 = await arcadeTokenDistributor.setToken(arcadeToken.address);
    await tx3.wait();

    // transfer ownership of arcadeTokenDistributor to multisig
    console.log("Transferring ownership of ArcadeTokenDistributor to multisig...");
    const tx4 = await arcadeTokenDistributor.transferOwnership(DISTRIBUTION_MULTISIG);
    await tx4.wait();

    // change ArcadeToken minter from deployer to CoreVoting
    console.log("Changing ArcadeToken minter from deployer to CoreVoting...");
    const tx5 = await arcadeToken.setMinter(arcadeCoreVoting.address);
    await tx5.wait();

    // set vaults in core voting
    console.log("Setting up CoreVoting voting vaults...");
    const tx6 = await arcadeCoreVoting.changeVaultStatus(teamVestingVault.address, true);
    await tx6.wait();
    const tx7 = await arcadeCoreVoting.changeVaultStatus(partnerVestingVault.address, true);
    await tx7.wait();
    const tx8 = await arcadeCoreVoting.changeVaultStatus(nftBoostVault.address, true);
    await tx8.wait();

    // set vaults in arcadeGSCCoreVoting
    console.log("Setting up ArcadeGSCCoreVoting voting vaults...");
    const tx9 = await arcadeGSCCoreVoting.changeVaultStatus(arcadeGSCVault.address, true);
    await tx9.wait();

    // change min lock time for GSC proposals from 3 days to 8 hours
    console.log("Changing min lock time for GSC proposals from 3 days to 8 hours...");
    const tx10 = await arcadeGSCCoreVoting.setLockDuration(GSC_MIN_LOCK_DURATION);
    await tx10.wait();

    // before transferring over ownership, set the initial custom quorum thresholds
    // ArcadeToken
    console.log("Setting custom quorum thresholds in CoreVoting...");
    const tx11 = await arcadeCoreVoting.setCustomQuorum(arcadeToken.address, MINT_TOKENS, MINT_TOKENS_QUORUM);
    await tx11.wait();
    const tx12 = await arcadeCoreVoting.setCustomQuorum(arcadeToken.address, SET_MINTER, SET_MINTER_QUORUM);
    await tx12.wait();
    // Timelock
    const tx13 = await arcadeCoreVoting.setCustomQuorum(timelock.address, REGISTER_CALL, REGISTER_CALL_QUORUM);
    await tx13.wait();
    const tx14 = await arcadeCoreVoting.setCustomQuorum(timelock.address, INCREASE_TIME, INCREASE_TIME_QUORUM);
    await tx14.wait();
    const tx15 = await arcadeCoreVoting.setCustomQuorum(timelock.address, SET_WAIT_TIME, SET_WAIT_TIME_QUORUM);
    await tx15.wait();
    // ArcadeTreasury
    const tx16 = await arcadeCoreVoting.setCustomQuorum(arcadeTreasury.address, MEDIUM_SPEND, MEDIUM_SPEND_QUORUM);
    await tx16.wait();
    const tx17 = await arcadeCoreVoting.setCustomQuorum(arcadeTreasury.address, APPROVE_MEDIUM_SPEND, APPROVE_MEDIUM_SPEND_QUORUM);
    await tx17.wait();
    const tx18 = await arcadeCoreVoting.setCustomQuorum(arcadeTreasury.address, LARGE_SPEND, LARGE_SPEND_QUORUM);
    await tx18.wait();
    const tx19 = await arcadeCoreVoting.setCustomQuorum(arcadeTreasury.address, APPROVE_LARGE_SPEND, APPROVE_LARGE_SPEND_QUORUM);
    await tx19.wait();
    // LoanCore
    const tx20 = await arcadeCoreVoting.setCustomQuorum(LOAN_CORE_ADDR, PAUSE, PAUSE_QUORUM);
    await tx20.wait();
    const tx21 = await arcadeCoreVoting.setCustomQuorum(LOAN_CORE_ADDR, UNPAUSE, UNPAUSE_QUORUM);
    await tx21.wait();
    // OriginationController
    const tx22 = await arcadeCoreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_VERIFIERS,
        SET_ALLOWED_VERIFIERS_QUORUM,
    );
    await tx22.wait();
    const tx23 = await arcadeCoreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_PAYABLE_CURRENCIES,
        SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM,
    );
    await tx23.wait();

    // authorize gsc vault and change owner to be the coreVoting contract
    console.log("Setup CoreVoting permissions...");
    const tx24 = await arcadeCoreVoting.deauthorize(ADMIN_ADDRESS);
    await tx24.wait();
    const tx25 = await arcadeCoreVoting.authorize(arcadeGSCCoreVoting.address);
    await tx25.wait();
    const tx26 = await arcadeCoreVoting.setOwner(timelock.address);
    await tx26.wait();

    // authorize arcadeGSCCoreVoting and change owner to be the coreVoting contract
    console.log("Setup Timelock permissions...");
    const tx27 = await timelock.deauthorize(ADMIN_ADDRESS);
    await tx27.wait();
    const tx28 = await timelock.authorize(arcadeGSCCoreVoting.address);
    await tx28.wait();
    const tx29 = await timelock.setOwner(arcadeCoreVoting.address);
    await tx29.wait();

    // set owner in arcadeGSCCoreVoting
    console.log("Setup ArcadeGSCCoreVoting permissions...");
    const tx30 = await arcadeGSCCoreVoting.setOwner(timelock.address);
    await tx30.wait();

    // ArcadeTreasury permissions
    console.log("Setup ArcadeTreasury permissions...");
    const tx31 = await arcadeTreasury.grantRole(
        await arcadeTreasury.GSC_CORE_VOTING_ROLE(),
        arcadeGSCCoreVoting.address,
    );
    await tx31.wait();
    const tx32 = await arcadeTreasury.grantRole(await arcadeTreasury.CORE_VOTING_ROLE(), arcadeCoreVoting.address);
    await tx32.wait();
    // DO WE WANT THIS TO BE A TREASURY TIMELOCK?
    const tx33 = await arcadeTreasury.grantRole(await arcadeTreasury.ADMIN_ROLE(), timelock.address);
    await tx33.wait();
    const tx34 = await arcadeTreasury.renounceRole(await arcadeTreasury.ADMIN_ROLE(), ADMIN_ADDRESS);
    await tx34.wait();

    // ReputationBadge permissions
    console.log("Setup ReputationBadge permissions...");
    const tx35 = await reputationBadge.grantRole(await reputationBadge.BADGE_MANAGER_ROLE(), REPUTATION_BADGE_MANAGER);
    await tx35.wait();
    const tx36 = await reputationBadge.grantRole(
        await reputationBadge.RESOURCE_MANAGER_ROLE(),
        REPUTATION_BADGE_RESOURCE_MANAGER,
    );
    await tx36.wait();
    const tx37 = await reputationBadge.grantRole(await reputationBadge.ADMIN_ROLE(), timelock.address);
    await tx37.wait();
    const tx38 = await reputationBadge.renounceRole(await reputationBadge.ADMIN_ROLE(), ADMIN_ADDRESS);
    await tx38.wait();
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
            arcadeCoreVoting,
            arcadeGSCCoreVoting,
            timelock,
            teamVestingVault,
            partnerVestingVault,
            nftBoostVault,
            arcadeGSCVault,
            arcadeTreasury,
            arcadeAirdrop,
            reputationBadge,
        } = res;

        main(
            arcadeTokenDistributor,
            arcadeToken,
            arcadeCoreVoting,
            arcadeGSCCoreVoting,
            timelock,
            teamVestingVault,
            partnerVestingVault,
            nftBoostVault,
            arcadeGSCVault,
            arcadeTreasury,
            arcadeAirdrop,
            reputationBadge,
        )
            .then(() => process.exit(0))
            .catch((error: Error) => {
                console.error(error);
                process.exit(1);
            });
    });
}
