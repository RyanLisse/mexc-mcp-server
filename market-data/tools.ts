import { marketDataConfig } from './config.js';
import {
  type Get24hStatsArgs,
  type GetActiveSymbolsArgs,
  type GetOrderBookArgs,
  type GetTickerArgs,
  type MCPTool,
  type MarketDataResponse,
} from '../shared/types/index.js';
import { createSuccessResponse } from '../shared/utils/index.js';
import { mexcClient } from './mexc-client.js';

// Input interfaces for API endpoints
export interface GetTickerInputSchema {
  symbol: string;
  convert?: string;
}

export interface GetOrderBookInputSchema {
  symbol: string;
  limit?: number;
}

export interface Get24hStatsInputSchema {
  symbol?: string;
}

// Output data types
export interface TickerData {
  symbol: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  open: string;
  high: string;
  low: string;
  count: number;
  timestamp: number;
}

export interface OrderBookData {
  symbol: string;
  bids: Array<{ price: string; quantity: string }>;
  asks: Array<{ price: string; quantity: string }>;
  timestamp: number;
}

export interface Stats24hData {
  symbol: string;
  volume: string;
  volumeQuote: string;
  priceChange: string;
  priceChangePercent: string;
  high: string;
  low: string;
  trades: number;
  timestamp: number;
}

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
    if (key.startsWith('ticker:')) return marketDataConfig.cache.ttlTicker;
    if (key.startsWith('orderbook:')) return marketDataConfig.cache.ttlOrderbook;
    if (key.startsWith('24hstats:')) return marketDataConfig.cache.ttlStats;
    return 5000; // Default 5 seconds
  }
}

// Global cache instance
const marketDataCache = new MarketDataCache();

// Data transformation helpers
function transformTickerData(rawData: any): TickerData {
  return {
    symbol: rawData.symbol,
    price: rawData.price,
    priceChange: rawData.priceChange,
    priceChangePercent: rawData.priceChangePercent,
    volume: rawData.volume,
    quoteVolume: rawData.quoteVolume,
    open: rawData.open,
    high: rawData.high,
    low: rawData.low,
    count: rawData.count ?? 0, // Transform null to 0
    timestamp: rawData.timestamp,
  };
}

function transformStats24hData(rawData: any): Stats24hData {
  return {
    symbol: rawData.symbol,
    volume: rawData.volume,
    volumeQuote: rawData.volumeQuote,
    priceChange: rawData.priceChange,
    priceChangePercent: rawData.priceChangePercent,
    high: rawData.high,
    low: rawData.low,
    trades: rawData.trades ?? 0, // Transform null to 0
    timestamp: rawData.timestamp,
  };
}

// MCP Tool definitions
export const getTickerTool: MCPTool = {
  name: 'mexc_get_ticker',
  description: 'Get current ticker price and 24h statistics for a trading symbol',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        pattern: '^[A-Z0-9]+$',
        description: 'Trading symbol (e.g., BTCUSDT)',
      },
      convert: {
        type: 'string',
        description: 'Optional currency to convert to',
      },
    },
    required: ['symbol'],
  },
};

export const getOrderBookTool: MCPTool = {
  name: 'mexc_get_order_book',
  description: 'Get current order book (bids and asks) for a trading symbol',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        pattern: '^[A-Z0-9]+$',
        description: 'Trading symbol (e.g., BTCUSDT)',
      },
      limit: {
        type: 'number',
        minimum: 5,
        maximum: 1000,
        default: 100,
        description: 'Number of orders to return',
      },
    },
    required: ['symbol'],
  },
};

export const get24hStatsTool: MCPTool = {
  name: 'mexc_get_24h_stats',
  description: 'Get 24-hour trading statistics for one or all symbols',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        pattern: '^[A-Z0-9]+$',
        description: 'Trading symbol (optional)',
      },
    },
    required: [],
  },
};

export const testConnectivityTool: MCPTool = {
  name: 'mexc_test_connectivity',
  description: 'Test connectivity to MEXC API and check server time synchronization',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const testAuthenticationTool: MCPTool = {
  name: 'mexc_test_authentication',
  description: 'Test MEXC API authentication with provided credentials',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const getActiveSymbolsTool: MCPTool = {
  name: 'mexc_get_active_symbols',
  description: 'Get all active trading symbols on MEXC exchange',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 50,
        description: 'Maximum number of symbols to return',
      },
    },
    required: [],
  },
};

