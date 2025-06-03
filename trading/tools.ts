/**
 * Trading MCP Tools
 * Model Context Protocol tools for trading operations
 */

import type { MCPTool, MCPToolResult, ToolExecutionContext } from '../tools/types';
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
 * Validation function to safely convert args to GetOrderHistoryArgs
 */
function validateGetOrderHistoryArgs(args: Record<string, unknown>): GetOrderHistoryArgs {
  const validStatuses = [
    'pending',
    'open',
    'filled',
    'partially_filled',
    'cancelled',
    'rejected',
    'expired',
  ];

  return {
    symbol: typeof args.symbol === 'string' ? args.symbol : undefined,
    status:
      typeof args.status === 'string' && validStatuses.includes(args.status)
        ? (args.status as GetOrderHistoryArgs['status'])
        : undefined,
    startTime: typeof args.startTime === 'number' ? args.startTime : undefined,
    endTime: typeof args.endTime === 'number' ? args.endTime : undefined,
    limit: typeof args.limit === 'number' ? args.limit : undefined,
    page: typeof args.page === 'number' ? args.page : undefined,
  };
}

/**
 * Validation function to safely convert args to BatchOrderArgs
 */
function validateBatchOrderArgs(args: Record<string, unknown>): BatchOrderArgs {
  if (!Array.isArray(args.orders)) {
    throw new Error('orders is required and must be an array');
  }

  const validatedOrders: PlaceOrderArgs[] = args.orders.map((order: unknown, index: number) => {
    if (typeof order !== 'object' || order === null) {
      throw new Error(`Order at index ${index} must be an object`);
    }
    try {
      return validatePlaceOrderArgs(order as Record<string, unknown>);
    } catch (error) {
      throw new Error(
        `Order at index ${index}: ${error instanceof Error ? error.message : 'Invalid order'}`
      );
    }
  });

  return {
    orders: validatedOrders,
    testMode: typeof args.testMode === 'boolean' ? args.testMode : undefined,
  };
}

/**
 * Place Order Tool
 */
