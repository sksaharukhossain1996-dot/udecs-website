import type {Order} from '../types';
import {isDemoOrTestOrder} from './orderEmailSafety';
export function orderCreationMonth(value:unknown):string {
 const d=new Date(typeof value==='string'||typeof value==='number'?value:NaN);
 if(!Number.isFinite(d.getTime()))return '';
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'}).formatToParts(d);
 return parts.find(p=>p.type==='year')?.value+'-'+parts.find(p=>p.type==='month')?.value;
}
export function dashboardSummary(orders:Order[],month:string){
 const real=orders.filter(o=>!isDemoOrTestOrder(o));
 const invalid=real.filter(o=>!orderCreationMonth(o.createdAt)||!Number.isFinite(o.totalAmount)||o.totalAmount<0);
 const selected=real.filter(o=>orderCreationMonth(o.createdAt)===month&&Number.isFinite(o.totalAmount)&&o.totalAmount>=0);
 const active=selected.filter(o=>o.orderStatus!=='cancelled');
 const paid=active.filter(o=>o.paymentStatus==='paid');
 const unpaid=active.filter(o=>o.paymentStatus!=='paid');
 return {selected,active,paid,unpaid,invalid:invalid.length,recordedValue:active.reduce((n,o)=>n+o.totalAmount,0),paidValue:paid.reduce((n,o)=>n+o.totalAmount,0),pending:active.filter(o=>['pending','processing'].includes(o.orderStatus))};
}
