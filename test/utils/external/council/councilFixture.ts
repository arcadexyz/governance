import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers, waffle } from "hardhat";
import "module-alias/register";

import { MockERC20Council } from "../../../../src/types/contracts/external/council/mocks/MockERC20Council";
import { LockingVault } from "../../../../src/types/contracts/external/council/vaults/LockingVault.sol";
import { CoreVoting } from "../../../../src/types/contracts/external/council/CoreVoting";
import { Timelock } from "../../../../src/types";
import { ZERO_ADDRESS } from "../../erc20";

type Signer = SignerWithAddress;
const baseVotingPower = 1e10;

export interface TestContextCouncil {
    token: MockERC20Council;
    lockingVault: LockingVault;
    signers: Signer[];
    coreVoting: CoreVoting;
    votingVaults: string[];
    getBlock: () => Promise<number>;
    baseVotingPower: number;
    increaseBlocknumber: (provider: any, times: number) => Promise<void>;
    timelock: Timelock;
}
export let coreVotingAddress: string;
/**
 * Sets up a council test context, deploying contracts and returning them for use in a test
 */
export const councilFixture = async (): Promise<TestContextCouncil> => {
    const signers: Signer[] = await ethers.getSigners();
    const votingVaults: string[] = [];

    const { provider } = waffle;
    const [wallet] = provider.getWallets();

    // init vars
    const one = ethers.utils.parseEther("1");
    const two = ethers.utils.parseEther("2");
    const three = ethers.utils.parseEther("3");
    const four = ethers.utils.parseEther("4");
    const ten = ethers.utils.parseEther("10");

    // deploy the token;
    const erc20Deployer = await ethers.getContractFactory("MockERC20Council", signers[10]);
    const token = await erc20Deployer.deploy("Arc", "test Arc", signers[0].address);

    const timelockDeployer = await ethers.getContractFactory("Timelock", signers[0]);
    const timelock = await timelockDeployer.deploy(1000, signers[0].address, ZERO_ADDRESS);

    // deploy the voting vault contract
    const proxyDeployer = await ethers.getContractFactory("SimpleProxy", wallet);
    const deployer = await ethers.getContractFactory("LockingVault", timelock);
    const lockingVaultBase = await deployer.deploy(token.address, 60); //199350
    const lockingVaultProxy = await proxyDeployer.deploy(signers[0].address, lockingVaultBase.address);
    const lockingVault = lockingVaultBase.attach(lockingVaultProxy.address);

    votingVaults.push(lockingVault.address);

    // Give users some balance and set their allowance
    for (const signer of signers) {
        await token.setBalance(signer.address, ethers.utils.parseEther("100000"));
        await token.setAllowance(signer.address, lockingVault.address, ethers.constants.MaxUint256);
    }

    const coreVotingDeployer = await ethers.getContractFactory("CoreVoting", timelock);

    const coreVoting = await coreVotingDeployer.deploy(
        signers[0].address, // timelock contract
        four, // base quorum: default quorum
        three, // min voting power needed to submit a proposal
        ethers.constants.AddressZero, // GSC contract address
        votingVaults, // voting vaults array
    );

    // Override default lock duration for test purposes
    await coreVoting.connect(signers[0]).setLockDuration(0);
    await coreVoting.connect(signers[0]).changeExtraVotingTime(500);

    // grant roles
    await coreVoting.connect(signers[0]).setOwner(timelock.address);
    await timelock.connect(signers[0]).deauthorize(signers[0].address);
    await timelock.connect(signers[0]).setOwner(coreVoting.address);

    coreVotingAddress = coreVoting.address;

    const getBlock = async () => {
        let latestBlock: number = (await ethers.provider.getBlock("latest")).number;
        return latestBlock;
    }

    const increaseBlocknumber = async (provider: any, times: number) => {
    for (let i = 0; i < times; i++) {
        await provider.send("evm_mine", []);
    }
}

    return {
        signers,
        lockingVault,
        token,
        coreVoting,
        votingVaults,
        getBlock,
        baseVotingPower,
        increaseBlocknumber,
        timelock
    };
}
