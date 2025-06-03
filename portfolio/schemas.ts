import { z } from 'zod';
import {
  BalanceHistorySchema,
  GetBalanceHistoryArgsSchema,
  GetBalancesArgsSchema,
  GetPortfolioSummaryArgsSchema,
  GetPositionsArgsSchema,
  GetRiskMetricsArgsSchema,
  GetTransactionHistoryArgsSchema,
  PortfolioBalanceSchema,
  PortfolioMetricsSchema,
  PortfolioPositionSchema,
  PortfolioSummarySchema,
  PositionMetricsSchema,
  RiskMetricsSchema,
  TransactionHistoryQuerySchema,
  TransactionHistoryResponseSchema,
  TransactionRecordSchema,
} from './types';

// MCP Tool Input Schemas for Portfolio Tools
export const PortfolioToolSchemas = {
  // Get account balances
  mexc_get_balances: {
    type: 'object',
    properties: {
      includeZero: {
        type: 'boolean',
        description: 'Include assets with zero balance',
        default: false,
      },
      assets: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific assets to retrieve (optional)',
      },
      refresh: {
        type: 'boolean',
        description: 'Force refresh from API',
        default: false,
      },
    },
  },

  // Get portfolio positions
  mexc_get_positions: {
    type: 'object',
    properties: {
      symbols: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific trading pairs to retrieve (optional)',
      },
      minValue: {
        type: 'number',
        minimum: 0,
        description: 'Minimum USD value to include',
      },
      refresh: {
        type: 'boolean',
        description: 'Force refresh from API',
        default: false,
      },
    },
  },

  // Get transaction history
  mexc_get_transaction_history: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 1000,
        default: 50,
        description: 'Number of transactions to retrieve',
      },
      offset: {
        type: 'number',
        minimum: 0,
        default: 0,
        description: 'Number of transactions to skip',
      },
      type: {
        type: 'string',
        enum: ['trade', 'deposit', 'withdrawal', 'fee', 'dividend', 'interest'],
        description: 'Filter by transaction type',
      },
      symbol: {
        type: 'string',
        description: 'Filter by trading pair symbol',
      },
      side: {
        type: 'string',
        enum: ['buy', 'sell'],
        description: 'Filter by trade side',
      },
      startTime: {
        type: 'number',
        description: 'Start timestamp (milliseconds)',
      },
      endTime: {
        type: 'number',
        description: 'End timestamp (milliseconds)',
      },
      sortBy: {
        type: 'string',
        enum: ['timestamp', 'value', 'quantity'],
        default: 'timestamp',
        description: 'Sort field',
      },
      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
        default: 'desc',
        description: 'Sort order',
      },
    },
  },

  // Get portfolio summary
  mexc_get_portfolio_summary: {
    type: 'object',
    properties: {
      includeMetrics: {
        type: 'boolean',
        default: true,
        description: 'Include performance metrics',
      },
      refresh: {
        type: 'boolean',
        default: false,
        description: 'Force refresh from API',
      },
    },
  },

  // Get balance history
  mexc_get_balance_history: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        enum: ['1h', '4h', '1d', '1w', '1M'],
        default: '1d',
        description: 'Time period for each data point',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 1000,
        default: 24,
        description: 'Number of data points to retrieve',
      },
    },
  },

  // Get portfolio metrics
  mexc_get_portfolio_metrics: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        enum: ['1d', '7d', '30d'],
        default: '30d',
        description: 'Analysis period',
      },
      refresh: {
        type: 'boolean',
        default: false,
        description: 'Force refresh from API',
      },
    },
  },

  // Get risk metrics
  mexc_get_risk_metrics: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        enum: ['1d', '7d', '30d'],
        default: '30d',
        description: 'Analysis period',
      },
      refresh: {
        type: 'boolean',
        default: false,
        description: 'Force refresh from API',
      },
    },
  },

  // Get position metrics
  mexc_get_position_metrics: {
    type: 'object',
    properties: {
      refresh: {
        type: 'boolean',
        default: false,
        description: 'Force refresh from API',
      },
    },
  },

  // Refresh portfolio data
  mexc_refresh_portfolio: {
    type: 'object',
    properties: {
      components: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['balances', 'positions', 'prices', 'all'],
        },
        default: ['all'],
        description: 'Portfolio components to refresh',
      },
    },
  },

  // Get asset balance
  mexc_get_asset_balance: {
    type: 'object',
    properties: {
      asset: {
        type: 'string',
        minLength: 1,
        description: 'Asset symbol (e.g., BTC, ETH, USDT)',
      },
      refresh: {
        type: 'boolean',
        default: false,
        description: 'Force refresh from API',
      },
    },
    required: ['asset'],
  },

  // Get position by symbol
  mexc_get_position: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        minLength: 1,
        description: 'Trading pair symbol (e.g., BTCUSDT)',
      },
      refresh: {
        type: 'boolean',
        default: false,
        description: 'Force refresh from API',
      },
    },
    required: ['symbol'],
  },
};

