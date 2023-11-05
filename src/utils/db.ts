import { ethers } from "ethers";
import mongoose, { Document } from "mongoose";
import { config } from "../../config.js";
import { getUserInput } from "./getUserInput.js";

const { EXCLUDED_WALLETS: excludedWalletsSet } = config;

type User = {
	name: number;
	address: string;
	wallet: string;
};
type UserModelInstance = Document & User;

const userSchema = new mongoose.Schema({
	name: {
		type: Number,
		required: true,
	},
	address: {
		type: String,
		required: true,
	},
	wallet: {
		type: String, // encrypted wallet json
		required: true,
	},
});

const UserModel = mongoose.model("User", userSchema);

mongoose.connection.on("error", (err) => {
	console.error("MongoDB connection error:", err);
});

async function connectDb() {
	try {
		await mongoose.connect(config.DB_URL);
		console.log("MongoDB connected successfully.");
	} catch (err) {
		console.error("Failed to connect to MongoDB:", err);
	}
}

async function disconnectDb() {
	try {
		await mongoose.disconnect();
		console.log("MongoDB disconnected successfully.");
	} catch (err) {
		console.error("Failed to disconnect from MongoDB:", err);
	}
}

async function decryptWallet(encryptedWallet: string, password: string) {
	const decryptedWallet = await ethers.Wallet.fromEncryptedJson(
		encryptedWallet,
		password
	);
	return decryptedWallet;
}

async function findWalletsInRange(
	range: string = ""
): Promise<UserModelInstance[]> {
	try {
		await connectDb();

		const trimmedRange = range.trim();

		if (trimmedRange === "") {
			// if range is empty, return all documents
			const allDocs = await UserModel.find({});
			return allDocs;
		}

		let docs = [];

		// Check if input is a list of numbers
		if (trimmedRange.includes(",")) {
			const numbers = trimmedRange
				.split(",")
				.map(Number)
				.filter((num) => !Number.isNaN(num));
			const query = {
				name: {
					$in: numbers,
				},
			};
			docs = await UserModel.find(query).sort({ name: "ascending" });
		} else {
			// Handle range
			const parts = trimmedRange.split("-").map((part) => part.trim());

			if (parts.length > 2) {
				throw new Error(
					'Input must be in the format "start-end" or a list of numbers'
				);
			}

			const start = Number(parts[0]);
			const end = Number(parts.length > 1 ? parts[1] : parts[0]);

			if (Number.isNaN(start) || Number.isNaN(end)) {
				throw new Error("Both start and end must be valid numbers");
			}

			if (start <= end) {
				const query = {
					name: {
						$gte: start,
						$lte: end,
					},
				};
				docs = await UserModel.find(query).sort({ name: "ascending" });
			} else {
				const query1 = {
					name: start,
				};
				const query2 = {
					name: {
						$gte: end,
						$lte: start - 1,
					},
				};

				const docs1 = await UserModel.find(query1).sort({
					name: "ascending",
				});
				const docs2 = await UserModel.find(query2).sort({
					name: "ascending",
				});

				docs = [...docs1, ...docs2];
			}
		}

		return docs;
	} catch (err) {
		console.log(err);
		return [];
	} finally {
		await disconnectDb();
	}
}

async function decryptWallets(encryptedWallets: UserModelInstance[]) {
	try {
		if (!Array.isArray(encryptedWallets) || encryptedWallets.length === 0)
			throw new Error("No wallets found");
		const password = await getUserInput("Please enter wallet password: ");

		const decryptedWalletsPr: Promise<any>[] = [];

		encryptedWallets.forEach((encWallet: UserModelInstance) => {
			const { name, address, wallet } = encWallet;

			if (excludedWalletsSet.has(name.toString())) {
				console.info(
					`Skipping wallet ${name} as it's in the excluded list.`
				);
				return;
			}

			decryptedWalletsPr.push(
				decryptWallet(wallet, password).then((decryptedWallet) => {
					console.log(`SUCCESS decrypting wallet: ${name}`);
					return {
						name: name.toString(),
						address,
						signer: decryptedWallet,
					};
				})
			);
		});

		const decryptedWallets = await Promise.all(decryptedWalletsPr);

		return decryptedWallets;
	} catch (err) {
		console.error(err);
	}
}

export async function getWallets(range: string) {
	try {
		const encryptedWallets = await findWalletsInRange(range);
		const decryptedWallets = await decryptWallets(encryptedWallets);
		return decryptedWallets;
	} catch (err) {
		console.error(err);
	}
}
