/**
 * Enhanced Rate Limiting System
 * Task #5: Comprehensive rate limiting with MEXC API integration
 * Extends existing rate limiting with MEXC-specific features
 */

import crypto from 'node:crypto';

/**
 * Basic rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  burstLimit?: number;
  adaptive?: boolean;
}

/**
 * MEXC-specific rate limiting configuration
 */
export interface MexcRateLimitConfig {
  orderLimit: number; // Orders per second (5 starting Mar 25, 2025)
  batchOrderLimit: number; // Batch orders per second (2)
  defaultWeight: number; // Default weight for endpoints
  maxWeight: number; // Max weight per 10 seconds per endpoint (500)
  websocketLimit: number; // WebSocket requests per second (100)
  maxWebsocketStreams: number; // Max streams per connection (30)
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  weight?: number;
}

/**
 * Rate limit HTTP headers
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

/**
 * Rate limit error for HTTP 429 responses
 */
export class RateLimitError extends Error {
  public status = 429;
  public retryAfter: number;
  public headers: RateLimitHeaders;

  constructor(result: RateLimitResult, limit: number) {
    super('Rate limit exceeded. Please try again later.');
    this.retryAfter = result.retryAfter || 60;
    this.headers = generateRateLimitHeaders(result, limit);
  }
}

/**
 * Request tracking entry
 */
interface RequestEntry {
  timestamp: number;
  weight?: number;
}

/**
 * Enhanced rate limiter with sliding window algorithm
 */
export class EnhancedRateLimiter {
  private requests = new Map<string, RequestEntry[]>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is allowed within rate limit
   */
  async checkLimit(identifier: string, endpoint: string, weight = 1): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const key = `${identifier}:${endpoint}`;

    // Get existing requests for this identifier/endpoint
    let userRequests = this.requests.get(key) || [];

    // Remove expired requests (sliding window)
    userRequests = userRequests.filter((req) => req.timestamp > windowStart);

    // Calculate current usage
    const currentRequests = userRequests.length;
    const maxRequests = this.getEffectiveLimit(identifier);

    // Check burst limit if configured
    if (this.config.burstLimit) {
      const recentRequests = userRequests.filter((req) => req.timestamp > now - 1000); // Last 1 second
      if (recentRequests.length >= this.config.burstLimit) {
        return this.createDeniedResult(currentRequests, maxRequests, now);
      }
    }

    // Check regular rate limit
    if (currentRequests >= maxRequests) {
      return this.createDeniedResult(currentRequests, maxRequests, now);
    }

    // Allow request - add to tracking
    userRequests.push({ timestamp: now, weight });
    this.requests.set(key, userRequests);

    return {
      allowed: true,
      remaining: maxRequests - currentRequests - 1,
      resetTime: windowStart + this.config.windowMs,
      weight,
    };
  }

  /**
   * Get effective limit (can be overridden for adaptive limiting)
   */
  protected getEffectiveLimit(identifier: string): number {
    return this.config.maxRequests;
  }

  /**
   * Create denied result
   */
  private createDeniedResult(current: number, max: number, now: number): RateLimitResult {
    const resetTime = now + this.config.windowMs;
    const retryAfter = Math.ceil(this.config.windowMs / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter,
    };
  }

  /**
   * Get storage size for testing/monitoring
   */
  getStorageSize(): number {
    return this.requests.size;
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter((req) => req.timestamp > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

/**
 * MEXC-specific rate limiter
 */
export class MexcRateLimiter {
  private orderLimiter: EnhancedRateLimiter;
  private batchOrderLimiter: EnhancedRateLimiter;
  private weightLimiters = new Map<string, EnhancedRateLimiter>();
  private websocketLimiter: EnhancedRateLimiter;
  private websocketStreams = new Map<string, Set<string>>();
  private config: MexcRateLimitConfig;

  constructor(config: MexcRateLimitConfig) {
    this.config = config;

    // Order rate limiter (5 orders/second)
    this.orderLimiter = new EnhancedRateLimiter({
      maxRequests: config.orderLimit,
      windowMs: 1000, // 1 second
    });

    // Batch order rate limiter (2 batches/second)
    this.batchOrderLimiter = new EnhancedRateLimiter({
      maxRequests: config.batchOrderLimit,
      windowMs: 1000, // 1 second
    });

    // WebSocket rate limiter (100 requests/second)
    this.websocketLimiter = new EnhancedRateLimiter({
      maxRequests: config.websocketLimit,
      windowMs: 1000, // 1 second
    });
  }

  /**
   * Check order rate limit (5 orders/second)
   */
  async checkOrderLimit(identifier: string): Promise<RateLimitResult> {
    return this.orderLimiter.checkLimit(identifier, 'orders');
  }

  /**
   * Check batch order rate limit (2 batches/second)
   */
  async checkBatchOrderLimit(identifier: string): Promise<RateLimitResult> {
    return this.batchOrderLimiter.checkLimit(identifier, 'batch-orders');
  }

  /**
   * Check weight-based rate limit (500 weight per 10 seconds per endpoint)
   */
  async checkWeightLimit(
    identifier: string,
    endpoint: string,
    weight: number
  ): Promise<RateLimitResult> {
    // Create or get weight limiter for this endpoint
    if (!this.weightLimiters.has(endpoint)) {
      this.weightLimiters.set(
        endpoint,
        new WeightBasedRateLimiter({
          maxRequests: this.config.maxWeight,
          windowMs: 10000, // 10 seconds
        })
      );
    }

    const limiter = this.weightLimiters.get(endpoint)!;
    return limiter.checkLimit(identifier, endpoint, weight);
  }

  /**
   * Check WebSocket rate limit (100 requests/second)
   */
  async checkWebSocketLimit(connectionId: string): Promise<RateLimitResult> {
    return this.websocketLimiter.checkLimit(connectionId, 'websocket');
  }

  /**
   * Check WebSocket stream limit (30 streams per connection)
   */
  async checkWebSocketStreamLimit(
    connectionId: string,
    streamId: string
  ): Promise<RateLimitResult> {
    const streams = this.websocketStreams.get(connectionId) || new Set();

    if (streams.has(streamId)) {
      // Stream already exists for this connection
      return {
        allowed: true,
        remaining: this.config.maxWebsocketStreams - streams.size,
        resetTime: Date.now() + 60000, // Arbitrary reset time
      };
    }

    if (streams.size >= this.config.maxWebsocketStreams) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60,
      };
    }

    // Add stream to connection
    streams.add(streamId);
    this.websocketStreams.set(connectionId, streams);

    return {
      allowed: true,
      remaining: this.config.maxWebsocketStreams - streams.size,
      resetTime: Date.now() + 60000,
    };
  }
}

