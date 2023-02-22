import { setBalance } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { BigNumber, BigNumberish } from "ethers";
import hre, { ethers, upgrades } from "hardhat";

import type {
    ArcadeItemsVerifier,
    AssetVault,
    CallWhitelist,
    CryptoPunksMarket,
    FeeController,
    LoanCore,
    MockERC20,
    MockWeth,
    OriginationController,
    PromissoryNote,
    RepaymentController,
    VaultFactory,
} from "../../src/types";
import { LoanTerms } from "../types/types";
import { ADMIN_ROLE, FEE_CLAIMER_ROLE, ORIGINATOR_ROLE, REPAYER_ROLE } from "./constants";
import { deploy } from "./contracts";
import { coreVotingAddress } from "./councilFixture";
import { BlockchainTime } from "./time";

export const SECTION_SEPARATOR = "\n" + "=".repeat(80) + "\n";
export const SUBSECTION_SEPARATOR = "-".repeat(10);

/**
 * Warnings are silenced due to the fact both transparent and UUPS proxies are deployed, which
 * trips OZ-upgrade's safety checks. For more information:
 *
 * https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/369#issuecomment-920399254
 *
 * There is no use of unsafe-flags in this script. Unsafe flags for upgradeable deployments
 * were previously necessary in v1.19.0 due to the use of two different OZ upgrade patterns,
 * and the fact that the owner acounts were not differentiated. The Treasure Marketplace
 * utilizes a transparent upgrade pattern.
 */
upgrades.silenceWarnings();

type Signer = SignerWithAddress;
const NONCE = 2;

export interface TestContext {
    createInstallmentLoanTerms: (
        payableCurrency: string,
        durationSecs: BigNumber,
        principal: BigNumber,
        interestRate: BigNumber,
        collateralAddress: string,
        numInstallments: number,
        deadline: BigNumberish,
        loanTerms: Partial<LoanTerms>,
    ) => LoanTerms;
    createLoanTerms: (payableCurrency: string, collateralAddress: string, loanTerms: Partial<LoanTerms>) => LoanTerms;
    createVault: (factory: VaultFactory, user: Signer) => Promise<AssetVault>;
    borrowerNote: PromissoryNote;
    lenderNote: PromissoryNote;
    loanCore: LoanCore;
    repaymentController: RepaymentController;
    originationController: OriginationController;
    vaultFactory: VaultFactory;
    feeController: FeeController;
    currentTimestamp: number;
    blockchainTime: BlockchainTime;
    NONCE: number;
    whitelist: CallWhitelist;
    verifier: ArcadeItemsVerifier;
    punks: CryptoPunksMarket;
    vault: AssetVault;
    mockERC20: MockERC20;
    weth: MockWeth;
    admin: SignerWithAddress;
}

/**
 * Sets up a test context, deploying new contracts and returning them for use in a test
 */

