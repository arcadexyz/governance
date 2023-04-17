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

/**
 * Note: Against normal conventions, these tests are interdependent and meant
 * to run sequentially. Each subsequent test relies on the state of the previous.
 */
console.log("NETWORK:", NETWORK)
assert(NETWORK !== "hardhat", "Must use a long-lived network!");

describe("Deployment", function() {
    this.timeout(0);
    this.bail();

    it.only("deploys contracts and creates deployment artifacts", async () => {
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

        expect(deployment["FrozenLockingVaultImp"]).to.exist;
        expect(deployment["FrozenLockingVaultImp"].contractAddress).to.exist;
        expect(deployment["FrozenLockingVaultImp"].constructorArgs.length).to.eq(2);

        expect(deployment["SimpleProxy"]).to.exist;
        expect(deployment["SimpleProxy"].contractAddress).to.exist;
        expect(deployment["SimpleProxy"].constructorArgs.length).to.eq(2);

        expect(deployment["GSCVault"]).to.exist;
        expect(deployment["GSCVault"].contractAddress).to.exist;
        expect(deployment["GSCVault"].constructorArgs.length).to.eq(3);

        expect(deployment["Treasury"]).to.exist;
        expect(deployment["Treasury"].contractAddress).to.exist;
        expect(deployment["Treasury"].constructorArgs.length).to.eq(3);
    });

    it("correctly sets up all roles and permissions", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            execSync(`HARDHAT_NETWORK=${NETWORK} ts-node scripts/deploy/setup.ts ${filename}`, { stdio: 'inherit' });
        }

        // Make sure ArcadeTokenDistributor has the correct token set initialized correctly
        const ARCDDist = await ethers.getContractFactory("ArcadeTokenDistributor");
        const arcDst = <ArcadeTokenDistributor>await ARCDDist.attach(deployment["ArcadeTokenDistributor"].contractAddress);

        expect(await arcDst.arcadeToken()).to.equal(arcToken.address);

        // Make sure ArcadeToken has the correct minter and distributor
        const ARCDToken = await ethers.getContractFactory("ArcadeToken");
        const arcToken = <ArcadeToken>await ARCDToken.attach(deployment["ArcadeToken"].contractAddress);

        expect(await arcToken.minter()).to.equal(DEPLOYER_ADDRESS);
        expect(await arcToken.distributor()).to.equal(deployment["ArcadeTokenDistributor"].contractAddress);
    });

    it("verifies all contracts on the proper network", async () => {
        const filename = getLatestDeploymentFile();
        const deployment = getLatestDeployment();

        if (process.env.EXEC) {
            // Run setup, via command-line
            console.log(); // whitespace
            execSync(`HARDHAT_NETWORK=${NETWORK} ts-node scripts/deploy/verify-contracts.ts ${filename}`, { stdio: 'inherit' });
        }

        const proxyArtifact = await artifacts.readArtifact("ERC1967Proxy");

        // For each contract - compare verified ABI against artifact ABI
        for (let contractName of Object.keys(deployment)) {
            const contractData = deployment[contractName];

            if (contractName.includes("Note")) contractName = "PromissoryNote";
            const artifact = await artifacts.readArtifact(contractName);

            const implAddress = contractData.contractImplementationAddress || contractData.contractAddress;

            const verifiedAbi = await getVerifiedABI(implAddress);
            expect(artifact.abi).to.deep.equal(verifiedAbi);

            if (contractData.contractImplementationAddress) {
                // Also verify the proxy
                const verifiedProxyAbi = await getVerifiedABI(contractData.contractAddress);
                expect(verifiedProxyAbi).to.deep.equal(proxyArtifact.abi);
            }
        }
    });
});