/**
 * Weight-based rate limiter
 */
export class WeightBasedRateLimiter extends EnhancedRateLimiter {
  /**
   * Check weight-based limit
   */
  async checkLimit(identifier: string, endpoint: string, weight = 1): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const key = `${identifier}:${endpoint}`;

    // Get existing requests
    let userRequests = this.requests.get(key) || [];

    // Remove expired requests
    userRequests = userRequests.filter((req) => req.timestamp > windowStart);

    // Calculate current weight usage
    const currentWeight = userRequests.reduce((sum, req) => sum + (req.weight || 1), 0);
    const maxWeight = this.config.maxRequests;

    // Check if adding this weight would exceed limit
    if (currentWeight + weight > maxWeight) {
      return this.createDeniedResult(currentWeight, maxWeight, now);
    }

    // Allow request
    userRequests.push({ timestamp: now, weight });
    this.requests.set(key, userRequests);

    return {
      allowed: true,
      remaining: maxWeight - currentWeight - weight,
      resetTime: windowStart + this.config.windowMs,
      weight,
    };
  }

  private createDeniedResult(current: number, max: number, now: number): RateLimitResult {
    const resetTime = now + this.config.windowMs;
    const retryAfter = Math.ceil(this.config.windowMs / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter,
      weight: current,
    };
  }
}

/**
 * Adaptive rate limiter that adjusts limits based on system load
 */
export class AdaptiveRateLimiter extends EnhancedRateLimiter {
  private systemLoad = 0;
  private userLimits = new Map<string, number>();

  /**
   * Set current system load (0.0 to 1.0)
   */
  setSystemLoad(load: number): void {
    this.systemLoad = Math.max(0, Math.min(1, load));
  }

  /**
   * Get effective limit based on system load
   */
  protected getEffectiveLimit(identifier: string): number {
    const baseLimit = this.config.maxRequests;
    const loadMultiplier = 1 - this.systemLoad * 0.5; // Reduce up to 50% under high load
    const adaptedLimit = Math.floor(baseLimit * loadMultiplier);

    this.userLimits.set(identifier, adaptedLimit);
    return adaptedLimit;
  }

  /**
   * Get current adapted limit for user
   */
  getCurrentLimit(identifier: string): number {
    return this.userLimits.get(identifier) || this.config.maxRequests;
  }
}

/**
 * Auth-aware rate limiter with different limits for authenticated vs unauthenticated users
 */
export class AuthAwareRateLimiter {
  private authenticatedLimiter: EnhancedRateLimiter;
  private unauthenticatedLimiter: EnhancedRateLimiter;

  constructor(config: { authenticated: RateLimitConfig; unauthenticated: RateLimitConfig }) {
    this.authenticatedLimiter = new EnhancedRateLimiter(config.authenticated);
    this.unauthenticatedLimiter = new EnhancedRateLimiter(config.unauthenticated);
  }

  /**
   * Check rate limit based on authentication status
   */
  async checkLimit(
    identifier: string,
    endpoint: string,
    isAuthenticated: boolean
  ): Promise<RateLimitResult> {
    const limiter = isAuthenticated ? this.authenticatedLimiter : this.unauthenticatedLimiter;
    return limiter.checkLimit(identifier, endpoint);
  }
}

/**
 * Generate rate limit headers for HTTP responses
 */
export function generateRateLimitHeaders(result: RateLimitResult, limit: number): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetTime / 1000).toString(),
  };

  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Create rate limit error for HTTP 429 responses
 */
export function createRateLimitError(result: RateLimitResult, limit = 100): RateLimitError {
  return new RateLimitError(result, limit);
}

/**
 * Create auth-aware rate limiting middleware
 */
export function createAuthRateLimitMiddleware() {
  const rateLimiter = new AuthAwareRateLimiter({
    authenticated: { maxRequests: 1000, windowMs: 60000 },
    unauthenticated: { maxRequests: 100, windowMs: 60000 },
  });

  return async (request: { headers: { authorization?: string } }) => {
    // Extract user ID from authorization header
    const authHeader = request.headers.authorization;
    const isAuthenticated = !!authHeader && authHeader.startsWith('Bearer ');

    let userId = 'anonymous';
    if (isAuthenticated && authHeader) {
      // Extract API key for user identification
      const apiKey = authHeader.replace('Bearer ', '');
      userId = crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 16);
    }

    // Check rate limit
    const result = await rateLimiter.checkLimit(userId, 'api', isAuthenticated);

    return {
      userId,
      rateLimited: !result.allowed,
      remaining: result.remaining,
      resetTime: result.resetTime,
      retryAfter: result.retryAfter,
    };
  };
}
