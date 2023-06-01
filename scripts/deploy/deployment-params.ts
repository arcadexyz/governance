export const DEPLOYER_ADDRESS = "0x0a606524006a48C4D93662aA935AEC203CaC98C1"; // deployer wallet

export const TREASURY_OWNER = "0x0a606524006a48C4D93662aA935AEC203CaC98C1"; // change to multisig!
export const TEAM_VESTING_VAULT_MANAGER = "0x0a606524006a48C4D93662aA935AEC203CaC98C1"; // change to multisig!

export const TIMELOCK_WAIT_TIME = 3600 * 24 * 3; // 3 days (3 days allows for a grace period that is longer than a weekend)

export const BASE_QUORUM = 4000000; // default quorum for a vote to pass through standard core voting contract
export const MIN_PROPOSAL_POWER = 10000; // minimum proposal power

export const BASE_QUORUM_GSC = 3; // default GSC quorum for a vote to pass, each GSC member has 1 vote
export const MIN_PROPOSAL_POWER_GSC = 1; // minimum GSC proposal power, this is 1 so any GSC member can propose
export const GSC_THRESHOLD = 75000; // GSC threshold, (minimum voting power needed to be a GSC member)

export const AIRDROP_EXPIRATION = 3600 * 24 * 30 / 12; // 30 days / 1 block per 12 seconds
