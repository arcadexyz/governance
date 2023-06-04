import assert from "assert";
import { expect } from "chai";
import { execSync } from "child_process";
import { ethers } from "hardhat";

import {
    ARCDVestingVault,
    ArcadeGSCCoreVoting,
    ArcadeGSCVault,
    ArcadeToken,
    ArcadeTokenDistributor,
    CoreVoting,
    ImmutableVestingVault,
    NFTBoostVault,
    Timelock,
} from "../../../typechain";
import {
    ADD_APPROVAL,
    ADD_APPROVAL_QUORUM,
    ADD_CALL,
    ADD_CALL_QUORUM,
    CALL_WHITELIST_ADDR,
    CALL_WHITELIST_APPROVALS_ADDR,
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
    SET_ALLOWED_VERIFIER,
    SET_ALLOWED_VERIFIER_BATCH,
    SET_ALLOWED_VERIFIER_BATCH_QUORUM,
    SET_ALLOWED_VERIFIER_QUORUM,
    SET_FEE_CONTROLLER,
    SET_FEE_CONTROLLER_QUORUM,
    SET_MINTER,
    SET_MINTER_QUORUM,
} from "../custom-quorum-params";
import {
    BASE_QUORUM,
    BASE_QUORUM_GSC,
    DEPLOYER_ADDRESS,
    GSC_THRESHOLD,
    MIN_PROPOSAL_POWER_CORE_VOTING,
    MIN_PROPOSAL_POWER_GSC,
    STALE_BLOCK_LAG,
    TEAM_VESTING_VAULT_MANAGER,
} from "../deployment-params";
import { NETWORK, getLatestDeployment, getLatestDeploymentFile, getVerifiedABI } from "./utils";

