import { BigNumberish } from "ethers";

export interface Multipliers {
    MULTIPLIER_A: BigNumberish;
    MULTIPLIER_B: BigNumberish;
}

export interface Thresholds {
    small: BigNumberish;
    medium: BigNumberish;
    large: BigNumberish;
}