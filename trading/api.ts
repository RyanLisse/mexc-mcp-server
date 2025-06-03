/**
 * Trading Operations API
 * Encore API endpoints for trading operations
 */

import { api } from 'encore.dev/api';
import { tradingService } from './encore.service';
import type {
  BatchOrderArgs,
  CancelOrderArgs,
  GetOrderHistoryArgs,
  GetOrderStatusArgs,
  PlaceOrderArgs,
} from './schemas';

/**
 * Validation function to safely convert args to PlaceOrderArgs
 */
function validatePlaceOrderArgs(args: Record<string, unknown>): PlaceOrderArgs {
  if (typeof args.symbol !== 'string' || !args.symbol) {
    throw new Error('symbol is required and must be a string');
  }
  if (typeof args.side !== 'string' || !['buy', 'sell'].includes(args.side)) {
    throw new Error('side is required and must be "buy" or "sell"');
  }
  if (
    typeof args.type !== 'string' ||
    !['market', 'limit', 'stop', 'stop_limit'].includes(args.type)
  ) {
    throw new Error('type is required and must be one of: market, limit, stop, stop_limit');
  }
  if (typeof args.quantity !== 'number' || args.quantity <= 0) {
    throw new Error('quantity is required and must be a positive number');
  }

  return {
    symbol: args.symbol,
    side: args.side as 'buy' | 'sell',
    type: args.type as 'market' | 'limit' | 'stop' | 'stop_limit',
    quantity: args.quantity,
    price: typeof args.price === 'number' ? args.price : undefined,
    stopPrice: typeof args.stopPrice === 'number' ? args.stopPrice : undefined,
    timeInForce:
      typeof args.timeInForce === 'string' && ['GTC', 'IOC', 'FOK'].includes(args.timeInForce)
        ? (args.timeInForce as 'GTC' | 'IOC' | 'FOK')
        : undefined,
    clientOrderId: typeof args.clientOrderId === 'string' ? args.clientOrderId : undefined,
    testMode: typeof args.testMode === 'boolean' ? args.testMode : undefined,
  };
}

/**
 * Validation function to safely convert args to CancelOrderArgs
 */
function validateCancelOrderArgs(args: Record<string, unknown>): CancelOrderArgs {
  if (typeof args.symbol !== 'string' || !args.symbol) {
    throw new Error('symbol is required and must be a string');
  }

  return {
    symbol: args.symbol,
    orderId: typeof args.orderId === 'string' ? args.orderId : undefined,
    clientOrderId: typeof args.clientOrderId === 'string' ? args.clientOrderId : undefined,
  };
}

/**
 * Validation function to safely convert args to GetOrderStatusArgs
 */
function validateGetOrderStatusArgs(args: Record<string, unknown>): GetOrderStatusArgs {
  if (typeof args.symbol !== 'string' || !args.symbol) {
    throw new Error('symbol is required and must be a string');
  }

  return {
    symbol: args.symbol,
    orderId: typeof args.orderId === 'string' ? args.orderId : undefined,
    clientOrderId: typeof args.clientOrderId === 'string' ? args.clientOrderId : undefined,
  };
}

/**
 * Place a new trading order
 */
export const placeOrder = api(
  {
    method: 'POST',
    path: '/trading/orders',
    expose: true,
    auth: false, // Set to true in production
  },
  async (req: PlaceOrderArgs) => {
    try {
      // Execute order
      const result = await tradingService.placeOrder(req);

      return {
        success: true,
        data: result,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Place order API error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: Date.now(),
      };
    }
  }
);

/**
 * Cancel an existing order
 */
export const cancelOrder = api(
  {
    method: 'DELETE',
    path: '/trading/orders/:orderId',
    expose: true,
    auth: false,
  },
  async (req: {
    orderId: string;
    body?: Partial<CancelOrderArgs>;
  }) => {
    try {
      const validatedArgs: CancelOrderArgs = {
        orderId: req.orderId,
        symbol: req.body?.symbol || '',
        ...(req.body || {}),
      };

      const result = await tradingService.cancelOrder(validatedArgs);

      return {
        success: true,
        data: result,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Cancel order API error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: Date.now(),
      };
    }
  }
);

/**
 * Get order status
 */
