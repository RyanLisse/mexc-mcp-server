/**
 * Enhanced Market Data API with Rate Limiting and Authentication
 * Task #6: Develop Market Data API with full integration
 */

import type {
  MarketDataResponse,
  OrderBookData,
  Stats24hData,
  TickerData,
} from '../shared/types/index.js';
import {
  type Get24hStatsInputSchema,
  type GetOrderBookInputSchema,
  type GetTickerInputSchema,
  executeGet24hStats,
  executeGetActiveSymbols,
  executeGetOrderBook,
  executeGetTicker,
  executeTestAuthentication,
  executeTestConnectivity,
  healthCheck,
} from './tools.js';

import { api } from 'encore.dev/api';
import { auth } from '../auth/api.js';

// Enhanced ticker endpoint with auth and rate limiting
export const getTickerEnhanced = api(
  {
    expose: true,
    method: 'POST',
    path: '/market-data/v2/ticker',
    auth: true,
  },
  async (req: { symbol: string; convert?: string }): Promise<MarketDataResponse<TickerData>> => {
    return await executeGetTicker(req);
  }
);

// Enhanced order book endpoint with auth and rate limiting
export const getOrderBookEnhanced = api(
  {
    expose: true,
    method: 'POST',
    path: '/market-data/v2/order-book',
    auth: true,
  },
  async (req: { symbol: string; limit?: number }): Promise<MarketDataResponse<OrderBookData>> => {
    return await executeGetOrderBook(req);
  }
);

// Enhanced 24h stats endpoint with auth and rate limiting
export const get24hStatsEnhanced = api(
  {
    expose: true,
    method: 'POST',
    path: '/market-data/v2/24h-stats',
    auth: true,
  },
  async (req: { symbol?: string }): Promise<MarketDataResponse<Stats24hData[]>> => {
    return await executeGet24hStats(req);
  }
);

// Public ticker endpoint (no auth required, but rate limited)
export const getTickerPublic = api(
  { expose: true, method: 'GET', path: '/market-data/public/ticker/:symbol' },
  async (req: { symbol: string }): Promise<MarketDataResponse<TickerData>> => {
    return await executeGetTicker({ symbol: req.symbol });
  }
);

// Bulk ticker endpoint for multiple symbols
export const getBulkTickers = api(
  {
    expose: true,
    method: 'POST',
    path: '/market-data/v2/tickers/bulk',
    auth: true,
  },
  async (req: { symbols: string[]; convert?: string }): Promise<
    MarketDataResponse<TickerData[]>
  > => {
    if (!req.symbols || req.symbols.length === 0) {
      throw new Error('At least one symbol is required');
    }

    if (req.symbols.length > 100) {
      throw new Error('Maximum 100 symbols allowed per request');
    }

    // Execute requests concurrently for better performance
    const tickerPromises = req.symbols.map((symbol) =>
      executeGetTicker({ symbol, convert: req.convert })
    );

    const results = await Promise.allSettled(tickerPromises);
    const tickers: TickerData[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        tickers.push(result.value.data!);
      } else {
        errors.push(
          `Symbol ${req.symbols[index]}: ${result.status === 'rejected' ? result.reason : result.value.error}`
        );
      }
    });

    return {
      success: true,
      data: tickers,
      cached: false,
      timestamp: Date.now(),
      errors: errors.length > 0 ? errors : undefined,
    };
  }
);

// Historical data endpoint - NEW
export const getHistoricalData = api(
  {
    expose: true,
    method: 'POST',
    path: '/market-data/v2/historical',
    auth: true,
  },
  async (req: {
    symbol: string;
    interval: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';
    limit?: number;
    startTime?: number;
    endTime?: number;
  }): Promise<
    MarketDataResponse<{
      symbol: string;
      interval: string;
      data: Array<{
        openTime: number;
        open: string;
        high: string;
        low: string;
        close: string;
        volume: string;
        closeTime: number;
        quoteAssetVolume: string;
        count: number;
      }>;
    }>
  > => {
    const { executeGetHistoricalData } = await import('./tools.js');
    return await executeGetHistoricalData(req);
  }
);

// Market depth analysis endpoint - NEW
export const getMarketDepth = api(
  {
    expose: true,
    method: 'POST',
    path: '/market-data/v2/market-depth',
    auth: true,
  },
  async (req: { symbol: string; limit?: number }): Promise<
    MarketDataResponse<{
      symbol: string;
      bids: Array<[string, string]>;
      asks: Array<[string, string]>;
      lastUpdateId: number;
      analysis: {
        bidTotal: string;
        askTotal: string;
        spread: string;
        spreadPercent: string;
        imbalance: number;
      };
    }>
  > => {
    const { executeGetMarketDepth } = await import('./tools.js');
    return await executeGetMarketDepth(req);
  }
);

