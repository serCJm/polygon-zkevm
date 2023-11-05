import { ethers } from "ethers";

export function getNFTId(txReceipt: ethers.TransactionReceipt) {
	return ethers.getNumber(txReceipt.logs[0].topics[3]);
}
