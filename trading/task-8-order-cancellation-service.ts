/**
 * Task #8: Order Cancellation Service
 * Production implementation for order cancellation with status tracking, permission validation, and comprehensive logging
 * Requirements:
 * - DELETE endpoint for order cancellation
 * - Track order status in PostgreSQL
 * - Validate permissions and log actions
 * - Comprehensive error handling with user-friendly messages
 */

import { z } from 'zod';

// Zod schema for order cancellation requests with custom error messages
export const CancelOrderSchema = z.object({
  orderId: z
    .string({
      required_error: 'Order ID is required',
      invalid_type_error: 'Order ID must be a string',
    })
    .min(1, 'Order ID is required'),
  clientOrderId: z.string().optional(),
  symbol: z
    .string({
      required_error: 'Symbol is required',
      invalid_type_error: 'Symbol must be a string',
    })
    .min(1, 'Symbol is required'),
  userId: z
    .string({
      required_error: 'User ID is required',
      invalid_type_error: 'User ID must be a string',
    })
    .min(1, 'User ID is required'),
});

export type CancelOrderArgs = z.infer<typeof CancelOrderSchema>;

// Order status types
export type OrderStatus =
  | 'pending'
  | 'open'
  | 'filled'
  | 'partially_filled'
  | 'cancelled'
  | 'rejected'
  | 'expired';

// Logger interface
export interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

// MEXC Client interface
export interface MexcClient {
  cancelOrder: (orderData: {
    symbol: string;
    orderId?: string;
    clientOrderId?: string;
  }) => Promise<{
    orderId: string;
    status: string;
    symbol: string;
  }>;
}

// Order Repository interface for PostgreSQL operations
export interface OrderRepository {
  getOrderById: (orderId: string) => Promise<{
    id: string;
    userId: string;
    status: OrderStatus;
    symbol: string;
    side: string;
    quantity: number;
    price?: number;
    createdAt: Date;
    updatedAt: Date;
  } | null>;
  updateOrderStatus: (orderId: string, status: OrderStatus, updatedAt: Date) => Promise<void>;
  logOrderAction: (action: {
    orderId: string;
    userId: string;
    action: string;
    details: Record<string, unknown>;
    timestamp: Date;
  }) => Promise<void>;
}

// Response interface
export interface OrderCancellationResponse {
  success: boolean;
  data?: {
    orderId: string;
    status: string;
    symbol: string;
    cancelledAt: Date;
    previousStatus: OrderStatus;
  };
  error?: string;
  timestamp: number;
}

/**
 * Task #8 Order Cancellation Service
 * Implements comprehensive order cancellation with validation, logging, and status tracking
 */
export class TaskEightOrderCancellationService {
  private logger: Logger;
  private mexcClient: MexcClient;
  private orderRepository: OrderRepository;
  private activeOperations: Set<string> = new Set(); // Track ongoing operations

  constructor(logger: Logger, mexcClient: MexcClient, orderRepository: OrderRepository) {
    this.logger = logger;
    this.mexcClient = mexcClient;
    this.orderRepository = orderRepository;
  }

  async cancelOrder(orderData: unknown): Promise<OrderCancellationResponse> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      // Validate with Zod schema and provide user-friendly error messages
      const validationResult = CancelOrderSchema.safeParse(orderData);
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        throw new Error(firstError.message);
      }

      const validatedOrder = validationResult.data;

      // Check for concurrent operations on the same order
      if (this.activeOperations.has(validatedOrder.orderId)) {
        throw new Error('Order cancellation already in progress');
      }

      // Mark operation as active
      this.activeOperations.add(validatedOrder.orderId);

      try {
        // Log cancellation attempt
        this.logger.info('Order cancellation attempt', {
          orderId: validatedOrder.orderId,
          userId: validatedOrder.userId,
          symbol: validatedOrder.symbol,
          timestamp: startTime,
        });

        // Get order from database for validation
        const existingOrder = await this.orderRepository.getOrderById(validatedOrder.orderId);

        if (!existingOrder) {
          throw new Error(`Order ${validatedOrder.orderId} not found`);
        }

        // Permission validation - users can only cancel their own orders
        if (existingOrder.userId !== validatedOrder.userId) {
          throw new Error('Permission denied: Cannot cancel order belonging to another user');
        }

        // Status validation - can only cancel pending or open orders
        if (!['pending', 'open'].includes(existingOrder.status)) {
          throw new Error(`Cannot cancel order with status: ${existingOrder.status}`);
        }

        // Symbol validation
        if (existingOrder.symbol !== validatedOrder.symbol) {
          throw new Error('Symbol mismatch between request and existing order');
        }

        // Call MEXC REST API for actual cancellation
        const mexcResponse = await this.mexcClient.cancelOrder({
          symbol: validatedOrder.symbol,
          orderId: validatedOrder.orderId,
          clientOrderId: validatedOrder.clientOrderId,
        });

        // Update order status in PostgreSQL
        await this.orderRepository.updateOrderStatus(
          validatedOrder.orderId,
          'cancelled',
          timestamp
        );

        // Log order action for audit trail
        await this.orderRepository.logOrderAction({
          orderId: validatedOrder.orderId,
          userId: validatedOrder.userId,
          action: 'cancel_order',
          details: {
            previousStatus: existingOrder.status,
            cancelledAt: timestamp,
            mexcResponse,
          },
          timestamp,
        });

        const response: OrderCancellationResponse = {
          success: true,
          data: {
            orderId: validatedOrder.orderId,
            status: 'cancelled',
            symbol: validatedOrder.symbol,
            cancelledAt: timestamp,
            previousStatus: existingOrder.status,
          },
          timestamp: startTime,
        };

        // Log successful cancellation
        this.logger.info('Order cancelled successfully', {
          orderId: validatedOrder.orderId,
          userId: validatedOrder.userId,
          previousStatus: existingOrder.status,
          processingTime: Date.now() - startTime,
        });

        return response;
      } finally {
        // Remove from active operations
        this.activeOperations.delete(validatedOrder.orderId);
      }
    } catch (error) {
      // Log cancellation errors with proper formatting
      this.logger.error('Order cancellation failed', {
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

// Default logger implementation for production use
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
