# Usage Examples

This document provides comprehensive usage examples for all AI-enhanced features in the MEXC MCP server, demonstrating practical implementations and best practices.

## Getting Started

### Basic Setup and Initialization

```typescript
import { mcpIntegrationService } from './mcp/services/mcpIntegration';
import type { 
  AIMarketAnalysisRequest, 
  StrategyOptimizerRequest,
  TradingToolsRequest,
  RiskAssessmentRequest 
} from './shared/types/mcp-integration-types';

// Initialize and check AI service health
async function initializeAIServices() {
  try {
    const healthCheck = await mcpIntegrationService.getHealthStatus();
    
    if (healthCheck.success && healthCheck.data.overall.status === 'OK') {
      console.log('AI services initialized successfully');
      console.log(`Health Score: ${healthCheck.data.overall.healthScore}/100`);
      return true;
    } else {
      console.error('AI services unhealthy:', healthCheck.data.overall.recommendations);
      return false;
    }
  } catch (error) {
    console.error('Failed to initialize AI services:', error);
    return false;
  }
}

// Usage
const isReady = await initializeAIServices();
if (!isReady) {
  process.exit(1);
}
```

## Market Analysis Examples

### Basic Sentiment Analysis

```typescript
async function performSentimentAnalysis(symbol: string, price: number) {
  const request: AIMarketAnalysisRequest = {
    symbol,
    analysisType: 'sentiment',
    depth: 'standard',
    price,
    parameters: {
      temperature: 0.7,
      maxTokens: 2048,
      includeConfidenceIntervals: true,
      contextWindowHours: 12
    }
  };

  try {
    const result = await mcpIntegrationService.aiMarketAnalysis(request);
    
    if (result.success && result.data) {
      console.log(`Sentiment Analysis for ${symbol}:`);
      console.log(`- Sentiment: ${result.data.sentiment}`);
      console.log(`- Confidence: ${(result.data.confidence * 100).toFixed(1)}%`);
      console.log(`- Score: ${result.data.score}`);
      console.log(`- Reasoning: ${result.data.reasoning}`);
      
      if (result.data.recommendations) {
        console.log('Recommendations:');
        result.data.recommendations.forEach((rec, index) => {
          console.log(`  ${index + 1}. ${rec.action} (${(rec.confidence * 100).toFixed(1)}% confidence)`);
          console.log(`     ${rec.reasoning}`);
        });
      }
      
      return result.data;
    } else {
      throw new Error(result.error || 'Analysis failed');
    }
  } catch (error) {
    console.error('Sentiment analysis failed:', error);
    throw error;
  }
}

// Usage example
const btcSentiment = await performSentimentAnalysis('BTCUSDT', 45000);
```

### Comprehensive Technical Analysis

```typescript
async function performTechnicalAnalysis(symbol: string, ohlcvData: any[]) {
  const request: AIMarketAnalysisRequest = {
    symbol,
    analysisType: 'technical',
    depth: 'comprehensive',
    ohlcv: ohlcvData,
    parameters: {
      temperature: 0.5,
      maxTokens: 4096,
      contextWindowHours: 24
    }
  };

  try {
    const result = await mcpIntegrationService.aiMarketAnalysis(request);
    
    if (result.success && result.data) {
      console.log(`Technical Analysis for ${symbol}:`);
      console.log(`- Trend Direction: ${result.data.trendDirection}`);
      console.log(`- Strength: ${(result.data.strength * 100).toFixed(1)}%`);
      
      if (result.data.signals) {
        console.log('Technical Signals:');
        result.data.signals.forEach(signal => {
          console.log(`  - ${signal.type}: ${signal.signal} (${(signal.strength * 100).toFixed(1)}%)`);
        });
      }
      
      if (result.data.supportLevels && result.data.resistanceLevels) {
        console.log(`Support Levels: ${result.data.supportLevels.join(', ')}`);
        console.log(`Resistance Levels: ${result.data.resistanceLevels.join(', ')}`);
      }
      
      return result.data;
    }
  } catch (error) {
    console.error('Technical analysis failed:', error);
    throw error;
  }
}

// Usage with sample OHLCV data
const ohlcvData = [
  { open: 44800, high: 45200, low: 44600, close: 45000, volume: 1000000, timestamp: Date.now() - 86400000 },
  { open: 45000, high: 45400, low: 44900, close: 45200, volume: 1200000, timestamp: Date.now() - 43200000 },
  { open: 45200, high: 45600, low: 45100, close: 45500, volume: 900000, timestamp: Date.now() }
];

const technicalAnalysis = await performTechnicalAnalysis('BTCUSDT', ohlcvData);
```

