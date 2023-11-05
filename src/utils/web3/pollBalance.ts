import { ethers } from "ethers";
import { setTimeout } from "timers/promises";
import { CHAINS, ProviderManager } from "../../services/provider-manager.js";
import { TokenManager } from "../../services/token-manager.js";
import { WalletManager } from "../../services/wallet-manager.js";
import { ChainsType, TokensType } from "../../types.js";
import { logger } from "../logger.js";

const POLL_DELAY = 180000;

async function pollUntilBalanceIncreases(
	chain: ChainsType,
	getBalance: () => Promise<bigint>,
	format: (balance: bigint) => string,
) {
	const startBalance = await getBalance();
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const balance = await getBalance();
		logger.info`### Balance on ${chain.toUpperCase()} chain: ${format(
			balance,
		)}`;
		if (balance > startBalance) {
			break;
		}
		process.stdout.write(
			`. Retry poll in ${POLL_DELAY / 1000} seconds ###\r`,
		);
		await setTimeout(POLL_DELAY);
	}
}

export function pollBalance(chain?: ChainsType): Promise<void>;
export function pollBalance(
	chain: ChainsType,
	token: TokensType,
	decimals: number,
): Promise<void>;
export async function pollBalance(
	chain: ChainsType = CHAINS.ZKEVM,
	token?: TokensType,
	decimals?: number,
): Promise<void> {
	try {
		logger.info`Polling balance on ${chain.toUpperCase()}...`;
		const providerDestination = ProviderManager.getProvider(chain);

		if (!token) {
			await pollUntilBalanceIncreases(
				chain,
				() => providerDestination.getBalance(WalletManager.address),
				(balance) => ethers.formatEther(balance),
			);
		} else {
			const tokenContractDestination = TokenManager.getContract(token);
			await pollUntilBalanceIncreases(
				chain,
				() => tokenContractDestination.balanceOf(WalletManager.address),
				(balance) => ethers.formatUnits(balance, decimals),
			);
		}
		logger.info`Balance arrived to ${chain.toUpperCase()}`;
	} catch (err) {
		logger.error`Error in pollBalance: ${err}`;
	}
}
