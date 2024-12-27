import type { Wallet, InterfaceAbi } from 'ethers'
import { Contract, formatEther, formatUnits, parseEther, parseUnits } from 'ethers'
import { getPriceFromBinance } from './utils/priceOracle'
import config from '../config/config.json'
import type Config from './interfaces/Config'
import type MMBot from './MMBot'
import dexAbi from './abi/dex.json'
import erc20Abi from './abi/erc20.json'
import Logger from './utils/Logger'
import type { TokenConfig } from './interfaces/Config'

class Dex {
  private readonly instance: Contract
  private readonly abi: InterfaceAbi = dexAbi as InterfaceAbi
  private readonly CONFIG: Config = config as Config

  private readonly Logger: Logger = new Logger();

  constructor(MMWallet: Wallet) {
    this.instance = new Contract(this.CONFIG.DEX_CONTRACT, this.abi, MMWallet)
  }

  async createOrder( token: TokenConfig, amount: bigint, price: number, type: `sell` | `buy`): Promise<void> {
    this.Logger.info({ context: 'Dex', message: `Creating ${type} order for ${formatUnits(String(amount), token.decimals)} ${token.symbol} at price ${price}` });
  }

  
  async Approving(token: TokenConfig, bot: MMBot): Promise<void> {
    if (token.isNative) {
      this.Logger.info({ context: 'MMBot', message: `Native Token doesn't need to be approved` });
      return;
    }
    const ERC20: Contract = new Contract(token.address, erc20Abi as InterfaceAbi, bot.MM_WALLET);
    
    const balance = await bot.getBalance(token);
    const allowance = await ERC20.allowance(bot.MM_WALLET.address, this.CONFIG.DEX_CONTRACT);

    if(BigInt(allowance) < balance) {
      this.Logger.info({ context: 'MMBot', message: `Approving ${this.CONFIG.DEX_CONTRACT} for spending ${formatEther(balance)} ${token.symbol}`});
      await (await ERC20.approve(this.CONFIG.DEX_CONTRACT, balance)).wait();
      this.Logger.success({ context: 'MMBot', message: `Approved Transaction Confirmed`});
    }else {
      this.Logger.info({ context: 'MMBot', message: `Allowance is enough`});
    }
  }


  async getPrice(token: string): Promise<number> {
    const buy = this.CONFIG.BUY_TOKEN.symbol.toUpperCase()
    const sell = this.CONFIG.SELL_TOKEN.symbol.toUpperCase()
    return await getPriceFromBinance(`${buy}${sell}`)
  }

  async subscribeEvent(bot: MMBot): Promise<void> {
    this.Logger.debug({ context: 'Dex', message: `Starting Event Listener` });

    this.instance.on('JoinRaffle', async () => {
      this.Logger.info({ context: 'Dex', message: `New Trade Detected` });
      const sellThreshold = await bot.isThresholdPassed(`sell`);
      const buyThreshold = await bot.isThresholdPassed(`buy`);
      if (!sellThreshold && !buyThreshold) {
        this.Logger.info({ context: 'Dex', message: `Bot Balance is not changed` });
        return
      }
      if(sellThreshold) bot.reRun(`sell`);
      if(buyThreshold) bot.reRun(`buy`);
    })
  }
}

export default Dex
