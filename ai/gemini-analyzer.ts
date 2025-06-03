/**
 * GeminiAnalyzer - Market Data Analysis with Gemini 2.5 Flash
 * Provides intelligent market analysis with caching and budget management
 */

import crypto from 'node:crypto';
import { type GeminiObjectResponse, type GeminiResponse, geminiClient } from './gemini-client';

export interface AnalyzerConfig {
  temperature?: number;
  maxTokensPerRequest?: number;
  cacheTTLMinutes?: number;
  budgetLimitUSD?: number;
  retryAttempts?: number;
  timeoutMs?: number;
}

export interface AnalysisResult {
  success: boolean;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  confidence?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  recommendations?: string[];
  error?: string;
}

export interface MarketAnalysis {
  priceAction: string;
  volume: string;
  momentum: string;
  support: number[];
  resistance: number[];
  direction?: 'up' | 'down' | 'sideways';
  strength?: number;
}

export interface BudgetStatus {
  tokensUsed: number;
  tokensRemaining: number;
  costUSD: number;
  requestCount: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

export class GeminiAnalyzer {
  private config: Required<AnalyzerConfig>;
  private cache = new Map<string, CacheEntry>();
  private budgetTracker = {
    tokensUsed: 0,
    requestCount: 0,
    costUSD: 0,
    windowStart: Date.now(),
  };
  private cacheStats = {
    hits: 0,
    misses: 0,
  };

  // Cost per million tokens (approximate for Gemini 2.5 Flash)
  private readonly TOKEN_COST_PER_MILLION = 0.00075;

  constructor(config: AnalyzerConfig = {}) {
    this.config = {
      temperature: config.temperature ?? 0.7,
      maxTokensPerRequest: config.maxTokensPerRequest ?? 8192,
      cacheTTLMinutes: config.cacheTTLMinutes ?? 15,
      budgetLimitUSD: config.budgetLimitUSD ?? 10.0,
      retryAttempts: config.retryAttempts ?? 3,
      timeoutMs: config.timeoutMs ?? 30000,
    };

    this.validateConfig();
  }

  private validateConfig(): void {
    if (this.config.temperature < 0 || this.config.temperature > 2) {
      throw new Error('Temperature must be between 0 and 2');
    }

    if (this.config.budgetLimitUSD <= 0) {
      throw new Error('Budget limit must be positive');
    }

    if (this.config.maxTokensPerRequest < 1 || this.config.maxTokensPerRequest > 32768) {
      throw new Error('Max tokens per request must be between 1 and 32768');
    }
  }

  private generateCacheKey(method: string, data: any): string {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(`${method}:${normalized}`).digest('hex');
  }

  private isValidInput(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (!data.symbol || typeof data.symbol !== 'string' || data.symbol.trim() === '') return false;
    if (typeof data.price === 'number' && data.price <= 0) return false;
    return true;
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.cacheStats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.cacheStats.misses++;
      return null;
    }

    this.cacheStats.hits++;
    return entry.data;
  }

