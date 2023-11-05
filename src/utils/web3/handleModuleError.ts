import { CHAINS } from "../../services/provider-manager.js";
import { ChainsType } from "../../types.js";
import { logger } from "../logger.js";
import { pollBalance } from "./pollBalance.js";

export async function handleModuleError(
	error: any,
	operationName: string,
	fromChain: ChainsType = CHAINS.ZKEVM,
): Promise<boolean> {
	logger.error`Error in ${operationName}: ${error}`;

	if (
		error.message?.toLowerCase().includes("insufficient") ||
		error.reason?.toLowerCase().includes("not enough native")
	) {
		await pollBalance(fromChain);
		return true;
	} else if (error.message?.toLowerCase().includes("no pool")) {
		return true;
	}

	return false;
}
