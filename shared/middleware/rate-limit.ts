/**
 * Rate Limiting Middleware for Encore.ts Services
 * Task #5: Comprehensive rate limiting with MEXC API integration
 */

import * as crypto from 'node:crypto';
import { config } from '../config';

// Simple types for middleware compatibility
interface Request {
  url?: string;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface Response {
  status(code: number): Response;
  send(data: any): void;
  setHeader(key: string, value: string): void;
}

import {
  AuthAwareRateLimiter,
  EnhancedRateLimiter,
  MexcRateLimiter,
  type RateLimitResult,
  createRateLimitError,
  generateRateLimitHeaders,
} from '../rate-limit';

// Global rate limiters
const globalRateLimiter = new EnhancedRateLimiter(config.rateLimit);
const mexcRateLimiter = new MexcRateLimiter(config.mexcRateLimit);
const authAwareRateLimiter = new AuthAwareRateLimiter({
  authenticated: { maxRequests: 1000, windowMs: 60000 },
  unauthenticated: { maxRequests: 100, windowMs: 60000 },
});

/**
 * Extract user identifier from request
 */
function extractUserIdentifier(req: Request): { userId: string; isAuthenticated: boolean } {
  const authHeader = req.headers.authorization;
  const authHeaderStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const isAuthenticated = !!authHeaderStr && authHeaderStr.startsWith('Bearer ');

  if (isAuthenticated && authHeaderStr) {
    // Create a hash of the API key for user identification
    const apiKey = authHeaderStr.replace('Bearer ', '');
    const userId = crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 16);
    return { userId, isAuthenticated: true };
  }

  // Use IP address for unauthenticated users
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const clientIp =
    (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ||
    (Array.isArray(realIp) ? realIp[0] : realIp) ||
    'unknown';
  const userId = crypto.createHash('sha256').update(clientIp).digest('hex').slice(0, 16);
  return { userId, isAuthenticated: false };
}

/**
 * Apply rate limit headers to response
 */
function applyRateLimitHeaders(res: Response, result: RateLimitResult, limit: number): void {
  const headers = generateRateLimitHeaders(result, limit);
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      res.setHeader(key, value);
    }
  }
}

/**
 * Basic rate limiting middleware
 */
export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: () => void
): Promise<void> {
  const { userId, isAuthenticated } = extractUserIdentifier(req);
  const endpoint = req.url || 'unknown';

  try {
    const result = await authAwareRateLimiter.checkLimit(userId, endpoint, isAuthenticated);

    // Apply rate limit headers
    const limit = isAuthenticated ? 1000 : 100;
    applyRateLimitHeaders(res, result, limit);

    if (!result.allowed) {
      const error = createRateLimitError(result, limit);
      res.status(429).send({
        error: error.message,
        retryAfter: error.retryAfter,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Rate limiting error:', error);
    next(); // Continue on rate limiting errors
  }
}

/**
 * MEXC API-specific rate limiting middleware
 */
export async function mexcRateLimitMiddleware(
  req: Request,
  res: Response,
  next: () => void
): Promise<void> {
  const { userId } = extractUserIdentifier(req);
  const endpoint = req.url || 'unknown';

  try {
    let result: RateLimitResult;

    // Apply specific MEXC rate limits based on endpoint
    if (endpoint.includes('/orders') && req.method === 'POST') {
      if (endpoint.includes('/batch')) {
        result = await mexcRateLimiter.checkBatchOrderLimit(userId);
      } else {
        result = await mexcRateLimiter.checkOrderLimit(userId);
      }
    } else {
      // Use weight-based limiting for other endpoints
      const weight = getEndpointWeight(endpoint);
      result = await mexcRateLimiter.checkWeightLimit(userId, endpoint, weight);
    }

    // Apply rate limit headers
    applyRateLimitHeaders(res, result, config.mexcRateLimit.maxWeight);

    if (!result.allowed) {
      const error = createRateLimitError(result, config.mexcRateLimit.maxWeight);
      res.status(429).send({
        error: 'MEXC API rate limit exceeded',
        retryAfter: error.retryAfter,
        endpoint,
        weight: result.weight,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('MEXC rate limiting error:', error);
    next(); // Continue on rate limiting errors
  }
}

/**
 * Get endpoint weight for MEXC API calls
 */
function getEndpointWeight(endpoint: string): number {
  // Define weights for different endpoints based on MEXC API documentation
  const endpointWeights: Record<string, number> = {
    // Market data endpoints (lighter weight)
    '/ticker': 1,
    '/orderbook': 5,
    '/trades': 1,
    '/klines': 1,
    '/stats': 1,

    // Account endpoints (heavier weight)
    '/account': 10,
    '/balance': 10,
    '/positions': 10,

    // Trading endpoints (heaviest weight)
    '/orders': 20,
    '/cancel': 10,
    '/history': 5,
  };

  // Find matching endpoint pattern
  for (const [pattern, weight] of Object.entries(endpointWeights)) {
    if (endpoint.includes(pattern)) {
      return weight;
    }
  }

  return config.mexcRateLimit.defaultWeight;
}

/**
 * Cleanup middleware to periodically clean expired rate limit entries
 */
export async function cleanupRateLimits(): Promise<void> {
  try {
    await Promise.all([
      globalRateLimiter.cleanup(),
      // mexcRateLimiter cleanup would need to be implemented
      // authAwareRateLimiter cleanup would need to be implemented
    ]);
  } catch (error) {
    console.error('Rate limit cleanup error:', error);
  }
}

/**
 * Initialize rate limiting cleanup interval
 */
export function initializeRateLimitCleanup(): void {
  // Clean up every 5 minutes
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}

/**
 * Get rate limit status for monitoring
 */
export async function getRateLimitStatus(
  userId: string,
  endpoint: string
): Promise<{
  general: RateLimitResult;
  mexc?: RateLimitResult;
}> {
  const general = await globalRateLimiter.checkLimit(userId, endpoint, 0);

  // Don't actually consume the rate limit, just check
  general.allowed = true; // Reset since this is just a status check

  const mexc = await mexcRateLimiter.checkWeightLimit(userId, endpoint, 0); // 0 weight for status check
  mexc.allowed = true; // Reset since this is just a status check

  return { general, mexc };
}
