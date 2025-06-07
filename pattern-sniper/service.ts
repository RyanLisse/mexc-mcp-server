/**
 * Enhanced Pattern Sniper Service
 * Encore.ts service for monitoring new coin patterns and executing snipes
 * with improved reliability, error handling, and performance optimizations
 */

import type {
  CalendarEntry,
  ErrorEntry,
  PatternSniperConfig,
  PatternSniperStatus,
  PerformanceMetrics,
  SnipeTarget,
  SymbolV2Entry,
} from './schemas.js';
import { READY_STATE_PATTERN } from './schemas.js';

import { api } from 'encore.dev/api';
import { MEXCApiClient } from '../market-data/mexc-client.js';

// Simple config update interface for Encore compatibility
interface ConfigUpdateRequest {
  defaultOrderAmount?: number;
  maxPositionSize?: number;
  enableAutoExecution?: boolean;
  calendarRefreshInterval?: number;
  symbolsRefreshInterval?: number;
  testMode?: boolean;
}

/**
 * Circuit breaker for API calls to prevent cascade failures
 */
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: Date;
  private isOpen = false;

  constructor(
    private failureThreshold: number,
    private recoveryTimeoutMs: number
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      if (this.shouldAttemptRecovery()) {
        this.isOpen = false;
        this.failureCount = 0;
      } else {
        throw new Error('Circuit breaker is open - operation rejected');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptRecovery(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime.getTime() > this.recoveryTimeoutMs;
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.isOpen = false;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.failureThreshold) {
      this.isOpen = true;
    }
  }

  getStatus() {
    return {
      isOpen: this.isOpen,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime:
        this.isOpen && this.lastFailureTime
          ? new Date(this.lastFailureTime.getTime() + this.recoveryTimeoutMs)
          : undefined,
    };
  }
}

/**
 * Retry strategy with exponential backoff and jitter
 */
class RetryStrategy {
  constructor(
    private maxRetries: number,
    private initialDelayMs: number,
    private maxDelayMs: number,
    private backoffMultiplier: number,
    private jitterPercentage: number
  ) {}

  async execute<T>(operation: () => Promise<T>, operationName = 'operation'): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.maxRetries) {
          throw new Error(
            `${operationName} failed after ${this.maxRetries + 1} attempts: ${lastError.message}`
          );
        }

        const delay = this.calculateDelay(attempt);
        console.warn(
          `${operationName} attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`
        );

        await this.delay(delay);
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error(`${operationName} failed: Unknown error`);
  }

  private calculateDelay(attempt: number): number {
    const baseDelay = this.initialDelayMs * this.backoffMultiplier ** attempt;
    const clampedDelay = Math.min(baseDelay, this.maxDelayMs);

    // Add jitter to prevent thundering herd
    const jitter = clampedDelay * this.jitterPercentage * (Math.random() - 0.5);

    return Math.max(clampedDelay + jitter, 0);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Rate limiter to control API request frequency
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private requestsPerSecond: number,
    private burstSize: number
  ) {
    this.tokens = burstSize;
    this.lastRefill = Date.now();
  }

  async waitForToken(): Promise<void> {
    this.refillTokens();

    if (this.tokens > 0) {
      this.tokens--;
      return;
    }

    // Wait for next token - limit wait time to prevent infinite loops
    const waitTime = Math.min(1000 / this.requestsPerSecond, 5000); // Max 5 second wait
    await new Promise((resolve) => setTimeout(resolve, waitTime));

    // Check tokens again after wait, don't recurse indefinitely
    this.refillTokens();
    if (this.tokens > 0) {
      this.tokens--;
    } else {
      // Force allow operation if we're still waiting too long
      console.warn('Rate limiter: Forcing operation due to extended wait');
    }
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor((timePassed * this.requestsPerSecond) / 1000);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.tokens + tokensToAdd, this.burstSize);
      this.lastRefill = now;
    }
  }
}

/**
 * Performance metrics collector
 */
