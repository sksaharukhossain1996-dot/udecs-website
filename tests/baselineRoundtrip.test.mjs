// Round-trip proof: exported baseline JSON preserves Firestore SDK types exactly.
// Seeds emulator with products + productsPrivate (Timestamps, nested maps), runs the
// VERBATIM exporter logic from public/products-private-export.html, and asserts the
// serialized JSON revives to values the SDK considers identical (Timestamp.isEqual),
// and that a fresh server read re-serializes byte-identical (stable baseline compare).
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, collection, getDocsFromServer, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../public/products-private-export.html', import.meta.url), 'utf8');
const block = html.match(/\/\/ === EXPORTER LOGIC START[\s\S]*?\/\/ === EXPORTER LOGIC END ===/)[0];
const runner = new Function('Timestamp', block + '\nreturn { serializeSdkValue, buildBaseline, EXPORT_PUBLIC_FIELDS, EXPORT_PRIVATE_FIELDS };');

const rules = readFileSync('/tmp/emutest/firestore.rules', 'utf8');
const env = await initializeTestEnvironment({ projectId: 'demo-udecs', firestore: { rules, host: '127.0.0.1', port: 8399 } });
const db = env.authenticatedContext('owner1', { email: 'ecommerceunickdigital@gmail.com', email_verified: true }).firestore();
const { serializeSdkValue, buildBaseline } = runner(Timestamp);

let pass = 0; const t = (n, c) => { assert.ok(c, n); console.log('PASS', n); pass++; };

const TS1 = Timestamp.fromMillis(1761302400123); // fixed instant, non-zero ms
const TS2 = new Timestamp(1761309999, 123456789); // non-zero nanoseconds
await setDoc(doc(db, 'products', 'p1'), { sku: 'SKU1', name: 'Widget', supplier: 'wukusy', supplierInStock: true, price: 499, stock: 9, category: 'kitchen', gstRate: 18, hsn: '1234' });
await setDoc(doc(db, 'productsPrivate', 'p1'), {
  supplierSource: 'https://wukusy.app/merchant/product-details/123',
  sourceRate: 210.5,
  supplierStatusCheckedAt: TS1,
  supplierStatusSource: 'https://wukusy.app/merchant/product-details/123',
  supplierCheckedAt: TS2,
  productLink: 'https://amazon.in/dp/B0TEST',
  supplierSKUConfidence: 0.92,
  supplierSKUProvenance: { method: 'auto', detail: { matched: true, at: TS1 } },
  sourceCheckedAt: TS2
});
await setDoc(doc(db, 'products', 'p2'), { sku: 'SKU2', name: 'NoPriv', supplier: 'wukusy', supplierInStock: false, price: 99, stock: 3, category: 'kitchen', gstRate: 18, hsn: '1234' });

async function readAll() {
  const pub = {}, priv = {};
  (await getDocsFromServer(collection(db, 'products'))).forEach(d => pub[d.id] = d.data());
  (await getDocsFromServer(collection(db, 'productsPrivate'))).forEach(d => priv[d.id] = d.data());
  return { pub, priv };
}

const { pub, priv } = await readAll();
const baseline = buildBaseline(pub, priv);
const json = JSON.stringify(baseline);
const parsed = JSON.parse(json);

// 1. Timestamps serialized as {seconds, nanoseconds} numeric markers, never ISO strings
t('p1 supplierStatusCheckedAt is {seconds,nanoseconds}', parsed.p1.supplierStatusCheckedAt && typeof parsed.p1.supplierStatusCheckedAt.seconds === 'number' && typeof parsed.p1.supplierStatusCheckedAt.nanoseconds === 'number');
t('p1 marker exact values', parsed.p1.supplierStatusCheckedAt.seconds === TS1.seconds && parsed.p1.supplierStatusCheckedAt.nanoseconds === TS1.nanoseconds);
t('no ISO date strings anywhere', !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(json));
t('nested map Timestamp also serialized', parsed.p1.supplierSKUProvenance.detail.at.seconds === TS1.seconds);

// 2. revive markers -> Timestamp and prove SDK-identical vs a FRESH server read
function revive(v) {
  if (v === null || typeof v !== 'object') return v;
  if (typeof v.seconds === 'number' && typeof v.nanoseconds === 'number' && Object.keys(v).length === 2) return new Timestamp(v.seconds, v.nanoseconds);
  if (Array.isArray(v)) return v.map(revive);
  const o = {}; for (const k of Object.keys(v)) o[k] = revive(v[k]); return o;
}
const { pub: pub2, priv: priv2 } = await readAll();
// raw (unserialized) SDK values for the same field selection:
const fresh = {};
for (const [id, pub] of Object.entries(pub2)) {
  const rec = {};
  for (const f of ["sku","name","supplier","supplierInStock"]) if (pub[f] !== undefined) rec[f] = pub[f];
  const priv = priv2[id] || {};
  for (const f2 of ["supplierSource","supplierStatusCheckedAt","supplierStatusSource","supplierCheckedAt","sourceRate","productLink","supplierSKUConfidence","supplierSKUProvenance","sourceCheckedAt"]) if (priv[f2] !== undefined) rec[f2] = priv[f2];
  fresh[id] = rec;
}
const revived = {};
for (const [id, rec] of Object.entries(parsed)) { revived[id] = revive(rec); }
function deepSdkEqual(a, b, path) {
  if (a instanceof Timestamp || b instanceof Timestamp) return (a instanceof Timestamp && b instanceof Timestamp && a.isEqual(b)) ? true : path + ' ts-mismatch';
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return path + ' array-mismatch';
    for (let i = 0; i < a.length; i++) { const r = deepSdkEqual(a[i], b[i], path + '[' + i + ']'); if (r !== true) return r; }
    return true;
  }
  if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
    if (ka.join(',') !== kb.join(',')) return path + ' keys-mismatch';
    for (const k of ka) { const r = deepSdkEqual(a[k], b[k], path + '.' + k); if (r !== true) return r; }
    return true;
  }
  return a === b ? true : path + ' value-mismatch (' + a + ' vs ' + b + ')';
}
let sdkEqual = true, detail = '';
for (const id of Object.keys(fresh)) {
  const r = deepSdkEqual(revived[id], fresh[id], id);
  if (r !== true) { sdkEqual = false; detail = r; break; }
}
assert.equal(detail, '');
t('revived baseline equals fresh SDK read (Timestamp.isEqual, deep)', sdkEqual);

// 3. stable re-serialization (what the sync baseline compare needs): serialize(fresh) === original json
const json2 = JSON.stringify(buildBaseline(pub2, priv2));
t('re-serialization byte-identical (stable baseline)', json2 === json);

// 4. product without priv doc exports public fields only, no undefined keys
t('p2 exported with public fields', parsed.p2 && parsed.p2.sku === 'SKU2' && parsed.p2.supplierInStock === false);
t('p2 has no private-field keys', !('sourceRate' in parsed.p2) && !('productLink' in parsed.p2));
t('no undefined values in JSON', !json.includes('undefined'));

await env.cleanup();
console.log(`\nBASELINE ROUNDTRIP: ALL PASS (${pass})`);
process.exit(0);
