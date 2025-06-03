import { z } from 'zod';

// Portfolio Balance Schema
export const PortfolioBalanceSchema = z.object({
  asset: z.string().min(1, 'Asset is required'),
  free: z.string().regex(/^\d+\.?\d*$/, 'Free must be a valid number string'),
  locked: z.string().regex(/^\d+\.?\d*$/, 'Locked must be a valid number string'),
  total: z.string().regex(/^\d+\.?\d*$/, 'Total must be a valid number string'),
  usdValue: z.string().regex(/^\d+\.?\d*$/, 'USD value must be a valid number string'),
  percentage: z.number().min(0).max(100),
  timestamp: z.string().datetime(),
});

// Portfolio Position Schema
export const PortfolioPositionSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  asset: z.string().min(1, 'Asset is required'),
  quantity: z.string().regex(/^\d+\.?\d*$/, 'Quantity must be a valid number string'),
  averagePrice: z.string().regex(/^\d+\.?\d*$/, 'Average price must be a valid number string'),
  currentPrice: z.string().regex(/^\d+\.?\d*$/, 'Current price must be a valid number string'),
  marketValue: z.string().regex(/^\d+\.?\d*$/, 'Market value must be a valid number string'),
  unrealizedPnl: z.string().regex(/^-?\d+\.?\d*$/, 'Unrealized PnL must be a valid number string'),
  unrealizedPnlPercent: z.number(),
  cost: z.string().regex(/^\d+\.?\d*$/, 'Cost must be a valid number string'),
  side: z.enum(['long', 'short']),
  timestamp: z.string().datetime(),
});

// Transaction Record Schema
export const TransactionRecordSchema = z.object({
  id: z.string().min(1, 'Transaction ID is required'),
  type: z.enum(['trade', 'deposit', 'withdrawal', 'fee', 'dividend', 'interest']),
  symbol: z.string().optional(),
  side: z.enum(['buy', 'sell']).optional(),
  quantity: z.string().regex(/^\d+\.?\d*$/, 'Quantity must be a valid number string'),
  price: z
    .string()
    .regex(/^\d+\.?\d*$/, 'Price must be a valid number string')
    .optional(),
  value: z.string().regex(/^\d+\.?\d*$/, 'Value must be a valid number string'),
  fee: z
    .string()
    .regex(/^\d+\.?\d*$/, 'Fee must be a valid number string')
    .optional(),
  feeAsset: z.string().optional(),
  timestamp: z.string().datetime(),
  orderId: z.string().optional(),
  notes: z.string().optional(),
});

// Portfolio Summary Schema
export const PortfolioSummarySchema = z.object({
  totalValue: z.string().regex(/^\d+\.?\d*$/, 'Total value must be a valid number string'),
  totalBalance: z.string().regex(/^\d+\.?\d*$/, 'Total balance must be a valid number string'),
  totalPositions: z.number().int().min(0),
  totalPnl: z.string().regex(/^-?\d+\.?\d*$/, 'Total PnL must be a valid number string'),
  totalPnlPercent: z.number(),
  topHoldings: z
    .array(
      z.object({
        asset: z.string(),
        value: z.string(),
        percentage: z.number(),
      })
    )
    .max(10),
  timestamp: z.string().datetime(),
});

// Portfolio Metrics Schema
export const PortfolioMetricsSchema = z.object({
  totalValue: z.string().regex(/^\d+\.?\d*$/, 'Total value must be a valid number string'),
  totalPnl: z.string().regex(/^-?\d+\.?\d*$/, 'Total PnL must be a valid number string'),
  totalPnlPercent: z.number(),
  sharpeRatio: z.number().optional(),
  maxDrawdown: z.number().optional(),
  winRate: z.number().min(0).max(100).optional(),
  averageWin: z
    .string()
    .regex(/^\d+\.?\d*$/, 'Average win must be a valid number string')
    .optional(),
  averageLoss: z
    .string()
    .regex(/^\d+\.?\d*$/, 'Average loss must be a valid number string')
    .optional(),
  profitFactor: z.number().optional(),
  totalTrades: z.number().int().min(0).optional(),
  timestamp: z.string().datetime(),
});