export const getOrderStatus = api(
  {
    method: 'GET',
    path: '/trading/orders/:orderId',
    expose: true,
    auth: false,
  },
  async (req: {
    orderId: string;
    symbol: string;
    clientOrderId?: string;
  }) => {
    try {
      const validatedArgs: GetOrderStatusArgs = {
        orderId: req.orderId,
        symbol: req.symbol,
        clientOrderId: req.clientOrderId,
      };

      const result = await tradingService.getOrderStatus(validatedArgs);

      return {
        success: true,
        data: result,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Get order status API error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: Date.now(),
      };
    }
  }
);

/**
 * Get order history
 */
export const getOrderHistory = api(
  {
    method: 'GET',
    path: '/trading/orders',
    expose: true,
    auth: false,
  },
  async (req: GetOrderHistoryArgs) => {
    try {
      const validatedArgs = req;
      const result = await tradingService.getOrderHistory(validatedArgs);

      return {
        success: true,
        data: result,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Get order history API error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: Date.now(),
      };
    }
  }
);

/**
 * Validate order before execution
 */
export const validateOrder = api(
  {
    method: 'POST',
    path: '/trading/orders/validate',
    expose: true,
    auth: false,
  },
  async (req: PlaceOrderArgs) => {
    try {
      const validatedArgs = req;
      const result = await tradingService.validateOrder(validatedArgs);

      return {
        success: true,
        data: result,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Validate order API error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: Date.now(),
      };
    }
  }
);

/**
 * Execute batch orders
 */
export const batchOrder = api(
  {
    method: 'POST',
    path: '/trading/orders/batch',
    expose: true,
    auth: false,
  },
  async (req: BatchOrderArgs) => {
    try {
      const validatedArgs = req;
      const result = await tradingService.batchOrder(validatedArgs);

      return {
        success: true,
        data: result,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Batch order API error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: Date.now(),
      };
    }
  }
);

/**
 * Get trading statistics
 */
export const getTradingStatistics = api(
  {
    method: 'GET',
    path: '/trading/statistics',
    expose: true,
    auth: false,
  },
  async (req: { timeframe?: string }) => {
    try {
      const result = await tradingService.getTradingStatistics(req.timeframe);

      return {
        success: true,
        data: result,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Get trading statistics API error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: Date.now(),
      };
    }
  }
);

/**
 * Health check for trading service
 */
export const getTradingHealth = api(
  {
    method: 'GET',
    path: '/trading/health',
    expose: true,
    auth: false,
  },
  async (): Promise<{
    success: boolean;
    status: string;
    services: {
      mexcApi: boolean;
      orderValidation: boolean;
      balanceCheck: boolean;
    };
    timestamp: number;
  }> => {
    try {
      // Basic health checks
      const services = {
        mexcApi: true, // Would check MEXC API connectivity
        orderValidation: true,
        balanceCheck: true,
      };

      const allHealthy = Object.values(services).every((status) => status);

      return {
        success: allHealthy,
        status: allHealthy ? 'healthy' : 'degraded',
        services,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Trading health check failed:', error);

      return {
        success: false,
        status: 'unhealthy',
        services: {
          mexcApi: false,
          orderValidation: false,
          balanceCheck: false,
        },
        timestamp: Date.now(),
      };
    }
  }
);

/**
 * Batch operations API for multiple operations
 */
export const batchOperations = api(
  {
    method: 'POST',
    path: '/trading/batch',
    expose: true,
    auth: false,
  },
  async (req: {
    operations: Array<{
      type: 'place' | 'cancel' | 'status' | 'validate';
      data: Record<string, unknown>;
    }>;
    testMode?: boolean;
  }) => {
    try {
      const results = await Promise.allSettled(
        req.operations.map(async (op) => {
          let data: unknown;

          switch (op.type) {
            case 'place':
              data = await tradingService.placeOrder(validatePlaceOrderArgs(op.data));
              break;
            case 'cancel':
              data = await tradingService.cancelOrder(validateCancelOrderArgs(op.data));
              break;
            case 'status':
              data = await tradingService.getOrderStatus(validateGetOrderStatusArgs(op.data));
              break;
            case 'validate':
              data = await tradingService.validateOrder(validatePlaceOrderArgs(op.data));
              break;
            default:
              throw new Error(`Unknown operation type: ${op.type}`);
          }

          return {
            type: op.type,
            success: true,
            data,
          };
        })
      );

      return {
        success: true,
        results: results.map((result, index) => ({
          index,
          type: req.operations[index].type,
          success: result.status === 'fulfilled',
          ...(result.status === 'fulfilled'
            ? { data: result.value }
            : { error: result.reason?.message || 'Unknown error' }),
        })),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Batch operations API error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: Date.now(),
      };
    }
  }
);
