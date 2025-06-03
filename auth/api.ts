import { type Header, api } from 'encore.dev/api';
import {
  AuthenticationError,
  authenticateUser,
  globalRateLimiter,
  validateApiKey,
} from './auth.js';

import { authHandler } from 'encore.dev/auth';
import { hasMexcCredentials } from '../shared/secrets.js';

// Auth handler interface
interface AuthParams {
  authorization: Header<'Authorization'>;
}

interface AuthData {
  userID: string; // Note: Encore.ts requires userID (capital ID)
  apiKey: string;
  permissions: string[];
}

// Encore.ts auth handler
export const auth = authHandler<AuthParams, AuthData>(async (params) => {
  try {
    const user = await authenticateUser(params.authorization);
    return {
      userID: user.userId, // Map userId to userID for Encore.ts
      apiKey: user.apiKey,
      permissions: user.permissions,
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw new Error(error.message);
    }
    throw new Error('Authentication failed');
  }
});

// Validate API key endpoint
interface ValidateKeyRequest {
  apiKey: string;
}

interface ValidateKeyResponse {
  isValid: boolean;
  userId?: string;
  error?: string;
}

export const validateKey = api(
  { expose: true, method: 'POST', path: '/auth/validate' },
  async (req: ValidateKeyRequest): Promise<ValidateKeyResponse> => {
    // Rate limiting check
    const clientId = req.apiKey.substring(0, 8); // Use part of API key as identifier
    if (!globalRateLimiter.isAllowed(clientId)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const result = await validateApiKey(req.apiKey);
    return result;
  }
);

// Get authentication status
export const authStatus = api(
  { expose: true, method: 'GET', path: '/auth/status', auth: true },
  async (): Promise<{ authenticated: boolean; userId: string; permissions: string[] }> => {
    // This endpoint requires authentication, so if we reach here, user is authenticated
    // We can access auth data through the auth context (this would be available in a real Encore.ts app)
    return {
      authenticated: true,
      userId: 'authenticated-user', // This would come from auth context
      permissions: ['read', 'trade'],
    };
  }
);

// Rate limit status endpoint
interface RateLimitRequest {
  identifier: string;
}

interface RateLimitResponse {
  remainingRequests: number;
  windowMs: number;
  maxRequests: number;
}

export const rateLimitStatus = api(
  { expose: true, method: 'POST', path: '/auth/rate-limit' },
  async (req: RateLimitRequest): Promise<RateLimitResponse> => {
    const remaining = globalRateLimiter.getRemainingRequests(req.identifier);

    return {
      remainingRequests: remaining,
      windowMs: 60000, // 1 minute window
      maxRequests: 100,
    };
  }
);

// Test endpoint for MEXC API credentials
export const testMexcCredentials = api(
  { expose: true, method: 'GET', path: '/auth/test-mexc' },
  async (): Promise<{ hasCredentials: boolean; message: string }> => {
    try {
      const hasCredentials = hasMexcCredentials();

      return {
        hasCredentials,
        message: hasCredentials
          ? 'MEXC API credentials are configured'
          : 'MEXC API credentials are not configured',
      };
    } catch (error) {
      console.error('Error accessing MEXC credentials:', error);
      return {
        hasCredentials: false,
        message: 'Error accessing MEXC credentials',
      };
    }
  }
);
