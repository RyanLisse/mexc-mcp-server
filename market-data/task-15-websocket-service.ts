/**
 * Task #15: WebSocket Integration Service
 * Production implementation for MEXC WebSocket API integration
 * Requirements:
 * - Connect to MEXC WebSocket API for live price feeds and order updates
 * - Manage subscriptions and broadcast updates to clients
 * - Handle reconnection and error scenarios
 * - Support multiple concurrent subscriptions (max 30 per connection)
 */

// Logger interface
export interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

// WebSocket configuration interface
export interface WebSocketConfig {
  baseWsUrl: string;
  maxSubscriptionsPerConnection: number;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  pingInterval: number;
}

// Subscription types
export type SubscriptionType = 'ticker' | 'orderbook' | 'trades';

// WebSocket subscription interface
export interface WebSocketSubscription {
  type: SubscriptionType;
  symbol: string;
  depth?: number; // For orderbook subscriptions
  callback: (data: WebSocketMessage) => void;
}

// WebSocket message interfaces
export interface WebSocketMessage {
  type: string;
  symbol: string;
  data: LivePriceUpdate | OrderBookUpdate | TradeUpdate;
}

export interface LivePriceUpdate {
  price: string;
  high: string;
  low: string;
  open: string;
  volume: string;
  timestamp: number;
}

export interface OrderBookUpdate {
  bids: Array<{ price: string; quantity: string }>;
  asks: Array<{ price: string; quantity: string }>;
  timestamp: number;
}

export interface TradeUpdate {
  side: 'buy' | 'sell';
  price: string;
  quantity: string;
  timestamp: number;
}

// Connection status interface
export interface WebSocketConnectionStatus {
  isConnected: boolean;
  subscriptionCount: number;
  connectionTime: number | null;
}

// Connection response interface
export interface WebSocketConnectionResponse {
  success: boolean;
  connectionId?: string;
  error?: string;
}

// Subscription response interface
export interface WebSocketSubscriptionResponse {
  success: boolean;
  subscriptionId?: string;
  error?: string;
}

// Connection statistics interface
export interface WebSocketConnectionStatistics {
  isConnected: boolean;
  activeSubscriptions: number;
  totalMessagesReceived: number;
  totalMessagesSent: number;
  connectionUptime: number;
  lastPingTime: number | null;
  reconnectionCount: number;
}

// Health check interface
export interface WebSocketHealthCheck {
  healthy: boolean;
  details: {
    connected: boolean;
    subscriptions: number;
    lastActivity: number;
    pingLatency: number | null;
  };
}

// Internal subscription tracking
interface InternalSubscription {
  id: string;
  type: SubscriptionType;
  symbol: string;
  depth?: number;
  callback: (data: WebSocketMessage) => void;
  mexcChannel: string;
}

/**
 * Task #15 WebSocket Integration Service
 * Implements real-time MEXC WebSocket API connectivity with subscription management
 */
export class TaskFifteenWebSocketService {
  private logger: Logger;
  private config: WebSocketConfig;
  private websocket: WebSocket | null = null;
  private connectionId: string | null = null;
  private isConnected = false;
  private connectionTime: number | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private lastPingTime: number | null = null;

  // Subscription management
  private subscriptions = new Map<string, InternalSubscription>();
  private activeChannels = new Set<string>();

  // Statistics tracking
  private messagesReceived = 0;
  private messagesSent = 0;
  private lastActivityTime = Date.now();

  constructor(logger: Logger, config: WebSocketConfig) {
    this.logger = logger;
    this.config = config;
  }

