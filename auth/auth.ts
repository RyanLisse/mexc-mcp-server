import type { MinLen } from 'encore.dev/validate';

// Encore.ts interface for API credentials validation
export interface APICredentials {
  apiKey: string;
  secretKey: string & MinLen<32>;
}

export interface AuthenticatedUser {
  userId: string;
  apiKey: string;
  permissions: string[];
}

export interface ApiKeyValidationResult {
  isValid: boolean;
  userId?: string;
  error?: string;
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code = 401
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Validates MEXC API key format using business logic
 * Expected format: mx0v[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}
 */
export function validateMexcApiKeyFormat(apiKey: string): boolean {
  const mexcApiKeyRegex = /^mx0v[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return mexcApiKeyRegex.test(apiKey);
}

/**
 * Validates API credentials interface fields
 */
export function validateApiCredentials(credentials: Partial<APICredentials>): string | null {
  if (!credentials.apiKey || typeof credentials.apiKey !== 'string') {
    return 'API key is required and must be a string';
  }

  if (!validateMexcApiKeyFormat(credentials.apiKey)) {
    return 'Invalid MEXC API key format';
  }

  if (credentials.secretKey !== undefined) {
    if (typeof credentials.secretKey !== 'string') {
      return 'Secret key must be a string';
    }
    if (credentials.secretKey.length < 32) {
      return 'Secret key must be at least 32 characters';
    }
  }

  return null; // No validation errors
}

export async function validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
  try {
    // Handle null/undefined inputs
    if (!apiKey || typeof apiKey !== 'string') {
      return {
        isValid: false,
        error: 'Invalid MEXC API key format',
      };
    }

    // Validate API key format using business logic
    const validationError = validateApiCredentials({ apiKey });

    if (validationError) {
      return {
        isValid: false,
        error: validationError,
      };
    }

    // For now, simulate a successful validation
    // In production, this would verify against MEXC's API or your user database
    const userId = extractUserIdFromApiKey(apiKey);

    return {
      isValid: true,
      userId: userId,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

export function extractUserIdFromApiKey(apiKey: string): string {
  // Extract a deterministic user ID from the API key
  // This is a simple implementation - in production you'd look this up in your database
  return apiKey.substring(4, 12); // Use part of the key as user identifier
}

export async function authenticateUser(authHeader: string): Promise<AuthenticatedUser> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing or invalid authorization header');
  }

  const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Validate API key format
  const result = await validateApiKey(apiKey);
  if (!result.isValid) {
    throw new AuthenticationError('Invalid MEXC API key format');
  }

  // Ensure userId is available (should be guaranteed by validation)
  if (!result.userId) {
    throw new AuthenticationError('Failed to extract user ID from API key');
  }

  // Return authenticated user context
  return {
    userId: result.userId,
    apiKey: apiKey,
    permissions: ['read', 'trade'], // Default permissions
  };
}

// Rate limiting functionality
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests = 100,
    private windowMs = 60000 // 1 minute
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    let requests = this.requests.get(identifier) || [];

    // Filter out old requests
    requests = requests.filter((timestamp) => timestamp > windowStart);

    // Check if we're within limits
    if (requests.length >= this.maxRequests) {
      return false;
    }

    // Add this request
    requests.push(now);
    this.requests.set(identifier, requests);

    return true;
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const requests = this.requests.get(identifier) || [];
    const recentRequests = requests.filter((timestamp) => timestamp > windowStart);

    return Math.max(0, this.maxRequests - recentRequests.length);
  }
}

// Create a global rate limiter instance
export const globalRateLimiter = new RateLimiter();
