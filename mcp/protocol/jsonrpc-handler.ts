/**
 * JSON-RPC 2.0 Protocol Handler
 * Task #17: MCP Protocol Interface Implementation
 * Implements JSON-RPC 2.0 protocol for MCP communication
 */

import { z } from 'zod';

// JSON-RPC 2.0 Standard Error Codes
export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

// Zod schemas for validation
const JsonRpcBaseSchema = z.object({
  jsonrpc: z.literal('2.0'),
});

const JsonRpcRequestSchema = JsonRpcBaseSchema.extend({
  method: z.string(),
  params: z.any().optional(),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
});

const JsonRpcNotificationSchema = JsonRpcBaseSchema.extend({
  method: z.string(),
  params: z.any().optional(),
});

// Types
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: string | number | null;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number | null;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

// Method handler type
type MethodHandler = (params?: any) => Promise<any>;

/**
 * JSON-RPC 2.0 Protocol Handler
 * Handles MCP protocol communication using JSON-RPC 2.0 standard
 */
export class JsonRpcHandler {
  private methodHandlers = new Map<string, MethodHandler>();

  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Register default MCP method handlers
   */
  private registerDefaultHandlers(): void {
    // Initialize method - MCP handshake
    this.methodHandlers.set('initialize', async (params) => ({
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {},
      },
      serverInfo: {
        name: 'MEXC MCP Server',
        version: '1.0.0',
      },
    }));

    // Tools list method
    this.methodHandlers.set('tools/list', async () => ({
      tools: [
        {
          name: 'mexc_get_ticker',
          description: 'Get current ticker price and 24h statistics for a trading symbol',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: { type: 'string' }
            },
            required: ['symbol']
          }
        },
        {
          name: 'mexc_get_order_book',
          description: 'Get current order book (bids and asks) for a trading symbol',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: { type: 'string' }
            },
            required: ['symbol']
          }
        }
      ]
    }));

    // Tools call method
    this.methodHandlers.set('tools/call', async (params) => {
      const { name, arguments: args } = params;
      
      // Mock implementation for testing - will integrate with real services later
      switch (name) {
        case 'mexc_get_ticker':
          return {
            content: [{
              type: 'text',
              text: `Ticker data for ${args.symbol}: Price $50,000`
            }]
          };
        case 'mexc_place_order':
          return {
            content: [{
              type: 'text',
              text: `Order placed: ${args.side} ${args.quantity} ${args.symbol} at ${args.price}`
            }]
          };
        case 'ai_analyze_sentiment':
          return {
            content: [{
              type: 'text',
              text: `Sentiment analysis for ${args.symbol}: Neutral (confidence: 0.75)`
            }]
          };
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  /**
   * Validate JSON-RPC request format
   */
  validateRequest(request: any): boolean {
    try {
      if (!request.jsonrpc || request.jsonrpc !== '2.0') {
        throw new Error('Invalid JSON-RPC version');
      }
      
      if (!request.method || typeof request.method !== 'string') {
        throw new Error('Method is required');
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate request parameters using Zod schema
   */
  validateRequestParams(request: JsonRpcRequest): void {
    try {
      JsonRpcRequestSchema.parse(request);
    } catch (error) {
      throw new Error(`Parameter validation failed: ${error}`);
    }
  }

  /**
   * Handle a single JSON-RPC request
   */
  async handleRequest(request: any): Promise<JsonRpcResponse> {
    const isNotification = request.id === undefined;
    
    try {
      // Validate request format
      this.validateRequest(request);
      
      // Get method handler
      const handler = this.methodHandlers.get(request.method);
      if (!handler) {
        return this.createErrorResponse(
          request.id || null,
          JSON_RPC_ERRORS.METHOD_NOT_FOUND,
          `Method not found: ${request.method}`
        );
      }

      // Execute handler
      const result = await handler(request.params);
      
      // Don't send response for notifications
      if (isNotification) {
        return null as any;
      }

      return this.createSuccessResponse(request.id, result);
    } catch (error) {
      if (isNotification) {
        return null as any;
      }

      const message = error instanceof Error ? error.message : 'Internal error';
      if (message.includes('Invalid JSON-RPC version') || message.includes('Method is required')) {
        return this.createErrorResponse(
          request.id || null,
          JSON_RPC_ERRORS.INVALID_REQUEST,
          message
        );
      }

      return this.createErrorResponse(
        request.id || null,
        JSON_RPC_ERRORS.INTERNAL_ERROR,
        message
      );
    }
  }

  /**
   * Handle batch requests
   */
  async handleBatchRequest(requests: any[]): Promise<JsonRpcResponse[]> {
    const responses: JsonRpcResponse[] = [];
    
    for (const request of requests) {
      const response = await this.handleRequest(request);
      if (response !== null) {
        responses.push(response);
      }
    }
    
    return responses;
  }

  /**
   * Handle raw JSON string request
   */
  async handleRawRequest(rawRequest: string): Promise<JsonRpcResponse> {
    try {
      const request = JSON.parse(rawRequest);
      return await this.handleRequest(request);
    } catch (error) {
      return this.createErrorResponse(
        null,
        JSON_RPC_ERRORS.PARSE_ERROR,
        'Parse error'
      );
    }
  }

  /**
   * Create success response
   */
  private createSuccessResponse(id: string | number | null, result: any): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      result,
      id,
    };
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    id: string | number | null,
    code: number,
    message: string,
    data?: any
  ): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      error: {
        code,
        message,
        data,
      },
      id,
    };
  }

  /**
   * Register a new method handler
   */
  registerMethod(method: string, handler: MethodHandler): void {
    this.methodHandlers.set(method, handler);
  }

  /**
   * Unregister a method handler
   */
  unregisterMethod(method: string): void {
    this.methodHandlers.delete(method);
  }

  /**
   * Get list of registered methods
   */
  getRegisteredMethods(): string[] {
    return Array.from(this.methodHandlers.keys());
  }
}