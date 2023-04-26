import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { BigNumberish, constants } from "ethers";
import hre, { ethers, waffle } from "hardhat";
import "module-alias/register";

import { FeeController, MockERC1155, PromissoryNote } from "../../src/types";
import { Timelock } from "../../src/types";
import { UniqueMultiplierVotingVault } from "../../src/types/contracts/UniqueMultiplierVotingVault.sol";
import { CoreVoting } from "../../src/types/contracts/external/council/CoreVoting";
import { MockERC20Council } from "../../src/types/contracts/external/council/mocks/MockERC20Council";
import { LockingVault } from "../../src/types/contracts/external/council/vaults/LockingVault.sol";
import { deploy } from "./contracts";

type Signer = SignerWithAddress;

export interface TestContextVotingVault {
    token: MockERC20Council;
    lockingVotingVault: LockingVault;
    uniqueMultiplierVotingVault: UniqueMultiplierVotingVault;
    arcadeGSCVotingVault: ArcadeGSCVotingVault;
    signers: Signer[];
    coreVoting: CoreVoting;
    arcadeGSCCoreVoting: ArcadeGSCCoreVoting;
    votingVaults: string[];
    timelock: Timelock;
    tokenAddress: string;
    increaseBlockNumber: (provider: any, times: number) => Promise<void>;
    getBlock: () => Promise<number>;
    advanceTime: (provider: any, time: number) => Promise<void>;
    reputationNft: MockERC1155;
    reputationNft2: MockERC1155;
    feeController: FeeController;
    mintNfts(): Promise<void>;
    setMultipliers(): Promise<Multipliers>;
    promissoryNote: PromissoryNote;
}

interface Multipliers {
    MULTIPLIER_A: BigNumberish;
    MULTIPLIER_B: BigNumberish;
}

/**
 * This fixture creates a coreVoting deployment with a timelock and lockingVault,
 * with the parameters for each.
 */
