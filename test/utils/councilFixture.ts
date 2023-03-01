import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { BigNumber, constants } from "ethers";
import { ethers, waffle } from "hardhat";
import "module-alias/register";

import { Timelock } from "../../src/types";
import { CoreVoting } from "../../src/types/contracts/external/council/CoreVoting";
import { MockERC20Council } from "../../src/types/contracts/external/council/mocks/MockERC20Council";
import { LockingVault } from "../../src/types/contracts/external/council/vaults/LockingVault.sol";

type Signer = SignerWithAddress;

export interface TestContextCouncil {
    token: MockERC20Council;
    lockingVault: LockingVault;
    signers: Signer[];
    coreVoting: CoreVoting;
    votingVaults: string[];
    timelock: Timelock;
    tokenAddress: string;
    increaseBlockNumber: (provider: any, times: number) => Promise<void>;
    getBlock: () => Promise<number>;
    delegateVotingPower: (signers: SignerWithAddress[]) => Promise<BigNumber | undefined>;
}
export let coreVotingAddress: string;
<<<<<<< HEAD
=======
export let tokenAddress: string;
>>>>>>> c6cac4d (feat: initial commit)

/**
 * This fixture creates a coreVoting deployment with a timelock and lockingVault,
 * with the parameters for each.
 */
export const councilFixture = async (): Promise<TestContextCouncil> => {
    const signers: Signer[] = await ethers.getSigners();
    const votingVaults: string[] = [];

    const { provider } = waffle;
    const [wallet] = provider.getWallets();

    // init vars
    const THREE = ethers.utils.parseEther("3");
    const SEVEN = ethers.utils.parseEther("7");

    // deploy the token
    const erc20Deployer = await ethers.getContractFactory("MockERC20Council", signers[0]);
    const token = await erc20Deployer.deploy("Arc", "test Arc", signers[0].address);

    // deploy the timelock contract setting the wait time, its owner and GSC address
    const timelockDeployer = await ethers.getContractFactory("Timelock", signers[0]);
    const timelock = await timelockDeployer.deploy(1000, signers[0].address, constants.AddressZero);

    // deploy the voting vault contract
    const proxyDeployer = await ethers.getContractFactory("SimpleProxy", wallet);
    const deployer = await ethers.getContractFactory("LockingVault", timelock);
    const lockingVaultBase = await deployer.deploy(token.address, 55); // use 199350 with fork of mainnet
    const lockingVaultProxy = await proxyDeployer.deploy(signers[0].address, lockingVaultBase.address);
    const lockingVault = lockingVaultBase.attach(lockingVaultProxy.address);

    // push lockingVault into the votingVaults array which is
    // used as an argument in coreVoting's deployment
    votingVaults.push(lockingVault.address);

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

    // update coreVoting address. This address will be set as owner of FeeController.sol
    coreVotingAddress = coreVoting.address;

    const delegateVotingPower = async (signers: SignerWithAddress[]) => {
        const ONE = ethers.utils.parseEther("1");

        // setup the users and give accounts some voting power
        // signer[0] deposits initializes votingPower storage
        await lockingVault.deposit(signers[0].address, ONE, signers[0].address);
        // signer[1] deposits 0.5 voting power to signers[0]
        await lockingVault.connect(signers[1]).deposit(signers[1].address, ONE.div(2), signers[0].address);
        // signer[1] deposits 0.5 voting power to signers[3]
        await lockingVault.connect(signers[1]).deposit(signers[1].address, ONE.div(2), signers[3].address);
        // signer[2] deposits 2 voting power to signers[2]
        await lockingVault.connect(signers[2]).deposit(signers[2].address, ONE.mul(2), signers[2].address);
        // signer[3] deposits 1 voting power to signers[2]
        await lockingVault.connect(signers[3]).deposit(signers[3].address, ONE, signers[2].address);
        // signer[3] deposits 3 voting power to signers[1]
        await lockingVault.connect(signers[3]).deposit(signers[3].address, ONE.mul(3), signers[1].address);
        // signers[1] deposits 2 voting power to signers[0]
        await lockingVault.connect(signers[1]).deposit(signers[1].address, ONE.mul(2), signers[0].address);
        // signers[2] deposits 2 voting power to signers[3]
        await lockingVault.connect(signers[2]).deposit(signers[2].address, ONE.mul(2), signers[3].address);
    };

    const getBlock = async () => {
        const latestBlock: number = (await ethers.provider.getBlock("latest")).number;
        return latestBlock;
    };

    const increaseBlockNumber = async (provider: any, times: number) => {
        for (let i = 0; i < times; i++) {
            await provider.send("evm_mine", []);
        }
    };

    return {
        signers,
        lockingVault,
        token,
        coreVoting,
        votingVaults,
        timelock,
        increaseBlockNumber,
        getBlock,
        delegateVotingPower,
        tokenAddress,
    };
};
