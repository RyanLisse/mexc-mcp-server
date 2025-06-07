import { type Attribute, Subscription, Topic } from 'encore.dev/pubsub';

// =============================================================================
// Event Type Definitions
// =============================================================================

export interface NewListingEvent {
  vcoinId: string;
  symbol: string;
  projectName?: string;
  scheduledLaunchTime: string;
  discoveredAt: string;
  userId?: Attribute<number>; // For user-specific notifications
}

export interface TargetReadyEvent {
  symbol: string;
  vcoinId: string;
  launchTime: string;
  priceScale: number;
  quantityScale: number;
  pattern: string;
  userId?: Attribute<number>;
}

export interface SnipeExecutedEvent {
  snipeId: number;
  userId: number;
  symbol: string;
  orderId?: string;
  status: 'EXECUTED' | 'FAILED' | 'TIMED_OUT';
  executedAt: string;
  requestedQty?: number;
  executedQty?: number;
  avgPrice?: number;
  executionTimeMs: number;
  userEmail: Attribute<string>; // For routing notifications
}

export interface PnLUpdateEvent {
  snipeId: number;
  userId: number;
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '1h';
  pnl: number;
  currentPrice: number;
  updatedAt: string;
  userEmail: Attribute<string>;
}

export interface SystemHealthEvent {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface AlertEvent {
  type: 'price_spike' | 'snipe_opportunity' | 'system_error' | 'maintenance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  userId?: Attribute<number>;
  data?: Record<string, unknown>;
}

// =============================================================================
// PubSub Topics
// =============================================================================

/**
 * New token listings discovered from MEXC calendar
 */
export const newListings = new Topic<NewListingEvent>('new-listings', {
  deliveryGuarantee: 'at-least-once',
});

/**
 * Tokens that are ready for sniping (detected on exchange)
 */
export const targetsReady = new Topic<TargetReadyEvent>('targets-ready', {
  deliveryGuarantee: 'at-least-once',
});

/**
 * Snipe execution events (success/failure)
 */
export const snipeExecutions = new Topic<SnipeExecutedEvent>('snipe-executions', {
  deliveryGuarantee: 'exactly-once',
  orderingAttribute: 'userEmail',
});

/**
 * P&L updates for executed snipes
 */
export const pnlUpdates = new Topic<PnLUpdateEvent>('pnl-updates', {
  deliveryGuarantee: 'at-least-once',
  orderingAttribute: 'userEmail',
});

/**
 * System health and monitoring events
 */
export const systemHealth = new Topic<SystemHealthEvent>('system-health', {
  deliveryGuarantee: 'at-least-once',
});

/**
 * Real-time alerts and notifications
 */
export const alerts = new Topic<AlertEvent>('alerts', {
  deliveryGuarantee: 'at-least-once',
});

// =============================================================================
// Event Subscriptions
// =============================================================================

/**
 * Log all new listings for monitoring and debugging
 */
const _ = new Subscription(newListings, 'log-new-listings', {
  handler: async (event: NewListingEvent) => {
    console.log('📢 New listing discovered:', {
      symbol: event.symbol,
      projectName: event.projectName,
      launchTime: event.scheduledLaunchTime,
      vcoinId: event.vcoinId,
    });
  },
});

/**
 * Log target ready events and trigger notifications
 */
const _targetsReady = new Subscription(targetsReady, 'log-targets-ready', {
  handler: async (event: TargetReadyEvent) => {
    console.log('🎯 Target ready for sniping:', {
      symbol: event.symbol,
      launchTime: event.launchTime,
      pattern: event.pattern,
    });

    // Here you could trigger user notifications
    // Send email, SMS, push notification, etc.
  },
});

/**
 * Log snipe executions and update user records
 */
const _snipeExecutions = new Subscription(snipeExecutions, 'log-snipe-executions', {
  handler: async (event: SnipeExecutedEvent) => {
    console.log('⚡ Snipe executed:', {
      userId: event.userId,
      symbol: event.symbol,
      status: event.status,
      executedQty: event.executedQty,
      avgPrice: event.avgPrice,
      executionTime: `${event.executionTimeMs}ms`,
    });

    // Here you could:
    // 1. Update user trade records
    // 2. Send real-time notifications
    // 3. Update portfolio calculations
    // 4. Trigger P&L tracking
  },
});

/**
 * Handle P&L updates and trigger user notifications
 */
const _pnlUpdates = new Subscription(pnlUpdates, 'handle-pnl-updates', {
  handler: async (event: PnLUpdateEvent) => {
    console.log('💰 P&L updated:', {
      userId: event.userId,
      symbol: event.symbol,
      timeframe: event.timeframe,
      pnl: event.pnl,
      currentPrice: event.currentPrice,
    });

    // Here you could:
    // 1. Update user dashboard in real-time
    // 2. Send notifications for significant P&L changes
    // 3. Trigger alerts for losses exceeding thresholds
    // 4. Update performance analytics
  },
});

/**
 * Monitor system health and send alerts
 */
const _systemHealth = new Subscription(systemHealth, 'monitor-system-health', {
  handler: async (event: SystemHealthEvent) => {
    console.log('🏥 System health update:', {
      service: event.service,
      status: event.status,
      message: event.message,
    });

    // Send alerts for unhealthy services
    if (event.status === 'unhealthy' || event.status === 'degraded') {
      await alerts.publish({
        type: 'system_error',
        severity: event.status === 'unhealthy' ? 'critical' : 'high',
        title: `${event.service} Service ${event.status}`,
        message: event.message || `${event.service} service is ${event.status}`,
        timestamp: new Date().toISOString(),
        data: event.details,
      });
    }
  },
});

/**
 * Handle alerts and notifications
 */
const _alerts = new Subscription(alerts, 'handle-alerts', {
  handler: async (event: AlertEvent) => {
    console.log(`🚨 ${event.severity.toUpperCase()} ALERT:`, {
      type: event.type,
      title: event.title,
      message: event.message,
      userId: event.userId,
    });

    // Here you could:
    // 1. Send email/SMS notifications
    // 2. Post to Slack/Discord
    // 3. Store in alerts database
    // 4. Trigger escalation for critical alerts
    // 5. Update user dashboards

    // For critical alerts, you might want immediate notification
    if (event.severity === 'critical') {
      // Implement immediate notification logic
      console.error('🔥 CRITICAL ALERT - Immediate action required!');
    }
  },
});

/**
 * User-specific snipe notifications
 */
const _userSnipeNotifications = new Subscription(snipeExecutions, 'user-snipe-notifications', {
  handler: async (event: SnipeExecutedEvent) => {
    // Send real-time notification to specific user
    console.log(`📱 Sending snipe notification to user ${event.userId}:`, {
      symbol: event.symbol,
      status: event.status,
      executedQty: event.executedQty,
      avgPrice: event.avgPrice,
    });

    // Here you would implement:
    // 1. WebSocket notification to user's dashboard
    // 2. Push notification to mobile app
    // 3. Email notification
    // 4. SMS for high-value trades
  },
});

/**
 * Performance tracking subscription
 */
const _performanceTracking = new Subscription(snipeExecutions, 'performance-tracking', {
  handler: async (event: SnipeExecutedEvent) => {
    // Track performance metrics
    console.log('📊 Tracking performance for snipe:', {
      userId: event.userId,
      symbol: event.symbol,
      executionTime: `${event.executionTimeMs}ms`,
      success: event.status === 'EXECUTED',
    });

    // Here you could:
    // 1. Update performance metrics
    // 2. Calculate success rates
    // 3. Track execution times
    // 4. Analyze trading patterns
  },
});