  private setCache(key: string, data: any): void {
    const ttlMs = this.config.cacheTTLMinutes * 60 * 1000;
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };
    this.cache.set(key, entry);
  }

  private updateBudget(tokensUsed: number): void {
    this.budgetTracker.tokensUsed += tokensUsed;
    this.budgetTracker.requestCount++;
    this.budgetTracker.costUSD += (tokensUsed / 1_000_000) * this.TOKEN_COST_PER_MILLION;

    if (this.budgetTracker.costUSD > this.config.budgetLimitUSD) {
      throw new Error(
        `Budget limit of $${this.config.budgetLimitUSD} exceeded. Current cost: $${this.budgetTracker.costUSD.toFixed(4)}`
      );
    }
  }

  private async performAnalysisWithRetry<T>(
    analysisFunction: () => Promise<GeminiObjectResponse<T>>,
    attempts = this.config.retryAttempts
  ): Promise<GeminiObjectResponse<T>> {
    for (let i = 0; i < attempts; i++) {
      try {
        const result = await Promise.race([
          analysisFunction(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Analysis timeout')), this.config.timeoutMs)
          ),
        ]);

        if (result.success && result.usage) {
          this.updateBudget(result.usage.totalTokens);
        }

        return result;
      } catch (error) {
        if (i === attempts - 1) throw error;

        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }

    throw new Error('Max retry attempts exceeded');
  }

  async analyzeSentiment(data: any): Promise<AnalysisResult> {
    if (!this.isValidInput(data)) {
      throw new Error('Invalid input data: symbol and valid price required');
    }

    const cacheKey = this.generateCacheKey('sentiment', data);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { success: true, ...cached };
    }

    const prompt = `Analyze the market sentiment for ${data.symbol} based on the following data:
Price: ${data.price}
${data.volume ? `Volume: ${data.volume}` : ''}
${data.prices ? `Price history: ${data.prices.join(', ')}` : ''}

Provide sentiment analysis with confidence level and risk assessment.`;

    const schema = {
      type: 'object',
      properties: {
        sentiment: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
        recommendations: { type: 'array', items: { type: 'string' } },
      },
      required: ['sentiment', 'confidence', 'riskLevel', 'recommendations'],
    };

    try {
      const result = await this.performAnalysisWithRetry(() =>
        geminiClient.generateObject(prompt, schema, 'Market Sentiment Analysis')
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const analysisResult: AnalysisResult = {
        success: true,
        sentiment: result.data.sentiment,
        confidence: result.data.confidence,
        riskLevel: result.data.riskLevel,
        recommendations: result.data.recommendations,
      };
      this.setCache(cacheKey, result.data);
      return analysisResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      };
    }
  }

  async performTechnicalAnalysis(marketData: any): Promise<MarketAnalysis> {
    if (!marketData || !marketData.symbol) {
      throw new Error('Invalid market data: symbol required');
    }

    const cacheKey = this.generateCacheKey('technical', marketData);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const prompt = `Perform technical analysis on ${marketData.symbol}:
${JSON.stringify(marketData, null, 2)}

Analyze price action, volume patterns, momentum, and identify key support/resistance levels.`;

    const schema = {
      type: 'object',
      properties: {
        priceAction: { type: 'string' },
        volume: { type: 'string' },
        momentum: { type: 'string' },
        support: { type: 'array', items: { type: 'number' } },
        resistance: { type: 'array', items: { type: 'number' } },
      },
      required: ['priceAction', 'volume', 'momentum', 'support', 'resistance'],
    };

    const result = await this.performAnalysisWithRetry(() =>
      geminiClient.generateObject(prompt, schema, 'Technical Analysis')
    );

    if (!result.success) {
      throw new Error(result.error || 'Technical analysis failed');
    }

    this.setCache(cacheKey, result.data);
    return result.data as MarketAnalysis;
  }

  async assessRisk(position: any): Promise<AnalysisResult> {
    if (!this.isValidInput(position)) {
      throw new Error('Invalid position data');
    }

    const cacheKey = this.generateCacheKey('risk', position);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { success: true, ...cached };
    }

    const prompt = `Assess risk for this trading position:
${JSON.stringify(position, null, 2)}

Evaluate market conditions, position size, volatility, and provide risk level with confidence.`;

    const schema = {
      type: 'object',
      properties: {
        riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        recommendations: { type: 'array', items: { type: 'string' } },
      },
      required: ['riskLevel', 'confidence', 'recommendations'],
    };

    const result = await this.performAnalysisWithRetry(() =>
      geminiClient.generateObject(prompt, schema, 'Risk Assessment')
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const analysisResult: AnalysisResult = {
      success: true,
      riskLevel: result.data.riskLevel,
      confidence: result.data.confidence,
      recommendations: result.data.recommendations,
    };
    this.setCache(cacheKey, result.data);
    return analysisResult;
  }

  async analyzeTrend(trendData: any): Promise<MarketAnalysis> {
    if (!trendData || !trendData.symbol || !Array.isArray(trendData.dataPoints)) {
      throw new Error('Invalid trend data: symbol and dataPoints array required');
    }

    const cacheKey = this.generateCacheKey('trend', trendData);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const prompt = `Analyze market trend for ${trendData.symbol}:
Timeframe: ${trendData.timeframe}
Data points: ${trendData.dataPoints.length}

${JSON.stringify(trendData.dataPoints.slice(-10), null, 2)}

Determine trend direction and strength.`;

    const schema = {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down', 'sideways'] },
        strength: { type: 'number', minimum: 0, maximum: 1 },
        priceAction: { type: 'string' },
        volume: { type: 'string' },
        momentum: { type: 'string' },
        support: { type: 'array', items: { type: 'number' } },
        resistance: { type: 'array', items: { type: 'number' } },
      },
      required: [
        'direction',
        'strength',
        'priceAction',
        'volume',
        'momentum',
        'support',
        'resistance',
      ],
    };

    const result = await this.performAnalysisWithRetry(() =>
      geminiClient.generateObject(prompt, schema, 'Trend Analysis')
    );

    if (!result.success) {
      throw new Error(result.error || 'Trend analysis failed');
    }

    this.setCache(cacheKey, result.data);
    return result.data as MarketAnalysis;
  }

  getBudgetStatus(): BudgetStatus {
    return {
      tokensUsed: this.budgetTracker.tokensUsed,
      tokensRemaining: Math.max(
        0,
        (this.config.budgetLimitUSD / this.TOKEN_COST_PER_MILLION) * 1_000_000 -
          this.budgetTracker.tokensUsed
      ),
      costUSD: this.budgetTracker.costUSD,
      requestCount: this.budgetTracker.requestCount,
    };
  }

  getCacheStats(): CacheStats {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      hitRate: total > 0 ? this.cacheStats.hits / total : 0,
      totalEntries: this.cache.size,
    };
  }

  getConfig(): AnalyzerConfig & { model: string } {
    return {
      ...this.config,
      model: 'gemini-2.5-flash-preview-05-20',
    };
  }

  updateConfig(newConfig: Partial<AnalyzerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.validateConfig();
  }

  resetBudgetWindow(): void {
    this.budgetTracker = {
      tokensUsed: 0,
      requestCount: 0,
      costUSD: 0,
      windowStart: Date.now(),
    };
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheStats.hits = 0;
    this.cacheStats.misses = 0;
  }
}

// Export default instance
export const geminiAnalyzer = new GeminiAnalyzer();
