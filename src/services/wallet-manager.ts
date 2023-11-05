import { Wallet } from "ethers";
import { ProviderManager } from "./provider-manager.js";

export class WalletManager {
	static #name: string;
	static #zkevmWallet: Wallet | null = null;
	static #address: string | null = null;

	static get walletName(): string {
		if (!this.#name) throw new Error("Wallet not initialized");
		return this.#name;
	}

	static get zkevmWallet(): Wallet {
		if (!this.#zkevmWallet) throw new Error("ZKEVM wallet not initialized");
		return this.#zkevmWallet;
	}

	static get address(): string {
		if (!this.#address) throw new Error("Wallet not initialized");
		return this.#address;
	}

	public static init(privateKey: string | Wallet, name: string): void {
		const zkevmProvider = ProviderManager.zkevmProvider;
		if (typeof privateKey === "string") {
			this.#zkevmWallet = new Wallet(privateKey, zkevmProvider);
		} else {
			this.#zkevmWallet = privateKey.connect(zkevmProvider);
		}
		this.#address = this.#zkevmWallet.address;
		this.#name = name;
	}
}
