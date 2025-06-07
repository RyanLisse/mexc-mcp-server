/**
 * Enhanced Error Handling System for MEXC MCP Server
 * Provides comprehensive error handling with specialized error classes,
 * fallback mechanisms, and utility functions for AI and MEXC operations.
 */

import type {
  AIAnalysisResult,
  AIError as AIErrorInterface,
  AnalysisType,
  RetryStrategy,
  TokenUsage,
} from './types/ai-types';

// =============================================================================
// Base Error Classes
// =============================================================================

/**
 * Base application error class with enhanced error context
 */
export class ApplicationError extends Error {
  /** Unique error code for categorization */
  public readonly errorCode: string;

  /** Timestamp when error occurred */
  public readonly timestamp: number;

  /** Error severity level */
  public readonly severity: ErrorSeverity;

  /** Additional context data */
  public readonly context?: Record<string, unknown>;

  /** Original error that caused this error */
  public readonly cause?: Error;

  /** Whether this error is recoverable */
  public readonly recoverable: boolean;

  constructor(
    message: string,
    errorCode: string,
    severity: ErrorSeverity = 'error',
    context?: Record<string, unknown>,
    cause?: Error,
    recoverable = false
  ) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.timestamp = Date.now();
    this.severity = severity;
    this.context = context;
    this.cause = cause;
    this.recoverable = recoverable;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ApplicationError.prototype);
  }

  /**
   * Convert error to a plain object for logging/serialization
   */
  toJSON(): ErrorJSON {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      timestamp: this.timestamp,
      severity: this.severity,
      context: this.context,
      stack: this.stack,
      recoverable: this.recoverable,
      cause: this.cause
        ? {
            name: this.cause.name,
            message: this.cause.message,
            stack: this.cause.stack,
          }
        : undefined,
    };
  }

  /**
   * Create a user-friendly error message
   */
  getUserMessage(): string {
    switch (this.severity) {
      case 'critical':
        return 'A critical system error occurred. Please contact support.';
      case 'error':
        return 'An error occurred while processing your request. Please try again.';
      case 'warning':
        return 'Your request completed with warnings. Some features may be limited.';
      case 'info':
        return this.message;
      default:
        return 'An unexpected error occurred.';
    }
  }
}

/**
 * AI-specific error class for analysis operations
 */
export class AIAnalysisError extends ApplicationError {
  /** Type of AI analysis that failed */
  public readonly analysisType: AnalysisType;

  /** Input data reference (sanitized) */
  public readonly inputDataRef?: string;

  /** Token usage when error occurred */
  public readonly tokenUsage?: TokenUsage;

  /** Suggested recovery options */
  public readonly recoveryOptions: AIRecoveryOption[];

  /** Model version that generated the error */
  public readonly modelVersion?: string;

  constructor(
    message: string,
    analysisType: AnalysisType,
    options: {
      errorCode?: string;
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
      cause?: Error;
      inputDataRef?: string;
      tokenUsage?: TokenUsage;
      recoveryOptions?: AIRecoveryOption[];
      modelVersion?: string;
      recoverable?: boolean;
    } = {}
  ) {
    super(
      message,
      options.errorCode || `AI_${analysisType.toUpperCase()}_ERROR`,
      options.severity || 'error',
      {
        ...options.context,
        analysisType,
        inputDataRef: options.inputDataRef,
        modelVersion: options.modelVersion,
      },
      options.cause,
      options.recoverable || true
    );

    this.analysisType = analysisType;
    this.inputDataRef = options.inputDataRef;
    this.tokenUsage = options.tokenUsage;
    this.recoveryOptions = options.recoveryOptions || ['retry', 'fallback'];
    this.modelVersion = options.modelVersion;

    Object.setPrototypeOf(this, AIAnalysisError.prototype);
  }

  /**
   * Get suggested fallback analysis result
   */
  getFallbackResult(): AIAnalysisResult {
    return {
      success: false,
      error: this.getUserMessage(),
      modelVersion: this.modelVersion,
      timestamp: this.timestamp,
      processingTimeMs: 0,
    };
  }
}

