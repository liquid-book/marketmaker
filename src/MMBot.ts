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
import { formatEther, parseEther, WebSocketProvider } from 'ethers'

class MMBot {
  private readonly SELL_TOKEN: TokenConfig
  private readonly BUY_TOKEN: TokenConfig
  private readonly CONFIG: Config = config as Config
  private readonly PROVIDER: Provider
  private readonly Logger: Logger = new Logger();

  readonly MM_WALLET: Wallet
  
  private SEll_BALANCE: BigInt = BigInt(0)
  private BUY_BALANCE: BigInt = BigInt(0)
  private TIMER: Timer | null = null

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

  async isThresholdPassed(type: `sell` | `buy`): Promise<boolean> {
    const Token: TokenConfig = type === `sell` ? this.SELL_TOKEN : this.BUY_TOKEN;
    const balance = await this.getBalance(Token);
    const threshold = BigInt(Token.minBalance ?? 0n);
    const thresholdInValue = threshold * balance;

    if(thresholdInValue < balance) return false;

    if (type === `sell`) this.SEll_BALANCE = balance;
    else this.BUY_BALANCE = balance;
    return true
  }

  async initEventListener(): Promise<void> {
    const dexInstance = new Dex(this.MM_WALLET)
    await dexInstance.subscribeEvent(this)
  }

  async getBalance(token: TokenConfig): Promise<bigint> {
    if (token.isNative) return await this.getNativeBalance(parseEther(String(token.minBalance ?? `0`)));
    return await this.getERC20Balance(token.address)
  }

  async getNativeBalance(minBalance: bigint): Promise<bigint> {
    const walletAddress: string = this.MM_WALLET.address
    const realBalance = BigInt(await this.PROVIDER.getBalance(walletAddress));
    if(realBalance < minBalance) return 0n;
    return realBalance - minBalance;
  }

  async getERC20Balance(address: `0x${string}`): Promise<bigint> {
    const erc20 = new ERC20(address, this.MM_WALLET)
    const walletAddress: string = this.MM_WALLET.address
    return BigInt(await erc20.balanceOf(walletAddress))
  }

  async getTickList(orderType: `sell` | `buy`): Promise<void> {
    const dexInstance = new Dex(this.MM_WALLET)
    const getPrice = await dexInstance.getPrice(this.SELL_TOKEN.address)
    if (getPrice === 0) return
    let balance: bigint
    let priceLower: number = 0
    let priceUpper: number = 0
    if (orderType === 'sell') {
      priceLower = getPrice
      priceUpper = getPrice + getPrice * this.CONFIG.RANGE_SPACING
      balance = this.SEll_BALANCE as bigint
    } else {
      priceLower = getPrice - getPrice * this.CONFIG.RANGE_SPACING
      priceUpper = getPrice
      balance = this.BUY_BALANCE as bigint
    }
    const tickSpacing = calculateTickSpacingFromPercentage(priceLower, this.CONFIG.TICK_SPACING)
    const { tickLower, tickUpper } = getTickRange(priceLower, priceUpper, tickSpacing)
    const distribution = distributeCapitalWithLimit(balance, tickLower, tickUpper, 0)
    const token = orderType === 'sell' ? this.SELL_TOKEN : this.BUY_TOKEN

    await dexInstance.Approving(token, this)

    this.Logger.info({ context: 'MMBot', message: `Distribution ${orderType} order to ${distribution.length} ticks` });
    for (const tick of distribution) {
      await dexInstance.createOrder(token, tick.size, tick.realPrice, orderType)
    }
  }

  async start(): Promise<void> {
    this.Logger.debug({ context: 'MMBot', message: `Bot Started` });

    await this.reRun(`sell`)
    await this.reRun(`buy`)
  }

  async reRun(type: `sell` | `buy`): Promise<void> {
    this.Logger.info({ context: 'MMBot', message: `Rebalancing ${type.toUpperCase()} Orders` });

    clearTimeout(this.TIMER as Timer)
    await this.getTickList(type);
    this.TIMER = setTimeout(async () => {
      await this.reRun(`buy`)
      await this.reRun(`sell`)
    }, 3000000)
  }
}

export default MMBot
