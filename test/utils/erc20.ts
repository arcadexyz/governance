import { expect } from "chai";
import { BigNumber, BigNumberish, Signer } from "ethers";

import { MockERC20 } from "../../src/types/@arcadexyz/v2-contracts/contracts/test/MockERC20.sol";
import { TestERC20 } from "../../src/types/contracts/external/mocks";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Mint `amount` tokens for `to`
 */
export const mint = async (token: MockERC20 | TestERC20, to: Signer, amount: BigNumberish): Promise<void> => {
    const address = await to.getAddress();
    const preBalance = await token.balanceOf(address);

    await expect(token.mint(address, amount)).to.emit(token, "Transfer").withArgs(ZERO_ADDRESS, address, amount);

    const postBalance = await token.balanceOf(address);
    expect(postBalance.sub(preBalance)).to.equal(amount);
};

/**
 * approve `amount` tokens for `to` from `from`
 */
export const approve = async (
    token: MockERC20 | TestERC20,
    sender: Signer,
    toAddress: string,
    amount: BigNumber,
): Promise<void> => {
    const senderAddress = await sender.getAddress();
    const preApproval = await token.allowance(senderAddress, toAddress);

    await expect(token.connect(sender).approve(toAddress, amount))
        .to.emit(token, "Approval")
        .withArgs(senderAddress, toAddress, amount);

    const postApproval = await token.allowance(senderAddress, toAddress);
    expect(postApproval.sub(preApproval)).to.equal(amount);
};
