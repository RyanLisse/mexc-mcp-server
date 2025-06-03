/**
 * MCP Risk Service
 * Task #31: Portfolio risk assessment functionality with AI integration
 * Extracted from original encore.service.ts to maintain under 500 lines
 */

import { geminiClient } from '../../ai/gemini-client';
import { handleAIError, retryWithBackoff } from '../../shared/errors';
import {
  type AnalysisDepthConfig,
  configureAnalyzerForDepth,
  getAnalysisDepthConfig,
  getRetryConfigForDepth,
  validateAnalysisInput,
} from './mcpCore';

// =============================================================================
// Risk Assessment Types and Interfaces
// =============================================================================

/**
 * Portfolio asset representation
 */
export interface PortfolioAsset {
  symbol: string;
  quantity: number;
  currentPrice: number;
  entryPrice?: number;
  assetType?: 'crypto' | 'stock' | 'commodity' | 'forex';
}

/**
 * Market context information for risk assessment
 */
export interface MarketContext {
  marketSentiment?: 'bullish' | 'bearish' | 'neutral';
  volatilityIndex?: number;
  economicIndicators?: {
    inflationRate?: number;
    interestRates?: number;
    unemploymentRate?: number;
  };
}

/**
 * Portfolio risk assessment request data
 */
export interface PortfolioRiskData {
  portfolio: PortfolioAsset[];
  totalValue: number;
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  timeHorizon?: 'short' | 'medium' | 'long';
  marketContext?: MarketContext;
}

/**
 * Risk factor assessment
 */
export interface RiskFactor {
  factor: string;
  impact: 'low' | 'medium' | 'high';
  description: string;
}

/**
 * Asset allocation analysis
 */
export interface AssetAllocation {
  symbol: string;
  percentage: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskContribution: number;
}

/**
 * Risk recommendation
 */
export interface RiskRecommendation {
  type: 'reduce_position' | 'diversify' | 'hedge' | 'rebalance' | 'hold' | 'exit';
  target?: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Stress test scenario
 */
export interface StressTestScenario {
  scenario: string;
  potentialLoss: number;
  probability: number;
}

/**
 * Volatility metrics
 */
export interface VolatilityMetrics {
  daily: number;
  weekly: number;
  monthly: number;
}

/**
 * Token usage information
 */
export interface TokenUsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUSD?: number;
}

/**
 * Comprehensive risk assessment response
 */
export interface RiskAssessmentResponse {
  success: boolean;
  overallRiskLevel?: 'low' | 'medium' | 'high' | 'extreme';
  riskScore?: number;
  confidence?: number;
  diversificationScore?: number;
  volatility?: VolatilityMetrics;
  riskFactors?: RiskFactor[];
  assetAllocation?: AssetAllocation[];
  recommendations?: RiskRecommendation[];
  stressTests?: StressTestScenario[];
  error?: string;
  modelVersion?: string;
  tokenUsage?: TokenUsageInfo;
  timestamp?: number;
  processingTimeMs?: number;
}

// =============================================================================
// Risk Assessment Functions
// =============================================================================

/**
 * Perform comprehensive portfolio risk assessment
 * @param data Portfolio data for risk analysis
 * @param analysisDepth Depth of analysis to perform
 * @returns Detailed risk assessment results
 */
