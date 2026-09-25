# UNICK DIGITAL E-Commerce Solutions

The customer storefront is built with React, TypeScript, Vite, Tailwind CSS, and Firebase. The custom domain is `udecs.store`.

## GitHub Pages deployment

Pushing to `main` runs `.github/workflows/deploy-pages.yml`, builds the Vite app, and deploys the `dist` directory to GitHub Pages. The workflow expects GitHub Pages to use **GitHub Actions** as its deployment source. `public/CNAME` configures the custom domain.

To connect the deployed storefront to the Express API, set the repository **Actions variable** `VITE_API_BASE_URL` to the HTTPS origin of the Node Render service (for example, `https://your-service.onrender.com`, with no path), then run the Pages workflow or push a commit to rebuild the site. The workflow passes the variable into the Vite build when present; if unset, the storefront uses same-origin requests. This is a public API URL, not a secret.

## Node API deployment on Render

The Node/Express API has its own blueprint at `render.node.yaml`. Create a separate Render service from that blueprint; it builds with `npm ci && npm run build`, starts with `npm start`, and uses `/health` for health checks. The existing `render.yaml`, `Dockerfile`, and Python FastAPI deployment are intentionally unchanged.

Set `GEMINI_API_KEY` as a **private environment variable** in the Node Render service dashboard. Do not place it in GitHub variables, a `VITE_*` variable, the Pages build, or a committed file. The service also accepts `ALLOWED_ORIGINS` (comma-separated exact browser origins), `GEMINI_CHAT_MODEL`, and `GEMINI_LIVE_MODEL`; defaults allow the `udecs.store` origins and use Gemini 2.5 Flash models.

The Express service provides text chat, Gemini Live voice, domain diagnostics, and health checks. WhatsApp sends use Meta Graph API and require a verified Firebase admin whose email is in the server-side `WHATSAPP_ADMIN_EMAILS` allowlist. HTTP 202 means Meta accepted the API request, not that the recipient received it; final delivery receipts are not yet tracked. Webhook setup handshakes and callback signatures are verified with `WHATSAPP_VERIFY_TOKEN` and `WHATSAPP_APP_SECRET`; callbacks are validated and acknowledged but incoming AI replies and delivery tracking are not implemented. Missing credentials keep status `not_configured` and automated sending disabled. Direct `wa.me` links remain available.

To activate Meta WhatsApp:

1. In Meta for Developers, create/select a Business app, add the WhatsApp product, complete WhatsApp Business Account onboarding, and register/verify the sender phone number. Copy its **Phone Number ID** (not the visible number) and create a long-lived System User access token with the WhatsApp messaging permissions Meta requires.
2. In the Node Render service's private environment, set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and `WHATSAPP_APP_SECRET` (from Meta App Settings &gt; Basic). Generate a separate unpredictable verify token, set it as `WHATSAPP_VERIFY_TOKEN`, and enter that same value in Meta's webhook form. Keep all these values server-side; never use GitHub variables or `VITE_*` settings for them.
3. Set `WHATSAPP_ADMIN_EMAILS` to comma-separated Firebase-authenticated admin emails. They must be verified accounts and match the Firebase project (`FIREBASE_PROJECT_ID`, default `udecs-store`). Before sending, the API verifies the Firebase ID token signature against Google's rotating public certificates and checks this server-side email allowlist.
4. After `VITE_API_BASE_URL` points to Render, use the admin WhatsApp setup panel's callback URL (`https://<render-service>/api/whatsapp/webhook`). Add it in Meta Developers &gt; WhatsApp &gt; Configuration; subscribe the WhatsApp Business Account to the `messages` field and complete the verify handshake. `WHATSAPP_API_VERSION` defaults to `v23.0`; set it to a Graph API version currently supported by your Meta app if necessary.
5. Test with an opted-in recipient. Free-form text sends are subject to Meta's customer-service window and messaging policies; outside the allowed window, use approved templates (template sends are not implemented yet).

Even after credentials are configured, incoming events are only signature-checked and acknowledged; automatic WhatsApp AI responses and delivery receipt processing still require implementation.

## Local development

Requirements: Node.js 24 or compatible.

```sh
npm ci
npm run dev
```

For local Express development, copy `.env.example` to the ignored `.env` file and set server-only secrets there. Vite can read `VITE_API_BASE_URL` from `.env.local` when using a separately hosted API, but local same-origin development needs no API URL. Never put server secrets in `VITE_*` variables or committed files.

Run the focused backend verification tests with `npm test`.

## Static-hosting limits

GitHub Pages serves only the built frontend. Express endpoints in `server.ts` (AI chat, voice WebSocket, WhatsApp sending, and live domain diagnostics) require a separately deployed Node backend. Firebase Auth and Firestore must have `udecs.store` configured as an authorized domain, and Firestore security rules must remain enabled. Admin sign-in uses authorized Google accounts; no password is embedded in the storefront.
