// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

import "./external/council/libraries/History.sol";
import "./external/council/libraries/Storage.sol";
import "./external/council/interfaces/IERC20.sol";
import "./libraries/VotingVaultStorage.sol";
import "./interfaces/INFTBoostVault.sol";

import "./BaseVotingVault.sol";

import {
    NBV_DoesNotOwn,
    NBV_HasRegistration,
    NBV_AlreadyDelegated,
    NBV_InsufficientBalance,
    NBV_InsufficientWithdrawableBalance,
    NBV_MultiplierLimit,
    NBV_NoMultiplierSet,
    NBV_InvalidNft,
    NBV_ZeroAmount,
    NBV_ArrayTooManyElements,
    NBV_Locked,
    NBV_AlreadyUnlocked
} from "./errors/Governance.sol";

/**
 *
 * @title NFTBoostVault
 * @author Non-Fungible Technologies, Inc.
 *
 * The voting power for participants in this vault holding reputation ERC1155 nfts
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
 *      addNftAndDelegate() are unrecoverable by this version of the NFTBoostVault.
 *
 *      This contract is a proxy so we use the custom state management system from
 *      storage and return the following as methods to isolate that call.
 */

contract NFTBoostVault is INFTBoostVault, BaseVotingVault {
    // ======================================== STATE ==================================================

    // Bring History library into scope
    using History for History.HistoricalBalances;

    // ======================================== STATE ==================================================

    /// @dev Determines the maximum multiplier for any given NFT.
    /* solhint-disable var-name-mixedcase */
    uint128 public constant MAX_MULTIPLIER = 1.5e18;

    /// @dev Precision of the multiplier.
    uint128 public constant MULTIPLIER_DENOMINATOR = 1e18;

    // ========================================== CONSTRUCTOR ===========================================

    /**
     * @notice Deploys a voting vault, setting immutable values for the token
     *         and staleBlockLag.
     *
     * @param token                     The external erc20 token contract.
     * @param staleBlockLag             The number of blocks before which the delegation history is forgotten.
     * @param timelock                  The address of the timelock who can update the manager address.
     * @param manager                   The address of the manager who can update the multiplier values.
     */
    constructor(
        IERC20 token,
        uint256 staleBlockLag,
        address timelock,
        address manager
    ) BaseVotingVault(token, staleBlockLag) {
        Storage.set(Storage.uint256Ptr("initialized"), 1);
        Storage.set(Storage.addressPtr("timelock"), timelock);
        Storage.set(Storage.addressPtr("manager"), manager);
        Storage.set(Storage.uint256Ptr("entered"), 1);
        Storage.set(Storage.uint256Ptr("locked"), 1);
    }

    // ===================================== USER FUNCTIONALITY =========================================

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
    ) external override nonReentrant {
        uint256 multiplier = 1e18;

        // confirm that the user is a holder of the tokenId and that a multiplier is set for this token
        if (tokenAddress != address(0) && tokenId != 0) {
            if (IERC1155(tokenAddress).balanceOf(msg.sender, tokenId) == 0) revert NBV_DoesNotOwn();

            multiplier = getMultiplier(tokenAddress, tokenId);

            if (multiplier == 0) revert NBV_NoMultiplierSet();
        }

        // load this contract's balance storage
        Storage.Uint256 storage balance = _balance();

        // load the registration
        VotingVaultStorage.Registration storage registration = _getRegistrations()[msg.sender];

        // If the token id and token address is not zero, revert because the Registration
        // is already initialized. Only one Registration per msg.sender
        if (registration.tokenId != 0 && registration.tokenAddress != address(0)) revert NBV_HasRegistration();

        // load the delegate. Defaults to the registration owner
        delegatee = delegatee == address(0) ? msg.sender : delegatee;

        // calculate the voting power provided by this registration
        uint128 newVotingPower = (amount * uint128(multiplier)) / MULTIPLIER_DENOMINATOR;

        // set the new registration
        _getRegistrations()[msg.sender] = VotingVaultStorage.Registration(
            amount,
            newVotingPower,
            0,
            tokenId,
            tokenAddress,
            delegatee
        );

        // update this contract's balance
        balance.data += amount;

        _grantVotingPower(delegatee, newVotingPower);

        // transfer user ERC20 amount and ERC1155 nft into this contract
        _lockTokens(msg.sender, amount, tokenAddress, tokenId, 1);

        emit VoteChange(msg.sender, registration.delegatee, int256(uint256(newVotingPower)));
    }

    /**
     * @notice Changes the caller's token voting power delegation.
     *
     * @dev The total voting power is not guaranteed to go up because the token
     *      multiplier can be updated at any time.
     *
     * @param to                        The address to delegate to.
     */
    function delegate(address to) external override {
        VotingVaultStorage.Registration storage registration = _getRegistrations()[msg.sender];

        // If to address is already the delegate, don't send the tx
        if (to == registration.delegatee) revert NBV_AlreadyDelegated();

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

        // update registration properties
        registration.latestVotingPower = uint128(addedVotingPower);
        registration.delegatee = to;

        emit VoteChange(msg.sender, to, int256(addedVotingPower));
    }

    /**
     * @notice Removes a user's locked ERC20 tokens from this contract and if no tokens are remaining, the
     *         user's locked ERC1155 (if utilized) is also transfered back to them. Consequently, the user's
     *         delegatee loses the voting power associated with the aforementioned tokens.
     *
     * @dev Withdraw is unlocked when the locked state variable is set to 2.
     *
     * @param amount                      The amount of token to withdraw.
     */
    function withdraw(uint128 amount) external override nonReentrant {
        if (getIsLocked() == 1) revert NBV_Locked();
        if (amount == 0) revert NBV_ZeroAmount();

        // load the registration
        VotingVaultStorage.Registration storage registration = _getRegistrations()[msg.sender];

        // get this contract's balance
        Storage.Uint256 storage balance = _balance();
        if (balance.data < amount) revert NBV_InsufficientBalance();

        // get the withdrawable amount
        uint256 withdrawable = _getWithdrawableAmount(registration);
        if (withdrawable < amount) revert NBV_InsufficientWithdrawableBalance(withdrawable);

        // update contract balance
        balance.data -= amount;
        // update withdrawn amount
        registration.withdrawn += amount;
        // update the delegatee's voting power. Varies based on the multiplier associated with the
        // user's ERC1155 token at the time of the call
        _syncVotingPower(msg.sender, registration);

        if (registration.withdrawn == registration.amount) {
            if (registration.tokenAddress != address(0) && registration.tokenId != 0) {
                withdrawNft();
            }
            delete _getRegistrations()[msg.sender];
        }

        // transfer the token amount to the user
        token.transfer(msg.sender, amount);
    }

    /**
     * @notice Tops up a user's locked ERC20 token amount in this contract.
     *         Consequently, the user's delegatee gains voting power associated
     *         with the newly added tokens.
     *
     * @param amount                      The amount of tokens to add.
     */
    function addTokens(uint128 amount) external override nonReentrant {
        if (amount == 0) revert NBV_ZeroAmount();
        // load the registration
        VotingVaultStorage.Registration storage registration = _getRegistrations()[msg.sender];

        // get this contract's balance
        Storage.Uint256 storage balance = _balance();
        // update contract balance
        balance.data += amount;

        // update registration amount
        registration.amount += amount;
        // update the delegatee's voting power
        _syncVotingPower(msg.sender, registration);

        // transfer user ERC20 amount into this contract
        _lockTokens(msg.sender, amount, address(0), 0, 0);
    }

    /**
     * @notice Allows a users to withdraw the ERC1155 NFT they are using for
     *         accessing a voting power multiplier.
     */
    function withdrawNft() public override nonReentrant {
        // load the registration
        VotingVaultStorage.Registration storage registration = _getRegistrations()[msg.sender];

        if (registration.tokenAddress == address(0) || registration.tokenId == 0)
            revert NBV_InvalidNft(registration.tokenAddress, registration.tokenId);

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
    }

    /**
     * @notice A function that allows a user's to change the ERC1155 nft they are using for
     *         accessing a voting power multiplier.
     *
     * @param newTokenAddress            Address of the new ERC1155 token the user wants to use.
     * @param newTokenId                 Id of the new ERC1155 token the user wants to use.
     */
    function updateNft(uint128 newTokenId, address newTokenAddress) external override nonReentrant {
        if (newTokenAddress == address(0) || newTokenId == 0) revert NBV_InvalidNft(newTokenAddress, newTokenId);

        if (IERC1155(newTokenAddress).balanceOf(msg.sender, newTokenId) == 0) revert NBV_DoesNotOwn();

        VotingVaultStorage.Registration storage registration = _getRegistrations()[msg.sender];

        // withdraw the current ERC1155 from the registration
        withdrawNft();

        // set the new ERC1155 values in the registration
        registration.tokenAddress = newTokenAddress;
        registration.tokenId = newTokenId;

        _lockNft(msg.sender, newTokenAddress, newTokenId, 1);

        // update the delegatee's voting power based on new ERC1155 nft's multiplier
        _syncVotingPower(msg.sender, registration);
    }

    /**
     * @notice Update users' registration voting power.
     *
     * @dev Voting power is only updated for this block onward. See Council contract History.sol
     *      for more on how voting power is tracked and queried.
     *      Anybody can update up to 50 users' registration voting power.
     *
     * @param userAddresses             Array of addresses whose registration voting power this
     *                                  function updates.
     */
    function updateVotingPower(address[] memory userAddresses) public override {
        if (userAddresses.length > 50) revert NBV_ArrayTooManyElements();

        for (uint256 i = 0; i < userAddresses.length; ++i) {
            VotingVaultStorage.Registration storage registration = _getRegistrations()[userAddresses[i]];
            _syncVotingPower(userAddresses[i], registration);
        }
    }

    // ===================================== ADMIN FUNCTIONALITY ========================================

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
    function setMultiplier(address tokenAddress, uint128 tokenId, uint128 multiplierValue) public override onlyManager {
        if (multiplierValue >= MAX_MULTIPLIER) revert NBV_MultiplierLimit();

        VotingVaultStorage.AddressUintUint storage multiplierData = _getMultipliers()[tokenAddress][tokenId];
        // set multiplier value
        multiplierData.multiplier = multiplierValue;

        emit MultiplierSet(tokenAddress, tokenId, multiplierValue);
    }

    /**
     * @notice An Timelock only function for ERC20 allowing withdrawals.
     *
     * @dev Allows the timelock to unlock withdrawals. Cannot be reversed.
     */
    function unlock() external override onlyTimelock {
        if (getIsLocked() != 1) revert NBV_AlreadyUnlocked();
        Storage.set(Storage.uint256Ptr("locked"), 2);

        emit WithdrawalsUnlocked();
    }

    // ======================================= VIEW FUNCTIONS ===========================================

    /**
     * @notice Returns whether tokens can be withdrawn from the vault.
     *
     * @return locked                           Whether withdrawals are locked.
     */
    function getIsLocked() public view override returns (uint256) {
        return Storage.uint256Ptr("locked").data;
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
    function getMultiplier(address tokenAddress, uint128 tokenId) public view override returns (uint256) {
        VotingVaultStorage.AddressUintUint storage multiplierData = _getMultipliers()[tokenAddress][tokenId];

        // if a user does not specify a ERC1155 nft, their multiplier is set to 1
        if (tokenAddress == address(0) || tokenId == 0) {
            return 1e18;
        }

        return multiplierData.multiplier;
    }

    /**
     * @notice Getter for the registrations mapping.
     *
     * @param who                               The owner of the registration to query.
     *
     * @return registration                     Registration of the provided address.
     */
    function getRegistration(address who) external view override returns (VotingVaultStorage.Registration memory) {
        return _getRegistrations()[who];
    }

    // =========================================== HELPERS ==============================================

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
     * @dev A single function endpoint for loading Registration storage
     *
     * @dev Only one Registration is allowed per user.
     *
     * @return registrations                 A storage mapping to look up registrations data
     */
    function _getRegistrations() internal pure returns (mapping(address => VotingVaultStorage.Registration) storage) {
        // This call returns a storage mapping with a unique non overwrite-able storage location.
        return (VotingVaultStorage.mappingAddressToRegistrationPtr("registrations"));
    }

    /**
     * @dev Helper to update a delegatee's voting power.
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

        registration.latestVotingPower = uint128(newVotingPower);

        emit VoteChange(who, registration.delegatee, change);
    }

    /**
     * @dev Calculates how much a user can withdraw.
     *
     * @param registration                The the memory location of the loaded registration.
     *
     * @return withdrawable               Amount which can be withdrawn.
     */
    function _getWithdrawableAmount(
        VotingVaultStorage.Registration memory registration
    ) internal pure returns (uint256) {
        if (registration.withdrawn == registration.amount) {
            return 0;
        }

        uint256 withdrawable = registration.amount - registration.withdrawn;

        return withdrawable;
    }

    /**
     * @dev Helper that returns the current voting power of a registration.
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

        if (registration.tokenAddress != address(0) && registration.tokenId != 0) {
            return (locked * getMultiplier(registration.tokenAddress, registration.tokenId)) / MULTIPLIER_DENOMINATOR;
        }

        return locked;
    }

    /**
     * @dev A internal function for locking a user's ERC20 tokens in this contract
     *         for participation in governance. Calls the _lockNft function if a user
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

        if (tokenAddress != address(0) && tokenId != 0) {
            _lockNft(from, tokenAddress, tokenId, nftAmount);
        }
    }

    /**
     * @dev A internal function for locking a user's ERC1155 token in this contract
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

    /** @dev A single function endpoint for loading storage for multipliers.
     *
     * @return                          A storage mapping which can be used to lookup a
     *                                  token's multiplier data and token id data.
     */
    function _getMultipliers()
        internal
        pure
        returns (mapping(address => mapping(uint128 => VotingVaultStorage.AddressUintUint)) storage)
    {
        // This call returns a storage mapping with a unique non overwrite-able storage layout.
        return (VotingVaultStorage.mappingAddressToPackedUintUint("multipliers"));
    }

    /** @dev A function to handles the receipt of a single ERC1155 token. This function is called
     *       at the end of a safeTransferFrom after the balance has been updated. To accept the transfer,
     *       this must return bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))
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
