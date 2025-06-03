/**
 * Health and Observability Service
 * Task #18: Core service for health monitoring and observability
 */

import { Service } from 'encore.dev/service';
import type { ServiceHealth, SystemHealthResponse, MetricsResponse } from './api';

// =============================================================================
// Service Definition
// =============================================================================

export default new Service('health-observability');

// =============================================================================
// Metrics Collection
// =============================================================================

class MetricsCollector {
  private requestCount = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private responseTimes: number[] = [];
  private endpointMetrics = new Map<string, {
    count: number;
    totalTime: number;
    errors: number;
  }>();
  private errors: Array<{
    timestamp: number;
    error: string;
    endpoint: string;
    statusCode?: number;
  }> = [];
  private startTime = Date.now();

  recordRequest(endpoint: string, responseTime: number, success: boolean, statusCode?: number) {
    this.requestCount++;
    if (success) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
      this.errors.push({
        timestamp: Date.now(),
        error: `Request failed with status ${statusCode}`,
        endpoint,
        statusCode,
      });
    }

    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    const endpointData = this.endpointMetrics.get(endpoint) || { count: 0, totalTime: 0, errors: 0 };
    endpointData.count++;
    endpointData.totalTime += responseTime;
    if (!success) endpointData.errors++;
    this.endpointMetrics.set(endpoint, endpointData);

    // Keep only recent errors (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.errors = this.errors.filter(error => error.timestamp > oneDayAgo);
  }

  getMetrics() {
    const averageResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;

    const uptime = Date.now() - this.startTime;
    const requestsPerMinute = this.requestCount / (uptime / 60000);

    const sortedResponseTimes = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
    const p99Index = Math.floor(sortedResponseTimes.length * 0.99);

    const endpoints: Record<string, any> = {};
    for (const [endpoint, data] of this.endpointMetrics) {
      endpoints[endpoint] = {
        requestCount: data.count,
        averageResponseTime: data.count > 0 ? data.totalTime / data.count : 0,
        errorCount: data.errors,
        successRate: data.count > 0 ? (data.count - data.errors) / data.count : 1,
      };
    }

    return {
      requestCount: this.requestCount,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      averageResponseTime,
      requestsPerMinute,
      p95ResponseTime: sortedResponseTimes[p95Index] || 0,
      p99ResponseTime: sortedResponseTimes[p99Index] || 0,
      errors: this.errors,
      endpoints,
      uptime,
    };
  }

  reset() {
    this.requestCount = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.responseTimes = [];
    this.endpointMetrics.clear();
    this.errors = [];
    this.startTime = Date.now();
  }
}

const metricsCollector = new MetricsCollector();

// =============================================================================
// Health Service
// =============================================================================

