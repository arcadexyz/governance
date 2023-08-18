import { mine } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { constants } from "ethers";
import { ethers } from "hardhat";

import {
    ARCDVestingVault,
    ArcadeCoreVoting,
    ArcadeGSCCoreVoting,
    ArcadeGSCVault,
    ArcadeToken,
    ArcadeTreasury,
    FeeController,
    LockingVault,
    MockERC1155,
    NFTBoostVault,
    PromissoryNote,
    Timelock,
} from "../../src/types";
import { CORE_VOTING_ROLE, GSC_CORE_VOTING_ROLE } from "./constants";
import { deploy } from "./contracts";
import { BlockchainTime } from "./time";
import { Multipliers, Thresholds } from "./types";

type Signer = SignerWithAddress;

export interface TestContextGovernance {
    signers: Signer[];
    lockingVotingVault: LockingVault;
    vestingVotingVault: ARCDVestingVault;
    nftBoostVault: NFTBoostVault;
    arcadeGSCVault: ArcadeGSCVault;
    coreVoting: ArcadeCoreVoting;
    arcadeGSCCoreVoting: ArcadeGSCCoreVoting;
    votingVaults: string[];
    timelock: Timelock;
    arcadeTreasury: ArcadeTreasury;
    reputationNft: MockERC1155;
    reputationNft2: MockERC1155;
    feeController: FeeController;
    promissoryNote: PromissoryNote;
    blockchainTime: BlockchainTime;
    increaseBlockNumber: (provider: any, times: number) => Promise<void>;
    mintNfts(): Promise<void>;
    setMultipliers(): Promise<Multipliers>;
    setTreasuryThresholds(): Promise<Thresholds[]>;
}

/**
 * This fixture creates a complete governance deployment. It deploys the following voting vaults: locking vault,
 * vesting vault, NFT boost voting vault for use with the base core voting and timelock contracts.
 * In addition, this fixture sets up a GSC committee which has its own core voting contract and own voting vault.
 */
