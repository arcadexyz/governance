// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "../external/council/interfaces/IVotingVault.sol";
import "../external/council/libraries/VestingVaultStorage.sol";

/**
 * @notice The council-kit UI supports all public functions defined below. For a complete 
 * front end implementation, the only manager functions need to be implemented along with
 * the acceptGrant method. 
 *
 * By exposing the only manager functions and the accept grant function, the vesting
 * manager can add and remove grants, deposit and withdraw funds. When a grant is added,
 * the initial delegate will be set to the grantee. The grantee can then delegate to another
 * address if they wish. Before token claiming a grantee will need to accept their grant
 * before they can claim any tokens.
 */
interface IArcadeVestingVault is IVotingVault {
    /**
     * @notice Public functions
     */
    function getGrant(address _who) external view returns (VestingVaultStorage.Grant memory);

    function acceptGrant() external;

    function claim() external;

    function delegate(address _to) external;

    function updateVotingPower(address _who) external;

    function queryVotePowerView(address user, uint256 blockNumber) external view returns (uint256);

    function timelock() external pure returns (address);

    function unvestedMultiplier() external pure returns (uint256);

    function manager() external pure returns (address);

    /**
     * @notice Only Manager functions
     */
    function addGrantAndDelegate(
        address _who,
        uint128 _amount,
        uint128 _startTime,
        uint128 _expiration,
        uint128 _cliff,
        address _delegatee
    ) external;

    function removeGrant(address _who) external;

    function deposit(uint256 _amount) external;

    function withdraw(uint256 _amount, address _recipient) external;

    /**
     * @notice Only Timelock functions
     */
    function changeUnvestedMultiplier(uint256 _multiplier) external;

    function setTimelock(address timelock_) external;

    function setManager(address manager_) external;
}
