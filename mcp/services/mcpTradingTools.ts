/**
 * MCP Trading Tools Service (Task #28)
 * AI-enhanced trading tools with position sizing, technical analysis, and market conditions
 */

import { z } from 'zod';
import { geminiAnalyzer } from '../../ai/gemini-analyzer';
import { geminiClient } from '../../ai/gemini-client';
import { handleAIError, retryWithBackoff } from '../../shared/errors';

/**
 * Trading Tools Request Interface
 */
export interface TradingToolsAnalysisRequest {
  action:
    | 'position_sizing'
    | 'stop_loss'
    | 'take_profit'
    | 'risk_reward'
    | 'technical_analysis'
    | 'market_conditions';
  symbol: string;
  accountBalance?: number;
  riskPerTrade?: number;
  entryPrice?: number;
  currentPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  positionSize?: number;
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  timeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  marketVolatility?: number;
  priceHistory?: number[];
  volume?: number;
  indicators?: {
    rsi?: number;
    macd?: number;
    bollinger?: { upper: number; middle: number; lower: number };
  };
  marketData?: {
    volatilityIndex?: number;
    tradingVolume?: number;
    openInterest?: number;
    fundingRate?: number;
  };
}

/**
 * Trading Tools Response Interface
 */
export interface TradingToolsAnalysisResponse {
  success: boolean;
  toolType?: string;
  confidence?: number;
  positionSizing?: {
    recommendedSize: number;
    riskAmount: number;
    riskPercentage: number;
    leverageRecommendation: number;
  };
  riskManagement?: {
    stopLossPrice: number;
    takeProfitPrice: number;
    riskRewardRatio: number;
    riskAmount?: number;
    potentialProfit?: number;
  };
  technicalAnalysis?: {
    trendDirection: 'bullish' | 'bearish' | 'neutral' | 'sideways';
    strength: number;
    signals: Array<{
      type: string;
      strength: number;
      description: string;
    }>;
    supportLevels: number[];
    resistanceLevels: number[];
    timeframeBias?: string;
  };
  marketConditions?: {
    sentiment: 'bullish' | 'bearish' | 'neutral';
    volatilityLevel: 'low' | 'medium' | 'high' | 'extreme';
    liquidityScore: number;
    trendStrength: number;
    timeframeBias: string;
  };
  recommendations?: Array<{
    type: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    expectedImpact?: string;
  }>;
  mexcAdvantages?: {
    feeSavingsImpact?: number;
    leverageOpportunities?: Array<{
      symbol: string;
      recommendedLeverage: number;
      expectedBoost: number;
    }>;
  };
  error?: string;
  modelVersion?: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUSD?: number;
  };
}

/**
 * Analysis depth configuration
 */
interface AnalysisDepthConfig {
  depth: 'quick' | 'standard' | 'comprehensive' | 'deep';
  temperature: number;
  maxTokens: number;
  cacheTTLMinutes: number;
}

/**
 * Get analysis configuration based on depth level
 */
function getAnalysisDepthConfig(depth: string): AnalysisDepthConfig {
  const depthConfigs: Record<string, AnalysisDepthConfig> = {
    quick: {
      depth: 'quick',
      temperature: 0.3,
      maxTokens: 2048,
      cacheTTLMinutes: 2,
    },
    standard: {
      depth: 'standard',
      temperature: 0.5,
      maxTokens: 4096,
      cacheTTLMinutes: 5,
    },
    comprehensive: {
      depth: 'comprehensive',
      temperature: 0.7,
      maxTokens: 6144,
      cacheTTLMinutes: 10,
    },
    deep: {
      depth: 'deep',
      temperature: 0.9,
      maxTokens: 8192,
      cacheTTLMinutes: 15,
    },
  };

  return depthConfigs[depth] || depthConfigs.standard;
}

/**
 * Trading Tools Service
 */