### Multi-Analysis for Comprehensive Insights

```typescript
async function performMultiAnalysis(symbol: string, price: number, volume: number) {
  const request = {
    symbol,
    analysisTypes: ['sentiment', 'technical', 'risk'] as const,
    depth: 'comprehensive' as const,
    price,
    volume,
    marketData: {
      volatility: 0.15,
      volume24h: volume * 24,
      marketCap: price * 19000000 // Approximate for BTC
    }
  };

  try {
    const result = await mcpIntegrationService.performMultiAnalysis(request);
    
    if (result.success && result.data) {
      console.log(`Multi-Analysis Results for ${symbol}:`);
      
      // Process sentiment analysis
      if (result.data.sentiment?.success) {
        console.log(`\n📊 Sentiment: ${result.data.sentiment.sentiment} (${(result.data.sentiment.confidence * 100).toFixed(1)}%)`);
      }
      
      // Process technical analysis
      if (result.data.technical?.success) {
        console.log(`📈 Technical: ${result.data.technical.trendDirection} trend (${(result.data.technical.confidence * 100).toFixed(1)}%)`);
      }
      
      // Process risk analysis
      if (result.data.risk?.success) {
        console.log(`⚠️ Risk Level: ${result.data.risk.riskLevel} (Score: ${result.data.risk.riskScore})`);
      }
      
      return result.data;
    }
  } catch (error) {
    console.error('Multi-analysis failed:', error);
    throw error;
  }
}

// Usage
const comprehensiveAnalysis = await performMultiAnalysis('ETHUSDT', 2400, 500000);
```

## Strategy Optimization Examples

### Basic Portfolio Optimization

```typescript
async function optimizePortfolio(portfolioAssets: any[]) {
  const request: StrategyOptimizerRequest = {
    portfolio: portfolioAssets.map(asset => ({
      symbol: asset.symbol,
      allocation: asset.currentWeight,
      historicalReturns: asset.returns || []
    })),
    objectiveFunction: 'sharpe_ratio',
    constraints: {
      maxRisk: 0.15,
      minReturn: 0.08,
      maxPositionSize: 0.4,
      minPositionSize: 0.05
    },
    timeHorizon: 'medium',
    rebalanceFrequency: 'monthly'
  };

  try {
    const result = await mcpIntegrationService.strategyOptimizer(request);
    
    if (result.success && result.data) {
      console.log('Portfolio Optimization Results:');
      console.log(`- Optimization Type: ${result.data.optimizationType}`);
      console.log(`- Confidence: ${(result.data.confidence * 100).toFixed(1)}%`);
      console.log(`- Expected Return: ${(result.data.optimizedMetrics.expectedReturn * 100).toFixed(2)}%`);
      console.log(`- Volatility: ${(result.data.optimizedMetrics.volatility * 100).toFixed(2)}%`);
      console.log(`- Sharpe Ratio: ${result.data.optimizedMetrics.sharpeRatio.toFixed(3)}`);
      
      console.log('\nOptimized Allocations:');
      result.data.allocations.forEach(allocation => {
        const change = allocation.adjustment >= 0 ? '+' : '';
        console.log(`  ${allocation.symbol}: ${(allocation.currentWeight * 100).toFixed(1)}% → ${(allocation.optimizedWeight * 100).toFixed(1)}% (${change}${(allocation.adjustment * 100).toFixed(1)}%)`);
        console.log(`    Reasoning: ${allocation.reasoning}`);
      });
      
      if (result.data.recommendations) {
        console.log('\nRecommendations:');
        result.data.recommendations.forEach((rec, index) => {
          console.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.description}`);
          if (rec.expectedImpact) {
            console.log(`     Expected Impact: ${rec.expectedImpact}`);
          }
        });
      }
      
      return result.data;
    }
  } catch (error) {
    console.error('Portfolio optimization failed:', error);
    throw error;
  }
}

// Usage example
const portfolio = [
  { symbol: 'BTCUSDT', currentWeight: 0.5, returns: [0.02, -0.01, 0.03, 0.01] },
  { symbol: 'ETHUSDT', currentWeight: 0.3, returns: [0.03, -0.02, 0.04, 0.02] },
  { symbol: 'ADAUSDT', currentWeight: 0.2, returns: [0.01, -0.01, 0.02, 0.01] }
];

