import type { Wallet, InterfaceAbi } from 'ethers'
import { Contract } from 'ethers'
import { getPriceFromBinance } from './utils/priceOracle'
import config from '../config/config.json'
import type Config from './interfaces/Config'
import type MMBot from './MMBot'
import dexAbi from './abi/dex.json'
import Logger from './utils/Logger'

class Dex {
  private readonly instance: Contract
  private readonly abi: InterfaceAbi = dexAbi as InterfaceAbi
  private readonly config: Config = config as Config

  private readonly Logger: Logger = new Logger();

  constructor(contract: string, MMWallet: Wallet) {
    this.instance = new Contract(contract, this.abi, MMWallet)
  }

  async createOrder(isBuy: boolean, token: string, amount: number, price: number): Promise<void> {
    console.log(`createOrder`)
  }

  async getPrice(token: string): Promise<number> {
    const buy = this.config.BUY_TOKEN.symbol.toUpperCase()
    const sell = this.config.SELL_TOKEN.symbol.toUpperCase()
    return await getPriceFromBinance(`${buy}${sell}`)
  }

  async subscribeEvent(bot: MMBot): Promise<void> {
    this.Logger.debug({ context: 'Dex', message: `Starting Event Listener` });

    this.instance.on('JoinRaffle', async () => {
      this.Logger.info({ context: 'Dex', message: `New Trade Detected` });
      const isBotBalanceChanged = await bot.isBalanceChanged()
      if (!isBotBalanceChanged) {
        this.Logger.info({ context: 'Dex', message: `Bot Balance is not changed` });
        return
      }
      this.Logger.info({ context: 'Dex', message: `Bot Balance is changed` });
      bot.forceRun()
    })
  }
}

export default Dex
