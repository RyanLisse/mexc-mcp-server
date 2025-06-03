/**
 * MCP Core Service
 * Task #31: Core service functionality for health monitoring, configuration, and environment management
 * Extracted from original encore.service.ts to maintain under 500 lines
 */

import { geminiAnalyzer } from '../../ai/gemini-analyzer';
import { config } from '../../shared/config';

// =============================================================================
// Core Types and Interfaces
// =============================================================================

/**
 * Analysis depth configuration for different analysis levels
 */
export interface AnalysisDepthConfig {
  /** Analysis depth level */
  depth: 'quick' | 'standard' | 'comprehensive' | 'deep';
  /** Model temperature for this depth */
  temperature: number;
  /** Maximum tokens for this depth */
  maxTokens: number;
  /** Context window hours for this depth */
  contextHours: number;
  /** Whether to include confidence intervals */
  includeConfidenceIntervals: boolean;
  /** Whether to enable parallel processing */
  enableParallelProcessing: boolean;
}

/**
 * Service health status response
 */
export interface ServiceHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  budgetStatus: unknown;
  cacheStats: unknown;
  configuration: unknown;
  timestamp: number;
  uptime?: number;
}

/**
 * Environment reset response
 */
export interface EnvironmentResetResponse {
  success: boolean;
  message: string;
  timestamp: number;
  resetOperations: string[];
}

// =============================================================================
// Analysis Depth Configuration
// =============================================================================

/**
 * Pre-configured analysis depth settings optimized for different use cases
 */
const ANALYSIS_DEPTH_CONFIGS: Record<string, AnalysisDepthConfig> = {
  quick: {
    depth: 'quick',
    temperature: 0.3,
    maxTokens: 2048,
    contextHours: 6,
    includeConfidenceIntervals: false,
    enableParallelProcessing: false,
  },
  standard: {
    depth: 'standard',
    temperature: 0.5,
    maxTokens: 4096,
    contextHours: 12,
    includeConfidenceIntervals: true,
    enableParallelProcessing: false,
  },
  comprehensive: {
    depth: 'comprehensive',
    temperature: 0.7,
    maxTokens: 6144,
    contextHours: 24,
    includeConfidenceIntervals: true,
    enableParallelProcessing: true,
  },
  deep: {
    depth: 'deep',
    temperature: 0.9,
    maxTokens: 8192,
    contextHours: 48,
    includeConfidenceIntervals: true,
    enableParallelProcessing: true,
  },
};

// =============================================================================
// Core Service Functions
// =============================================================================

/**
 * Get analysis configuration based on depth level
 * @param depth Analysis depth level
 * @returns Corresponding analysis configuration
 */
export function getAnalysisDepthConfig(depth: string): AnalysisDepthConfig {
  return ANALYSIS_DEPTH_CONFIGS[depth] || ANALYSIS_DEPTH_CONFIGS.standard;
}

/**
 * Validate confidence score meets minimum threshold
 * @param confidence Confidence score to validate (0-1)
 * @param minThreshold Minimum acceptable threshold (default: 0.7)
 * @returns Whether confidence meets threshold
 */
export function validateConfidence(confidence: number, minThreshold = 0.7): boolean {
  return (
    typeof confidence === 'number' &&
    !isNaN(confidence) &&
    confidence >= minThreshold &&
    confidence <= 1
  );
}

/**
 * Get comprehensive service health status
 * Monitors budget usage, cache performance, and system configuration
 * @returns Service health information
 */
export function getServiceHealth(): ServiceHealthResponse {
  try {
    const startTime = Date.now();

    // Collect health metrics from various components
    const budgetStatus = geminiAnalyzer.getBudgetStatus();
    const cacheStats = geminiAnalyzer.getCacheStats();
    const configuration = geminiAnalyzer.getConfig();

    // Determine overall health status based on budget and performance
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check budget constraints
    const dailyBudgetLimit = config.ai.budget.maxCostPerDay;
    const currentCost = budgetStatus.costUSD || 0;

    if (currentCost > dailyBudgetLimit * 0.9) {
      status = 'degraded'; // Over 90% of daily budget
    }

    if (currentCost >= dailyBudgetLimit) {
      status = 'unhealthy'; // At or over daily budget
    }

    // Check cache performance (optional health indicator)
    const cacheHitRate = cacheStats.hitRate || 0;
    if (cacheHitRate < 0.3 && status === 'healthy') {
      status = 'degraded'; // Poor cache performance
    }

    const response: ServiceHealthResponse = {
      status,
      budgetStatus,
      cacheStats,
      configuration,
      timestamp: startTime,
      uptime: process.uptime() * 1000, // Convert to milliseconds
    };

    return response;
  } catch (error) {
    // Return unhealthy status if health check itself fails
    return {
      status: 'unhealthy',
      budgetStatus: null,
      cacheStats: null,
      configuration: null,
      timestamp: Date.now(),
      uptime: 0,
    };
  }
}

