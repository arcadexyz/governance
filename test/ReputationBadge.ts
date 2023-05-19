import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";

import { IReputationBadge } from "../src/types";
import { BlockchainTime } from "./utils/Time";
import { ADMIN_ROLE, MANAGER_ROLE, RESOURCE_MANAGER_ROLE } from "./utils/constants";
import { deploy } from "./utils/deploy";

type Signer = SignerWithAddress;

export interface Account {
    address: string;
    tokenId: BigNumberish;
    amount: BigNumberish;
}

export interface ClaimData {
    tokenId: BigNumberish;
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

    let admin: Signer;
    let manager: Signer;
    let resourceManager: Signer;

    let user1: Signer;
    let user2: Signer;
    let user3: Signer;
    let user4: Signer;

    let merkleTrieTokenId0: MerkleTree;
    let merkleTrieTokenId1: MerkleTree;
    let rootTokenId0: string;
    let rootTokenId1: string;
    let recipientsTokenId0: Account[];
    let recipientsTokenId1: Account[];
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
        recipientsTokenId0 = [
            {
                address: user1.address,
                tokenId: 0,
                amount: 1,
            },
            {
                address: user2.address,
                tokenId: 0,
                amount: 2,
            },
        ];
        recipientsTokenId1 = [
            {
                address: user3.address,
                tokenId: 1,
                amount: 1,
            },
            {
                address: user4.address,
                tokenId: 1,
                amount: 2,
            },
        ];

        // hash leaves for each token
        merkleTrieTokenId0 = await getMerkleTree(recipientsTokenId0);
        rootTokenId0 = merkleTrieTokenId0.getHexRoot();

        merkleTrieTokenId1 = await getMerkleTree(recipientsTokenId1);
        rootTokenId1 = merkleTrieTokenId1.getHexRoot();

        // create proofs for each user
        proofUser1 = merkleTrieTokenId0.getHexProof(
            ethers.utils.solidityKeccak256(
                ["address", "uint256", "uint256"],
                [recipientsTokenId0[0].address, recipientsTokenId0[0].tokenId, recipientsTokenId0[0].amount],
            ),
        );
        proofUser2 = merkleTrieTokenId0.getHexProof(
            ethers.utils.solidityKeccak256(
                ["address", "uint256", "uint256"],
                [recipientsTokenId0[1].address, recipientsTokenId0[1].tokenId, recipientsTokenId0[1].amount],
            ),
        );
        proofUser3 = merkleTrieTokenId1.getHexProof(
            ethers.utils.solidityKeccak256(
                ["address", "uint256", "uint256"],
                [recipientsTokenId1[0].address, recipientsTokenId1[0].tokenId, recipientsTokenId1[0].amount],
            ),
        );
        proofUser4 = merkleTrieTokenId1.getHexProof(
            ethers.utils.solidityKeccak256(
                ["address", "uint256", "uint256"],
                [recipientsTokenId1[1].address, recipientsTokenId1[1].tokenId, recipientsTokenId1[1].amount],
            ),
        );

        // deploy contract
        reputationBadge = <IReputationBadge>await deploy("ReputationBadge", admin, [admin.address]);
        await reputationBadge.deployed();

        // setup access roles
        await reputationBadge.connect(admin).grantRole(MANAGER_ROLE, manager.address);
        await reputationBadge.connect(admin).grantRole(RESOURCE_MANAGER_ROLE, resourceManager.address);

        // manager publishes claim data to initiate minting
        expiration = await blockchainTime.secondsFromNow(3600); // 1 hour
        const claimDataTokenId0: ClaimData = {
            tokenId: 0,
            claimRoot: rootTokenId0,
            claimExpiration: expiration,
            mintPrice: 0,
        };
        const claimDataTokenId1: ClaimData = {
            tokenId: 1,
            claimRoot: rootTokenId1,
            claimExpiration: expiration,
            mintPrice: ethers.utils.parseEther("0.1"),
        };

