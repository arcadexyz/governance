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
 * The voting power for participants in this voting vault is enhanced by a multiplier.
 * This contract enables holders of specific ERC1155 nfts to gain an advantage wrt voting
 * power for participation in governance. Participants send their ERC20 tokens to the contract
 * and provide their ERC1155 nfts as calldata. Once the contract confirms their ownership
 * of the ERC1155 token id, and matches the ERC1155 address and tokenId to a multiplier,
 * they are able to delegate their voting power for participation in governance.
 * The voting power for participants in this voting vault is enhanced by a multiplier.
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
     * @param _token                     The external erc20 token contract.
     * @param _staleBlockLag             The number of blocks before which the delegation history is forgotten.
     */
    constructor(IERC20 _token, uint256 _staleBlockLag) BaseVotingVault(_token, _staleBlockLag) {}

    // ============================================ EVENTS ===============================================

    // Event to track user multiplier data
    event UserMultiplier(address indexed user, address tokenAddress, uint128 tokenId, uint128 multiplier);

    // ========================== UNIQUE MULTIPLIER VOTING VAULT FUNCTIONALITY ============================

    /**
     * @notice initialization function to set initial variables. Can only be called once after deployment.
     *
     * @param manager_                 The address of the manager who can update the unique multiplier values.
     *
     */
    function initialize(address manager_) public {
        require(Storage.uint256Ptr("initialized").data == 0, "initialized");
        Storage.set(Storage.uint256Ptr("initialized"), 1);
        Storage.set(Storage.addressPtr("manager"), manager_);
        Storage.set(Storage.uint256Ptr("entered"), 1);
    }

    /**
     * @notice Performs ERC1155 registration and delegation for a caller.
     *
     * @dev User has to own ERC1155 nft for participation in this voting vault and multiplier access.
     *
     * @param _amount                   Amount of tokens sent to this contract by the user for locking
     *                                  in governance.
     * @param _tokenId                  The id of the ERC1155 NFT.
     * @param _tokenAddress             The address of the ERC1155 token the user is registering for multiplier
     *                                  access.
     * @param _delegatee                Optional param. The address to delegate the voting power associated
     *                                  with this Registration to
     */
    function addNftAndDelegate(
        uint128 _amount,
        uint128 _tokenId,
        address _tokenAddress,
        address _delegatee
    ) external virtual {
        address _who = msg.sender;
        uint128 withdrawn = 0;
        uint128 blockNumber = uint128(block.number);

        if (IERC1155(_tokenAddress).balanceOf(_who, _tokenId) < 1) revert UMVV_DoesNotOwn();

        // load the multipliers mapping storage (tokenAddress --> tokenId --> multiplier)
        VotingVaultStorage.AddressUintUint storage multiplierData = _multipliers()[_tokenAddress];

        // see if the value of this tokenId has been set in the multiplier mapping. if not, set it
        if (multiplierData.tokenId == 0) {
            multiplierData.tokenId = _tokenId;
        }
        // confirm that the submitted ERC1155 and tokenId have a multiplier, if not, revert
        if (multiplierData.multiplier == 0) revert UMVV_NoMultiplierSet();
        // caller's multiplier identified, emit event
        emit UserMultiplier(_who, _tokenAddress, _tokenId, multiplierData.multiplier);

        // load this contract's balance storage
        Storage.Uint256 storage balance = _balance();

        // load the registration
        VotingVaultStorage.Registration storage registration = _registrations()[_who];

        // If the token id is not zero, revert because the Registration is
        // already initialized. Only one Registration per msg.sender
        if (registration.tokenId != 0) revert UMVV_HasRegistration();

        // load the delegate. Defaults to the registration owner
        _delegatee = _delegatee == address(0) ? _who : _delegatee;

        // calculate the voting power provided by this registration
        uint128 newVotingPower = (_amount * uint128(multiplierData.multiplier)) / MULTIPLIER_DENOMINATOR;

        // set the new registration
        _registrations()[_who] = VotingVaultStorage.Registration(
            _amount,
            blockNumber,
            newVotingPower,
            withdrawn,
            _tokenId,
            _delegatee
        );

        // update this contract's balance
        balance.data += _amount;

        _grantVotingPower(_delegatee, newVotingPower);

        // transfer the user tokens into this contract
        _lockTokens(_who, address(this), _amount);

        emit VoteChange(registration.delegatee, _who, int256(uint256(newVotingPower)));
    }

    /**
     * @notice Getter for the registrations mapping.
     *
     * @param _who                      The owner of the registration to query.
     *
     * @return Registration             Registration of the provided address.
     */
    function getRegistration(address _who) external view returns (VotingVaultStorage.Registration memory) {
        return _registrations()[_who];
    }

    /**
     * @notice Changes the caller's token voting power delegation.
     *
     * @dev The total voting power is not guaranteed to go up because the token
     *      multiplier can be updated at any time.
     *
     * @param _to                       The address to delegate to.
     * @param _tokenAddress             The address of the ERC1155 token associated with the multiplier.
     */
    function delegate(address _to, address _tokenAddress) external virtual {
        VotingVaultStorage.Registration storage registration = _registrations()[msg.sender];
        // If _to address is already the delegate, don't send the tx
        if (_to == registration.delegatee) revert UMVV_AlreadyDelegated();

        History.HistoricalBalances memory votingPower = _votingPower();
        uint256 oldDelegateeVotes = votingPower.loadTop(registration.delegatee);

        // Remove voting power from old delegatee and emit event
        votingPower.push(registration.delegatee, oldDelegateeVotes - registration.latestVotingPower);
        emit VoteChange(registration.delegatee, msg.sender, -1 * int256(uint256(registration.latestVotingPower)));

        // Note - It is important that this is loaded here and not before the previous state change because if
        // _to == registration.delegatee and re-delegation was allowed we could be working with out of date state
        uint256 newDelegateeVotes = votingPower.loadTop(_to);
        // return the current voting power of the Registration. Varies based on the multiplier associated with the
        // user's ERC1155 token at the time of txn
        uint256 addedVotingPower = _currentVotingPower(registration, _tokenAddress);

        // add voting power to the target delegatee and emit event
        votingPower.push(_to, newDelegateeVotes + addedVotingPower);
        emit VoteChange(_to, msg.sender, int256(addedVotingPower));

        // update registration properties
        registration.latestVotingPower = uint128(addedVotingPower);
        registration.delegatee = _to;
    }

    /**
     * @notice Removes tokens from this contract and the voting power they represent.
     *
     * @param amount                      The amount of token to withdraw.
     * @param _tokenAddress             The address of the ERC1155 token associated with the multiplier.
     */
    function withdraw(uint128 amount, address _tokenAddress) external virtual nonReentrant {
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
            _syncVotingPower(msg.sender, registration, _tokenAddress);
        }
        if ((withdrawable - amount) == 0) {
            delete _registrations()[msg.sender];
        }
        // transfer the token amount to the user
        token.transfer(msg.sender, amount);
    }

    /**
     * @notice Getter for the multipliers mapping.
     *
     * @param  tokenAddress             The token contract address.
     *
     * @return multiplierValue          The multiplier value for the token address.
     *
     */
    function multipliers(address tokenAddress) external view returns (uint128) {
        VotingVaultStorage.AddressUintUint storage multiplierData = _multipliers()[tokenAddress];
        // get multiplier value
        return multiplierData.multiplier;
    }

    /**
     * @notice An onlyManager function for setting the multiplier value associated with an ERC1155
     *         contract address.
     *
     * @param _tokenAddress             The address of the ERC1155 token to set the
     *                                  multiplier for.
     * @param _multiplierValue          The multiplier value corresponding to the token address.
     *
     */
    function setMultiplier(
        address _tokenAddress,
        uint128 _multiplierValue
    ) public virtual onlyManager returns (bool multiplierSet) {
        if (_multiplierValue >= MAX_MULTIPLIER) revert UMVV_MultiplierLimit();

        VotingVaultStorage.AddressUintUint storage multiplierData = _multipliers()[_tokenAddress];
        // set multiplier value
        multiplierData.multiplier = _multiplierValue;
    }

    /**
     * @notice A function to access the storage of the nft's voting power multiplier.
     *
     * @return                          The token multiplier.
     */
    function multiplier(address _tokenAddress) external view virtual returns (uint256) {
        VotingVaultStorage.AddressUintUint storage multiplierData = _multipliers()[_tokenAddress];
        if (multiplierData.multiplier == 0) revert UMVV_NoMultiplierSet();

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
     * @param _who                       The address who's voting power we need to sync.
     *
     * @param _registration              The storage pointer to the registration of that user.
     */
    function _syncVotingPower(
        address _who,
        VotingVaultStorage.Registration storage _registration,
        address _tokenAddress
    ) internal {
        History.HistoricalBalances memory votingPower = _votingPower();

        uint256 delegateeVotes = votingPower.loadTop(_registration.delegatee);
        uint256 newVotingPower = _currentVotingPower(_registration, _tokenAddress);

        // get the change in voting power. Negative if the voting power is reduced
        int256 change = int256(newVotingPower) - int256(uint256(_registration.latestVotingPower));
        // do nothing if there is no change
        if (change == 0) return;
        if (change > 0) {
            votingPower.push(_registration.delegatee, delegateeVotes + uint256(change));
        } else {
            // if the change is negative, we multiply by -1 to avoid underflow when casting
            votingPower.push(_registration.delegatee, delegateeVotes - uint256(change * -1));
        }
        emit VoteChange(_registration.delegatee, _who, change);
        _registration.latestVotingPower = uint128(newVotingPower);
    }

    /**
     * @notice Calculates how much a user can withdraw.
     *
     * @param _registration               The the memory location of the loaded registration.
     *
     * @return withdrawable               Amount which can be withdrawn.
     */
    function _getWithdrawableAmount(
        VotingVaultStorage.Registration memory _registration
    ) internal view returns (uint256) {
        if (block.number < _registration.blockNumber) {
            return 0;
        }
        if (_registration.withdrawn == _registration.amount) {
            return (0);
        }
        uint256 withdrawable = _registration.amount - _registration.withdrawn;
        return (withdrawable);
    }

    /**
     * @notice Helper that returns the current voting power of a registration.
     *
     * @dev This is not always the recorded voting power since it uses the latest multiplier.
     *
     * @param _registration              The registration to check for voting power.
     * @param _tokenAddress              The address of the ERC1155 token associated with the multiplier.
     *
     * @return                           The current voting power of the registration.
     */
    function _currentVotingPower(
        VotingVaultStorage.Registration memory _registration,
        address _tokenAddress
    ) internal view virtual returns (uint256) {
        uint256 locked = _registration.amount - _registration.withdrawn;
        return locked * _multipliers()[_tokenAddress].multiplier;
    }

    /**
     * @notice A function to lock a user's tokens into this contract for
     *         participate in governance.
     *
     * @param from                      Address of owner tokens are transferred from.
     * @param to                        Address of where tokens are transferred to.
     * @param amount                    Amount of tokens being transferred.
     */
    function _lockTokens(address from, address to, uint256 amount) internal nonReentrant {
        token.transferFrom(from, to, amount);
    }

    /** @notice A single function endpoint for loading storage for multipliers.
     *
     * @return                          A storage mapping which can be used to lookup a
     *                                  token's multiplier data and token id data.
     */
    function _multipliers() internal pure returns (mapping(address => VotingVaultStorage.AddressUintUint) storage) {
        // This call returns a storage mapping with a unique non overwrite-able storage layout
        // which can be persisted through upgrades, even if they change storage layout
        return (VotingVaultStorage.mappingAddressToPackedUintUint("multipliers"));
    }
}
