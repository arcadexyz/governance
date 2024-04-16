/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Signer,
  utils,
  Contract,
  ContractFactory,
  BigNumberish,
  Overrides,
} from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../../../common";
import type {
  LockingVault,
  LockingVaultInterface,
} from "../../../../../../contracts/external/council/vaults/LockingVault.sol/LockingVault";

const _abi = [
  {
    inputs: [
      {
        internalType: "contract IERC20",
        name: "_token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_staleBlockLag",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "int256",
        name: "amount",
        type: "int256",
      },
    ],
    name: "VoteChange",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newDelegate",
        type: "address",
      },
    ],
    name: "changeDelegation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "fundedAccount",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "firstDelegation",
        type: "address",
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
        name: "who",
        type: "address",
      },
    ],
    name: "deposits",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint96",
        name: "",
        type: "uint96",
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
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    name: "queryVotePower",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
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
        internalType: "uint256",
        name: "blockNumber",
        type: "uint256",
      },
    ],
    name: "queryVotePowerView",
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
    inputs: [],
    name: "staleBlockLag",
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
    inputs: [],
    name: "token",
    outputs: [
      {
        internalType: "contract IERC20",
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
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x60c060405234801561001057600080fd5b50604051610f75380380610f7583398101604081905261002f91610045565b6001600160a01b0390911660805260a05261007f565b6000806040838503121561005857600080fd5b82516001600160a01b038116811461006f57600080fd5b6020939093015192949293505050565b60805160a051610ebd6100b86000396000818160ba015261044d01526000818161012d0152818161029301526104f90152610ebd6000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c8063e91f32351161005b578063e91f323514610102578063f45346dc14610115578063fc0c546a14610128578063fc7e286d1461016757600080fd5b80632e1a7d4d1461008d5780639f973fd5146100a2578063c2c94b88146100b5578063e7d20283146100ef575b600080fd5b6100a061009b366004610c1d565b6101a1565b005b6100a06100b0366004610c52565b610310565b6100dc7f000000000000000000000000000000000000000000000000000000000000000081565b6040519081526020015b60405180910390f35b6100dc6100fd366004610c74565b610414565b6100dc610110366004610c9e565b610436565b6100a0610123366004610d25565b610485565b61014f7f000000000000000000000000000000000000000000000000000000000000000081565b6040516001600160a01b0390911681526020016100e6565b61017a610175366004610c52565b6106bc565b604080516001600160a01b0390931683526001600160601b039091166020830152016100e6565b60006101ab610700565b336000908152602091909152604090208054909150829082906014906101e2908490600160a01b90046001600160601b0316610d77565b82546001600160601b039182166101009390930a92830291909202199091161790555080546001600160a01b0316600061021a610730565b905060006102288284610771565b9050610240836102388784610d9e565b8491906107ee565b6001600160a01b03831633600080516020610e9183398151915261026688600019610db1565b60405190815260200160405180910390a360405163a9059cbb60e01b8152336004820152602481018690527f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03169063a9059cbb906044016020604051808303816000875af11580156102e4573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906103089190610de1565b505050505050565b600061031a610700565b3360009081526020919091526040812080546001600160a01b038581166001600160a01b031983161783559193506001600160601b03600160a01b82041692911690610364610730565b905060006103728284610771565b9050610382836102388684610d9e565b6001600160a01b03831633600080516020610e918339815191526103a887600019610db1565b60405190815260200160405180910390a360006103c58388610771565b90506103dd876103d58784610e03565b8591906107ee565b6040518581526001600160a01b038816903390600080516020610e918339815191529060200160405180910390a350505050505050565b60008061041f610730565b905061042c8185856108d1565b9150505b92915050565b600080610441610730565b905061047b86866104727f000000000000000000000000000000000000000000000000000000000000000043610d9e565b8492919061092a565b9695505050505050565b6001600160a01b0381166104d75760405162461bcd60e51b81526020600482015260146024820152732d32b9379030b23239103232b632b3b0ba34b7b760611b60448201526064015b60405180910390fd5b6040516323b872dd60e01b8152336004820152306024820152604481018390527f00000000000000000000000000000000000000000000000000000000000000006001600160a01b0316906323b872dd906064016020604051808303816000875af115801561054a573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061056e9190610de1565b506000610579610700565b6001600160a01b038086166000908152602092909252604090912080549092501680610607575080546001600160a01b0319166001600160a01b038316178082558290849083906014906105de908490600160a01b90046001600160601b0316610e16565b92506101000a8154816001600160601b0302191690836001600160601b03160217905550610650565b81548490839060149061062b908490600160a01b90046001600160601b0316610e16565b92506101000a8154816001600160601b0302191690836001600160601b031602179055505b600061065a610730565b905060006106688284610771565b9050826001600160a01b0316876001600160a01b0316600080516020610e918339815191528860405161069d91815260200190565b60405180910390a36106b3836102388884610e03565b50505050505050565b60008060006106c9610700565b6001600160a01b039485166000908152602091909152604090205493841694600160a01b9094046001600160601b03169392505050565b600061072b604051806040016040528060088152602001676465706f7369747360c01b815250610998565b905090565b60408051808201909152606081526000602082015261072b6040518060400160405280600b81526020016a3b37ba34b733a837bbb2b960a91b8152506109f3565b60008061077f846020015190565b6001600160a01b03841660009081526020919091526040812080549092506001600160801b0316908190036107b957600092505050610430565b60006107e3836107ca600185610d9e565b016001015460c081901c916001600160c01b0390911690565b979650505050505050565b6001600160c01b0381111561082b5760405162461bcd60e51b815260206004820152600360248201526227b7a160e91b60448201526064016104ce565b6000610838846020015190565b6001600160a01b03841660009081526020829052604081208054929350914360c01b9185831791608081901c916001600160801b0390911690811561088a57610886866107ca600185610d9e565b5090505b814382036108a05761089d600184610d9e565b90505b84816001890101554382146108c4576108c487856108bf866001610e03565b610a2c565b5050505050505050505050565b6000806108df856020015190565b6001600160a01b0385166000908152602082905260408120805492935091608081901c916001600160801b039091169061091c8488838686610a4c565b9a9950505050505050505050565b600080610938866020015190565b6001600160a01b0386166000908152602082905260408120805492935091608081901c916001600160801b039091169080610976858a8a8787610a4c565b915091508382111561091c5761098d848387610bb2565b61091c858385610a2c565b6000807f03a912cdb153207069d92d44a2357e3f0ce00f7ee84da3510f1c6851b4cac4ee9050600081846040516020016109d3929190610e36565b60408051601f198184030181529190528051602090910120949350505050565b6040805180820190915260608152600060208201526000610a1383610be2565b6040805180820190915293845260208401525090919050565b808210610a3857600080fd5b6001600160801b031660809190911b179055565b60008082600003610a8f5760405162461bcd60e51b815260206004820152600d60248201526c1d5b9a5b9a5d1a585b1a5e9959609a1b60448201526064016104ce565b85851115610a9c57600080fd5b828410610aa857600080fd5b6000610ab5600185610d9e565b90508460005b828214610b475760006002610ad08585610e03565b610adb906001610e03565b610ae59190610e6e565b6001818d01015490915060c081901c906001600160c01b03168b8203610b1557929650919450610ba89350505050565b8b821015610b31578a821015610b29578293505b829450610b3f565b610b3c600184610d9e565b95505b505050610abb565b60018a8301015460c081901c906001600160c01b03168a821115610b9e5760405162461bcd60e51b815260206004820152600e60248201526d536561726368204661696c75726560901b60448201526064016104ce565b9195509093505050505b9550959350505050565b81831115610bbf57600080fd5b60018101835b83811015610bdb57600082820155600101610bc5565b5050505050565b6000807f7b1a68ec3e3284b167e69db1c622dcfa612281976b71d7e2d239dbe16a75891a9050600081846040516020016109d3929190610e36565b600060208284031215610c2f57600080fd5b5035919050565b80356001600160a01b0381168114610c4d57600080fd5b919050565b600060208284031215610c6457600080fd5b610c6d82610c36565b9392505050565b60008060408385031215610c8757600080fd5b610c9083610c36565b946020939093013593505050565b60008060008060608587031215610cb457600080fd5b610cbd85610c36565b935060208501359250604085013567ffffffffffffffff80821115610ce157600080fd5b818701915087601f830112610cf557600080fd5b813581811115610d0457600080fd5b886020828501011115610d1657600080fd5b95989497505060200194505050565b600080600060608486031215610d3a57600080fd5b610d4384610c36565b925060208401359150610d5860408501610c36565b90509250925092565b634e487b7160e01b600052601160045260246000fd5b6001600160601b03828116828216039080821115610d9757610d97610d61565b5092915050565b8181038181111561043057610430610d61565b80820260008212600160ff1b84141615610dcd57610dcd610d61565b818105831482151761043057610430610d61565b600060208284031215610df357600080fd5b81518015158114610c6d57600080fd5b8082018082111561043057610430610d61565b6001600160601b03818116838216019080821115610d9757610d97610d61565b8281526000825160005b81811015610e5c57602081860181015185830182015201610e40565b50600092016020019182525092915050565b600082610e8b57634e487b7160e01b600052601260045260246000fd5b50049056fe33161cf2da28d747be9df136b6f3729390298494947268743193c53d73d3c2e0a164736f6c6343000812000a";

type LockingVaultConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: LockingVaultConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class LockingVault__factory extends ContractFactory {
  constructor(...args: LockingVaultConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    _token: PromiseOrValue<string>,
    _staleBlockLag: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<LockingVault> {
    return super.deploy(
      _token,
      _staleBlockLag,
      overrides || {}
    ) as Promise<LockingVault>;
  }
  override getDeployTransaction(
    _token: PromiseOrValue<string>,
    _staleBlockLag: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(_token, _staleBlockLag, overrides || {});
  }
  override attach(address: string): LockingVault {
    return super.attach(address) as LockingVault;
  }
  override connect(signer: Signer): LockingVault__factory {
    return super.connect(signer) as LockingVault__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): LockingVaultInterface {
    return new utils.Interface(_abi) as LockingVaultInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): LockingVault {
    return new Contract(address, _abi, signerOrProvider) as LockingVault;
  }
}