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
    ImmutableVestingVault,
    NFTBoostVault,
    ReputationBadge,
    Timelock,
} from "../../../src/types";
import {
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
    SET_ALLOWED_VERIFIERS,
    SET_ALLOWED_VERIFIERS_QUORUM,
    SET_MINTER,
    SET_MINTER_QUORUM,
} from "../custom-quorum-params";
import {
    ADMIN_ADDRESS,
    AIRDROP_EXPIRATION,
    AIRDROP_MERKLE_ROOT,
    GSC_MIN_LOCK_DURATION,
    REPUTATION_BADGE_MANAGER,
    REPUTATION_BADGE_RESOURCE_MANAGER,
} from "../deployment-params";
import { NETWORK, getLatestDeployment, getLatestDeploymentFile, getVerifiedABI } from "./utils";

/**
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
            // Deploy everything, via command-line
            console.log(); // whitespace
            execSync(`npx hardhat --network ${NETWORK} run scripts/deploy/deploy.ts`, { stdio: "inherit" });
        }

        // Make sure JSON file exists
        const deployment = getLatestDeployment();

        // Make sure deployment artifacts has all the correct contracts specified
        expect(deployment["ArcadeTokenDistributor"]).to.exist;
        expect(deployment["ArcadeTokenDistributor"].contractAddress).to.exist;
        expect(deployment["ArcadeTokenDistributor"].constructorArgs.length).to.eq(0);

        expect(deployment["ArcadeToken"]).to.exist;
        expect(deployment["ArcadeToken"].contractAddress).to.exist;
        expect(deployment["ArcadeToken"].constructorArgs.length).to.eq(2);

        expect(deployment["ArcadeCoreVoting"]).to.exist;
        expect(deployment["ArcadeCoreVoting"].contractAddress).to.exist;
        expect(deployment["ArcadeCoreVoting"].constructorArgs.length).to.eq(6);

        expect(deployment["ArcadeGSCCoreVoting"]).to.exist;
        expect(deployment["ArcadeGSCCoreVoting"].contractAddress).to.exist;
        expect(deployment["ArcadeGSCCoreVoting"].constructorArgs.length).to.eq(5);

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

        expect(deployment["ArcadeGSCVault"]).to.exist;
        expect(deployment["ArcadeGSCVault"].contractAddress).to.exist;
        expect(deployment["ArcadeGSCVault"].constructorArgs.length).to.eq(3);

        expect(deployment["ArcadeTreasury"]).to.exist;
        expect(deployment["ArcadeTreasury"].contractAddress).to.exist;
        expect(deployment["ArcadeTreasury"].constructorArgs.length).to.eq(1);

        expect(deployment["ArcadeAirdrop"]).to.exist;
        expect(deployment["ArcadeAirdrop"].contractAddress).to.exist;
        expect(deployment["ArcadeAirdrop"].constructorArgs.length).to.eq(5);

        expect(deployment["BadgeDescriptor"]).to.exist;
        expect(deployment["BadgeDescriptor"].contractAddress).to.exist;
        expect(deployment["BadgeDescriptor"].constructorArgs.length).to.eq(1);

        expect(deployment["ReputationBadge"]).to.exist;
        expect(deployment["ReputationBadge"].contractAddress).to.exist;
        expect(deployment["ReputationBadge"].constructorArgs.length).to.eq(2);
    });

    it("correctly sets up all roles and permissions", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (!ADMIN_ADDRESS) {
            throw new Error("did not get admin address!");
        } else {
            console.log("Admin:", ADMIN_ADDRESS);
        }

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            execSync(`HARDHAT_NETWORK=${NETWORK} ts-node scripts/deploy/setup.ts ${filename}`, { stdio: "inherit" });
        }

        /**
         * Verify all the governance setup transactions were executed properly
         */
        console.log("Verifying governance setup...");

        const arcadeTokenDistributor = <ArcadeTokenDistributor>(
            await ethers.getContractAt("ArcadeTokenDistributor", deployment["ArcadeTokenDistributor"].contractAddress)
        );
        const arcadeToken = <ArcadeToken>(
            await ethers.getContractAt("ArcadeToken", deployment["ArcadeToken"].contractAddress)
        );
        const arcadeCoreVoting = <ArcadeCoreVoting>(
            await ethers.getContractAt("ArcadeCoreVoting", deployment["ArcadeCoreVoting"].contractAddress)
        );
        const arcadeGSCCoreVoting = <ArcadeGSCCoreVoting>(
            await ethers.getContractAt("ArcadeGSCCoreVoting", deployment["ArcadeGSCCoreVoting"].contractAddress)
        );
        const timelock = <Timelock>await ethers.getContractAt("Timelock", deployment["Timelock"].contractAddress);
        const nftBoostVault = <NFTBoostVault>(
            await ethers.getContractAt("NFTBoostVault", deployment["NFTBoostVault"].contractAddress)
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

        // ArcadeAirdrop
        expect(await arcadeAirdrop.rewardsRoot()).to.equal(AIRDROP_MERKLE_ROOT);
        expect(await arcadeAirdrop.expiration()).to.equal(AIRDROP_EXPIRATION);

        // NFTBoostVault
        expect(await nftBoostVault.getAirdropContract()).to.equal(arcadeAirdrop.address);

        // ArcadeGSCVault
        expect(await arcadeTokenDistributor.arcadeToken()).to.equal(arcadeToken.address);

        // ArcadeToken
        expect(await arcadeToken.minter()).to.equal(arcadeCoreVoting.address);
        expect(await arcadeToken.balanceOf(arcadeTokenDistributor.address)).to.equal(
            ethers.utils.parseEther("100000000"),
        );

        // ArcadeTokenDistributor
        expect(await arcadeTokenDistributor.arcadeToken()).to.equal(arcadeToken.address);

        // GSCCoreVoting minimum lock duration
        expect(await arcadeGSCCoreVoting.lockDuration()).to.equal(GSC_MIN_LOCK_DURATION);

        // ArcadeCoreVoting custom quorums
        expect(await arcadeCoreVoting.quorums(arcadeToken.address, MINT_TOKENS)).to.equal(MINT_TOKENS_QUORUM);
        expect(await arcadeCoreVoting.quorums(arcadeToken.address, SET_MINTER)).to.equal(SET_MINTER_QUORUM);
        expect(await arcadeCoreVoting.quorums(arcadeTreasury.address, MEDIUM_SPEND)).to.equal(MEDIUM_SPEND_QUORUM);
        expect(await arcadeCoreVoting.quorums(arcadeTreasury.address, LARGE_SPEND)).to.equal(LARGE_SPEND_QUORUM);
        expect(await arcadeCoreVoting.quorums(ORIGINATION_CONTROLLER_ADDR, SET_ALLOWED_VERIFIERS)).to.equal(
            SET_ALLOWED_VERIFIERS_QUORUM,
        );
        expect(await arcadeCoreVoting.quorums(ORIGINATION_CONTROLLER_ADDR, SET_ALLOWED_PAYABLE_CURRENCIES)).to.equal(
            SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM,
        );

        // ArcadeGSCCoreVoting custom quorums
        expect(await arcadeGSCCoreVoting.quorums(LOAN_CORE_ADDR, PAUSE)).to.equal(PAUSE_QUORUM);

        // CoreVoting authorized address
        expect(await arcadeCoreVoting.authorized(ADMIN_ADDRESS)).to.equal(false);
        expect(await arcadeCoreVoting.authorized(arcadeGSCCoreVoting.address)).to.equal(true);

        // CoreVoting owner
        expect(await arcadeCoreVoting.owner()).to.equal(timelock.address);

        // Timelock owner
        expect(await timelock.owner()).to.equal(arcadeCoreVoting.address);

        // Timelock authorized address
        expect(await timelock.authorized(ADMIN_ADDRESS)).to.equal(false);
        expect(await timelock.authorized(arcadeGSCCoreVoting.address)).to.equal(true);

        // ArcadeGSCCoreVoting owner
        expect(await arcadeGSCCoreVoting.owner()).to.equal(timelock.address);

        // ArcadeTreasury GSC_CORE_VOTING_ROLE
        expect(
            await arcadeTreasury.hasRole(await arcadeTreasury.GSC_CORE_VOTING_ROLE(), arcadeGSCCoreVoting.address),
        ).to.equal(true);

        // ArcadeTreasury CORE_VOTING_ROLE
        expect(
            await arcadeTreasury.hasRole(await arcadeTreasury.CORE_VOTING_ROLE(), arcadeCoreVoting.address),
        ).to.equal(true);

        // ArcadeTreasury ADMIN_ROLE
        expect(await arcadeTreasury.hasRole(await arcadeTreasury.ADMIN_ROLE(), timelock.address)).to.equal(true);

        // ArcadeTreasury ADMIN_ROLE was renounced by deployer
        expect(await arcadeTreasury.hasRole(await arcadeTreasury.ADMIN_ROLE(), ADMIN_ADDRESS)).to.equal(false);

        // ReputationBadge BADGE_MANAGER_ROLE
        expect(
            await reputationBadge.hasRole(await reputationBadge.BADGE_MANAGER_ROLE(), REPUTATION_BADGE_MANAGER),
        ).to.equal(true);

        // ReputationBadge RESOURCE_MANAGER_ROLE
        expect(
            await reputationBadge.hasRole(
                await reputationBadge.RESOURCE_MANAGER_ROLE(),
                REPUTATION_BADGE_RESOURCE_MANAGER,
            ),
        ).to.equal(true);

        // ReputationBadge ADMIN_ROLE
        expect(await reputationBadge.hasRole(await reputationBadge.ADMIN_ROLE(), timelock.address)).to.equal(true);

        // ReputationBadge ADMIN_ROLE was renounced by deployer
        expect(await reputationBadge.hasRole(await reputationBadge.ADMIN_ROLE(), ADMIN_ADDRESS)).to.equal(false);
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
