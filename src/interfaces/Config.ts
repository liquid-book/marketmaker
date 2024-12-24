export interface TokenConfig {
    address: `0x${string}`;
    symbol: string;
    decimals: number;
    isNative: boolean;
    minBalance?: number;
}

export default interface Config {
    BUY_TOKEN: TokenConfig;
    SELL_TOKEN: TokenConfig;
    RANGE_SPACING: number;
    TICK_SPACING: number;
    DEX_CONTRACT: string;
}