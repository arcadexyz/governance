export const DEPLOYER_ADDRESS = "0x0a606524006a48C4D93662aA935AEC203CaC98C1"; // deployer wallet

export const TREASURY_OWNER = "0x0a606524006a48C4D93662aA935AEC203CaC98C1"; // change to multisig!

export const TIMELOCK_WAIT_TIME = 3600 * 24 * 3; // 3 days (3 days allows for a grace period that is longer than a weekend)
export const STALE_BLOCK_LAG = 17046361; // Apr-14-2023 03:57:47 PM +UTC

export const BASE_QUORUM = 10; // default quorum for a vote to pass through standard core voting contract
export const MIN_PROPOSAL_POWER = 3; // minimum proposal power

export const BASE_QUORUM_GSC = 10; // default GSC quorum for a vote to pass, each GSC member has 1 vote
export const MIN_PROPOSAL_POWER_GSC = 1; // minimum GSC proposal power, this is 1 so any GSC member can propose
export const GSC_THRESHOLD = 3; // GSC threshold, (minimum voting power needed to be a GSC member)
