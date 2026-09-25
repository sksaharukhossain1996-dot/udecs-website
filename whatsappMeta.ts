export interface WhatsAppMetaConfig {
  accessToken: string;
  phoneNumberId: string;
  appSecret: string;
  verifyToken: string;
  apiVersion: string;
}

export interface WhatsAppMetaEnvironment {
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_APP_SECRET?: string;
  WHATSAPP_VERIFY_TOKEN?: string;
  WHATSAPP_API_VERSION?: string;
}

export function getWhatsAppMetaConfig(
  env: WhatsAppMetaEnvironment
): WhatsAppMetaConfig | null {
  const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN } = env;
  const apiVersion = env.WHATSAPP_API_VERSION || 'v23.0';
  if (
    !WHATSAPP_ACCESS_TOKEN?.trim() ||
    !WHATSAPP_PHONE_NUMBER_ID?.trim() ||
    !WHATSAPP_APP_SECRET?.trim() ||
    !WHATSAPP_VERIFY_TOKEN?.trim() ||
    !/^v\d+\.\d+$/.test(apiVersion)
  ) {
    return null;
  }

  return {
    accessToken: WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
    appSecret: WHATSAPP_APP_SECRET,
    verifyToken: WHATSAPP_VERIFY_TOKEN,
    apiVersion,
  };
}

export async function verifyWhatsAppWebhookSignature(
  rawBody: Uint8Array,
  signature: string | undefined,
  appSecret: string
) : Promise<boolean> {
  if (!signature || !/^sha256=[a-f\d]{64}$/i.test(signature)) return false;
  const suppliedHex = signature.slice('sha256='.length);
  const supplied = new Uint8Array(suppliedHex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const body = new Uint8Array(rawBody.byteLength);
  body.set(rawBody);
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, body.buffer));
  return constantTimeEqual(supplied, expected);
}

export function verifyWhatsAppWebhookToken(
  suppliedToken: unknown,
  expectedToken: string
): suppliedToken is string {
  if (typeof suppliedToken !== 'string') return false;
  return constantTimeEqual(new TextEncoder().encode(suppliedToken), new TextEncoder().encode(expectedToken));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export function isValidWhatsAppWebhookPayload(payload: unknown, expectedPhoneNumberId?: string): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const body = payload as { object?: unknown; entry?: unknown };
  if (body.object !== 'whatsapp_business_account' || !Array.isArray(body.entry) || body.entry.length === 0) {
    return false;
  }

  return body.entry.every((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const candidate = entry as { id?: unknown; changes?: unknown };
    return (
      typeof candidate.id === 'string' &&
      candidate.id.length > 0 &&
      Array.isArray(candidate.changes) &&
      candidate.changes.length > 0 &&
      candidate.changes.every((change) => {
        if (!change || typeof change !== 'object') return false;
        const item = change as { field?: unknown; value?: unknown };
        if (
          typeof item.field !== 'string' ||
          !item.value ||
          typeof item.value !== 'object' ||
          Array.isArray(item.value)
        ) {
          return false;
        }
        const value = item.value as { metadata?: unknown; messaging_product?: unknown };
        if (
          !value.metadata ||
          typeof value.metadata !== 'object' ||
          Array.isArray(value.metadata)
        ) {
          return false;
        }
        const metadata = value.metadata as { phone_number_id?: unknown };
        return (
          value.messaging_product === 'whatsapp' &&
          typeof metadata.phone_number_id === 'string' &&
          metadata.phone_number_id.length > 0 &&
          (!expectedPhoneNumberId || metadata.phone_number_id === expectedPhoneNumberId)
        );
      })
    );
  });
}

export function normalizeWhatsAppRecipient(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

export async function sendWhatsAppText(
  config: WhatsAppMetaConfig,
  to: string,
  message: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ messageId: string }> {
  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`;
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: message },
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Meta Graph API returned HTTP ${response.status}.`);
  }
  const data = await response.json() as { messages?: Array<{ id?: unknown }> };
  const messageId = data.messages?.[0]?.id;
  if (typeof messageId !== 'string' || !messageId) {
    throw new Error('Meta Graph API did not return a message ID.');
  }
  return { messageId };
}
