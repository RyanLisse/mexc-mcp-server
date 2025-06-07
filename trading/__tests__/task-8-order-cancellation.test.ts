/**
 * Task #8: Order Cancellation API Tests
 * TDD tests for implementing order cancellation with status tracking, permission validation, and logging
 * Requirements:
 * - DELETE endpoint for order cancellation
 * - Track order status in PostgreSQL
 * - Validate permissions and log actions
 * - Test cancellation with valid/invalid IDs
 * - Verify status updates and logging
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type CancelOrderArgs,
  type Logger,
  type MexcClient,
  type OrderRepository,
  TaskEightOrderCancellationService,
} from '../task-8-order-cancellation-service';

// Mock implementations
const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

const mockMexcClient = {
  cancelOrder: vi.fn(),
} as unknown as MexcClient;

const mockOrderRepository = {
  getOrderById: vi.fn(),
  updateOrderStatus: vi.fn(),
  logOrderAction: vi.fn(),
} as unknown as OrderRepository;

describe('Task #8: Order Cancellation API with Validation and Logging', () => {
  let cancellationService: TaskEightOrderCancellationService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock responses
    (mockMexcClient.cancelOrder as any).mockResolvedValue({
      orderId: 'test-order-123',
      status: 'CANCELLED',
      symbol: 'BTCUSDT',
    });

    (mockOrderRepository.getOrderById as any).mockResolvedValue({
      id: 'test-order-123',
      userId: 'user-123',
      status: 'open',
      symbol: 'BTCUSDT',
      side: 'BUY',
      quantity: 0.001,
      price: 50000,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    });

    (mockOrderRepository.updateOrderStatus as any).mockResolvedValue(undefined);
    (mockOrderRepository.logOrderAction as any).mockResolvedValue(undefined);

    cancellationService = new TaskEightOrderCancellationService(
      mockLogger,
      mockMexcClient,
      mockOrderRepository
    );
  });

  describe('Zod Validation Requirements', () => {
    it('should validate correct cancellation request structure', async () => {
      const validRequest: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        userId: 'user-123',
        clientOrderId: 'client-123',
      };

      const result = await cancellationService.cancelOrder(validRequest);

      expect(result.success).toBe(true);
      expect(result.data?.orderId).toBe('test-order-123');
      expect(result.data?.status).toBe('cancelled');
      expect(result.data?.symbol).toBe('BTCUSDT');
      expect(result.data?.previousStatus).toBe('open');
    });

    it('should reject request with missing order ID', async () => {
      const invalidRequest = {
        symbol: 'BTCUSDT',
        userId: 'user-123',
        // Missing orderId
      };

      const result = await cancellationService.cancelOrder(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Order ID is required');
    });

    it('should reject request with missing symbol', async () => {
      const invalidRequest = {
        orderId: 'test-order-123',
        userId: 'user-123',
        // Missing symbol
      };

      const result = await cancellationService.cancelOrder(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Symbol is required');
    });

    it('should reject request with missing user ID', async () => {
      const invalidRequest = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        // Missing userId
      };

      const result = await cancellationService.cancelOrder(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
  });

  describe('Permission Validation', () => {
    it('should allow users to cancel their own orders', async () => {
      const validRequest: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        userId: 'user-123', // Matches the mocked order userId
      };

      const result = await cancellationService.cancelOrder(validRequest);

      expect(result.success).toBe(true);
      expect(mockOrderRepository.getOrderById).toHaveBeenCalledWith('test-order-123');
    });

    it('should reject cancellation when user does not own the order', async () => {
      const invalidRequest: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        userId: 'different-user-456', // Different from mocked order userId
      };

      const result = await cancellationService.cancelOrder(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Permission denied: Cannot cancel order belonging to another user'
      );
    });

    it('should reject cancellation when order does not exist', async () => {
      (mockOrderRepository.getOrderById as any).mockResolvedValue(null);

      const request: CancelOrderArgs = {
        orderId: 'non-existent-order',
        symbol: 'BTCUSDT',
        userId: 'user-123',
      };

      const result = await cancellationService.cancelOrder(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Order non-existent-order not found');
    });
  });

  describe('Order Status Validation', () => {
    it('should allow cancellation of pending orders', async () => {
      (mockOrderRepository.getOrderById as any).mockResolvedValue({
        id: 'test-order-123',
        userId: 'user-123',
        status: 'pending',
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: 0.001,
        price: 50000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        userId: 'user-123',
      };

      const result = await cancellationService.cancelOrder(request);

      expect(result.success).toBe(true);
      expect(result.data?.previousStatus).toBe('pending');
    });

    it('should allow cancellation of open orders', async () => {
      // Default mock already has 'open' status
      const request: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        userId: 'user-123',
      };

      const result = await cancellationService.cancelOrder(request);

      expect(result.success).toBe(true);
      expect(result.data?.previousStatus).toBe('open');
    });

    it('should reject cancellation of already cancelled orders', async () => {
      (mockOrderRepository.getOrderById as any).mockResolvedValue({
        id: 'test-order-123',
        userId: 'user-123',
        status: 'cancelled',
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: 0.001,
        price: 50000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        userId: 'user-123',
      };

      const result = await cancellationService.cancelOrder(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot cancel order with status: cancelled');
    });

    it('should reject cancellation of filled orders', async () => {
      (mockOrderRepository.getOrderById as any).mockResolvedValue({
        id: 'test-order-123',
        userId: 'user-123',
        status: 'filled',
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: 0.001,
        price: 50000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        userId: 'user-123',
      };

      const result = await cancellationService.cancelOrder(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot cancel order with status: filled');
    });

    it('should reject cancellation when symbol mismatch', async () => {
      const request: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'ETHUSDT', // Different from mocked order symbol (BTCUSDT)
        userId: 'user-123',
      };

      const result = await cancellationService.cancelOrder(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Symbol mismatch between request and existing order');
    });
  });

  describe('MEXC REST API Integration', () => {
    it('should call MEXC API for order cancellation', async () => {
      const request: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        userId: 'user-123',
        clientOrderId: 'client-123',
      };

      await cancellationService.cancelOrder(request);

      expect(mockMexcClient.cancelOrder).toHaveBeenCalledWith({
        symbol: 'BTCUSDT',
        orderId: 'test-order-123',
        clientOrderId: 'client-123',
      });
    });

    it('should handle MEXC API errors', async () => {
      (mockMexcClient.cancelOrder as any).mockRejectedValue(new Error('MEXC API error'));

      const request: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        userId: 'user-123',
      };

      const result = await cancellationService.cancelOrder(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('MEXC API error');
    });
  });

  describe('PostgreSQL Status Tracking', () => {
    it('should update order status in PostgreSQL', async () => {
      const request: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        userId: 'user-123',
      };

      await cancellationService.cancelOrder(request);

      expect(mockOrderRepository.updateOrderStatus).toHaveBeenCalledWith(
        'test-order-123',
        'cancelled',
        expect.any(Date)
      );
    });

    it('should log order action for audit trail', async () => {
      const request: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        userId: 'user-123',
      };

      await cancellationService.cancelOrder(request);

      expect(mockOrderRepository.logOrderAction).toHaveBeenCalledWith({
        orderId: 'test-order-123',
        userId: 'user-123',
        action: 'cancel_order',
        details: {
          previousStatus: 'open',
          cancelledAt: expect.any(Date),
          mexcResponse: {
            orderId: 'test-order-123',
            status: 'CANCELLED',
            symbol: 'BTCUSDT',
          },
        },
        timestamp: expect.any(Date),
      });
    });

    it('should handle database errors gracefully', async () => {
      (mockOrderRepository.updateOrderStatus as any).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        userId: 'user-123',
      };

      const result = await cancellationService.cancelOrder(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('Comprehensive Logging Requirements', () => {
    it('should log all cancellation attempts', async () => {
      const request: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        userId: 'user-123',
      };

      await cancellationService.cancelOrder(request);

      expect(mockLogger.info).toHaveBeenCalledWith('Order cancellation attempt', {
        orderId: 'test-order-123',
        userId: 'user-123',
        symbol: 'BTCUSDT',
        timestamp: expect.any(Number),
      });
    });

    it('should log successful cancellations', async () => {
      const request: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        userId: 'user-123',
      };

      await cancellationService.cancelOrder(request);

      expect(mockLogger.info).toHaveBeenCalledWith('Order cancelled successfully', {
        orderId: 'test-order-123',
        userId: 'user-123',
        previousStatus: 'open',
        processingTime: expect.any(Number),
      });
    });

    it('should log cancellation failures', async () => {
      const invalidRequest = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        // Missing userId
      };

      await cancellationService.cancelOrder(invalidRequest);

      expect(mockLogger.error).toHaveBeenCalledWith('Order cancellation failed', {
        error: expect.stringContaining('User ID is required'),
        orderData: invalidRequest,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages for validation failures', async () => {
      const invalidRequest = {
        orderId: '', // Empty order ID
        symbol: '', // Empty symbol
        userId: '', // Empty user ID
      };

      const result = await cancellationService.cancelOrder(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.error?.length).toBeGreaterThan(0);
    });

    it('should include timestamp in all responses', async () => {
      const request: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        userId: 'user-123',
      };

      const result = await cancellationService.cancelOrder(request);

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should handle malformed input gracefully', async () => {
      const malformedInputs = [null, undefined, '', 123, [], 'string'];

      for (const input of malformedInputs) {
        const result = await cancellationService.cancelOrder(input);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent cancellation attempts', async () => {
      const request: CancelOrderArgs = {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        userId: 'user-123',
      };

      // Simulate concurrent cancellation attempts
      const promises = Array.from({ length: 3 }, () => cancellationService.cancelOrder(request));

      const results = await Promise.all(promises);

      // First one should succeed, others should fail due to status change
      const successCount = results.filter((r) => r.success).length;
      expect(successCount).toBe(1);
    });

    it('should handle very long order IDs', async () => {
      const longOrderId = 'a'.repeat(1000);
      (mockOrderRepository.getOrderById as any).mockResolvedValue({
        id: longOrderId,
        userId: 'user-123',
        status: 'open',
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: 0.001,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request: CancelOrderArgs = {
        orderId: longOrderId,
        symbol: 'BTCUSDT',
        userId: 'user-123',
      };

      const result = await cancellationService.cancelOrder(request);
      expect(result.success).toBe(true);
    });
  });
});
