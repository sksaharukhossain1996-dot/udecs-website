import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeWholesaleQty, wholesaleAvailability, quoteTotals} from '../src/lib/wholesale';
test('minimum and step apply without changing cart removal semantics', () => {
 assert.equal(normalizeWholesaleQty({minimumOrderQty:24,quantityStep:12},1),24);
 assert.equal(normalizeWholesaleQty({minimumOrderQty:24,quantityStep:12},25),36);
});
test('supplier stock is a boolean not fictitious unit count',()=>{
 assert.equal(wholesaleAvailability({stockManaged:false,supplierInStock:true,stock:0}),true);
 assert.equal(wholesaleAvailability({stockManaged:false,supplierInStock:false,stock:100}),false);
});
test('GST extra uses item rates and rounds currency; shipping is excluded',()=>{
 assert.deepEqual(quoteTotals([{price:10,qty:10,rate:5},{price:10,qty:10,rate:18}]),{net:200,tax:23,total:223});
});
