import { execSync } from "child_process";
import { expect } from "chai";
import { ethers, artifacts } from "hardhat";
import assert from "assert";

import {
    NETWORK,
    getLatestDeploymentFile,
    getLatestDeployment,
    getVerifiedABI
} from "./utils";

import {
    ArcadeToken,
    ArcadeTokenDistributor,
    Timelock,
    CoreVoting,
    SimpleProxy,
    FrozenLockingVault,
} from "../../../typechain";

import {
    BASE_QUORUM,
    MIN_PROPOSAL_POWER,
    BASE_QUORUM_GSC,
    MIN_PROPOSAL_POWER_GSC,
    GSC_THRESHOLD,
    STALE_BLOCK_LAG
} from "../deployment-params";

/**
 * Note: Against normal conventions, these tests are interdependent and meant
 * to run sequentially. Each subsequent test relies on the state of the previous.
 */
// assert(NETWORK !== "hardhat", "Must use a long-lived network!");

describe("Deployment", function() {
    this.timeout(0);
    this.bail();

    it("deploys contracts and creates deployment artifacts", async () => {
        if (process.env.EXEC) {
            // Deploy everything, via command-line
            console.log(); // whitespace
            execSync(`npx hardhat --network ${NETWORK} run scripts/deploy/deploy.ts`, { stdio: 'inherit' });
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

        expect(deployment["CoreVotingGSC"]).to.exist;
        expect(deployment["CoreVotingGSC"].contractAddress).to.exist;
        expect(deployment["CoreVotingGSC"].constructorArgs.length).to.eq(5);

        expect(deployment["Timelock"]).to.exist;
        expect(deployment["Timelock"].contractAddress).to.exist;
        expect(deployment["Timelock"].constructorArgs.length).to.eq(3);

        expect(deployment["FrozenLockingVault"]).to.exist;
        expect(deployment["FrozenLockingVault"].contractAddress).to.exist;
        expect(deployment["FrozenLockingVault"].constructorArgs.length).to.eq(2);

        expect(deployment["FrozenLockingVaultProxy"]).to.exist;
        expect(deployment["FrozenLockingVaultProxy"].contractAddress).to.exist;
        expect(deployment["FrozenLockingVaultProxy"].constructorArgs.length).to.eq(2);

        expect(deployment["VestingVault"]).to.exist;
        expect(deployment["VestingVault"].contractAddress).to.exist;
        expect(deployment["VestingVault"].constructorArgs.length).to.eq(2);

        expect(deployment["VestingVaultProxy"]).to.exist;
        expect(deployment["VestingVaultProxy"].contractAddress).to.exist;
        expect(deployment["VestingVaultProxy"].constructorArgs.length).to.eq(2);

        expect(deployment["GSCVault"]).to.exist;
        expect(deployment["GSCVault"].contractAddress).to.exist;
        expect(deployment["GSCVault"].constructorArgs.length).to.eq(3);

        expect(deployment["Treasury"]).to.exist;
        expect(deployment["Treasury"].contractAddress).to.exist;
        expect(deployment["Treasury"].constructorArgs.length).to.eq(1);
    });

    it("correctly sets up all roles and permissions", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            execSync(`HARDHAT_NETWORK=${NETWORK} ts-node scripts/deploy/setup.ts ${filename}`, { stdio: 'inherit' });
        }

        // Make sure ArcadeTokenDistributor has the correct token for distribution set
        const ARCDDist = await ethers.getContractFactory("ArcadeTokenDistributor");
        const arcdDst = <ArcadeTokenDistributor>await ARCDDist.attach(deployment["ArcadeTokenDistributor"].contractAddress);
        expect(await arcdDst.arcadeToken()).to.equal(deployment["ArcadeToken"].contractAddress);

        // Make sure ArcadeToken has the correct minter and distributor
        const ARCDToken = await ethers.getContractFactory("ArcadeToken");
        const arcdToken = <ArcadeToken>await ARCDToken.attach(deployment["ArcadeToken"].contractAddress);
        const Timelock = await ethers.getContractFactory("Timelock");
        const timelock = <Timelock>await Timelock.attach(deployment["Timelock"].contractAddress);

        expect(await arcdToken.minter()).to.equal(timelock.address);
        expect(await arcdToken.distributor()).to.equal(deployment["ArcadeTokenDistributor"].contractAddress);

        // Make sure CoreVoting has the correct state after deployment
        const CVoting = await ethers.getContractFactory("CoreVoting");
        const cvoting = <CoreVoting>await CVoting.attach(deployment["CoreVoting"].contractAddress);
        const GSCVault = await ethers.getContractFactory("GSCVault");
        const gscVault = <GSCVault>await GSCVault.attach(deployment["GSCVault"].contractAddress);

        expect(await cvoting.owner()).to.equal(timelock.address);
        expect(await cvoting.baseQuorum()).to.equal(BASE_QUORUM);
        expect(await cvoting.minProposalPower()).to.equal(MIN_PROPOSAL_POWER);
        expect(await cvoting.authorized(gsc.address)).to.equal(true);

        expect(await cvoting.approvedVaults(gsc.address)).to.equal(true);
        expect(await cvoting.approvedVaults(frozenLockingVaultProxy.address)).to.equal(true);
        expect(await cvoting.approvedVaults(vestingVaultProxy.address)).to.equal(true);

        // Make sure CoreVotingGSC has the correct state after deployment
        const CVotingGSC = await ethers.getContractFactory("CoreVotingGSC");
        const cvotingGSC = <CoreVotingGSC>await CVotingGSC.attach(deployment["CoreVotingGSC"].contractAddress);

        expect(await cvotingGSC.owner()).to.equal(timelock.address);
        expect(await cvotingGSC.baseQuorum()).to.equal(BASE_QUORUM_GSC);
        expect(await cvotingGSC.minProposalPower()).to.equal(MIN_PROPOSAL_POWER_GSC);

        // Make sure Timelock has the correct admin and pending admin
        expect(await timelock.owner()).to.equal(cvoting.address);
        expect(await timelock.authorized(cvotingGSC)).to.equal(true);

        // verify GSC Vault has the correct state after deployment
        expect(await gscVault.owner()).to.equal(timelock.address);
        expect(await gscVault.coreVoting()).to.equal(cvoting.address);
        expect(await gscVault.votingPowerBound()).to.equal(GSC_THRESHOLD);

        // verify FrozenLockingVault has the correct state after deployment
        const FLV = await ethers.getContractFactory("FrozenLockingVault");
        const flv = await FLV.attach(deployment["FrozenLockingVaultProxy"].contractAddress);

        expect(await flv.token()).to.equal(arcdToken.address);
        expect(await flv.staleBlockLag()).to.equal(STALE_BLOCK_LAG);

        // verify VestingVault has the correct state after deployment
        const VV = await ethers.getContractFactory("VestingVault");
        const vv = await VV.attach(deployment["VestingVaultProxy"].contractAddress);

        expect(await vv.token()).to.equal(arcdToken.address);
        expect(await vv.staleBlockLag()).to.equal(STALE_BLOCK_LAG);
    });

    it.only("verifies all contracts on the proper network", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            execSync(`HARDHAT_NETWORK=${NETWORK} ts-node scripts/deploy/verify-contracts.ts ${filename}`, { stdio: 'inherit' });
        }

        const proxyArtifact = await artifacts.readArtifact("SimpleProxy");

        // For each contract - compare verified ABI against artifact ABI
        for (let contractName of Object.keys(deployment)) {
            const contractData = deployment[contractName];

            if (contractName.includes("CoreVoting")) contractName = "CoreVoting";
            if (contractName.includes("FrozenLockingVaultProxy")) contractName = "SimpleProxy";
            if (contractName.includes("VestingVaultProxy")) contractName = "SimpleProxy";
            const artifact = await artifacts.readArtifact(contractName);

            const implAddress = contractData.contractImplementationAddress || contractData.contractAddress;

            if (contractData.contractImplementationAddress) {
                // Also verify the proxy
                const verifiedProxyAbi = await getVerifiedABI(contractData.contractAddress);
                expect(verifiedProxyAbi).to.deep.equal(proxyArtifact.abi);
            }
            else {
                const verifiedAbi = await getVerifiedABI(implAddress);
                expect(artifact.abi).to.deep.equal(verifiedAbi);
            }
        }
    });
});