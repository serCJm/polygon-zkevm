import { Wallet } from "ethers";
import { BaseModule } from "./modules/baseModule.js";
import { CHAINS } from "./services/provider-manager.js";
import { TOKENS } from "./services/token-manager.js";

// ALL CHAINS
export type ChainsType = (typeof CHAINS)[keyof typeof CHAINS];
export type ChainsTypeKey = keyof typeof CHAINS;
export type ChainsData = {
	rpc: string;
	explorer: string;
	chainId: number;
};
export type ChainsDataType = Record<ChainsType, ChainsData>;

// TOKENS
export type TokensType = (typeof TOKENS)[keyof typeof TOKENS];
export type TokensTypeKey = keyof typeof TOKENS;
export type MinMaxSwapAmountType = [number, number] | [];
export type TokensData = {
	address: string;
	symbol: string;
	MINMAX_SWAP_AMOUNT: MinMaxSwapAmountType;
	decimals: number;
};
export type TokensDataType = Record<TokensType, TokensData>;

// NFT
export type NFTData = {
	name: string;
	contractAddress: string;
	fn: string;
	minter?: string;
	quantity: number;
	tokenId?: number;
	price?: number;
	mintReferral: string;
};

// ORDER
export const ORDER: Record<string, OrderType> = {
	RANDOM: "random",
	ONE_RANDOM: "one_random",
	DEFAULT: "default",
} as const;
export type OrderType = "random" | "one_random" | "default";

// MODULES
export type BaseModuleDerivedClass = new (...args: any[]) => BaseModule;

export type BaseConfig = {
	ENABLED: boolean;
	[key: string]: any;
};

export type BridgeConfig = BaseConfig & {
	MINMAX_DEPOSIT_AMOUNT: [number, number] | [];
};

export type DexConfig = BaseConfig & {
	SWAP: boolean;
	ADD_LIQUIDITY: boolean;
	EXCLUDED_TOKENS: TokensType[];
};

export type LendingProtocolConfig = BaseConfig & {
	VOLUME_MAKER: [number, number] | [];
};

export type ModulesConfigType =
	| BaseConfig
	| BridgeConfig
	| DexConfig
	| LendingProtocolConfig;

// PROXY
export type Proxy = {
	ip: string;
	port: string;
	username: string;
	password: string;
};

export type Proxies = {
	[name: string]: Proxy;
};

// MISC
export type WalletHDData = {
	name: string;
	address: string;
	signer: Wallet;
};

export type WalletData = {
	name: string;
	privateKey: string;
};
