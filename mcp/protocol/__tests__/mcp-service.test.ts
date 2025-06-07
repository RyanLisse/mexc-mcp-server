/**
 * MCP Service Integration Tests
 * Task #17: Tests for complete MCP protocol service
 */

import { describe, expect, it } from 'vitest';

// Note: Since this is an Encore.ts service, we test the handler logic
// The actual API endpoints would be tested through Encore's testing framework
import { JsonRpcHandler } from '../jsonrpc-handler';

describe('MCP Service Integration', () => {
  const handler = new JsonRpcHandler();

  describe('Protocol Compliance', () => {
    it('should handle MCP initialize handshake', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
        id: 1,
      };

      const response = await handler.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result.protocolVersion).toBe('2024-11-05');
      expect(response.result.capabilities).toBeDefined();
      expect(response.result.serverInfo).toBeDefined();
    });

    it('should list available tools', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        method: 'tools/list',
        id: 2,
      };

      const response = await handler.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(2);
      expect(response.result.tools).toBeInstanceOf(Array);
      expect(response.result.tools.length).toBeGreaterThan(0);

      // Verify each tool has required fields
      for (const tool of response.result.tools) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
      }
    });

    it('should execute tool calls', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        method: 'tools/call',
        params: {
          name: 'mexc_get_ticker',
          arguments: { symbol: 'BTCUSDT' },
        },
        id: 3,
      };

      const response = await handler.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(3);
      expect(response.result.content).toBeInstanceOf(Array);
      expect(response.result.content[0].type).toBe('text');
      expect(response.result.content[0].text).toContain('BTCUSDT');
    });
  });

  describe('Batch Processing', () => {
    it('should handle batch requests correctly', async () => {
      const batchRequest = [
        {
          jsonrpc: '2.0' as const,
          method: 'tools/list',
          id: 1,
        },
        {
          jsonrpc: '2.0' as const,
          method: 'tools/call',
          params: {
            name: 'mexc_get_ticker',
            arguments: { symbol: 'ETHUSDT' },
          },
          id: 2,
        },
      ];

      const responses = await handler.handleBatchRequest(batchRequest);

      expect(Array.isArray(responses)).toBe(true);
      expect(responses).toHaveLength(2);

      expect(responses[0].id).toBe(1);
      expect(responses[0].result.tools).toBeDefined();

      expect(responses[1].id).toBe(2);
      expect(responses[1].result.content[0].text).toContain('ETHUSDT');
    });
  });

  describe('Error Handling', () => {
    it('should return method not found error for unknown methods', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        method: 'unknown/method',
        id: 4,
      };

      const response = await handler.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(4);
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32601); // Method not found
    });

    it('should handle invalid parameters gracefully', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        method: 'tools/call',
        params: {
          name: 'mexc_get_ticker',
          // Missing required arguments
        },
        id: 5,
      };

      const response = await handler.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(5);
      // Should handle gracefully without crashing
    });
  });

  describe('Service Registration', () => {
    it('should allow registering new methods', () => {
      const customHandler = async (params: any) => ({ custom: 'response', params });

      handler.registerMethod('custom/test', customHandler);

      const methods = handler.getRegisteredMethods();
      expect(methods).toContain('custom/test');
    });

    it('should allow unregistering methods', () => {
      handler.registerMethod('temp/method', async () => ({}));
      expect(handler.getRegisteredMethods()).toContain('temp/method');

      handler.unregisterMethod('temp/method');
      expect(handler.getRegisteredMethods()).not.toContain('temp/method');
    });
  });
});
