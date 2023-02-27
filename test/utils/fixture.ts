import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import hre from "hardhat";

import { FeeController } from "../../src/types";
import { deploy } from "./contracts";
import { coreVotingAddress } from "./councilFixture";

type Signer = SignerWithAddress;

export interface TestContext {
    feeController: FeeController;
}

/**
 * Sets up a test context, deploying new contracts and returning them for use in tests
 */

export const fixture = async (): Promise<TestContext> => {
    const signers: Signer[] = await hre.ethers.getSigners();

    // ========================== FEECONTROLLER DEPLOYMENT AND OWNERSHIP ==================================

    const feeController = <FeeController>await deploy("FeeController", signers[0], []);
    await feeController.deployed();

    // set FeeController admin to be set to CoreVoting.sol
    const updateFeeControllerAdmin = await feeController.transferOwnership(coreVotingAddress);
    await updateFeeControllerAdmin.wait();

    return {
        feeController,
    };
};