const optimizationResult = await optimizePortfolio(portfolio);
```

### MEXC-Specific Optimization with Zero Fees

```typescript
async function optimizeWithMEXCFeatures(portfolio: any[]) {
  const request: StrategyOptimizerRequest = {
    portfolio,
    objectiveFunction: 'max_return',
    constraints: {
      maxRisk: 0.20,
      minReturn: 0.12,
      maxDrawdown: 0.15
    },
    timeHorizon: 'long',
    rebalanceFrequency: 'weekly',
    mexcParameters: {
      utilize0Fees: true,      // Leverage MEXC's 0% fee advantage
      considerLeverage: true,   // Consider leverage opportunities
      maxLeverage: 10          // Maximum leverage ratio
    }
  };

  try {
    const result = await mcpIntegrationService.strategyOptimizer(request);
    
    if (result.success && result.data) {
      console.log('MEXC-Optimized Strategy Results:');
      
      // Display MEXC-specific advantages
      if (result.data.mexcAdvantages) {
        console.log('\n🎯 MEXC Advantages:');
        if (result.data.mexcAdvantages.feeSavingsUSD) {
          console.log(`  💰 Fee Savings: $${result.data.mexcAdvantages.feeSavingsUSD.toFixed(2)} annually`);
        }
        
        if (result.data.mexcAdvantages.leverageOpportunities) {
          console.log('  📈 Leverage Opportunities:');
          result.data.mexcAdvantages.leverageOpportunities.forEach(opp => {
            console.log(`    - ${opp.symbol}: ${opp.recommendedLeverage}x leverage (${(opp.expectedBoost * 100).toFixed(2)}% boost)`);
          });
        }
      }
      
      return result.data;
    }
  } catch (error) {
    console.error('MEXC optimization failed:', error);
    throw error;
  }
}
```

## Trading Tools Examples

### Position Sizing Calculator

```typescript
async function calculatePositionSize(
  symbol: string, 
  accountBalance: number, 
  riskPerTrade: number,
  entryPrice: number,
  stopLossPrice: number
) {
  const request: TradingToolsRequest = {
    action: 'position_sizing',
    symbol,
    accountBalance,
    riskPerTrade,
    entryPrice,
    currentPrice: entryPrice,
    stopLossPrice,
    riskTolerance: 'moderate',
    timeframe: '4h'
  };

  try {
    const result = await mcpIntegrationService.tradingTools(request);
    
    if (result.success && result.data) {
      const positioning = result.data.positionSizing;
      
      console.log(`Position Sizing for ${symbol}:`);
      console.log(`- Account Balance: $${accountBalance.toLocaleString()}`);
      console.log(`- Risk per Trade: ${(riskPerTrade * 100).toFixed(1)}%`);
      console.log(`- Risk Amount: $${positioning.riskAmount.toFixed(2)}`);
      console.log(`- Recommended Size: ${positioning.recommendedSize.toFixed(4)} ${symbol.replace('USDT', '')}`);
      console.log(`- Suggested Leverage: ${positioning.leverageRecommendation}x`);
      
      if (result.data.riskManagement) {
        const risk = result.data.riskManagement;
        console.log(`\nRisk Management:`);
        console.log(`- Stop Loss: $${risk.stopLossPrice.toFixed(2)}`);
        console.log(`- Take Profit: $${risk.takeProfitPrice?.toFixed(2) || 'Not set'}`);
        console.log(`- Risk/Reward Ratio: ${risk.riskRewardRatio.toFixed(2)}`);
        console.log(`- Potential Profit: $${risk.potentialProfit?.toFixed(2) || 'N/A'}`);
      }
      
      return result.data;
    }
  } catch (error) {
    console.error('Position sizing calculation failed:', error);
    throw error;
  }
}

