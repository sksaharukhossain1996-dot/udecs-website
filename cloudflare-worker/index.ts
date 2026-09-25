import {
  getWhatsAppMetaConfig,
  isValidWhatsAppWebhookPayload,
  normalizeWhatsAppRecipient,
  sendWhatsAppText,
  verifyWhatsAppWebhookSignature,
  verifyWhatsAppWebhookToken,
} from '../whatsappMeta';

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_CHAT_MODEL?: string;
  GEMINI_LIVE_MODEL?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_APP_SECRET?: string;
  WHATSAPP_VERIFY_TOKEN?: string;
  WHATSAPP_API_VERSION?: string;
  WHATSAPP_ADMIN_EMAILS?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_WEB_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
}

const SYSTEM_INSTRUCTION = `You are the official Voice AI Assistant for UNICK DIGITAL E-COMMERCE SOLUTIONS (UDECS / udecs.store), owned by SK Saharuk Hossain.
Registered office: Pratappur, Panskura, Purba Medinipur, West Bengal 721152, India.
GSTIN: 19AODPH1519N1ZS.
Official contact: Phone +91 7319190514 / +91 9845485437, Email: ecommerceunickdigital@gmail.com.

Capabilities & Guidelines:
1. Product Expertise: Assist customers with kitchen & household goods, sports equipment, and bulk wholesale pallets.
2. Tone & Languages: Professional, warm, courteous, and concise. Speak naturally in Bengali or Banglish if the user speaks Bengali, in Hindi if the user speaks Hindi, or in English.
3. Logistics & Billing: Provide guidance on pan-India delivery, payments, COD, and GST tax invoices.
4. Directness: Keep answers concise, conversational, and direct.`;

const encoder = new TextEncoder();

function allowedOrigins(env: Env): Set<string> {
  return new Set(
    (env.ALLOWED_ORIGINS || 'https://udecs.store,https://www.udecs.store')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
}

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  const resultHeaders = new Headers(headers);
  resultHeaders.set('Content-Type', 'application/json; charset=utf-8');
  resultHeaders.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers: resultHeaders });
}

function withCors(request: Request, response: Response, origin: string | null): Response {
  if (response.status === 101) return response;
  if (!origin) return response;
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '600');
  headers.append('Vary', 'Origin');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function readJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 1024 * 1024) throw new RangeError('Request body exceeds 1 MB.');
  const body = await request.text();
  if (encoder.encode(body).byteLength > 1024 * 1024) throw new RangeError('Request body exceeds 1 MB.');
  try {
    return JSON.parse(body);
  } catch {
    throw new SyntaxError('Request body must be valid JSON.');
  }
}

