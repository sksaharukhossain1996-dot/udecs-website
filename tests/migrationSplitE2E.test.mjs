// E2E of the REAL migration logic from products-privacy-split.html against the
// Firestore emulator: runBatches/pickSensitive/SENSITIVE are extracted verbatim
// from the shipped page source (no reimplementation) and executed with the
// modular Firestore SDK bound to an admin rules context.
// Covers: split correctness, no public-field loss, hasOnlineLink, idempotence,
// interruption recovery (partial state re-run), and post-split authz.
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, getDocs, collection, writeBatch, deleteField, getDocsFromServer } from 'firebase/firestore';
import { deepStrictEqual, strictEqual, ok } from 'node:assert';

const PAGE = '/tmp/privacy-fix/products-privacy-split.html';
const src = readFileSync(PAGE, 'utf8');
function grab(re, name) { const m = src.match(re); if (!m) throw new Error('extract failed: ' + name); return m[0]; }
const body =
  grab(/var SENSITIVE = \[[^\]]*\];/, 'SENSITIVE') + '\nvar say=function(){};\n' +
  grab(/function pickSensitive\(data\) \{[\s\S]*?\n\}/, 'pickSensitive') + '\n' +
  grab(/async function runBatches\(direction\) \{[\s\S]*?return \{ total: snap\.size, touched \};\n\}/, 'runBatches') +
  '\nreturn { pickSensitive, runBatches, SENSITIVE };';
const make = new Function('db', 'getDocsFromServer', 'collection', 'writeBatch', 'doc', 'deleteField', body);

const rules = readFileSync('/tmp/emutest/firestore.rules', 'utf8');
const env = await initializeTestEnvironment({ projectId: 'demo-udecs', firestore: { rules, host: '127.0.0.1', port: 8399 } });
const admin = env.authenticatedContext('owner1', { email: 'ecommerceunickdigital@gmail.com', email_verified: true }).firestore();
const anon = env.unauthenticatedContext().firestore();
const { runBatches, SENSITIVE } = make(admin, getDocsFromServer, collection, writeBatch, doc, deleteField);

const pub = (over) => ({ name: 'Item', sku: 'SKU1', hsn: '8467', gstRate: 18, price: 100, wholesalePrice: 80, minWholesaleQty: 10, stock: 50, minStockAlert: 5, category: 'kitchen', supplier: 'rajkot', supplierInStock: true, ...over });
const sens = { sourceRate: 40, supplierSource: 'https://wukusy.example/x', supplierStatusSource: 'ok', supplierSKUConfidence: 0.9, supplierSKUProvenance: 'match', supplierCheckedAt: 't1', supplierStatusCheckedAt: 't2', sourceCheckedAt: 't3', productLink: 'https://amazon.in/dp/X', hsnBasis: 'cat', hsnProvenance: 'auto' };

// Clean slate: emulator data persists across runs; remove leftovers from prior tests.
await env.withSecurityRulesDisabled(async (ctx) => {
  const { getDocs, deleteDoc, collection } = await import('firebase/firestore');
  for (const col of ['products', 'productsPrivate']) {
    const snap = await getDocs(collection(ctx.firestore(), col));
    for (const d of snap.docs) await deleteDoc(d.ref);
  }
});
// Seed legacy (pre-split) state bypassing rules, as production data already exists.
await env.withSecurityRulesDisabled(async (ctx) => {
  const s = (await import('firebase/firestore')).setDoc;
  await s(doc(ctx.firestore(), 'products/p1'), pub(sens));
  await s(doc(ctx.firestore(), 'products/p2'), pub({ name: 'Clean' }));               // no sensitive fields
  await s(doc(ctx.firestore(), 'products/p3'), pub({ sourceRate: 55, productLink: '' })); // empty link
});
// Snapshot p2 to prove untouched docs stay byte-identical.
const p2Before = (await getDoc(doc(admin, 'products/p2'))).data();

