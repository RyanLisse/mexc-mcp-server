/**
 * Trading Operations Types
 * TypeScript interfaces for trading operations
 */

import type { 
  OrderSideType, 
  OrderTypeType, 
  OrderStatusType, 
  TimeInForceType 
} from './schemas';

/**
 * Order interface representing a trading order
 */
export interface Order {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSideType;
  type: OrderTypeType;
  status: OrderStatusType;
  quantity: string;
  price?: string;
  stopPrice?: string;
  filledQuantity: string;
  averagePrice?: string;
  timeInForce: TimeInForceType;
  createdAt: number;
  updatedAt: number;
  fee?: string;
  feeAsset?: string;
}

/**
 * Order execution result
 */
export interface OrderExecutionResult {
  success: boolean;
  orderId?: string;
  clientOrderId?: string;
  status: OrderStatusType;
  filledQuantity: string;
  averagePrice?: string;
  fee?: string;
  feeAsset?: string;
  timestamp: number;
  error?: string;
  message?: string;
}

/**
 * Order book entry
 */
export interface OrderBookEntry {
  price: string;
  quantity: string;
  total?: string;
}

/**
 * Trading pair information
 */
export interface TradingPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: 'active' | 'inactive' | 'suspended';
  minOrderQuantity: string;
  maxOrderQuantity: string;
  minPrice: string;
  maxPrice: string;
  tickSize: string;
  stepSize: string;
  minNotional: string;
  maxNotional: string;
  fees: {
    maker: string;
    taker: string;
  };
}

/**
 * Account trading information
 */
export interface TradingAccount {
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  permissions: string[];
  balances: Array<{
    asset: string;
    free: string;
    locked: string;
  }>;
}

/**
 * Trade execution details
 */
export interface Trade {
  tradeId: string;
  orderId: string;
  symbol: string;
  side: OrderSideType;
  quantity: string;
  price: string;
  fee: string;
  feeAsset: string;
  timestamp: number;
  isMaker: boolean;
}

/**
 * Order validation result
 */
export interface OrderValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  estimatedCost?: string;
  estimatedFee?: string;
  balanceCheck?: {
    hasEnoughBalance: boolean;
    requiredBalance: string;
    availableBalance: string;
    asset: string;
  };
}

/**
 * Trading limits and restrictions
 */
export interface TradingLimits {
  dailyTradingLimit: string;
  dailyTradingUsed: string;
  maxOrderSize: string;
  maxOrderValue: string;
  allowedOrderTypes: OrderTypeType[];
  priceDeviationLimit: number; // percentage
  rateLimits: {
    ordersPerSecond: number;
    ordersPerMinute: number;
    ordersPerHour: number;
  };
}

/**
 * Order cancellation result
 */
export interface OrderCancellationResult {
  success: boolean;
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  status: OrderStatusType;
  cancelledQuantity: string;
  timestamp: number;
  error?: string;
  message?: string;
}

/**
 * Batch order operation result
 */
export interface BatchOrderResult {
  success: boolean;
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  results: Array<{
    index: number;
    success: boolean;
    orderId?: string;
    clientOrderId?: string;
    error?: string;
  }>;
  executionTime: number;
}

/**
 * Order history filter and result
 */
export interface OrderHistoryFilter {
  symbol?: string;
  status?: OrderStatusType;
  startTime?: number;
  endTime?: number;
  limit?: number;
  page?: number;
}

export interface OrderHistoryResult {
  orders: Order[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Trading safety configuration
 */
export interface TradingSafetyConfig {
  enableTestMode: boolean;
  maxOrderValue: number;
  maxDailyTradingVolume: number;
  priceDeviationThreshold: number;
  requireConfirmation: boolean;
  enablePositionLimits: boolean;
  maxPositionSize: number;
  allowedTradingPairs: string[];
  blockedTradingPairs: string[];
}

/**
 * Market conditions for order validation
 */
export interface MarketConditions {
  symbol: string;
  currentPrice: string;
  priceChange24h: string;
  priceChangePercent24h: string;
  volume24h: string;
  volatility: 'low' | 'medium' | 'high';
  liquidityScore: number;
  recommendedOrderSize: string;
  warningFlags: string[];
}

/**
 * Order modification request
 */
export interface OrderModificationRequest {
  orderId: string;
  symbol: string;
  newQuantity?: string;
  newPrice?: string;
  newStopPrice?: string;
  newTimeInForce?: TimeInForceType;
}

/**
 * Trading statistics
 */
export interface TradingStatistics {
  totalOrders: number;
  successfulOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  totalVolume: string;
  totalFees: string;
  profitLoss: string;
  winRate: number;
  averageOrderSize: string;
  mostTradedPair: string;
  timeframe: string;
}

/**
 * Error types for trading operations
 */
export interface TradingError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
  orderId?: string;
  symbol?: string;
}

export class TradingValidationError extends Error {
  constructor(
    public field: string,
    message: string,
    public validationErrors?: Array<{
      field: string;
      message: string;
      code?: string;
    }>
  ) {
    super(`Trading validation failed for '${field}': ${message}`);
    this.name = 'TradingValidationError';
  }
}

export class OrderExecutionError extends Error {
  constructor(
    public orderId: string,
    message: string,
    public errorCode?: string,
    public details?: Record<string, unknown>
  ) {
    super(`Order execution failed for order '${orderId}': ${message}`);
    this.name = 'OrderExecutionError';
  }
}

export class InsufficientBalanceError extends Error {
  constructor(
    public asset: string,
    public required: string,
    public available: string
  ) {
    super(`Insufficient balance for ${asset}. Required: ${required}, Available: ${available}`);
    this.name = 'InsufficientBalanceError';
  }
}