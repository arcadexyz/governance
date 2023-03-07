import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { Wallet } from "ethers";
import hre from "hardhat";

import { IArcadeToken } from "../../src/types";
import { deploy } from "./contracts";

type Signer = SignerWithAddress;

export interface TokenTestContext {
    deployer: Signer;
    other: Signer;
    treasury: Wallet;
    devPartner: Wallet;
    communityRewardsPool: Wallet;
    airdrop: Wallet;
    vestingMultisig: Wallet;
    arcToken: IArcadeToken;
}

/**
 * Sets up the test context for the Arcade token, deploying the Arcade token and
 * returning it for use in unit testing.
 */
export const tokenFixture = async (): Promise<TokenTestContext> => {
    // ============================= ACCOUNTS ====================================
    const signers: Signer[] = await hre.ethers.getSigners();
    const deployer: Signer = signers[0];
    const other: Signer = signers[1];

    // mock recipients
    const treasury = new Wallet.createRandom();
    const devPartner = new Wallet.createRandom();
    const communityRewardsPool = new Wallet.createRandom();
    const airdrop = new Wallet.createRandom();
    const vestingMultisig = new Wallet.createRandom();

    // ============================= TOKEN DEPLOYMENT ==============================

    const arcToken = <ArcadeToken>await deploy("ArcadeToken", signers[0], []);
    await arcToken.deployed();

    return {
        deployer,
        other,
        treasury,
        devPartner,
        communityRewardsPool,
        airdrop,
        vestingMultisig,
        arcToken,
    };
};
