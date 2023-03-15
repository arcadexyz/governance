import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import { LockingVault } from "../../src/types/contracts/external/council/vaults/LockingVault.sol";
import { TestContextCouncil } from "../utils/councilFixture";

type Signer = SignerWithAddress;
export const lockingVaultDelegate = async (lockingVault: LockingVault, signers: SignerWithAddress[]) => {
    const ONE = ethers.utils.parseEther("1");
    // setup the users and give accounts some voting power
    // signer[0] deposits initializes votingPower storage
    await lockingVault.deposit(signers[0].address, ONE, signers[0].address);
    // signer[1] deposits 0.5 voting power to signers[0]
    await lockingVault.connect(signers[1]).deposit(signers[1].address, ONE.div(2), signers[0].address);
    // signer[2] deposits 2 voting power to signers[2]
    await lockingVault.connect(signers[2]).deposit(signers[2].address, ONE.mul(2), signers[2].address);
    // signer[3] deposits 1 voting power to signers[2]
    await lockingVault.connect(signers[3]).deposit(signers[3].address, ONE, signers[2].address);
    // signer[1] deposits 0.5 voting power to signers[3]
    await lockingVault.connect(signers[1]).deposit(signers[1].address, ONE.div(2), signers[3].address);
    // signer[3] deposits 3 voting power to signers[1]
    await lockingVault.connect(signers[3]).deposit(signers[3].address, ONE.mul(3), signers[1].address);
    // signers[1] deposits 2 voting power to signers[0]
    await lockingVault.connect(signers[1]).deposit(signers[1].address, ONE.mul(2), signers[0].address);
    // signers[2] deposits 2 voting power to signers[3]
    await lockingVault.connect(signers[2]).deposit(signers[2].address, ONE.mul(2), signers[3].address);
};

export const loadGovernance = async (ctxCouncil: TestContextCouncil) => {
    const signers: Signer[] = await ethers.getSigners();
    const { coreVoting, lockingVault, votingVaults, increaseBlockNumber, token, promissoryVault } = ctxCouncil;

    // LockingVault users deposit their tokens and delegate voting power
    await lockingVaultDelegate(lockingVault, signers);

    return {
        signers,
        coreVoting,
        lockingVault,
        votingVaults,
        increaseBlockNumber,
        token,
        promissoryVault,
    };
};
