import { z } from 'zod';

// JSON Schema validation for tool input schemas
export const JSONSchemaSchema = z.object({
  type: z.enum(['object', 'array', 'string', 'number', 'boolean', 'null']),
  properties: z.record(z.any()).optional(),
  required: z.array(z.string()).optional(),
  items: z.any().optional(),
  enum: z.array(z.any()).optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  description: z.string().optional(),
  title: z.string().optional(),
});

// MCP Protocol Message Schemas
export const MCPMessageSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string().optional(),
  params: z.record(z.any()).optional(),
  result: z.any().optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
      data: z.any().optional(),
    })
    .optional(),
});

export const MCPRequestSchema = MCPMessageSchema.extend({
  method: z.string(),
  params: z.record(z.any()).optional(),
});

export const MCPResponseSchema = MCPMessageSchema.extend({
  result: z.any().optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
      data: z.any().optional(),
    })
    .optional(),
});

// Tool-specific schemas
export const ToolInputValidationSchema = z.object({
  toolName: z.string(),
  inputSchema: JSONSchemaSchema,
  args: z.record(z.any()),
});

export const ToolOutputSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Market Data Tool Schemas
export const MarketDataTickerArgsSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
});

export const MarketDataOrderBookArgsSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  limit: z.number().min(1).max(5000).optional(),
});

export const MarketDataTradesArgsSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  limit: z.number().min(1).max(1000).optional(),
});

export const MarketDataKlineArgsSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  interval: z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  limit: z.number().min(1).max(1000).optional(),
});

// Auth Tool Schemas
export const AuthLoginArgsSchema = z.object({
  apiKey: z.string().min(1, 'API Key is required'),
  secretKey: z.string().min(1, 'Secret Key is required'),
});

export const AuthValidateArgsSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// Utility function to validate tool arguments
export function validateToolArgs(
  toolName: string,
  inputSchema: any,
  args: Record<string, any>
): void {
  try {
    // Convert JSON Schema to Zod schema for validation
    const zodSchema = convertJSONSchemaToZod(inputSchema);
    zodSchema.parse(args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid arguments for tool '${toolName}': ${error.errors.map((e) => e.message).join(', ')}`
      );
    }
    throw error;
  }
}

// Convert JSON Schema to Zod schema (simplified implementation)
function convertJSONSchemaToZod(schema: any): z.ZodSchema {
  if (schema.type === 'object') {
    const shape: Record<string, z.ZodSchema> = {};

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        let fieldSchema = convertJSONSchemaToZod(prop);

        // Make field optional if not required
        if (!schema.required?.includes(key)) {
          fieldSchema = fieldSchema.optional();
        }

        shape[key] = fieldSchema;
      }
    }

    return z.object(shape);
  }

  if (schema.type === 'string') {
    let stringSchema = z.string();
    if (schema.minLength) stringSchema = stringSchema.min(schema.minLength);
    if (schema.maxLength) stringSchema = stringSchema.max(schema.maxLength);
    if (schema.pattern) stringSchema = stringSchema.regex(new RegExp(schema.pattern));
    if (schema.enum) stringSchema = z.enum(schema.enum);
    return stringSchema;
  }

  if (schema.type === 'number') {
    let numberSchema = z.number();
    if (schema.minimum) numberSchema = numberSchema.min(schema.minimum);
    if (schema.maximum) numberSchema = numberSchema.max(schema.maximum);
    return numberSchema;
  }

  if (schema.type === 'boolean') {
    return z.boolean();
  }

  if (schema.type === 'array') {
    return z.array(schema.items ? convertJSONSchemaToZod(schema.items) : z.any());
  }

  return z.any();
}
