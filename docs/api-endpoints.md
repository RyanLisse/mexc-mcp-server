# API Endpoints Documentation

This document provides comprehensive documentation for all AI-enhanced API endpoints in the MEXC MCP server.

## Authentication

All API endpoints require authentication using a valid MEXC API key passed in the Authorization header:

```
Authorization: Bearer <your-mexc-api-key>
```

### API Key Format
- Must start with `mx` prefix
- Must be at least 32 characters long
- Must contain only alphanumeric characters and underscores

### Rate Limiting
- Default: 100 requests per minute per API key
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Timestamp when rate limit resets

## Health Check Endpoints

### GET /mcp/health (Task #32)

Provides comprehensive health status for all AI services including Gemini API, MEXC integration, and AI services monitoring.

**Response Format:**
```json
{
  "success": true,
  "data": {
    "geminiApi": {
      "status": "OK",
      "timestamp": 1703123456789,
      "latency": 45,
      "modelVersion": "gemini-2.5-flash-preview-05-20",
      "budgetStatus": {
        "costUSD": 2.30,
        "remainingBudget": 7.70,
        "utilizationPercentage": 0.23
      },
      "cachePerformance": {
        "hitRate": 0.87,
        "efficiency": "excellent"
      }
    },
    "mexcIntegration": {
      "status": "OK",
      "timestamp": 1703123456789,
      "connectivity": {
        "ping": true,
        "latency": 120,
        "serverSync": true
      },
      "dataFreshness": {
        "lastUpdate": 1703123426789,
        "staleness": "fresh"
      }
    },
    "aiServices": {
      "status": "OK",
      "timestamp": 1703123456789,
      "serviceHealth": {
        "analyzer": true,
        "client": true,
        "models": true
      },
      "performanceMetrics": {
        "averageResponseTime": 850,
        "successRate": 0.95,
        "errorRate": 0.05
      }
    },
    "overall": {
      "status": "OK",
      "timestamp": 1703123456789,
      "uptime": 3600000,
      "healthScore": 92,
      "criticalIssues": 0,
      "recommendations": []
    }
  },
  "timestamp": 1703123456789,
  "processingTimeMs": 125,
  "serviceVersion": "mcp-health-v1.0"
}
```

**Status Values:**
- `OK`: Service is healthy and performing optimally
- `WARNING`: Service is functional but experiencing minor issues
- `ERROR`: Service is experiencing critical issues

### GET /mcp/health/legacy

Legacy endpoint for backward compatibility. Returns basic health status.

## AI Market Analysis Endpoints

### POST /mcp/ai-market-analysis

Performs comprehensive market analysis using AI models with multiple depth levels.

**Request Body:**
```json
{
  "symbol": "BTCUSDT",
  "analysisType": "sentiment",
  "depth": "comprehensive",
  "price": 45000,
  "volume": 1000000,
  "ohlcv": [
    {
      "open": 44800,
      "high": 45200,
      "low": 44600,
      "close": 45000,
      "volume": 1000000,
      "timestamp": 1703123456789
    }
  ],
  "marketData": {
    "volatility": 0.15,
    "volume24h": 50000000,
    "marketCap": 875000000000
  },
  "parameters": {
    "temperature": 0.7,
    "maxTokens": 4096,
    "includeConfidenceIntervals": true,
    "contextWindowHours": 24
  }
}
```

**Required Fields:**
- `symbol` (string): Trading symbol (e.g., "BTCUSDT")
- `analysisType` (string): Type of analysis - "sentiment", "technical", "risk", or "trend"

**Optional Fields:**
- `depth` (string): Analysis depth - "quick", "standard", "comprehensive", or "deep"
- `price` (number): Current price
- `volume` (number): Trading volume
- `ohlcv` (array): OHLCV data for technical analysis
- `marketData` (object): Additional market context
- `parameters` (object): AI model parameters

**Response:**
```json
{
  "success": true,
  "data": {
    "analysisType": "sentiment",
    "confidence": 0.85,
    "sentiment": "bullish",
    "score": 0.72,
    "reasoning": "Strong positive sentiment driven by institutional adoption...",
    "keyFactors": [
      "Institutional buying pressure",
      "Technical breakout patterns",
      "Positive market sentiment"
    ],
    "recommendations": [
      {
        "action": "buy",
        "confidence": 0.78,
        "reasoning": "Strong bullish signals with low risk"
      }
    ],
    "riskFactors": [
      {
        "factor": "Market volatility",
        "impact": "medium",
        "description": "Increased volatility may affect short-term price action"
      }
    ]
  },
  "metadata": {
    "analysisType": "sentiment",
    "depth": "comprehensive",
    "processingTimeMs": 842,
    "timestamp": 1703123456789,
    "modelVersion": "gemini-2.5-flash-preview-05-20",
    "confidenceValidated": true
  }
}
```