// Price aggregation endpoint for portfolio analysis - NEW
export const getPriceAggregation = api(
  {
    expose: true,
    method: 'POST',
    path: '/market-data/v2/price-aggregation',
    auth: true,
  },
  async (req: {
    symbols: string[];
    timeframes: string[];
    metrics: ('price' | 'volume' | 'volatility' | 'correlation')[];
  }): Promise<
    MarketDataResponse<{
      symbols: string[];
      timeframes: string[];
      aggregatedData: Record<
        string,
        {
          price?: number;
          volume24h?: number;
          volatility?: number;
          correlations?: Record<string, number>;
        }
      >;
      generatedAt: number;
    }>
  > => {
    const { executeGetPriceAggregation } = await import('./tools.js');
    return await executeGetPriceAggregation(req);
  }
);

// Real-time subscription management endpoint - NEW
export const manageSubscription = api(
  {
    expose: true,
    method: 'POST',
    path: '/market-data/v2/subscription',
    auth: true,
  },
  async (req: {
    action: 'subscribe' | 'unsubscribe' | 'list';
    symbol?: string;
    type?: 'ticker' | 'orderbook' | 'trades';
    interval?: string;
  }): Promise<
    MarketDataResponse<{
      action: string;
      subscriptions: Array<{
        symbol: string;
        type: string;
        interval?: string;
        subscribed: boolean;
      }>;
    }>
  > => {
    const { executeManageSubscription } = await import('./tools.js');
    return await executeManageSubscription(req);
  }
);

// Performance metrics endpoint for monitoring
export const getPerformanceMetrics = api(
  {
    expose: true,
    method: 'GET',
    path: '/market-data/v2/metrics',
    auth: true,
  },
  async (): Promise<
    MarketDataResponse<{
      cacheStats: {
        hits: number;
        misses: number;
        hitRate: number;
        totalRequests: number;
      };
      responseTimeStats: {
        average: number;
        p95: number;
        p99: number;
      };
      apiCallStats: {
        mexcCalls: number;
        errorRate: number;
        rateLimitHits: number;
      };
      systemStats: {
        uptime: number;
        memoryUsage: number;
        activeConnections: number;
      };
    }>
  > => {
    const { getPerformanceMetrics } = await import('./tools.js');
    return await getPerformanceMetrics();
  }
);

// Enhanced health check with detailed component status
export const healthCheckEnhanced = api(
  { expose: true, method: 'GET', path: '/market-data/v2/health' },
  async (): Promise<
    MarketDataResponse<{
      status: 'healthy' | 'degraded' | 'unhealthy';
      components: {
        mexcApi: { status: string; responseTime?: number; error?: string };
        cache: { status: string; hitRate?: number; size?: number };
        database: { status: string; connectionTime?: number; error?: string };
        rateLimit: { status: string; remaining?: number; resetTime?: number };
      };
      timestamp: number;
      version: string;
    }>
  > => {
    const { executeEnhancedHealthCheck } = await import('./tools.js');
    return await executeEnhancedHealthCheck();
  }
);

// Market status endpoint
export const getMarketStatus = api(
  {
    expose: true,
    method: 'GET',
    path: '/market-data/v2/market-status',
  },
  async (): Promise<
    MarketDataResponse<{
      status: 'open' | 'closed' | 'pre_open' | 'post_close';
      serverTime: number;
      exchangeInfo: {
        timezone: string;
        serverTime: number;
        rateLimits: Array<{
          rateLimitType: string;
          interval: string;
          intervalNum: number;
          limit: number;
        }>;
      };
      symbols: {
        total: number;
        active: number;
        suspended: number;
      };
    }>
  > => {
    const { executeGetMarketStatus } = await import('./tools.js');
    return await executeGetMarketStatus();
  }
);

// WebSocket connection info endpoint
export const getWebSocketInfo = api(
  {
    expose: true,
    method: 'GET',
    path: '/market-data/v2/websocket-info',
    auth: true,
  },
  async (): Promise<
    MarketDataResponse<{
      baseUrl: string;
      streams: {
        ticker: string;
        orderbook: string;
        trades: string;
        klines: string;
      };
      connectionLimits: {
        maxConnections: number;
        maxStreamsPerConnection: number;
        heartbeatInterval: number;
      };
      authRequired: boolean;
    }>
  > => {
    return {
      success: true,
      data: {
        baseUrl: 'wss://wbs.mexc.com/ws',
        streams: {
          ticker: '<symbol>@ticker',
          orderbook: '<symbol>@depth<levels>',
          trades: '<symbol>@trade',
          klines: '<symbol>@kline_<interval>',
        },
        connectionLimits: {
          maxConnections: 5,
          maxStreamsPerConnection: 30,
          heartbeatInterval: 60000,
        },
        authRequired: false,
      },
      cached: false,
      timestamp: Date.now(),
    };
  }
);
