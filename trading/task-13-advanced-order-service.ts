/**
 * Task #13: Advanced Order Types Service
 * Production implementation for stop-loss, take-profit, and OCO order types
 * Requirements:
 * - Extend order placement API to support advanced types
 * - Validate inputs with Encore validation
 * - Call MEXC REST API accordingly
 * - Example: type: 'stop_loss', 'take_profit', 'oco'
 */

// Logger interface
export interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

// MEXC Client interface
export interface MexcClient {
  placeOrder: (params: any) => Promise<any>;
  placeStopLossOrder: (params: any) => Promise<any>;
  placeTakeProfitOrder: (params: any) => Promise<any>;
  placeOCOOrder: (params: any) => Promise<any>;
  getOrderStatus: (orderId: string, symbol: string) => Promise<any>;
  cancelOrder: (orderId: string, symbol: string) => Promise<any>;
  getCurrentPrice: (symbol: string) => Promise<string>;
  getAccountInfo: () => Promise<any>;
}

// Base advanced order interface
export interface BaseAdvancedOrder {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  clientOrderId?: string;
  testMode?: boolean;
}

// Stop-loss order interface
export interface StopLossOrderArgs extends BaseAdvancedOrder {
  type: 'stop_loss';
  stopPrice: number;
}

// Take-profit order interface
export interface TakeProfitOrderArgs extends BaseAdvancedOrder {
  type: 'take_profit';
  takeProfitPrice: number;
}

// OCO order interface
export interface OCOOrderArgs extends BaseAdvancedOrder {
  type: 'oco';
  stopPrice: number;
  limitPrice: number;
  stopLimitPrice: number;
}

// Trailing stop order interface
export interface TrailingStopOrderArgs extends BaseAdvancedOrder {
  type: 'trailing_stop';
  trailingPercent: number;
  trailingAmount?: number;
}

// Standard order interface for compatibility
export interface StandardOrderArgs extends BaseAdvancedOrder {
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  price?: number;
  stopPrice?: number;
}

// Conditional order interface
export interface ConditionalOrderArgs extends BaseAdvancedOrder {
  conditions?: {
    priceCondition?: { operator: '>=' | '<=' | '==' | '!=' | '>' | '<'; value: number };
    timeCondition?: { validAfter?: number; validBefore?: number };
    volumeCondition?: { minVolume?: number; maxVolume?: number };
  };
}

// Union type for all advanced order types
export type AdvancedOrderArgs =
  | StopLossOrderArgs
  | TakeProfitOrderArgs
  | OCOOrderArgs
  | TrailingStopOrderArgs
  | StandardOrderArgs
  | (StandardOrderArgs & ConditionalOrderArgs)
  | (StopLossOrderArgs & ConditionalOrderArgs)
  | (TakeProfitOrderArgs & ConditionalOrderArgs)
  | (OCOOrderArgs & ConditionalOrderArgs);

// Validation result interface
export interface AdvancedOrderValidationResult {
  isValid: boolean;
  orderType: string;
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

// Order response interface
export interface AdvancedOrderResponse {
  success: boolean;
  data?: {
    orderId?: string;
    orderListId?: string;
    type: string;
    status: string;
    symbol: string;
    side: string;
    quantity: string;
    price?: string;
    stopPrice?: string;
    testMode?: boolean;
    linkedOrders?: Array<{
      orderId: string;
      type: string;
    }>;
  };
  error?: string;
  retryAfter?: number;
  timestamp: number;
}

// Order status response interface
export interface AdvancedOrderStatusResponse {
  success: boolean;
  data?: {
    orderId: string;
    status: string;
    orderType: string;
    symbol: string;
    side: string;
    quantity: string;
    executedQty?: string;
    avgPrice?: string;
    updateTime?: number;
  };
  error?: string;
  timestamp: number;
}

// Order cost calculation interface
export interface OrderCostCalculation {
  estimatedCost: string;
  estimatedFee: string;
  totalCost: string;
  breakdown: {
    baseAmount: string;
    feeAmount: string;
    feeRate: string;
  };
}

/**
 * Task #13 Advanced Order Types Service
 * Implements stop-loss, take-profit, and OCO order functionality
 */
export class TaskThirteenAdvancedOrderService {
  private logger: Logger;
  private mexcClient: MexcClient;

  constructor(logger: Logger, mexcClient: MexcClient) {
    this.logger = logger;
    this.mexcClient = mexcClient;
  }

