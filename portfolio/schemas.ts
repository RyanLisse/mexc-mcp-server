import type {
  BalanceHistory,
  GetBalanceHistoryArgs,
  GetBalancesArgs,
  GetPortfolioSummaryArgs,
  GetPositionsArgs,
  GetRiskMetricsArgs,
  GetTransactionHistoryArgs,
  PortfolioBalance,
  PortfolioEvent,
  PortfolioMetrics,
  PortfolioPosition,
  PortfolioSummary,
  PositionMetrics,
  RiskMetrics,
  TransactionHistoryQuery,
  TransactionHistoryResponse,
  TransactionRecord,
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

// Validation functions for tool arguments using business logic
export const PortfolioToolValidationFunctions = {
  mexc_get_balances: validateGetBalancesArgs,
  mexc_get_positions: validateGetPositionsArgs,
  mexc_get_transaction_history: validateGetTransactionHistoryArgs,
  mexc_get_portfolio_summary: validateGetPortfolioSummaryArgs,
  mexc_get_balance_history: validateGetBalanceHistoryArgs,
  mexc_get_portfolio_metrics: validateGetRiskMetricsArgs,
  mexc_get_risk_metrics: validateGetRiskMetricsArgs,
  mexc_get_position_metrics: validateGetPositionMetricsArgs,
  mexc_refresh_portfolio: validateRefreshPortfolioArgs,
  mexc_get_asset_balance: validateGetAssetBalanceArgs,
  mexc_get_position: validateGetPositionArgs,
};

// Response validation functions using business logic
export const PortfolioResponseValidationFunctions = {
  balances: validatePortfolioBalanceArray,
  positions: validatePortfolioPositionArray,
  transactionHistory: validateTransactionHistoryResponse,
  portfolioSummary: validatePortfolioSummary,
  portfolioMetrics: validatePortfolioMetrics,
  balanceHistory: validateBalanceHistory,
  riskMetrics: validateRiskMetrics,
  positionMetrics: validatePositionMetrics,
  assetBalance: validatePortfolioBalanceOrNull,
  position: validatePortfolioPositionOrNull,
};

// Utility function to validate portfolio tool arguments using business logic
export function validatePortfolioArgs(
  toolName: string,
  args: Record<string, unknown>
): Record<string, unknown> {
  const validationFn =
    PortfolioToolValidationFunctions[toolName as keyof typeof PortfolioToolValidationFunctions];

  if (!validationFn) {
    throw new Error(`Unknown portfolio tool: ${toolName}`);
  }

  const validationError = validationFn(args);
  if (validationError) {
    throw new Error(`Invalid arguments for ${toolName}: ${validationError}`);
  }

  return args;
}

// Utility function to validate portfolio response using business logic
export function validatePortfolioResponse<T>(
  responseType: keyof typeof PortfolioResponseValidationFunctions,
  data: unknown
): T {
  const validationFn = PortfolioResponseValidationFunctions[responseType];

  if (!validationFn) {
    throw new Error(`Unknown response type: ${responseType}`);
  }

  const validationError = validationFn(data);
  if (validationError) {
    throw new Error(`Invalid response data for ${responseType}: ${validationError}`);
  }

  return data as T;
}

// Portfolio Event Type - moved to types.ts

// Portfolio Configuration Interface
export interface PortfolioConfig {
  cache: {
    balanceTtl: number; // milliseconds, default: 30000
    positionTtl: number; // milliseconds, default: 60000
    priceTtl: number; // milliseconds, default: 5000
    maxCacheSize: number; // default: 1000
  };
  realtime: {
    enabled: boolean; // default: true
    updateInterval: number; // milliseconds, default: 30000
    priceUpdateInterval: number; // milliseconds, default: 5000
  };
  calculation: {
    usdBaseCurrency: string; // default: 'USDT'
    decimals: number; // default: 8
    rounding: 'up' | 'down' | 'nearest'; // default: 'nearest'
  };
  risk: {
    enabled: boolean; // default: true
    confidenceLevel: number; // default: 0.95
    timeHorizon: number; // days, default: 1
  };
}

// Validation function for portfolio events
export function validatePortfolioEvent(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return 'Portfolio event must be an object';
  }

  const event = data as Record<string, unknown>;

  const validTypes = ['balance_updated', 'position_changed', 'transaction_added', 'price_updated'];
  if (!event.type || typeof event.type !== 'string' || !validTypes.includes(event.type)) {
    return `Portfolio event type must be one of: ${validTypes.join(', ')}`;
  }

  if (!event.data || typeof event.data !== 'object') {
    return 'Portfolio event data must be an object';
  }

  if (!event.timestamp || typeof event.timestamp !== 'string') {
    return 'Portfolio event timestamp must be a string';
  }

  try {
    new Date(event.timestamp);
  } catch {
    return 'Portfolio event timestamp must be a valid ISO datetime string';
  }

  return null;
}

