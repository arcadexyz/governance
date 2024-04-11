import { ethers, BigNumber } from "ethers";
import fs from "fs";
import jsonData from "./data/raw/csvjson.json";


/**
 * This script converts the json data from 100.0 to "100000000000000000000"
 *
 * To run this script use the command: `npx hardhat run scripts/airdrop/createAirdropData.ts`
 */


export async function main() {
    let totalArcd = BigNumber.from(0);
    const airdropData = jsonData.map((account: any) => {
        totalArcd = totalArcd.add(ethers.utils.parseEther((account.value).toString()));

        return {
            address: account.address,
            value: ethers.utils.parseEther((account.value).toString()).toString(),
        };
    });

    console.log("Total ARCD to be airdropped: ", ethers.utils.formatEther(totalArcd));

    fs.writeFileSync("scripts/airdrop/data/airdropData.json", JSON.stringify(airdropData, null, 2));

    console.log("Airdrop data created and saved to scripts/airdrop/data/airdropData.json");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
