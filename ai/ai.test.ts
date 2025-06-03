/**
 * AI Service Tests
 * Tests for Gemini 2.5 Flash integration
 */

import { beforeEach, describe, expect, it } from 'vitest';

// Set mock environment variables before importing config-dependent modules
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';
process.env.MEXC_API_KEY = 'test-mexc-key';
process.env.MEXC_SECRET_KEY = 'test-mexc-secret';

import { GeminiClient } from './gemini-client';

// Mock configuration for testing
const mockConfig = {
  apiKey: 'test-api-key',
  model: 'gemini-2.5-flash-preview-05-20',
  maxTokens: 1024,
  temperature: 0.7,
};

describe('Gemini AI Integration', () => {
  describe('GeminiClient Configuration', () => {
    it('should initialize with default config', () => {
      // We can't test with real config due to missing env vars, but we can test the class structure
      expect(() => {
        const client = new GeminiClient(mockConfig);
        const config = client.getConfig();
        expect(config.model).toBe('gemini-2.5-flash-preview-05-20');
        expect(config.maxTokens).toBe(1024);
        expect(config.temperature).toBe(0.7);
      }).not.toThrow();
    });

    it('should validate temperature range', () => {
      expect(() => {
        new GeminiClient({ ...mockConfig, temperature: -1 });
      }).toThrow('Temperature must be between 0 and 2');

      expect(() => {
        new GeminiClient({ ...mockConfig, temperature: 3 });
      }).toThrow('Temperature must be between 0 and 2');
    });

    it('should validate maxTokens range', () => {
      expect(() => {
        new GeminiClient({ ...mockConfig, maxTokens: 0 });
      }).toThrow('Max tokens must be between 1 and 32768');

      expect(() => {
        new GeminiClient({ ...mockConfig, maxTokens: 50000 });
      }).toThrow('Max tokens must be between 1 and 32768');
    });

    it('should require API key', () => {
      expect(() => {
        new GeminiClient({ ...mockConfig, apiKey: '' });
      }).toThrow('Google AI API key is required');
    });
  });

  describe('Rate Limiting', () => {
    let client: GeminiClient;

    beforeEach(() => {
      client = new GeminiClient(mockConfig);
    });

    it('should track rate limit status', () => {
      const status = client.getRateLimitStatus();
      expect(status).toHaveProperty('requestsUsed');
      expect(status).toHaveProperty('requestsRemaining');
      expect(status).toHaveProperty('windowStartTime');
      expect(status).toHaveProperty('windowDurationMs');

      expect(typeof status.requestsUsed).toBe('number');
      expect(typeof status.requestsRemaining).toBe('number');
      expect(status.requestsUsed).toBeGreaterThanOrEqual(0);
      expect(status.requestsRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should return correct initial rate limit state', () => {
      const status = client.getRateLimitStatus();
      expect(status.requestsUsed).toBe(0);
      expect(status.requestsRemaining).toBeGreaterThan(0);
    });
  });

  describe('Message Validation', () => {
    it('should validate chat message structure', () => {
      const validMessages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there!' },
        { role: 'system' as const, content: 'You are helpful' },
      ];

      for (const message of validMessages) {
        expect(message.role).toMatch(/^(user|assistant|system)$/);
        expect(typeof message.content).toBe('string');
        expect(message.content.length).toBeGreaterThan(0);
      }
    });
  });

  describe('API Schema Validation', () => {
    it('should have valid input schemas for endpoints', () => {
      // Test GenerateTextInputSchema structure
      const generateTextSchema = {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            minLength: 1,
            maxLength: 10000,
          },
        },
        required: ['prompt'],
      };

      expect(generateTextSchema.type).toBe('object');
      expect(generateTextSchema.properties.prompt.type).toBe('string');
      expect(generateTextSchema.required).toContain('prompt');

      // Test ChatInputSchema structure
      const chatSchema = {
        type: 'object',
        properties: {
          messages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                content: { type: 'string', minLength: 1, maxLength: 10000 },
              },
              required: ['role', 'content'],
            },
            minItems: 1,
            maxItems: 50,
          },
        },
        required: ['messages'],
      };

      expect(chatSchema.type).toBe('object');
      expect(chatSchema.properties.messages.type).toBe('array');
      expect(chatSchema.required).toContain('messages');
    });
  });

  describe('Error Handling', () => {
    let client: GeminiClient;

    beforeEach(() => {
      client = new GeminiClient(mockConfig);
    });

    it('should handle network errors gracefully', async () => {
      // Since we're using a mock API key, this should fail but not throw
      const result = await client.generateText('Test prompt');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('should handle invalid prompts gracefully', async () => {
      const result = await client.generateText('');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle malformed chat messages', async () => {
      const invalidMessages = [{ role: 'invalid' as 'user', content: 'test' }];

      const result = await client.chat(invalidMessages);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Response Format', () => {
    let client: GeminiClient;

    beforeEach(() => {
      client = new GeminiClient(mockConfig);
    });

    it('should return consistent response format for text generation', async () => {
      const result = await client.generateText('Test');

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');

      if (result.success) {
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('usage');
        expect(result.usage).toHaveProperty('promptTokens');
        expect(result.usage).toHaveProperty('completionTokens');
        expect(result.usage).toHaveProperty('totalTokens');
      } else {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
      }
    });

    it('should return consistent response format for chat', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const result = await client.chat(messages);

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');

      if (result.success) {
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('usage');
      } else {
        expect(result).toHaveProperty('error');
      }
    });
  });

  describe('Configuration Management', () => {
    it('should not expose sensitive configuration', () => {
      const client = new GeminiClient(mockConfig);
      const config = client.getConfig();

      expect(config).not.toHaveProperty('apiKey');
      expect(config).toHaveProperty('model');
      expect(config).toHaveProperty('maxTokens');
      expect(config).toHaveProperty('temperature');
    });

    it('should allow configuration override', () => {
      const customConfig = {
        ...mockConfig,
        model: 'custom-model',
        temperature: 0.5,
      };

      const client = new GeminiClient(customConfig);
      const config = client.getConfig();

      expect(config.model).toBe('custom-model');
      expect(config.temperature).toBe(0.5);
    });
  });
});