// Validation function for portfolio configuration
export function validatePortfolioConfig(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return 'Portfolio config must be an object';
  }

  const config = data as Record<string, unknown>;

  // Validate cache config
  if (!config.cache || typeof config.cache !== 'object') {
    return 'Portfolio config must have a cache object';
  }
  const cache = config.cache as Record<string, unknown>;

  if (typeof cache.balanceTtl !== 'number' || cache.balanceTtl < 1000) {
    return 'Cache balanceTtl must be a number >= 1000';
  }
  if (typeof cache.positionTtl !== 'number' || cache.positionTtl < 1000) {
    return 'Cache positionTtl must be a number >= 1000';
  }
  if (typeof cache.priceTtl !== 'number' || cache.priceTtl < 1000) {
    return 'Cache priceTtl must be a number >= 1000';
  }
  if (typeof cache.maxCacheSize !== 'number' || cache.maxCacheSize < 1) {
    return 'Cache maxCacheSize must be a number >= 1';
  }

  // Validate realtime config
  if (!config.realtime || typeof config.realtime !== 'object') {
    return 'Portfolio config must have a realtime object';
  }
  const realtime = config.realtime as Record<string, unknown>;

  if (typeof realtime.enabled !== 'boolean') {
    return 'Realtime enabled must be a boolean';
  }
  if (typeof realtime.updateInterval !== 'number' || realtime.updateInterval < 1000) {
    return 'Realtime updateInterval must be a number >= 1000';
  }
  if (typeof realtime.priceUpdateInterval !== 'number' || realtime.priceUpdateInterval < 1000) {
    return 'Realtime priceUpdateInterval must be a number >= 1000';
  }

  // Validate calculation config
  if (!config.calculation || typeof config.calculation !== 'object') {
    return 'Portfolio config must have a calculation object';
  }
  const calculation = config.calculation as Record<string, unknown>;

  if (!calculation.usdBaseCurrency || typeof calculation.usdBaseCurrency !== 'string') {
    return 'Calculation usdBaseCurrency must be a string';
  }
  if (
    typeof calculation.decimals !== 'number' ||
    calculation.decimals < 2 ||
    calculation.decimals > 18
  ) {
    return 'Calculation decimals must be a number between 2 and 18';
  }
  const validRounding = ['up', 'down', 'nearest'];
  if (
    !calculation.rounding ||
    typeof calculation.rounding !== 'string' ||
    !validRounding.includes(calculation.rounding)
  ) {
    return `Calculation rounding must be one of: ${validRounding.join(', ')}`;
  }

  // Validate risk config
  if (!config.risk || typeof config.risk !== 'object') {
    return 'Portfolio config must have a risk object';
  }
  const risk = config.risk as Record<string, unknown>;

  if (typeof risk.enabled !== 'boolean') {
    return 'Risk enabled must be a boolean';
  }
  if (
    typeof risk.confidenceLevel !== 'number' ||
    risk.confidenceLevel < 0.8 ||
    risk.confidenceLevel > 0.99
  ) {
    return 'Risk confidenceLevel must be a number between 0.8 and 0.99';
  }
  if (typeof risk.timeHorizon !== 'number' || risk.timeHorizon < 1 || risk.timeHorizon > 365) {
    return 'Risk timeHorizon must be a number between 1 and 365';
  }

  return null;
}

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

