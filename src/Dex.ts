import type { Wallet, InterfaceAbi } from 'ethers'
import { Contract, formatEther, formatUnits } from 'ethers'
import { getPriceFromBinance } from './utils/priceOracle'
import config from '../config/config.json'
import type Config from './interfaces/Config'
import type MMBot from './MMBot'
import BitmapManagerABI from './abi/bitmap_manager.json'
import erc20Abi from './abi/erc20.json'
import EngineABI from './abi/engine.json'
import Logger from './utils/Logger'
import type { TokenConfig } from './interfaces/Config'
import type Order from './interfaces/Order'

class Dex {
  private readonly BOOK_ENGINE: Contract
  private readonly BITMAP_MANAGER: Contract
  private readonly CONFIG: Config = config as Config
  private readonly WALLET: Wallet

  private readonly Logger: Logger = new Logger();

  private orders: Array<Order> = [];

  constructor(MMWallet: Wallet) {
    this.BOOK_ENGINE = new Contract(this.CONFIG.BOOK_ENGINE_CA, EngineABI, MMWallet);
    this.BITMAP_MANAGER = new Contract(this.CONFIG.BITMAP_MANAGER_CA, BitmapManagerABI, MMWallet);
    this.WALLET = MMWallet;
  }

  /**
   * Get the current tick from the BitmapManager contract
   * @returns the current tick
   */
  async getCurrentTick(): Promise<number> {
    return Number(await this.BITMAP_MANAGER.getCurrentTick());
  }

  /**
   * Create Order then push it to the orders array
   * @param amount amount of token to be traded
   * @param tick the tick the order placed
   * @param type order type is `sell` or `buy`
   */
  async createOrder( amount: bigint, tick: number, type: `sell` | `buy`): Promise<void> {
    this.orders.push({ tick, amount, isBuy: type === `buy` });
  }

  /**
   * Execute all orders in the orders array
   * @returns boolean if the order is executed or not
   */
  async executeOrders(noonce: number): Promise<boolean> {
    const address: string = await this.WALLET.getAddress();
    for(let order of this.orders) {
      // this mean if index 0 was 0 amount , no need to interate another order
      if(order.amount === BigInt(0)) continue;
      this.Logger.info({ context: 'Dex', message: `Placing Order with tick ${order.tick} and order size ${formatEther(order.amount)}` });


      this.BOOK_ENGINE.placeOrder(order.tick, order.amount, address, order.isBuy, false, {nonce: noonce})
        .then((tx) => {
          this.Logger.success({ context: 'Dex', message: `Order Submitted with tick ${order.tick} and order size ${formatEther(order.amount)}` });
        })
        .catch((err) => this.Logger.error({ context: 'Dex', message: `Order Submission Failed with tick ${order.tick} cause : ${err.message}` }));
      
        noonce++;
    }
    this.orders = [];
    return true;
  }
  
  /**
   * Approve the token to be spent by the Balance Manager contract
   * @param token token config (refer to interfaces/Config.ts)
   * @param bot MMBot instance
   * @returns void
   */
  async Approving(token: TokenConfig, bot: MMBot): Promise<void> {
    if (token.isNative) {
      this.Logger.info({ context: 'MMBot', message: `Native Token doesn't need to be approved` });
      return;
    }
    const ERC20: Contract = new Contract(token.address, erc20Abi as InterfaceAbi, bot.MM_WALLET);
    
    const balance = await bot.getBalance(token);
    const allowance = await ERC20.allowance(bot.MM_WALLET.address, this.CONFIG.BOOK_ENGINE_CA);

    if(BigInt(allowance) < balance) {
      this.Logger.info({ context: 'MMBot', message: `Approving ${this.CONFIG.BOOK_ENGINE_CA} for spending ${formatEther(balance)} ${token.symbol}`});
      await (await ERC20.approve(this.CONFIG.BOOK_ENGINE_CA, balance)).wait();
      this.Logger.success({ context: 'MMBot', message: `Approved Transaction Confirmed`});
    }else {
      this.Logger.info({ context: 'MMBot', message: `Allowance is enough`});
    }
  }

  /**
   * Get the price of the token from Binance API
   * @param token token symbol
   * @returns the price of the token
   */
  async getPrice(token: string): Promise<number> {
    const buy = this.CONFIG.BUY_TOKEN.symbol.toUpperCase()
    const sell = this.CONFIG.SELL_TOKEN.symbol.toUpperCase()
    return await getPriceFromBinance(`${buy}${sell}`)
  }

  /**
   * Subscribe to the event listener from the Book Engine contract
   * @param bot MMBot instance
   */
  async subscribeEvent(bot: MMBot): Promise<void> {
    this.Logger.debug({ context: 'Dex', message: `Starting Event Listener` });

    // this.BOOK_ENGINE_CA.on('Trade', async () => {
    //   this.Logger.info({ context: 'Dex', message: `New Trade Detected` });
    //   const sellThreshold = await bot.isThresholdPassed(`sell`);
    //   const buyThreshold = await bot.isThresholdPassed(`buy`);
    //   if (!sellThreshold && !buyThreshold) {
    //     this.Logger.info({ context: 'Dex', message: `Bot Balance is not changed` });
    //     return
    //   }
    //   if(sellThreshold) bot.reRun(`sell`);
    //   if(buyThreshold) bot.reRun(`buy`);
    // })
  }
}

export default Dex
