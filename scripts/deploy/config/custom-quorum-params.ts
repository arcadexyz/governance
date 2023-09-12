import { ethers } from "hardhat";

///////////////////////////////
////// Quorum Thresholds //////
///////////////////////////////

// ArcadeCoreVoting
export const CV_MEDIUM_QUORUM = ethers.utils.parseEther("3000000");
export const CV_HIGH_QUORUM = ethers.utils.parseEther("6000000");
export const CV_VERY_HIGH_QUORUM = ethers.utils.parseEther("25000000");

// ArcadeGSCCoreVoting
export const GSC_MEDIUM_QUORUM = "6";
export const GSC_HIGH_QUORUM = "12";

////////////////////////////
////// Custom Quorums //////
////////////////////////////

//////// Governance ////////

// ArcadeToken - mintTokens
export const MINT_TOKENS = "0x40c10f19";
export const MINT_TOKENS_QUORUM = CV_VERY_HIGH_QUORUM;
// ArcadeToken - setMinter
export const SET_MINTER = "0xfca3b5aa";
export const SET_MINTER_QUORUM = CV_VERY_HIGH_QUORUM;

// Timelock - registerCall
export const REGISTER_CALL = "0x88b49b83";
export const REGISTER_CALL_QUORUM = CV_HIGH_QUORUM;
// Timelock - increaseTime
export const INCREASE_TIME = "0x821127d4";
export const INCREASE_TIME_QUORUM = GSC_HIGH_QUORUM;
// Timelock - setWaitTime
export const SET_WAIT_TIME = "0xdf351aaf";
export const SET_WAIT_TIME_QUORUM = CV_HIGH_QUORUM;

// Treasury - mediumSpend
export const MEDIUM_SPEND = "0xfe3738c0";
export const MEDIUM_SPEND_QUORUM = CV_MEDIUM_QUORUM;
// Treasury - largeSpend
export const LARGE_SPEND = "0xfbada999";
export const LARGE_SPEND_QUORUM = CV_HIGH_QUORUM;
// Treasury - approveMediumSpend
export const APPROVE_MEDIUM_SPEND = "0x264337eb";
export const APPROVE_MEDIUM_SPEND_QUORUM = CV_MEDIUM_QUORUM;
// Treasury - approveLargeSpend
export const APPROVE_LARGE_SPEND = "0x321d7e02";
export const APPROVE_LARGE_SPEND_QUORUM = CV_HIGH_QUORUM;

// NFTBoostVault - setAirdropContract
export const SET_AIRDROP_CONTRACT = "0x6f011538";
export const SET_AIRDROP_CONTRACT_QUORUM = CV_HIGH_QUORUM;

/////// V3 Lending Protocol ///////

// CallWhitelistAllExtensions
export const CALL_WHITELIST_ALL_EXTENSIONS_ADDR = "0x7354334e99Dcd64F964510129215Aa28aad887BC"; // goerli
// Vault factory
export const VAULT_FACTORY_ADDR = "0x8fB52cb2bb677464b3ae9755925dE08a78Ddac18"; // goerli
// FeeController
export const FEE_CONTROLLER_ADDR = "0xa66Ccb968392Cd6652E32b8768Ae6343A65400cF"; // goerli
// OriginationController
export const ORIGINATION_CONTROLLER_ADDR = "0xB74C4B3f3ea71E2FFB382c633FF66527978FDCe8"; // goerli
// LoanCore
export const LOAN_CORE_ADDR = "0xFfaE061d1e2d416bc3B8320145277052dba68923"; // goerli

// Common AccessControl function selectors
export const GRANT_ROLE = "0x2f2ff15d";
export const REVOKE_ROLE = "0xd547741f";
export const RENOUNCE_ROLE = "0x36568abe";

// CallWhitelistAllExtensions - add
export const ADD = "0x2dba161f";
export const ADD_QUORUM = CV_MEDIUM_QUORUM;
// CallWhitelistAllExtensions - setApproval
export const SET_APPROVAL = "0xb048ea08";
export const SET_APPROVAL_QUORUM = CV_MEDIUM_QUORUM;
// CallWhitelistAllExtensions - setRegistry
export const SET_REGISTRY = "0xa91ee0dc";
export const SET_REGISTRY_QUORUM = CV_MEDIUM_QUORUM;
// CallWhitelistAllExtensions - grantRole
export const CWA_GRANT_ROLE_QUORUM = CV_HIGH_QUORUM;
// CallWhitelistAllExtensions - revokeRole
export const CWA_REVOKE_ROLE_QUORUM = CV_HIGH_QUORUM;
// CallWhitelistAllExtensions - renounceRole
export const CWA_RENOUNCE_ROLE_QUORUM = CV_HIGH_QUORUM;

// VaultFactory - grantRole
export const VF_GRANT_ROLE_QUORUM = CV_MEDIUM_QUORUM;
// VaultFactory - revokeRole
export const VF_REVOKE_ROLE_QUORUM = CV_MEDIUM_QUORUM;

// FeeController - transferOwnership
export const TRANSFER_OWNERSHIP = "0xf2fde38b";
export const TRANSFER_OWNERSHIP_QUORUM = CV_HIGH_QUORUM;

// LoanCore - shutdown
export const SHUTDOWN = "0xfc0e74d1";
export const SHUTDOWN_QUORUM = GSC_HIGH_QUORUM;
// LoanCore - grantRole
export const LC_GRANT_ROLE_QUORUM = CV_VERY_HIGH_QUORUM;
// LoanCore - revokeRole
export const LC_REVOKE_ROLE_QUORUM = CV_VERY_HIGH_QUORUM;
// LoanCore - renounceRole
export const LC_RENOUNCE_ROLE_QUORUM = CV_VERY_HIGH_QUORUM;

// OriginationController - setAllowedVerifiers
export const SET_ALLOWED_VERIFIERS = "0x34d95a51";
export const SET_ALLOWED_VERIFIERS_QUORUM = CV_HIGH_QUORUM;
// OriginationController - setAllowedPayableCurrencies
export const SET_ALLOWED_PAYABLE_CURRENCIES = "0x6db75724";
export const SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM = CV_HIGH_QUORUM;
// OriginationController - grantRole
export const OC_GRANT_ROLE_QUORUM = CV_HIGH_QUORUM;
// OriginationController - revokeRole
export const OC_REVOKE_ROLE_QUORUM = CV_HIGH_QUORUM;
// OriginationController - renounceRole
export const OC_RENOUNCE_ROLE_QUORUM = CV_HIGH_QUORUM;
