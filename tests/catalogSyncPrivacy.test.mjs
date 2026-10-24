import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Extract the REAL splitPriv/stripPriv from the patched admin page and exercise them.
const html = readFileSync(new URL('../public/catalog-sync.html', import.meta.url), 'utf8');
const privDecl = html.match(/var PRIV = \[[\s\S]*?\];/)[0];
const splitFn = html.match(/function splitPriv\(o\) \{[\s\S]*?\n\}/)[0];
const stripFn = html.match(/function stripPriv\(o\) \{[\s\S]*?\n\}/)[0];
const dFn = html.match(/function d\(i\) \{[\s\S]*?\n\}/)[0];
const factory = new Function(`${privDecl}\n${splitFn}\n${stripFn}\n${dFn}\nreturn { splitPriv, stripPriv, d, PRIV };`);
const { splitPriv, stripPriv, d } = factory();

test('statusOnly manifest fields split: supplierInStock public, supplier status source/timestamps private', () => {
  const fields = { supplierInStock: false, supplierStatusCheckedAt: '2026-10-23T17:48:33Z', supplierStatusSource: 'https://wukusy.app/merchant/product-details/6916' };
  const { p, q } = splitPriv(fields);
  assert.deepEqual(Object.keys(p).sort(), ['supplierStatusCheckedAt', 'supplierStatusSource']);
  assert.deepEqual(q, { supplierInStock: false });
});

test('create fields split: cost/link/hsn provenance private, catalog fields public, hasOnlineLink set', () => {
  const fields = { name: 'X', sku: '1_x', hsn: '1234', category: 'kitchen', gstRate: 18, price: 100, wholesalePrice: 90, minWholesaleQty: 10, stock: 5, sourceRate: 40, supplierSource: 'https://wukusy.app/merchant/product-details/1', productLink: 'https://www.amazon.in/dp/B1', hsnBasis: 'invoice', hsnProvenance: 'invoice', minStockAlert: 5 };
  const { p, q } = splitPriv(fields);
  assert.equal(q.price, 100);
  assert.equal(q.wholesalePrice, 90);
  assert.equal(q.hasOnlineLink, true);
  assert.ok(!('sourceRate' in q) && !('productLink' in q) && !('hsnBasis' in q));
  assert.equal(p.sourceRate, 40);
});

test('baseline compare is insensitive to pre/post-migration docs', () => {
  const liveAfterMigration = { name: 'X', sku: '1_x', price: 100, hasOnlineLink: true };
  const oldBaselineWithSecrets = { name: 'X', sku: '1_x', price: 100, sourceRate: 40, productLink: 'https://www.amazon.in/dp/B1' };
  // stripPriv on both sides ignores sensitive keys - but hasOnlineLink addition must be tolerated by manifest baselines refreshed post-migration
  assert.equal(d(stripPriv(oldBaselineWithSecrets)), d({ name: 'X', sku: '1_x', price: 100 }));
  assert.notEqual(d(stripPriv(liveAfterMigration)), d(stripPriv(oldBaselineWithSecrets))); // hasOnlineLink differs -> baselines must be refreshed after migration (documented)
});
