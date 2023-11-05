import { Contract, ethers, getAddress } from "ethers";
import { MinMaxSwapAmountType, TokensDataType, TokensType } from "../types.js";
import { logger } from "../utils/logger.js";
import { randomIndex } from "../utils/utils.js";
import { sendTransaction } from "../utils/web3/sendTransaction.js";
import { CHAINS, ProviderManager } from "./provider-manager.js";
import { WalletManager } from "./wallet-manager.js";

export const TOKENS = {
	ETH: "eth",
	WETH: "weth",
	USDC: "usdc",
	USDT: "usdt",
	MATIC: "matic",
	DAI: "dai",
	WBTC: "wbtc",
} as const;

export class TokenManager {
	static #ERC20_ABI = [
		"function approve(address spender, uint256 amount)",
		"function balanceOf(address addr) view returns (uint)",
		"function allowance(address addr, address spender) view returns (uint)",
		"function decimals() view returns (uint8)",
	];
	static #tokens: TokensDataType = {
		[TOKENS.ETH]: {
			address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
			symbol: "ETH",
			decimals: 18,
			MINMAX_SWAP_AMOUNT: [0.0002, 0.0005],
		},
		[TOKENS.WETH]: {
			address: "0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9",
			symbol: "WETH",
			decimals: 18,
			MINMAX_SWAP_AMOUNT: [],
		},
		[TOKENS.USDC]: {
			address: "0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035",
			symbol: "USDC",
			decimals: 6,
			MINMAX_SWAP_AMOUNT: [],
		},
		[TOKENS.USDT]: {
			address: "0x1E4a5963aBFD975d8c9021ce480b42188849D41d",
			symbol: "USDT",
			decimals: 6,
			MINMAX_SWAP_AMOUNT: [],
		},
		[TOKENS.MATIC]: {
			address: "0xa2036f0538221a77A3937F1379699f44945018d0",
			symbol: "MATIC",
			decimals: 18,
			MINMAX_SWAP_AMOUNT: [],
		},
		[TOKENS.DAI]: {
			address: "0xC5015b9d9161Dca7e18e32f6f25C4aD850731Fd4",
			symbol: "DAI",
			decimals: 18,
			MINMAX_SWAP_AMOUNT: [],
		},
		[TOKENS.WBTC]: {
			address: "0xEA034fb02eB1808C2cc3adbC15f447B93CbE08e1",
			symbol: "WBTC",
			decimals: 8,
			MINMAX_SWAP_AMOUNT: [],
		},
	};

	static isNative(token: TokensType): boolean {
		return token === TOKENS.ETH;
	}

	static formatAmount(token: TokensType, amount: bigint) {
		const decimals = TokenManager.getDecimals(token);
		return ethers.formatUnits(amount, decimals);
	}

	static getContract(token: TokensType): Contract {
		return new Contract(
			getAddress(this.#tokens[token].address),
			this.#ERC20_ABI,
		);
	}

	static async getBalance(
		token: TokensType,
		chain = CHAINS.ZKEVM,
	): Promise<bigint> {
		const contract = this.getContract(token).connect(
			ProviderManager.getProvider(chain),
		) as Contract;
		const balance = await contract.balanceOf(WalletManager.address);
		return balance;
	}

	static getDecimals(token: TokensType) {
		return this.#tokens[token].decimals;
	}

	static async getAllowance(
		token: TokensType,
		spender: string,
	): Promise<bigint> {
		const contract = this.getContract(token).connect(
			ProviderManager.zkevmProvider,
		) as Contract;
		const allowance = await contract.allowance(
			WalletManager.address,
			spender,
		);
		return allowance;
	}

	static async approve(
		token: TokensType,
		spender: string,
		amount: bigint,
	): Promise<void> {
		logger.info`### Approving token ${token.toUpperCase()} ###`;
		const contract = this.getContract(token).connect(
			WalletManager.zkevmWallet,
		) as Contract;
		const txArgs = {
			spender,
			amount,
		};

		await sendTransaction(
			contract.approve,
			`approve ${token}`,
			undefined,
			txArgs,
		);
	}

	static getAddress(token: TokensType): string {
		return getAddress(this.#tokens[token].address);
	}

	static getSwapValues(token: TokensType): MinMaxSwapAmountType {
		return this.#tokens[token].MINMAX_SWAP_AMOUNT;
	}

	static async getRandomTokenPair(
		excludedTokens?: TokensType[],
		onlyWithBalance: boolean = false,
		defaultToken1?: TokensType,
	): Promise<[TokensType, TokensType]> {
		const balances = await this.#getTokensWithBalances();

		const excludedTokensSet = new Set(excludedTokens);

		const allTokens = Object.values(TOKENS).filter(
			(token) => !excludedTokensSet.has(token as TokensType),
		) as TokensType[];

		const tokensWithBalance = Object.keys(balances).filter(
			(token) => !excludedTokensSet.has(token as TokensType),
		) as TokensType[];

		if (allTokens.length < 2) {
			throw new Error(
				"Not enough tokens to make a pair. Excluded too many tokens.",
			);
		}

		const token1 =
			defaultToken1 ||
			tokensWithBalance[randomIndex(tokensWithBalance.length)];
		const tokensWithoutToken1 = (
			onlyWithBalance ? tokensWithBalance : allTokens
		).filter((token) => token !== token1);
		const token2 =
			tokensWithoutToken1[randomIndex(tokensWithoutToken1.length)];

		// if (token1 === TOKENS.ETH) {
		// 	const tokensWithoutETH = allTokens.filter(
		// 		(token) => token !== TOKENS.ETH
		// 	);
		// 	token2 = tokensWithoutETH[getRandomIndex(tokensWithoutETH.length)];
		// } else {
		// 	token2 = TOKENS.ETH;
		// }

		return [token1, token2];
	}

	static async #getTokensWithBalances(): Promise<Record<TokensType, bigint>> {
		const provider = ProviderManager.zkevmProvider;
		const calls = [];
		const balances: Record<TokensType, bigint> = {} as Record<
			TokensType,
			bigint
		>;

		const nonEthTokens = Object.values(TOKENS).filter(
			(tokenType) => tokenType !== TOKENS.ETH,
		);

		for (const tokenType of nonEthTokens) {
			const tokenAddress = this.getAddress(tokenType);
			const contract = this.getContract(tokenType).connect(provider);
			const callData = contract.interface.encodeFunctionData(
				"balanceOf",
				[WalletManager.address],
			);
			calls.push({ to: tokenAddress, data: callData });
		}

		const results = await Promise.all(
			calls.map((call) => provider.call(call)),
		);

		nonEthTokens.forEach((tokenType, index) => {
			if (results[index].startsWith("0x") && results[index].length > 2) {
				const balance = BigInt(results[index]);
				if (balance !== BigInt(0)) balances[tokenType] = balance;
			} else {
				balances[tokenType] = BigInt(0);
			}
		});

		balances[TOKENS.ETH] = await provider.getBalance(WalletManager.address);

		return balances;
	}

	public static sortsBefore(token1: TokensType, token2: TokensType): boolean {
		return (
			TokenManager.getAddress(token1) <
			TokenManager.getAddress(token2).toLowerCase()
		);
	}
}
