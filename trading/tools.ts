/**
 * Trading MCP Tools
 * Model Context Protocol tools for trading operations
 */

import type { MCPTool, MCPToolResult, ToolExecutionContext } from '../tools/types';
import type { 
  PlaceOrderArgs,
  CancelOrderArgs,
  GetOrderStatusArgs,
  GetOrderHistoryArgs,
  BatchOrderArgs
} from './schemas';
import { tradingService } from './encore.service';

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
      type: { type: 'string', enum: ['market', 'limit', 'stop', 'stop_limit'], description: 'Order type' },
      quantity: { type: 'number', minimum: 0, description: 'Order quantity' },
      price: { type: 'number', minimum: 0, description: 'Order price (required for limit orders)' },
      stopPrice: { type: 'number', minimum: 0, description: 'Stop price (for stop orders)' },
      timeInForce: { type: 'string', enum: ['GTC', 'IOC', 'FOK'], description: 'Time in force' },
      clientOrderId: { type: 'string', description: 'Client order ID for tracking' },
      testMode: { type: 'boolean', description: 'Execute in test mode (no real trading)' }
    },
    required: ['symbol', 'side', 'type', 'quantity']
  },
  
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<MCPToolResult> {
    try {
      const validatedArgs = args as PlaceOrderArgs;
      
      // Add safety warning for real trading
      if (!validatedArgs.testMode && context.preferences?.trading?.requireConfirmation !== false) {
        return {
          content: [{
            type: 'text',
            text: `⚠️  TRADING WARNING: You are about to place a REAL order:\n\n` +
                  `Symbol: ${validatedArgs.symbol}\n` +
                  `Side: ${validatedArgs.side.toUpperCase()}\n` +
                  `Type: ${validatedArgs.type.toUpperCase()}\n` +
                  `Quantity: ${validatedArgs.quantity}\n` +
                  `${validatedArgs.price ? `Price: ${validatedArgs.price}\n` : ''}` +
                  `${validatedArgs.stopPrice ? `Stop Price: ${validatedArgs.stopPrice}\n` : ''}` +
                  `\nThis will execute a real trade with real money. Please confirm by setting testMode: false and requireConfirmation: false in your preferences.`
          }],
          isError: false
        };
      }

      const result = await tradingService.placeOrder(validatedArgs);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }],
        isError: false
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error placing order: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
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
      symbol: { type: 'string', pattern: '^[A-Z]+_[A-Z]+$', description: 'Trading pair symbol' }
    },
    required: ['symbol'],
    anyOf: [
      { required: ['orderId'] },
      { required: ['clientOrderId'] }
    ]
  },
  
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<MCPToolResult> {
    try {
      const validatedArgs = args as CancelOrderArgs;
      const result = await tradingService.cancelOrder(validatedArgs);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }],
        isError: false
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error cancelling order: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
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
      symbol: { type: 'string', pattern: '^[A-Z]+_[A-Z]+$', description: 'Trading pair symbol' }
    },
    required: ['symbol'],
    anyOf: [
      { required: ['orderId'] },
      { required: ['clientOrderId'] }
    ]
  },
  
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<MCPToolResult> {
    try {
      const validatedArgs = args as GetOrderStatusArgs;
      const result = await tradingService.getOrderStatus(validatedArgs);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }],
        isError: false
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error getting order status: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
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
      symbol: { type: 'string', pattern: '^[A-Z]+_[A-Z]+$', description: 'Trading pair symbol (optional filter)' },
      status: { 
        type: 'string', 
        enum: ['pending', 'open', 'filled', 'partially_filled', 'cancelled', 'rejected', 'expired'],
        description: 'Order status filter' 
      },
      startTime: { type: 'number', minimum: 0, description: 'Start time (Unix timestamp)' },
      endTime: { type: 'number', minimum: 0, description: 'End time (Unix timestamp)' },
      limit: { type: 'number', minimum: 1, maximum: 500, default: 100, description: 'Maximum number of orders to return' },
      page: { type: 'number', minimum: 1, default: 1, description: 'Page number for pagination' }
    },
    required: []
  },
  
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<MCPToolResult> {
    try {
      const validatedArgs = args as GetOrderHistoryArgs;
      const result = await tradingService.getOrderHistory(validatedArgs);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }],
        isError: false
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error getting order history: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
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
      type: { type: 'string', enum: ['market', 'limit', 'stop', 'stop_limit'], description: 'Order type' },
      quantity: { type: 'number', minimum: 0, description: 'Order quantity' },
      price: { type: 'number', minimum: 0, description: 'Order price (required for limit orders)' },
      stopPrice: { type: 'number', minimum: 0, description: 'Stop price (for stop orders)' },
      timeInForce: { type: 'string', enum: ['GTC', 'IOC', 'FOK'], description: 'Time in force' },
      clientOrderId: { type: 'string', description: 'Client order ID for tracking' },
      testMode: { type: 'boolean', description: 'Execute in test mode (no real trading)' }
    },
    required: ['symbol', 'side', 'type', 'quantity']
  },
  
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<MCPToolResult> {
    try {
      const validatedArgs = args as PlaceOrderArgs;
      const result = await tradingService.validateOrder(validatedArgs);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }],
        isError: false
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error validating order: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
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
            symbol: { type: 'string', pattern: '^[A-Z]+_[A-Z]+$', description: 'Trading pair symbol' },
            side: { type: 'string', enum: ['buy', 'sell'], description: 'Order side' },
            type: { type: 'string', enum: ['market', 'limit', 'stop', 'stop_limit'], description: 'Order type' },
            quantity: { type: 'number', minimum: 0, description: 'Order quantity' },
            price: { type: 'number', minimum: 0, description: 'Order price' },
            stopPrice: { type: 'number', minimum: 0, description: 'Stop price' },
            timeInForce: { type: 'string', enum: ['GTC', 'IOC', 'FOK'], description: 'Time in force' },
            clientOrderId: { type: 'string', description: 'Client order ID' },
            testMode: { type: 'boolean', description: 'Test mode' }
          },
          required: ['symbol', 'side', 'type', 'quantity']
        },
        description: 'Array of orders to place'
      },
      testMode: { type: 'boolean', description: 'Execute all orders in test mode' }
    },
    required: ['orders']
  },
  
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<MCPToolResult> {
    try {
      const validatedArgs = args as BatchOrderArgs;
      
      // Add safety warning for real trading
      if (!validatedArgs.testMode && context.preferences?.trading?.requireConfirmation !== false) {
        return {
          content: [{
            type: 'text',
            text: `⚠️  BATCH TRADING WARNING: You are about to place ${validatedArgs.orders.length} REAL orders.\n\n` +
                  `This will execute multiple real trades with real money. Please confirm by setting testMode: true first to validate, then testMode: false with requireConfirmation: false in preferences.`
          }],
          isError: false
        };
      }

      const result = await tradingService.batchOrder(validatedArgs);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }],
        isError: false
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error executing batch orders: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
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
        description: 'Timeframe for statistics' 
      }
    },
    required: []
  },
  
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<MCPToolResult> {
    try {
      const timeframe = (args.timeframe as string) || '24h';
      const result = await tradingService.getTradingStatistics(timeframe);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }],
        isError: false
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error getting trading statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
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