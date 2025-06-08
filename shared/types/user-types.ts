// User Management Types for MEXC MCP Server

// =============================================================================
// TypeScript Types for User Management
// =============================================================================

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type TradeSide = 'BUY' | 'SELL';
export type TradeStatus = 'PENDING' | 'FILLED' | 'CANCELLED' | 'FAILED';

export interface User {
  id: number;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  subscriptionTier: SubscriptionTier;
}

export interface UserCredentials {
  id: number;
  userId: number;
  mexcApiKeyEncrypted: string;
  mexcSecretKeyEncrypted: string;
  encryptionKeyId: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  lastUsedAt?: Date;
}

export interface UserSession {
  id: number;
  userId: number;
  sessionToken: string;
  expiresAt: Date;
  createdAt: Date;
  lastActivityAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface UserSnipingTarget {
  id: number;
  userId: number;
  targetSymbol: string;
  quantity: number;
  maxPrice?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTrade {
  id: number;
  userId: number;
  exchangeOrderId?: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  price: number;
  totalValue: number;
  fees: number;
  status: TradeStatus;
  executedAt: Date;
  createdAt: Date;
  pnl1m?: number;
  pnl5m?: number;
  pnl15m?: number;
  pnl1h?: number;
  isSnipe: boolean;
}

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
