import { Contract } from "ethers";
import fs from "fs";
import { ethers } from "hardhat";

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
    PAUSE,
    PAUSE_QUORUM,
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
    UNLOCK,
    UNLOCK_QUORUM,
} from "./config/custom-quorum-params";
import {
    AIRDROP_EXPIRATION,
    AIRDROP_MERKLE_ROOT,
    DEPLOYER_ADDRESS,
    FOUNDATION_MULTISIG,
    GSC_MIN_LOCK_DURATION,
    MULTISIG,
    VESTING_MANAGER,
} from "./config/deployment-params";
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
    console.log("Setup contract permissions and state variables...");

    // ================= ArcadeToken =================
    console.log("Setting ArcadeToken minter as CoreVoting...");
    const tx1 = await arcadeToken.setMinter(arcadeCoreVoting.address);
    await tx1.wait();

    // ================= ArcadeTokenDistributor =================
    console.log("SettingArcadeToken in ArcadeTokenDistributor...");
    const tx2 = await arcadeTokenDistributor.setToken(arcadeToken.address);
    await tx2.wait();

    console.log("Distributing ARCD to treasury, airdrop contract, and vesting manager...");
    const tx3 = await arcadeTokenDistributor.toGovernanceTreasury(arcadeTreasury.address);
    await tx3.wait();
    const tx4 = await arcadeTokenDistributor.toCommunityAirdrop(arcadeAirdrop.address);
    await tx4.wait();
    const tx5 = await arcadeTokenDistributor.toTeamVesting(VESTING_MANAGER);
    await tx5.wait();
    const tx6 = await arcadeTokenDistributor.toPartnerVesting(VESTING_MANAGER);
    await tx6.wait();

    console.log("Transferring ownership of ArcadeTokenDistributor to multisig...");
    const tx7 = await arcadeTokenDistributor.transferOwnership(MULTISIG);
    await tx7.wait();

    // ================= ArcadeAirdrop =================
    console.log("Setting airdrop merkle root and expiration...");
    const tx8 = await arcadeAirdrop.setMerkleRoot(AIRDROP_MERKLE_ROOT, AIRDROP_EXPIRATION);
    await tx8.wait();
    console.log("Transfer airdrop contract ownership to multisig...");
    const tx9 = await arcadeAirdrop.setOwner(MULTISIG);
    await tx9.wait();

    // ================= NFTBoostVault =================
    console.log("Setting airdrop contract in nftBoostVault...");
    const tx10 = await nftBoostVault.setAirdropContract(arcadeAirdrop.address);
    await tx10.wait();
    console.log("Transfer nftBoostVault manager role to multisig...");
    const tx11 = await nftBoostVault.setManager(MULTISIG);
    await tx11.wait();
    console.log("Transfer nftBoostVault timelock role to ArcadeCoreVoting...");
    const tx12 = await nftBoostVault.setTimelock(arcadeCoreVoting.address);
    await tx12.wait();

    // ================== ArcadeCoteVoting ==================
    console.log("Setting custom quorum thresholds in CoreVoting...");
    // ArcadeToken
    const tx13 = await arcadeCoreVoting.setCustomQuorum(arcadeToken.address, MINT_TOKENS, MINT_TOKENS_QUORUM);
    await tx13.wait();
    const tx14 = await arcadeCoreVoting.setCustomQuorum(arcadeToken.address, SET_MINTER, SET_MINTER_QUORUM);
    await tx14.wait();
    // NFTBoostVault
    const tx15 = await arcadeCoreVoting.setCustomQuorum(
        nftBoostVault.address,
        SET_AIRDROP_CONTRACT,
        SET_AIRDROP_CONTRACT_QUORUM,
    );
    await tx15.wait();
    const tx16 = await arcadeCoreVoting.setCustomQuorum(nftBoostVault.address, UNLOCK, UNLOCK_QUORUM);
    await tx16.wait();
    // Timelock
    const tx17 = await arcadeCoreVoting.setCustomQuorum(timelock.address, REGISTER_CALL, REGISTER_CALL_QUORUM);
    await tx17.wait();
    const tx18 = await arcadeCoreVoting.setCustomQuorum(timelock.address, SET_WAIT_TIME, SET_WAIT_TIME_QUORUM);
    await tx18.wait();
    // ArcadeTreasury
    const tx19 = await arcadeCoreVoting.setCustomQuorum(arcadeTreasury.address, MEDIUM_SPEND, MEDIUM_SPEND_QUORUM);
    await tx19.wait();
    const tx20 = await arcadeCoreVoting.setCustomQuorum(
        arcadeTreasury.address,
        APPROVE_MEDIUM_SPEND,
        APPROVE_MEDIUM_SPEND_QUORUM,
    );
    await tx20.wait();
    const tx21 = await arcadeCoreVoting.setCustomQuorum(arcadeTreasury.address, LARGE_SPEND, LARGE_SPEND_QUORUM);
    await tx21.wait();
    const tx22 = await arcadeCoreVoting.setCustomQuorum(
        arcadeTreasury.address,
        APPROVE_LARGE_SPEND,
        APPROVE_LARGE_SPEND_QUORUM,
    );
    await tx22.wait();
    // OriginationController
    const tx23 = await arcadeCoreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_VERIFIERS,
        SET_ALLOWED_VERIFIERS_QUORUM,
    );
    await tx23.wait();
    const tx24 = await arcadeCoreVoting.setCustomQuorum(
        ORIGINATION_CONTROLLER_ADDR,
        SET_ALLOWED_PAYABLE_CURRENCIES,
        SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM,
    );
    await tx24.wait();

    console.log("Decentralize ArcadeCoreVotings...");
    const tx25 = await arcadeCoreVoting.authorize(arcadeGSCCoreVoting.address);
    await tx25.wait();
    const tx26 = await arcadeCoreVoting.setOwner(timelock.address);
    await tx26.wait();

    // ================= Timelock =================
    console.log("Decentralize Timelock...");
    const tx27 = await timelock.deauthorize(DEPLOYER_ADDRESS);
    await tx27.wait();
    const tx28 = await timelock.authorize(arcadeGSCCoreVoting.address);
    await tx28.wait();
    const tx29 = await timelock.setOwner(arcadeCoreVoting.address);
    await tx29.wait();

    // ================= ArcadeGSCCoreVoting =================
    console.log("Setting custom quorum thresholds in ArcadeGSCCoreVoting...");
    // LoanCore
    const tx30 = await arcadeGSCCoreVoting.setCustomQuorum(LOAN_CORE_ADDR, PAUSE, PAUSE_QUORUM);
    await tx30.wait();
    // timelock
    const tx31 = await arcadeGSCCoreVoting.setCustomQuorum(timelock.address, INCREASE_TIME, INCREASE_TIME_QUORUM);
    await tx31.wait();
    console.log("Changing min lock time for GSC proposals from 3 days to 8 hours...");
    const tx32 = await arcadeGSCCoreVoting.setLockDuration(GSC_MIN_LOCK_DURATION);
    await tx32.wait();
    console.log("Decentralize ArcadeGSCCoreVoting...");
    const tx33 = await arcadeGSCCoreVoting.setOwner(timelock.address);
    await tx33.wait();

    // ================= ArcadeTreasury =================
    console.log("Setting spend thresholds in ArcadeTreasury...");
    const tx34 = await arcadeTreasury.setThreshold(arcadeToken.address, {
        small: ARCD_SMALL,
        medium: ARCD_MEDIUM,
        large: ARCD_LARGE,
    });
    await tx34.wait();
    const tx35 = await arcadeTreasury.setThreshold(ETH_ADDRESS, {
        small: ETH_SMALL,
        medium: ETH_MEDIUM,
        large: ETH_LARGE,
    });
    await tx35.wait();
    const tx36 = await arcadeTreasury.setThreshold(WETH_ADDRESS, {
        small: WETH_SMALL,
        medium: WETH_MEDIUM,
        large: WETH_LARGE,
    });
    await tx36.wait();
    const tx37 = await arcadeTreasury.setThreshold(USDC_ADDRESS, {
        small: USDC_SMALL,
        medium: USDC_MEDIUM,
        large: USDC_LARGE,
    });
    await tx37.wait();
    const tx38 = await arcadeTreasury.setThreshold(USDT_ADDRESS, {
        small: USDT_SMALL,
        medium: USDT_MEDIUM,
        large: USDT_LARGE,
    });
    await tx38.wait();
    const tx39 = await arcadeTreasury.setThreshold(DAI_ADDRESS, {
        small: DAI_SMALL,
        medium: DAI_MEDIUM,
        large: DAI_LARGE,
    });
    await tx39.wait();
    const tx40 = await arcadeTreasury.setThreshold(WBTC_ADDRESS, {
        small: WBTC_SMALL,
        medium: WBTC_MEDIUM,
        large: WBTC_LARGE,
    });
    await tx40.wait();
    const tx41 = await arcadeTreasury.setThreshold(APE_ADDRESS, {
        small: APE_SMALL,
        medium: APE_MEDIUM,
        large: APE_LARGE,
    });
    await tx41.wait();

    console.log("Grant ArcadeTreasury permissions to foundation multisig...");
    const tx42 = await arcadeTreasury.grantRole(await arcadeTreasury.GSC_CORE_VOTING_ROLE(), FOUNDATION_MULTISIG);
    await tx42.wait();
    const tx43 = await arcadeTreasury.grantRole(await arcadeTreasury.CORE_VOTING_ROLE(), FOUNDATION_MULTISIG);
    await tx43.wait();
    const tx44 = await arcadeTreasury.grantRole(await arcadeTreasury.ADMIN_ROLE(), FOUNDATION_MULTISIG);
    await tx44.wait();
    const tx45 = await arcadeTreasury.renounceRole(await arcadeTreasury.ADMIN_ROLE(), DEPLOYER_ADDRESS);
    await tx45.wait();

    // ================= ReputationBadge =================
    console.log("Setup ReputationBadge manager roles...");
    const tx46 = await reputationBadge.grantRole(await reputationBadge.BADGE_MANAGER_ROLE(), MULTISIG);
    await tx46.wait();
    const tx47 = await reputationBadge.grantRole(await reputationBadge.RESOURCE_MANAGER_ROLE(), MULTISIG);
    await tx47.wait();
    const tx48 = await reputationBadge.grantRole(await reputationBadge.ADMIN_ROLE(), MULTISIG);
    await tx48.wait();
    const tx49 = await reputationBadge.renounceRole(await reputationBadge.ADMIN_ROLE(), DEPLOYER_ADDRESS);
    await tx49.wait();
}

async function attachAddresses(jsonFile: string): Promise<ContractArgs> {
    const readData = fs.readFileSync(jsonFile, "utf-8");
    const jsonData = JSON.parse(readData);
    const contracts: { [key: string]: Contract } = {};

    for await (const key of Object.keys(jsonData)) {
        if (!(key in jsonContracts)) continue;

        const argKey = jsonContracts[key];

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
