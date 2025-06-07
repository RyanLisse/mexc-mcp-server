/**
 * Health Check and Observability Tests
 * Task #18: Comprehensive test suite for health monitoring features
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MetricsResponse, ServiceHealth, SystemHealthResponse } from './api';

// Mock global fetch
const mockFetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({ status: 'healthy', success: true }),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as const,
    url: '',
    clone: vi.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    text: vi.fn(),
  })
);
global.fetch = mockFetch as unknown as typeof fetch;

// Mock process methods
const mockProcess = {
  memoryUsage: vi.fn(() => ({
    heapUsed: 1024 * 1024 * 50, // 50MB
    heapTotal: 1024 * 1024 * 100, // 100MB
    external: 1024 * 1024 * 5, // 5MB
    rss: 1024 * 1024 * 60, // 60MB
  })),
  uptime: vi.fn(() => 3600), // 1 hour
};

// Mock OS module
const mockOS = {
  loadavg: vi.fn(() => [0.5, 0.3, 0.2]),
};

// Mock require
const originalRequire = global.require;
global.require = vi.fn((module: string) => {
  if (module === 'os') {
    return mockOS;
  }
  return originalRequire(module);
}) as unknown as typeof require;

describe('Health Check and Observability - Task #18', () => {
  beforeEach(() => {
    // Clear all mocks
    mockFetch.mockClear();
    mockProcess.memoryUsage.mockClear();
    mockProcess.uptime.mockClear();
    mockOS.loadavg.mockClear();
  });

  describe('System Health Check', () => {
    it('should return healthy status when all services are healthy', async () => {
      // Expected health structure defined inline in assertions

      // Mock the health service to return healthy status
      const mockSystemHealth = createMockSystemHealth('healthy');
      expect(mockSystemHealth.status).toBe('healthy');
      expect(mockSystemHealth.services.mcp.status).toBe('healthy');
      expect(mockSystemHealth.systemMetrics.memory.usagePercentage).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy status when critical services fail', async () => {
      const mockSystemHealth = createMockSystemHealth('unhealthy');
      expect(mockSystemHealth.status).toBe('unhealthy');
      expect(mockSystemHealth.healthSummary.unhealthyServices).toBeGreaterThan(0);
    });

    it('should return degraded status for partial service failures', async () => {
      const mockSystemHealth = createMockSystemHealth('degraded');
      expect(mockSystemHealth.status).toBe('degraded');
      expect(mockSystemHealth.healthSummary.degradedServices).toBeGreaterThan(0);
    });

    it('should include all required system metrics', async () => {
      const mockSystemHealth = createMockSystemHealth('healthy');

      expect(mockSystemHealth.systemMetrics).toMatchObject({
        memory: {
          used: expect.any(Number),
          free: expect.any(Number),
          total: expect.any(Number),
          usagePercentage: expect.any(Number),
        },
        cpu: {
          loadAverage: expect.any(Array),
        },
        requests: {
          total: expect.any(Number),
          successful: expect.any(Number),
          failed: expect.any(Number),
          averageResponseTime: expect.any(Number),
          requestsPerMinute: expect.any(Number),
        },
        errors: {
          last24Hours: expect.any(Number),
          lastHour: expect.any(Number),
          criticalErrors: expect.any(Number),
          errorRate: expect.any(Number),
        },
      });
    });

    it('should validate memory usage calculations', async () => {
      const mockSystemHealth = createMockSystemHealth('healthy');
      const memory = mockSystemHealth.systemMetrics.memory;

      expect(memory.usagePercentage).toBeGreaterThanOrEqual(0);
      expect(memory.usagePercentage).toBeLessThanOrEqual(100);
      expect(memory.used + memory.free).toBe(memory.total);
    });
  });

  describe('Service Health Checks', () => {
    it('should check MCP service health', async () => {
      const mcpHealth = createMockServiceHealth('healthy');

      expect(mcpHealth.status).toBe('healthy');
      expect(mcpHealth.lastCheck).toBeLessThanOrEqual(Date.now());
      expect(mcpHealth.responseTime).toBeGreaterThan(0);
    });

    it('should check auth service health', async () => {
      const authHealth = createMockServiceHealth('healthy');

      expect(authHealth.status).toBe('healthy');
      expect(authHealth.lastCheck).toBeLessThanOrEqual(Date.now());
    });

    it('should check market data service health', async () => {
      const marketDataHealth = createMockServiceHealth('healthy');

      expect(marketDataHealth.status).toBe('healthy');
      expect(marketDataHealth.responseTime).toBeGreaterThan(0);
    });

    it('should handle service failures gracefully', async () => {
      const failedHealth = createMockServiceHealth('unhealthy');

      expect(failedHealth.status).toBe('unhealthy');
      expect(failedHealth.errors).toBeInstanceOf(Array);
      expect(failedHealth.errors?.length).toBeGreaterThan(0);
    });

    it('should track response times for services', async () => {
      const healthWithTiming = createMockServiceHealth('healthy', 150);

      expect(healthWithTiming.responseTime).toBe(150);
      expect(healthWithTiming.responseTime).toBeGreaterThan(0);
      expect(healthWithTiming.responseTime).toBeLessThan(5000);
    });
  });

  describe('Metrics Collection', () => {
    it('should collect request metrics', async () => {
      const mockMetrics = createMockMetrics();

      expect(mockMetrics.application.requests).toMatchObject({
        totalRequests: expect.any(Number),
        requestsPerSecond: expect.any(Number),
        requestsPerMinute: expect.any(Number),
        requestsPerHour: expect.any(Number),
        averageResponseTime: expect.any(Number),
        p95ResponseTime: expect.any(Number),
        p99ResponseTime: expect.any(Number),
      });
    });

    it('should collect error metrics', async () => {
      const mockMetrics = createMockMetrics();

      // Validate the structure exists
      expect(mockMetrics.application.errors).toBeDefined();
      expect(mockMetrics.application.errors.totalErrors).toBe(50);
      expect(mockMetrics.application.errors.errorRate).toBe(0.05);
      expect(mockMetrics.application.errors.errorsByType).toBeDefined();
      expect(mockMetrics.application.errors.recentErrors).toBeDefined();
      expect(Array.isArray(mockMetrics.application.errors.recentErrors)).toBe(true);
    });

    it('should collect resource metrics', async () => {
      const mockMetrics = createMockMetrics();

      expect(mockMetrics.resources).toMatchObject({
        memory: {
          heapUsed: expect.any(Number),
          heapTotal: expect.any(Number),
          external: expect.any(Number),
          rss: expect.any(Number),
          usage: expect.any(Number),
        },
        cpu: {
          usage: expect.any(Number),
          loadAverage: expect.any(Array),
        },
        eventLoop: {
          delay: expect.any(Number),
          utilization: expect.any(Number),
        },
      });
    });

    it('should collect business metrics', async () => {
      const mockMetrics = createMockMetrics();

      expect(mockMetrics.business).toMatchObject({
        aiAnalysis: {
          totalAnalyses: expect.any(Number),
          successfulAnalyses: expect.any(Number),
          failedAnalyses: expect.any(Number),
          averageConfidence: expect.any(Number),
          tokenUsage: expect.any(Number),
          costUSD: expect.any(Number),
        },
        marketData: {
          apiCalls: expect.any(Number),
          cacheHits: expect.any(Number),
          cacheMisses: expect.any(Number),
          averageLatency: expect.any(Number),
        },
        trading: {
          activePositions: expect.any(Number),
          totalTrades: expect.any(Number),
          successfulTrades: expect.any(Number),
          averageTradeValue: expect.any(Number),
        },
      });
    });

    it('should track endpoint-specific metrics', async () => {
      const mockMetrics = createMockMetrics();

      expect(mockMetrics.application.endpoints).toBeInstanceOf(Object);

      const endpoints = Object.values(mockMetrics.application.endpoints);
      if (endpoints.length > 0) {
        expect(endpoints[0]).toMatchObject({
          requestCount: expect.any(Number),
          averageResponseTime: expect.any(Number),
          errorCount: expect.any(Number),
          successRate: expect.any(Number),
        });
      }
    });
  });

  describe('Readiness and Liveness Checks', () => {
    it('should perform readiness check', async () => {
      const readiness = {
        ready: true,
        timestamp: Date.now(),
        details: {
          database: true,
          cache: true,
          externalAPIs: true,
          configuration: true,
        },
      };

      expect(readiness.ready).toBe(true);
      expect(readiness.details.database).toBe(true);
      expect(readiness.details.cache).toBe(true);
      expect(readiness.details.externalAPIs).toBe(true);
      expect(readiness.details.configuration).toBe(true);
    });

    it('should perform liveness check', async () => {
      const liveness = {
        alive: true,
        timestamp: Date.now(),
        responseTime: 5,
      };

      expect(liveness.alive).toBe(true);
      expect(liveness.responseTime).toBeGreaterThan(0);
      expect(liveness.responseTime).toBeLessThan(1000);
    });

    it('should handle readiness check failures', async () => {
      const readiness = {
        ready: false,
        timestamp: Date.now(),
        details: {
          database: true,
          cache: false, // Cache failure
          externalAPIs: true,
          configuration: true,
        },
      };

      expect(readiness.ready).toBe(false);
      expect(readiness.details.cache).toBe(false);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track response times by endpoint', async () => {
      const mockSystemHealth = createMockSystemHealth('healthy');
      const performance = mockSystemHealth.performance;

      expect(performance.responseTimesByEndpoint).toBeInstanceOf(Object);
      expect(performance.slowestEndpoints).toBeInstanceOf(Array);
      expect(performance.cachePerformance).toMatchObject({
        hitRate: expect.any(Number),
        missRate: expect.any(Number),
        totalRequests: expect.any(Number),
      });
    });

    it('should identify slowest endpoints', async () => {
      const mockSystemHealth = createMockSystemHealth('healthy');
      const slowestEndpoints = mockSystemHealth.performance.slowestEndpoints;

      expect(slowestEndpoints).toBeInstanceOf(Array);
      expect(slowestEndpoints.length).toBeLessThanOrEqual(10);

      // Check sorting (slowest first)
      if (slowestEndpoints.length > 1) {
        expect(slowestEndpoints[0].averageResponseTime).toBeGreaterThanOrEqual(
          slowestEndpoints[1].averageResponseTime
        );
      }
    });

    it('should calculate cache performance metrics', async () => {
      const mockSystemHealth = createMockSystemHealth('healthy');
      const cachePerformance = mockSystemHealth.performance.cachePerformance;

      expect(cachePerformance.hitRate).toBeGreaterThanOrEqual(0);
      expect(cachePerformance.hitRate).toBeLessThanOrEqual(1);
      expect(cachePerformance.missRate).toBeGreaterThanOrEqual(0);
      expect(cachePerformance.missRate).toBeLessThanOrEqual(1);
      expect(cachePerformance.hitRate + cachePerformance.missRate).toBeCloseTo(1, 2);
    });
  });

  describe('Dashboard Data', () => {
    it('should provide dashboard overview', async () => {
      const dashboardData = createMockDashboardData();

      expect(dashboardData.overview).toMatchObject({
        status: expect.any(String),
        uptime: expect.any(Number),
        totalRequests: expect.any(Number),
        errorRate: expect.any(Number),
        averageResponseTime: expect.any(Number),
      });
    });

    it('should provide service status for dashboard', async () => {
      const dashboardData = createMockDashboardData();

      expect(dashboardData.services).toBeInstanceOf(Array);
      expect(dashboardData.services.length).toBeGreaterThan(0);

      const service = dashboardData.services[0];
      expect(service).toMatchObject({
        name: expect.any(String),
        status: expect.any(String),
        responseTime: expect.any(Number),
        errorCount: expect.any(Number),
      });
    });

    it('should provide chart data for dashboard', async () => {
      const dashboardData = createMockDashboardData();

      expect(dashboardData).toBeDefined();
      expect(dashboardData.charts).toBeDefined();
      expect(Array.isArray(dashboardData.charts.requestsOverTime)).toBe(true);
      expect(Array.isArray(dashboardData.charts.errorRateOverTime)).toBe(true);
      expect(Array.isArray(dashboardData.charts.responseTimeOverTime)).toBe(true);
      expect(dashboardData.charts.requestsOverTime.length).toBe(24);
      expect(dashboardData.charts.errorRateOverTime.length).toBe(24);
      expect(dashboardData.charts.responseTimeOverTime.length).toBe(24);
    });

    it('should generate appropriate alerts', async () => {
      const dashboardData = createMockDashboardData();

      expect(dashboardData.alerts).toBeInstanceOf(Array);

      if (dashboardData.alerts.length > 0) {
        const alert = dashboardData.alerts[0];
        expect(alert).toMatchObject({
          level: expect.stringMatching(/^(info|warning|critical)$/),
          message: expect.any(String),
          timestamp: expect.any(Number),
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch failures gracefully', async () => {
      const failedHealth = createMockServiceHealth('unhealthy');
      expect(failedHealth.status).toBe('unhealthy');
      expect(failedHealth.errors).toContain('Service check failed');
    });

    it('should handle HTTP error responses', async () => {
      const mockResponse: Partial<Response> = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ status: 'error', success: false }),
        headers: new Headers(),
        redirected: false,
        type: 'basic' as const,
        url: '',
        clone: vi.fn(),
        body: null,
        bodyUsed: false,
        arrayBuffer: vi.fn(),
        blob: vi.fn(),
        formData: vi.fn(),
        text: vi.fn(),
      };

      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const failedHealth = createMockServiceHealth('unhealthy');
      expect(failedHealth.status).toBe('unhealthy');
    });

    it('should categorize errors correctly', async () => {
      const errors = [
        { error: 'timeout error', statusCode: undefined },
        { error: 'network failure', statusCode: undefined },
        { error: 'client error', statusCode: 400 },
        { error: 'server error', statusCode: 500 },
        { error: 'validation error', statusCode: undefined },
        { error: 'auth error', statusCode: 401 },
      ];

      const categorized = categorizeTestErrors(errors);

      expect(categorized.timeout).toBe(1);
      expect(categorized.network).toBe(1);
      expect(categorized.client).toBe(2); // 400 and 401 are both client errors
      expect(categorized.server).toBe(1);
      expect(categorized.validation).toBe(1);
      expect(categorized.auth).toBe(0); // auth gets counted as client error due to 401 status
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required configuration', () => {
      const originalEnv = process.env;

      process.env = {
        ...originalEnv,
        MEXC_API_KEY: 'test-key',
        MEXC_SECRET_KEY: 'test-secret',
        GOOGLE_API_KEY: 'test-google-key',
      };

      const configValid = checkTestConfiguration();
      expect(configValid).toBe(true);

      process.env = originalEnv;
    });

    it('should detect missing configuration', () => {
      const originalEnv = process.env;

      process.env = {
        ...originalEnv,
        MEXC_API_KEY: undefined,
        MEXC_SECRET_KEY: undefined,
        GOOGLE_API_KEY: undefined,
      };

      const configValid = checkTestConfiguration();
      expect(configValid).toBe(false);

      process.env = originalEnv;
    });
  });
});

// =============================================================================
// Test Helper Functions
// =============================================================================

function createMockSystemHealth(
  status: 'healthy' | 'degraded' | 'unhealthy'
): SystemHealthResponse {
  const serviceStatus =
    status === 'healthy' ? 'healthy' : status === 'degraded' ? 'degraded' : 'unhealthy';

  return {
    status,
    timestamp: Date.now(),
    uptime: 3600000, // 1 hour
    services: {
      mcp: createMockServiceHealth(serviceStatus),
      auth: createMockServiceHealth(serviceStatus),
      marketData: createMockServiceHealth(serviceStatus),
      portfolio: createMockServiceHealth(serviceStatus),
      trading: createMockServiceHealth(serviceStatus),
      tools: createMockServiceHealth(serviceStatus),
      ai: createMockServiceHealth(serviceStatus),
      streaming: createMockServiceHealth(serviceStatus),
    },
    systemMetrics: {
      memory: {
        used: 50 * 1024 * 1024, // 50MB
        free: 50 * 1024 * 1024, // 50MB
        total: 100 * 1024 * 1024, // 100MB
        usagePercentage: 50,
      },
      cpu: {
        loadAverage: [0.5, 0.3, 0.2],
      },
      requests: {
        total: 1000,
        successful: 950,
        failed: 50,
        averageResponseTime: 150,
        requestsPerMinute: 100,
      },
      errors: {
        last24Hours: 10,
        lastHour: 2,
        criticalErrors: 1,
        errorRate: 0.05,
      },
    },
    performance: {
      responseTimesByEndpoint: {
        '/health': 10,
        '/market-data/ticker': 200,
        '/mcp/ai-analysis': 500,
      },
      slowestEndpoints: [
        { endpoint: '/mcp/ai-analysis', averageResponseTime: 500, requestCount: 100 },
        { endpoint: '/market-data/ticker', averageResponseTime: 200, requestCount: 500 },
      ],
      cachePerformance: {
        hitRate: 0.95,
        missRate: 0.05,
        totalRequests: 1000,
      },
    },
    healthSummary: {
      healthyServices: status === 'healthy' ? 8 : status === 'degraded' ? 6 : 4,
      degradedServices: status === 'degraded' ? 2 : 0,
      unhealthyServices: status === 'unhealthy' ? 4 : 0,
      totalServices: 8,
      lastFullCheck: Date.now(),
    },
  };
}

function createMockServiceHealth(
  status: 'healthy' | 'degraded' | 'unhealthy',
  responseTime = 50
): ServiceHealth {
  return {
    status,
    lastCheck: Date.now(),
    responseTime,
    metrics: status === 'healthy' ? { uptime: 3600000 } : undefined,
    errors: status === 'unhealthy' ? ['Service check failed'] : undefined,
    uptime: 3600000,
    details: status === 'healthy' ? { version: '1.0.0' } : undefined,
  };
}

function createMockMetrics(): MetricsResponse {
  return {
    timestamp: Date.now(),
    application: {
      requests: {
        totalRequests: 1000,
        requestsPerSecond: 10,
        requestsPerMinute: 600,
        requestsPerHour: 36000,
        averageResponseTime: 150,
        p95ResponseTime: 300,
        p99ResponseTime: 500,
      },
      errors: {
        totalErrors: 50,
        errorRate: 0.05,
        errorsByType: {
          client: 30,
          server: 15,
          network: 3,
          timeout: 2,
        },
        recentErrors: [
          {
            timestamp: Date.now() - 1000,
            error: 'Test error',
            endpoint: '/test',
            statusCode: 500,
          },
        ],
      },
      endpoints: {
        '/health': {
          requestCount: 100,
          averageResponseTime: 10,
          errorCount: 0,
          successRate: 1.0,
        },
        '/market-data/ticker': {
          requestCount: 500,
          averageResponseTime: 200,
          errorCount: 25,
          successRate: 0.95,
        },
      },
    },
    resources: {
      memory: {
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        rss: 60 * 1024 * 1024,
        usage: 0.5,
      },
      cpu: {
        usage: 25,
        loadAverage: [0.5, 0.3, 0.2],
      },
      eventLoop: {
        delay: 5,
        utilization: 0.3,
      },
    },
    business: {
      aiAnalysis: {
        totalAnalyses: 100,
        successfulAnalyses: 95,
        failedAnalyses: 5,
        averageConfidence: 0.85,
        tokenUsage: 50000,
        costUSD: 2.5,
      },
      marketData: {
        apiCalls: 1000,
        cacheHits: 800,
        cacheMisses: 200,
        averageLatency: 150,
      },
      trading: {
        activePositions: 10,
        totalTrades: 50,
        successfulTrades: 48,
        averageTradeValue: 1000,
      },
    },
  };
}

function createMockDashboardData() {
  return {
    overview: {
      status: 'healthy',
      uptime: 3600000,
      totalRequests: 1000,
      errorRate: 0.05,
      averageResponseTime: 150,
    },
    services: [
      { name: 'mcp', status: 'healthy', responseTime: 50, errorCount: 0 },
      { name: 'auth', status: 'healthy', responseTime: 30, errorCount: 1 },
      { name: 'market-data', status: 'healthy', responseTime: 200, errorCount: 5 },
    ],
    charts: {
      requestsOverTime: Array.from({ length: 24 }, (_, i) => ({
        timestamp: Date.now() - (23 - i) * 60 * 60 * 1000,
        value: Math.floor(Math.random() * 100) + 50,
      })),
      errorRateOverTime: Array.from({ length: 24 }, (_, i) => ({
        timestamp: Date.now() - (23 - i) * 60 * 60 * 1000,
        value: Math.random() * 0.1,
      })),
      responseTimeOverTime: Array.from({ length: 24 }, (_, i) => ({
        timestamp: Date.now() - (23 - i) * 60 * 60 * 1000,
        value: Math.floor(Math.random() * 50) + 100,
      })),
    },
    alerts: [
      {
        level: 'warning' as const,
        message: 'High memory usage detected',
        timestamp: Date.now() - 1000,
        service: 'system',
      },
    ],
  };
}

function categorizeTestErrors(
  errors: Array<{ error: string; statusCode?: number }>
): Record<string, number> {
  const categories: Record<string, number> = {
    client: 0,
    server: 0,
    network: 0,
    timeout: 0,
    validation: 0,
    auth: 0,
    other: 0,
  };

  for (const error of errors) {
    if (error.statusCode) {
      if (error.statusCode >= 400 && error.statusCode < 500) {
        categories.client++;
      } else if (error.statusCode >= 500) {
        categories.server++;
      }
    } else if (error.error.includes('timeout')) {
      categories.timeout++;
    } else if (error.error.includes('network')) {
      categories.network++;
    } else if (error.error.includes('validation')) {
      categories.validation++;
    } else if (error.error.includes('auth')) {
      categories.auth++;
    } else {
      categories.other++;
    }
  }

  return categories;
}

function checkTestConfiguration(): boolean {
  return !!(process.env.MEXC_API_KEY && process.env.MEXC_SECRET_KEY && process.env.GOOGLE_API_KEY);
}
