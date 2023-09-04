import {
    APPROVE_LARGE_SPEND,
    APPROVE_LARGE_SPEND_QUORUM,
    APPROVE_MEDIUM_SPEND,
    APPROVE_MEDIUM_SPEND_QUORUM,
    INCREASE_TIME,
    INCREASE_TIME_QUORUM,
    LARGE_SPEND,
    LARGE_SPEND_QUORUM,
    LOAN_CORE_ADDR,
    MEDIUM_SPEND,
    MEDIUM_SPEND_QUORUM,
    MINT_TOKENS,
    MINT_TOKENS_QUORUM,
    ORIGINATION_CONTROLLER_ADDR,
    REGISTER_CALL,
    REGISTER_CALL_QUORUM,
    SET_AIRDROP_CONTRACT,
    SET_AIRDROP_CONTRACT_QUORUM,
    SET_ALLOWED_PAYABLE_CURRENCIES,
    SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM,
    SET_ALLOWED_VERIFIERS,
    SET_ALLOWED_VERIFIERS_QUORUM,
    SET_MINTER,
    SET_MINTER_QUORUM,
    SET_WAIT_TIME,
    SET_WAIT_TIME_QUORUM,
    SHUTDOWN,
    SHUTDOWN_QUORUM,
    UNLOCK,
    UNLOCK_QUORUM,
} from "./config/custom-quorum-params";
import { DeployedResources, SECTION_SEPARATOR, SUBSECTION_SEPARATOR, loadContracts } from "./test/utils";

/**
 * This script sets all custom voting quorums in the ArcadeCoreVoting contract and
 * the ArcadeGSCCoreVoting contract.
 *
 * To run this script use:
 * `npx hardhat run scripts/deploy/set-custom-quorums.ts --network <networkName>`
 */

export async function setCustomQuorums(resources: DeployedResources) {
    const { arcadeToken, arcadeCoreVoting, timelock, nftBoostVault, arcadeGSCCoreVoting, arcadeTreasury } = resources;

    console.log(SECTION_SEPARATOR);

    // ============= ArcadeCoreVoting =============
    console.log("Setting custom quorum thresholds in ArcadeCoreVoting...");
    // ArcadeToken
    const tx1 = await arcadeCoreVoting.setCustomQuorum(arcadeToken.address, MINT_TOKENS, MINT_TOKENS_QUORUM);
    await tx1.wait();
    const tx2 = await arcadeCoreVoting.setCustomQuorum(arcadeToken.address, SET_MINTER, SET_MINTER_QUORUM);
    await tx2.wait();
    // NFTBoostVault
    const tx3 = await arcadeCoreVoting.setCustomQuorum(
        nftBoostVault.address,
        SET_AIRDROP_CONTRACT,
        SET_AIRDROP_CONTRACT_QUORUM,
    );
    await tx3.wait();
    const tx4 = await arcadeCoreVoting.setCustomQuorum(nftBoostVault.address, UNLOCK, UNLOCK_QUORUM);
    await tx4.wait();
    // Timelock
    const tx5 = await arcadeCoreVoting.setCustomQuorum(timelock.address, REGISTER_CALL, REGISTER_CALL_QUORUM);
    await tx5.wait();
    const tx6 = await arcadeCoreVoting.setCustomQuorum(timelock.address, SET_WAIT_TIME, SET_WAIT_TIME_QUORUM);
    await tx6.wait();
    // ArcadeTreasury
    const tx7 = await arcadeCoreVoting.setCustomQuorum(arcadeTreasury.address, MEDIUM_SPEND, MEDIUM_SPEND_QUORUM);
    await tx7.wait();
    const tx8 = await arcadeCoreVoting.setCustomQuorum(
        arcadeTreasury.address,
        APPROVE_MEDIUM_SPEND,
        APPROVE_MEDIUM_SPEND_QUORUM,
    );
    await tx8.wait();
    const tx9 = await arcadeCoreVoting.setCustomQuorum(arcadeTreasury.address, LARGE_SPEND, LARGE_SPEND_QUORUM);
    await tx9.wait();
    const tx10 = await arcadeCoreVoting.setCustomQuorum(
        arcadeTreasury.address,
        APPROVE_LARGE_SPEND,
        APPROVE_LARGE_SPEND_QUORUM,
    );
    await tx10.wait();
    // V3 OriginationController
    const tx11 = await arcadeCoreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_VERIFIERS,
        SET_ALLOWED_VERIFIERS_QUORUM,
    );
    await tx11.wait();
    const tx12 = await arcadeCoreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_PAYABLE_CURRENCIES,
        SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM,
    );
    await tx12.wait();

    console.log(SUBSECTION_SEPARATOR);

    // ============= ArcadeGSCCoreVoting =============
    console.log("Setting custom quorum thresholds in ArcadeGSCCoreVoting...");
    // V3 LoanCore
    const tx13 = await arcadeGSCCoreVoting.setCustomQuorum(LOAN_CORE_ADDR, SHUTDOWN, SHUTDOWN_QUORUM);
    await tx13.wait();
    // timelock
    const tx14 = await arcadeGSCCoreVoting.setCustomQuorum(timelock.address, INCREASE_TIME, INCREASE_TIME_QUORUM);
    await tx14.wait();

    console.log(SECTION_SEPARATOR);
    console.log("✅ All custom quorums have been set.");
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
        .then(setCustomQuorums)
        .then(() => process.exit(0))
        .catch((error: Error) => {
            console.error(error);
            process.exit(1);
        });
}
