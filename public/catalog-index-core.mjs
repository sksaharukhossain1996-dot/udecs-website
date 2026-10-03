// Search-only index. Shared by React and authenticated import/legacy admin pages.
export const CHUNK_COUNT = 16;
export const INDEX_COLLECTION = 'catalogSearchChunks';
export const INDEX_VERSION = 1;
export function chunkId(id) {
  let hash = 2166136261;
  for (const c of id) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
  return String(hash % CHUNK_COUNT).padStart(2, '0');
}
export function searchEntry(id, product) {
  if (!product || product.hidden === true || product.gatewayVerification === true) return null;
  return {id, name: String(product.name || ''), nameBn: String(product.nameBn || product.name || ''), sku: String(product.sku || ''), category: String(product.category || ''), hsn: String(product.hsn || ''), supplier: String(product.supplier || '')};
}
export function sameEntry(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
export function updatedChunk(before, id, product) {
  if (before?.version !== INDEX_VERSION || !Array.isArray(before.entries)) throw Error('Catalog search index not initialized. Publish rules and rebuild before editing products.');
  const entry = searchEntry(id, product);
  const entries = before.entries.filter(e => e.id !== id);
  if (entry) entries.push(entry);
  entries.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const next = {version: INDEX_VERSION, entries};
  if (new TextEncoder().encode(JSON.stringify(next)).length > 700000) throw Error('Catalog search chunk is full. Nothing changed; review index capacity.');
  return next;
}
export function matchesEntry(p, query = '', category = 'all', includeExtra = false) {
  const q = query.toLowerCase();
  return (category === 'rajkot' ? p.supplier === 'rajkot' : p.supplier !== 'rajkot' && (category === 'all' || p.category === category)) &&
    (p.name.toLowerCase().includes(q) || p.nameBn.includes(query) || p.sku.toLowerCase().includes(q) ||
      includeExtra && (p.category.toLowerCase().includes(q) || p.hsn.includes(query)));
}
// Call BEFORE queuing any transaction write; Firestore requires all reads first.
export async function prepareIndexMutation(tx, db, doc, id, before, after) {
  if (sameEntry(searchEntry(id, before), searchEntry(id, after))) return () => {};
  const ref = doc(db, INDEX_COLLECTION, chunkId(id));
  const snapshot = await tx.get(ref);
  const next = updatedChunk(snapshot.exists() ? snapshot.data() : null, id, after);
  return () => tx.set(ref, next);
}
