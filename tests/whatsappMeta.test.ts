import assert from 'node:assert/strict';
import { createHmac, generateKeyPairSync, sign } from 'node:crypto';
import test from 'node:test';
import { verifyFirebaseAdminIdToken } from '../firebaseAdminAuth';
import {
  getWhatsAppMetaConfig,
  isValidWhatsAppWebhookPayload,
  normalizeWhatsAppRecipient,
  sendWhatsAppText,
  verifyWhatsAppWebhookSignature,
  verifyWhatsAppWebhookToken,
} from '../whatsappMeta';

const config = {
  accessToken: 'test-access-token',
  phoneNumberId: '123456789',
  appSecret: 'test-app-secret',
  verifyToken: 'random-test-verify-token',
  apiVersion: 'v23.0',
};

test('Meta config remains unavailable until all credentials are present', () => {
  assert.equal(getWhatsAppMetaConfig({}), null);
  assert.equal(getWhatsAppMetaConfig({
    WHATSAPP_ACCESS_TOKEN: config.accessToken,
    WHATSAPP_PHONE_NUMBER_ID: config.phoneNumberId,
    WHATSAPP_APP_SECRET: config.appSecret,
    WHATSAPP_VERIFY_TOKEN: config.verifyToken,
  })?.apiVersion, 'v23.0');
});

test('webhook signature accepts the HMAC of the exact raw body only', () => {
  const body = Buffer.from('{"object":"whatsapp_business_account"}');
  const signature = `sha256=${createHmac('sha256', config.appSecret).update(body).digest('hex')}`;
  assert.equal(verifyWhatsAppWebhookSignature(body, signature, config.appSecret), true);
  assert.equal(verifyWhatsAppWebhookSignature(body, signature, 'wrong-secret'), false);
  assert.equal(verifyWhatsAppWebhookSignature(body, 'sha256=invalid', config.appSecret), false);
  assert.equal(verifyWhatsAppWebhookSignature(body, undefined, config.appSecret), false);
});

test('webhook verification token is matched without a normal string comparison', () => {
  assert.equal(verifyWhatsAppWebhookToken(config.verifyToken, config.verifyToken), true);
  assert.equal(verifyWhatsAppWebhookToken(`${config.verifyToken}x`, config.verifyToken), false);
  assert.equal(verifyWhatsAppWebhookToken(undefined, config.verifyToken), false);
});

test('webhook payload validation rejects malformed Meta callbacks', () => {
  assert.equal(isValidWhatsAppWebhookPayload({
    object: 'whatsapp_business_account',
    entry: [{
      id: 'account-id',
      changes: [{
        field: 'messages',
        value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '123' } },
      }],
    }],
  }), true);
  assert.equal(isValidWhatsAppWebhookPayload({ object: 'wrong', entry: [] }), false);
  assert.equal(isValidWhatsAppWebhookPayload({
    object: 'whatsapp_business_account',
    entry: [{ id: 'account-id', changes: [{ field: 'messages' }] }],
  }), false);
});

test('local Indian phone numbers are normalized to the international country code', () => {
  assert.equal(normalizeWhatsAppRecipient('98454 85437'), '919845485437');
  assert.equal(normalizeWhatsAppRecipient('09845485437'), '919845485437');
  assert.equal(normalizeWhatsAppRecipient('+1 (415) 555-0132'), '14155550132');
  assert.equal(normalizeWhatsAppRecipient('00442079460018'), '442079460018');
});

test('outbound text uses authenticated Graph API and returns Meta message ID', async () => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  const result = await sendWhatsAppText(config, '919845485437', 'Test message', async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.test' }] }), { status: 200 });
  });

  assert.equal(requestUrl, 'https://graph.facebook.com/v23.0/123456789/messages');
  assert.equal(new Headers(requestInit?.headers).get('authorization'), 'Bearer test-access-token');
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: '919845485437',
    type: 'text',
    text: { preview_url: false, body: 'Test message' },
  });
  assert.deepEqual(result, { messageId: 'wamid.test' });
});

test('outbound text never returns a success-shaped result for Graph API failures', async () => {
  await assert.rejects(
    sendWhatsAppText(config, '919845485437', 'Test message', async () =>
      new Response(JSON.stringify({ error: { message: 'Rejected' } }), { status: 400 })
    ),
    /Meta Graph API returned HTTP 400/
  );
  await assert.rejects(
    sendWhatsAppText(config, '919845485437', 'Test message', async () =>
      new Response(JSON.stringify({}), { status: 200 })
    ),
    /did not return a message ID/
  );
});

test('Firebase tokens must be signed, unexpired, verified, and in the admin allowlist', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'RS256', kid: 'test-key' });
  const now = Math.floor(Date.now() / 1000);
  const claims = encode({
    aud: 'udecs-store',
    iss: 'https://securetoken.google.com/udecs-store',
    sub: 'firebase-user-id',
    exp: now + 300,
    iat: now,
    email: 'admin@example.com',
    email_verified: true,
  });
  const signedData = `${header}.${claims}`;
  const token = `${signedData}.${sign('RSA-SHA256', Buffer.from(signedData), privateKey).toString('base64url')}`;
  const certFetch: typeof fetch = async () => new Response(JSON.stringify({
    'test-key': publicKey.export({ type: 'spki', format: 'pem' }),
  }), { headers: { 'Cache-Control': 'max-age=300' } });

  assert.equal(
    await verifyFirebaseAdminIdToken(token, 'udecs-store', new Set(['admin@example.com']), certFetch),
    'admin@example.com'
  );
  assert.equal(await verifyFirebaseAdminIdToken(token, 'wrong-project', new Set(['admin@example.com']), certFetch), null);
  assert.equal(await verifyFirebaseAdminIdToken(token, 'udecs-store', new Set(['other@example.com']), certFetch), null);
});
