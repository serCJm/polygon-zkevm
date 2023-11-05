import { QuickSwap } from "./src/modules/quickswap.js";
import { XYFinance } from "./src/modules/xy-finance.js";
import { CHAINS } from "./src/services/provider-manager.js";
import { ModulesConfigType, ORDER } from "./src/types.js";

export const MODULE_MAP = {
	XYFinance,
	QuickSwap,
} as const;

export const MODULES_CONFIG: Record<string, ModulesConfigType> = {
	[XYFinance.name]: {
		ENABLED: true,
		MINMAX_DEPOSIT_AMOUNT: [0.003, 0.004] as [number, number], // additional module-specific settings
		FROM_CHAINS: [CHAINS.ZKSYNC, CHAINS.BASE, CHAINS.LINEA],
	},
	[QuickSwap.name]: {
		ENABLED: true,
	},
};

export const GLOBAL_CONFIG = {
	PREVENT_SENDING_MAX_ETHER: true, // prevents from swapping entire eth balance if forget to provide amount in settings
	MINMAX_WALLET_WAIT_TIME: [60 * 5, 60 * 15], // seconds
	MINMAX_MODULES_WAIT_TIME: [60 * 3, 60 * 7], // seconds
	PROXY_ENFORCE: true, // true/false
	PROXY_RPC_REQUESTS: true,
	ORDER: ORDER.RANDOM,
	MAX_ETH_GWEI: 18, // number or null for current gwei
};
