export const STAFF_SIGN_IN_URL = 'https://udecs.store/staff.html';

export function requiresExternalGoogleBrowser(userAgent: string, protocol: string, hostname: string): boolean {
  const localApp = protocol !== 'https:' || hostname === 'appassets.androidplatform.net';
  const embedded = /;\s*wv\b|\bWebView\b|WhatsApp|FBAN|FBAV|Instagram|Line\//i.test(userAgent)
    || (/iPhone|iPad|iPod/i.test(userAgent) && /AppleWebKit/i.test(userAgent) && !/Safari|CriOS|FxiOS|EdgiOS/i.test(userAgent));
  return localApp || embedded;
}

export function googleSignInHelp(error: unknown): string {
  const code = (error as {code?: string})?.code || '';
  if (code === 'auth/external-browser-required') return 'Google login ke liye is page ko Chrome ya apne normal browser mein kholo. WhatsApp ke menu mein Open in browser chuno. App password is not your Gmail password.';
  if (['auth/internal-error', 'auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/argument-error'].includes(code)) return 'Google sign-in could not start in this browser. Open this page in Chrome or your normal browser, allow the sign-in popup, then try again. If it still fails there, send a screenshot. Firestore access does not confirm Google sign-in.';
  if (code === 'auth/popup-closed-by-user') return 'Google sign-in was closed before it finished. Try again when ready.';
  if (code === 'auth/cancelled-popup-request') return 'A Google sign-in is already open. Finish that window before trying again.';
  if (code === 'auth/network-request-failed') return 'Google sign-in could not reach the network. Check your connection and try again in your normal browser.';
  if (code === 'auth/unauthorized-domain') return 'Google sign-in is not configured for this address. Open https://udecs.store/staff.html. If that address fails too, report it.';
  return (error as {message?: string})?.message || 'Google sign-in could not be confirmed. Please try again in your normal browser.';
}