// Usage
const positionData = await calculatePositionSize(
  'BTCUSDT',
  10000,    // $10k account
  0.02,     // 2% risk per trade
  45000,    // Entry price
  44000     // Stop loss price
);
```

### Technical Analysis with Trading Signals

```typescript
async function getTechnicalSignals(
  symbol: string, 
  currentPrice: number,
  indicators: any,
  timeframe: string = '1h'
) {
  const request: TradingToolsRequest = {
    action: 'technical_analysis',
    symbol,
    currentPrice,
    timeframe,
    indicators,
    analysisDepth: 'comprehensive'
  };

  try {
    const result = await mcpIntegrationService.tradingTools(request);
    
    if (result.success && result.data) {
      const technical = result.data.technicalAnalysis;
      
      console.log(`Technical Analysis for ${symbol} (${timeframe}):`);
      console.log(`- Trend Direction: ${technical.trendDirection}`);
      console.log(`- Trend Strength: ${(technical.strength * 100).toFixed(1)}%`);
      console.log(`- Timeframe Bias: ${technical.timeframeBias}`);
      
      if (technical.signals) {
        console.log('\nTechnical Signals:');
        technical.signals.forEach(signal => {
          const strength = signal.strength ? ` (${(signal.strength * 100).toFixed(1)}%)` : '';
          console.log(`  📊 ${signal.type}${strength}: ${signal.description}`);
        });
      }
      
      if (technical.supportLevels && technical.resistanceLevels) {
        console.log(`\n📉 Support Levels: ${technical.supportLevels.map(l => `$${l.toFixed(2)}`).join(', ')}`);
        console.log(`📈 Resistance Levels: ${technical.resistanceLevels.map(l => `$${l.toFixed(2)}`).join(', ')}`);
      }
      
      return result.data;
    }
  } catch (error) {
    console.error('Technical analysis failed:', error);
    throw error;
  }
}

// Usage with indicators
const indicators = {
  rsi: 65,
  macd: 120,
  bollinger: {
    upper: 46000,
    middle: 45000,
    lower: 44000
  }
};

const technicalSignals = await getTechnicalSignals('BTCUSDT', 45200, indicators, '4h');
```

### Market Conditions Assessment

```typescript
async function assessMarketConditions(symbol: string, marketData: any) {
  const request: TradingToolsRequest = {
    action: 'market_conditions',
    symbol,
    marketData,
    analysisDepth: 'standard'
  };

  try {
    const result = await mcpIntegrationService.tradingTools(request);
    
    if (result.success && result.data) {
      const conditions = result.data.marketConditions;
      
      console.log(`Market Conditions for ${symbol}:`);
      console.log(`- Overall Sentiment: ${conditions.sentiment}`);
      console.log(`- Volatility Level: ${conditions.volatilityLevel}`);
      console.log(`- Liquidity Score: ${(conditions.liquidityScore * 100).toFixed(1)}%`);
      console.log(`- Trend Strength: ${(conditions.trendStrength * 100).toFixed(1)}%`);
      console.log(`- Timeframe Bias: ${conditions.timeframeBias}`);
      
      return result.data;
    }
  } catch (error) {
    console.error('Market conditions assessment failed:', error);
    throw error;
  }
}

// Usage
const marketConditions = await assessMarketConditions('ETHUSDT', {
  volatilityIndex: 25,
  tradingVolume: 1000000,
  openInterest: 500000,
  fundingRate: 0.0001
});
```

## Risk Assessment Examples

### Portfolio Risk Analysis

```typescript
async function analyzePortfolioRisk(
  portfolioHoldings: any[],
  totalValue: number,
  riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
) {
  const request: RiskAssessmentRequest = {
    portfolio: portfolioHoldings,
    totalValue,
    riskTolerance,
    timeHorizon: 'medium',
    marketContext: {
      marketSentiment: 'neutral',
      volatilityIndex: 30,
      economicIndicators: {
        inflationRate: 0.03,
        interestRates: 0.05
      }
    },
    analysisDepth: 'comprehensive'
  };

  try {
    const result = await mcpIntegrationService.riskAssessment(request);
    
    if (result.success && result.data) {
      const riskData = result.data;
      
      console.log('Portfolio Risk Assessment:');
      console.log(`- Overall Risk Level: ${riskData.overallRiskLevel.toUpperCase()}`);
      console.log(`- Risk Score: ${riskData.riskScore}/100`);
      console.log(`- Confidence: ${(riskData.confidence * 100).toFixed(1)}%`);
      console.log(`- Diversification Score: ${(riskData.diversificationScore * 100).toFixed(1)}%`);
      
      console.log('\nVolatility Analysis:');
      console.log(`- Daily Volatility: ${(riskData.volatility.daily * 100).toFixed(2)}%`);
      console.log(`- Weekly Volatility: ${(riskData.volatility.weekly * 100).toFixed(2)}%`);
      console.log(`- Monthly Volatility: ${(riskData.volatility.monthly * 100).toFixed(2)}%`);
      
      if (riskData.riskFactors.length > 0) {
        console.log('\n⚠️ Risk Factors:');
        riskData.riskFactors.forEach(factor => {
          console.log(`  - ${factor.factor} (${factor.impact.toUpperCase()}): ${factor.description}`);
        });
      }
      
      if (riskData.assetAllocation.length > 0) {
        console.log('\n📊 Asset Allocation Risk:');
        riskData.assetAllocation.forEach(asset => {
          console.log(`  - ${asset.symbol}: ${asset.percentage.toFixed(1)}% (${asset.riskLevel} risk, ${(asset.riskContribution * 100).toFixed(1)}% contribution)`);
        });
      }
      
      if (riskData.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        riskData.recommendations.forEach(rec => {
          console.log(`  [${rec.priority.toUpperCase()}] ${rec.description}`);
          if (rec.target) {
            console.log(`    Target: ${rec.target}`);
          }
        });
      }
      
      if (riskData.stressTests) {
        console.log('\n🧪 Stress Test Scenarios:');
        riskData.stressTests.forEach(test => {
          console.log(`  - ${test.scenario}: ${(test.potentialLoss * 100).toFixed(1)}% loss (${(test.probability * 100).toFixed(1)}% probability)`);
        });
      }
      
      return result.data;
    }
  } catch (error) {
    console.error('Portfolio risk assessment failed:', error);
    throw error;
  }
}

