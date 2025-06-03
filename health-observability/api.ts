/**
 * Health Check and Observability API
 * Task #18: Comprehensive health monitoring and observability features
 */

import { api } from 'encore.dev/api';
import { healthService } from './encore.service';

// =============================================================================
// Health Check Types
// =============================================================================

export interface SystemHealthResponse {
  /** Overall system status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Current timestamp */
  timestamp: number;
  /** System uptime in milliseconds */
  uptime: number;
  /** Service-specific health statuses */
  services: {
    mcp: ServiceHealth;
    auth: ServiceHealth;
    marketData: ServiceHealth;
    portfolio: ServiceHealth;
    trading: ServiceHealth;
    tools: ServiceHealth;
    ai: ServiceHealth;
    streaming: ServiceHealth;
  };
  /** System-wide metrics */
  systemMetrics: {
    /** Memory usage information */
    memory: {
      used: number;
      free: number;
      total: number;
      usagePercentage: number;
    };
    /** CPU information */
    cpu: {
      loadAverage: number[];
      usage?: number;
    };
    /** Request statistics */
    requests: {
      total: number;
      successful: number;
      failed: number;
      averageResponseTime: number;
      requestsPerMinute: number;
    };
    /** Error tracking */
    errors: {
      last24Hours: number;
      lastHour: number;
      criticalErrors: number;
      errorRate: number;
    };
  };
  /** Performance metrics */
  performance: {
    /** Average response times by endpoint */
    responseTimesByEndpoint: Record<string, number>;
    /** Slowest recent endpoints */
    slowestEndpoints: Array<{
      endpoint: string;
      averageResponseTime: number;
      requestCount: number;
    }>;
    /** Cache performance */
    cachePerformance: {
      hitRate: number;
      missRate: number;
      totalRequests: number;
    };
  };
  /** Health check summary */
  healthSummary: {
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
    totalServices: number;
    lastFullCheck: number;
  };
}

export interface ServiceHealth {
  /** Service status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Last check timestamp */
  lastCheck: number;
  /** Response time in milliseconds */
  responseTime?: number;
  /** Service-specific metrics */
  metrics?: Record<string, unknown>;
  /** Error information */
  errors?: string[];
  /** Service uptime */
  uptime?: number;
  /** Additional details */
  details?: Record<string, unknown>;
}

// =============================================================================
// Metrics Types
// =============================================================================

export interface MetricsResponse {
  /** Current timestamp */
  timestamp: number;
  /** Application metrics */
  application: {
    /** Request metrics */
    requests: {
      totalRequests: number;
      requestsPerSecond: number;
      requestsPerMinute: number;
      requestsPerHour: number;
      averageResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
    };
    /** Error metrics */
    errors: {
      totalErrors: number;
      errorRate: number;
      errorsByType: Record<string, number>;
      recentErrors: Array<{
        timestamp: number;
        error: string;
        endpoint: string;
        statusCode?: number;
      }>;
    };
    /** Endpoint-specific metrics */
    endpoints: Record<
      string,
      {
        requestCount: number;
        averageResponseTime: number;
        errorCount: number;
        successRate: number;
      }
    >;
  };
  /** Resource usage metrics */
  resources: {
    /** Memory metrics */
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
      usage: number;
    };
    /** CPU metrics */
    cpu: {
      usage: number;
      loadAverage: number[];
    };
    /** Event loop metrics */
    eventLoop: {
      delay: number;
      utilization: number;
    };
  };
  /** Business metrics */
  business: {
    /** AI analysis metrics */
    aiAnalysis: {
      totalAnalyses: number;
      successfulAnalyses: number;
      failedAnalyses: number;
      averageConfidence: number;
      tokenUsage: number;
      costUSD: number;
    };
    /** Market data metrics */
    marketData: {
      apiCalls: number;
      cacheHits: number;
      cacheMisses: number;
      averageLatency: number;
    };
    /** Trading metrics */
    trading: {
      activePositions: number;
      totalTrades: number;
      successfulTrades: number;
      averageTradeValue: number;
    };
  };
}

// =============================================================================
// API Endpoints
// =============================================================================

/**
 * Comprehensive System Health Check
 * Returns detailed health information for all services and system metrics
 */
export const getSystemHealth = api(
  { method: 'GET', path: '/health', expose: true },
  async (): Promise<SystemHealthResponse> => {
    try {
      return await healthService.getSystemHealth();
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: Date.now(),
        uptime: process.uptime() * 1000,
        services: {
          mcp: { status: 'unhealthy', lastCheck: Date.now(), errors: ['Health check failed'] },
          auth: { status: 'unknown', lastCheck: Date.now() },
          marketData: { status: 'unknown', lastCheck: Date.now() },
          portfolio: { status: 'unknown', lastCheck: Date.now() },
          trading: { status: 'unknown', lastCheck: Date.now() },
          tools: { status: 'unknown', lastCheck: Date.now() },
          ai: { status: 'unknown', lastCheck: Date.now() },
          streaming: { status: 'unknown', lastCheck: Date.now() },
        },
        systemMetrics: {
          memory: { used: 0, free: 0, total: 0, usagePercentage: 0 },
          cpu: { loadAverage: [] },
          requests: {
            total: 0,
            successful: 0,
            failed: 0,
            averageResponseTime: 0,
            requestsPerMinute: 0,
          },
          errors: { last24Hours: 0, lastHour: 0, criticalErrors: 0, errorRate: 0 },
        },
        performance: {
          responseTimesByEndpoint: {},
          slowestEndpoints: [],
          cachePerformance: { hitRate: 0, missRate: 0, totalRequests: 0 },
        },
        healthSummary: {
          healthyServices: 0,
          degradedServices: 0,
          unhealthyServices: 1,
          totalServices: 8,
          lastFullCheck: Date.now(),
        },
      };
    }
  }
);

