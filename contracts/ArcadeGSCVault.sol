// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "./external/council/vaults/GSCVault.sol";

/**
 * @title ArcadeGSCVault
 * @author Non-Fungible Technologies, Inc.
 *
 * The Arcade GSC Voting Vault contract enables a 'council' of delegates who act as a steering committee
 * for the Arcade DAO.
 *
 * This GSC voting vault gives one vote to each member of the GSC council. To become a member of the GSC council,
 * a user must meet a minimum voting power threshold and prove their memebership on chain. Members can be kicked
 * off the council if their voting power falls below the minimum threshold. The voting parameters in this contract
 * can only be set by the Arcade DAO not the GSC committee.
 */
contract ArcadeGSCVault is GSCVault {
    // ==================================== CONSTRUCTOR ================================================

    /**
     * @notice Constructs the contract and initial variables.
     *
     * @param coreVoting                The core voting contract.
     * @param votingPowerBound          The amount of voting power needed to be on the GSC.
     * @param owner                     The owner of this contract.
     */
    constructor(
        ICoreVoting coreVoting,
        uint256 votingPowerBound,
        address owner
    ) GSCVault(coreVoting, votingPowerBound, owner) {}
}
