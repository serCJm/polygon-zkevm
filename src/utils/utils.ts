import { AbiCoder } from "ethers";
import { appendFile } from "fs/promises";
import { TOKENS } from "../services/token-manager.js";
import { TokensType } from "../types.js";

export function randomNumber(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

export function randomFloat(min: number, max: number, decimals: number) {
	const str = (Math.random() * (max - min) + min).toFixed(decimals);
	return parseFloat(str);
}

export function shuffleArr([...arr]: any[]) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

export async function logToFile(
	filePath: string,
	message: string,
): Promise<void> {
	try {
		await appendFile(filePath, message);
	} catch (error) {
		console.error(`Error writing to file: ${error}`);
	}
}

export function getKeyByValue(
	object: { [key: string]: any },
	value: any,
): string {
	for (const [key, val] of Object.entries(object)) {
		if (typeof value === "object" && value !== null) {
			// for objects, perform a deep comparison
			if (JSON.stringify(val) === JSON.stringify(value)) {
				return key;
			}
		} else {
			// for primitive values, perform a direct comparison
			if (val === value) {
				return key;
			}
		}
	}
	throw new Error("Value is not a key of provided object");
}

export function randomIndex(length: number, exclude?: number): number {
	let index;
	do {
		index = Math.floor(Math.random() * length);
	} while (index === exclude);
	return index;
}

export function getDeadline(minutes: number): number {
	return Math.floor(Date.now() / 1000) + 60 * minutes;
}

export function decodeABI(typesArr: string[], hexData: string): any[] {
	const abiCoder = new AbiCoder();
	const decodedInput = abiCoder.decode(typesArr, hexData);
	console.log(decodedInput);
	return decodedInput;
}

export function encodeABI(typesArr: string[], data: any[]): string {
	const abiCoder = new AbiCoder();
	const decodedInput = abiCoder.encode(typesArr, data);
	return decodedInput;
}

export function getAmountWithSlippage(
	amount: bigint,
	slippage: number,
): bigint {
	const slippageAmount = (amount * BigInt(slippage)) / 100n;

	return amount - slippageAmount;
}

export async function getProportionalAmount(
	amountTo: bigint,
	reservesFrom: bigint,
	reservesTo: bigint,
): Promise<bigint> {
	if (!reservesFrom || !reservesTo) {
		throw new Error("Reserve cannot be zero");
	}

	const proportion = reservesFrom * amountTo;
	const amount = proportion / reservesTo;

	return amount;
}

export function isStable(fromToken: TokensType, toToken: TokensType) {
	const stableTokens = new Set<TokensType>([TOKENS.USDC, TOKENS.USDC]);
	return stableTokens.has(fromToken) && stableTokens.has(toToken);
}

export function isTokenToToken(fromToken: TokensType, toToken: TokensType) {
	return fromToken !== TOKENS.ETH && toToken !== TOKENS.ETH;
}
