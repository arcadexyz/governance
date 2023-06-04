// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "../external/council/libraries/History.sol";
import "../external/council/libraries/Storage.sol";

/**
 * @title HashedStorageReentrancyBlock
 * @author Non-Fungible Technologies, Inc.
 *
 * Helper contract to prevent reentrancy attacks using hashed storage. This contract is used
 * to protect against reentrancy attacks in the Arcade voting vault contracts.
 */
abstract contract HashedStorageReentrancyBlock {
    // =========================================== HELPERS ==============================================

    /**
     * @dev Returns the storage pointer to the entered state variable.
     *
     * @return Storage              pointer to the entered state variable.
     */
    function _entered() internal pure returns (Storage.Uint256 memory) {
        return Storage.uint256Ptr("entered");
    }

    // ========================================= MODIFIERS =============================================

    /**
     * @dev Re-entrancy guard modifier using hashed storage.
     */
    modifier nonReentrant() {
        Storage.Uint256 memory entered = _entered();
        // Check the state variable before the call is entered
        require(entered.data == 1, "REENTRANCY");

        // Store that the function has been entered
        entered.data = 2;

        // Run the function code
        _;

        // Clear the state
        entered.data = 1;
    }
}
