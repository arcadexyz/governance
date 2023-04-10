// SPDX-License-Identifier: MIT

pragma solidity >=0.8.18;

/**
 * Copy of `VestingVaultStorage` with modified scope to match the UniqueMultiplierVotingVault
 * requirements. These libraries allow for secure storage pointers across proxy
 * implementations and will return storage pointers based on a hashed name and type string.
 */

library VotingVaultStorage {
    /**
    * This library follows a pattern which if solidity had higher level
    * type or macro support would condense quite a bit.

    * Each basic type which does not support storage locations is encoded as
    * a struct of the same name capitalized and has functions 'load' and 'set'
    * which load the data and set the data respectively.

    * All types will have a function of the form 'typename'Ptr('name') -> storage ptr
    * which will return a storage version of the type with slot which is the hash of
    * the variable name and type string. This pointer allows easy state management between
    * upgrades and overrides the default solidity storage slot system.
    */

    // A struct which represents 1 packed storage location (Registration)
    struct Registration {
        uint128 amount; // token amount
        uint128 blockNumber; // blockNumber of Registration txn
        uint128 latestVotingPower;
        uint128 withdrawn; // amount of tokens withdrawn from voting vault
        uint128 tokenId; // ERC1155 token id
        address delegatee;
    }

    // A struct which represents 1 packed storage location with a compressed
    // uint128 pair
    struct AddressUintUint {
        uint128 tokenId;
        uint128 multiplier;
    }

    /**
     * @notice Returns the storage pointer for a named mapping of address to registration data
     *
     * @param name                      The variable name for the pointer.
     *
     * @return data                     The mapping pointer.
     */
    function mappingAddressToRegistrationPtr(
        string memory name
    ) internal pure returns (mapping(address => Registration) storage data) {
        bytes32 typehash = keccak256("mapping(address => Registration)");
        bytes32 offset = keccak256(abi.encodePacked(typehash, name));
        assembly {
            data.slot := offset
        }
    }

    /**
     * @notice Returns the storage pointer for a named mapping of address to uint128 pair
     *
     * @param name                      The variable name for the pointer.
     *
     * @return data                     The mapping pointer.
     */
    function mappingAddressToPackedUintUint(
        string memory name
    ) internal pure returns (mapping(address => AddressUintUint) storage data) {
        bytes32 typehash = keccak256("mapping(address => AddressUintUint)");
        bytes32 offset = keccak256(abi.encodePacked(typehash, name));
        assembly {
            data.slot := offset
        }
    }
}
