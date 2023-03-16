import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import hre from "hardhat";

import { FeeController, MockERC721Metadata } from "../../src/types";
import { deploy } from "./contracts";
import { coreVotingAddress } from "./councilFixture";

type Signer = SignerWithAddress;

export interface TestContext {
    feeController: FeeController;
    pNote: MockERC721Metadata;
    mintPnote(signer: string, amount: number, contract: MockERC721Metadata): Promise<void>;
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

    const pNoteFactory = await hre.ethers.getContractFactory("MockERC721Metadata");
    const pNote = <MockERC721Metadata>await pNoteFactory.deploy("Arcade Pnote", "ARCPN");
    await pNote.deployed();

    // mint users' promissory notes
    let j = 1;
    const mintPnote = async (signer: string, amount: number) => {
        for (let i = 0; i < amount; i++) {
            await pNote["mint(address,string)"](
                signer,
                `https://s3.amazonaws.com/images.pawn.fi/test-nft-metadata/PawnArtIo/nft-${j++}.json`,
            );
        }
    };

    return {
        feeController,
        pNote,
        mintPnote,
    };
};