export const fixture = async (): Promise<TestContext> => {
    const signers: Signer[] = await hre.ethers.getSigners();
    const owner = signers[0];
    const admin = signers[0];
    const deployer = signers[0];
    const ADMIN_ADDRESS = signers[0].address;

    // ===================================== GENERAL ==============================================
    const blockchainTime = new BlockchainTime();
    const currentTimestamp = await blockchainTime.secondsFromNow(0);

    // ========================== V2 DEPLOYMENTS AND PERMISSIONS ==================================
    const whitelist = <CallWhitelist>await deploy("CallWhitelist", signers[0], []);
    await whitelist.deployed();

    // set CallWhiteList admin
    const updateWhitelistAdmin = await whitelist.transferOwnership(ADMIN_ADDRESS);
    await updateWhitelistAdmin.wait();

    console.log(`CallWhitelist: ownership transferred to ${ADMIN_ADDRESS}`);
    console.log(SUBSECTION_SEPARATOR);

    const feeController = <FeeController>await deploy("FeeController", signers[0], []);
    await feeController.deployed();

    // set FeeController admin to be set to CoreVoting.sol
    const updateFeeControllerAdmin = await feeController.transferOwnership(coreVotingAddress);
    await updateFeeControllerAdmin.wait();

    console.log(`FeeController: ownership transferred to ${coreVotingAddress}`);
    console.log(SUBSECTION_SEPARATOR);

    const vault = <AssetVault>await deploy("AssetVault", owner, []);
    await vault.deployed();

    const VaultFactory = await hre.ethers.getContractFactory("VaultFactory");
    const vaultFactory = <VaultFactory>await upgrades.deployProxy(VaultFactory, [vault.address, whitelist.address], {
        kind: "uups",
        initializer: "initialize(address, address)",
        timeout: 0,
    });
    await vaultFactory.deployed();
    // grant VaultFactory the admin role to enable authorizeUpgrade onlyRole(ADMIN_ROLE)
    const updateVaultFactoryAdmin = await vaultFactory.grantRole(ADMIN_ROLE, ADMIN_ADDRESS);
    await updateVaultFactoryAdmin.wait();

    console.log(`VaultFactory: admin role granted to ${ADMIN_ADDRESS}`);
    console.log(SUBSECTION_SEPARATOR);

    const borrowerNote = <PromissoryNote>await deploy("PromissoryNote", signers[0], ["Arcade.xyz BorrowerNote", "aBN"]);
    const lenderNote = <PromissoryNote>await deploy("PromissoryNote", signers[0], ["Arcade.xyz LenderNote", "aLN"]);

    const LoanCore = await hre.ethers.getContractFactory("LoanCore");
    const loanCore = <LoanCore>await upgrades.deployProxy(
        LoanCore,
        [feeController.address, borrowerNote.address, lenderNote.address],
        {
            kind: "uups",
            timeout: 0,
        },
    );
    await loanCore.deployed();
    // LoanCore admin role granted to admin address
    const updateLoanCoreAdmin = await loanCore.grantRole(ADMIN_ROLE, ADMIN_ADDRESS);
    await updateLoanCoreAdmin.wait();

    console.log(`LoanCore: admin role granted to ${ADMIN_ADDRESS}`);
    console.log(SUBSECTION_SEPARATOR);

    // grant LoanCore admin fee claimer permissions
    const updateLoanCoreFeeClaimer = await loanCore.grantRole(FEE_CLAIMER_ROLE, ADMIN_ADDRESS);
    await updateLoanCoreFeeClaimer.wait();

    console.log(`LoanCore: fee claimer role granted to ${ADMIN_ADDRESS}`);
    console.log(SUBSECTION_SEPARATOR);

    // Grant correct permissions for promissory note
    for (const note of [borrowerNote, lenderNote]) {
        await note.connect(admin).initialize(loanCore.address);
    }

    const repaymentController = <RepaymentController>await deploy("RepaymentController", admin, [loanCore.address]);
    await repaymentController.deployed();
    const updateRepaymentControllerPermissions = await loanCore.grantRole(REPAYER_ROLE, repaymentController.address);
    await updateRepaymentControllerPermissions.wait();

    const OriginationController = await hre.ethers.getContractFactory("OriginationController");
    const originationController = <OriginationController>await upgrades.deployProxy(
        OriginationController,
        [loanCore.address],
        {
            kind: "uups",
        },
    );
    await originationController.deployed();

    // grant originationContoller the originator role
    const updateOriginationControllerRole = await loanCore.grantRole(ORIGINATOR_ROLE, originationController.address);
    await updateOriginationControllerRole.wait();

    console.log(`LoanCore: originator role granted to ${originationController.address}`);
    console.log(SUBSECTION_SEPARATOR);

    const renounceFeeClaimer = await loanCore.renounceRole(FEE_CLAIMER_ROLE, deployer.address);
    await renounceFeeClaimer.wait();

    console.log("LoanCore: deployer has renounced admin role");
    console.log(SUBSECTION_SEPARATOR);

    const verifier = <ArcadeItemsVerifier>await deploy("ArcadeItemsVerifier", signers[0], []);
    await verifier.deployed();

    // whitelist verifier
    const whitelistVerifier = await originationController.setAllowedVerifier(verifier.address, true);
    await whitelistVerifier.wait();

    console.log(`OriginationController: added ${verifier.address} as allowed verifier`);
    console.log(SUBSECTION_SEPARATOR);

    // grant originationContoller the owner role to enable authorizeUpgrade onlyOwner
    const updateOriginationControllerAdmin = await originationController.grantRole(ADMIN_ROLE, ADMIN_ADDRESS);
    await updateOriginationControllerAdmin.wait();

    console.log(`OriginationController: admin role granted to ${ADMIN_ADDRESS}`);
    console.log(SUBSECTION_SEPARATOR);

    const renounceOriginationControllerAdmin = await originationController.renounceRole(ADMIN_ROLE, deployer.address);
    await renounceOriginationControllerAdmin.wait();

    console.log("OriginationController: deployer has renounced admin role");
    console.log(SUBSECTION_SEPARATOR);

    const punks = <CryptoPunksMarket>await deploy("CryptoPunksMarket", owner, []);

    // Deploy mock weth
    const weth = <MockWeth>await deploy("MockWeth", owner, []);

    // Fund all wallets with WETH
    const wethAmount = ethers.utils.parseEther("2000000");
    await setBalance(owner.address, wethAmount.mul(6));
    await weth.connect(owner).deposit({ value: wethAmount.mul(5) });

    const mockERC20 = <MockERC20>await deploy("MockERC20", signers[0], ["Mock ERC20", "MOCK"]);

    // ================================= LOAN CREATION FUNCTION ===========================================

    const createInstallmentLoanTerms = (
        payableCurrency: string,
        durationSecs: BigNumber,
        principal: BigNumber,
        interestRate: BigNumber,
        collateralAddress: string,
        numInstallments: number,
        deadline: BigNumberish,
        { collateralId = 1 }: Partial<LoanTerms> = {},
    ): LoanTerms => {
        return {
            durationSecs,
            principal,
            interestRate,
            collateralAddress,
            collateralId,
            payableCurrency,
            numInstallments,
            deadline,
        };
    };

    const createLoanTerms = (
        payableCurrency: string,
        collateralAddress: string,
        {
            durationSecs = BigNumber.from(3600000),
            principal = ethers.utils.parseEther("100"),
            interestRate = ethers.utils.parseEther("1"),
            collateralId = 1,
            numInstallments = 0,
            deadline = 1754884800,
        }: Partial<LoanTerms> = {},
    ): LoanTerms => {
        return {
            durationSecs,
            principal,
            interestRate,
            collateralAddress,
            collateralId,
            payableCurrency,
            numInstallments,
            deadline,
        };
    };

    const createVault = async (factory: VaultFactory, user: Signer): Promise<AssetVault> => {
        const tx = await factory.connect(user).initializeBundle(await user.getAddress());
        const receipt = await tx.wait();

        let vault: AssetVault | undefined;
        if (receipt && receipt.events) {
            for (const event of receipt.events) {
                if (event.args && event.args.vault) {
                    vault = <AssetVault>await hre.ethers.getContractAt("AssetVault", event.args.vault);
                }
            }
        } else {
            throw new Error("Unable to create new vault");
        }
        if (!vault) {
            throw new Error("Unable to create new vault");
        }
        return vault;
    };

    return {
        createInstallmentLoanTerms,
        createLoanTerms,
        createVault,
        borrowerNote,
        lenderNote,
        loanCore,
        repaymentController,
        originationController,
        feeController,
        vaultFactory,
        currentTimestamp,
        blockchainTime,
        NONCE,
        whitelist,
        verifier,
        punks,
        vault,
        mockERC20,
        weth,
        admin,
    };
};
