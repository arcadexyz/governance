import assert from "assert";
import { expect } from "chai";
import { execSync } from "child_process";
import { artifacts, ethers } from "hardhat";

import {
    ARCDVestingVault,
    ArcadeAirdrop,
    ArcadeCoreVoting,
    ArcadeGSCCoreVoting,
    ArcadeGSCVault,
    ArcadeToken,
    ArcadeTokenDistributor,
    ArcadeTreasury,
    ArcadeTreasuryTimelock,
    BadgeDescriptor,
    ImmutableVestingVault,
    NFTBoostVault,
    ReputationBadge,
    Timelock,
} from "../../../src/types";
import {
    ADD,
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
} from "../config/custom-quorum-params";
import {
    ADMIN_ROLE,
    AIRDROP_EXPIRATION,
    AIRDROP_MERKLE_ROOT,
    BADGE_DESCRIPTOR_BASE_URI,
    BADGE_MANAGER_ROLE,
    BASE_QUORUM,
    BASE_QUORUM_GSC,
    CORE_VOTING_ROLE,
    FEE_CLAIMER_ROLE,
    FOUNDATION_MULTISIG,
    GSC_CORE_VOTING_ROLE,
    GSC_MIN_LOCK_DURATION,
    GSC_THRESHOLD,
    LAUNCH_PARTNER_MULTISIG,
    MIN_PROPOSAL_POWER_CORE_VOTING,
    MIN_PROPOSAL_POWER_GSC,
    RESOURCE_MANAGER_ROLE,
    STALE_BLOCK_LAG,
    TIMELOCK_WAIT_TIME,
    VESTING_MANAGER_MULTISIG,
} from "../config/deployment-params";
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
} from "../config/treasury-thresholds";
import { NETWORK, getLatestDeployment, getLatestDeploymentFile, getVerifiedABI } from "./utils";

/**
 * This script deploys all governance contracts, sets up decentralization, and
 * verifies all contracts on Etherscan.
 *
 * Note: Against normal conventions, these tests are interdependent and meant
 * to run sequentially. Each subsequent test relies on the state of the previous.
 *
 * To run this script use:
 * `yarn clean && yarn compile && npx hardhat test scripts/deploy/test/e2e.ts --network <networkName>`
 */
assert(NETWORK !== "hardhat", "Must use a long-lived network!");

