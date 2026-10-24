// Integration proof: post-split statusOnly import through catalog-sync.html's REAL
// validator + compare + write + readback logic, with the owner-only exporter's output
// in the loop (as the worker's private source). Emulator-backed.
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDocFromServer, updateDoc, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const rules = readFileSync('/tmp/emutest/firestore.rules', 'utf8');
const env = await initializeTestEnvironment({ projectId: 'demo-udecs', firestore: { rules, host: '127.0.0.1', port: 8399 } });
const db = env.authenticatedContext('owner1', { email: 'ecommerceunickdigital@gmail.com', email_verified: true }).firestore();

// REAL page logic, verbatim-extracted
const html = readFileSync(new URL('../public/catalog-sync.html', import.meta.url), 'utf8');
const grab = (re) => html.match(re)[0];
const factory = new Function([
  grab(/var S = [^;]+;/), grab(/function d\(i\) \{[\s\S]*?\n\}/),
  grab(/var PRIV = \[[\s\S]*?\];/), grab(/function splitPriv\(o\) \{[\s\S]*?\n\}/), grab(/function stripPriv\(o\) \{[\s\S]*?\n\}/),
  grab(/function f\(i\) \{[\s\S]*?\n\}/), 'return { d, splitPriv, stripPriv, f };'
].join('\n'));
const { d, splitPriv, stripPriv, f } = factory();
// REAL exporter logic, verbatim-extracted
const exHtml = readFileSync(new URL('../public/products-private-export.html', import.meta.url), 'utf8');
const exBlock = exHtml.match(/\/\/ === EXPORTER LOGIC START[\s\S]*?\/\/ === EXPORTER LOGIC END ===/)[0];
const { buildBaseline } = new Function('Timestamp', exBlock + '\nreturn { buildBaseline };')(Timestamp);

let pass = 0; const t = (n, c) => { assert.ok(c, n); console.log('PASS', n); pass++; };
const ID = 'amazon-SKU77';
const NOW_ISO = new Date().toISOString();

// 1. seed post-split state: public scrubbed doc + private doc (mixed types: ISO strings
//    as the statusOnly writer leaves them + one REAL Timestamp to exercise exporter markers)
await setDoc(doc(db, 'products', ID), { name: 'Mixer', sku: 'SKU77', price: 999, stock: 12, category: 'kitchen', gstRate: 18, hsn: '8509', supplier: 'wukusy', supplierInStock: true, hasOnlineLink: true });
await setDoc(doc(db, 'productsPrivate', ID), {
  sourceRate: 550, supplierSource: 'https://wukusy.app/merchant/product-details/77',
  supplierStatusCheckedAt: '2026-10-24T00:20:00.000Z', supplierStatusSource: 'https://wukusy.app/merchant/product-details/77',
  supplierCheckedAt: Timestamp.fromMillis(Date.now() - 3600e3), productLink: 'https://www.amazon.in/dp/B77'
});

// 2. owner-only exporter produces the baseline JSON (worker consumes this; markers for real Timestamps)
const pub = {}, priv = {};
pub[ID] = (await getDocFromServer(doc(db, 'products', ID))).data();
priv[ID] = (await getDocFromServer(doc(db, 'productsPrivate', ID))).data();
const baselineJson = JSON.stringify(buildBaseline(pub, priv));
const baseline = JSON.parse(baselineJson);
t('exporter output carries private fields post-split', baseline[ID].sourceRate === 550 && typeof baseline[ID].supplierSource === 'string');
t('exporter marker for real Timestamp field', baseline[ID].supplierCheckedAt && typeof baseline[ID].supplierCheckedAt.seconds === 'number');
t('exporter keeps ISO-string status field as-is', baseline[ID].supplierStatusCheckedAt === '2026-10-24T00:20:00.000Z');

// 3. worker-style manifest: expected from live public SDK read (unchanged pipeline), statusOnly fields fresh ISO
const livePub = (await getDocFromServer(doc(db, 'products', ID))).data();
const manifest = { version: 1, records: [{ id: ID, mode: 'update', statusOnly: true, expected: livePub, fields: { supplierInStock: false, supplierStatusCheckedAt: NOW_ISO, supplierStatusSource: 'https://wukusy.app/merchant/product-details/77' } }] };

// 4. page's REAL validator accepts it (keys/types/sku/URL/freshness)
const validated = f(JSON.parse(JSON.stringify(manifest)));
t('page validator accepts statusOnly record', validated.records.length === 1);

// 5. page's REAL baseline compare does NOT false-flag (review + apply both use this)
const liveAgain = (await getDocFromServer(doc(db, 'products', ID))).data();
t('baseline compare clean (no false Live baseline changed)', d(stripPriv(liveAgain)) === d(stripPriv(manifest.records[0].expected)));

// 6. apply write exactly as the page does (splitPriv + public update + private merge)
const sp = splitPriv(manifest.records[0].fields);
await updateDoc(doc(db, 'products', ID), sp.q);
await setDoc(doc(db, 'productsPrivate', ID), sp.p, { merge: true });

// 7. page's REAL readback check passes
const c = (await getDocFromServer(doc(db, 'products', ID))).data();
const pv = (await getDocFromServer(doc(db, 'productsPrivate', ID))).data() || {};
const cm = { ...stripPriv(c), ...pv };
const readbackOk = Object.keys(manifest.records[0].fields).every((k) => d(cm[k]) === d(manifest.records[0].fields[k]));
t('readback matches written fields (incl. private status fields)', readbackOk);
t('public doc now supplierInStock=false', c.supplierInStock === false);
t('private doc has new ISO status, other private fields intact', pv.supplierStatusCheckedAt === NOW_ISO && pv.sourceRate === 550);
t('no private field leaked into public doc', !('sourceRate' in c) && !('supplierStatusCheckedAt' in c) && !('supplierSource' in c));

await env.cleanup();
console.log(`\nSTATUSONLY IMPORT E2E: ALL PASS (${pass})`);
process.exit(0);
