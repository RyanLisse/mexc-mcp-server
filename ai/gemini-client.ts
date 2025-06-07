/**
 * Gemini 2.5 Flash AI Client
 * Provides integration with Google's Gemini 2.5 Flash model using Vercel AI SDK
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject, generateText } from 'ai';
import { config } from '../shared/config';

export interface GeminiConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GeminiResponse {
  success: boolean;
  data?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface GeminiObjectResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class GeminiClient {
  private config: GeminiConfig;
  private requestCount = 0;
  private windowStart: number = Date.now();
  private google: ReturnType<typeof createGoogleGenerativeAI>;

  constructor(customConfig?: Partial<GeminiConfig>) {
    this.config = {
      apiKey: config.ai.google.apiKey,
      model: config.ai.google.model,
      maxTokens: config.ai.google.maxTokens,
      temperature: config.ai.google.temperature,
      ...customConfig,
    };

    this.validateConfig();

    // Initialize the Google provider with API key
    this.google = createGoogleGenerativeAI({
      apiKey: this.config.apiKey,
    });
  }

  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error(
        'Google AI API key is required. Set GOOGLE_GENERATIVE_AI_API_KEY environment variable.'
      );
    }

    if (this.config.temperature < 0 || this.config.temperature > 2) {
      throw new Error('Temperature must be between 0 and 2');
    }

    if (this.config.maxTokens < 1 || this.config.maxTokens > 32768) {
      throw new Error('Max tokens must be between 1 and 32768');
    }
  }

  private checkRateLimit(): void {
    const now = Date.now();
    const windowMs = config.ai.rateLimit.windowMs;

    // Reset window if needed
    if (now - this.windowStart > windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    if (this.requestCount >= config.ai.rateLimit.maxRequests) {
      throw new Error(
        `Rate limit exceeded. Maximum ${config.ai.rateLimit.maxRequests} requests per ${windowMs}ms window.`
      );
    }

    this.requestCount++;
  }

  /**
   * Generate text response from a single prompt
   */
  async generateText(prompt: string): Promise<GeminiResponse> {
    try {
      this.checkRateLimit();

      const result = await generateText({
        model: this.google(this.config.model),
        prompt,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      return {
        success: true,
        data: result.text,
        usage: {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
        },
      };
    } catch (error) {
      console.error('Gemini generateText error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Generate chat completion from conversation history
   */
  async chat(messages: ChatMessage[]): Promise<GeminiResponse> {
    try {
      this.checkRateLimit();

      // Convert messages to Vercel AI format
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const result = await generateText({
        model: this.google(this.config.model),
        messages: formattedMessages,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      return {
        success: true,
        data: result.text,
        usage: {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
        },
      };
    } catch (error) {
      console.error('Gemini chat error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Generate structured object response using schema
   */
  async generateObject<T>(
    prompt: string,
    schema: unknown,
    _description?: string
  ): Promise<GeminiObjectResponse<T>> {
    try {
      this.checkRateLimit();

      const result = await generateObject({
        model: this.google(this.config.model),
        prompt,
        schema: schema as Record<string, unknown>,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      return {
        success: true,
        data: result.object as T,
        usage: {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
        },
      };
    } catch (error) {
      console.error('Gemini generateObject error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Test the connection and configuration
   */
  async testConnection(): Promise<{ success: boolean; error?: string; model?: string }> {
    try {
      const result = await this.generateText(
        'Hello, please respond with "Connection successful" to test the API.'
      );

      if (result.success) {
        return {
          success: true,
          model: this.config.model,
        };
      }

      return {
        success: false,
        error: result.error || 'Unknown connection error',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<GeminiConfig, 'apiKey'> {
    return {
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
    };
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): {
    requestsUsed: number;
    requestsRemaining: number;
    windowStartTime: number;
    windowDurationMs: number;
  } {
    const now = Date.now();
    const windowMs = config.ai.rateLimit.windowMs;

    // Check if window has reset
    if (now - this.windowStart > windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    return {
      requestsUsed: this.requestCount,
      requestsRemaining: Math.max(0, config.ai.rateLimit.maxRequests - this.requestCount),
      windowStartTime: this.windowStart,
      windowDurationMs: windowMs,
    };
  }
}

// Export a default instance
export const geminiClient = new GeminiClient();
