import { ethers } from "ethers";
import { Got } from "got";
import { setTimeout } from "timers/promises";
import { GLOBAL_CONFIG } from "../../MODULES_CONFIG.js";
import { TokenManager } from "../services/token-manager.js";
import { WalletManager } from "../services/wallet-manager.js";
import { GotManager } from "../utils/gotManager.js";
import { logger } from "../utils/logger.js";
import { randomNumber } from "../utils/utils.js";
import { getTransactionState } from "../utils/web3/getTransactionState.js";
import { setupAmount } from "../utils/web3/setupAmount.js";
import { waitForETHGas } from "../utils/web3/waitForETHGas.js";
import { DEX } from "./dex.js";

export class QuickSwap extends DEX {
	static contractAddress = ethers.getAddress(
		"0xb83b554730d29ce4cb55bb42206c3e2c03e4a40a",
	);

	#got: Got;

	constructor() {
		super();

		this.#got = GotManager.got.extend({
			headers: {
				origin: "https://quickswap.exchange",
				referer: "https://quickswap.exchange/",
			},
		});
	}

	async #getPriceRoute(
		srcToken: string,
		destToken: string,
		srcDecimals: number,
		destDecimals: number,
		amount: string,
	) {
		const searchParams = {
			srcToken,
			destToken,
			network: "1101",
			partner: "quickswapv3",
			includeDEXS: "quickswap,quickswapv3,quickswapv3.1,quickperps",
			srcDecimals,
			destDecimals,
			amount,
			side: "SELL",
			maxImpact: "15",
		};

		try {
			const response: any = await this.#got
				.get("https://api.paraswap.io/prices/", {
					searchParams,
				})
				.json();

			if (response) {
				console.log(response);
				return response.priceRoute;
			}
		} catch (error: any) {
			logger.error`Request error: ${error.message}}`;
			throw new Error(error);
		}
	}

	async #getTxData(priceRoute: any) {
		const { srcToken, destToken, srcAmount, destAmount } = priceRoute;

		const json = {
			destAmount,
			destToken: destToken.toLowerCase(),
			partner: "quickswapv3",
			priceRoute,
			receiver: WalletManager.address.toLowerCase(),
			srcAmount,
			srcToken: srcToken.toLowerCase(),
			userAddress: WalletManager.address.toLowerCase(),
		};

		try {
			const response: any = await this.#got
				.post("https://api.paraswap.io/transactions/1101/", {
					json,
				})
				.json();

			if (response) {
				return response;
			}
		} catch (error: any) {
			logger.error`Request error: ${error.message}}`;
			throw new Error(error);
		}
	}

	public async swap() {
		logger.info`### Starting swap on QuickSwap ###`;

		const amount = await setupAmount(
			this.fromToken,
			QuickSwap.contractAddress,
		);

		const srcDecimals = TokenManager.getDecimals(this.fromToken);
		const destDecimals = TokenManager.getDecimals(this.toToken);

		if (GLOBAL_CONFIG.MAX_ETH_GWEI) await waitForETHGas();

		// get cookies
		await this.#got.get("https://quickswap.exchange/");
		await setTimeout(1000);

		const priceRoute = await this.#getPriceRoute(
			this.fromTokenAddress,
			this.toTokenAddress,
			srcDecimals,
			destDecimals,
			amount.toString(),
		);

		console.log(priceRoute);

		const txData = await this.#getTxData(priceRoute);

		const txResp = await WalletManager.zkevmWallet.sendTransaction({
			...txData,
			gasLimit: randomNumber(525000, 600000),
		});

		const message = `swap ${this.fromToken} ==> ${this.toToken}`;
		await getTransactionState(txResp, message);
	}
}
