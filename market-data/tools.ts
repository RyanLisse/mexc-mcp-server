import { z } from 'zod';
import { config } from '../shared/config.js';
import { type MCPTool, MEXCSymbolSchema, type MarketDataResponse } from '../shared/types/index.js';
import { createSuccessResponse, validateOrThrow } from '../shared/utils/index.js';
import { mexcClient } from './mexc-client.js';

// Input schemas for MCP tools
export const GetTickerInputSchema = z.object({
  symbol: MEXCSymbolSchema,
  convert: z.string().optional(),
});

export const GetOrderBookInputSchema = z.object({
  symbol: MEXCSymbolSchema,
  limit: z.number().min(5).max(1000).optional().default(100),
});

export const Get24hStatsInputSchema = z.object({
  symbol: MEXCSymbolSchema.optional(),
});

// Output schemas - Updated to handle MEXC API null values
export const TickerDataSchema = z
  .object({
    symbol: z.string(),
    price: z.string(),
    priceChange: z.string(),
    priceChangePercent: z.string(),
    volume: z.string(),
    quoteVolume: z.string(),
    open: z.string(),
    high: z.string(),
    low: z.string(),
    count: z.number().nullable(),
    timestamp: z.number(),
  })
  .transform((data) => ({
    symbol: data.symbol,
    price: data.price,
    priceChange: data.priceChange,
    priceChangePercent: data.priceChangePercent,
    volume: data.volume,
    quoteVolume: data.quoteVolume,
    open: data.open,
    high: data.high,
    low: data.low,
    count: data.count ?? 0, // Transform null to 0
    timestamp: data.timestamp,
  }));

export const OrderBookDataSchema = z.object({
  symbol: z.string(),
  bids: z.array(z.tuple([z.string(), z.string()])), // [price, quantity]
  asks: z.array(z.tuple([z.string(), z.string()])), // [price, quantity]
  timestamp: z.number(),
});

export const Stats24hDataSchema = z
  .object({
    symbol: z.string(),
    volume: z.string(),
    volumeQuote: z.string(),
    priceChange: z.string(),
    priceChangePercent: z.string(),
    high: z.string(),
    low: z.string(),
    trades: z.number().nullable(),
    timestamp: z.number(),
  })
  .transform((data) => ({
    symbol: data.symbol,
    volume: data.volume,
    volumeQuote: data.volumeQuote,
    priceChange: data.priceChange,
    priceChangePercent: data.priceChangePercent,
    high: data.high,
    low: data.low,
    trades: data.trades ?? 0, // Transform null to 0
    timestamp: data.timestamp,
  }));

export type TickerData = z.infer<typeof TickerDataSchema>;
export type OrderBookData = z.infer<typeof OrderBookDataSchema>;
export type Stats24hData = z.infer<typeof Stats24hDataSchema>;

// Cache implementation with proper typing
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MarketDataCache {
  public readonly cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.getDefaultTTL(key);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private getDefaultTTL(key: string): number {
    if (key.startsWith('ticker:')) return config.cache.ttlTicker;
    if (key.startsWith('orderbook:')) return config.cache.ttlOrderbook;
    if (key.startsWith('24hstats:')) return config.cache.ttlStats;
    return 5000; // Default 5 seconds
  }
}

// Global cache instance
const marketDataCache = new MarketDataCache();

// MCP Tool definitions
export const getTickerTool: MCPTool = {
  name: 'mexc_get_ticker',
  description: 'Get current ticker price and 24h statistics for a trading symbol',
  inputSchema: GetTickerInputSchema.describe('Get ticker data for a specific symbol').shape,
};

export const getOrderBookTool: MCPTool = {
  name: 'mexc_get_order_book',
  description: 'Get current order book (bids and asks) for a trading symbol',
  inputSchema: GetOrderBookInputSchema.describe('Get order book depth for a specific symbol').shape,
};

export const get24hStatsTool: MCPTool = {
  name: 'mexc_get_24h_stats',
  description: 'Get 24-hour trading statistics for one or all symbols',
  inputSchema: Get24hStatsInputSchema.describe('Get 24h statistics for symbol(s)').shape,
};

export const testConnectivityTool: MCPTool = {
  name: 'mexc_test_connectivity',
  description: 'Test connectivity to MEXC API and check server time synchronization',
  inputSchema: z.object({}).shape,
};

export const testAuthenticationTool: MCPTool = {
  name: 'mexc_test_authentication',
  description: 'Test MEXC API authentication with provided credentials',
  inputSchema: z.object({}).shape,
};

export const getActiveSymbolsTool: MCPTool = {
  name: 'mexc_get_active_symbols',
  description: 'Get all active trading symbols on MEXC exchange',
  inputSchema: z.object({
    limit: z.number().min(1).max(100).optional().default(50),
  }).shape,
};

