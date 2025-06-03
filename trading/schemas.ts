/**
 * Trading Operations Types
 * TypeScript interfaces for trading operations with Encore validation
 */

import { MinLen, MaxLen, Min, Max } from 'encore.dev/validate';

// Enum types
export type OrderSideType = 'buy' | 'sell';
export type OrderTypeType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderStatusType = 'pending' | 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected' | 'expired';
export type TimeInForceType = 'GTC' | 'IOC' | 'FOK';

/**
 * Interface for placing orders
 */
export interface PlaceOrderArgs {
  symbol: string & MinLen<1> & MaxLen<20>;
  side: OrderSideType;
  type: OrderTypeType;
  quantity: number & Min<0>;
  price?: number & Min<0>;
  stopPrice?: number & Min<0>;
  timeInForce?: TimeInForceType;
  clientOrderId?: string;
  testMode?: boolean;
}

/**
 * Interface for cancelling orders
 */
export interface CancelOrderArgs {
  orderId?: string;
  clientOrderId?: string;
  symbol: string & MinLen<1> & MaxLen<20>;
}

/**
 * Interface for querying order status
 */
export interface GetOrderStatusArgs {
  orderId?: string;
  clientOrderId?: string;
  symbol: string & MinLen<1> & MaxLen<20>;
}

/**
 * Interface for querying order history
 */
export interface GetOrderHistoryArgs {
  symbol?: string & MinLen<1> & MaxLen<20>;
  status?: OrderStatusType;
  startTime?: number & Min<0>;
  endTime?: number & Min<0>;
  limit?: number & Min<1> & Max<500>;
  page?: number & Min<1>;
}

/**
 * Interface for batch order operations
 */
export interface BatchOrderArgs {
  orders: PlaceOrderArgs[];
  testMode?: boolean;
}

/**
 * Interface for order size validation
 */
export interface OrderSizeValidationArgs {
  symbol: string & MinLen<1> & MaxLen<20>;
  side: OrderSideType;
  quantity: number & Min<0>;
  price?: number & Min<0>;
}