// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../libraries/ARCDVestingVaultStorage.sol";

interface IARCDVestingVault {
    /**
     * @notice Public functions
     */
    function getGrant(address _who) external view returns (ARCDVestingVaultStorage.Grant memory);

    function claimable(address _who) external view returns (uint256);

    function claim(uint256 _amount) external;

    function delegate(address _to) external;

    function queryVotePower(address user, uint256 blockNumber, bytes calldata extraData) external returns (uint256);

    function queryVotePowerView(address user, uint256 blockNumber) external view returns (uint256);

    function timelock() external pure returns (address);

    function manager() external pure returns (address);

    /**
     * @notice Only Manager functions
     */
    function addGrantAndDelegate(
        address _who,
        uint128 _amount,
        uint128 _cliffAmount,
        uint128 _startTime,
        uint128 _expiration,
        uint128 _cliff,
        address _delegatee
    ) external;

    function revokeGrant(address _who) external;

    function deposit(uint256 _amount) external;

    function withdraw(uint256 _amount, address _recipient) external;

    /**
     * @notice Only Timelock functions
     */
    function setTimelock(address timelock_) external;

    function setManager(address manager_) external;
}
