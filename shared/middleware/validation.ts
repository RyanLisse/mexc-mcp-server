import { currentRequest } from 'encore.dev';
import { APIError, middleware } from 'encore.dev/api';

// =============================================================================
// Request Validation Middleware
// =============================================================================

/**
 * Validates required headers are present
 */
export const requireHeaders = (requiredHeaders: string[]) =>
  middleware({ target: { auth: false } }, async (req, next) => {
    const request = currentRequest();

    if (request?.type === 'api-call') {
      const headers = request.headers;

      for (const headerName of requiredHeaders) {
        const headerValue = headers[headerName.toLowerCase()];
        if (!headerValue) {
          throw APIError.invalidArgument(`Missing required header: ${headerName}`);
        }
      }
    }

    return await next(req);
  });

/**
 * Validates Content-Type for POST/PUT requests
 */
export const validateContentType = middleware(
  { target: { methods: ['POST', 'PUT', 'PATCH'] } },
  async (req, next) => {
    const request = currentRequest();

    if (request?.type === 'api-call') {
      const contentType = request.headers['content-type'];

      if (!contentType) {
        throw APIError.invalidArgument('Missing Content-Type header');
      }

      if (!contentType.includes('application/json')) {
        throw APIError.invalidArgument('Content-Type must be application/json');
      }
    }

    return await next(req);
  }
);

/**
 * Validates API version compatibility
 */
export const validateApiVersion = middleware({ target: { auth: false } }, async (req, next) => {
  const request = currentRequest();

  if (request?.type === 'api-call') {
    const apiVersion = request.headers['api-version'] || request.headers['x-api-version'];

    if (apiVersion) {
      const supportedVersions = ['v1', '1.0', '1'];

      if (!supportedVersions.includes(apiVersion)) {
        throw APIError.invalidArgument(
          `Unsupported API version: ${apiVersion}. Supported versions: ${supportedVersions.join(', ')}`
        );
      }
    }
  }

  return await next(req);
});

/**
 * Validates request size limits
 */
export const validateRequestSize = (
  maxSizeBytes: number = 1024 * 1024 // 1MB default
) =>
  middleware({ target: { methods: ['POST', 'PUT', 'PATCH'] } }, async (req, next) => {
    const request = currentRequest();

    if (request?.type === 'api-call') {
      const contentLength = request.headers['content-length'];

      if (contentLength) {
        const size = Number.parseInt(contentLength, 10);

        if (size > maxSizeBytes) {
          throw APIError.invalidArgument(
            `Request size ${size} bytes exceeds maximum allowed size of ${maxSizeBytes} bytes`
          );
        }
      }
    }

    return await next(req);
  });

/**
 * Validates user agent for API abuse prevention
 */
export const validateUserAgent = middleware({ target: { auth: false } }, async (req, next) => {
  const request = currentRequest();

  if (request?.type === 'api-call') {
    const userAgent = request.headers['user-agent'];

    if (!userAgent) {
      throw APIError.invalidArgument('User-Agent header is required');
    }

    // Block known bot patterns
    const blockedPatterns = [/curl/i, /wget/i, /python-requests/i, /bot/i, /crawler/i, /spider/i];

    for (const pattern of blockedPatterns) {
      if (pattern.test(userAgent)) {
        throw APIError.permissionDenied('Automated requests not allowed');
      }
    }
  }

  return await next(req);
});

/**
 * Validates IP address against allowlist/blocklist
 */
export const validateIpAddress = (config: {
  allowlist?: string[];
  blocklist?: string[];
}) =>
  middleware({ target: { auth: false } }, async (req, next) => {
    const request = currentRequest();

    if (request?.type === 'api-call') {
      // In a real implementation, you would extract the real IP from headers
      // considering load balancers, CDNs, etc.
      const clientIp =
        request.headers['x-forwarded-for'] ||
        request.headers['x-real-ip'] ||
        request.headers['cf-connecting-ip'] ||
        '127.0.0.1'; // fallback

      const ip = Array.isArray(clientIp) ? clientIp[0] : clientIp.split(',')[0].trim();

      // Check blocklist first
      if (config.blocklist?.includes(ip)) {
        throw APIError.permissionDenied('IP address is blocked');
      }

      // Check allowlist if configured
      if (config.allowlist && config.allowlist.length > 0) {
        if (!config.allowlist.includes(ip)) {
          throw APIError.permissionDenied('IP address not in allowlist');
        }
      }
    }

    return await next(req);
  });

/**
 * Validates request origin for CORS protection
 */
export const validateOrigin = (allowedOrigins: string[]) =>
  middleware({ target: { auth: false } }, async (req, next) => {
    const request = currentRequest();

    if (request?.type === 'api-call') {
      const origin = request.headers.origin;

      if (origin && !allowedOrigins.includes('*')) {
        if (!allowedOrigins.includes(origin)) {
          throw APIError.permissionDenied(`Origin ${origin} not allowed`);
        }
      }
    }

    return await next(req);
  });

/**
 * Validates request timestamp to prevent replay attacks
 */
export const validateTimestamp = (
  maxAgeSeconds = 300 // 5 minutes default
) =>
  middleware({ target: { auth: true } }, async (req, next) => {
    const request = currentRequest();

    if (request?.type === 'api-call') {
      const timestamp = request.headers['x-timestamp'];

      if (timestamp) {
        const requestTime = Number.parseInt(timestamp, 10);
        const currentTime = Math.floor(Date.now() / 1000);

        if (Math.abs(currentTime - requestTime) > maxAgeSeconds) {
          throw APIError.invalidArgument('Request timestamp is too old or too far in the future');
        }
      }
    }

    return await next(req);
  });

/**
 * Security headers middleware
 */
export const securityHeaders = middleware({ target: { auth: false } }, async (req, next) => {
  const resp = await next(req);

  // Add security headers
  resp.header.set('X-Content-Type-Options', 'nosniff');
  resp.header.set('X-Frame-Options', 'DENY');
  resp.header.set('X-XSS-Protection', '1; mode=block');
  resp.header.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  resp.header.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  return resp;
});
