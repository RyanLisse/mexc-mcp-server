// MCP Protocol Types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolCall {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface MCPListToolsRequest {
  method: 'tools/list';
  params?: Record<string, unknown>;
}

export interface MCPListToolsResponse {
  tools: MCPTool[];
}

export interface MCPCallToolRequest {
  method: 'tools/call';
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

export interface MCPCallToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

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
  inputSchema: Record<string, unknown>;
}

// Tool Registry Interface
export interface ToolRegistry {
  tools: ToolHandler[];
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
    public validationErrors?: unknown[]
  ) {
    super(`Tool '${toolName}' validation failed: ${message}`);
    this.name = 'ToolValidationError';
  }
}
