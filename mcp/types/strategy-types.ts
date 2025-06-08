/**
 * Strategy and Portfolio Types
 * Extracted from api.ts for better modularity
 */

import type { Max, Min, MinLen } from 'encore.dev/validate';
import type { AIAnalysisResult } from '../../shared/types/ai-types';

// =============================================================================
// Strategy Optimizer Types
// =============================================================================

/**
 * Strategy Optimizer Request
 */
export interface StrategyOptimizerRequest {
  /** Trading symbol */
  symbol: string & MinLen<1>;
  /** Strategy type */
  strategyType: 'trend_following' | 'mean_reversion' | 'momentum' | 'arbitrage' | 'dca' | 'grid';
  /** Current market data */
  marketData: {
    price: number & Min<0>;
    volume: number & Min<0>;
    volatility?: number & Min<0>;
    priceChange24h?: number;
    marketCap?: number & Min<0>;
  };
  /** Historical OHLCV data */
  ohlcv?: Array<{
    open: number & Min<0>;
    high: number & Min<0>;
    low: number & Min<0>;
    close: number & Min<0>;
    volume: number & Min<0>;
    timestamp: number;
  }>;
  /** Strategy parameters */
  parameters?: {
    /** Risk tolerance (0-100) */
    riskTolerance?: number & Min<0> & Max<100>;
    /** Target allocation percentage */
    targetAllocation?: number & Min<0> & Max<100>;
    /** Time horizon in hours */
    timeHorizon?: number & Min<1> & Max<8760>;
    /** Maximum position size */
    maxPositionSize?: number & Min<0>;
    /** Stop-loss percentage */
    stopLoss?: number & Min<0> & Max<100>;
    /** Take-profit percentage */
    takeProfit?: number & Min<0> & Max<1000>;
    /** DCA frequency in hours (for DCA strategy) */
    dcaFrequency?: number & Min<1> & Max<720>;
    /** Grid spacing percentage (for grid strategy) */
    gridSpacing?: number & Min<0.1> & Max<50>;
  };
  /** Optimization criteria */
  optimization?: {
    /** Primary objective */
    objective?: 'maximize_return' | 'minimize_risk' | 'sharpe_ratio' | 'profit_factor';
    /** Backtesting period in days */
    backtestDays?: number & Min<7> & Max<365>;
    /** Include transaction costs */
    includeFees?: boolean;
    /** Slippage assumption (%) */
    slippagePercent?: number & Min<0> & Max<5>;
  };
}

/**
 * Strategy Optimizer Response
 */
export interface StrategyOptimizerResponse {
  /** Whether optimization succeeded */
  success: boolean;
  /** Optimization result data */
  data?: {
    /** Optimized strategy parameters */
    optimizedParameters: Record<string, number | string | boolean>;
    /** Expected performance metrics */
    performance: {
      expectedReturn: number;
      expectedRisk: number;
      sharpeRatio: number;
      maxDrawdown: number;
      winRate: number;
      profitFactor: number;
    };
    /** Recommended actions */
    recommendations: Array<{
      action: 'buy' | 'sell' | 'hold' | 'dca' | 'grid_setup';
      quantity?: number;
      price?: number;
      reasoning: string;
      confidence: number;
      timeframe?: string;
    }>;
    /** Risk assessment */
    riskMetrics: {
      valueAtRisk: number;
      conditionalVaR: number;
      beta: number;
      volatility: number;
      correlation: number;
    };
    /** AI analysis details */
    analysis?: AIAnalysisResult;
  };
  /** Error message if failed */
  error?: string;
  /** Optimization metadata */
  metadata?: {
    strategyType: string;
    optimizationTime: number;
    dataPoints: number;
    modelVersion: string;
    timestamp: number;
  };
}

// =============================================================================
// Portfolio Risk Assessment Types
// =============================================================================

/**
 * Portfolio Risk Assessment Request
 */
export interface PortfolioRiskAssessmentRequest {
  /** Portfolio holdings */
  holdings: Array<{
    symbol: string & MinLen<1>;
    quantity: number & Min<0>;
    currentPrice: number & Min<0>;
    averageCost?: number & Min<0>;
    allocation?: number & Min<0> & Max<100>;
  }>;
  /** Total portfolio value */
  totalValue: number & Min<0>;
  /** Market conditions */
  marketConditions?: {
    volatilityIndex?: number & Min<0>;
    fearGreedIndex?: number & Min<0> & Max<100>;
    marketTrend?: 'bullish' | 'bearish' | 'sideways';
    economicIndicators?: Record<string, number>;
  };
  /** Risk assessment parameters */
  parameters?: {
    /** Risk tolerance (1-10 scale) */
    riskTolerance?: number & Min<1> & Max<10>;
    /** Time horizon in days */
    timeHorizon?: number & Min<1> & Max<3650>;
    /** Confidence level for VaR calculation */
    confidenceLevel?: number & Min<0.9> & Max<0.99>;
    /** Include correlation analysis */
    includeCorrelations?: boolean;
    /** Stress testing scenarios */
    stressScenarios?: boolean;
  };
}

