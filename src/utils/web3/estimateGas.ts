import { ContractMethod, ethers } from "ethers";
import { ProviderManager } from "../../services/provider-manager.js";
import { logger } from "../logger.js";

type EstimateGasReturnProps = {
	gasLimit?: bigint;
	maxPriorityFeePerGas?: bigint;
	maxFeePerGas?: bigint;
};

export async function estimateGas(
	contract: ContractMethod,
	...args: any[]
): Promise<EstimateGasReturnProps> {
	logger.info`### Running estimateGas ###`;

	const fees = await ProviderManager.zkevmProvider.getFeeData();

	const gasPrice = fees.gasPrice || ethers.parseUnits("1", "gwei");

	const gasLimit = await contract.estimateGas(...args);

	return {
		...(gasLimit !== undefined && {
			gasLimit: gasLimit + BigInt(10000),
		}),
		...(gasPrice !== undefined && { gasPrice }),
	};
}