/**
 * Note: Against normal conventions, these tests are interdependent and meant
 * to run sequentially. Each subsequent test relies on the state of the previous.
 *
 * To run these this script use:
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

        expect(deployment["CoreVoting"]).to.exist;
        expect(deployment["CoreVoting"].contractAddress).to.exist;
        expect(deployment["CoreVoting"].constructorArgs.length).to.eq(5);

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
    });

    it("correctly sets up all roles and permissions", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            execSync(`HARDHAT_NETWORK=${NETWORK} ts-node scripts/deploy/setup.ts ${filename}`, { stdio: "inherit" });
        }

        // load deployed contracts
        const arcadeTokenDistributor = <ArcadeTokenDistributor>(
            await ethers.getContractAt("ArcadeTokenDistributor", deployment["ArcadeTokenDistributor"].contractAddress)
        );
        const arcadeToken = <ArcadeToken>(
            await ethers.getContractAt("ArcadeToken", deployment["ArcadeToken"].contractAddress)
        );
        const coreVoting = <CoreVoting>(
            await ethers.getContractAt("CoreVoting", deployment["CoreVoting"].contractAddress)
        );
        const arcadeGSCCoreVoting = <ArcadeGSCCoreVoting>(
            await ethers.getContractAt("ArcadeGSCCoreVoting", deployment["ArcadeGSCCoreVoting"].contractAddress)
        );
        const timelock = <Timelock>await ethers.getContractAt("Timelock", deployment["Timelock"].contractAddress);
        const teamVestingVault = <ARCDVestingVault>(
            await ethers.getContractAt("ARCDVestingVault", deployment["ARCDVestingVault"].contractAddress)
        );
        const partnerVestingVault = <ImmutableVestingVault>(
            await ethers.getContractAt("ImmutableVestingVault", deployment["ImmutableVestingVault"].contractAddress)
        );
        const nftBoostVault = <NFTBoostVault>(
            await ethers.getContractAt("NFTBoostVault", deployment["NFTBoostVault"].contractAddress)
        );
        const arcadeGSCVault = <ArcadeGSCVault>(
            await ethers.getContractAt("ArcadeGSCVault", deployment["ArcadeGSCVault"].contractAddress)
        );

        // ArcadeToken has the correct minter address
        expect(await arcadeToken.minter()).to.equal(deployment["CoreVoting"].contractAddress);

        // Make sure ArcadeTokenDistributor has the correct token for distribution set
        expect(await arcadeTokenDistributor.arcadeToken()).to.equal(deployment["ArcadeToken"].contractAddress);

        // make sure the nftBoostVault has the correct airdrop contract set
        expect(await nftBoostVault.getAirdropContract()).to.equal(deployment["ArcadeAirdrop"].contractAddress);

        // Make sure CoreVoting has the correct state after deployment
        expect(await coreVoting.owner()).to.equal(timelock.address);
        expect(await coreVoting.baseQuorum()).to.equal(BASE_QUORUM);
        expect(await coreVoting.minProposalPower()).to.equal(MIN_PROPOSAL_POWER_CORE_VOTING);
        expect(await coreVoting.authorized(arcadeGSCVault.address)).to.equal(true);

        // verify correct voting vaults
        expect(await coreVoting.approvedVaults(teamVestingVault.address)).to.equal(true);
        expect(await coreVoting.approvedVaults(partnerVestingVault.address)).to.equal(true);
        expect(await coreVoting.approvedVaults(nftBoostVault.address)).to.equal(true);
        expect(await arcadeGSCCoreVoting.approvedVaults(arcadeGSCVault.address)).to.equal(true);

        // Make sure CoreVotingGSC has the correct state after deployment
        expect(await arcadeGSCCoreVoting.owner()).to.equal(timelock.address);
        expect(await arcadeGSCCoreVoting.baseQuorum()).to.equal(BASE_QUORUM_GSC);
        expect(await arcadeGSCCoreVoting.minProposalPower()).to.equal(MIN_PROPOSAL_POWER_GSC);

        // Make sure Timelock has the correct admin and pending admin
        expect(await timelock.owner()).to.equal(coreVoting.address);
        expect(await timelock.authorized(arcadeGSCCoreVoting.address)).to.equal(true);

        // verify GSC Vault has the correct state after deployment
        expect(await arcadeGSCVault.owner()).to.equal(timelock.address);
        expect(await arcadeGSCVault.coreVoting()).to.equal(coreVoting.address);
        expect(await arcadeGSCVault.votingPowerBound()).to.equal(GSC_THRESHOLD);

        // verify custom quorums
        expect(await coreVoting.quorums(deployment["ArcadeToken"].contractAddress, SET_MINTER)).to.equal(
            SET_MINTER_QUORUM,
        );
        expect(await coreVoting.quorums(deployment["ArcadeToken"].contractAddress, MINT_TOKENS)).to.equal(
            MINT_TOKENS_QUORUM,
        );
        expect(await coreVoting.quorums(deployment["ArcadeTreasury"].contractAddress, MEDIUM_SPEND)).to.equal(
            MEDIUM_SPEND_QUORUM,
        );
        expect(await coreVoting.quorums(deployment["ArcadeTreasury"].contractAddress, LARGE_SPEND)).to.equal(
            LARGE_SPEND_QUORUM,
        );
        expect(await coreVoting.quorums(CALL_WHITELIST_ADDR, ADD_CALL)).to.equal(ADD_CALL_QUORUM);
        expect(await coreVoting.quorums(CALL_WHITELIST_APPROVALS_ADDR, ADD_APPROVAL)).to.equal(ADD_APPROVAL_QUORUM);
        expect(await coreVoting.quorums(ORIGINATION_CONTROLLER_ADDR, SET_ALLOWED_VERIFIER)).to.equal(
            SET_ALLOWED_VERIFIER_QUORUM,
        );
        expect(await coreVoting.quorums(ORIGINATION_CONTROLLER_ADDR, SET_ALLOWED_VERIFIER_BATCH)).to.equal(
            SET_ALLOWED_VERIFIER_BATCH_QUORUM,
        );
        expect(await coreVoting.quorums(ORIGINATION_CONTROLLER_ADDR, SET_ALLOWED_PAYABLE_CURRENCIES)).to.equal(
            SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM,
        );
        expect(await coreVoting.quorums(LOAN_CORE_ADDR, PAUSE)).to.equal(PAUSE_QUORUM);
        expect(await coreVoting.quorums(LOAN_CORE_ADDR, SET_FEE_CONTROLLER)).to.equal(SET_FEE_CONTROLLER_QUORUM);
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

            if (contractName.includes("ArcadeGSCCoreVoting")) contractName = "CoreVoting";
            if (contractName.includes("ArcadeGSCVault")) contractName = "GSCVault";

            const artifact = await artifacts.readArtifact(contractName);

            const implAddress = contractData.contractAddress;

            const verifiedAbi = await getVerifiedABI(implAddress);
            expect(artifact.abi).to.deep.equal(verifiedAbi);
        }
    });
});
