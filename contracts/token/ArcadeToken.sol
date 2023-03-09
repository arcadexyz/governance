// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

import "../interfaces/IArcadeToken.sol";

import { AT_AlreadyMinted, AT_ExceedsTotalSupply, AT_ZeroAddress, AT_InvalidMintStart } from "../errors/Token.sol";

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
 * An ERC20 token implementation for the Arcade token. The token is able to be minted by
 * the minter address, which is initially the minter contract, then transferred to the
 * goverance timelock. The token itself has a hard cap of 100 million tokens.
 */
contract ArcadeToken is ERC20, ERC20Burnable, IArcadeToken, Ownable, ERC20Permit {
    // ===================================== STATE =====================================

    /// @dev The total supply of Arcade tokens
    uint256 public constant MAX_TOTAL_SUPPLY = 100_000_000 ether;

    /// @dev Minter contract address, to be the governance timelock contract
    address public minter;

    /// @dev The timestamp after which minting may occur
    uint256 public mintingAllowedAfter;

    // ======================================= EVENTS ========================================

    /// @dev An event thats emitted when the minter address is changed
    event MinterChanged(address minter, address newMinter);

    // ===================================== CONSTRUCTOR =====================================

    constructor(
        address distribution,
        address _minter,
        uint256 _mintingAllowedAfter
    ) ERC20("Arcade", "ARC") ERC20Permit("Arcade") {
        if (_mintingAllowedAfter < block.timestamp) revert AT_InvalidMintStart(_mintingAllowedAfter, block.timestamp);

        // address responsible for minting future ARC tokens
        minter = _minter;
        emit MinterChanged(address(0), _minter);

        // Initial token distribution of ARC token is done by the distributor contract
        _mint(distribution, MAX_TOTAL_SUPPLY);

        mintingAllowedAfter = _mintingAllowedAfter;
    }

    // ====================================== MINTER OPS ====================================

    /**
     * @notice Function to change the minter address. Can only be called by the owner.
     *
     * @param _newMinter            The address of the new minter.
     */
    function setMinter(address _newMinter) external {
        if (minter == address(0)) revert AT_ZeroAddress();
        require(msg.sender == minter, "only the minter can change the minter address");

        minter = _newMinter;
        emit MinterChanged(_newMinter, minter);
    }

    /**
     * @notice Mint Arcade tokens
     *
     * @param _to                 The address to mint tokens to.
     * @param _amount             The amount of tokens to mint.
     */
    function mint(address _to, uint256 _amount) external {
        require(msg.sender == minter, "only the minter can mint");
        require(block.timestamp >= mintingAllowedAfter, "minting not allowed yet");
        require(_to != address(0), "cannot transfer to the zero address");
        require(_amount > 0, "amount must be greater than zero");
        require(totalSupply() + _amount <= MAX_TOTAL_SUPPLY, "total must be less than or equal to the total supply");

        _mint(_to, _amount);
    }

    // ================================== ERC20 OVERRIDES =================================

    /**
     * @notice Overrides required by Solidity since ERC20 contract also use this function name.
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override(ERC20) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
