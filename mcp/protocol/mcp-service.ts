/**
 * MCP Service Integration
 * Task #17: Integrates JSON-RPC handler with Encore.ts service
 * Provides HTTP endpoint for MCP protocol communication
 */

import { api } from 'encore.dev/api';
import { JsonRpcHandler } from './jsonrpc-handler';

// Initialize the JSON-RPC handler
const jsonRpcHandler = new JsonRpcHandler();

/**
 * MCP JSON-RPC endpoint
 * Handles MCP protocol requests using JSON-RPC 2.0
 */
interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: string | number | null;
}

interface MCPResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number | null;
}

interface MCPBatchRequest {
  requests: MCPRequest[];
}

interface MCPBatchResponse {
  responses: MCPResponse[];
}

export const mcpProtocol = api(
  { expose: true, method: 'POST', path: '/mcp/protocol' },
  async (req: MCPRequest): Promise<MCPResponse> => {
    return await jsonRpcHandler.handleRequest(req);
  }
);

/**
 * MCP batch protocol endpoint
 * Handles batch MCP protocol requests
 */
export const mcpBatchProtocol = api(
  { expose: true, method: 'POST', path: '/mcp/protocol/batch' },
  async (req: MCPBatchRequest): Promise<MCPBatchResponse> => {
    const responses = await jsonRpcHandler.handleBatchRequest(req.requests);
    return { responses };
  }
);

/**
 * MCP protocol info endpoint
 * Returns information about supported MCP features
 */
interface MCPInfoResponse {
  name: string;
  version: string;
  protocolVersion: string;
  capabilities: {
    tools: boolean;
    resources: boolean;
    notifications: boolean;
  };
  supportedMethods: string[];
}

export const mcpInfo = api(
  { expose: true, method: 'GET', path: '/mcp/info' },
  async (): Promise<MCPInfoResponse> => {
    return {
      name: 'MEXC MCP Server',
      version: '1.0.0',
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: true,
        resources: true,
        notifications: true,
      },
      supportedMethods: jsonRpcHandler.getRegisteredMethods(),
    };
  }
);