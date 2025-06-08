import { api } from 'encore.dev/api';

// =============================================================================
// Streaming API Types
// =============================================================================

export interface PriceUpdate {
  symbol: string;
  price: number;
  volume24h: number;
  change24h: number;
  timestamp: number;
  high24h?: number;
  low24h?: number;
}

export interface PortfolioUpdate {
  userId: number;
  totalValue: number;
  totalPnL: number;
  activePositions: number;
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  timestamp: number;
}

export interface TradingNotification {
  userId: number;
  type: 'snipe_executed' | 'target_ready' | 'price_alert' | 'pnl_update';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
}

export interface OrderBookUpdate {
  symbol: string;
  bids: OrderBookEntry[]; // [price, quantity]
  asks: OrderBookEntry[]; // [price, quantity]
  timestamp: number;
}

export interface SystemStatusUpdate {
  status: 'healthy' | 'degraded' | 'maintenance';
  services: Record<string, 'online' | 'offline' | 'degraded'>;
  message?: string;
  timestamp: number;
}

// =============================================================================
// Price Feed Streaming
// =============================================================================

/**
 * Stream real-time price updates for specified symbols
 */
export const priceStream = api.streamOut<{ symbols: string }, PriceUpdate>(
  { path: '/streaming/prices/:symbols', expose: true },
  async (stream, req: { symbols: string }) => {
    try {
      console.log('🔴 Starting price stream for symbols:', req.symbols);

      const symbols = req.symbols.split(',').map((s) => s.trim().toUpperCase());

      // In a real implementation, this would connect to MEXC WebSocket
      // For now, simulate price updates
      const interval = setInterval(async () => {
        try {
          for (const symbol of symbols) {
            const mockPrice: PriceUpdate = {
              symbol,
              price: Math.random() * 1000 + 100, // Random price between 100-1100
              volume24h: Math.random() * 1000000,
              change24h: (Math.random() - 0.5) * 20, // -10% to +10%
              timestamp: Date.now(),
              high24h: Math.random() * 1200 + 100,
              low24h: Math.random() * 900 + 50,
            };

            await stream.send(mockPrice);
          }
        } catch (error) {
          console.error('Error sending price update:', error);
        }
      }, 1000); // Update every second

      // Handle client disconnect
      stream.onClose(() => {
        console.log('🔴 Price stream closed for symbols:', req.symbols);
        clearInterval(interval);
      });

      // Keep stream alive for 30 minutes max
      setTimeout(
        () => {
          clearInterval(interval);
          stream.close();
        },
        30 * 60 * 1000
      );
    } catch (error) {
      console.error('Price stream error:', error);
      stream.close();
    }
  }
);

/**
 * Stream real-time order book updates
 */
export const orderBookStream = api.streamOut<{ symbol: string }, OrderBookUpdate>(
  { path: '/streaming/orderbook/:symbol', expose: true },
  async (stream, req: { symbol: string }) => {
    try {
      console.log('📊 Starting order book stream for:', req.symbol);

      const symbol = req.symbol.toUpperCase();

      // Simulate order book updates
      const interval = setInterval(async () => {
        try {
          const mockOrderBook: OrderBookUpdate = {
            symbol,
            bids: Array.from({ length: 10 }, (_, i) => ({
              price: 100 - i * 0.1,
              quantity: Math.random() * 1000,
            })),
            asks: Array.from({ length: 10 }, (_, i) => ({
              price: 100 + i * 0.1,
              quantity: Math.random() * 1000,
            })),
            timestamp: Date.now(),
          };

          await stream.send(mockOrderBook);
        } catch (error) {
          console.error('Error sending order book update:', error);
        }
      }, 200); // Update every 200ms

      // Handle client disconnect
      stream.onClose(() => {
        console.log('📊 Order book stream closed for:', req.symbol);
        clearInterval(interval);
      });

      // Keep stream alive for 30 minutes max
      setTimeout(
        () => {
          clearInterval(interval);
          stream.close();
        },
        30 * 60 * 1000
      );
    } catch (error) {
      console.error('Order book stream error:', error);
      stream.close();
    }
  }
);

// =============================================================================
// User-Specific Streaming
// =============================================================================

/**
 * Stream user portfolio updates in real-time
 */
