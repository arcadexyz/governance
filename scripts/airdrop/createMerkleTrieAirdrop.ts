import { ethers } from "ethers";
import fs from "fs";
import { MerkleTree } from "merkletreejs";

import airdropData from "./data/airdropDataFinalBase.json";

/**
 * This script creates a merkle tree from airdropData.json file and writes the merkle proofs to a file.
 * The merkle root for these proofs is printed to the console.
 *
 * To run this script use the command: `npx hardhat run scripts/airdrop/createMerkleTrieAirdrop.ts`
 */

interface Account {
    address: string;
    value: number;
}

async function getMerkleTree(accounts: Account[]) {
    const leaves = await Promise.all(
        accounts.map(account =>
            ethers.utils.solidityKeccak256(
                ["address", "uint256"],
                [account.address, ethers.utils.parseEther(account.value.toString())],
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
    const merkleTrie = await getMerkleTree(airdropData);
    const root = merkleTrie.getHexRoot();

    const proofs = await Promise.all(
        airdropData.map(async account => {
            const amount = ethers.utils.parseEther(account.value.toString());

            const leaf = ethers.utils.solidityKeccak256(["address", "uint256"], [account.address, amount]);

            const proof = merkleTrie.getHexProof(leaf);

            // validate the proof data
            const isValid = merkleTrie.verify(proof, leaf, root);
            if (!isValid) {
                console.log("Invalid proof for account: ", account);
                throw new Error("Invalid proof");
            }

            return {
                address: account.address,
                value: amount.toString(),
                proof: proof,
            };
        }),
    );

    fs.writeFileSync("./scripts/airdrop/proofs/airdropMerkleProofs.json", JSON.stringify(proofs, null, 2));

    console.log("Merkle Root: ", root);
    console.log("Proofs written to ./scripts/airdrop/proofs/airdropMerkleProofs2.json");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
