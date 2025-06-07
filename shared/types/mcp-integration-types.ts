/**
 * MCP Integration Types
 * Extracted from mcpIntegration.ts to reduce file size and improve reusability
 */

import type { AnalysisParameters, AnalysisType } from './ai-types';

// =============================================================================
// Integration Service Types and Interfaces
// =============================================================================

/**
 * AI Market Analysis Request
 */
export interface AIMarketAnalysisRequest {
  symbol: string;
  analysisType: AnalysisType;
  depth?: 'quick' | 'standard' | 'comprehensive' | 'deep';
  parameters?: AnalysisParameters;
  price?: number;
  volume?: number;
  marketData?: unknown;
  ohlcv?: unknown[];
}

/**
 * Risk Assessment Request
 */
export interface RiskAssessmentRequest {
  portfolio: Array<{
    symbol: string;
    quantity: number;
    currentPrice: number;
    entryPrice?: number;
    assetType?: 'crypto' | 'stock' | 'commodity' | 'forex';
  }>;
  totalValue: number;
  analysisDepth?: 'quick' | 'standard' | 'comprehensive' | 'deep';
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  timeHorizon?: 'short' | 'medium' | 'long';
  marketContext?: {
    marketSentiment?: 'bullish' | 'bearish' | 'neutral';
    volatilityIndex?: number;
    economicIndicators?: {
      inflationRate?: number;
      interestRates?: number;
      unemploymentRate?: number;
    };
  };
}

/**
 * Strategy Optimizer Request (Placeholder for Task #27)
 */
export interface StrategyOptimizerRequest {
  portfolio: Array<{
    symbol: string;
    allocation: number;
  }>;
  objectiveFunction: 'sharpe_ratio' | 'max_return' | 'min_risk' | 'custom';
  constraints: {
    maxRisk?: number;
    minReturn?: number;
    maxDrawdown?: number;
    maxPositionSize?: number;
  };
  timeHorizon?: 'short' | 'medium' | 'long';
  rebalanceFrequency?: 'daily' | 'weekly' | 'monthly';
}

/**
 * Trading Tools Request (Placeholder for Task #28)
 */
export interface TradingToolsRequest {
  action: 'position_sizing' | 'stop_loss' | 'take_profit' | 'risk_reward' | 'technical_analysis';
  symbol: string;
  accountBalance: number;
  riskPerTrade?: number;
  entryPrice?: number;
  currentPrice?: number;
  timeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
}

/**
 * Generic service response interface
 */
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: number;
  processingTimeMs?: number;
  serviceVersion?: string;
}
