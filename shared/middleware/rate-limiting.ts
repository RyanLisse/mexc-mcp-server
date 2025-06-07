import { currentRequest } from 'encore.dev';
import { APIError, middleware } from 'encore.dev/api';

// =============================================================================
// Rate Limiting Middleware
// =============================================================================

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: any) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  message?: string; // Custom error message
}

// In-memory rate limit store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Clean up expired entries from rate limit store
 */
const cleanupExpiredEntries = () => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

// Cleanup expired entries every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Default key generator based on IP address and user ID
 */
const defaultKeyGenerator = (req: any): string => {
  const request = currentRequest();

  if (request?.type === 'api-call') {
    // Try to get user ID from auth data
    try {
      const authData = require('~encore/auth').getAuthData();
      if (authData?.userId) {
        return `user:${authData.userId}`;
      }
    } catch {
      // No auth data available
    }

    // Fall back to IP address
    const clientIp =
      request.headers['x-forwarded-for'] ||
      request.headers['x-real-ip'] ||
      request.headers['cf-connecting-ip'] ||
      '127.0.0.1';

    const ip = Array.isArray(clientIp) ? clientIp[0] : clientIp.split(',')[0].trim();
    return `ip:${ip}`;
  }

  return 'unknown';
};

/**
 * Generic rate limiting middleware
 */
export const rateLimit = (config: RateLimitConfig) =>
  middleware({ target: { auth: false } }, async (req, next) => {
    const keyGenerator = config.keyGenerator || defaultKeyGenerator;
    const key = keyGenerator(req);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      throw APIError.resourceExhausted(
        config.message || `Too many requests. Try again in ${retryAfter} seconds.`
      ).withDetails({
        retryAfter,
        limit: config.maxRequests,
        window: config.windowMs,
        remaining: 0,
      });
    }

    // Increment counter (we'll decrement if needed after processing)
    entry.count++;

    let shouldDecrement = false;

    try {
      const resp = await next(req);

      // Check if we should decrement for successful requests
      if (config.skipSuccessfulRequests) {
        shouldDecrement = true;
      }

      // Add rate limit headers
      resp.header.set('X-RateLimit-Limit', config.maxRequests.toString());
      resp.header.set(
        'X-RateLimit-Remaining',
        Math.max(0, config.maxRequests - entry.count).toString()
      );
      resp.header.set('X-RateLimit-Reset', entry.resetTime.toString());
      resp.header.set('X-RateLimit-Window', config.windowMs.toString());

      return resp;
    } catch (error) {
      // Check if we should decrement for failed requests
      if (config.skipFailedRequests) {
        shouldDecrement = true;
      }

      throw error;
    } finally {
      // Decrement counter if needed
      if (shouldDecrement && entry.count > 0) {
        entry.count--;
      }
    }
  });

/**
 * Rate limit for general API usage
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
});

/**
 * Rate limit for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many authentication attempts, please try again later.',
});

/**
 * Rate limit for trading operations
 */
export const tradingRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 trading operations per minute
  keyGenerator: (req) => {
    // Rate limit by user ID for trading operations
    try {
      const authData = require('~encore/auth').getAuthData();
      return authData?.userId ? `trading:${authData.userId}` : 'trading:unknown';
    } catch {
      return 'trading:unknown';
    }
  },
  message: 'Trading rate limit exceeded. Please slow down your requests.',
});

/**
 * Rate limit for market data requests
 */
export const marketDataRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 200, // 200 market data requests per minute
  message: 'Market data rate limit exceeded.',
});

/**
 * Rate limit for user registration
 */
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 registrations per hour per IP
  message: 'Too many registration attempts from this IP.',
});

/**
 * Rate limit for password reset requests
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 password reset requests per hour
  message: 'Too many password reset requests.',
});

/**
 * Rate limit for streaming connections
 */
export const streamingRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10, // 10 streaming connections per 5 minutes
  keyGenerator: (req) => {
    const request = currentRequest();
    if (request?.type === 'api-call') {
      try {
        const authData = require('~encore/auth').getAuthData();
        return authData?.userId ? `streaming:${authData.userId}` : 'streaming:unknown';
      } catch {
        // Fall back to IP for non-authenticated requests
        const clientIp = request.headers['x-forwarded-for'] || '127.0.0.1';
        const ip = Array.isArray(clientIp) ? clientIp[0] : clientIp.split(',')[0].trim();
        return `streaming:${ip}`;
      }
    }
    return 'streaming:unknown';
  },
  message: 'Too many streaming connections. Please close some connections before opening new ones.',
});

/**
 * Burst protection for high-frequency requests
 */
export const burstProtection = rateLimit({
  windowMs: 1000, // 1 second
  maxRequests: 10, // 10 requests per second
  message: 'Request burst detected. Please slow down.',
});

/**
 * Premium user rate limiting (higher limits)
 */
export const premiumRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5000, // 5000 requests per 15 minutes for premium users
  keyGenerator: (req) => {
    try {
      const authData = require('~encore/auth').getAuthData();
      if (authData?.userId && authData?.subscriptionTier === 'pro') {
        return `premium:${authData.userId}`;
      }
    } catch {
      // Fall back to regular rate limiting
    }
    return defaultKeyGenerator(req);
  },
  message: 'Premium rate limit exceeded.',
});

/**
 * Enterprise rate limiting (highest limits)
 */
export const enterpriseRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10000, // 10000 requests per 15 minutes for enterprise users
  keyGenerator: (req) => {
    try {
      const authData = require('~encore/auth').getAuthData();
      if (authData?.userId && authData?.subscriptionTier === 'enterprise') {
        return `enterprise:${authData.userId}`;
      }
    } catch {
      // Fall back to regular rate limiting
    }
    return defaultKeyGenerator(req);
  },
  message: 'Enterprise rate limit exceeded.',
});

/**
 * Adaptive rate limiting based on user subscription tier
 */
export const adaptiveRateLimit = middleware({ target: { auth: true } }, async (req, next) => {
  try {
    const authData = (await import('~encore/auth')).getAuthData();

    if (!authData) {
      return await generalRateLimit(req, next);
    }

    // Apply different rate limits based on subscription tier
    switch (authData.subscriptionTier) {
      case 'enterprise':
        return await enterpriseRateLimit(req, next);
      case 'pro':
        return await premiumRateLimit(req, next);
      default:
        return await generalRateLimit(req, next);
    }
  } catch (error) {
    // Fall back to general rate limiting
    return await generalRateLimit(req, next);
  }
});

/**
 * Get current rate limit status for debugging
 */
export const getRateLimitStats = () => {
  const stats = {
    totalKeys: rateLimitStore.size,
    entries: Array.from(rateLimitStore.entries()).map(([key, value]) => ({
      key,
      count: value.count,
      resetTime: new Date(value.resetTime).toISOString(),
      remaining: Math.max(0, value.resetTime - Date.now()),
    })),
  };

  return stats;
};

/**
 * Clear rate limit for a specific key (admin function)
 */
export const clearRateLimit = (key: string): boolean => {
  return rateLimitStore.delete(key);
};

/**
 * Clear all rate limits (admin function)
 */
export const clearAllRateLimits = (): void => {
  rateLimitStore.clear();
};
