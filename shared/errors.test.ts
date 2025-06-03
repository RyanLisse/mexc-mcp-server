/**
 * Comprehensive tests for the enhanced error handling system
 * Tests all error classes, utility functions, and fallback mechanisms
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AIAnalysisError,
  ApplicationError,
  type ErrorSeverity,
  MEXCError,
  type MEXCRateLimitInfo,
  type MEXCRequestDetails,
  createAIAnalysisError,
  createApplicationError,
  createErrorResponse,
  createMEXCError,
  getFallbackAnalysisResult,
  handleAIError,
  isAIAnalysisError,
  isApplicationError,
  isMEXCError,
  isRecoverableError,
  logAndNotify,
  retryWithBackoff,
} from './errors';
import type { AIAnalysisResult, TokenUsage } from './types/ai-types';

// Mock console methods for testing
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  log: vi.fn(),
};

// Replace console methods
beforeEach(() => {
  vi.clearAllMocks();
  global.console = { ...console, ...mockConsole };
});

describe('ApplicationError', () => {
  it('should create error with all properties', () => {
    const context = { userId: '123', operation: 'test' };
    const cause = new Error('Original error');
    const error = new ApplicationError('Test error', 'TEST_ERROR', 'error', context, cause, true);

    expect(error.message).toBe('Test error');
    expect(error.errorCode).toBe('TEST_ERROR');
    expect(error.severity).toBe('error');
    expect(error.context).toEqual(context);
    expect(error.cause).toBe(cause);
    expect(error.recoverable).toBe(true);
    expect(error.timestamp).toBeGreaterThan(0);
    expect(error.name).toBe('ApplicationError');
  });

  it('should use default values for optional parameters', () => {
    const error = new ApplicationError('Simple error', 'SIMPLE_ERROR');

    expect(error.severity).toBe('error');
    expect(error.context).toBeUndefined();
    expect(error.cause).toBeUndefined();
    expect(error.recoverable).toBe(false);
  });

  it('should convert to JSON correctly', () => {
    const cause = new Error('Cause error');
    const error = new ApplicationError(
      'Test error',
      'TEST_ERROR',
      'critical',
      { test: 'data' },
      cause,
      true
    );

    const json = error.toJSON();

    expect(json.name).toBe('ApplicationError');
    expect(json.message).toBe('Test error');
    expect(json.errorCode).toBe('TEST_ERROR');
    expect(json.severity).toBe('critical');
    expect(json.context).toEqual({ test: 'data' });
    expect(json.recoverable).toBe(true);
    expect(json.cause).toEqual({
      name: 'Error',
      message: 'Cause error',
      stack: cause.stack,
    });
  });

  it('should generate appropriate user messages based on severity', () => {
    const criticalError = new ApplicationError('Critical', 'CRITICAL', 'critical');
    const errorError = new ApplicationError('Error', 'ERROR', 'error');
    const warningError = new ApplicationError('Warning', 'WARNING', 'warning');
    const infoError = new ApplicationError('Info message', 'INFO', 'info');

    expect(criticalError.getUserMessage()).toContain('critical system error');
    expect(errorError.getUserMessage()).toContain('error occurred while processing');
    expect(warningError.getUserMessage()).toContain('completed with warnings');
    expect(infoError.getUserMessage()).toBe('Info message');
  });

  it('should maintain proper prototype chain', () => {
    const error = new ApplicationError('Test', 'TEST');

    expect(error instanceof ApplicationError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

describe('AIAnalysisError', () => {
  it('should create AI analysis error with all properties', () => {
    const tokenUsage: TokenUsage = {
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300,
    };

    const error = new AIAnalysisError('AI analysis failed', 'sentiment', {
      errorCode: 'SENTIMENT_FAILED',
      severity: 'error',
      inputDataRef: 'btc-analysis-123',
      tokenUsage,
      recoveryOptions: ['retry', 'fallback'],
      modelVersion: 'gemini-2.5-flash',
      recoverable: true,
    });

    expect(error.message).toBe('AI analysis failed');
    expect(error.analysisType).toBe('sentiment');
    expect(error.errorCode).toBe('SENTIMENT_FAILED');
    expect(error.inputDataRef).toBe('btc-analysis-123');
    expect(error.tokenUsage).toEqual(tokenUsage);
    expect(error.recoveryOptions).toEqual(['retry', 'fallback']);
    expect(error.modelVersion).toBe('gemini-2.5-flash');
    expect(error.recoverable).toBe(true);
  });

  it('should use default values when options not provided', () => {
    const error = new AIAnalysisError('Simple AI error', 'technical');

    expect(error.errorCode).toBe('AI_TECHNICAL_ERROR');
    expect(error.severity).toBe('error');
    expect(error.recoveryOptions).toEqual(['retry', 'fallback']);
    expect(error.recoverable).toBe(true);
  });

  it('should generate fallback analysis result', () => {
    const error = new AIAnalysisError('Analysis failed', 'sentiment');
    const fallback = error.getFallbackResult();

    expect(fallback.success).toBe(false);
    expect(fallback.error).toBeDefined();
    expect(fallback.timestamp).toBeGreaterThan(0);
    expect(fallback.processingTimeMs).toBe(0);
  });

  it('should maintain proper prototype chain', () => {
    const error = new AIAnalysisError('Test', 'sentiment');

    expect(error instanceof AIAnalysisError).toBe(true);
    expect(error instanceof ApplicationError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

describe('MEXCError', () => {
  const requestDetails: MEXCRequestDetails = {
    endpoint: '/api/v3/ticker',
    method: 'GET',
    timestamp: Date.now(),
    requestId: 'req-123',
  };

  const rateLimitInfo: MEXCRateLimitInfo = {
    limit: 1000,
    remaining: 0,
    resetTime: Date.now() + 60000,
    retryAfter: 60,
  };

  it('should create MEXC error with all properties', () => {
    const error = new MEXCError('MEXC API error', requestDetails, {
      errorCode: 'MEXC_RATE_LIMIT',
      statusCode: 429,
      mexcErrorCode: '1100',
      responseHeaders: { 'x-rate-limit': '0' },
      rateLimitInfo,
      recoverable: true,
    });

    expect(error.message).toBe('MEXC API error');
    expect(error.statusCode).toBe(429);
    expect(error.mexcErrorCode).toBe('1100');
    expect(error.requestDetails).toEqual(requestDetails);
    expect(error.responseHeaders).toEqual({ 'x-rate-limit': '0' });
    expect(error.rateLimitInfo).toEqual(rateLimitInfo);
    expect(error.recoverable).toBe(true);
  });

  it('should detect rate limited errors', () => {
    const rateLimitError1 = new MEXCError('Rate limited', requestDetails, { statusCode: 429 });
    const rateLimitError2 = new MEXCError('Rate limited', requestDetails, {
      mexcErrorCode: '1100',
    });
    const otherError = new MEXCError('Other error', requestDetails, { statusCode: 500 });

    expect(rateLimitError1.isRateLimited()).toBe(true);
    expect(rateLimitError2.isRateLimited()).toBe(true);
    expect(otherError.isRateLimited()).toBe(false);
  });

  it('should detect retryable errors', () => {
    const rateLimitError = new MEXCError('Rate limited', requestDetails, {
      statusCode: 429,
      recoverable: true,
    });
    const serverError = new MEXCError('Server error', requestDetails, {
      statusCode: 500,
      recoverable: true,
    });
    const networkError = new MEXCError('Network error', requestDetails, {
      cause: Object.assign(new Error('Network'), { code: 'ECONNRESET' }),
      recoverable: true,
    });
    const clientError = new MEXCError('Client error', requestDetails, {
      statusCode: 400,
      recoverable: false,
    });

    expect(rateLimitError.isRetryable()).toBe(true);
    expect(serverError.isRetryable()).toBe(true);
    expect(networkError.isRetryable()).toBe(true);
    expect(clientError.isRetryable()).toBe(false);
  });

  it('should maintain proper prototype chain', () => {
    const error = new MEXCError('Test', requestDetails);

    expect(error instanceof MEXCError).toBe(true);
    expect(error instanceof ApplicationError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

describe('Error Handling Utility Functions', () => {
  describe('handleAIError', () => {
    it('should handle AI analysis errors correctly', () => {
      const originalError = new AIAnalysisError('Analysis failed', 'sentiment');
      const result = handleAIError(originalError, 'sentiment');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should convert regular errors to AI analysis errors', () => {
      const regularError = new Error('Regular error');
      const result = handleAIError(regularError, 'technical');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should use fallback value when provided', () => {
      const error = new Error('Test error');
      const fallback: AIAnalysisResult = {
        success: true,
        data: { sentiment: 'neutral', confidence: 0.5 },
        timestamp: Date.now(),
      };

      const result = handleAIError(error, 'sentiment', fallback);

      expect(result.success).toBe(false); // Should still be false due to error
      expect(result.data).toEqual(fallback.data);
    });
  });

  describe('createErrorResponse', () => {
    it('should create standardized error response from ApplicationError', () => {
      const appError = new ApplicationError('App error', 'APP_ERROR', 'error');
      const response = createErrorResponse(appError);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('APP_ERROR');
      expect(response.error.message).toBeDefined();
      expect(response.error.timestamp).toBeGreaterThan(0);
      expect(response.timestamp).toBeGreaterThan(0);
    });

    it('should convert regular errors to standardized format', () => {
      const regularError = new Error('Regular error');
      const response = createErrorResponse(regularError);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('UNKNOWN_ERROR');
      expect(response.error.message).toBeDefined();
      expect(response.error.recoverable).toBe(false);
    });
  });

  describe('logAndNotify', () => {
    it('should log errors with appropriate severity levels', () => {
      const criticalError = new ApplicationError('Critical', 'CRITICAL', 'critical');
      const errorError = new ApplicationError('Error', 'ERROR', 'error');
      const warningError = new ApplicationError('Warning', 'WARNING', 'warning');
      const infoError = new ApplicationError('Info', 'INFO', 'info');

      logAndNotify(criticalError);
      logAndNotify(errorError);
      logAndNotify(warningError);
      logAndNotify(infoError);

      expect(mockConsole.error).toHaveBeenCalledTimes(2); // critical and error
      expect(mockConsole.warn).toHaveBeenCalledTimes(1); // warning
      expect(mockConsole.info).toHaveBeenCalledTimes(1); // info
    });

    it('should handle regular errors', () => {
      const regularError = new Error('Regular error');
      logAndNotify(regularError);

      expect(mockConsole.error).toHaveBeenCalledWith('❌ UNHANDLED ERROR:', expect.any(Object));
    });

    it('should include context in logs', () => {
      const error = new ApplicationError('Test', 'TEST');
      const context = { operation: 'test', userId: '123' };

      logAndNotify(error, context);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ context })
      );
    });
  });
});

describe('Retry Logic', () => {
  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry and eventually succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(operation, {
        shouldRetry: true,
        maxRetries: 3,
        retryDelayMs: 10, // Small delay for testing
        backoffStrategy: 'fixed',
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(
        retryWithBackoff(operation, {
          shouldRetry: true,
          maxRetries: 2,
          retryDelayMs: 10,
          backoffStrategy: 'fixed',
        })
      ).rejects.toThrow('Always fails');

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-recoverable errors', async () => {
      const nonRecoverableError = new ApplicationError(
        'Non-recoverable',
        'NON_RECOVERABLE',
        'error',
        {},
        undefined,
        false
      );
      const operation = vi.fn().mockRejectedValue(nonRecoverableError);

      await expect(retryWithBackoff(operation)).rejects.toThrow('Non-recoverable');

      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should apply different backoff strategies', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Fail'));

      // Test with very fast delays to make test quick
      const testBackoff = async (strategy: 'fixed' | 'linear' | 'exponential') => {
        const startTime = Date.now();
        try {
          await retryWithBackoff(operation, {
            shouldRetry: true,
            maxRetries: 2,
            retryDelayMs: 1, // 1ms base delay
            backoffStrategy: strategy,
          });
        } catch {
          // Expected to fail
        }
        return Date.now() - startTime;
      };

      // Just ensure the function runs with different strategies
      await testBackoff('fixed');
      await testBackoff('linear');
      await testBackoff('exponential');

      expect(operation).toHaveBeenCalledTimes(9); // 3 calls × 3 strategies
    });
  });
});

describe('Fallback Mechanisms', () => {
  describe('getFallbackAnalysisResult', () => {
    it('should return appropriate fallback for sentiment analysis', () => {
      const error = new Error('Test error');
      const result = getFallbackAnalysisResult('sentiment', {}, error);

      expect(result.success).toBe(false);
      expect(result.data).toMatchObject({
        sentiment: 'neutral',
        confidence: 0.0,
        riskLevel: 'medium',
        recommendations: expect.arrayContaining([
          expect.stringContaining('Unable to analyze sentiment'),
        ]),
      });
    });

    it('should return appropriate fallback for technical analysis', () => {
      const error = new Error('Test error');
      const result = getFallbackAnalysisResult('technical', {}, error);

      expect(result.success).toBe(false);
      expect(result.data).toMatchObject({
        priceAction: expect.stringContaining('Analysis unavailable'),
        volume: expect.stringContaining('Analysis unavailable'),
        momentum: expect.stringContaining('Analysis unavailable'),
        support: [],
        resistance: [],
      });
    });

    it('should return appropriate fallback for risk analysis', () => {
      const error = new Error('Test error');
      const result = getFallbackAnalysisResult('risk', {}, error);

      expect(result.success).toBe(false);
      expect(result.data).toMatchObject({
        riskLevel: 'high',
        confidence: 0.0,
        recommendations: expect.arrayContaining([expect.stringContaining('Risk analysis failed')]),
      });
    });

    it('should handle unknown analysis types', () => {
      const error = new Error('Test error');
      const result = getFallbackAnalysisResult('unknown' as any, {}, error);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown analysis type');
    });
  });
});

describe('Error Factory Functions', () => {
  it('should create AI analysis error via factory', () => {
    const error = createAIAnalysisError('Test AI error', 'sentiment', {
      severity: 'warning',
      recoverable: true,
    });

    expect(error instanceof AIAnalysisError).toBe(true);
    expect(error.message).toBe('Test AI error');
    expect(error.analysisType).toBe('sentiment');
    expect(error.severity).toBe('warning');
  });

  it('should create MEXC error via factory', () => {
    const requestDetails: MEXCRequestDetails = {
      endpoint: '/test',
      method: 'GET',
      timestamp: Date.now(),
    };

    const error = createMEXCError('Test MEXC error', requestDetails, {
      statusCode: 500,
    });

    expect(error instanceof MEXCError).toBe(true);
    expect(error.message).toBe('Test MEXC error');
    expect(error.statusCode).toBe(500);
  });

  it('should create application error via factory', () => {
    const error = createApplicationError('Test app error', 'TEST_APP', {
      severity: 'critical',
      recoverable: false,
    });

    expect(error instanceof ApplicationError).toBe(true);
    expect(error.message).toBe('Test app error');
    expect(error.errorCode).toBe('TEST_APP');
    expect(error.severity).toBe('critical');
  });
});

describe('Type Guards', () => {
  it('should correctly identify AI analysis errors', () => {
    const aiError = new AIAnalysisError('AI error', 'sentiment');
    const regularError = new Error('Regular error');
    const appError = new ApplicationError('App error', 'APP');

    expect(isAIAnalysisError(aiError)).toBe(true);
    expect(isAIAnalysisError(regularError)).toBe(false);
    expect(isAIAnalysisError(appError)).toBe(false);
  });

  it('should correctly identify MEXC errors', () => {
    const mexcError = new MEXCError('MEXC error', {
      endpoint: '/test',
      method: 'GET',
      timestamp: Date.now(),
    });
    const regularError = new Error('Regular error');
    const appError = new ApplicationError('App error', 'APP');

    expect(isMEXCError(mexcError)).toBe(true);
    expect(isMEXCError(regularError)).toBe(false);
    expect(isMEXCError(appError)).toBe(false);
  });

  it('should correctly identify application errors', () => {
    const appError = new ApplicationError('App error', 'APP');
    const aiError = new AIAnalysisError('AI error', 'sentiment');
    const regularError = new Error('Regular error');

    expect(isApplicationError(appError)).toBe(true);
    expect(isApplicationError(aiError)).toBe(true); // AIAnalysisError extends ApplicationError
    expect(isApplicationError(regularError)).toBe(false);
  });

  it('should correctly identify recoverable errors', () => {
    const recoverableError = new ApplicationError(
      'Recoverable',
      'RECOVERABLE',
      'error',
      {},
      undefined,
      true
    );
    const nonRecoverableError = new ApplicationError(
      'Non-recoverable',
      'NON_RECOVERABLE',
      'error',
      {},
      undefined,
      false
    );
    const regularError = new Error('Regular error');

    expect(isRecoverableError(recoverableError)).toBe(true);
    expect(isRecoverableError(nonRecoverableError)).toBe(false);
    expect(isRecoverableError(regularError)).toBe(false);
  });
});

describe('Integration Tests', () => {
  it('should handle complete error workflow for AI analysis', async () => {
    // Simulate a failed AI operation
    const failingOperation = vi.fn().mockRejectedValue(new Error('AI service unavailable'));

    // Try with retry logic
    try {
      await retryWithBackoff(failingOperation, {
        shouldRetry: true,
        maxRetries: 2,
        retryDelayMs: 1,
        backoffStrategy: 'fixed',
      });
    } catch (error) {
      // Handle the error
      const result = handleAIError(error as Error, 'sentiment');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockConsole.error).toHaveBeenCalled();
    }

    expect(failingOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should create comprehensive error response for client', () => {
    const mexcError = new MEXCError(
      'Rate limit exceeded',
      { endpoint: '/api/v3/ticker', method: 'GET', timestamp: Date.now() },
      { statusCode: 429, mexcErrorCode: '1100', recoverable: true }
    );

    const response = createErrorResponse(mexcError);

    expect(response.success).toBe(false);
    expect(response.error.code).toContain('MEXC');
    expect(response.error.recoverable).toBe(true);
    expect(response.error.details).toBeDefined();
    expect(response.timestamp).toBeGreaterThan(0);
  });
});
