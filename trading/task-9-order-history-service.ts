/**
 * Task #9: Order History Service
 * Production implementation for order history with query validation, filtering, and PostgreSQL integration
 * Requirements:
 * - Create GET endpoints for order and transaction history
 * - Store data in PostgreSQL
 * - Use Zod for query validation
 * - Test history retrieval with various filters
 * - Verify data integrity and performance
 */

import { z } from 'zod';

// Zod schema for order history query parameters with custom error messages
export const OrderHistoryQuerySchema = z.object({
  symbol: z.string().optional(),
  status: z
    .enum(['pending', 'open', 'filled', 'partially_filled', 'cancelled', 'rejected', 'expired'])
    .optional(),
  userId: z
    .string({
      required_error: 'User ID is required',
      invalid_type_error: 'User ID must be a string',
    })
    .min(1, 'User ID is required'),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  page: z.coerce.number().int().min(1).default(1),
  sortBy: z.enum(['createdAt', 'updatedAt', 'symbol', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type OrderHistoryQuery = z.infer<typeof OrderHistoryQuerySchema>;

// Order interface for database results
export interface OrderRecord {
  id: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: 'pending' | 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected' | 'expired';
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  clientOrderId?: string;
  executedQuantity?: number;
  averagePrice?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Transaction interface for transaction history
export interface TransactionRecord {
  id: string;
  orderId: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  fee: number;
  feeAsset: string;
  transactionTime: Date;
  createdAt: Date;
}

// Logger interface
export interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

// Order Repository interface for PostgreSQL operations
export interface OrderRepository {
  getOrderHistory: (query: OrderHistoryQuery) => Promise<{
    orders: OrderRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  getTransactionHistory: (query: OrderHistoryQuery) => Promise<{
    transactions: TransactionRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  getOrdersByIds: (orderIds: string[], userId: string) => Promise<OrderRecord[]>;
  getOrderStatistics: (
    userId: string,
    timeRange?: { start: Date; end: Date }
  ) => Promise<{
    totalOrders: number;
    filledOrders: number;
    cancelledOrders: number;
    totalVolume: number;
    avgOrderSize: number;
  }>;
}

// Response interfaces
export interface OrderHistoryResponse {
  success: boolean;
  data?: {
    orders: OrderRecord[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    statistics?: {
      totalOrders: number;
      filledOrders: number;
      cancelledOrders: number;
      totalVolume: number;
      avgOrderSize: number;
    };
  };
  error?: string;
  timestamp: number;
}

export interface TransactionHistoryResponse {
  success: boolean;
  data?: {
    transactions: TransactionRecord[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
  error?: string;
  timestamp: number;
}

/**
 * Task #9 Order History Service
 * Implements comprehensive order history retrieval with filtering, validation, and performance optimization
 */
export class TaskNineOrderHistoryService {
  private logger: Logger;
  private orderRepository: OrderRepository;

  constructor(logger: Logger, orderRepository: OrderRepository) {
    this.logger = logger;
    this.orderRepository = orderRepository;
  }

  async getOrderHistory(queryData: unknown): Promise<OrderHistoryResponse> {
    const startTime = Date.now();

    try {
      // Validate with Zod schema and provide user-friendly error messages
      const validationResult = OrderHistoryQuerySchema.safeParse(queryData);
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        throw new Error(firstError.message);
      }

      const query = validationResult.data;

      // Log history request
      this.logger.info('Order history request', {
        userId: query.userId,
        filters: {
          symbol: query.symbol,
          status: query.status,
          startTime: query.startTime,
          endTime: query.endTime,
        },
        pagination: {
          page: query.page,
          limit: query.limit,
        },
        timestamp: startTime,
      });

      // Validate date range
      if (query.startTime && query.endTime && query.startTime > query.endTime) {
        throw new Error('Start time must be before end time');
      }

      // Get order history from database
      const historyResult = await this.orderRepository.getOrderHistory(query);

      // Get statistics if no specific filters applied (for performance)
      let statistics:
        | {
            totalOrders: number;
            filledOrders: number;
            cancelledOrders: number;
            totalVolume: number;
            avgOrderSize: number;
          }
        | undefined;
      if (!query.symbol && !query.status) {
        const timeRange =
          query.startTime && query.endTime
            ? { start: query.startTime, end: query.endTime }
            : undefined;
        statistics = await this.orderRepository.getOrderStatistics(query.userId, timeRange);
      }

      const response: OrderHistoryResponse = {
        success: true,
        data: {
          orders: historyResult.orders,
          pagination: {
            total: historyResult.total,
            page: historyResult.page,
            limit: historyResult.limit,
            totalPages: historyResult.totalPages,
          },
          statistics,
        },
        timestamp: startTime,
      };

      // Log successful retrieval
      this.logger.info('Order history retrieved successfully', {
        userId: query.userId,
        totalOrders: historyResult.total,
        page: query.page,
        processingTime: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      // Log history retrieval errors
      this.logger.error('Order history retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        queryData,
        timestamp: startTime,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: startTime,
      };
    }
  }

  async getTransactionHistory(queryData: unknown): Promise<TransactionHistoryResponse> {
    const startTime = Date.now();

    try {
      // Validate with Zod schema and provide user-friendly error messages
      const validationResult = OrderHistoryQuerySchema.safeParse(queryData);
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        throw new Error(firstError.message);
      }

      const query = validationResult.data;

      // Log transaction history request
      this.logger.info('Transaction history request', {
        userId: query.userId,
        filters: {
          symbol: query.symbol,
          startTime: query.startTime,
          endTime: query.endTime,
        },
        pagination: {
          page: query.page,
          limit: query.limit,
        },
        timestamp: startTime,
      });

      // Validate date range
      if (query.startTime && query.endTime && query.startTime > query.endTime) {
        throw new Error('Start time must be before end time');
      }

      // Get transaction history from database
      const transactionResult = await this.orderRepository.getTransactionHistory(query);

      const response: TransactionHistoryResponse = {
        success: true,
        data: {
          transactions: transactionResult.transactions,
          pagination: {
            total: transactionResult.total,
            page: transactionResult.page,
            limit: transactionResult.limit,
            totalPages: transactionResult.totalPages,
          },
        },
        timestamp: startTime,
      };

      // Log successful retrieval
      this.logger.info('Transaction history retrieved successfully', {
        userId: query.userId,
        totalTransactions: transactionResult.total,
        page: query.page,
        processingTime: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      // Log transaction history retrieval errors
      this.logger.error('Transaction history retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        queryData,
        timestamp: startTime,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: startTime,
      };
    }
  }

  async getOrdersByIds(orderIds: string[], userId: string): Promise<OrderHistoryResponse> {
    const startTime = Date.now();

    try {
      if (!orderIds || orderIds.length === 0) {
        throw new Error('Order IDs are required');
      }

      if (orderIds.length > 100) {
        throw new Error('Maximum 100 order IDs allowed per request');
      }

      if (!userId) {
        throw new Error('User ID is required');
      }

      // Log batch order retrieval request
      this.logger.info('Batch order retrieval request', {
        userId,
        orderCount: orderIds.length,
        timestamp: startTime,
      });

      // Get orders by IDs
      const orders = await this.orderRepository.getOrdersByIds(orderIds, userId);

      const response: OrderHistoryResponse = {
        success: true,
        data: {
          orders,
          pagination: {
            total: orders.length,
            page: 1,
            limit: orders.length,
            totalPages: 1,
          },
        },
        timestamp: startTime,
      };

      // Log successful retrieval
      this.logger.info('Batch orders retrieved successfully', {
        userId,
        requestedCount: orderIds.length,
        retrievedCount: orders.length,
        processingTime: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      // Log batch order retrieval errors
      this.logger.error('Batch order retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        orderIds,
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
