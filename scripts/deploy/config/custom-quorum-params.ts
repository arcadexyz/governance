import { ethers } from "hardhat";

///////////////////////////////
////// Quorum Thresholds //////
///////////////////////////////

// ArcadeCoreVoting
export const CV_DEFAULT_QUORUM = ethers.utils.parseEther("1500000");
export const CV_MEDIUM_QUORUM = ethers.utils.parseEther("3000000");
export const CV_HIGH_QUORUM = ethers.utils.parseEther("6000000");
export const CV_VERY_HIGH_QUORUM = ethers.utils.parseEther("25000000");

// ArcadeGSCCoreVoting
export const GSC_DEFAULT_QUORUM = "3";
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
export const INCREASE_TIME_QUORUM = CV_HIGH_QUORUM;
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

// NFTBoostVault - unlock
export const UNLOCK = "0xa69df4b5";
export const UNLOCK_QUORUM = CV_HIGH_QUORUM;
// NFTBoostVault - setAirdropContract
export const SET_AIRDROP_CONTRACT = "0x6f011538";
export const SET_AIRDROP_CONTRACT_QUORUM = CV_HIGH_QUORUM;

/////// V3 Lending Protocol ///////

// OriginationController
export const ORIGINATION_CONTROLLER_ADDR = "0xB7BFcca7D7ff0f371867B770856FAc184B185878";
// LoanCore
export const LOAN_CORE_ADDR = "0x89bc08BA00f135d608bc335f6B33D7a9ABCC98aF";

// LoanCore - pause
export const PAUSE = "0xfc0e74d1";
export const PAUSE_QUORUM = GSC_HIGH_QUORUM;

// OriginationController - setAllowedVerifiers
export const SET_ALLOWED_VERIFIERS = "0x34d95a51";
export const SET_ALLOWED_VERIFIERS_QUORUM = CV_HIGH_QUORUM;
// OriginationController - setAllowedPayableCurrencies
export const SET_ALLOWED_PAYABLE_CURRENCIES = "0x6db75724";
export const SET_ALLOWED_PAYABLE_CURRENCIES_QUORUM = CV_HIGH_QUORUM;