// Main execution functions
export async function executeGetTicker(
  args: GetTickerInputSchema
): Promise<MarketDataResponse<TickerData>> {
  try {
    const cacheKey = `ticker:${args.symbol}${args.convert ? `:${args.convert}` : ''}`;
    const cached = marketDataCache.get<TickerData>(cacheKey);

    if (cached) {
      return createSuccessResponse(cached, 'Ticker data retrieved from cache');
    }

    const tickerData = await mexcClient.getTicker(args.symbol);
    const transformedData = transformTickerData({
      ...tickerData,
      timestamp: Date.now(),
    });

    marketDataCache.set(cacheKey, transformedData);

    return createSuccessResponse(transformedData, 'Ticker data retrieved successfully');
  } catch (error) {
    console.error('Get ticker error:', error);
    // Return error in the expected MarketDataResponse format
    return {
      data: null as any,
      timestamp: Date.now(),
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function executeGetOrderBook(
  args: GetOrderBookInputSchema
): Promise<MarketDataResponse<OrderBookData>> {
  try {
    const limit = args.limit ?? 100;
    const cacheKey = `orderbook:${args.symbol}:${limit}`;
    const cached = marketDataCache.get<OrderBookData>(cacheKey);

    if (cached) {
      return createSuccessResponse(cached, 'Order book data retrieved from cache');
    }

    const orderBookData = await mexcClient.getOrderBook(args.symbol, limit);
    const transformedData: OrderBookData = {
      symbol: args.symbol,
      bids: (orderBookData.bids || []).map(([price, quantity]) => ({ price, quantity })),
      asks: (orderBookData.asks || []).map(([price, quantity]) => ({ price, quantity })),
      timestamp: Date.now(),
    };

    marketDataCache.set(cacheKey, transformedData);

    return createSuccessResponse(transformedData, 'Order book data retrieved successfully');
  } catch (error) {
    console.error('Get order book error:', error);
    return {
      data: null as any,
      timestamp: Date.now(),
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function executeGet24hStats(
  args: Get24hStatsInputSchema
): Promise<MarketDataResponse<Stats24hData[]>> {
  try {
    const cacheKey = `24hstats:${args.symbol || 'all'}`;
    const cached = marketDataCache.get<Stats24hData[]>(cacheKey);

    if (cached) {
      return createSuccessResponse(cached, '24h statistics retrieved from cache');
    }

    const statsData = await mexcClient.get24hStats(args.symbol);
    const transformedData = Array.isArray(statsData)
      ? statsData.map(stat => transformStats24hData({
          ...stat,
          timestamp: Date.now(),
        }))
      : [transformStats24hData({
          ...statsData,
          timestamp: Date.now(),
        })];

    marketDataCache.set(cacheKey, transformedData);

    return createSuccessResponse(transformedData, '24h statistics retrieved successfully');
  } catch (error) {
    console.error('Get 24h stats error:', error);
    return {
      data: null as any,
      timestamp: Date.now(),
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function executeTestConnectivity(
  args: Record<string, unknown>
): Promise<MarketDataResponse<{ success: boolean; message: string }>> {
  try {
    await mexcClient.ping();
    const serverTime = await mexcClient.getServerTime();
    
    return createSuccessResponse(
      { success: true, message: `Connected successfully. Server time: ${new Date(serverTime).toISOString()}` },
      'Connectivity test passed'
    );
  } catch (error) {
    console.error('Connectivity test error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connectivity test failed',
      timestamp: Date.now(),
    };
  }
}

export async function executeTestAuthentication(
  args: Record<string, unknown>
): Promise<MarketDataResponse<{ success: boolean; message: string }>> {
  try {
    // Test authentication by making a request that requires auth
    const accountInfo = await mexcClient.getAccountInfo();
    
    return createSuccessResponse(
      { success: true, message: 'Authentication successful' },
      'Authentication test passed'
    );
  } catch (error) {
    console.error('Authentication test error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication test failed',
      timestamp: Date.now(),
    };
  }
}

export async function executeGetActiveSymbols(
  args: { limit?: number }
): Promise<MarketDataResponse<string[]>> {
  try {
    const limit = args.limit ?? 50;
    const cacheKey = `symbols:active:${limit}`;
    const cached = marketDataCache.get<string[]>(cacheKey);

    if (cached) {
      return createSuccessResponse(cached, 'Active symbols retrieved from cache');
    }

    const exchangeInfo = await mexcClient.getExchangeInfo();
    const activeSymbols = exchangeInfo.symbols
      ?.filter(symbol => symbol.status === 'TRADING')
      ?.map(symbol => symbol.symbol)
      ?.slice(0, limit) || [];

    marketDataCache.set(cacheKey, activeSymbols, 60000); // Cache for 1 minute

    return createSuccessResponse(activeSymbols, 'Active symbols retrieved successfully');
  } catch (error) {
    console.error('Get active symbols error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: Date.now(),
    };
  }
}

// Health check function
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  checks: Record<string, { status: 'pass' | 'fail'; message: string }>;
}> {
  const checks: Record<string, { status: 'pass' | 'fail'; message: string }> = {};

  // Test API connectivity
  try {
    await mexcClient.ping();
    checks.connectivity = { status: 'pass', message: 'API connectivity OK' };
  } catch (error) {
    checks.connectivity = { 
      status: 'fail', 
      message: `API connectivity failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }

  // Test cache functionality
  try {
    marketDataCache.set('health-check', 'test', 1000);
    const cached = marketDataCache.get('health-check');
    if (cached === 'test') {
      checks.cache = { status: 'pass', message: 'Cache functionality OK' };
    } else {
      checks.cache = { status: 'fail', message: 'Cache read/write failed' };
    }
  } catch (error) {
    checks.cache = { 
      status: 'fail', 
      message: `Cache error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }

  // Test configuration
  try {
    if (marketDataConfig.mexc.baseUrl && marketDataConfig.mexc.apiKey && marketDataConfig.mexc.secretKey) {
      checks.configuration = { status: 'pass', message: 'Configuration loaded' };
    } else {
      checks.configuration = { status: 'fail', message: 'Missing configuration values' };
    }
  } catch (error) {
    checks.configuration = { 
      status: 'fail', 
      message: `Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }

  const allHealthy = Object.values(checks).every(check => check.status === 'pass');

  return {
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks,
  };
}

// Export all tools
export const marketDataTools: MCPTool[] = [
  getTickerTool,
  getOrderBookTool,
  get24hStatsTool,
  testConnectivityTool,
  testAuthenticationTool,
  getActiveSymbolsTool,
];