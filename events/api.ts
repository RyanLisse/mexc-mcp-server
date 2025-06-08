import { api } from 'encore.dev/api';
import {
  type AlertEvent,
  type NewListingEvent,
  type PnLUpdateEvent,
  type SnipeExecutedEvent,
  type SystemHealthEvent,
  type TargetReadyEvent,
  alerts,
  newListings,
  pnlUpdates,
  snipeExecutions,
  systemHealth,
  targetsReady,
} from './topics.js';

// =============================================================================
// Event Publishing APIs
// =============================================================================

// Define input types explicitly to avoid Omit issues with Encore
export interface NewListingInput {
  vcoinId: string;
  symbol: string;
  projectName?: string;
  scheduledLaunchTime: string;
  userId?: number; // For user-specific notifications
}

export interface SnipeExecutionInput {
  snipeId: number;
  userId: number;
  symbol: string;
  orderId?: string;
  status: 'EXECUTED' | 'FAILED' | 'TIMED_OUT';
  requestedQty?: number;
  executedQty?: number;
  avgPrice?: number;
  executionTimeMs: number;
  userEmail: string; // For routing notifications
}

export interface PnLUpdateInput {
  snipeId: number;
  userId: number;
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '1h';
  pnl: number;
  currentPrice: number;
  userEmail: string;
}

export interface SystemHealthInput {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  details?: Record<string, unknown>;
}

export interface AlertInput {
  type: 'price_spike' | 'snipe_opportunity' | 'system_error' | 'maintenance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  userId?: number;
  data?: Record<string, unknown>;
}

/**
 * Publish a new listing discovery event
 */
export const publishNewListing = api(
  { method: 'POST', path: '/events/listings/new' },
  async (event: NewListingInput): Promise<{ success: boolean; messageId?: string }> => {
    try {
      const eventWithTimestamp: NewListingEvent = {
        ...event,
        discoveredAt: new Date().toISOString(),
      };

      const messageId = await newListings.publish(eventWithTimestamp);

      console.log('📢 Published new listing event:', {
        symbol: event.symbol,
        messageId,
      });

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error('Failed to publish new listing event:', error);
      return {
        success: false,
      };
    }
  }
);

/**
 * Publish a target ready event
 */
export const publishTargetReady = api(
  { method: 'POST', path: '/events/targets/ready' },
  async (event: TargetReadyEvent): Promise<{ success: boolean; messageId?: string }> => {
    try {
      const messageId = await targetsReady.publish(event);

      console.log('🎯 Published target ready event:', {
        symbol: event.symbol,
        messageId,
      });

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error('Failed to publish target ready event:', error);
      return {
        success: false,
      };
    }
  }
);

/**
 * Publish a snipe execution event
 */
export const publishSnipeExecution = api(
  { method: 'POST', path: '/events/snipes/executed' },
  async (event: SnipeExecutionInput): Promise<{ success: boolean; messageId?: string }> => {
    try {
      const eventWithTimestamp: SnipeExecutedEvent = {
        ...event,
        executedAt: new Date().toISOString(),
        userEmail: event.userEmail, // Ensure attribute is included
      };

      const messageId = await snipeExecutions.publish(eventWithTimestamp);

      console.log('⚡ Published snipe execution event:', {
        userId: event.userId,
        symbol: event.symbol,
        status: event.status,
        messageId,
      });

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error('Failed to publish snipe execution event:', error);
      return {
        success: false,
      };
    }
  }
);

/**
 * Publish a P&L update event
 */
export const publishPnLUpdate = api(
  { method: 'POST', path: '/events/pnl/update' },
  async (event: PnLUpdateInput): Promise<{ success: boolean; messageId?: string }> => {
    try {
      const eventWithTimestamp: PnLUpdateEvent = {
        ...event,
        updatedAt: new Date().toISOString(),
        userEmail: event.userEmail, // Ensure attribute is included
      };

      const messageId = await pnlUpdates.publish(eventWithTimestamp);

      console.log('💰 Published P&L update event:', {
        userId: event.userId,
        symbol: event.symbol,
        timeframe: event.timeframe,
        pnl: event.pnl,
        messageId,
      });

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error('Failed to publish P&L update event:', error);
      return {
        success: false,
      };
    }
  }
);

/**
 * Publish a system health event
 */
export const publishSystemHealth = api(
  { method: 'POST', path: '/events/system/health' },
  async (event: SystemHealthInput): Promise<{ success: boolean; messageId?: string }> => {
    try {
      const eventWithTimestamp: SystemHealthEvent = {
        ...event,
        timestamp: new Date().toISOString(),
      };

      const messageId = await systemHealth.publish(eventWithTimestamp);

      console.log('🏥 Published system health event:', {
        service: event.service,
        status: event.status,
        messageId,
      });

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error('Failed to publish system health event:', error);
      return {
        success: false,
      };
    }
  }
);

/**
 * Publish an alert event
 */
export const publishAlert = api(
  { method: 'POST', path: '/events/alerts' },
  async (event: AlertInput): Promise<{ success: boolean; messageId?: string }> => {
    try {
      const eventWithTimestamp: AlertEvent = {
        ...event,
        timestamp: new Date().toISOString(),
        userId: event.userId, // Ensure attribute is included
      };

      const messageId = await alerts.publish(eventWithTimestamp);

      console.log(`🚨 Published ${event.severity} alert:`, {
        type: event.type,
        title: event.title,
        messageId,
      });

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error('Failed to publish alert event:', error);
      return {
        success: false,
      };
    }
  }
);