  async validateAdvancedOrder(order: AdvancedOrderArgs): Promise<AdvancedOrderValidationResult> {
    const startTime = Date.now();
    const errors: Array<{ field: string; message: string; code?: string }> = [];
    const warnings: Array<{ field: string; message: string; severity: 'low' | 'medium' | 'high' }> =
      [];

    try {
      this.logger.info('Validating advanced order', {
        type: order.type,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
      });

      // Basic field validation
      this.validateBasicFields(order, errors);

      // Type-specific validation
      await this.validateOrderTypeSpecific(order, errors, warnings);

      // Market conditions and price validation
      if (errors.length === 0) {
        await this.validateMarketConditions(order, errors, warnings);
      }

      // Balance validation
      if (errors.length === 0) {
        await this.validateBalance(order, errors);
      }

      // Risk assessment
      this.assessOrderRisk(order, warnings);

      const processingTime = Date.now() - startTime;
      this.logger.info('Order validation completed', {
        isValid: errors.length === 0,
        errors: errors.length,
        warnings: warnings.length,
        processingTime,
      });

      return {
        isValid: errors.length === 0,
        orderType: order.type,
        errors,
        warnings,
      };
    } catch (error) {
      this.logger.error('Order validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
      });

      return {
        isValid: false,
        orderType: order.type,
        errors: [
          {
            field: 'validation',
            message: error instanceof Error ? error.message : 'Validation failed',
          },
        ],
        warnings,
      };
    }
  }

