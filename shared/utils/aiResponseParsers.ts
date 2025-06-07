/**
 * AI Response Parsers
 * Task #30: Utility functions for parsing, validating, and handling structured AI responses
 * Defensive parsing with fallback mechanisms and comprehensive error handling
 */

import { createAIAnalysisError } from '../errors';
import type { AnalysisType, OptimizationResult, RiskAssessment } from '../types/ai-types';
import { clamp, ensureValidConfidence, sanitizeStringArray } from './index';

// =============================================================================
// Type Guards and Validation Helpers
// =============================================================================

/**
 * Validates basic AI response structure
 * @param response - Response to validate
 * @returns Whether response has valid AI structure
 * @example
 * ```typescript
 * const isValid = validateAIResponseStructure(response);
 * if (!isValid) throw new Error('Invalid AI response');
 * ```
 */
export function validateAIResponseStructure(response: unknown): response is { success: boolean } {
  return (
    response !== null &&
    response !== undefined &&
    typeof response === 'object' &&
    !Array.isArray(response) &&
    'success' in response &&
    typeof (response as any).success === 'boolean'
  );
}

/**
 * Type guard for RiskAssessment validation
 * @param data - Data to validate
 * @returns Whether data is a valid RiskAssessment
 * @example
 * ```typescript
 * if (isValidRiskAssessment(response)) {
 *   console.log(response.data.riskLevel);
 * }
 * ```
 */
export function isValidRiskAssessment(data: unknown): data is RiskAssessment {
  if (!validateAIResponseStructure(data)) return false;

  const response = data as any;

  // Check required structure
  if (!response.data || typeof response.data !== 'object') return false;

  const { data: responseData } = response;

  // Validate required fields
  if (!responseData.riskLevel || !['low', 'medium', 'high'].includes(responseData.riskLevel)) {
    return false;
  }

  if (
    typeof responseData.confidence !== 'number' ||
    responseData.confidence < 0 ||
    responseData.confidence > 1
  ) {
    return false;
  }

  if (!Array.isArray(responseData.recommendations)) {
    return false;
  }

  return true;
}

/**
 * Type guard for OptimizationResult validation
 * @param data - Data to validate
 * @returns Whether data is a valid OptimizationResult
 * @example
 * ```typescript
 * if (isValidOptimizationResult(response)) {
 *   console.log(response.data.optimizationType);
 * }
 * ```
 */
export function isValidOptimizationResult(data: unknown): data is OptimizationResult {
  if (!validateAIResponseStructure(data)) return false;

  const response = data as any;

  // Check required structure
  if (!response.data || typeof response.data !== 'object') return false;

  const { data: responseData } = response;

  // Validate required fields
  if (
    !responseData.optimizationType ||
    !['portfolio', 'risk', 'return', 'sharpe'].includes(responseData.optimizationType)
  ) {
    return false;
  }

  if (
    typeof responseData.confidence !== 'number' ||
    responseData.confidence < 0 ||
    responseData.confidence > 1
  ) {
    return false;
  }

  if (!Array.isArray(responseData.recommendations)) {
    return false;
  }

  // Validate allocation weights if present
  if (responseData.allocations && Array.isArray(responseData.allocations)) {
    for (const allocation of responseData.allocations) {
      if (!allocation || typeof allocation !== 'object') return false;
      if (
        typeof allocation.currentWeight !== 'number' ||
        allocation.currentWeight < 0 ||
        allocation.currentWeight > 1
      )
        return false;
      if (
        typeof allocation.optimizedWeight !== 'number' ||
        allocation.optimizedWeight < 0 ||
        allocation.optimizedWeight > 1
      )
        return false;
    }
  }

  return true;
}

// =============================================================================
// Generic Fallback Creator
// =============================================================================

/**
 * Creates a generic fallback response with common fields
 * @param response - Original response with potential partial data
 * @param defaultData - Default data object for the specific type
 * @returns Base fallback response with extracted common fields
 */
