/**
 * Vitest Setup File
 * Configures test environment for MEXC MCP Server
 */

import path from 'node:path';
import { vi } from 'vitest';

// Set environment variables before any imports
process.env.ENCORE_RUNTIME_LIB = path.resolve(__dirname, '__mocks__/encore-runtime.js');
process.env.NODE_ENV = 'test';

// Disable AI operations in tests to prevent API calls
process.env.AI_TEST_MODE = 'true';
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';
process.env.AI_RISK_MAX_LEVEL = 'low'; // Restrict AI operations in tests

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

// Mock Gemini client to prevent actual AI API calls in tests
vi.mock('./ai/gemini-client.ts', () => ({
  GeminiClient: class MockGeminiClient {
    async generateObject() {
      return {
        success: true,
        data: {
          analysis: 'Mock AI analysis result',
          confidence: 0.8,
          recommendations: ['Mock recommendation'],
        },
        processingTimeMs: 50,
        modelVersion: 'mock-model-v1.0',
      };
    }
    
    async generateStructuredAnalysis() {
      return {
        success: true,
        data: {
          sentiment: { score: 0.7, label: 'positive' },
          technicalIndicators: { trend: 'bullish', strength: 0.8 },
          riskAssessment: { level: 'medium', score: 0.6 },
        },
        processingTimeMs: 100,
        modelVersion: 'mock-model-v1.0',
      };
    }
  },
  geminiClient: new (class MockGeminiClient {
    async generateObject() {
      return {
        success: true,
        data: {
          analysis: 'Mock AI analysis result',
          confidence: 0.8,
          recommendations: ['Mock recommendation'],
        },
        processingTimeMs: 50,
        modelVersion: 'mock-model-v1.0',
      };
    }
  })(),
}));

// Mock console to reduce test noise (optional)
global.console = {
  ...console,
  // Comment out the line below if you want to see console.log during tests
  log: () => {},
};

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
