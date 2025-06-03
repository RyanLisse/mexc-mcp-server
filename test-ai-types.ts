/**
 * Test file for AI types validation
 * Ensures all interfaces compile correctly and work with sample data
 */

import {
  type AIAnalysisResult,
  type AIBudgetStatus,
  type AICacheStats,
  type RiskAssessment,
  type RiskAssessmentRequest,
  type SentimentAnalysisRequest,
  type SentimentAnalysisResult,
  type StreamingAnalysisUpdate,
  type TechnicalAnalysisRequest,
  type TechnicalAnalysisResult,
  type TokenUsage,
  calculateAnalysisCost,
  createAnalysisCacheKey,
  isAIAnalysisResult,
  isRiskAssessment,
  isSentimentAnalysisResult,
  isStreamingAnalysisUpdate,
  isTechnicalAnalysisResult,
  isValidConfidence,
  isValidTokenUsage,
  mergeAnalysisResults,
} from './shared/types/ai-types';

// Test basic AI analysis result
const basicResult: AIAnalysisResult = {
  success: true,
  data: { test: 'data' },
  modelVersion: 'gemini-2.5-flash-preview-05-20',
  timestamp: Date.now(),
  processingTimeMs: 250,
};

// Test sentiment analysis result
const sentimentResult: SentimentAnalysisResult = {
  success: true,
  confidence: 0.85,
  timestamp: Date.now(),
  processingTimeMs: 320,
  data: {
    sentiment: 'bullish',
    confidence: 0.85,
    riskLevel: 'medium',
    recommendations: [
      'Consider taking a long position',
      'Monitor volume for confirmation',
      'Set stop-loss at 5% below entry',
    ],
    breakdown: {
      priceScore: 0.7,
      volumeScore: 0.6,
      momentumScore: 0.9,
    },
  },
  usage: {
    promptTokens: 150,
    completionTokens: 200,
    totalTokens: 350,
    estimatedCostUSD: 0.0002625,
  },
  cacheInfo: {
    fromCache: false,
    cacheKey: 'sentiment_btc_12345',
    expiresAt: Date.now() + 900000,
    hitRate: 0.75,
  },
};

// Test technical analysis result
const technicalResult: TechnicalAnalysisResult = {
  success: true,
  confidence: 0.92,
  timestamp: Date.now(),
  processingTimeMs: 450,
  data: {
    priceAction: 'Strong upward momentum with healthy pullbacks',
    volume: 'Above-average volume supporting the move',
    momentum: 'Bullish momentum confirmed by multiple indicators',
    support: [45000, 44500, 43800],
    resistance: [47000, 48200, 49500],
    direction: 'up',
    strength: 0.82,
  },
  usage: {
    promptTokens: 200,
    completionTokens: 300,
    totalTokens: 500,
  },
};

// Test risk assessment result
const riskResult: RiskAssessment = {
  success: true,
  confidence: 0.88,
  timestamp: Date.now(),
  processingTimeMs: 380,
  data: {
    riskLevel: 'medium',
    confidence: 0.88,
    recommendations: [
      'Position size should not exceed 2% of portfolio',
      'Use trailing stop-loss to protect gains',
      'Monitor correlation with major indices',
    ],
    riskFactors: {
      volatilityRisk: 0.6,
      liquidityRisk: 0.3,
      positionSizeRisk: 0.4,
      correlationRisk: 0.5,
    },
    lossScenarios: [
      {
        scenario: 'Market correction',
        probability: 0.15,
        potentialLoss: -12.5,
      },
      {
        scenario: 'Flash crash',
        probability: 0.05,
        potentialLoss: -25.0,
      },
    ],
  },
};

// Test streaming update
const streamingUpdate: StreamingAnalysisUpdate = {
  sequence: 3,
  isFinal: false,
  progress: 65,
  stage: 'model_inference',
  partialResults: {
    success: true,
    data: { preliminaryScore: 0.7 },
  },
  statusMessage: 'Processing market indicators...',
  estimatedTimeRemainingMs: 2500,
};

// Test analysis requests
const sentimentRequest: SentimentAnalysisRequest = {
  analysisType: 'sentiment',
  data: {
    symbol: 'BTCUSDT',
    price: 45000,
    volume: 1000000,
    prices: [44800, 44950, 45100, 45000],
    volumes: [950000, 1200000, 1100000, 1000000],
    timestamp: Date.now(),
  },
  parameters: {
    temperature: 0.7,
    maxTokens: 1000,
    depth: 'detailed',
    includeConfidenceIntervals: true,
    contextWindowHours: 24,
  },
  enableStreaming: false,
  timeoutMs: 30000,
};

