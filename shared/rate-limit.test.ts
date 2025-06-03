/**
 * Enhanced Rate Limiting System Tests
 * TDD tests for Task #5: Comprehensive rate limiting with MEXC API integration
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Test interfaces for rate limiting
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  burstLimit?: number;
  adaptive?: boolean;
}

interface MexcRateLimitConfig {
  // MEXC-specific config
  orderLimit: number; // 5 orders/second starting Mar 25, 2025
  batchOrderLimit: number; // 2 batches/second
  defaultWeight: number; // Weight for endpoints without specific weight
  maxWeight: number; // 500 weight per 10 seconds per endpoint
  websocketLimit: number; // 100 requests/second
  maxWebsocketStreams: number; // 30 streams per connection
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  weight?: number;
}

interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

describe('Enhanced Rate Limiting System - Task #5', () => {
  beforeEach(() => {
    // Reset any cached state
    vi.clearAllMocks();
  });

  describe('Basic Rate Limiting (Enhancement of Existing)', () => {
    it('should enforce basic rate limits with sliding window', async () => {
      // Arrange
      const { EnhancedRateLimiter } = await import('./rate-limit');
      const config: RateLimitConfig = {
        maxRequests: 10,
        windowMs: 60000, // 1 minute
      };
      const rateLimiter = new EnhancedRateLimiter(config);

      // Act - Make requests up to the limit
      const results: RateLimitResult[] = [];
      for (let i = 0; i < 12; i++) {
        results.push(await rateLimiter.checkLimit('test-user', 'general'));
      }

      // Assert
      expect(results.slice(0, 10).every(r => r.allowed)).toBe(true);
      expect(results.slice(10).every(r => !r.allowed)).toBe(true);
      expect(results[11].retryAfter).toBeGreaterThan(0);
    });

    it('should implement sliding window properly', async () => {
      // Arrange
      const { EnhancedRateLimiter } = await import('./rate-limit');
      const config: RateLimitConfig = {
        maxRequests: 5,
        windowMs: 100, // 100ms for faster testing
      };
      const rateLimiter = new EnhancedRateLimiter(config);

      // Act - Fill the window
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkLimit('test-user', 'general');
      }

      // Assert - Next request should be denied
      const result1 = await rateLimiter.checkLimit('test-user', 'general');
      expect(result1.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Assert - Should be allowed now (window expired)
      const result2 = await rateLimiter.checkLimit('test-user', 'general');
      expect(result2.allowed).toBe(true);
    });

    it('should track remaining requests correctly', async () => {
      // Arrange
      const { EnhancedRateLimiter } = await import('./rate-limit');
      const config: RateLimitConfig = {
        maxRequests: 10,
        windowMs: 60000,
      };
      const rateLimiter = new EnhancedRateLimiter(config);

      // Act & Assert
      const result1 = await rateLimiter.checkLimit('test-user', 'general');
      expect(result1.remaining).toBe(9);

      const result2 = await rateLimiter.checkLimit('test-user', 'general');
      expect(result2.remaining).toBe(8);

      // Make 8 more requests
      for (let i = 0; i < 8; i++) {
        await rateLimiter.checkLimit('test-user', 'general');
      }

      const finalResult = await rateLimiter.checkLimit('test-user', 'general');
      expect(finalResult.remaining).toBe(0);
      expect(finalResult.allowed).toBe(false);
    });

    it('should isolate rate limits per user', async () => {
      // Arrange
      const { EnhancedRateLimiter } = await import('./rate-limit');
      const config: RateLimitConfig = {
        maxRequests: 3,
        windowMs: 60000,
      };
      const rateLimiter = new EnhancedRateLimiter(config);

      // Act - Fill user1's quota
      for (let i = 0; i < 3; i++) {
        await rateLimiter.checkLimit('user1', 'general');
      }

      // Assert - user1 should be blocked, user2 should be allowed
      const user1Result = await rateLimiter.checkLimit('user1', 'general');
      const user2Result = await rateLimiter.checkLimit('user2', 'general');

      expect(user1Result.allowed).toBe(false);
      expect(user2Result.allowed).toBe(true);
    });
  });

  describe('MEXC-Specific Rate Limiting', () => {
    it('should enforce MEXC order rate limits (5 orders/second)', async () => {
      // Arrange
      const { MexcRateLimiter } = await import('./rate-limit');
      const config: MexcRateLimitConfig = {
        orderLimit: 5,
        batchOrderLimit: 2,
        defaultWeight: 1,
        maxWeight: 500,
        websocketLimit: 100,
        maxWebsocketStreams: 30,
      };
      const rateLimiter = new MexcRateLimiter(config);

      // Act - Make 6 order requests in 1 second
      const results: RateLimitResult[] = [];
      for (let i = 0; i < 6; i++) {
        results.push(await rateLimiter.checkOrderLimit('test-user'));
      }

      // Assert
      expect(results.slice(0, 5).every(r => r.allowed)).toBe(true);
      expect(results[5].allowed).toBe(false);
    });

    it('should enforce MEXC batch order limits (2 batches/second)', async () => {
      // Arrange
      const { MexcRateLimiter } = await import('./rate-limit');
      const config: MexcRateLimitConfig = {
        orderLimit: 5,
        batchOrderLimit: 2,
        defaultWeight: 1,
        maxWeight: 500,
        websocketLimit: 100,
        maxWebsocketStreams: 30,
      };
      const rateLimiter = new MexcRateLimiter(config);

      // Act - Make 3 batch order requests in 1 second
      const results: RateLimitResult[] = [];
      for (let i = 0; i < 3; i++) {
        results.push(await rateLimiter.checkBatchOrderLimit('test-user'));
      }

      // Assert
      expect(results.slice(0, 2).every(r => r.allowed)).toBe(true);
      expect(results[2].allowed).toBe(false);
    });

    it('should implement weight-based rate limiting (500 weight per 10 seconds)', async () => {
      // Arrange
      const { MexcRateLimiter } = await import('./rate-limit');
      const config: MexcRateLimitConfig = {
        orderLimit: 5,
        batchOrderLimit: 2,
        defaultWeight: 1,
        maxWeight: 500,
        websocketLimit: 100,
        maxWebsocketStreams: 30,
      };
      const rateLimiter = new MexcRateLimiter(config);

      // Act - Make requests with different weights
      const heavyRequests: RateLimitResult[] = [];
      for (let i = 0; i < 26; i++) { // 26 * 20 = 520 weight
        heavyRequests.push(await rateLimiter.checkWeightLimit('test-user', 'endpoint1', 20));
      }

      // Assert
      expect(heavyRequests.slice(0, 25).every(r => r.allowed)).toBe(true); // 25 * 20 = 500 weight
      expect(heavyRequests[25].allowed).toBe(false); // Would exceed 500 weight limit
    });

    it('should handle WebSocket rate limiting (100 requests/second)', async () => {
      // Arrange
      const { MexcRateLimiter } = await import('./rate-limit');
      const config: MexcRateLimitConfig = {
        orderLimit: 5,
        batchOrderLimit: 2,
        defaultWeight: 1,
        maxWeight: 500,
        websocketLimit: 100,
        maxWebsocketStreams: 30,
      };
      const rateLimiter = new MexcRateLimiter(config);

      // Act - Make 101 WebSocket requests in 1 second
      const results: RateLimitResult[] = [];
      for (let i = 0; i < 101; i++) {
        results.push(await rateLimiter.checkWebSocketLimit('test-connection'));
      }

      // Assert
      expect(results.slice(0, 100).every(r => r.allowed)).toBe(true);
      expect(results[100].allowed).toBe(false);
    });

    it('should limit WebSocket streams per connection (30 streams max)', async () => {
      // Arrange
      const { MexcRateLimiter } = await import('./rate-limit');
      const config: MexcRateLimitConfig = {
        orderLimit: 5,
        batchOrderLimit: 2,
        defaultWeight: 1,
        maxWeight: 500,
        websocketLimit: 100,
        maxWebsocketStreams: 30,
      };
      const rateLimiter = new MexcRateLimiter(config);

      // Act - Subscribe to 31 streams
      const results: RateLimitResult[] = [];
      for (let i = 0; i < 31; i++) {
        results.push(await rateLimiter.checkWebSocketStreamLimit('connection1', `stream-${i}`));
      }

      // Assert
      expect(results.slice(0, 30).every(r => r.allowed)).toBe(true);
      expect(results[30].allowed).toBe(false);
    });
  });

  describe('Rate Limit Headers and Error Handling', () => {
    it('should generate proper rate limit headers', async () => {
      // Arrange
      const { generateRateLimitHeaders } = await import('./rate-limit');
      const result: RateLimitResult = {
        allowed: true,
        remaining: 95,
        resetTime: Date.now() + 60000,
        weight: 5,
      };

      // Act
      const headers = generateRateLimitHeaders(result, 100);

      // Assert
      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('95');
      expect(headers['X-RateLimit-Reset']).toBe(Math.floor((Date.now() + 60000) / 1000).toString());
      expect(headers['Retry-After']).toBeUndefined(); // Only set when rate limited
    });

    it('should generate proper rate limit headers when rate limited', async () => {
      // Arrange
      const { generateRateLimitHeaders } = await import('./rate-limit');
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000,
        retryAfter: 30,
      };

      // Act
      const headers = generateRateLimitHeaders(result, 100);

      // Assert
      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('0');
      expect(headers['Retry-After']).toBe('30');
    });

    it('should handle 429 error responses properly', async () => {
      // Arrange
      const { createRateLimitError } = await import('./rate-limit');
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60,
      };

      // Act
      const error = createRateLimitError(result);

      // Assert
      expect(error.message).toContain('Rate limit exceeded');
      expect(error.status).toBe(429);
      expect(error.retryAfter).toBe(60);
    });
  });

  describe('Integration with Existing Auth System', () => {
    it('should integrate with auth middleware for user identification', async () => {
      // Arrange
      const { createAuthRateLimitMiddleware } = await import('./rate-limit');
      const mockRequest = {
        headers: {
          authorization: 'Bearer mx_test_key_123456789',
        },
      };

      // Act
      const middleware = createAuthRateLimitMiddleware();
      const result = await middleware(mockRequest as any);

      // Assert
      expect(result.userId).toBeDefined();
      expect(result.rateLimited).toBe(false);
    });

    it('should apply different rate limits for authenticated vs unauthenticated users', async () => {
      // Arrange
      const { AuthAwareRateLimiter } = await import('./rate-limit');
      const rateLimiter = new AuthAwareRateLimiter({
        authenticated: { maxRequests: 100, windowMs: 60000 },
        unauthenticated: { maxRequests: 10, windowMs: 60000 },
      });

      // Act - Authenticated user gets higher limits
      const authResults: RateLimitResult[] = [];
      for (let i = 0; i < 15; i++) {
        authResults.push(await rateLimiter.checkLimit('auth-user', 'general', true));
      }

      // Act - Unauthenticated user gets lower limits
      const unauthResults: RateLimitResult[] = [];
      for (let i = 0; i < 15; i++) {
        unauthResults.push(await rateLimiter.checkLimit('unauth-user', 'general', false));
      }

      // Assert
      expect(authResults.every(r => r.allowed)).toBe(true); // All 15 allowed for auth user
      expect(unauthResults.slice(0, 10).every(r => r.allowed)).toBe(true);
      expect(unauthResults.slice(10).every(r => !r.allowed)).toBe(true); // Last 5 denied for unauth user
    });
  });

  describe('Performance and Memory Management', () => {
    it('should clean up expired rate limit entries', async () => {
      // Arrange
      const { EnhancedRateLimiter } = await import('./rate-limit');
      const config: RateLimitConfig = {
        maxRequests: 10,
        windowMs: 100, // 100ms window
      };
      const rateLimiter = new EnhancedRateLimiter(config);

      // Act - Make requests for multiple users
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkLimit(`user-${i}`, 'general');
      }

      // Check internal storage size before cleanup
      const sizeBefore = rateLimiter.getStorageSize();

      // Wait for entries to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Trigger cleanup
      await rateLimiter.cleanup();

      // Assert
      const sizeAfter = rateLimiter.getStorageSize();
      expect(sizeBefore).toBeGreaterThan(0);
      expect(sizeAfter).toBe(0);
    });

    it('should handle high concurrency without race conditions', async () => {
      // Arrange
      const { EnhancedRateLimiter } = await import('./rate-limit');
      const config: RateLimitConfig = {
        maxRequests: 100,
        windowMs: 60000,
      };
      const rateLimiter = new EnhancedRateLimiter(config);

      // Act - Make 50 concurrent requests
      const promises = Array.from({ length: 50 }, () =>
        rateLimiter.checkLimit('concurrent-user', 'general')
      );
      const results = await Promise.all(promises);

      // Assert - All should be allowed and remaining count should be consistent
      expect(results.every(r => r.allowed)).toBe(true);
      expect(results[results.length - 1].remaining).toBe(50); // 100 - 50 = 50
    });

    it('should perform rate limiting checks efficiently', async () => {
      // Arrange
      const { EnhancedRateLimiter } = await import('./rate-limit');
      const config: RateLimitConfig = {
        maxRequests: 1000,
        windowMs: 60000,
      };
      const rateLimiter = new EnhancedRateLimiter(config);

      // Act - Measure performance of 1000 rate limit checks
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        await rateLimiter.checkLimit('perf-user', 'general');
      }
      const endTime = performance.now();

      // Assert - Should complete within reasonable time (< 100ms for 1000 checks)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Adaptive Rate Limiting', () => {
    it('should implement adaptive rate limiting based on system load', async () => {
      // Arrange
      const { AdaptiveRateLimiter } = await import('./rate-limit');
      const config: RateLimitConfig = {
        maxRequests: 100,
        windowMs: 60000,
        adaptive: true,
      };
      const rateLimiter = new AdaptiveRateLimiter(config);

      // Act - Simulate high system load
      rateLimiter.setSystemLoad(0.9); // 90% load

      const result = await rateLimiter.checkLimit('adaptive-user', 'general');

      // Assert - Should reduce rate limits under high load
      expect(result.allowed).toBe(true);
      // The actual limit should be lower than configured max due to adaptive scaling
      const adaptedLimit = rateLimiter.getCurrentLimit('adaptive-user');
      expect(adaptedLimit).toBeLessThan(100);
    });

    it('should implement burst limiting', async () => {
      // Arrange
      const { EnhancedRateLimiter } = await import('./rate-limit');
      const config: RateLimitConfig = {
        maxRequests: 60, // 1 per second over 1 minute
        windowMs: 60000,
        burstLimit: 10, // Allow 10 requests in burst
      };
      const rateLimiter = new EnhancedRateLimiter(config);

      // Act - Make burst of 12 requests
      const burstResults: RateLimitResult[] = [];
      for (let i = 0; i < 12; i++) {
        burstResults.push(await rateLimiter.checkLimit('burst-user', 'general'));
      }

      // Assert - First 10 should be allowed (burst), next 2 should be denied
      expect(burstResults.slice(0, 10).every(r => r.allowed)).toBe(true);
      expect(burstResults.slice(10).every(r => !r.allowed)).toBe(true);
    });
  });
});