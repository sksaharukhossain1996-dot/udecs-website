// Privacy split: supplier cost/source/provenance fields live in admin-only
// productsPrivate, never in the public products doc. Buyer pricing fields
// (price, wholesalePrice, minWholesaleQty, stock, supplierInStock) always stay
// public - storefront checkout totals depend on them. Do not add them here.
export const PRODUCT_PRIVATE_FIELDS = ['sourceRate','supplierSource','supplierStatusSource','supplierSKUConfidence','supplierSKUProvenance','supplierCheckedAt','supplierStatusCheckedAt','sourceCheckedAt','productLink','hsnBasis','hsnProvenance'] as const;

export function splitProductFields(fields: Record<string, any>): { pub: Record<string, any>; priv: Record<string, any> } {
  const pub: Record<string, any> = {};
  const priv: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if ((PRODUCT_PRIVATE_FIELDS as readonly string[]).includes(k)) priv[k] = v; else pub[k] = v;
  }
  pub.hasOnlineLink = typeof fields.productLink === 'string' && fields.productLink.length > 0;
  return { pub, priv };
}
