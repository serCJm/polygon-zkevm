import { Contract, ethers } from "ethers";
import { TOKENS } from "../services/token-manager.js";
import { WalletManager } from "../services/wallet-manager.js";
import { logger } from "../utils/logger.js";
import { sendTransaction } from "../utils/web3/sendTransaction.js";
import { setupAmount } from "../utils/web3/setupAmount.js";
import { BaseModule } from "./baseModule.js";

export class WrapUnwrapETH extends BaseModule {
	static contractAddress = "0x4200000000000000000000000000000000000006";
	#wethContract: Contract;

	constructor() {
		super();

		const WETH_ABI = [
			"function deposit() public payable",
			"function withdraw(uint wad)",
			"function balanceOf(address owner) view returns (uint256)",
		];

		this.#wethContract = new Contract(
			WrapUnwrapETH.contractAddress,
			WETH_ABI,
			WalletManager.baseWallet,
		);
	}

	async #wrap() {
		logger.info`### Starting ETH Wrap ###`;
		const value = await setupAmount(TOKENS.ETH);

		await sendTransaction(
			this.#wethContract.deposit,
			`wrap ${ethers.formatEther(value)} eth`,
			value,
		);
	}

	async #unwrap(value: bigint) {
		logger.info`### Starting ETH Unwrap ###`;

		const txArgs = {
			value,
		};

		await sendTransaction(
			this.#wethContract.withdraw,
			`unwrap ${ethers.formatEther(value)} eth`,
			undefined,
			txArgs,
		);
	}

	async #toWrapOrUnwrap() {
		const balance: bigint = await this.#wethContract.balanceOf(
			WalletManager.address,
		);

		if (!balance) {
			await this.#wrap();
		} else {
			await this.#unwrap(balance);
		}
	}

	async run() {
		await this.#toWrapOrUnwrap();
	}
}
