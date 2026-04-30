import { request } from './client';
import { OrderDetail, OrderListItem } from '@/types';

export interface CreateOrderRequest {
  photographer_id: number;
  package_id: number;
  shoot_date: string;
  location: string;
  requirements?: string;
  contact_name?: string;
  contact_phone?: string;
}

export interface PrepayResponse {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
  order_no: string;
}

export const createOrder = (data: CreateOrderRequest) =>
  request<OrderDetail>({ url: '/orders', method: 'POST', data });

export const listOrders = (role: 'buyer' | 'photographer' = 'buyer', status?: string) =>
  request<OrderListItem[]>({
    url: `/orders?role=${role}${status ? `&status=${status}` : ''}`,
  });

export const getOrder = (id: number) =>
  request<OrderDetail>({ url: `/orders/${id}` });

export const prepay = (orderId: number) =>
  request<PrepayResponse>({ url: `/orders/${orderId}/prepay`, method: 'POST' });

export const mockPay = (orderId: number) =>
  request<OrderDetail>({ url: `/orders/${orderId}/mock-pay`, method: 'POST' });

export const cancelOrder = (orderId: number) =>
  request<OrderDetail>({ url: `/orders/${orderId}/cancel`, method: 'POST' });

export const confirmOrder = (orderId: number) =>
  request<OrderDetail>({ url: `/orders/${orderId}/confirm`, method: 'POST' });

export const reviewOrder = (
  orderId: number,
  data: { rating: number; text?: string; tags?: string[]; images?: string[] }
) =>
  request<OrderDetail>({
    url: `/orders/${orderId}/review`,
    method: 'POST',
    data,
  });
