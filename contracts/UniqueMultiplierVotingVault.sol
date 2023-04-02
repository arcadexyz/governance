// SPDX-License-Identifier: MIT

pragma solidity >=0.8.18;

/* solhint-disable no-global-import */
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "./external/council/libraries/History.sol";
import "./external/council/libraries/Storage.sol";
import "./external/council/interfaces/IERC20.sol";
import "./libraries/VotingVaultStorage.sol";

import "./BaseVotingVault.sol";

import {
    PVV_DoesNotOwn,
    PVV_HasRegistration,
    PVV_AlreadyDelegated,
    PVV_InsufficientBalance,
    PVV_InsufficientRegistrationBalance
} from "./errors/Governance.sol";
/* solhint-disable no-console */
import "hardhat/console.sol";

/**
 *
 * @title PromissoryVotingVault
 * @author Non-Fungible Technologies, Inc.
 *
 * This contract enables holders of Arcade promissory notes to gain an advantage wrt
 * voting power for participation in governance. Users send their tokens to the contract
 * and provide their promissoryNote id as calldata. Once the contract confirms their ownership
 * of the promissory note id, they are able to delegate their voting power for participation in
 * governance.
 * Voting power for participants in this voting vault is enhanced by a multiplier.
 * This contract is Simple Proxy upgradeable which is the upgradeability system used for voting
 * vaults in Council.
 *
 * @dev There is no emergency withdrawal in this contract, any funds not sent via
 *      addPnoteAndDelegate() are unrecoverable by this version of the PromissoryVotingVault.
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

    // Event to track txn multiplier data
    event TransactionMultiplierSet(address indexed user, address badgeAddress, uint128 tokenId, uint256 multiplier);

    // =================================== VOTING VAULT FUNCTIONALITY =====================================

    /**
     * @notice initialization function to set initial variables. Can only be called once after deployment.
     *
     * @param timelock_                The timelock address can change the multipliers.
     * @param goldBadge_               The goldBadge contract address.
     * @param silverBadge_             The silverBadge contract address.
     * @param bronzeBadge_             The bronzeBadge contract address.
     *
     */
    function initialize(address timelock_, address goldBadge_, address silverBadge_, address bronzeBadge_) public {
        require(Storage.uint256Ptr("initialized").data == 0, "initialized");
        Storage.set(Storage.uint256Ptr("initialized"), 1);
        Storage.set(Storage.addressPtr("timelock"), timelock_);
        Storage.set(Storage.addressPtr("goldBadge"), goldBadge_);
        Storage.set(Storage.addressPtr("silverBadge"), silverBadge_);
        Storage.set(Storage.addressPtr("bronzeBadge"), bronzeBadge_);
        Storage.set(Storage.uint256Ptr("goldMultiplier"), 1.2e18);
        Storage.set(Storage.uint256Ptr("silverMultiplier"), 1.15e18);
        Storage.set(Storage.uint256Ptr("bronzeMultiplier"), 1.1e18);
        Storage.set(Storage.uint256Ptr("entered"), 1);
    }

    /////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////
    // TODO: CREATE SET MULTIPLIER FOR EACH LEVEL BY CERTAIN OWNER
    ///////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////

    /**
     * @notice Performs badge registration for a caller.
     *
     * @dev User has to own badge ERC721 for participation in this voting vault.
     *
     * @param _amount                   Amount of tokens sent to this contract by the user for locking
     *                                  in governance.
     * @param _tokenId                  The id of the badge NFT.
     * @param _badgeLevel               The level the badge NFT GOLD / SILVER / BRONZE.
     * @param _delegatee                Optional param. The address to delegate the voting power associated
     *                                  with this Registration to
     */
    function addBadgeAndDelegate(
        uint128 _amount,
        uint128 _tokenId,
        VotingVaultStorage.Badge _badgeLevel,
        address _delegatee
    ) external virtual {
        address _who = msg.sender;
        uint128 withdrawn = 0;
        uint128 blockNumber = uint128(block.number);

        Storage.Uint256 storage balance = _balance();
        // TODO: check if variable ok to set up like this
        address badgeAddress = _getBadgeAddressAndSetMultiplier(_badgeLevel, _tokenId);

        Storage.Uint256 memory multiplier = _multiplier();
        emit TransactionMultiplierSet(_who, badgeAddress, _tokenId, multiplier.data);

        // Load our badges storage
        VotingVaultStorage.AddressUintUint storage badgeData = _badges()[badgeAddress];
        // set badge tokenId
        _tokenId = badgeData.tokenId;

        // load the registration
        VotingVaultStorage.Registration storage registration = _registrations()[_who];

        // If the id of the badge is not zero, revert because the Registration is
        // already initialized. Only one Registration per msg.sender
        if (registration.tokenId != 0) revert PVV_HasRegistration();

        // load the delegate. Defaults to the registration owner
        _delegatee = _delegatee == address(0) ? _who : _delegatee;

        // calculate the voting power
        uint128 newVotingPower = (_amount * uint128(multiplier.data)) / MULTIPLIER_DENOMINATOR;

        // set the new registration
        _registrations()[_who] = VotingVaultStorage.Registration(
            _amount,
            blockNumber,
            newVotingPower,
            withdrawn,
            _tokenId,
            _delegatee
        );

        // set the multiplier data for the badge
        badgeData.multiplier = uint128(multiplier.data);

        // update this contract's balance
        balance.data += _amount;

        _grantVotingPower(_delegatee, newVotingPower);

        // transfer the user tokens into this contract
        _lockTokens(_who, address(this), _amount);

        emit VoteChange(registration.delegatee, _who, int256(uint256(newVotingPower)));
    }

    // TODO: create NATSPEC.
    // MOVE to helper section.
    function _getBadgeAddressAndSetMultiplier(
        VotingVaultStorage.Badge _badgeLevel,
        uint128 _tokenId
    ) internal returns (address badgeAddress) {
        if (uint(_badgeLevel) == 0) {
            badgeAddress = goldBadge();
            setMultiplier(goldMultiplier());
        } else if (uint(_badgeLevel) == 1) {
            badgeAddress = silverBadge();
            setMultiplier(silverMultiplier());
        } else if (uint(_badgeLevel) == 2) {
            badgeAddress = bronzeBadge();
            setMultiplier(bronzeMultiplier());
        }
        if (IERC721(badgeAddress).ownerOf(_tokenId) != msg.sender) revert PVV_DoesNotOwn();
        return badgeAddress;
    }

    // TODO: create NATSPEC.
    // MOVE to helper section.
    function _lockTokens(address from, address to, uint256 amount) internal {
        token.transferFrom(from, to, amount);
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
     */
    function delegate(address _to) external virtual {
        VotingVaultStorage.Registration storage registration = _registrations()[msg.sender];
        // If _to address is already the delegate, don't send the tx
        if (_to == registration.delegatee) revert PVV_AlreadyDelegated();

        History.HistoricalBalances memory votingPower = _votingPower();
        uint256 oldDelegateeVotes = votingPower.loadTop(registration.delegatee);

        // Remove voting power from old delegatee and emit event
        votingPower.push(registration.delegatee, oldDelegateeVotes - registration.latestVotingPower);
        emit VoteChange(registration.delegatee, msg.sender, -1 * int256(uint256(registration.latestVotingPower)));

        // Note - It is important that this is loaded here and not before the previous state change because if
        // _to == registration.delegatee and re-delegation was allowed we could be working with out of date state
        uint256 newDelegateeVotes = votingPower.loadTop(_to);
        // return the current voting power of the Registration
        uint256 addedVotingPower = _currentVotingPower(registration);

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
     */
    function withdraw(uint128 amount) external virtual nonReentrant {
        // load the registration
        VotingVaultStorage.Registration storage registration = _registrations()[msg.sender];
        // get the withdrawable amount
        uint256 withdrawable = _getWithdrawableAmount(registration);

        // get this contract's balance
        Storage.Uint256 storage balance = _balance();
        if (balance.data < amount) revert PVV_InsufficientBalance();
        if (registration.amount < amount) revert PVV_InsufficientRegistrationBalance();
        if ((withdrawable - amount) >= 0) {
            // update contract balance
            balance.data -= amount;
            // update withdrawn amount
            registration.withdrawn += amount;
            // update the delegatee's voting power
            _syncVotingPower(msg.sender, registration);
        }
        if ((withdrawable - amount) == 0) {
            delete _registrations()[msg.sender];
        }
        // transfer the token amount to the user
        token.transfer(msg.sender, amount);
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
    function _syncVotingPower(address _who, VotingVaultStorage.Registration storage _registration) internal {
        History.HistoricalBalances memory votingPower = _votingPower();

        uint256 delegateeVotes = votingPower.loadTop(_registration.delegatee);
        uint256 newVotingPower = _currentVotingPower(_registration);

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
     *
     * @return                           The current voting power of the registration.
     */
    function _currentVotingPower(
        VotingVaultStorage.Registration memory _registration
    ) internal pure virtual returns (uint256) {
        uint256 locked = _registration.amount - _registration.withdrawn;
        return locked * _multiplier().data;
    }

    // /** TODO: FIX NATSPEC
    //  * @notice Getter for the multipliers mapping.
    //  *
    //  * @param  badge                    The badge contract address.
    //  * @param  tokenId                  The badge token id.
    //  *
    //  * @return badge                    The multiplier value.
    //  * @return tokenId                  The multiplier value.
    //  */
    function badges(address badge) external view returns (uint128, uint128) {
        VotingVaultStorage.AddressUintUint storage badgeData = _badges()[badge];
        return (badgeData.tokenId, badgeData.multiplier);
    }

    /**
     * @notice A single function endpoint for loading storage for badges.
     *
     * @return                          A storage mapping which can be used to
     *                                  lookup multiplier data.
     */
    function _badges() internal pure returns (mapping(address => VotingVaultStorage.AddressUintUint) storage) {
        // This call returns a storage mapping with a unique non overwrite-able storage layout
        // which can be persisted through upgrades, even if they change storage layout
        return (VotingVaultStorage.mappingAddressToPackedUintUint("badges"));
    }

    /**
     * @notice A function to access the storage of the goldBadge address.
     *
     * @return                          The goldBadge contract address.
     */
    function goldBadge() public pure returns (address) {
        return _goldBadge().data;
    }

    /**
     * @notice A helper function to access the storage of the goldBadge contract address.
     *
     * @return                          A struct containing the goldBadge
     *                                  contract address.
     */
    function _goldBadge() internal pure returns (Storage.Address memory) {
        return Storage.addressPtr("goldBadge");
    }

    /**
     * @notice A function to access the storage of the silverBadge address.
     *
     * @return                          The silverBadge contract address.
     */
    function silverBadge() public pure returns (address) {
        return _silverBadge().data;
    }

    /**
     * @notice A helper function to access the storage of the silverBadge contract address.
     *
     * @return                          A struct containing the silverBadge
     *                                  contract address.
     */
    function _silverBadge() internal pure returns (Storage.Address memory) {
        return Storage.addressPtr("silverBadge");
    }

    /**
     * @notice A function to access the storage of the bronzeBadge address.
     *
     * @return                          The bronzeBadge contract address.
     */
    function bronzeBadge() public pure returns (address) {
        return _bronzeBadge().data;
    }

    /**
     * @notice A helper function to access the storage of the bronzeBadge contract address.
     *
     * @return                          A struct containing the bronzeBadge
     *                                  contract address.
     */
    function _bronzeBadge() internal pure returns (Storage.Address memory) {
        return Storage.addressPtr("bronzeBadge");
    }

    /** TODO: FIX NATSPEC
     * @notice A function to access the storage of the manager address.
     *
     * @dev The manager can access all functions with the onlyManager modifier.
     *
     * @return                          The manager address.
     */
    function goldMultiplier() public pure returns (uint256) {
        return _goldMultiplier().data;
    }

    /** TODO: FIX NATSPEC
     * @notice A function to access the storage of the multiplier value.
     *
     * @dev The multiplier is a number that boosts the voting power of a user's
     * governance tokens because of that user simultaneously holding an active loan.
     * The voting power of the user would equal the product of the number of tokens
     * deposited into the voting vault multiplied by the value of the multiplier.
     *
     * @return                          A struct containing the multiplier uint.
     */
    function _goldMultiplier() internal pure returns (Storage.Uint256 memory) {
        return Storage.uint256Ptr("goldMultiplier");
    }

    /** TODO: FIX NATSPEC
     * @notice A function to access the storage of the manager address.
     *
     * @dev The manager can access all functions with the onlyManager modifier.
     *
     * @return                          The manager address.
     */
    function silverMultiplier() public pure returns (uint256) {
        return _silverMultiplier().data;
    }

    /** TODO: FIX NATSPEC
     * @notice A function to access the storage of the multiplier value.
     *
     * @dev The multiplier is a number that boosts the voting power of a user's
     * governance tokens because of that user simultaneously holding an active loan.
     * The voting power of the user would equal the product of the number of tokens
     * deposited into the voting vault multiplied by the value of the multiplier.
     *
     * @return                          A struct containing the multiplier uint.
     */
    function _silverMultiplier() internal pure returns (Storage.Uint256 memory) {
        return Storage.uint256Ptr("silverMultiplier");
    }

    /** TODO: FIX NATSPEC
     * @notice A function to access the storage of the manager address.
     *
     * @dev The manager can access all functions with the onlyManager modifier.
     *
     * @return                          The manager address.
     */
    function bronzeMultiplier() public pure returns (uint256) {
        return _bronzeMultiplier().data;
    }

    /** TODO: FIX NATSPEC
     * @notice A function to access the storage of the multiplier value.
     *
     * @dev The multiplier is a number that boosts the voting power of a user's
     * governance tokens because of that user simultaneously holding an active loan.
     * The voting power of the user would equal the product of the number of tokens
     * deposited into the voting vault multiplied by the value of the multiplier.
     *
     * @return                          A struct containing the multiplier uint.
     */
    function _bronzeMultiplier() internal pure returns (Storage.Uint256 memory) {
        return Storage.uint256Ptr("bronzeMultiplier");
    }
}
