// SPDX-License-Identifier: MIT

pragma solidity >=0.8.18;

import "../external/council/libraries/History.sol";
import "../external/council/libraries/Storage.sol";

contract HashedStorageReentrancyBlock {
    // Will use a state flag to prevent this function from being called back into
    modifier nonReentrant() {
        Storage.Uint256 memory _entered = _entered();
        // Check the state variable before the call is entered
        require(_entered.data == 1, "REENTRANCY");

        // Store that the function has been entered
        _entered.data = 2;
        // Run the function code
        _;

        // Clear the state
        _entered.data = 1;
    }

    function _entered() internal pure returns (Storage.Uint256 memory) {
        return Storage.uint256Ptr("entered");
    }
}
