import { describe, expect, it } from 'vitest';
import {
  ErrorEntrySchema,
  PatternSniperConfigSchema,
  PerformanceMetricsSchema,
} from '../schemas.js';

describe('Enhanced Pattern Sniper - Unit Tests', () => {
  describe('Schema Validation', () => {
    it('should validate enhanced configuration schema', () => {
      const config = PatternSniperConfigSchema.parse({});

      // Test default values
      expect(config.defaultOrderAmount).toBe(100);
      expect(config.testMode).toBe(true);
      expect(config.retryStrategy.maxRetries).toBe(3);
      expect(config.retryStrategy.initialDelayMs).toBe(1000);
      expect(config.circuitBreaker.failureThreshold).toBe(5);
      expect(config.timing.executionDelayMs).toBe(100);
      expect(config.rateLimiting.maxConcurrentRequests).toBe(5);
      expect(config.monitoring.healthCheckIntervalMs).toBe(60000);
    });

    it('should validate custom configuration values', () => {
      const customConfig = {
        defaultOrderAmount: 500,
        testMode: false,
        retryStrategy: {
          maxRetries: 5,
          initialDelayMs: 2000,
          maxDelayMs: 60000,
          backoffMultiplier: 3,
          jitterPercentage: 0.2,
        },
        circuitBreaker: {
          failureThreshold: 10,
          recoveryTimeoutMs: 120000,
          monitoringWindowMs: 600000,
        },
        timing: {
          executionDelayMs: 50,
          preExecutionBufferMs: 3000,
          maxExecutionWindowMs: 45000,
        },
        rateLimiting: {
          maxConcurrentRequests: 10,
          requestsPerSecond: 20,
          burstSize: 50,
        },
        monitoring: {
          healthCheckIntervalMs: 30000,
          metricsRetentionHours: 48,
          enableDetailedLogging: true,
        },
      };

      const config = PatternSniperConfigSchema.parse(customConfig);

      expect(config.defaultOrderAmount).toBe(500);
      expect(config.testMode).toBe(false);
      expect(config.retryStrategy.maxRetries).toBe(5);
      expect(config.retryStrategy.backoffMultiplier).toBe(3);
      expect(config.circuitBreaker.failureThreshold).toBe(10);
      expect(config.timing.executionDelayMs).toBe(50);
      expect(config.rateLimiting.requestsPerSecond).toBe(20);
      expect(config.monitoring.enableDetailedLogging).toBe(true);
    });

    it('should validate error entry schema', () => {
      const errorEntry = ErrorEntrySchema.parse({
        timestamp: new Date(),
        type: 'API_ERROR',
        message: 'Test error message',
        context: { symbol: 'TESTUSDT', retryCount: 1 },
        retryCount: 1,
        resolved: false,
      });

      expect(errorEntry.type).toBe('API_ERROR');
      expect(errorEntry.message).toBe('Test error message');
      expect(errorEntry.context?.symbol).toBe('TESTUSDT');
      expect(errorEntry.retryCount).toBe(1);
      expect(errorEntry.resolved).toBe(false);
    });

    it('should validate performance metrics schema', () => {
      const metrics = PerformanceMetricsSchema.parse({
        timestamp: new Date(),
        detectionLatencyMs: 150.5,
        executionLatencyMs: 89.2,
        apiResponseTimeMs: 234.7,
        memoryUsageMB: 45.8,
        cpuUsagePercent: 23.4,
      });

      expect(metrics.detectionLatencyMs).toBe(150.5);
      expect(metrics.executionLatencyMs).toBe(89.2);
      expect(metrics.apiResponseTimeMs).toBe(234.7);
      expect(metrics.memoryUsageMB).toBe(45.8);
      expect(metrics.cpuUsagePercent).toBe(23.4);
    });
  });

  describe('Enhanced Error Types', () => {
    it('should support all error types', () => {
      const errorTypes = [
        'API_ERROR',
        'EXECUTION_ERROR',
        'VALIDATION_ERROR',
        'TIMEOUT_ERROR',
      ] as const;

      for (const type of errorTypes) {
        const error = ErrorEntrySchema.parse({
          timestamp: new Date(),
          type,
          message: `Test ${type} message`,
        });

        expect(error.type).toBe(type);
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should reject invalid configuration values', () => {
      expect(() => {
        PatternSniperConfigSchema.parse({
          defaultOrderAmount: -100, // Invalid negative amount
        });
      }).toThrow();

      expect(() => {
        PatternSniperConfigSchema.parse({
          retryStrategy: {
            maxRetries: -1, // Invalid negative retries
          },
        });
      }).toThrow();
    });

    it('should accept partial configuration updates', () => {
      const partialConfig = PatternSniperConfigSchema.parse({
        testMode: false,
        retryStrategy: {
          maxRetries: 7,
        },
      });

      expect(partialConfig.testMode).toBe(false);
      expect(partialConfig.retryStrategy.maxRetries).toBe(7);
      expect(partialConfig.defaultOrderAmount).toBe(100); // Should keep default
    });
  });

  describe('Schema Integration', () => {
    it('should maintain backward compatibility with existing schemas', async () => {
      // Test that existing CalendarEntry and SymbolV2Entry schemas still work
      const { CalendarEntrySchema, SymbolV2EntrySchema } = await import('../schemas.js');

      const calendarEntry = CalendarEntrySchema.parse({
        vcoinId: 'test123',
        symbol: 'TESTUSDT',
        projectName: 'Test Project',
        firstOpenTime: Date.now(),
      });

      expect(calendarEntry.vcoinId).toBe('test123');
      expect(calendarEntry.symbol).toBe('TESTUSDT');

      const symbolEntry = SymbolV2EntrySchema.parse({
        cd: 'test123',
        ca: 'TESTUSDT',
        ps: 6,
        qs: 2,
        sts: 2,
        st: 2,
        tt: 4,
        ot: Date.now(),
      });

      expect(symbolEntry.cd).toBe('test123');
      expect(symbolEntry.ca).toBe('TESTUSDT');
    });
  });
});
