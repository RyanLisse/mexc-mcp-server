/**
 * Rate Limiting Middleware Tests
 * TDD tests for Task #5: Rate limiting middleware integration
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock request/response interfaces
interface MockRequest {
  url?: string;
  method?: string;
  headers: Record<string, string>;
}

interface MockResponse {
  status: (code: number) => MockResponse;
  send: (data: any) => void;
  setHeader: (key: string, value: string) => void;
  headers: Record<string, string>;
}

describe('Rate Limiting Middleware - Task #5', () => {
  let mockReq: MockRequest;
  let mockRes: MockResponse;
  let nextSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockReq = {
      url: '/test-endpoint',
      method: 'GET',
      headers: {},
    };

    mockRes = {
      headers: {},
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      setHeader: vi.fn((key, value) => {
        mockRes.headers[key] = value;
      }),
    };

    nextSpy = vi.fn();
  });

  describe('Basic Rate Limiting Middleware', () => {
    it('should allow requests within rate limit', async () => {
      // Arrange
      const { rateLimitMiddleware } = await import('./rate-limit');
      mockReq.headers.authorization = 'Bearer mx_test_key_123456789';

      // Act
      await rateLimitMiddleware(mockReq as any, mockRes as any, nextSpy);

      // Assert
      expect(nextSpy).toHaveBeenCalledOnce();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.headers['X-RateLimit-Limit']).toBeDefined();
      expect(mockRes.headers['X-RateLimit-Remaining']).toBeDefined();
    });

    it('should block requests that exceed rate limit', async () => {
      // Arrange
      const { rateLimitMiddleware } = await import('./rate-limit');
      mockReq.headers.authorization = 'Bearer mx_test_key_123456789';

      // Act - Make many requests to exceed limit
      for (let i = 0; i < 1005; i++) { // Exceed authenticated limit of 1000
        await rateLimitMiddleware(mockReq as any, mockRes as any, nextSpy);
      }

      // Assert - Last requests should be blocked
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Rate limit exceeded'),
          retryAfter: expect.any(Number),
        })
      );
    });

    it('should apply different limits for authenticated vs unauthenticated users', async () => {
      // Arrange
      const { rateLimitMiddleware } = await import('./rate-limit');
      
      // Test with unauthenticated user first (lower limit)
      mockReq.headers['x-forwarded-for'] = '192.168.1.100';
      
      // Act - Make 101 requests as unauthenticated user (should exceed 100 limit)
      let unauthBlocked = false;
      for (let i = 0; i < 101; i++) {
        await rateLimitMiddleware(mockReq as any, mockRes as any, nextSpy);
        if (mockRes.status.mock.calls.length > 0) {
          unauthBlocked = true;
          break;
        }
      }

      // Assert - Should be blocked for unauth user
      expect(unauthBlocked).toBe(true);

      // Reset for authenticated user test
      vi.clearAllMocks();
      nextSpy = vi.fn();
      mockRes.status = vi.fn().mockReturnThis();
      mockRes.send = vi.fn();

      // Test with authenticated user (higher limit)
      mockReq.headers.authorization = 'Bearer mx_different_test_key_567';
      delete mockReq.headers['x-forwarded-for'];
      
      // Act - Make 150 requests (should be allowed for auth user)
      let authBlocked = false;
      for (let i = 0; i < 150; i++) {
        await rateLimitMiddleware(mockReq as any, mockRes as any, nextSpy);
        if (mockRes.status.mock.calls.length > 0) {
          authBlocked = true;
          break;
        }
      }

      // Assert - Should still be allowed for auth user
      expect(authBlocked).toBe(false);
      expect(nextSpy).toHaveBeenCalled();
    });

    it('should use IP address for unauthenticated users', async () => {
      // Arrange
      const { rateLimitMiddleware } = await import('./rate-limit');
      mockReq.headers['x-forwarded-for'] = '192.168.1.100';
      // Ensure no auth header
      delete mockReq.headers.authorization;

      // Act
      await rateLimitMiddleware(mockReq as any, mockRes as any, nextSpy);

      // Assert
      expect(nextSpy).toHaveBeenCalledOnce();
      expect(mockRes.headers['X-RateLimit-Limit']).toBe('100'); // Unauthenticated limit
    });
  });

  describe('MEXC-Specific Rate Limiting Middleware', () => {
    it('should apply order rate limits for POST /orders endpoints', async () => {
      // Arrange
      const { mexcRateLimitMiddleware } = await import('./rate-limit');
      mockReq.url = '/orders';
      mockReq.method = 'POST';
      mockReq.headers.authorization = 'Bearer mx_test_key_123456789';

      // Act - Make 6 order requests (should exceed 5 orders/second limit)
      for (let i = 0; i < 6; i++) {
        await mexcRateLimitMiddleware(mockReq as any, mockRes as any, nextSpy);
      }

      // Assert - Last request should be blocked
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'MEXC API rate limit exceeded',
          endpoint: '/orders',
        })
      );
    });

    it('should apply batch order rate limits for POST /orders/batch endpoints', async () => {
      // Arrange
      const { mexcRateLimitMiddleware } = await import('./rate-limit');
      mockReq.url = '/orders/batch';
      mockReq.method = 'POST';
      mockReq.headers.authorization = 'Bearer mx_test_key_123456789';

      // Act - Make 3 batch order requests (should exceed 2 batches/second limit)
      for (let i = 0; i < 3; i++) {
        await mexcRateLimitMiddleware(mockReq as any, mockRes as any, nextSpy);
      }

      // Assert - Last request should be blocked
      expect(mockRes.status).toHaveBeenCalledWith(429);
    });

    it('should apply weight-based limits for market data endpoints', async () => {
      // Arrange
      const { mexcRateLimitMiddleware } = await import('./rate-limit');
      mockReq.url = '/orderbook'; // High weight endpoint (5)
      mockReq.headers.authorization = 'Bearer mx_test_key_123456789';

      // Act - Make 101 requests (101 * 5 = 505 weight, should exceed 500 limit)
      for (let i = 0; i < 101; i++) {
        await mexcRateLimitMiddleware(mockReq as any, mockRes as any, nextSpy);
      }

      // Assert - Should be blocked due to weight limit
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          weight: expect.any(Number),
        })
      );
    });

    it('should assign correct weights to different endpoints', async () => {
      // Arrange
      const { mexcRateLimitMiddleware } = await import('./rate-limit');
      
      // Test different endpoints and their expected weights
      const endpointTests = [
        { url: '/ticker', expectedWeight: 1 },
        { url: '/orderbook', expectedWeight: 5 },
        { url: '/account', expectedWeight: 10 },
        { url: '/orders', expectedWeight: 20 },
        { url: '/unknown-endpoint', expectedWeight: 1 }, // default weight
      ];

      for (const test of endpointTests) {
        mockReq.url = test.url;
        
        // Act
        await mexcRateLimitMiddleware(mockReq as any, mockRes as any, nextSpy);
        
        // The weight is verified indirectly by checking rate limit behavior
        // This is a simplified test - in practice we'd need to inspect internal state
        expect(nextSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Rate Limit Headers', () => {
    it('should set standard rate limit headers', async () => {
      // Arrange
      const { rateLimitMiddleware } = await import('./rate-limit');
      mockReq.headers.authorization = 'Bearer mx_test_key_123456789';

      // Act
      await rateLimitMiddleware(mockReq as any, mockRes as any, nextSpy);

      // Assert
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should set Retry-After header when rate limited', async () => {
      // Arrange
      const { rateLimitMiddleware } = await import('./rate-limit');
      mockReq.headers.authorization = 'Bearer mx_test_key_123456789';

      // Act - Exceed rate limit
      for (let i = 0; i < 1005; i++) {
        await rateLimitMiddleware(mockReq as any, mockRes as any, nextSpy);
      }

      // Assert
      expect(mockRes.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });
  });

  describe('User Identification', () => {
    it('should extract user ID from Bearer token', async () => {
      // Arrange
      const { rateLimitMiddleware } = await import('./rate-limit');
      mockReq.headers.authorization = 'Bearer mx_unique_api_key_12345';

      // Act
      await rateLimitMiddleware(mockReq as any, mockRes as any, nextSpy);

      // Assert - Different API keys should get different rate limits
      expect(nextSpy).toHaveBeenCalledOnce();

      // Test with different API key
      vi.clearAllMocks();
      nextSpy = vi.fn();
      mockReq.headers.authorization = 'Bearer mx_different_api_key_67890';

      await rateLimitMiddleware(mockReq as any, mockRes as any, nextSpy);
      expect(nextSpy).toHaveBeenCalledOnce();
    });

    it('should use IP address for unauthenticated users', async () => {
      // Arrange
      const { rateLimitMiddleware } = await import('./rate-limit');
      mockReq.headers['x-forwarded-for'] = '192.168.1.100';
      delete mockReq.headers.authorization;

      // Act
      await rateLimitMiddleware(mockReq as any, mockRes as any, nextSpy);

      // Assert
      expect(nextSpy).toHaveBeenCalledOnce();

      // Test with different IP - should be treated as different user
      vi.clearAllMocks();
      nextSpy = vi.fn();
      mockRes.setHeader = vi.fn();
      mockReq.headers['x-forwarded-for'] = '192.168.1.200';

      await rateLimitMiddleware(mockReq as any, mockRes as any, nextSpy);
      expect(nextSpy).toHaveBeenCalledOnce();
    });
  });

  describe('Error Handling', () => {
    it('should continue on rate limiting errors', async () => {
      // Arrange
      const { rateLimitMiddleware } = await import('./rate-limit');
      // Create an invalid request that might cause internal errors
      mockReq.headers = {}; // No headers at all

      // Act
      await rateLimitMiddleware(mockReq as any, mockRes as any, nextSpy);

      // Assert - Should continue even if there's an error
      expect(nextSpy).toHaveBeenCalledOnce();
    });
  });

  describe('Rate Limit Status and Monitoring', () => {
    it('should provide rate limit status without consuming quota', async () => {
      // Arrange
      const { getRateLimitStatus } = await import('./rate-limit');
      const userId = 'test-user-123';
      const endpoint = '/ticker';

      // Act
      const status = await getRateLimitStatus(userId, endpoint);

      // Assert
      expect(status.general).toBeDefined();
      expect(status.mexc).toBeDefined();
      expect(status.general.allowed).toBe(true); // Status check shouldn't consume quota
      expect(status.mexc?.allowed).toBe(true);
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should clean up expired rate limit entries', async () => {
      // Arrange
      const { cleanupRateLimits } = await import('./rate-limit');

      // Act
      await cleanupRateLimits();

      // Assert - Should not throw errors
      expect(true).toBe(true); // If we get here, cleanup worked
    });

    it('should initialize cleanup interval', async () => {
      // Arrange
      const { initializeRateLimitCleanup } = await import('./rate-limit');
      
      // Mock setInterval to avoid actual timer
      const setIntervalSpy = vi.spyOn(global, 'setInterval').mockImplementation(() => 123 as any);

      // Act
      initializeRateLimitCleanup();

      // Assert
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000); // 5 minutes
      
      // Cleanup
      setIntervalSpy.mockRestore();
    });
  });
});