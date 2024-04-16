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
} from "../../common";

export interface BaseVotingVaultHistoryInterface extends utils.Interface {
  functions: {
    "manager()": FunctionFragment;
    "queryVotePower(address,uint256,bytes)": FunctionFragment;
    "queryVotePowerView(address,uint256)": FunctionFragment;
    "setManager(address)": FunctionFragment;
    "setTimelock(address)": FunctionFragment;
    "staleBlockLag()": FunctionFragment;
    "timelock()": FunctionFragment;
    "token()": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "manager"
      | "queryVotePower"
      | "queryVotePowerView"
      | "setManager"
      | "setTimelock"
      | "staleBlockLag"
      | "timelock"
      | "token"
  ): FunctionFragment;

  encodeFunctionData(functionFragment: "manager", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "queryVotePower",
    values: [
      PromiseOrValue<string>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BytesLike>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "queryVotePowerView",
    values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "setManager",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "setTimelock",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "staleBlockLag",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "timelock", values?: undefined): string;
  encodeFunctionData(functionFragment: "token", values?: undefined): string;

  decodeFunctionResult(functionFragment: "manager", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "queryVotePower",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "queryVotePowerView",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "setManager", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "setTimelock",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "staleBlockLag",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "timelock", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "token", data: BytesLike): Result;

  events: {
    "VoteChange(address,address,int256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "VoteChange"): EventFragment;
}

export interface VoteChangeEventObject {
  from: string;
  to: string;
  amount: BigNumber;
}
export type VoteChangeEvent = TypedEvent<
  [string, string, BigNumber],
  VoteChangeEventObject
>;

export type VoteChangeEventFilter = TypedEventFilter<VoteChangeEvent>;

export interface BaseVotingVaultHistory extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: BaseVotingVaultHistoryInterface;

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
    manager(overrides?: CallOverrides): Promise<[string]>;

    queryVotePower(
      user: PromiseOrValue<string>,
      blockNumber: PromiseOrValue<BigNumberish>,
      arg2: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    queryVotePowerView(
      user: PromiseOrValue<string>,
      blockNumber: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    setManager(
      manager_: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    setTimelock(
      timelock_: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    staleBlockLag(overrides?: CallOverrides): Promise<[BigNumber]>;

    timelock(overrides?: CallOverrides): Promise<[string]>;

    token(overrides?: CallOverrides): Promise<[string]>;
  };

  manager(overrides?: CallOverrides): Promise<string>;

  queryVotePower(
    user: PromiseOrValue<string>,
    blockNumber: PromiseOrValue<BigNumberish>,
    arg2: PromiseOrValue<BytesLike>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  queryVotePowerView(
    user: PromiseOrValue<string>,
    blockNumber: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  setManager(
    manager_: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  setTimelock(
    timelock_: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  staleBlockLag(overrides?: CallOverrides): Promise<BigNumber>;

  timelock(overrides?: CallOverrides): Promise<string>;

  token(overrides?: CallOverrides): Promise<string>;

  callStatic: {
    manager(overrides?: CallOverrides): Promise<string>;

    queryVotePower(
      user: PromiseOrValue<string>,
      blockNumber: PromiseOrValue<BigNumberish>,
      arg2: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    queryVotePowerView(
      user: PromiseOrValue<string>,
      blockNumber: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    setManager(
      manager_: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    setTimelock(
      timelock_: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    staleBlockLag(overrides?: CallOverrides): Promise<BigNumber>;

    timelock(overrides?: CallOverrides): Promise<string>;

    token(overrides?: CallOverrides): Promise<string>;
  };

  filters: {
    "VoteChange(address,address,int256)"(
      from?: PromiseOrValue<string> | null,
      to?: PromiseOrValue<string> | null,
      amount?: null
    ): VoteChangeEventFilter;
    VoteChange(
      from?: PromiseOrValue<string> | null,
      to?: PromiseOrValue<string> | null,
      amount?: null
    ): VoteChangeEventFilter;
  };

  estimateGas: {
    manager(overrides?: CallOverrides): Promise<BigNumber>;

    queryVotePower(
      user: PromiseOrValue<string>,
      blockNumber: PromiseOrValue<BigNumberish>,
      arg2: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    queryVotePowerView(
      user: PromiseOrValue<string>,
      blockNumber: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    setManager(
      manager_: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    setTimelock(
      timelock_: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    staleBlockLag(overrides?: CallOverrides): Promise<BigNumber>;

    timelock(overrides?: CallOverrides): Promise<BigNumber>;

    token(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    manager(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    queryVotePower(
      user: PromiseOrValue<string>,
      blockNumber: PromiseOrValue<BigNumberish>,
      arg2: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    queryVotePowerView(
      user: PromiseOrValue<string>,
      blockNumber: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    setManager(
      manager_: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    setTimelock(
      timelock_: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    staleBlockLag(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    timelock(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    token(overrides?: CallOverrides): Promise<PopulatedTransaction>;
  };
}