  async connect(): Promise<WebSocketConnectionResponse> {
    if (this.isConnected) {
      return { success: true, connectionId: this.connectionId! };
    }

    try {
      this.connectionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.logger.info('Establishing WebSocket connection', {
        url: this.config.baseWsUrl,
        connectionId: this.connectionId,
      });

      return new Promise<WebSocketConnectionResponse>((resolve) => {
        this.websocket = new WebSocket(this.config.baseWsUrl);

        const connectionTimeout = setTimeout(() => {
          this.logger.error('WebSocket connection timeout');
          resolve({ success: false, error: 'Connection timeout' });
        }, 10000);

        this.websocket.onopen = () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.connectionTime = Date.now();
          this.reconnectAttempts = 0;

          this.logger.info('WebSocket connection established', {
            connectionId: this.connectionId,
            url: this.config.baseWsUrl,
          });

          this.startPingInterval();
          this.logger.info('WebSocket service ready for market data streaming', {
            maxSubscriptions: this.config.maxSubscriptionsPerConnection,
            wsUrl: this.config.baseWsUrl,
          });

          resolve({ success: true, connectionId: this.connectionId! });
        };

        this.websocket.onerror = (error) => {
          clearTimeout(connectionTimeout);
          this.logger.error('WebSocket connection error', { error: error.toString() });
          resolve({ success: false, error: 'connection failed' });
        };

        this.websocket.onclose = (event) => {
          this.handleConnectionClose(event);
        };

        this.websocket.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      });
    } catch (error) {
      this.logger.error('Failed to establish WebSocket connection', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false, error: 'connection failed' };
    }
  }

  async disconnect(): Promise<{ success: boolean }> {
    try {
      this.isConnected = false;

      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }

      // Clear all subscriptions
      this.subscriptions.clear();
      this.activeChannels.clear();

      this.logger.info('WebSocket connection closed', {
        connectionId: this.connectionId,
        uptime: this.connectionTime ? Date.now() - this.connectionTime : 0,
      });

      this.connectionId = null;
      this.connectionTime = null;

      return { success: true };
    } catch (error) {
      this.logger.error('Error during WebSocket disconnect', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false };
    }
  }

  async subscribe(subscription: WebSocketSubscription): Promise<WebSocketSubscriptionResponse> {
    if (!this.isConnected || !this.websocket) {
      return { success: false, error: 'WebSocket not connected' };
    }

    // Validate subscription parameters
    if (!this.isValidSubscription(subscription)) {
      return { success: false, error: 'Invalid subscription parameters' };
    }

    // Check subscription limit
    if (this.subscriptions.size >= this.config.maxSubscriptionsPerConnection) {
      return { success: false, error: 'Maximum subscriptions reached' };
    }

    try {
      const mexcChannel = this.buildMexcChannel(subscription);
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Check for duplicate subscription
      const existingSubscription = Array.from(this.subscriptions.values()).find(
        (sub) => sub.mexcChannel === mexcChannel
      );

      if (existingSubscription) {
        this.logger.debug('Returning existing subscription', {
          subscriptionId: existingSubscription.id,
          channel: mexcChannel,
        });
        return { success: true, subscriptionId: existingSubscription.id };
      }

      // Warn for potentially invalid symbols
      if (!this.isKnownSymbol(subscription.symbol)) {
        this.logger.warn('Subscribing to potentially invalid symbol', {
          symbol: subscription.symbol,
        });
      }

      // Create subscription message
      const subscribeMessage = {
        method: 'SUBSCRIPTION',
        params: [mexcChannel],
      };

      // Send subscription request
      this.websocket.send(JSON.stringify(subscribeMessage));
      this.messagesSent++;

      // Store subscription
      const internalSubscription: InternalSubscription = {
        id: subscriptionId,
        type: subscription.type,
        symbol: subscription.symbol,
        depth: subscription.depth,
        callback: subscription.callback,
        mexcChannel,
      };

      this.subscriptions.set(subscriptionId, internalSubscription);
      this.activeChannels.add(mexcChannel);

      this.logger.info('Subscribed to channel', {
        type: subscription.type,
        symbol: subscription.symbol,
        subscriptionId,
      });

      return { success: true, subscriptionId };
    } catch (error) {
      this.logger.error('Failed to send subscription message', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false, error: error instanceof Error ? error.message : 'Send failed' };
    }
  }

  async unsubscribe(subscriptionId: string): Promise<{ success: boolean }> {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        return { success: false };
      }

      if (this.websocket && this.isConnected) {
        const unsubscribeMessage = {
          method: 'UNSUBSCRIPTION',
          params: [subscription.mexcChannel],
        };

        this.websocket.send(JSON.stringify(unsubscribeMessage));
        this.messagesSent++;
      }

      this.subscriptions.delete(subscriptionId);
      this.activeChannels.delete(subscription.mexcChannel);

      this.logger.info('Unsubscribed from channel', {
        subscriptionId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to unsubscribe', {
        subscriptionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false };
    }
  }

  getConnectionStatus(): WebSocketConnectionStatus {
    return {
      isConnected: this.isConnected,
      subscriptionCount: this.subscriptions.size,
      connectionTime: this.connectionTime,
    };
  }

  getConnectionStatistics(): WebSocketConnectionStatistics {
    return {
      isConnected: this.isConnected,
      activeSubscriptions: this.subscriptions.size,
      totalMessagesReceived: this.messagesReceived,
      totalMessagesSent: this.messagesSent,
      connectionUptime: this.connectionTime ? Date.now() - this.connectionTime : 0,
      lastPingTime: this.lastPingTime,
      reconnectionCount: this.reconnectAttempts,
    };
  }

  async healthCheck(): Promise<WebSocketHealthCheck> {
    return {
      healthy: this.isConnected,
      details: {
        connected: this.isConnected,
        subscriptions: this.subscriptions.size,
        lastActivity: this.lastActivityTime,
        pingLatency: this.lastPingTime ? Date.now() - this.lastPingTime : null,
      },
    };
  }

  private handleMessage(data: string): void {
    this.messagesReceived++;
    this.lastActivityTime = Date.now();

    try {
      const message = JSON.parse(data);

      // Handle pong responses
      if (message.method === 'PONG') {
        this.logger.debug('Received pong response', {
          latency: this.lastPingTime ? Date.now() - this.lastPingTime : null,
        });
        return;
      }

      // Handle subscription data
      if (message.c && message.s) {
        this.routeMessage(message);
      }
    } catch (error) {
      this.logger.error('Failed to parse WebSocket message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        message: data,
      });
    }
  }

  private routeMessage(message: any): void {
    const channel = message.c;
    const symbol = message.s;
    const data = message.d;

    // Find matching subscriptions
    const matchingSubscriptions = Array.from(this.subscriptions.values()).filter(
      (sub) => sub.mexcChannel === channel
    );

    matchingSubscriptions.forEach((subscription) => {
      try {
        const parsedData = this.parseMessageData(subscription.type, data);
        const webSocketMessage: WebSocketMessage = {
          type: subscription.type,
          symbol,
          data: parsedData,
        };

        subscription.callback(webSocketMessage);
      } catch (error) {
        this.logger.error('Failed to process message for subscription', {
          subscriptionId: subscription.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  private parseMessageData(
    type: SubscriptionType,
    data: any
  ): LivePriceUpdate | OrderBookUpdate | TradeUpdate {
    switch (type) {
      case 'ticker':
        return {
          price: data.c || '0',
          high: data.h || '0',
          low: data.l || '0',
          open: data.o || '0',
          volume: data.v || '0',
          timestamp: data.t || Date.now(),
        };

      case 'orderbook':
        return {
          bids: (data.bids || []).map(([price, quantity]: [string, string]) => ({
            price,
            quantity,
          })),
          asks: (data.asks || []).map(([price, quantity]: [string, string]) => ({
            price,
            quantity,
          })),
          timestamp: data.t || Date.now(),
        };

      case 'trades':
        return {
          side: data.S === 1 ? 'buy' : 'sell',
          price: data.p || '0',
          quantity: data.v || '0',
          timestamp: data.t || Date.now(),
        };

      default:
        throw new Error(`Unknown subscription type: ${type}`);
    }
  }

  private buildMexcChannel(subscription: WebSocketSubscription): string {
    switch (subscription.type) {
      case 'ticker':
        return `spot@public.miniTicker.v3.api.pb@${subscription.symbol}`;
      case 'orderbook': {
        const depth = subscription.depth || 20;
        return `spot@public.depth.v3.api.pb@${subscription.symbol}@${depth}`;
      }
      case 'trades':
        return `spot@public.deals.v3.api.pb@${subscription.symbol}`;
      default:
        throw new Error(`Unknown subscription type: ${subscription.type}`);
    }
  }

  private isValidSubscription(subscription: WebSocketSubscription): boolean {
    if (!subscription.type || !subscription.symbol || !subscription.callback) {
      return false;
    }

    if (!['ticker', 'orderbook', 'trades'].includes(subscription.type)) {
      return false;
    }

    if (subscription.symbol.length === 0) {
      return false;
    }

    return true;
  }

  private isValidSymbol(symbol: string): boolean {
    // Basic validation for MEXC symbol format
    if (!symbol || symbol.length === 0) return false;

    // Standard format: ends with USDT and contains only uppercase letters
    return /^[A-Z]+USDT$/.test(symbol) && symbol.length > 4;
  }

  private isKnownSymbol(symbol: string): boolean {
    // Known valid symbols (for testing - in production this would be more comprehensive)
    const knownSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT'];
    return knownSymbols.includes(symbol);
  }

  private startPingInterval(): void {
    // Send initial ping immediately for testing
    if (this.websocket && this.isConnected) {
      try {
        this.lastPingTime = Date.now();
        const pingMessage = { method: 'PING' };
        this.websocket.send(JSON.stringify(pingMessage));
        this.messagesSent++;

        this.logger.debug('Sending ping', {
          timestamp: this.lastPingTime,
        });
      } catch (error) {
        this.logger.error('Failed to send ping', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Then start regular interval
    this.pingTimer = setInterval(() => {
      if (this.websocket && this.isConnected) {
        try {
          this.lastPingTime = Date.now();
          const pingMessage = { method: 'PING' };
          this.websocket.send(JSON.stringify(pingMessage));
          this.messagesSent++;

          this.logger.debug('Sending ping', {
            timestamp: this.lastPingTime,
          });
        } catch (error) {
          this.logger.error('Failed to send ping', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }, this.config.pingInterval);
  }

  private handleConnectionClose(event: CloseEvent): void {
    this.isConnected = false;
    this.lastActivityTime = Date.now();

    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }

    // Log the close event
    const closeReasons: Record<number, string> = {
      1000: 'Normal closure',
      1001: 'Going away',
      1002: 'Protocol error',
      1003: 'Unsupported data',
      1006: 'Abnormal closure',
      1011: 'Internal error',
    };

    const reason = closeReasons[event.code] || 'Unknown';

    if (event.code === 1000) {
      this.logger.info('WebSocket connection closed normally', {
        code: event.code,
        reason,
      });
    } else {
      this.logger.warn('WebSocket connection lost', {
        code: event.code,
        reason,
      });

      // Attempt reconnection for abnormal closures
      this.attemptReconnection();
    }
  }

  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached', {
        maxAttempts: this.config.maxReconnectAttempts,
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * 2 ** (this.reconnectAttempts - 1); // Exponential backoff

    this.logger.info('Attempting WebSocket reconnection', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
      delay,
    });

    this.reconnectTimer = setTimeout(async () => {
      try {
        const result = await this.connect();
        if (result.success) {
          await this.restoreSubscriptions();
        }
      } catch (error) {
        this.logger.error('Reconnection attempt failed', {
          attempt: this.reconnectAttempts,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, delay);
  }

  private async restoreSubscriptions(): Promise<void> {
    const subscriptionsToRestore = Array.from(this.subscriptions.values());

    for (const subscription of subscriptionsToRestore) {
      try {
        this.logger.info('Restoring subscription after reconnection', {
          type: subscription.type,
          symbol: subscription.symbol,
          subscriptionId: subscription.id,
        });

        if (this.websocket && this.isConnected) {
          const subscribeMessage = {
            method: 'SUBSCRIPTION',
            params: [subscription.mexcChannel],
          };

          this.websocket.send(JSON.stringify(subscribeMessage));
          this.messagesSent++;
        }
      } catch (error) {
        this.logger.error('Failed to restore subscription', {
          subscriptionId: subscription.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }
}
