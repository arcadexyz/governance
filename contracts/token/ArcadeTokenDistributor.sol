// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/IArcadeToken.sol";

import { AT_AlreadyMinted, AT_ExceedsTotalSupply, AT_ZeroAddress } from "../errors/Token.sol";

contract ArcadeTokenDistributor is Ownable {
    // ====================================== STATE ======================================

    /// @dev The total initial supply of Arcade tokens to be minted by this contract
    uint256 public constant INTIAL_TOKEN_DST = 100_000_000 ether;

    /// @dev A denominator to express a token amount in terms of a percentage.
    uint256 public constant BASIS_POINTS_DENOMINATOR = 10_000;

    /// @dev address of the treasury
    address public treasury;
    /// @dev The percentage of the total supply that is minted to the treasury.
    uint256 public constant TREASURY_PERCENTAGE = 2550;
    /// @dev A flag to indicate if the treasury has already been minted to.
    bool public treasuryMinted;

    /// @dev address of the token development partner
    address public devPartner;
    /// @dev The percentage of the total supply that is minted to the token
    ///      development partner.
    uint256 public constant DEV_PARTNER_PERCENTAGE = 60;
    /// @dev A flag to indicate if the token development partner has already
    ///      been minted to.
    bool public devPartnerMinted;

    /// @dev address to recieve the community rewards
    address public communityRewards;
    /// @dev The percentage of the total supply that is minted to the community
    ///      rewards pool.
    uint256 public constant COMMUNITY_REWARDS_PERCENTAGE = 1500;
    /// @dev A flag to indicate if the community rewards pool has already been
    ///      minted to.
    bool public communityRewardsMinted;

    /// @dev address of the community airdrop contract
    address public communityAirdrop;
    /// @dev The percentage of the total supply that is minted to the community
    ///      airdrop contract.
    uint256 public constant COMMUNITY_AIRDROP_PERCENTAGE = 1000;
    /// @dev A flag to indicate if the community airdrop contract has already been
    ///      minted to.
    bool public communityAirdropMinted;

    /// @dev address responsible for distributing to the Arcade team and launch partners
    address public vesting;
    /// @dev The percentage of the total supply that is minted to the Arcade
    ///      team and launch partners.
    uint256 public constant TOTAL_VESTING_PERCENTAGE = 4890;
    /// @dev A flag to indicate if the Arcade team and launch partners have
    ///      already been minted to.
    bool public vestingMinted;

    // ==================================== CONSTRUCTOR =======================================

    constructor(
        address _treasury,
        address _devPartner,
        address _communityRewards,
        address _communityAirdrop,
        address _vesting
    ) {
        if (_treasury == address(0)) revert AT_ZeroAddress();
        if (_devPartner == address(0)) revert AT_ZeroAddress();
        if (_communityRewards == address(0)) revert AT_ZeroAddress();
        if (_communityAirdrop == address(0)) revert AT_ZeroAddress();
        if (_vesting == address(0)) revert AT_ZeroAddress();

        treasury = _treasury;
        devPartner = _devPartner;
        communityRewards = _communityRewards;
        communityAirdrop = _communityAirdrop;
        vesting = _vesting;
    }

    // ====================================== OWNER OPS ======================================

    /**
     * @notice Mints a predetermined amount of Arcade tokens to the treasury.
     *         This amount is equal to 25.5% of the total supply.
     */
    function mintToTreasury(IArcadeToken token) external onlyOwner {
        if (treasuryMinted) revert AT_AlreadyMinted();

        uint256 amount = (INTIAL_TOKEN_DST * TREASURY_PERCENTAGE) / BASIS_POINTS_DENOMINATOR;
        if (token.totalSupply() + amount > INTIAL_TOKEN_DST) {
            revert AT_ExceedsTotalSupply(amount, INTIAL_TOKEN_DST - token.totalSupply());
        }

        treasuryMinted = true;

        token.mint(treasury, amount);
    }

    /**
     * @notice Mints a predetermined amount of Arcade tokens to token development
     *         partner. This amount is equal to 0.6% of the total supply.
     */
    function mintToDevPartner(IArcadeToken token) external onlyOwner {
        if (devPartnerMinted) revert AT_AlreadyMinted();

        uint256 amount = (INTIAL_TOKEN_DST * DEV_PARTNER_PERCENTAGE) / BASIS_POINTS_DENOMINATOR;
        if (token.totalSupply() + amount > INTIAL_TOKEN_DST) {
            revert AT_ExceedsTotalSupply(amount, INTIAL_TOKEN_DST - token.totalSupply());
        }

        devPartnerMinted = true;

        token.mint(devPartner, amount);
    }

    /**
     * @notice Mints a predetermined amount of Arcade tokens to the community
     *         rewards pool. This amount is equal to 15% of the total supply.
     */
    function mintToCommunityRewards(IArcadeToken token) external onlyOwner {
        if (communityRewardsMinted) revert AT_AlreadyMinted();

        uint256 amount = (INTIAL_TOKEN_DST * COMMUNITY_REWARDS_PERCENTAGE) / BASIS_POINTS_DENOMINATOR;
        if (token.totalSupply() + amount > INTIAL_TOKEN_DST) {
            revert AT_ExceedsTotalSupply(amount, INTIAL_TOKEN_DST - token.totalSupply());
        }

        communityRewardsMinted = true;

        token.mint(communityRewards, amount);
    }

    /**
     * @notice Mints a predetermined amount of Arcade tokens to the community
     *         airdrop contract. This amount is equal to 10% of the total supply.
     */
    function mintToCommunityAirdrop(IArcadeToken token) external onlyOwner {
        if (communityAirdropMinted) revert AT_AlreadyMinted();

        uint256 amount = (INTIAL_TOKEN_DST * COMMUNITY_AIRDROP_PERCENTAGE) / BASIS_POINTS_DENOMINATOR;
        if (token.totalSupply() + amount > INTIAL_TOKEN_DST) {
            revert AT_ExceedsTotalSupply(amount, INTIAL_TOKEN_DST - token.totalSupply());
        }

        communityAirdropMinted = true;

        token.mint(communityAirdrop, amount);
    }

    /**
     * @notice Mints a predetermined amount of Arcade tokens minted to a dedicated multisig.
     *         This amount is equal to 48.9% of the total supply. 32.7% to Arcade's launch
     *         partners and 16.2% to the Arcade team.
     */
    function mintToVesting(IArcadeToken token) external onlyOwner {
        if (vestingMinted) revert AT_AlreadyMinted();

        uint256 amount = (INTIAL_TOKEN_DST * TOTAL_VESTING_PERCENTAGE) / BASIS_POINTS_DENOMINATOR;
        if (token.totalSupply() + amount > INTIAL_TOKEN_DST) {
            revert AT_ExceedsTotalSupply(amount, INTIAL_TOKEN_DST - token.totalSupply());
        }

        vestingMinted = true;

        token.mint(vesting, amount);
    }

}
