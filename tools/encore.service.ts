import { Service } from 'encore.dev/service';
import * as marketDataService from '../market-data/tools';
import { ToolExecutor } from './executor';
import { ToolRegistry } from './registry';
import type { MCPTool, MCPToolResult, ToolExecutionContext, ToolHandler } from './types';

export default new Service('tools');

// Global registry and executor instances
const registry = new ToolRegistry();
const executor = new ToolExecutor(registry);

// Metrics tracking
interface ToolMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  toolUsage: Record<string, number>;
  lastExecutionTime?: Date;
}

const metrics: ToolMetrics = {
  totalExecutions: 0,
  successfulExecutions: 0,
  failedExecutions: 0,
  averageExecutionTime: 0,
  toolUsage: {},
  lastExecutionTime: undefined,
};

// Initialize built-in tools
initializeBuiltInTools().then(() => {
  console.log(`Tools service initialized with ${registry.size()} tools`);
});

async function initializeBuiltInTools(): Promise<void> {
  // Market Data Tools
  const getTickerTool: ToolHandler = {
    name: 'mexc_get_ticker',
    description: 'Get 24hr ticker price change statistics for a symbol',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT)',
          minLength: 1,
        },
      },
      required: ['symbol'],
    },
    async execute(args): Promise<MCPToolResult> {
      const { symbol } = args as { symbol: string };
      try {
        const response = await marketDataService.executeGetTicker({ symbol });
        const ticker = response.data;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(ticker, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(
          `Failed to get ticker for ${symbol}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  };

  const getOrderBookTool: ToolHandler = {
    name: 'mexc_get_orderbook',
    description: 'Get order book (market depth) data for a symbol',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (e.g., BTCUSDT)',
          minLength: 1,
        },
        limit: {
          type: 'number',
          description: 'Number of entries to return (default: 100, max: 5000)',
          minimum: 1,
          maximum: 5000,
        },
      },
      required: ['symbol'],
    },
    async execute(args): Promise<MCPToolResult> {
      const { symbol, limit } = args as { symbol: string; limit?: number };
      try {
        const response = await marketDataService.executeGetOrderBook({ symbol, limit });
        const orderBook = response.data;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(orderBook, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(
          `Failed to get order book for ${symbol}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  };

  const get24hStatsTool: ToolHandler = {
    name: 'mexc_get_24h_stats',
    description: 'Get 24-hour trading statistics',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Trading pair symbol (optional, gets all if not specified)',
          minLength: 1,
        },
      },
    },
    async execute(args): Promise<MCPToolResult> {
      const { symbol } = args as { symbol?: string };
      try {
        const response = await marketDataService.executeGet24hStats({ symbol });
        const stats = response.data;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(
          `Failed to get 24h stats: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  };

  const testConnectivityTool: ToolHandler = {
    name: 'mexc_test_connectivity',
    description: 'Test connectivity to MEXC API and check server time synchronization',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    async execute(): Promise<MCPToolResult> {
      try {
        const response = await marketDataService.executeTestConnectivity({});
        const result = response.data;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(
          `Connectivity test failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  };

  const testAuthenticationTool: ToolHandler = {
    name: 'mexc_test_authentication',
    description: 'Test MEXC API authentication with provided credentials',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    async execute(): Promise<MCPToolResult> {
      try {
        const response = await marketDataService.executeTestAuthentication({});
        const result = response.data;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(
          `Authentication test failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  };

  const getActiveSymbolsTool: ToolHandler = {
    name: 'mexc_get_active_symbols',
    description: 'Get all active trading symbols on MEXC exchange',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of symbols to return (default: 50, max: 100)',
          minimum: 1,
          maximum: 100,
        },
      },
    },
    async execute(args): Promise<MCPToolResult> {
      const { limit } = args as { limit?: number };
      try {
        const response = await marketDataService.executeGetActiveSymbols({ limit });
        const symbols = response.data;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(symbols, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(
          `Failed to get active symbols: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  };

  // Register all tools
  registry.register(getTickerTool);
  registry.register(getOrderBookTool);
  registry.register(get24hStatsTool);
  registry.register(testConnectivityTool);
  registry.register(testAuthenticationTool);
  registry.register(getActiveSymbolsTool);
}

// Service methods
export const toolsService = {
  listTools: async (): Promise<MCPTool[]> => {
    return registry.list();
  },

  getTool: async (name: string): Promise<MCPTool | undefined> => {
    const handler = registry.get(name);
    if (!handler) {
      return undefined;
    }

    return {
      name: handler.name,
      description: handler.description,
      inputSchema: handler.inputSchema,
    };
  },

  executeTool: async (
    name: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext,
    timeoutMs?: number
  ): Promise<MCPToolResult> => {
    const startTime = Date.now();

    try {
      // Update metrics
      metrics.totalExecutions++;
      metrics.toolUsage[name] = (metrics.toolUsage[name] || 0) + 1;
      metrics.lastExecutionTime = new Date();

      const result = await executor.execute(name, args, context, timeoutMs);

      // Update success metrics
      if (!result.isError) {
        metrics.successfulExecutions++;
      } else {
        metrics.failedExecutions++;
      }

      // Update execution time
      const executionTime = Date.now() - startTime;
      metrics.averageExecutionTime =
        (metrics.averageExecutionTime * (metrics.totalExecutions - 1) + executionTime) /
        metrics.totalExecutions;

      return result;
    } catch (error) {
      // Update error metrics
      metrics.failedExecutions++;

      const executionTime = Date.now() - startTime;
      metrics.averageExecutionTime =
        (metrics.averageExecutionTime * (metrics.totalExecutions - 1) + executionTime) /
        metrics.totalExecutions;

      throw error;
    }
  },

  executeBatch: async (
    calls: Array<{ name: string; args: Record<string, unknown> }>,
    context: ToolExecutionContext,
    options?: {
      timeoutMs?: number;
      maxConcurrency?: number;
      stopOnFirstError?: boolean;
    }
  ): Promise<MCPToolResult[]> => {
    return executor.executeBatch(calls, context, options);
  },

  registerTool: async (handler: ToolHandler): Promise<void> => {
    registry.register(handler);
  },

  unregisterTool: async (name: string): Promise<boolean> => {
    return registry.unregister(name);
  },

  getHealth: async (): Promise<{
    toolsCount: number;
    availableTools: string[];
    metrics: ToolMetrics;
  }> => {
    return {
      toolsCount: registry.size(),
      availableTools: executor.getAvailableTools(),
      metrics: { ...metrics },
    };
  },

  getMetrics: async (): Promise<ToolMetrics> => {
    return { ...metrics };
  },

  clearMetrics: async (): Promise<void> => {
    metrics.totalExecutions = 0;
    metrics.successfulExecutions = 0;
    metrics.failedExecutions = 0;
    metrics.averageExecutionTime = 0;
    metrics.toolUsage = {};
    metrics.lastExecutionTime = undefined;
  },
};
