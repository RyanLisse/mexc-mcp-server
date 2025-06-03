/**
 * Validates data against a type guard and throws an error if invalid
 */
export function validateOrThrow<T>(
  validator: (data: unknown) => data is T,
  data: unknown,
  errorMessage?: string
): T {
  if (!validator(data)) {
    throw new Error(errorMessage || 'Validation failed');
  }
  return data;
}

/**
 * Safely validates data using a type guard
 */
export function safeValidate<T>(
  validator: (data: unknown) => data is T,
  data: unknown,
  errorMessage?: string
): {
  success: boolean;
  data?: T;
  error?: string;
} {
  if (validator(data)) {
    return { success: true, data };
  }
  return { success: false, error: errorMessage || 'Validation failed' };
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: number,
  message: string,
  details?: Record<string, unknown>
) {
  return {
    error: {
      code,
      message,
      details,
      timestamp: Date.now(),
    },
  };
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(data: T, cached = false) {
  return {
    data,
    timestamp: Date.now(),
    cached,
  };
}

/**
 * Delays execution for the specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        break;
      }

      const delayMs = baseDelay * 2 ** attempt;
      await delay(delayMs);
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error('Retry failed with unknown error');
}

/**
 * Formats a number to a specified number of decimal places
 */
export function formatNumber(value: string | number, decimals = 8): string {
  const num = typeof value === 'string' ? Number.parseFloat(value) : value;
  return num.toFixed(decimals);
}

/**
 * Calculates percentage change between two values
 */
export function calculatePercentageChange(
  oldValue: string | number,
  newValue: string | number
): string {
  const old = typeof oldValue === 'string' ? Number.parseFloat(oldValue) : oldValue;
  const current = typeof newValue === 'string' ? Number.parseFloat(newValue) : newValue;

  if (old === 0) return '0.00';

  const change = ((current - old) / old) * 100;
  return change.toFixed(2);
}

/**
 * Validates if a string is a valid trading symbol
 */
export function isValidTradingSymbol(symbol: string): boolean {
  return /^[A-Z]+_[A-Z]+$/.test(symbol);
}

/**
 * Extracts base and quote assets from a trading symbol
 */
export function parseSymbol(symbol: string): { base: string; quote: string } {
  const parts = symbol.split('_');
  if (parts.length !== 2) {
    throw new Error(`Invalid symbol format: ${symbol}`);
  }
  return {
    base: parts[0],
    quote: parts[1],
  };
}

/**
 * Creates a cache key from multiple parts
 */
export function createCacheKey(...parts: string[]): string {
  return parts.join(':');
}

/**
 * Checks if a timestamp is within the specified age in milliseconds
 */
export function isWithinAge(timestamp: number, maxAgeMs: number): boolean {
  return Date.now() - timestamp <= maxAgeMs;
}

/**
 * Sanitizes user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/['"]/g, '') // Remove quotes
    .trim();
}

/**
 * Generates a random string of specified length
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Deep clones an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Checks if an object is empty
 */
export function isEmpty(obj: unknown): boolean {
  if (obj == null) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

/**
 * Clamps a number to the specified range
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Sanitizes an array of strings, removing null/undefined/empty values
 */
export function sanitizeStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  
  return arr
    .filter((item): item is string => 
      typeof item === 'string' && item.trim().length > 0
    )
    .map(item => item.trim());
}

/**
 * Ensures a value is a valid confidence score (0-1)
 */
export function ensureValidConfidence(value: unknown, fallback = 0.5): number {
  if (typeof value !== 'number' || isNaN(value)) return fallback;
  return clamp(value, 0, 1);
}

// =============================================================================
// AI Response Parsers (Task #30)
// =============================================================================

export {
  parseRiskAssessmentResponse,
  parseOptimizationResponse,
  parseAIResponse,
  validateAIResponseStructure,
  isValidRiskAssessment,
  isValidOptimizationResult
} from './aiResponseParsers';
