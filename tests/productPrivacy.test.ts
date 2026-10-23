import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT_PRIVATE_FIELDS, splitProductFields } from '../src/lib/productPrivacy';
import { wholesaleAvailability, quoteTotals } from '../src/lib/wholesale';

const sampleFields = {
  name: 'Juicer', sku: '0131_x', hsn: '85094010', category: 'kitchen', gstRate: 18,
  price: 515, wholesalePrice: 515, minWholesaleQty: 1, stock: 457,
  supplier: 'wukusy', supplierInStock: true, stockManaged: true,
  gstExtra: false, minimumOrderQty: 1, quantityStep: 1, shippingMode: '',
  rating: 5, reviewsCount: 1, imageIcon: 'i-box', imageUrl: 'https://x',
  description: '', featured: false, updatedAt: '2026-10-23',
  // sensitive:
  sourceRate: 300, supplierSource: 'https://wukusy.app/merchant/product-details/73',
  supplierStatusSource: 'https://wukusy.app/merchant/product-details/73',
  supplierCheckedAt: '2026-10-23T10:00:00Z', supplierStatusCheckedAt: '2026-10-23T10:00:00Z',
  sourceCheckedAt: '2026-10-23T10:00:00Z', productLink: 'https://www.amazon.in/dp/B0X',
  minStockAlert: 10, hsnBasis: 'invoice', hsnProvenance: 'invoice',
};

test('checkout pricing fields stay public', () => {
  const { pub } = splitProductFields(sampleFields);
  for (const k of ['price','wholesalePrice','minWholesaleQty','stock','supplierInStock','supplier','gstRate','gstExtra','minimumOrderQty','quantityStep','hsn','name','sku','category'])
    assert.ok(k in pub, `public doc must keep ${k}`);
  assert.equal(pub.price, 515);
  assert.equal(pub.wholesalePrice, 515);
  assert.equal(pub.minStockAlert, 10); // low-stock UI reads this publicly
});

test('sensitive fields never land in the public doc', () => {
  const { pub, priv } = splitProductFields(sampleFields);
  for (const k of PRODUCT_PRIVATE_FIELDS) {
    assert.ok(!(k in pub), `public doc must not carry ${k}`);
    if (k in sampleFields) assert.ok(k in priv, `private doc must carry ${k}`);
  }
  assert.equal(priv.sourceRate, 300);
  assert.equal(priv.supplierSource, 'https://wukusy.app/merchant/product-details/73');
});

test('hasOnlineLink boolean replaces the raw productLink', () => {
  const withLink = splitProductFields(sampleFields);
  assert.equal(withLink.pub.hasOnlineLink, true);
  assert.ok(!('productLink' in withLink.pub));
  const noLink = splitProductFields({ ...sampleFields, productLink: '' });
  assert.equal(noLink.pub.hasOnlineLink, false);
});

test('buyer totals unchanged after split (retail + wholesale)', () => {
  const { pub } = splitProductFields(sampleFields);
  // retail path fields
  assert.equal(wholesaleAvailability(pub), true);
  // wholesale totals from public fields only
  const totals = quoteTotals([{ price: pub.wholesalePrice, qty: 10, rate: pub.gstRate }]);
  assert.deepEqual(totals, { net: 5150, tax: 927, total: 6077 });
});

test('docs with no sensitive fields produce empty private payload', () => {
  const { priv, pub } = splitProductFields({ name: 'X', price: 100, productLink: undefined });
  assert.deepEqual(Object.keys(priv), []);
  assert.equal(pub.hasOnlineLink, false);
});
