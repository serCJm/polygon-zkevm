import { GLOBAL_CONFIG } from "./MODULES_CONFIG.js";
import { config } from "./config.js";
import { runModules } from "./src/runModules.js";
import { WalletManager } from "./src/services/wallet-manager.js";
import { WalletData, WalletHDData } from "./src/types.js";
import { countdownTimer } from "./src/utils/countdownTimer.js";
import { getWallets } from "./src/utils/db.js";
import { GotManager } from "./src/utils/gotManager.js";
import { importProxies } from "./src/utils/importProxies.js";
import { logger } from "./src/utils/logger.js";
import { shuffleArr } from "./src/utils/utils.js";

const { EXCLUDED_WALLETS } = config;

const proxies = await importProxies("resources/proxies.txt");

process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

async function processWallet(walletData: WalletHDData | WalletData) {
	let wallet;
	let name;
	if ("signer" in walletData) {
		({ name, signer: wallet } = walletData);
	} else {
		({ name, privateKey: wallet } = walletData);
	}

	WalletManager.init(wallet, name);
	const address = WalletManager.address;

	logger.setCustomPrepend(`[${name}][${address}]`);
	const proxy = proxies[name];
	await GotManager.initialize(proxy);

	await runModules();

	logger.success`Task completed, waiting for next wallet...`;
}

async function processWallets(wallets: WalletHDData[] | WalletData[]) {
	for (let i = 0; i < wallets.length; i++) {
		const wallet = wallets[i];
		if (EXCLUDED_WALLETS.has(wallet.name)) {
			logger.info`Skipping wallet ${wallet.name} as it's in the excluded list.`;
			continue;
		}
		await processWallet(wallet);
		if (wallets[i + 1])
			await countdownTimer(
				GLOBAL_CONFIG.MINMAX_WALLET_WAIT_TIME[0],
				GLOBAL_CONFIG.MINMAX_WALLET_WAIT_TIME[1],
			);
	}
	logger.success`Automation job completed`;
}

async function main() {
	const wallets = shuffleArr((await getWallets(config.WALLETS_RANGE)) ?? []);
	// const wallets: WalletData[] = shuffleArr(config.SECRET_WALLET_DATA ?? []);

	if (wallets.length === 0) throw new Error("Wallets array is empty");

	// const filWallets = wallets.filter((wallet) => [8].includes(+wallet.name));

	await processWallets(shuffleArr(wallets));

	process.exit(0);
}

main();
