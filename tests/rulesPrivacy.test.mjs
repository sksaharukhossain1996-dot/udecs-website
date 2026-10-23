import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const rules = readFileSync('/tmp/emutest/firestore.rules', 'utf8');
const env = await initializeTestEnvironment({ projectId: 'demo-udecs', firestore: { rules, host: '127.0.0.1', port: 8399 } });
const results = [];
async function check(name, fn, expect) {
  try { await fn(); results.push([name, expect === 'allow' ? 'PASS' : 'FAIL(got allow)']); }
  catch (e) { results.push([name, expect === 'deny' ? 'PASS' : 'FAIL(got deny: ' + String(e).slice(0, 80) + ')']); }
}
const anon = env.unauthenticatedContext().firestore();
const admin = env.authenticatedContext('owner1', { email: 'ecommerceunickdigital@gmail.com', email_verified: true }).firestore();
const other = env.authenticatedContext('user2', { email: 'random@example.com', email_verified: true }).firestore();

await check('anon read products (storefront)', () => getDoc(doc(anon, 'products/p1')), 'allow');
await check('anon read productsPrivate', () => getDoc(doc(anon, 'productsPrivate/p1')), 'deny');
await check('non-admin signed-in read productsPrivate', () => getDoc(doc(other, 'productsPrivate/p1')), 'deny');
await check('non-admin write productsPrivate', () => setDoc(doc(other, 'productsPrivate/p1'), { sourceRate: 1 }), 'deny');
await check('admin read productsPrivate', () => getDoc(doc(admin, 'productsPrivate/p1')), 'allow');
await check('admin write productsPrivate', () => setDoc(doc(admin, 'productsPrivate/p1'), { sourceRate: 300, supplierSource: 'https://wukusy.app/x' }), 'allow');
await check('anon write products', () => setDoc(doc(anon, 'products/p2'), { name: 'x' }), 'deny');
await check('admin write products scrubbed doc passes isValidProduct', () => setDoc(doc(admin, 'products/p3'), { name: 'X', sku: '1_x', hsn: '1234', price: 100, stock: 5, category: 'kitchen', gstRate: 18, hasOnlineLink: true }), 'allow');
await check('admin write products missing core field denied', () => setDoc(doc(admin, 'products/p4'), { name: 'X' }), 'deny');
for (const [n, r] of results) console.log(r.padEnd(4), n);
await env.cleanup();
const fails = results.filter(([, r]) => r !== 'PASS').length;
console.log(fails === 0 ? 'RULES TESTS: ALL PASS (' + results.length + ')' : 'RULES TESTS: ' + fails + ' FAIL');
process.exit(fails === 0 ? 0 : 1);
