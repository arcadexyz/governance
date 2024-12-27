import * as fs from 'fs/promises';
import season2 from "./data/raw/season2.json";
import season3 from "./data/raw/season3.json";
import season4 from "./data/raw/season4.json";

/**
 * This script combines the data from all seasons into a single file so that there is only one airdrop file with no duplicates
 *
 * To run this script use the command: `npx hardhat run scripts/airdrop/combineSeasonData.ts`
 */

interface AirdropEntry {
    address: string;
    value: number;
}

function calculateTotal(entries: AirdropEntry[]): number {
    return entries.reduce((sum, entry) => sum + entry.value, 0);
}

async function mergeAirdropFiles(): Promise<void> {
    try {
        // Calculate individual season totals
        const season2Total = calculateTotal(season2);
        const season3Total = calculateTotal(season3);
        const season4Total = calculateTotal(season4);
        const sumOfSeasons = season2Total + season3Total + season4Total;

        console.log('\nIndividual Season Totals:');
        console.log('------------------------');
        console.log(`Season 2 Total: ${season2Total.toLocaleString()} tokens`);
        console.log(`Season 3 Total: ${season3Total.toLocaleString()} tokens`);
        console.log(`Season 4 Total: ${season4Total.toLocaleString()} tokens`);
        console.log(`Sum of all seasons: ${sumOfSeasons.toLocaleString()} tokens`);

        // Create a map to store combined values
        const combinedMap = new Map<string, number>();

        // Function to add entries to the map
        const addEntries = (entries: AirdropEntry[]) => {
            entries.forEach(entry => {
                const currentValue = combinedMap.get(entry.address.toLowerCase()) || 0;
                combinedMap.set(entry.address.toLowerCase(), currentValue + entry.value);
            });
        };

        // Add all entries from each season
        addEntries(season2);
        addEntries(season3);
        addEntries(season4);

        // Convert map back to array format
        const mergedData = Array.from(combinedMap).map(([address, value]) => ({
            address,
            value
        }));

        // Sort by value in descending order
        mergedData.sort((a, b) => b.value - a.value);

        // Calculate combined total
        const combinedTotal = calculateTotal(mergedData);

        // Write the merged data to output file
        await fs.writeFile(
            './scripts/airdrop/data/combined/combined_airdrop_data.json',
            JSON.stringify(mergedData, null, 2)
        );

        console.log('\nMerged Data Statistics:');
        console.log('----------------------');
        console.log(`Total unique addresses: ${mergedData.length.toLocaleString()}`);
        console.log(`Combined total tokens: ${combinedTotal.toLocaleString()}`);

        // Check for discrepancy
        const discrepancy = combinedTotal - sumOfSeasons;
        if (discrepancy !== 0) {
            console.log('\nDiscrepancy Detected:');
            console.log('-------------------');
            console.log(`Difference: ${discrepancy.toLocaleString()} tokens`);
            console.log(`Combined total ${combinedTotal > sumOfSeasons ? 'exceeds' : 'is less than'} sum of individual seasons`);
        } else {
            console.log('\nNo discrepancy found - totals match perfectly!');
        }

    } catch (error) {
        console.error('Error merging files:', error);
        throw error;
    }
}

async function main() {
    await mergeAirdropFiles();
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });