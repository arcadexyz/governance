// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

import "../interfaces/IArcadeToken.sol";

import { AT_AlreadyMinted, AT_ExceedsTotalSupply, AT_ZeroAddress } from "../errors/Token.sol";

/**
 *                                   _
 *                                  | |
 *    _____   ____  ____  _____   __| | _____     _   _  _   _  _____
 *   (____ | / ___)/ ___)(____ | / _  || ___ |   ( \ / )| | | |(___  )
 *   / ___ || |   ( (___ / ___ |( (_| || ____| _  ) X ( | |_| | / __/
 *   \_____||_|    \____)\_____| \____||_____)(_)(_/ \_) \__  |(_____)
 *                                                      (____/
 *
 *                                                 :--====-::
 *                                            :=*%%%%%%%%%%%%%*=.
 *                                        .=#%%#*+=-----=+*%%%%%%*.
 *                              :=**=:   :=-.               -#%%%%%:
 *                          .=*%%%%%%%%*=.                    #%%%%#
 *                      .-+#%%%%%%%%%%%%%%#+-.                :%%%%%=
 *                  .-+#%%%%%%%%%%%%%%%%%%%%%%#+-.             %%%%%*
 *              .-+#%%%%%%%%%%%%#+::=*%%%%%%%%%%%%#+-.        .%%%%%*
 *           :+#%%%%%%%%%%%%#+-        :=*%%%%%%%%%%%%#+:     -%%%%%+
 *           *%%%%%%%%%%#*-.               :=*%%%%%%%%%%*     #%%%%%:
 *           *%%%%%%%%%%#+:                 -*%%%%%%%%%%*    =%%%%%#
 *           *%%%%%%%%%%%%%%+-          :=*%%%%%%%%%%%%%*   :%%%%%%=
 *           *%%%%%%%%%%%%%%%%%*=:  .-*%%%%%%%%%%%%%%%%%*  :%%%%%%#
 *           *%%%%%%=-*%%%%%%%%%%%##%%%%%%%%%%%*-:%%%%%%* .#%%%%%#.
 *           *%%%%%%-   :+#%%%%%%%%%%%%%%%%#+:   .%%%%%%*:%%%%%%#.
 *           *%%%%%%-      .=*%%%%%%%%%%*-.      .%%%%%%%%%%%%%%:
 *           *%%%%%%-          *%%%%%%+          .%%%%%%%%%%%%%:
 *           *%%%%%%-          +%%%%%%=          .%%%%%%%%%%%#:
 *           *%%%%%%-          +%%%%%%=          .%%%%%%%%%%*
 *        -  *%%%%%%*:         +%%%%%%=         -+%%%%%%%%%-
 *      .##  *%%%%%%%%%*-.     +%%%%%%=     .-*%%%%%%%%%%*.
 *     .#%-  :*%%%%%%%%%%%#=.  +%%%%%%=  .=#%%%%%%%%%%%%=
 *     #%#      -+%%%%%%%%%%%#=*%%%%%%++#%%%%%%%%%%%%%*.
 *    +%%+         :+#%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%#:
 *   .%%%-            :=#%%%%%%%%%%%%%%%%%%%%%%%%%#-
 *   =%%%:               .-*%%%%%%%%%%%%%%%%%%%%*-
 *   +%%%:                   -+%%%%%%%%%%%%%%%*:
 *   +%%%=                      +%%%%%%%%%%%+.
 *   :%%%%:                 .-+%%%%%%%%%%*-
 *    +%%%%+.          .:=+#%%%%%%%%%%*-
 *     +%%%%%#*+===+*#%%%%%%%%%%%%#+-
 *      :*%%%%%%%%%%%%%%%%%%%%#+-.
 *         -+#%%%%%%%%%%#*+-:
 *              ......
 *
 * @title Arcade Token
 * @author Non-Fungible Technologies, Inc.
 *
 * An ERC20 token implementation for the Arcade token. The token is burnable and
 * has snapshot functionality to record the balances at a specific point in time.
 * The Arcade token is also ownable where the initial owner is the deployer and
 * has a permit function to allow for off-chain approvals.
 *
 * @dev There are 5 functions for privately minting Arcade tokens to the
 *      Arcade treasury (25.5%), the token development partner (0.6%), the
 *      community rewards pool (15.0%), the community airdrop contract, and the
 *      token vesting contracts (48.9%). These functions are only callable by the
 *      owner of the contract. Each mint function can only be called once. After
 *      all 5 minting functions have been called, the only unique powers the contract
 *      owner has is the ability to take snapshots of the Arcade token balances and
 *      withdraw tokens that have been sent to the ArcadeToken contract.
 * @dev The process for allocating Arcade tokens for vesting distribution is
 *      the tokens are first minted to the Arcade team multisig wallet. Then,
 *      the Arcade multisig members will transfer the tokens from the multisig to
 *      the token vesting contract based on the predetermined vesting schedule.
 *      This process is used to reduce the risk surface area when using the
 *      external vesting contract.
 */
contract ArcadeToken is ERC20, ERC20Burnable, ERC20Snapshot, IArcadeToken, Ownable, ERC20Permit {
    // ================================== STATE ==================================

    /// @dev The total supply of Arcade tokens.
    uint256 public constant TOTAL_SUPPLY = 100_000_000 ether;

    /// @dev A denominator to express a token amount in terms of a percentage.
    uint256 public constant BASIS_POINTS_DENOMINATOR = 10_000;

    /// @dev The percentage of the total supply that is minted to the treasury.
    uint256 public constant TREASURY_PERCENTAGE = 2550;
    /// @dev A flag to indicate if the treasury has already been minted to.
    bool public treasuryMinted;

    /// @dev The percentage of the total supply that is minted to the token
    ///      development partner.
    uint256 public constant DEV_PARTNER_PERCENTAGE = 60;
    /// @dev A flag to indicate if the token development partner has already
    ///      been minted to.
    bool public devPartnerMinted;

    /// @dev The percentage of the total supply that is minted to the community
    ///      rewards pool.
    uint256 public constant COMMUNITY_REWARDS_PERCENTAGE = 1500;
    /// @dev A flag to indicate if the community rewards pool has already been
    ///      minted to.
    bool public communityRewardsMinted;

    /// @dev The percentage of the total supply that is minted to the community
    ///      airdrop contract.
    uint256 public constant COMMUNITY_AIRDROP_PERCENTAGE = 1000;
    /// @dev A flag to indicate if the community airdrop contract has already been
    ///      minted to.
    bool public communityAirdropMinted;

    /// @dev The percentage of the total supply that is minted to the Arcade
    ///      team and launch partners.
    uint256 public constant TOTAL_VESTING_PERCENTAGE = 4890;
    /// @dev A flag to indicate if the Arcade team and launch partners have
    ///      already been minted to.
    bool public vestingMinted;

    // ================================== CONSTRUCTOR ==================================

    constructor() ERC20("Arcade", "ARC") ERC20Permit("Arcade") {}

    // ============================== ONLY OWNER OPERATIONS ============================

    /**
     * @notice Mints a predetermined amount of Arcade tokens to the treasury.
     *         This amount is equal to 25.5% of the total supply.
     *
     * @param to                  The address of Arcade treasure.
     */
    function mintToTreasury(address to) external onlyOwner {
        if (to == address(0)) revert AT_ZeroAddress();
        if (treasuryMinted) revert AT_AlreadyMinted();

        uint256 amount = (TOTAL_SUPPLY * TREASURY_PERCENTAGE) / BASIS_POINTS_DENOMINATOR;

        if (totalSupply() + amount > TOTAL_SUPPLY) {
            revert AT_ExceedsTotalSupply(amount, TOTAL_SUPPLY - totalSupply());
        }

        treasuryMinted = true;

        _mint(to, amount);
    }

    /**
     * @notice Mints a predetermined amount of Arcade tokens to token development
     *         partner. This amount is equal to 0.6% of the total supply.
     *
     * @param to                  The address of Arcade treasure.
     */
    function mintToDevPartner(address to) external onlyOwner {
        if (to == address(0)) revert AT_ZeroAddress();
        if (devPartnerMinted) revert AT_AlreadyMinted();

        uint256 amount = (TOTAL_SUPPLY * DEV_PARTNER_PERCENTAGE) / BASIS_POINTS_DENOMINATOR;

        if (totalSupply() + amount > TOTAL_SUPPLY) {
            revert AT_ExceedsTotalSupply(amount, TOTAL_SUPPLY - totalSupply());
        }

        devPartnerMinted = true;

        _mint(to, amount);
    }

    /**
     * @notice Mints a predetermined amount of Arcade tokens to the community
     *         rewards pool. This amount is equal to 15% of the total supply.
     *
     * @param to                  The address of Arcade treasure.
     */
    function mintToCommunityRewards(address to) external onlyOwner {
        if (to == address(0)) revert AT_ZeroAddress();
        if (communityRewardsMinted) revert AT_AlreadyMinted();

        uint256 amount = (TOTAL_SUPPLY * COMMUNITY_REWARDS_PERCENTAGE) / BASIS_POINTS_DENOMINATOR;

        if (totalSupply() + amount > TOTAL_SUPPLY) {
            revert AT_ExceedsTotalSupply(amount, TOTAL_SUPPLY - totalSupply());
        }

        communityRewardsMinted = true;

        _mint(to, amount);
    }

    /**
     * @notice Mints a predetermined amount of Arcade tokens to the community
     *         airdrop contract. This amount is equal to 10% of the total supply.
     *
     * @param to                  The address of Arcade treasure.
     */
    function mintToCommunityAirdrop(address to) external onlyOwner {
        if (to == address(0)) revert AT_ZeroAddress();
        if (communityAirdropMinted) revert AT_AlreadyMinted();

        uint256 amount = (TOTAL_SUPPLY * COMMUNITY_AIRDROP_PERCENTAGE) / BASIS_POINTS_DENOMINATOR;

        if (totalSupply() + amount > TOTAL_SUPPLY) {
            revert AT_ExceedsTotalSupply(amount, TOTAL_SUPPLY - totalSupply());
        }

        communityAirdropMinted = true;

        _mint(to, amount);
    }

    /**
     * @notice Mints a predetermined amount of Arcade tokens minted to a dedicated multisig.
     *         This amount is equal to 48.9% of the total supply. 32.7% to Arcade's launch
     *         partners and 16.2% to the Arcade team.
     *
     * @param to                  The address of Arcade treasure.
     */
    function mintToVesting(address to) external onlyOwner {
        if (to == address(0)) revert AT_ZeroAddress();
        if (vestingMinted) revert AT_AlreadyMinted();

        uint256 amount = (TOTAL_SUPPLY * TOTAL_VESTING_PERCENTAGE) / BASIS_POINTS_DENOMINATOR;

        if (totalSupply() + amount > TOTAL_SUPPLY) {
            revert AT_ExceedsTotalSupply(amount, TOTAL_SUPPLY - totalSupply());
        }

        vestingMinted = true;

        _mint(to, amount);
    }

    /**
     * @notice Creates a snapshot of all the balances as well as the total supply at the
     *         time it is called and recorded for later access. Can only be called by the
     *         owner.
     */
    function snapshot() public onlyOwner {
        _snapshot();
    }

    /**
     * @notice Function to be used when ERC20 tokens get stuck in this contract. The entire balance
     *         of this contract will be transferred to the owner. Can only be called by the owner.
     *
     * @dev When withdrawing tokens it is crucial to ensure the token address is accurate and the
     *      token being withdrawn is non-reentrant. The owner must be an account which can receive
     *      ERC20 tokens.
     *
     * @param token               The address of the ERC20 token to withdraw.
     */
    function withdrawTokens(address token) external onlyOwner {
        if (token == address(0)) revert AT_ZeroAddress();

        uint256 amount = IERC20(token).balanceOf(address(this));

        ERC20(token).transfer(owner(), amount);
    }

    // ================================== ERC20 OVERRIDES =================================

    /**
     * @notice Overrides required by Solidity since both ERC20 and ERC20Snapshot use this
     *         function name.
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override(ERC20, ERC20Snapshot) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
