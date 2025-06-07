import {
  type ToolRegistry as IToolRegistry,
  type MCPTool,
  type MCPToolResult,
  type ToolExecutionContext,
  ToolExecutionError,
  type ToolHandler,
  ToolRegistrationError,
} from './types';

export class ToolRegistry implements IToolRegistry {
  private tools = new Map<string, ToolHandler>();

  register(handler: ToolHandler): void {
    if (this.tools.has(handler.name)) {
      throw new ToolRegistrationError(`Tool '${handler.name}' is already registered`);
    }

    // Validate tool handler
    if (!handler.name || typeof handler.name !== 'string') {
      throw new ToolRegistrationError('Tool name must be a non-empty string');
    }

    if (!handler.description || typeof handler.description !== 'string') {
      throw new ToolRegistrationError('Tool description must be a non-empty string');
    }

    if (!handler.inputSchema || typeof handler.inputSchema !== 'object') {
      throw new ToolRegistrationError('Tool inputSchema must be an object');
    }

    if (typeof handler.execute !== 'function') {
      throw new ToolRegistrationError('Tool execute must be a function');
    }

    this.tools.set(handler.name, handler);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  get(name: string): ToolHandler | undefined {
    return this.tools.get(name);
  }

  list(): MCPTool[] {
    return Array.from(this.tools.values()).map((handler) => ({
      name: handler.name,
      description: handler.description,
      inputSchema: handler.inputSchema,
      execute: handler.execute,
    }));
  }

  async execute(
    name: string,
    args: Record<string, unknown>,
    context?: ToolExecutionContext
  ): Promise<MCPToolResult> {
    const handler = this.tools.get(name);
    if (!handler) {
      throw new ToolExecutionError(name, `Tool '${name}' not found`);
    }

    try {
      return await handler.execute(args, context);
    } catch (error) {
      // Return error result instead of throwing
      return {
        content: [
          {
            type: 'text',
            text: error instanceof Error ? error.message : String(error),
          },
        ],
        isError: true,
      };
    }
  }

  clear(): void {
    this.tools.clear();
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  size(): number {
    return this.tools.size;
  }
}