export const governanceFixture = (arcdToken: ArcadeToken): (() => Promise<TestContextGovernance>) => {
    return async (): Promise<TestContextGovernance> => {
        const blockchainTime = new BlockchainTime();
        const signers: Signer[] = await ethers.getSigners();
        let votingVaults: string[] = [];
        let arcadeGSCVaults: string[] = [];

        // staleBlockNum has to be a number in the past, lower than the current block number.
        // upon deployment, update staleBlockNum to be relevant in the realm of mainnet
        await mine(101);
        const staleBlockNum = 100;

        // ================================= CORE VOTING VAULTS =================================
        // deploy locking vault
        const lockingVotingVault = <LockingVault>(
            await deploy("LockingVault", signers[0], [arcdToken.address, staleBlockNum])
        );
        await lockingVotingVault.deployed();

        // deploy vesting vault with signers[1] as the manager and signers[2] as the owner
        const vestingVotingVault = <ARCDVestingVault>(
            await deploy("ARCDVestingVault", signers[0], [
                arcdToken.address,
                staleBlockNum,
                signers[1].address,
                signers[2].address,
            ])
        );
        await vestingVotingVault.deployed();

        // deploy and initialize NFT boost voting vault
        const nftBoostVault = <NFTBoostVault>await deploy("NFTBoostVault", signers[0], [
            arcdToken.address,
            staleBlockNum,
            signers[0].address, // timelock address who can update the manager
            signers[0].address, // manager address who can update multiplier values
        ]);
        await nftBoostVault.deployed();

        // use manager of NFTBoostVault to set a mock airdrop contract. This is used for testing purposes
        // and is not used in production. The address of this mock airdrop contract can call the
        // NFTBoostVault's `airdropReceive` function
        await nftBoostVault.connect(signers[0]).setAirdropContract(signers[0].address);

        // voting vault array
        votingVaults = [nftBoostVault.address, lockingVotingVault.address, vestingVotingVault.address];

        // ==================================== BASE CORE VOTING ==================================

        // core voting parameters
        const MIN_VOTE_POWER = ethers.utils.parseEther("3");
        const DEFAULT_QUORUM = ethers.utils.parseEther("7");

        // deploy ArcadeCoreVoting with following parameters:
        // for initial testing purposes, we are setting the default quorum to 7
        // min voting power needed for proposal submission is set to 3
        // GSC contract address is set to zero - GSC not used
        // array of voting vaults which will be used for voting
        const coreVoting = <ArcadeCoreVoting>await deploy("ArcadeCoreVoting", signers[0], [
            signers[0].address, // deployer address at first, then ownership set to timelock contract
            DEFAULT_QUORUM, // base quorum / default quorum
            MIN_VOTE_POWER, // min voting power needed to submit a proposal
            ethers.constants.AddressZero, // GSC contract address
            votingVaults, // voting vaults array
            true, // allow new vaults to be added
        ]);
        await coreVoting.deployed();

        // approve the voting vaults for the votingVaults array
        await coreVoting.changeVaultStatus(nftBoostVault.address, true);

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

        // ================================== ARCADE GSC VOTING VAULTS ==============================

        // Deploy the GSC Vault
        const arcadeGSCVault = <ArcadeGSCVault>await deploy("ArcadeGSCVault", signers[0], [
            coreVoting.address, // the core voting contract
            50, // amount of voting power needed to be on the GSC (using 50 for ease of testing. Council GSC on Mainnet requires 110,000)
            timelock.address, // owner of the GSC vault contract: the timelock contract
        ]);
        await arcadeGSCVault.deployed();

        arcadeGSCVaults = [arcadeGSCVault.address];

        // ================================== ARCADE GSC CORE VOTING ================================

        const arcadeGSCCoreVoting = <ArcadeGSCCoreVoting>await deploy("ArcadeGSCCoreVoting", signers[0], [
            signers[0].address, // deployer address at first, then ownership set to timelock contract
            3, // quorum
            1, // voting power needed to submit a proposal
            ethers.constants.AddressZero, // GSC contract address when it's deployed
            arcadeGSCVaults, // gsc vault array (the vaults where GSC members voting power is held)
        ]);
        await arcadeGSCCoreVoting.deployed();

        // ===================================== TREASURY =====================================

        const arcadeTreasury = <ArcadeTreasury>await deploy("ArcadeTreasury", signers[0], [signers[1].address]);

        // setup access roles
        await arcadeTreasury.connect(signers[1]).grantRole(CORE_VOTING_ROLE, signers[2].address);
        await arcadeTreasury.connect(signers[1]).grantRole(GSC_CORE_VOTING_ROLE, signers[3].address);

        // ================================ EXTERNAL RESOURCES ================================

        // deploy mock reputation badges
        const reputationNft = <MockERC1155>await deploy("MockERC1155", signers[0], []);
        await reputationNft.deployed();
        const reputationNft2 = <MockERC1155>await deploy("MockERC1155", signers[0], []);
        await reputationNft2.deployed();

        // deploy mock fee controller
        const feeController = <FeeController>await deploy("FeeController", signers[0], []);
        await feeController.deployed();
        // set FeeController admin to be set to CoreVoting.sol
        const updateFeeControllerAdmin = await feeController.transferOwnership(coreVoting.address);
        await updateFeeControllerAdmin.wait();

        // deploy Promissory note for GSC vault testing
        const pNoteName = "Arcade.xyz PromissoryNote";
        const pNoteSymbol = "PN";
        const promissoryNote = <PromissoryNote>await deploy("PromissoryNote", signers[0], [pNoteName, pNoteSymbol]);
        // grant admin access to GSC core voting
        await promissoryNote.initialize(arcadeGSCCoreVoting.address);

        // ================================== HELPER FUNCTIONS ==================================

        const increaseBlockNumber = async (provider: any, times: number) => {
            for (let i = 0; i < times; i++) {
                await ethers.provider.send("evm_mine", []);
            }
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
            const txA = await nftBoostVault.connect(signers[0]).setMultiplier(reputationNft.address, 1, 1200);
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
            const txB = await nftBoostVault.connect(signers[0]).setMultiplier(reputationNft2.address, 1, 1400);
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

        const setTreasuryThresholds = async (): Promise<Thresholds[]> => {
            const arcdThresholds: Thresholds = {
                small: ethers.utils.parseEther("100"),
                medium: ethers.utils.parseEther("500"),
                large: ethers.utils.parseEther("1000"),
            };

            const ethThresholds: Thresholds = {
                small: ethers.utils.parseEther("1"),
                medium: ethers.utils.parseEther("5"),
                large: ethers.utils.parseEther("10"),
            };

            // set arcd threshold
            const tx = await arcadeTreasury.connect(signers[1]).setThreshold(arcdToken.address, arcdThresholds);
            await tx.wait();
            // set eth threshold
            const tx2 = await arcadeTreasury
                .connect(signers[1])
                .setThreshold("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", ethThresholds);
            await tx2.wait();

            // increase time to allow for test threshold changes
            await blockchainTime.increaseTime(3600 * 24 * 7);

            return [arcdThresholds, ethThresholds];
        };

        return {
            signers,
            lockingVotingVault,
            vestingVotingVault,
            nftBoostVault,
            arcadeGSCVault,
            coreVoting,
            arcadeGSCCoreVoting,
            votingVaults,
            timelock,
            arcadeTreasury,
            reputationNft,
            reputationNft2,
            feeController,
            promissoryNote,
            blockchainTime,
            increaseBlockNumber,
            mintNfts,
            setMultipliers,
            setTreasuryThresholds,
        };
    };
};
