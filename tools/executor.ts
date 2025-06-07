import {
  type MCPToolResult,
  type ToolExecutionContext,
  ToolExecutionError,
  type ToolRegistry,
  ToolValidationError,
} from './types';

// Simple validation function to replace Zod validation
function validateToolArgs(
  _toolName: string,
  inputSchema: Record<string, unknown>,
  args: Record<string, unknown>
): void {
  if (!inputSchema || typeof inputSchema !== 'object') {
    return; // Skip validation if no schema
  }

  const schema = inputSchema as { required?: string[] };
  if (schema.required) {
    for (const field of schema.required) {
      if (args[field] === undefined || args[field] === null) {
        throw new Error(`Required field '${field}' is missing`);
      }
    }
  }
}

export class ToolExecutor {
  constructor(private registry: ToolRegistry) {}

  async execute(
    name: string,
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
    timeoutMs?: number
  ): Promise<MCPToolResult> {
    const handler = this.registry.get(name);
    if (!handler) {
      throw new ToolExecutionError(name, `Tool '${name}' not found`);
    }

    // Validate arguments before execution
    try {
      validateToolArgs(name, handler.inputSchema, args);
    } catch (error) {
      throw new ToolValidationError(name, error instanceof Error ? error.message : String(error));
    }

    // Execute with optional timeout
    if (timeoutMs && timeoutMs > 0) {
      return this.executeWithTimeout(name, args, timeoutMs, context);
    }

    try {
      return await handler.execute(args, context);
    } catch (error) {
      throw new ToolExecutionError(
        name,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined
      );
    }
  }

  private async executeWithTimeout(
    name: string,
    args: Record<string, unknown>,
    timeoutMs: number,
    context?: ToolExecutionContext
  ): Promise<MCPToolResult> {
    const handler = this.registry.get(name);
    if (!handler) {
      throw new ToolExecutionError(name, `Tool '${name}' not found`);
    }

    return new Promise<MCPToolResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new ToolExecutionError(name, 'Tool execution timed out'));
      }, timeoutMs);

      handler
        .execute(args, context)
        .then((result: MCPToolResult) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error: unknown) => {
          clearTimeout(timeoutId);
          reject(
            new ToolExecutionError(
              name,
              error instanceof Error ? error.message : String(error),
              error instanceof Error ? error : undefined
            )
          );
        });
    });
  }

  async executeMultiple(
    calls: Array<{ name: string; args: Record<string, unknown> }>,
    context?: ToolExecutionContext,
    timeoutMs?: number
  ): Promise<MCPToolResult[]> {
    const promises = calls.map((call) =>
      this.execute(call.name, call.args, context, timeoutMs).catch((error) => ({
        content: [
          {
            type: 'text' as const,
            text: error instanceof Error ? error.message : String(error),
          },
        ],
        isError: true,
      }))
    );

    return Promise.all(promises);
  }

  async executeBatch(
    calls: Array<{ name: string; args: Record<string, unknown> }>,
    context?: ToolExecutionContext,
    options?: {
      timeoutMs?: number;
      maxConcurrency?: number;
      stopOnFirstError?: boolean;
    }
  ): Promise<MCPToolResult[]> {
    const { timeoutMs, maxConcurrency = 5, stopOnFirstError = false } = options || {};
    const results: MCPToolResult[] = [];
    const errors: Error[] = [];

    // Process in batches to limit concurrency
    for (let i = 0; i < calls.length; i += maxConcurrency) {
      const batch = calls.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(async (call) => {
        try {
          return await this.execute(call.name, call.args, context, timeoutMs);
        } catch (error) {
          if (stopOnFirstError) {
            throw error;
          }
          errors.push(error instanceof Error ? error : new Error(String(error)));
          return {
            content: [
              {
                type: 'text' as const,
                text: error instanceof Error ? error.message : String(error),
              },
            ],
            isError: true,
          };
        }
      });

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        if (stopOnFirstError) {
          throw error;
        }
      }
    }

    return results;
  }

  getAvailableTools(): string[] {
    return this.registry.list().map((tool: { name: string }) => tool.name);
  }

  hasTools(): boolean {
    return this.registry.list().length > 0;
  }
}