class MetricsCollector {
  private metrics: PerformanceMetrics[] = [];
  private maxRetentionHours: number;

  constructor(retentionHours = 24) {
    this.maxRetentionHours = retentionHours;
  }

  recordMetric(metric: Omit<PerformanceMetrics, 'timestamp'>): void {
    const fullMetric: PerformanceMetrics = {
      ...metric,
      timestamp: new Date(),
    };

    this.metrics.push(fullMetric);
    this.cleanupOldMetrics();
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverages(): {
    detectionLatency: number;
    executionLatency: number;
    apiResponseTime: number;
  } {
    if (this.metrics.length === 0) {
      return { detectionLatency: 0, executionLatency: 0, apiResponseTime: 0 };
    }

    const sums = this.metrics.reduce(
      (acc, metric) => ({
        detectionLatency: acc.detectionLatency + metric.detectionLatencyMs,
        executionLatency: acc.executionLatency + metric.executionLatencyMs,
        apiResponseTime: acc.apiResponseTime + metric.apiResponseTimeMs,
      }),
      { detectionLatency: 0, executionLatency: 0, apiResponseTime: 0 }
    );

    const count = this.metrics.length;
    return {
      detectionLatency: sums.detectionLatency / count,
      executionLatency: sums.executionLatency / count,
      apiResponseTime: sums.apiResponseTime / count,
    };
  }

  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - this.maxRetentionHours * 60 * 60 * 1000);
    this.metrics = this.metrics.filter((metric) => metric.timestamp > cutoff);
  }
}

/**
 * Enhanced Pattern Sniper State with improved reliability and performance
 */
