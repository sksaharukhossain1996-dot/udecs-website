import {orderClient} from './order-client';import {customerAuth} from './customerIdentity';import {isVerifiedGoogleCustomer} from './customerOrderIdentity';
// Activated only at verified backend/rules cutover. No fallback to direct client writes.
export const ORDER_SERVICE_ORIGIN='https://udecs-orders-api.sksaharukhossain1996.workers.dev';
export function customerOrderClient(){if(!ORDER_SERVICE_ORIGIN)throw Error('Order service is not configured');return orderClient({origin:ORDER_SERVICE_ORIGIN,identity:async()=>{const u=customerAuth.currentUser;if(!isVerifiedGoogleCustomer(u))throw Error('Sign in with Google before ordering');return {uid:u!.uid,token:await u!.getIdToken()};}});}
