/**
 * Mock Data for AI Response Parser Tests
 * Contains test fixtures for various AI response scenarios
 */

import type { OptimizationResult, RiskAssessment } from '../../types/ai-types';

// =============================================================================
// Risk Assessment Mock Data
// =============================================================================

export const validRiskAssessmentResponse: RiskAssessment = {
  success: true,
  confidence: 0.85,
  timestamp: Date.now(),
  processingTimeMs: 1250,
  modelVersion: 'gemini-2.5-flash-preview',
  data: {
    riskLevel: 'medium',
    confidence: 0.85,
    recommendations: [
      'Consider reducing position size by 20%',
      'Set stop-loss at 2% below entry',
      'Monitor market volatility closely',
    ],
    riskFactors: {
      volatilityRisk: 0.65,
      liquidityRisk: 0.3,
      positionSizeRisk: 0.45,
      correlationRisk: 0.25,
    },
    lossScenarios: [
      {
        scenario: 'Moderate market downturn',
        probability: 0.35,
        potentialLoss: 0.15,
      },
      {
        scenario: 'Severe market crash',
        probability: 0.1,
        potentialLoss: 0.4,
      },
    ],
  },
};

export const partialRiskAssessmentResponse = {
  success: true,
  confidence: 0.72,
  data: {
    riskLevel: 'high',
    confidence: 0.72,
    recommendations: ['Reduce exposure immediately'],
    // Missing optional fields: riskFactors, lossScenarios
  },
};

export const malformedRiskAssessmentResponse = {
  success: true,
  confidence: 'invalid', // Should be number
  data: {
    riskLevel: 'extreme', // Invalid value
    confidence: 1.5, // Out of range
    recommendations: 'not an array', // Should be array
  },
};

export const invalidRiskAssessmentResponse = {
  invalid: 'structure',
  missing: 'required fields',
};

// =============================================================================
// Optimization Result Mock Data
// =============================================================================

export const validOptimizationResponse: OptimizationResult = {
  success: true,
  confidence: 0.88,
  timestamp: Date.now(),
  processingTimeMs: 1800,
  modelVersion: 'gemini-2.5-flash-preview',
  data: {
    optimizationType: 'portfolio',
    confidence: 0.88,
    optimizedMetrics: {
      expectedReturn: 0.12,
      riskReduction: 0.25,
      sharpeRatio: 1.45,
      maxDrawdown: 0.08,
    },
    recommendations: [
      'Increase BTC allocation to 40%',
      'Reduce ETH exposure to 25%',
      'Add SOL position at 10%',
    ],
    allocations: [
      {
        symbol: 'BTC',
        currentWeight: 0.35,
        optimizedWeight: 0.4,
        adjustment: 0.05,
      },
      {
        symbol: 'ETH',
        currentWeight: 0.3,
        optimizedWeight: 0.25,
        adjustment: -0.05,
      },
      {
        symbol: 'SOL',
        currentWeight: 0.0,
        optimizedWeight: 0.1,
        adjustment: 0.1,
      },
    ],
    backtestResults: {
      periodMonths: 12,
      totalReturn: 0.28,
      volatility: 0.22,
      maxDrawdown: 0.12,
      winRate: 0.65,
    },
  },
};

export const partialOptimizationResponse = {
  success: true,
  confidence: 0.75,
  data: {
    optimizationType: 'risk',
    confidence: 0.75,
    optimizedMetrics: {
      riskReduction: 0.18,
    },
    recommendations: ['Diversify holdings'],
    // Missing optional fields
  },
};

export const malformedOptimizationResponse = {
  success: true,
  confidence: 'not-a-number',
  data: {
    optimizationType: 'invalid-type',
    confidence: -0.5, // Invalid range
    optimizedMetrics: 'should be object',
    recommendations: null, // Should be array
  },
};

export const invalidOptimizationResponse = null;

// =============================================================================
// Generic AI Response Mock Data
// =============================================================================

export const emptyResponse = {};

export const nullResponse = null;

export const undefinedResponse = undefined;

export const stringResponse = 'This is not a proper AI response';

export const arrayResponse = ['not', 'an', 'object'];

export const responseWithoutSuccess = {
  confidence: 0.8,
  data: { some: 'data' },
  // Missing required 'success' field
};

export const responseWithInvalidSuccess = {
  success: 'not-boolean',
  confidence: 0.8,
  data: { some: 'data' },
};

// =============================================================================
// Edge Cases
// =============================================================================

export const responseWithNestedNulls = {
  success: true,
  confidence: null,
  data: {
    riskLevel: null,
    recommendations: [null, undefined, ''],
  },
};

export const responseWithCircularReference = (() => {
  const obj: any = {
    success: true,
    confidence: 0.8,
    data: {},
  };
  obj.data.circular = obj; // Creates circular reference
  return obj;
})();

export const hugeResponse = {
  success: true,
  confidence: 0.8,
  data: {
    riskLevel: 'low',
    recommendations: Array(10000).fill('recommendation'), // Very large array
    largeString: 'x'.repeat(100000), // Very large string
  },
};
