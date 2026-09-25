import { createPublicKey, verify as verifySignature, X509Certificate } from 'crypto';

const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let cachedCerts: { certificates: Record<string, string>; expiresAt: number } | undefined;

interface FirebaseTokenClaims {
  aud?: unknown;
  iss?: unknown;
  sub?: unknown;
  exp?: unknown;
  iat?: unknown;
  email?: unknown;
  email_verified?: unknown;
}

function decodeJsonSegment(segment: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function getFirebaseCertificates(fetchImpl: typeof fetch): Promise<Record<string, string>> {
  if (cachedCerts && cachedCerts.expiresAt > Date.now()) return cachedCerts.certificates;

  const response = await fetchImpl(FIREBASE_CERTS_URL, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Firebase certificate endpoint returned HTTP ${response.status}.`);

  const certificates = await response.json() as Record<string, string>;
  const maxAge = response.headers.get('cache-control')?.match(/max-age=(\d+)/i)?.[1];
  cachedCerts = {
    certificates,
    expiresAt: Date.now() + (maxAge ? Number(maxAge) : 300) * 1000,
  };
  return certificates;
}

export async function verifyFirebaseAdminIdToken(
  token: string,
  projectId: string,
  allowedEmails: ReadonlySet<string>,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  const segments = token.split('.');
  if (segments.length !== 3 || segments.some((segment) => !segment)) return null;

  const header = decodeJsonSegment(segments[0]);
  const claims = decodeJsonSegment(segments[1]) as FirebaseTokenClaims | null;
  if (
    !header ||
    header.alg !== 'RS256' ||
    typeof header.kid !== 'string' ||
    !claims ||
    claims.aud !== projectId ||
    claims.iss !== `https://securetoken.google.com/${projectId}` ||
    typeof claims.sub !== 'string' ||
    claims.sub.length === 0 ||
    claims.sub.length > 128 ||
    typeof claims.email !== 'string' ||
    claims.email_verified !== true ||
    typeof claims.exp !== 'number' ||
    claims.exp <= Math.floor(Date.now() / 1000) ||
    typeof claims.iat !== 'number' ||
    claims.iat > Math.floor(Date.now() / 1000) + 30 ||
    claims.exp <= claims.iat ||
    claims.exp - claims.iat > 3600
  ) {
    return null;
  }

  const email = claims.email.toLowerCase();
  if (!allowedEmails.has(email)) return null;

  const certificates = await getFirebaseCertificates(fetchImpl);
  const certificate = certificates[header.kid];
  if (!certificate) return null;

  const signedData = Buffer.from(`${segments[0]}.${segments[1]}`);
  const signature = Buffer.from(segments[2], 'base64url');
  try {
    const publicKey = certificate.includes('BEGIN CERTIFICATE')
      ? new X509Certificate(certificate).publicKey
      : createPublicKey(certificate);
    return verifySignature('RSA-SHA256', signedData, publicKey, signature) ? email : null;
  } catch {
    return null;
  }
}
