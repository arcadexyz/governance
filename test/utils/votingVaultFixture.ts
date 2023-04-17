import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { constants } from "ethers";
import hre, { ethers, waffle } from "hardhat";
import "module-alias/register";

import { FeeController, MockERC721 } from "../../src/types";
import { Timelock } from "../../src/types";
import { PromissoryVotingVault } from "../../src/types/contracts/PromissoryVotingVault.sol";
import { CoreVoting } from "../../src/types/contracts/external/council/CoreVoting";
import { MockERC20Council } from "../../src/types/contracts/external/council/mocks/MockERC20Council";
import { GSCVault } from "../../src/types/contracts/external/council/vaults/GSCVault.sol";
import { LockingVault } from "../../src/types/contracts/external/council/vaults/LockingVault.sol";
import { deploy } from "./contracts";

type Signer = SignerWithAddress;

export interface TestContextVotingVault {
    token: MockERC20Council;
    lockingVault: LockingVault;
    gscVotingVault: GSCVault;
    promissoryVotingVault: PromissoryVotingVault;
    signers: Signer[];
    coreVoting: CoreVoting;
    votingVaults: string[];
    timelock: Timelock;
    tokenAddress: string;
    increaseBlockNumber: (provider: any, times: number) => Promise<void>;
    getBlock: () => Promise<number>;
    promissoryNote: MockERC721;
    feeController: FeeController;
    mintPromissoryNote(): Promise<void>;
}

/**
 * This fixture creates a coreVoting deployment with a timelock and lockingVault,
 * with the parameters for each.
 */
export const votingVaultFixture = async (): Promise<TestContextVotingVault> => {
    const signers: Signer[] = await ethers.getSigners();
    const votingVaults: string[] = [];

    const { provider } = waffle;
    const [wallet] = provider.getWallets();

    // init vars
    const ONE = ethers.utils.parseEther("1");
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
    const lockingVaultFactory = await ethers.getContractFactory("LockingVault", timelock);
    const lockingVaultBase = await lockingVaultFactory.deploy(token.address, 55); // use 199350 with fork of mainnet
    const lockingVaultProxy = await proxyDeployer.deploy(signers[0].address, lockingVaultBase.address);
    const lockingVault = await lockingVaultBase.attach(lockingVaultProxy.address);

    const promissoryNoteFactory = await hre.ethers.getContractFactory("MockERC721");
    const promissoryNote = <MockERC721>await promissoryNoteFactory.deploy("Arcade Pnote", "ARCDPN");
    await promissoryNote.deployed();

    //deploy and initialize promissory voting vault
    const PromissoryVotingVaultFactory = await ethers.getContractFactory("PromissoryVotingVault", timelock);
    const promissoryVotingVaultBase = await PromissoryVotingVaultFactory.deploy(tokenAddress, 55);
    const promissoryVotingVaultProxy = await proxyDeployer.deploy(timelock.address, promissoryVotingVaultBase.address);
    const promissoryVotingVault = promissoryVotingVaultBase.attach(promissoryVotingVaultProxy.address);
    await promissoryVotingVault.initialize(timelock.address, promissoryNote.address);

    // push voting vaults into the votingVaults array which is
    // used as an argument in coreVoting's deployment
    votingVaults.push(promissoryVotingVault.address, lockingVault.address);

    // give users some balance and set their allowance
    for (const signer of signers) {
        await token.setBalance(signer.address, ethers.utils.parseEther("100000"));
        await token.setAllowance(signer.address, lockingVault.address, ethers.constants.MaxUint256);
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

    // grant roles and update owner role
    await coreVoting.connect(signers[0]).setOwner(timelock.address); // timelock owns coreVoting
    await timelock.connect(signers[0]).deauthorize(signers[0].address); // timelock revokes deployer ownership
    await timelock.connect(signers[0]).setOwner(coreVoting.address); // coreVoting is set as owner of timelock

    const gscCoreVoting = await coreVotingDeployer.deploy(
        signers[0].address, // deployer address at first, then ownership set to timelock contract
        SEVEN, // base quorum / default quorum
        THREE, // min voting power needed to submit a proposal
        ethers.constants.AddressZero, // GSC contract address
        votingVaults, // voting vaults array
    );

    // Deploy the GSC Voting Vault
    const gscVotingVaultFactory = await ethers.getContractFactory("GSCVault", signers[0]);
    const gscVotingVault = await gscVotingVaultFactory.deploy(
        gscCoreVoting.address, // the core voting contract for the GSC
        ONE, // amount of voting power needed to be on the GSC
        signers[0].address, // owner of the GSC voting vault contract. should be the timelock
    );
    await gscCoreVoting.connect(signers[0]).setOwner(timelock.address); // timelock owns gscCoreVoting

    const feeController = <FeeController>await deploy("FeeController", signers[0], []);
    await feeController.deployed();

    // set FeeController admin to be set to CoreVoting.sol
    const updateFeeControllerAdmin = await feeController.transferOwnership(coreVoting.address);
    await updateFeeControllerAdmin.wait();

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

    // mint users' promissory notes
    const mintPromissoryNote = async () => {
        let id = 1;
        for (let i = 0; i < signers.length; i++) {
            await promissoryNote.mintId(id, `${signers[i].address}`);
            id++;
        }
    };

    return {
        signers,
        lockingVault,
        promissoryVotingVault,
        token,
        coreVoting,
        votingVaults,
        gscVotingVault,
        timelock,
        increaseBlockNumber,
        getBlock,
        tokenAddress,
        mintPromissoryNote,
        promissoryNote,
        feeController,
    };
};
