import type {SavedOrder} from './order-client';
export function phoneDigits(value:string){return value.replace(/[^0-9]/g,'');}
export function ownedPhoneOrders(orders:SavedOrder[],uid:string,phone:string):SavedOrder[]{
 if(!uid||orders.some(o=>o.customerUid!==uid))throw new Error('Account mismatch. Sign in again.');
 const digits=phoneDigits(phone);
 if(digits.length<7||digits.length>15)throw new Error('Enter the full phone number with country code.');
 return orders.filter(o=>phoneDigits(o.customerPhone||'')===digits);
}
export function orderStatusReply(orders:SavedOrder[],uid:string,more:boolean):string{
 if(!uid||orders.some(o=>o.customerUid!==uid))throw new Error('Account mismatch. Sign in again.');
 if(!orders.length)return 'No matching orders in the loaded page of your Google account. Open My Orders to load more. Guest orders and other accounts are not searched.';
 const rows=orders.slice(0,5).map(o=>`${o.id}\nOrder: ${o.orderStatus}. Payment: ${o.paymentStatus}.\n${o.currency} ${o.totalAmount}\n${o.trackingNumber?`Recorded courier reference: ${o.courierName||'not specified'} / ${o.trackingNumber}. This is not a live courier scan.`:'Courier reference not assigned.'}`).join('\n\n');
 return rows+'\n\n'+(more||orders.length>5?'More may be available. ':'')+'Open My Orders to review all loaded orders. A saved order is not proof of payment.';
}
