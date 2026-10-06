import { Order } from '../types';
const DEMO_IDS = new Set(['UDECS-ORD-9842', 'UDECS-ORD-9843', 'UDECS-ORD-9844', 'UDECS-ORD-3823']);
export function isDemoOrTestOrder(order: Order): boolean {
  const data = order as Order & Record<string, any>;
  return DEMO_IDS.has(order.id) || /^(TEST|SMOKE|DEMO)[_-]/i.test(order.id) ||
    data.isDemo === true || data.isTest === true || data.testMode === true ||
    data.gatewayVerification === true || data.nonDelivery === true ||
    [data.source, data.environment, data.kind, data.mode, data.orderType].some(v => typeof v === 'string' && /^(demo|test|mock|sandbox)$/i.test(v));
}
export function validateOrderEmail(order: Order | null, reviewed: Order): void {
  if (!order) throw new Error('This order is not on the server. No email was sent.');
  if (isDemoOrTestOrder(order)) throw new Error('Demo/test orders cannot send customer emails.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.customerEmail)) throw new Error('This order has no valid customer email.');
  const fields: (keyof Order)[] = ['id', 'customerEmail', 'customerName', 'orderStatus', 'paymentStatus', 'totalAmount', 'trackingNumber', 'courierName', 'shippingAddress', 'city', 'state', 'pincode', 'updatedAt'];
  if (fields.some(key => order[key] !== reviewed[key])) throw new Error('The server order changed. Close this email and review the current order before sending.');
}

export function canFulfilOrder(order: Pick<Order, 'paymentMethod' | 'paymentStatus'>): boolean {
  return order.paymentMethod === 'cod' || order.paymentStatus === 'paid';
}
export function validateFulfilment(order: Order, status: Order['orderStatus']): void {
  if (order.orderStatus === 'cancelled') throw new Error('Cancelled orders cannot be fulfilled.');
  if (status === 'cancelled') throw new Error('Use server cancellation to release stock safely.');
  if (status !== 'pending' && !canFulfilOrder(order)) {
    throw new Error('Online payment is not confirmed. Verify payment before processing, packing or dispatching this order.');
  }
}
