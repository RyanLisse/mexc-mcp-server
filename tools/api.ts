import { api } from 'encore.dev/api';
import { z } from 'zod';
import { toolsService } from './encore.service';
import {
  MCPCallToolRequestSchema,
  MCPCallToolResponseSchema,
  MCPListToolsRequestSchema,
  MCPListToolsResponseSchema,
} from './schemas';
import type {
  MCPCallToolRequest,
  MCPCallToolResponse,
  MCPListToolsRequest,
  MCPListToolsResponse,
  ToolExecutionContext,
} from './types';

// List available MCP tools
export const listTools = api(
  {
    method: 'POST',
    path: '/tools/list',
    expose: true,
  },
  async (request: MCPListToolsRequest): Promise<MCPListToolsResponse> => {
    // Validate request
    MCPListToolsRequestSchema.parse(request);

    const tools = await toolsService.listTools();

    const response: MCPListToolsResponse = {
      tools: tools,
    };

    // Validate response
    MCPListToolsResponseSchema.parse(response);

    return response;
  }
);

// Call an MCP tool
export const callTool = api(
  {
    method: 'POST',
    path: '/tools/call',
    expose: true,
  },
  async (request: MCPCallToolRequest): Promise<MCPCallToolResponse> => {
    // Validate request
    MCPCallToolRequestSchema.parse(request);

    const { name, arguments: args = {} } = request.params;

    // Create execution context
    const context: ToolExecutionContext = {
      timestamp: new Date(),
      // TODO: Extract from auth headers when available
      userId: undefined,
      sessionId: undefined,
    };

    const result = await toolsService.executeTool(name, args, context);

    const response: MCPCallToolResponse = {
      content: result.content,
      isError: result.isError,
    };

    // Validate response
    MCPCallToolResponseSchema.parse(response);

    return response;
  }
);

// Get tool details
export const getTool = api(
  {
    method: 'GET',
    path: '/tools/:name',
    expose: true,
  },
  async ({ name }: { name: string }) => {
    const tool = await toolsService.getTool(name);

    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    return tool;
  }
);

// Health check for tools service
export const healthCheck = api(
  {
    method: 'GET',
    path: '/tools/health',
    expose: true,
  },
  async () => {
    const status = await toolsService.getHealth();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      ...status,
    };
  }
);

// Execute multiple tools in batch
export const batchExecute = api(
  {
    method: 'POST',
    path: '/tools/batch',
    expose: true,
  },
  async (request: {
    calls: Array<{ name: string; arguments?: Record<string, unknown> }>;
    options?: {
      maxConcurrency?: number;
      timeoutMs?: number;
      stopOnFirstError?: boolean;
    };
  }) => {
    const { calls, options } = request;

    // Validate input
    const BatchRequestSchema = z.object({
      calls: z.array(
        z.object({
          name: z.string(),
          arguments: z.record(z.unknown()).optional(),
        })
      ),
      options: z
        .object({
          maxConcurrency: z.number().min(1).max(10).optional(),
          timeoutMs: z.number().min(100).max(60000).optional(),
          stopOnFirstError: z.boolean().optional(),
        })
        .optional(),
    });

    BatchRequestSchema.parse(request);

    const context: ToolExecutionContext = {
      timestamp: new Date(),
      userId: undefined,
      sessionId: undefined,
    };

    const results = await toolsService.executeBatch(
      calls.map((call) => ({ name: call.name, args: call.arguments || {} })),
      context,
      options
    );

    return {
      results,
      executedAt: new Date().toISOString(),
      totalCalls: calls.length,
      successfulCalls: results.filter((r) => !r.isError).length,
      failedCalls: results.filter((r) => r.isError).length,
    };
  }
);

// Get tool execution metrics
export const getMetrics = api(
  {
    method: 'GET',
    path: '/tools/metrics',
    expose: true,
  },
  async () => {
    const metrics = await toolsService.getMetrics();
    return metrics;
  }
);
