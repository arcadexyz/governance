/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../common";
import type {
  ArcadeToken,
  ArcadeTokenInterface,
} from "../../../contracts/token/ArcadeToken";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_minter",
        type: "address",
      },
      {
        internalType: "address",
        name: "_initialDistribution",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "minter",
        type: "address",
      },
    ],
    name: "AT_MinterNotCaller",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "totalSupply",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "mintCapAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "AT_MintingCapExceeded",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "mintingAllowedAfter",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "currentTime",
        type: "uint256",
      },
    ],
    name: "AT_MintingNotStarted",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "addressType",
        type: "string",
      },
    ],
    name: "AT_ZeroAddress",
    type: "error",
  },
  {
    inputs: [],
    name: "AT_ZeroMintAmount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newMinter",
        type: "address",
      },
    ],
    name: "MinterUpdated",
    type: "event",
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
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "INITIAL_MINT_AMOUNT",
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
    name: "MINT_CAP",
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
    name: "MIN_TIME_BETWEEN_MINTS",
    outputs: [
      {
        internalType: "uint48",
        name: "",
        type: "uint48",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "PERCENT_DENOMINATOR",
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
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
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
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
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
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "burnFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "subtractedValue",
        type: "uint256",
      },
    ],
    name: "decreaseAllowance",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "addedValue",
        type: "uint256",
      },
    ],
    name: "increaseAllowance",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "minter",
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
    name: "mintingAllowedAfter",
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
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "nonces",
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
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
      {
        internalType: "uint8",
        name: "v",
        type: "uint8",
      },
      {
        internalType: "bytes32",
        name: "r",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "s",
        type: "bytes32",
      },
    ],
    name: "permit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_newMinter",
        type: "address",
      },
    ],
    name: "setMinter",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
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
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
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
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x6101406040527f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9610120523480156200003757600080fd5b5060405162001b4438038062001b448339810160408190526200005a9162000370565b6040518060400160405280600681526020016541726361646560d01b81525080604051806040016040528060018152602001603160f81b8152506040518060400160405280600681526020016541726361646560d01b81525060405180604001604052806004815260200163105490d160e21b8152508160039081620000e191906200044c565b506004620000f082826200044c565b5050825160209384012082519284019290922060c083815260e08290524660a0818152604080517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f818a018190528183019890985260608101959095526080808601939093523085830152805180860390920182529390920190925280519401939093209092526101005250506001600160a01b038216620001c35760405163408aa98760e11b815260206004820152600660248201526536b4b73a32b960d11b60448201526064015b60405180910390fd5b6001600160a01b0381166200021c5760405163408aa98760e11b815260206004820152601360248201527f696e697469616c446973747269627574696f6e000000000000000000000000006044820152606401620001ba565b600680546001600160a01b0319166001600160a01b038416179055620002476301e133804262000518565b60075562000261816a52b7d2dcc80cd2e400000062000269565b505062000540565b6001600160a01b038216620002c15760405162461bcd60e51b815260206004820152601f60248201527f45524332303a206d696e7420746f20746865207a65726f2061646472657373006044820152606401620001ba565b8060026000828254620002d5919062000518565b90915550506001600160a01b038216600090815260208190526040812080548392906200030490849062000518565b90915550506040518181526001600160a01b038316906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a35050565b505050565b80516001600160a01b03811681146200036b57600080fd5b919050565b600080604083850312156200038457600080fd5b6200038f8362000353565b91506200039f6020840162000353565b90509250929050565b634e487b7160e01b600052604160045260246000fd5b600181811c90821680620003d357607f821691505b602082108103620003f457634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156200034e57600081815260208120601f850160051c81016020861015620004235750805b601f850160051c820191505b8181101562000444578281556001016200042f565b505050505050565b81516001600160401b03811115620004685762000468620003a8565b6200048081620004798454620003be565b84620003fa565b602080601f831160018114620004b857600084156200049f5750858301515b600019600386901b1c1916600185901b17855562000444565b600085815260208120601f198616915b82811015620004e957888601518255948401946001909101908401620004c8565b5085821015620005085787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b808201808211156200053a57634e487b7160e01b600052601160045260246000fd5b92915050565b60805160a05160c05160e05161010051610120516115b462000590600039600061080301526000610d2c01526000610d7b01526000610d5601526000610cdb01526000610d0301526115b46000f3fe608060405234801561001057600080fd5b50600436106101585760003560e01c806370a08231116100c35780639e6c29591161007c5780639e6c2959146102dc578063a457c2d7146102e4578063a9059cbb146102f7578063d505accf1461030a578063dd62ed3e1461031d578063fca3b5aa1461035657600080fd5b806370a082311461025b57806379cc6790146102845780637ecebe001461029757806395d89b41146102aa57806398f1312e146102b25780639970ea80146102ba57600080fd5b806330b36cef1161011557806330b36cef14610200578063313ce567146102095780633644e51514610218578063395093511461022057806340c10f191461023357806342966c681461024857600080fd5b806306fdde031461015d578063075461721461017b578063095ea7b3146101a657806318160ddd146101c9578063211d9375146101db57806323b872dd146101ed575b600080fd5b610165610369565b6040516101729190611337565b60405180910390f35b60065461018e906001600160a01b031681565b6040516001600160a01b039091168152602001610172565b6101b96101b43660046113a1565b6103fb565b6040519015158152602001610172565b6002545b604051908152602001610172565b6101cd6a52b7d2dcc80cd2e400000081565b6101b96101fb3660046113cb565b610412565b6101cd60075481565b60405160128152602001610172565b6101cd6104c1565b6101b961022e3660046113a1565b6104d0565b6102466102413660046113a1565b61050c565b005b610246610256366004611407565b61064e565b6101cd610269366004611420565b6001600160a01b031660009081526020819052604090205490565b6102466102923660046113a1565b61065b565b6101cd6102a5366004611420565b6106dc565b6101656106fa565b6101cd600281565b6102c56301e1338081565b60405165ffffffffffff9091168152602001610172565b6101cd606481565b6101b96102f23660046113a1565b610709565b6101b96103053660046113a1565b6107a2565b610246610318366004611442565b6107af565b6101cd61032b3660046114b5565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b610246610364366004611420565b610913565b606060038054610378906114e8565b80601f01602080910402602001604051908101604052809291908181526020018280546103a4906114e8565b80156103f15780601f106103c6576101008083540402835291602001916103f1565b820191906000526020600020905b8154815290600101906020018083116103d457829003601f168201915b5050505050905090565b60006104083384846109e4565b5060015b92915050565b600061041f848484610b08565b6001600160a01b0384166000908152600160209081526040808320338452909152902054828110156104a95760405162461bcd60e51b815260206004820152602860248201527f45524332303a207472616e7366657220616d6f756e74206578636565647320616044820152676c6c6f77616e636560c01b60648201526084015b60405180910390fd5b6104b685338584036109e4565b506001949350505050565b60006104cb610cd7565b905090565b3360008181526001602090815260408083206001600160a01b03871684529091528120549091610408918590610507908690611532565b6109e4565b6006546001600160a01b031633146105465760065460405163fea13a7160e01b81526001600160a01b0390911660048201526024016104a0565b6007544210156105765760075460405163e2a2364960e01b815260048101919091524260248201526044016104a0565b6001600160a01b0382166105b25760405163408aa98760e11b8152602060048201526002602482015261746f60f01b60448201526064016104a0565b806000036105d3576040516395ecc32960e01b815260040160405180910390fd5b6105e16301e1338042611532565b6007556000606460026105f360025490565b6105fd9190611545565b610607919061155c565b90508082111561063f576002546040516310292e7360e11b8152600481019190915260248101829052604481018390526064016104a0565b6106498383610dc9565b505050565b6106583382610ea8565b50565b6000610667833361032b565b9050818110156106c55760405162461bcd60e51b8152602060048201526024808201527f45524332303a206275726e20616d6f756e74206578636565647320616c6c6f77604482015263616e636560e01b60648201526084016104a0565b6106d283338484036109e4565b6106498383610ea8565b6001600160a01b03811660009081526005602052604081205461040c565b606060048054610378906114e8565b3360009081526001602090815260408083206001600160a01b03861684529091528120548281101561078b5760405162461bcd60e51b815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604482015264207a65726f60d81b60648201526084016104a0565b61079833858584036109e4565b5060019392505050565b6000610408338484610b08565b834211156107ff5760405162461bcd60e51b815260206004820152601d60248201527f45524332305065726d69743a206578706972656420646561646c696e6500000060448201526064016104a0565b60007f000000000000000000000000000000000000000000000000000000000000000088888861082e8c610ff6565b6040805160208101969096526001600160a01b0394851690860152929091166060840152608083015260a082015260c0810186905260e00160405160208183030381529060405280519060200120905060006108898261101e565b905060006108998287878761106c565b9050896001600160a01b0316816001600160a01b0316146108fc5760405162461bcd60e51b815260206004820152601e60248201527f45524332305065726d69743a20696e76616c6964207369676e6174757265000060448201526064016104a0565b6109078a8a8a6109e4565b50505050505050505050565b6006546001600160a01b0316331461094d5760065460405163fea13a7160e01b81526001600160a01b0390911660048201526024016104a0565b6001600160a01b0381166109905760405163408aa98760e11b81526020600482015260096024820152683732bba6b4b73a32b960b91b60448201526064016104a0565b600680546001600160a01b0319166001600160a01b0383169081179091556040519081527fad0f299ec81a386c98df0ac27dae11dd020ed1b56963c53a7292e7a3a314539a9060200160405180910390a150565b6001600160a01b038316610a465760405162461bcd60e51b8152602060048201526024808201527f45524332303a20617070726f76652066726f6d20746865207a65726f206164646044820152637265737360e01b60648201526084016104a0565b6001600160a01b038216610aa75760405162461bcd60e51b815260206004820152602260248201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604482015261737360f01b60648201526084016104a0565b6001600160a01b0383811660008181526001602090815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a3505050565b6001600160a01b038316610b6c5760405162461bcd60e51b815260206004820152602560248201527f45524332303a207472616e736665722066726f6d20746865207a65726f206164604482015264647265737360d81b60648201526084016104a0565b6001600160a01b038216610bce5760405162461bcd60e51b815260206004820152602360248201527f45524332303a207472616e7366657220746f20746865207a65726f206164647260448201526265737360e81b60648201526084016104a0565b6001600160a01b03831660009081526020819052604090205481811015610c465760405162461bcd60e51b815260206004820152602660248201527f45524332303a207472616e7366657220616d6f756e7420657863656564732062604482015265616c616e636560d01b60648201526084016104a0565b6001600160a01b03808516600090815260208190526040808220858503905591851681529081208054849290610c7d908490611532565b92505081905550826001600160a01b0316846001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef84604051610cc991815260200190565b60405180910390a350505050565b60007f00000000000000000000000000000000000000000000000000000000000000004603610d2557507f000000000000000000000000000000000000000000000000000000000000000090565b50604080517f00000000000000000000000000000000000000000000000000000000000000006020808301919091527f0000000000000000000000000000000000000000000000000000000000000000828401527f000000000000000000000000000000000000000000000000000000000000000060608301524660808301523060a0808401919091528351808403909101815260c0909201909252805191012090565b6001600160a01b038216610e1f5760405162461bcd60e51b815260206004820152601f60248201527f45524332303a206d696e7420746f20746865207a65726f20616464726573730060448201526064016104a0565b8060026000828254610e319190611532565b90915550506001600160a01b03821660009081526020819052604081208054839290610e5e908490611532565b90915550506040518181526001600160a01b038316906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a35050565b6001600160a01b038216610f085760405162461bcd60e51b815260206004820152602160248201527f45524332303a206275726e2066726f6d20746865207a65726f206164647265736044820152607360f81b60648201526084016104a0565b6001600160a01b03821660009081526020819052604090205481811015610f7c5760405162461bcd60e51b815260206004820152602260248201527f45524332303a206275726e20616d6f756e7420657863656564732062616c616e604482015261636560f01b60648201526084016104a0565b6001600160a01b0383166000908152602081905260408120838303905560028054849290610fab90849061157e565b90915550506040518281526000906001600160a01b038516907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a3505050565b6001600160a01b03811660009081526005602052604090208054600181018255905b50919050565b600061040c61102b610cd7565b8360405161190160f01b6020820152602281018390526042810182905260009060620160405160208183030381529060405280519060200120905092915050565b600080600061107d87878787611094565b9150915061108a81611181565b5095945050505050565b6000807f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a08311156110cb5750600090506003611178565b8460ff16601b141580156110e357508460ff16601c14155b156110f45750600090506004611178565b6040805160008082526020820180845289905260ff881692820192909252606081018690526080810185905260019060a0016020604051602081039080840390855afa158015611148573d6000803e3d6000fd5b5050604051601f1901519150506001600160a01b03811661117157600060019250925050611178565b9150600090505b94509492505050565b600081600481111561119557611195611591565b0361119d5750565b60018160048111156111b1576111b1611591565b036111fe5760405162461bcd60e51b815260206004820152601860248201527f45434453413a20696e76616c6964207369676e6174757265000000000000000060448201526064016104a0565b600281600481111561121257611212611591565b0361125f5760405162461bcd60e51b815260206004820152601f60248201527f45434453413a20696e76616c6964207369676e6174757265206c656e6774680060448201526064016104a0565b600381600481111561127357611273611591565b036112cb5760405162461bcd60e51b815260206004820152602260248201527f45434453413a20696e76616c6964207369676e6174757265202773272076616c604482015261756560f01b60648201526084016104a0565b60048160048111156112df576112df611591565b036106585760405162461bcd60e51b815260206004820152602260248201527f45434453413a20696e76616c6964207369676e6174757265202776272076616c604482015261756560f01b60648201526084016104a0565b600060208083528351808285015260005b8181101561136457858101830151858201604001528201611348565b506000604082860101526040601f19601f8301168501019250505092915050565b80356001600160a01b038116811461139c57600080fd5b919050565b600080604083850312156113b457600080fd5b6113bd83611385565b946020939093013593505050565b6000806000606084860312156113e057600080fd5b6113e984611385565b92506113f760208501611385565b9150604084013590509250925092565b60006020828403121561141957600080fd5b5035919050565b60006020828403121561143257600080fd5b61143b82611385565b9392505050565b600080600080600080600060e0888a03121561145d57600080fd5b61146688611385565b965061147460208901611385565b95506040880135945060608801359350608088013560ff8116811461149857600080fd5b9699959850939692959460a0840135945060c09093013592915050565b600080604083850312156114c857600080fd5b6114d183611385565b91506114df60208401611385565b90509250929050565b600181811c908216806114fc57607f821691505b60208210810361101857634e487b7160e01b600052602260045260246000fd5b634e487b7160e01b600052601160045260246000fd5b8082018082111561040c5761040c61151c565b808202811582820484141761040c5761040c61151c565b60008261157957634e487b7160e01b600052601260045260246000fd5b500490565b8181038181111561040c5761040c61151c565b634e487b7160e01b600052602160045260246000fdfea164736f6c6343000812000a";

type ArcadeTokenConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: ArcadeTokenConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class ArcadeToken__factory extends ContractFactory {
  constructor(...args: ArcadeTokenConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    _minter: PromiseOrValue<string>,
    _initialDistribution: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ArcadeToken> {
    return super.deploy(
      _minter,
      _initialDistribution,
      overrides || {}
    ) as Promise<ArcadeToken>;
  }
  override getDeployTransaction(
    _minter: PromiseOrValue<string>,
    _initialDistribution: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(
      _minter,
      _initialDistribution,
      overrides || {}
    );
  }
  override attach(address: string): ArcadeToken {
    return super.attach(address) as ArcadeToken;
  }
  override connect(signer: Signer): ArcadeToken__factory {
    return super.connect(signer) as ArcadeToken__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ArcadeTokenInterface {
    return new utils.Interface(_abi) as ArcadeTokenInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ArcadeToken {
    return new Contract(address, _abi, signerOrProvider) as ArcadeToken;
  }
}