// Validation functions for tool arguments

function validateGetBalancesArgs(args: Record<string, unknown>): string | null {
  if (args.includeZero !== undefined && typeof args.includeZero !== 'boolean') {
    return 'includeZero must be a boolean';
  }

  if (args.assets !== undefined) {
    if (!Array.isArray(args.assets)) {
      return 'assets must be an array';
    }
    if (!args.assets.every((asset) => typeof asset === 'string')) {
      return 'all assets must be strings';
    }
  }

  if (args.refresh !== undefined && typeof args.refresh !== 'boolean') {
    return 'refresh must be a boolean';
  }

  return null;
}

function validateGetPositionsArgs(args: Record<string, unknown>): string | null {
  if (args.symbols !== undefined) {
    if (!Array.isArray(args.symbols)) {
      return 'symbols must be an array';
    }
    if (!args.symbols.every((symbol) => typeof symbol === 'string')) {
      return 'all symbols must be strings';
    }
  }

  if (args.minValue !== undefined && (typeof args.minValue !== 'number' || args.minValue < 0)) {
    return 'minValue must be a number >= 0';
  }

  if (args.refresh !== undefined && typeof args.refresh !== 'boolean') {
    return 'refresh must be a boolean';
  }

  return null;
}

function validateGetTransactionHistoryArgs(args: Record<string, unknown>): string | null {
  if (
    args.limit !== undefined &&
    (typeof args.limit !== 'number' || args.limit < 1 || args.limit > 1000)
  ) {
    return 'limit must be a number between 1 and 1000';
  }

  if (args.offset !== undefined && (typeof args.offset !== 'number' || args.offset < 0)) {
    return 'offset must be a number >= 0';
  }

  const validTypes = ['trade', 'deposit', 'withdrawal', 'fee', 'dividend', 'interest'];
  if (
    args.type !== undefined &&
    (typeof args.type !== 'string' || !validTypes.includes(args.type))
  ) {
    return `type must be one of: ${validTypes.join(', ')}`;
  }

  if (args.symbol !== undefined && typeof args.symbol !== 'string') {
    return 'symbol must be a string';
  }

  const validSides = ['buy', 'sell'];
  if (
    args.side !== undefined &&
    (typeof args.side !== 'string' || !validSides.includes(args.side))
  ) {
    return `side must be one of: ${validSides.join(', ')}`;
  }

  if (args.startTime !== undefined && typeof args.startTime !== 'number') {
    return 'startTime must be a number';
  }

  if (args.endTime !== undefined && typeof args.endTime !== 'number') {
    return 'endTime must be a number';
  }

  const validSortBy = ['timestamp', 'value', 'quantity'];
  if (
    args.sortBy !== undefined &&
    (typeof args.sortBy !== 'string' || !validSortBy.includes(args.sortBy))
  ) {
    return `sortBy must be one of: ${validSortBy.join(', ')}`;
  }

  const validSortOrder = ['asc', 'desc'];
  if (
    args.sortOrder !== undefined &&
    (typeof args.sortOrder !== 'string' || !validSortOrder.includes(args.sortOrder))
  ) {
    return `sortOrder must be one of: ${validSortOrder.join(', ')}`;
  }

  return null;
}

function validateGetPortfolioSummaryArgs(args: Record<string, unknown>): string | null {
  if (args.includeMetrics !== undefined && typeof args.includeMetrics !== 'boolean') {
    return 'includeMetrics must be a boolean';
  }

  if (args.refresh !== undefined && typeof args.refresh !== 'boolean') {
    return 'refresh must be a boolean';
  }

  return null;
}

