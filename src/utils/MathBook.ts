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
 * Mendapatkan distribusi modal secara merata dalam range tick dengan opsi batas jumlah tick.
 * @param totalCapital Modal total yang ingin didistribusikan.
 * @param tickLower Batas bawah tick.
 * @param tickUpper Batas atas tick.
 * @param maxTicks Jumlah maksimal tick untuk distribusi (0 untuk tanpa batas).
 * @returns Distribusi modal untuk tick yang dipilih.
 */
export function distributeCapitalWithLimit(
  totalCapital: bigint,
  tickLower: number,
  tickUpper: number,
  maxTicks: number
): { tick: number; size: BigInt }[] {
  const tickRange = tickUpper - tickLower;

  if (tickRange <= 0) {
    throw new Error('Tick range must be positive.');
  }

  let selectedTicks: number[];

  if (maxTicks > 0) {
    // Hitung langkah untuk mendistribusikan hanya `maxTicks`
    const step = Math.ceil(tickRange / maxTicks);
    selectedTicks = [];

    for (let tick = tickLower; tick < tickUpper; tick += step) {
      if (selectedTicks.length >= maxTicks) break;
      selectedTicks.push(tick);
    }
  } else {
    // Tanpa batas jumlah tick, distribusikan ke semua tick
    selectedTicks = Array.from({ length: tickRange }, (_, i) => tickLower + i);
  }

  // Pastikan selectedTicks.length > 0 untuk menghindari pembagian oleh nol
  if (selectedTicks.length === 0) {
    throw new Error('No ticks selected for distribution.');
  }

  // Modal per tick berdasarkan jumlah tick yang dipilih
  const capitalPerTick = totalCapital / BigInt(selectedTicks.length);

  // Distribusi modal
  const distribution = selectedTicks.map((tick) => ({
    tick,
    realPrice: getPriceFromTick(tick),
    size: capitalPerTick
  }));

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
