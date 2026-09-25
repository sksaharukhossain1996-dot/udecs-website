import express from 'express';
import http from 'http';
import https from 'https';
import dns from 'dns';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import dotenv from 'dotenv';
import {
  getWhatsAppMetaConfig,
  isValidWhatsAppWebhookPayload,
  normalizeWhatsAppRecipient,
  sendWhatsAppText,
  verifyWhatsAppWebhookSignature,
  verifyWhatsAppWebhookToken,
} from './whatsappMeta';
import { verifyFirebaseAdminIdToken } from './firebaseAdminAuth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || 'https://udecs.store,https://www.udecs.store')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

if (!isProd) {
  allowedOrigins.add('http://localhost:3000');
  allowedOrigins.add('http://127.0.0.1:3000');
}

const SYSTEM_INSTRUCTION = `You are the official Voice AI Assistant for UNICK DIGITAL E-COMMERCE SOLUTIONS (UDECS / udecs.store), owned by SK Saharuk Hossain.
Registered office: Pratappur, Panskura, Purba Medinipur, West Bengal 721152, India.
GSTIN: 19AODPH1519N1ZS.
Official contact: Phone +91 7319190514 / +91 9845485437, Email: ecommerceunickdigital@gmail.com.

Capabilities & Guidelines:
1. Product Expertise: Assist customers with kitchen & household goods (pressure cookers, non-stick cookware sets, 750W 2L blenders, airtight container sets, thermal casseroles), sports equipment (dumbbells, badminton rackets, yoga mats, footballs), and bulk wholesale pallets.
2. Tone & Languages: Professional, warm, courteous, and concise. Speak naturally in Bengali or Banglish if the user speaks Bengali, in Hindi if the user speaks Hindi, or in English.
3. Logistics & Billing: Provide guidance on pan-India delivery via Delhivery, Shiprocket, and Blue Dart, PayU payments, COD, and official GST tax invoices (GSTR-1/GSTR-3B compliant).
4. Directness: Keep spoken answers concise, conversational, and direct so speech flows naturally without lengthy monologues.`;

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // WebSocket Server for Gemini Live API
  const wss = new WebSocketServer({ server, path: '/live', maxPayload: 1024 * 1024 });

  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin && !allowedOrigins.has(origin)) {
      return res.status(403).json({ error: 'Origin is not allowed.' });
    }
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/api/whatsapp/webhook', (req, res) => {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!verifyToken) {
      return res.status(503).json({ error: 'Meta WhatsApp webhook credentials are not configured.' });
    }
    if (
      req.query['hub.mode'] === 'subscribe' &&
      verifyWhatsAppWebhookToken(req.query['hub.verify_token'], verifyToken) &&
      typeof req.query['hub.challenge'] === 'string'
    ) {
      return res.status(200).type('text/plain').send(req.query['hub.challenge']);
    }
    return res.sendStatus(403);
  });

  app.post(
    '/api/whatsapp/webhook',
    express.raw({ type: 'application/json', limit: '1mb' }),
    async (req, res) => {
      const config = getWhatsAppMetaConfig(process.env);
      if (!config) {
        return res.status(503).json({ error: 'Meta WhatsApp webhook credentials are not configured.' });
      }
      if (!Buffer.isBuffer(req.body)) {
        return res.status(400).json({ error: 'Expected an application/json webhook body.' });
      }
      try {
        if (!await verifyWhatsAppWebhookSignature(req.body, req.get('x-hub-signature-256'), config.appSecret)) {
          return res.status(401).json({ error: 'Invalid Meta webhook signature.' });
        }
      } catch (error: unknown) {
        console.error(
          '[WhatsApp Webhook] Signature verification failed:',
          error instanceof Error ? error.message : error
        );
        return res.status(500).json({ error: 'Webhook signature verification failed.' });
      }

      let payload: unknown;
      try {
        payload = JSON.parse(req.body.toString('utf8'));
      } catch {
        return res.status(400).json({ error: 'Webhook body must be valid JSON.' });
      }
      if (!isValidWhatsAppWebhookPayload(payload, config.phoneNumberId)) {
        return res.status(400).json({ error: 'Malformed WhatsApp webhook payload.' });
      }

      return res.sendStatus(200);
    }
  );

  app.use(express.json({ limit: '1mb' }));

  // Text AI Chat endpoint for fallback and widget
  app.post('/api/ai-chat', async (req, res) => {
    try {
      const { message, language = 'bn' } = req.body || {};
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(503).json({ error: 'Gemini is not configured on this service.' });
      }
      if (typeof message !== 'string' || message.trim().length === 0 || message.length > 4000) {
        return res.status(400).json({ error: 'Message must contain 1 to 4000 characters.' });
      }
      if (!['bn', 'en', 'hi'].includes(language)) {
        return res.status(400).json({ error: 'Language must be bn, en, or hi.' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash',
        contents: message.trim(),
        config: { systemInstruction: SYSTEM_INSTRUCTION },
      });
      if (!response.text) {
        return res.status(502).json({ error: 'Gemini returned an empty response.' });
      }
      res.json({ text: response.text });
    } catch (err: any) {
      console.error('Error in /api/ai-chat:', err?.message || err);
      res.status(502).json({ error: 'Gemini could not process the request.' });
    }
  });

  // Real-time DNS & Live Domain Diagnostic Endpoint for udecs.store
  app.get('/api/domain/live-status', async (_req, res) => {
    try {
      const startTime = Date.now();
      let aRecords: string[] = [];
      let nsRecords: string[] = [];
      let cnameRecords: string[] = [];
      let httpStatus = 0;
      let latencyMs = 0;
      let isReachable = false;
      let errorMessage = '';

      try {
        aRecords = await dns.promises.resolve4('udecs.store');
      } catch (err: any) {
        errorMessage = `A record lookup: ${err.message}`;
      }

      try {
        nsRecords = await dns.promises.resolveNs('udecs.store');
      } catch (err: any) {
        // NS record lookup
      }

      try {
        cnameRecords = await dns.promises.resolveCname('www.udecs.store');
      } catch (err: any) {
        // CNAME lookup
      }

      // Check live HTTPS connectivity
      await new Promise<void>((resolve) => {
        const req = https.get('https://udecs.store', { timeout: 4000 }, (resp) => {
          httpStatus = resp.statusCode || 0;
          latencyMs = Date.now() - startTime;
          isReachable = true;
          resp.resume();
          resolve();
        });
        req.on('timeout', () => {
          req.destroy();
          resolve();
        });
        req.on('error', (e) => {
          if (!errorMessage) errorMessage = `HTTPS: ${e.message}`;
          resolve();
        });
      });

      const registrar = nsRecords.some((ns) => ns.toLowerCase().includes('domaincontrol'))
        ? 'GoDaddy (domaincontrol.com)'
        : nsRecords.some((ns) => ns.toLowerCase().includes('cloudflare'))
        ? 'Cloudflare DNS'
        : nsRecords.length > 0
        ? nsRecords.join(', ')
        : 'Unknown';

      res.json({
        domain: 'udecs.store',
        isLive: isReachable && httpStatus >= 200 && httpStatus < 400,
        httpStatus,
        latencyMs,
        registrar,
        currentRouting: aRecords.some((ip) => ip.startsWith('185.199.'))
          ? 'GitHub Pages'
          : aRecords.includes('199.36.158.100')
          ? 'Firebase Hosting'
          : aRecords.length
          ? 'Other'
          : 'Unknown',
        nameservers: nsRecords,
        aRecords,
        cnameRecords,
        sslStatus: isReachable ? 'HTTPS reachable' : 'Unavailable',
        timestamp: new Date().toISOString(),
        errorMessage: errorMessage || null,
        dnsInstructions: {
          godaddyTarget: {
            title: 'Option A: Point GoDaddy to Google Cloud / Firebase Hosting (Recommended)',
            records: [
              { type: 'A', name: '@', value: '199.36.158.100', ttl: '600 seconds', purpose: 'Google Cloud Anycast CDN' },
              { type: 'CNAME', name: 'www', value: 'udecs-store.web.app', ttl: '1 Hour', purpose: 'Universal WWW Subdomain' },
              { type: 'TXT', name: '@', value: 'v=spf1 include:_spf.google.com ~all', ttl: '1 Hour', purpose: 'Google Workspace Mail Security' },
            ],
          },
          githubTarget: {
            title: 'Option B: Keep Existing GoDaddy DNS & Update GitHub Pages',
            records: [
              { type: 'A', name: '@', value: '185.199.108.153 / .109 / .110 / .111', ttl: '600', purpose: 'Active in GoDaddy' },
              { type: 'CNAME', name: 'www', value: 'sksaharukhossain1996-dot.github.io', ttl: '1 Hour', purpose: 'Active in GoDaddy' },
            ],
          },
        },
      });
    } catch (err: any) {
      console.error('Error in /api/domain/live-status:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  app.get('/api/whatsapp/status', (_req, res) => {
    const configured = Boolean(
      getWhatsAppMetaConfig(process.env) &&
      process.env.WHATSAPP_ADMIN_EMAILS?.split(',').some((email) => email.trim())
    );
    res.json({
      configured,
      active: configured,
      gateway: configured ? 'Meta WhatsApp Cloud API' : null,
      status: configured ? 'configured' : 'not_configured',
      message: configured
        ? 'Meta WhatsApp Cloud API and admin authorization are configured.'
        : 'Set Meta WhatsApp credentials and authorized admin emails on the server.',
    });
  });

  // WhatsApp Automation: Automated Message Send Endpoint
  app.post('/api/whatsapp/send', async (req, res) => {
    try {
      const authorization = req.get('authorization') || '';
      const bearer = /^Bearer ([^\s]+)$/.exec(authorization)?.[1];
      const adminEmails = new Set(
        (process.env.WHATSAPP_ADMIN_EMAILS || '')
          .split(',')
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      );
      if (!bearer) {
        return res.status(401).json({ error: 'Sign in with an authorized admin account to send WhatsApp messages.' });
      }
      if (adminEmails.size === 0) {
        return res.status(503).json({ error: 'WhatsApp admin authorization is not configured.' });
      }

      let adminEmail: string | null;
      try {
        adminEmail = await verifyFirebaseAdminIdToken(
          bearer,
          process.env.FIREBASE_PROJECT_ID || 'udecs-store',
          adminEmails
        );
      } catch (err: any) {
        console.error('[WhatsApp Automation] Firebase token verification failed:', err?.message || err);
        return res.status(503).json({ error: 'Admin authorization is temporarily unavailable.' });
      }
      if (!adminEmail) {
        return res.status(403).json({ error: 'This Firebase account is not an authorized WhatsApp admin.' });
      }

      const config = getWhatsAppMetaConfig(process.env);
      if (!config) {
        return res.status(503).json({
          error: 'Meta WhatsApp Cloud API is not configured; no message was sent.',
          code: 'WHATSAPP_NOT_CONFIGURED',
        });
      }
      const { to, message } = req.body || {};
      const cleanPhone = typeof to === 'string' ? normalizeWhatsAppRecipient(to) : '';

      if (!/^\d{8,15}$/.test(cleanPhone) || typeof message !== 'string' || !message.trim() || message.length > 4096) {
        return res.status(400).json({ error: 'Recipient must be an 8–15 digit international number and message must contain 1–4096 characters.' });
      }

      const { messageId } = await sendWhatsAppText(config, cleanPhone, message.trim());
      return res.status(202).json({
        success: true,
        messageId,
        status: 'accepted',
        details: `Meta accepted the message request from ${adminEmail}; final delivery status is not yet known.`,
      });
    } catch (err: any) {
      console.error('[WhatsApp Automation] Error sending message:', err?.message || err);
      res.status(502).json({ error: 'Meta WhatsApp Cloud API did not accept the message.' });
    }
  });

  // Handle WebSocket connections for Gemini Live API
  wss.on('connection', async (clientWs: WebSocket, request) => {
    const origin = request.headers.origin;
    if (origin && !allowedOrigins.has(origin)) {
      clientWs.close(1008, 'Origin is not allowed.');
      return;
    }
    console.log('[Live API] Client connected to /live WebSocket');
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          error: 'Gemini API key is required to establish real-time voice connection.',
        })
      );
      clientWs.close();
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let liveSession: any = null;
    let isConnected = false;

    try {
      liveSession = await ai.live.connect({
        model: process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            try {
              // Extract audio chunk if returned
              const parts = message.serverContent?.modelTurn?.parts;
              if (parts && parts.length > 0) {
                for (const part of parts) {
                  if (part.inlineData?.data) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'audio',
                        audio: part.inlineData.data,
                      })
                    );
                  }
                  if (part.text) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'text',
                        text: part.text,
                      })
                    );
                  }
                }
              }

              if (message.serverContent?.interrupted) {
                clientWs.send(JSON.stringify({ type: 'interrupted', interrupted: true }));
              }

              if (message.serverContent?.turnComplete) {
                clientWs.send(JSON.stringify({ type: 'turnComplete', turnComplete: true }));
              }
            } catch (sendErr) {
              console.error('[Live API] Error forwarding message to client:', sendErr);
            }
          },
          onclose: () => {
            console.log('[Live API] Gemini session closed');
            try {
              clientWs.send(JSON.stringify({ type: 'status', status: 'closed' }));
            } catch (e) {
              // Ignore
            }
          },
          onerror: (err: any) => {
            console.error('[Live API] Gemini session error:', err);
            try {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  error: err?.message || 'Gemini Live session encountered an error',
                })
              );
            } catch (e) {
              // Ignore
            }
          },
        },
      });

      isConnected = true;
      clientWs.send(
        JSON.stringify({
          type: 'ready',
          message: 'Connected to Gemini Live voice assistant',
        })
      );
    } catch (connErr: any) {
      console.error('[Live API] Failed to connect to Gemini Live API:', connErr);
      clientWs.send(
        JSON.stringify({
          type: 'error',
          error: connErr?.message || 'Failed to initialize Gemini Live voice session',
        })
      );
      clientWs.close();
      return;
    }

    clientWs.on('message', (rawData) => {
      if (!isConnected || !liveSession) return;
      try {
        const payload = JSON.parse(rawData.toString());

        // Realtime audio chunks from microphone (audio/pcm;rate=16000)
        if (payload.audio) {
          liveSession.sendRealtimeInput({
            audio: {
              data: payload.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        }

        // Text input sent during voice conversation
        if (payload.text) {
          liveSession.sendClientContent({
            turns: [
              {
                role: 'user',
                parts: [{ text: payload.text }],
              },
            ],
            turnComplete: true,
          });
        }

        // Voice switch or reconfigure
        if (payload.type === 'switch_voice' && payload.voice) {
          console.log(`[Live API] Client requested voice switch to ${payload.voice}`);
        }
      } catch (err) {
        console.error('[Live API] Error handling client message:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('[Live API] Client disconnected');
      isConnected = false;
      if (liveSession) {
        try {
          if (typeof liveSession.close === 'function') {
            liveSession.close();
          } else if (liveSession.conn && typeof liveSession.conn.close === 'function') {
            liveSession.conn.close();
          }
        } catch (e) {
          // Ignore
        }
      }
    });

    clientWs.on('error', (wsErr) => {
      console.error('[Live API] Client WebSocket error:', wsErr);
    });
  });

  // Mount Vite middlewares in development or static dist in production
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`UDECS Platform running on http://0.0.0.0:${PORT} [Full-Stack Express + Vite + Gemini Live WS]`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
