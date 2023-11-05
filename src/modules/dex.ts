import { TOKENS, TokenManager } from "../services/token-manager.js";
import { DexConfig, TokensType } from "../types.js";
import { countdownTimer } from "../utils/countdownTimer.js";
import { BaseModule } from "./baseModule.js";

export abstract class DEX extends BaseModule {
	protected fromToken!: TokensType;
	protected toToken!: TokensType;

	protected abstract swap(): Promise<void>;
	protected addLiquidity?(): Promise<void>;

	protected get fromTokenAddress(): string {
		return TokenManager.getAddress(this.fromToken);
	}

	protected get toTokenAddress(): string {
		return TokenManager.getAddress(this.toToken);
	}

	constructor() {
		super();
	}

	async #setup(): Promise<void> {
		[this.fromToken, this.toToken] = await TokenManager.getRandomTokenPair(
			(this.config as DexConfig).EXCLUDED_TOKENS,
		);
	}

	protected createSwapMessage(amount: bigint) {
		const formattedAmount = TokenManager.formatAmount(
			this.fromToken,
			amount,
		);
		const message = `swap on ${this.constructor.name} ${formattedAmount} ${this.fromToken} ==> ${this.toToken}`;
		return message;
	}

	protected createAddLiquidityMessage(amount: bigint) {
		const formattedAmount = TokenManager.formatAmount(
			this.fromToken,
			amount,
		);
		const message = `add liquidity on ${this.constructor.name} ${formattedAmount} ${this.fromToken} === ${this.toToken}`;
		return message;
	}

	#normalizeTokens() {
		if (this.fromToken === TOKENS.ETH || this.toToken === TOKENS.ETH) {
			this.toToken =
				this.fromToken === TOKENS.ETH ? this.toToken : this.fromToken;
		}
		this.fromToken = TOKENS.ETH;
	}

	async #updateToToken(onlyWithBalance: boolean): Promise<TokensType> {
		const tokens = await TokenManager.getRandomTokenPair(
			(this.config as DexConfig).EXCLUDED_TOKENS,
			onlyWithBalance,
			TOKENS.ETH,
		);
		return tokens[1];
	}

	protected async getLiquidityPair() {
		this.logStart("getLiquidityPair");

		this.#normalizeTokens();

		const balance = await TokenManager.getBalance(this.toToken);

		if (!balance) {
			this.toToken = await this.#updateToToken(true);
		}

		if (!this.toToken) {
			this.toToken = await this.#updateToToken(false);
			await this.swap();
		}
	}

	protected isTokenToToken() {
		return this.fromToken !== TOKENS.ETH && this.toToken !== TOKENS.ETH;
	}

	protected isStable() {
		const stableTokens = new Set<TokensType>([TOKENS.USDC, TOKENS.USDT]);
		return (
			stableTokens.has(this.fromToken) && stableTokens.has(this.fromToken)
		);
	}

	public async run() {
		await this.#setup();

		await this.swap();

		if ((this.config as DexConfig).ADD_LIQUIDITY && this.addLiquidity) {
			await countdownTimer(60, 120);
			await this.addLiquidity();
		}
	}
}
