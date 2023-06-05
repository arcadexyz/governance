import { ethers } from "hardhat";

export const ADMIN_ADDRESS = "0x0a606524006a48C4D93662aA935AEC203CaC98C1"; // deployer wallet

export const DISTRIBUTION_MULTISIG = "0x0a606524006a48C4D93662aA935AEC203CaC98C1"; // change to multisig!
export const TEAM_VESTING_VAULT_MANAGER = "0x0a606524006a48C4D93662aA935AEC203CaC98C1"; // change to multisig!
export const NFT_BOOST_VAULT_MANAGER = "0x0a606524006a48C4D93662aA935AEC203CaC98C1"; // change to multisig!

export const TIMELOCK_WAIT_TIME = 3600 * 24 * 3; // 3 days (3 days allows for a grace period that is longer than a weekend)
export const GSC_MIN_LOCK_DURATION = 3600 * 24 * 3; // 7 days

export const BASE_QUORUM = 4000000; // default quorum for a vote to pass through standard core voting contract
export const MIN_PROPOSAL_POWER_CORE_VOTING = 20000; // minimum proposal power

export const BASE_QUORUM_GSC = 3; // default GSC quorum for a vote to pass, each GSC member has 1 vote
export const MIN_PROPOSAL_POWER_GSC = 1; // minimum GSC proposal power, this is 1 so any GSC member can propose
export const GSC_THRESHOLD = 75000; // GSC threshold, (minimum voting power needed to be a GSC member)

export const STALE_BLOCK_LAG = 9126594; // number of blocks to wait before a vote can be executed

export const AIRDROP_EXPIRATION = 1688254873; // unix timestamp for airdrop expiration
export const AIRDROP_MERKLE_ROOT = ethers.constants.HashZero; // change to actual merkle root

export const BADGE_DESCRIPTOR_BASE_URI = "https://arcade.xyz/"; // base uri for badge descriptors

export const REPUTATION_BADGE_ADMIN = "0x21aDafAA34d250a4fa0f8A4d2E2424ABa0cEE563"; // change to multisig, cannot be same as manager!
export const REPUTATION_BADGE_MANAGER = "0x0a606524006a48C4D93662aA935AEC203CaC98C1"; // change to multisig!
export const REPUTATION_BADGE_RESOURCE_MANAGER = "0x0a606524006a48C4D93662aA935AEC203CaC98C1"; // change to multisig!
