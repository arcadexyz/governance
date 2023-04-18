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
} from "./deployment-params";
import { SUBSECTION_SEPARATOR, SECTION_SEPARATOR } from ".test/utils";

const jsonContracts: { [key: string]: string } = {
    ArcadeTokenDistributor: "ArcadeTokenDistributor",
    ArcadeToken: "ArcadeToken",
    CoreVoting: "CoreVoting",
    CoreVotingGSC: "CoreVotingGSC",
    Timelock: "Timelock",
    frozenLockingVaultImp: "frozenLockingVaultImp",
    SimpleProxy: "SimpleProxy",
    GSCVault: "GSCVault",
    Treasury: "Treasury",
};

type ContractArgs = {
    arcadeTokenDistributor: Contract;
    arcadeToken: Contract;
    coreVoting: Contract;
    coreVotingGSC: Contract;
    timelock: Contract;
    frozenLockingVaultImp: Contract;
    frozenLockingVaultProxy: Contract;
    vestingVaultImp: Contract;
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
    frozenLockingVaultImp: Contract,
    frozenLockingVaultProxy: Contract,
    vestingVaultImp: Contract,
    vestingVaultProxy: Contract,
    gscVault: Contract,
    treasury: Contract
): Promise<void> {
    console.log(SECTION_SEPARATOR);
    console.log("Setup contract state variables and relinquish control...");

    // set token in distributor
    await arcadeTokenDistributor.setToken(arcdToken.address);

    // initialize upgradeable vesting vault
    const vestingVault = await vestingVaultImp.attach(vestingVaultProxy.address);
    await vestingVault.initialize(VESTING_VAULT_MANAGER, timelock.address);

    // set vaults in core voting
    await coreVoting.changeVaultStatus(simpleProxy.address, true);
    await coreVoting.changeVaultStatus(treasury.address, true);
    await coreVotingGSC.changeVaultStatus(gscVault.address, true);

    // authorize gsc vault and change owner to be the coreVoting contract
    await coreVoting.authorize(coreVotingGSC.address);
    await coreVoting.setOwner(timelock.address);

    // set authorized and owner in timelock
    await timelock.deauthorize(DEPLOYER_ADDRESS);
    await timelock.authorize(coreVotingGSC.address);
    await timelock.setOwner(coreVoting.address);

    // authorize gsc vault and set timelock address
    await gscCoreVoting.setOwner(timelock.address);
}

async function attachAddresses(jsonFile: string): Promise<ContractArgs> {
    const readData = fs.readFileSync(jsonFile, 'utf-8');
    const jsonData = JSON.parse(readData);
    const contracts: { [key: string]: Contract } = {};

    for await (const key of Object.keys(jsonData)) {
        if (!(key in jsonContracts)) continue;

        const argKey = jsonContracts[key];
        console.log(`Key: ${key}, address: ${jsonData[key]["contractAddress"]}`);

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
            coreVotingGSC,
            timelock,
            frozenLockingVaultImp,
            frozenLockingVaultProxy,
            vestingVaultImp,
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
            frozenLockingVaultImp,
            frozenLockingVaultProxy,
            vestingVaultImp,
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