// Balance History Schema
export const BalanceHistorySchema = z.object({
  period: z.enum(['1h', '4h', '1d', '1w', '1M']),
  dataPoints: z.array(
    z.object({
      timestamp: z.string().datetime(),
      value: z.string().regex(/^\d+\.?\d*$/, 'Value must be a valid number string'),
      change: z.string().regex(/^-?\d+\.?\d*$/, 'Change must be a valid number string'),
      changePercent: z.number(),
    })
  ),
  totalValue: z.string().regex(/^\d+\.?\d*$/, 'Total value must be a valid number string'),
  change24h: z.string().regex(/^-?\d+\.?\d*$/, 'Change 24h must be a valid number string'),
  changePercent24h: z.number(),
  timestamp: z.string().datetime(),
});

// Transaction History Query Schema
export const TransactionHistoryQuerySchema = z.object({
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
  type: z.enum(['trade', 'deposit', 'withdrawal', 'fee', 'dividend', 'interest']).optional(),
  symbol: z.string().optional(),
  side: z.enum(['buy', 'sell']).optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  sortBy: z.enum(['timestamp', 'value', 'quantity']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Transaction History Response Schema
export const TransactionHistoryResponseSchema = z.object({
  transactions: z.array(TransactionRecordSchema),
  total: z.number().int().min(0),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
  hasMore: z.boolean(),
  timestamp: z.string().datetime(),
});

// Risk Metrics Schema
export const RiskMetricsSchema = z.object({
  valueAtRisk: z.number().optional(),
  expectedShortfall: z.number().optional(),
  beta: z.number().optional(),
  volatility: z.number().optional(),
  correlation: z.record(z.number()).optional(),
  timestamp: z.string().datetime(),
});

// Position Metrics Schema
export const PositionMetricsSchema = z.object({
  totalPositions: z.number().int().min(0),
  totalMarketValue: z
    .string()
    .regex(/^\d+\.?\d*$/, 'Total market value must be a valid number string'),
  totalUnrealizedPnl: z
    .string()
    .regex(/^-?\d+\.?\d*$/, 'Total unrealized PnL must be a valid number string'),
  profitablePositions: z.number().int().min(0),
  losingPositions: z.number().int().min(0),
  largestPosition: z
    .object({
      symbol: z.string(),
      value: z.string(),
      percentage: z.number(),
    })
    .optional(),
  timestamp: z.string().datetime(),
});

// Balance Update Schema
export const BalanceUpdateSchema = z.object({
  asset: z.string().min(1, 'Asset is required'),
  previousBalance: z
    .string()
    .regex(/^\d+\.?\d*$/, 'Previous balance must be a valid number string'),
  newBalance: z.string().regex(/^\d+\.?\d*$/, 'New balance must be a valid number string'),
  change: z.string().regex(/^-?\d+\.?\d*$/, 'Change must be a valid number string'),
  changePercent: z.number(),
  timestamp: z.string().datetime(),
});

// Portfolio Tool Arguments Schemas
export const GetBalancesArgsSchema = z.object({
  includeZero: z.boolean().default(false),
  assets: z.array(z.string()).optional(),
  refresh: z.boolean().default(false),
});

export const GetPositionsArgsSchema = z.object({
  symbols: z.array(z.string()).optional(),
  minValue: z.number().min(0).optional(),
  refresh: z.boolean().default(false),
});

export const GetTransactionHistoryArgsSchema = TransactionHistoryQuerySchema;

export const GetPortfolioSummaryArgsSchema = z.object({
  includeMetrics: z.boolean().default(true),
  refresh: z.boolean().default(false),
});

export const GetBalanceHistoryArgsSchema = z.object({
  period: z.enum(['1h', '4h', '1d', '1w', '1M']).default('1d'),
  limit: z.number().int().min(1).max(1000).default(24),
});

export const GetRiskMetricsArgsSchema = z.object({
  period: z.enum(['1d', '7d', '30d']).default('30d'),
  refresh: z.boolean().default(false),
});

// Export all types
export type PortfolioBalance = z.infer<typeof PortfolioBalanceSchema>;
export type PortfolioPosition = z.infer<typeof PortfolioPositionSchema>;
export type TransactionRecord = z.infer<typeof TransactionRecordSchema>;
export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>;
export type PortfolioMetrics = z.infer<typeof PortfolioMetricsSchema>;
export type BalanceHistory = z.infer<typeof BalanceHistorySchema>;
export type TransactionHistoryQuery = z.infer<typeof TransactionHistoryQuerySchema>;
export type TransactionHistoryResponse = z.infer<typeof TransactionHistoryResponseSchema>;
export type RiskMetrics = z.infer<typeof RiskMetricsSchema>;
export type PositionMetrics = z.infer<typeof PositionMetricsSchema>;
export type BalanceUpdate = z.infer<typeof BalanceUpdateSchema>;

// Tool argument types
export type GetBalancesArgs = z.infer<typeof GetBalancesArgsSchema>;
export type GetPositionsArgs = z.infer<typeof GetPositionsArgsSchema>;
export type GetTransactionHistoryArgs = z.infer<typeof GetTransactionHistoryArgsSchema>;
export type GetPortfolioSummaryArgs = z.infer<typeof GetPortfolioSummaryArgsSchema>;
export type GetBalanceHistoryArgs = z.infer<typeof GetBalanceHistoryArgsSchema>;
export type GetRiskMetricsArgs = z.infer<typeof GetRiskMetricsArgsSchema>;

// Cache configuration
export interface CacheConfig {
  balanceTtl: number; // milliseconds
  positionTtl: number; // milliseconds
  priceTtl: number; // milliseconds
  maxCacheSize: number;
}

// Price cache entry
export interface PriceCacheEntry {
  symbol: string;
  price: string;
  timestamp: number;
}

// Balance cache entry
export interface BalanceCacheEntry {
  balances: PortfolioBalance[];
  timestamp: number;
}

// Position cache entry
export interface PositionCacheEntry {
  positions: PortfolioPosition[];
  timestamp: number;
}

// Error types
export class PortfolioError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'PortfolioError';
  }
}

export class BalanceError extends PortfolioError {
  constructor(message: string, cause?: Error) {
    super(message, 'BALANCE_ERROR', cause);
    this.name = 'BalanceError';
  }
}

export class PositionError extends PortfolioError {
  constructor(message: string, cause?: Error) {
    super(message, 'POSITION_ERROR', cause);
    this.name = 'PositionError';
  }
}

export class PriceError extends PortfolioError {
  constructor(message: string, cause?: Error) {
    super(message, 'PRICE_ERROR', cause);
    this.name = 'PriceError';
  }
}

export class TransactionError extends PortfolioError {
  constructor(message: string, cause?: Error) {
    super(message, 'TRANSACTION_ERROR', cause);
    this.name = 'TransactionError';
  }
}

// Utility types
export type PortfolioDataRefreshOptions = {
  forceRefresh?: boolean;
  skipCache?: boolean;
  maxAge?: number;
};

export type BalanceFilter = {
  assets?: string[];
  includeZero?: boolean;
  minValue?: number;
};

export type PositionFilter = {
  symbols?: string[];
  minValue?: number;
  side?: 'long' | 'short';
};

// Event types for real-time updates
export type PortfolioEventType =
  | 'balance_updated'
  | 'position_changed'
  | 'transaction_added'
  | 'price_updated';

export interface PortfolioEvent {
  type: PortfolioEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

// Trading pair information
export interface TradingPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: 'TRADING' | 'BREAK' | 'AUCTION_MATCH';
  minQty: string;
  maxQty: string;
  stepSize: string;
  minNotional: string;
}

// Market data for calculations
export interface MarketData {
  symbol: string;
  price: string;
  change24h: string;
  changePercent24h: number;
  volume24h: string;
  high24h: string;
  low24h: string;
  timestamp: string;
}
