import type { JsonRpcProvider, Wallet, Provider } from 'ethers'
import type { TokenConfig } from './interfaces/Config'
import ERC20 from './ERC20'
import {
  calculateTickSpacingFromPercentage,
  distributeCapitalWithLimit,
  getTickRange
} from './utils/MathBook'
import Dex from './Dex'
import config from '../config/config.json'
import type Config from './interfaces/Config'
import Logger from './utils/Logger'
import { WebSocketProvider } from 'ethers'

class MMBot {
  private readonly SELL_TOKEN: TokenConfig
  private readonly BUY_TOKEN: TokenConfig
  private SEll_BALANCE: BigInt = BigInt(0)
  private BUY_BALANCE: BigInt = BigInt(0)

  private readonly MM_WALLET: Wallet
  private readonly PROVIDER: Provider

  private TIMER: Timer | null = null

  private readonly config: Config = config as Config
  private readonly Logger: Logger = new Logger();

  constructor(MMWallet: Wallet, Provider: JsonRpcProvider | WebSocketProvider) {
    this.BUY_TOKEN = config.BUY_TOKEN as TokenConfig
    this.SELL_TOKEN = config.SELL_TOKEN as TokenConfig
    this.MM_WALLET = MMWallet

    this.PROVIDER = Provider
  }

  async initBalance(): Promise<void> {
    this.Logger.debug({ context: 'MMBot', message: `Initialize Bot Wallet Balance` });
    this.SEll_BALANCE = await this.getBalance(this.SELL_TOKEN)
    this.BUY_BALANCE = await this.getBalance(this.BUY_TOKEN)
  }

  async isBalanceChanged(): Promise<boolean> {
    const SEll_BALANCE = await this.getBalance(this.SELL_TOKEN)
    const BUY_BALANCE = await this.getBalance(this.BUY_TOKEN)

    if (SEll_BALANCE === this.SEll_BALANCE && BUY_BALANCE === this.BUY_BALANCE) return false

    this.SEll_BALANCE = SEll_BALANCE
    this.BUY_BALANCE = BUY_BALANCE
    return true
  }

  async initEventListener(): Promise<void> {
    const dexInstance = new Dex(this.config.DEX_CONTRACT, this.MM_WALLET)
    await dexInstance.subscribeEvent(this)
  }

  async getBalance(token: TokenConfig): Promise<BigInt> {
    if (token.isNative) return await this.getNativeBalance()
    return await this.getERC20Balance(token.address)
  }

  async getNativeBalance(): Promise<BigInt> {
    const walletAddress: string = this.MM_WALLET.address
    return BigInt(await this.PROVIDER.getBalance(walletAddress))
  }

  async getERC20Balance(address: `0x${string}`): Promise<BigInt> {
    const erc20 = new ERC20(address, this.MM_WALLET)
    const walletAddress: string = this.MM_WALLET.address
    return BigInt(await erc20.balanceOf(walletAddress))
  }

  async getTickList(orderType: `sell` | `buy`): Promise<void> {
    const dexInstance = new Dex(this.config.DEX_CONTRACT, this.MM_WALLET)
    const getPrice = await dexInstance.getPrice(this.SELL_TOKEN.address)
    if (getPrice === 0) return
    let balance: bigint
    let priceLower: number = 0
    let priceUpper: number = 0
    if (orderType === 'sell') {
      priceLower = getPrice
      priceUpper = getPrice + getPrice * this.config.RANGE_SPACING
      balance = this.SEll_BALANCE as bigint
    } else {
      priceLower = getPrice - getPrice * this.config.RANGE_SPACING
      priceUpper = getPrice
      balance = this.BUY_BALANCE as bigint
    }
    const tickSpacing = calculateTickSpacingFromPercentage(priceLower, this.config.TICK_SPACING)
    const { tickLower, tickUpper } = getTickRange(priceLower, priceUpper, tickSpacing)
    const distribution = distributeCapitalWithLimit(balance, tickLower, tickUpper, 10)
    this.Logger.info({ context: 'MMBot', message: `Distribution ${orderType} order to ${distribution.length} ticks` });
  }

  async start(): Promise<void> {
    this.Logger.debug({ context: 'MMBot', message: `Bot Started` });

    await this.getTickList(`buy`)
    await this.getTickList(`sell`)
    this.TIMER = setTimeout(async () => {
      await this.getTickList(`buy`)
      await this.getTickList(`sell`)
    }, 3000000)
  }

  async forceRun(): Promise<void> {
    this.Logger.debug({ context: 'MMBot', message: `Force to Rerun Bot` });

    clearTimeout(this.TIMER as Timer)
    await this.initBalance()
    this.start()
  }
}

export default MMBot