/**
 * Simple Health Check
 * Returns basic health status for load balancers and monitoring
 */
export const getHealthStatus = api(
  { method: 'GET', path: '/health/status', expose: true },
  async (): Promise<{
    status: 'ok' | 'error';
    timestamp: number;
    uptime: number;
  }> => {
    try {
      const health = await healthService.getSystemHealth();
      return {
        status: health.status === 'healthy' ? 'ok' : 'error',
        timestamp: Date.now(),
        uptime: process.uptime() * 1000,
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: Date.now(),
        uptime: process.uptime() * 1000,
      };
    }
  }
);

/**
 * Readiness Check
 * Returns whether the application is ready to serve requests
 */
export const getReadinessCheck = api(
  { method: 'GET', path: '/health/ready', expose: true },
  async (): Promise<{
    ready: boolean;
    timestamp: number;
    details: Record<string, boolean>;
  }> => {
    try {
      const readiness = await healthService.getReadinessStatus();
      return readiness;
    } catch (error) {
      return {
        ready: false,
        timestamp: Date.now(),
        details: {
          database: false,
          cache: false,
          externalAPIs: false,
          configuration: false,
        },
      };
    }
  }
);

/**
 * Liveness Check
 * Returns whether the application is alive and responsive
 */
export const getLivenessCheck = api(
  { method: 'GET', path: '/health/live', expose: true },
  async (): Promise<{
    alive: boolean;
    timestamp: number;
    responseTime: number;
  }> => {
    const startTime = Date.now();
    try {
      // Simple responsive check
      await new Promise((resolve) => setTimeout(resolve, 1));
      return {
        alive: true,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        alive: false,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
      };
    }
  }
);

/**
 * Application Metrics
 * Returns detailed performance and business metrics
 */
export const getMetrics = api(
  { method: 'GET', path: '/metrics', expose: true },
  async (): Promise<MetricsResponse> => {
    try {
      return await healthService.getMetrics();
    } catch (error) {
      return {
        timestamp: Date.now(),
        application: {
          requests: {
            totalRequests: 0,
            requestsPerSecond: 0,
            requestsPerMinute: 0,
            requestsPerHour: 0,
            averageResponseTime: 0,
            p95ResponseTime: 0,
            p99ResponseTime: 0,
          },
          errors: {
            totalErrors: 0,
            errorRate: 0,
            errorsByType: {},
            recentErrors: [],
          },
          endpoints: {},
        },
        resources: {
          memory: {
            heapUsed: process.memoryUsage().heapUsed,
            heapTotal: process.memoryUsage().heapTotal,
            external: process.memoryUsage().external,
            rss: process.memoryUsage().rss,
            usage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
          },
          cpu: {
            usage: 0,
            loadAverage: require('os').loadavg(),
          },
          eventLoop: {
            delay: 0,
            utilization: 0,
          },
        },
        business: {
          aiAnalysis: {
            totalAnalyses: 0,
            successfulAnalyses: 0,
            failedAnalyses: 0,
            averageConfidence: 0,
            tokenUsage: 0,
            costUSD: 0,
          },
          marketData: {
            apiCalls: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageLatency: 0,
          },
          trading: {
            activePositions: 0,
            totalTrades: 0,
            successfulTrades: 0,
            averageTradeValue: 0,
          },
        },
      };
    }
  }
);

/**
 * Service-specific Health Check
 * Returns health status for a specific service
 */
export const getServiceHealth = api(
  { method: 'GET', path: '/health/service/:serviceName', expose: true },
  async ({ serviceName }: { serviceName: string }): Promise<ServiceHealth> => {
    try {
      return await healthService.getServiceHealth(serviceName);
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: Date.now(),
        errors: [`Failed to check health for service: ${serviceName}`],
      };
    }
  }
);

/**
 * Performance Dashboard Data
 * Returns data optimized for monitoring dashboards
 */
export const getDashboardData = api(
  { method: 'GET', path: '/health/dashboard', expose: true },
  async (): Promise<{
    overview: {
      status: string;
      uptime: number;
      totalRequests: number;
      errorRate: number;
      averageResponseTime: number;
    };
    services: Array<{
      name: string;
      status: string;
      responseTime: number;
      errorCount: number;
    }>;
    charts: {
      requestsOverTime: Array<{ timestamp: number; value: number }>;
      errorRateOverTime: Array<{ timestamp: number; value: number }>;
      responseTimeOverTime: Array<{ timestamp: number; value: number }>;
    };
    alerts: Array<{
      level: 'info' | 'warning' | 'critical';
      message: string;
      timestamp: number;
      service?: string;
    }>;
  }> => {
    try {
      return await healthService.getDashboardData();
    } catch (error) {
      return {
        overview: {
          status: 'unhealthy',
          uptime: process.uptime() * 1000,
          totalRequests: 0,
          errorRate: 0,
          averageResponseTime: 0,
        },
        services: [],
        charts: {
          requestsOverTime: [],
          errorRateOverTime: [],
          responseTimeOverTime: [],
        },
        alerts: [
          {
            level: 'critical',
            message: 'Health dashboard data unavailable',
            timestamp: Date.now(),
          },
        ],
      };
    }
  }
);
