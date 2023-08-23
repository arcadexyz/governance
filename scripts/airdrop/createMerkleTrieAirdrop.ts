import { ethers } from "ethers";
import fs from "fs";
import { MerkleTree } from "merkletreejs";

import airdropData from "./data/airdropData.json";

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
            const proof = merkleTrie.getHexProof(
                ethers.utils.solidityKeccak256(["address", "uint256"], [account.address, amount]),
            );

            return {
                address: account.address,
                value: account.value,
                proof: proof,
            };
        }),
    );

    fs.writeFileSync("scripts/airdrop/proofs/airdropMerkleProofs.json", JSON.stringify(proofs, null, 2));

    console.log("Merkle Root: ", root);
    console.log("Proofs written to scripts/airdrop/proofs/airdropMerkleProofs.json");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
