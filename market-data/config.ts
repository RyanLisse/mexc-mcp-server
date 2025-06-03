/**
 * Market Data Service Configuration
 * Loads MEXC credentials using Encore secrets within service context
 */

import { secret } from 'encore.dev/config';

// Define secrets at module level within service
const mexcApiKey = secret('MEXC_API_KEY');
const mexcSecretKey = secret('MEXC_SECRET_KEY');

interface MarketDataConfig {
  mexc: {
    apiKey: string;
    secretKey: string;
    baseUrl: string;
  };
  cache: {
    ttlTicker: number;
    ttlOrderbook: number;
    ttlStats: number;
  };
}

let serviceConfig: MarketDataConfig | null = null;

export function getMarketDataConfig(): MarketDataConfig {
  if (serviceConfig) {
    return serviceConfig;
  }

  try {
    // Try to load Encore secrets
    const apiKey = mexcApiKey();
    const secretKey = mexcSecretKey();
    
    serviceConfig = {
      mexc: {
        apiKey,
        secretKey,
        baseUrl: process.env.MEXC_BASE_URL || 'https://api.mexc.com',
      },
      cache: {
        ttlTicker: Number(process.env.CACHE_TTL_TICKER) || 5000,
        ttlOrderbook: Number(process.env.CACHE_TTL_ORDERBOOK) || 2000,
        ttlStats: Number(process.env.CACHE_TTL_STATS) || 10000,
      },
    };
  } catch (error) {
    // Fallback to environment variables
    const apiKey = process.env.MEXC_API_KEY;
    const secretKey = process.env.MEXC_SECRET_KEY;
    
    if (!apiKey || !secretKey) {
      throw new Error('MEXC API credentials not found in secrets or environment variables');
    }

    serviceConfig = {
      mexc: {
        apiKey,
        secretKey,
        baseUrl: process.env.MEXC_BASE_URL || 'https://api.mexc.com',
      },
      cache: {
        ttlTicker: Number(process.env.CACHE_TTL_TICKER) || 5000,
        ttlOrderbook: Number(process.env.CACHE_TTL_ORDERBOOK) || 2000,
        ttlStats: Number(process.env.CACHE_TTL_STATS) || 10000,
      },
    };
  }

  return serviceConfig;
}

// Export a cached config instance
export const marketDataConfig = getMarketDataConfig();