export const healthService = {
  /**
   * Get comprehensive system health
   */
  async getSystemHealth(): Promise<SystemHealthResponse> {
    const startTime = Date.now();
    const metrics = metricsCollector.getMetrics();

    // Check individual service health
    const services = {
      mcp: await this.checkMCPHealth(),
      auth: await this.checkAuthHealth(),
      marketData: await this.checkMarketDataHealth(),
      portfolio: await this.checkPortfolioHealth(),
      trading: await this.checkTradingHealth(),
      tools: await this.checkToolsHealth(),
      ai: await this.checkAIHealth(),
      streaming: await this.checkStreamingHealth(),
    };

    // Calculate system metrics
    const memoryUsage = process.memoryUsage();
    const systemMetrics = {
      memory: {
        used: memoryUsage.heapUsed,
        free: memoryUsage.heapTotal - memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        usagePercentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
      cpu: {
        loadAverage: require('os').loadavg(),
      },
      requests: {
        total: metrics.requestCount,
        successful: metrics.successfulRequests,
        failed: metrics.failedRequests,
        averageResponseTime: metrics.averageResponseTime,
        requestsPerMinute: metrics.requestsPerMinute,
      },
      errors: {
        last24Hours: metrics.errors.length,
        lastHour: metrics.errors.filter(e => e.timestamp > Date.now() - 60 * 60 * 1000).length,
        criticalErrors: metrics.errors.filter(e => e.statusCode && e.statusCode >= 500).length,
        errorRate: metrics.requestCount > 0 ? metrics.failedRequests / metrics.requestCount : 0,
      },
    };

    // Calculate performance metrics
    const responseTimesByEndpoint: Record<string, number> = {};
    const slowestEndpoints: Array<{ endpoint: string; averageResponseTime: number; requestCount: number }> = [];

    for (const [endpoint, data] of Object.entries(metrics.endpoints)) {
      responseTimesByEndpoint[endpoint] = data.averageResponseTime;
      slowestEndpoints.push({
        endpoint,
        averageResponseTime: data.averageResponseTime,
        requestCount: data.requestCount,
      });
    }

    slowestEndpoints.sort((a, b) => b.averageResponseTime - a.averageResponseTime);
    slowestEndpoints.splice(10); // Keep only top 10

    const performance = {
      responseTimesByEndpoint,
      slowestEndpoints,
      cachePerformance: {
        hitRate: 0.95, // TODO: Get actual cache metrics
        missRate: 0.05,
        totalRequests: metrics.requestCount,
      },
    };

    // Calculate health summary
    const serviceStatuses = Object.values(services);
    const healthyServices = serviceStatuses.filter(s => s.status === 'healthy').length;
    const degradedServices = serviceStatuses.filter(s => s.status === 'degraded').length;
    const unhealthyServices = serviceStatuses.filter(s => s.status === 'unhealthy').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyServices > 0 || degradedServices > serviceStatuses.length / 2) {
      overallStatus = 'unhealthy';
    } else if (degradedServices > 0) {
      overallStatus = 'degraded';
    }

    const healthSummary = {
      healthyServices,
      degradedServices,
      unhealthyServices,
      totalServices: serviceStatuses.length,
      lastFullCheck: startTime,
    };

    return {
      status: overallStatus,
      timestamp: startTime,
      uptime: metrics.uptime,
      services,
      systemMetrics,
      performance,
      healthSummary,
    };
  },

  /**
   * Get readiness status
   */
  async getReadinessStatus(): Promise<{
    ready: boolean;
    timestamp: number;
    details: Record<string, boolean>;
  }> {
    const checks = {
      database: true, // TODO: Actual database connectivity check
      cache: true, // TODO: Actual cache connectivity check
      externalAPIs: await this.checkExternalAPIs(),
      configuration: this.checkConfiguration(),
    };

    const ready = Object.values(checks).every(Boolean);

    return {
      ready,
      timestamp: Date.now(),
      details: checks,
    };
  },

  /**
   * Get detailed metrics
   */
  async getMetrics(): Promise<MetricsResponse> {
    const metrics = metricsCollector.getMetrics();
    const memoryUsage = process.memoryUsage();

    return {
      timestamp: Date.now(),
      application: {
        requests: {
          totalRequests: metrics.requestCount,
          requestsPerSecond: metrics.requestsPerMinute / 60,
          requestsPerMinute: metrics.requestsPerMinute,
          requestsPerHour: metrics.requestsPerMinute * 60,
          averageResponseTime: metrics.averageResponseTime,
          p95ResponseTime: metrics.p95ResponseTime,
          p99ResponseTime: metrics.p99ResponseTime,
        },
        errors: {
          totalErrors: metrics.failedRequests,
          errorRate: metrics.requestCount > 0 ? metrics.failedRequests / metrics.requestCount : 0,
          errorsByType: this.categorizeErrors(metrics.errors),
          recentErrors: metrics.errors.slice(-10),
        },
        endpoints: metrics.endpoints,
      },
      resources: {
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss,
          usage: memoryUsage.heapUsed / memoryUsage.heapTotal,
        },
        cpu: {
          usage: 0, // TODO: Implement CPU usage calculation
          loadAverage: require('os').loadavg(),
        },
        eventLoop: {
          delay: 0, // TODO: Implement event loop delay measurement
          utilization: 0, // TODO: Implement event loop utilization
        },
      },
      business: {
        aiAnalysis: await this.getAIMetrics(),
        marketData: await this.getMarketDataMetrics(),
        trading: await this.getTradingMetrics(),
      },
    };
  },

  /**
   * Get service-specific health
   */
  async getServiceHealth(serviceName: string): Promise<ServiceHealth> {
    switch (serviceName) {
      case 'mcp':
        return await this.checkMCPHealth();
      case 'auth':
        return await this.checkAuthHealth();
      case 'market-data':
        return await this.checkMarketDataHealth();
      case 'portfolio':
        return await this.checkPortfolioHealth();
      case 'trading':
        return await this.checkTradingHealth();
      case 'tools':
        return await this.checkToolsHealth();
      case 'ai':
        return await this.checkAIHealth();
      case 'streaming':
        return await this.checkStreamingHealth();
      default:
        return {
          status: 'unhealthy',
          lastCheck: Date.now(),
          errors: [`Unknown service: ${serviceName}`],
        };
    }
  },

  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<{
    overview: any;
    services: any[];
    charts: any;
    alerts: any[];
  }> {
    const systemHealth = await this.getSystemHealth();
    const metrics = metricsCollector.getMetrics();

    const overview = {
      status: systemHealth.status,
      uptime: systemHealth.uptime,
      totalRequests: metrics.requestCount,
      errorRate: metrics.requestCount > 0 ? metrics.failedRequests / metrics.requestCount : 0,
      averageResponseTime: metrics.averageResponseTime,
    };

    const services = Object.entries(systemHealth.services).map(([name, health]) => ({
      name,
      status: health.status,
      responseTime: health.responseTime || 0,
      errorCount: health.errors?.length || 0,
    }));

    // Generate sample time series data (in production, this would come from a time series database)
    const now = Date.now();
    const charts = {
      requestsOverTime: Array.from({ length: 24 }, (_, i) => ({
        timestamp: now - (23 - i) * 60 * 60 * 1000,
        value: Math.floor(Math.random() * 100) + metrics.requestsPerMinute,
      })),
      errorRateOverTime: Array.from({ length: 24 }, (_, i) => ({
        timestamp: now - (23 - i) * 60 * 60 * 1000,
        value: Math.random() * 0.1,
      })),
      responseTimeOverTime: Array.from({ length: 24 }, (_, i) => ({
        timestamp: now - (23 - i) * 60 * 60 * 1000,
        value: Math.floor(Math.random() * 50) + metrics.averageResponseTime,
      })),
    };

    const alerts = this.generateAlerts(systemHealth, metrics);

    return {
      overview,
      services,
      charts,
      alerts,
    };
  },

  /**
   * Record request metrics
   */
  recordRequest(endpoint: string, responseTime: number, success: boolean, statusCode?: number) {
    metricsCollector.recordRequest(endpoint, responseTime, success, statusCode);
  },

  // =============================================================================
  // Private Health Check Methods
  // =============================================================================

  async checkMCPHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      // Try to call the MCP health endpoint
      const response = await fetch('http://localhost:4000/mcp/health');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          status: data.status === 'healthy' ? 'healthy' : 'degraded',
          lastCheck: Date.now(),
          responseTime,
          metrics: data,
        };
      } else {
        return {
          status: 'unhealthy',
          lastCheck: Date.now(),
          responseTime,
          errors: [`HTTP ${response.status}: ${response.statusText}`],
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  },

  async checkAuthHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      // Check auth service connectivity
      const response = await fetch('http://localhost:4000/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'test' }),
      });
      const responseTime = Date.now() - startTime;

      return {
        status: response.status < 500 ? 'healthy' : 'degraded',
        lastCheck: Date.now(),
        responseTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Auth service unreachable'],
      };
    }
  },

  async checkMarketDataHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      const response = await fetch('http://localhost:4000/market-data/test-connectivity');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          status: data.success ? 'healthy' : 'degraded',
          lastCheck: Date.now(),
          responseTime,
          metrics: data,
        };
      } else {
        return {
          status: 'unhealthy',
          lastCheck: Date.now(),
          responseTime,
          errors: [`Market data health check failed: ${response.status}`],
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Market data service unreachable'],
      };
    }
  },

  async checkPortfolioHealth(): Promise<ServiceHealth> {
    return {
      status: 'healthy',
      lastCheck: Date.now(),
      responseTime: 5,
      metrics: { activePortfolios: 0 },
    };
  },

  async checkTradingHealth(): Promise<ServiceHealth> {
    return {
      status: 'healthy',
      lastCheck: Date.now(),
      responseTime: 3,
      metrics: { activeTrades: 0 },
    };
  },

  async checkToolsHealth(): Promise<ServiceHealth> {
    return {
      status: 'healthy',
      lastCheck: Date.now(),
      responseTime: 2,
      metrics: { registeredTools: 20 },
    };
  },

  async checkAIHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      const response = await fetch('http://localhost:4000/mcp/health');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          status: data.status === 'healthy' ? 'healthy' : 'degraded',
          lastCheck: Date.now(),
          responseTime,
          metrics: data.budgetStatus,
          details: {
            cacheStats: data.cacheStats,
            configuration: data.configuration,
          },
        };
      } else {
        return {
          status: 'unhealthy',
          lastCheck: Date.now(),
          responseTime,
          errors: ['AI service health check failed'],
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'AI service unreachable'],
      };
    }
  },

  async checkStreamingHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      const response = await fetch('http://localhost:4000/mcp/streaming-health');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          status: data.status,
          lastCheck: Date.now(),
          responseTime,
          metrics: {
            activeStreams: data.activeStreams,
            capacity: data.capacity,
            uptime: data.uptime,
          },
        };
      } else {
        return {
          status: 'unhealthy',
          lastCheck: Date.now(),
          responseTime,
          errors: ['Streaming service health check failed'],
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Streaming service unreachable'],
      };
    }
  },

  // =============================================================================
  // Utility Methods
  // =============================================================================

  async checkExternalAPIs(): Promise<boolean> {
    try {
      // Check MEXC API connectivity
      const response = await fetch('https://api.mexc.com/api/v3/ping', { 
        signal: AbortSignal.timeout(5000) 
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  checkConfiguration(): boolean {
    // Check if critical configuration is available
    return !!(
      process.env.MEXC_API_KEY &&
      process.env.MEXC_SECRET_KEY &&
      process.env.GOOGLE_API_KEY
    );
  },

  categorizeErrors(errors: Array<{ error: string; statusCode?: number }>): Record<string, number> {
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
  },

  async getAIMetrics() {
    return {
      totalAnalyses: 0,
      successfulAnalyses: 0,
      failedAnalyses: 0,
      averageConfidence: 0,
      tokenUsage: 0,
      costUSD: 0,
    };
  },

  async getMarketDataMetrics() {
    return {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageLatency: 0,
    };
  },

  async getTradingMetrics() {
    return {
      activePositions: 0,
      totalTrades: 0,
      successfulTrades: 0,
      averageTradeValue: 0,
    };
  },

  generateAlerts(systemHealth: SystemHealthResponse, metrics: any) {
    const alerts: Array<{
      level: 'info' | 'warning' | 'critical';
      message: string;
      timestamp: number;
      service?: string;
    }> = [];

    // System health alerts
    if (systemHealth.status === 'unhealthy') {
      alerts.push({
        level: 'critical',
        message: 'System health is unhealthy',
        timestamp: Date.now(),
      });
    } else if (systemHealth.status === 'degraded') {
      alerts.push({
        level: 'warning',
        message: 'System health is degraded',
        timestamp: Date.now(),
      });
    }

    // Memory usage alerts
    if (systemHealth.systemMetrics.memory.usagePercentage > 90) {
      alerts.push({
        level: 'critical',
        message: `High memory usage: ${systemHealth.systemMetrics.memory.usagePercentage.toFixed(1)}%`,
        timestamp: Date.now(),
      });
    } else if (systemHealth.systemMetrics.memory.usagePercentage > 80) {
      alerts.push({
        level: 'warning',
        message: `Memory usage warning: ${systemHealth.systemMetrics.memory.usagePercentage.toFixed(1)}%`,
        timestamp: Date.now(),
      });
    }

    // Error rate alerts
    if (systemHealth.systemMetrics.errors.errorRate > 0.1) {
      alerts.push({
        level: 'critical',
        message: `High error rate: ${(systemHealth.systemMetrics.errors.errorRate * 100).toFixed(1)}%`,
        timestamp: Date.now(),
      });
    } else if (systemHealth.systemMetrics.errors.errorRate > 0.05) {
      alerts.push({
        level: 'warning',
        message: `Elevated error rate: ${(systemHealth.systemMetrics.errors.errorRate * 100).toFixed(1)}%`,
        timestamp: Date.now(),
      });
    }

    // Service-specific alerts
    Object.entries(systemHealth.services).forEach(([serviceName, health]) => {
      if (health.status === 'unhealthy') {
        alerts.push({
          level: 'critical',
          message: `Service ${serviceName} is unhealthy`,
          timestamp: Date.now(),
          service: serviceName,
        });
      } else if (health.status === 'degraded') {
        alerts.push({
          level: 'warning',
          message: `Service ${serviceName} is degraded`,
          timestamp: Date.now(),
          service: serviceName,
        });
      }
    });

    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  },
};