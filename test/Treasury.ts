import { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { ADMIN_ROLE, CORE_VOTING_ROLE, GSC_CORE_VOTING_ROLE } from "./utils/constants";
import { deploy } from "./utils/deploy";
import { TestContextGovernance, governanceFixture } from "./utils/governanceFixture";
import { TestContextToken, tokenFixture } from "./utils/tokenFixture";
import { Thresholds } from "./utils/types";

const { provider, loadFixture } = waffle;

describe("Arcade Treasury", async () => {
    let ctxToken: TestContextToken;
    let ctxGovernance: TestContextGovernance;
    let fixtureToken: () => Promise<TestContextToken>;
    let fixtureGov: () => Promise<TestContextGovernance>;
    const treasuryAmount = ethers.utils.parseEther("25499484");

    beforeEach(async function () {
        fixtureToken = await tokenFixture();
        ctxToken = await loadFixture(fixtureToken);
        const { deployer, arcdDst, arcdToken } = ctxToken;

        fixtureGov = await governanceFixture(ctxToken.arcdToken);
        ctxGovernance = await loadFixture(fixtureGov);
        const { arcadeTreasury } = ctxGovernance;

        await expect(await arcdDst.connect(deployer).toGovernanceTreasury(arcadeTreasury.address))
            .to.emit(arcdDst, "Distribute")
            .withArgs(arcdToken.address, arcadeTreasury.address, treasuryAmount);
        expect(await arcdDst.governanceTreasurySent()).to.be.true;

        expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.equal(treasuryAmount);
    });

    it("Invalid deploy params", async () => {
        const { signers } = ctxGovernance;

        // deploy with timelock set to zero address
        await expect(deploy("ArcadeTreasury", signers[0], [ethers.constants.AddressZero])).to.be.revertedWith(
            `T_ZeroAddress("timelock")`,
        );
    });

    describe("Token thresholds", async () => {
        it("Admin adds thresholds for ARCD token", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];

            const thresholds: Thresholds = {
                small: ethers.utils.parseEther("100"),
                medium: ethers.utils.parseEther("500"),
                large: ethers.utils.parseEther("1000"),
            };

            await expect(arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(arcdToken.address, thresholds))
                .to.emit(arcadeTreasury, `SpendThresholdsUpdated`)
                .withArgs(arcdToken.address, [thresholds.small, thresholds.medium, thresholds.large]);
        });

        it("Non-admin cannot add thresholds for ARCD token", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury } = ctxGovernance;
            const MOCK_CORE_VOTING = signers[2];

            const thresholds: Thresholds = {
                small: ethers.utils.parseEther("100"),
                medium: ethers.utils.parseEther("500"),
                large: ethers.utils.parseEther("1000"),
            };

            await expect(
                arcadeTreasury.connect(MOCK_CORE_VOTING).setThreshold(arcdToken.address, thresholds),
            ).to.be.revertedWith(
                `AccessControl: account ${MOCK_CORE_VOTING.address.toLowerCase()} is missing role ${ADMIN_ROLE}`,
            );
        });

        it("Admin tries to add invalid thresholds for ARCD token", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];

            const thresholds: Thresholds = {
                small: ethers.utils.parseEther("500"),
                medium: ethers.utils.parseEther("100"),
                large: ethers.utils.parseEther("1000"),
            };

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(arcdToken.address, thresholds),
            ).to.be.revertedWith("T_ThresholdsNotAscending()");

            const thresholds2: Thresholds = {
                small: ethers.utils.parseEther("100"),
                medium: ethers.utils.parseEther("500"),
                large: ethers.utils.parseEther("100"),
            };

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(arcdToken.address, thresholds2),
            ).to.be.revertedWith("T_ThresholdsNotAscending()");

            const thresholds3: Thresholds = {
                small: ethers.utils.parseEther("1000"),
                medium: ethers.utils.parseEther("500"),
                large: ethers.utils.parseEther("100"),
            };

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(arcdToken.address, thresholds3),
            ).to.be.revertedWith("T_ThresholdsNotAscending()");

            const thresholds4: Thresholds = {
                small: ethers.utils.parseEther("5000"),
                medium: ethers.utils.parseEther("500"),
                large: ethers.utils.parseEther("1000"),
            };

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(arcdToken.address, thresholds4),
            ).to.be.revertedWith("T_ThresholdsNotAscending()");

            const thresholds5: Thresholds = {
                small: ethers.utils.parseEther("100"),
                medium: ethers.utils.parseEther("500"),
                large: ethers.utils.parseEther("500"),
            };

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(arcdToken.address, thresholds5),
            ).to.be.revertedWith("T_ThresholdsNotAscending()");

            const thresholds6: Thresholds = {
                small: ethers.utils.parseEther("500"),
                medium: ethers.utils.parseEther("500"),
                large: ethers.utils.parseEther("500"),
            };

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(arcdToken.address, thresholds6),
            ).to.be.revertedWith("T_ThresholdsNotAscending()");

            const thresholds7: Thresholds = {
                small: ethers.constants.Zero,
                medium: ethers.utils.parseEther("2"),
                large: ethers.utils.parseEther("10"),
            };

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(arcdToken.address, thresholds7),
            ).to.be.revertedWith("T_ZeroAmount()");
        });

        it("Admin cannot add threshold for zero address", async () => {
            const { signers, arcadeTreasury } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];

            const thresholds: Thresholds = {
                small: ethers.utils.parseEther("100"),
                medium: ethers.utils.parseEther("500"),
                large: ethers.utils.parseEther("1000"),
            };

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(ethers.constants.AddressZero, thresholds),
            ).to.be.revertedWith(`T_ZeroAddress("token")`);
        });
    });

    describe("Set GSC allowance", async () => {
        it("Admin sets GSC allowance for ARCD token", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];

            await setTreasuryThresholds();

            const allowance = ethers.utils.parseEther("100");

            await expect(arcadeTreasury.connect(MOCK_TIMELOCK).setGSCAllowance(arcdToken.address, allowance))
                .to.emit(arcadeTreasury, `GSCAllowanceUpdated`)
                .withArgs(arcdToken.address, allowance);

            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.equal(allowance);
        });

        it("Non-admin cannot set GSC allowances", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury } = ctxGovernance;
            const OTHER = signers[2];

            await expect(
                arcadeTreasury.connect(OTHER).setGSCAllowance(arcdToken.address, ethers.utils.parseEther("2")),
            ).to.be.revertedWith(`AccessControl: account ${OTHER.address.toLowerCase()} is missing role ${ADMIN_ROLE}`);
        });

        it("Admin tries to set invalid allowance", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];

            await setTreasuryThresholds();

            const spendThresholds = await arcadeTreasury.spendThresholds(arcdToken.address);
            const smallThreshold = spendThresholds[0];

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setGSCAllowance(arcdToken.address, smallThreshold.add(1)),
            ).to.be.revertedWith(`T_InvalidAllowance(${smallThreshold.add(1)}, ${smallThreshold})`);

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setGSCAllowance(arcdToken.address, 0),
            ).to.be.revertedWith(`T_ZeroAmount()`);

            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .setGSCAllowance(ethers.constants.AddressZero, smallThreshold.add(1)),
            ).to.be.revertedWith(`T_ZeroAddress("token")`);
        });

        it("If new small threshold value is less than GSCAllowance, setThreshold() reduces GSCAllowance to equal new small threshold", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury, blockchainTime, setTreasuryThresholds } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];

            await setTreasuryThresholds();

            const allowance = ethers.utils.parseEther("100");

            await expect(arcadeTreasury.connect(MOCK_TIMELOCK).setGSCAllowance(arcdToken.address, allowance))
                .to.emit(arcadeTreasury, `GSCAllowanceUpdated`)
                .withArgs(arcdToken.address, allowance);

            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.eq(allowance);

            // create a new array of thresholds with reduced small threshold value
            const thresholds2: Thresholds = {
                small: ethers.utils.parseEther("80"),
                medium: ethers.utils.parseEther("500"),
                large: ethers.utils.parseEther("1000"),
            };

            // confirm the new small thresholds value is less than the GSCAllowance value
            expect(thresholds2.small).to.lt(await arcadeTreasury.gscAllowance(arcdToken.address));

            // must be after cool down period
            await blockchainTime.increaseTime(3600 * 24 * 7);

            // call setThresholds with the new thresholds array
            await expect(arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(arcdToken.address, thresholds2))
                .to.emit(arcadeTreasury, `SpendThresholdsUpdated`)
                .withArgs(arcdToken.address, [thresholds2.small, thresholds2.medium, thresholds2.large]);

            // get the new spendThresholds2 values
            const spendThresholds2 = await arcadeTreasury.spendThresholds(arcdToken.address);

            // confirm that GSCAllowance value has been updated to equal the new small threshold value
            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.eq(spendThresholds2.small);
        });

        it("call setGSCAllowance, then they to setThreshold for same token without waiting for cool down period.", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];

            await setTreasuryThresholds();
            // get the new spendThresholds2 values
            const spendThresholds = await arcadeTreasury.spendThresholds(arcdToken.address);

            const allowance = ethers.utils.parseEther("100");

            await expect(arcadeTreasury.connect(MOCK_TIMELOCK).setGSCAllowance(arcdToken.address, allowance))
                .to.emit(arcadeTreasury, `GSCAllowanceUpdated`)
                .withArgs(arcdToken.address, allowance);

            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.eq(allowance);

            // create a new array of thresholds with reduced small threshold value
            const thresholds2: Thresholds = {
                small: ethers.utils.parseEther("80"),
                medium: ethers.utils.parseEther("500"),
                large: ethers.utils.parseEther("1000"),
            };

            // call setThresholds with the new thresholds array
            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setThreshold(arcdToken.address, thresholds2),
            ).to.be.revertedWith(`T_CoolDownPeriod`);

            // confirm that GSCAllowance value has been updated to equal the new small threshold value
            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.eq(spendThresholds.small);
        });

        it("If no threshold set, cannot set an allowance", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];

            const allowance = ethers.utils.parseEther("200");

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setGSCAllowance(arcdToken.address, allowance),
            ).to.be.revertedWith(`T_InvalidAllowance(${allowance}, 0)`);
        });
    });

    describe("Spend tokens", async () => {
        it("small spend", async () => {
            const { arcdToken, deployer } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_CORE_VOTING = signers[2];

            // ======= Setup Context =======

            await setTreasuryThresholds();

            // deployer sends ETH to treasury
            await deployer.sendTransaction({
                to: arcadeTreasury.address,
                value: ethers.utils.parseEther("1000"),
            });
            expect(await provider.getBalance(arcadeTreasury.address)).to.equal(ethers.utils.parseEther("1000"));

            // ======= Core Voting Param Reverts =======

            // try to spend more than threshold limit
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .smallSpend(arcdToken.address, ethers.utils.parseEther("101"), signers[4].address),
            ).to.be.revertedWith("T_BlockSpendLimit()");

            // send amount as zero
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .smallSpend(arcdToken.address, ethers.utils.parseEther("0"), signers[4].address),
            ).to.be.revertedWith("T_ZeroAmount()");

            // recipient as zero address
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .smallSpend(arcdToken.address, ethers.utils.parseEther("100"), ethers.constants.AddressZero),
            ).to.be.revertedWith(`T_ZeroAddress("destination")`);

            // no threshold set
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .smallSpend(signers[1].address, ethers.utils.parseEther("100"), signers[4].address),
            ).to.be.revertedWith(`T_InvalidTarget("${signers[1].address}")`);

            // try to approve to zero address
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .approveSmallSpend(arcdToken.address, ethers.constants.AddressZero, ethers.utils.parseEther("100")),
            ).to.be.revertedWith(`T_ZeroAddress("spender")`);

            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .approveSmallSpend(
                        ethers.constants.AddressZero,
                        signers[4].address,
                        ethers.utils.parseEther("100"),
                    ),
            ).to.be.revertedWith(`T_ZeroAddress("token")`);

            // no threshold set
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .approveSmallSpend(signers[1].address, signers[4].address, ethers.utils.parseEther("100")),
            ).to.be.revertedWith(`T_InvalidTarget("${signers[1].address}")`);

            // ======= Core Voting Spends =======

            // core voting - spend ARCD
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .smallSpend(arcdToken.address, ethers.utils.parseEther("100"), signers[4].address),
            )
                .to.emit(arcdToken, `Transfer`)
                .withArgs(arcadeTreasury.address, signers[4].address, ethers.utils.parseEther("100"));

            await expect(await arcdToken.balanceOf(signers[4].address)).to.eq(ethers.utils.parseEther("100"));

            await expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(
                treasuryAmount.sub(ethers.utils.parseEther("100")),
            );

            // core voting - spend ETH
            const balanceBeforeUser = await ethers.provider.getBalance(signers[4].address);
            const balanceBeforeTreasury = await ethers.provider.getBalance(arcadeTreasury.address);
            await arcadeTreasury
                .connect(MOCK_CORE_VOTING)
                .smallSpend(
                    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    ethers.utils.parseEther("1"),
                    signers[4].address,
                );

            expect(await ethers.provider.getBalance(signers[4].address)).to.eq(
                balanceBeforeUser.add(ethers.utils.parseEther("1")),
            );
            expect(await ethers.provider.getBalance(arcadeTreasury.address)).to.eq(
                balanceBeforeTreasury.sub(ethers.utils.parseEther("1")),
            );

            // core voting - approve ARCD
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .approveSmallSpend(arcdToken.address, signers[4].address, ethers.utils.parseEther("100")),
            )
                .to.emit(arcdToken, `Approval`)
                .withArgs(arcadeTreasury.address, signers[4].address, ethers.utils.parseEther("100"));
        });

        it("medium spend", async () => {
            const { arcdToken, deployer } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_CORE_VOTING = signers[2];

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
                    .connect(MOCK_CORE_VOTING)
                    .mediumSpend(arcdToken.address, ethers.utils.parseEther("500"), signers[4].address),
            )
                .to.emit(arcdToken, `Transfer`)
                .withArgs(arcadeTreasury.address, signers[4].address, ethers.utils.parseEther("500"));

            await expect(await arcdToken.balanceOf(signers[4].address)).to.eq(ethers.utils.parseEther("500"));
            await expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(
                treasuryAmount.sub(ethers.utils.parseEther("500")),
            );

            // core voting - approve ARCD
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .approveMediumSpend(arcdToken.address, signers[4].address, ethers.utils.parseEther("500")),
            )
                .to.emit(arcdToken, `Approval`)
                .withArgs(arcadeTreasury.address, signers[4].address, ethers.utils.parseEther("500"));

            // core voting - spend ETH
            const balanceBeforeUser = await ethers.provider.getBalance(signers[4].address);
            const balanceBeforeTreasury = await ethers.provider.getBalance(arcadeTreasury.address);
            await arcadeTreasury
                .connect(MOCK_CORE_VOTING)
                .mediumSpend(
                    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    ethers.utils.parseEther("5"),
                    signers[4].address,
                );
            expect(await ethers.provider.getBalance(signers[4].address)).to.eq(
                balanceBeforeUser.add(ethers.utils.parseEther("5")),
            );
            expect(await ethers.provider.getBalance(arcadeTreasury.address)).to.eq(
                balanceBeforeTreasury.sub(ethers.utils.parseEther("5")),
            );

            // try to spend more than threshold limit
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .mediumSpend(arcdToken.address, ethers.utils.parseEther("501"), signers[3].address),
            ).to.be.revertedWith("T_BlockSpendLimit()");

            // send amount as zero
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .mediumSpend(arcdToken.address, ethers.utils.parseEther("0"), signers[3].address),
            ).to.be.revertedWith("T_ZeroAmount()");

            // recipient as zero address
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .mediumSpend(arcdToken.address, ethers.utils.parseEther("100"), ethers.constants.AddressZero),
            ).to.be.revertedWith(`T_ZeroAddress("destination")`);

            // no threshold set
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .mediumSpend(signers[1].address, ethers.utils.parseEther("100"), signers[3].address),
            ).to.be.revertedWith(`T_InvalidTarget("${signers[1].address}")`);

            // try to approve more than threshold limit
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .approveMediumSpend(arcdToken.address, signers[3].address, ethers.utils.parseEther("501")),
            ).to.be.revertedWith("T_BlockSpendLimit()");

            // try to approve to zero address
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .approveMediumSpend(
                        arcdToken.address,
                        ethers.constants.AddressZero,
                        ethers.utils.parseEther("500"),
                    ),
            ).to.be.revertedWith(`T_ZeroAddress("spender")`);

            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .approveMediumSpend(
                        ethers.constants.AddressZero,
                        signers[3].address,
                        ethers.utils.parseEther("500"),
                    ),
            ).to.be.revertedWith(`T_ZeroAddress("token")`);

            // no threshold set
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .approveMediumSpend(signers[1].address, signers[3].address, ethers.utils.parseEther("100")),
            ).to.be.revertedWith(`T_InvalidTarget("${signers[1].address}")`);
        });

        it("large spend", async () => {
            const { arcdToken, deployer } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_CORE_VOTING = signers[2];

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
                    .connect(MOCK_CORE_VOTING)
                    .largeSpend(arcdToken.address, ethers.utils.parseEther("1000"), signers[4].address),
            )
                .to.emit(arcdToken, `Transfer`)
                .withArgs(arcadeTreasury.address, signers[4].address, ethers.utils.parseEther("1000"));

            await expect(await arcdToken.balanceOf(signers[4].address)).to.eq(ethers.utils.parseEther("1000"));
            await expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(
                treasuryAmount.sub(ethers.utils.parseEther("1000")),
            );

            // core voting - approve ARCD
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .approveLargeSpend(arcdToken.address, signers[4].address, ethers.utils.parseEther("1000")),
            )
                .to.emit(arcdToken, `Approval`)
                .withArgs(arcadeTreasury.address, signers[4].address, ethers.utils.parseEther("1000"));

            // core voting - spend ETH
            const balanceBeforeUser = await ethers.provider.getBalance(signers[4].address);
            const balanceBeforeTreasury = await ethers.provider.getBalance(arcadeTreasury.address);
            await arcadeTreasury
                .connect(MOCK_CORE_VOTING)
                .largeSpend(
                    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    ethers.utils.parseEther("10"),
                    signers[4].address,
                );
            expect(await ethers.provider.getBalance(signers[4].address)).to.eq(
                balanceBeforeUser.add(ethers.utils.parseEther("10")),
            );
            expect(await ethers.provider.getBalance(arcadeTreasury.address)).to.eq(
                balanceBeforeTreasury.sub(ethers.utils.parseEther("10")),
            );

            // try to spend more than threshold limit
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .largeSpend(arcdToken.address, ethers.utils.parseEther("1001"), signers[3].address),
            ).to.be.revertedWith("T_BlockSpendLimit()");

            // send amount as zero
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .largeSpend(arcdToken.address, ethers.utils.parseEther("0"), signers[3].address),
            ).to.be.revertedWith("T_ZeroAmount()");

            // recipient as zero address
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .largeSpend(arcdToken.address, ethers.utils.parseEther("1000"), ethers.constants.AddressZero),
            ).to.be.revertedWith(`T_ZeroAddress("destination")`);

            // no threshold set
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .largeSpend(signers[1].address, ethers.utils.parseEther("1000"), signers[3].address),
            ).to.be.revertedWith(`T_InvalidTarget("${signers[1].address}")`);

            // try to approve more than threshold limit
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .approveLargeSpend(arcdToken.address, signers[3].address, ethers.utils.parseEther("1001")),
            ).to.be.revertedWith("T_BlockSpendLimit()");

            // try to approve to zero address
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .approveLargeSpend(
                        arcdToken.address,
                        ethers.constants.AddressZero,
                        ethers.utils.parseEther("1000"),
                    ),
            ).to.be.revertedWith(`T_ZeroAddress("spender")`);

            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .approveLargeSpend(
                        ethers.constants.AddressZero,
                        signers[3].address,
                        ethers.utils.parseEther("1000"),
                    ),
            ).to.be.revertedWith(`T_ZeroAddress("token")`);

            // no threshold set
            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .approveLargeSpend(signers[1].address, signers[3].address, ethers.utils.parseEther("1000")),
            ).to.be.revertedWith(`T_InvalidTarget("${signers[1].address}")`);
        });

        it("non authorized account tries to spend/approve tokens", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_GSC_CORE_VOTING = signers[3];
            const OTHER_ACCOUNT = signers[4];

            await setTreasuryThresholds();

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .smallSpend(arcdToken.address, ethers.utils.parseEther("1"), OTHER_ACCOUNT.address),
            ).to.be.revertedWith(
                `AccessControl: account ${MOCK_GSC_CORE_VOTING.address.toLowerCase()} is missing role ${CORE_VOTING_ROLE}`,
            );

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .mediumSpend(arcdToken.address, ethers.utils.parseEther("1"), OTHER_ACCOUNT.address),
            ).to.be.revertedWith(
                `AccessControl: account ${MOCK_GSC_CORE_VOTING.address.toLowerCase()} is missing role ${CORE_VOTING_ROLE}`,
            );

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .largeSpend(arcdToken.address, ethers.utils.parseEther("1"), OTHER_ACCOUNT.address),
            ).to.be.revertedWith(
                `AccessControl: account ${MOCK_GSC_CORE_VOTING.address.toLowerCase()} is missing role ${CORE_VOTING_ROLE}`,
            );

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .approveSmallSpend(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("1")),
            ).to.be.revertedWith(
                `AccessControl: account ${MOCK_GSC_CORE_VOTING.address.toLowerCase()} is missing role ${CORE_VOTING_ROLE}`,
            );

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .approveMediumSpend(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("1")),
            ).to.be.revertedWith(
                `AccessControl: account ${MOCK_GSC_CORE_VOTING.address.toLowerCase()} is missing role ${CORE_VOTING_ROLE}`,
            );

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .approveLargeSpend(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("1")),
            ).to.be.revertedWith(
                `AccessControl: account ${MOCK_GSC_CORE_VOTING.address.toLowerCase()} is missing role ${CORE_VOTING_ROLE}`,
            );
        });
    });

    describe("GSC spend tokens", async () => {
        it("GSC spends entire allowance", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];
            const MOCK_GSC_CORE_VOTING = signers[3];
            const OTHER_ACCOUNT = signers[4];

            // ======= Setup Context =======

            await setTreasuryThresholds();

            const spendThresholds = await arcadeTreasury.spendThresholds(arcdToken.address);
            const smallThreshold = spendThresholds[0];

            await arcadeTreasury.connect(MOCK_TIMELOCK).setGSCAllowance(arcdToken.address, smallThreshold);
            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.equal(smallThreshold);

            // ======= GSC Spends Allowance =======

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscSpend(arcdToken.address, ethers.utils.parseEther("50"), OTHER_ACCOUNT.address),
            )
                .to.emit(arcadeTreasury, "TreasuryTransfer")
                .withArgs(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("50"));

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscApprove(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("50")),
            )
                .to.emit(arcadeTreasury, "TreasuryApproval")
                .withArgs(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("50"));

            expect(await arcdToken.balanceOf(OTHER_ACCOUNT.address)).to.equal(ethers.utils.parseEther("50"));
            expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.equal(
                treasuryAmount.sub(ethers.utils.parseEther("50")),
            );
            expect(await arcdToken.allowance(arcadeTreasury.address, OTHER_ACCOUNT.address)).to.equal(
                ethers.utils.parseEther("50"),
            );
            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.equal(ethers.utils.parseEther("0"));

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscSpend(arcdToken.address, ethers.utils.parseEther("1"), OTHER_ACCOUNT.address),
            ).to.be.revertedWith(
                "reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)",
            );
        });

        it("GSC spends allowance and ADMIN grants new allowance", async () => {
            const { arcdToken, blockchainTime } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];
            const MOCK_GSC_CORE_VOTING = signers[3];
            const OTHER_ACCOUNT = signers[4];

            // ======= Setup Context =======

            await setTreasuryThresholds();

            const spendThresholds = await arcadeTreasury.spendThresholds(arcdToken.address);
            const smallThreshold = spendThresholds[0];

            await arcadeTreasury.connect(MOCK_TIMELOCK).setGSCAllowance(arcdToken.address, smallThreshold);

            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.equal(smallThreshold);

            // ======= GSC Spends Allowance =======

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscSpend(arcdToken.address, ethers.utils.parseEther("50"), OTHER_ACCOUNT.address),
            )
                .to.emit(arcadeTreasury, "TreasuryTransfer")
                .withArgs(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("50"));

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscApprove(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("50")),
            )
                .to.emit(arcadeTreasury, "TreasuryApproval")
                .withArgs(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("50"));

            expect(await arcdToken.balanceOf(OTHER_ACCOUNT.address)).to.equal(ethers.utils.parseEther("50"));
            expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.equal(
                treasuryAmount.sub(ethers.utils.parseEther("50")),
            );
            expect(await arcdToken.allowance(arcadeTreasury.address, OTHER_ACCOUNT.address)).to.equal(
                ethers.utils.parseEther("50"),
            );
            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.equal(ethers.utils.parseEther("0"));

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscSpend(arcdToken.address, ethers.utils.parseEther("1"), OTHER_ACCOUNT.address),
            ).to.be.revertedWith(
                "reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)",
            );

            // ======= ADMIN Grants New Allowance =======

            // must be after cool down period
            await blockchainTime.increaseTime(3600 * 24 * 7);

            await expect(arcadeTreasury.connect(MOCK_TIMELOCK).setGSCAllowance(arcdToken.address, smallThreshold))
                .to.emit(arcadeTreasury, "GSCAllowanceUpdated")
                .withArgs(arcdToken.address, smallThreshold);

            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.equal(smallThreshold);

            // ======= GSC Spends New Allowance =======
            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscSpend(arcdToken.address, ethers.utils.parseEther("100"), OTHER_ACCOUNT.address),
            )
                .to.emit(arcadeTreasury, "TreasuryTransfer")
                .withArgs(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("100"));

            // ======= GSC exceeds allowance again =======
            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscApprove(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("100")),
            ).to.be.revertedWith(
                "reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)",
            );

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscSpend(arcdToken.address, ethers.utils.parseEther("1"), OTHER_ACCOUNT.address),
            ).to.be.revertedWith(
                "reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)",
            );
        });

        it("GSC reduces a users allowance to 0", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];
            const MOCK_GSC_CORE_VOTING = signers[3];
            const OTHER_ACCOUNT = signers[4];

            const thresholds = await setTreasuryThresholds();

            await expect(arcadeTreasury.connect(MOCK_TIMELOCK).setGSCAllowance(arcdToken.address, thresholds[0].small))
                .to.emit(arcadeTreasury, `GSCAllowanceUpdated`)
                .withArgs(arcdToken.address, thresholds[0].small);

            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.eq(thresholds[0].small);

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscApprove(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("50")),
            )
                .to.emit(arcadeTreasury, "TreasuryApproval")
                .withArgs(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("50"));

            expect(await arcdToken.allowance(arcadeTreasury.address, OTHER_ACCOUNT.address)).to.eq(
                ethers.utils.parseEther("50"),
            );

            await expect(
                arcadeTreasury.connect(MOCK_GSC_CORE_VOTING).gscApprove(arcdToken.address, OTHER_ACCOUNT.address, 0),
            )
                .to.emit(arcadeTreasury, "TreasuryApproval")
                .withArgs(arcdToken.address, OTHER_ACCOUNT.address, 0);

            expect(await arcdToken.allowance(arcadeTreasury.address, OTHER_ACCOUNT.address)).to.eq(0);
        });

        it("GSC sends second approval of same amount to same spender, no change", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];
            const MOCK_GSC_CORE_VOTING = signers[3];
            const OTHER_ACCOUNT = signers[4];

            const thresholds = await setTreasuryThresholds();

            await expect(arcadeTreasury.connect(MOCK_TIMELOCK).setGSCAllowance(arcdToken.address, thresholds[0].small))
                .to.emit(arcadeTreasury, `GSCAllowanceUpdated`)
                .withArgs(arcdToken.address, thresholds[0].small);

            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.eq(thresholds[0].small);

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscApprove(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("50")),
            )
                .to.emit(arcadeTreasury, "TreasuryApproval")
                .withArgs(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("50"));

            expect(await arcdToken.allowance(arcadeTreasury.address, OTHER_ACCOUNT.address)).to.eq(
                ethers.utils.parseEther("50"),
            );

            await arcadeTreasury
                .connect(MOCK_GSC_CORE_VOTING)
                .gscApprove(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("50"));

            expect(await arcdToken.allowance(arcadeTreasury.address, OTHER_ACCOUNT.address)).to.eq(
                ethers.utils.parseEther("50"),
            );
        });

        it("Admin tries to grant new allowance before cool down ends", async () => {
            const { arcdToken, blockchainTime } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];
            const MOCK_GSC_CORE_VOTING = signers[3];
            const OTHER_ACCOUNT = signers[4];

            // ======= Setup Context =======

            await setTreasuryThresholds();

            const spendThresholds = await arcadeTreasury.spendThresholds(arcdToken.address);
            const smallThreshold = spendThresholds[0];

            await arcadeTreasury.connect(MOCK_TIMELOCK).setGSCAllowance(arcdToken.address, smallThreshold);

            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.equal(smallThreshold);

            // ======= GSC Spends Allowance =======

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscSpend(arcdToken.address, ethers.utils.parseEther("100"), OTHER_ACCOUNT.address),
            )
                .to.emit(arcadeTreasury, "TreasuryTransfer")
                .withArgs(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("100"));

            expect(await arcdToken.balanceOf(OTHER_ACCOUNT.address)).to.equal(ethers.utils.parseEther("100"));
            expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.equal(
                treasuryAmount.sub(ethers.utils.parseEther("100")),
            );
            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.equal(ethers.utils.parseEther("0"));

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscSpend(arcdToken.address, ethers.utils.parseEther("1"), OTHER_ACCOUNT.address),
            ).to.be.revertedWith(
                "reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)",
            );

            // ======= ADMIN tries to grant allowance before cool down ends =======

            // fast forward time but stop short before cool down ends
            await blockchainTime.secondsFromNow(2600 * 24 * 7 - 100);

            await expect(
                arcadeTreasury.connect(MOCK_TIMELOCK).setGSCAllowance(arcdToken.address, smallThreshold),
            ).to.be.revertedWith(`T_CoolDownPeriod`);

            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.equal(0);
        });

        it("GSC spend with invalid parameters", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];
            const MOCK_GSC_CORE_VOTING = signers[3];
            const OTHER_ACCOUNT = signers[4];

            // ======= Setup Context =======

            await setTreasuryThresholds();

            const spendThresholds = await arcadeTreasury.spendThresholds(arcdToken.address);
            const smallThreshold = spendThresholds[0];

            await arcadeTreasury.connect(MOCK_TIMELOCK).setGSCAllowance(arcdToken.address, smallThreshold);

            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.equal(smallThreshold);

            // ======= Try to spend =======

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscSpend(arcdToken.address, ethers.utils.parseEther("0"), OTHER_ACCOUNT.address),
            ).to.be.revertedWith("T_ZeroAmount()");

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscSpend(arcdToken.address, ethers.utils.parseEther("1"), ethers.constants.AddressZero),
            ).to.be.revertedWith(`T_ZeroAddress("destination")`);

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscSpend(signers[1].address, ethers.utils.parseEther("1"), OTHER_ACCOUNT.address),
            ).to.be.revertedWith(`T_InvalidTarget("${signers[1].address}")`);

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscApprove(arcdToken.address, ethers.constants.AddressZero, ethers.utils.parseEther("1")),
            ).to.be.revertedWith(`T_ZeroAddress("spender")`);

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscApprove(ethers.constants.AddressZero, OTHER_ACCOUNT.address, ethers.utils.parseEther("1")),
            ).to.be.revertedWith(`T_ZeroAddress("token")`);

            await expect(
                arcadeTreasury
                    .connect(MOCK_GSC_CORE_VOTING)
                    .gscApprove(signers[1].address, OTHER_ACCOUNT.address, ethers.utils.parseEther("1")),
            ).to.be.revertedWith(`T_InvalidTarget("${signers[1].address}")`);
        });

        it("third party tries to use GSC spend/approve", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const MOCK_TIMELOCK = signers[1];
            const MOCK_CORE_VOTING = signers[2];
            const OTHER_ACCOUNT = signers[4];

            // ======= Setup Context =======

            await setTreasuryThresholds();

            const spendThresholds = await arcadeTreasury.spendThresholds(arcdToken.address);
            const smallThreshold = spendThresholds[0];

            await arcadeTreasury.connect(MOCK_TIMELOCK).setGSCAllowance(arcdToken.address, smallThreshold);

            expect(await arcadeTreasury.gscAllowance(arcdToken.address)).to.equal(smallThreshold);

            // ======= Try to spend =======

            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .gscSpend(arcdToken.address, ethers.utils.parseEther("100"), OTHER_ACCOUNT.address),
            ).to.be.revertedWith(
                `AccessControl: account ${MOCK_TIMELOCK.address.toLowerCase()} is missing role ${GSC_CORE_VOTING_ROLE}`,
            );

            await expect(
                arcadeTreasury
                    .connect(MOCK_TIMELOCK)
                    .gscApprove(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("100")),
            ).to.be.revertedWith(
                `AccessControl: account ${MOCK_TIMELOCK.address.toLowerCase()} is missing role ${GSC_CORE_VOTING_ROLE}`,
            );

            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .gscSpend(arcdToken.address, ethers.utils.parseEther("100"), OTHER_ACCOUNT.address),
            ).to.be.revertedWith(
                `AccessControl: account ${MOCK_CORE_VOTING.address.toLowerCase()} is missing role ${GSC_CORE_VOTING_ROLE}`,
            );

            await expect(
                arcadeTreasury
                    .connect(MOCK_CORE_VOTING)
                    .gscApprove(arcdToken.address, OTHER_ACCOUNT.address, ethers.utils.parseEther("100")),
            ).to.be.revertedWith(
                `AccessControl: account ${MOCK_CORE_VOTING.address.toLowerCase()} is missing role ${GSC_CORE_VOTING_ROLE}`,
            );
        });
    });

    describe("External calls", async () => {
        it("non admin account tries to make external call", async () => {
            const { arcdToken } = ctxToken;
            const { signers, arcadeTreasury, setTreasuryThresholds } = ctxGovernance;
            const CORE_VOTING = signers[2];
            const GSC_CORE_VOTING = signers[3];
            const OTHER_ACCOUNT = signers[4];

            await setTreasuryThresholds();

            const tokenFactory = await ethers.getContractFactory("ArcadeToken");
            const tokenCalldata = tokenFactory.interface.encodeFunctionData("transfer", [
                OTHER_ACCOUNT.address,
                ethers.utils.parseEther("10000"),
            ]);

            await expect(
                arcadeTreasury.connect(CORE_VOTING).batchCalls([arcdToken.address], [tokenCalldata]),
            ).to.be.revertedWith(
                `AccessControl: account ${CORE_VOTING.address.toLowerCase()} is missing role ${ADMIN_ROLE}`,
            );

            await expect(
                arcadeTreasury.connect(GSC_CORE_VOTING).batchCalls([arcdToken.address], [tokenCalldata]),
            ).to.be.revertedWith(
                `AccessControl: account ${GSC_CORE_VOTING.address.toLowerCase()} is missing role ${ADMIN_ROLE}`,
            );

            await expect(
                arcadeTreasury.connect(OTHER_ACCOUNT).batchCalls([arcdToken.address], [tokenCalldata]),
            ).to.be.revertedWith(
                `AccessControl: account ${OTHER_ACCOUNT.address.toLowerCase()} is missing role ${ADMIN_ROLE}`,
            );
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
            const tokenCalldata2 = tokenFactory.interface.encodeFunctionData("transfer", [
                signers[3].address,
                ethers.utils.parseEther("1000"),
            ]);

            await arcadeTreasury
                .connect(MOCK_TIMELOCK)
                .batchCalls([arcdToken.address, arcdToken.address], [tokenCalldata, tokenCalldata2]);

            expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(
                treasuryAmount.sub(ethers.utils.parseEther("10000")).sub(ethers.utils.parseEther("1000")),
            );
            expect(await arcdToken.balanceOf(MOCK_TIMELOCK.address)).to.eq(ethers.utils.parseEther("10000"));
            expect(await arcdToken.balanceOf(signers[3].address)).to.eq(ethers.utils.parseEther("1000"));
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

            expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(treasuryAmount);
            expect(await arcdToken.balanceOf(MOCK_TIMELOCK.address)).to.eq(ethers.utils.parseEther("0"));
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

            expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(treasuryAmount);
            expect(await arcdToken.balanceOf(MOCK_TIMELOCK.address)).to.eq(ethers.utils.parseEther("0"));
        });

        it("external call to transfer a token with threshold set fails", async () => {
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

            expect(await arcdToken.balanceOf(arcadeTreasury.address)).to.eq(treasuryAmount);
            expect(await arcdToken.balanceOf(MOCK_TIMELOCK.address)).to.eq(ethers.utils.parseEther("0"));
        });
    });
});
