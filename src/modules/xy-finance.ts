import { ethers } from "ethers";
import { Got } from "got";
import { GLOBAL_CONFIG } from "../../MODULES_CONFIG.js";
import { ProviderManager } from "../services/provider-manager.js";
import { WalletManager } from "../services/wallet-manager.js";
import { GotManager } from "../utils/gotManager.js";
import { logger } from "../utils/logger.js";
import { randomFloat, randomIndex } from "../utils/utils.js";
import { getTransactionState } from "../utils/web3/getTransactionState.js";
import { pollBalance } from "../utils/web3/pollBalance.js";
import { waitForETHGas } from "../utils/web3/waitForETHGas.js";
import { BaseModule } from "./baseModule.js";

export class XYFinance extends BaseModule {
	static contractAddress = ethers.getAddress(
		"0xe4e156167cc9C7AC4AbD8d39d203a5495F775547",
	);

	#got: Got;

	constructor() {
		super();

		this.#got = GotManager.got.extend({
			headers: {
				authority: "router-api.xy.finance",
				origin: "https://app.xy.finance",
				referer: "https://app.xy.finance/",
			},
		});
	}

	async #getRoute(amount: bigint, srcChainId: number) {
		const searchParams = {
			src_chain_id: srcChainId,
			src_quote_token_address:
				"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
			src_quote_token_amount: amount.toString(),
			dst_chain_id: 1101,
			dst_quote_token_address:
				"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
			slippage: 1,
			affiliate: "0x90d67a9eac7324a1a2942d6dea9f6174ad6048c9",
			commission_rate: 0,
		};

		try {
			const response: any = await this.#got
				.get("https://router-api.xy.finance/xy_router/quote", {
					searchParams,
				})
				.json();

			if (response) {
				const { routes } = response;

				const bestRoute = routes.reduce((acc: any, curr: any) => {
					const accReceiveAmt = BigInt(acc.min_receive_amount);
					const currReceiveAmt = BigInt(curr.min_receive_amount);

					return accReceiveAmt > currReceiveAmt ? acc : curr;
				}, routes[0]);

				return bestRoute.bridge_description.provider;
			}
		} catch (error: any) {
			logger.error`Request error: ${error.message}}`;
			throw new Error(error);
		}
	}

	async #buildTx(provider: string, amount: bigint, srcChainId: number) {
		const searchParams = {
			src_chain_id: srcChainId,
			src_quote_token_address:
				"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
			src_quote_token_amount: amount.toString(),
			dst_chain_id: 1101,
			dst_quote_token_address:
				"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
			slippage: 1,
			receiver: WalletManager.address,
			bridge_provider: provider,
			src_bridge_token_address:
				"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
			dst_bridge_token_address:
				"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
			affiliate: "0x90d67a9eaC7324A1a2942D6Dea9f6174Ad6048c9",
			commission_rate: 0,
		};

		try {
			const response: any = await this.#got
				.get("https://router-api.xy.finance/xy_router/build_tx", {
					searchParams,
				})
				.json();

			if (response) {
				return response.tx;
			}
		} catch (error: any) {
			logger.error`Request error: ${error.message}}`;
			throw new Error(error);
		}
	}

	async #bridge() {
		const { MINMAX_DEPOSIT_AMOUNT, FROM_CHAINS } = this.config;
		const srcChain = FROM_CHAINS[randomIndex(FROM_CHAINS.length)];

		this.logStart(`bridge from ${srcChain}`);

		const amount = ethers.parseEther(
			randomFloat(
				...(MINMAX_DEPOSIT_AMOUNT as [number, number]),
				4,
			).toString(),
		);

		const srcChainId = ProviderManager.getChainId(srcChain);

		const bestProvider = await this.#getRoute(amount, srcChainId);

		const txData = await this.#buildTx(bestProvider, amount, srcChainId);

		if (GLOBAL_CONFIG.MAX_ETH_GWEI) await waitForETHGas();
		const wallet = WalletManager.zkevmWallet.connect(
			ProviderManager.getProvider(srcChain),
		);

		const { gasPrice } =
			await ProviderManager.getProvider(srcChain).getFeeData();
		const block = (await ProviderManager.getProvider(srcChain).getBlock(
			"latest",
		)) || { baseFeePerGas: ethers.parseUnits("17", "gwei") };

		const maxPriorityFeePerGas = ethers.parseUnits("1.5", "gwei");
		txData.maxPriorityFeePerGas = maxPriorityFeePerGas;
		txData.maxFeePerGas = block.baseFeePerGas! + maxPriorityFeePerGas;

		console.log(gasPrice, block);

		const txResp = await wallet.sendTransaction(txData);

		const message = `bridge from ${srcChain} to ZKEVM`;
		await getTransactionState(txResp, message);

		await pollBalance();
	}

	async run() {
		await this.#bridge();
	}
}
