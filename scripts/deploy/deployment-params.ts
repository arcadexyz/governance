export const DEPLOYER_ADDRESS = "0x0a606524006a48C4D93662aA935AEC203CaC98C1"; // deployer wallet

export const TREASURY_OWNER = "0x0a606524006a48C4D93662aA935AEC203CaC98C1"; // change to multisig!
export const TEAM_VESTING_VAULT_MANAGER = "0x0a606524006a48C4D93662aA935AEC203CaC98C1"; // change to multisig!

export const TIMELOCK_WAIT_TIME = 3600 * 24 * 3; // 3 days (3 days allows for a grace period that is longer than a weekend)
export const GSC_MIN_LOCK_DURATION = 3600 * 24 * 3; // 7 days

export const BASE_QUORUM = 4000000; // default quorum for a vote to pass through standard core voting contract
export const MIN_PROPOSAL_POWER_CORE_VOTING = 20000; // minimum proposal power

export const BASE_QUORUM_GSC = 3; // default GSC quorum for a vote to pass, each GSC member has 1 vote
export const MIN_PROPOSAL_POWER_GSC = 1; // minimum GSC proposal power, this is 1 so any GSC member can propose
export const GSC_THRESHOLD = 75000; // GSC threshold, (minimum voting power needed to be a GSC member)

export const AIRDROP_EXPIRATION = 1688254873; // unix timestamp for airdrop expiration
export const AIRDROP_MERKLE_ROOT = ""; // change to actual merkle root