export const votingVaultFixture = async (): Promise<TestContextVotingVault> => {
    const signers: Signer[] = await ethers.getSigners();
    const votingVaults: string[] = [];
    const arcadeGSCVotingVaults: string[] = [];

    const { provider } = waffle;
    const [wallet] = provider.getWallets();

    // init vars
    const THREE = ethers.utils.parseEther("3");
    const SEVEN = ethers.utils.parseEther("7");

    // deploy the token
    const erc20Deployer = await ethers.getContractFactory("MockERC20Council", signers[0]);
    const token = await erc20Deployer.deploy("Arcade", "ARCD", signers[0].address);
    // update the token address for use in promissory vault deployment
    const tokenAddress: string = token.address;

    // deploy the timelock contract setting the wait time, its owner and GSC address
    const timelockDeployer = await ethers.getContractFactory("Timelock", signers[0]);
    const timelock = await timelockDeployer.deploy(1000, signers[0].address, constants.AddressZero);

    // deploy the voting vault contract
    const proxyDeployer = await ethers.getContractFactory("SimpleProxy", wallet);
    const lockingVotingVaultFactory = await ethers.getContractFactory("LockingVault", timelock);
    const lockingVotingVaultBase = await lockingVotingVaultFactory.deploy(token.address, 55); // use 199350 with fork of mainnet
    const lockingVotingVaultProxy = await proxyDeployer.deploy(signers[0].address, lockingVotingVaultBase.address);
    const lockingVotingVault = await lockingVotingVaultBase.attach(lockingVotingVaultProxy.address);

    const reputationNftFactory = await hre.ethers.getContractFactory("MockERC1155");
    const reputationNft = <MockERC1155>await reputationNftFactory.deploy("MockERC1155");
    await reputationNft.deployed();

    const reputationNft2 = <MockERC1155>await reputationNftFactory.deploy("MockERC1155");
    await reputationNft2.deployed();

    //deploy and initialize promissory voting vault
    const uniqueMultiplierVotingVaultFactory = await ethers.getContractFactory("UniqueMultiplierVotingVault", timelock);
    const uniqueMultiplierVotingVaultBase = await uniqueMultiplierVotingVaultFactory.deploy(tokenAddress, 55);
    const uniqueMultiplierVotingVaultProxy = await proxyDeployer.deploy(
        timelock.address,
        uniqueMultiplierVotingVaultBase.address,
    );
    const uniqueMultiplierVotingVault = uniqueMultiplierVotingVaultBase.attach(
        uniqueMultiplierVotingVaultProxy.address,
    );
    await uniqueMultiplierVotingVault.initialize(
        signers[0].address, // timelock address who can update the manager
        signers[0].address, // manager address who can update unique multiplier values
    );

    // push voting vaults into the votingVaults array which is
    // used as an argument in coreVoting's deployment
    votingVaults.push(uniqueMultiplierVotingVault.address, lockingVotingVault.address);

    // give users some balance and set their allowance
    for (const signer of signers) {
        await token.setBalance(signer.address, ethers.utils.parseEther("100000"));
        await token.setAllowance(signer.address, lockingVotingVault.address, ethers.constants.MaxUint256);
    }

    const coreVotingDeployer = await ethers.getContractFactory("CoreVoting", signers[0]);
    // setup coreVoting with parameters as follows:
    // for initial testing purposes, we are setting the default quorum to 7
    // min voting power needed for propoasal submission is set to 3
    // GSC contract address is set to zero - GSC not used
    // array of voting vaults which will be used in coreVoting
    const coreVoting = await coreVotingDeployer.deploy(
        signers[0].address, // deployer address at first, then ownership set to timelock contract
        SEVEN, // base quorum / default quorum
        THREE, // min voting power needed to submit a proposal
        ethers.constants.AddressZero, // GSC contract address
        votingVaults, // voting vaults array
    );

    // approve the voting vaults for the votingVaults array
    await coreVoting.changeVaultStatus(uniqueMultiplierVotingVault.address, true);

    // grant roles and update ownership
    await coreVoting.connect(signers[0]).setOwner(timelock.address); // timelock owns coreVoting
    await timelock.connect(signers[0]).deauthorize(signers[0].address); // timelock revokes deployer ownership
    await timelock.connect(signers[0]).setOwner(coreVoting.address); // coreVoting is set as owner of timelock

    const arcadeGSCCoreVoting = await coreVotingDeployer.deploy(
        signers[0].address, // deployer address at first, then ownership set to timelock contract
        3, // quorum
        1, // voting power needed to submit a proposal
        ethers.constants.AddressZero, // GSC contract address when it's deployed
        arcadeGSCVotingVaults, // gsc voting vault array (the vaults where GSC members voting power is held)
    );

    // Deploy the GSC Voting Vault
    const gscVotingVaultFactory = await ethers.getContractFactory("ArcadeGSCVotingVault", signers[0]);
    const arcadeGSCVotingVault = await gscVotingVaultFactory.deploy(
        coreVoting.address, // the core voting contract
        50, // amount of voting power needed to be on the GSC (using 50 for ease of testing. Council GSC on Mainnet requires 110,000)
        timelock.address, // owner of the GSC voting vault contract: the timelock contract
    );

    // approve the voting vaults for the gsc voting vault array
    await arcadeGSCCoreVoting.changeVaultStatus(arcadeGSCVotingVault.address, true);

    // deploy feeController for voting vault testing
    const feeController = <FeeController>await deploy("FeeController", signers[0], []);
    await feeController.deployed();
    // set FeeController admin to be set to CoreVoting.sol
    const updateFeeControllerAdmin = await feeController.transferOwnership(coreVoting.address);
    await updateFeeControllerAdmin.wait();

    // deploy Promissory note for GSC voting vault testing
    const pNoteName = "Arcade.xyz PromissoryNote";
    const pNoteSymbol = "PN";
    const promissoryNote = <PromissoryNote>await deploy("PromissoryNote", signers[0], [pNoteName, pNoteSymbol]);
    // grant admin access to GSC core voting
    await promissoryNote.initialize(arcadeGSCCoreVoting.address);

    // ================================== HELPER FUNCTIONS ==============================================

    const getBlock = async () => {
        const latestBlock: number = (await ethers.provider.getBlock("latest")).number;
        return latestBlock;
    };

    const increaseBlockNumber = async (provider: any, times: number) => {
        for (let i = 0; i < times; i++) {
            await provider.send("evm_mine", []);
        }
    };

    const advanceTime = async (provider: any, time: number) => {
        await provider.send("evm_increaseTime", [time]);
        await provider.send("evm_mine", []);
    };

    // mint users some reputation nfts
    const mintNfts = async () => {
        const id = 1;
        for (let i = 0; i < signers.length; i++) {
            await reputationNft.mint(`${signers[i].address}`, id, 1);
            await reputationNft2.mint(`${signers[i].address}`, id, 1);
        }
    };

    const setMultipliers = async (): Promise<Multipliers> => {
        // manager sets the value of the reputation NFT multiplier
        const txA = await uniqueMultiplierVotingVault
            .connect(signers[0])
            .setMultiplier(reputationNft.address, 1, ethers.utils.parseEther("1.2"));
        const receiptA = await txA.wait();

        // get votingPower multiplier A
        let MULTIPLIER_A;
        if (receiptA && receiptA.events) {
            const userMultiplier = new ethers.utils.Interface([
                "event MultiplierSet(address tokenAddress, uint128 tokenId, uint128 multiplier)",
            ]);
            const log = userMultiplier.parseLog(receiptA.events[receiptA.events.length - 1]);
            MULTIPLIER_A = log.args.multiplier;
        } else {
            throw new Error("Multiplier not set");
        }

        // manager sets the value of the reputation NFT 2's multiplier
        const txB = await uniqueMultiplierVotingVault
            .connect(signers[0])
            .setMultiplier(reputationNft2.address, 1, ethers.utils.parseEther("1.4"));
        const receiptB = await txB.wait();

        // get votingPower multiplier B
        let MULTIPLIER_B;
        if (receiptB && receiptB.events) {
            const userMultiplier = new ethers.utils.Interface([
                "event MultiplierSet(address tokenAddress, uint128 tokenId, uint128 multiplier)",
            ]);
            const log = userMultiplier.parseLog(receiptB.events[receiptB.events.length - 1]);
            MULTIPLIER_B = log.args.multiplier;
        } else {
            throw new Error("Multiplier not set");
        }

        return {
            MULTIPLIER_A,
            MULTIPLIER_B,
        };
    };

    return {
        signers,
        lockingVotingVault,
        uniqueMultiplierVotingVault,
        token,
        feeController,
        coreVoting,
        arcadeGSCCoreVoting,
        votingVaults,
        arcadeGSCVotingVault,
        timelock,
        increaseBlockNumber,
        getBlock,
        tokenAddress,
        mintNfts,
        setMultipliers,
        reputationNft,
        reputationNft2,
        advanceTime,
        promissoryNote,
    };
};
