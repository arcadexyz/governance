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
 * A contract that is responsible for the distribution of Arcade Tokens to the Arcade team,
 * launch partners, community rewards pool, community airdrop contract, the Arcade treasury,
 * and the token's development partner. Once each transfer function has been called, the
 * corresponding flag is set to true and the function cannot be called again. Once all of the
 * flags are set to true, the Arcade Token Distributor contract is no longer needed and should
 * not hold any tokens.
 */
contract ArcadeTokenDistributor is Ownable {
    // ============================================= STATE =============================================

    /// @notice 25.5% of initial distribution is for the treasury
    uint256 public constant treasuryAmount = 25_500_000 ether;
    /// @notice A flag to indicate if the treasury has already been transferred to
    bool public treasurySent;

    /// @notice 0.6% of initial distribution is for the token development partner
    uint256 public constant devPartnerAmount = 600_000 ether;
    /// @notice A flag to indicate if the token development partner has already been transferred to.
    bool public devPartnerSent;

    /// @notice 15% of initial distribution is for the community rewards pool
    uint256 public constant communityRewardsAmount = 15_000_000 ether;
    /// @notice A flag to indicate if the community rewards pool has already been transferred to
    bool public communityRewardsSent;

    /// @notice 10% of initial distribution is for the community airdrop contract
    uint256 public constant communityAirdropAmount = 10_000_000 ether;
    /// @notice A flag to indicate if the community airdrop contract has already been transferred to
    bool public communityAirdropSent;

    /// @notice 48.9% of initial distribution is for the Arcade team and launch partners
    ///         The end percentages are 32.7% to Arcade's launch partners and 16.2% to the team
    uint256 public constant vestingAmount = 48_900_000 ether;
    /// @notice A flag to indicate if the Arcade team and launch partners have already been transferred to
    bool public vestingSent;

    /// @notice Emitted when Arcade Tokens are distributed to any recipient address
    event DistributeBatch(address token, address recipient, uint256 amount);

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

        treasurySent = true;

        token.transfer(_treasury, treasuryAmount);

        emit DistributeBatch(address(token), _treasury, treasuryAmount);
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

        devPartnerSent = true;

        token.transfer(_devPartner, devPartnerAmount);

        emit DistributeBatch(address(token), _devPartner, devPartnerAmount);
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

        communityRewardsSent = true;

        token.transfer(_communityRewards, communityRewardsAmount);

        emit DistributeBatch(address(token), _communityRewards, communityRewardsAmount);
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

        communityAirdropSent = true;

        token.transfer(_communityAirdrop, communityAirdropAmount);

        emit DistributeBatch(address(token), _communityAirdrop, communityAirdropAmount);
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

        vestingSent = true;

        token.transfer(_vesting, vestingAmount);

        emit DistributeBatch(address(token), _vesting, vestingAmount);
    }
}
