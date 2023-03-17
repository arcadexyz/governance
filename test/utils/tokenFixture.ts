import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { BigNumber, Wallet } from "ethers";
import hre from "hardhat";
import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";

import { ArcadeAirdropper, ArcadeTokenDistributor, IArcadeToken } from "../../src/types";
import { deploy } from "./contracts";
import { BlockchainTime } from "./time";

type Signer = SignerWithAddress;

export interface TokenTestContext {
    deployer: Signer;
    other: Signer;
    treasury: Wallet;
    devPartner: Wallet;
    communityRewardsPool: Wallet;
    airdrop: Wallet;
    vestingTeamMultisig: Wallet;
    vestingPartner: Wallet;
    arcToken: IArcadeToken;
    arcDst: ArcadeTokenDistributor;
    airdrop: ArcadeAirdropper;
    blockchainTime: BlockchainTime;
    recipients: { address: string; value: string }[];
    merkleTrie: MerkleTree;
}

/**
 * Sets up the test context for the Arcade token, deploying the Arcade token and
 * the distribution contract and returning it for use in unit testing.
 */
export const tokenFixture = async (): Promise<TokenTestContext> => {
    // ======================================== ACCOUNTS ========================================
    const signers: Signer[] = await hre.ethers.getSigners();
    const deployer: Signer = signers[0];
    const other: Signer = signers[1];

    // mock recipients for distribution
    const treasury = new Wallet.createRandom();
    const devPartner = new Wallet.createRandom();
    const communityRewardsPool = new Wallet.createRandom();
    const vestingTeamMultisig = new Wallet.createRandom();
    const vestingPartner = new Wallet.createRandom();

    const blockchainTime = new BlockchainTime();

    // ==================================== TOKEN DEPLOYMENT ====================================

    // deploy the distribution contract
    const arcDst = <ArcadeTokenDistributor>await deploy("ArcadeTokenDistributor", signers[0], []);
    await arcDst.deployed();

    // deploy the Arcade token, with minter role set to the distribution contract
    const arcToken = <ArcadeToken>await deploy("ArcadeToken", signers[0], [deployer.address, arcDst.address]);
    await arcToken.deployed();

    // deployer sets token in the distribution contract
    await arcDst.connect(deployer).setToken(arcToken.address);
    expect(await arcDst.arcadeToken()).to.equal(arcToken.address);

    // ====================================== AIRDROP SETUP =====================================

    // create data for airdrop claims
    const recipients = [
        {
            address: deployer.address,
            value: ethers.utils.parseEther("100"),
        },
        {
            address: other.address,
            value: ethers.utils.parseEther("100"),
        },
    ];

    // hash leaves
    const leaves = recipients.map(recipient => {
        return Buffer.from(
            ethers.utils.solidityKeccak256(["address", "uint256"], [recipient.address, recipient.value]).slice(2),
            "hex",
        );
    });

    // create merkle trie
    const merkleTrie = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const root = merkleTrie.getHexRoot();

    // reclaiming delay for contract owner
    const reclaimDelay = BigNumber.from(3600);

    // deploy merkleVerifier library
    const MerkleVerifier = await hre.ethers.getContractFactory("MerkleVerifier");
    const merkleVerifier = await MerkleVerifier.deploy();

    // deploy airdrop contract
    const Airdrop = await hre.ethers.getContractFactory("ArcadeAirdropper", {
        libraries: {
            MerkleVerifier: merkleVerifier.address,
        },
    });
    const airdrop = await Airdrop.deploy(arcToken.address, root, reclaimDelay);

    return {
        deployer,
        other,
        treasury,
        devPartner,
        communityRewardsPool,
        airdrop,
        vestingTeamMultisig,
        vestingPartner,
        arcToken,
        arcDst,
        blockchainTime,
        recipients,
        merkleTrie,
    };
};
