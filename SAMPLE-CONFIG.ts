import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GLOBAL_CONFIG, MODULES_CONFIG } from "./MODULES_CONFIG.js";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "PATH TO YOUR WALLET FILE") });

if (!process.env.WALLETS) throw new Error("Missing wallet data");

export const config = {
	EXCLUDED_WALLETS: [] as number[],
	SECRET_WALLET_DATA: JSON.parse(process.env.WALLETS),
	MODULES: { ...MODULES_CONFIG, ...GLOBAL_CONFIG },
};