// Usage example
const portfolio = [
  {
    symbol: 'BTCUSDT',
    quantity: 0.5,
    currentPrice: 45000,
    entryPrice: 44000,
    assetType: 'crypto'
  },
  {
    symbol: 'ETHUSDT', 
    quantity: 2.0,
    currentPrice: 2400,
    entryPrice: 2300,
    assetType: 'crypto'
  }
];

const riskAnalysis = await analyzePortfolioRisk(portfolio, 27300, 'moderate');
```

## Error Handling Examples

### Robust Error Handling with Retry Logic

```typescript
async function performAnalysisWithRetry<T>(
  analysisFunction: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}`);
      return await analysisFunction();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.message.includes('INVALID_API_KEY') || 
          error.message.includes('RATE_LIMIT_EXCEEDED')) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = delayMs * Math.pow(2, attempt - 1);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Analysis failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Usage with retry logic
async function robustMarketAnalysis(symbol: string) {
  return await performAnalysisWithRetry(async () => {
    return await mcpIntegrationService.aiMarketAnalysis({
      symbol,
      analysisType: 'sentiment',
      depth: 'standard'
    });
  }, 3, 1000);
}
```

### Graceful Degradation

```typescript
async function getMarketInsightsWithFallback(symbol: string, price: number) {
  try {
    // Try comprehensive AI analysis first
    const aiResult = await mcpIntegrationService.aiMarketAnalysis({
      symbol,
      analysisType: 'sentiment',
      depth: 'comprehensive',
      price
    });
    
    if (aiResult.success) {
      return {
        source: 'ai',
        confidence: aiResult.data.confidence,
        recommendation: aiResult.data.recommendations?.[0]?.action || 'hold',
        reasoning: aiResult.data.reasoning
      };
    }
  } catch (error) {
    console.warn('AI analysis failed, falling back to simple calculation:', error.message);
  }
  
  // Fallback to simple rule-based analysis
  const priceChange24h = 0.02; // Mock 24h change
  const simple_sentiment = priceChange24h > 0.05 ? 'bullish' : 
                          priceChange24h < -0.05 ? 'bearish' : 'neutral';
  
  return {
    source: 'fallback',
    confidence: 0.6,
    recommendation: simple_sentiment === 'bullish' ? 'buy' : 
                   simple_sentiment === 'bearish' ? 'sell' : 'hold',
    reasoning: `Simple rule-based analysis: ${(priceChange24h * 100).toFixed(2)}% 24h change`
  };
}

// Usage
const insights = await getMarketInsightsWithFallback('BTCUSDT', 45000);
console.log(`Source: ${insights.source}, Recommendation: ${insights.recommendation}`);
```

### Budget Monitoring and Alerts

