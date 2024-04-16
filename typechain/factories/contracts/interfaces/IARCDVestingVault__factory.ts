/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  IARCDVestingVault,
  IARCDVestingVaultInterface,
} from "../../../contracts/interfaces/IARCDVestingVault";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_who",
        type: "address",
      },
      {
        internalType: "uint128",
        name: "_amount",
        type: "uint128",
      },
      {
        internalType: "uint128",
        name: "_cliffAmount",
        type: "uint128",
      },
      {
        internalType: "uint64",
        name: "_expiration",
        type: "uint64",
      },
      {
        internalType: "uint64",
        name: "_cliff",
        type: "uint64",
      },
      {
        internalType: "address",
        name: "_delegatee",
        type: "address",
      },
    ],
    name: "addGrantAndDelegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_who",
        type: "address",
      },
    ],
    name: "claimable",
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
        name: "_to",
        type: "address",
      },
    ],
    name: "delegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_who",
        type: "address",
      },
    ],
    name: "getGrant",
    outputs: [
      {
        components: [
          {
            internalType: "uint128",
            name: "allocation",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "cliffAmount",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "withdrawn",
            type: "uint128",
          },
          {
            internalType: "uint64",
            name: "expiration",
            type: "uint64",
          },
          {
            internalType: "uint64",
            name: "cliff",
            type: "uint64",
          },
          {
            internalType: "uint256",
            name: "latestVotingPower",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "delegatee",
            type: "address",
          },
        ],
        internalType: "struct ARCDVestingVaultStorage.Grant",
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
        name: "_who",
        type: "address",
      },
    ],
    name: "revokeGrant",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_recipient",
        type: "address",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export class IARCDVestingVault__factory {
  static readonly abi = _abi;
  static createInterface(): IARCDVestingVaultInterface {
    return new utils.Interface(_abi) as IARCDVestingVaultInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): IARCDVestingVault {
    return new Contract(address, _abi, signerOrProvider) as IARCDVestingVault;
  }
}