function validateGetBalanceHistoryArgs(args: Record<string, unknown>): string | null {
  const validPeriods = ['1h', '4h', '1d', '1w', '1M'];
  if (
    args.period !== undefined &&
    (typeof args.period !== 'string' || !validPeriods.includes(args.period))
  ) {
    return `period must be one of: ${validPeriods.join(', ')}`;
  }

  if (
    args.limit !== undefined &&
    (typeof args.limit !== 'number' || args.limit < 1 || args.limit > 1000)
  ) {
    return 'limit must be a number between 1 and 1000';
  }

  return null;
}

function validateGetRiskMetricsArgs(args: Record<string, unknown>): string | null {
  const validPeriods = ['1d', '7d', '30d'];
  if (
    args.period !== undefined &&
    (typeof args.period !== 'string' || !validPeriods.includes(args.period))
  ) {
    return `period must be one of: ${validPeriods.join(', ')}`;
  }

  if (args.refresh !== undefined && typeof args.refresh !== 'boolean') {
    return 'refresh must be a boolean';
  }

  return null;
}

function validateGetPositionMetricsArgs(args: Record<string, unknown>): string | null {
  if (args.refresh !== undefined && typeof args.refresh !== 'boolean') {
    return 'refresh must be a boolean';
  }

  return null;
}

function validateRefreshPortfolioArgs(args: Record<string, unknown>): string | null {
  if (args.components !== undefined) {
    if (!Array.isArray(args.components)) {
      return 'components must be an array';
    }
    const validComponents = ['balances', 'positions', 'prices', 'all'];
    if (
      !args.components.every((comp) => typeof comp === 'string' && validComponents.includes(comp))
    ) {
      return `all components must be one of: ${validComponents.join(', ')}`;
    }
  }

  return null;
}

function validateGetAssetBalanceArgs(args: Record<string, unknown>): string | null {
  if (!args.asset || typeof args.asset !== 'string' || args.asset.length < 1) {
    return 'asset is required and must be a non-empty string';
  }

  if (args.refresh !== undefined && typeof args.refresh !== 'boolean') {
    return 'refresh must be a boolean';
  }

  return null;
}

function validateGetPositionArgs(args: Record<string, unknown>): string | null {
  if (!args.symbol || typeof args.symbol !== 'string' || args.symbol.length < 1) {
    return 'symbol is required and must be a non-empty string';
  }

  if (args.refresh !== undefined && typeof args.refresh !== 'boolean') {
    return 'refresh must be a boolean';
  }

  return null;
}

// Response validation functions

function validatePortfolioBalance(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return 'Portfolio balance must be an object';
  }

  const balance = data as Record<string, unknown>;

  if (!balance.asset || typeof balance.asset !== 'string') {
    return 'asset must be a string';
  }
  if (!balance.free || typeof balance.free !== 'string') {
    return 'free must be a string';
  }
  if (!balance.locked || typeof balance.locked !== 'string') {
    return 'locked must be a string';
  }
  if (!balance.total || typeof balance.total !== 'string') {
    return 'total must be a string';
  }
  if (!balance.usdValue || typeof balance.usdValue !== 'string') {
    return 'usdValue must be a string';
  }
  if (typeof balance.percentage !== 'number') {
    return 'percentage must be a number';
  }
  if (!balance.timestamp || typeof balance.timestamp !== 'string') {
    return 'timestamp must be a string';
  }

  return null;
}

function validatePortfolioBalanceArray(data: unknown): string | null {
  if (!Array.isArray(data)) {
    return 'Portfolio balances must be an array';
  }

  for (let i = 0; i < data.length; i++) {
    const error = validatePortfolioBalance(data[i]);
    if (error) {
      return `Balance at index ${i}: ${error}`;
    }
  }

  return null;
}