export const mcpTradingToolsService = {
  /**
   * Perform AI-enhanced trading tools analysis
   */
  async performTradingToolsAnalysis(
    data: TradingToolsAnalysisRequest,
    analysisDepth: 'quick' | 'standard' | 'comprehensive' | 'deep' = 'standard'
  ): Promise<TradingToolsAnalysisResponse> {
    try {
      const depthConfig = getAnalysisDepthConfig(analysisDepth);

      // Validate input data
      if (!data.symbol || typeof data.symbol !== 'string' || data.symbol.trim() === '') {
        return {
          success: false,
          error: 'Symbol is required and must be a non-empty string',
        };
      }

      if (!data.action) {
        return {
          success: false,
          error: 'Action is required',
        };
      }

      // Return mock data in test mode to prevent API calls
      if (
        process.env.NODE_ENV === 'test' ||
        process.env.AI_TEST_MODE === 'true' ||
        process.env.DISABLE_AI_API_CALLS === 'true'
      ) {
        return {
          success: true,
          toolType: data.action,
          confidence: 0.8,
          positionSizing:
            data.action === 'position_sizing'
              ? {
                  recommendedSize: 0.02,
                  maxSize: 0.05,
                  riskPercentage: 0.02,
                  reasoning: 'Moderate position size based on account balance and risk tolerance',
                }
              : undefined,
          riskManagement: {
            stopLoss: data.entryPrice ? data.entryPrice * 0.95 : 0,
            takeProfit: data.entryPrice ? data.entryPrice * 1.1 : 0,
            riskRewardRatio: 2.0,
            maxRiskPercentage: 0.02,
            recommendations: ['Set stop-loss at 5% below entry', 'Target 10% profit'],
          },
          technicalAnalysis:
            data.action === 'technical_analysis'
              ? {
                  signal: 'neutral',
                  strength: 0.6,
                  indicators: {
                    rsi: 50,
                    macd: 'neutral',
                    support: data.currentPrice ? data.currentPrice * 0.95 : 0,
                    resistance: data.currentPrice ? data.currentPrice * 1.05 : 0,
                  },
                  recommendation: 'Monitor for clear breakout signals',
                }
              : undefined,
          marketConditions:
            data.action === 'market_conditions'
              ? {
                  volatility: 'medium',
                  trend: 'sideways',
                  volume: 'average',
                  sentiment: 'neutral',
                  tradingAdvice: 'Wait for clearer market direction',
                }
              : undefined,
          recommendations: [
            {
              type: 'position_management',
              priority: 'medium',
              description: 'Implement proper risk management for this trade',
            },
          ],
          mexcAdvantages: {
            feeSavings: '0.1% trading fee advantage',
            leverageOptions:
              data.action === 'position_sizing' ? 'Up to 10x leverage available' : undefined,
          },
          modelVersion: 'gemini-2.5-flash-preview-05-20',
          tokenUsage: {
            promptTokens: 150,
            completionTokens: 100,
            totalTokens: 250,
            estimatedCostUSD: 0.0001875,
          },
        };
      }

      // Configure analyzer for trading tools analysis
      geminiAnalyzer.updateConfig({
        temperature: depthConfig.temperature,
        maxTokensPerRequest: depthConfig.maxTokens,
        cacheTTLMinutes: depthConfig.cacheTTLMinutes,
      });

      // Build comprehensive prompt based on action type
      const prompt = this.buildTradingToolsPrompt(data, analysisDepth);
      const schema = this.getTradingToolsSchema(data.action);

      // Perform trading tools analysis with retry logic
      const result = await retryWithBackoff(
        async () => {
          return await geminiClient.generateObject(prompt, schema, `Trading Tools: ${data.action}`);
        },
        {
          shouldRetry: true,
          maxRetries: analysisDepth === 'quick' ? 1 : analysisDepth === 'deep' ? 5 : 3,
          retryDelayMs: analysisDepth === 'quick' ? 500 : 1000,
          backoffStrategy: 'exponential',
        }
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Enhance results with MEXC-specific optimizations
      const enhancedResult = await this.enhanceTradingToolsWithMEXC(result.data, data);

      return {
        success: true,
        toolType: data.action,
        ...enhancedResult,
        modelVersion: 'gemini-2.5-flash-preview-05-20',
        tokenUsage: result.usage
          ? {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
              estimatedCostUSD: (result.usage.totalTokens / 1_000_000) * 0.00075,
            }
          : undefined,
      };
    } catch (error) {
      return handleAIError(error as Error, 'trading_tools', {
        success: false,
        error: 'Trading tools analysis failed',
        toolType: data.action,
        confidence: 0,
        recommendations: [
          {
            type: 'manual_analysis',
            priority: 'high',
            description: 'Manual trading analysis recommended due to system error',
            expectedImpact: 'Unknown - system error occurred',
          },
        ],
      });
    }
  },

  /**
   * Build trading tools analysis prompt based on action type
   */
  buildTradingToolsPrompt(data: TradingToolsAnalysisRequest, analysisDepth: string): string {
    const baseInfo = `
Trading Tool Analysis Request:
- Action: ${data.action}
- Symbol: ${data.symbol}
- Analysis Depth: ${analysisDepth}
- Timeframe: ${data.timeframe || '1h'}
${data.currentPrice ? `- Current Price: $${data.currentPrice}` : ''}
${data.accountBalance ? `- Account Balance: $${data.accountBalance}` : ''}
`;

    switch (data.action) {
      case 'position_sizing':
        return `${baseInfo}
- Risk Per Trade: ${(data.riskPerTrade || 0.02) * 100}%
- Entry Price: $${data.entryPrice || data.currentPrice}
${data.stopLossPrice ? `- Stop Loss: $${data.stopLossPrice}` : ''}
${data.marketVolatility ? `- Market Volatility: ${data.marketVolatility}` : ''}

Please calculate optimal position sizing considering:
1. Account balance and risk management
2. Volatility-adjusted position size
3. Recommended leverage (considering MEXC's up to 125x leverage)
4. Stop loss and take profit levels
5. Risk-reward ratio optimization
6. MEXC's 0% trading fees advantage

Provide detailed position sizing recommendations with clear risk management strategy.`;

      case 'technical_analysis':
        return `${baseInfo}
${data.priceHistory ? `- Price History: [${data.priceHistory.join(', ')}]` : ''}
${data.volume ? `- Volume: ${data.volume}` : ''}
${data.indicators ? `- Technical Indicators: ${JSON.stringify(data.indicators)}` : ''}

Please perform comprehensive technical analysis including:
1. Trend direction and strength assessment
2. Support and resistance level identification
3. Technical indicator analysis (RSI, MACD, Bollinger Bands)
4. Chart pattern recognition
5. Entry and exit signal generation
6. Risk assessment for the current setup
7. Timeframe-specific bias and recommendations

Focus on actionable trading signals with clear entry/exit criteria.`;

      case 'market_conditions':
        return `${baseInfo}
${data.marketData ? `- Market Data: ${JSON.stringify(data.marketData)}` : ''}

Please assess current market conditions including:
1. Market sentiment analysis (bullish/bearish/neutral)
2. Volatility level assessment
3. Liquidity conditions
4. Trend strength and direction
5. Risk-on vs risk-off environment
6. Optimal trading strategies for current conditions
7. Market cycle phase analysis

Provide comprehensive market outlook with trading strategy recommendations.`;

      case 'stop_loss':
        return `${baseInfo}
- Entry Price: $${data.entryPrice}
- Position Size: ${data.positionSize || 'TBD'}
- Risk Tolerance: ${data.riskTolerance || 'moderate'}

Please calculate optimal stop loss levels considering:
1. Technical support/resistance levels
2. Volatility-based stops (ATR)
3. Risk tolerance alignment
4. Position size optimization
5. Take profit level recommendations
6. Risk-reward ratio analysis

Provide multiple stop loss strategies with pros/cons for each.`;

      case 'take_profit':
        return `${baseInfo}
- Entry Price: $${data.entryPrice}
- Stop Loss: $${data.stopLossPrice}
- Position Size: ${data.positionSize || 'TBD'}

Please calculate optimal take profit levels considering:
1. Technical resistance levels
2. Risk-reward ratio optimization (minimum 2:1)
3. Market volatility factors
4. Trend strength assessment
5. Multiple take profit strategies
6. Profit maximization techniques

Provide detailed take profit strategy with scaling options.`;

      case 'risk_reward':
        return `${baseInfo}
- Entry Price: $${data.entryPrice}
- Stop Loss: $${data.stopLossPrice}
- Take Profit: $${data.takeProfitPrice}
- Position Size: ${data.positionSize}

Please calculate comprehensive risk-reward analysis:
1. Risk-reward ratio calculation
2. Win rate requirements for profitability
3. Expected value analysis
4. Position sizing optimization
5. Trade quality assessment
6. Alternative scenarios and adjustments

Provide detailed risk-reward breakdown with recommendations.`;

      default:
        return `${baseInfo}
Please provide comprehensive trading analysis for the ${data.action} request with actionable insights and recommendations.`;
    }
  },

  /**
   * Get Zod schema for trading tools analysis based on action type
   */
  getTradingToolsSchema(action: string) {
    const baseSchema = {
      confidence: z.number().min(0).max(1),
      recommendations: z.array(
        z.object({
          type: z.string(),
          priority: z.enum(['low', 'medium', 'high']),
          description: z.string(),
          expectedImpact: z.string().optional(),
        })
      ),
    };

    switch (action) {
      case 'position_sizing':
        return z.object({
          ...baseSchema,
          positionSizing: z.object({
            recommendedSize: z.number().min(0),
            riskAmount: z.number().min(0),
            riskPercentage: z.number().min(0).max(1),
            leverageRecommendation: z.number().min(1).max(125),
          }),
          riskManagement: z.object({
            stopLossPrice: z.number().min(0),
            takeProfitPrice: z.number().min(0),
            riskRewardRatio: z.number().min(0),
          }),
        });

      case 'technical_analysis':
        return z.object({
          ...baseSchema,
          technicalAnalysis: z.object({
            trendDirection: z.enum(['bullish', 'bearish', 'neutral', 'sideways']),
            strength: z.number().min(0).max(1),
            signals: z.array(
              z.object({
                type: z.string(),
                strength: z.number().min(0).max(1),
                description: z.string(),
              })
            ),
            supportLevels: z.array(z.number()),
            resistanceLevels: z.array(z.number()),
            timeframeBias: z.string().optional(),
          }),
        });

      case 'market_conditions':
        return z.object({
          ...baseSchema,
          marketConditions: z.object({
            sentiment: z.enum(['bullish', 'bearish', 'neutral']),
            volatilityLevel: z.enum(['low', 'medium', 'high', 'extreme']),
            liquidityScore: z.number().min(0).max(1),
            trendStrength: z.number().min(0).max(1),
            timeframeBias: z.string(),
          }),
        });

      case 'stop_loss':
      case 'take_profit':
      case 'risk_reward':
        return z.object({
          ...baseSchema,
          riskManagement: z.object({
            stopLossPrice: z.number().min(0),
            takeProfitPrice: z.number().min(0),
            riskRewardRatio: z.number().min(0),
            riskAmount: z.number().min(0).optional(),
            potentialProfit: z.number().min(0).optional(),
          }),
        });

      default:
        return z.object(baseSchema);
    }
  },

  /**
   * Enhance trading tools results with MEXC-specific features
   */
  async enhanceTradingToolsWithMEXC(
    analysisResult: Record<string, unknown>,
    originalData: TradingToolsAnalysisRequest
  ): Promise<Record<string, unknown>> {
    try {
      // Calculate MEXC advantages
      const mexcAdvantages: Record<string, unknown> = {};

      // Fee savings impact (0% fees on MEXC)
      if (originalData.positionSize && originalData.currentPrice) {
        const tradingValue = originalData.positionSize * originalData.currentPrice;
        mexcAdvantages.feeSavingsImpact = tradingValue * 0.001; // Assume 0.1% fee savings vs other exchanges
      }

      // Leverage opportunities (MEXC offers up to 125x leverage)
      if (originalData.action === 'position_sizing' && analysisResult.positionSizing) {
        mexcAdvantages.leverageOpportunities = [
          {
            symbol: originalData.symbol,
            recommendedLeverage: Math.min(
              analysisResult.positionSizing.leverageRecommendation || 1,
              125
            ),
            expectedBoost: (analysisResult.positionSizing.leverageRecommendation || 1) * 0.1,
          },
        ];
      }

      return {
        ...analysisResult,
        mexcAdvantages: Object.keys(mexcAdvantages).length > 0 ? mexcAdvantages : undefined,
      };
    } catch (error) {
      console.warn('Failed to enhance trading tools with MEXC advantages:', error);
      return analysisResult;
    }
  },
};
