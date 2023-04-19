import fs from "fs"
import hre, { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
    DEPLOYER_ADDRESS,
    TIMELOCK_WAIT_TIME,
    STALE_BLOCK_LAG,
    BASE_QUORUM,
    MIN_PROPOSAL_POWER,
    BASE_QUORUM_GSC,
    MIN_PROPOSAL_POWER_GSC,
    GSC_THRESHOLD,
    VESTING_VAULT_MANAGER,
} from "./deployment-params";
import { SUBSECTION_SEPARATOR, SECTION_SEPARATOR } from "./test/utils";

const jsonContracts: { [key: string]: string } = {
    ArcadeTokenDistributor: "arcadeTokenDistributor",
    ArcadeToken: "arcadeToken",
    CoreVoting: "coreVoting",
    CoreVotingGSC: "coreVotingGSC",
    Timelock: "timelock",
    FrozenLockingVault: "frozenLockingVault",
    FrozenLockingVaultProxy: "frozenLockingVaultProxy",
    VestingVault: "vestingVault",
    VestingVaultProxy: "vestingVaultProxy",
    GSCVault: "gscVault",
    Treasury: "treasury",
};

type ContractArgs = {
    arcadeTokenDistributor: Contract;
    arcadeToken: Contract;
    coreVoting: Contract;
    coreVotingGSC: Contract;
    timelock: Contract;
    frozenLockingVault: Contract;
    frozenLockingVaultProxy: Contract;
    vestingVault: Contract;
    vestingVaultProxy: Contract;
    gscVault: Contract;
    treasury: Contract;
};

export async function main(
    arcadeTokenDistributor: Contract,
    arcadeToken: Contract,
    coreVoting: Contract,
    coreVotingGSC: Contract,
    timelock: Contract,
    frozenLockingVault: Contract,
    frozenLockingVaultProxy: Contract,
    vestingVault: Contract,
    vestingVaultProxy: Contract,
    gscVault: Contract,
    treasury: Contract
): Promise<void> {
    console.log(SECTION_SEPARATOR);
    console.log("Setup contract state variables and relinquish control...");
    // set token in distributor
    tx1 = await arcadeTokenDistributor.setToken(arcadeToken.address);
    await tx1.wait();

    // initialize upgradeable vesting vault
    const vvProxy = await vestingVault.attach(vestingVaultProxy.address);
    tx2 = await vvProxy.initialize(VESTING_VAULT_MANAGER, timelock.address);
    await tx2.wait();

    // set vaults in core voting
    const tx3 = await coreVoting.changeVaultStatus(frozenLockingVaultProxy.address, true);
    await tx3.wait();
    const tx4 = await coreVoting.changeVaultStatus(treasury.address, true);
    await tx4.wait();
    const tx5 = await coreVotingGSC.changeVaultStatus(gscVault.address, true);
    await tx5.wait();

    // authorize gsc vault and change owner to be the coreVoting contract
    const tx6 = await coreVoting.authorize(coreVotingGSC.address);
    await tx6.wait();
    const tx7 = await coreVoting.setOwner(timelock.address);
    await tx7.wait();

    // set authorized and owner in timelock
    const tx8 = await timelock.deauthorize(DEPLOYER_ADDRESS);
    await tx8.wait();
    const tx9 = await timelock.authorize(coreVotingGSC.address);
    await tx9.wait();
    const tx10 = await timelock.setOwner(coreVoting.address);
    await tx10.wait();

    // authorize gsc vault and set timelock address
    const tx11 = await coreVotingGSC.setOwner(timelock.address);
    await tx11.wait();
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
        if (key === "CoreVotingGSC") {
            contract = await ethers.getContractAt("CoreVoting", jsonData[key]["contractAddress"]);
        } 
        else if (key === "FrozenLockingVaultProxy" || key === "VestingVaultProxy") {
            contract = await ethers.getContractAt("SimpleProxy", jsonData[key]["contractAddress"]);
        }
        else {
            contract = await ethers.getContractAt(key, jsonData[key]["contractAddress"]);
        }

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
            coreVotingGSC,
            timelock,
            frozenLockingVault,
            frozenLockingVaultProxy,
            vestingVault,
            vestingVaultProxy,
            gscVault,
            treasury
        } = res;

        main(
            arcadeTokenDistributor,
            arcadeToken,
            coreVoting,
            coreVotingGSC,
            timelock,
            frozenLockingVault,
            frozenLockingVaultProxy,
            vestingVault,
            vestingVaultProxy,
            gscVault,
            treasury
        )
            .then(() => process.exit(0))
            .catch((error: Error) => {
                console.error(error);
                process.exit(1);
            });
    });
}