export const portfolioStream = api.streamOut<PortfolioUpdate>(
  { path: '/streaming/portfolio', expose: true, auth: true },
  async (stream) => {
    try {
      const authData = (await import('~encore/auth')).getAuthData();
      if (!authData) {
        throw new Error('Authentication required');
      }
      console.log('💼 Starting portfolio stream for user:', authData.userId);

      // Simulate portfolio updates
      const interval = setInterval(async () => {
        try {
          const mockPortfolio: PortfolioUpdate = {
            userId: authData.userId,
            totalValue: Math.random() * 10000 + 5000, // $5k-$15k
            totalPnL: (Math.random() - 0.5) * 2000, // -$1k to +$1k
            activePositions: Math.floor(Math.random() * 10) + 1,
            performance: {
              daily: (Math.random() - 0.5) * 10, // -5% to +5%
              weekly: (Math.random() - 0.5) * 20, // -10% to +10%
              monthly: (Math.random() - 0.5) * 50, // -25% to +25%
            },
            timestamp: Date.now(),
          };

          await stream.send(mockPortfolio);
        } catch (error) {
          console.error('Error sending portfolio update:', error);
        }
      }, 5000); // Update every 5 seconds

      // Handle client disconnect
      stream.onClose(() => {
        console.log('💼 Portfolio stream closed for user:', authData.userId);
        clearInterval(interval);
      });

      // Keep stream alive for 2 hours max
      setTimeout(
        () => {
          clearInterval(interval);
          stream.close();
        },
        2 * 60 * 60 * 1000
      );
    } catch (error) {
      console.error('Portfolio stream error:', error);
      stream.close();
    }
  }
);

/**
 * Stream real-time trading notifications for user
 */
export const notificationStream = api.streamOut<TradingNotification>(
  { path: '/streaming/notifications', expose: true, auth: true },
  async (stream) => {
    try {
      const authData = (await import('~encore/auth')).getAuthData();
      if (!authData) {
        throw new Error('Authentication required');
      }
      console.log('🔔 Starting notification stream for user:', authData.userId);

      // Send welcome notification
      await stream.send({
        userId: authData.userId,
        type: 'price_alert',
        title: 'Notification Stream Connected',
        message: 'You will receive real-time trading notifications here',
        timestamp: Date.now(),
        severity: 'info',
      });

      // Simulate occasional notifications
      const interval = setInterval(async () => {
        try {
          // Only send notifications occasionally (20% chance every 10 seconds)
          if (Math.random() > 0.8) {
            const notificationTypes: Array<{
              type: TradingNotification['type'];
              title: string;
              message: string;
              severity: TradingNotification['severity'];
            }> = [
              {
                type: 'snipe_executed',
                title: 'Snipe Executed Successfully',
                message: 'Your snipe for BTCUSDT has been executed at $45,230',
                severity: 'success',
              },
              {
                type: 'target_ready',
                title: 'New Target Ready',
                message: 'ETHUSDT is now available for trading',
                severity: 'info',
              },
              {
                type: 'price_alert',
                title: 'Price Alert Triggered',
                message: 'SOLUSDT has reached your target price of $150',
                severity: 'warning',
              },
              {
                type: 'pnl_update',
                title: 'Significant P&L Change',
                message: 'Your portfolio is up 5.2% in the last hour',
                severity: 'success',
              },
            ];

            const randomNotification =
              notificationTypes[Math.floor(Math.random() * notificationTypes.length)];

            const notification: TradingNotification = {
              userId: authData.userId,
              ...randomNotification,
              timestamp: Date.now(),
              data: {
                source: 'mock_system',
                priority: 'normal',
              },
            };

            await stream.send(notification);
          }
        } catch (error) {
          console.error('Error sending notification:', error);
        }
      }, 10000); // Check every 10 seconds

      // Handle client disconnect
      stream.onClose(() => {
        console.log('🔔 Notification stream closed for user:', authData.userId);
        clearInterval(interval);
      });

      // Keep stream alive for 4 hours max
      setTimeout(
        () => {
          clearInterval(interval);
          stream.close();
        },
        4 * 60 * 60 * 1000
      );
    } catch (error) {
      console.error('Notification stream error:', error);
      stream.close();
    }
  }
);

// =============================================================================
// System Status Streaming
// =============================================================================

/**
 * Stream system status updates
 */
export const systemStatusStream = api.streamOut<SystemStatusUpdate>(
  { path: '/streaming/system-status', expose: true },
  async (stream) => {
    try {
      console.log('🏥 Starting system status stream');

      // Send initial status
      await stream.send({
        status: 'healthy',
        services: {
          calendar: 'online',
          detector: 'online',
          executor: 'online',
          tracker: 'online',
          'market-data': 'online',
          user: 'online',
          events: 'online',
          streaming: 'online',
        },
        message: 'All systems operational',
        timestamp: Date.now(),
      });

      // Simulate status updates every 30 seconds
      const interval = setInterval(async () => {
        try {
          // Occasionally simulate service degradation (5% chance)
          const isDegraded = Math.random() > 0.95;

          const status: SystemStatusUpdate = {
            status: isDegraded ? 'degraded' : 'healthy',
            services: {
              calendar: Math.random() > 0.98 ? 'degraded' : 'online',
              detector: Math.random() > 0.98 ? 'degraded' : 'online',
              executor: Math.random() > 0.99 ? 'degraded' : 'online',
              tracker: Math.random() > 0.98 ? 'degraded' : 'online',
              'market-data': Math.random() > 0.97 ? 'degraded' : 'online',
              user: 'online',
              events: 'online',
              streaming: 'online',
            },
            message: isDegraded
              ? 'Some services experiencing degraded performance'
              : 'All systems operational',
            timestamp: Date.now(),
          };

          await stream.send(status);
        } catch (error) {
          console.error('Error sending system status:', error);
        }
      }, 30000); // Update every 30 seconds

      // Handle client disconnect
      stream.onClose(() => {
        console.log('🏥 System status stream closed');
        clearInterval(interval);
      });

      // Keep stream alive indefinitely for system monitoring
    } catch (error) {
      console.error('System status stream error:', error);
      stream.close();
    }
  }
);

