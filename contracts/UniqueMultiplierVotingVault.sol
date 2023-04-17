// SPDX-License-Identifier: MIT

pragma solidity >=0.8.18;

/* solhint-disable no-global-import */
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

import "./external/council/libraries/History.sol";
import "./external/council/libraries/Storage.sol";
import "./external/council/interfaces/IERC20.sol";
import "./libraries/VotingVaultStorage.sol";

import "./BaseVotingVault.sol";

import {
    UMVV_DoesNotOwn,
    UMVV_HasRegistration,
    UMVV_AlreadyDelegated,
    UMVV_InsufficientBalance,
    UMVV_InsufficientRegistrationBalance,
    UMVV_MultiplierLimit,
    UMVV_NoMultiplierSet
} from "./errors/Governance.sol";

/**
 *
 * @title UniqueMultiplierVotingVault
 * @author Non-Fungible Technologies, Inc.
 *
 * The voting power for participants in this voting vault holding reputation ERC1155 nfts
 * is enhanced by a multiplier. This contract enables holders of specific ERC1155 nfts
 * to gain an advantage wrt voting power for participation in governance. Participants
 * send their ERC20 tokens to the contract and provide their ERC1155 nfts as calldata.
 * Once the contract confirms their ownership of the ERC1155 token id, and matches the
 * ERC1155 address and tokenId to a multiplier, they are able to delegate their voting
 * power for participation in governance.
 *
 * This contract is Simple Proxy upgradeable which is the upgradeability system used for voting
 * vaults in Council.
 *
 * @dev There is no emergency withdrawal in this contract, any funds not sent via
 *      addNftAndDelegate() are unrecoverable by this version of the UniqueMultiplierVotingVault.
 *
 *      This contract is a proxy so we use the custom state management system from
 *      storage and return the following as methods to isolate that call.
 */

