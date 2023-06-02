import fs from "fs"
import hre, { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
    CHANGE_VAULT_STATUS,
    CHANGE_VAULT_STATUS_QUORUM,
    SET_LOCK_DURATION,
    SET_LOCK_DURATION_QUORUM,
    CHANGE_EXTRA_VOTING_TIME,
    CHANGE_EXTRA_VOTING_TIME_QUORUM
} from "./custom-quorum-params";
import {
    DEPLOYER_ADDRESS,
    TIMELOCK_WAIT_TIME,
    BASE_QUORUM,
    MIN_PROPOSAL_POWER,
    BASE_QUORUM_GSC,
    MIN_PROPOSAL_POWER_GSC,
    GSC_THRESHOLD,
} from "./deployment-params";
import { SUBSECTION_SEPARATOR, SECTION_SEPARATOR } from "./test/utils";

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
    ArcadeAirdrop: "arcadeAirdrop"
};

type ContractArgs = {
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
    arcadeAirdrop: Contract
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
    arcadeAirdrop: Contract
): Promise<void> {
    console.log(SECTION_SEPARATOR);
    console.log("Setup contract state variables and relinquish control...");

    // set vaults in core voting
    console.log("Setting vaults in CoreVoting...")
    const tx1 = await coreVoting.changeVaultStatus(teamVestingVault.address, true);
    await tx1.wait();
    const tx2 = await coreVoting.changeVaultStatus(partnerVestingVault.address, true);
    await tx2.wait();
    const tx3 = await coreVoting.changeVaultStatus(nftBoostVault.address, true);
    await tx3.wait();
    const tx4 = await arcadeGSCCoreVoting.changeVaultStatus(arcadeGSCVault.address, true);
    await tx4.wait();

    // before transferring over ownership, set the custom quorum thresholds
    // treasury ??
    // timelock ??
    // coreVoting
    // console.log("Setting custom quorum thresholds in CoreVoting...")
    // const tx6 = await coreVoting.setCustomQuorum(coreVoting.address, CHANGE_VAULT_STATUS, CHANGE_VAULT_STATUS_QUORUM);
    // await tx6.wait();
    // const tx7 = await coreVoting.setCustomQuorum(coreVoting.address, SET_LOCK_DURATION, SET_LOCK_DURATION_QUORUM);
    // await tx7.wait();
    // const tx8 = await coreVoting.setCustomQuorum(coreVoting.address, CHANGE_EXTRA_VOTING_TIME, CHANGE_EXTRA_VOTING_TIME_QUORUM);
    // await tx8.wait();

    // authorize gsc vault and change owner to be the coreVoting contract
    console.log("Authorizing GSC vault and changing owner to be the CoreVoting contract...")
    const tx9 = await coreVoting.authorize(arcadeGSCCoreVoting.address);
    await tx9.wait();
    const tx10 = await coreVoting.setOwner(timelock.address);
    await tx10.wait();

    // set authorized and owner in timelock
    console.log("Setting authorized and owner in Timelock...")
    const tx11 = await timelock.deauthorize(DEPLOYER_ADDRESS);
    await tx11.wait();
    const tx12 = await timelock.authorize(arcadeGSCCoreVoting.address);
    await tx12.wait();
    const tx13 = await timelock.setOwner(coreVoting.address);
    await tx13.wait();

    // authorize gsc vault and set timelock address
    console.log("Authorizing GSC vault and setting Timelock address...")
    const tx14 = await arcadeGSCCoreVoting.setOwner(timelock.address);
    await tx14.wait();
}

async function attachAddresses(jsonFile: string): Promise<ContractArgs> {
    const readData = fs.readFileSync(jsonFile, 'utf-8');
    const jsonData = JSON.parse(readData);
    const contracts: { [key: string]: Contract } = {};

    for await (const key of Object.keys(jsonData)) {
        if (!(key in jsonContracts)) continue;

        const argKey = jsonContracts[key];
        // console.log(`Key: ${key}, address: ${jsonData[key]["contractAddress"]}`);

        let contract: Contract;
        contract = await ethers.getContractAt(key, jsonData[key]["contractAddress"]);
        
        contracts[argKey] = contract;
    }

    return contracts as ContractArgs;
}

if (require.main === module) {
    // retrieve command line args array
    const [,,file] = process.argv;

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
            arcadeAirdrop
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
            arcadeAirdrop
        )
            .then(() => process.exit(0))
            .catch((error: Error) => {
                console.error(error);
                process.exit(1);
            });
    });
}