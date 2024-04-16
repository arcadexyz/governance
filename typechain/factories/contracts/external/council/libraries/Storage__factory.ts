/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../../common";
import type {
  Storage,
  StorageInterface,
} from "../../../../../contracts/external/council/libraries/Storage";

const _abi = [
  {
    inputs: [
      {
        internalType: "string",
        name: "typeString",
        type: "string",
      },
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
    ],
    name: "getPtr",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
];

const _bytecode =
  "0x61023261003a600b82828239805160001a60731461002d57634e487b7160e01b600052600060045260246000fd5b30600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600436106100355760003560e01c806387ec29271461003a575b600080fd5b61004d610048366004610164565b61005f565b60405190815260200160405180910390f35b6000808360405160200161007391906101f8565b604051602081830303815290604052805190602001209050600081846040516020016100a092919061020b565b60408051808303601f19018152919052805160209091012095945050505050565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126100e857600080fd5b813567ffffffffffffffff80821115610103576101036100c1565b604051601f8301601f19908116603f0116810190828211818310171561012b5761012b6100c1565b8160405283815286602085880101111561014457600080fd5b836020870160208301376000602085830101528094505050505092915050565b6000806040838503121561017757600080fd5b823567ffffffffffffffff8082111561018f57600080fd5b61019b868387016100d7565b935060208501359150808211156101b157600080fd5b506101be858286016100d7565b9150509250929050565b6000815160005b818110156101e957602081850181015186830152016101cf565b50600093019283525090919050565b600061020482846101c8565b9392505050565b828152600061021d60208301846101c8565b94935050505056fea164736f6c6343000812000a";

type StorageConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: StorageConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class Storage__factory extends ContractFactory {
  constructor(...args: StorageConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<Storage> {
    return super.deploy(overrides || {}) as Promise<Storage>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): Storage {
    return super.attach(address) as Storage;
  }
  override connect(signer: Signer): Storage__factory {
    return super.connect(signer) as Storage__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): StorageInterface {
    return new utils.Interface(_abi) as StorageInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): Storage {
    return new Contract(address, _abi, signerOrProvider) as Storage;
  }
}