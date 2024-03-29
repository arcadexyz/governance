import { ethers } from "hardhat";

export const LAUNCH_PARTNER_MULTISIG = "0x398e92C827C5FA0F33F171DC8E20570c5CfF330e"; // mainnet
export const FOUNDATION_MULTISIG = "0xE004727641b3C9A2441eE21fa73BEc51f6029543"; // mainnet
export const VESTING_MANAGER_MULTISIG = "0x398e92C827C5FA0F33F171DC8E20570c5CfF330e"; // mainnet

export const ADMIN_ROLE = ethers.utils.id("ADMIN");
export const CORE_VOTING_ROLE = ethers.utils.id("CORE_VOTING");
export const GSC_CORE_VOTING_ROLE = ethers.utils.id("GSC_CORE_VOTING");
export const BADGE_MANAGER_ROLE = ethers.utils.id("BADGE_MANAGER");
export const RESOURCE_MANAGER_ROLE = ethers.utils.id("RESOURCE_MANAGER");
export const FEE_CLAIMER_ROLE = ethers.utils.id("FEE_CLAIMER");

export const TIMELOCK_WAIT_TIME = 19488; // ~3 days in blocks (3 days allows for a grace period that is longer than a weekend)
export const GSC_MIN_LOCK_DURATION = 2165; // ~8 hours in blocks

export const BASE_QUORUM = ethers.utils.parseEther("1500000"); // default quorum for a vote to pass through core voting contract
export const MIN_PROPOSAL_POWER_CORE_VOTING = ethers.utils.parseEther("20000"); // minimum proposal power

export const BASE_QUORUM_GSC = 3; // default GSC quorum for a vote to pass
export const MIN_PROPOSAL_POWER_GSC = 1; // minimum GSC proposal power, this is 1 so any GSC member can propose
export const GSC_THRESHOLD = ethers.utils.parseEther("600000"); // GSC threshold, (minimum voting power needed to be a GSC member)

export const STALE_BLOCK_LAG = 200000; // number of blocks before voting power is pruned. 200000 blocks is ~1 month. Needs to be more than a typical voting period.

export const VESTING_DURATION = 5229850; // (3600*24*365*2) / 12.06 sec/block ~= 2 years in blocks

export const AIRDROP_DURATION = 15552000; // ~6 months in seconds
export const AIRDROP_EXPIRATION = Math.floor(Date.now() / 1000) + AIRDROP_DURATION;
export const AIRDROP_MERKLE_ROOT = ethers.constants.HashZero;

export const BADGE_DESCRIPTOR_BASE_URI = ""; // UPDATE!!!

export const BALANCE_QUERY_OWNER = LAUNCH_PARTNER_MULTISIG; // contract used for snapshot voting