async function verifyFirebaseAdmin(
  request: Request,
  env: Env
): Promise<{ email: string } | Response> {
  const accessToken = /^Bearer ([^\s]+)$/.exec(request.headers.get('authorization') || '')?.[1];
  if (!accessToken) return json({ error: 'Sign in with an authorized admin account to send WhatsApp messages.' }, 401);
  const projectId = env.FIREBASE_PROJECT_ID || 'udecs-store';
  if (!firebaseTokenClaimsMatchProject(accessToken, projectId)) {
    return json({ error: 'Firebase rejected the admin identity token.' }, 401);
  }

  const webApiKey = env.FIREBASE_WEB_API_KEY;
  if (!webApiKey) return json({ error: 'Firebase admin token verification is not configured.' }, 503);
  const allowlist = new Set(
    (env.WHATSAPP_ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
  if (allowlist.size === 0) return json({ error: 'WhatsApp admin authorization is not configured.' }, 503);

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(webApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: accessToken }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!response.ok) return json({ error: 'Firebase rejected the admin identity token.' }, 401);
    const data = await response.json() as {
      users?: Array<{ email?: unknown; emailVerified?: unknown; localId?: unknown }>;
    };
    const user = data.users?.[0];
    if (
      typeof user?.email !== 'string' ||
      user.emailVerified !== true ||
      typeof user.localId !== 'string' ||
      user.localId !== getFirebaseTokenSubject(accessToken) ||
      !allowlist.has(user.email.toLowerCase())
    ) {
      return json({ error: 'This Firebase account is not an authorized verified WhatsApp admin.' }, 403);
    }
    return { email: user.email.toLowerCase() };
  } catch {
    return json({ error: 'Firebase admin authorization is temporarily unavailable.' }, 503);
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const segment = token.split('.')[1];
  if (!segment) return null;
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return claims && typeof claims === 'object' && !Array.isArray(claims)
      ? claims as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function getFirebaseTokenSubject(token: string): string | null {
  const subject = decodeJwtPayload(token)?.sub;
  return typeof subject === 'string' ? subject : null;
}

function firebaseTokenClaimsMatchProject(token: string, projectId: string): boolean {
  const claims = decodeJwtPayload(token);
  const now = Math.floor(Date.now() / 1000);
  return Boolean(
    claims &&
    claims.aud === projectId &&
    claims.iss === `https://securetoken.google.com/${projectId}` &&
    typeof claims.sub === 'string' &&
    claims.sub.length > 0 &&
    claims.sub.length <= 128 &&
    typeof claims.exp === 'number' &&
    claims.exp > now &&
    typeof claims.iat === 'number' &&
    claims.iat <= now + 30 &&
    claims.exp > claims.iat &&
    claims.exp - claims.iat <= 3600
  );
}

async function aiChat(request: Request, env: Env): Promise<Response> {
  if (!env.GEMINI_API_KEY) return json({ error: 'Gemini is not configured on this service.' }, 503);
  let body: unknown;
  try {
    body = await readJson(request);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid request.' }, 400);
  }
  const payload = body as { message?: unknown; language?: unknown } | null;
  const message = payload?.message;
  const language = payload?.language ?? 'bn';
  if (typeof message !== 'string' || !message.trim() || message.length > 4000) {
    return json({ error: 'Message must contain 1 to 4000 characters.' }, 400);
  }
  if (!['bn', 'en', 'hi'].includes(String(language))) {
    return json({ error: 'Language must be bn, en, or hi.' }, 400);
  }

  try {
    const model = env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: 'user', parts: [{ text: message.trim() }] }],
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!response.ok) {
      console.error('Gemini API returned HTTP', response.status);
      return json({ error: 'Gemini could not process the request.' }, 502);
    }
    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => typeof part.text === 'string' ? part.text : '')
      .join('');
    if (!text) return json({ error: 'Gemini returned an empty response.' }, 502);
    return json({ text });
  } catch {
    return json({ error: 'Gemini could not process the request.' }, 502);
  }
}

async function resolveDns(name: string, type: 'A' | 'NS' | 'CNAME'): Promise<string[]> {
  try {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(4000) }
    );
    if (!response.ok) return [];
    const data = await response.json() as { Answer?: Array<{ data?: unknown; type?: number }> };
    const expectedType = type === 'A' ? 1 : type === 'NS' ? 2 : 5;
    return (data.Answer || [])
      .filter((answer) => answer.type === expectedType && typeof answer.data === 'string')
      .map((answer) => answer.data as string);
  } catch {
    return [];
  }
}

async function domainStatus(): Promise<Response> {
  const startedAt = Date.now();
  const [aRecords, nameservers, cnameRecords, siteResponse] = await Promise.all([
    resolveDns('udecs.store', 'A'),
    resolveDns('udecs.store', 'NS'),
    resolveDns('www.udecs.store', 'CNAME'),
    fetch('https://udecs.store', { method: 'HEAD', signal: AbortSignal.timeout(5000) }).catch(() => null),
  ]);
  const live = !!siteResponse && siteResponse.status >= 200 && siteResponse.status < 400;
  const registrar = nameservers.some((ns) => ns.toLowerCase().includes('domaincontrol'))
    ? 'GoDaddy (domaincontrol.com)'
    : nameservers.some((ns) => ns.toLowerCase().includes('cloudflare'))
    ? 'Cloudflare DNS'
    : nameservers.join(', ') || 'Unknown';
  return json({
    domain: 'udecs.store',
    isLive: live,
    httpStatus: siteResponse?.status || 0,
    latencyMs: Date.now() - startedAt,
    registrar,
    currentRouting: aRecords.some((ip) => ip.startsWith('185.199.'))
      ? 'GitHub Pages'
      : aRecords.includes('199.36.158.100')
      ? 'Firebase Hosting'
      : aRecords.length
      ? 'Other'
      : 'Unknown',
    nameservers,
    aRecords,
    cnameRecords,
    sslStatus: live ? 'HTTPS reachable' : 'Unavailable',
    timestamp: new Date().toISOString(),
    errorMessage: live ? null : 'Storefront HTTPS check failed.',
  });
}