// Validation schemas for tool arguments
export const PortfolioToolValidationSchemas = {
  mexc_get_balances: GetBalancesArgsSchema,
  mexc_get_positions: GetPositionsArgsSchema,
  mexc_get_transaction_history: GetTransactionHistoryArgsSchema,
  mexc_get_portfolio_summary: GetPortfolioSummaryArgsSchema,
  mexc_get_balance_history: GetBalanceHistoryArgsSchema,
  mexc_get_portfolio_metrics: GetRiskMetricsArgsSchema,
  mexc_get_risk_metrics: GetRiskMetricsArgsSchema,
  mexc_get_position_metrics: z.object({
    refresh: z.boolean().default(false),
  }),
  mexc_refresh_portfolio: z.object({
    components: z.array(z.enum(['balances', 'positions', 'prices', 'all'])).default(['all']),
  }),
  mexc_get_asset_balance: z.object({
    asset: z.string().min(1, 'Asset is required'),
    refresh: z.boolean().default(false),
  }),
  mexc_get_position: z.object({
    symbol: z.string().min(1, 'Symbol is required'),
    refresh: z.boolean().default(false),
  }),
};

// Response validation schemas
export const PortfolioResponseSchemas = {
  balances: z.array(PortfolioBalanceSchema),
  positions: z.array(PortfolioPositionSchema),
  transactionHistory: TransactionHistoryResponseSchema,
  portfolioSummary: PortfolioSummarySchema,
  portfolioMetrics: PortfolioMetricsSchema,
  balanceHistory: BalanceHistorySchema,
  riskMetrics: RiskMetricsSchema,
  positionMetrics: PositionMetricsSchema,
  assetBalance: PortfolioBalanceSchema.nullable(),
  position: PortfolioPositionSchema.nullable(),
};

// Utility function to validate portfolio tool arguments
export function validatePortfolioArgs(
  toolName: string,
  args: Record<string, unknown>
): Record<string, unknown> {
  const schema =
    PortfolioToolValidationSchemas[toolName as keyof typeof PortfolioToolValidationSchemas];

  if (!schema) {
    throw new Error(`Unknown portfolio tool: ${toolName}`);
  }

  try {
    return schema.parse(args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid arguments for ${toolName}: ${errorMessages}`);
    }
    throw error;
  }
}

// Utility function to validate portfolio response
export function validatePortfolioResponse<T>(
  responseType: keyof typeof PortfolioResponseSchemas,
  data: unknown
): T {
  const schema = PortfolioResponseSchemas[responseType];

  if (!schema) {
    throw new Error(`Unknown response type: ${responseType}`);
  }

  try {
    return schema.parse(data) as T;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid response data for ${responseType}: ${errorMessages}`);
    }
    throw error;
  }
}