function validatePortfolioPosition(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return 'Portfolio position must be an object';
  }

  const position = data as Record<string, unknown>;

  if (!position.symbol || typeof position.symbol !== 'string') {
    return 'symbol must be a string';
  }
  if (!position.asset || typeof position.asset !== 'string') {
    return 'asset must be a string';
  }
  if (!position.quantity || typeof position.quantity !== 'string') {
    return 'quantity must be a string';
  }
  if (!position.averagePrice || typeof position.averagePrice !== 'string') {
    return 'averagePrice must be a string';
  }
  if (!position.currentPrice || typeof position.currentPrice !== 'string') {
    return 'currentPrice must be a string';
  }
  if (!position.marketValue || typeof position.marketValue !== 'string') {
    return 'marketValue must be a string';
  }
  if (!position.unrealizedPnl || typeof position.unrealizedPnl !== 'string') {
    return 'unrealizedPnl must be a string';
  }
  if (typeof position.unrealizedPnlPercent !== 'number') {
    return 'unrealizedPnlPercent must be a number';
  }
  if (!position.cost || typeof position.cost !== 'string') {
    return 'cost must be a string';
  }
  if (
    !position.side ||
    typeof position.side !== 'string' ||
    !['long', 'short'].includes(position.side)
  ) {
    return 'side must be "long" or "short"';
  }
  if (!position.timestamp || typeof position.timestamp !== 'string') {
    return 'timestamp must be a string';
  }

  return null;
}

function validatePortfolioPositionArray(data: unknown): string | null {
  if (!Array.isArray(data)) {
    return 'Portfolio positions must be an array';
  }

  for (let i = 0; i < data.length; i++) {
    const error = validatePortfolioPosition(data[i]);
    if (error) {
      return `Position at index ${i}: ${error}`;
    }
  }

  return null;
}

function validateTransactionRecord(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return 'Transaction record must be an object';
  }

  const record = data as Record<string, unknown>;

  if (!record.id || typeof record.id !== 'string') {
    return 'id must be a string';
  }

  const validTypes = ['trade', 'deposit', 'withdrawal', 'fee', 'dividend', 'interest'];
  if (!record.type || typeof record.type !== 'string' || !validTypes.includes(record.type)) {
    return `type must be one of: ${validTypes.join(', ')}`;
  }

  if (record.symbol !== undefined && typeof record.symbol !== 'string') {
    return 'symbol must be a string';
  }

  if (
    record.side !== undefined &&
    (typeof record.side !== 'string' || !['buy', 'sell'].includes(record.side))
  ) {
    return 'side must be "buy" or "sell"';
  }

  if (!record.quantity || typeof record.quantity !== 'string') {
    return 'quantity must be a string';
  }

  if (record.price !== undefined && typeof record.price !== 'string') {
    return 'price must be a string';
  }

  if (!record.value || typeof record.value !== 'string') {
    return 'value must be a string';
  }

  if (record.fee !== undefined && typeof record.fee !== 'string') {
    return 'fee must be a string';
  }

  if (record.feeAsset !== undefined && typeof record.feeAsset !== 'string') {
    return 'feeAsset must be a string';
  }

  if (!record.timestamp || typeof record.timestamp !== 'string') {
    return 'timestamp must be a string';
  }

  if (record.orderId !== undefined && typeof record.orderId !== 'string') {
    return 'orderId must be a string';
  }

  if (record.notes !== undefined && typeof record.notes !== 'string') {
    return 'notes must be a string';
  }

  return null;
}

function validateTransactionHistoryResponse(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return 'Transaction history response must be an object';
  }

  const response = data as Record<string, unknown>;

  if (!Array.isArray(response.transactions)) {
    return 'transactions must be an array';
  }

  for (let i = 0; i < response.transactions.length; i++) {
    const error = validateTransactionRecord(response.transactions[i]);
    if (error) {
      return `Transaction at index ${i}: ${error}`;
    }
  }

  if (typeof response.total !== 'number') {
    return 'total must be a number';
  }
  if (typeof response.limit !== 'number') {
    return 'limit must be a number';
  }
  if (typeof response.offset !== 'number') {
    return 'offset must be a number';
  }
  if (typeof response.hasMore !== 'boolean') {
    return 'hasMore must be a boolean';
  }
  if (!response.timestamp || typeof response.timestamp !== 'string') {
    return 'timestamp must be a string';
  }

  return null;
}

