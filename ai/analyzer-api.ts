/**
 * Gemini Analyzer API Endpoints
 * Market analysis endpoints using Encore.ts validation
 */

import { api } from 'encore.dev/api';
// Removed MinLen import for Encore compatibility
import {
  type AnalysisResult,
  type BudgetStatus,
  type CacheStats,
  type MarketAnalysis,
  geminiAnalyzer,
} from './gemini-analyzer';

// Request types simplified for Encore compatibility
export interface MarketDataRequest {
  symbol: string;
  price?: number;
  volume?: number;
  prices?: number[];
  volumes?: number[];
  timestamp?: number;
}

export interface TechnicalAnalysisRequest {
  symbol: string;
  ohlcv: Array<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export interface RiskAssessmentRequest {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  marketData: {
    volatility: number;
    volume24h: number;
  };
}

export interface TrendAnalysisRequest {
  symbol: string;
  timeframe: string;
  dataPoints: Array<{
    timestamp: number;
    price: number;
    volume: number;
  }>;
}

/**
 * Analyze market sentiment from price data
 */
export const analyzeSentiment = api(
  { method: 'POST', path: '/ai/analyze-sentiment', expose: true },
  async (data: MarketDataRequest): Promise<AnalysisResult> => {
    try {
      return await geminiAnalyzer.analyzeSentiment(data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sentiment analysis failed',
      };
    }
  }
);

/**
 * Perform technical analysis on market data
 */
export const performTechnicalAnalysis = api(
  { method: 'POST', path: '/ai/technical-analysis', expose: true },
  async (
    data: TechnicalAnalysisRequest
  ): Promise<{ success: boolean; data?: MarketAnalysis; error?: string }> => {
    try {
      const result = await geminiAnalyzer.performTechnicalAnalysis(data);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Technical analysis failed',
      };
    }
  }
);

/**
 * Assess risk for trading position
 */
export const assessRisk = api(
  { method: 'POST', path: '/ai/assess-risk', expose: true },
  async (data: RiskAssessmentRequest): Promise<AnalysisResult> => {
    try {
      return await geminiAnalyzer.assessRisk(data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Risk assessment failed',
      };
    }
  }
);

/**
 * Analyze market trends and patterns
 */
export const analyzeTrend = api(
  { method: 'POST', path: '/ai/analyze-trend', expose: true },
  async (
    data: TrendAnalysisRequest
  ): Promise<{ success: boolean; data?: MarketAnalysis; error?: string }> => {
    try {
      const result = await geminiAnalyzer.analyzeTrend(data);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Trend analysis failed',
      };
    }
  }
);

/**
 * Get analyzer budget status
 */
export const getBudgetStatus = api(
  { method: 'GET', path: '/ai/budget-status', expose: true },
  async (): Promise<BudgetStatus> => {
    return geminiAnalyzer.getBudgetStatus();
  }
);

/**
 * Get cache statistics
 */
export const getCacheStats = api(
  { method: 'GET', path: '/ai/cache-stats', expose: true },
  async (): Promise<CacheStats> => {
    return geminiAnalyzer.getCacheStats();
  }
);

/**
 * Get analyzer configuration
 */
export const getAnalyzerConfig = api(
  { method: 'GET', path: '/ai/analyzer-config', expose: true },
  async () => {
    return geminiAnalyzer.getConfig();
  }
);

/**
 * Clear analyzer cache
 */
export const clearCache = api(
  { method: 'POST', path: '/ai/clear-cache', expose: true },
  async (): Promise<{ success: boolean; message: string }> => {
    try {
      geminiAnalyzer.clearCache();
      return { success: true, message: 'Cache cleared successfully' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to clear cache',
      };
    }
  }
);

/**
 * Reset budget window
 */
export const resetBudgetWindow = api(
  { method: 'POST', path: '/ai/reset-budget', expose: true },
  async (): Promise<{ success: boolean; message: string }> => {
    try {
      geminiAnalyzer.resetBudgetWindow();
      return { success: true, message: 'Budget window reset successfully' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reset budget window',
      };
    }
  }
);