contract UniqueMultiplierVotingVault is BaseVotingVault {
    // ======================================== STATE ==================================================

    // Bring History library into scope
    using History for History.HistoricalBalances;

    // ========================================== CONSTRUCTOR ===========================================

    /**
     * @notice Constructs the contract by setting immutables.
     *
     * @param token                     The external erc20 token contract.
     * @param staleBlockLag             The number of blocks before which the delegation history is forgotten.
     */
    constructor(IERC20 token, uint256 staleBlockLag) BaseVotingVault(token, staleBlockLag) {}

    // ============================================ EVENTS ===============================================

    // Event to track multipliers
    event MultiplierSet(address tokenAddress, uint128 tokenId, uint128 multiplier);

    // ========================== UNIQUE MULTIPLIER VOTING VAULT FUNCTIONALITY ============================

    /**
     * @notice initialization function to set initial variables. Can only be called once after deployment.
     *
     * @param manager                  The address of the manager who can update the unique multiplier values.
     *
     */
    function initialize(address manager) public {
        require(Storage.uint256Ptr("initialized").data == 0, "initialized");
        Storage.set(Storage.uint256Ptr("initialized"), 1);
        Storage.set(Storage.addressPtr("manager"), manager);
        Storage.set(Storage.uint256Ptr("entered"), 1);
    }

    /**
     * @notice Performs ERC1155 registration and delegation for a caller.
     *
     * @dev User has to own ERC1155 nft for receiving the benefits of a multiplier access.
     *
     * @param amount                    Amount of tokens sent to this contract by the user for locking
     *                                  in governance.
     * @param tokenId                   The id of the ERC1155 NFT.
     * @param tokenAddress              The address of the ERC1155 token the user is registering for multiplier
     *                                  access.
     * @param delegatee                 Optional param. The address to delegate the voting power associated
     *                                  with this Registration to
     */
    function addNftAndDelegate(
        uint128 amount,
        uint128 tokenId,
        address tokenAddress,
        address delegatee
    ) external virtual nonReentrant {
        address who = msg.sender;
        uint128 withdrawn = 0;
        uint128 blockNumber = uint128(block.number);
        uint128 multiplier = 1e18;

        // load the multipliers mapping storage (tokenAddress --> tokenId --> multiplier)
        VotingVaultStorage.AddressUintUint storage multiplierData = _multipliers()[tokenAddress][tokenId];

        // if a user does not specify a reputation nft, their multiplier is set to 1
        if (tokenAddress == address(0) || tokenId == 0) {
            multiplierData.multiplier = multiplier;
        }

        // confirm that the user is a holder of the tokenId and that a multiplier is set for this token
        if ((tokenAddress != address(0)) && (tokenId != 0)) {
            if (IERC1155(tokenAddress).balanceOf(who, tokenId) == 0) revert UMVV_DoesNotOwn();
            multiplier = multipliers(tokenAddress, tokenId);

            if (multiplier == 0) revert UMVV_NoMultiplierSet();
        }

        // load this contract's balance storage
        Storage.Uint256 storage balance = _balance();

        // load the registration
        VotingVaultStorage.Registration storage registration = _registrations()[who];

        // If the token id is not zero, revert because the Registration is
        // already initialized. Only one Registration per msg.sender
        if (registration.tokenId != 0) revert UMVV_HasRegistration();

        // load the delegate. Defaults to the registration owner
        delegatee = delegatee == address(0) ? who : delegatee;

        // calculate the voting power provided by this registration
        uint128 newVotingPower = (amount * uint128(multiplier)) / MULTIPLIER_DENOMINATOR;

        // set the new registration
        _registrations()[who] = VotingVaultStorage.Registration(
            amount,
            blockNumber,
            newVotingPower,
            withdrawn,
            tokenId,
            tokenAddress,
            delegatee
        );

        // update this contract's balance
        balance.data += amount;

        _grantVotingPower(delegatee, newVotingPower);

        // transfer user ERC20 amount and ERC1155 nft into this contract
        _lockTokens(who, amount, tokenAddress, tokenId, 1);

        emit VoteChange(who, registration.delegatee, int256(uint256(newVotingPower)));
    }

    /**
     * @notice Getter for the registrations mapping.
     *
     * @param who                       The owner of the registration to query.
     *
     * @return Registration             Registration of the provided address.
     */
    function getRegistration(address who) external view returns (VotingVaultStorage.Registration memory) {
        return _registrations()[who];
    }

    /**
     * @notice Changes the caller's token voting power delegation.
     *
     * @dev The total voting power is not guaranteed to go up because the token
     *      multiplier can be updated at any time.
     *
     * @param to                        The address to delegate to.
     */
    function delegate(address to) external virtual {
        VotingVaultStorage.Registration storage registration = _registrations()[msg.sender];
        // If to address is already the delegate, don't send the tx
        if (to == registration.delegatee) revert UMVV_AlreadyDelegated();

        History.HistoricalBalances memory votingPower = _votingPower();
        uint256 oldDelegateeVotes = votingPower.loadTop(registration.delegatee);

        // Remove voting power from old delegatee and emit event
        votingPower.push(registration.delegatee, oldDelegateeVotes - registration.latestVotingPower);
        emit VoteChange(msg.sender, registration.delegatee, -1 * int256(uint256(registration.latestVotingPower)));

        // Note - It is important that this is loaded here and not before the previous state change because if
        // to == registration.delegatee and re-delegation was allowed we could be working with out of date state
        uint256 newDelegateeVotes = votingPower.loadTop(to);
        // return the current voting power of the Registration. Varies based on the multiplier associated with the
        // user's ERC1155 token at the time of txn
        uint256 addedVotingPower = _currentVotingPower(registration);

        // add voting power to the target delegatee and emit event
        votingPower.push(to, newDelegateeVotes + addedVotingPower);
        emit VoteChange(msg.sender, to, int256(addedVotingPower));

        // update registration properties
        registration.latestVotingPower = uint128(addedVotingPower);
        registration.delegatee = to;
    }

    /**
     * @notice Removes tokens from this contract and the voting power they represent.
     *
     * @param amount                      The amount of token to withdraw.
     */
    function withdraw(uint128 amount) external virtual nonReentrant {
        // load the registration
        VotingVaultStorage.Registration storage registration = _registrations()[msg.sender];
        // get the withdrawable amount
        uint256 withdrawable = _getWithdrawableAmount(registration);
        // get this contract's balance
        Storage.Uint256 storage balance = _balance();
        if (balance.data < amount) revert UMVV_InsufficientBalance();
        if (registration.amount < amount) revert UMVV_InsufficientRegistrationBalance();
        if ((withdrawable - amount) >= 0) {
            // update contract balance
            balance.data -= amount;
            // update withdrawn amount
            registration.withdrawn += amount;
            // update the delegatee's voting power. Varies based on the multiplier associated with the
            // user's ERC1155 token at the time of the call
            _syncVotingPower(msg.sender, registration);
        }
        if ((withdrawable - amount) == 0) {
            if ((registration.tokenAddress != address(0)) && (registration.tokenId != 0)) {
                withdrawERC1155();
            }
            delete _registrations()[msg.sender];
        }
        // transfer the token amount to the user
        token.transfer(msg.sender, amount);
    }

    /**
     * @notice A function that allows a user's to withdraw the reputation nft they are using for
     *         accessing a voting power multiplier.
     *
     */
    function withdrawERC1155() public nonReentrant {
        // load the registration
        VotingVaultStorage.Registration storage registration = _registrations()[msg.sender];
        if ((registration.tokenAddress != address(0)) && (registration.tokenId != 0)) {
            // transfer ERC1155 back to the user
            IERC1155(registration.tokenAddress).safeTransferFrom(
                address(this),
                msg.sender,
                registration.tokenId,
                1,
                bytes("")
            );

            // remove ERC1155 values from registration struct
            registration.tokenAddress = address(0);
            registration.tokenId = 0;

            // update the delegatee's voting power based on multiplier removal
            _syncVotingPower(msg.sender, registration);
        } else {
            revert UMVV_DoesNotOwn();
        }
    }

    /**
     * @notice A function that allows a user's to change the reputation nft they are using for
     *         accessing a voting power multiplier.
     *
     * @param newTokenAddress            Address of the new ERC1155 token the user wants to use.
     * @param newTokenId                 Id of the new ERC1155 token the user wants to use.
     */
    function updateERC1155(uint128 newTokenId, address newTokenAddress) external nonReentrant {
        VotingVaultStorage.Registration storage registration = _registrations()[msg.sender];
        if ((registration.tokenAddress != address(0)) && (registration.tokenId != 0)) {
            withdrawERC1155();

            if (IERC1155(newTokenAddress).balanceOf(msg.sender, newTokenId) == 0) revert UMVV_DoesNotOwn();
            uint128 multiplier = multipliers(newTokenAddress, newTokenId);
            if (multiplier == 0) revert UMVV_NoMultiplierSet();

            // set the new ERC1155 values in the registration
            registration.tokenAddress = newTokenAddress;
            registration.tokenId = newTokenId;

            // update the delegatee's voting power based on new reputation nft
            _syncVotingPower(msg.sender, registration);
        } else {
            revert UMVV_DoesNotOwn();
        }
    }

    /**
     * @notice Getter for the multipliers mapping.
     *
     * @param  tokenAddress             The token contract address.
     * @param  tokenId                  The token id of the ERC1155 for which the multiplier is being
     *                                  retrieved.
     *
     * @return multiplierValue          The multiplier value for the token address.
     *
     */
    function multipliers(address tokenAddress, uint128 tokenId) public view returns (uint128) {
        VotingVaultStorage.AddressUintUint storage multiplierData = _multipliers()[tokenAddress][tokenId];
        // get multiplier value
        return multiplierData.multiplier;
    }

    /**
     * @notice An onlyManager function for setting the multiplier value associated with an ERC1155
     *         contract address.
     *
     * @param tokenAddress              The address of the ERC1155 token to set the
     *                                  multiplier for.
     * @param tokenId                   The token id of the ERC1155 for which the multiplier is being set.
     * @param multiplierValue           The multiplier value corresponding to the token address and id.
     *
     */
    function setMultiplier(
        address tokenAddress,
        uint128 tokenId,
        uint128 multiplierValue
    ) public virtual onlyManager returns (bool multiplierSet) {
        if (multiplierValue >= MAX_MULTIPLIER) revert UMVV_MultiplierLimit();

        VotingVaultStorage.AddressUintUint storage multiplierData = _multipliers()[tokenAddress][tokenId];
        // set multiplier value
        multiplierData.multiplier = multiplierValue;
        emit MultiplierSet(tokenAddress, tokenId, multiplierValue);
    }

    /**
     * @notice A function to access the storage of the nft's voting power multiplier.
     *
     * @param tokenAddress              The address of the ERC1155 token to set the
     *                                  multiplier for.
     * @param tokenId                   The token id of the ERC1155 for which the multiplier is being set.
     *
     * @return                          The token multiplier.
     */
    function multiplier(address tokenAddress, uint128 tokenId) external view returns (uint256) {
        VotingVaultStorage.AddressUintUint storage multiplierData = _multipliers()[tokenAddress][tokenId];

        return multiplierData.multiplier;
    }

    // ================================ HELPER FUNCTIONS ===================================

    /**
     * @notice Grants the chosen delegate address voting power when a new user registers.
     *
     * @param delegatee                    The address to delegate the voting power associated
     *                                     with the Registration to.
     * @param newVotingPower               Amount of votingPower associated with this Registration to
     *                                     be added to delegates existing votingPower.
     *
     */
    function _grantVotingPower(address delegatee, uint128 newVotingPower) internal {
        // update the delegatee's voting power
        History.HistoricalBalances memory votingPower = _votingPower();
        // loads the most recent timestamp of voting power for this delegate
        uint256 delegateeVotes = votingPower.loadTop(delegatee);
        // add block stamp indexed delegation power for this delegate to historical data array
        votingPower.push(delegatee, delegateeVotes + newVotingPower);
    }

    /**
     * @notice A single function endpoint for loading Registration storage
     *
     * @dev Only one Registration is allowed per user. Registrations SHOULD NOT BE MODIFIED
     *
     * @return registrations                 A storage mapping to look up registrations data
     */
    function _registrations() internal pure returns (mapping(address => VotingVaultStorage.Registration) storage) {
        // This call returns a storage mapping with a unique non overwrite-able storage location
        // which can be persisted through upgrades, even if they change storage layout
        return (VotingVaultStorage.mappingAddressToRegistrationPtr("registrations"));
    }

    /**
     * @notice Helper to update a delegatee's voting power.
     *
     * @param who                        The address who's voting power we need to sync.
     *
     * @param registration               The storage pointer to the registration of that user.
     */
    function _syncVotingPower(address who, VotingVaultStorage.Registration storage registration) internal {
        History.HistoricalBalances memory votingPower = _votingPower();
        uint256 delegateeVotes = votingPower.loadTop(registration.delegatee);
        uint256 newVotingPower = _currentVotingPower(registration);

        // get the change in voting power. Negative if the voting power is reduced
        int256 change = int256(newVotingPower) - int256(uint256(registration.latestVotingPower));
        // do nothing if there is no change
        if (change == 0) return;
        if (change > 0) {
            votingPower.push(registration.delegatee, delegateeVotes + uint256(change));
        } else {
            // if the change is negative, we multiply by -1 to avoid underflow when casting
            votingPower.push(registration.delegatee, delegateeVotes - uint256(change * -1));
        }
        emit VoteChange(who, registration.delegatee, change);
        registration.latestVotingPower = uint128(newVotingPower);
    }

    /**
     * @notice Calculates how much a user can withdraw.
     *
     * @param registration                The the memory location of the loaded registration.
     *
     * @return withdrawable               Amount which can be withdrawn.
     */
    function _getWithdrawableAmount(
        VotingVaultStorage.Registration memory registration
    ) internal view returns (uint256) {
        if (block.number < registration.blockNumber) {
            return 0;
        }
        if (registration.withdrawn == registration.amount) {
            return (0);
        }
        uint256 withdrawable = registration.amount - registration.withdrawn;
        return (withdrawable);
    }

    /**
     * @notice Helper that returns the current voting power of a registration.
     *
     * @dev This is not always the recorded voting power since it uses the latest multiplier.
     *
     * @param registration               The registration to check for voting power.
     *
     * @return                           The current voting power of the registration.
     */
    function _currentVotingPower(
        VotingVaultStorage.Registration memory registration
    ) internal view virtual returns (uint256) {
        uint256 locked = registration.amount - registration.withdrawn;
        if ((registration.tokenAddress != address(0)) && (registration.tokenId != 0)) {
            return locked * _multipliers()[registration.tokenAddress][registration.tokenId].multiplier;
        }
        return locked;
    }

    /**
     * @notice A internal function for locking a user's ERC20 tokens in this contract
     *         for participation in governance. Calls the _lockNft funtions if a user
     *         has entered an ERC1155 token address and token id.
     *
     * @param from                      Address of owner tokens are transferred from.
     * @param amount                    Amount of ERC20 tokens being transferred.
     * @param tokenAddress              Address of the ERC1155 token being transferred.
     * @param tokenId                   Id of the ERC1155 token being transferred.
     * @param nftAmount                 Amount of the ERC1155 token being transferred.
     */
    function _lockTokens(
        address from,
        uint256 amount,
        address tokenAddress,
        uint128 tokenId,
        uint128 nftAmount
    ) internal nonReentrant {
        token.transferFrom(from, address(this), amount);

        if ((tokenAddress != address(0)) && (tokenId != 0)) {
            _lockNft(from, tokenAddress, tokenId, nftAmount);
        }
    }

    /**
     * @notice A internal function for locking a user's ERC1155 token in this contract
     *         for participation in governance.
     *
     * @param from                      Address of owner token is transferred from.
     * @param tokenAddress              Address of the token being transferred.
     * @param tokenId                   Id of the token being transferred.
     * @param nftAmount                 Amount of token being transferred.
     */
    function _lockNft(address from, address tokenAddress, uint128 tokenId, uint128 nftAmount) internal nonReentrant {
        IERC1155(tokenAddress).safeTransferFrom(from, address(this), tokenId, nftAmount, bytes(""));
    }

    /** @notice A single function endpoint for loading storage for multipliers.
     *
     * @return                          A storage mapping which can be used to lookup a
     *                                  token's multiplier data and token id data.
     */
    function _multipliers()
        internal
        pure
        returns (mapping(address => mapping(uint128 => VotingVaultStorage.AddressUintUint)) storage)
    {
        // This call returns a storage mapping with a unique non overwrite-able storage layout
        // which can be persisted through upgrades, even if they change storage layout
        return (VotingVaultStorage.mappingAddressToPackedUintUint("multipliers"));
    }

    /** @notice A function to handles the receipt of a single ERC1155 token. This function is called
     * at the end of a safeTransferFrom after the balance has been updated. To accept the transfer,
     * this must return bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))
     *
     * @param operator                  The address which initiated the transfer.
     * @param from                      The address which previously owned the token.
     * @param id                        The ID of the token being transferred.
     * @param value                     The amount of tokens being transferred.
     * @param data                      Additional data with no specified format.
     *
     * @return                          0xf23a6e61
     */
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public virtual returns (bytes4) {
        return this.onERC1155Received.selector;
    }
}
