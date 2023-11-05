import { Contract, ethers } from "ethers";
import { GLOBAL_CONFIG } from "../../../MODULES_CONFIG.js";
import { CHAINS, ProviderManager } from "../../services/provider-manager.js";
import { TOKENS, TokenManager } from "../../services/token-manager.js";
import { WalletManager } from "../../services/wallet-manager.js";
import { ChainsType, TokensType } from "../../types.js";
import { logger } from "../logger.js";
import { randomFloat } from "../utils.js";
import { getTransactionState } from "./getTransactionState.js";

export async function setupAmount(
	token: TokensType,
	spender?: string,
	chain: ChainsType = CHAINS.ZKEVM,
	values?: [number, number] | [],
	maxValue?: boolean,
): Promise<bigint> {
	logger.info`### Starting setupAmount ###`;
	let amountToSend: bigint;
	let amount;
	const swapValues = values || TokenManager.getSwapValues(token);
	if (swapValues.length === 2)
		amount = randomFloat(swapValues[0], swapValues[1], 4);

	if (token === TOKENS.ETH) {
		if (amount) {
			amountToSend = ethers.parseEther(amount.toString());
		} else if (!GLOBAL_CONFIG.PREVENT_SENDING_MAX_ETHER) {
			logger.error`ABOUT TO SEND ENTIRE ETH BALANCE. CONSIDER CANCELLING...`;
			// await setTimeout(10000);
			const balance = await ProviderManager.getProvider(chain).getBalance(
				WalletManager.address,
			);
			const buffer = (balance * 30n) / 100n;
			amountToSend = balance - buffer;
		} else {
			throw new Error("No valid ETH amount");
		}
	} else {
		const tokenContract = TokenManager.getContract(token).connect(
			WalletManager.zkevmWallet,
		) as Contract;

		const decimals = TokenManager.getDecimals(token);

		const balance = await tokenContract.balanceOf(WalletManager.address);

		if (amount && !maxValue) {
			amountToSend = ethers.parseUnits(amount.toString(), decimals);
			if (amountToSend > balance)
				throw new Error("Token amount is larger than balance");
		} else {
			amountToSend = balance;
		}

		const allowance = await tokenContract.allowance(
			WalletManager.address,
			spender,
		);
		if (amountToSend > allowance) {
			logger.info`### Approving token ${token.toUpperCase()} ###`;
			const approveTx = await tokenContract.approve(
				spender,
				amountToSend,
			);
			await getTransactionState(approveTx, `approve ${token}`);
		}
	}

	return amountToSend;
}