/**
 * MEXC API-specific error class
 */
export class MEXCError extends ApplicationError {
  /** HTTP status code from MEXC API */
  public readonly statusCode?: number;

  /** MEXC-specific error code */
  public readonly mexcErrorCode?: string;

  /** Request details (sanitized) */
  public readonly requestDetails: MEXCRequestDetails;

  /** Response headers from MEXC */
  public readonly responseHeaders?: Record<string, string>;

  /** Rate limit information */
  public readonly rateLimitInfo?: MEXCRateLimitInfo;

  constructor(
    message: string,
    requestDetails: MEXCRequestDetails,
    options: {
      errorCode?: string;
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
      cause?: Error;
      statusCode?: number;
      mexcErrorCode?: string;
      responseHeaders?: Record<string, string>;
      rateLimitInfo?: MEXCRateLimitInfo;
      recoverable?: boolean;
    } = {}
  ) {
    super(
      message,
      options.errorCode || `MEXC_${requestDetails.endpoint.toUpperCase()}_ERROR`,
      options.severity || 'error',
      {
        ...options.context,
        endpoint: requestDetails.endpoint,
        method: requestDetails.method,
        statusCode: options.statusCode,
        mexcErrorCode: options.mexcErrorCode,
      },
      options.cause,
      options.recoverable || true
    );

    this.statusCode = options.statusCode;
    this.mexcErrorCode = options.mexcErrorCode;
    this.requestDetails = requestDetails;
    this.responseHeaders = options.responseHeaders;
    this.rateLimitInfo = options.rateLimitInfo;

    Object.setPrototypeOf(this, MEXCError.prototype);
  }

  /**
   * Check if error is due to rate limiting
   */
  isRateLimited(): boolean {
    return this.statusCode === 429 || this.mexcErrorCode === '1100';
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    if (!this.recoverable) return false;

    // Rate limit errors are retryable after delay
    if (this.isRateLimited()) return true;

    // Server errors (5xx) are retryable
    if (this.statusCode && this.statusCode >= 500) return true;

    // Network errors are retryable
    if (this.cause && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes((this.cause as any).code)) {
      return true;
    }

    return false;
  }
}

// =============================================================================
// Error Handling Utility Functions
// =============================================================================

/**
 * Process AI-related errors with appropriate logging and fallback handling
 * @param error - The error that occurred
 * @param analysisType - Type of analysis that failed
 * @param fallbackValue - Optional fallback value to return
 * @returns Processed error result or fallback value
 */
export function handleAIError(
  error: Error,
  analysisType: AnalysisType,
  fallbackValue?: AIAnalysisResult
): AIAnalysisResult {
  let processedError: AIAnalysisError;

  // Convert to AIAnalysisError if not already
  if (error instanceof AIAnalysisError) {
    processedError = error;
  } else {
    processedError = new AIAnalysisError(error.message, analysisType, {
      cause: error,
      errorCode: 'AI_ANALYSIS_FAILED',
      severity: 'error',
      recoverable: true,
    });
  }

  // Log the error
  logAndNotify(processedError, {
    operation: 'ai_analysis',
    analysisType,
    recoverable: processedError.recoverable,
  });

  // Return fallback value if provided
  if (fallbackValue) {
    return {
      ...fallbackValue,
      success: false,
      error: processedError.getUserMessage(),
      timestamp: Date.now(),
    };
  }

  // Return error result
  return processedError.getFallbackResult();
}

/**
 * Convert any error into a standardized error response format
 * @param error - Error to convert
 * @returns Standardized error response
 */
