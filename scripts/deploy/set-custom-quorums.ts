import {
    // ADD,
    ADD_QUORUM,
    APPROVE_LARGE_SPEND,
    APPROVE_LARGE_SPEND_QUORUM,
    APPROVE_MEDIUM_SPEND,
    APPROVE_MEDIUM_SPEND_QUORUM,
    CALL_WHITELIST_ALL_EXTENSIONS_ADDR,
    CWA_GRANT_ROLE_QUORUM,
    CWA_RENOUNCE_ROLE_QUORUM,
    CWA_REVOKE_ROLE_QUORUM,
    FEE_CONTROLLER_ADDR,
    GRANT_ROLE,
    INCREASE_TIME,
    INCREASE_TIME_QUORUM,
    LARGE_SPEND,
    LARGE_SPEND_QUORUM,
    LC_GRANT_ROLE_QUORUM,
    LC_RENOUNCE_ROLE_QUORUM,
    LC_REVOKE_ROLE_QUORUM,
    LOAN_CORE_ADDR,
    MEDIUM_SPEND,
    MEDIUM_SPEND_QUORUM,
    MINT_TOKENS,
    MINT_TOKENS_QUORUM,
    OC_GRANT_ROLE_QUORUM,
    OC_RENOUNCE_ROLE_QUORUM,
    OC_REVOKE_ROLE_QUORUM,
    ORIGINATION_CONTROLLER_ADDR,
    REGISTER_CALL,
    REGISTER_CALL_QUORUM,
    RENOUNCE_ROLE,
    REVOKE_ROLE,
    SET_AIRDROP_CONTRACT,
    SET_AIRDROP_CONTRACT_QUORUM,
    SET_ALLOWED_COLLATERAL_ADDRESSES,
    SET_ALLOWED_COLLATERAL_ADDRESSES_QUORUM,
    SET_ALLOWED_PAYABLE_CURRENCIES,
    SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM,
    SET_ALLOWED_VERIFIERS,
    SET_ALLOWED_VERIFIERS_QUORUM,
    SET_APPROVAL,
    SET_APPROVAL_QUORUM,
    SET_MINTER,
    SET_MINTER_QUORUM,
    SET_REGISTRY,
    SET_REGISTRY_QUORUM,
    SET_WAIT_TIME,
    SET_WAIT_TIME_QUORUM,
    SHUTDOWN,
    SHUTDOWN_QUORUM,
    TRANSFER_OWNERSHIP,
    TRANSFER_OWNERSHIP_QUORUM,
    VAULT_FACTORY_ADDR,
    VF_GRANT_ROLE_QUORUM,
    VF_REVOKE_ROLE_QUORUM,
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
    // Timelock
    const tx4 = await arcadeCoreVoting.setCustomQuorum(timelock.address, REGISTER_CALL, REGISTER_CALL_QUORUM);
    await tx4.wait();
    const tx5 = await arcadeCoreVoting.setCustomQuorum(timelock.address, SET_WAIT_TIME, SET_WAIT_TIME_QUORUM);
    await tx5.wait();
    // ArcadeTreasury
    const tx6 = await arcadeCoreVoting.setCustomQuorum(arcadeTreasury.address, MEDIUM_SPEND, MEDIUM_SPEND_QUORUM);
    await tx6.wait();
    const tx7 = await arcadeCoreVoting.setCustomQuorum(
        arcadeTreasury.address,
        APPROVE_MEDIUM_SPEND,
        APPROVE_MEDIUM_SPEND_QUORUM,
    );
    await tx7.wait();
    const tx8 = await arcadeCoreVoting.setCustomQuorum(arcadeTreasury.address, LARGE_SPEND, LARGE_SPEND_QUORUM);
    await tx8.wait();
    const tx9 = await arcadeCoreVoting.setCustomQuorum(
        arcadeTreasury.address,
        APPROVE_LARGE_SPEND,
        APPROVE_LARGE_SPEND_QUORUM,
    );
    await tx9.wait();
    // V3 CallWhitelistAllExtensions
    const tx10 = await arcadeCoreVoting.setCustomQuorum(CALL_WHITELIST_ALL_EXTENSIONS_ADDR, ADD, ADD_QUORUM);
    await tx10.wait();
    const tx11 = await arcadeCoreVoting.setCustomQuorum(
        CALL_WHITELIST_ALL_EXTENSIONS_ADDR,
        SET_APPROVAL,
        SET_APPROVAL_QUORUM,
    );
    await tx11.wait();
    const tx12 = await arcadeCoreVoting.setCustomQuorum(
        CALL_WHITELIST_ALL_EXTENSIONS_ADDR,
        SET_REGISTRY,
        SET_REGISTRY_QUORUM,
    );
    await tx12.wait();
    const tx13 = await arcadeCoreVoting.setCustomQuorum(
        CALL_WHITELIST_ALL_EXTENSIONS_ADDR,
        GRANT_ROLE,
        CWA_GRANT_ROLE_QUORUM,
    );
    await tx13.wait();
    const tx14 = await arcadeCoreVoting.setCustomQuorum(
        CALL_WHITELIST_ALL_EXTENSIONS_ADDR,
        REVOKE_ROLE,
        CWA_REVOKE_ROLE_QUORUM,
    );
    await tx14.wait();
    const tx15 = await arcadeCoreVoting.setCustomQuorum(
        CALL_WHITELIST_ALL_EXTENSIONS_ADDR,
        RENOUNCE_ROLE,
        CWA_RENOUNCE_ROLE_QUORUM,
    );
    await tx15.wait();
    // V3 VaultFactory
    const tx16 = await arcadeCoreVoting.setCustomQuorum(VAULT_FACTORY_ADDR, GRANT_ROLE, VF_GRANT_ROLE_QUORUM);
    await tx16.wait();
    const tx17 = await arcadeCoreVoting.setCustomQuorum(VAULT_FACTORY_ADDR, REVOKE_ROLE, VF_REVOKE_ROLE_QUORUM);
    await tx17.wait();
    // V3 FeeController
    const tx18 = await arcadeCoreVoting.setCustomQuorum(
        FEE_CONTROLLER_ADDR,
        TRANSFER_OWNERSHIP,
        TRANSFER_OWNERSHIP_QUORUM,
    );
    await tx18.wait();
    // V3 LoanCore
    const tx19 = await arcadeCoreVoting.setCustomQuorum(LOAN_CORE_ADDR, GRANT_ROLE, LC_GRANT_ROLE_QUORUM);
    await tx19.wait();
    const tx20 = await arcadeCoreVoting.setCustomQuorum(LOAN_CORE_ADDR, REVOKE_ROLE, LC_REVOKE_ROLE_QUORUM);
    await tx20.wait();
    const tx21 = await arcadeCoreVoting.setCustomQuorum(LOAN_CORE_ADDR, RENOUNCE_ROLE, LC_RENOUNCE_ROLE_QUORUM);
    await tx21.wait();
    // V3 OriginationController
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
    const tx24 = await arcadeCoreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_COLLATERAL_ADDRESSES,
        SET_ALLOWED_COLLATERAL_ADDRESSES_QUORUM,
    );
    await tx24.wait();
    const tx25 = await arcadeCoreVoting.setCustomQuorum(ORIGINATION_CONTROLLER_ADDR, GRANT_ROLE, OC_GRANT_ROLE_QUORUM);
    await tx25.wait();
    const tx26 = await arcadeCoreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        REVOKE_ROLE,
        OC_REVOKE_ROLE_QUORUM,
    );
    await tx26.wait();
    const tx27 = await arcadeCoreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        RENOUNCE_ROLE,
        OC_RENOUNCE_ROLE_QUORUM,
    );
    await tx27.wait();

    console.log(SUBSECTION_SEPARATOR);

    // ============= ArcadeGSCCoreVoting =============
    console.log("Setting custom quorum thresholds in ArcadeGSCCoreVoting...");
    // V3 LoanCore
    const tx28 = await arcadeGSCCoreVoting.setCustomQuorum(LOAN_CORE_ADDR, SHUTDOWN, SHUTDOWN_QUORUM);
    await tx28.wait();
    // timelock
    const tx29 = await arcadeGSCCoreVoting.setCustomQuorum(timelock.address, INCREASE_TIME, INCREASE_TIME_QUORUM);
    await tx29.wait();

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
