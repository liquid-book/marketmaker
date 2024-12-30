import type { JsonRpcProvider, Wallet, Provider } from 'ethers'
import type { TokenConfig } from './interfaces/Config'
import ERC20 from './ERC20'
import {
  distributeCapitalWithModes,
  getPriceFromTick
} from './utils/MathBook'
import Dex from './Dex'
import config from '../config/config.json'
import type Config from './interfaces/Config'
import Logger from './utils/Logger'
import { parseEther, WebSocketProvider } from 'ethers'

class MMBot {
  private readonly SELL_TOKEN: TokenConfig
  private readonly BUY_TOKEN: TokenConfig
  private readonly CONFIG: Config = config as Config
  private readonly PROVIDER: Provider
  private readonly Logger: Logger = new Logger();

  private readonly DEX_INSTANCE: Dex;
  readonly MM_WALLET: Wallet
  
  private SEll_BALANCE: BigInt = BigInt(0)
  private BUY_BALANCE: BigInt = BigInt(0)
  private TIMER: Timer | null = null

  constructor(MMWallet: Wallet, Provider: JsonRpcProvider | WebSocketProvider) {
    this.BUY_TOKEN = config.BUY_TOKEN as TokenConfig
    this.SELL_TOKEN = config.SELL_TOKEN as TokenConfig
    this.MM_WALLET = MMWallet
    this.DEX_INSTANCE = new Dex(MMWallet);

    this.PROVIDER = Provider
  }

  /**
   * Initialize the bot wallet balance
   * @returns void
   */
  async initBalance(): Promise<void> {
    this.Logger.debug({ context: 'MMBot', message: `Initialize Bot Wallet Balance` });
    this.SEll_BALANCE = await this.getBalance(this.SELL_TOKEN)
    this.BUY_BALANCE = await this.getBalance(this.BUY_TOKEN)
  }

  /**
   * the function to check if the threshold is passed or not
   * @param type order type is `sell` or `buy`
   * @returns boolean of the threshold is passed or not
   */
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

  /**
   * Initialize the event listener for the bot to listen to the event
   * @returns void
   */
  async initEventListener(): Promise<void> {
    const dexInstance = new Dex(this.MM_WALLET)
    await dexInstance.subscribeEvent(this)
  }

  /**
   * get the balance of the token
   * @param token token config (refer to interfaces/Config.ts)
   * @returns bigint of the balance
   */
  async getBalance(token: TokenConfig): Promise<bigint> {
    if (token.isNative) return await this.getNativeBalance(parseEther(String(token.minBalance ?? `0`)));
    return await this.getERC20Balance(token.address)
  }

  /**
   * get the native balance of the wallet
   * @param minBalance the minimum balance to be left on the wallet
   * @returns bigint of the balance
   */
  async getNativeBalance(minBalance: bigint): Promise<bigint> {
    const walletAddress: string = this.MM_WALLET.address
    const realBalance = BigInt(await this.PROVIDER.getBalance(walletAddress));
    if(realBalance < minBalance) return 0n;
    return realBalance - minBalance;
  }

  /**
   * get the ERC20 balance of the wallet
   * @param address the address of the ERC20 token
   * @returns bigint of the balance
   */
  async getERC20Balance(address: `0x${string}`): Promise<bigint> {
    const erc20 = new ERC20(address, this.MM_WALLET)
    const walletAddress: string = this.MM_WALLET.address
    return BigInt(await erc20.balanceOf(walletAddress))
  }

  /**
   * Submit the orders to the DEX
   * @returns void
   */
  async submitOrders(noonce: number): Promise<void> {
    await this.DEX_INSTANCE.executeOrders(noonce);
  }

  /**
   * get tick list for the bot to submit the order
   * @param orderType order type is `sell` or `buy`
   * @returns void
   */
  async getTickList(orderType: `sell` | `buy`): Promise<void> {
    const tick: number = await this.DEX_INSTANCE.getCurrentTick();
    const getPrice: number = getPriceFromTick(tick);
    this.Logger.info({ context: 'MMBot', message: `Current Price: ${getPrice}` });
    if (getPrice === 0) return
    let balance: bigint
    let priceLower: number = 0
    let priceUpper: number = 0
    if (orderType === 'sell') {
      priceLower = getPrice
      priceUpper = getPrice * (1 + this.CONFIG.RANGE_SPACING)
      balance = this.SEll_BALANCE as bigint
    } else {
      priceLower = getPrice * (1 - this.CONFIG.RANGE_SPACING)
      priceUpper = getPrice
      balance = this.BUY_BALANCE as bigint
    }
    this.Logger.info({ context: 'MMBot', message: `Price Range: ${priceLower} - ${priceUpper}` });
    const token = orderType === 'sell' ? this.SELL_TOKEN : this.BUY_TOKEN
    const distribution = distributeCapitalWithModes(balance, priceLower, priceUpper, this.CONFIG.TICK_SPACING , token.distributeMode )
    this.Logger.info({ context: 'MMBot', message: `Distribution: ${distribution.length}` });
    let i = 0;
    for(const tick of distribution) {
      if(i === 2) break;
      await this.DEX_INSTANCE.createOrder(tick.size, tick.tick, orderType);
      i++;
    }
  }

  /**
   * Start the bot
   * @returns void
   */
  async start(): Promise<void> {
    this.Logger.debug({ context: 'MMBot', message: `Bot Started` });
    await this.mainFunc()
    this.TIMER = setTimeout(async () => { 
      await this.mainFunc()
    }, 3000000)
  }

  /**
   * Main function to run the bot
   */
  async mainFunc(): Promise<void> {
    const noonce: number = Number(await this.PROVIDER.getTransactionCount(this.MM_WALLET.address))

    await this.getTickList(`sell`)
    await this.getTickList(`buy`)
    await this.submitOrders(noonce);
  }

  /**
   * Re-run the bot if the balance threshold is passed
   * @returns void
   */
  async reRun(): Promise<void> {
    this.Logger.info({ context: 'MMBot', message: `Rebalancing Orders` });

    clearTimeout(this.TIMER as Timer)
    await this.mainFunc()
    this.TIMER = setTimeout(async () => { 
      await this.mainFunc()
    }, 3000000)
  }
}

export default MMBot