// Tool execution functions
export async function executeGetTicker(input: unknown): Promise<MarketDataResponse<TickerData>> {
  const validInput = validateOrThrow(GetTickerInputSchema, input);
  const cacheKey = `ticker:${validInput.symbol}`;

  // Check cache first
  const cached = marketDataCache.get<TickerData>(cacheKey);
  if (cached) {
    return createSuccessResponse(cached, true);
  }

  try {
    // Fetch fresh data from MEXC API
    const data = await mexcClient.getTicker(validInput.symbol);

    // Cache the result
    marketDataCache.set(cacheKey, data);

    return createSuccessResponse(data, false);
  } catch (error) {
    throw new Error(
      `Failed to fetch ticker data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function executeGetOrderBook(
  input: unknown
): Promise<MarketDataResponse<OrderBookData>> {
  const validInput = validateOrThrow(GetOrderBookInputSchema, input);
  const limit = validInput.limit ?? 100;
  const cacheKey = `orderbook:${validInput.symbol}:${limit}`;

  // Check cache first
  const cached = marketDataCache.get<OrderBookData>(cacheKey);
  if (cached) {
    return createSuccessResponse(cached, true);
  }

  try {
    // Fetch fresh data from MEXC API
    const data = await mexcClient.getOrderBook(validInput.symbol, limit);

    // Validate response
    const validatedData = validateOrThrow(OrderBookDataSchema, data);

    // Cache the result
    marketDataCache.set(cacheKey, validatedData);

    return createSuccessResponse(validatedData, false);
  } catch (error) {
    throw new Error(
      `Failed to fetch order book data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function executeGet24hStats(
  input: unknown
): Promise<MarketDataResponse<Stats24hData[]>> {
  const validInput = validateOrThrow(Get24hStatsInputSchema, input);
  const cacheKey = `24hstats:${validInput.symbol ?? 'all'}`;

  // Check cache first
  const cached = marketDataCache.get<Stats24hData[]>(cacheKey);
  if (cached) {
    return createSuccessResponse(cached, true);
  }

  try {
    // Fetch fresh data from MEXC API
    const data = await mexcClient.get24hStats(validInput.symbol);

    // Cache the result
    marketDataCache.set(cacheKey, data);

    return createSuccessResponse(data, false);
  } catch (error) {
    throw new Error(
      `Failed to fetch 24h stats: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function executeTestConnectivity(
  _input: unknown
): Promise<MarketDataResponse<{ success: boolean; message: string }>> {
  try {
    const result = await mexcClient.testConnectivity();
    return createSuccessResponse(result, false);
  } catch (error) {
    throw new Error(
      `Connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function executeTestAuthentication(
  _input: unknown
): Promise<MarketDataResponse<{ success: boolean; message: string }>> {
  try {
    const result = await mexcClient.testAuthentication();
    return createSuccessResponse(result, false);
  } catch (error) {
    throw new Error(
      `Authentication test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function executeGetActiveSymbols(
  input: unknown
): Promise<MarketDataResponse<string[]>> {
  const validInput = validateOrThrow(z.object({ limit: z.number().optional().default(50) }), input);
  const cacheKey = `active_symbols:${validInput.limit}`;

  // Check cache first
  const cached = marketDataCache.get<string[]>(cacheKey);
  if (cached) {
    return createSuccessResponse(cached, true);
  }

  try {
    const symbols = await mexcClient.getActiveSymbols();
    const limitedSymbols = symbols.slice(0, validInput.limit);

    // Cache for longer since symbols don't change frequently
    marketDataCache.set(cacheKey, limitedSymbols, 300000); // 5 minutes

    return createSuccessResponse(limitedSymbols, false);
  } catch (error) {
    throw new Error(
      `Failed to fetch active symbols: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Utility functions
export function clearMarketDataCache(): void {
  marketDataCache.clear();
}

export function getMarketDataCacheSize(): number {
  return marketDataCache.size();
}

export function getCacheStats(): { size: number; keys: string[] } {
  const keys: string[] = [];
  for (const key of marketDataCache.cache.keys()) {
    keys.push(key);
  }
  return {
    size: marketDataCache.size(),
    keys,
  };
}

// Export the tools array for easy registration
export const marketDataTools: MCPTool[] = [
  getTickerTool,
  getOrderBookTool,
  get24hStatsTool,
  testConnectivityTool,
  testAuthenticationTool,
  getActiveSymbolsTool,
];

// Health check function
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  checks: Record<string, { status: 'pass' | 'fail'; message: string }>;
}> {
  const checks: Record<string, { status: 'pass' | 'fail'; message: string }> = {};

  // Test connectivity
  try {
    const connectivityResult = await mexcClient.testConnectivity();
    checks.connectivity = {
      status: connectivityResult.success ? 'pass' : 'fail',
      message: connectivityResult.message,
    };
  } catch (error) {
    checks.connectivity = {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Test cache
  try {
    const cacheSize = marketDataCache.size();
    checks.cache = {
      status: 'pass',
      message: `Cache operational with ${cacheSize} entries`,
    };
  } catch (error) {
    checks.cache = {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Cache error',
    };
  }

  // Test sample API call
  try {
    await mexcClient.getTicker('BTCUSDT');
    checks.api_call = {
      status: 'pass',
      message: 'Sample API call successful',
    };
  } catch (error) {
    checks.api_call = {
      status: 'fail',
      message: error instanceof Error ? error.message : 'API call failed',
    };
  }

  // Determine overall status
  const allPassed = Object.values(checks).every((check) => check.status === 'pass');

  return {
    status: allPassed ? 'healthy' : 'unhealthy',
    checks,
  };
}