function createBaseFallback<T extends { data: unknown }>(
  response: unknown,
  defaultData: T['data']
): Omit<T, 'data'> & { data: T['data'] } {
  const fallbackBase = {
    success: true,
    confidence: 0.5,
    timestamp: Date.now(),
    processingTimeMs: 0,
    modelVersion: 'fallback',
    data: defaultData,
  };

  // Extract valid common fields if response has some structure
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    const resp = response as any;

    if (typeof resp.confidence === 'number') {
      fallbackBase.confidence = ensureValidConfidence(resp.confidence);
    }
    if (typeof resp.timestamp === 'number') {
      fallbackBase.timestamp = resp.timestamp;
    }
    if (typeof resp.processingTimeMs === 'number') {
      fallbackBase.processingTimeMs = resp.processingTimeMs;
    }
    if (typeof resp.modelVersion === 'string') {
      fallbackBase.modelVersion = resp.modelVersion;
    }
  }

  return fallbackBase as any;
}

// =============================================================================
// Generic AI Response Parser
// =============================================================================

/**
 * Generic function for parsing AI responses with validation and fallback
 * @param response - Raw AI response to parse
 * @param validator - Type guard function for validation
 * @param analysisType - Type of analysis for error context
 * @param fallback - Optional fallback function if parsing fails
 * @returns Parsed and validated response
 * @throws AIAnalysisError if validation fails and no fallback provided
 * @example
 * ```typescript
 * const result = parseAIResponse(
 *   rawResponse,
 *   isValidRiskAssessment,
 *   'risk',
 *   () => getDefaultRiskAssessment()
 * );
 * ```
 */
export function parseAIResponse<T>(
  response: unknown,
  validator: (data: unknown) => data is T,
  analysisType: AnalysisType | string,
  fallback?: () => T
): T {
  try {
    // Type-specific validation first
    if (validator(response)) {
      return response;
    }

    // If validation fails, try fallback before throwing error
    if (fallback) {
      return fallback();
    }

    // No fallback available, determine specific error
    if (!validateAIResponseStructure(response)) {
      throw new Error('Invalid AI response structure');
    }

    // Basic structure valid but type-specific validation failed
    throw new Error('Response validation failed and no fallback provided');
  } catch (error) {
    // If fallback was available and we're here, it means fallback threw
    if (fallback && error instanceof Error && error.message.includes('fallback')) {
      throw error;
    }

    const errorMessage = `Failed to parse ${analysisType} response: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`;

    const analysisError = createAIAnalysisError(errorMessage, analysisType as AnalysisType, {
      severity: 'error',
      recoverable: fallback !== undefined,
      inputDataRef: JSON.stringify(response),
    });

    // Add details manually since createAIAnalysisError might not handle it
    (analysisError as any).details = {
      originalInput: response,
      validationError: error instanceof Error ? error.message : 'Unknown validation error',
    };

    throw analysisError;
  }
}

// =============================================================================
// Risk Assessment Parser
// =============================================================================

/**
 * Parses and validates risk assessment responses from AI
 * Applies defensive parsing with fallback values for malformed data
 * @param response - Raw AI response
 * @returns Validated RiskAssessment object
 * @throws AIAnalysisError for completely invalid responses
 * @example
 * ```typescript
 * const riskAssessment = parseRiskAssessmentResponse(aiResponse);
 * console.log(riskAssessment.data.riskLevel); // 'low' | 'medium' | 'high'
 * ```
 */
export function parseRiskAssessmentResponse(response: unknown): RiskAssessment {
  // First try strict validation
  if (isValidRiskAssessment(response)) {
    return response;
  }

  // Check if response has basic structure for fallback
  // Must be an object with either 'success' field or 'data' field
  const canApplyFallback =
    response !== null &&
    response !== undefined &&
    typeof response === 'object' &&
    !Array.isArray(response) &&
    ('success' in response || 'data' in response);

  // Apply defensive parsing with fallbacks only if basic structure exists
  return parseAIResponse(
    response,
    isValidRiskAssessment,
    'risk',
    canApplyFallback ? () => createFallbackRiskAssessment(response) : undefined
  );
}

