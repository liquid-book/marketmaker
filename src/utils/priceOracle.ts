export const getPriceFromBinance = async (symbol: string): Promise<number> => {
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
    const data = await response.json();
    if(data?.code) return 0;
    return parseFloat(data.price);
}