export async function performRiskAssessment(
  data: PortfolioRiskData,
  analysisDepth: 'quick' | 'standard' | 'comprehensive' | 'deep' = 'standard'
): Promise<RiskAssessmentResponse> {
  try {
    const startTime = Date.now();

    // Validate input data
    const validation = validatePortfolioData(data);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Invalid portfolio data: ${validation.errors.join(', ')}`,
        timestamp: startTime,
        processingTimeMs: 0,
      };
    }

    // Get configuration for the requested depth
    const depthConfig = getAnalysisDepthConfig(analysisDepth);
    const retryConfig = getRetryConfigForDepth(analysisDepth);

    // Configure analyzer for this depth level
    configureAnalyzerForDepth(analysisDepth, {
      temperature: depthConfig.temperature,
      maxTokens: depthConfig.maxTokens,
    });

    // Perform the risk analysis with retry logic
    const result = await retryWithBackoff(
      async () => {
        return await performAdvancedRiskAnalysis(data, depthConfig);
      },
      retryConfig
    );

    // Add metadata to the result
    const enhancedResult: RiskAssessmentResponse = {
      ...result,
      modelVersion: 'gemini-2.5-flash-preview-05-20',
      timestamp: startTime,
      processingTimeMs: Date.now() - startTime,
    };

    return enhancedResult;
  } catch (error) {
    return handleAIError(error as Error, 'risk', {
      success: false,
      error: 'Risk assessment failed',
      overallRiskLevel: 'high', // Conservative fallback
      riskScore: 75,
      confidence: 0,
      diversificationScore: 0,
      volatility: { daily: 0, weekly: 0, monthly: 0 },
      riskFactors: [
        {
          factor: 'Analysis Unavailable',
          impact: 'high',
          description: 'Unable to perform comprehensive risk analysis due to system error',
        },
      ],
      assetAllocation: [],
      recommendations: [
        {
          type: 'hold',
          description: 'Manual risk assessment recommended due to analysis failure',
          priority: 'high',
        },
      ],
      timestamp: Date.now(),
      processingTimeMs: 0,
    }) as RiskAssessmentResponse;
  }
}

/**
 * Validate portfolio data for completeness and correctness
 * @param data Portfolio data to validate
 * @returns Validation result with error details
 */
function validatePortfolioData(data: PortfolioRiskData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for required fields
  if (!data.portfolio || !Array.isArray(data.portfolio)) {
    errors.push('Portfolio must be an array of assets');
  } else if (data.portfolio.length === 0) {
    errors.push('Portfolio cannot be empty');
  } else {
    // Validate each asset in the portfolio
    data.portfolio.forEach((asset, index) => {
      if (!asset.symbol || typeof asset.symbol !== 'string') {
        errors.push(`Asset ${index + 1}: Symbol is required and must be a string`);
      }
      if (typeof asset.quantity !== 'number' || asset.quantity <= 0) {
        errors.push(`Asset ${index + 1}: Quantity must be a positive number`);
      }
      if (typeof asset.currentPrice !== 'number' || asset.currentPrice <= 0) {
        errors.push(`Asset ${index + 1}: Current price must be a positive number`);
      }
    });
  }

  if (typeof data.totalValue !== 'number' || data.totalValue <= 0) {
    errors.push('Total value must be a positive number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Perform advanced risk analysis using AI
 * @param data Portfolio data for analysis
 * @param depthConfig Configuration for the analysis depth
 * @returns Advanced risk analysis results
 */
async function performAdvancedRiskAnalysis(
  data: PortfolioRiskData,
  depthConfig: AnalysisDepthConfig
): Promise<RiskAssessmentResponse> {
  // Calculate basic portfolio metrics
  const portfolioMetrics = calculatePortfolioMetrics(data);

  // Build comprehensive prompt for AI analysis
  const prompt = buildRiskAnalysisPrompt(data, portfolioMetrics, depthConfig);

  // Define schema for structured AI response
  const schema = buildRiskAnalysisSchema();

  try {
    const result = await geminiClient.generateObject(prompt, schema, 'Portfolio Risk Assessment');

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Calculate token cost estimate
    const tokenUsage: TokenUsageInfo | undefined = result.usage
      ? {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          estimatedCostUSD: (result.usage.totalTokens / 1_000_000) * 0.00075, // Gemini 2.5 Flash pricing
        }
      : undefined;

    return {
      success: true,
      ...result.data,
      tokenUsage,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Advanced risk analysis failed',
    };
  }
}

/**
 * Calculate basic portfolio metrics for analysis
 * @param data Portfolio data
 * @returns Basic portfolio metrics
 */
function calculatePortfolioMetrics(data: PortfolioRiskData): {
  portfolioSize: number;
  assetValues: number[];
  percentages: number[];
  maxAllocation: number;
  diversificationScore: number;
} {
  const portfolioSize = data.portfolio.length;
  const assetValues = data.portfolio.map((asset) => asset.quantity * asset.currentPrice);
  const percentages = assetValues.map((value) => (value / data.totalValue) * 100);
  const maxAllocation = Math.max(...percentages);
  const diversificationScore = Math.min(1, portfolioSize / 10); // Simple diversification metric

  return {
    portfolioSize,
    assetValues,
    percentages,
    maxAllocation,
    diversificationScore,
  };
}

/**
 * Build comprehensive risk analysis prompt for AI
 * @param data Portfolio data
 * @param metrics Calculated portfolio metrics
 * @param depthConfig Analysis depth configuration
 * @returns Formatted prompt for AI analysis
 */
function buildRiskAnalysisPrompt(
  data: PortfolioRiskData,
  metrics: ReturnType<typeof calculatePortfolioMetrics>,
  depthConfig: AnalysisDepthConfig
): string {
  const prompt = `Perform a comprehensive portfolio risk assessment for the following portfolio:

Portfolio Overview:
- Total Value: $${data.totalValue.toFixed(2)}
- Number of Assets: ${metrics.portfolioSize}
- Risk Tolerance: ${data.riskTolerance || 'moderate'}
- Time Horizon: ${data.timeHorizon || 'medium'}
- Analysis Depth: ${depthConfig.depth}

Asset Breakdown:
${data.portfolio
  .map(
    (asset, i) =>
      `${i + 1}. ${asset.symbol}: ${asset.quantity} units @ $${asset.currentPrice} = $${metrics.assetValues[i].toFixed(2)} (${metrics.percentages[i].toFixed(1)}%)${asset.entryPrice ? ` [Entry: $${asset.entryPrice}]` : ''}`
  )
  .join('\n')}

${
  data.marketContext
    ? `Market Context:
${JSON.stringify(data.marketContext, null, 2)}\n`
    : ''
}
Please provide a detailed risk assessment including:
1. Overall risk level (low/medium/high/extreme)
2. Risk score (0-100)
3. Confidence in assessment (0-1)
4. Diversification analysis
5. Volatility estimates (daily/weekly/monthly %)
6. Key risk factors with impact levels
7. Asset allocation risk analysis
8. Specific recommendations with priorities
9. Stress test scenarios with potential losses

Focus on practical, actionable insights for a ${data.riskTolerance || 'moderate'} investor with a ${data.timeHorizon || 'medium'}-term outlook.`;

  return prompt;
}

/**
 * Build JSON schema for structured AI response
 * @returns JSON schema for risk assessment response
 */
function buildRiskAnalysisSchema(): object {
  return {
    type: 'object',
    properties: {
      overallRiskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'extreme'] },
      riskScore: { type: 'number', minimum: 0, maximum: 100 },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      diversificationScore: { type: 'number', minimum: 0, maximum: 1 },
      volatility: {
        type: 'object',
        properties: {
          daily: { type: 'number', minimum: 0 },
          weekly: { type: 'number', minimum: 0 },
          monthly: { type: 'number', minimum: 0 },
        },
        required: ['daily', 'weekly', 'monthly'],
      },
      riskFactors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            factor: { type: 'string' },
            impact: { type: 'string', enum: ['low', 'medium', 'high'] },
            description: { type: 'string' },
          },
          required: ['factor', 'impact', 'description'],
        },
      },
      assetAllocation: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            percentage: { type: 'number', minimum: 0, maximum: 100 },
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
            riskContribution: { type: 'number', minimum: 0, maximum: 100 },
          },
          required: ['symbol', 'percentage', 'riskLevel', 'riskContribution'],
        },
      },
      recommendations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['reduce_position', 'diversify', 'hedge', 'rebalance', 'hold', 'exit'],
            },
            target: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
          required: ['type', 'description', 'priority'],
        },
      },
      stressTests: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            scenario: { type: 'string' },
            potentialLoss: { type: 'number', minimum: 0, maximum: 100 },
            probability: { type: 'number', minimum: 0, maximum: 1 },
          },
          required: ['scenario', 'potentialLoss', 'probability'],
        },
      },
    },
    required: [
      'overallRiskLevel',
      'riskScore',
      'confidence',
      'diversificationScore',
      'volatility',
      'riskFactors',
      'assetAllocation',
      'recommendations',
    ],
  };
}

// =============================================================================
// Exports
// =============================================================================

export const mcpRiskService = {
  performRiskAssessment,
};