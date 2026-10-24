import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Guard: the committed PUBLIC browse snapshot (served at /catalog-browse-snapshot.json)
// must never carry any of the 11 admin-only split fields (src/lib/productPrivacy.ts).
// Leak found 24 Oct 2026: supplierStatusCheckedAt residual on 172/1092 rows.
const PRIVATE_FIELDS = ['sourceRate','supplierSource','supplierStatusSource','supplierSKUConfidence','supplierSKUProvenance','supplierCheckedAt','supplierStatusCheckedAt','sourceCheckedAt','productLink','hsnBasis','hsnProvenance'];

test('public browse snapshot contains no private split fields', () => {
  const snap = JSON.parse(readFileSync(new URL('../public/catalog-browse-snapshot.json', import.meta.url), 'utf8'));
  assert.equal(snap.version, 1);
  assert.ok(Array.isArray(snap.products) && snap.products.length > 0, 'snapshot has products');
  for (const p of snap.products) {
    for (const f of PRIVATE_FIELDS) {
      assert.ok(!(f in p), `private field ${f} leaked on product ${p.id}`);
    }
    // Public selling/stock fields must survive any cleanup.
    assert.ok(typeof p.id === 'string' && p.id, 'product id present');
    assert.ok('price' in p, `price missing on ${p.id}`);
    assert.ok('stock' in p, `stock missing on ${p.id}`);
  }
});
