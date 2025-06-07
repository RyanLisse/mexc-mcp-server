// User Management Types for MEXC MCP Server
import { z } from 'zod';

// =============================================================================
// Zod Schemas for User Management
// =============================================================================

export const SubscriptionTierSchema = z.enum(['free', 'pro', 'enterprise']);
export const TradeSideSchema = z.enum(['BUY', 'SELL']);
export const TradeStatusSchema = z.enum(['PENDING', 'FILLED', 'CANCELLED', 'FAILED']);

export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  createdAt: z.date(),
  updatedAt: z.date(),
  isActive: z.boolean(),
  subscriptionTier: SubscriptionTierSchema,
});

export const UserCredentialsSchema = z.object({
  id: z.number(),
  userId: z.number(),
  mexcApiKeyEncrypted: z.string(),
  mexcSecretKeyEncrypted: z.string(),
  encryptionKeyId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  isActive: z.boolean(),
  lastUsedAt: z.date().optional(),
});

export const UserSessionSchema = z.object({
  id: z.number(),
  userId: z.number(),
  sessionToken: z.string(),
  expiresAt: z.date(),
  createdAt: z.date(),
  lastActivityAt: z.date(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export const UserSnipingTargetSchema = z.object({
  id: z.number(),
  userId: z.number(),
  targetSymbol: z.string(),
  quantity: z.number(),
  maxPrice: z.number().optional(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UserTradeSchema = z.object({
  id: z.number(),
  userId: z.number(),
  exchangeOrderId: z.string().optional(),
  symbol: z.string(),
  side: TradeSideSchema,
  quantity: z.number(),
  price: z.number(),
  totalValue: z.number(),
  fees: z.number(),
  status: TradeStatusSchema,
  executedAt: z.date(),
  createdAt: z.date(),
  pnl1m: z.number().optional(),
  pnl5m: z.number().optional(),
  pnl15m: z.number().optional(),
  pnl1h: z.number().optional(),
  isSnipe: z.boolean(),
});

// =============================================================================
// TypeScript Types (inferred from schemas)
// =============================================================================

export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;
export type TradeSide = z.infer<typeof TradeSideSchema>;
export type TradeStatus = z.infer<typeof TradeStatusSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserCredentials = z.infer<typeof UserCredentialsSchema>;
export type UserSession = z.infer<typeof UserSessionSchema>;
export type UserSnipingTarget = z.infer<typeof UserSnipingTargetSchema>;
export type UserTrade = z.infer<typeof UserTradeSchema>;

// =============================================================================
// API Request/Response Types
// =============================================================================

// Authentication Types
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: Omit<User, 'id'> & { id: string };
  sessionToken?: string;
  expiresAt?: Date;
  error?: string;
}

// Credential Management Types
export interface SetCredentialsRequest {
  mexcApiKey: string;
  mexcSecretKey: string;
}

export interface GetCredentialsResponse {
  hasCredentials: boolean;
  lastUsedAt?: Date;
  createdAt?: Date;
}

export interface CredentialsResponse {
  success: boolean;
  error?: string;
}

// Sniping Target Management
export interface CreateSnipingTargetRequest {
  targetSymbol: string;
  quantity: number;
  maxPrice?: number;
}

export interface UpdateSnipingTargetRequest {
  targetId: number;
  quantity?: number;
  maxPrice?: number;
  isActive?: boolean;
}

export interface SnipingTargetsResponse {
  targets: UserSnipingTarget[];
}

export interface SnipingTargetResponse {
  success: boolean;
  target?: UserSnipingTarget;
  error?: string;
}

// Trading History Types
export interface GetTradesRequest {
  symbol?: string;
  startDate?: Date;
  endDate?: Date;
  isSnipeOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface TradesResponse {
  trades: UserTrade[];
  total: number;
  hasMore: boolean;
}

// Portfolio Types
export interface UserPortfolioResponse {
  totalValue: number;
  totalPnL: number;
  activeTargets: number;
  totalTrades: number;
  snipeSuccessRate: number;
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

// =============================================================================
// Database Row Types (matching SQL schema)
// =============================================================================

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  subscription_tier: SubscriptionTier;
}

export interface UserCredentialsRow {
  id: number;
  user_id: number;
  mexc_api_key_encrypted: string;
  mexc_secret_key_encrypted: string;
  encryption_key_id: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  last_used_at?: Date;
}

export interface UserSessionRow {
  id: number;
  user_id: number;
  session_token: string;
  expires_at: Date;
  created_at: Date;
  last_activity_at: Date;
  ip_address?: string;
  user_agent?: string;
}

export interface UserSnipingTargetRow {
  id: number;
  user_id: number;
  target_symbol: string;
  quantity: number;
  max_price?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserTradeRow {
  id: number;
  user_id: number;
  exchange_order_id?: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  price: number;
  total_value: number;
  fees: number;
  status: TradeStatus;
  executed_at: Date;
  created_at: Date;
  pnl_1m?: number;
  pnl_5m?: number;
  pnl_15m?: number;
  pnl_1h?: number;
  is_snipe: boolean;
}

// =============================================================================
// Authentication Data Types
// =============================================================================

export interface AuthData {
  userId: number;
  email: string;
  subscriptionTier: SubscriptionTier;
  sessionId: number;
}

// =============================================================================
// Error Types
// =============================================================================

export class UserError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'UserError';
  }
}

export class AuthenticationError extends UserError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', details);
    this.name = 'AuthenticationError';
  }
}

export class CredentialsError extends UserError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CREDENTIALS_ERROR', details);
    this.name = 'CredentialsError';
  }
}

export class AuthorizationError extends UserError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', details);
    this.name = 'AuthorizationError';
  }
}

// =============================================================================
// Service Response Types
// =============================================================================

export interface UserServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// =============================================================================
// Encryption Types
// =============================================================================

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
}

export interface EncryptedData {
  encrypted: string;
  keyId: string;
  algorithm: string;
}
