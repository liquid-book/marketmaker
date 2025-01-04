import { Contract } from "ethers";
import erc20Abi from "./abi/erc20.json"
import type { ContractRunner, InterfaceAbi } from "ethers";

class ERC20 {
    private readonly instance: Contract;

    constructor(tokenAddress: `0x${string}`, runner: ContractRunner) {
        this.instance = new Contract(tokenAddress, erc20Abi as InterfaceAbi, runner);
    }

    async balanceOf(address: string): Promise<number> {
        return await this.instance.balanceOf(address);
    }

    async transfer(to: string, amount: number): Promise<void> {
        await this.instance.transfer(to, amount);
    }
}

export default ERC20