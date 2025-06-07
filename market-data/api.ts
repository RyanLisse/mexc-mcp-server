import type {
  MarketDataResponse,
  OrderBookData,
  Stats24hData,
  TickerData,
} from '../shared/types/index.js';
import {
  executeGet24hStats,
  executeGetActiveSymbols,
  executeGetOrderBook,
  executeGetTicker,
  executeTestAuthentication,
  executeTestConnectivity,
  healthCheck,
} from './tools.js';

import { api } from 'encore.dev/api';

// Get ticker endpoint
export const getTicker = api(
  { expose: true, method: 'POST', path: '/market-data/ticker' },
  async (req: { symbol: string; convert?: string }): Promise<MarketDataResponse<TickerData>> => {
    return await executeGetTicker(req);
  }
);

// Get order book endpoint
export const getOrderBook = api(
  { expose: true, method: 'POST', path: '/market-data/order-book' },
  async (req: { symbol: string; limit?: number }): Promise<MarketDataResponse<OrderBookData>> => {
    return await executeGetOrderBook(req);
  }
);

// Get 24h stats endpoint
export const get24hStats = api(
  { expose: true, method: 'POST', path: '/market-data/24h-stats' },
  async (req: { symbol?: string }): Promise<MarketDataResponse<Stats24hData[]>> => {
    return await executeGet24hStats(req);
  }
);

// Test connectivity endpoint
export const testConnectivity = api(
  { expose: true, method: 'GET', path: '/market-data/test-connectivity' },
  async (): Promise<MarketDataResponse<{ success: boolean; message: string }>> => {
    return await executeTestConnectivity({});
  }
);

// Test authentication endpoint
export const testAuthentication = api(
  { expose: true, method: 'GET', path: '/market-data/test-auth' },
  async (): Promise<MarketDataResponse<{ success: boolean; message: string }>> => {
    return await executeTestAuthentication({});
  }
);

// Get active symbols endpoint
interface GetActiveSymbolsRequest {
  limit?: number;
}

export const getActiveSymbols = api(
  { expose: true, method: 'POST', path: '/market-data/active-symbols' },
  async (req: GetActiveSymbolsRequest): Promise<MarketDataResponse<string[]>> => {
    return await executeGetActiveSymbols(req);
  }
);

// Health check endpoint for market data service
interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  checks: Record<string, { status: 'pass' | 'fail'; message: string }>;
}

export const marketDataHealth = api(
  { expose: true, method: 'GET', path: '/market-data/health' },
  async (): Promise<HealthCheckResponse> => {
    return await healthCheck();
  }
);

// Debug config endpoint
interface ConfigDebugResponse {
  hasCredentials: boolean;
  baseUrl: string;
  apiKeyLength: number;
  secretKeyLength: number;
}

export const debugConfig = api(
  { expose: true, method: 'GET', path: '/market-data/debug/config' },
  async (): Promise<ConfigDebugResponse> => {
    const { marketDataConfig } = await import('./config.js');
    return {
      hasCredentials: !!(marketDataConfig.mexc.apiKey && marketDataConfig.mexc.secretKey),
      baseUrl: marketDataConfig.mexc.baseUrl,
      apiKeyLength: marketDataConfig.mexc.apiKey?.length || 0,
      secretKeyLength: marketDataConfig.mexc.secretKey?.length || 0,
    };
  }
);

// MCP Tools endpoint - returns available tools in MCP format
interface MCPToolsResponse {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;
}

export const mcpTools = api(
  { expose: true, method: 'GET', path: '/market-data/mcp/tools' },
  async (): Promise<MCPToolsResponse> => {
    return {
      tools: [
        {
          name: 'mexc_get_ticker',
          description: 'Get current ticker price and 24h statistics for a trading symbol',
          inputSchema: {
            symbol: {
              type: 'string',
              pattern: '^[A-Z0-9]+$',
              description: 'Trading symbol (e.g., BTCUSDT)',
            },
            convert: {
              type: 'string',
              description: 'Optional currency to convert to',
              optional: true,
            },
          },
        },
        {
          name: 'mexc_get_order_book',
          description: 'Get current order book (bids and asks) for a trading symbol',
          inputSchema: {
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
        },
        {
          name: 'mexc_get_24h_stats',
          description: 'Get 24-hour trading statistics for one or all symbols',
          inputSchema: {
            symbol: {
              type: 'string',
              pattern: '^[A-Z0-9]+$',
              description: 'Trading symbol (optional)',
              optional: true,
            },
          },
        },
        {
          name: 'mexc_test_connectivity',
          description: 'Test connectivity to MEXC API and check server time synchronization',
          inputSchema: {},
        },
        {
          name: 'mexc_test_authentication',
          description: 'Test MEXC API authentication with provided credentials',
          inputSchema: {},
        },
        {
          name: 'mexc_get_active_symbols',
          description: 'Get all active trading symbols on MEXC exchange',
          inputSchema: {
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 50,
              description: 'Maximum number of symbols to return',
            },
          },
        },
      ],
    };
  }
);
