/**
 * Trading Operations Types
 * TypeScript interfaces for trading operations with Encore validation
 */

import type { Max, MaxLen, Min, MinLen } from 'encore.dev/validate';

// Enum types
export type OrderSideType = 'buy' | 'sell';
export type OrderTypeType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderStatusType =
  | 'pending'
  | 'open'
  | 'filled'
  | 'partially_filled'
  | 'cancelled'
  | 'rejected'
  | 'expired';
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

// Export schema objects for test compatibility (using Encore validation patterns)
export const PlaceOrderSchema = {
  type: 'object',
  properties: {
    symbol: { type: 'string', minLength: 1, maxLength: 20 },
    side: { type: 'string', enum: ['buy', 'sell'] },
    type: { type: 'string', enum: ['market', 'limit', 'stop', 'stop_limit'] },
    quantity: { type: 'number', minimum: 0 },
    price: { type: 'number', minimum: 0 },
    stopPrice: { type: 'number', minimum: 0 },
    timeInForce: { type: 'string', enum: ['GTC', 'IOC', 'FOK'] },
    clientOrderId: { type: 'string' },
    testMode: { type: 'boolean' },
  },
  required: ['symbol', 'side', 'type', 'quantity'],
} as const;

export const CancelOrderSchema = {
  type: 'object',
  properties: {
    orderId: { type: 'string' },
    clientOrderId: { type: 'string' },
    symbol: { type: 'string', minLength: 1, maxLength: 20 },
  },
  required: ['symbol'],
} as const;

export const GetOrderHistorySchema = {
  type: 'object',
  properties: {
    symbol: { type: 'string', minLength: 1, maxLength: 20 },
    status: {
      type: 'string',
      enum: ['pending', 'open', 'filled', 'partially_filled', 'cancelled', 'rejected', 'expired'],
    },
    startTime: { type: 'number', minimum: 0 },
    endTime: { type: 'number', minimum: 0 },
    limit: { type: 'number', minimum: 1, maximum: 500 },
    page: { type: 'number', minimum: 1 },
  },
  required: [],
} as const;

export const GetOrderStatusSchema = {
  type: 'object',
  properties: {
    orderId: { type: 'string' },
    clientOrderId: { type: 'string' },
    symbol: { type: 'string', minLength: 1, maxLength: 20 },
  },
  required: ['symbol'],
} as const;

export const BatchOrderSchema = {
  type: 'object',
  properties: {
    orders: { type: 'array', items: PlaceOrderSchema },
    testMode: { type: 'boolean' },
  },
  required: ['orders'],
} as const;
