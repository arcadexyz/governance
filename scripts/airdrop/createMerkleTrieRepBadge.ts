import { ethers } from "ethers";
import fs from "fs";
import { MerkleTree } from "merkletreejs";

import repBadgeData from "./data/repBadgeDataBronze.json";

/**
 * This script creates a merkle tree from repBadgeData.json file and writes the merkle proofs to a file.
 * The merkle root for these proofs is printed to the console.
 *
 * To run this script use the command: `npx hardhat run scripts/airdrop/createMerkleTrieRepBadge.ts`
 */

interface Account {
    address: string;
    tokenId: number;
    amount: number;
}

async function getMerkleTree(accounts: Account[]) {
    const leaves = await Promise.all(
        accounts.map(account =>
            ethers.utils.solidityKeccak256(
                ["address", "uint256", "uint256"],
                [account.address, account.tokenId.toString(), account.amount.toString()],
            ),
        ),
    );

    return new MerkleTree(leaves, keccak256Custom, {
        hashLeaves: false,
        sortPairs: true,
    });
}

function keccak256Custom(bytes: Buffer) {
    const buffHash = ethers.utils.solidityKeccak256(["bytes"], ["0x" + bytes.toString("hex")]);

    return Buffer.from(buffHash.slice(2), "hex");
}

export async function main() {
    const merkleTrie = await getMerkleTree(repBadgeData);
    const root = merkleTrie.getHexRoot();

    const proofs = await Promise.all(
        repBadgeData.map(async account => {
            const leaf = ethers.utils.solidityKeccak256(
                ["address", "uint256", "uint256"],
                [account.address, account.tokenId.toString(), account.amount.toString()],
            );

            const proof = merkleTrie.getHexProof(leaf);

            // validate the proof data
            const isValid = merkleTrie.verify(proof, leaf, root);
            if (!isValid) {
                console.log("Invalid proof for account: ", account);
                throw new Error("Invalid proof");
            }

            return {
                address: account.address,
                value: account.amount,
                tokenId: account.tokenId,
                proof: proof,
            };
        }),
    );

    fs.writeFileSync("./scripts/airdrop/proofs/repBadgeMerkleProofsBronze.json", JSON.stringify(proofs, null, 2));

    console.log("Merkle Root: ", root);
    console.log("Proofs written to ./scripts/airdrop/proofs/repBadgeMerkleProofsBronze.json");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
