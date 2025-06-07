/**
 * Task #9: Order History API Tests
 * TDD tests for implementing order history with query validation, filtering, and PostgreSQL integration
 * Requirements:
 * - Create GET endpoints for order and transaction history
 * - Store data in PostgreSQL
 * - Use Zod for query validation
 * - Test history retrieval with various filters
 * - Verify data integrity and performance
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Logger,
  type OrderHistoryQuery,
  type OrderRecord,
  type OrderRepository,
  TaskNineOrderHistoryService,
  type TransactionRecord,
} from '../task-9-order-history-service';

// Mock implementations
const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

const mockOrderRepository = {
  getOrderHistory: vi.fn(),
  getTransactionHistory: vi.fn(),
  getOrdersByIds: vi.fn(),
  getOrderStatistics: vi.fn(),
} as unknown as OrderRepository;

describe('Task #9: Order History API with Query Validation and Filtering', () => {
  let historyService: TaskNineOrderHistoryService;

  const mockOrders: OrderRecord[] = [
    {
      id: 'order-1',
      userId: 'user-123',
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'LIMIT',
      quantity: 0.001,
      price: 50000,
      status: 'filled',
      timeInForce: 'GTC',
      executedQuantity: 0.001,
      averagePrice: 50000,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:05:00Z'),
    },
    {
      id: 'order-2',
      userId: 'user-123',
      symbol: 'ETHUSDT',
      side: 'SELL',
      type: 'MARKET',
      quantity: 0.1,
      status: 'filled',
      executedQuantity: 0.1,
      averagePrice: 3000,
      createdAt: new Date('2024-01-02T10:00:00Z'),
      updatedAt: new Date('2024-01-02T10:01:00Z'),
    },
  ];

  const mockTransactions: TransactionRecord[] = [
    {
      id: 'tx-1',
      orderId: 'order-1',
      userId: 'user-123',
      symbol: 'BTCUSDT',
      side: 'BUY',
      quantity: 0.001,
      price: 50000,
      fee: 0.05,
      feeAsset: 'USDT',
      transactionTime: new Date('2024-01-01T10:05:00Z'),
      createdAt: new Date('2024-01-01T10:05:00Z'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock responses
    (mockOrderRepository.getOrderHistory as any).mockResolvedValue({
      orders: mockOrders,
      total: 2,
      page: 1,
      limit: 50,
      totalPages: 1,
    });

    (mockOrderRepository.getTransactionHistory as any).mockResolvedValue({
      transactions: mockTransactions,
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });

    (mockOrderRepository.getOrdersByIds as any).mockResolvedValue(mockOrders);

    (mockOrderRepository.getOrderStatistics as any).mockResolvedValue({
      totalOrders: 2,
      filledOrders: 2,
      cancelledOrders: 0,
      totalVolume: 350,
      avgOrderSize: 175,
    });

    historyService = new TaskNineOrderHistoryService(mockLogger, mockOrderRepository);
  });

  describe('Zod Query Validation', () => {
    it('should validate correct query parameters', async () => {
      const validQuery: OrderHistoryQuery = {
        userId: 'user-123',
        symbol: 'BTCUSDT',
        status: 'filled',
        limit: 25,
        page: 2,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const result = await historyService.getOrderHistory(validQuery);

      expect(result.success).toBe(true);
      expect(result.data?.orders).toEqual(mockOrders);
      expect(result.data?.pagination.total).toBe(2);
    });

    it('should apply default values for optional parameters', async () => {
      const minimalQuery = {
        userId: 'user-123',
      };

      const result = await historyService.getOrderHistory(minimalQuery);

      expect(result.success).toBe(true);
      expect(mockOrderRepository.getOrderHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          limit: 50,
          page: 1,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })
      );
    });

    it('should reject query without user ID', async () => {
      const invalidQuery = {
        symbol: 'BTCUSDT',
        status: 'filled',
        // Missing userId
      };

      const result = await historyService.getOrderHistory(invalidQuery);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });

    it('should reject invalid status values', async () => {
      const invalidQuery = {
        userId: 'user-123',
        status: 'invalid-status',
      };

      const result = await historyService.getOrderHistory(invalidQuery);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate limit boundaries', async () => {
      const invalidQuery = {
        userId: 'user-123',
        limit: 1000, // Exceeds maximum of 500
      };

      const result = await historyService.getOrderHistory(invalidQuery);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate page minimum value', async () => {
      const invalidQuery = {
        userId: 'user-123',
        page: 0, // Below minimum of 1
      };

      const result = await historyService.getOrderHistory(invalidQuery);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate date range consistency', async () => {
      const invalidQuery = {
        userId: 'user-123',
        startTime: new Date('2024-01-02'),
        endTime: new Date('2024-01-01'), // End before start
      };

      const result = await historyService.getOrderHistory(invalidQuery);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Start time must be before end time');
    });
  });

  describe('Order History Filtering', () => {
    it('should filter by symbol', async () => {
      const query = {
        userId: 'user-123',
        symbol: 'BTCUSDT',
      };

      await historyService.getOrderHistory(query);

      expect(mockOrderRepository.getOrderHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTCUSDT',
        })
      );
    });

    it('should filter by status', async () => {
      const query = {
        userId: 'user-123',
        status: 'filled' as const,
      };

      await historyService.getOrderHistory(query);

      expect(mockOrderRepository.getOrderHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'filled',
        })
      );
    });

    it('should filter by date range', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-31');

      const query = {
        userId: 'user-123',
        startTime,
        endTime,
      };

      await historyService.getOrderHistory(query);

      expect(mockOrderRepository.getOrderHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime,
          endTime,
        })
      );
    });

    it('should support sorting options', async () => {
      const query = {
        userId: 'user-123',
        sortBy: 'symbol' as const,
        sortOrder: 'asc' as const,
      };

      await historyService.getOrderHistory(query);

      expect(mockOrderRepository.getOrderHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'symbol',
          sortOrder: 'asc',
        })
      );
    });

    it('should support pagination', async () => {
      const query = {
        userId: 'user-123',
        page: 3,
        limit: 25,
      };

      await historyService.getOrderHistory(query);

      expect(mockOrderRepository.getOrderHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 3,
          limit: 25,
        })
      );
    });
  });

  describe('Transaction History', () => {
    it('should retrieve transaction history successfully', async () => {
      const query = {
        userId: 'user-123',
      };

      const result = await historyService.getTransactionHistory(query);

      expect(result.success).toBe(true);
      expect(result.data?.transactions).toEqual(mockTransactions);
      expect(result.data?.pagination.total).toBe(1);
      expect(mockOrderRepository.getTransactionHistory).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123' })
      );
    });

    it('should filter transaction history by symbol', async () => {
      const query = {
        userId: 'user-123',
        symbol: 'BTCUSDT',
      };

      await historyService.getTransactionHistory(query);

      expect(mockOrderRepository.getTransactionHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTCUSDT',
        })
      );
    });

    it('should validate date range for transactions', async () => {
      const invalidQuery = {
        userId: 'user-123',
        startTime: new Date('2024-01-02'),
        endTime: new Date('2024-01-01'),
      };

      const result = await historyService.getTransactionHistory(invalidQuery);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Start time must be before end time');
    });
  });

  describe('Batch Order Retrieval', () => {
    it('should retrieve orders by IDs successfully', async () => {
      const orderIds = ['order-1', 'order-2'];
      const userId = 'user-123';

      const result = await historyService.getOrdersByIds(orderIds, userId);

      expect(result.success).toBe(true);
      expect(result.data?.orders).toEqual(mockOrders);
      expect(mockOrderRepository.getOrdersByIds).toHaveBeenCalledWith(orderIds, userId);
    });

    it('should reject empty order IDs array', async () => {
      const result = await historyService.getOrdersByIds([], 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Order IDs are required');
    });

    it('should reject too many order IDs', async () => {
      const tooManyIds = Array.from({ length: 101 }, (_, i) => `order-${i}`);

      const result = await historyService.getOrdersByIds(tooManyIds, 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum 100 order IDs allowed per request');
    });

    it('should require user ID for batch retrieval', async () => {
      const result = await historyService.getOrdersByIds(['order-1'], '');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
  });

  describe('Statistics Integration', () => {
    it('should include statistics when no specific filters applied', async () => {
      const query = {
        userId: 'user-123',
      };

      const result = await historyService.getOrderHistory(query);

      expect(result.success).toBe(true);
      expect(result.data?.statistics).toBeDefined();
      expect(result.data?.statistics?.totalOrders).toBe(2);
      expect(result.data?.statistics?.filledOrders).toBe(2);
      expect(mockOrderRepository.getOrderStatistics).toHaveBeenCalledWith('user-123', undefined);
    });

    it('should not include statistics when symbol filter applied', async () => {
      const query = {
        userId: 'user-123',
        symbol: 'BTCUSDT',
      };

      const result = await historyService.getOrderHistory(query);

      expect(result.success).toBe(true);
      expect(result.data?.statistics).toBeUndefined();
      expect(mockOrderRepository.getOrderStatistics).not.toHaveBeenCalled();
    });

    it('should include statistics with date range when provided', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-31');

      const query = {
        userId: 'user-123',
        startTime,
        endTime,
      };

      const result = await historyService.getOrderHistory(query);

      expect(result.success).toBe(true);
      expect(result.data?.statistics).toBeDefined();
      expect(mockOrderRepository.getOrderStatistics).toHaveBeenCalledWith('user-123', {
        start: startTime,
        end: endTime,
      });
    });
  });

  describe('Comprehensive Logging', () => {
    it('should log order history requests', async () => {
      const query = {
        userId: 'user-123',
        symbol: 'BTCUSDT',
      };

      await historyService.getOrderHistory(query);

      expect(mockLogger.info).toHaveBeenCalledWith('Order history request', {
        userId: 'user-123',
        filters: {
          symbol: 'BTCUSDT',
          status: undefined,
          startTime: undefined,
          endTime: undefined,
        },
        pagination: {
          page: 1,
          limit: 50,
        },
        timestamp: expect.any(Number),
      });
    });

    it('should log successful order history retrieval', async () => {
      const query = {
        userId: 'user-123',
      };

      await historyService.getOrderHistory(query);

      expect(mockLogger.info).toHaveBeenCalledWith('Order history retrieved successfully', {
        userId: 'user-123',
        totalOrders: 2,
        page: 1,
        processingTime: expect.any(Number),
      });
    });

    it('should log order history retrieval failures', async () => {
      const invalidQuery = {
        userId: 'user-123',
        limit: 1000, // Invalid limit
      };

      await historyService.getOrderHistory(invalidQuery);

      expect(mockLogger.error).toHaveBeenCalledWith('Order history retrieval failed', {
        error: expect.any(String),
        queryData: invalidQuery,
        timestamp: expect.any(Number),
      });
    });

    it('should log transaction history requests', async () => {
      const query = {
        userId: 'user-123',
      };

      await historyService.getTransactionHistory(query);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Transaction history request',
        expect.any(Object)
      );
    });

    it('should log batch order retrieval requests', async () => {
      const orderIds = ['order-1', 'order-2'];

      await historyService.getOrdersByIds(orderIds, 'user-123');

      expect(mockLogger.info).toHaveBeenCalledWith('Batch order retrieval request', {
        userId: 'user-123',
        orderCount: 2,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (mockOrderRepository.getOrderHistory as any).mockRejectedValue(
        new Error('Database connection failed')
      );

      const query = {
        userId: 'user-123',
      };

      const result = await historyService.getOrderHistory(query);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should include timestamp in all responses', async () => {
      const query = {
        userId: 'user-123',
      };

      const result = await historyService.getOrderHistory(query);

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should handle malformed input gracefully', async () => {
      const malformedInputs = [null, undefined, '', 123, [], 'string'];

      for (const input of malformedInputs) {
        const result = await historyService.getOrderHistory(input);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Performance Considerations', () => {
    it('should limit maximum results per page', async () => {
      const query = {
        userId: 'user-123',
        limit: 500, // Maximum allowed
      };

      const result = await historyService.getOrderHistory(query);

      expect(result.success).toBe(true);
      expect(mockOrderRepository.getOrderHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 500,
        })
      );
    });

    it('should track processing time for performance monitoring', async () => {
      const query = {
        userId: 'user-123',
      };

      await historyService.getOrderHistory(query);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Order history retrieved successfully',
        expect.objectContaining({
          processingTime: expect.any(Number),
        })
      );
    });

    it('should handle large datasets efficiently', async () => {
      // Mock large dataset response
      const largeOrderSet = Array.from({ length: 500 }, (_, i) => ({
        ...mockOrders[0],
        id: `order-${i}`,
      }));

      (mockOrderRepository.getOrderHistory as any).mockResolvedValue({
        orders: largeOrderSet,
        total: 5000,
        page: 1,
        limit: 500,
        totalPages: 10,
      });

      const query = {
        userId: 'user-123',
        limit: 500,
      };

      const result = await historyService.getOrderHistory(query);

      expect(result.success).toBe(true);
      expect(result.data?.orders.length).toBe(500);
      expect(result.data?.pagination.totalPages).toBe(10);
    });
  });
});
