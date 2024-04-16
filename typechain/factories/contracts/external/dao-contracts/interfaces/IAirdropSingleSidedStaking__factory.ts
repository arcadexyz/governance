/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  IAirdropSingleSidedStaking,
  IAirdropSingleSidedStakingInterface,
} from "../../../../../contracts/external/dao-contracts/interfaces/IAirdropSingleSidedStaking";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "delegation",
        type: "address",
      },
      {
        internalType: "enum IAirdropSingleSidedStaking.Lock",
        name: "lock",
        type: "uint8",
      },
    ],
    name: "airdropReceive",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export class IAirdropSingleSidedStaking__factory {
  static readonly abi = _abi;
  static createInterface(): IAirdropSingleSidedStakingInterface {
    return new utils.Interface(_abi) as IAirdropSingleSidedStakingInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): IAirdropSingleSidedStaking {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as IAirdropSingleSidedStaking;
  }
}