function validatePortfolioSummary(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return 'Portfolio summary must be an object';
  }

  const summary = data as Record<string, unknown>;

  if (!summary.totalValue || typeof summary.totalValue !== 'string') {
    return 'totalValue must be a string';
  }
  if (!summary.totalBalance || typeof summary.totalBalance !== 'string') {
    return 'totalBalance must be a string';
  }
  if (typeof summary.totalPositions !== 'number') {
    return 'totalPositions must be a number';
  }
  if (!summary.totalPnl || typeof summary.totalPnl !== 'string') {
    return 'totalPnl must be a string';
  }
  if (typeof summary.totalPnlPercent !== 'number') {
    return 'totalPnlPercent must be a number';
  }

  if (!Array.isArray(summary.topHoldings)) {
    return 'topHoldings must be an array';
  }

  for (let i = 0; i < summary.topHoldings.length; i++) {
    const holding = summary.topHoldings[i];
    if (!holding || typeof holding !== 'object') {
      return `topHolding at index ${i} must be an object`;
    }
    const h = holding as Record<string, unknown>;
    if (!h.asset || typeof h.asset !== 'string') {
      return `topHolding at index ${i}: asset must be a string`;
    }
    if (!h.value || typeof h.value !== 'string') {
      return `topHolding at index ${i}: value must be a string`;
    }
    if (typeof h.percentage !== 'number') {
      return `topHolding at index ${i}: percentage must be a number`;
    }
  }

  if (!summary.timestamp || typeof summary.timestamp !== 'string') {
    return 'timestamp must be a string';
  }

  return null;
}

function validatePortfolioMetrics(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return 'Portfolio metrics must be an object';
  }

  const metrics = data as Record<string, unknown>;

  if (!metrics.totalValue || typeof metrics.totalValue !== 'string') {
    return 'totalValue must be a string';
  }
  if (!metrics.totalPnl || typeof metrics.totalPnl !== 'string') {
    return 'totalPnl must be a string';
  }
  if (typeof metrics.totalPnlPercent !== 'number') {
    return 'totalPnlPercent must be a number';
  }

  if (metrics.sharpeRatio !== undefined && typeof metrics.sharpeRatio !== 'number') {
    return 'sharpeRatio must be a number';
  }
  if (metrics.maxDrawdown !== undefined && typeof metrics.maxDrawdown !== 'number') {
    return 'maxDrawdown must be a number';
  }
  if (metrics.winRate !== undefined && typeof metrics.winRate !== 'number') {
    return 'winRate must be a number';
  }
  if (metrics.averageWin !== undefined && typeof metrics.averageWin !== 'string') {
    return 'averageWin must be a string';
  }
  if (metrics.averageLoss !== undefined && typeof metrics.averageLoss !== 'string') {
    return 'averageLoss must be a string';
  }
  if (metrics.profitFactor !== undefined && typeof metrics.profitFactor !== 'number') {
    return 'profitFactor must be a number';
  }
  if (metrics.totalTrades !== undefined && typeof metrics.totalTrades !== 'number') {
    return 'totalTrades must be a number';
  }

  if (!metrics.timestamp || typeof metrics.timestamp !== 'string') {
    return 'timestamp must be a string';
  }

  return null;
}

