// Live exchange-rate helper. Converts any supported currency to LKR using
// open.er-api.com (free, no API key). Results are cached in memory and fall
// back to a fixed rate if the network is unavailable, so saving a record never
// fails because of FX.

const API_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const FALLBACK_USD_LKR = 300; // used only if the API is unreachable

type RateCache = { rates: Record<string, number>; fetchedAt: number };
let cache: RateCache | null = null;
let inflight: Promise<Record<string, number>> | null = null;

async function fetchRates(): Promise<Record<string, number>> {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`FX API ${res.status}`);
  const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
  if (data.result !== 'success' || !data.rates || typeof data.rates.LKR !== 'number') {
    throw new Error('FX API returned no usable rates');
  }
  return data.rates;
}

async function getUsdRates(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.rates;
  if (inflight) return inflight;
  inflight = fetchRates()
    .then((rates) => {
      cache = { rates, fetchedAt: Date.now() };
      return rates;
    })
    .catch((err) => {
      console.error('[fx] live rate fetch failed, using fallback:', String(err));
      // Keep a stale cache if we have one, otherwise synthesize a fallback.
      if (cache) return cache.rates;
      return { USD: 1, LKR: FALLBACK_USD_LKR };
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Multiplier that converts `amount` in `currency` into LKR.
 * LKR -> 1. USD -> live USD/LKR rate. Any other code uses the cross rate.
 */
export async function getRateToLkr(currency: string): Promise<number> {
  const code = (currency || 'LKR').toUpperCase();
  if (code === 'LKR') return 1;
  const rates = await getUsdRates();
  const lkrPerUsd = rates.LKR ?? FALLBACK_USD_LKR;
  const target = rates[code];
  if (!target || target <= 0) return code === 'USD' ? lkrPerUsd : 1;
  // rates are "units of X per 1 USD"; (LKR per USD) / (X per USD) = LKR per X.
  return lkrPerUsd / target;
}

export function toLkr(amount: number, fxRate: number): number {
  return amount * (fxRate || 1);
}