```typescript
class AIBudgetMonitor {
  private dailyBudgetUSD: number;
  private currentSpend: number = 0;
  private alertThreshold: number = 0.8; // 80% of budget
  
  constructor(dailyBudgetUSD: number) {
    this.dailyBudgetUSD = dailyBudgetUSD;
  }
  
  async checkBudgetStatus() {
    try {
      const healthStatus = await mcpIntegrationService.getHealthStatus();
      
      if (healthStatus.success && healthStatus.data.geminiApi.budgetStatus) {
        const budget = healthStatus.data.geminiApi.budgetStatus;
        this.currentSpend = budget.costUSD;
        
        const utilizationRate = budget.utilizationPercentage;
        
        if (utilizationRate >= this.alertThreshold) {
          console.warn(`🚨 Budget Alert: ${(utilizationRate * 100).toFixed(1)}% of daily budget used`);
          console.warn(`Current spend: $${this.currentSpend.toFixed(2)} / $${this.dailyBudgetUSD}`);
          
          if (utilizationRate >= 0.95) {
            throw new Error('Daily budget nearly exhausted. Suspending AI operations.');
          }
        }
        
        return {
          budgetRemaining: this.dailyBudgetUSD - this.currentSpend,
          utilizationRate,
          isNearLimit: utilizationRate >= this.alertThreshold
        };
      }
    } catch (error) {
      console.error('Budget monitoring failed:', error);
      throw error;
    }
  }
  
  async performAnalysisWithBudgetCheck<T>(
    analysisFunction: () => Promise<T>
  ): Promise<T> {
    const budgetStatus = await this.checkBudgetStatus();
    
    if (budgetStatus.isNearLimit) {
      console.warn('Near budget limit, using quick analysis mode');
      // Could modify parameters to use less tokens
    }
    
    const result = await analysisFunction();
    
    // Re-check budget after operation
    await this.checkBudgetStatus();
    
    return result;
  }
}

// Usage
const budgetMonitor = new AIBudgetMonitor(10.00); // $10 daily budget

const monitoredAnalysis = await budgetMonitor.performAnalysisWithBudgetCheck(async () => {
  return await mcpIntegrationService.aiMarketAnalysis({
    symbol: 'ETHUSDT',
    analysisType: 'technical',
    depth: 'standard'
  });
});
```

## MCP Service Integration Examples

### Building a Custom Trading Bot

```typescript
class AITradingBot {
  private symbols: string[];
  private riskPerTrade: number = 0.02;
  private accountBalance: number;
  
  constructor(symbols: string[], accountBalance: number) {
    this.symbols = symbols;
    this.accountBalance = accountBalance;
  }
  
  async analyzeAndTrade(symbol: string) {
    try {
      // Step 1: Multi-analysis for comprehensive view
      const analysis = await mcpIntegrationService.performMultiAnalysis({
        symbol,
        analysisTypes: ['sentiment', 'technical', 'risk'],
        depth: 'comprehensive'
      });
      
      if (!analysis.success) {
        throw new Error(`Analysis failed for ${symbol}: ${analysis.error}`);
      }
      
      // Step 2: Check if all analyses are positive
      const sentimentBullish = analysis.data.sentiment?.sentiment === 'bullish';
      const technicalBullish = analysis.data.technical?.trendDirection === 'bullish';
      const riskAcceptable = analysis.data.risk?.riskLevel !== 'high';
      
      // Step 3: Calculate position size if conditions are met
      if (sentimentBullish && technicalBullish && riskAcceptable) {
        const currentPrice = 45000; // Would fetch from MEXC API
        const stopLossPrice = currentPrice * 0.98; // 2% stop loss
        
        const positionCalculation = await mcpIntegrationService.tradingTools({
          action: 'position_sizing',
          symbol,
          accountBalance: this.accountBalance,
          riskPerTrade: this.riskPerTrade,
          entryPrice: currentPrice,
          stopLossPrice,
          riskTolerance: 'moderate'
        });
        
        if (positionCalculation.success) {
          console.log(`🎯 Trading Signal for ${symbol}:`);
          console.log(`- Action: BUY`);
          console.log(`- Size: ${positionCalculation.data.positionSizing.recommendedSize}`);
          console.log(`- Stop Loss: $${positionCalculation.data.riskManagement.stopLossPrice}`);
          console.log(`- Risk Amount: $${positionCalculation.data.positionSizing.riskAmount}`);
          
          // Here you would place the actual trade via MEXC API
          return {
            action: 'buy',
            symbol,
            size: positionCalculation.data.positionSizing.recommendedSize,
            price: currentPrice,
            stopLoss: stopLossPrice
          };
        }
      } else {
        console.log(`❌ No trade signal for ${symbol}:`);
        console.log(`- Sentiment: ${analysis.data.sentiment?.sentiment || 'unknown'}`);
        console.log(`- Technical: ${analysis.data.technical?.trendDirection || 'unknown'}`);
        console.log(`- Risk: ${analysis.data.risk?.riskLevel || 'unknown'}`);
      }
      
      return null;
    } catch (error) {
      console.error(`Trading analysis failed for ${symbol}:`, error);
      return null;
    }
  }
  
  async runTradingCycle() {
    console.log('🤖 Starting AI Trading Cycle...');
    
    // Check AI service health first
    const health = await mcpIntegrationService.getHealthStatus();
    if (!health.success || health.data.overall.status !== 'OK') {
      console.error('AI services unhealthy, skipping trading cycle');
      return;
    }
    
    const trades = [];
    
    for (const symbol of this.symbols) {
      const trade = await this.analyzeAndTrade(symbol);
      if (trade) {
        trades.push(trade);
      }
      
      // Small delay between symbols to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ Trading cycle complete. Generated ${trades.length} trade signals.`);
    return trades;
  }
}

