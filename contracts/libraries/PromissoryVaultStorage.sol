// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.18;

// Copy of `VestingVaultStorage` with modified scope to match the PromissoryVault
// requirements. These libraries allow for secure storage pointers across proxy
// implementations and will return storage pointers based on a hashed name and type string.
library PromissoryVaultStorage {
    // This library follows a pattern which if solidity had higher level
    // type or macro support would condense quite a bit.

    // Each basic type which does not support storage locations is encoded as
    // a struct of the same name capitalized and has functions 'load' and 'set'
    // which load the data and set the data respectively.

    // All types will have a function of the form 'typename'Ptr('name') -> storage ptr
    // which will return a storage version of the type with slot which is the hash of
    // the variable name and type string. This pointer allows easy state management between
    // upgrades and overrides the default solidity storage slot system.

    // A struct which represents 1 packed storage location (Pnote)
    struct Pnote {
        uint128 amount; // token amount
        uint128 time; // time of txn
        uint128 latestVotingPower;
        uint128 withdrawn; // amount of tokens withdrawn from vault
        uint128 noteId; // promissoryNote id
        address promissoryNote; // token address
        address delegatee;
    }

    /// @notice Returns the storage pointer for a named mapping of address to uint256[]
    /// @param name the variable name for the pointer
    /// @return data the mapping pointer
    function mappingAddressToPnotePtr(
        string memory name
    ) internal pure returns (mapping(address => Pnote) storage data) {
        bytes32 typehash = keccak256("mapping(address => Pnote)");
        bytes32 offset = keccak256(abi.encodePacked(typehash, name));
        assembly {
            data.slot := offset
        }
    }
}
