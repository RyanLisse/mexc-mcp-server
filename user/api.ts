import * as crypto from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { Gateway, type Header, api } from 'encore.dev/api';
import { APIError } from 'encore.dev/api';
import { authHandler } from 'encore.dev/auth';
import { SQLDatabase } from 'encore.dev/storage/sqldb';
import {
  type AuthData,
  type AuthResponse,
  AuthenticationError,
  type CreateSnipingTargetRequest,
  CredentialsError,
  type CredentialsResponse,
  type GetCredentialsResponse,
  type GetTradesRequest,
  type LoginRequest,
  type RegisterRequest,
  type SetCredentialsRequest,
  type SnipingTargetResponse,
  type SnipingTargetsResponse,
  type TradesResponse,
  type UpdateSnipingTargetRequest,
  type UserCredentialsRow,
  type UserPortfolioResponse,
  type UserRow,
  type UserSessionRow,
  type UserSnipingTargetRow,
  type UserTradeRow,
} from '../shared/types/user-types.js';

// Database connection for user management
const db = new SQLDatabase('users', {
  migrations: './shared/audit/migrations',
});

// =============================================================================
// Authentication Handler
// =============================================================================

interface AuthParams {
  authorization: Header<'Authorization'>;
}

export const auth = authHandler<AuthParams, AuthData>(async (params): Promise<AuthData> => {
  const token = params.authorization?.replace('Bearer ', '');
  if (!token) {
    throw APIError.unauthenticated('Missing authorization token');
  }

  try {
    // Validate session token
    const session = await db.queryRow<UserSessionRow>`
        SELECT us.*, u.email, u.subscription_tier
        FROM user_sessions us
        JOIN users u ON us.user_id = u.id
        WHERE us.session_token = ${token}
          AND us.expires_at > NOW()
          AND u.is_active = true
      `;

    if (!session) {
      throw APIError.unauthenticated('Invalid or expired session token');
    }

    // Update last activity
    await db.exec`
        UPDATE user_sessions 
        SET last_activity_at = NOW() 
        WHERE id = ${session.id}
      `;

    return {
      userId: session.user_id,
      email: session.email,
      subscriptionTier: session.subscription_tier,
      sessionId: session.id,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw APIError.unauthenticated('Authentication failed');
  }
});

export const gateway = new Gateway({
  authHandler: auth,
});

// =============================================================================
// Public Authentication Endpoints
// =============================================================================

/**
 * Register a new user account
 */
export const register = api(
  { method: 'POST', path: '/auth/register' },
  async (req: RegisterRequest): Promise<AuthResponse> => {
    try {
      const { email, password } = req;

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AuthenticationError('Invalid email format');
      }

      // Validate password strength
      if (password.length < 8) {
        throw new AuthenticationError('Password must be at least 8 characters long');
      }

      // Check if user already exists
      const existingUser = await db.queryRow`
        SELECT id FROM users WHERE email = ${email}
      `;

      if (existingUser) {
        throw new AuthenticationError('User already exists with this email');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const user = await db.queryRow<UserRow>`
        INSERT INTO users (email, password_hash)
        VALUES (${email}, ${passwordHash})
        RETURNING id, email, created_at, updated_at, is_active, subscription_tier
      `;

      if (!user) {
        throw new AuthenticationError('Failed to create user account');
      }

      // Create session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await db.exec`
        INSERT INTO user_sessions (user_id, session_token, expires_at)
        VALUES (${user.id}, ${sessionToken}, ${expiresAt.toISOString()})
      `;

      return {
        success: true,
        user: {
          id: user.id.toString(),
          email: user.email,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          isActive: user.is_active,
          subscriptionTier: user.subscription_tier,
        },
        sessionToken,
        expiresAt,
      };
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof AuthenticationError) {
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: 'Registration failed',
      };
    }
  }
);

/**
 * Login with email and password
 */
export const login = api(
  { method: 'POST', path: '/auth/login' },
  async (req: LoginRequest): Promise<AuthResponse> => {
    try {
      const { email, password } = req;

      // Find user
      const user = await db.queryRow<UserRow>`
        SELECT id, email, password_hash, created_at, updated_at, is_active, subscription_tier
        FROM users 
        WHERE email = ${email} AND is_active = true
      `;

      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password_hash);
      if (!passwordValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Create session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await db.exec`
        INSERT INTO user_sessions (user_id, session_token, expires_at)
        VALUES (${user.id}, ${sessionToken}, ${expiresAt.toISOString()})
      `;

      return {
        success: true,
        user: {
          id: user.id.toString(),
          email: user.email,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          isActive: user.is_active,
          subscriptionTier: user.subscription_tier,
        },
        sessionToken,
        expiresAt,
      };
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof AuthenticationError) {
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: 'Login failed',
      };
    }
  }
);

/**
 * Logout - invalidate current session
 */
export const logout = api(
  { method: 'POST', path: '/auth/logout', auth: true },
  async (): Promise<{ success: boolean; message: string }> => {
    try {
      const authData = (await import('~encore/auth')).getAuthData()!;

      // Invalidate current session
      await db.exec`
        DELETE FROM user_sessions WHERE id = ${authData.sessionId}
      `;

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'Logout failed',
      };
    }
  }
);

// =============================================================================
// User Credential Management
// =============================================================================

/**
 * Set or update MEXC API credentials for the authenticated user
 */
export const setCredentials = api(
  { method: 'POST', path: '/user/credentials', auth: true },
  async (req: SetCredentialsRequest): Promise<CredentialsResponse> => {
    try {
      const authData = (await import('~encore/auth')).getAuthData()!;
      const { mexcApiKey, mexcSecretKey } = req;

      // Validate MEXC API key format
      if (!mexcApiKey.startsWith('mx0') || mexcApiKey.length !== 64) {
        throw new CredentialsError('Invalid MEXC API key format');
      }

      if (!mexcSecretKey || mexcSecretKey.length < 32) {
        throw new CredentialsError('Invalid MEXC secret key format');
      }

      // Encrypt credentials
      const encryptionKey = crypto.randomBytes(32);
      const keyId = crypto.randomUUID();

      const apiKeyCipher = crypto.createCipher('aes-256-cbc', encryptionKey);
      const encryptedApiKey =
        apiKeyCipher.update(mexcApiKey, 'utf8', 'hex') + apiKeyCipher.final('hex');

      const secretKeyCipher = crypto.createCipher('aes-256-cbc', encryptionKey);
      const encryptedSecretKey =
        secretKeyCipher.update(mexcSecretKey, 'utf8', 'hex') + secretKeyCipher.final('hex');

      // Deactivate existing credentials
      await db.exec`
        UPDATE user_credentials 
        SET is_active = false 
        WHERE user_id = ${authData.userId}
      `;

      // Store new credentials
      await db.exec`
        INSERT INTO user_credentials (
          user_id, mexc_api_key_encrypted, mexc_secret_key_encrypted, encryption_key_id
        ) VALUES (
          ${authData.userId}, ${encryptedApiKey}, ${encryptedSecretKey}, ${keyId}
        )
      `;

      // Store encryption key securely (in production, use proper key management)
      // For now, this is a simplified approach
      // TODO: Implement proper key management service

      return {
        success: true,
      };
    } catch (error) {
      console.error('Set credentials error:', error);
      if (error instanceof CredentialsError) {
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: 'Failed to set credentials',
      };
    }
  }
);

/**
 * Get credential status for the authenticated user
 */
export const getCredentialStatus = api(
  { method: 'GET', path: '/user/credentials/status', auth: true },
  async (): Promise<GetCredentialsResponse> => {
    try {
      const authData = (await import('~encore/auth')).getAuthData()!;

      const credentials = await db.queryRow<UserCredentialsRow>`
        SELECT created_at, last_used_at
        FROM user_credentials 
        WHERE user_id = ${authData.userId} AND is_active = true
      `;

      return {
        hasCredentials: !!credentials,
        lastUsedAt: credentials?.last_used_at || undefined,
        createdAt: credentials?.created_at || undefined,
      };
    } catch (error) {
      console.error('Get credential status error:', error);
      return {
        hasCredentials: false,
      };
    }
  }
);

// =============================================================================
// Sniping Target Management
// =============================================================================

/**
 * Create a new sniping target
 */
export const createSnipingTarget = api(
  { method: 'POST', path: '/user/targets', auth: true },
  async (req: CreateSnipingTargetRequest): Promise<SnipingTargetResponse> => {
    try {
      const authData = (await import('~encore/auth')).getAuthData()!;
      const { targetSymbol, quantity, maxPrice } = req;

      // Validate inputs
      if (!targetSymbol || quantity <= 0) {
        throw new Error('Invalid target parameters');
      }

      // Check if target already exists
      const existing = await db.queryRow`
        SELECT id FROM user_sniping_targets 
        WHERE user_id = ${authData.userId} 
          AND target_symbol = ${targetSymbol} 
          AND is_active = true
      `;

      if (existing) {
        throw new Error('Target already exists for this symbol');
      }

      // Create target
      const target = await db.queryRow<UserSnipingTargetRow>`
        INSERT INTO user_sniping_targets (
          user_id, target_symbol, quantity, max_price
        ) VALUES (
          ${authData.userId}, ${targetSymbol}, ${quantity}, ${maxPrice || null}
        )
        RETURNING *
      `;

      if (!target) {
        throw new Error('Failed to create sniping target');
      }

      return {
        success: true,
        target: {
          id: target.id,
          userId: target.user_id,
          targetSymbol: target.target_symbol,
          quantity: target.quantity,
          maxPrice: target.max_price || undefined,
          isActive: target.is_active,
          createdAt: target.created_at,
          updatedAt: target.updated_at,
        },
      };
    } catch (error) {
      console.error('Create sniping target error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create target',
      };
    }
  }
);

/**
 * Get all sniping targets for the authenticated user
 */
export const getSnipingTargets = api(
  { method: 'GET', path: '/user/targets', auth: true },
  async (): Promise<SnipingTargetsResponse> => {
    try {
      const authData = (await import('~encore/auth')).getAuthData()!;

      const targets = await db.query<UserSnipingTargetRow>`
        SELECT * FROM user_sniping_targets 
        WHERE user_id = ${authData.userId} 
        ORDER BY created_at DESC
      `;

      const targetList = [];
      for await (const target of targets) {
        targetList.push({
          id: target.id,
          userId: target.user_id,
          targetSymbol: target.target_symbol,
          quantity: target.quantity,
          maxPrice: target.max_price || undefined,
          isActive: target.is_active,
          createdAt: target.created_at,
          updatedAt: target.updated_at,
        });
      }

      return { targets: targetList };
    } catch (error) {
      console.error('Get sniping targets error:', error);
      return { targets: [] };
    }
  }
);

/**
 * Update a sniping target
 */
export const updateSnipingTarget = api(
  { method: 'PUT', path: '/user/targets/:targetId', auth: true },
  async (
    req: UpdateSnipingTargetRequest & { targetId: number }
  ): Promise<SnipingTargetResponse> => {
    try {
      const authData = (await import('~encore/auth')).getAuthData()!;
      const { targetId, quantity, maxPrice, isActive } = req;

      // Build update query dynamically
      const updates: string[] = [];
      const values: unknown[] = [];

      if (quantity !== undefined) {
        updates.push(`quantity = $${values.length + 1}`);
        values.push(quantity);
      }
      if (maxPrice !== undefined) {
        updates.push(`max_price = $${values.length + 1}`);
        values.push(maxPrice);
      }
      if (isActive !== undefined) {
        updates.push(`is_active = $${values.length + 1}`);
        values.push(isActive);
      }

      if (updates.length === 0) {
        throw new Error('No updates provided');
      }

      updates.push(`updated_at = NOW()`);
      updates.push(`user_id = $${values.length + 1}`);
      values.push(authData.userId);
      updates.push(`id = $${values.length + 1}`);
      values.push(targetId);

      const query = `
        UPDATE user_sniping_targets 
        SET ${updates.slice(0, -2).join(', ')}
        WHERE ${updates.slice(-2).join(' AND ')}
        RETURNING *
      `;

      const target = await db.queryRow<UserSnipingTargetRow>(query, ...values);

      if (!target) {
        throw new Error('Target not found or access denied');
      }

      return {
        success: true,
        target: {
          id: target.id,
          userId: target.user_id,
          targetSymbol: target.target_symbol,
          quantity: target.quantity,
          maxPrice: target.max_price || undefined,
          isActive: target.is_active,
          createdAt: target.created_at,
          updatedAt: target.updated_at,
        },
      };
    } catch (error) {
      console.error('Update sniping target error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update target',
      };
    }
  }
);

/**
 * Get user portfolio summary
 */
export const getPortfolio = api(
  { method: 'GET', path: '/user/portfolio', auth: true },
  async (): Promise<UserPortfolioResponse> => {
    try {
      const authData = (await import('~encore/auth')).getAuthData()!;

      // Get portfolio statistics
      const stats = await db.queryRow`
        SELECT 
          COUNT(DISTINCT ust.id) as active_targets,
          COUNT(DISTINCT ut.id) as total_trades,
          COUNT(DISTINCT CASE WHEN ut.is_snipe = true THEN ut.id END) as snipe_trades,
          COALESCE(SUM(ut.total_value), 0) as total_value,
          COALESCE(SUM(ut.pnl_1h), 0) as total_pnl
        FROM users u
        LEFT JOIN user_sniping_targets ust ON u.id = ust.user_id AND ust.is_active = true
        LEFT JOIN user_trades ut ON u.id = ut.user_id
        WHERE u.id = ${authData.userId}
      `;

      const snipeSuccessRate =
        stats.snipe_trades > 0 ? (stats.snipe_trades / stats.total_trades) * 100 : 0;

      return {
        totalValue: stats.total_value || 0,
        totalPnL: stats.total_pnl || 0,
        activeTargets: stats.active_targets || 0,
        totalTrades: stats.total_trades || 0,
        snipeSuccessRate,
        performance: {
          daily: 0, // TODO: Implement daily P&L calculation
          weekly: 0, // TODO: Implement weekly P&L calculation
          monthly: 0, // TODO: Implement monthly P&L calculation
        },
      };
    } catch (error) {
      console.error('Get portfolio error:', error);
      return {
        totalValue: 0,
        totalPnL: 0,
        activeTargets: 0,
        totalTrades: 0,
        snipeSuccessRate: 0,
        performance: { daily: 0, weekly: 0, monthly: 0 },
      };
    }
  }
);

/**
 * Get user trading history
 */
export const getTrades = api(
  { method: 'POST', path: '/user/trades', auth: true },
  async (req: GetTradesRequest): Promise<TradesResponse> => {
    try {
      const authData = (await import('~encore/auth')).getAuthData()!;
      const { symbol, startDate, endDate, isSnipeOnly, limit = 50, offset = 0 } = req;

      // Build query conditions
      const conditions: string[] = [`user_id = ${authData.userId}`];
      if (symbol) conditions.push(`symbol = '${symbol}'`);
      if (startDate) conditions.push(`executed_at >= '${startDate.toISOString()}'`);
      if (endDate) conditions.push(`executed_at <= '${endDate.toISOString()}'`);
      if (isSnipeOnly) conditions.push('is_snipe = true');

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await db.queryRow`
        SELECT COUNT(*) as total 
        FROM user_trades 
        WHERE ${whereClause}
      `;

      // Get trades
      const trades = await db.query<UserTradeRow>`
        SELECT * FROM user_trades 
        WHERE ${whereClause}
        ORDER BY executed_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const tradeList = [];
      for await (const trade of trades) {
        tradeList.push({
          id: trade.id,
          userId: trade.user_id,
          exchangeOrderId: trade.exchange_order_id || undefined,
          symbol: trade.symbol,
          side: trade.side,
          quantity: trade.quantity,
          price: trade.price,
          totalValue: trade.total_value,
          fees: trade.fees,
          status: trade.status,
          executedAt: trade.executed_at,
          createdAt: trade.created_at,
          pnl1m: trade.pnl_1m || undefined,
          pnl5m: trade.pnl_5m || undefined,
          pnl15m: trade.pnl_15m || undefined,
          pnl1h: trade.pnl_1h || undefined,
          isSnipe: trade.is_snipe,
        });
      }

      return {
        trades: tradeList,
        total: countResult.total || 0,
        hasMore: offset + limit < (countResult.total || 0),
      };
    } catch (error) {
      console.error('Get trades error:', error);
      return {
        trades: [],
        total: 0,
        hasMore: false,
      };
    }
  }
);
