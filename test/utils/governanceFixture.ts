import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { BigNumberish, constants } from "ethers";
import { ethers } from "hardhat";

import { FeeController, MockERC1155, PromissoryNote } from "../../src/types";
import { Timelock } from "../../src/types";
import { ArcadeToken, CoreVoting, LockingVault, UniqueMultiplierVotingVault, VestingVault } from "../../src/types";
import { deploy } from "./contracts";

type Signer = SignerWithAddress;

export interface TestContextGovernance {
    signers: Signer[];
    lockingVotingVault: LockingVault;
    vestingVotingVault: VestingVault;
    uniqueMultiplierVotingVault: UniqueMultiplierVotingVault;
    arcadeGSCVotingVault: ArcadeGSCVotingVault;
    signers: Signer[];
    coreVoting: CoreVoting;
    arcadeGSCCoreVoting: ArcadeGSCCoreVoting;
    votingVaults: string[];
    timelock: Timelock;
    increaseBlockNumber: (provider: any, times: number) => Promise<void>;
    getBlock: () => Promise<number>;
    advanceTime: (provider: any, time: number) => Promise<void>;
    reputationNft: MockERC1155;
    reputationNft2: MockERC1155;
    feeController: FeeController;
    increaseBlockNumber: (provider: any, times: number) => Promise<void>;
    mintNfts(): Promise<void>;
    setMultipliers(): Promise<Multipliers>;
    promissoryNote: PromissoryNote;
}

interface Multipliers {
    MULTIPLIER_A: BigNumberish;
    MULTIPLIER_B: BigNumberish;
}

/**
 * This fixture creates an complete governance deployment. It deploys the following voting vaults: locking vault,
 * vesting vault, unique multiplier voting vault. Along with the core voting and timelock contracts used in voting.
 */
export const governanceFixture = async (arcdToken: ArcadeToken): Promise<TestContextGovernance> => {
    const signers: Signer[] = await ethers.getSigners();
    const votingVaults: string[] = [];
    const arcadeGSCVotingVaults: string[] = [];

    const staleBlock = await ethers.provider.getBlock("latest");
    const staleBlockNum = staleBlock.number;

    // deploy locking vault
    const lockingVotingVault = <LockingVault>(
        await deploy("LockingVault", signers[0], [arcdToken.address, staleBlockNum])
    );
    await lockingVotingVault.deployed();

    // deploy and initialize vesting vault with signers[1] as the manager and signers[2] as the owner
    const vestingVotingVault = <VestingVault>(
        await deploy("ARCDVestingVault", signers[0], [arcdToken.address, staleBlockNum])
    );
    await vestingVotingVault.deployed();
    await vestingVotingVault.initialize(signers[1].address, signers[2].address);

    // deploy and initialize unique multiplier voting vault
    const uniqueMultiplierVotingVault = <UniqueMultiplierVotingVault>(
        await deploy("UniqueMultiplierVotingVault", signers[0], [arcdToken.address, staleBlockNum])
    );
    await uniqueMultiplierVotingVault.deployed();
    await uniqueMultiplierVotingVault.initialize(
        signers[0].address, // timelock address who can update the manager
        signers[0].address, // manager address who can update unique multiplier values
    );

    // voting vault array
    votingVaults = [uniqueMultiplierVotingVault.address, lockingVotingVault.address, vestingVotingVault.address];

    // core voting parameters
    const MIN_VOTE_POWER = ethers.utils.parseEther("3");
    const DEFAULT_QUORUM = ethers.utils.parseEther("7");

    // deploy coreVoting with following parameters:
    // for initial testing purposes, we are setting the default quorum to 7
    // min voting power needed for proposal submission is set to 3
    // GSC contract address is set to zero - GSC not used
    // array of voting vaults which will be used for voting
    const coreVoting = <CoreVoting>await deploy("CoreVoting", signers[0], [
        signers[0].address, // deployer address at first, then ownership set to timelock contract
        DEFAULT_QUORUM, // base quorum / default quorum
        MIN_VOTE_POWER, // min voting power needed to submit a proposal
        ethers.constants.AddressZero, // GSC contract address
        votingVaults, // voting vaults array
    ]);

    // approve the voting vaults for the votingVaults array
    await coreVoting.changeVaultStatus(uniqueMultiplierVotingVault.address, true);

    // grant roles and update ownership
    // deploy timelock
    const timelock = <Timelock>await deploy("Timelock", signers[0], [
        1000, // wait time
        signers[0].address, // owner
        constants.AddressZero, // authorized account
    ]);
    await timelock.deployed();

    // grant governance owners and authorization
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
    // deploy mock reputation badges
    const reputationNft = <MockERC1155>await deploy("MockERC1155", signers[0], []);
    await reputationNft.deployed();
    const reputationNft2 = <MockERC1155>await deploy("MockERC1155", signers[0], []);
    await reputationNft2.deployed();

    // deploy mock fee controller
    const feeController = <FeeController>await deploy("FeeController", signers[0], []);
    await feeController.deployed();
    // set admin to be set to CoreVoting
    const updateFeeControllerAdmin = await feeController.transferOwnership(coreVoting.address);
    await updateFeeControllerAdmin.wait();

    // deploy Promissory note for GSC voting vault testing
    const pNoteName = "Arcade.xyz PromissoryNote";
    const pNoteSymbol = "PN";
    const promissoryNote = <PromissoryNote>await deploy("PromissoryNote", signers[0], [pNoteName, pNoteSymbol]);
    // grant admin access to GSC core voting
    await promissoryNote.initialize(arcadeGSCCoreVoting.address);

    // ================================== HELPER FUNCTIONS ==============================================

    const increaseBlockNumber = async (provider: any, times: number) => {
        for (let i = 0; i < times; i++) {
            await ethers.provider.send("evm_mine", []);
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
        vestingVotingVault,
        uniqueMultiplierVotingVault,
        coreVoting,
        arcadeGSCCoreVoting,
        votingVaults,
        arcadeGSCVotingVault,
        timelock,
        reputationNft,
        reputationNft2,
        feeController,
        increaseBlockNumber,
        mintNfts,
        setMultipliers,
    };
};