/**
 * Creates a fallback RiskAssessment from partially valid data
 * @param response - Original response with potential partial data
 * @returns Valid RiskAssessment with fallback values
 */
function createFallbackRiskAssessment(response: unknown): RiskAssessment {
  const defaultData = {
    riskLevel: 'medium' as const,
    confidence: 0.5,
    recommendations: ['Unable to generate specific recommendations'],
  };

  const fallbackData = createBaseFallback<RiskAssessment>(response, defaultData);

  // Extract type-specific data if available
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    const resp = response as any;

    if (resp.data && typeof resp.data === 'object') {
      const data = resp.data;

      // Extract valid risk level
      if (
        typeof data.riskLevel === 'string' &&
        ['low', 'medium', 'high'].includes(data.riskLevel)
      ) {
        fallbackData.data.riskLevel = data.riskLevel;
      }

      // Extract valid confidence from data
      if (typeof data.confidence === 'number') {
        fallbackData.data.confidence = ensureValidConfidence(data.confidence);
      }

      // Extract valid recommendations
      const recommendations = sanitizeStringArray(data.recommendations);
      if (recommendations.length > 0) {
        fallbackData.data.recommendations = recommendations;
      }

      // Extract risk factors if valid
      if (data.riskFactors && typeof data.riskFactors === 'object') {
        const factors = data.riskFactors;
        fallbackData.data.riskFactors = {
          volatilityRisk: ensureValidConfidence(factors.volatilityRisk, 0.5),
          liquidityRisk: ensureValidConfidence(factors.liquidityRisk, 0.3),
          positionSizeRisk: ensureValidConfidence(factors.positionSizeRisk, 0.4),
          correlationRisk: ensureValidConfidence(factors.correlationRisk, 0.3),
        };
      }

      // Extract loss scenarios if valid
      if (Array.isArray(data.lossScenarios)) {
        const validScenarios = data.lossScenarios
          .filter(
            (scenario: any) =>
              scenario &&
              typeof scenario === 'object' &&
              typeof scenario.scenario === 'string' &&
              typeof scenario.probability === 'number' &&
              typeof scenario.potentialLoss === 'number'
          )
          .map((scenario: any) => ({
            scenario: scenario.scenario,
            probability: ensureValidConfidence(scenario.probability),
            potentialLoss: scenario.potentialLoss,
          }));

        if (validScenarios.length > 0) {
          fallbackData.data.lossScenarios = validScenarios;
        }
      }
    }
  }

  return fallbackData;
}

// =============================================================================
// Optimization Result Parser
// =============================================================================

/**
 * Parses and validates optimization responses from AI
 * Applies defensive parsing with fallback values for malformed data
 * @param response - Raw AI response
 * @returns Validated OptimizationResult object
 * @throws AIAnalysisError for completely invalid responses
 * @example
 * ```typescript
 * const optimization = parseOptimizationResponse(aiResponse);
 * console.log(optimization.data.optimizationType); // 'portfolio' | 'risk' | etc.
 * ```
 */
export function parseOptimizationResponse(response: unknown): OptimizationResult {
  // First try strict validation
  if (isValidOptimizationResult(response)) {
    return response;
  }

  // Check if response has basic structure for fallback
  // Must be an object with either 'success' field or 'data' field
  const canApplyFallback =
    response !== null &&
    response !== undefined &&
    typeof response === 'object' &&
    !Array.isArray(response) &&
    ('success' in response || 'data' in response);

  // Apply defensive parsing with fallbacks only if basic structure exists
  return parseAIResponse(
    response,
    isValidOptimizationResult,
    'optimization',
    canApplyFallback ? () => createFallbackOptimizationResult(response) : undefined
  );
}

