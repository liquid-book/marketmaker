/**
 * Menghitung tick dari harga.
 * @param price Harga token (Token1/Token0).
 * @returns Tick yang sesuai dengan harga.
 */
export function getTickFromPrice(price: number): number {
  const LN_SQRT_1_0001 = Math.log(Math.sqrt(1.0001)) // ln(sqrt(1.0001))
  return Math.floor(Math.log(price) / LN_SQRT_1_0001)
}

/**
 * Menghitung tickSpacing berdasarkan persentase harga.
 * @param price Harga acuan (Token1/Token0).
 * @param percentage Persentase untuk menentukan tickSpacing (misal 0.1% -> 0.001).
 * @returns Tick spacing dalam satuan tick.
 */
export function calculateTickSpacingFromPercentage(price: number, percentage: number): number {
  const priceDelta = price * percentage // Perubahan harga berdasarkan persentase
  const tickDelta = getTickFromPrice(price + priceDelta) - getTickFromPrice(price)
  return Math.max(tickDelta, 1) // Pastikan tickSpacing minimal 1
}

/**
 * Menyesuaikan tick ke tick valid berdasarkan tickSpacing.
 * @param tick Tick awal.
 * @param tickSpacing Tick spacing.
 * @returns Tick yang valid sesuai tickSpacing.
 */
export function getValidTick(tick: number, tickSpacing: number): number {
  return Math.floor(tick / tickSpacing) * tickSpacing
}

/**
 * Mendapatkan range tick valid berdasarkan harga minimum dan maksimum.
 * @param priceLower Harga minimum (Token1/Token0).
 * @param priceUpper Harga maksimum (Token1/Token0).
 * @param tickSpacing Tick spacing.
 * @returns Batas bawah dan atas tick.
 */
export function getTickRange(
  priceLower: number,
  priceUpper: number,
  tickSpacing: number
): { tickLower: number; tickUpper: number } {
  const tickLower = getValidTick(getTickFromPrice(priceLower), tickSpacing)
  const tickUpper = getValidTick(getTickFromPrice(priceUpper), tickSpacing)
  return { tickLower, tickUpper }
}
/**
 * Membagi modal dalam rentang tick dengan berbagai mode distribusi.
 * @param totalCapital Modal total yang ingin didistribusikan.
 * @param basePrice Harga dasar.
 * @param percentageUpper Persentase rentang harga atas (misal 5% -> 0.05).
 * @param tickSpacing Jarak antar tick valid.
 * @param mode Mode distribusi: "balanced", "small2high", "high2small".
 * @returns Distribusi modal untuk setiap tick valid.
 */
export function distributeCapitalWithModes(
  totalCapital: bigint,
  priceLower: number,
  priceUpper: number,
  tickSpacing: number,
  mode: `BALANCED` | `SMALL2HIGH` | `HIGH2SMALL`
): { tick: number; price: number; size: bigint }[] {

  const tickLower = getValidTick(getTickFromPrice(priceLower), tickSpacing);
  const tickUpper = getValidTick(getTickFromPrice(priceUpper), tickSpacing);

  const tickRange: number[] = [];
  for (let tick = tickLower; tick <= tickUpper; tick += tickSpacing) {
    tickRange.push(tick);
  }

  // Validasi jika hanya ada 1 tick dalam range
  if (tickRange.length <= 1) {
    throw new Error("Rentang tick terlalu kecil untuk tick_spacing yang diberikan.");
  }

  const distribution: { tick: number; price: number; size: bigint }[] = [];

  // Distribusi modal berdasarkan mode
  switch (mode) {
    case "BALANCED": {
      const capitalPerTick = totalCapital / BigInt(tickRange.length);
      for (const tick of tickRange) {
        distribution.push({
          tick,
          price: getPriceFromTick(tick),
          size: capitalPerTick,
        });
      }
      break;
    }

    case "SMALL2HIGH": {
      const totalWeight = BigInt((tickRange.length * (tickRange.length + 1)) / 2);
      let currentWeight = 1n;
      for (const tick of tickRange) {
        const size = (totalCapital * currentWeight) / totalWeight;
        distribution.push({
          tick,
          price: getPriceFromTick(tick),
          size,
        });
        currentWeight++;
      }
      break;
    }

    case "HIGH2SMALL": {
      const totalWeight = BigInt((tickRange.length * (tickRange.length + 1)) / 2);
      let currentWeight = BigInt(tickRange.length);
      for (const tick of tickRange) {
        const size = (totalCapital * currentWeight) / totalWeight;
        distribution.push({
          tick,
          price: getPriceFromTick(tick),
          size,
        });
        currentWeight--;
      }
      break;
    }

    default:
      throw new Error("Invalid mode. Use 'balanced', 'small2high', or 'high2small'.");
  }

  return distribution;
}


/**
 * Menghitung harga dari tick.
 * @param tick Tick yang ingin dikonversi.
 * @returns Harga dalam format Token1/Token0.
 */
export function getPriceFromTick(tick: number): number {
  const SQRT_1_0001 = Math.sqrt(1.0001) // sqrt(1.0001)
  return Math.pow(SQRT_1_0001, tick)
}
