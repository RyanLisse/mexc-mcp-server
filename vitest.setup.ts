/**
 * Vitest Setup File
 * Configures test environment for MEXC MCP Server
 */

import path from 'node:path';
import { vi } from 'vitest';

// Set environment variables before any imports
process.env.ENCORE_RUNTIME_LIB = path.resolve(__dirname, '__mocks__/encore-runtime.cjs');
process.env.NODE_ENV = 'test';

// Disable AI operations in tests to prevent API calls
process.env.AI_TEST_MODE = 'true';
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key-disabled-for-testing';
process.env.AI_RISK_MAX_LEVEL = 'low'; // Restrict AI operations in tests
process.env.DISABLE_AI_API_CALLS = 'true'; // Completely disable AI API calls

// Mock Encore runtime and services
vi.mock('encore.dev/internal/runtime/napi/napi.cjs', () => ({
  default: {
    initialize: vi.fn(),
    cleanup: vi.fn(),
    callHandler: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock Encore services to prevent import errors
vi.mock('encore.dev', () => ({
  api: vi.fn((_config, handler) => handler),
  service: vi.fn(() => ({})),
  APICallError: class APICallError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'APICallError';
    }
  },
}));

// Mock the AI SDK to prevent actual API calls
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => ({
    name: 'mock-gemini-model',
    provider: 'google',
  })),
}));

vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: 'Mock AI response text',
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
  }),
  generateObject: vi.fn().mockResolvedValue({
    object: { analysis: 'Mock analysis', confidence: 0.8 },
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
  }),
}));

// Mock the Gemini client specifically to prevent actual API calls
vi.mock('../../ai/gemini-client.ts', () => ({
  GeminiClient: vi.fn().mockImplementation(() => ({
    generateObject: vi.fn().mockResolvedValue({
      success: true,
      data: {
        overallRiskLevel: 'medium',
        riskScore: 50,
        confidence: 0.8,
        diversificationScore: 0.7,
        volatility: {
          daily: 2.5,
          weekly: 5.0,
          monthly: 15.0,
        },
        riskFactors: [
          {
            factor: 'Portfolio Concentration',
            impact: 'medium',
            description: 'Portfolio may be concentrated in specific assets',
          },
        ],
        assetAllocation: [
          {
            symbol: 'BTCUSDT',
            percentage: 100,
            riskLevel: 'medium',
            riskContribution: 60,
          },
        ],
        recommendations: [
          {
            type: 'diversify',
            description: 'Consider diversifying portfolio across asset classes',
            priority: 'medium',
          },
        ],
        stressTests: [
          {
            scenario: 'Market Crash',
            potentialLoss: 30,
            probability: 0.2,
          },
        ],
      },
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    }),
    generateText: vi.fn().mockResolvedValue({
      success: true,
      data: 'Mock AI response text',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    }),
    chat: vi.fn().mockResolvedValue({
      success: true,
      data: 'Mock AI chat response',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    }),
    testConnection: vi.fn().mockResolvedValue({
      success: true,
      model: 'gemini-1.5-flash',
    }),
    getConfig: vi.fn().mockReturnValue({
      model: 'gemini-1.5-flash',
      maxTokens: 8192,
      temperature: 0.7,
    }),
    getRateLimitStatus: vi.fn().mockReturnValue({
      requestsUsed: 0,
      requestsRemaining: 100,
      windowStartTime: Date.now(),
      windowDurationMs: 60000,
    }),
  })),
  geminiClient: {
    generateObject: vi.fn().mockResolvedValue({
      success: true,
      data: {
        overallRiskLevel: 'medium',
        riskScore: 50,
        confidence: 0.8,
        diversificationScore: 0.7,
        volatility: {
          daily: 2.5,
          weekly: 5.0,
          monthly: 15.0,
        },
        riskFactors: [
          {
            factor: 'Portfolio Concentration',
            impact: 'medium',
            description: 'Portfolio may be concentrated in specific assets',
          },
        ],
        assetAllocation: [
          {
            symbol: 'BTCUSDT',
            percentage: 100,
            riskLevel: 'medium',
            riskContribution: 60,
          },
        ],
        recommendations: [
          {
            type: 'diversify',
            description: 'Consider diversifying portfolio across asset classes',
            priority: 'medium',
          },
        ],
        stressTests: [
          {
            scenario: 'Market Crash',
            potentialLoss: 30,
            probability: 0.2,
          },
        ],
      },
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    }),
    generateText: vi.fn().mockResolvedValue({
      success: true,
      data: 'Mock AI response text',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    }),
    chat: vi.fn().mockResolvedValue({
      success: true,
      data: 'Mock AI chat response',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    }),
    testConnection: vi.fn().mockResolvedValue({
      success: true,
      model: 'gemini-1.5-flash',
    }),
    getConfig: vi.fn().mockReturnValue({
      model: 'gemini-1.5-flash',
      maxTokens: 8192,
      temperature: 0.7,
    }),
    getRateLimitStatus: vi.fn().mockReturnValue({
      requestsUsed: 0,
      requestsRemaining: 100,
      windowStartTime: Date.now(),
      windowDurationMs: 60000,
    }),
  },
}));

// Mock DOM APIs that might not be available in Node.js environment
global.CloseEvent = class CloseEvent extends Event {
  code: number;
  reason: string;
  wasClean: boolean;

  constructor(
    type: string,
    eventInitDict?: { code?: number; reason?: string; wasClean?: boolean }
  ) {
    super(type);
    this.code = eventInitDict?.code ?? 1000;
    this.reason = eventInitDict?.reason ?? '';
    this.wasClean = eventInitDict?.wasClean ?? true;
  }
};

// Mock console to reduce test noise (optional)
global.console = {
  ...console,
  // Comment out the line below if you want to see console.log during tests
  log: () => {},
};