export function createErrorResponse(error: Error): ErrorResponse {
  let standardizedError: ApplicationError;

  // Convert to ApplicationError if not already
  if (error instanceof ApplicationError) {
    standardizedError = error;
  } else {
    standardizedError = new ApplicationError(
      error.message,
      'UNKNOWN_ERROR',
      'error',
      { originalErrorName: error.name },
      error,
      false
    );
  }

  return {
    success: false,
    error: {
      code: standardizedError.errorCode,
      message: standardizedError.getUserMessage(),
      details: standardizedError.context,
      timestamp: standardizedError.timestamp,
      recoverable: standardizedError.recoverable,
    },
    timestamp: Date.now(),
  };
}

/**
 * Log errors and trigger notifications for critical issues
 * @param error - Error to log
 * @param context - Additional context for logging
 */
export function logAndNotify(error: Error, context?: Record<string, unknown>): void {
  const errorData = {
    error:
      error instanceof ApplicationError
        ? error.toJSON()
        : {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
    context,
    timestamp: Date.now(),
  };

  // Log based on severity
  if (error instanceof ApplicationError) {
    switch (error.severity) {
      case 'critical':
        console.error('🚨 CRITICAL ERROR:', errorData);
        // TODO: Integrate with monitoring/alerting system
        break;
      case 'error':
        console.error('❌ ERROR:', errorData);
        break;
      case 'warning':
        console.warn('⚠️  WARNING:', errorData);
        break;
      case 'info':
        console.info('ℹ️  INFO:', errorData);
        break;
    }
  } else {
    console.error('❌ UNHANDLED ERROR:', errorData);
  }

  // Trigger notifications for critical errors in production
  if (
    error instanceof ApplicationError &&
    error.severity === 'critical' &&
    process.env.NODE_ENV === 'production'
  ) {
    // TODO: Send to monitoring service (Sentry, DataDog, etc.)
    notifyMonitoringService(error, context);
  }
}

/**
 * Placeholder for monitoring service integration
 */
function notifyMonitoringService(error: ApplicationError, context?: Record<string, unknown>): void {
  // This would integrate with your monitoring service
  console.log('📊 Notifying monitoring service:', {
    error: error.toJSON(),
    context,
  });
}

// =============================================================================
// Fallback Mechanisms and Retry Logic
// =============================================================================

/**
 * Implement retry logic with exponential backoff
 * @param operation - Async operation to retry
 * @param strategy - Retry strategy configuration
 * @returns Result of the operation
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  strategy: RetryStrategy = {
    shouldRetry: true,
    maxRetries: 3,
    retryDelayMs: 1000,
    backoffStrategy: 'exponential',
  }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= strategy.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if it's the last attempt
      if (attempt === strategy.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!strategy.shouldRetry || (error instanceof ApplicationError && !error.recoverable)) {
        break;
      }

      // Calculate delay based on strategy
      let delay = strategy.retryDelayMs;
      switch (strategy.backoffStrategy) {
        case 'exponential':
          delay = strategy.retryDelayMs * 2 ** attempt;
          break;
        case 'linear':
          delay = strategy.retryDelayMs * (attempt + 1);
          break;
        default:
          delay = strategy.retryDelayMs;
          break;
      }

      // Add jitter to prevent thundering herd
      delay += Math.random() * 1000;

      console.log(
        `⏳ Retrying operation (attempt ${attempt + 1}/${strategy.maxRetries}) after ${delay}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Get fallback analysis result for failed AI operations
 * @param analysisType - Type of analysis
 * @param inputData - Original input data
 * @param error - Error that occurred
 * @returns Fallback analysis result
 */
export function getFallbackAnalysisResult(
  analysisType: AnalysisType,
  _inputData: unknown,
  _error: Error
): AIAnalysisResult {
  const fallbackResults: Record<AnalysisType, () => AIAnalysisResult> = {
    sentiment: () => ({
      success: false,
      data: {
        sentiment: 'neutral' as const,
        confidence: 0.0,
        riskLevel: 'medium' as const,
        recommendations: ['Unable to analyze sentiment due to error', 'Manual review recommended'],
      },
      error: 'Sentiment analysis unavailable',
      timestamp: Date.now(),
      processingTimeMs: 0,
    }),

    technical: () => ({
      success: false,
      data: {
        priceAction: 'Analysis unavailable due to error',
        volume: 'Analysis unavailable due to error',
        momentum: 'Analysis unavailable due to error',
        support: [],
        resistance: [],
      },
      error: 'Technical analysis unavailable',
      timestamp: Date.now(),
      processingTimeMs: 0,
    }),

    risk: () => ({
      success: false,
      data: {
        riskLevel: 'high' as const,
        confidence: 0.0,
        recommendations: [
          'Risk analysis failed',
          'Exercise extreme caution',
          'Manual risk assessment required',
        ],
      },
      error: 'Risk assessment unavailable',
      timestamp: Date.now(),
      processingTimeMs: 0,
    }),

    trend: () => ({
      success: false,
      data: {
        direction: 'sideways' as const,
        strength: 0.0,
        priceAction: 'Trend analysis unavailable',
        volume: 'Trend analysis unavailable',
        momentum: 'Trend analysis unavailable',
        support: [],
        resistance: [],
      },
      error: 'Trend analysis unavailable',
      timestamp: Date.now(),
      processingTimeMs: 0,
    }),

    correlation: () => ({
      success: false,
      error: 'Correlation analysis unavailable',
      timestamp: Date.now(),
      processingTimeMs: 0,
    }),

    anomaly: () => ({
      success: false,
      error: 'Anomaly detection unavailable',
      timestamp: Date.now(),
      processingTimeMs: 0,
    }),

    forecast: () => ({
      success: false,
      error: 'Forecast analysis unavailable',
      timestamp: Date.now(),
      processingTimeMs: 0,
    }),
  };

  const fallbackFunction = fallbackResults[analysisType];
  if (!fallbackFunction) {
    return {
      success: false,
      error: 'Unknown analysis type',
      timestamp: Date.now(),
      processingTimeMs: 0,
    };
  }

  return fallbackFunction();
}

// =============================================================================
// Type Definitions
// =============================================================================

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

export type AIRecoveryOption = 'retry' | 'fallback' | 'cache' | 'simplified' | 'manual';

export interface ErrorJSON {
  name: string;
  message: string;
  errorCode: string;
  timestamp: number;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  stack?: string;
  recoverable: boolean;
  cause?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: number;
    recoverable: boolean;
  };
  timestamp: number;
}