describe("Governance Deployment", function () {
    this.timeout(0);
    this.bail();

    it("deploys contracts and creates deployment artifacts", async () => {
        const [deployer] = await ethers.getSigners();

        if (process.env.EXEC) {
            console.log(); // whitespace
            execSync(`npx hardhat --network ${NETWORK} run scripts/deploy/deploy.ts`, { stdio: "inherit" });
        }

        // Make sure deployment artifacts exist and have all the correct contracts specified
        const deployment = getLatestDeployment();

        expect(deployment["ArcadeTokenDistributor"]).to.exist;
        expect(deployment["ArcadeTokenDistributor"].contractAddress).to.exist;
        expect(deployment["ArcadeTokenDistributor"].constructorArgs.length).to.eq(0);

        expect(deployment["ArcadeToken"]).to.exist;
        expect(deployment["ArcadeToken"].contractAddress).to.exist;
        expect(deployment["ArcadeToken"].constructorArgs.length).to.eq(2);
        expect(deployment["ArcadeToken"].constructorArgs[0]).to.equal(deployer.address);
        expect(deployment["ArcadeToken"].constructorArgs[1]).to.equal(
            deployment["ArcadeTokenDistributor"].contractAddress,
        );

        expect(deployment["Timelock"]).to.exist;
        expect(deployment["Timelock"].contractAddress).to.exist;
        expect(deployment["Timelock"].constructorArgs.length).to.eq(3);
        expect(deployment["Timelock"].constructorArgs[0]).to.equal(TIMELOCK_WAIT_TIME);
        expect(deployment["Timelock"].constructorArgs[1]).to.equal(deployer.address);
        expect(deployment["Timelock"].constructorArgs[2]).to.equal(deployer.address);

        expect(deployment["ARCDVestingVault"]).to.exist;
        expect(deployment["ARCDVestingVault"].contractAddress).to.exist;
        expect(deployment["ARCDVestingVault"].constructorArgs.length).to.eq(4);
        expect(deployment["ARCDVestingVault"].constructorArgs[0]).to.equal(deployment["ArcadeToken"].contractAddress);
        expect(deployment["ARCDVestingVault"].constructorArgs[1]).to.equal(STALE_BLOCK_LAG);
        expect(deployment["ARCDVestingVault"].constructorArgs[2]).to.equal(VESTING_MANAGER_MULTISIG);
        expect(deployment["ARCDVestingVault"].constructorArgs[3]).to.equal(deployer.address);

        expect(deployment["ImmutableVestingVault"]).to.exist;
        expect(deployment["ImmutableVestingVault"].contractAddress).to.exist;
        expect(deployment["ImmutableVestingVault"].constructorArgs.length).to.eq(4);
        expect(deployment["ImmutableVestingVault"].constructorArgs[0]).to.equal(
            deployment["ArcadeToken"].contractAddress,
        );
        expect(deployment["ImmutableVestingVault"].constructorArgs[1]).to.equal(STALE_BLOCK_LAG);
        expect(deployment["ImmutableVestingVault"].constructorArgs[2]).to.equal(VESTING_MANAGER_MULTISIG);
        expect(deployment["ImmutableVestingVault"].constructorArgs[3]).to.equal(deployer.address);

        expect(deployment["NFTBoostVault"]).to.exist;
        expect(deployment["NFTBoostVault"].contractAddress).to.exist;
        expect(deployment["NFTBoostVault"].constructorArgs.length).to.eq(4);
        expect(deployment["NFTBoostVault"].constructorArgs[0]).to.equal(deployment["ArcadeToken"].contractAddress);
        expect(deployment["NFTBoostVault"].constructorArgs[1]).to.equal(STALE_BLOCK_LAG);
        expect(deployment["NFTBoostVault"].constructorArgs[2]).to.equal(deployer.address);
        expect(deployment["NFTBoostVault"].constructorArgs[3]).to.equal(deployer.address);

        expect(deployment["ArcadeCoreVoting"]).to.exist;
        expect(deployment["ArcadeCoreVoting"].contractAddress).to.exist;
        expect(deployment["ArcadeCoreVoting"].constructorArgs.length).to.eq(6);
        expect(deployment["ArcadeCoreVoting"].constructorArgs[0]).to.equal(deployer.address);
        expect(deployment["ArcadeCoreVoting"].constructorArgs[1]).to.equal(BASE_QUORUM);
        expect(deployment["ArcadeCoreVoting"].constructorArgs[2]).to.equal(MIN_PROPOSAL_POWER_CORE_VOTING);
        expect(deployment["ArcadeCoreVoting"].constructorArgs[3]).to.equal(ethers.constants.AddressZero);
        expect(deployment["ArcadeCoreVoting"].constructorArgs[4].length).to.eq(3);
        expect(deployment["ArcadeCoreVoting"].constructorArgs[4][0]).to.equal(
            deployment["ARCDVestingVault"].contractAddress,
        );
        expect(deployment["ArcadeCoreVoting"].constructorArgs[4][1]).to.equal(
            deployment["ImmutableVestingVault"].contractAddress,
        );
        expect(deployment["ArcadeCoreVoting"].constructorArgs[4][2]).to.equal(
            deployment["NFTBoostVault"].contractAddress,
        );
        expect(deployment["ArcadeCoreVoting"].constructorArgs[5]).to.equal(true);

        expect(deployment["ArcadeGSCVault"]).to.exist;
        expect(deployment["ArcadeGSCVault"].contractAddress).to.exist;
        expect(deployment["ArcadeGSCVault"].constructorArgs.length).to.eq(3);
        expect(deployment["ArcadeGSCVault"].constructorArgs[0]).to.equal(
            deployment["ArcadeCoreVoting"].contractAddress,
        );
        expect(deployment["ArcadeGSCVault"].constructorArgs[1]).to.equal(GSC_THRESHOLD);
        expect(deployment["ArcadeGSCVault"].constructorArgs[2]).to.equal(deployment["Timelock"].contractAddress);

        expect(deployment["ArcadeGSCCoreVoting"]).to.exist;
        expect(deployment["ArcadeGSCCoreVoting"].contractAddress).to.exist;
        expect(deployment["ArcadeGSCCoreVoting"].constructorArgs.length).to.eq(5);
        expect(deployment["ArcadeGSCCoreVoting"].constructorArgs[0]).to.equal(deployer.address);
        expect(deployment["ArcadeGSCCoreVoting"].constructorArgs[1]).to.equal(BASE_QUORUM_GSC);
        expect(deployment["ArcadeGSCCoreVoting"].constructorArgs[2]).to.equal(MIN_PROPOSAL_POWER_GSC);
        expect(deployment["ArcadeGSCCoreVoting"].constructorArgs[3]).to.equal(ethers.constants.AddressZero);
        expect(deployment["ArcadeGSCCoreVoting"].constructorArgs[4].length).to.equal(1);
        expect(deployment["ArcadeGSCCoreVoting"].constructorArgs[4][0]).to.equal(
            deployment["ArcadeGSCVault"].contractAddress,
        );

        expect(deployment["ArcadeTreasuryTimelock"]).to.exist;
        expect(deployment["ArcadeTreasuryTimelock"].contractAddress).to.exist;
        expect(deployment["ArcadeTreasuryTimelock"].constructorArgs.length).to.eq(3);
        expect(deployment["ArcadeTreasuryTimelock"].constructorArgs[0]).to.equal(TIMELOCK_WAIT_TIME);
        expect(deployment["ArcadeTreasuryTimelock"].constructorArgs[1]).to.equal(FOUNDATION_MULTISIG);
        expect(deployment["ArcadeTreasuryTimelock"].constructorArgs[2]).to.equal(
            deployment["ArcadeGSCCoreVoting"].contractAddress,
        );

        expect(deployment["ArcadeTreasury"]).to.exist;
        expect(deployment["ArcadeTreasury"].contractAddress).to.exist;
        expect(deployment["ArcadeTreasury"].constructorArgs.length).to.eq(1);
        expect(deployment["ArcadeTreasury"].constructorArgs[0]).to.eq(deployer.address);

        expect(deployment["ArcadeAirdrop"]).to.exist;
        expect(deployment["ArcadeAirdrop"].contractAddress).to.exist;
        expect(deployment["ArcadeAirdrop"].constructorArgs.length).to.eq(4);
        expect(deployment["ArcadeAirdrop"].constructorArgs[0]).to.eq(AIRDROP_MERKLE_ROOT);
        expect(deployment["ArcadeAirdrop"].constructorArgs[1]).to.eq(deployment["ArcadeToken"].contractAddress);
        expect(deployment["ArcadeAirdrop"].constructorArgs[2]).to.be.lt(
            Math.floor(Date.now() / 1000) + AIRDROP_EXPIRATION,
        ); // cannot use global AIRDROP_EXPIRATION because time has passed
        expect(deployment["ArcadeAirdrop"].constructorArgs[2]).to.not.eq(0);
        expect(deployment["ArcadeAirdrop"].constructorArgs[3]).to.eq(deployment["NFTBoostVault"].contractAddress);

        expect(deployment["BadgeDescriptor"]).to.exist;
        expect(deployment["BadgeDescriptor"].contractAddress).to.exist;
        expect(deployment["BadgeDescriptor"].constructorArgs.length).to.eq(1);
        expect(deployment["BadgeDescriptor"].constructorArgs[0]).to.eq(BADGE_DESCRIPTOR_BASE_URI);

        expect(deployment["ReputationBadge"]).to.exist;
        expect(deployment["ReputationBadge"].contractAddress).to.exist;
        expect(deployment["ReputationBadge"].constructorArgs.length).to.eq(2);
        expect(deployment["ReputationBadge"].constructorArgs[0]).to.eq(deployer.address);
        expect(deployment["ReputationBadge"].constructorArgs[1]).to.eq(deployment["BadgeDescriptor"].contractAddress);
    });

    it("distribute tokens to treasury, airdrop, and vesting manager", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            // run distribute-tokens.ts script
            execSync(
                `HARDHAT_NETWORK=${NETWORK} DEPLOYMENT_FILE=${filename} ts-node scripts/deploy/distribute-tokens.ts ${filename}`,
                {
                    stdio: "inherit",
                },
            );
        }

        const arcadeToken = <ArcadeToken>(
            await ethers.getContractAt("ArcadeToken", deployment["ArcadeToken"].contractAddress)
        );
        const arcadeTokenDistributor = <ArcadeTokenDistributor>(
            await ethers.getContractAt("ArcadeTokenDistributor", deployment["ArcadeTokenDistributor"].contractAddress)
        );

        // ArcadeTokenDistributor token address
        expect(await arcadeTokenDistributor.arcadeToken()).to.equal(arcadeToken.address);

        // ArcadeTokenDistributor distribution triggers
        expect(await arcadeTokenDistributor.governanceTreasurySent()).to.equal(true);
        expect(await arcadeTokenDistributor.communityAirdropSent()).to.equal(true);
        expect(await arcadeTokenDistributor.vestingTeamSent()).to.equal(true);
        expect(await arcadeTokenDistributor.vestingPartnerSent()).to.equal(true);
    });

    it("sets custom quorums in core voting and gsc core voting", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            // run set-custom-quorums.ts script
            execSync(
                `HARDHAT_NETWORK=${NETWORK} DEPLOYMENT_FILE=${filename} ts-node scripts/deploy/set-custom-quorums.ts ${filename}`,
                {
                    stdio: "inherit",
                },
            );
        }

        const arcadeToken = <ArcadeToken>(
            await ethers.getContractAt("ArcadeToken", deployment["ArcadeToken"].contractAddress)
        );
        const nftBoostVault = <NFTBoostVault>(
            await ethers.getContractAt("NFTBoostVault", deployment["NFTBoostVault"].contractAddress)
        );
        const timelock = <Timelock>await ethers.getContractAt("Timelock", deployment["Timelock"].contractAddress);
        const arcadeCoreVoting = <ArcadeCoreVoting>(
            await ethers.getContractAt("ArcadeCoreVoting", deployment["ArcadeCoreVoting"].contractAddress)
        );
        const arcadeGSCCoreVoting = <ArcadeGSCCoreVoting>(
            await ethers.getContractAt("ArcadeGSCCoreVoting", deployment["ArcadeGSCCoreVoting"].contractAddress)
        );
        const arcadeTreasury = <ArcadeTreasury>(
            await ethers.getContractAt("ArcadeTreasury", deployment["ArcadeTreasury"].contractAddress)
        );

        // ArcadeCoreVoting custom quorums
        expect(await arcadeCoreVoting.quorums(arcadeToken.address, MINT_TOKENS)).to.equal(MINT_TOKENS_QUORUM);
        expect(await arcadeCoreVoting.quorums(arcadeToken.address, SET_MINTER)).to.equal(SET_MINTER_QUORUM);
        expect(await arcadeCoreVoting.quorums(nftBoostVault.address, SET_AIRDROP_CONTRACT)).to.equal(
            SET_AIRDROP_CONTRACT_QUORUM,
        );
        expect(await arcadeCoreVoting.quorums(timelock.address, REGISTER_CALL)).to.equal(REGISTER_CALL_QUORUM);
        expect(await arcadeCoreVoting.quorums(timelock.address, SET_WAIT_TIME)).to.equal(SET_WAIT_TIME_QUORUM);
        expect(await arcadeCoreVoting.quorums(arcadeTreasury.address, MEDIUM_SPEND)).to.equal(MEDIUM_SPEND_QUORUM);
        expect(await arcadeCoreVoting.quorums(arcadeTreasury.address, APPROVE_MEDIUM_SPEND)).to.equal(
            APPROVE_MEDIUM_SPEND_QUORUM,
        );
        expect(await arcadeCoreVoting.quorums(arcadeTreasury.address, LARGE_SPEND)).to.equal(LARGE_SPEND_QUORUM);
        expect(await arcadeCoreVoting.quorums(arcadeTreasury.address, APPROVE_LARGE_SPEND)).to.equal(
            APPROVE_LARGE_SPEND_QUORUM,
        );
        expect(await arcadeCoreVoting.quorums(CALL_WHITELIST_ALL_EXTENSIONS_ADDR, ADD)).to.equal(ADD_QUORUM);
        expect(await arcadeCoreVoting.quorums(CALL_WHITELIST_ALL_EXTENSIONS_ADDR, SET_APPROVAL)).to.equal(
            SET_APPROVAL_QUORUM,
        );
        expect(await arcadeCoreVoting.quorums(CALL_WHITELIST_ALL_EXTENSIONS_ADDR, SET_REGISTRY)).to.equal(
            SET_REGISTRY_QUORUM,
        );
        expect(await arcadeCoreVoting.quorums(CALL_WHITELIST_ALL_EXTENSIONS_ADDR, GRANT_ROLE)).to.equal(
            CWA_GRANT_ROLE_QUORUM,
        );
        expect(await arcadeCoreVoting.quorums(CALL_WHITELIST_ALL_EXTENSIONS_ADDR, REVOKE_ROLE)).to.equal(
            CWA_REVOKE_ROLE_QUORUM,
        );
        expect(await arcadeCoreVoting.quorums(CALL_WHITELIST_ALL_EXTENSIONS_ADDR, RENOUNCE_ROLE)).to.equal(
            CWA_RENOUNCE_ROLE_QUORUM,
        );
        expect(await arcadeCoreVoting.quorums(VAULT_FACTORY_ADDR, GRANT_ROLE)).to.equal(VF_GRANT_ROLE_QUORUM);
        expect(await arcadeCoreVoting.quorums(VAULT_FACTORY_ADDR, REVOKE_ROLE)).to.equal(VF_REVOKE_ROLE_QUORUM);
        expect(await arcadeCoreVoting.quorums(FEE_CONTROLLER_ADDR, TRANSFER_OWNERSHIP)).to.equal(
            TRANSFER_OWNERSHIP_QUORUM,
        );
        expect(await arcadeCoreVoting.quorums(LOAN_CORE_ADDR, GRANT_ROLE)).to.equal(LC_GRANT_ROLE_QUORUM);
        expect(await arcadeCoreVoting.quorums(LOAN_CORE_ADDR, REVOKE_ROLE)).to.equal(LC_REVOKE_ROLE_QUORUM);
        expect(await arcadeCoreVoting.quorums(LOAN_CORE_ADDR, RENOUNCE_ROLE)).to.equal(LC_REVOKE_ROLE_QUORUM);
        expect(await arcadeCoreVoting.quorums(ORIGINATION_CONTROLLER_ADDR, SET_ALLOWED_VERIFIERS)).to.equal(
            SET_ALLOWED_VERIFIERS_QUORUM,
        );
        expect(await arcadeCoreVoting.quorums(ORIGINATION_CONTROLLER_ADDR, SET_ALLOWED_PAYABLE_CURRENCIES)).to.equal(
            SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM,
        );
        expect(await arcadeCoreVoting.quorums(ORIGINATION_CONTROLLER_ADDR, GRANT_ROLE)).to.equal(OC_GRANT_ROLE_QUORUM);
        expect(await arcadeCoreVoting.quorums(ORIGINATION_CONTROLLER_ADDR, REVOKE_ROLE)).to.equal(
            OC_REVOKE_ROLE_QUORUM,
        );
        expect(await arcadeCoreVoting.quorums(ORIGINATION_CONTROLLER_ADDR, RENOUNCE_ROLE)).to.equal(
            OC_RENOUNCE_ROLE_QUORUM,
        );

        // ArcadeGSCCoreVoting custom quorums
        expect(await arcadeGSCCoreVoting.quorums(LOAN_CORE_ADDR, SHUTDOWN)).to.equal(SHUTDOWN_QUORUM);
        expect(await arcadeGSCCoreVoting.quorums(timelock.address, INCREASE_TIME)).to.equal(INCREASE_TIME_QUORUM);
    });

    it("sets treasury spend thresholds", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            // run set-treasury-thresholds.ts script
            execSync(
                `HARDHAT_NETWORK=${NETWORK} DEPLOYMENT_FILE=${filename} ts-node scripts/deploy/set-treasury-thresholds.ts ${filename}`,
                {
                    stdio: "inherit",
                },
            );
        }

        const arcadeToken = <ArcadeToken>(
            await ethers.getContractAt("ArcadeToken", deployment["ArcadeToken"].contractAddress)
        );
        const arcadeTreasury = <ArcadeTreasury>(
            await ethers.getContractAt("ArcadeTreasury", deployment["ArcadeTreasury"].contractAddress)
        );

        // ArcadeTreasury spend thresholds
        const thresholdsARCD = await arcadeTreasury.spendThresholds(arcadeToken.address);
        expect(thresholdsARCD.small).to.equal(ARCD_SMALL);
        expect(thresholdsARCD.medium).to.equal(ARCD_MEDIUM);
        expect(thresholdsARCD.large).to.equal(ARCD_LARGE);
        const thresholdsETH = await arcadeTreasury.spendThresholds(ETH_ADDRESS);
        expect(thresholdsETH.small).to.equal(ETH_SMALL);
        expect(thresholdsETH.medium).to.equal(ETH_MEDIUM);
        expect(thresholdsETH.large).to.equal(ETH_LARGE);
        const thresholdsWETH = await arcadeTreasury.spendThresholds(WETH_ADDRESS);
        expect(thresholdsWETH.small).to.equal(WETH_SMALL);
        expect(thresholdsWETH.medium).to.equal(WETH_MEDIUM);
        expect(thresholdsWETH.large).to.equal(WETH_LARGE);
        const thresholdsUSDC = await arcadeTreasury.spendThresholds(USDC_ADDRESS);
        expect(thresholdsUSDC.small).to.equal(USDC_SMALL);
        expect(thresholdsUSDC.medium).to.equal(USDC_MEDIUM);
        expect(thresholdsUSDC.large).to.equal(USDC_LARGE);
        const thresholdsUSDT = await arcadeTreasury.spendThresholds(USDT_ADDRESS);
        expect(thresholdsUSDT.small).to.equal(USDT_SMALL);
        expect(thresholdsUSDT.medium).to.equal(USDT_MEDIUM);
        expect(thresholdsUSDT.large).to.equal(USDT_LARGE);
        const thresholdsDAI = await arcadeTreasury.spendThresholds(DAI_ADDRESS);
        expect(thresholdsDAI.small).to.equal(DAI_SMALL);
        expect(thresholdsDAI.medium).to.equal(DAI_MEDIUM);
        expect(thresholdsDAI.large).to.equal(DAI_LARGE);
        const thresholdsWBTC = await arcadeTreasury.spendThresholds(WBTC_ADDRESS);
        expect(thresholdsWBTC.small).to.equal(WBTC_SMALL);
        expect(thresholdsWBTC.medium).to.equal(WBTC_MEDIUM);
        expect(thresholdsWBTC.large).to.equal(WBTC_LARGE);
        const thresholdsAPE = await arcadeTreasury.spendThresholds(APE_ADDRESS);
        expect(thresholdsAPE.small).to.equal(APE_SMALL);
        expect(thresholdsAPE.medium).to.equal(APE_MEDIUM);
        expect(thresholdsAPE.large).to.equal(APE_LARGE);
    });

    it("sets up dao decentralization", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();
        const [deployer] = await ethers.getSigners();

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            // run setup.ts script
            execSync(
                `HARDHAT_NETWORK=${NETWORK} DEPLOYMENT_FILE=${filename} ts-node scripts/deploy/setup.ts ${filename}`,
                { stdio: "inherit" },
            );
        }

        const arcadeToken = <ArcadeToken>(
            await ethers.getContractAt("ArcadeToken", deployment["ArcadeToken"].contractAddress)
        );
        const arcadeTokenDistributor = <ArcadeTokenDistributor>(
            await ethers.getContractAt("ArcadeTokenDistributor", deployment["ArcadeTokenDistributor"].contractAddress)
        );
        const arcadeAirdrop = <ArcadeAirdrop>(
            await ethers.getContractAt("ArcadeAirdrop", deployment["ArcadeAirdrop"].contractAddress)
        );
        const teamVestingVault = <ARCDVestingVault>(
            await ethers.getContractAt("ARCDVestingVault", deployment["ARCDVestingVault"].contractAddress)
        );
        const partnerVestingVault = <ImmutableVestingVault>(
            await ethers.getContractAt("ImmutableVestingVault", deployment["ImmutableVestingVault"].contractAddress)
        );
        const nftBoostVault = <NFTBoostVault>(
            await ethers.getContractAt("NFTBoostVault", deployment["NFTBoostVault"].contractAddress)
        );
        const timelock = <Timelock>await ethers.getContractAt("Timelock", deployment["Timelock"].contractAddress);
        const arcadeCoreVoting = <ArcadeCoreVoting>(
            await ethers.getContractAt("ArcadeCoreVoting", deployment["ArcadeCoreVoting"].contractAddress)
        );
        const arcadeGSCVault = <ArcadeGSCVault>(
            await ethers.getContractAt("ArcadeGSCVault", deployment["ArcadeGSCVault"].contractAddress)
        );
        const arcadeGSCCoreVoting = <ArcadeGSCCoreVoting>(
            await ethers.getContractAt("ArcadeGSCCoreVoting", deployment["ArcadeGSCCoreVoting"].contractAddress)
        );
        const arcadeTreasuryTimelock = <ArcadeTreasuryTimelock>(
            await ethers.getContractAt("ArcadeTreasuryTimelock", deployment["ArcadeTreasuryTimelock"].contractAddress)
        );
        const arcadeTreasury = <ArcadeTreasury>(
            await ethers.getContractAt("ArcadeTreasury", deployment["ArcadeTreasury"].contractAddress)
        );
        const reputationBadge = <ReputationBadge>(
            await ethers.getContractAt("ReputationBadge", deployment["ReputationBadge"].contractAddress)
        );
        const badgeDescriptor = <BadgeDescriptor>(
            await ethers.getContractAt("BadgeDescriptor", deployment["BadgeDescriptor"].contractAddress)
        );

        // ArcadeToken minter address
        expect(await arcadeToken.minter()).to.equal(arcadeCoreVoting.address);

        // ArcadeTokenDistributor owner
        expect(await arcadeTokenDistributor.owner()).to.equal(LAUNCH_PARTNER_MULTISIG);

        // ArcadeAirdrop owner
        expect(await arcadeAirdrop.owner()).to.equal(LAUNCH_PARTNER_MULTISIG);
        expect(await arcadeAirdrop.isAuthorized(deployer.address)).to.equal(false);

        // ARCDVestingVault manager and timelock
        expect(await teamVestingVault.manager()).to.equal(VESTING_MANAGER_MULTISIG);
        expect(await teamVestingVault.timelock()).to.equal(timelock.address);

        // ImmutableVestingVault manager and timelock
        expect(await partnerVestingVault.manager()).to.equal(VESTING_MANAGER_MULTISIG);
        expect(await partnerVestingVault.timelock()).to.equal(timelock.address);

        // NFTBoostVault airdrop contract
        expect(await nftBoostVault.getAirdropContract()).to.equal(arcadeAirdrop.address);

        // NFTBoostVault authorized users
        expect(await nftBoostVault.manager()).to.equal(LAUNCH_PARTNER_MULTISIG);
        expect(await nftBoostVault.timelock()).to.equal(arcadeCoreVoting.address);

        // CoreVoting authorized address
        expect(await arcadeCoreVoting.authorized(deployer.address)).to.equal(false);
        expect(await arcadeCoreVoting.authorized(arcadeGSCCoreVoting.address)).to.equal(true);

        // CoreVoting owner
        expect(await arcadeCoreVoting.owner()).to.equal(timelock.address);

        // Timelock authorized address
        expect(await timelock.authorized(deployer.address)).to.equal(false);
        expect(await timelock.authorized(arcadeGSCCoreVoting.address)).to.equal(true);

        // Timelock owner
        expect(await timelock.owner()).to.equal(arcadeCoreVoting.address);

        // ArcadeGSCCoreVoting minimum lock duration
        expect(await arcadeGSCCoreVoting.lockDuration()).to.equal(GSC_MIN_LOCK_DURATION);

        // ArcadeGSCCoreVoting authorized address
        expect(await arcadeGSCCoreVoting.authorized(deployer.address)).to.equal(false);
        expect(await arcadeGSCCoreVoting.authorized(arcadeCoreVoting.address)).to.equal(false);

        // ArcadeGSCCoreVoting owner
        expect(await arcadeGSCCoreVoting.owner()).to.equal(timelock.address);

        // ArcadeGSCVault authorized address
        expect(await arcadeGSCVault.isAuthorized(deployer.address)).to.equal(false);
        expect(await arcadeGSCVault.isAuthorized(arcadeCoreVoting.address)).to.equal(false);

        // ArcadeGSCVault owner
        expect(await arcadeGSCVault.owner()).to.equal(timelock.address);

        // ArcadeGSCVault coreVoting address
        expect(await arcadeGSCVault.coreVoting()).to.equal(arcadeCoreVoting.address);

        // TreasuryTimelock authorized address
        expect(await arcadeTreasuryTimelock.authorized(deployer.address)).to.equal(false);
        expect(await arcadeTreasuryTimelock.authorized(arcadeGSCCoreVoting.address)).to.equal(true);

        // TreasuryTimelock owner
        expect(await arcadeTreasuryTimelock.owner()).to.equal(FOUNDATION_MULTISIG);

        // ArcadeTreasury GSC_CORE_VOTING_ROLE
        expect(await arcadeTreasury.hasRole(await arcadeTreasury.GSC_CORE_VOTING_ROLE(), FOUNDATION_MULTISIG)).to.equal(
            true,
        );

        // ArcadeTreasury CORE_VOTING_ROLE
        expect(await arcadeTreasury.hasRole(await arcadeTreasury.CORE_VOTING_ROLE(), FOUNDATION_MULTISIG)).to.equal(
            true,
        );

        // ArcadeTreasury ADMIN_ROLE
        expect(await arcadeTreasury.hasRole(await arcadeTreasury.ADMIN_ROLE(), FOUNDATION_MULTISIG)).to.equal(true);

        // ArcadeTreasury ADMIN_ROLE was renounced by deployer
        expect(await arcadeTreasury.hasRole(await arcadeTreasury.ADMIN_ROLE(), deployer.address)).to.equal(false);

        // ArcadeTreasury total members in each role
        expect(await arcadeTreasury.getRoleMemberCount(GSC_CORE_VOTING_ROLE)).to.equal(1);
        expect(await arcadeTreasury.getRoleMemberCount(CORE_VOTING_ROLE)).to.equal(1);
        expect(await arcadeTreasury.getRoleMemberCount(ADMIN_ROLE)).to.equal(1);

        // ReputationBadge BADGE_MANAGER_ROLE
        expect(await reputationBadge.hasRole(BADGE_MANAGER_ROLE, LAUNCH_PARTNER_MULTISIG)).to.equal(true);

        // ReputationBadge RESOURCE_MANAGER_ROLE
        expect(await reputationBadge.hasRole(RESOURCE_MANAGER_ROLE, LAUNCH_PARTNER_MULTISIG)).to.equal(true);

        // ReputationBadge FEE_CLAIMER_ROLE
        expect(await reputationBadge.hasRole(FEE_CLAIMER_ROLE, arcadeTreasury.address)).to.equal(true);

        // ReputationBadge ADMIN_ROLE
        expect(await reputationBadge.hasRole(ADMIN_ROLE, LAUNCH_PARTNER_MULTISIG)).to.equal(true);

        // ReputationBadge ADMIN_ROLE was renounced by deployer
        expect(await reputationBadge.hasRole(ADMIN_ROLE, deployer.address)).to.equal(false);

        // ReputationBadge total members in each role
        expect(await reputationBadge.getRoleMemberCount(BADGE_MANAGER_ROLE)).to.equal(1);
        expect(await reputationBadge.getRoleMemberCount(RESOURCE_MANAGER_ROLE)).to.equal(1);
        expect(await reputationBadge.getRoleMemberCount(FEE_CLAIMER_ROLE)).to.equal(1);
        expect(await reputationBadge.getRoleMemberCount(ADMIN_ROLE)).to.equal(1);

        // BadgeDescriptor owner
        expect(await badgeDescriptor.owner()).to.equal(LAUNCH_PARTNER_MULTISIG);
    });

    it("verifies all contracts on the proper network", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            execSync(
                `HARDHAT_NETWORK=${NETWORK} DEPLOYMENT_FILE=${filename} ts-node scripts/deploy/verify-contracts.ts ${filename}`,
                {
                    stdio: "inherit",
                },
            );
        }

        // For each contract - compare verified ABI against artifact ABI
        for (let contractName of Object.keys(deployment)) {
            const contractData = deployment[contractName];

            if (contractName.includes("ArcadeGSCCoreVoting")) contractName = "ArcadeCoreVoting";
            if (contractName.includes("ArcadeGSCVault")) contractName = "GSCVault";
            if (contractName.includes("ArcadeTreasuryTimelock")) contractName = "Timelock";

            const artifact = await artifacts.readArtifact(contractName);

            const verifiedAbi = await getVerifiedABI(contractData.contractAddress);
            expect(artifact.abi).to.deep.equal(verifiedAbi);
        }
    });
});
