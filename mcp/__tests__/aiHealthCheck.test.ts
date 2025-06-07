/**
 * AI Health Check Endpoint Tests - Task #32
 * TDD implementation of comprehensive AI service monitoring
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create global mocks that the service can access
const mockGeminiAnalyzer = {
  getBudgetStatus: vi.fn(() => ({
    costUSD: 0.45,
    remainingBudget: 9.55,
    requestCount: 50,
    resetTime: Date.now() + 24 * 60 * 60 * 1000,
  })),
  getCacheStats: vi.fn(() => ({
    hitRate: 0.85,
    missRate: 0.15,
    totalRequests: 100,
    cacheSize: 25,
  })),
  getConfig: vi.fn(() => ({
    model: 'gemini-2.5-flash-preview-05-20',
    temperature: 0.7,
    maxTokens: 4096,
  })),
  isHealthy: vi.fn(() => true),
};

const mockMEXCClient = {
  ping: vi.fn(() => Promise.resolve({ success: true, latency: 45 })),
  getServerTime: vi.fn(() => Promise.resolve({ success: true, serverTime: Date.now() })),
};

// Global mock availability for the service
(globalThis as any).__HEALTH_CHECK_MOCKS__ = {
  geminiAnalyzer: mockGeminiAnalyzer,
  mexcClient: mockMEXCClient,
};

// Mock imports
globalThis.require = vi.fn((module: string) => {
  if (module.includes('gemini-analyzer')) {
    return { geminiAnalyzer: mockGeminiAnalyzer };
  }
  if (module.includes('mexc-client')) {
    return { mexcClient: mockMEXCClient };
  }
  return {};
});

// Import the service after mocks
import { mcpIntegrationService } from '../services/mcpIntegration';

// Test interfaces for comprehensive health check
interface ComprehensiveHealthResponse {
  geminiApi: {
    status: 'OK' | 'WARNING' | 'ERROR';
    timestamp: number;
    latency?: number;
    modelVersion?: string;
    budgetStatus?: {
      costUSD: number;
      remainingBudget: number;
      utilizationPercentage: number;
    };
    cachePerformance?: {
      hitRate: number;
      efficiency: string;
    };
    recoveryActions?: string[];
  };
  mexcIntegration: {
    status: 'OK' | 'WARNING' | 'ERROR';
    timestamp: number;
    connectivity?: {
      ping: boolean;
      latency: number;
      serverSync: boolean;
    };
    dataFreshness?: {
      lastUpdate: number;
      staleness: string;
    };
    recoveryActions?: string[];
  };
  aiServices: {
    status: 'OK' | 'WARNING' | 'ERROR';
    timestamp: number;
    serviceHealth?: {
      analyzer: boolean;
      client: boolean;
      models: boolean;
    };
    performanceMetrics?: {
      averageResponseTime: number;
      successRate: number;
      errorRate: number;
    };
    recoveryActions?: string[];
  };
  overall: {
    status: 'OK' | 'WARNING' | 'ERROR';
    timestamp: number;
    uptime: number;
    healthScore: number;
    criticalIssues: number;
    recommendations: string[];
  };
}

describe('AI Health Check Endpoint - Task #32', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    mockGeminiAnalyzer.getBudgetStatus.mockClear();
    mockGeminiAnalyzer.getCacheStats.mockClear();
    mockGeminiAnalyzer.getConfig.mockClear();
    mockGeminiAnalyzer.isHealthy.mockClear();
    mockMEXCClient.ping.mockClear();
    mockMEXCClient.getServerTime.mockClear();
  });

  describe('Service Interface', () => {
    it('should have getHealthStatus method available', () => {
      expect(mcpIntegrationService.getHealthStatus).toBeDefined();
      expect(typeof mcpIntegrationService.getHealthStatus).toBe('function');
    });

    it('should return a promise from getHealthStatus', () => {
      const result = mcpIntegrationService.getHealthStatus();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('Gemini API Health Check', () => {
    it('should check Gemini API connectivity and budget status', async () => {
      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.success).toBe(true);
      expect(healthStatus.data.geminiApi).toBeDefined();
      expect(healthStatus.data.geminiApi.status).toMatch(/^(OK|WARNING|ERROR)$/);
      expect(healthStatus.data.geminiApi.timestamp).toBeGreaterThan(0);
    });

    it('should include budget status in Gemini health check', async () => {
      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.data.geminiApi.budgetStatus).toBeDefined();
      expect(healthStatus.data.geminiApi.budgetStatus.costUSD).toBeGreaterThanOrEqual(0);
      expect(healthStatus.data.geminiApi.budgetStatus.remainingBudget).toBeGreaterThanOrEqual(0);
      expect(healthStatus.data.geminiApi.budgetStatus.utilizationPercentage).toBeGreaterThanOrEqual(
        0
      );
    });

    it('should include cache performance metrics', async () => {
      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.data.geminiApi.cachePerformance).toBeDefined();
      expect(healthStatus.data.geminiApi.cachePerformance.hitRate).toBeGreaterThanOrEqual(0);
      expect(healthStatus.data.geminiApi.cachePerformance.hitRate).toBeLessThanOrEqual(1);
      expect(healthStatus.data.geminiApi.cachePerformance.efficiency).toBeDefined();
    });

    it('should provide recovery actions for Gemini API issues', async () => {
      // Mock unhealthy Gemini API
      mockGeminiAnalyzer.isHealthy.mockReturnValueOnce(false);

      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.data.geminiApi.recoveryActions).toBeDefined();
      expect(Array.isArray(healthStatus.data.geminiApi.recoveryActions)).toBe(true);
    });
  });

  describe('MEXC Integration Health Check', () => {
    it('should check MEXC API connectivity', async () => {
      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.data.mexcIntegration).toBeDefined();
      expect(healthStatus.data.mexcIntegration.status).toMatch(/^(OK|WARNING|ERROR)$/);
      expect(healthStatus.data.mexcIntegration.connectivity).toBeDefined();
    });

    it('should measure MEXC API latency', async () => {
      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.data.mexcIntegration.connectivity.latency).toBeGreaterThan(0);
      expect(healthStatus.data.mexcIntegration.connectivity.latency).toBeLessThan(5000);
    });

    it('should check data freshness', async () => {
      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.data.mexcIntegration.dataFreshness).toBeDefined();
      expect(healthStatus.data.mexcIntegration.dataFreshness.lastUpdate).toBeGreaterThan(0);
      expect(healthStatus.data.mexcIntegration.dataFreshness.staleness).toBeDefined();
    });

    it('should provide recovery actions for MEXC connectivity issues', async () => {
      // Mock failed MEXC connectivity
      mockMEXCClient.ping.mockResolvedValueOnce({ success: false, error: 'Connection failed' });

      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.data.mexcIntegration.recoveryActions).toBeDefined();
      expect(Array.isArray(healthStatus.data.mexcIntegration.recoveryActions)).toBe(true);
    });
  });

  describe('AI Services Health Check', () => {
    it('should check all AI service components', async () => {
      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.data.aiServices).toBeDefined();
      expect(healthStatus.data.aiServices.serviceHealth).toBeDefined();
      expect(healthStatus.data.aiServices.serviceHealth.analyzer).toBeDefined();
      expect(healthStatus.data.aiServices.serviceHealth.client).toBeDefined();
      expect(healthStatus.data.aiServices.serviceHealth.models).toBeDefined();
    });

    it('should include performance metrics', async () => {
      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.data.aiServices.performanceMetrics).toBeDefined();
      expect(healthStatus.data.aiServices.performanceMetrics.averageResponseTime).toBeGreaterThan(
        0
      );
      expect(healthStatus.data.aiServices.performanceMetrics.successRate).toBeGreaterThanOrEqual(0);
      expect(healthStatus.data.aiServices.performanceMetrics.errorRate).toBeGreaterThanOrEqual(0);
    });

    it('should calculate service health status correctly', async () => {
      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.data.aiServices.status).toMatch(/^(OK|WARNING|ERROR)$/);

      // If all services are healthy, status should be OK
      if (
        healthStatus.data.aiServices.serviceHealth.analyzer &&
        healthStatus.data.aiServices.serviceHealth.client &&
        healthStatus.data.aiServices.serviceHealth.models
      ) {
        expect(healthStatus.data.aiServices.status).toBe('OK');
      }
    });
  });

  describe('Overall Health Assessment', () => {
    it('should provide overall health status', async () => {
      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.data.overall).toBeDefined();
      expect(healthStatus.data.overall.status).toMatch(/^(OK|WARNING|ERROR)$/);
      expect(healthStatus.data.overall.healthScore).toBeGreaterThanOrEqual(0);
      expect(healthStatus.data.overall.healthScore).toBeLessThanOrEqual(100);
    });

    it('should track system uptime', async () => {
      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.data.overall.uptime).toBeGreaterThan(0);
    });

    it('should identify critical issues', async () => {
      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.data.overall.criticalIssues).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(healthStatus.data.overall.recommendations)).toBe(true);
    });

    it('should aggregate status from all components', async () => {
      // Mock all services as healthy
      mockGeminiAnalyzer.isHealthy.mockReturnValueOnce(true);
      mockMEXCClient.ping.mockResolvedValueOnce({ success: true, latency: 45 });

      const healthStatus = await mcpIntegrationService.getHealthStatus();

      // With all services healthy, overall status should be OK
      expect(healthStatus.data.overall.status).toBe('OK');
      expect(healthStatus.data.overall.criticalIssues).toBe(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Gemini API failures gracefully', async () => {
      mockGeminiAnalyzer.getBudgetStatus.mockImplementationOnce(() => {
        throw new Error('Gemini API unavailable');
      });

      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.success).toBe(true); // Should still return a response
      expect(healthStatus.data.geminiApi.status).toBe('ERROR');
      expect(healthStatus.data.geminiApi.recoveryActions).toBeDefined();
    });

    it('should handle MEXC API failures gracefully', async () => {
      mockMEXCClient.ping.mockRejectedValueOnce(new Error('Network timeout'));

      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.success).toBe(true);
      expect(healthStatus.data.mexcIntegration.status).toBe('ERROR');
      expect(healthStatus.data.mexcIntegration.recoveryActions).toBeDefined();
    });

    it('should provide actionable recovery recommendations', async () => {
      // Mock multiple service failures
      mockGeminiAnalyzer.isHealthy.mockReturnValueOnce(false);
      mockMEXCClient.ping.mockResolvedValueOnce({ success: false });

      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.data.overall.recommendations.length).toBeGreaterThan(0);
      expect(healthStatus.data.overall.recommendations[0]).toBeTruthy();
    });
  });

  describe('Response Format Validation', () => {
    it('should return properly structured ServiceResponse', async () => {
      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus).toMatchObject({
        success: expect.any(Boolean),
        data: expect.any(Object),
        timestamp: expect.any(Number),
        processingTimeMs: expect.any(Number),
        serviceVersion: expect.any(String),
      });
    });

    it('should include processing time in response', async () => {
      const startTime = Date.now();
      const healthStatus = await mcpIntegrationService.getHealthStatus();
      const endTime = Date.now();

      expect(healthStatus.processingTimeMs).toBeGreaterThan(0);
      expect(healthStatus.processingTimeMs).toBeLessThan(endTime - startTime + 100); // Allow some tolerance
    });

    it('should include service version information', async () => {
      const healthStatus = await mcpIntegrationService.getHealthStatus();

      expect(healthStatus.serviceVersion).toBeDefined();
      expect(typeof healthStatus.serviceVersion).toBe('string');
    });
  });

  describe('Performance Requirements', () => {
    it('should complete health check within 5 seconds', async () => {
      const startTime = Date.now();
      await mcpIntegrationService.getHealthStatus();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });

    it('should handle concurrent health check requests', async () => {
      const promises = Array.from({ length: 3 }, () => mcpIntegrationService.getHealthStatus());

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });
  });
});