/**
 * Reset analysis environment (budget window and cache)
 * Administrative function for clearing analysis state
 * @returns Operation result with detailed information
 */
export function resetAnalysisEnvironment(): EnvironmentResetResponse {
  const resetOperations: string[] = [];
  let success = true;
  let message = '';

  try {
    // Reset budget tracking window
    try {
      geminiAnalyzer.resetBudgetWindow();
      resetOperations.push('Budget window reset');
    } catch (error) {
      resetOperations.push(
        `Budget reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      success = false;
    }

    // Clear analysis cache
    try {
      geminiAnalyzer.clearCache();
      resetOperations.push('Analysis cache cleared');
    } catch (error) {
      resetOperations.push(
        `Cache clear failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      success = false;
    }

    // Set appropriate message based on results
    if (success) {
      message = 'Analysis environment reset successfully';
    } else {
      message = 'Analysis environment reset completed with some errors';
    }

    return {
      success,
      message,
      timestamp: Date.now(),
      resetOperations,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to reset environment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: Date.now(),
      resetOperations: ['Reset operation failed'],
    };
  }
}

/**
 * Configure analyzer for specific analysis depth
 * Updates temperature, token limits, and cache settings
 * @param depth Analysis depth level
 * @param customParams Optional custom parameters to override defaults
 */
export function configureAnalyzerForDepth(
  depth: string,
  customParams?: Partial<AnalysisDepthConfig>
): void {
  const depthConfig = getAnalysisDepthConfig(depth);

  // Merge custom parameters if provided
  const finalConfig = customParams ? { ...depthConfig, ...customParams } : depthConfig;

  // Update analyzer configuration
  geminiAnalyzer.updateConfig({
    temperature: finalConfig.temperature,
    maxTokensPerRequest: finalConfig.maxTokens,
    cacheTTLMinutes: getCacheTTLForDepth(depth),
  });
}

/**
 * Get cache TTL (Time To Live) based on analysis depth
 * Quick analyses have shorter cache times, deep analyses cache longer
 * @param depth Analysis depth level
 * @returns Cache TTL in minutes
 */
function getCacheTTLForDepth(depth: string): number {
  const cacheTTLMap: Record<string, number> = {
    quick: 5, // 5 minutes for quick analysis
    standard: 15, // 15 minutes for standard analysis
    comprehensive: 30, // 30 minutes for comprehensive analysis
    deep: 60, // 60 minutes for deep analysis
  };

  return cacheTTLMap[depth] || cacheTTLMap.standard;
}

/**
 * Get retry configuration based on analysis depth
 * Deeper analyses get more retry attempts with longer delays
 * @param depth Analysis depth level
 * @returns Retry configuration object
 */
export function getRetryConfigForDepth(depth: string): {
  maxRetries: number;
  retryDelayMs: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
} {
  const retryConfigs: Record<string, any> = {
    quick: { maxRetries: 1, retryDelayMs: 500, backoffStrategy: 'fixed' },
    standard: { maxRetries: 3, retryDelayMs: 1000, backoffStrategy: 'exponential' },
    comprehensive: { maxRetries: 4, retryDelayMs: 1000, backoffStrategy: 'exponential' },
    deep: { maxRetries: 5, retryDelayMs: 1000, backoffStrategy: 'exponential' },
  };

  return retryConfigs[depth] || retryConfigs.standard;
}

/**
 * Validate analysis input data for completeness and correctness
 * @param data Input data to validate
 * @param requiredFields Array of required field names
 * @returns Validation result with error details if invalid
 */
export function validateAnalysisInput(
  data: Record<string, unknown>,
  requiredFields: string[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for required fields
  for (const field of requiredFields) {
    if (!(field in data) || data[field] === null || data[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate symbol field specifically (common to most analyses)
  if ('symbol' in data) {
    const symbol = data.symbol;
    if (typeof symbol !== 'string' || symbol.trim() === '') {
      errors.push('Symbol must be a non-empty string');
    }
  }

  // Validate numeric fields
  const numericFields = ['price', 'volume', 'quantity', 'totalValue'];
  for (const field of numericFields) {
    if (field in data && data[field] !== undefined) {
      const value = data[field];
      if (typeof value !== 'number' || isNaN(value) || value < 0) {
        errors.push(`${field} must be a valid non-negative number`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Exports
// =============================================================================

export const mcpCoreService = {
  getAnalysisDepthConfig,
  validateConfidence,
  getServiceHealth,
  resetAnalysisEnvironment,
  configureAnalyzerForDepth,
  getRetryConfigForDepth,
  validateAnalysisInput,
};