/**
 * Creates a fallback OptimizationResult from partially valid data
 * @param response - Original response with potential partial data
 * @returns Valid OptimizationResult with fallback values
 */
function createFallbackOptimizationResult(response: unknown): OptimizationResult {
  const defaultData = {
    optimizationType: 'portfolio' as const,
    confidence: 0.5,
    optimizedMetrics: {},
    recommendations: ['Unable to generate specific optimization recommendations'],
  };

  const fallbackData = createBaseFallback<OptimizationResult>(response, defaultData);

  // Extract type-specific data if available
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    const resp = response as any;

    if (resp.data && typeof resp.data === 'object') {
      const data = resp.data;

      // Extract valid optimization type
      if (
        typeof data.optimizationType === 'string' &&
        ['portfolio', 'risk', 'return', 'sharpe'].includes(data.optimizationType)
      ) {
        fallbackData.data.optimizationType = data.optimizationType;
      }

      // Extract valid confidence from data
      if (typeof data.confidence === 'number') {
        fallbackData.data.confidence = ensureValidConfidence(data.confidence);
      }

      // Extract valid recommendations
      const recommendations = sanitizeStringArray(data.recommendations);
      if (recommendations.length > 0) {
        fallbackData.data.recommendations = recommendations;
      }

      // Extract optimized metrics if valid
      if (data.optimizedMetrics && typeof data.optimizedMetrics === 'object') {
        const metrics = data.optimizedMetrics;
        fallbackData.data.optimizedMetrics = {};

        if (typeof metrics.expectedReturn === 'number') {
          fallbackData.data.optimizedMetrics.expectedReturn = metrics.expectedReturn;
        }
        if (typeof metrics.riskReduction === 'number') {
          fallbackData.data.optimizedMetrics.riskReduction = metrics.riskReduction;
        }
        if (typeof metrics.sharpeRatio === 'number') {
          fallbackData.data.optimizedMetrics.sharpeRatio = metrics.sharpeRatio;
        }
        if (typeof metrics.maxDrawdown === 'number') {
          fallbackData.data.optimizedMetrics.maxDrawdown = metrics.maxDrawdown;
        }
      }

      // Extract allocations if valid
      if (Array.isArray(data.allocations)) {
        const validAllocations = data.allocations
          .filter(
            (allocation: any) =>
              allocation &&
              typeof allocation === 'object' &&
              typeof allocation.symbol === 'string' &&
              typeof allocation.currentWeight === 'number' &&
              typeof allocation.optimizedWeight === 'number'
          )
          .map((allocation: any) => ({
            symbol: allocation.symbol,
            currentWeight: clamp(allocation.currentWeight, 0, 1),
            optimizedWeight: clamp(allocation.optimizedWeight, 0, 1),
            adjustment: typeof allocation.adjustment === 'number' ? allocation.adjustment : 0,
          }));

        if (validAllocations.length > 0) {
          fallbackData.data.allocations = validAllocations;
        }
      }

      // Extract backtest results if valid
      if (data.backtestResults && typeof data.backtestResults === 'object') {
        const backtest = data.backtestResults;
        if (typeof backtest.periodMonths === 'number' && backtest.periodMonths > 0) {
          fallbackData.data.backtestResults = {
            periodMonths: Math.max(1, Math.floor(backtest.periodMonths)),
            totalReturn: typeof backtest.totalReturn === 'number' ? backtest.totalReturn : 0,
            volatility:
              typeof backtest.volatility === 'number' ? Math.max(0, backtest.volatility) : 0,
            maxDrawdown: typeof backtest.maxDrawdown === 'number' ? backtest.maxDrawdown : 0,
            winRate: ensureValidConfidence(backtest.winRate, 0.5),
          };
        }
      }
    }
  }

  return fallbackData;
}