        await reputationBadge.connect(manager).publishRoots([claimDataTokenId0, claimDataTokenId1]);
    });

    it("Invalid constructor", async () => {
        // invalid manager
        await expect(deploy("ReputationBadge", admin, [ethers.constants.AddressZero])).to.be.revertedWith(
            "RB_ZeroAddress()",
        );
    });

    it("Validate published roots", async () => {
        const root0 = await reputationBadge.claimRoots(0);
        expect(root0).to.equal(rootTokenId0);

        const root1 = await reputationBadge.claimRoots(1);
        expect(root1).to.equal(rootTokenId1);
    });

    describe("Mint", async () => {
        it("Mint NFTs", async () => {
            // users mint
            await reputationBadge.connect(user1).mint(user1.address, 0, 1, 1, proofUser1);
            await reputationBadge.connect(user1).mint(user2.address, 0, 2, 2, proofUser2);

            // check balances
            expect(await reputationBadge.balanceOf(user1.address, 0)).to.equal(1);
            expect(await reputationBadge.balanceOf(user2.address, 0)).to.equal(2);

            // user 1 tries to mint again
            await expect(reputationBadge.connect(user1).mint(user1.address, 0, 1, 1, proofUser1)).to.be.revertedWith(
                `RB_InvalidClaimAmount(1, 1)`,
            );

            // user 2 tries to mint again
            await expect(reputationBadge.connect(user1).mint(user2.address, 0, 2, 2, proofUser2)).to.be.revertedWith(
                `RB_InvalidClaimAmount(2, 2)`,
            );
        });

        it("Cost to mint and manager withdraws ETH", async () => {
            // get balance before
            const balanceBefore = await ethers.provider.getBalance(manager.address);
            // mint
            await reputationBadge
                .connect(user3)
                .mint(user3.address, 1, 1, 1, proofUser3, { value: ethers.utils.parseEther("0.1") });
            await reputationBadge
                .connect(user4)
                .mint(user4.address, 1, 2, 2, proofUser4, { value: ethers.utils.parseEther("0.1") });

            // check balances
            expect(await reputationBadge.balanceOf(user3.address, 1)).to.equal(1);
            expect(await reputationBadge.balanceOf(user4.address, 1)).to.equal(2);
            expect(await ethers.provider.getBalance(reputationBadge.address)).to.equal(ethers.utils.parseEther("0.2"));

            // manager withdraws ETH
            const res = await reputationBadge.connect(manager).withdrawFees();
            const gas = (await res.wait()).gasUsed.mul(res.gasPrice);

            // check balance
            expect(await ethers.provider.getBalance(reputationBadge.address)).to.equal(0);
            expect(await ethers.provider.getBalance(manager.address)).to.equal(
                balanceBefore.add(ethers.utils.parseEther("0.2")).sub(gas),
            );
        });

        it("Invalid proof", async () => {
            const claimDataTokenId0: ClaimData = {
                tokenId: 0,
                claimRoot: ethers.utils.solidityKeccak256(["bytes32"], [ethers.utils.randomBytes(32)]),
                claimExpiration: expiration,
                mintPrice: 0,
            };
            await reputationBadge.connect(manager).publishRoots([claimDataTokenId0]);

            // invalid proof
            await expect(reputationBadge.connect(user1).mint(user1.address, 0, 1, 1, proofUser2)).to.be.revertedWith(
                "RB_InvalidMerkleProof()",
            );
        });

        it("Invalid mint fee", async () => {
            // mint
            await expect(reputationBadge.connect(user3).mint(user3.address, 1, 1, 1, proofUser3)).to.be.revertedWith(
                `RB_InvalidMintFee(${ethers.utils.parseEther("0.1")}, ${ethers.utils.parseEther("0")})`,
            );
        });

        it("After expiration", async () => {
            // increase time
            await blockchainTime.increaseTime(3600);

            // get current block time
            const timeNow = await blockchainTime.secondsFromNow(0);
            // mint
            await expect(reputationBadge.connect(user1).mint(user1.address, 0, 1, 1, proofUser1)).to.be.revertedWith(
                `RB_ClaimingExpired(${expiration}, ${timeNow + 1})`,
            );
        });
    });

    describe("Token URI", async () => {
        it("Gets tokenURI for specific value", async () => {
            // set tokenURI
            await reputationBadge.connect(resourceManager).setBaseURI("https://www.domain.com/");

            // mint
            await reputationBadge.connect(user1).mint(user1.address, 0, 1, 1, proofUser1);

            // check tokenURI
            expect(await reputationBadge.uri(0)).to.equal("https://www.domain.com/0");
        });

        it("No base URI", async () => {
            // mint
            await reputationBadge.connect(user1).mint(user1.address, 0, 1, 1, proofUser1);

            // rug token URI
            await reputationBadge.connect(resourceManager).setBaseURI("");

            // check tokenURI
            expect(await reputationBadge.uri(0)).to.equal("");
        });
    });

    describe("Permissions", async () => {
        it("Other users try to call protected functions", async () => {
            // try to set token claim data
            const claimDataTokenId0: ClaimData = {
                tokenId: 0,
                claimRoot: ethers.utils.solidityKeccak256(["bytes32"], [ethers.utils.randomBytes(32)]),
                claimExpiration: expiration,
                mintPrice: 0,
            };
            await expect(reputationBadge.connect(user1).publishRoots([claimDataTokenId0])).to.be.revertedWith(
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
    });
});