### POST /mcp/multi-analysis

Performs multiple analysis types in parallel for comprehensive insights.

**Request Body:**
```json
{
  "symbol": "ETHUSDT",
  "analysisTypes": ["sentiment", "technical", "risk"],
  "depth": "comprehensive",
  "price": 2400,
  "volume": 500000,
  "ohlcv": [
    {
      "open": 2380,
      "high": 2420,
      "low": 2370,
      "close": 2400,
      "volume": 500000,
      "timestamp": 1703123456789
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sentiment": {
      "success": true,
      "confidence": 0.82,
      "sentiment": "neutral",
      "score": 0.12
    },
    "technical": {
      "success": true,
      "confidence": 0.89,
      "trendDirection": "bullish",
      "signals": [
        {
          "type": "RSI",
          "value": 65,
          "signal": "neutral"
        }
      ]
    },
    "risk": {
      "success": true,
      "confidence": 0.91,
      "riskLevel": "medium",
      "riskScore": 45
    }
  },
  "metadata": {
    "depth": "comprehensive",
    "totalProcessingTimeMs": 1250,
    "timestamp": 1703123456789,
    "analysisTypes": ["sentiment", "technical", "risk"],
    "successfulAnalyses": 3,
    "failedAnalyses": 0
  }
}
```

## Strategy Optimization Endpoints

### POST /mcp/strategy-optimizer

AI-powered portfolio optimization leveraging MEXC's unique features.

**Request Body:**
```json
{
  "portfolio": [
    {
      "symbol": "BTCUSDT",
      "currentWeight": 0.5,
      "historicalReturns": [0.02, -0.01, 0.03, 0.01]
    },
    {
      "symbol": "ETHUSDT",
      "currentWeight": 0.3,
      "historicalReturns": [0.03, -0.02, 0.04, 0.02]
    },
    {
      "symbol": "ADAUSDT",
      "currentWeight": 0.2,
      "historicalReturns": [0.01, -0.01, 0.02, 0.01]
    }
  ],
  "objectiveFunction": "sharpe_ratio",
  "constraints": {
    "maxRisk": 0.15,
    "minReturn": 0.08,
    "maxDrawdown": 0.10,
    "maxPositionSize": 0.4,
    "minPositionSize": 0.05
  },
  "timeHorizon": "medium",
  "rebalanceFrequency": "monthly",
  "mexcParameters": {
    "utilize0Fees": true,
    "considerLeverage": true,
    "maxLeverage": 10
  },
  "analysisDepth": "comprehensive"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "optimizationType": "sharpe_ratio",
    "confidence": 0.87,
    "optimizedMetrics": {
      "expectedReturn": 0.12,
      "volatility": 0.18,
      "sharpeRatio": 0.67,
      "maxDrawdown": 0.08,
      "informationRatio": 1.2
    },
    "allocations": [
      {
        "symbol": "BTCUSDT",
        "currentWeight": 0.5,
        "optimizedWeight": 0.45,
        "adjustment": -0.05,
        "reasoning": "Reduce concentration risk while maintaining growth exposure"
      },
      {
        "symbol": "ETHUSDT",
        "currentWeight": 0.3,
        "optimizedWeight": 0.35,
        "adjustment": 0.05,
        "reasoning": "Increase allocation due to favorable risk-return profile"
      }
    ],
    "mexcAdvantages": {
      "feeSavingsUSD": 245.50,
      "leverageOpportunities": [
        {
          "symbol": "BTCUSDT",
          "recommendedLeverage": 2.5,
          "expectedBoost": 0.03
        }
      ]
    },
    "recommendations": [
      {
        "type": "allocation_change",
        "priority": "high",
        "description": "Rebalance portfolio to optimize risk-adjusted returns",
        "expectedImpact": "Improve Sharpe ratio from 0.45 to 0.67"
      }
    ]
  },
  "metadata": {
    "analysisDepth": "comprehensive",
    "processingTimeMs": 1567,
    "timestamp": 1703123456789,
    "modelVersion": "gemini-2.5-flash-preview-05-20",
    "tokenUsage": {
      "promptTokens": 2048,
      "completionTokens": 1024,
      "totalTokens": 3072,
      "estimatedCostUSD": 0.015
    }
  }
}
```