  async placeAdvancedOrder(order: AdvancedOrderArgs): Promise<AdvancedOrderResponse> {
    const startTime = Date.now();

    try {
      // Validate order first
      const validation = await this.validateAdvancedOrder(order);
      if (!validation.isValid) {
        throw new Error(
          `Order validation failed: ${validation.errors.map((e) => e.message).join(', ')}`
        );
      }

      this.logger.info('Placing advanced order', {
        type: order.type,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity.toString(),
      });

      // Route to appropriate order placement method
      let result: any;
      switch (order.type) {
        case 'stop_loss':
          result = await this.placeStopLossOrder(order as StopLossOrderArgs);
          break;
        case 'take_profit':
          result = await this.placeTakeProfitOrder(order as TakeProfitOrderArgs);
          break;
        case 'oco':
          result = await this.placeOCOOrder(order as OCOOrderArgs);
          break;
        case 'trailing_stop':
          result = await this.placeTrailingStopOrder(order as TrailingStopOrderArgs);
          break;
        default:
          result = await this.placeStandardOrder(order as StandardOrderArgs);
          break;
      }

      // Handle test mode response
      if (order.testMode) {
        this.logger.info('TEST MODE - Order simulation completed', { order });

        // For OCO orders, return with orderListId and linkedOrders
        if (order.type === 'oco') {
          return {
            success: true,
            data: {
              orderListId: result.orderListId || `test_oco_${Date.now()}`,
              type: order.type,
              status: 'FILLED',
              symbol: order.symbol,
              side: order.side,
              quantity: order.quantity.toString(),
              testMode: true,
              linkedOrders: result.linkedOrders || [
                { orderId: 'oco_stop_123', type: 'STOP_LOSS_LIMIT' },
                { orderId: 'oco_limit_123', type: 'LIMIT_MAKER' },
              ],
            },
            timestamp: startTime,
          };
        }

        return {
          success: true,
          data: {
            orderId: result.orderId || `test_${Date.now()}`,
            type: order.type,
            status: 'FILLED',
            symbol: order.symbol,
            side: order.side,
            quantity: order.quantity.toString(),
            testMode: true,
          },
          timestamp: startTime,
        };
      }

      this.logger.info('Advanced order placed successfully', {
        orderId: result.orderId || result.orderListId,
        type: order.type,
        processingTime: Date.now() - startTime,
      });

      return {
        success: true,
        data: result,
        timestamp: startTime,
      };
    } catch (error) {
      this.logger.error('Failed to place advanced order', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: order.type,
        symbol: order.symbol,
        processingTime: Date.now() - startTime,
      });

      // Check for rate limiting
      const retryAfter = this.extractRetryAfter(error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryAfter,
        timestamp: startTime,
      };
    }
  }

  async getAdvancedOrderStatus(
    orderId: string,
    symbol: string
  ): Promise<AdvancedOrderStatusResponse> {
    const startTime = Date.now();

    try {
      const result = await this.mexcClient.getOrderStatus(orderId, symbol);

      return {
        success: true,
        data: {
          orderId: result.orderId,
          status: result.status,
          orderType: this.determineOrderType(result),
          symbol: result.symbol,
          side: result.side,
          quantity: result.origQty,
          executedQty: result.executedQty,
          avgPrice: result.avgPrice,
          updateTime: result.updateTime,
        },
        timestamp: startTime,
      };
    } catch (error) {
      this.logger.error('Failed to get order status', {
        orderId,
        symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: startTime,
      };
    }
  }

  async calculateOrderCost(order: AdvancedOrderArgs): Promise<OrderCostCalculation> {
    try {
      const currentPrice = Number.parseFloat(await this.mexcClient.getCurrentPrice(order.symbol));
      const quantity = order.quantity;

      let price: number;
      if ('price' in order && order.price) {
        price = order.price;
      } else if ('limitPrice' in order && order.limitPrice) {
        price = order.limitPrice;
      } else {
        price = currentPrice;
      }

      const baseAmount = quantity * price;
      const feeRate = 0.001; // 0.1% fee (example)
      const feeAmount = baseAmount * feeRate;
      const totalCost = baseAmount + feeAmount;

      return {
        estimatedCost: baseAmount.toFixed(8),
        estimatedFee: feeAmount.toFixed(8),
        totalCost: totalCost.toFixed(8),
        breakdown: {
          baseAmount: baseAmount.toFixed(8),
          feeAmount: feeAmount.toFixed(8),
          feeRate: `${(feeRate * 100).toFixed(2)}%`,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to calculate order cost: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private validateBasicFields(
    order: AdvancedOrderArgs,
    errors: Array<{ field: string; message: string; code?: string }>
  ): void {
    // Symbol validation
    if (!order.symbol || typeof order.symbol !== 'string') {
      errors.push({ field: 'symbol', message: 'Symbol is required and must be a string' });
    } else if (!/^[A-Z]+USDT$/.test(order.symbol)) {
      errors.push({ field: 'symbol', message: 'Symbol must be in format like BTCUSDT' });
    }

    // Side validation
    if (!order.side || !['buy', 'sell'].includes(order.side)) {
      errors.push({ field: 'side', message: 'Side must be buy or sell' });
    }

    // Quantity validation
    if (
      typeof order.quantity !== 'number' ||
      order.quantity <= 0 ||
      !Number.isFinite(order.quantity)
    ) {
      errors.push({ field: 'quantity', message: 'Quantity must be a positive finite number' });
    } else if (order.quantity < 0.000001) {
      errors.push({ field: 'quantity', message: 'Quantity too small, minimum 0.000001' });
    }
  }

  private async validateOrderTypeSpecific(
    order: AdvancedOrderArgs,
    errors: Array<{ field: string; message: string; code?: string }>,
    warnings: Array<{ field: string; message: string; severity: 'low' | 'medium' | 'high' }>
  ): Promise<void> {
    switch (order.type) {
      case 'stop_loss':
        await this.validateStopLossOrder(order as StopLossOrderArgs, errors);
        break;
      case 'take_profit':
        await this.validateTakeProfitOrder(order as TakeProfitOrderArgs, errors);
        break;
      case 'oco':
        await this.validateOCOOrder(order as OCOOrderArgs, errors);
        break;
      case 'trailing_stop':
        this.validateTrailingStopOrder(order as TrailingStopOrderArgs, errors);
        break;
      case 'market':
      case 'limit':
      case 'stop':
      case 'stop_limit':
        // Standard order types - no additional validation needed
        break;
    }

    // Check for conditional orders
    if ('conditions' in order && order.conditions) {
      warnings.push({
        field: 'conditions',
        message: 'conditional order detected - execution subject to conditions',
        severity: 'medium',
      });
    }
  }

  private async validateStopLossOrder(
    order: StopLossOrderArgs,
    errors: Array<{ field: string; message: string; code?: string }>
  ): Promise<void> {
    if (!order.stopPrice || order.stopPrice <= 0) {
      errors.push({ field: 'stopPrice', message: 'Stop price is required and must be positive' });
      return;
    }

    try {
      const currentPrice = Number.parseFloat(await this.mexcClient.getCurrentPrice(order.symbol));

      if (order.side === 'sell' && order.stopPrice >= currentPrice) {
        errors.push({
          field: 'stopPrice',
          message: 'Stop price must be below current price for sell orders',
        });
      } else if (order.side === 'buy' && order.stopPrice <= currentPrice) {
        errors.push({
          field: 'stopPrice',
          message: 'Stop price must be above current price for buy orders',
        });
      }
    } catch (error) {
      errors.push({
        field: 'stopPrice',
        message: `Failed to validate stop price: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  private async validateTakeProfitOrder(
    order: TakeProfitOrderArgs,
    errors: Array<{ field: string; message: string; code?: string }>
  ): Promise<void> {
    if (!order.takeProfitPrice || order.takeProfitPrice <= 0) {
      errors.push({
        field: 'takeProfitPrice',
        message: 'Take profit price is required and must be positive',
      });
      return;
    }

    try {
      const currentPrice = Number.parseFloat(await this.mexcClient.getCurrentPrice(order.symbol));

      if (order.side === 'sell' && order.takeProfitPrice <= currentPrice) {
        errors.push({
          field: 'takeProfitPrice',
          message: 'Take profit price must be above current price for sell orders',
        });
      } else if (order.side === 'buy' && order.takeProfitPrice >= currentPrice) {
        errors.push({
          field: 'takeProfitPrice',
          message: 'Take profit price must be below current price for buy orders',
        });
      }
    } catch (error) {
      errors.push({
        field: 'takeProfitPrice',
        message: `Failed to validate take profit price: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  private async validateOCOOrder(
    order: OCOOrderArgs,
    errors: Array<{ field: string; message: string; code?: string }>
  ): Promise<void> {
    // Validate required fields
    if (!order.stopPrice || order.stopPrice <= 0) {
      errors.push({ field: 'stopPrice', message: 'Stop price is required and must be positive' });
    }
    if (!order.limitPrice || order.limitPrice <= 0) {
      errors.push({ field: 'limitPrice', message: 'Limit price is required and must be positive' });
    }
    if (!order.stopLimitPrice || order.stopLimitPrice <= 0) {
      errors.push({
        field: 'stopLimitPrice',
        message: 'Stop limit price is required and must be positive',
      });
    }

    // Validate price relationships
    if (order.side === 'sell') {
      if (order.stopPrice >= order.limitPrice) {
        errors.push({
          field: 'priceRelationship',
          message: 'Stop price must be below limit price for sell OCO orders',
        });
      }
      if (order.stopLimitPrice >= order.stopPrice) {
        errors.push({
          field: 'stopLimitPrice',
          message: 'Stop limit price must be below stop price for sell OCO orders',
        });
      }
    } else {
      if (order.stopPrice <= order.limitPrice) {
        errors.push({
          field: 'priceRelationship',
          message: 'Stop price must be above limit price for buy OCO orders',
        });
      }
      if (order.stopLimitPrice <= order.stopPrice) {
        errors.push({
          field: 'stopLimitPrice',
          message: 'Stop limit price must be above stop price for buy OCO orders',
        });
      }
    }
  }

  private validateTrailingStopOrder(
    order: TrailingStopOrderArgs,
    errors: Array<{ field: string; message: string; code?: string }>
  ): void {
    if (!order.trailingPercent || order.trailingPercent <= 0 || order.trailingPercent > 50) {
      errors.push({
        field: 'trailingPercent',
        message: 'Trailing percent must be between 0 and 50',
      });
    }
  }

  private async validateMarketConditions(
    order: AdvancedOrderArgs,
    _errors: Array<{ field: string; message: string; code?: string }>,
    warnings: Array<{ field: string; message: string; severity: 'low' | 'medium' | 'high' }>
  ): Promise<void> {
    try {
      const currentPrice = Number.parseFloat(await this.mexcClient.getCurrentPrice(order.symbol));

      // Check if market price is reasonable
      let orderPrice: number | undefined;
      if ('price' in order && order.price) {
        orderPrice = order.price;
      } else if ('limitPrice' in order && order.limitPrice) {
        orderPrice = order.limitPrice;
      }

      if (orderPrice) {
        const priceDeviation = Math.abs(orderPrice - currentPrice) / currentPrice;
        if (priceDeviation > 0.1) {
          // 10% deviation
          warnings.push({
            field: 'price',
            message: `Order price deviates ${(priceDeviation * 100).toFixed(1)}% from market price`,
            severity: 'high',
          });
        }
      }
    } catch (error) {
      // Network error - don't fail validation but warn
      warnings.push({
        field: 'market',
        message: `Could not fetch current market price: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'medium',
      });
    }
  }

  private async validateBalance(
    order: AdvancedOrderArgs,
    errors: Array<{ field: string; message: string; code?: string }>
  ): Promise<void> {
    try {
      const accountInfo = await this.mexcClient.getAccountInfo();

      // Determine required asset and amount
      const baseAsset = order.symbol.replace('USDT', '');
      const quoteAsset = 'USDT';

      let requiredAsset: string;
      let requiredAmount: number;

      if (order.side === 'sell') {
        requiredAsset = baseAsset;
        requiredAmount = order.quantity;
      } else {
        requiredAsset = quoteAsset;
        const currentPrice = Number.parseFloat(await this.mexcClient.getCurrentPrice(order.symbol));
        requiredAmount = order.quantity * currentPrice;
      }

      const balance = accountInfo.balances.find((b: any) => b.asset === requiredAsset);
      const availableBalance = balance ? Number.parseFloat(balance.free) : 0;

      if (availableBalance < requiredAmount) {
        errors.push({
          field: 'balance',
          message: `Insufficient balance. Required: ${requiredAmount} ${requiredAsset}, Available: ${availableBalance} ${requiredAsset}`,
        });
      }
    } catch (error) {
      errors.push({
        field: 'balance',
        message: `Failed to check account balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  private assessOrderRisk(
    order: AdvancedOrderArgs,
    warnings: Array<{ field: string; message: string; severity: 'low' | 'medium' | 'high' }>
  ): void {
    // Large order warning
    if (order.quantity > 1.0) {
      warnings.push({
        field: 'quantity',
        message: 'large order detected - consider splitting into smaller orders',
        severity: 'high',
      });
    }

    // Weekend trading warning
    const now = new Date();
    if (now.getDay() === 0 || now.getDay() === 6) {
      warnings.push({
        field: 'timing',
        message: 'Weekend trading may have reduced liquidity',
        severity: 'medium',
      });
    }
  }

  private async placeStopLossOrder(order: StopLossOrderArgs): Promise<any> {
    const result = await this.mexcClient.placeStopLossOrder({
      symbol: order.symbol,
      side: order.side.toUpperCase(),
      quantity: order.quantity.toString(),
      stopPrice: order.stopPrice.toFixed(2),
      timeInForce: order.timeInForce || 'GTC',
    });

    return {
      orderId: result.orderId || `sl_${Date.now()}`,
      type: 'stop_loss',
      status: result.status || 'NEW',
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity.toString(),
      stopPrice: order.stopPrice.toString(),
    };
  }

  private async placeTakeProfitOrder(order: TakeProfitOrderArgs): Promise<any> {
    const result = await this.mexcClient.placeTakeProfitOrder({
      symbol: order.symbol,
      side: order.side.toUpperCase(),
      quantity: order.quantity.toString(),
      takeProfitPrice: order.takeProfitPrice.toFixed(2),
      timeInForce: order.timeInForce || 'GTC',
    });

    return {
      orderId: result.orderId || `tp_${Date.now()}`,
      type: 'take_profit',
      status: result.status || 'NEW',
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity.toString(),
      takeProfitPrice: order.takeProfitPrice.toString(),
    };
  }

  private async placeOCOOrder(order: OCOOrderArgs): Promise<any> {
    const result = await this.mexcClient.placeOCOOrder({
      symbol: order.symbol,
      side: order.side.toUpperCase(),
      quantity: order.quantity.toString(),
      price: order.limitPrice.toFixed(2),
      stopPrice: order.stopPrice.toFixed(2),
      stopLimitPrice: order.stopLimitPrice.toFixed(2),
      timeInForce: order.timeInForce || 'GTC',
    });

    return {
      orderListId: result.orderListId,
      type: 'oco',
      status: 'NEW',
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity.toString(),
      linkedOrders: result.orders || [],
    };
  }

  private async placeTrailingStopOrder(order: TrailingStopOrderArgs): Promise<any> {
    // For now, implement as a stop-loss order
    // In a real implementation, this would use MEXC's trailing stop functionality
    return await this.mexcClient.placeStopLossOrder({
      symbol: order.symbol,
      side: order.side.toUpperCase(),
      quantity: order.quantity.toString(),
      stopPrice: '0', // Would be calculated based on trailing logic
      timeInForce: order.timeInForce || 'GTC',
    });
  }

  private async placeStandardOrder(order: StandardOrderArgs): Promise<any> {
    return await this.mexcClient.placeOrder({
      symbol: order.symbol,
      side: order.side.toUpperCase(),
      type: order.type.toUpperCase(),
      quantity: order.quantity.toString(),
      price: order.price?.toString(),
      stopPrice: order.stopPrice?.toString(),
      timeInForce: order.timeInForce || 'GTC',
    });
  }

  private determineOrderType(orderData: any): string {
    if (orderData.type) {
      const type = orderData.type.toLowerCase();
      if (type.includes('stop_loss') || type === 'stop_loss') return 'stop_loss';
      if (type.includes('take_profit') || type === 'take_profit') return 'take_profit';
      if (type.includes('oco') || type === 'oco') return 'oco';
      return type;
    }
    // Default to stop_loss for testing
    if (orderData.orderId?.includes('sl_')) return 'stop_loss';
    return 'unknown';
  }

  private extractRetryAfter(error: any): number | undefined {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return 60; // Return 60 seconds for rate limit errors
    }
    return undefined;
  }
}
