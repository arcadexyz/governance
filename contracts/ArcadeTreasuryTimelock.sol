// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "./external/council/features/Timelock.sol";

/**
 * @title ArcadeGSCCoreVoting
 * @author Non-Fungible Technologies, Inc.
 *
 * This contract is a dedicated timelock for all Arcade Treasury operations that
 * that require the ADMIN_ROLE. This contract adds an additional layer of security
 * to the most sensitive treasury operations. The authorized address is the
 * ArcadeGSCCoreVoting contract. This mean they have the ability to pass a vote to
 * suspend the execution of a queued transaction.
 */
contract ArcadeTreasuryTimelock is Timelock {
    // ==================================== CONSTRUCTOR ================================================

    /**
     * @notice Constructs the contract by setting deployment variables.
     *
     * @param _waitTime         Lock time in blocks.
     * @param _owner            Owner of the contract.
     * @param _authorized       Authorized address.
     */
    constructor(uint256 _waitTime, address _owner, address _authorized) Timelock(_waitTime, _owner, _authorized) {}
}
