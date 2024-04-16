/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../common";
import type {
  BalanceQuery,
  BalanceQueryInterface,
} from "../../../../contracts/snapshot/BalanceQuery.sol/BalanceQuery";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_vaultManager",
        type: "address",
      },
      {
        internalType: "address[]",
        name: "votingVaults",
        type: "address[]",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "who",
        type: "address",
      },
    ],
    name: "authorize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "authorized",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "balanceOf",
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
        name: "who",
        type: "address",
      },
    ],
    name: "deauthorize",
    outputs: [],
    stateMutability: "nonpayable",
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
    name: "isAuthorized",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
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
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "blockNumber",
        type: "uint256",
      },
    ],
    name: "queryVotePowerView",
    outputs: [
      {
        internalType: "uint256",
        name: "userVotingPower",
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
        name: "who",
        type: "address",
      },
    ],
    name: "setOwner",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "_vaults",
        type: "address[]",
      },
    ],
    name: "updateVaults",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "vaults",
    outputs: [
      {
        internalType: "contract IVotingVaultView",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x60806040523480156200001157600080fd5b5060405162000ac238038062000ac283398101604081905262000034916200020b565b600080546001600160a01b0319163317905580516001600160401b03811115620000625762000062620001f5565b6040519080825280602002602001820160405280156200008c578160200160208202803683370190505b508051620000a39160029160209091019062000157565b5060005b81518110156200012257818181518110620000c657620000c6620002f4565b602002602001015160028281548110620000e457620000e4620002f4565b600091825260209091200180546001600160a01b0319166001600160a01b03929092169190911790558062000119816200030a565b915050620000a7565b506200014f826001600160a01b03166000908152600160208190526040909120805460ff19169091179055565b505062000332565b828054828255906000526020600020908101928215620001af579160200282015b82811115620001af57825182546001600160a01b0319166001600160a01b0390911617825560209092019160019091019062000178565b50620001bd929150620001c1565b5090565b5b80821115620001bd5760008155600101620001c2565b80516001600160a01b0381168114620001f057600080fd5b919050565b634e487b7160e01b600052604160045260246000fd5b600080604083850312156200021f57600080fd5b6200022a83620001d8565b602084810151919350906001600160401b03808211156200024a57600080fd5b818601915086601f8301126200025f57600080fd5b815181811115620002745762000274620001f5565b8060051b604051601f19603f830116810181811085821117156200029c576200029c620001f5565b604052918252848201925083810185019189831115620002bb57600080fd5b938501935b82851015620002e457620002d485620001d8565b84529385019392850192620002c0565b8096505050505050509250929050565b634e487b7160e01b600052603260045260246000fd5b6000600182016200032b57634e487b7160e01b600052601160045260246000fd5b5060010190565b61078080620003426000396000f3fe608060405234801561001057600080fd5b506004361061009e5760003560e01c80638da5cb5b116100665780638da5cb5b1461012f578063b6a5d7de14610142578063b918161114610155578063e7d2028314610188578063fe9fbb801461019b57600080fd5b806311757b9e146100a357806313af4035146100b857806327c97fa5146100cb57806370a08231146100de5780638c64ea4a14610104575b600080fd5b6100b66100b136600461059b565b6101c7565b005b6100b66100c6366004610660565b6102f4565b6100b66100d9366004610660565b610340565b6100f16100ec366004610660565b61038b565b6040519081526020015b60405180910390f35b610117610112366004610682565b610464565b6040516001600160a01b0390911681526020016100fb565b600054610117906001600160a01b031681565b6100b6610150366004610660565b61048e565b610178610163366004610660565b60016020526000908152604090205460ff1681565b60405190151581526020016100fb565b6100f161019636600461069b565b6104e6565b6101786101a9366004610660565b6001600160a01b031660009081526001602052604090205460ff1690565b3360009081526001602052604090205460ff166102235760405162461bcd60e51b815260206004820152601560248201527414d95b99195c881b9bdd08105d5d1a1bdc9a5e9959605a1b60448201526064015b60405180910390fd5b805167ffffffffffffffff81111561023d5761023d610569565b604051908082528060200260200182016040528015610266578160200160208202803683370190505b50805161027b916002916020909101906104ef565b5060005b81518110156102f05781818151811061029a5761029a6106c5565b6020026020010151600282815481106102b5576102b56106c5565b600091825260209091200180546001600160a01b0319166001600160a01b0392909216919091179055806102e8816106f1565b91505061027f565b5050565b6000546001600160a01b0316331461031e5760405162461bcd60e51b815260040161021a9061070a565b600080546001600160a01b0319166001600160a01b0392909216919091179055565b6000546001600160a01b0316331461036a5760405162461bcd60e51b815260040161021a9061070a565b6001600160a01b03166000908152600160205260409020805460ff19169055565b600080805b60025481101561045d57600281815481106103ad576103ad6106c5565b6000918252602090912001546001600160a01b031663e7d20283856103d3600143610734565b6040516001600160e01b031960e085901b1681526001600160a01b0390921660048301526024820152604401602060405180830381865afa925050508015610438575060408051601f3d908101601f1916820190925261043591810190610747565b60015b1561044b576104478184610760565b9250505b80610455816106f1565b915050610390565b5092915050565b6002818154811061047457600080fd5b6000918252602090912001546001600160a01b0316905081565b6000546001600160a01b031633146104b85760405162461bcd60e51b815260040161021a9061070a565b6104e3816001600160a01b03166000908152600160208190526040909120805460ff19169091179055565b50565b60005b92915050565b828054828255906000526020600020908101928215610544579160200282015b8281111561054457825182546001600160a01b0319166001600160a01b0390911617825560209092019160019091019061050f565b50610550929150610554565b5090565b5b808211156105505760008155600101610555565b634e487b7160e01b600052604160045260246000fd5b80356001600160a01b038116811461059657600080fd5b919050565b600060208083850312156105ae57600080fd5b823567ffffffffffffffff808211156105c657600080fd5b818501915085601f8301126105da57600080fd5b8135818111156105ec576105ec610569565b8060051b604051601f19603f8301168101818110858211171561061157610611610569565b60405291825284820192508381018501918883111561062f57600080fd5b938501935b82851015610654576106458561057f565b84529385019392850192610634565b98975050505050505050565b60006020828403121561067257600080fd5b61067b8261057f565b9392505050565b60006020828403121561069457600080fd5b5035919050565b600080604083850312156106ae57600080fd5b6106b78361057f565b946020939093013593505050565b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052601160045260246000fd5b600060018201610703576107036106db565b5060010190565b60208082526010908201526f29b2b73232b9103737ba1037bbb732b960811b604082015260600190565b818103818111156104e9576104e96106db565b60006020828403121561075957600080fd5b5051919050565b808201808211156104e9576104e96106db56fea164736f6c6343000812000a";

type BalanceQueryConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: BalanceQueryConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class BalanceQuery__factory extends ContractFactory {
  constructor(...args: BalanceQueryConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    _vaultManager: PromiseOrValue<string>,
    votingVaults: PromiseOrValue<string>[],
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<BalanceQuery> {
    return super.deploy(
      _vaultManager,
      votingVaults,
      overrides || {}
    ) as Promise<BalanceQuery>;
  }
  override getDeployTransaction(
    _vaultManager: PromiseOrValue<string>,
    votingVaults: PromiseOrValue<string>[],
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(
      _vaultManager,
      votingVaults,
      overrides || {}
    );
  }
  override attach(address: string): BalanceQuery {
    return super.attach(address) as BalanceQuery;
  }
  override connect(signer: Signer): BalanceQuery__factory {
    return super.connect(signer) as BalanceQuery__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): BalanceQueryInterface {
    return new utils.Interface(_abi) as BalanceQueryInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): BalanceQuery {
    return new Contract(address, _abi, signerOrProvider) as BalanceQuery;
  }
}