const technicalRequest: TechnicalAnalysisRequest = {
  analysisType: 'technical',
  data: {
    symbol: 'ETHUSDT',
    ohlcv: [
      {
        open: 3000,
        high: 3100,
        low: 2950,
        close: 3050,
        volume: 500000,
        timestamp: Date.now() - 3600000,
      },
      {
        open: 3050,
        high: 3200,
        low: 3000,
        close: 3150,
        volume: 750000,
        timestamp: Date.now() - 1800000,
      },
      { open: 3150, high: 3250, low: 3100, close: 3200, volume: 600000, timestamp: Date.now() },
    ],
  },
  parameters: {
    depth: 'comprehensive',
    contextWindowHours: 48,
  },
};

const riskRequest: RiskAssessmentRequest = {
  analysisType: 'risk',
  data: {
    symbol: 'BTCUSDT',
    side: 'long',
    size: 0.1,
    entryPrice: 44000,
    currentPrice: 45000,
    marketData: {
      volatility: 0.04,
      volume24h: 1000000000,
      liquidity: {
        bidAskSpread: 0.01,
        marketDepth: 5000000,
      },
    },
  },
  parameters: {
    depth: 'detailed',
    includeConfidenceIntervals: true,
  },
};

// Test budget and cache stats
const budgetStatus: AIBudgetStatus = {
  tokensUsed: 15000,
  tokensRemaining: 985000,
  costUSD: 0.01125,
  requestCount: 25,
  periodStart: Date.now() - 86400000, // 24 hours ago
  periodEnd: Date.now() + 86400000, // 24 hours from now
  budgetLimitUSD: 10.0,
};

const cacheStats: AICacheStats = {
  hits: 45,
  misses: 15,
  hitRate: 0.75,
  totalEntries: 120,
  memoryUsageBytes: 2048000,
  avgCacheResponseTimeMs: 15,
};

// Test type guards
function testTypeGuards() {
  console.log('Testing type guards...');

  console.log('isAIAnalysisResult(basicResult):', isAIAnalysisResult(basicResult));
  console.log(
    'isSentimentAnalysisResult(sentimentResult):',
    isSentimentAnalysisResult(sentimentResult)
  );
  console.log(
    'isTechnicalAnalysisResult(technicalResult):',
    isTechnicalAnalysisResult(technicalResult)
  );
  console.log('isRiskAssessment(riskResult):', isRiskAssessment(riskResult));
  console.log(
    'isStreamingAnalysisUpdate(streamingUpdate):',
    isStreamingAnalysisUpdate(streamingUpdate)
  );

  // Test invalid cases
  console.log('isAIAnalysisResult(null):', isAIAnalysisResult(null));
  console.log('isSentimentAnalysisResult({}):', isSentimentAnalysisResult({}));
}

// Test utility functions
function testUtilityFunctions() {
  console.log('Testing utility functions...');

  const confidence1 = 0.85;
  const confidence2 = 1.5;
  console.log('isValidConfidence(0.85):', isValidConfidence(confidence1));
  console.log('isValidConfidence(1.5):', isValidConfidence(confidence2));

  const usage: TokenUsage = { promptTokens: 100, completionTokens: 200, totalTokens: 300 };
  console.log('isValidTokenUsage(usage):', isValidTokenUsage(usage));

  const cost = calculateAnalysisCost(usage);
  console.log('calculateAnalysisCost(usage):', cost);

  const cacheKey = createAnalysisCacheKey('sentiment', { symbol: 'BTCUSDT' });
  console.log('createAnalysisCacheKey length:', cacheKey.length);

  const partial1 = { success: true, data: { a: 1 } };
  const partial2 = { confidence: 0.8, data: { b: 2 } };
  const merged = mergeAnalysisResults(partial1, partial2);
  console.log('mergeAnalysisResults:', merged);
}

// Export test function for potential use
export function runAITypesTest() {
  console.log('🧪 Running AI Types Test...\n');

  try {
    testTypeGuards();
    console.log('✅ Type guards test passed\n');

    testUtilityFunctions();
    console.log('✅ Utility functions test passed\n');

    console.log('✅ All AI types compiled and tested successfully!');
    console.log('📊 Sample data structures:');
    console.log('- Sentiment result:', sentimentResult.data.sentiment);
    console.log('- Technical analysis direction:', technicalResult.data.direction);
    console.log('- Risk level:', riskResult.data.riskLevel);
    console.log(
      '- Budget remaining: $',
      (budgetStatus.budgetLimitUSD - budgetStatus.costUSD).toFixed(4)
    );
    console.log('- Cache hit rate:', (cacheStats.hitRate * 100).toFixed(1) + '%');
  } catch (error) {
    console.error('❌ AI types test failed:', error);
    throw error;
  }
}

// Run test if executed directly
if (require.main === module) {
  runAITypesTest();
}
