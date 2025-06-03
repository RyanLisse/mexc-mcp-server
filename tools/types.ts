// MCP Protocol Types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  execute: any;
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
  inputSchema: any;
  execute: any;
}

// Tool Registry Interface
export interface ToolRegistry {
  register: any;
  unregister: any;
  get: any;
  list: any;
  execute: any;
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