// =============================================================================
// Event Status and Monitoring APIs
// =============================================================================

/**
 * Get event system status and statistics
 */
export const getEventStats = api(
  { method: 'GET', path: '/events/stats' },
  async (): Promise<{
    topics: Array<{
      name: string;
      messagesSentToday: number;
      subscribers: number;
      lastMessageAt?: Date;
    }>;
    systemHealth: 'healthy' | 'degraded' | 'unhealthy';
    totalMessagesToday: number;
  }> => {
    try {
      // In a real implementation, you would track these metrics
      // For now, return mock data

      return {
        topics: [
          {
            name: 'new-listings',
            messagesSentToday: 45,
            subscribers: 3,
            lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          },
          {
            name: 'targets-ready',
            messagesSentToday: 12,
            subscribers: 2,
            lastMessageAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          },
          {
            name: 'snipe-executions',
            messagesSentToday: 8,
            subscribers: 4,
            lastMessageAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          },
          {
            name: 'pnl-updates',
            messagesSentToday: 156,
            subscribers: 3,
            lastMessageAt: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
          },
          {
            name: 'system-health',
            messagesSentToday: 24,
            subscribers: 2,
            lastMessageAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          },
          {
            name: 'alerts',
            messagesSentToday: 3,
            subscribers: 2,
            lastMessageAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          },
        ],
        systemHealth: 'healthy',
        totalMessagesToday: 248,
      };
    } catch (error) {
      console.error('Failed to get event stats:', error);
      return {
        topics: [],
        systemHealth: 'unhealthy',
        totalMessagesToday: 0,
      };
    }
  }
);

/**
 * Send a test event to verify the system is working
 */
export const sendTestEvent = api(
  { method: 'POST', path: '/events/test' },
  async (req: { type: 'listing' | 'target' | 'snipe' | 'pnl' | 'health' | 'alert' }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> => {
    try {
      const { type } = req;
      let messageId: string;

      switch (type) {
        case 'listing':
          messageId = await newListings.publish({
            vcoinId: 'test-001',
            symbol: 'TESTUSDT',
            projectName: 'Test Project',
            scheduledLaunchTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            discoveredAt: new Date().toISOString(),
          });
          break;

        case 'target':
          messageId = await targetsReady.publish({
            symbol: 'TESTUSDT',
            vcoinId: 'test-001',
            launchTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            priceScale: 8,
            quantityScale: 6,
            pattern: 'test-pattern',
          });
          break;

        case 'snipe':
          messageId = await snipeExecutions.publish({
            snipeId: 999999,
            userId: 1,
            symbol: 'TESTUSDT',
            status: 'EXECUTED',
            executedAt: new Date().toISOString(),
            requestedQty: 100,
            executedQty: 100,
            avgPrice: 1.0,
            executionTimeMs: 250,
            userEmail: 'test@example.com',
          });
          break;

        case 'pnl':
          messageId = await pnlUpdates.publish({
            snipeId: 999999,
            userId: 1,
            symbol: 'TESTUSDT',
            timeframe: '1m',
            pnl: 5.25,
            currentPrice: 1.05,
            updatedAt: new Date().toISOString(),
            userEmail: 'test@example.com',
          });
          break;

        case 'health':
          messageId = await systemHealth.publish({
            service: 'test-service',
            status: 'healthy',
            message: 'Test health check',
            timestamp: new Date().toISOString(),
            details: { test: true },
          });
          break;

        case 'alert':
          messageId = await alerts.publish({
            type: 'system_error',
            severity: 'low',
            title: 'Test Alert',
            message: 'This is a test alert to verify the system is working',
            timestamp: new Date().toISOString(),
            data: { test: true },
          });
          break;

        default:
          throw new Error(`Unknown test event type: ${type}`);
      }

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error('Failed to send test event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
);

// =============================================================================
// Batch Event Publishing APIs
// =============================================================================

/**
 * Publish multiple events in batch for better performance
 */
export const publishBatch = api(
  { method: 'POST', path: '/events/batch' },
  async (req: {
    events: Array<{
      type: 'listing' | 'target' | 'snipe' | 'pnl' | 'health' | 'alert';
      data: Record<string, unknown>;
    }>;
  }): Promise<{
    success: boolean;
    published: number;
    failed: number;
    messageIds: string[];
    errors?: string[];
  }> => {
    try {
      const { events } = req;
      const messageIds: string[] = [];
      const errors: string[] = [];
      let published = 0;
      let failed = 0;

      for (const event of events) {
        try {
          let messageId: string;

          switch (event.type) {
            case 'listing':
              messageId = await newListings.publish(event.data as NewListingEvent);
              break;
            case 'target':
              messageId = await targetsReady.publish(event.data as TargetReadyEvent);
              break;
            case 'snipe':
              messageId = await snipeExecutions.publish(event.data as SnipeExecutedEvent);
              break;
            case 'pnl':
              messageId = await pnlUpdates.publish(event.data as PnLUpdateEvent);
              break;
            case 'health':
              messageId = await systemHealth.publish(event.data as SystemHealthEvent);
              break;
            case 'alert':
              messageId = await alerts.publish(event.data as AlertEvent);
              break;
            default:
              throw new Error(`Unknown event type: ${event.type}`);
          }

          messageIds.push(messageId);
          published++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${event.type}: ${errorMsg}`);
          failed++;
        }
      }

      return {
        success: failed === 0,
        published,
        failed,
        messageIds,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('Failed to publish batch events:', error);
      return {
        success: false,
        published: 0,
        failed: req.events.length,
        messageIds: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }
);
