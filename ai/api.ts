/**
 * AI Service API Endpoints
 * Provides REST API access to Gemini AI functionality
 */

import { api } from 'encore.dev/api';
import type { MinLen } from 'encore.dev/validate';
import { aiService } from './encore.service';

// Request/Response interfaces using Encore.ts validation
export interface TextGenerationRequest {
  prompt: string & MinLen<1>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ObjectGenerationRequest {
  prompt: string & MinLen<1>;
  schema: Record<string, unknown>; // JSON schema object
  description?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ConfigResponse {
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface RateLimitResponse {
  requestsUsed: number;
  requestsRemaining: number;
  windowStartTime: number;
  windowDurationMs: number;
}

export interface TestConnectionResponse {
  success: boolean;
  error?: string;
  model?: string;
}

export interface AIResponse {
  success: boolean;
  data?: string;
  error?: string;
  usage?: TokenUsage;
}

export interface ObjectResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  usage?: TokenUsage;
}

/**
 * Generate text using Gemini AI
 */
export const generateText = api(
  { method: 'POST', path: '/ai/generate-text', expose: true },
  async ({ prompt }: TextGenerationRequest): Promise<AIResponse> => {
    try {
      const result = await aiService.generateText(prompt);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
);

/**
 * Generate chat response using conversation history
 */
export const chat = api(
  { method: 'POST', path: '/ai/chat', expose: true },
  async ({ messages }: ChatRequest): Promise<AIResponse> => {
    try {
      const result = await aiService.chat(messages);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
);

/**
 * Generate structured object using schema
 */
export const generateObject = api(
  { method: 'POST', path: '/ai/generate-object', expose: true },
  async ({ prompt, schema, description }: ObjectGenerationRequest): Promise<ObjectResponse> => {
    try {
      const result = await aiService.generateObject(prompt, schema, description);
      return {
        success: result.success,
        data: result.data as Record<string, unknown>,
        error: result.error,
        usage: result.usage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
);

/**
 * Test AI service connection
 */
export const testConnection = api(
  { method: 'GET', path: '/ai/test', expose: true },
  async (): Promise<TestConnectionResponse> => {
    try {
      const result = await aiService.testConnection();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }
);

/**
 * Get AI service configuration
 */
export const getConfig = api(
  { method: 'GET', path: '/ai/config', expose: true },
  async (): Promise<ConfigResponse> => {
    return aiService.getConfig();
  }
);

/**
 * Get rate limit status
 */
export const getRateLimitStatus = api(
  { method: 'GET', path: '/ai/rate-limit', expose: true },
  async (): Promise<RateLimitResponse> => {
    return aiService.getRateLimitStatus();
  }
);
