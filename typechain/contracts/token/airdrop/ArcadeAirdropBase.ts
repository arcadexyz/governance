/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type {
  FunctionFragment,
  Result,
  EventFragment,
} from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "../../../common";

export interface ArcadeAirdropBaseInterface extends utils.Interface {
  functions: {
    "authorize(address)": FunctionFragment;
    "authorized(address)": FunctionFragment;
    "claimed(address,bytes32)": FunctionFragment;
    "deauthorize(address)": FunctionFragment;
    "expiration()": FunctionFragment;
    "getClaimed(address,bytes32)": FunctionFragment;
    "isAuthorized(address)": FunctionFragment;
    "owner()": FunctionFragment;
    "reclaim(address)": FunctionFragment;
    "rewardsRoot()": FunctionFragment;
    "setMerkleRoot(bytes32,uint256)": FunctionFragment;
    "setOwner(address)": FunctionFragment;
    "token()": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "authorize"
      | "authorized"
      | "claimed"
      | "deauthorize"
      | "expiration"
      | "getClaimed"
      | "isAuthorized"
      | "owner"
      | "reclaim"
      | "rewardsRoot"
      | "setMerkleRoot"
      | "setOwner"
      | "token"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "authorize",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "authorized",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "claimed",
    values: [PromiseOrValue<string>, PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(
    functionFragment: "deauthorize",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "expiration",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getClaimed",
    values: [PromiseOrValue<string>, PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(
    functionFragment: "isAuthorized",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "reclaim",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "rewardsRoot",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "setMerkleRoot",
    values: [PromiseOrValue<BytesLike>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "setOwner",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(functionFragment: "token", values?: undefined): string;

  decodeFunctionResult(functionFragment: "authorize", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "authorized", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "claimed", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "deauthorize",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "expiration", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getClaimed", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "isAuthorized",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "reclaim", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "rewardsRoot",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setMerkleRoot",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "setOwner", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "token", data: BytesLike): Result;

  events: {
    "SetMerkleRoot(bytes32,uint256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "SetMerkleRoot"): EventFragment;
}

export interface SetMerkleRootEventObject {
  merkleRoot: string;
  expiration: BigNumber;
}
export type SetMerkleRootEvent = TypedEvent<
  [string, BigNumber],
  SetMerkleRootEventObject
>;

export type SetMerkleRootEventFilter = TypedEventFilter<SetMerkleRootEvent>;

export interface ArcadeAirdropBase extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: ArcadeAirdropBaseInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    authorize(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    authorized(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    claimed(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    deauthorize(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    expiration(overrides?: CallOverrides): Promise<[BigNumber]>;

    getClaimed(
      user: PromiseOrValue<string>,
      merkleRoot: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    isAuthorized(
      who: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    owner(overrides?: CallOverrides): Promise<[string]>;

    reclaim(
      destination: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    rewardsRoot(overrides?: CallOverrides): Promise<[string]>;

    setMerkleRoot(
      _merkleRoot: PromiseOrValue<BytesLike>,
      _expiration: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    setOwner(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    token(overrides?: CallOverrides): Promise<[string]>;
  };

  authorize(
    who: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  authorized(
    arg0: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<boolean>;

  claimed(
    arg0: PromiseOrValue<string>,
    arg1: PromiseOrValue<BytesLike>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  deauthorize(
    who: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  expiration(overrides?: CallOverrides): Promise<BigNumber>;

  getClaimed(
    user: PromiseOrValue<string>,
    merkleRoot: PromiseOrValue<BytesLike>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  isAuthorized(
    who: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<boolean>;

  owner(overrides?: CallOverrides): Promise<string>;

  reclaim(
    destination: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  rewardsRoot(overrides?: CallOverrides): Promise<string>;

  setMerkleRoot(
    _merkleRoot: PromiseOrValue<BytesLike>,
    _expiration: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  setOwner(
    who: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  token(overrides?: CallOverrides): Promise<string>;

  callStatic: {
    authorize(
      who: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    authorized(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<boolean>;

    claimed(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    deauthorize(
      who: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    expiration(overrides?: CallOverrides): Promise<BigNumber>;

    getClaimed(
      user: PromiseOrValue<string>,
      merkleRoot: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    isAuthorized(
      who: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<boolean>;

    owner(overrides?: CallOverrides): Promise<string>;

    reclaim(
      destination: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    rewardsRoot(overrides?: CallOverrides): Promise<string>;

    setMerkleRoot(
      _merkleRoot: PromiseOrValue<BytesLike>,
      _expiration: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    setOwner(
      who: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    token(overrides?: CallOverrides): Promise<string>;
  };

  filters: {
    "SetMerkleRoot(bytes32,uint256)"(
      merkleRoot?: PromiseOrValue<BytesLike> | null,
      expiration?: PromiseOrValue<BigNumberish> | null
    ): SetMerkleRootEventFilter;
    SetMerkleRoot(
      merkleRoot?: PromiseOrValue<BytesLike> | null,
      expiration?: PromiseOrValue<BigNumberish> | null
    ): SetMerkleRootEventFilter;
  };

  estimateGas: {
    authorize(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    authorized(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    claimed(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    deauthorize(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    expiration(overrides?: CallOverrides): Promise<BigNumber>;

    getClaimed(
      user: PromiseOrValue<string>,
      merkleRoot: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    isAuthorized(
      who: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    owner(overrides?: CallOverrides): Promise<BigNumber>;

    reclaim(
      destination: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    rewardsRoot(overrides?: CallOverrides): Promise<BigNumber>;

    setMerkleRoot(
      _merkleRoot: PromiseOrValue<BytesLike>,
      _expiration: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    setOwner(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    token(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    authorize(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    authorized(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    claimed(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    deauthorize(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    expiration(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getClaimed(
      user: PromiseOrValue<string>,
      merkleRoot: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    isAuthorized(
      who: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    owner(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    reclaim(
      destination: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    rewardsRoot(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    setMerkleRoot(
      _merkleRoot: PromiseOrValue<BytesLike>,
      _expiration: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    setOwner(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    token(overrides?: CallOverrides): Promise<PopulatedTransaction>;
  };
}