function validateBalanceHistory(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return 'Balance history must be an object';
  }

  const history = data as Record<string, unknown>;

  const validPeriods = ['1h', '4h', '1d', '1w', '1M'];
  if (
    !history.period ||
    typeof history.period !== 'string' ||
    !validPeriods.includes(history.period)
  ) {
    return `period must be one of: ${validPeriods.join(', ')}`;
  }

  if (!Array.isArray(history.dataPoints)) {
    return 'dataPoints must be an array';
  }

  for (let i = 0; i < history.dataPoints.length; i++) {
    const point = history.dataPoints[i];
    if (!point || typeof point !== 'object') {
      return `dataPoint at index ${i} must be an object`;
    }
    const p = point as Record<string, unknown>;
    if (!p.timestamp || typeof p.timestamp !== 'string') {
      return `dataPoint at index ${i}: timestamp must be a string`;
    }
    if (!p.value || typeof p.value !== 'string') {
      return `dataPoint at index ${i}: value must be a string`;
    }
    if (!p.change || typeof p.change !== 'string') {
      return `dataPoint at index ${i}: change must be a string`;
    }
    if (typeof p.changePercent !== 'number') {
      return `dataPoint at index ${i}: changePercent must be a number`;
    }
  }

  if (!history.totalValue || typeof history.totalValue !== 'string') {
    return 'totalValue must be a string';
  }
  if (!history.change24h || typeof history.change24h !== 'string') {
    return 'change24h must be a string';
  }
  if (typeof history.changePercent24h !== 'number') {
    return 'changePercent24h must be a number';
  }
  if (!history.timestamp || typeof history.timestamp !== 'string') {
    return 'timestamp must be a string';
  }

  return null;
}

function validateRiskMetrics(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return 'Risk metrics must be an object';
  }

  const metrics = data as Record<string, unknown>;

  if (metrics.valueAtRisk !== undefined && typeof metrics.valueAtRisk !== 'number') {
    return 'valueAtRisk must be a number';
  }
  if (metrics.expectedShortfall !== undefined && typeof metrics.expectedShortfall !== 'number') {
    return 'expectedShortfall must be a number';
  }
  if (metrics.beta !== undefined && typeof metrics.beta !== 'number') {
    return 'beta must be a number';
  }
  if (metrics.volatility !== undefined && typeof metrics.volatility !== 'number') {
    return 'volatility must be a number';
  }

  if (metrics.correlation !== undefined) {
    if (!metrics.correlation || typeof metrics.correlation !== 'object') {
      return 'correlation must be an object';
    }
    const correlation = metrics.correlation as Record<string, unknown>;
    for (const [key, value] of Object.entries(correlation)) {
      if (typeof value !== 'number') {
        return `correlation.${key} must be a number`;
      }
    }
  }

  if (!metrics.timestamp || typeof metrics.timestamp !== 'string') {
    return 'timestamp must be a string';
  }

  return null;
}

function validatePositionMetrics(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return 'Position metrics must be an object';
  }

  const metrics = data as Record<string, unknown>;

  if (typeof metrics.totalPositions !== 'number') {
    return 'totalPositions must be a number';
  }
  if (!metrics.totalMarketValue || typeof metrics.totalMarketValue !== 'string') {
    return 'totalMarketValue must be a string';
  }
  if (!metrics.totalUnrealizedPnl || typeof metrics.totalUnrealizedPnl !== 'string') {
    return 'totalUnrealizedPnl must be a string';
  }
  if (typeof metrics.profitablePositions !== 'number') {
    return 'profitablePositions must be a number';
  }
  if (typeof metrics.losingPositions !== 'number') {
    return 'losingPositions must be a number';
  }

  if (metrics.largestPosition !== undefined) {
    if (!metrics.largestPosition || typeof metrics.largestPosition !== 'object') {
      return 'largestPosition must be an object';
    }
    const largest = metrics.largestPosition as Record<string, unknown>;
    if (!largest.symbol || typeof largest.symbol !== 'string') {
      return 'largestPosition.symbol must be a string';
    }
    if (!largest.value || typeof largest.value !== 'string') {
      return 'largestPosition.value must be a string';
    }
    if (typeof largest.percentage !== 'number') {
      return 'largestPosition.percentage must be a number';
    }
  }

  if (!metrics.timestamp || typeof metrics.timestamp !== 'string') {
    return 'timestamp must be a string';
  }

  return null;
}

function validatePortfolioBalanceOrNull(data: unknown): string | null {
  if (data === null) {
    return null;
  }
  return validatePortfolioBalance(data);
}

function validatePortfolioPositionOrNull(data: unknown): string | null {
  if (data === null) {
    return null;
  }
  return validatePortfolioPosition(data);
}