function liveSetupMessage(model: string): object {
  return {
    setup: {
      model: `models/${model}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
      },
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    },
  };
}

export function mapGeminiLiveServerMessage(message: {
  setupComplete?: unknown;
  serverContent?: {
    modelTurn?: { parts?: Array<{ text?: string; inlineData?: { data?: string } }> };
    interrupted?: boolean;
    turnComplete?: boolean;
  };
}): Array<Record<string, unknown>> {
  const outgoing: Array<Record<string, unknown>> = [];
  if (message.setupComplete) {
    outgoing.push({ type: 'ready', message: 'Connected to Gemini Live voice assistant' });
  }
  for (const part of message.serverContent?.modelTurn?.parts || []) {
    if (part.inlineData?.data) outgoing.push({ type: 'audio', audio: part.inlineData.data });
    if (part.text) outgoing.push({ type: 'text', text: part.text });
  }
  if (message.serverContent?.interrupted) outgoing.push({ type: 'interrupted', interrupted: true });
  if (message.serverContent?.turnComplete) outgoing.push({ type: 'turnComplete', turnComplete: true });
  return outgoing;
}

async function liveVoice(request: Request, env: Env): Promise<Response> {
  if (!env.GEMINI_API_KEY) return json({ error: 'Gemini is not configured on this service.' }, 503);
  if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
    return json({ error: 'WebSocket upgrade required.' }, 426, { Upgrade: 'websocket' });
  }
  const model = env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025';
  const upstreamUrl = new URL(
    'https://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'
  );
  upstreamUrl.searchParams.set('key', env.GEMINI_API_KEY);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, { headers: { Upgrade: 'websocket' } });
  } catch {
    return json({ error: 'Gemini Live WebSocket connection failed.' }, 502);
  }
  const upstream = upstreamResponse.webSocket;
  if (upstreamResponse.status !== 101 || !upstream) {
    return json({ error: 'Gemini Live rejected the WebSocket connection.' }, 502);
  }

  const pair = new WebSocketPair();
  const [client, socket] = Object.values(pair);
  socket.accept();
  upstream.accept({ allowHalfOpen: true });
  upstream.send(JSON.stringify(liveSetupMessage(model)));

  socket.addEventListener('message', (event) => {
    if (typeof event.data !== 'string' || event.data.length > 1024 * 1024) {
      socket.close(1009, 'Message is too large.');
      upstream.close(1009, 'Message is too large.');
      return;
    }
    try {
      const payload = JSON.parse(event.data) as { audio?: unknown; text?: unknown };
      if (typeof payload.audio === 'string' && payload.audio.length <= 900_000) {
        upstream.send(JSON.stringify({
          realtimeInput: { audio: { data: payload.audio, mimeType: 'audio/pcm;rate=16000' } },
        }));
      }
      if (typeof payload.text === 'string' && payload.text.length <= 4000) {
        upstream.send(JSON.stringify({
          clientContent: {
            turns: [{ role: 'user', parts: [{ text: payload.text }] }],
            turnComplete: true,
          },
        }));
      }
    } catch {
      socket.send(JSON.stringify({ type: 'error', error: 'Invalid voice message.' }));
    }
  });

  upstream.addEventListener('message', (event) => {
    if (typeof event.data !== 'string') return;
    try {
      const message = JSON.parse(event.data);
      for (const outgoing of mapGeminiLiveServerMessage(message)) {
        socket.send(JSON.stringify(outgoing));
      }
    } catch {
      socket.send(JSON.stringify({ type: 'error', error: 'Invalid response from Gemini Live.' }));
    }
  });
  socket.addEventListener('close', (event) => upstream.close(event.code, event.reason));
  upstream.addEventListener('close', (event) => socket.close(event.code, event.reason));
  socket.addEventListener('error', () => upstream.close(1011, 'Client WebSocket error.'));
  upstream.addEventListener('error', () => socket.close(1011, 'Gemini Live connection error.'));

  return new Response(null, { status: 101, webSocket: client });
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (request.method === 'GET' && pathname === '/health') return json({ status: 'ok' });

  if (request.method === 'GET' && pathname === '/api/whatsapp/status') {
    const configured = Boolean(
      getWhatsAppMetaConfig(env) &&
      env.FIREBASE_WEB_API_KEY &&
      env.WHATSAPP_ADMIN_EMAILS?.split(',').some((email) => email.trim())
    );
    return json({
      configured,
      active: configured,
      gateway: configured ? 'Meta WhatsApp Cloud API' : null,
      status: configured ? 'configured' : 'not_configured',
      message: configured
        ? 'Meta WhatsApp Cloud API and admin authorization are configured.'
        : 'Set Meta WhatsApp credentials, Firebase verification, and authorized admin emails.',
    });
  }

  if (request.method === 'GET' && pathname === '/api/whatsapp/webhook') {
    const verifyToken = env.WHATSAPP_VERIFY_TOKEN;
    if (!verifyToken) return json({ error: 'Meta WhatsApp webhook credentials are not configured.' }, 503);
    if (
      url.searchParams.get('hub.mode') === 'subscribe' &&
      verifyWhatsAppWebhookToken(url.searchParams.get('hub.verify_token'), verifyToken)
    ) {
      const challenge = url.searchParams.get('hub.challenge');
      if (challenge !== null) return new Response(challenge, { headers: { 'Content-Type': 'text/plain' } });
    }
    return new Response(null, { status: 403 });
  }

  if (request.method === 'POST' && pathname === '/api/whatsapp/webhook') {
    const config = getWhatsAppMetaConfig(env);
    if (!config) return json({ error: 'Meta WhatsApp webhook credentials are not configured.' }, 503);
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 1024 * 1024) return json({ error: 'Webhook body exceeds 1 MB.' }, 413);
    const rawBody = new Uint8Array(await request.arrayBuffer());
    if (rawBody.byteLength > 1024 * 1024) return json({ error: 'Webhook body exceeds 1 MB.' }, 413);
    try {
      const valid = await verifyWhatsAppWebhookSignature(
        rawBody,
        request.headers.get('x-hub-signature-256') || undefined,
        config.appSecret
      );
      if (!valid) return json({ error: 'Invalid Meta webhook signature.' }, 401);
    } catch {
      return json({ error: 'Webhook signature verification failed.' }, 500);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder().decode(rawBody));
    } catch {
      return json({ error: 'Webhook body must be valid JSON.' }, 400);
    }
    if (!isValidWhatsAppWebhookPayload(payload, config.phoneNumberId)) {
      return json({ error: 'Malformed WhatsApp webhook payload.' }, 400);
    }
    return new Response(null, { status: 200 });
  }

  if (request.method === 'POST' && pathname === '/api/ai-chat') return aiChat(request, env);
  if (request.method === 'GET' && pathname === '/api/domain/live-status') return domainStatus();
  if (request.method === 'GET' && pathname === '/live') return liveVoice(request, env);

  if (request.method === 'POST' && pathname === '/api/whatsapp/send') {
    const config = getWhatsAppMetaConfig(env);
    if (!config) {
      return json({
        error: 'Meta WhatsApp Cloud API is not configured; no message was sent.',
        code: 'WHATSAPP_NOT_CONFIGURED',
      }, 503);
    }
    const auth = await verifyFirebaseAdmin(request, env);
    if (auth instanceof Response) return auth;
    let body: unknown;
    try {
      body = await readJson(request);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Invalid request.' }, 400);
    }
    const payload = body as { to?: unknown; message?: unknown } | null;
    const to = typeof payload?.to === 'string' ? normalizeWhatsAppRecipient(payload.to) : '';
    const message = payload?.message;
    if (!/^\d{8,15}$/.test(to) || typeof message !== 'string' || !message.trim() || message.length > 4096) {
      return json({
        error: 'Recipient must be an 8–15 digit international number and message must contain 1–4096 characters.',
      }, 400);
    }
    try {
      const { messageId } = await sendWhatsAppText(config, to, message.trim());
      return json({
        success: true,
        messageId,
        status: 'accepted',
        details: `Meta accepted the message request from ${auth.email}; final delivery status is not yet known.`,
      }, 202);
    } catch (error) {
      console.error('Meta WhatsApp send failed:', error instanceof Error ? error.message : error);
      return json({ error: 'Meta WhatsApp Cloud API did not accept the message.' }, 502);
    }
  }

  return json({ error: 'Not found.' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin');
    if (origin && !allowedOrigins(env).has(origin)) return json({ error: 'Origin is not allowed.' }, 403);
    const pathname = new URL(request.url).pathname;
    if (!origin && ['/api/ai-chat', '/api/domain/live-status', '/live'].includes(pathname)) {
      return json({ error: 'Browser origin is required.' }, 403);
    }

    if (request.method === 'OPTIONS') {
      if (!origin) return new Response(null, { status: 204 });
      return withCors(request, new Response(null, { status: 204 }), origin);
    }

    try {
      const response = await route(request, env);
      return withCors(request, response, origin);
    } catch (error) {
      console.error('Worker request failed:', error instanceof Error ? error.message : error);
      return withCors(request, json({ error: 'Internal service error.' }, 500), origin);
    }
  },
};