/**
 * Risk Assessment Response
 */
export interface RiskAssessmentResponse {
  /** Whether assessment succeeded */
  success: boolean;
  /** Risk assessment data */
  data?: {
    /** Overall risk score (1-100) */
    overallRiskScore: number;
    /** Risk level classification */
    riskLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
    /** Portfolio metrics */
    portfolioMetrics: {
      totalValue: number;
      totalPnL: number;
      totalPnLPercent: number;
      diversificationRatio: number;
      concentrationRisk: number;
      liquidityScore: number;
    };
    /** Risk metrics */
    riskMetrics: {
      valueAtRisk: number;
      conditionalVaR: number;
      maxDrawdown: number;
      sharpeRatio: number;
      volatility: number;
      beta: number;
    };
    /** Asset-level risk breakdown */
    assetRisks: Array<{
      symbol: string;
      riskScore: number;
      contribution: number;
      correlation: number;
      volatility: number;
      beta: number;
    }>;
    /** Recommendations */
    recommendations: Array<{
      type: 'rebalance' | 'hedge' | 'reduce_position' | 'diversify' | 'exit';
      symbol?: string;
      action: string;
      reasoning: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      impact: number;
    }>;
    /** Stress test results */
    stressTests?: Array<{
      scenario: string;
      description: string;
      portfolioImpact: number;
      worstAsset: string;
      worstAssetImpact: number;
    }>;
    /** AI analysis details */
    analysis?: AIAnalysisResult;
  };
  /** Error message if failed */
  error?: string;
  /** Assessment metadata */
  metadata?: {
    assessmentTime: number;
    dataPoints: number;
    modelVersion: string;
    timestamp: number;
  };
}

// =============================================================================
// Trading Tools Types
// =============================================================================

/**
 * Trading Tools Request
 */
export interface TradingToolsRequest {
  /** Tool type */
  toolType:
    | 'position_sizer'
    | 'risk_calculator'
    | 'profit_target'
    | 'stop_loss'
    | 'entry_optimizer';
  /** Trading symbol */
  symbol: string & MinLen<1>;
  /** Current market data */
  marketData: {
    price: number & Min<0>;
    volume?: number & Min<0>;
    bid?: number & Min<0>;
    ask?: number & Min<0>;
    spread?: number & Min<0>;
  };
  /** Tool-specific parameters */
  parameters?: {
    /** Account balance for position sizing */
    accountBalance?: number & Min<0>;
    /** Risk per trade (%) */
    riskPerTrade?: number & Min<0.1> & Max<50>;
    /** Stop loss price */
    stopLoss?: number & Min<0>;
    /** Take profit price */
    takeProfit?: number & Min<0>;
    /** Entry price */
    entryPrice?: number & Min<0>;
    /** Position side */
    side?: 'long' | 'short';
    /** Leverage */
    leverage?: number & Min<1> & Max<125>;
    /** Order type */
    orderType?: 'market' | 'limit' | 'stop' | 'stop_limit';
  };
}

/**
 * Trading Tools Response
 */
export interface TradingToolsResponse {
  /** Whether calculation succeeded */
  success: boolean;
  /** Tool result data */
  data?: {
    /** Position sizing results */
    positionSizing?: {
      recommendedQuantity: number;
      positionValue: number;
      riskAmount: number;
      riskPercentage: number;
      leverage: number;
    };
    /** Risk calculations */
    riskCalculation?: {
      stopLossDistance: number;
      riskRewardRatio: number;
      potentialLoss: number;
      potentialProfit: number;
      breakEvenPrice: number;
    };
    /** Entry optimization */
    entryOptimization?: {
      recommendedEntry: number;
      supportLevels: number[];
      resistanceLevels: number[];
      volumeProfile: Array<{
        price: number;
        volume: number;
      }>;
    };
    /** Trading recommendations */
    recommendations: Array<{
      tool: string;
      recommendation: string;
      confidence: number;
      reasoning: string;
    }>;
  };
  /** Error message if failed */
  error?: string;
  /** Tool metadata */
  metadata?: {
    toolType: string;
    calculationTime: number;
    timestamp: number;
  };
}
