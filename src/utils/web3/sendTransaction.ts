import { ContractMethod } from "ethers";
import { GLOBAL_CONFIG } from "../../../MODULES_CONFIG.js";
import { countdownTimer } from "../countdownTimer.js";
import { logger } from "../logger.js";
import { estimateGas } from "./estimateGas.js";
import { getTransactionState } from "./getTransactionState.js";
import { waitForETHGas } from "./waitForETHGas.js";

export async function sendTransaction(
	contract: ContractMethod,
	message: string,
	value: bigint = BigInt(0),
	...txParams: any[]
) {
	let txArgs;
	if (
		txParams.length === 1 &&
		typeof txParams[0] === "object" &&
		!Array.isArray(txParams[0])
	) {
		txArgs = Object.values(txParams[0]);
	} else {
		txArgs = txParams;
	}
	const gas = await estimateGas(contract, ...txArgs, {
		value,
	});

	logger.info`### Sending transaction ###`;

	if (GLOBAL_CONFIG.MAX_ETH_GWEI) await waitForETHGas();

	const swapTx = await contract(...txArgs, {
		...gas,
		value,
	});

	const receipt = await getTransactionState(swapTx, message);

	await countdownTimer(45, 90);

	return receipt;
}