export interface MEXCRequestDetails {
  endpoint: string;
  method: string;
  timestamp: number;
  requestId?: string;
}

export interface MEXCRateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// =============================================================================
// Error Factory Functions
// =============================================================================

/**
 * Create an AI analysis error
 */
export function createAIAnalysisError(
  message: string,
  analysisType: AnalysisType,
  options?: Partial<ConstructorParameters<typeof AIAnalysisError>[2]>
): AIAnalysisError {
  return new AIAnalysisError(message, analysisType, options);
}

/**
 * Create a MEXC API error
 */
export function createMEXCError(
  message: string,
  requestDetails: MEXCRequestDetails,
  options?: Partial<ConstructorParameters<typeof MEXCError>[2]>
): MEXCError {
  return new MEXCError(message, requestDetails, options);
}

/**
 * Create a general application error
 */
export function createApplicationError(
  message: string,
  errorCode: string,
  options?: {
    severity?: ErrorSeverity;
    context?: Record<string, unknown>;
    cause?: Error;
    recoverable?: boolean;
  }
): ApplicationError {
  return new ApplicationError(
    message,
    errorCode,
    options?.severity,
    options?.context,
    options?.cause,
    options?.recoverable
  );
}

// =============================================================================
// Error Type Guards
// =============================================================================

/**
 * Check if error is an AI analysis error
 */
export function isAIAnalysisError(error: unknown): error is AIAnalysisError {
  return error instanceof AIAnalysisError;
}

/**
 * Check if error is a MEXC error
 */
export function isMEXCError(error: unknown): error is MEXCError {
  return error instanceof MEXCError;
}

/**
 * Check if error is an application error
 */
export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof ApplicationError) {
    return error.recoverable;
  }
  return false;
}
