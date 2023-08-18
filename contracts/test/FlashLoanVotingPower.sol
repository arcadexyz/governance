// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/INFTBoostVault.sol";
import "../external/council/CoreVoting.sol";

/**
 * @title FlashLoanVotingPower
 * @author Non-Fungible Technologies, Inc.
 *
 * This contract is used to simulate a flash loan scenario where a user is able to
 * borrow ARCD add it to the boost vault and create a proposal, then withdraw all
 * ARCD from the boost vault.
 */
contract FlashLoanVotingPower {
    address public immutable owner;

    address public immutable boostVault;
    address public immutable arcdToken;
    address public immutable coreVoting;

    constructor(address _boostVault, address _arcdToken, address _coreVoting) {
        boostVault = _boostVault;
        arcdToken = _arcdToken;
        coreVoting = _coreVoting;

        owner = msg.sender;
    }

    /// @notice helper function to create a registration with a specific token amount
    function createRegistration(uint128 amount) public onlyOwner {
        // approve the boost vault to spend ARCD
        IERC20(arcdToken).approve(boostVault, amount);

        // create registration with 100 ARCD
        INFTBoostVault(boostVault).addNftAndDelegate(amount, 0, address(0), address(this));
    }

    /// @notice user WITHOUT a registration can create a proposal if they take out
    /// a flash loan and add it to the boost vault. This function does not simulate
    /// the flash loan, it assumes the contract holds enough ARCD to create a proposal.
    function createProposalNoReg() public onlyOwner {
        // vaults
        address[] memory vaults = new address[](1);
        vaults[0] = boostVault;

        // vault data
        bytes[] memory data = new bytes[](1);
        data[0] = "0x";

        // target address
        address[] memory callAddress = new address[](1);
        callAddress[0] = address(0);

        // call data
        bytes[] memory callData = new bytes[](1);
        callData[0] = "0x";

        // create registration with 100 ARCD
        createRegistration(100 ether);

        // create proposal
        CoreVoting(coreVoting).proposal(
            vaults,
            data,
            callAddress,
            callData,
            block.number + 100000,
            CoreVoting.Ballot.YES
        );

        // withdraw ARCD from boost vault
        INFTBoostVault(boostVault).withdraw(100 ether);
    }

    /// @notice user WITH a registration can create a proposal if they take out
    /// a flash loan and add it to the boost vault. This function does not simulate
    /// the flash loan, it assumes the contract holds enough ARCD to create a proposal.
    /// Call this function after calling createRegistration().
    function createProposalWithReg() public onlyOwner {
        // vaults
        address[] memory vaults = new address[](1);
        vaults[0] = boostVault;

        // vault data
        bytes[] memory data = new bytes[](1);
        data[0] = "0x";

        // target address
        address[] memory callAddress = new address[](1);
        callAddress[0] = address(0);

        // call data
        bytes[] memory callData = new bytes[](1);
        callData[0] = "0x";

        // approve the boost vault to spend ARCD
        IERC20(arcdToken).approve(boostVault, 100 ether);

        // add 100 ARCD tokens to the existing registration
        INFTBoostVault(boostVault).addTokens(100 ether);

        // create proposal
        CoreVoting(coreVoting).proposal(
            vaults,
            data,
            callAddress,
            callData,
            block.number + 10000,
            CoreVoting.Ballot.YES
        );

        // withdraw ARCD from boost vault
        INFTBoostVault(boostVault).withdraw(100 ether);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "FlashLoanVotingPower: only owner");

        _;
    }
}
