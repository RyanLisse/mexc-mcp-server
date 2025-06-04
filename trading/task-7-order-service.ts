/**
 * Task #7: Order Placement Service with Zod Validation
 * Production implementation for order placement with required specifications:
 * - Zod validation with z.object({ symbol: z.string(), side: z.enum(['BUY', 'SELL']), ... })
 * - Call MEXC REST API for execution
 * - Log all orders
 * - Safety checks and error handling
 */

import { z } from 'zod';

// Zod schema as specified in Task #7 requirements
export const TaskSevenOrderSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  side: z.enum(['BUY', 'SELL'], {
    errorMap: () => ({ message: 'Side must be BUY or SELL' }),
  }),
  type: z.enum(['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'], {
    errorMap: () => ({ message: 'Type must be MARKET, LIMIT, STOP, or STOP_LIMIT' }),
  }),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
  timeInForce: z.enum(['GTC', 'IOC', 'FOK']).optional(),
  clientOrderId: z.string().optional(),
  testMode: z.boolean().default(false),
});

export type TaskSevenOrderArgs = z.infer<typeof TaskSevenOrderSchema>;

// Type for expected API response
export interface OrderPlacementResponse {
  success: boolean;
  data?: {
    orderId: string;
    status: string;
    symbol: string;
    side: string;
    quantity: number;
    price?: number;
    timestamp: number;
  };
  error?: string;
  timestamp: number;
}

// Logger interface
export interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

// MEXC Client interface
export interface MexcClient {
  placeOrder: (orderData: {
    symbol: string;
    side: string;
    type: string;
    quantity: number;
    price?: number;
    stopPrice?: number;
    timeInForce?: string;
    clientOrderId?: string;
    testMode?: boolean;
  }) => Promise<{
    orderId?: string;
    status?: string;
  }>;
  ping: () => Promise<void>;
}

/**
 * Task #7 Order Placement Service
 * Implements all requirements with Zod validation, logging, and MEXC API integration
 */
export class TaskSevenOrderPlacementService {
  private logger: Logger;
  private mexcClient: MexcClient;

  constructor(logger: Logger, mexcClient: MexcClient) {
    this.logger = logger;
    this.mexcClient = mexcClient;
  }

  async placeOrder(orderData: unknown): Promise<OrderPlacementResponse> {
    const startTime = Date.now();

    try {
      // Validate with Zod schema as required by Task #7
      const validatedOrder = TaskSevenOrderSchema.parse(orderData);

      // Log all orders as required by Task #7
      this.logger.info('Order placement attempt', {
        symbol: validatedOrder.symbol,
        side: validatedOrder.side,
        type: validatedOrder.type,
        quantity: validatedOrder.quantity,
        price: validatedOrder.price,
        testMode: validatedOrder.testMode,
        timestamp: startTime,
      });

      // Safety checks
      if (validatedOrder.quantity <= 0) {
        throw new Error('Quantity must be positive');
      }

      if (validatedOrder.type === 'LIMIT' && !validatedOrder.price) {
        throw new Error('Limit orders require a price');
      }

      if (validatedOrder.type === 'STOP' && !validatedOrder.stopPrice) {
        throw new Error('Stop orders require a stop price');
      }

      // Call MEXC REST API as required by Task #7
      const mexcResponse = await this.mexcClient.placeOrder({
        symbol: validatedOrder.symbol,
        side: validatedOrder.side.toLowerCase(), // MEXC API expects lowercase
        type: validatedOrder.type.toLowerCase(),
        quantity: validatedOrder.quantity,
        price: validatedOrder.price,
        stopPrice: validatedOrder.stopPrice,
        timeInForce: validatedOrder.timeInForce,
        clientOrderId: validatedOrder.clientOrderId,
        testMode: validatedOrder.testMode,
      });

      const response: OrderPlacementResponse = {
        success: true,
        data: {
          orderId: mexcResponse.orderId || `test-${Date.now()}`,
          status: mexcResponse.status || 'PLACED',
          symbol: validatedOrder.symbol,
          side: validatedOrder.side,
          quantity: validatedOrder.quantity,
          price: validatedOrder.price,
          timestamp: startTime,
        },
        timestamp: startTime,
      };

      // Log successful order placement
      this.logger.info('Order placed successfully', {
        orderId: response.data?.orderId,
        symbol: validatedOrder.symbol,
        side: validatedOrder.side,
        processingTime: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      // Log order placement errors
      this.logger.error('Order placement failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderData,
        timestamp: startTime,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: startTime,
      };
    }
  }
}

// Default logger implementation
export const defaultLogger: Logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.info(`[INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    console.debug(`[DEBUG] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
};
