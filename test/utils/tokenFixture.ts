import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { Wallet } from "ethers";
import hre from "hardhat";
import { MerkleTree } from "merkletreejs";

import { Airdrop, ArcadeTokenDistributor, IArcadeToken, LockingVault, SimpleProxy } from "../../src/types";
import { deploy } from "./contracts";
import { Account, getMerkleTree } from "./external/council/helpers/merkle";
import { BlockchainTime } from "./time";

type Signer = SignerWithAddress;

export interface TokenTestContext {
    // airdrop recipients
    deployer: Signer;
    other: Signer;
    // initial distribution recipients
    treasury: Wallet;
    devPartner: Wallet;
    communityRewardsPool: Wallet;
    vestingTeamMultisig: Wallet;
    vestingPartner: Wallet;
    arcAirdrop: Airdrop;
    // contracts
    arcdToken: IArcadeToken;
    arcdDst: ArcadeTokenDistributor;
    // vault contract
    simpleProxy: SimpleProxy;
    frozenLockingVault: LockingVault;
    // test helpers
    recipients: Account;
    blockchainTime: BlockchainTime;
    merkleTrie: MerkleTree;
    expiration: number;
    staleBlockNum: number;
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
    const arcdDst = <ArcadeTokenDistributor>await deploy("ArcadeTokenDistributor", signers[0], []);
    await arcdDst.deployed();

    // deploy the Arcade token, with minter role set to the distribution contract
    const arcdToken = <ArcadeToken>await deploy("ArcadeToken", signers[0], [deployer.address, arcdDst.address]);
    await arcdToken.deployed();

    // deployer sets token in the distribution contract
    await arcdDst.connect(deployer).setToken(arcdToken.address);
    expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

    // ================================= AIRDROP VAULT DEPLOYMENT ==============================

    const staleBlock = await ethers.provider.getBlock("latest");
    const staleBlockNum = staleBlock.number;

    // deploy FrozenLockingVault via proxy
    const simpleProxyFactory = await ethers.getContractFactory("SimpleProxy");
    const frozenLockingVaultFactory = await ethers.getContractFactory("FrozenLockingVault");
    const frozenLockingVaultImp = await frozenLockingVaultFactory.deploy(arcdToken.address, staleBlockNum);
    const simpleProxy = await simpleProxyFactory.deploy(signers[0].address, frozenLockingVaultImp.address);

    const frozenLockingVault = await frozenLockingVaultImp.attach(simpleProxy.address);

    await expect(await simpleProxy.proxyImplementation()).to.equal(frozenLockingVaultImp.address);

    // ====================================== AIRDROP SETUP =====================================

    // airdrop claims data
    const recipients: Account = [
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
    const merkleTrie = await getMerkleTree(recipients);
    const root = merkleTrie.getHexRoot();

    // airdrop claim expiration is current unix stamp + 1 hour in seconds
    const expiration = await blockchainTime.secondsFromNow(3600);

    // =================================== AIRDROP DEPLOYMENT ==================================

    // deploy airdrop contract
    const ArcAirdrop = await hre.ethers.getContractFactory("ArcadeAirdrop");
    const arcAirdrop = await ArcAirdrop.deploy(
        signers[0].address, // in production this is to be the governance timelock address
        root,
        arcdToken.address,
        expiration,
        frozenLockingVault.address,
    );
    await arcAirdrop.deployed();

    return {
        deployer,
        other,
        treasury,
        devPartner,
        communityRewardsPool,
        vestingTeamMultisig,
        vestingPartner,
        arcAirdrop,
        arcdToken,
        arcdDst,
        simpleProxy,
        frozenLockingVault,
        recipients,
        blockchainTime,
        merkleTrie,
        expiration,
        staleBlockNum,
    };
};
