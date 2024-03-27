// SPDX-License-Identifier: MIT

/* solhint-disable */

pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../external/dao-contracts/interfaces/IAirdropSingleSidedStaking.sol";

contract MockSingleSidedStaking is IAirdropSingleSidedStaking {
    IERC20 public token;

    mapping(address => uint256) public userBalances;

    constructor(IERC20 _token) {
        token = _token;
    }

    function airdropReceive(address recipient, uint256 amount, address delegation, Lock lock) external override {
        // record the user's balance
        userBalances[recipient] += amount;

        // pull tokens from sender
        token.transferFrom(msg.sender, address(this), amount);
    }
}
