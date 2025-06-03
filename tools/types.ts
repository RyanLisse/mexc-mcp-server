import { z } from 'zod';

// MCP Protocol Types
export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.any()),
});

export const MCPToolCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.any()).optional(),
});

export const MCPToolResultSchema = z.object({
  content: z.array(
    z.object({
      type: z.literal('text'),
      text: z.string(),
    })
  ),
  isError: z.boolean().optional(),
});

export const MCPListToolsRequestSchema = z.object({
  method: z.literal('tools/list'),
  params: z.object({}).optional(),
});

export const MCPListToolsResponseSchema = z.object({
  tools: z.array(MCPToolSchema),
});

export const MCPCallToolRequestSchema = z.object({
  method: z.literal('tools/call'),
  params: z.object({
    name: z.string(),
    arguments: z.record(z.any()).optional(),
  }),
});

export const MCPCallToolResponseSchema = z.object({
  content: z.array(
    z.object({
      type: z.literal('text'),
      text: z.string(),
    })
  ),
  isError: z.boolean().optional(),
});

// Internal Types
export type MCPTool = z.infer<typeof MCPToolSchema>;
export type MCPToolCall = z.infer<typeof MCPToolCallSchema>;
export type MCPToolResult = z.infer<typeof MCPToolResultSchema>;
export type MCPListToolsRequest = z.infer<typeof MCPListToolsRequestSchema>;
export type MCPListToolsResponse = z.infer<typeof MCPListToolsResponseSchema>;
export type MCPCallToolRequest = z.infer<typeof MCPCallToolRequestSchema>;
export type MCPCallToolResponse = z.infer<typeof MCPCallToolResponseSchema>;

// Tool Execution Context
export interface ToolExecutionContext {
  userId?: string;
  sessionId?: string;
  timestamp: Date;
}

// Tool Handler Interface
export interface ToolHandler {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  execute(args: Record<string, any>, context: ToolExecutionContext): Promise<MCPToolResult>;
}

// Tool Registry Interface
export interface ToolRegistry {
  register(handler: ToolHandler): void;
  unregister(name: string): boolean;
  get(name: string): ToolHandler | undefined;
  list(): MCPTool[];
  execute(
    name: string,
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<MCPToolResult>;
}

// Tool Execution Error
export class ToolExecutionError extends Error {
  constructor(
    public toolName: string,
    message: string,
    public cause?: Error
  ) {
    super(`Tool '${toolName}' execution failed: ${message}`);
    this.name = 'ToolExecutionError';
  }
}

// Tool Registration Error
export class ToolRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolRegistrationError';
  }
}

// Tool Validation Error
export class ToolValidationError extends Error {
  constructor(
    public toolName: string,
    message: string,
    public validationErrors?: any[]
  ) {
    super(`Tool '${toolName}' validation failed: ${message}`);
    this.name = 'ToolValidationError';
  }
}
