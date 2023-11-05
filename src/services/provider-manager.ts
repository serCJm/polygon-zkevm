import { FetchRequest, JsonRpcProvider } from "ethers";
import { GLOBAL_CONFIG } from "../../MODULES_CONFIG.js";
import { ChainsDataType, ChainsType } from "../types.js";
import { GotManager } from "../utils/gotManager.js";
import { logger } from "../utils/logger.js";

export const CHAINS = {
	ETH: "ethereum",
	ZKEVM: "zkevm",
	ZKSYNC: "zksync",
	BASE: "base",
	LINEA: "linea",
} as const;

export class ProviderManager {
	static #providers: ChainsDataType = {
		[CHAINS.ETH]: {
			rpc: "https://ethereum.publicnode.com",
			explorer: "https://etherscan.io",
			chainId: 1,
		},
		[CHAINS.ZKEVM]: {
			// https://rpc.ankr.com/polygon_zkevm
			// https://polygon-zkevm.blockpi.network/v1/rpc/public
			rpc: "https://polygon-zkevm.blockpi.network/v1/rpc/public",
			explorer: "https://zkevm.polygonscan.com",
			chainId: 1101,
		},
		[CHAINS.ZKSYNC]: {
			// https://zksync-era.rpc.thirdweb.com
			// https://rpc.ankr.com/zksync_era
			// https://zksync.meowrpc.com
			// https://zksync-era.blockpi.network/v1/rpc/public
			rpc: "https://rpc.ankr.com/zksync_era",
			explorer: "https://explorer.zksync.io",
			chainId: 324,
		},
		[CHAINS.BASE]: {
			rpc: "https://rpc.ankr.com/base",
			explorer: "https://basescan.org",
			chainId: 8453,
		},
		[CHAINS.LINEA]: {
			// https://1rpc.io/linea
			// https://linea.blockpi.network/v1/rpc/public
			rpc: "https://1rpc.io/linea",
			explorer: "https://lineascan.build/",
			chainId: 59144,
		},
	};

	static #createProvider(rpc: string): JsonRpcProvider {
		return new JsonRpcProvider(rpc);
	}

	public static get ethProvider(): JsonRpcProvider {
		return this.#createProvider(this.#providers[CHAINS.ETH].rpc);
	}

	public static get zkevmProvider(): JsonRpcProvider {
		return this.#createProvider(this.#providers[CHAINS.ZKEVM].rpc);
	}

	public static getProvider(chain: ChainsType): JsonRpcProvider {
		return this.#createProvider(this.#providers[chain].rpc);
	}

	static getExplorer(chain: ChainsType): string {
		return this.#providers[chain].explorer;
	}

	static getChainId(chain: ChainsType): number {
		return this.#providers[chain].chainId;
	}

	static getExplorerByChainId(chainId: number): string {
		for (const chain in this.#providers) {
			if (this.#providers[chain as ChainsType].chainId === chainId) {
				return this.#providers[chain as ChainsType].explorer;
			}
		}
		throw new Error("Wrong chain Id, no provider found");
	}

	static setProxy(): void {
		if (GLOBAL_CONFIG.PROXY_RPC_REQUESTS) {
			logger.warn`RPC requests will be sent over a proxy...`;
			const customFetchFunc = async (req: any) => {
				try {
					const options: any = {
						method: req.method,
						headers: req.headers,
					};

					if (req.body) {
						options.body = Buffer.from(req.body);
					}

					const gotResponse = await GotManager.got(req.url, options);

					const getUrlResponse = {
						body: gotResponse.body
							? Uint8Array.from(Buffer.from(gotResponse.body))
							: null,
						headers: gotResponse.headers,
						statusCode: gotResponse.statusCode,
						statusMessage: gotResponse.statusMessage,
					};

					return getUrlResponse;
				} catch (err) {
					console.log(err);
				}
			};
			FetchRequest.registerGetUrl(customFetchFunc as any);
		} else {
			logger.warn`RPC requests are sent without a proxy...`;
		}
	}
}