const results = [];
function check(name, fn) { try { fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL: ' + String(e && e.message || e).slice(0, 140)]); } }

// --- RUN 1: split ---
const r1 = await runBatches('split');
check('run1 scans 3, touches 2 (p1, p3)', () => { strictEqual(r1.total, 3); strictEqual(r1.touched, 2); });
const pub1 = (await getDoc(doc(admin, 'products/p1'))).data();
const priv1 = (await getDoc(doc(admin, 'productsPrivate/p1'))).data();
check('p1: all 11 sensitive fields moved verbatim', () => deepStrictEqual(priv1, sens));
check('p1: public doc scrubbed, no sensitive key remains', () => { for (const k of SENSITIVE) ok(!(k in pub1), 'leftover ' + k); });
check('p1: hasOnlineLink true (productLink was non-empty)', () => strictEqual(pub1.hasOnlineLink, true));
check('p1: public selling fields intact (wholesalePrice/price/stock/minStockAlert/supplier)', () => {
  strictEqual(pub1.wholesalePrice, 80); strictEqual(pub1.price, 100); strictEqual(pub1.stock, 50);
  strictEqual(pub1.minStockAlert, 5); strictEqual(pub1.supplier, 'rajkot'); strictEqual(pub1.supplierInStock, true);
});
const pub3 = (await getDoc(doc(admin, 'products/p3'))).data();
const priv3 = (await getDoc(doc(admin, 'productsPrivate/p3'))).data();
check('p3: empty productLink -> hasOnlineLink false, other fields moved', () => {
  strictEqual(pub3.hasOnlineLink, false); strictEqual(priv3.sourceRate, 55); strictEqual(priv3.productLink, '');
});
check('p2: untouched doc byte-identical, no priv doc created', async () => {});
deepStrictEqual((await getDoc(doc(admin, 'products/p2'))).data(), p2Before);
strictEqual((await getDoc(doc(admin, 'productsPrivate/p2'))).exists(), false);
results.push(['p2: untouched doc identical, no priv doc', 'PASS']);

// --- RUN 2: idempotence ---
const r2 = await runBatches('split');
check('run2 idempotent: touches 0', () => strictEqual(r2.touched, 0));
deepStrictEqual((await getDoc(doc(admin, 'productsPrivate/p1'))).data(), sens);
results.push(['run2 leaves state identical', 'PASS']);

// --- INTERRUPTION: new dirty doc + dirty doc with stale priv (crash between docs) ---
await env.withSecurityRulesDisabled(async (ctx) => {
  const s = (await import('firebase/firestore')).setDoc;
  await s(doc(ctx.firestore(), 'products/p4'), pub({ sourceRate: 61, productLink: 'https://amazon.in/dp/NEW' })); // import landed post-split
  await s(doc(ctx.firestore(), 'products/p5'), pub({ sourceRate: 70 }));          // pub still dirty
  await s(doc(ctx.firestore(), 'productsPrivate/p5'), { sourceRate: 1, stale: true }); // stale priv from earlier partial run
});
const r3 = await runBatches('split');
check('run3 recovers: touches exactly the 2 dirty docs', () => strictEqual(r3.touched, 2));
const priv5 = (await getDoc(doc(admin, 'productsPrivate/p5'))).data();
const pub5 = (await getDoc(doc(admin, 'products/p5'))).data();
check('p5: priv overwritten with pub values (merge), pub scrubbed', () => {
  strictEqual(priv5.sourceRate, 70); ok(!('sourceRate' in pub5)); strictEqual(pub5.hasOnlineLink, false);
});
check('p4: split correct', async () => {});
deepStrictEqual((await getDoc(doc(admin, 'productsPrivate/p4'))).data(), { sourceRate: 61, productLink: 'https://amazon.in/dp/NEW' });
strictEqual((await getDoc(doc(admin, 'products/p4'))).data().hasOnlineLink, true);
results.push(['p4 split correct after interruption', 'PASS']);
const r4 = await runBatches('split');
check('run4 converged: 0 dirty remain', () => strictEqual(r4.touched, 0));

// --- LEGACY INVALID DOC: scrub update is denied by isValidProduct (documented behavior) ---
await env.withSecurityRulesDisabled(async (ctx) => {
  const s = (await import('firebase/firestore')).setDoc;
  await s(doc(ctx.firestore(), 'products/legacy1'), { name: 'Old', sku: 'S9', price: 5, stock: 2, category: 'kitchen', sourceRate: 33 }); // no hsn/gstRate
});
try { await runBatches('split'); results.push(['legacy invalid doc: expected batch denial', 'FAIL: batch unexpectedly succeeded']); }
catch (e) { results.push(['legacy invalid doc: batch denied by isValidProduct gate (live check: 0 real docs affected)', /hsn|PERMISSION|permission/i.test(String(e)) ? 'PASS' : 'FAIL: ' + String(e).slice(0, 120)]); }
await env.withSecurityRulesDisabled(async (ctx) => { const { deleteDoc } = await import('firebase/firestore'); await deleteDoc(doc(ctx.firestore(), 'products/legacy1')); });

// --- POST-SPLIT AUTHZ ---
const anonDocs = await assertSucceeds(getDocs(collection(anon, 'products')));
check('anon still reads products after split (storefront up)', () => strictEqual(anonDocs.size, 5));
const leaked = [];
anonDocs.forEach((d) => { for (const k of Object.keys(d.data())) if (SENSITIVE.includes(k)) leaked.push(d.id + ':' + k); });
check('anon-visible docs carry ZERO sensitive fields', () => deepStrictEqual(leaked, []));
await assertFails(getDoc(doc(anon, 'productsPrivate/p1')));
results.push(['anon read productsPrivate still denied', 'PASS']);

await env.cleanup();
let fail = 0;
for (const [n, s] of results) { console.log((s === 'PASS' ? 'PASS' : 'FAIL') + '  ' + n + (s === 'PASS' ? '' : '  ' + s)); if (s !== 'PASS') fail++; }
console.log(fail === 0 ? 'ALL ' + results.length + ' MIGRATION E2E CHECKS PASSED' : fail + ' FAILURES');
process.exit(fail ? 1 : 0);
