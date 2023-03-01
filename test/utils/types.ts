import { BigNumber, BigNumberish } from "ethers";

export enum LoanState {
    DUMMY = 0,
    Active = 1,
    Repaid = 2,
    Defaulted = 3,
}

export interface LoanTerms {
    durationSecs: BigNumberish;
    principal: BigNumber;
    interestRate: BigNumber;
    collateralAddress: string;
    collateralId: BigNumberish;
    payableCurrency: string;
    numInstallments: BigNumberish;
    deadline: BigNumberish;
}
