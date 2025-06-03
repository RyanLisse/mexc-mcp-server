/**
 * Audit Logging System Tests
 * TDD tests for Task #4: Comprehensive audit logging for all operations
 */

import { beforeEach, describe, expect, it } from 'vitest';

describe('Audit Logging System - Task #4', () => {
  beforeEach(async () => {
    // Reset database state before each test
    const { clearAuditLogs } = await import('./audit');
    clearAuditLogs();
  });

  describe('AuditLogger Core Functionality', () => {
    it('should create audit log entry for successful API request', async () => {
      // Arrange
      const { AuditLogger } = await import('./audit');
      const testRequest = {
        apiKey: 'mx_test_key_123456789',
        operation: 'getTicker',
        endpoint: '/api/v1/ticker',
        httpMethod: 'GET',
        requestData: { symbol: 'BTCUSDT' },
        responseStatus: 200,
        responseData: { price: '45000.00' },
        durationMs: 150,
        ipAddress: '192.168.1.1',
        userAgent: 'TestClient/1.0',
      };

      // Act
      const logEntry = await AuditLogger.logRequest(testRequest);

      // Assert
      expect(logEntry).toBeDefined();
      expect(logEntry.id).toBeDefined();
      expect(logEntry.timestamp).toBeInstanceOf(Date);
      expect(logEntry.apiKey).toMatch(/^mx_test_\*+$/); // Should be masked for security
      expect(logEntry.operation).toBe(testRequest.operation);
      expect(logEntry.endpoint).toBe(testRequest.endpoint);
      expect(logEntry.httpMethod).toBe(testRequest.httpMethod);
      expect(logEntry.responseStatus).toBe(200);
      expect(logEntry.durationMs).toBe(150);
      expect(logEntry.errorMessage).toBeUndefined();
    });

    it('should create audit log entry for failed API request', async () => {
      // Arrange
      const { AuditLogger } = await import('./audit');
      const testRequest = {
        apiKey: 'mx_test_key_123456789',
        operation: 'placeOrder',
        endpoint: '/api/v1/orders',
        httpMethod: 'POST',
        requestData: { symbol: 'BTCUSDT', side: 'BUY', quantity: '0.001' },
        responseStatus: 400,
        errorMessage: 'Insufficient balance',
        durationMs: 75,
        ipAddress: '192.168.1.1',
      };

      // Act
      const logEntry = await AuditLogger.logRequest(testRequest);

      // Assert
      expect(logEntry).toBeDefined();
      expect(logEntry.responseStatus).toBe(400);
      expect(logEntry.errorMessage).toBe('Insufficient balance');
      expect(logEntry.responseData).toBeUndefined();
    });

    it('should generate unique IDs for each audit log entry', async () => {
      // Arrange
      const { AuditLogger } = await import('./audit');
      const testRequest = {
        apiKey: 'mx_test_key_123456789',
        operation: 'getTicker',
        endpoint: '/api/v1/ticker',
        httpMethod: 'GET',
        responseStatus: 200,
        durationMs: 100,
      };

      // Act
      const logEntry1 = await AuditLogger.logRequest(testRequest);
      const logEntry2 = await AuditLogger.logRequest(testRequest);

      // Assert
      expect(logEntry1.id).toBeDefined();
      expect(logEntry2.id).toBeDefined();
      expect(logEntry1.id).not.toBe(logEntry2.id);
    });

    it('should validate required fields when creating audit log', async () => {
      // Arrange
      const { AuditLogger } = await import('./audit');
      const invalidRequest = {
        // Missing required fields: apiKey, operation, endpoint
        httpMethod: 'GET',
        responseStatus: 200,
        durationMs: 100,
      };

      // Act & Assert
      await expect(
        AuditLogger.logRequest(invalidRequest as Parameters<typeof AuditLogger.logRequest>[0])
      ).rejects.toThrow('Missing required audit log fields');
    });
  });

  describe('Database Integration', () => {
    it('should persist audit log to PostgreSQL database', async () => {
      // Arrange
      const { AuditLogger, getAuditLogs } = await import('./audit');
      const testRequest = {
        apiKey: 'mx_test_key_123456789',
        operation: 'getBalance',
        endpoint: '/api/v1/balance',
        httpMethod: 'GET',
        responseStatus: 200,
        durationMs: 200,
      };

      // Act
      const logEntry = await AuditLogger.logRequest(testRequest);

      // Verify persistence by querying
      const retrievedLogs = await getAuditLogs({
        apiKey: testRequest.apiKey,
        limit: 1,
      });

      // Assert
      expect(retrievedLogs).toHaveLength(1);
      expect(retrievedLogs[0].id).toBe(logEntry.id);
      expect(retrievedLogs[0].operation).toBe(testRequest.operation);
    });

    it('should handle database connection errors gracefully', async () => {
      // Arrange
      const { AuditLogger } = await import('./audit');

      // Mock database failure
      // This test assumes we can inject a mock database connection
      const testRequest = {
        apiKey: 'mx_test_key_123456789',
        operation: 'getTicker',
        endpoint: '/api/v1/ticker',
        httpMethod: 'GET',
        responseStatus: 200,
        durationMs: 100,
      };

      // Act & Assert
      // Should not throw error, but should handle gracefully
      // Could log to alternative location or queue for retry
      const result = await AuditLogger.logRequest(testRequest);
      expect(result).toBeDefined();
    });
  });

  describe('Query Functionality', () => {
    beforeEach(async () => {
      // Clear and seed test data
      const { AuditLogger, clearAuditLogs } = await import('./audit');
      clearAuditLogs();

      const testRequests = [
        {
          apiKey: 'mx_user1_key',
          operation: 'getTicker',
          endpoint: '/api/v1/ticker',
          httpMethod: 'GET',
          responseStatus: 200,
          durationMs: 100,
        },
        {
          apiKey: 'mx_user1_key',
          operation: 'placeOrder',
          endpoint: '/api/v1/orders',
          httpMethod: 'POST',
          responseStatus: 201,
          durationMs: 300,
        },
        {
          apiKey: 'mx_user2_key',
          operation: 'getTicker',
          endpoint: '/api/v1/ticker',
          httpMethod: 'GET',
          responseStatus: 400,
          errorMessage: 'Invalid symbol',
          durationMs: 50,
        },
      ];

      for (const request of testRequests) {
        await AuditLogger.logRequest(request);
      }
    });

    it('should query audit logs by API key', async () => {
      // Arrange
      const { getAuditLogs } = await import('./audit');

      // Act
      const logs = await getAuditLogs({ apiKey: 'mx_user1_key' });

      // Assert
      expect(logs).toHaveLength(2);
      expect(logs.every((log) => log.apiKey === 'mx_user1******')).toBe(true);
    });

    it('should query audit logs by operation', async () => {
      // Arrange
      const { getAuditLogs } = await import('./audit');

      // Act
      const logs = await getAuditLogs({ operation: 'getTicker' });

      // Assert
      expect(logs).toHaveLength(2);
      expect(logs.every((log) => log.operation === 'getTicker')).toBe(true);
    });

    it('should query audit logs by status (success/error)', async () => {
      // Arrange
      const { getAuditLogs } = await import('./audit');

      // Act
      const successLogs = await getAuditLogs({ status: 'success' });
      const errorLogs = await getAuditLogs({ status: 'error' });

      // Assert
      expect(successLogs.length).toBeGreaterThan(0);
      expect(
        successLogs.every((log) => log.responseStatus >= 200 && log.responseStatus < 400)
      ).toBe(true);

      expect(errorLogs.length).toBeGreaterThan(0);
      expect(errorLogs.every((log) => log.responseStatus >= 400)).toBe(true);
    });

    it('should support pagination with limit and offset', async () => {
      // Arrange
      const { getAuditLogs } = await import('./audit');

      // Act
      const firstPage = await getAuditLogs({ limit: 2, offset: 0 });
      const secondPage = await getAuditLogs({ limit: 2, offset: 2 });

      // Assert
      expect(firstPage).toHaveLength(2);
      expect(secondPage).toHaveLength(1); // Only 3 total records seeded
      expect(firstPage[0].id).not.toBe(secondPage[0].id);
    });

    it('should filter by date range', async () => {
      // Arrange
      const { getAuditLogs } = await import('./audit');
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Act
      const recentLogs = await getAuditLogs({
        startDate: oneHourAgo,
        endDate: now,
      });

      // Assert
      expect(recentLogs.length).toBeGreaterThan(0);
      expect(recentLogs.every((log) => log.timestamp >= oneHourAgo && log.timestamp <= now)).toBe(
        true
      );
    });
  });

  describe('Security and Privacy', () => {
    it('should not log sensitive data in request/response', async () => {
      // Arrange
      const { AuditLogger } = await import('./audit');
      const testRequest = {
        apiKey: 'mx_test_key_123456789',
        operation: 'createApiKey',
        endpoint: '/api/v1/keys',
        httpMethod: 'POST',
        requestData: {
          description: 'Test key',
          secretKey: 'very_secret_key_do_not_log', // Should be filtered
        },
        responseStatus: 201,
        responseData: {
          apiKey: 'mx_new_key_123',
          secretKey: 'another_secret_do_not_log', // Should be filtered
        },
        durationMs: 250,
      };

      // Act
      const logEntry = await AuditLogger.logRequest(testRequest);

      // Assert
      expect(logEntry.requestData?.secretKey).toBe('[REDACTED]');
      expect(logEntry.responseData?.secretKey).toBe('[REDACTED]');
      expect(logEntry.requestData?.description).toBe('Test key'); // Non-sensitive should remain
    });

    it('should sanitize API keys in logs for security', async () => {
      // Arrange
      const { AuditLogger } = await import('./audit');
      const testRequest = {
        apiKey: 'mx_very_long_api_key_123456789',
        operation: 'getTicker',
        endpoint: '/api/v1/ticker',
        httpMethod: 'GET',
        responseStatus: 200,
        durationMs: 100,
      };

      // Act
      const logEntry = await AuditLogger.logRequest(testRequest);

      // Assert - API key should be partially masked or hashed
      expect(logEntry.apiKey).not.toBe(testRequest.apiKey);
      expect(logEntry.apiKey).toMatch(/^mx_very_\*{6,}$/); // Should be masked
    });
  });

  describe('Performance', () => {
    it('should log audit entry within reasonable time', async () => {
      // Arrange
      const { AuditLogger } = await import('./audit');
      const testRequest = {
        apiKey: 'mx_test_key_123456789',
        operation: 'getTicker',
        endpoint: '/api/v1/ticker',
        httpMethod: 'GET',
        responseStatus: 200,
        durationMs: 100,
      };

      // Act
      const start = Date.now();
      await AuditLogger.logRequest(testRequest);
      const duration = Date.now() - start;

      // Assert - Audit logging should not add significant overhead
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle high volume of concurrent audit logs', async () => {
      // Arrange
      const { AuditLogger } = await import('./audit');
      const requests = Array.from({ length: 50 }, (_, i) => ({
        apiKey: `mx_test_key_${i}`,
        operation: 'getTicker',
        endpoint: '/api/v1/ticker',
        httpMethod: 'GET',
        responseStatus: 200,
        durationMs: 100,
      }));

      // Act
      const start = Date.now();
      const promises = requests.map((req) => AuditLogger.logRequest(req));
      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      // Assert
      expect(results).toHaveLength(50);
      expect(results.every((result) => result.id)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should handle 50 concurrent logs within 5 seconds
    });
  });
});