## Trading Tools Endpoints

### POST /mcp/trading-tools

AI-enhanced trading tools providing position sizing, risk management, and market analysis.

**Request Body:**
```json
{
  "action": "position_sizing",
  "symbol": "BTCUSDT",
  "accountBalance": 10000,
  "riskPerTrade": 0.02,
  "entryPrice": 45000,
  "currentPrice": 45200,
  "stopLossPrice": 44000,
  "takeProfitPrice": 47000,
  "riskTolerance": "moderate",
  "timeframe": "4h",
  "marketVolatility": 0.15,
  "indicators": {
    "rsi": 65,
    "macd": 120,
    "bollinger": {
      "upper": 46000,
      "middle": 45000,
      "lower": 44000
    }
  },
  "marketData": {
    "volatilityIndex": 25,
    "tradingVolume": 1000000,
    "openInterest": 500000
  },
  "analysisDepth": "standard"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "toolType": "position_sizing",
    "confidence": 0.91,
    "positionSizing": {
      "recommendedSize": 0.444,
      "riskAmount": 200,
      "riskPercentage": 0.02,
      "leverageRecommendation": 1.5
    },
    "riskManagement": {
      "stopLossPrice": 44000,
      "takeProfitPrice": 47000,
      "riskRewardRatio": 2.0,
      "riskAmount": 200,
      "potentialProfit": 400
    },
    "technicalAnalysis": {
      "trendDirection": "bullish",
      "strength": 0.7,
      "signals": [
        {
          "type": "RSI",
          "strength": 0.6,
          "description": "RSI at 65 suggests mild bullish momentum"
        },
        {
          "type": "MACD",
          "strength": 0.8,
          "description": "MACD shows strong bullish divergence"
        }
      ],
      "supportLevels": [44000, 43500, 43000],
      "resistanceLevels": [46000, 46500, 47000]
    },
    "marketConditions": {
      "sentiment": "bullish",
      "volatilityLevel": "medium",
      "liquidityScore": 0.85,
      "trendStrength": 0.7,
      "timeframeBias": "bullish on 4h timeframe"
    },
    "recommendations": [
      {
        "type": "entry_strategy",
        "priority": "high",
        "description": "Enter position with 1.5x leverage using recommended sizing",
        "expectedImpact": "Optimal risk-reward balance for current market conditions"
      }
    ]
  },
  "metadata": {
    "analysisDepth": "standard",
    "processingTimeMs": 694,
    "timestamp": 1703123456789,
    "modelVersion": "gemini-2.5-flash-preview-05-20"
  }
}
```

## Risk Assessment Endpoints

### POST /mcp/risk-assessment

Comprehensive portfolio risk evaluation with AI-powered analysis.

**Request Body:**
```json
{
  "portfolio": [
    {
      "symbol": "BTCUSDT",
      "quantity": 0.5,
      "currentPrice": 45000,
      "entryPrice": 44000,
      "assetType": "crypto"
    },
    {
      "symbol": "ETHUSDT", 
      "quantity": 2.0,
      "currentPrice": 2400,
      "entryPrice": 2300,
      "assetType": "crypto"
    }
  ],
  "totalValue": 27300,
  "riskTolerance": "moderate",
  "timeHorizon": "medium",
  "marketContext": {
    "marketSentiment": "neutral",
    "volatilityIndex": 30,
    "economicIndicators": {
      "inflationRate": 0.03,
      "interestRates": 0.05
    }
  },
  "analysisDepth": "comprehensive"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overallRiskLevel": "medium",
    "riskScore": 45,
    "confidence": 0.88,
    "diversificationScore": 0.65,
    "volatility": {
      "daily": 0.02,
      "weekly": 0.08,
      "monthly": 0.15
    },
    "riskFactors": [
      {
        "factor": "Concentration risk",
        "impact": "medium",
        "description": "Portfolio concentrated in crypto assets"
      },
      {
        "factor": "Market volatility",
        "impact": "high",
        "description": "High volatility in crypto markets"
      }
    ],
    "assetAllocation": [
      {
        "symbol": "BTCUSDT",
        "percentage": 82.4,
        "riskLevel": "high",
        "riskContribution": 0.7
      },
      {
        "symbol": "ETHUSDT",
        "percentage": 17.6,
        "riskLevel": "high", 
        "riskContribution": 0.3
      }
    ],
    "recommendations": [
      {
        "type": "diversify",
        "target": "portfolio",
        "description": "Consider adding non-crypto assets to reduce concentration risk",
        "priority": "medium"
      },
      {
        "type": "reduce_position",
        "target": "BTCUSDT",
        "description": "Reduce BTC allocation to below 70% of portfolio",
        "priority": "low"
      }
    ],
    "stressTests": [
      {
        "scenario": "Crypto market crash (-30%)",
        "potentialLoss": 0.25,
        "probability": 0.15
      },
      {
        "scenario": "General market downturn (-15%)",
        "potentialLoss": 0.12,
        "probability": 0.30
      }
    ]
  },
  "metadata": {
    "analysisDepth": "comprehensive",
    "processingTimeMs": 1123,
    "timestamp": 1703123456789,
    "modelVersion": "gemini-2.5-flash-preview-05-20"
  }
}
```

