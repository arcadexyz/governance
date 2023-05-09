import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { TestContextGovernance, governanceFixture } from "./utils/governanceFixture";
import { TestContextToken, tokenFixture } from "./utils/tokenFixture";

const { provider, loadFixture } = waffle;

describe("Arcade Treasury", async () => {
    let ctxToken: TestContextToken;
    let ctxGovernance: TestContextGovernance;
    let fixtureToken: () => Promise<TestContextToken>;
    let fixtureGov: () => Promise<TestContextGovernance>;

    beforeEach(async function () {
        fixtureToken = await tokenFixture();
        ctxToken = await loadFixture(fixtureToken);
        const { deployer, arcdDst, arcdToken } = ctxToken;

        fixtureGov = await governanceFixture(ctxToken.arcdToken);
        ctxGovernance = await loadFixture(fixtureGov);
        const { arcadeTreasury } = ctxGovernance;

        // distribute tokens to the treasury
        await arcdDst.connect(deployer).setToken(arcdToken.address);
        expect(await arcdDst.arcadeToken()).to.equal(arcdToken.address);

        const treasuryAmount = await arcdDst.treasuryAmount();
        await expect(await arcdDst.connect(deployer).toTreasury(arcadeTreasury.address))
            .to.emit(arcdDst, "Distribute")
            .withArgs(arcdToken.address, arcadeTreasury.address, treasuryAmount);
        expect(await arcdDst.treasurySent()).to.be.true;

        expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.equal(treasuryAmount);
    });

    describe("Add token withdrawal thresholds", async () => {
        it("Owner adds thresholds for ARCD token", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];
            const MOCK_GSC_CORE_VOTING = signers[2];

            const thresholds: Thresholds = [
                ethers.utils.parseEther("100"),
                ethers.utils.parseEther("500"),
                ethers.utils.parseEther("1000"),
            ];

            await expect(arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(arcdToken.address, thresholds))
                .to.emit(arcadeTreasury, `SpendThresholdsUpdated`)
                .withArgs(arcdToken.address, thresholds);
        });

        it("Non-owner cannot add thresholds for ARCD token", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];
            const MOCK_GSC_CORE_VOTING = signers[2];

            const thresholds: Thresholds = [
                ethers.utils.parseEther("100"),
                ethers.utils.parseEther("500"),
                ethers.utils.parseEther("1000"),
            ];

            await expect(
                arcadeTreasury.connect(MOCK_GSC_CORE_VOTING).setThreshold(arcdToken.address, thresholds),
            ).to.be.revertedWith(`Sender not owner`);
        });

        it("Owner tries to add invalid thresholds for ARCD token", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];
            const MOCK_GSC_CORE_VOTING = signers[2];

            const thresholds: Thresholds = [
                ethers.utils.parseEther("500"),
                ethers.utils.parseEther("100"),
                ethers.utils.parseEther("1000"),
            ];

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(arcdToken.address, thresholds),
            ).to.be.revertedWith("T_ThresholdsNotAscending()");

            const thresholds2: Thresholds = [
                ethers.utils.parseEther("100"),
                ethers.utils.parseEther("500"),
                ethers.utils.parseEther("100"),
            ];

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(arcdToken.address, thresholds2),
            ).to.be.revertedWith("T_ThresholdsNotAscending()");

            const thresholds3: Thresholds = [
                ethers.utils.parseEther("1000"),
                ethers.utils.parseEther("500"),
                ethers.utils.parseEther("100"),
            ];

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(arcdToken.address, thresholds3),
            ).to.be.revertedWith("T_ThresholdsNotAscending()");

            const thresholds4: Thresholds = [
                ethers.constants.Zero,
                ethers.utils.parseEther("2"),
                ethers.utils.parseEther("10"),
            ];

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(arcdToken.address, thresholds4),
            ).to.be.revertedWith("T_ZeroAmount()");
        });

        it("Cannot add threshold for zero address", async () => {
            const { signers, arcadeTreasury } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];

            const thresholds: Thresholds = [
                ethers.utils.parseEther("100"),
                ethers.utils.parseEther("500"),
                ethers.utils.parseEther("1000"),
            ];

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(ethers.constants.AddressZero, thresholds),
            ).to.be.revertedWith("T_ZeroAddress()");
        });

        it("Try to spend/approve without thresholds set", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];
            const MOCK_GSC_CORE_VOTING = signers[2];

            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .smallSpend(arcdToken.address, ethers.utils.parseEther("100"), signers[3].address),
            ).to.be.revertedWith("T_ThresholdNotSet()");

            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .mediumSpend(arcdToken.address, ethers.utils.parseEther("500"), signers[3].address),
            ).to.be.revertedWith("T_ThresholdNotSet()");

            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .largeSpend(arcdToken.address, ethers.utils.parseEther("1000"), signers[3].address),
            ).to.be.revertedWith("T_ThresholdNotSet()");

            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .approveSmallSpend(arcdToken.address, signers[3].address, ethers.utils.parseEther("100")),
            ).to.be.revertedWith("T_ThresholdNotSet()");

            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .approveMediumSpend(arcdToken.address, signers[3].address, ethers.utils.parseEther("100")),
            ).to.be.revertedWith("T_ThresholdNotSet()");

            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .approveLargeSpend(arcdToken.address, signers[3].address, ethers.utils.parseEther("100")),
            ).to.be.revertedWith("T_ThresholdNotSet()");
        });
    });

    describe("Withdraw tokens", async () => {
        it("small spend", async () => {
            const { arcdToken, deployer } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];
            const MOCK_GSC_CORE_VOTING = signers[2];

            await setTreasuryThresholds();

            // deployer sends ETH to treasury
            await deployer.sendTransaction({
                to: arcadeTreasury.address,
                value: ethers.utils.parseEther("1000"),
            });
            expect(await provider.getBalance(arcadeTreasury.address)).to.equal(ethers.utils.parseEther("1000"));

            // core voting - spend ARCD
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .smallSpend(arcdToken.address, ethers.utils.parseEther("100"), signers[3].address),
            )
                .to.emit(arcdToken, `Transfer`)
                .withArgs(arcadeTreasury.address, signers[3].address, ethers.utils.parseEther("100"));

            await expect(await arcdToken.balanceOf(signers[3].address)).to.eq(ethers.utils.parseEther("100"));

            await expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(ethers.utils.parseEther("25499900"));

            // gsc core voting - spend ARCD
            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .smallSpend(arcdToken.address, ethers.utils.parseEther("100"), signers[3].address),
            )
                .to.emit(arcdToken, `Transfer`)
                .withArgs(arcadeTreasury.address, signers[3].address, ethers.utils.parseEther("100"));

            await expect(await arcdToken.balanceOf(signers[3].address)).to.eq(ethers.utils.parseEther("200"));

            await expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(ethers.utils.parseEther("25499800"));

            // core voting - spend ETH
            const balanceBeforeUser = await ethers.provider.getBalance(signers[3].address);
            const balanceBeforeTreasury = await ethers.provider.getBalance(arcadeTreasury.address);
            await arcadeTreasury
                .connect(MOCK_TIMELOCK)
                .smallSpend(
                    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    ethers.utils.parseEther("1"),
                    signers[3].address,
                );
            await expect(await ethers.provider.getBalance(signers[3].address)).to.eq(
                balanceBeforeUser.add(ethers.utils.parseEther("1")),
            );
            await expect(await ethers.provider.getBalance(arcadeTreasury.address)).to.eq(
                balanceBeforeTreasury.sub(ethers.utils.parseEther("1")),
            );

            // core voting - approve ARCD
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .approveSmallSpend(arcdToken.address, signers[3].address, ethers.utils.parseEther("100")),
            )
                .to.emit(arcdToken, `Approval`)
                .withArgs(arcadeTreasury.address, signers[3].address, ethers.utils.parseEther("100"));

            await expect(await arcdToken.allowance(arcadeTreasury.address, signers[3].address)).to.eq(
                ethers.utils.parseEther("100"),
            );

            // gsc core voting - approve ARCD
            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .approveSmallSpend(arcdToken.address, signers[3].address, ethers.utils.parseEther("100")),
            )
                .to.emit(arcdToken, `Approval`)
                .withArgs(arcadeTreasury.address, signers[3].address, ethers.utils.parseEther("100"));

            await expect(await arcdToken.allowance(arcadeTreasury.address, signers[3].address)).to.eq(
                ethers.utils.parseEther("100"),
            );

            // try to spend more than threshold limit
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .smallSpend(arcdToken.address, ethers.utils.parseEther("101"), signers[3].address),
            ).to.be.revertedWith("T_BlockSpendLimit()");

            // send amount as zero
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .smallSpend(arcdToken.address, ethers.utils.parseEther("0"), signers[3].address),
            ).to.be.revertedWith("T_ZeroAmount()");

            // recipient as zero address
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .smallSpend(arcdToken.address, ethers.utils.parseEther("100"), ethers.constants.AddressZero),
            ).to.be.revertedWith("T_ZeroAddress()");

            // try to approve more than threshold limit
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .approveSmallSpend(arcdToken.address, signers[3].address, ethers.utils.parseEther("101")),
            ).to.be.revertedWith("T_BlockSpendLimit()");

            // try to approve zero amount
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .approveSmallSpend(arcdToken.address, signers[3].address, ethers.utils.parseEther("0")),
            ).to.be.revertedWith("T_ZeroAmount()");

            // try to approve to zero address
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .approveSmallSpend(arcdToken.address, ethers.constants.AddressZero, ethers.utils.parseEther("100")),
            ).to.be.revertedWith("T_ZeroAddress()");
        });

        it("medium spend", async () => {
            const { arcdToken, deployer } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];
            const MOCK_GSC_CORE_VOTING = signers[2];

            await setTreasuryThresholds();

            // deployer sends ETH to treasury
            await deployer.sendTransaction({
                to: arcadeTreasury.address,
                value: ethers.utils.parseEther("1000"),
            });
            expect(await provider.getBalance(arcadeTreasury.address)).to.equal(ethers.utils.parseEther("1000"));

            // core voting - spend ARCD
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .mediumSpend(arcdToken.address, ethers.utils.parseEther("500"), signers[3].address),
            )
                .to.emit(arcdToken, `Transfer`)
                .withArgs(arcadeTreasury.address, signers[3].address, ethers.utils.parseEther("500"));

            await expect(await arcdToken.balanceOf(signers[3].address)).to.eq(ethers.utils.parseEther("500"));
            await expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(ethers.utils.parseEther("25499500"));

            // gsc core voting - spend ARCD
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .mediumSpend(arcdToken.address, ethers.utils.parseEther("500"), signers[3].address),
            )
                .to.emit(arcdToken, `Transfer`)
                .withArgs(arcadeTreasury.address, signers[3].address, ethers.utils.parseEther("500"));

            await expect(await arcdToken.balanceOf(signers[3].address)).to.eq(ethers.utils.parseEther("1000"));
            await expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(ethers.utils.parseEther("25499000"));

            // core voting - spend ETH
            const balanceBeforeUser = await ethers.provider.getBalance(signers[3].address);
            const balanceBeforeTreasury = await ethers.provider.getBalance(arcadeTreasury.address);
            await arcadeTreasury
                .connect(MOCK_TIMELOCK)
                .mediumSpend(
                    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    ethers.utils.parseEther("5"),
                    signers[3].address,
                );
            await expect(await ethers.provider.getBalance(signers[3].address)).to.eq(
                balanceBeforeUser.add(ethers.utils.parseEther("5")),
            );
            await expect(await ethers.provider.getBalance(arcadeTreasury.address)).to.eq(
                balanceBeforeTreasury.sub(ethers.utils.parseEther("5")),
            );

            // try to spend more than threshold limit
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .mediumSpend(arcdToken.address, ethers.utils.parseEther("501"), signers[3].address),
            ).to.be.revertedWith("T_BlockSpendLimit()");

            // send amount as zero
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .mediumSpend(arcdToken.address, ethers.utils.parseEther("0"), signers[3].address),
            ).to.be.revertedWith("T_ZeroAmount()");

            // recipient as zero address
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .mediumSpend(arcdToken.address, ethers.utils.parseEther("100"), ethers.constants.AddressZero),
            ).to.be.revertedWith("T_ZeroAddress()");

            // try to approve more than threshold limit
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .approveMediumSpend(arcdToken.address, signers[3].address, ethers.utils.parseEther("501")),
            ).to.be.revertedWith("T_BlockSpendLimit()");

            // try to approve zero amount
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .approveMediumSpend(arcdToken.address, signers[3].address, ethers.utils.parseEther("0")),
            ).to.be.revertedWith("T_ZeroAmount()");

            // try to approve to zero address
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .approveMediumSpend(
                        arcdToken.address,
                        ethers.constants.AddressZero,
                        ethers.utils.parseEther("500"),
                    ),
            ).to.be.revertedWith("T_ZeroAddress()");
        });

        it("large spend", async () => {
            const { arcdToken, deployer } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];
            const MOCK_GSC_CORE_VOTING = signers[2];

            await setTreasuryThresholds();

            // deployer sends ETH to treasury
            await deployer.sendTransaction({
                to: arcadeTreasury.address,
                value: ethers.utils.parseEther("1000"),
            });
            expect(await provider.getBalance(arcadeTreasury.address)).to.equal(ethers.utils.parseEther("1000"));

            // core voting - spend ARCD
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .largeSpend(arcdToken.address, ethers.utils.parseEther("1000"), signers[3].address),
            )
                .to.emit(arcdToken, `Transfer`)
                .withArgs(arcadeTreasury.address, signers[3].address, ethers.utils.parseEther("1000"));

            await expect(await arcdToken.balanceOf(signers[3].address)).to.eq(ethers.utils.parseEther("1000"));
            await expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(ethers.utils.parseEther("25499000"));

            // gsc core voting - spend ARCD
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .largeSpend(arcdToken.address, ethers.utils.parseEther("1000"), signers[3].address),
            )
                .to.emit(arcdToken, `Transfer`)
                .withArgs(arcadeTreasury.address, signers[3].address, ethers.utils.parseEther("1000"));

            await expect(await arcdToken.balanceOf(signers[3].address)).to.eq(ethers.utils.parseEther("2000"));
            await expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(ethers.utils.parseEther("25498000"));

            // core voting - spend ETH
            const balanceBeforeUser = await ethers.provider.getBalance(signers[3].address);
            const balanceBeforeTreasury = await ethers.provider.getBalance(arcadeTreasury.address);
            await arcadeTreasury
                .connect(MOCK_TIMELOCK)
                .largeSpend(
                    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    ethers.utils.parseEther("10"),
                    signers[3].address,
                );
            await expect(await ethers.provider.getBalance(signers[3].address)).to.eq(
                balanceBeforeUser.add(ethers.utils.parseEther("10")),
            );
            await expect(await ethers.provider.getBalance(arcadeTreasury.address)).to.eq(
                balanceBeforeTreasury.sub(ethers.utils.parseEther("10")),
            );

            // try to spend more than threshold limit
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .largeSpend(arcdToken.address, ethers.utils.parseEther("1001"), signers[3].address),
            ).to.be.revertedWith("T_BlockSpendLimit()");

            // send amount as zero
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .largeSpend(arcdToken.address, ethers.utils.parseEther("0"), signers[3].address),
            ).to.be.revertedWith("T_ZeroAmount()");

            // recipient as zero address
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .largeSpend(arcdToken.address, ethers.utils.parseEther("1000"), ethers.constants.AddressZero),
            ).to.be.revertedWith("T_ZeroAddress()");

            // try to approve more than threshold limit
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .approveLargeSpend(arcdToken.address, signers[3].address, ethers.utils.parseEther("1001")),
            ).to.be.revertedWith("T_BlockSpendLimit()");

            // try to approve zero amount
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .approveLargeSpend(arcdToken.address, signers[3].address, ethers.utils.parseEther("0")),
            ).to.be.revertedWith("T_ZeroAmount()");

            // try to approve to zero address
            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .approveLargeSpend(
                        arcdToken.address,
                        ethers.constants.AddressZero,
                        ethers.utils.parseEther("1000"),
                    ),
            ).to.be.revertedWith("T_ZeroAddress()");
        });
    });

    describe("Spending permissions", async () => {
        it("non authorized account tries to spend/approve tokens", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_GSC_CORE_VOTING = signers[2];
            const OTHER_ACCOUNT = signers[4];

            await setTreasuryThresholds();

            await expect(
                arcadeTreasury
                    .connect(OTHER_ACCOUNT)
                    .smallSpend(arcdToken.address, ethers.utils.parseEther("1"), signers[3].address),
            ).to.be.revertedWith(`T_Unauthorized("${OTHER_ACCOUNT.address}")`);

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .mediumSpend(arcdToken.address, ethers.utils.parseEther("1"), signers[2].address),
            ).to.be.revertedWith(`Sender not owner`);

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .largeSpend(arcdToken.address, ethers.utils.parseEther("1"), signers[2].address),
            ).to.be.revertedWith(`Sender not owner`);

            await expect(
                arcadeTreasury
                    .connect(OTHER_ACCOUNT)
                    .approveSmallSpend(arcdToken.address, signers[3].address, ethers.utils.parseEther("1")),
            ).to.be.revertedWith(`T_Unauthorized("${OTHER_ACCOUNT.address}")`);

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .approveMediumSpend(arcdToken.address, signers[2].address, ethers.utils.parseEther("1")),
            ).to.be.revertedWith(`Sender not owner`);

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .approveLargeSpend(arcdToken.address, signers[2].address, ethers.utils.parseEther("1")),
            ).to.be.revertedWith(`Sender not owner`);
        });
    });

    describe("External calls", async () => {
        it("non owner account tries to make external call", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const OTHER_ACCOUNT = signers[4];

            await setTreasuryThresholds();

            const tokenFactory = await ethers.getContractFactory("ArcadeToken");
            const tokenCalldata = tokenFactory.interface.encodeFunctionData("transfer", [
                OTHER_ACCOUNT.address,
                ethers.utils.parseEther("10000"),
            ]);

            await expect(
                arcadeTreasury.connect(OTHER_ACCOUNT).batchCalls([arcdToken.address], [tokenCalldata]),
            ).to.be.revertedWith(`Sender not owner`);
        });

        it("external call to transfer any token amount, with no threshold", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];

            const tokenFactory = await ethers.getContractFactory("ArcadeToken");
            const tokenCalldata = tokenFactory.interface.encodeFunctionData("transfer", [
                MOCK_TIMELOCK.address,
                ethers.utils.parseEther("10000"),
            ]);

            await arcadeTreasury.connect(MOCK_TIMELOCK).batchCalls([arcdToken.address], [tokenCalldata]);

            await expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(ethers.utils.parseEther("25490000"));
            await expect(await arcdToken.balanceOf(MOCK_TIMELOCK.address)).to.eq(ethers.utils.parseEther("10000"));
        });

        it("external call, array length mismatch", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];

            await setTreasuryThresholds();

            const tokenFactory = await ethers.getContractFactory("ArcadeToken");
            const tokenCalldata = tokenFactory.interface.encodeFunctionData("transfer", [
                MOCK_TIMELOCK.address,
                ethers.utils.parseEther("10000"),
            ]);

            await expect(arcadeTreasury.connect(MOCK_TIMELOCK).batchCalls([], [tokenCalldata])).to.be.revertedWith(
                "T_ArrayLengthMismatch()",
            );

            await expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(ethers.utils.parseEther("25500000"));
            await expect(await arcdToken.balanceOf(MOCK_TIMELOCK.address)).to.eq(ethers.utils.parseEther("0"));
        });

        it("external call fails", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];

            const tokenFactory = await ethers.getContractFactory("ArcadeToken");
            const tokenCalldata = tokenFactory.interface.encodeFunctionData("transfer", [
                arcdToken.address,
                ethers.utils.parseEther("25500001"),
            ]);

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).batchCalls([arcdToken.address], [tokenCalldata]),
            ).to.be.revertedWith("T_CallFailed()");

            await expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(ethers.utils.parseEther("25500000"));
            await expect(await arcdToken.balanceOf(MOCK_TIMELOCK.address)).to.eq(ethers.utils.parseEther("0"));
        });

        it("external call to transfer with threshold set fails", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];

            await setTreasuryThresholds();

            const tokenFactory = await ethers.getContractFactory("ArcadeToken");
            const tokenCalldata = tokenFactory.interface.encodeFunctionData("transfer", [
                MOCK_TIMELOCK.address,
                ethers.utils.parseEther("10000"),
            ]);

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).batchCalls([arcdToken.address], [tokenCalldata]),
            ).to.be.revertedWith(`T_InvalidTarget("${arcdToken.address}")`);

            await expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(ethers.utils.parseEther("25500000"));
            await expect(await arcdToken.balanceOf(MOCK_TIMELOCK.address)).to.eq(ethers.utils.parseEther("0"));
        });
    });
});
