import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { ToolExecutor } from './executor';
import { ToolRegistry } from './registry';
import { validateToolArgs } from './schemas';
import {
  type MCPToolResult,
  type ToolExecutionContext,
  ToolExecutionError,
  type ToolHandler,
  ToolRegistrationError,
  ToolValidationError,
} from './types';

// Mock tool handlers for testing
const mockMarketDataTool: ToolHandler = {
  name: 'mexc_get_ticker',
  description: 'Get ticker data for a symbol',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: { type: 'string', minLength: 1 },
    },
    required: ['symbol'],
  },
  async execute(args: Record<string, any>, context: ToolExecutionContext): Promise<MCPToolResult> {
    if (!args.symbol) {
      throw new Error('Symbol is required');
    }
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            symbol: args.symbol,
            price: '100.50',
            timestamp: context.timestamp.toISOString(),
          }),
        },
      ],
    };
  },
};

const mockAuthTool: ToolHandler = {
  name: 'mexc_auth_login',
  description: 'Authenticate with MEXC API',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', minLength: 1 },
      secretKey: { type: 'string', minLength: 1 },
    },
    required: ['apiKey', 'secretKey'],
  },
  async execute(args: Record<string, any>, context: ToolExecutionContext): Promise<MCPToolResult> {
    if (!args.apiKey || !args.secretKey) {
      throw new Error('API Key and Secret Key are required');
    }
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            token: 'mock-token-123',
            userId: context.userId,
          }),
        },
      ],
    };
  },
};

const mockFailingTool: ToolHandler = {
  name: 'failing_tool',
  description: 'A tool that always fails',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  async execute(): Promise<MCPToolResult> {
    throw new Error('This tool always fails');
  },
};

describe('Tool Registry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  test('should register a tool successfully', () => {
    registry.register(mockMarketDataTool);
    const tool = registry.get('mexc_get_ticker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('mexc_get_ticker');
    expect(tool?.description).toBe('Get ticker data for a symbol');
  });

  test('should throw error when registering duplicate tool', () => {
    registry.register(mockMarketDataTool);
    expect(() => registry.register(mockMarketDataTool)).toThrow(ToolRegistrationError);
  });

  test('should unregister a tool successfully', () => {
    registry.register(mockMarketDataTool);
    const removed = registry.unregister('mexc_get_ticker');
    expect(removed).toBe(true);
    expect(registry.get('mexc_get_ticker')).toBeUndefined();
  });

  test('should return false when unregistering non-existent tool', () => {
    const removed = registry.unregister('non_existent_tool');
    expect(removed).toBe(false);
  });

  test('should list all registered tools', () => {
    registry.register(mockMarketDataTool);
    registry.register(mockAuthTool);

    const tools = registry.list();
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name)).toContain('mexc_get_ticker');
    expect(tools.map((t) => t.name)).toContain('mexc_auth_login');
  });

  test('should execute tool successfully', async () => {
    registry.register(mockMarketDataTool);

    const context: ToolExecutionContext = {
      userId: 'test-user',
      sessionId: 'test-session',
      timestamp: new Date(),
    };

    const result = await registry.execute('mexc_get_ticker', { symbol: 'BTCUSDT' }, context);
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('BTCUSDT');
  });

  test('should throw error when executing non-existent tool', async () => {
    const context: ToolExecutionContext = {
      timestamp: new Date(),
    };

    await expect(registry.execute('non_existent_tool', {}, context)).rejects.toThrow(
      ToolExecutionError
    );
  });

  test('should handle tool execution errors', async () => {
    registry.register(mockFailingTool);

    const context: ToolExecutionContext = {
      timestamp: new Date(),
    };

    const result = await registry.execute('failing_tool', {}, context);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('This tool always fails');
  });
});

describe('Tool Executor', () => {
  let executor: ToolExecutor;
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
    executor = new ToolExecutor(registry);
    registry.register(mockMarketDataTool);
    registry.register(mockAuthTool);
  });

  test('should execute tool with valid arguments', async () => {
    const context: ToolExecutionContext = {
      userId: 'test-user',
      timestamp: new Date(),
    };

    const result = await executor.execute('mexc_get_ticker', { symbol: 'ETHUSDT' }, context);
    expect(result.content).toBeDefined();
    expect(result.content[0].text).toContain('ETHUSDT');
  });

  test('should validate tool arguments before execution', async () => {
    const context: ToolExecutionContext = {
      timestamp: new Date(),
    };

    await expect(executor.execute('mexc_get_ticker', {}, context)).rejects.toThrow(
      ToolValidationError
    );
  });

  test('should handle missing required arguments', async () => {
    const context: ToolExecutionContext = {
      timestamp: new Date(),
    };

    await expect(executor.execute('mexc_auth_login', { apiKey: 'test' }, context)).rejects.toThrow(
      ToolValidationError
    );
  });

  test('should execute tool with context', async () => {
    const context: ToolExecutionContext = {
      userId: 'test-user-123',
      sessionId: 'session-456',
      timestamp: new Date(),
    };

    const result = await executor.execute(
      'mexc_auth_login',
      {
        apiKey: 'test-key',
        secretKey: 'test-secret',
      },
      context
    );

    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.userId).toBe('test-user-123');
  });

  test('should handle execution timeout', async () => {
    const slowTool: ToolHandler = {
      name: 'slow_tool',
      description: 'A slow tool',
      inputSchema: { type: 'object', properties: {} },
      async execute(): Promise<MCPToolResult> {
        await new Promise((resolve) => setTimeout(resolve, 6000)); // 6 seconds
        return { content: [{ type: 'text', text: 'done' }] };
      },
    };

    registry.register(slowTool);

    const context: ToolExecutionContext = {
      timestamp: new Date(),
    };

    await expect(executor.execute('slow_tool', {}, context, 1000)) // 1 second timeout
      .rejects.toThrow('Tool execution timed out');
  });
});

