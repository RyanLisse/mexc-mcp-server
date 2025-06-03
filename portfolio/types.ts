// Portfolio Balance Interface
export interface PortfolioBalance {
  asset: string;
  free: string;
  locked: string;
  total: string;
  usdValue: string;
  percentage: number;
  timestamp: string;
}

// Portfolio Position Interface  
export interface PortfolioPosition {
  symbol: string;
  asset: string;
  quantity: string;
  averagePrice: string;
  currentPrice: string;
  marketValue: string;
  unrealizedPnl: string;
  unrealizedPnlPercent: number;
  cost: string;
  side: 'long' | 'short';
  timestamp: string;
}

// Transaction Record Interface
export interface TransactionRecord {
  id: string;
  type: 'trade' | 'deposit' | 'withdrawal' | 'fee' | 'dividend' | 'interest';
  symbol?: string;
  side?: 'buy' | 'sell';
  quantity: string;
  price?: string;
  value: string;
  fee?: string;
  feeAsset?: string;
  timestamp: string;
  orderId?: string;
  notes?: string;
}

// Portfolio Summary Interface
export interface PortfolioSummary {
  totalValue: string;
  totalBalance: string;
  totalPositions: number;
  totalPnl: string;
  totalPnlPercent: number;
  topHoldings: Array<{
    asset: string;
    value: string;
    percentage: number;
  }>;
  timestamp: string;
}

// Portfolio Metrics Interface
export interface PortfolioMetrics {
  totalValue: string;
  totalPnl: string;
  totalPnlPercent: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  winRate?: number;
  averageWin?: string;
  averageLoss?: string;
  profitFactor?: number;
  totalTrades?: number;
  timestamp: string;
}

// Balance History Interface
export interface BalanceHistory {
  period: '1h' | '4h' | '1d' | '1w' | '1M';
  dataPoints: Array<{
    timestamp: string;
    value: string;
    change: string;
    changePercent: number;
  }>;
  totalValue: string;
  change24h: string;
  changePercent24h: number;
  timestamp: string;
}

// Transaction History Query Interface
export interface TransactionHistoryQuery {
  limit?: number;
  offset?: number;
  type?: 'trade' | 'deposit' | 'withdrawal' | 'fee' | 'dividend' | 'interest';
  symbol?: string;
  side?: 'buy' | 'sell';
  startTime?: number;
  endTime?: number;
  sortBy?: 'timestamp' | 'value' | 'quantity';
  sortOrder?: 'asc' | 'desc';
}

// Transaction History Response Interface
export interface TransactionHistoryResponse {
  transactions: TransactionRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  timestamp: string;
}

// Risk Metrics Interface
export interface RiskMetrics {
  valueAtRisk?: number;
  expectedShortfall?: number;
  beta?: number;
  volatility?: number;
  correlation?: Record<string, number>;
  timestamp: string;
}

// Position Metrics Interface
export interface PositionMetrics {
  totalPositions: number;
  totalMarketValue: string;
  totalUnrealizedPnl: string;
  profitablePositions: number;
  losingPositions: number;
  largestPosition?: {
    symbol: string;
    value: string;
    percentage: number;
  };
  timestamp: string;
}

// Balance Update Interface
export interface BalanceUpdate {
  asset: string;
  previousBalance: string;
  newBalance: string;
  change: string;
  changePercent: number;
  timestamp: string;
}

// Portfolio Tool Arguments Interfaces
export interface GetBalancesArgs {
  includeZero?: boolean;
  assets?: string[];
  refresh?: boolean;
}

export interface GetPositionsArgs {
  symbols?: string[];
  minValue?: number;
  refresh?: boolean;
}

export interface GetTransactionHistoryArgs extends TransactionHistoryQuery {}

export interface GetPortfolioSummaryArgs {
  includeMetrics?: boolean;
  refresh?: boolean;
}

export interface GetBalanceHistoryArgs {
  period?: '1h' | '4h' | '1d' | '1w' | '1M';
  limit?: number;
}

export interface GetRiskMetricsArgs {
  period?: '1d' | '7d' | '30d';
  refresh?: boolean;
}

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