// Usage
const tradingBot = new AITradingBot(['BTCUSDT', 'ETHUSDT', 'ADAUSDT'], 10000);
const trades = await tradingBot.runTradingCycle();
```

### Real-time Portfolio Monitoring

```typescript
class PortfolioMonitor {
  private portfolio: any[];
  private monitoringInterval: number = 30000; // 30 seconds
  private isRunning: boolean = false;
  
  constructor(portfolio: any[]) {
    this.portfolio = portfolio;
  }
  
  async assessCurrentRisk() {
    const totalValue = this.portfolio.reduce((sum, asset) => 
      sum + (asset.quantity * asset.currentPrice), 0
    );
    
    const riskAssessment = await mcpIntegrationService.riskAssessment({
      portfolio: this.portfolio,
      totalValue,
      riskTolerance: 'moderate',
      timeHorizon: 'medium',
      analysisDepth: 'standard'
    });
    
    if (riskAssessment.success) {
      const risk = riskAssessment.data;
      
      console.log(`📊 Portfolio Risk Update:`);
      console.log(`- Risk Level: ${risk.overallRiskLevel}`);
      console.log(`- Risk Score: ${risk.riskScore}/100`);
      console.log(`- Value: $${totalValue.toLocaleString()}`);
      
      // Alert on high risk
      if (risk.overallRiskLevel === 'high' || risk.riskScore > 70) {
        console.warn('🚨 High risk detected in portfolio!');
        
        if (risk.recommendations.length > 0) {
          console.warn('Recommendations:');
          risk.recommendations.forEach(rec => {
            console.warn(`  - ${rec.description}`);
          });
        }
      }
      
      return risk;
    }
    
    return null;
  }
  
  async startMonitoring() {
    this.isRunning = true;
    console.log('🔄 Starting portfolio monitoring...');
    
    while (this.isRunning) {
      try {
        await this.assessCurrentRisk();
      } catch (error) {
        console.error('Portfolio monitoring error:', error);
      }
      
      // Wait for next interval
      await new Promise(resolve => setTimeout(resolve, this.monitoringInterval));
    }
  }
  
  stopMonitoring() {
    this.isRunning = false;
    console.log('⏹️ Portfolio monitoring stopped');
  }
}

// Usage
const monitor = new PortfolioMonitor([
  { symbol: 'BTCUSDT', quantity: 0.5, currentPrice: 45000 },
  { symbol: 'ETHUSDT', quantity: 2.0, currentPrice: 2400 }
]);

// Start monitoring (would run continuously)
// await monitor.startMonitoring();
```

These examples demonstrate comprehensive usage of the AI-enhanced MEXC MCP server, showing real-world applications, error handling, and integration patterns. Each example includes proper TypeScript typing, error handling, and follows the established patterns from the MCP service integration (Task #31).

## Next Steps

1. Review the [Testing Guide](./testing-guide.md) for comprehensive testing strategies
2. Check the [Configuration Setup Guide](./configuration-setup.md) for environment setup
3. Explore the [API Endpoints Documentation](./api-endpoints.md) for detailed API reference
4. Read the [AI Integration Guide](./ai-integration-guide.md) for architectural insights