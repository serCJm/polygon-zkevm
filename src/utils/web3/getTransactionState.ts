import { TransactionReceipt, TransactionResponse } from "ethers";
import { ProviderManager } from "../../services/provider-manager.js";
import { WalletManager } from "../../services/wallet-manager.js";
import { cancelCountdown, countdownTimer } from "../countdownTimer.js";
import { logger } from "../logger.js";
import { logToFile } from "../utils.js";

export async function getTransactionState(
	transactionResponse: TransactionResponse,
	customMessage?: string,
	confirmations: number = 1,
	timeout: number = 240,
): Promise<TransactionReceipt> {
	const receipt = await getTransactionReceipt(
		transactionResponse,
		confirmations,
		timeout,
	);

	if (!receipt) {
		throw new Error("Transaction not found.");
	}

	const link = await getExplorerLink(
		Number(transactionResponse.chainId),
		receipt.hash,
	);

	switch (receipt.status) {
		case 1:
			logger.success`Transaction ${customMessage?.toUpperCase()}: ${link}`;
			logToFile(
				"resources/excludedWallets.txt",
				`${WalletManager.walletName}, `,
			);
			return receipt;
		case 0:
			logger.error`Transaction failed: ${link}. Receipt: ${receipt}`;
			throw new Error("Transaction failed with status 0");
		default:
			throw new Error("Unknown transaction status.");
	}
}

async function getTransactionReceipt(
	transactionResponse: TransactionResponse,
	confirmations: number,
	timeoutSeconds: number,
): Promise<TransactionReceipt | void | null> {
	try {
		const transactionPromise = transactionResponse.wait(confirmations);
		const timerPromise = countdownTimer(timeoutSeconds, timeoutSeconds);
		const result = await Promise.race([transactionPromise, timerPromise]);

		return result;
	} catch (error: any) {
		if (error.code === "ETIMEOUT") {
			throw error;
		}
		throw new Error(
			`An error occurred while waiting for the transaction: ${error}`,
		);
	} finally {
		cancelCountdown();
	}
}

async function getExplorerLink(
	chainId: number,
	hash: string,
): Promise<string | undefined> {
	const explorer = ProviderManager.getExplorerByChainId(chainId);
	return explorer ? `${explorer}/tx/${hash}` : undefined;
}