// Schema for portfolio events
export const PortfolioEventSchema = z.object({
  type: z.enum(['balance_updated', 'position_changed', 'transaction_added', 'price_updated']),
  data: z.record(z.unknown()),
  timestamp: z.string().datetime(),
});

// Schema for portfolio configuration
export const PortfolioConfigSchema = z.object({
  cache: z.object({
    balanceTtl: z.number().min(1000).default(30000), // 30 seconds
    positionTtl: z.number().min(1000).default(60000), // 1 minute
    priceTtl: z.number().min(1000).default(5000), // 5 seconds
    maxCacheSize: z.number().min(1).default(1000),
  }),
  realtime: z.object({
    enabled: z.boolean().default(true),
    updateInterval: z.number().min(1000).default(30000), // 30 seconds
    priceUpdateInterval: z.number().min(1000).default(5000), // 5 seconds
  }),
  calculation: z.object({
    usdBaseCurrency: z.string().default('USDT'),
    decimals: z.number().min(2).max(18).default(8),
    rounding: z.enum(['up', 'down', 'nearest']).default('nearest'),
  }),
  risk: z.object({
    enabled: z.boolean().default(true),
    confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
    timeHorizon: z.number().min(1).max(365).default(1), // days
  }),
});

// Export types
export type PortfolioEvent = z.infer<typeof PortfolioEventSchema>;
export type PortfolioConfig = z.infer<typeof PortfolioConfigSchema>;

// Helper function to create tool schema
export function createPortfolioToolSchema(name: string) {
  const schema = PortfolioToolSchemas[name as keyof typeof PortfolioToolSchemas];

  if (!schema) {
    throw new Error(`Unknown portfolio tool: ${name}`);
  }

  return {
    name,
    description: getToolDescription(name),
    inputSchema: schema,
  };
}

// Tool descriptions
function getToolDescription(toolName: string): string {
  const descriptions: Record<string, string> = {
    mexc_get_balances: 'Get current account balances for all assets or specific assets',
    mexc_get_positions: 'Get current portfolio positions with P&L calculations',
    mexc_get_transaction_history: 'Get transaction history with filtering and pagination',
    mexc_get_portfolio_summary: 'Get portfolio overview with total value and top holdings',
    mexc_get_balance_history: 'Get balance history over time with change tracking',
    mexc_get_portfolio_metrics: 'Get portfolio performance metrics and statistics',
    mexc_get_risk_metrics: 'Get portfolio risk analysis including VaR and volatility',
    mexc_get_position_metrics: 'Get position-level metrics and analysis',
    mexc_refresh_portfolio: 'Refresh portfolio data from exchange APIs',
    mexc_get_asset_balance: 'Get balance for a specific asset',
    mexc_get_position: 'Get position details for a specific trading pair',
  };

  return descriptions[toolName] || 'Portfolio management tool';
}

// Constants for tool names
export const PORTFOLIO_TOOLS = {
  GET_BALANCES: 'mexc_get_balances',
  GET_POSITIONS: 'mexc_get_positions',
  GET_TRANSACTION_HISTORY: 'mexc_get_transaction_history',
  GET_PORTFOLIO_SUMMARY: 'mexc_get_portfolio_summary',
  GET_BALANCE_HISTORY: 'mexc_get_balance_history',
  GET_PORTFOLIO_METRICS: 'mexc_get_portfolio_metrics',
  GET_RISK_METRICS: 'mexc_get_risk_metrics',
  GET_POSITION_METRICS: 'mexc_get_position_metrics',
  REFRESH_PORTFOLIO: 'mexc_refresh_portfolio',
  GET_ASSET_BALANCE: 'mexc_get_asset_balance',
  GET_POSITION: 'mexc_get_position',
} as const;

export type PortfolioToolName = (typeof PORTFOLIO_TOOLS)[keyof typeof PORTFOLIO_TOOLS];