## Quick Risk Calculator Endpoints

### POST /mcp/quick-risk-score

Fast risk estimation without AI analysis for rapid assessment.

**Request Body:**
```json
{
  "portfolio": [
    {
      "symbol": "BTCUSDT",
      "quantity": 0.5,
      "currentPrice": 45000,
      "entryPrice": 44000
    }
  ],
  "totalValue": 22500
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "riskScore": 35,
    "riskLevel": "medium",
    "diversificationScore": 0.1,
    "topRisks": [
      "Insufficient diversification",
      "High concentration in single asset"
    ]
  }
}
```

## Utility Endpoints

### GET /mcp/analysis-depths

Returns available analysis depths and their configurations.

**Response:**
```json
{
  "depths": {
    "quick": {
      "name": "Quick Analysis",
      "description": "Fast analysis with basic insights, minimal token usage",
      "temperature": 0.3,
      "maxTokens": 2048,
      "contextHours": 6,
      "features": ["Basic sentiment", "Quick recommendations", "Low latency"]
    },
    "standard": {
      "name": "Standard Analysis",
      "description": "Balanced analysis with good accuracy and reasonable speed",
      "temperature": 0.5,
      "maxTokens": 4096,
      "contextHours": 12,
      "features": ["Detailed sentiment", "Confidence intervals", "Market context"]
    },
    "comprehensive": {
      "name": "Comprehensive Analysis",
      "description": "Thorough analysis with high accuracy and detailed insights",
      "temperature": 0.7,
      "maxTokens": 6144,
      "contextHours": 24,
      "features": ["Multi-factor analysis", "Risk assessment", "Parallel processing"]
    },
    "deep": {
      "name": "Deep Analysis",
      "description": "Most thorough analysis with maximum context and accuracy",
      "temperature": 0.9,
      "maxTokens": 8192,
      "contextHours": 48,
      "features": ["Advanced AI reasoning", "Multiple retries", "Confidence validation"]
    }
  }
}
```

### POST /mcp/reset-environment

Resets analysis environment (admin only).

**Response:**
```json
{
  "success": true,
  "message": "Analysis environment reset successfully"
}
```

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": "Detailed error message",
  "errorCode": "INVALID_REQUEST",
  "timestamp": 1703123456789,
  "requestId": "req_123456789"
}
```

### Common Error Codes

- `INVALID_API_KEY`: Invalid or missing API key
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INSUFFICIENT_BUDGET`: AI budget exceeded
- `INVALID_REQUEST`: Malformed request data
- `SERVICE_UNAVAILABLE`: AI services temporarily unavailable
- `TIMEOUT`: Request timeout exceeded
- `VALIDATION_ERROR`: Input validation failed

### Error Response Examples

**Authentication Error:**
```json
{
  "success": false,
  "error": "Invalid API key format",
  "errorCode": "INVALID_API_KEY",
  "timestamp": 1703123456789
}
```

**Rate Limiting Error:**
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 60 seconds",
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60,
  "timestamp": 1703123456789
}
```

**Validation Error:**
```json
{
  "success": false,
  "error": "Symbol is required and must be at least 1 character",
  "errorCode": "VALIDATION_ERROR",
  "field": "symbol",
  "timestamp": 1703123456789
}
```

## Response Time Guidelines

- Health checks: < 200ms
- Quick analysis: < 500ms
- Standard analysis: < 1000ms
- Comprehensive analysis: < 2000ms
- Deep analysis: < 5000ms

## Testing Endpoints

All endpoints can be tested using the provided test suite:

```bash
# Run full API test suite
bun test

# Test specific endpoint
bun test mcp/api.test.ts

# Test with real API integration
bun run test:mexc
```