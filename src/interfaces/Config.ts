export interface TokenConfig {
    address: `0x${string}`;
    symbol: string;
    decimals: number;
    isNative: boolean;
    distributeMode: `BALANCED` | `SMALL2HIGH` | `HIGH2SMALL`;
    minBalance?: number;
}

export default interface Config {
    BUY_TOKEN: TokenConfig;
    SELL_TOKEN: TokenConfig;
    RANGE_SPACING: number;
    TICK_SPACING: number;
    BOOK_ENGINE_CA: `0x${string}`;
    BITMAP_MANAGER_CA: `0x${string}`;
}