const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim();

function getApiBaseUrl(): URL | null {
  if (!configuredApiBase) return null;

  let baseUrl: URL;
  try {
    baseUrl = new URL(configuredApiBase);
  } catch {
    throw new Error('VITE_API_BASE_URL must be a valid absolute URL.');
  }

  const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(baseUrl.hostname);
  if (
    !['http:', 'https:'].includes(baseUrl.protocol) ||
    (import.meta.env.PROD && baseUrl.protocol !== 'https:' && !isLocalhost) ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash ||
    baseUrl.pathname !== '/'
  ) {
    throw new Error('VITE_API_BASE_URL must be an HTTPS service origin without credentials or a path.');
  }

  return baseUrl;
}

export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  return baseUrl ? new URL(path.replace(/^\/+/, ''), baseUrl).toString() : path;
}

export function getWebSocketUrl(path: string): string {
  const baseUrl = getApiBaseUrl() ?? new URL(window.location.origin);
  baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  return new URL(path.replace(/^\/+/, ''), baseUrl).toString();
}
