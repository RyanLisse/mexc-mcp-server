/**
 * Trading Operations Service
 * Core service for executing trading operations via MEXC API
 */

import { Service } from 'encore.dev/service';
import { mexcClient } from '../market-data/mexc-client';
import type {
  BatchOrderArgs,
  CancelOrderArgs,
  GetOrderHistoryArgs,
  GetOrderStatusArgs,
  OrderStatusType,
  PlaceOrderArgs,
} from './schemas';
import type {
  BatchOrderResult,
  MarketConditions,
  Order,
  OrderCancellationResult,
  OrderExecutionResult,
  OrderHistoryResult,
  OrderValidationResult,
  TradingPair,
  TradingSafetyConfig,
  TradingStatistics,
} from './types';

// Import error classes as constructors (not types)
import { InsufficientBalanceError, OrderExecutionError, TradingValidationError } from './types';
// import { config } from '../shared/config'; // Disabled for service-specific config

export default new Service('trading');

/**
 * Convert MEXC API status to our OrderStatusType
 */
function convertMexcStatus(mexcStatus: string): OrderStatusType {
  const statusMap: Record<string, OrderStatusType> = {
    FILLED: 'filled',
    PARTIALLY_FILLED: 'partially_filled',
    CANCELED: 'cancelled',
    CANCELLED: 'cancelled',
    PENDING: 'pending',
    NEW: 'open',
    OPEN: 'open',
    REJECTED: 'rejected',
    EXPIRED: 'expired',
  };

  return statusMap[mexcStatus.toUpperCase()] || 'pending';
}

/**
 * Trading service configuration
 */
const TRADING_CONFIG: TradingSafetyConfig = {
  enableTestMode: process.env.NODE_ENV !== 'production',
  maxOrderValue: 10000, // USD
  maxDailyTradingVolume: 50000, // USD
  priceDeviationThreshold: 5, // percentage
  requireConfirmation: true,
  enablePositionLimits: true,
  maxPositionSize: 25000, // USD
  allowedTradingPairs: [], // empty = all allowed
  blockedTradingPairs: [], // high-risk pairs
};

/**
 * Cache for trading data
 */
const tradingPairCache = new Map<string, TradingPair>();
const orderCache = new Map<string, Order>();
let cacheExpiry = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Trading operations service
 */