// =============================================================================
// Bidirectional Trading Communication
// =============================================================================

export interface TradingCommand {
  type: 'place_order' | 'cancel_order' | 'update_target' | 'subscribe_symbol';
  data: Record<string, unknown>;
  requestId: string;
}

export interface TradingResponse {
  type: 'order_placed' | 'order_cancelled' | 'target_updated' | 'subscription_confirmed' | 'error';
  data: Record<string, unknown>;
  requestId: string;
  success: boolean;
  error?: string;
}

/**
 * Bidirectional trading communication stream
 */
export const tradingStream = api.streamInOut<TradingCommand, TradingResponse>(
  { path: '/streaming/trading', expose: true, auth: true },
  async (stream) => {
    try {
      const authData = (await import('~encore/auth')).getAuthData();
      if (!authData) {
        throw new Error('Authentication required');
      }
      console.log('⚡ Starting bidirectional trading stream for user:', authData.userId);

      // Send welcome message
      await stream.send({
        type: 'subscription_confirmed',
        data: {
          userId: authData.userId,
          message: 'Trading stream connected successfully',
        },
        requestId: 'welcome',
        success: true,
      });

      // Handle incoming commands
      for await (const command of stream) {
        try {
          console.log('📨 Received trading command:', {
            type: command.type,
            requestId: command.requestId,
          });

          let response: TradingResponse;

          switch (command.type) {
            case 'place_order':
              // Simulate order placement
              response = {
                type: 'order_placed',
                data: {
                  orderId: `order_${Date.now()}`,
                  symbol: command.data.symbol,
                  quantity: command.data.quantity,
                  price: command.data.price,
                  status: 'placed',
                },
                requestId: command.requestId,
                success: true,
              };
              break;

            case 'cancel_order':
              // Simulate order cancellation
              response = {
                type: 'order_cancelled',
                data: {
                  orderId: command.data.orderId,
                  status: 'cancelled',
                },
                requestId: command.requestId,
                success: true,
              };
              break;

            case 'update_target':
              // Simulate target update
              response = {
                type: 'target_updated',
                data: {
                  targetId: command.data.targetId,
                  symbol: command.data.symbol,
                  quantity: command.data.quantity,
                  status: 'updated',
                },
                requestId: command.requestId,
                success: true,
              };
              break;

            case 'subscribe_symbol':
              // Simulate symbol subscription
              response = {
                type: 'subscription_confirmed',
                data: {
                  symbol: command.data.symbol,
                  status: 'subscribed',
                },
                requestId: command.requestId,
                success: true,
              };
              break;

            default:
              response = {
                type: 'error',
                data: {},
                requestId: command.requestId,
                success: false,
                error: `Unknown command type: ${command.type}`,
              };
          }

          await stream.send(response);
        } catch (error) {
          console.error('Error processing trading command:', error);

          await stream.send({
            type: 'error',
            data: {},
            requestId: command.requestId || 'unknown',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      console.error('Trading stream error:', error);
    }
  }
);

// =============================================================================
// Stream Management APIs
// =============================================================================

/**
 * Get active streaming connections statistics
 */
export const getStreamStats = api(
  { method: 'GET', path: '/streaming/stats' },
  async (): Promise<{
    activeStreams: {
      prices: number;
      portfolios: number;
      notifications: number;
      orderBooks: number;
      systemStatus: number;
      trading: number;
    };
    totalConnections: number;
    uptimeMinutes: number;
  }> => {
    try {
      // In a real implementation, you would track these metrics
      return {
        activeStreams: {
          prices: Math.floor(Math.random() * 50) + 10,
          portfolios: Math.floor(Math.random() * 30) + 5,
          notifications: Math.floor(Math.random() * 40) + 8,
          orderBooks: Math.floor(Math.random() * 25) + 3,
          systemStatus: Math.floor(Math.random() * 15) + 2,
          trading: Math.floor(Math.random() * 20) + 4,
        },
        totalConnections: Math.floor(Math.random() * 150) + 50,
        uptimeMinutes: Math.floor(Math.random() * 10080) + 1440, // 1-7 days
      };
    } catch (error) {
      console.error('Failed to get stream stats:', error);
      return {
        activeStreams: {
          prices: 0,
          portfolios: 0,
          notifications: 0,
          orderBooks: 0,
          systemStatus: 0,
          trading: 0,
        },
        totalConnections: 0,
        uptimeMinutes: 0,
      };
    }
  }
);
