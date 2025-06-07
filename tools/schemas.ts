// JSON Schema interface for tool input schemas
export interface JSONSchemaType {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchemaType>;
  required?: string[];
  items?: JSONSchemaType;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  description?: string;
  title?: string;
}

// MCP Protocol Message Interfaces
export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface MCPRequest extends MCPMessage {
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse extends MCPMessage {
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// Tool-specific interfaces
export interface ToolInputValidation {
  toolName: string;
  inputSchema: JSONSchemaType;
  args: Record<string, unknown>;
}

export interface ToolOutput {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Market Data Tool Interfaces
export interface MarketDataTickerArgs {
  symbol: string;
}

export interface MarketDataOrderBookArgs {
  symbol: string;
  limit?: number;
}

export interface MarketDataTradesArgs {
  symbol: string;
  limit?: number;
}

export interface MarketDataKlineArgs {
  symbol: string;
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';
  startTime?: number;
  endTime?: number;
  limit?: number;
}

// Auth Tool Interfaces
export interface AuthLoginArgs {
  apiKey: string;
  secretKey: string;
}

export interface AuthValidateArgs {
  token: string;
}

// Validation error type
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

// Utility function to validate tool arguments using JSON Schema
export function validateToolArgs(
  toolName: string,
  inputSchema: JSONSchemaType,
  args: Record<string, unknown>
): void {
  const errors = validateJSONSchema(inputSchema, args);
  if (errors.length > 0) {
    throw new Error(
      `Invalid arguments for tool '${toolName}': ${errors.map((e) => e.message).join(', ')}`
    );
  }
}

// Native TypeScript JSON Schema validation
function validateJSONSchema(schema: JSONSchemaType, data: unknown, path = ''): ValidationError[] {
  const errors: ValidationError[] = [];

  if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null) {
      errors.push({ field: path, message: 'Expected object' });
      return errors;
    }

    const dataObj = data as Record<string, unknown>;

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in dataObj) || dataObj[field] === undefined || dataObj[field] === null) {
          errors.push({ field: `${path}${field}`, message: `${field} is required` });
        }
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (key in dataObj) {
          const fieldPath = path ? `${path}.${key}` : key;
          errors.push(...validateJSONSchema(prop, dataObj[key], fieldPath));
        }
      }
    }
  } else if (schema.type === 'string') {
    if (typeof data !== 'string') {
      errors.push({ field: path, message: 'Expected string', value: data });
      return errors;
    }

    if (schema.minLength && data.length < schema.minLength) {
      errors.push({ field: path, message: `Minimum length is ${schema.minLength}`, value: data });
    }

    if (schema.maxLength && data.length > schema.maxLength) {
      errors.push({ field: path, message: `Maximum length is ${schema.maxLength}`, value: data });
    }

    if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
      errors.push({
        field: path,
        message: `Does not match pattern ${schema.pattern}`,
        value: data,
      });
    }

    if (schema.enum && !schema.enum.includes(data)) {
      errors.push({
        field: path,
        message: `Must be one of: ${schema.enum.join(', ')}`,
        value: data,
      });
    }
  } else if (schema.type === 'number') {
    if (typeof data !== 'number') {
      errors.push({ field: path, message: 'Expected number', value: data });
      return errors;
    }

    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push({ field: path, message: `Minimum value is ${schema.minimum}`, value: data });
    }

    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push({ field: path, message: `Maximum value is ${schema.maximum}`, value: data });
    }
  } else if (schema.type === 'boolean') {
    if (typeof data !== 'boolean') {
      errors.push({ field: path, message: 'Expected boolean', value: data });
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(data)) {
      errors.push({ field: path, message: 'Expected array', value: data });
      return errors;
    }

    if (schema.items) {
      data.forEach((item, index) => {
        errors.push(...validateJSONSchema(schema.items, item, `${path}[${index}]`));
      });
    }
  }

  return errors;
}

// MCP JSON Schemas as plain objects for protocol compatibility
export const MCPToolSchemas = {
  ticker: {
    type: 'object',
    properties: {
      symbol: { type: 'string', minLength: 1, description: 'Trading symbol' },
    },
    required: ['symbol'],
  },
  orderBook: {
    type: 'object',
    properties: {
      symbol: { type: 'string', minLength: 1, description: 'Trading symbol' },
      limit: { type: 'number', minimum: 1, maximum: 5000, description: 'Number of orders' },
    },
    required: ['symbol'],
  },
  trades: {
    type: 'object',
    properties: {
      symbol: { type: 'string', minLength: 1, description: 'Trading symbol' },
      limit: { type: 'number', minimum: 1, maximum: 1000, description: 'Number of trades' },
    },
    required: ['symbol'],
  },
  kline: {
    type: 'object',
    properties: {
      symbol: { type: 'string', minLength: 1, description: 'Trading symbol' },
      interval: {
        type: 'string',
        enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'],
        description: 'Kline interval',
      },
      startTime: { type: 'number', description: 'Start time timestamp' },
      endTime: { type: 'number', description: 'End time timestamp' },
      limit: { type: 'number', minimum: 1, maximum: 1000, description: 'Number of klines' },
    },
    required: ['symbol', 'interval'],
  },
  authLogin: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', minLength: 1, description: 'MEXC API Key' },
      secretKey: { type: 'string', minLength: 1, description: 'MEXC Secret Key' },
    },
    required: ['apiKey', 'secretKey'],
  },
  authValidate: {
    type: 'object',
    properties: {
      token: { type: 'string', minLength: 1, description: 'Authentication token' },
    },
    required: ['token'],
  },
} as const;
