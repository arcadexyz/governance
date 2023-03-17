import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";

import { TokenTestContext, tokenFixture } from "../utils/tokenFixture";

const { loadFixture } = waffle;

/**
 * Test suite for the ArcadeAirdropper contract.
 */

describe("ArcadeToken", function () {
    let ctxToken: TokenTestContext;

    beforeEach(async function () {
        ctxToken = await loadFixture(tokenFixture);
    });

    describe("Airdrop claims", function () {
        it("all recipients claim airdrop", async function () {
            const { arcToken, arcDst, deployer, other, airdrop, recipients, merkleTrie } = ctxToken;

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(airdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, airdrop.address, ethers.utils.parseEther("10000000"));

            expect(await arcDst.communityAirdropSent()).to.be.true;

            // create proof for deployer and other
            const proofDeployer = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[0].address, recipients[0].value]),
            );
            const proofOther = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[1].address, recipients[1].value]),
            );

            // claims
            await expect(
                await airdrop.connect(deployer).claim(recipients[0].address, recipients[0].value, proofDeployer),
            )
                .to.emit(arcToken, "Transfer")
                .withArgs(airdrop.address, recipients[0].address, recipients[0].value);
            await expect(await airdrop.connect(other).claim(recipients[1].address, recipients[1].value, proofOther))
                .to.emit(arcToken, "Transfer")
                .withArgs(airdrop.address, recipients[1].address, recipients[1].value);

            expect(await arcToken.balanceOf(deployer.address)).to.equal(recipients[0].value);
            expect(await arcToken.balanceOf(other.address)).to.equal(recipients[1].value);
            expect(await arcToken.balanceOf(airdrop.address)).to.equal(
                ethers.utils.parseEther("10000000").sub(recipients[0].value).sub(recipients[1].value),
            );
        });

        it("claim airdrop late but before reclaim is called", async function () {
            const { arcToken, arcDst, deployer, airdrop, recipients, merkleTrie, blockchainTime } = ctxToken;

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(airdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, airdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcDst.communityAirdropSent()).to.be.true;

            // fast forward to after claim period
            await blockchainTime.increaseTime(3600);

            // create proof for deployer
            const proofDeployer = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[0].address, recipients[0].value]),
            );

            // claims
            await expect(
                await airdrop.connect(deployer).claim(recipients[0].address, recipients[0].value, proofDeployer),
            )
                .to.emit(arcToken, "Transfer")
                .withArgs(airdrop.address, recipients[0].address, recipients[0].value);
        });

        it("user tries to claim airdrop with invalid proof", async function () {
            const { arcToken, arcDst, deployer, airdrop, recipients, merkleTrie } = ctxToken;

            const signers: Signer[] = await hre.ethers.getSigners();
            const notUser = signers[2];

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(airdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, airdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcDst.communityAirdropSent()).to.be.true;

            // create proof for deployer and other
            const proofNotUser = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [notUser.address, recipients[0].value]),
            );
            // try to claim with invalid proof
            await expect(
                airdrop.connect(notUser).claim(notUser.address, recipients[0].value, proofNotUser),
            ).to.be.revertedWith("InvalidProof()");
        });

        it("user tries to claim airdrop twice", async function () {
            const { arcToken, arcDst, deployer, airdrop, recipients, merkleTrie } = ctxToken;

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(airdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, airdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcDst.communityAirdropSent()).to.be.true;

            // create proof for deployer
            const proofDeployer = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[0].address, recipients[0].value]),
            );

            // claims
            await expect(
                await airdrop.connect(deployer).claim(recipients[0].address, recipients[0].value, proofDeployer),
            )
                .to.emit(arcToken, "Transfer")
                .withArgs(airdrop.address, recipients[0].address, recipients[0].value);

            // try to claim again
            await expect(
                airdrop.connect(deployer).claim(recipients[0].address, recipients[0].value, proofDeployer),
            ).to.be.revertedWith("AD_AlreadyClaimed()");
        });

        it("user tries to claim airdrop after owner reclaims tokens", async function () {
            const { arcToken, arcDst, deployer, airdrop, recipients, merkleTrie, blockchainTime } = ctxToken;

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(airdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, airdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcDst.communityAirdropSent()).to.be.true;

            // fast forward to after the end of the airdrop claim period
            await blockchainTime.increaseTime(3600);

            // owner reclaims tokens
            await expect(await airdrop.connect(deployer).reclaim())
                .to.emit(arcToken, "Transfer")
                .withArgs(airdrop.address, deployer.address, ethers.utils.parseEther("10000000"));

            // create proof for deployer
            const proofDeployer = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[0].address, recipients[0].value]),
            );

            // claims
            await expect(
                airdrop.connect(deployer).claim(recipients[0].address, recipients[0].value, proofDeployer),
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });

        it("owner reclaims all unclaimed tokens", async function () {
            const { arcToken, arcDst, deployer, other, airdrop, recipients, merkleTrie, blockchainTime } = ctxToken;

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(airdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, airdrop.address, ethers.utils.parseEther("10000000"));

            expect(await arcDst.communityAirdropSent()).to.be.true;

            // create proof for deployer and other
            const proofDeployer = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[0].address, recipients[0].value]),
            );
            const proofOther = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [recipients[1].address, recipients[1].value]),
            );

            // claims
            await expect(
                await airdrop.connect(deployer).claim(recipients[0].address, recipients[0].value, proofDeployer),
            )
                .to.emit(arcToken, "Transfer")
                .withArgs(airdrop.address, recipients[0].address, recipients[0].value);
            await expect(await airdrop.connect(other).claim(recipients[1].address, recipients[1].value, proofOther))
                .to.emit(arcToken, "Transfer")
                .withArgs(airdrop.address, recipients[1].address, recipients[1].value);

            expect(await arcToken.balanceOf(deployer.address)).to.equal(recipients[0].value);
            expect(await arcToken.balanceOf(other.address)).to.equal(recipients[1].value);
            expect(await arcToken.balanceOf(airdrop.address)).to.equal(
                ethers.utils.parseEther("10000000").sub(recipients[0].value).sub(recipients[1].value),
            );

            // advance time past claiming period
            await blockchainTime.increaseTime(3600);

            // reclaim all tokens
            await expect(await airdrop.connect(deployer).reclaim())
                .to.emit(arcToken, "Transfer")
                .withArgs(
                    airdrop.address,
                    deployer.address,
                    ethers.utils.parseEther("10000000").sub(recipients[0].value).sub(recipients[1].value),
                );

            expect(await arcToken.balanceOf(deployer.address)).to.equal(
                ethers.utils.parseEther("10000000").sub(recipients[1].value),
            );
        });

        it("non-owner tries to reclaim all unclaimed tokens", async function () {
            const { arcToken, arcDst, deployer, other, airdrop, blockchainTime } = ctxToken;

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(airdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, airdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcDst.communityAirdropSent()).to.be.true;

            // fast forward to after the end of the airdrop claim period
            await blockchainTime.increaseTime(3600);

            // non-owner tries to reclaim tokens
            await expect(airdrop.connect(other).reclaim()).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("owner trues to reclaim tokens before claiming period is over", async function () {
            const { arcToken, arcDst, deployer, airdrop } = ctxToken;

            await expect(await arcDst.connect(deployer).toCommunityAirdrop(airdrop.address))
                .to.emit(arcDst, "Distribute")
                .withArgs(arcToken.address, airdrop.address, ethers.utils.parseEther("10000000"));
            expect(await arcDst.communityAirdropSent()).to.be.true;

            // non-owner tries to reclaim tokens
            await expect(airdrop.connect(deployer).reclaim()).to.be.revertedWith("AD_ClaimPeriodActive()");
        });

        it("owner sets new merkle root", async function () {
            const { deployer, other, airdrop } = ctxToken;

            // create new airdrop data
            const newRecipients = [
                {
                    address: deployer.address,
                    value: ethers.utils.parseEther("200"),
                },
                {
                    address: other.address,
                    value: ethers.utils.parseEther("200"),
                },
            ];

            // hash leaves
            const leaves = newRecipients.map(recipient => {
                return Buffer.from(
                    ethers.utils
                        .solidityKeccak256(["address", "uint256"], [recipient.address, recipient.value])
                        .slice(2),
                    "hex",
                );
            });

            // create merkle trie
            const newMerkleTrie = new MerkleTree(leaves, keccak256, { sortPairs: true });
            const root = newMerkleTrie.getHexRoot();

            await airdrop.connect(deployer).setMerkleRoot(root);
            expect(await airdrop.merkleRoot()).to.equal(root);
        });

        it("non-owner tries to set new merkle root", async function () {
            const { deployer, other, airdrop } = ctxToken;

            // create new airdrop data
            const newRecipients = [
                {
                    address: deployer.address,
                    value: ethers.utils.parseEther("200"),
                },
                {
                    address: other.address,
                    value: ethers.utils.parseEther("200"),
                },
            ];

            // hash leaves
            const leaves = newRecipients.map(recipient => {
                return Buffer.from(
                    ethers.utils
                        .solidityKeccak256(["address", "uint256"], [recipient.address, recipient.value])
                        .slice(2),
                    "hex",
                );
            });

            // create merkle trie
            const newMerkleTrie = new MerkleTree(leaves, keccak256, { sortPairs: true });
            const root = newMerkleTrie.getHexRoot();

            await expect(airdrop.connect(other).setMerkleRoot(root)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
        });
    });
});
