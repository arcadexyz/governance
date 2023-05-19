import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";

import { ReputationBadge } from "../src/types";
import { ADMIN_ROLE, MANAGER_ROLE, MINTER_ROLE, RESOURCE_MANAGER_ROLE } from "./utils/constants";
import { deploy } from "./utils/deploy";
import { Account, getMerkleTree } from "./utils/external/council/helpers/merkle";

type Signer = SignerWithAddress;

export interface Account {
    address: string;
    value: BigNumberish;
}

describe("Reputation Badge", async () => {
    let admin: Signer;
    let manager: Signer;
    let minter: Signer;
    let resourceManager: Signer;
    let user1: Signer;
    let user2: Signer;

    let reputationBadge: ReputationBadge;
    let merkleTrie: MerkleTree;
    let root: string;
    let recipients: Account[];
    let proofUser1: string[];
    let proofUser2: string[];

    beforeEach(async function () {
        const signers: Signer[] = await ethers.getSigners();
        admin = signers[0];
        manager = signers[1];
        minter = signers[2];
        resourceManager = signers[3];
        user1 = signers[4];
        user2 = signers[5];

        // airdrop claims data
        recipients = [
            {
                address: user1.address,
                value: 0,
            },
            {
                address: user2.address,
                value: 1,
            },
        ];

        // hash leaves
        merkleTrie = await getMerkleTree(recipients);
        root = merkleTrie.getHexRoot();

        // create proofs
        proofUser1 = merkleTrie.getHexProof(
            ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[0].address, recipients[0].value]),
        );
        proofUser2 = merkleTrie.getHexProof(
            ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[1].address, recipients[1].value]),
        );

        // deploy contract
        reputationBadge = <ReputationBadge>await deploy("ReputationBadge", admin, [root, 0, admin.address]);
        await reputationBadge.deployed();

        // setup access roles
        await reputationBadge.connect(admin).grantRole(MANAGER_ROLE, manager.address);
        await reputationBadge.connect(admin).grantRole(MINTER_ROLE, minter.address);
        await reputationBadge.connect(admin).grantRole(RESOURCE_MANAGER_ROLE, resourceManager.address);
    });

    it("Invalid constructor", async () => {
        // invalid manager
        await expect(deploy("ReputationBadge", admin, [root, 1, ethers.constants.AddressZero])).to.be.revertedWith(
            "RB_ZeroAddress()",
        );
    });

    describe("Mint", async () => {
        it("Mint single NFT", async () => {
            // both users mint
            await reputationBadge.connect(minter).mint(user1.address, 0, proofUser1);
            await reputationBadge.connect(minter).mint(user2.address, 1, proofUser2);

            // check balances
            expect(await reputationBadge.balanceOf(user1.address, 0)).to.equal(1);
            expect(await reputationBadge.balanceOf(user2.address, 1)).to.equal(1);

            expect(await reputationBadge.balanceOf(user1.address, 1)).to.equal(0);
            expect(await reputationBadge.balanceOf(user2.address, 0)).to.equal(0);

            // user 1 tries to mint again
            await expect(reputationBadge.connect(minter).mint(user1.address, 0, proofUser1)).to.be.revertedWith(
                "RB_AlreadyClaimed()",
            );
        });

        it("Cost to mint and manager withdraws ETH", async () => {
            // increase mint price to .01 ETH
            await reputationBadge.connect(manager).setMintPrice(ethers.utils.parseEther("0.01"));

            // get balance before
            const balanceBefore = await ethers.provider.getBalance(manager.address);
            // mint
            await reputationBadge
                .connect(minter)
                .mint(user1.address, 0, proofUser1, { value: ethers.utils.parseEther("0.01") });
            await reputationBadge
                .connect(minter)
                .mint(user2.address, 1, proofUser2, { value: ethers.utils.parseEther("0.01") });

            // check balances
            expect(await reputationBadge.balanceOf(user1.address, 0)).to.equal(1);
            expect(await reputationBadge.balanceOf(user2.address, 1)).to.equal(1);
            expect(await ethers.provider.getBalance(reputationBadge.address)).to.equal(ethers.utils.parseEther("0.02"));

            // manager withdraws ETH
            const res = await reputationBadge.connect(manager).withdrawFees();
            const gas = (await res.wait()).gasUsed.mul(res.gasPrice);

            // check balance
            expect(await ethers.provider.getBalance(reputationBadge.address)).to.equal(0);
            expect(await ethers.provider.getBalance(manager.address)).to.equal(
                balanceBefore.add(ethers.utils.parseEther("0.02")).sub(gas),
            );
        });

        it("Invalid proof", async () => {
            // invalid proof
            await expect(reputationBadge.connect(minter).mint(user1.address, 0, proofUser2)).to.be.revertedWith(
                "RB_InvalidMerkleProof()",
            );
        });

        it("Invalid mint fee", async () => {
            // increase mint price to .01 ETH
            await reputationBadge.connect(manager).setMintPrice(ethers.utils.parseEther("0.01"));

            // mint
            await expect(reputationBadge.connect(minter).mint(user1.address, 0, proofUser1)).to.be.revertedWith(
                `RB_InvalidMintFee(${ethers.utils.parseEther("0.01")}, ${ethers.utils.parseEther("0")})`,
            );
        });
    });

    describe("Token URI", async () => {
        it("Gets tokenURI for specific value", async () => {
            // set tokenURI
            await reputationBadge.connect(resourceManager).setBaseURI("https://www.domain.com/");

            // mint
            await reputationBadge.connect(minter).mint(user1.address, 0, proofUser1);

            // check tokenURI
            expect(await reputationBadge.uri(0)).to.equal("https://www.domain.com/0");
        });

        it("No base URI", async () => {
            // mint
            await reputationBadge.connect(minter).mint(user1.address, 0, proofUser1);

            // rug token URI
            await reputationBadge.connect(resourceManager).setBaseURI("");

            // check tokenURI
            expect(await reputationBadge.uri(0)).to.equal("");
        });
    });

    describe("Permissions", async () => {
        it("Other users try to call protected functions", async () => {
            // try to mint
            await expect(reputationBadge.connect(user1).mint(user1.address, 0, proofUser1)).to.be.revertedWith(
                `AccessControl: account ${user1.address.toLowerCase()} is missing role ${MINTER_ROLE}`,
            );

            // try to set merkle root
            await expect(reputationBadge.connect(user1).setMerkleRoot(root)).to.be.revertedWith(
                `AccessControl: account ${user1.address.toLowerCase()} is missing role ${MANAGER_ROLE}`,
            );

            // try to increase mint price to .01 ETH
            await expect(
                reputationBadge.connect(user1).setMintPrice(ethers.utils.parseEther("0.01")),
            ).to.be.revertedWith(
                `AccessControl: account ${user1.address.toLowerCase()} is missing role ${MANAGER_ROLE}`,
            );

            // try to withdraw fees
            await expect(reputationBadge.connect(user1).withdrawFees()).to.be.revertedWith(
                `AccessControl: account ${user1.address.toLowerCase()} is missing role ${MANAGER_ROLE}`,
            );

            // try to set baseURI
            await expect(reputationBadge.connect(user1).setBaseURI("https://www.domain.com/")).to.be.revertedWith(
                `AccessControl: account ${user1.address.toLowerCase()} is missing role ${RESOURCE_MANAGER_ROLE}`,
            );
        });

        it("Set new merkle root", async () => {
            // set merkle root
            await reputationBadge.connect(manager).setMerkleRoot(ethers.constants.HashZero);
        });
    });
});