export const tradingService = {
  /**
   * Place a new order
   */
  placeOrder: async (args: PlaceOrderArgs): Promise<OrderExecutionResult> => {
    try {
      // Validate order
      const validation = await tradingService.validateOrder(args);
      if (!validation.isValid) {
        throw new TradingValidationError(
          'order_validation',
          validation.errors.map((e) => e.message).join(', '),
          validation.errors
        );
      }

      // Check if test mode
      if (args.testMode || TRADING_CONFIG.enableTestMode) {
        return simulateOrderExecution(args);
      }

      // Get trading pair info
      const pairInfo = await getTradingPairInfo(args.symbol);
      if (!pairInfo) {
        throw new TradingValidationError('symbol', `Invalid trading pair: ${args.symbol}`);
      }

      // Check balance
      const balanceCheck = await checkTradingBalance(args);
      if (!balanceCheck.hasEnoughBalance) {
        throw new InsufficientBalanceError(
          balanceCheck.asset,
          balanceCheck.requiredBalance,
          balanceCheck.availableBalance
        );
      }

      // Prepare order parameters
      const orderParams = {
        symbol: args.symbol.replace('_', ''),
        side: args.side.toUpperCase(),
        type: args.type.toUpperCase(),
        quantity: args.quantity,
        ...(args.price && { price: args.price }),
        ...(args.stopPrice && { stopPrice: args.stopPrice }),
        timeInForce: args.timeInForce || 'GTC',
        ...(args.clientOrderId && { newClientOrderId: args.clientOrderId }),
      };

      // Execute order via MEXC API
      const response = await mexcClient.placeOrder(orderParams);

      // Create order result
      const result: OrderExecutionResult = {
        success: true,
        orderId: response.orderId,
        clientOrderId: args.clientOrderId,
        status: convertMexcStatus(response.status),
        filledQuantity: response.executedQty || '0',
        averagePrice: response.price,
        timestamp: Date.now(),
        message: 'Order placed successfully',
      };

      // Cache the order
      const order: Order = {
        orderId: response.orderId,
        clientOrderId: args.clientOrderId,
        symbol: args.symbol,
        side: args.side,
        type: args.type,
        status: convertMexcStatus(response.status),
        quantity: args.quantity.toString(),
        price: args.price?.toString(),
        stopPrice: args.stopPrice?.toString(),
        filledQuantity: response.executedQty || '0',
        averagePrice: response.price,
        timeInForce: args.timeInForce || 'GTC',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      orderCache.set(response.orderId, order);

      return result;
    } catch (error) {
      if (error instanceof TradingValidationError || error instanceof InsufficientBalanceError) {
        throw error;
      }

      console.error('Order placement failed:', error);
      throw new OrderExecutionError(
        args.clientOrderId || 'unknown',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  },

  /**
   * Cancel an existing order
   */
  cancelOrder: async (args: CancelOrderArgs): Promise<OrderCancellationResult> => {
    try {
      const cancelParams = {
        symbol: args.symbol.replace('_', ''),
        ...(args.orderId && { orderId: args.orderId }),
        ...(args.clientOrderId && { origClientOrderId: args.clientOrderId }),
      };

      const response = await mexcClient.cancelOrder(cancelParams);

      const result: OrderCancellationResult = {
        success: true,
        orderId: response.orderId,
        clientOrderId: response.origClientOrderId,
        symbol: args.symbol,
        status: convertMexcStatus(response.status),
        cancelledQuantity: response.origQty,
        timestamp: Date.now(),
        message: 'Order cancelled successfully',
      };

      // Update cache
      if (orderCache.has(response.orderId)) {
        const order = orderCache.get(response.orderId)!;
        order.status = 'cancelled';
        order.updatedAt = Date.now();
        orderCache.set(response.orderId, order);
      }

      return result;
    } catch (error) {
      console.error('Order cancellation failed:', error);
      throw new OrderExecutionError(
        args.orderId || args.clientOrderId || 'unknown',
        error instanceof Error ? error.message : 'Cancellation failed'
      );
    }
  },

  /**
   * Get order status
   */
  getOrderStatus: async (args: GetOrderStatusArgs): Promise<Order> => {
    try {
      // Check cache first
      if (args.orderId && orderCache.has(args.orderId)) {
        const cached = orderCache.get(args.orderId)!;
        if (Date.now() - cached.updatedAt < 30000) {
          // 30 second cache
          return cached;
        }
      }

      const queryParams = {
        symbol: args.symbol.replace('_', ''),
        ...(args.orderId && { orderId: args.orderId }),
        ...(args.clientOrderId && { origClientOrderId: args.clientOrderId }),
      };

      const response = await mexcClient.getOrder(queryParams);

      const order: Order = {
        orderId: response.orderId,
        clientOrderId: response.clientOrderId,
        symbol: args.symbol,
        side: response.side.toLowerCase() as any,
        type: response.type.toLowerCase() as any,
        status: convertMexcStatus(response.status),
        quantity: response.origQty,
        price: response.price,
        stopPrice: response.stopPrice,
        filledQuantity: response.executedQty,
        averagePrice: response.avgPrice,
        timeInForce: response.timeInForce as any,
        createdAt: response.time,
        updatedAt: response.updateTime || response.time,
        fee: response.commission,
        feeAsset: response.commissionAsset,
      };

      // Update cache
      orderCache.set(order.orderId, order);

      return order;
    } catch (error) {
      console.error('Get order status failed:', error);
      throw new OrderExecutionError(
        args.orderId || args.clientOrderId || 'unknown',
        error instanceof Error ? error.message : 'Failed to get order status'
      );
    }
  },

  /**
   * Get order history
   */
  getOrderHistory: async (args: GetOrderHistoryArgs = {}): Promise<OrderHistoryResult> => {
    try {
      const queryParams = {
        ...(args.symbol && { symbol: args.symbol.replace('_', '') }),
        ...(args.startTime && { startTime: args.startTime }),
        ...(args.endTime && { endTime: args.endTime }),
        limit: args.limit || 100,
      };

      const response = await mexcClient.getAllOrders(queryParams);

      // Filter by status if provided
      let filteredOrders = response;
      if (args.status) {
        filteredOrders = response.filter(
          (order: any) => convertMexcStatus(order.status) === args.status
        );
      }

      // Apply pagination
      const startIndex = ((args.page || 1) - 1) * (args.limit || 100);
      const endIndex = startIndex + (args.limit || 100);
      const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

      const orders: Order[] = paginatedOrders.map((order: any) => ({
        orderId: order.orderId,
        clientOrderId: order.clientOrderId,
        symbol: args.symbol || order.symbol,
        side: order.side.toLowerCase() as any,
        type: order.type.toLowerCase() as any,
        status: convertMexcStatus(order.status),
        quantity: order.origQty,
        price: order.price,
        stopPrice: order.stopPrice,
        filledQuantity: order.executedQty,
        averagePrice: order.avgPrice,
        timeInForce: order.timeInForce as any,
        createdAt: order.time,
        updatedAt: order.updateTime || order.time,
        fee: order.commission,
        feeAsset: order.commissionAsset,
      }));

      return {
        orders,
        totalCount: filteredOrders.length,
        currentPage: args.page || 1,
        totalPages: Math.ceil(filteredOrders.length / (args.limit || 100)),
        hasMore: endIndex < filteredOrders.length,
      };
    } catch (error) {
      console.error('Get order history failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get order history');
    }
  },

  /**
   * Validate order before execution
   */
  validateOrder: async (args: PlaceOrderArgs): Promise<OrderValidationResult> => {
    const errors: Array<{ field: string; message: string; code?: string }> = [];
    const warnings: Array<{ field: string; message: string; severity: 'low' | 'medium' | 'high' }> =
      [];

    try {
      // Get trading pair info
      const pairInfo = await getTradingPairInfo(args.symbol);
      if (!pairInfo) {
        errors.push({
          field: 'symbol',
          message: `Trading pair ${args.symbol} not found`,
          code: 'INVALID_SYMBOL',
        });
        return { isValid: false, errors, warnings };
      }

      // Validate quantity
      const quantity = Number(args.quantity);
      const minQty = Number(pairInfo.minOrderQuantity);
      const maxQty = Number(pairInfo.maxOrderQuantity);

      if (quantity < minQty) {
        errors.push({
          field: 'quantity',
          message: `Quantity ${quantity} is below minimum ${minQty}`,
          code: 'MIN_QUANTITY',
        });
      }

      if (quantity > maxQty) {
        errors.push({
          field: 'quantity',
          message: `Quantity ${quantity} exceeds maximum ${maxQty}`,
          code: 'MAX_QUANTITY',
        });
      }

      // Validate price for limit orders
      if (args.type === 'limit' && args.price) {
        const price = Number(args.price);
        const minPrice = Number(pairInfo.minPrice);
        const maxPrice = Number(pairInfo.maxPrice);

        if (price < minPrice) {
          errors.push({
            field: 'price',
            message: `Price ${price} is below minimum ${minPrice}`,
            code: 'MIN_PRICE',
          });
        }

        if (price > maxPrice) {
          errors.push({
            field: 'price',
            message: `Price ${price} exceeds maximum ${maxPrice}`,
            code: 'MAX_PRICE',
          });
        }

        // Check price deviation
        const marketConditions = await getMarketConditions(args.symbol);
        const currentPrice = Number(marketConditions.currentPrice);
        const deviation = Math.abs((price - currentPrice) / currentPrice) * 100;

        if (deviation > TRADING_CONFIG.priceDeviationThreshold) {
          warnings.push({
            field: 'price',
            message: `Price deviates ${deviation.toFixed(2)}% from market price`,
            severity: deviation > 10 ? 'high' : 'medium',
          });
        }
      }

      // Validate order value
      const orderValue = args.price
        ? Number(args.quantity) * Number(args.price)
        : Number(args.quantity) * Number((await getMarketConditions(args.symbol)).currentPrice);

      if (orderValue > TRADING_CONFIG.maxOrderValue) {
        warnings.push({
          field: 'value',
          message: `Order value $${orderValue.toFixed(2)} exceeds recommended maximum $${TRADING_CONFIG.maxOrderValue}`,
          severity: 'high',
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        estimatedCost: orderValue.toFixed(2),
        estimatedFee: (orderValue * 0.001).toFixed(4), // 0.1% estimated fee
      };
    } catch (error) {
      console.error('Order validation failed:', error);
      errors.push({
        field: 'validation',
        message: 'Validation service error',
        code: 'VALIDATION_ERROR',
      });

      return { isValid: false, errors, warnings };
    }
  },

  /**
   * Execute multiple orders in batch
   */
  batchOrder: async (args: BatchOrderArgs): Promise<BatchOrderResult> => {
    const startTime = Date.now();
    const results: Array<{
      index: number;
      success: boolean;
      orderId?: string;
      clientOrderId?: string;
      error?: string;
    }> = [];

    let successfulOrders = 0;
    let failedOrders = 0;

    for (let i = 0; i < args.orders.length; i++) {
      const order = args.orders[i];
      try {
        const result = await tradingService.placeOrder({
          ...order,
          testMode: args.testMode,
        });

        results.push({
          index: i,
          success: result.success,
          orderId: result.orderId,
          clientOrderId: order.clientOrderId,
        });

        if (result.success) {
          successfulOrders++;
        } else {
          failedOrders++;
        }
      } catch (error) {
        results.push({
          index: i,
          success: false,
          clientOrderId: order.clientOrderId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failedOrders++;
      }
    }

    return {
      success: failedOrders === 0,
      totalOrders: args.orders.length,
      successfulOrders,
      failedOrders,
      results,
      executionTime: Date.now() - startTime,
    };
  },

  /**
   * Get trading statistics
   */
  getTradingStatistics: async (timeframe = '24h'): Promise<TradingStatistics> => {
    try {
      // This would typically query the database for historical data
      // For now, return mock statistics
      return {
        totalOrders: 0,
        successfulOrders: 0,
        cancelledOrders: 0,
        rejectedOrders: 0,
        totalVolume: '0',
        totalFees: '0',
        profitLoss: '0',
        winRate: 0,
        averageOrderSize: '0',
        mostTradedPair: 'BTC_USDT',
        timeframe,
      };
    } catch (error) {
      console.error('Get trading statistics failed:', error);
      throw new Error('Failed to get trading statistics');
    }
  },
};

/**
 * Helper function to get trading pair information
 */
async function getTradingPairInfo(symbol: string): Promise<TradingPair | null> {
  try {
    if (tradingPairCache.has(symbol) && Date.now() < cacheExpiry) {
      return tradingPairCache.get(symbol)!;
    }

    const exchangeInfo = await mexcClient.getExchangeInfo();
    const pairInfo = exchangeInfo.symbols.find((s: any) => s.symbol === symbol.replace('_', ''));

    if (!pairInfo) return null;

    const tradingPair: TradingPair = {
      symbol,
      baseAsset: pairInfo.baseAsset,
      quoteAsset: pairInfo.quoteAsset,
      status: pairInfo.status === 'TRADING' ? 'active' : 'inactive',
      minOrderQuantity:
        pairInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE')?.minQty || '0',
      maxOrderQuantity:
        pairInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE')?.maxQty || '0',
      minPrice: pairInfo.filters.find((f: any) => f.filterType === 'PRICE_FILTER')?.minPrice || '0',
      maxPrice: pairInfo.filters.find((f: any) => f.filterType === 'PRICE_FILTER')?.maxPrice || '0',
      tickSize: pairInfo.filters.find((f: any) => f.filterType === 'PRICE_FILTER')?.tickSize || '0',
      stepSize: pairInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE')?.stepSize || '0',
      minNotional:
        pairInfo.filters.find((f: any) => f.filterType === 'MIN_NOTIONAL')?.minNotional || '0',
      maxNotional: '0',
      fees: {
        maker: '0.002',
        taker: '0.002',
      },
    };

    tradingPairCache.set(symbol, tradingPair);
    cacheExpiry = Date.now() + CACHE_TTL;

    return tradingPair;
  } catch (error) {
    console.error('Get trading pair info failed:', error);
    return null;
  }
}

/**
 * Helper function to check trading balance
 */
async function checkTradingBalance(args: PlaceOrderArgs): Promise<{
  hasEnoughBalance: boolean;
  requiredBalance: string;
  availableBalance: string;
  asset: string;
}> {
  try {
    const [baseAsset, quoteAsset] = args.symbol.split('_');
    const asset = args.side === 'buy' ? quoteAsset : baseAsset;

    const account = await mexcClient.getAccount();
    const balance = account.balances.find((b: any) => b.asset === asset);

    const availableBalance = balance ? Number(balance.free) : 0;
    const requiredBalance =
      args.side === 'buy'
        ? Number(args.quantity) * (Number(args.price) || 0)
        : Number(args.quantity);

    return {
      hasEnoughBalance: availableBalance >= requiredBalance,
      requiredBalance: requiredBalance.toString(),
      availableBalance: availableBalance.toString(),
      asset,
    };
  } catch (error) {
    console.error('Balance check failed:', error);
    return {
      hasEnoughBalance: false,
      requiredBalance: '0',
      availableBalance: '0',
      asset: 'UNKNOWN',
    };
  }
}

/**
 * Helper function to get market conditions
 */
async function getMarketConditions(symbol: string): Promise<MarketConditions> {
  try {
    const tickerData = await mexcClient.getTicker24hr(symbol.replace('_', ''));
    const ticker = tickerData[0]; // getTicker24hr returns an array

    return {
      symbol,
      currentPrice: ticker.lastPrice,
      priceChange24h: ticker.priceChange,
      priceChangePercent24h: ticker.priceChangePercent,
      volume24h: ticker.volume,
      volatility:
        Math.abs(Number(ticker.priceChangePercent)) > 10
          ? 'high'
          : Math.abs(Number(ticker.priceChangePercent)) > 5
            ? 'medium'
            : 'low',
      liquidityScore: 0.8, // Mock score
      recommendedOrderSize: (Number(ticker.volume) * 0.001).toString(),
      warningFlags: [],
    };
  } catch (error) {
    console.error('Get market conditions failed:', error);
    return {
      symbol,
      currentPrice: '0',
      priceChange24h: '0',
      priceChangePercent24h: '0',
      volume24h: '0',
      volatility: 'low',
      liquidityScore: 0,
      recommendedOrderSize: '0',
      warningFlags: ['DATA_UNAVAILABLE'],
    };
  }
}

/**
 * Helper function to simulate order execution in test mode
 */
function simulateOrderExecution(args: PlaceOrderArgs): OrderExecutionResult {
  const orderId = `TEST_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  return {
    success: true,
    orderId,
    clientOrderId: args.clientOrderId,
    status: args.type === 'market' ? 'filled' : 'open',
    filledQuantity: args.type === 'market' ? args.quantity.toString() : '0',
    averagePrice: args.price?.toString(),
    timestamp: Date.now(),
    message: 'Order simulated successfully (TEST MODE)',
  };
}
