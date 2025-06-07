/**
 * AI Service for Encore.ts
 * Provides Gemini 2.5 Flash integration as an Encore microservice
 */

import { Service } from 'encore.dev/service';
import type { z } from 'zod';
import {
  type ChatMessage,
  type GeminiObjectResponse,
  type GeminiResponse,
  geminiClient,
} from './gemini-client';

export default new Service('ai');

/**
 * AI Service functions for internal use by other services
 */
export const aiService = {
  /**
   * Generate text response using Gemini
   */
  generateText: async (prompt: string): Promise<GeminiResponse> => {
    return geminiClient.generateText(prompt);
  },

  /**
   * Generate chat response with conversation history
   */
  chat: async (messages: ChatMessage[]): Promise<GeminiResponse> => {
    return geminiClient.chat(messages);
  },

  /**
   * Generate structured object response
   */
  generateObject: async <T>(
    prompt: string,
    schema: z.ZodType<T>,
    description?: string
  ): Promise<GeminiObjectResponse<T>> => {
    return geminiClient.generateObject<T>(prompt, schema, description);
  },

  /**
   * Test AI service connection
   */
  testConnection: async (): Promise<{ success: boolean; error?: string; model?: string }> => {
    return geminiClient.testConnection();
  },

  /**
   * Get AI service configuration
   */
  getConfig: () => {
    return geminiClient.getConfig();
  },

  /**
   * Get rate limit status
   */
  getRateLimitStatus: () => {
    return geminiClient.getRateLimitStatus();
  },
};
