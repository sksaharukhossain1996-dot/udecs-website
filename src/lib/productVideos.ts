// Product video manifest: maps product IDs to short catalog videos served from /product-videos/.
// Videos are static site content; Firestore product records are never modified for videos.
export interface ProductVideoEntry {
  file: string;
  durationSec?: number;
}

const PRODUCT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const VIDEO_FILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}\.mp4$/;
export const MAX_PRODUCT_VIDEOS = 5000;
export const MAX_VIDEO_DURATION_SEC = 120;

export function parseProductVideoManifest(raw: unknown): Map<string, ProductVideoEntry> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Product video manifest must be an object.');
  const manifest = raw as { version?: unknown; videos?: unknown };
  if (manifest.version !== 1) throw new Error('Unsupported product video manifest version.');
  if (!manifest.videos || typeof manifest.videos !== 'object' || Array.isArray(manifest.videos)) throw new Error('Product video manifest videos must be an object.');
  const entries = Object.entries(manifest.videos as Record<string, unknown>);
  if (entries.length > MAX_PRODUCT_VIDEOS) throw new Error('Product video manifest is too large.');
  const map = new Map<string, ProductVideoEntry>();
  for (const [productId, value] of entries) {
    if (!PRODUCT_ID_PATTERN.test(productId)) throw new Error(`Invalid product ID in video manifest: ${productId}`);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid video entry for ${productId}.`);
    const entry = value as { file?: unknown; durationSec?: unknown };
    if (typeof entry.file !== 'string' || !VIDEO_FILE_PATTERN.test(entry.file)) throw new Error(`Invalid video file for ${productId}.`);
    if (entry.durationSec !== undefined && (typeof entry.durationSec !== 'number' || !Number.isFinite(entry.durationSec) || entry.durationSec <= 0 || entry.durationSec > MAX_VIDEO_DURATION_SEC)) throw new Error(`Invalid video duration for ${productId}.`);
    map.set(productId, { file: entry.file, durationSec: entry.durationSec as number | undefined });
  }
  return map;
}

export function productVideoUrl(entry: ProductVideoEntry): string {
  if (!VIDEO_FILE_PATTERN.test(entry.file)) throw new Error('Invalid video file.');
  return `/product-videos/${entry.file}`;
}

let cachedManifest: Promise<Map<string, ProductVideoEntry>> | null = null;

// Manifest absence or corruption must never break the storefront; videos simply stay hidden.
export function loadProductVideoManifest(): Promise<Map<string, ProductVideoEntry>> {
  if (!cachedManifest) {
    cachedManifest = fetch('/product-videos/manifest.json')
      .then((resp) => {
        if (!resp.ok) throw new Error('Product video manifest unavailable.');
        return resp.json();
      })
      .then(parseProductVideoManifest)
      .catch(() => new Map());
  }
  return cachedManifest;
}
