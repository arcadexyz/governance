// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/IArcadeToken.sol";

import { AT_AlreadySent, AT_ZeroAddress } from "../errors/Token.sol";

/**
 * @title Arcade Token Distributor
 * @author Non-Fungible Technologies, Inc.
 *
 * A  contract that is responsible for the distribution of Arcade Tokens to the Arcade team,
 * launch partners, community rewards pool, community airdrop contract, and the Arcade treasury,
 * and the tokens development partner. Once each minting function has been called, the
 * corresponding flag is set to true and the function cannot be called again.
 *
 * Upon deployment of the Arcade Token, this contract is set as the Arcade Token's minter. After
 * all the transfer functions in this contract have been called, the owner of this contract shall
 * transfer the minter role to the Arcade Token's governance timelock contract.
 */
contract ArcadeTokenDistributor is Ownable {
    // ============================================= STATE =============================================

    /// @notice Address of the treasury
    address public treasury;
    /// @notice 25.5% of initial distribution is for the treasury
    uint256 public immutable treasuryAmount = 25500000 ether;
    /// @notice A flag to indicate if the treasury has already been transferred to
    bool public treasurySent;

    /// @notice Address of the token's development partner
    address public devPartner;
    /// @notice 0.6% of initial distribution is for the token development partner
    uint256 public immutable devPartnerAmount = 600000 ether;
    /// @notice A flag to indicate if the token development partner has already been transferred to.
    bool public devPartnerSent;

    /// @notice Address to receive the community rewards
    address public communityRewards;
    /// @notice 15% of initial distribution is for the community rewards pool
    uint256 public immutable communityRewardsAmount = 15000000 ether;
    /// @notice A flag to indicate if the community rewards pool has already been transferred to
    bool public communityRewardsSent;

    /// @notice Address of the community airdrop contract
    address public communityAirdrop;
    /// @notice 10% of initial distribution is for the community airdrop contract
    uint256 public immutable communityAirdropAmount = 10000000 ether;
    /// @notice A flag to indicate if the community airdrop contract has already been transferred to
    bool public communityAirdropSent;

    /// @notice Address responsible for distributing to the Arcade team and launch partners
    address public vesting;
    /// @notice 48.9% of initial distribution is for the Arcade team and launch partners
    ///         The end percentages are 32.7% to Arcade's launch partners and 16.2% to the team
    uint256 public immutable vestingAmount = 48900000 ether;
    /// @notice A flag to indicate if the Arcade team and launch partners have already been transferred to
    bool public vestingSent;

    // ============================================= OWNER OPS =============================================

    /**
     * @notice Transfers a predetermined amount of Arcade Tokens to the treasury.
     *
     * @param token                    The Arcade token contract.
     * @param _treasury                The address of the Arcade treasury.
     */
    function toTreasury(IArcadeToken token, address _treasury) external onlyOwner {
        if (treasurySent) revert AT_AlreadySent();
        if (_treasury == address(0)) revert AT_ZeroAddress();

        treasury = _treasury;
        treasurySent = true;

        token.transfer(_treasury, treasuryAmount);
    }

    /**
     * @notice Transfers a predetermined amount of Arcade Tokens to token's development partner.
     *
     * @param token                    The Arcade token contract.
     * @param _devPartner              The address of the token's development partner.
     */
    function toDevPartner(IArcadeToken token, address _devPartner) external onlyOwner {
        if (devPartnerSent) revert AT_AlreadySent();
        if (_devPartner == address(0)) revert AT_ZeroAddress();

        devPartner = _devPartner;
        devPartnerSent = true;

        token.transfer(_devPartner, devPartnerAmount);
    }

    /**
     * @notice Transfers a predetermined amount of Arcade Tokens to the community rewards pool.
     *
     * @param token                    The Arcade Token contract.
     * @param _communityRewards        The address of the community rewards pool.
     */
    function toCommunityRewards(IArcadeToken token, address _communityRewards) external onlyOwner {
        if (communityRewardsSent) revert AT_AlreadySent();
        if (_communityRewards == address(0)) revert AT_ZeroAddress();

        communityRewards = _communityRewards;
        communityRewardsSent = true;

        token.transfer(_communityRewards, communityRewardsAmount);
    }

    /**
     * @notice Transfers a predetermined amount of Arcade Tokens to the community airdrop contract.
     *
     * @param token                    The Arcade Token contract.
     * @param _communityAirdrop        The address of the community airdrop contract.
     */
    function toCommunityAirdrop(IArcadeToken token, address _communityAirdrop) external onlyOwner {
        if (communityAirdropSent) revert AT_AlreadySent();
        if (_communityAirdrop == address(0)) revert AT_ZeroAddress();

        communityAirdrop = _communityAirdrop;
        communityAirdropSent = true;

        token.transfer(_communityAirdrop, communityAirdropAmount);
    }

    /**
     * @notice Transfers a predetermined amount of Arcade Tokens to a dedicated multisig which is
     *         responsible for distributing Arcade Tokens to the Arcade team and launch partners.
     *
     * @param token                    The Arcade Token contract.
     * @param _vesting                 Address responsible for distributing vesting rewards.
     */
    function toVesting(IArcadeToken token, address _vesting) external onlyOwner {
        if (vestingSent) revert AT_AlreadySent();
        if (_vesting == address(0)) revert AT_ZeroAddress();

        vesting = _vesting;
        vestingSent = true;

        token.transfer(_vesting, vestingAmount);
    }

    /**
     * @notice Relinquishes the minter role in the Arcade Token contract to a new address.
     *
     * @dev This function should only be called after all mint functions have been called
     *      and the newMinter address input is the Arcade Token's governance timelock contract.
     * @dev Only the current minter address stored in the Arcade Token contract can call this
     *      function. As a result, this function can only be called once and can never be
     *      called again.
     *
     * @param token                    The Arcade Token contract.
     * @param newMinter                The address of the new minter.
     */
    function transferMinterRole(IArcadeToken token, address newMinter) external onlyOwner {
        token.setMinter(newMinter);
    }
}
