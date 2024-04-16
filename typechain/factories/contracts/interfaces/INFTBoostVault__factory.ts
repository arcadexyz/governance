/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  INFTBoostVault,
  INFTBoostVaultInterface,
} from "../../../contracts/interfaces/INFTBoostVault";

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newAirdropContract",
        type: "address",
      },
    ],
    name: "AirdropContractUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "tokenId",
        type: "uint128",
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "multiplier",
        type: "uint128",
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "expiration",
        type: "uint128",
      },
    ],
    name: "MultiplierSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [],
    name: "WithdrawalsUnlocked",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint128",
        name: "amount",
        type: "uint128",
      },
      {
        internalType: "uint128",
        name: "tokenId",
        type: "uint128",
      },
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "delegatee",
        type: "address",
      },
    ],
    name: "addNftAndDelegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint128",
        name: "amount",
        type: "uint128",
      },
    ],
    name: "addTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "uint128",
        name: "amount",
        type: "uint128",
      },
      {
        internalType: "address",
        name: "delegatee",
        type: "address",
      },
    ],
    name: "airdropReceive",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
    ],
    name: "delegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getAirdropContract",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getIsLocked",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "uint128",
        name: "tokenId",
        type: "uint128",
      },
    ],
    name: "getMultiplier",
    outputs: [
      {
        internalType: "uint128",
        name: "",
        type: "uint128",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "uint128",
        name: "tokenId",
        type: "uint128",
      },
    ],
    name: "getMultiplierExpiration",
    outputs: [
      {
        internalType: "uint128",
        name: "",
        type: "uint128",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "who",
        type: "address",
      },
    ],
    name: "getRegistration",
    outputs: [
      {
        components: [
          {
            internalType: "uint128",
            name: "amount",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "latestVotingPower",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "withdrawn",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "tokenId",
            type: "uint128",
          },
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address",
          },
          {
            internalType: "address",
            name: "delegatee",
            type: "address",
          },
        ],
        internalType: "struct NFTBoostVaultStorage.Registration",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_newAirdropContract",
        type: "address",
      },
    ],
    name: "setAirdropContract",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "uint128",
        name: "tokenId",
        type: "uint128",
      },
      {
        internalType: "uint128",
        name: "multiplierValue",
        type: "uint128",
      },
      {
        internalType: "uint128",
        name: "expiration",
        type: "uint128",
      },
    ],
    name: "setMultiplier",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unlock",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint128",
        name: "newTokenId",
        type: "uint128",
      },
      {
        internalType: "address",
        name: "newTokenAddress",
        type: "address",
      },
    ],
    name: "updateNft",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "userAddresses",
        type: "address[]",
      },
    ],
    name: "updateVotingPower",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint128",
        name: "amount",
        type: "uint128",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawNft",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export class INFTBoostVault__factory {
  static readonly abi = _abi;
  static createInterface(): INFTBoostVaultInterface {
    return new utils.Interface(_abi) as INFTBoostVaultInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): INFTBoostVault {
    return new Contract(address, _abi, signerOrProvider) as INFTBoostVault;
  }
}
