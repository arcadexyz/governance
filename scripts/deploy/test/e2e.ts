import assert from "assert";
import { expect } from "chai";
import { execSync } from "child_process";
import { artifacts, ethers } from "hardhat";

import {
    ArcadeAirdrop,
    ArcadeCoreVoting,
    ArcadeGSCCoreVoting,
    ArcadeToken,
    ArcadeTokenDistributor,
    ArcadeTreasury,
    BadgeDescriptor,
    NFTBoostVault,
    ReputationBadge,
    Timelock,
} from "../../../src/types";
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
} from "../config/custom-quorum-params";
import {
    FOUNDATION_MULTISIG,
    GSC_MIN_LOCK_DURATION,
    MULTISIG,
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

describe("Deployment", function () {
    this.timeout(0);
    this.bail();

    it("deploys contracts and creates deployment artifacts", async () => {
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

        expect(deployment["Timelock"]).to.exist;
        expect(deployment["Timelock"].contractAddress).to.exist;
        expect(deployment["Timelock"].constructorArgs.length).to.eq(3);

        expect(deployment["ARCDVestingVault"]).to.exist;
        expect(deployment["ARCDVestingVault"].contractAddress).to.exist;
        expect(deployment["ARCDVestingVault"].constructorArgs.length).to.eq(4);

        expect(deployment["ImmutableVestingVault"]).to.exist;
        expect(deployment["ImmutableVestingVault"].contractAddress).to.exist;
        expect(deployment["ImmutableVestingVault"].constructorArgs.length).to.eq(4);

        expect(deployment["NFTBoostVault"]).to.exist;
        expect(deployment["NFTBoostVault"].contractAddress).to.exist;
        expect(deployment["NFTBoostVault"].constructorArgs.length).to.eq(4);

        expect(deployment["ArcadeCoreVoting"]).to.exist;
        expect(deployment["ArcadeCoreVoting"].contractAddress).to.exist;
        expect(deployment["ArcadeCoreVoting"].constructorArgs.length).to.eq(6);

        expect(deployment["ArcadeGSCVault"]).to.exist;
        expect(deployment["ArcadeGSCVault"].contractAddress).to.exist;
        expect(deployment["ArcadeGSCVault"].constructorArgs.length).to.eq(3);

        expect(deployment["ArcadeGSCCoreVoting"]).to.exist;
        expect(deployment["ArcadeGSCCoreVoting"].contractAddress).to.exist;
        expect(deployment["ArcadeGSCCoreVoting"].constructorArgs.length).to.eq(5);

        expect(deployment["ArcadeTreasury"]).to.exist;
        expect(deployment["ArcadeTreasury"].contractAddress).to.exist;
        expect(deployment["ArcadeTreasury"].constructorArgs.length).to.eq(1);

        expect(deployment["ArcadeAirdrop"]).to.exist;
        expect(deployment["ArcadeAirdrop"].contractAddress).to.exist;
        expect(deployment["ArcadeAirdrop"].constructorArgs.length).to.eq(4);

        expect(deployment["BadgeDescriptor"]).to.exist;
        expect(deployment["BadgeDescriptor"].contractAddress).to.exist;
        expect(deployment["BadgeDescriptor"].constructorArgs.length).to.eq(1);

        expect(deployment["ReputationBadge"]).to.exist;
        expect(deployment["ReputationBadge"].contractAddress).to.exist;
        expect(deployment["ReputationBadge"].constructorArgs.length).to.eq(2);
    });

    it("correctly sets up decentralization", async () => {
        const [deployer] = await ethers.getSigners();

        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            execSync(`HARDHAT_NETWORK=${NETWORK} ts-node scripts/deploy/setup.ts ${filename}`, { stdio: "inherit" });
        }

        // Verify all the governance setup transactions were executed properly
        console.log("Verifying governance setup...");

        const arcadeTokenDistributor = <ArcadeTokenDistributor>(
            await ethers.getContractAt("ArcadeTokenDistributor", deployment["ArcadeTokenDistributor"].contractAddress)
        );
        const arcadeToken = <ArcadeToken>(
            await ethers.getContractAt("ArcadeToken", deployment["ArcadeToken"].contractAddress)
        );
        const timelock = <Timelock>await ethers.getContractAt("Timelock", deployment["Timelock"].contractAddress);
        const nftBoostVault = <NFTBoostVault>(
            await ethers.getContractAt("NFTBoostVault", deployment["NFTBoostVault"].contractAddress)
        );
        const arcadeCoreVoting = <ArcadeCoreVoting>(
            await ethers.getContractAt("ArcadeCoreVoting", deployment["ArcadeCoreVoting"].contractAddress)
        );
        const arcadeGSCCoreVoting = <ArcadeGSCCoreVoting>(
            await ethers.getContractAt("ArcadeGSCCoreVoting", deployment["ArcadeGSCCoreVoting"].contractAddress)
        );
        const arcadeTreasury = <ArcadeTreasury>(
            await ethers.getContractAt("ArcadeTreasury", deployment["ArcadeTreasury"].contractAddress)
        );
        const arcadeAirdrop = <ArcadeAirdrop>(
            await ethers.getContractAt("ArcadeAirdrop", deployment["ArcadeAirdrop"].contractAddress)
        );
        const reputationBadge = <ReputationBadge>(
            await ethers.getContractAt("ReputationBadge", deployment["ReputationBadge"].contractAddress)
        );
        const badgeDescriptor = <BadgeDescriptor>(
            await ethers.getContractAt("BadgeDescriptor", deployment["BadgeDescriptor"].contractAddress)
        );

        // ArcadeToken minter address
        expect(await arcadeToken.minter()).to.equal(arcadeCoreVoting.address);

        // ArcadeTokenDistributor token address
        expect(await arcadeTokenDistributor.arcadeToken()).to.equal(arcadeToken.address);

        // ArcadeTokenDistributor distribution triggers
        expect(await arcadeTokenDistributor.governanceTreasurySent()).to.equal(true);
        expect(await arcadeTokenDistributor.communityAirdropSent()).to.equal(true);
        expect(await arcadeTokenDistributor.vestingTeamSent()).to.equal(true);
        expect(await arcadeTokenDistributor.vestingPartnerSent()).to.equal(true);

        // ArcadeTokenDistributor owner
        expect(await arcadeTokenDistributor.owner()).to.equal(MULTISIG);

        // ArcadeAirdrop owner
        expect(await arcadeAirdrop.owner()).to.equal(MULTISIG);

        // NFTBoostVault airdrop contract
        expect(await nftBoostVault.getAirdropContract()).to.equal(arcadeAirdrop.address);

        // NFTBoostVault authorized users
        expect(await nftBoostVault.manager()).to.equal(MULTISIG);
        expect(await nftBoostVault.timelock()).to.equal(arcadeCoreVoting.address);

        // ArcadeCoreVoting custom quorums
        expect(await arcadeCoreVoting.quorums(arcadeToken.address, MINT_TOKENS)).to.equal(MINT_TOKENS_QUORUM);
        expect(await arcadeCoreVoting.quorums(arcadeToken.address, SET_MINTER)).to.equal(SET_MINTER_QUORUM);
        expect(await arcadeCoreVoting.quorums(nftBoostVault.address, UNLOCK)).to.equal(UNLOCK_QUORUM);
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
        expect(await arcadeCoreVoting.quorums(ORIGINATION_CONTROLLER_ADDR, SET_ALLOWED_VERIFIERS)).to.equal(
            SET_ALLOWED_VERIFIERS_QUORUM,
        );
        expect(await arcadeCoreVoting.quorums(ORIGINATION_CONTROLLER_ADDR, SET_ALLOWED_PAYABLE_CURRENCIES)).to.equal(
            SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM,
        );

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

        // ArcadeGSCCoreVoting custom quorums
        expect(await arcadeGSCCoreVoting.quorums(timelock.address, INCREASE_TIME)).to.equal(INCREASE_TIME_QUORUM);
        expect(await arcadeGSCCoreVoting.quorums(LOAN_CORE_ADDR, PAUSE)).to.equal(PAUSE_QUORUM);

        // ArcadeGSCCoreVoting minimum lock duration
        expect(await arcadeGSCCoreVoting.lockDuration()).to.equal(GSC_MIN_LOCK_DURATION);

        // ArcadeGSCCoreVoting authorized address (none
        expect(await arcadeGSCCoreVoting.authorized(deployer.address)).to.equal(false);

        // ArcadeGSCCoreVoting owner
        expect(await arcadeGSCCoreVoting.owner()).to.equal(timelock.address);

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

        // ReputationBadge BADGE_MANAGER_ROLE
        expect(await reputationBadge.hasRole(await reputationBadge.BADGE_MANAGER_ROLE(), MULTISIG)).to.equal(true);

        // ReputationBadge RESOURCE_MANAGER_ROLE
        expect(await reputationBadge.hasRole(await reputationBadge.RESOURCE_MANAGER_ROLE(), MULTISIG)).to.equal(true);

        // ReputationBadge ADMIN_ROLE
        expect(await reputationBadge.hasRole(await reputationBadge.ADMIN_ROLE(), MULTISIG)).to.equal(true);

        // ReputationBadge ADMIN_ROLE was renounced by deployer
        expect(await reputationBadge.hasRole(await reputationBadge.ADMIN_ROLE(), deployer.address)).to.equal(false);

        // BadgeDescriptor owner
        expect(await badgeDescriptor.owner()).to.equal(MULTISIG);
    });

    it("verifies all contracts on the proper network", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            execSync(`HARDHAT_NETWORK=${NETWORK} ts-node scripts/deploy/verify-contracts.ts ${filename}`, {
                stdio: "inherit",
            });
        }

        // For each contract - compare verified ABI against artifact ABI
        for (let contractName of Object.keys(deployment)) {
            const contractData = deployment[contractName];

            if (contractName.includes("ArcadeGSCCoreVoting")) contractName = "ArcadeCoreVoting";
            if (contractName.includes("ArcadeGSCVault")) contractName = "GSCVault";

            const artifact = await artifacts.readArtifact(contractName);

            const verifiedAbi = await getVerifiedABI(contractData.contractAddress);
            expect(artifact.abi).to.deep.equal(verifiedAbi);
        }
    });
});
