import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";

import { IBadgeDescriptor, IReputationBadge } from "../src/types";
import { BADGE_MANAGER_ROLE, RESOURCE_MANAGER_ROLE } from "./utils/constants";
import { deploy } from "./utils/deploy";
import { BlockchainTime } from "./utils/time";

type Signer = SignerWithAddress;

export interface Account {
    address: string;
    tokenId: BigNumberish;
    amount: BigNumberish;
}

export interface ClaimData {
    claimRoot: string;
    claimExpiration: BigNumberish;
    mintPrice: BigNumberish;
}

function keccak256Custom(bytes: Buffer) {
    const buffHash = ethers.utils.solidityKeccak256(["bytes"], ["0x" + bytes.toString("hex")]);
    return Buffer.from(buffHash.slice(2), "hex");
}

export async function getMerkleTree(accounts: Account[]) {
    const leaves = await Promise.all(accounts.map(account => hashAccount(account)));
    return new MerkleTree(leaves, keccak256Custom, {
        hashLeaves: false,
        sortPairs: true,
    });
}

export async function hashAccount(account: Account) {
    return ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint256"],
        [account.address, account.tokenId, account.amount],
    );
}

describe("Reputation Badge", async () => {
    const blockchainTime = new BlockchainTime();

    let reputationBadge: IReputationBadge;
    let descriptor: IBadgeDescriptor;

    let admin: Signer;
    let manager: Signer;
    let resourceManager: Signer;

    let user1: Signer;
    let user2: Signer;
    let user3: Signer;
    let user4: Signer;

    let merkleTrieTokenId1: MerkleTree;
    let merkleTrieTokenId2: MerkleTree;
    let rootTokenId1: string;
    let rootTokenId2: string;
    let recipientsTokenId1: Account[];
    let recipientsTokenId2: Account[];
    let proofUser1: string[];
    let proofUser2: string[];
    let proofUser3: string[];
    let proofUser4: string[];
    let expiration: BigNumberish;

    beforeEach(async function () {
        const signers: Signer[] = await ethers.getSigners();
        admin = signers[0];
        manager = signers[1];
        resourceManager = signers[2];
        user1 = signers[3];
        user2 = signers[4];
        user3 = signers[5];
        user4 = signers[6];

        // tree data for two tokens
        recipientsTokenId1 = [
            {
                address: user1.address,
                tokenId: 1,
                amount: 1,
            },
            {
                address: user2.address,
                tokenId: 1,
                amount: 2,
            },
        ];
        recipientsTokenId2 = [
            {
                address: user3.address,
                tokenId: 2,
                amount: 1,
            },
            {
                address: user4.address,
                tokenId: 2,
                amount: 2,
            },
        ];

        // hash leaves for each token
        merkleTrieTokenId1 = await getMerkleTree(recipientsTokenId1);
        rootTokenId1 = merkleTrieTokenId1.getHexRoot();

        merkleTrieTokenId2 = await getMerkleTree(recipientsTokenId2);
        rootTokenId2 = merkleTrieTokenId2.getHexRoot();

        // create proofs for each user
        proofUser1 = merkleTrieTokenId1.getHexProof(
            ethers.utils.solidityKeccak256(
                ["address", "uint256", "uint256"],
                [recipientsTokenId1[0].address, recipientsTokenId1[0].tokenId, recipientsTokenId1[0].amount],
            ),
        );
        proofUser2 = merkleTrieTokenId1.getHexProof(
            ethers.utils.solidityKeccak256(
                ["address", "uint256", "uint256"],
                [recipientsTokenId1[1].address, recipientsTokenId1[1].tokenId, recipientsTokenId1[1].amount],
            ),
        );
        proofUser3 = merkleTrieTokenId2.getHexProof(
            ethers.utils.solidityKeccak256(
                ["address", "uint256", "uint256"],
                [recipientsTokenId2[0].address, recipientsTokenId2[0].tokenId, recipientsTokenId2[0].amount],
            ),
        );
        proofUser4 = merkleTrieTokenId2.getHexProof(
            ethers.utils.solidityKeccak256(
                ["address", "uint256", "uint256"],
                [recipientsTokenId2[1].address, recipientsTokenId2[1].tokenId, recipientsTokenId2[1].amount],
            ),
        );

        // deploy descriptor contract
        descriptor = <IBadgeDescriptor>await deploy("BadgeDescriptor", admin, ["https://www.domain.com/"]);
        await descriptor.deployed();

        // deploy badge contract
        reputationBadge = <IReputationBadge>await deploy("ReputationBadge", admin, [admin.address, descriptor.address]);
        await reputationBadge.deployed();

        // setup access roles
        await reputationBadge.connect(admin).grantRole(BADGE_MANAGER_ROLE, manager.address);
        await reputationBadge.connect(admin).grantRole(RESOURCE_MANAGER_ROLE, resourceManager.address);

        // manager publishes claim data to initiate minting
        expiration = await blockchainTime.secondsFromNow(3600); // 1 hour
        const claimDataTokenId1: ClaimData = {
            claimRoot: rootTokenId1,
            claimExpiration: expiration,
            mintPrice: 0,
        };
        const claimDataTokenId2: ClaimData = {
            claimRoot: rootTokenId2,
            claimExpiration: expiration,
            mintPrice: ethers.utils.parseEther("0.1"),
        };

        await reputationBadge.connect(manager).publishRoots([1, 2], [claimDataTokenId1, claimDataTokenId2]);
    });

    it("Invalid constructor", async () => {
        // invalid admin
        await expect(
            deploy("ReputationBadge", admin, [ethers.constants.AddressZero, descriptor.address]),
        ).to.be.revertedWith(`RB_ZeroAddress("owner")`);

        // invalid descriptor
        await expect(
            deploy("ReputationBadge", admin, [admin.address, ethers.constants.AddressZero]),
        ).to.be.revertedWith(`RB_ZeroAddress("descriptor")`);
    });

    it("Invalid publish root", async () => {
        // cannot publish root with zero tokenId
        const claimDataTokenId0: ClaimData = {
            claimRoot: ethers.utils.solidityKeccak256(["bytes32"], [ethers.utils.randomBytes(32)]),
            claimExpiration: expiration,
            mintPrice: 0,
        };
        await expect(reputationBadge.connect(manager).publishRoots([0], [claimDataTokenId0])).to.be.revertedWith(
            `RB_ZeroTokenId()`,
        );

        // array length mismatch
        await expect(reputationBadge.connect(manager).publishRoots([1, 2], [claimDataTokenId0])).to.be.revertedWith(
            `RB_ArrayMismatch()`,
        );
    });

    it("Invalid ClaimData", async () => {
        // empty claim data
        await expect(reputationBadge.connect(manager).publishRoots([], [])).to.be.revertedWith("RB_NoClaimData()");

        // array with length greater than 50 elements
        const claimData: ClaimData[] = [];
        const tokenIds = [];
        for (let i = 1; i < 52; i++) {
            claimData.push({
                claimRoot: rootTokenId1,
                claimExpiration: expiration,
                mintPrice: 0,
            });
            tokenIds.push(i);
        }
        await expect(reputationBadge.connect(manager).publishRoots(tokenIds, claimData)).to.be.revertedWith(
            "RB_ArrayTooLarge()",
        );

        // invalid claim expiration
        const currentTime = await blockchainTime.secondsFromNow(0);
        const claimDataInvalidExpiration: ClaimData = {
            claimRoot: rootTokenId2,
            claimExpiration: currentTime + 1,
            mintPrice: 0,
        };

        await expect(
            reputationBadge.connect(manager).publishRoots([2], [claimDataInvalidExpiration]),
        ).to.be.revertedWith(`RB_InvalidExpiration`);

        const claimDataInvalidExpiration2: ClaimData = {
            claimRoot: rootTokenId2,
            claimExpiration: currentTime,
            mintPrice: 0,
        };

        await expect(
            reputationBadge.connect(manager).publishRoots([2], [claimDataInvalidExpiration2]),
        ).to.be.revertedWith(`RB_InvalidExpiration`);
    });

    describe("Mint", async () => {
        it("Mint NFTs", async () => {
            // users mint
            await reputationBadge.connect(user1).mint(user1.address, 1, 1, 1, proofUser1);
            await reputationBadge.connect(user2).mint(user2.address, 1, 2, 2, proofUser2);

            // check balances
            expect(await reputationBadge.balanceOf(user1.address, 1)).to.equal(1);
            expect(await reputationBadge.balanceOf(user2.address, 1)).to.equal(2);

            // user 1 tries to mint again
            await expect(reputationBadge.connect(user1).mint(user1.address, 1, 1, 1, proofUser1)).to.be.revertedWith(
                `RB_InvalidClaimAmount(1, 1)`,
            );

            // user 2 tries to mint again
            await expect(reputationBadge.connect(user2).mint(user2.address, 1, 2, 2, proofUser2)).to.be.revertedWith(
                `RB_InvalidClaimAmount(2, 2)`,
            );
        });

        it("Cost to mint and manager withdraws ETH", async () => {
            // get balance before
            const balanceBefore = await ethers.provider.getBalance(manager.address);
            // mint
            await reputationBadge
                .connect(user3)
                .mint(user3.address, 2, 1, 1, proofUser3, { value: ethers.utils.parseEther("0.1") });
            await reputationBadge
                .connect(user4)
                .mint(user4.address, 2, 2, 2, proofUser4, { value: ethers.utils.parseEther("0.2") });

            // check balances
            expect(await reputationBadge.balanceOf(user3.address, 2)).to.equal(1);
            expect(await reputationBadge.balanceOf(user4.address, 2)).to.equal(2);
            expect(await ethers.provider.getBalance(reputationBadge.address)).to.equal(ethers.utils.parseEther("0.3"));

            // tries to withdraw ETH with recipient address zero
            await expect(
                reputationBadge.connect(manager).withdrawFees(ethers.constants.AddressZero),
            ).to.be.revertedWith(`RB_ZeroAddress("recipient")`);

            // manager withdraws ETH
            const res = await reputationBadge.connect(manager).withdrawFees(manager.address);
            const gas = (await res.wait()).gasUsed.mul(res.gasPrice);

            // check balance
            expect(await ethers.provider.getBalance(reputationBadge.address)).to.equal(0);
            expect(await ethers.provider.getBalance(manager.address)).to.equal(
                balanceBefore.add(ethers.utils.parseEther("0.3")).sub(gas),
            );
        });

        it("User sends to more than enough for a mint", async () => {
            // mint
            await reputationBadge
                .connect(user3)
                .mint(user3.address, 2, 1, 1, proofUser3, { value: ethers.utils.parseEther("0.2") });

            // check balances
            expect(await reputationBadge.balanceOf(user3.address, 2)).to.equal(1);
            expect(await ethers.provider.getBalance(reputationBadge.address)).to.equal(ethers.utils.parseEther("0.1"));
        });

        it("Invalid proof", async () => {
            const claimDataTokenId1: ClaimData = {
                claimRoot: ethers.utils.solidityKeccak256(["bytes32"], [ethers.utils.randomBytes(32)]),
                claimExpiration: expiration,
                mintPrice: 0,
            };
            await reputationBadge.connect(manager).publishRoots([1], [claimDataTokenId1]);

            // invalid proof
            await expect(reputationBadge.connect(user1).mint(user1.address, 1, 1, 1, proofUser2)).to.be.revertedWith(
                "RB_InvalidMerkleProof()",
            );
        });

        it("Invalid mint fee", async () => {
            // mint 1 badge
            await expect(reputationBadge.connect(user3).mint(user3.address, 2, 1, 1, proofUser3)).to.be.revertedWith(
                `RB_InvalidMintFee(${ethers.utils.parseEther("0.1")}, ${ethers.utils.parseEther("0")})`,
            );

            // mint multiple badges
            await expect(
                reputationBadge
                    .connect(user4)
                    .mint(user4.address, 2, 2, 2, proofUser4, { value: ethers.utils.parseEther("0.1") }),
            ).to.be.revertedWith(
                `RB_InvalidMintFee(${ethers.utils.parseEther("0.2")}, ${ethers.utils.parseEther("0.1")})`,
            );
        });

        it("Invalid tokenId", async () => {
            // try to mint tokenId 0
            const tx = reputationBadge.connect(user1).mint(user1.address, 0, 1, 1, proofUser1);
            await expect(tx).to.be.revertedWith(`RB_ZeroTokenId()`);
        });

        it("Invalid claim amount", async () => {
            // try to mint tokenId 0
            const tx = reputationBadge.connect(user1).mint(user1.address, 1, 0, 1, proofUser1);
            await expect(tx).to.be.revertedWith(`RB_ZeroClaimAmount()`);
        });

        it("Try to mint tokenId without ClaimData set", async () => {
            // try to mint tokenId 5
            const tx = reputationBadge.connect(user1).mint(user1.address, 5, 1, 1, proofUser1);
            await expect(tx).to.be.revertedWith(`RB_ClaimingExpired`);
        });

        it("After expiration", async () => {
            // increase time
            await blockchainTime.increaseTime(3600);

            // get current block time
            const timeNow = await blockchainTime.secondsFromNow(0);
            // mint
            await expect(reputationBadge.connect(user1).mint(user1.address, 1, 1, 1, proofUser1)).to.be.revertedWith(
                `RB_ClaimingExpired(${expiration}, ${timeNow + 1})`,
            );
        });
    });

    describe("URI Descriptor", async () => {
        it("Gets tokenURI for specific value", async () => {
            // mint
            await reputationBadge.connect(user1).mint(user1.address, 1, 1, 1, proofUser1);

            // check tokenURI
            expect(await reputationBadge.uri(1)).to.equal("https://www.domain.com/1");
        });

        it("Set new base URI", async () => {
            await descriptor.connect(admin).setBaseURI("https://www.arcade.xyz/");

            // mint
            await reputationBadge.connect(user1).mint(user1.address, 1, 1, 1, proofUser1);

            expect(await reputationBadge.connect(user1).uri(1)).to.equal("https://www.arcade.xyz/1");
        });

        it("No base URI", async () => {
            await descriptor.connect(admin).setBaseURI("");

            // mint
            await reputationBadge.connect(user1).mint(user1.address, 1, 1, 1, proofUser1);

            // rug token URI
            await descriptor.connect(admin).setBaseURI("");

            // check tokenURI
            expect(await reputationBadge.uri(1)).to.equal("");
        });

        it("Set new descriptor contract", async () => {
            // deploy new descriptor
            const descriptor2 = <IBadgeDescriptor>await deploy("BadgeDescriptor", admin, ["https://www.google.com/"]);
            await descriptor.deployed();

            // set new descriptor
            await reputationBadge.connect(resourceManager).setDescriptor(descriptor2.address);

            // mint
            await reputationBadge.connect(user1).mint(user1.address, 1, 1, 1, proofUser1);

            // check tokenURI
            expect(await reputationBadge.uri(1)).to.equal("https://www.google.com/1");

            // try to set descriptor to zero address
            await expect(
                reputationBadge.connect(resourceManager).setDescriptor(ethers.constants.AddressZero),
            ).to.be.revertedWith(`RB_ZeroAddress("descriptor")`);
        });
    });

    describe("Permissions", async () => {
        it("Other users try to call protected functions", async () => {
            // try to set token claim data
            const claimDataTokenId0: ClaimData = {
                claimRoot: ethers.utils.solidityKeccak256(["bytes32"], [ethers.utils.randomBytes(32)]),
                claimExpiration: expiration,
                mintPrice: 0,
            };
            await expect(reputationBadge.connect(user1).publishRoots([0], [claimDataTokenId0])).to.be.revertedWith(
                `AccessControl: account ${user1.address.toLowerCase()} is missing role ${BADGE_MANAGER_ROLE}`,
            );

            // try to withdraw fees
            await expect(reputationBadge.connect(user1).withdrawFees(user1.address)).to.be.revertedWith(
                `AccessControl: account ${user1.address.toLowerCase()} is missing role ${BADGE_MANAGER_ROLE}`,
            );

            // try to set baseURI
            await expect(descriptor.connect(user1).setBaseURI("https://www.domain.com/")).to.be.revertedWith(
                `Ownable: caller is not the owner`,
            );

            // try to set descriptor
            await expect(reputationBadge.connect(user1).setDescriptor(descriptor.address)).to.be.revertedWith(
                `AccessControl: account ${user1.address.toLowerCase()} is missing role ${RESOURCE_MANAGER_ROLE}`,
            );
        });
    });

    describe("Introspection", function () {
        it("Return true for declaring support for eip165 interface contract", async () => {
            // https://eips.ethereum.org/EIPS/eip-165#test-cases
            expect(await reputationBadge.supportsInterface("0x01ffc9a7")).to.be.true;
            expect(await reputationBadge.supportsInterface("0xfafafafa")).to.be.false;
        });
    });
});