export const placeOrderTool: MCPTool = {
  name: 'mexc_place_order',
  description: 'Place a new trading order on MEXC exchange',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: { type: 'string', pattern: '^[A-Z]+_[A-Z]+$', description: 'Trading pair symbol' },
      side: { type: 'string', enum: ['buy', 'sell'], description: 'Order side' },
      type: {
        type: 'string',
        enum: ['market', 'limit', 'stop', 'stop_limit'],
        description: 'Order type',
      },
      quantity: { type: 'number', minimum: 0, description: 'Order quantity' },
      price: { type: 'number', minimum: 0, description: 'Order price (required for limit orders)' },
      stopPrice: { type: 'number', minimum: 0, description: 'Stop price (for stop orders)' },
      timeInForce: { type: 'string', enum: ['GTC', 'IOC', 'FOK'], description: 'Time in force' },
      clientOrderId: { type: 'string', description: 'Client order ID for tracking' },
      testMode: { type: 'boolean', description: 'Execute in test mode (no real trading)' },
    },
    required: ['symbol', 'side', 'type', 'quantity'],
  },

  async execute(
    args: Record<string, unknown>,
    _context: ToolExecutionContext
  ): Promise<MCPToolResult> {
    try {
      const validatedArgs = validatePlaceOrderArgs(args);

      // Add safety warning for real trading
      if (!validatedArgs.testMode) {
        return {
          content: [
            {
              type: 'text',
              text: `⚠️  TRADING WARNING: You are about to place a REAL order:\n\nSymbol: ${validatedArgs.symbol}\nSide: ${validatedArgs.side.toUpperCase()}\nType: ${validatedArgs.type.toUpperCase()}\nQuantity: ${validatedArgs.quantity}\n${validatedArgs.price ? `Price: ${validatedArgs.price}\n` : ''}${validatedArgs.stopPrice ? `Stop Price: ${validatedArgs.stopPrice}\n` : ''}\nThis will execute a real trade with real money. Please confirm by setting testMode: true for safety.`,
            },
          ],
          isError: false,
        };
      }

      const result = await tradingService.placeOrder(validatedArgs);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error placing order: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Cancel Order Tool
 */
export const cancelOrderTool: MCPTool = {
  name: 'mexc_cancel_order',
  description: 'Cancel an existing order on MEXC exchange',
  inputSchema: {
    type: 'object',
    properties: {
      orderId: { type: 'string', description: 'Exchange order ID' },
      clientOrderId: { type: 'string', description: 'Client order ID' },
      symbol: { type: 'string', pattern: '^[A-Z]+_[A-Z]+$', description: 'Trading pair symbol' },
    },
    required: ['symbol'],
    anyOf: [{ required: ['orderId'] }, { required: ['clientOrderId'] }],
  },

  async execute(
    args: Record<string, unknown>,
    _context: ToolExecutionContext
  ): Promise<MCPToolResult> {
    try {
      const validatedArgs = validateCancelOrderArgs(args);
      const result = await tradingService.cancelOrder(validatedArgs);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error cancelling order: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Get Order Status Tool
 */
export const getOrderStatusTool: MCPTool = {
  name: 'mexc_get_order_status',
  description: 'Get the status of an order on MEXC exchange',
  inputSchema: {
    type: 'object',
    properties: {
      orderId: { type: 'string', description: 'Exchange order ID' },
      clientOrderId: { type: 'string', description: 'Client order ID' },
      symbol: { type: 'string', pattern: '^[A-Z]+_[A-Z]+$', description: 'Trading pair symbol' },
    },
    required: ['symbol'],
    anyOf: [{ required: ['orderId'] }, { required: ['clientOrderId'] }],
  },

  async execute(
    args: Record<string, unknown>,
    _context: ToolExecutionContext
  ): Promise<MCPToolResult> {
    try {
      const validatedArgs = validateGetOrderStatusArgs(args);
      const result = await tradingService.getOrderStatus(validatedArgs);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting order status: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Get Order History Tool
 */
export const getOrderHistoryTool: MCPTool = {
  name: 'mexc_get_order_history',
  description: 'Get order history from MEXC exchange',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        pattern: '^[A-Z]+_[A-Z]+$',
        description: 'Trading pair symbol (optional filter)',
      },
      status: {
        type: 'string',
        enum: ['pending', 'open', 'filled', 'partially_filled', 'cancelled', 'rejected', 'expired'],
        description: 'Order status filter',
      },
      startTime: { type: 'number', minimum: 0, description: 'Start time (Unix timestamp)' },
      endTime: { type: 'number', minimum: 0, description: 'End time (Unix timestamp)' },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 500,
        default: 100,
        description: 'Maximum number of orders to return',
      },
      page: { type: 'number', minimum: 1, default: 1, description: 'Page number for pagination' },
    },
    required: [],
  },

  async execute(
    args: Record<string, unknown>,
    _context: ToolExecutionContext
  ): Promise<MCPToolResult> {
    try {
      const validatedArgs = validateGetOrderHistoryArgs(args);
      const result = await tradingService.getOrderHistory(validatedArgs);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting order history: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Validate Order Tool
 */
export const validateOrderTool: MCPTool = {
  name: 'mexc_validate_order',
  description: 'Validate an order before placing it on MEXC exchange',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: { type: 'string', pattern: '^[A-Z]+_[A-Z]+$', description: 'Trading pair symbol' },
      side: { type: 'string', enum: ['buy', 'sell'], description: 'Order side' },
      type: {
        type: 'string',
        enum: ['market', 'limit', 'stop', 'stop_limit'],
        description: 'Order type',
      },
      quantity: { type: 'number', minimum: 0, description: 'Order quantity' },
      price: { type: 'number', minimum: 0, description: 'Order price (required for limit orders)' },
      stopPrice: { type: 'number', minimum: 0, description: 'Stop price (for stop orders)' },
      timeInForce: { type: 'string', enum: ['GTC', 'IOC', 'FOK'], description: 'Time in force' },
      clientOrderId: { type: 'string', description: 'Client order ID for tracking' },
      testMode: { type: 'boolean', description: 'Execute in test mode (no real trading)' },
    },
    required: ['symbol', 'side', 'type', 'quantity'],
  },

  async execute(
    args: Record<string, unknown>,
    _context: ToolExecutionContext
  ): Promise<MCPToolResult> {
    try {
      const validatedArgs = validatePlaceOrderArgs(args);
      const result = await tradingService.validateOrder(validatedArgs);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error validating order: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Batch Order Tool
 */
export const batchOrderTool: MCPTool = {
  name: 'mexc_batch_order',
  description: 'Execute multiple orders in batch on MEXC exchange',
  inputSchema: {
    type: 'object',
    properties: {
      orders: {
        type: 'array',
        minItems: 1,
        maxItems: 20,
        items: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              pattern: '^[A-Z]+_[A-Z]+$',
              description: 'Trading pair symbol',
            },
            side: { type: 'string', enum: ['buy', 'sell'], description: 'Order side' },
            type: {
              type: 'string',
              enum: ['market', 'limit', 'stop', 'stop_limit'],
              description: 'Order type',
            },
            quantity: { type: 'number', minimum: 0, description: 'Order quantity' },
            price: { type: 'number', minimum: 0, description: 'Order price' },
            stopPrice: { type: 'number', minimum: 0, description: 'Stop price' },
            timeInForce: {
              type: 'string',
              enum: ['GTC', 'IOC', 'FOK'],
              description: 'Time in force',
            },
            clientOrderId: { type: 'string', description: 'Client order ID' },
            testMode: { type: 'boolean', description: 'Test mode' },
          },
          required: ['symbol', 'side', 'type', 'quantity'],
        },
        description: 'Array of orders to place',
      },
      testMode: { type: 'boolean', description: 'Execute all orders in test mode' },
    },
    required: ['orders'],
  },

  async execute(
    args: Record<string, unknown>,
    _context: ToolExecutionContext
  ): Promise<MCPToolResult> {
    try {
      const validatedArgs = validateBatchOrderArgs(args);

      // Add safety warning for real trading
      if (!validatedArgs.testMode) {
        return {
          content: [
            {
              type: 'text',
              text: `⚠️  BATCH TRADING WARNING: You are about to place ${validatedArgs.orders.length} REAL orders.\n\nThis will execute multiple real trades with real money. Please confirm by setting testMode: true first to validate.`,
            },
          ],
          isError: false,
        };
      }

      const result = await tradingService.batchOrder(validatedArgs);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing batch orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Get Trading Statistics Tool
 */
export const getTradingStatisticsTool: MCPTool = {
  name: 'mexc_get_trading_statistics',
  description: 'Get trading statistics and performance metrics',
  inputSchema: {
    type: 'object',
    properties: {
      timeframe: {
        type: 'string',
        enum: ['1h', '4h', '1d', '7d', '30d'],
        default: '24h',
        description: 'Timeframe for statistics',
      },
    },
    required: [],
  },

  async execute(
    args: Record<string, unknown>,
    _context: ToolExecutionContext
  ): Promise<MCPToolResult> {
    try {
      const timeframe = (args.timeframe as string) || '24h';
      const result = await tradingService.getTradingStatistics(timeframe);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting trading statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  },
};

// Export all trading tools
export const tradingTools: MCPTool[] = [
  placeOrderTool,
  cancelOrderTool,
  getOrderStatusTool,
  getOrderHistoryTool,
  validateOrderTool,
  batchOrderTool,
  getTradingStatisticsTool,
];