describe('Schema Validation', () => {
  test('should validate simple string schema', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 },
      },
      required: ['name'],
    };

    expect(() => validateToolArgs('test_tool', schema, { name: 'test' })).not.toThrow();

    expect(() => validateToolArgs('test_tool', schema, {})).toThrow('Invalid arguments');

    expect(() => validateToolArgs('test_tool', schema, { name: '' })).toThrow('Invalid arguments');
  });

  test('should validate number schema with constraints', () => {
    const schema = {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 1000 },
      },
      required: ['limit'],
    };

    expect(() => validateToolArgs('test_tool', schema, { limit: 50 })).not.toThrow();

    expect(() => validateToolArgs('test_tool', schema, { limit: 0 })).toThrow('Invalid arguments');

    expect(() => validateToolArgs('test_tool', schema, { limit: 1001 })).toThrow(
      'Invalid arguments'
    );
  });

  test('should validate enum schema', () => {
    const schema = {
      type: 'object',
      properties: {
        interval: { type: 'string', enum: ['1m', '5m', '1h', '1d'] },
      },
      required: ['interval'],
    };

    expect(() => validateToolArgs('test_tool', schema, { interval: '1m' })).not.toThrow();

    expect(() => validateToolArgs('test_tool', schema, { interval: '2m' })).toThrow(
      'Invalid arguments'
    );
  });

  test('should handle optional fields', () => {
    const schema = {
      type: 'object',
      properties: {
        symbol: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['symbol'],
    };

    expect(() => validateToolArgs('test_tool', schema, { symbol: 'BTCUSDT' })).not.toThrow();

    expect(() =>
      validateToolArgs('test_tool', schema, { symbol: 'BTCUSDT', limit: 100 })
    ).not.toThrow();
  });
});

describe('Error Handling', () => {
  test('should create ToolExecutionError with proper message', () => {
    const error = new ToolExecutionError('test_tool', 'Something went wrong');
    expect(error.message).toBe("Tool 'test_tool' execution failed: Something went wrong");
    expect(error.toolName).toBe('test_tool');
    expect(error.name).toBe('ToolExecutionError');
  });

  test('should create ToolRegistrationError', () => {
    const error = new ToolRegistrationError('Tool already exists');
    expect(error.message).toBe('Tool already exists');
    expect(error.name).toBe('ToolRegistrationError');
  });

  test('should create ToolValidationError', () => {
    const validationErrors = [{ field: 'symbol', message: 'Required' }];
    const error = new ToolValidationError('test_tool', 'Validation failed', validationErrors);
    expect(error.message).toBe("Tool 'test_tool' validation failed: Validation failed");
    expect(error.toolName).toBe('test_tool');
    expect(error.validationErrors).toEqual(validationErrors);
    expect(error.name).toBe('ToolValidationError');
  });
});

describe('Integration Tests', () => {
  let registry: ToolRegistry;
  let executor: ToolExecutor;

  beforeEach(() => {
    registry = new ToolRegistry();
    executor = new ToolExecutor(registry);
  });

  test('should handle complete tool lifecycle', async () => {
    // Register tool
    registry.register(mockMarketDataTool);
    expect(registry.list()).toHaveLength(1);

    // Execute tool
    const context: ToolExecutionContext = {
      userId: 'integration-test',
      timestamp: new Date(),
    };

    const result = await executor.execute('mexc_get_ticker', { symbol: 'BTCUSDT' }, context);
    expect(result.content[0].text).toContain('BTCUSDT');

    // Unregister tool
    registry.unregister('mexc_get_ticker');
    expect(registry.list()).toHaveLength(0);
  });

  test('should handle multiple tools execution', async () => {
    registry.register(mockMarketDataTool);
    registry.register(mockAuthTool);

    const context: ToolExecutionContext = {
      userId: 'multi-test',
      timestamp: new Date(),
    };

    // Execute market data tool
    const tickerResult = await executor.execute('mexc_get_ticker', { symbol: 'ETHUSDT' }, context);
    expect(tickerResult.content[0].text).toContain('ETHUSDT');

    // Execute auth tool
    const authResult = await executor.execute(
      'mexc_auth_login',
      { apiKey: 'key', secretKey: 'secret' },
      context
    );
    expect(authResult.content[0].text).toContain('mock-token-123');
  });

  test('should maintain tool isolation', async () => {
    const tool1: ToolHandler = {
      name: 'tool1',
      description: 'Tool 1',
      inputSchema: { type: 'object', properties: {} },
      async execute(): Promise<MCPToolResult> {
        return { content: [{ type: 'text', text: 'tool1 result' }] };
      },
    };

    const tool2: ToolHandler = {
      name: 'tool2',
      description: 'Tool 2',
      inputSchema: { type: 'object', properties: {} },
      async execute(): Promise<MCPToolResult> {
        return { content: [{ type: 'text', text: 'tool2 result' }] };
      },
    };

    registry.register(tool1);
    registry.register(tool2);

    const context: ToolExecutionContext = { timestamp: new Date() };

    const result1 = await executor.execute('tool1', {}, context);
    const result2 = await executor.execute('tool2', {}, context);

    expect(result1.content[0].text).toBe('tool1 result');
    expect(result2.content[0].text).toBe('tool2 result');
  });
});
