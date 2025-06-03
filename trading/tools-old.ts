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
                  `\nThis will execute a real trade with real money. Are you sure?\n` +
                  `To proceed, add "testMode": false and "confirmed": true to your request.`
          }],
          isError: false
        };
      }

      const result = await tradingService.placeOrder(validatedArgs);

      const statusEmoji = result.success ? '✅' : '❌';
      const modeText = validatedArgs.testMode ? ' (TEST MODE)' : '';

      return {
        content: [{
          type: 'text',
          text: `${statusEmoji} Order Placed${modeText}\n\n` +
                `Order ID: ${result.orderId}\n` +
                `Status: ${result.status}\n` +
                `Filled Quantity: ${result.filledQuantity}\n` +
                `${result.averagePrice ? `Average Price: ${result.averagePrice}\n` : ''}` +
                `${result.fee ? `Fee: ${result.fee}\n` : ''}` +
                `Message: ${result.message || 'Order executed successfully'}`
        }],
        isError: !result.success
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Order placement failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
  inputSchema: CancelOrderSchema._def.schema,
  
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<MCPToolResult> {
    try {
      const validatedArgs = CancelOrderSchema.parse(args);
      const result = await tradingService.cancelOrder(validatedArgs);

      const statusEmoji = result.success ? '✅' : '❌';

      return {
        content: [{
          type: 'text',
          text: `${statusEmoji} Order Cancellation\n\n` +
                `Order ID: ${result.orderId}\n` +
                `Symbol: ${result.symbol}\n` +
                `Status: ${result.status}\n` +
                `Cancelled Quantity: ${result.cancelledQuantity}\n` +
                `Message: ${result.message || 'Order cancelled successfully'}`
        }],
        isError: !result.success
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Order cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
  description: 'Get the status of a specific order',
  inputSchema: GetOrderStatusSchema._def.schema,
  
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<MCPToolResult> {
    try {
      const validatedArgs = GetOrderStatusSchema.parse(args);
      const order = await tradingService.getOrderStatus(validatedArgs);

      const statusEmoji = getStatusEmoji(order.status);
      const fillPercentage = (Number(order.filledQuantity) / Number(order.quantity) * 100).toFixed(2);

      return {
        content: [{
          type: 'text',
          text: `${statusEmoji} Order Status\n\n` +
                `Order ID: ${order.orderId}\n` +
                `${order.clientOrderId ? `Client Order ID: ${order.clientOrderId}\n` : ''}` +
                `Symbol: ${order.symbol}\n` +
                `Side: ${order.side.toUpperCase()}\n` +
                `Type: ${order.type.toUpperCase()}\n` +
                `Status: ${order.status.toUpperCase()}\n` +
                `Quantity: ${order.quantity}\n` +
                `${order.price ? `Price: ${order.price}\n` : ''}` +
                `${order.stopPrice ? `Stop Price: ${order.stopPrice}\n` : ''}` +
                `Filled: ${order.filledQuantity} (${fillPercentage}%)\n` +
                `${order.averagePrice ? `Average Price: ${order.averagePrice}\n` : ''}` +
                `${order.fee ? `Fee: ${order.fee} ${order.feeAsset || ''}\n` : ''}` +
                `Created: ${new Date(order.createdAt).toISOString()}\n` +
                `Updated: ${new Date(order.updatedAt).toISOString()}`
        }],
        isError: false
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to get order status: ${error instanceof Error ? error.message : 'Unknown error'}`
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
  description: 'Get order history with optional filtering',
  inputSchema: GetOrderHistorySchema._def.schema,
  
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<MCPToolResult> {
    try {
      const validatedArgs = GetOrderHistorySchema.parse(args);
      const result = await tradingService.getOrderHistory(validatedArgs);

      if (result.orders.length === 0) {
        return {
          content: [{
            type: 'text',
            text: '📝 No orders found matching the specified criteria.'
          }],
          isError: false
        };
      }

      const ordersText = result.orders.map((order, index) => {
        const statusEmoji = getStatusEmoji(order.status);
        const fillPercentage = (Number(order.filledQuantity) / Number(order.quantity) * 100).toFixed(2);
        
        return `${index + 1}. ${statusEmoji} ${order.symbol} ${order.side.toUpperCase()}\n` +
               `   Order ID: ${order.orderId}\n` +
               `   Type: ${order.type.toUpperCase()}, Status: ${order.status.toUpperCase()}\n` +
               `   Quantity: ${order.quantity}, Filled: ${order.filledQuantity} (${fillPercentage}%)\n` +
               `   ${order.price ? `Price: ${order.price}, ` : ''}Created: ${new Date(order.createdAt).toLocaleString()}`;
      }).join('\n\n');

      return {
        content: [{
          type: 'text',
          text: `📋 Order History (Page ${result.currentPage}/${result.totalPages})\n` +
                `Total Orders: ${result.totalCount}\n\n` +
                ordersText +
                `\n\n${result.hasMore ? `Use page ${result.currentPage + 1} to see more orders.` : 'End of results.'}`
        }],
        isError: false
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to get order history: ${error instanceof Error ? error.message : 'Unknown error'}`
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
  description: 'Validate an order before placing it',
  inputSchema: PlaceOrderSchema._def.schema,
  
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<MCPToolResult> {
    try {
      const validatedArgs = PlaceOrderSchema.parse(args);
      const validation = await tradingService.validateOrder(validatedArgs);

      const statusEmoji = validation.isValid ? '✅' : '❌';
      
      let resultText = `${statusEmoji} Order Validation\n\n`;
      
      if (validation.isValid) {
        resultText += `✅ Order is valid and ready to execute\n\n`;
        
        if (validation.estimatedCost) {
          resultText += `💰 Estimated Cost: $${validation.estimatedCost}\n`;
        }
        
        if (validation.estimatedFee) {
          resultText += `💸 Estimated Fee: $${validation.estimatedFee}\n`;
        }
        
        if (validation.balanceCheck) {
          resultText += `💳 Balance Check: ${validation.balanceCheck.hasEnoughBalance ? '✅ Sufficient' : '❌ Insufficient'}\n`;
          if (!validation.balanceCheck.hasEnoughBalance) {
            resultText += `   Required: ${validation.balanceCheck.requiredBalance} ${validation.balanceCheck.asset}\n`;
            resultText += `   Available: ${validation.balanceCheck.availableBalance} ${validation.balanceCheck.asset}\n`;
          }
        }
      } else {
        resultText += `❌ Order validation failed\n\n`;
        
        if (validation.errors.length > 0) {
          resultText += `**Errors:**\n`;
          validation.errors.forEach(error => {
            resultText += `• ${error.field}: ${error.message}\n`;
          });
        }
      }
      
      if (validation.warnings.length > 0) {
        resultText += `\n**Warnings:**\n`;
        validation.warnings.forEach(warning => {
          const severityEmoji = warning.severity === 'high' ? '🔴' : warning.severity === 'medium' ? '🟡' : '🟢';
          resultText += `${severityEmoji} ${warning.field}: ${warning.message}\n`;
        });
      }

      return {
        content: [{
          type: 'text',
          text: resultText
        }],
        isError: !validation.isValid
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Order validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
  description: 'Execute multiple orders in a single batch',
  inputSchema: BatchOrderSchema._def.schema,
  
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<MCPToolResult> {
    try {
      const validatedArgs = BatchOrderSchema.parse(args);
      
      // Safety check for batch orders
      if (!validatedArgs.testMode && validatedArgs.orders.length > 5) {
        return {
          content: [{
            type: 'text',
            text: `⚠️  BATCH ORDER WARNING: You are attempting to place ${validatedArgs.orders.length} REAL orders simultaneously.\n\n` +
                  `This is a high-risk operation that could result in significant losses.\n` +
                  `Consider using testMode: true first to validate your orders.\n\n` +
                  `To proceed with real trading, confirm each order individually or set testMode: true.`
          }],
          isError: false
        };
      }

      const result = await tradingService.batchOrder(validatedArgs);

      const statusEmoji = result.success ? '✅' : '⚠️';
      const modeText = validatedArgs.testMode ? ' (TEST MODE)' : '';

      let resultText = `${statusEmoji} Batch Order Execution${modeText}\n\n`;
      resultText += `Total Orders: ${result.totalOrders}\n`;
      resultText += `Successful: ${result.successfulOrders}\n`;
      resultText += `Failed: ${result.failedOrders}\n`;
      resultText += `Execution Time: ${result.executionTime}ms\n\n`;

      if (result.results.length > 0) {
        resultText += `**Results:**\n`;
        result.results.forEach(orderResult => {
          const emoji = orderResult.success ? '✅' : '❌';
          resultText += `${emoji} Order ${orderResult.index + 1}: `;
          
          if (orderResult.success) {
            resultText += `Success (ID: ${orderResult.orderId})\n`;
          } else {
            resultText += `Failed - ${orderResult.error}\n`;
          }
        });
      }

      return {
        content: [{
          type: 'text',
          text: resultText
        }],
        isError: result.failedOrders > 0
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Batch order execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
  description: 'Get trading performance statistics',
  inputSchema: z.object({
    timeframe: z.string().optional().default('24h').describe('Time period for statistics (24h, 7d, 30d)')
  })._def.schema,
  
  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<MCPToolResult> {
    try {
      const timeframe = (args.timeframe as string) || '24h';
      const stats = await tradingService.getTradingStatistics(timeframe);

      return {
        content: [{
          type: 'text',
          text: `📊 Trading Statistics (${stats.timeframe})\n\n` +
                `📈 Total Orders: ${stats.totalOrders}\n` +
                `✅ Successful: ${stats.successfulOrders}\n` +
                `❌ Cancelled: ${stats.cancelledOrders}\n` +
                `🚫 Rejected: ${stats.rejectedOrders}\n` +
                `💰 Total Volume: $${stats.totalVolume}\n` +
                `💸 Total Fees: $${stats.totalFees}\n` +
                `📊 P&L: $${stats.profitLoss}\n` +
                `🎯 Win Rate: ${stats.winRate}%\n` +
                `📏 Avg Order Size: $${stats.averageOrderSize}\n` +
                `⭐ Most Traded: ${stats.mostTradedPair}`
        }],
        isError: false
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to get trading statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
};

/**
 * Helper function to get status emoji
 */
function getStatusEmoji(status: string): string {
  const emojiMap: Record<string, string> = {
    'pending': '⏳',
    'open': '🔄',
    'filled': '✅',
    'partially_filled': '🔄',
    'cancelled': '❌',
    'rejected': '🚫',
    'expired': '⏰'
  };

  return emojiMap[status] || '❓';
}

/**
 * Export all trading tools
 */
export const tradingTools: MCPTool[] = [
  placeOrderTool,
  cancelOrderTool,
  getOrderStatusTool,
  getOrderHistoryTool,
  validateOrderTool,
  batchOrderTool,
  getTradingStatisticsTool
];