export class EnhancedPatternSniperState {
  // Core state - using immutable patterns
  private readonly state = {
    calendarTargets: new Map<string, CalendarEntry>(),
    pendingDetection: new Set<string>(),
    readyTargets: new Map<string, SnipeTarget>(),
    executedTargets: new Set<string>(),
    isMonitoring: false,
    errors: [] as ErrorEntry[],
    lastUpdate: new Date(),
    config: {
      defaultOrderAmount: 100,
      maxPositionSize: 1000,
      enableAutoExecution: false,
      calendarRefreshInterval: 5 * 60 * 1000, // 5 minutes
      symbolsRefreshInterval: 30 * 1000, // 30 seconds
      testMode: true,
      retryStrategy: {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
        jitterPercentage: 0.1,
      },
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeoutMs: 60000,
        monitoringWindowMs: 300000, // 5 minutes
      },
      timing: {
        executionDelayMs: 100,
        preExecutionBufferMs: 5000,
        maxExecutionWindowMs: 30000,
      },
      rateLimiting: {
        maxConcurrentRequests: 5,
        requestsPerSecond: 10,
        burstSize: 20,
      },
      monitoring: {
        healthCheckIntervalMs: 60000, // 1 minute
        metricsRetentionHours: 24,
        enableDetailedLogging: false,
      },
    },
  };

  // Performance tracking
  private successfulExecutions = 0;
  private failedExecutions = 0;
  private totalApiCalls = 0;
  private failedApiCalls = 0;

  // Enhanced components
  private circuitBreaker!: CircuitBreaker;
  private retryStrategy!: RetryStrategy;
  private rateLimiter!: RateLimiter;
  private metricsCollector!: MetricsCollector;

  // Interval management
  private calendarInterval?: NodeJS.Timeout;
  private symbolsInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private activeOperations = new Set<Promise<unknown>>();

  constructor() {
    this.initializeComponents();
  }

  private initializeComponents(): void {
    const config = this.state.config;

    this.circuitBreaker = new CircuitBreaker(
      config.circuitBreaker?.failureThreshold || 5,
      config.circuitBreaker?.recoveryTimeoutMs || 60000
    );

    this.retryStrategy = new RetryStrategy(
      config.retryStrategy?.maxRetries || 3,
      config.retryStrategy?.initialDelayMs || 1000,
      config.retryStrategy?.maxDelayMs || 30000,
      config.retryStrategy?.backoffMultiplier || 2,
      config.retryStrategy?.jitterPercentage || 0.1
    );

    this.rateLimiter = new RateLimiter(
      config.rateLimiting?.requestsPerSecond || 10,
      config.rateLimiting?.burstSize || 20
    );

    this.metricsCollector = new MetricsCollector(config.monitoring?.metricsRetentionHours || 24);
  }

  getStatus(): PatternSniperStatus {
    const averages = this.metricsCollector.getAverages();

    return {
      isMonitoring: this.state.isMonitoring,
      totalListings: this.state.calendarTargets.size,
      pendingDetection: this.state.pendingDetection.size,
      readyToSnipe: this.state.readyTargets.size,
      executed: this.state.executedTargets.size,
      lastUpdate: this.state.lastUpdate,
      errors: this.state.errors.map(
        (e) => `${e.timestamp.toISOString()}: [${e.type}] ${e.message}`
      ),

      performance: {
        successfulExecutions: this.successfulExecutions,
        failedExecutions: this.failedExecutions,
        averageDetectionTimeMs: averages.detectionLatency,
        averageExecutionTimeMs: averages.executionLatency,
        totalApiCalls: this.totalApiCalls,
        failedApiCalls: this.failedApiCalls,
      },

      circuitBreakerStatus: this.circuitBreaker.getStatus(),

      resourceUsage: {
        activeIntervals: [
          this.calendarInterval,
          this.symbolsInterval,
          this.healthCheckInterval,
        ].filter(Boolean).length,
        memoryUsageMB: this.getMemoryUsage(),
        queuedOperations: this.activeOperations.size,
      },
    };
  }

  getTargets() {
    return {
      calendar: Array.from(this.state.calendarTargets.values()),
      pending: Array.from(this.state.pendingDetection),
      ready: Array.from(this.state.readyTargets.values()),
      executed: Array.from(this.state.executedTargets),
    };
  }

  getConfig(): PatternSniperConfig {
    return { ...this.state.config };
  }

  updateConfig(newConfig: Partial<PatternSniperConfig>): void {
    // Simple merge without Zod validation for Encore compatibility
    this.state.config = {
      ...this.state.config,
      ...newConfig,
    };

    // Reinitialize components with new config
    this.initializeComponents();

    this.logInfo('Configuration updated', { newConfig });
  }

  async startMonitoring(mexcClient: MEXCApiClient): Promise<{ success: boolean; message: string }> {
    if (this.state.isMonitoring) {
      return { success: false, message: 'Already monitoring' };
    }

    try {
      this.state.isMonitoring = true;
      this.state.errors = [];

      // Start health monitoring
      this.healthCheckInterval = setInterval(() => {
        this.performHealthCheck();
      }, this.state.config.monitoring.healthCheckIntervalMs);

      // Start calendar monitoring with enhanced error handling
      this.calendarInterval = setInterval(async () => {
        const operation = this.createOperation(() => this.updateCalendarData(mexcClient));
        this.activeOperations.add(operation);

        try {
          await operation;
        } catch (error) {
          this.addError(
            'API_ERROR',
            `Calendar update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { operation: 'calendar_update' }
          );
        } finally {
          this.activeOperations.delete(operation);
        }
      }, this.state.config.calendarRefreshInterval);

      // Start symbols monitoring
      this.symbolsInterval = setInterval(async () => {
        if (this.state.pendingDetection.size > 0) {
          const operation = this.createOperation(() => this.updateSymbolsData(mexcClient));
          this.activeOperations.add(operation);

          try {
            await operation;
          } catch (error) {
            this.addError(
              'API_ERROR',
              `Symbols update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              { operation: 'symbols_update', pendingCount: this.state.pendingDetection.size }
            );
          } finally {
            this.activeOperations.delete(operation);
          }
        }
      }, this.state.config.symbolsRefreshInterval);

      // Immediate first run
      const initialOperation = this.createOperation(() => this.updateCalendarData(mexcClient));
      this.activeOperations.add(initialOperation);

      try {
        await initialOperation;
      } catch (error) {
        this.addError(
          'API_ERROR',
          `Initial calendar update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { operation: 'initial_calendar_update' }
        );
      } finally {
        this.activeOperations.delete(initialOperation);
      }

      this.logInfo('Pattern monitoring started');
      return { success: true, message: 'Pattern monitoring started' };
    } catch (error) {
      this.state.isMonitoring = false;
      throw error;
    }
  }

  async stopMonitoring(): Promise<{ success: boolean; message: string }> {
    this.state.isMonitoring = false;

    // Clear all intervals
    if (this.calendarInterval) {
      clearInterval(this.calendarInterval);
      this.calendarInterval = undefined;
    }

    if (this.symbolsInterval) {
      clearInterval(this.symbolsInterval);
      this.symbolsInterval = undefined;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    // Wait for all active operations to complete or timeout
    if (this.activeOperations.size > 0) {
      console.log(`Waiting for ${this.activeOperations.size} active operations to complete...`);

      const timeout = new Promise((resolve) => setTimeout(resolve, 5000));
      const operations = Promise.all(Array.from(this.activeOperations));

      await Promise.race([operations, timeout]);
    }

    this.logInfo('Pattern monitoring stopped');
    return { success: true, message: 'Pattern monitoring stopped' };
  }

  clearTargets(): void {
    this.state.calendarTargets.clear();
    this.state.pendingDetection.clear();
    this.state.readyTargets.clear();
    this.state.executedTargets.clear();
    this.state.errors = [];
    this.state.lastUpdate = new Date();

    this.logInfo('All targets cleared');
  }

  private createOperation<T>(operation: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      await this.rateLimiter.waitForToken();
      return this.retryStrategy.execute(operation);
    });
  }

  private async updateCalendarData(mexcClient: MEXCApiClient): Promise<void> {
    const startTime = performance.now();

    try {
      this.totalApiCalls++;
      const response = await mexcClient.getNewCoinCalendar();
      const validatedResponse = response as CalendarResponse;

      const apiTime = performance.now() - startTime;
      this.metricsCollector.recordMetric({
        detectionLatencyMs: 0,
        executionLatencyMs: 0,
        apiResponseTimeMs: apiTime,
        memoryUsageMB: this.getMemoryUsage(),
      });

      const now = new Date();
      let newTargetsCount = 0;

      for (const entry of validatedResponse.data) {
        const launchTime = new Date(entry.firstOpenTime);

        if (launchTime > now && !this.state.calendarTargets.has(entry.vcoinId)) {
          this.logInfo(`New listing detected: ${entry.symbol} at ${launchTime}`, {
            vcoinId: entry.vcoinId,
            symbol: entry.symbol,
            launchTime: launchTime.toISOString(),
          });

          this.state.calendarTargets.set(entry.vcoinId, entry);
          this.state.pendingDetection.add(entry.vcoinId);
          newTargetsCount++;
        }
      }

      if (newTargetsCount > 0) {
        this.logInfo(`Added ${newTargetsCount} new targets for monitoring`);
      }

      this.state.lastUpdate = new Date();
    } catch (error) {
      this.failedApiCalls++;
      throw error;
    }
  }

  private async updateSymbolsData(mexcClient: MEXCApiClient): Promise<void> {
    const startTime = performance.now();

    try {
      this.totalApiCalls++;
      const response = await mexcClient.getSymbolsV2();
      const validatedResponse = response as SymbolsV2Response;

      const apiTime = performance.now() - startTime;
      const detectionStartTime = performance.now();

      const detectedTargets: SnipeTarget[] = [];

      for (const vcoinId of this.state.pendingDetection) {
        const symbol = validatedResponse.data.symbols.find((s) => s.cd === vcoinId);

        if (symbol && this.matchesReadyPattern(symbol) && this.hasCompleteData(symbol)) {
          const calendar = this.state.calendarTargets.get(vcoinId);
          if (calendar) {
            const target = this.processReadyToken(vcoinId, symbol, calendar);
            if (symbol.ca) {
              this.state.readyTargets.set(symbol.ca, target);
            }
            this.state.pendingDetection.delete(vcoinId);
            detectedTargets.push(target);

            this.logInfo(`READY STATE DETECTED: ${symbol.ca}`, {
              pattern: { sts: symbol.sts, st: symbol.st, tt: symbol.tt },
              launchInHours: target.hoursAdvanceNotice.toFixed(1),
              symbol: symbol.ca,
            });
          }
        }
      }

      const detectionTime = performance.now() - detectionStartTime;

      this.metricsCollector.recordMetric({
        detectionLatencyMs: detectionTime,
        executionLatencyMs: 0,
        apiResponseTimeMs: apiTime,
        memoryUsageMB: this.getMemoryUsage(),
      });

      // Auto-execute if enabled
      if (this.state.config.enableAutoExecution && detectedTargets.length > 0) {
        for (const target of detectedTargets) {
          await this.scheduleExecution(target, mexcClient);
        }
      }

      this.state.lastUpdate = new Date();
    } catch (error) {
      this.failedApiCalls++;
      throw error;
    }
  }

  private async scheduleExecution(target: SnipeTarget, mexcClient: MEXCApiClient): Promise<void> {
    const launchTime = target.launchTime.getTime();
    const now = Date.now();
    const timingConfig = this.state.config.timing;

    const executionTime = launchTime - timingConfig.preExecutionBufferMs;
    const delayMs = Math.max(0, executionTime - now);

    this.logInfo(`Scheduling execution for ${target.symbol}`, {
      launchTime: target.launchTime.toISOString(),
      executionTime: new Date(executionTime).toISOString(),
      delayMs,
    });

    setTimeout(async () => {
      try {
        await this.executeSnipe(target, mexcClient);
      } catch (error) {
        this.addError(
          'EXECUTION_ERROR',
          `Scheduled execution failed for ${target.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { symbol: target.symbol, scheduled: true }
        );
      }
    }, delayMs);
  }

  async executeSnipe(
    target: SnipeTarget,
    mexcClient: MEXCApiClient
  ): Promise<{ success: boolean; message: string; orderId?: string }> {
    if (this.state.executedTargets.has(target.symbol)) {
      return { success: false, message: 'Target already executed' };
    }

    const executionStartTime = performance.now();

    this.logInfo(`EXECUTING SNIPE: ${target.symbol}`, {
      orderParams: target.orderParameters,
      testMode: this.state.config.testMode,
    });

    if (this.state.config.testMode) {
      this.state.executedTargets.add(target.symbol);
      this.successfulExecutions++;

      const executionTime = performance.now() - executionStartTime;
      this.metricsCollector.recordMetric({
        detectionLatencyMs: 0,
        executionLatencyMs: executionTime,
        apiResponseTimeMs: 0,
        memoryUsageMB: this.getMemoryUsage(),
      });

      this.logInfo('Test mode execution completed', { symbol: target.symbol });
      return { success: true, message: 'Test mode execution successful' };
    }

    try {
      // Add execution delay for precision timing
      await new Promise((resolve) =>
        setTimeout(resolve, this.state.config.timing.executionDelayMs)
      );

      const result = await this.executeRealOrder(target, mexcClient);

      this.state.executedTargets.add(target.symbol);
      this.successfulExecutions++;

      const executionTime = performance.now() - executionStartTime;
      this.metricsCollector.recordMetric({
        detectionLatencyMs: 0,
        executionLatencyMs: executionTime,
        apiResponseTimeMs: 0,
        memoryUsageMB: this.getMemoryUsage(),
      });

      this.logInfo(`Snipe executed successfully for ${target.symbol}`, {
        orderId: result.orderId,
        executionTimeMs: executionTime,
      });

      return {
        success: true,
        message: `Snipe executed successfully - Order ID: ${result.orderId}`,
        orderId: result.orderId,
      };
    } catch (error) {
      this.failedExecutions++;
      const errorMessage = `Snipe failed for ${target.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`;

      this.addError('EXECUTION_ERROR', errorMessage, {
        symbol: target.symbol,
        orderParams: target.orderParameters,
      });

      return { success: false, message: errorMessage };
    }
  }

  private async executeRealOrder(
    target: SnipeTarget,
    mexcClient: MEXCApiClient
  ): Promise<{ orderId: string }> {
    const orderParams = {
      symbol: target.orderParameters.symbol,
      side: target.orderParameters.side.toLowerCase() as 'buy' | 'sell',
      type: target.orderParameters.type.toLowerCase() as 'market' | 'limit',
      quantity: target.orderParameters.quantity || 0,
      price: target.orderParameters.price,
      timeInForce: 'IOC' as const,
    };

    // Handle market orders with quoteOrderQty
    if (target.orderParameters.quoteOrderQty && orderParams.type === 'market') {
      const currentPrice = await this.getCurrentPrice(mexcClient, target.symbol);
      if (currentPrice > 0) {
        orderParams.quantity = target.orderParameters.quoteOrderQty / currentPrice;
      } else {
        throw new Error(`Could not get current price for ${target.symbol}`);
      }
    }

    if (orderParams.quantity <= 0) {
      throw new Error('Invalid order quantity');
    }

    return await mexcClient.placeOrder(orderParams);
  }

  private matchesReadyPattern(symbol: SymbolV2Entry): boolean {
    return (
      symbol.sts === READY_STATE_PATTERN.sts &&
      symbol.st === READY_STATE_PATTERN.st &&
      symbol.tt === READY_STATE_PATTERN.tt
    );
  }

  private hasCompleteData(symbol: SymbolV2Entry): boolean {
    return !!(symbol.ca && symbol.ps && symbol.qs && symbol.ot);
  }

  private processReadyToken(
    vcoinId: string,
    symbol: SymbolV2Entry,
    calendar: CalendarEntry
  ): SnipeTarget {
    const launchTime = new Date(symbol.ot || Date.now());
    const hoursAdvance = (launchTime.getTime() - Date.now()) / (1000 * 60 * 60);

    return {
      vcoinId,
      symbol: symbol.ca || '',
      projectName: calendar.projectName,
      priceDecimalPlaces: symbol.ps || 0,
      quantityDecimalPlaces: symbol.qs || 0,
      launchTime,
      discoveredAt: new Date(),
      hoursAdvanceNotice: hoursAdvance,
      orderParameters: {
        symbol: symbol.ca || '',
        side: 'BUY',
        type: 'MARKET',
        quoteOrderQty: this.state.config.defaultOrderAmount,
      },
    };
  }

  private async getCurrentPrice(mexcClient: MEXCApiClient, symbol: string): Promise<number> {
    try {
      const ticker = await mexcClient.getTicker(symbol);
      return Number.parseFloat(ticker.price);
    } catch (error) {
      this.addError('API_ERROR', `Failed to get current price for ${symbol}`, {
        symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  private performHealthCheck(): void {
    const now = Date.now();
    const lastUpdateAge = now - this.state.lastUpdate.getTime();

    // Check if updates are stale
    if (lastUpdateAge > this.state.config.calendarRefreshInterval * 2) {
      this.addError('TIMEOUT_ERROR', 'Calendar updates appear to be stale', {
        lastUpdateAge,
        threshold: this.state.config.calendarRefreshInterval * 2,
      });
    }

    // Check memory usage
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage > 100) {
      // MB threshold
      this.addError('VALIDATION_ERROR', `High memory usage detected: ${memoryUsage.toFixed(1)}MB`, {
        memoryUsageMB: memoryUsage,
      });
    }

    this.logInfo('Health check completed', {
      memoryUsageMB: memoryUsage,
      lastUpdateAge,
      activeOperations: this.activeOperations.size,
    });
  }

  private addError(
    type: ErrorEntry['type'],
    message: string,
    context?: Record<string, unknown>
  ): void {
    const error: ErrorEntry = {
      timestamp: new Date(),
      type,
      message,
      context,
      retryCount: 0,
      resolved: false,
    };

    this.state.errors.push(error);

    // Keep only last 100 errors
    if (this.state.errors.length > 100) {
      this.state.errors = this.state.errors.slice(-100);
    }

    if (this.state.config.monitoring.enableDetailedLogging) {
      console.error(`[${type}] ${message}`, context);
    }
  }

  private logInfo(message: string, context?: Record<string, unknown>): void {
    if (this.state.config.monitoring.enableDetailedLogging) {
      console.log(`[INFO] ${message}`, context);
    }
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024; // Convert to MB
    }
    return 0;
  }
}

// Lazy-initialized service state to prevent immediate interval creation
let sniperState: EnhancedPatternSniperState | undefined;
let mexcClient: MEXCApiClient | undefined;

function getSniperState(): EnhancedPatternSniperState {
  if (!sniperState) {
    sniperState = new EnhancedPatternSniperState();
  }
  return sniperState;
}

function getMexcClient(): MEXCApiClient {
  if (!mexcClient) {
    mexcClient = new MEXCApiClient();
  }
  return mexcClient;
}

// Service definitions are handled by encore.service.ts

// API endpoints with enhanced error handling
export const getStatus = api(
  { expose: true, method: 'GET', path: '/pattern-sniper/status' },
  async (): Promise<PatternSniperStatus> => {
    return getSniperState().getStatus();
  }
);

export const getTargets = api(
  { expose: true, method: 'GET', path: '/pattern-sniper/targets' },
  async () => {
    return getSniperState().getTargets();
  }
);

export const startMonitoring = api(
  { expose: true, method: 'POST', path: '/pattern-sniper/start' },
  async (): Promise<{ success: boolean; message: string }> => {
    try {
      return await getSniperState().startMonitoring(getMexcClient());
    } catch (error) {
      return {
        success: false,
        message: `Failed to start monitoring: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

export const stopMonitoring = api(
  { expose: true, method: 'POST', path: '/pattern-sniper/stop' },
  async (): Promise<{ success: boolean; message: string }> => {
    try {
      return await getSniperState().stopMonitoring();
    } catch (error) {
      return {
        success: false,
        message: `Failed to stop monitoring: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

export const clearTargets = api(
  { expose: true, method: 'POST', path: '/pattern-sniper/clear' },
  async (): Promise<{ success: boolean; message: string }> => {
    try {
      getSniperState().clearTargets();
      return { success: true, message: 'All targets cleared' };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear targets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

export const updateConfig = api(
  { expose: true, method: 'POST', path: '/pattern-sniper/config' },
  async (
    config: ConfigUpdateRequest
  ): Promise<{ success: boolean; config?: PatternSniperConfig; message?: string }> => {
    try {
      getSniperState().updateConfig(config);
      return { success: true, config: getSniperState().getConfig() };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update config: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

export const executeSnipe = api(
  { expose: true, method: 'POST', path: '/pattern-sniper/execute/:symbol' },
  async ({
    symbol,
  }: { symbol: string }): Promise<{ success: boolean; message: string; orderId?: string }> => {
    try {
      const targets = getSniperState().getTargets();
      const target = targets.ready.find((t) => t.symbol === symbol);

      if (!target) {
        return { success: false, message: 'Target not found or not ready' };
      }

      return await getSniperState().executeSnipe(target, getMexcClient());
    } catch (error) {
      return {
        success: false,
        message: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

// New endpoint for performance metrics
export const getMetrics = api(
  { expose: true, method: 'GET', path: '/pattern-sniper/metrics' },
  async () => {
    const status = getSniperState().getStatus();
    return {
      performance: status.performance,
      circuitBreaker: status.circuitBreakerStatus,
      resourceUsage: status.resourceUsage,
    };
  }
);
