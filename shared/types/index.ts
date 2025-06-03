import { z } from 'zod';

// Common MCP types
// JSON Schema types for MCP tool input schemas
export interface JSONSchemaProperty {
  type?: string;
  description?: string;
  enum?: readonly string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: unknown;
  const?: unknown;
  oneOf?: JSONSchemaProperty[];
  anyOf?: JSONSchemaProperty[];
  allOf?: JSONSchemaProperty[];
  not?: JSONSchemaProperty;
  if?: JSONSchemaProperty;
  then?: JSONSchemaProperty;
  else?: JSONSchemaProperty;
  additionalProperties?: boolean | JSONSchemaProperty;
  additionalItems?: boolean | JSONSchemaProperty;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  multipleOf?: number;
  format?: string;
}

export interface JSONSchema extends JSONSchemaProperty {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  definitions?: Record<string, JSONSchemaProperty>;
  $ref?: string;
}

export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.unknown()),
});

export const MCPResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  mimeType: z.string(),
  description: z.string(),
});

// MEXC API types - Updated to match MEXC format (no underscore)
export const MEXCSymbolSchema = z.string().regex(/^[A-Z0-9]+$/, 'Invalid trading symbol format');

export const MEXCTickerSchema = z.object({
  symbol: MEXCSymbolSchema,
  price: z.string(),
  priceChangePercent: z.string(),
  volume: z.string(),
  quoteVolume: z.string(),
  timestamp: z.number(),
});

export const MEXCOrderSchema = z.object({
  symbol: MEXCSymbolSchema,
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['MARKET', 'LIMIT']),
  quantity: z.string(),
  price: z.string().optional(),
  timeInForce: z.enum(['GTC', 'IOC', 'FOK']).optional(),
});

// Error types
export const APIErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

// Export TypeScript types
export type MCPTool = z.infer<typeof MCPToolSchema>;
export type MCPResource = z.infer<typeof MCPResourceSchema>;
export type MEXCSymbol = z.infer<typeof MEXCSymbolSchema>;
export type MEXCTicker = z.infer<typeof MEXCTickerSchema>;
export type MEXCOrder = z.infer<typeof MEXCOrderSchema>;
export type APIError = z.infer<typeof APIErrorSchema>;

// Additional types for market data tools
export interface TickerData {
  symbol: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  open: string;
  high: string;
  low: string;
  count: number;
  timestamp: number;
}

export interface OrderBookData {
  symbol: string;
  bids: Array<[string, string]>; // [price, quantity]
  asks: Array<[string, string]>; // [price, quantity]
  timestamp: number;
}

export interface Stats24hData {
  symbol: string;
  volume: string;
  volumeQuote: string;
  priceChange: string;
  priceChangePercent: string;
  high: string;
  low: string;
  trades: number;
  timestamp: number;
}

// Authentication types
export interface AuthenticatedUser {
  userId: string;
  apiKey: string;
  permissions: string[];
}

// Market data types
export interface MarketDataResponse<T> {
  data: T;
  timestamp: number;
  cached: boolean;
}

export interface OrderBookEntry {
  price: string;
  quantity: string;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
}

// Trading types
export interface TradeResult {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  executedQty: string;
  executedPrice: string;
  status: 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELED' | 'PENDING';
  timestamp: number;
}

// Portfolio types
export interface Balance {
  asset: string;
  free: string;
  locked: string;
  total: string;
  usdValue?: string;
}

export interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: string;
  entryPrice: string;
  currentPrice: string;
  pnl: string;
  pnlPercent: string;
  timestamp: number;
}

// Common trading symbols for MEXC (without underscores)
export const COMMON_MEXC_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'ADAUSDT',
  'DOTUSDT',
  'XRPUSDT',
  'LINKUSDT',
  'LTCUSDT',
  'BCHUSDT',
  'XLMUSDT',
] as const;

export type CommonMEXCSymbol = (typeof COMMON_MEXC_SYMBOLS)[number];

// Helper function to validate MEXC symbols
export function isValidMEXCSymbol(symbol: string): boolean {
  return MEXCSymbolSchema.safeParse(symbol).success;
}

// Helper function to format symbol for display (adds underscore for readability)
export function formatSymbolForDisplay(symbol: string): string {
  // Try to intelligently split common patterns
  const commonQuotes = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB'];

  for (const quote of commonQuotes) {
    if (symbol.endsWith(quote)) {
      const base = symbol.slice(0, -quote.length);
      return `${base}_${quote}`;
    }
  }

  return symbol; // Return as-is if we can't split it
}

// Helper function to convert display format back to MEXC format
export function formatSymbolForAPI(symbol: string): string {
  return symbol.replace('_', '');
}

// Tool argument types
export interface GetTickerArgs {
  symbol: string;
  convert?: string;
}

export interface GetOrderBookArgs {
  symbol: string;
  limit?: number;
}

export interface Get24hStatsArgs {
  symbol?: string;
}

export interface GetActiveSymbolsArgs {
  limit?: number;
}

// Validation error types
export interface ValidationError {
  path: (string | number)[];
  message: string;
  code: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    issues: ValidationError[];
  };
}

// Tool execution result types
export type ToolExecutionResult<T = unknown> = Promise<MarketDataResponse<T>>;

// Cache types
export interface CacheConfig {
  ttlTicker: number;
  ttlOrderbook: number;
  ttlStats: number;
  enabled: boolean;
}

// Health check types
export interface HealthCheckResult {
  status: 'pass' | 'fail';
  message: string;
  timestamp?: number;
  duration?: number;
}

export interface SystemHealthCheck {
  status: 'healthy' | 'unhealthy';
  checks: Record<string, HealthCheckResult>;
  timestamp: number;
  version?: string;
}
