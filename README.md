# UNICK DIGITAL E-Commerce Solutions

The customer storefront is built with React, TypeScript, Vite, Tailwind CSS, and Firebase. The custom domain is `udecs.store`.

## GitHub Pages deployment

Pushing to `main` runs `.github/workflows/deploy-pages.yml`, builds the Vite app, and deploys the `dist` directory to GitHub Pages. The workflow expects GitHub Pages to use **GitHub Actions** as its deployment source. `public/CNAME` configures the custom domain.

To connect the deployed storefront to the Cloudflare Worker API, set the repository **Actions variable** `VITE_API_BASE_URL` to the Worker HTTPS origin (for example, `https://udecs-api.<your-subdomain>.workers.dev`, with no path), then run the Pages workflow or push a commit to rebuild the site. The workflow passes the variable into the Vite build when present; if unset, the storefront uses same-origin requests. This is a public API URL, not a secret.

## Cloudflare Workers API

`cloudflare-worker/index.ts` is the deployable backend entry point. It uses Workers Fetch, Web Crypto, WebSockets, and native `fetch`; `server.ts` remains for local Express/Vite development and is not used by Worker deployment. The existing Python `render.yaml`, `Dockerfile`, and FastAPI deployment are unchanged.

Install dependencies with `npm ci`, then deploy from the repository root with `npm run deploy:worker`. First-time Wrangler setup will require a Cloudflare login/account and may prompt for browser authorization; do not paste credentials into source files. The user must perform that authorization in a trusted terminal. Local emulation uses `npm run dev:worker` and `.dev.vars` (ignored by git).

In Cloudflare Dashboard, open **Workers & Pages**, create/open `udecs-api`, and set these Worker variables: `ALLOWED_ORIGINS` to the exact storefront browser origins (default `https://udecs.store,https://www.udecs.store`), `FIREBASE_PROJECT_ID=udecs-store`, `FIREBASE_WEB_API_KEY` (the public Firebase Web API key for this project), `WHATSAPP_API_VERSION` to a version supported by the Meta app, and `WHATSAPP_ADMIN_EMAILS` to a comma-separated allowlist of verified Firebase admin emails. Firebase API keys are public project identifiers, not admin credentials; the API still verifies ID tokens through Firebase Identity Toolkit.

Add these values via **Worker > Settings > Variables and Secrets > Add** as secrets, or `npx wrangler secret put SECRET_NAME` from an authorized terminal:

```text
GEMINI_API_KEY
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_APP_SECRET
WHATSAPP_VERIFY_TOKEN
```

For each send, the Worker calls Firebase Identity Toolkit to validate the signed ID token and verified account, then checks the email against the server-side `WHATSAPP_ADMIN_EMAILS` allowlist before calling Meta. Keep the Gemini key, Meta access token, app secret, and verify token in Worker Secrets; never use GitHub variables or `VITE_*` variables for these values.

To activate Meta WhatsApp, create/select a Meta Business app, add WhatsApp, complete WhatsApp Business Account onboarding, and register/verify the sender phone number. Copy its **Phone Number ID**, create a long-lived System User token with the messaging permissions Meta requires, and set the secrets above. In Meta Developers &gt; WhatsApp &gt; Configuration, set the callback URL shown in the admin WhatsApp setup panel (`https://<worker-name>.<your-subdomain>.workers.dev/api/whatsapp/webhook`), set the same random value as `WHATSAPP_VERIFY_TOKEN`, and subscribe the WhatsApp Business Account to the `messages` field.

The Worker supports Gemini text chat and a WebSocket bridge to Gemini Live, DNS/domain diagnostics, Meta text sends, and signature-verified webhook acknowledgment. Cloudflare Workers supports WebSocket upgrades and this bridge uses the Gemini BidiGenerateContent WebSocket protocol directly (no Node WebSocket package). Validate this against the selected Gemini Live model/API access in local Wrangler or a deployed preview. WhatsApp HTTP 202 means Meta accepted the request, not that it was delivered; free-form texts remain subject to Meta's customer-service window. Template sends, incoming AI replies, and delivery receipt processing are not implemented. If the Gemini Live model/API is unavailable for the account, voice returns a connection error; text chat and other Worker endpoints remain available.

After the Worker URL is assigned, set GitHub **Settings > Secrets and variables > Actions > Variables > New repository variable** `VITE_API_BASE_URL` to that HTTPS origin, then rerun the Pages workflow. Wait for both Worker deployment and Pages rebuild before testing the storefront.

## Local development

Requirements: Node.js 24 or compatible.

```sh
npm ci
npm run dev
```

For local Express development, copy `.env.example` to the ignored `.env` file and set server-only secrets there. Vite can read `VITE_API_BASE_URL` from `.env.local` when using a separately hosted API, but local same-origin development needs no API URL. Never put server secrets in `VITE_*` variables or committed files.

For Worker development, copy `.dev.vars.example` to the ignored `.dev.vars` file, populate the values needed for the routes you are testing, and start Wrangler with `npm run dev:worker`. Run focused tests with `npm test`, and type-check the Express and Worker targets with `npm run lint`.

## Static-hosting limits

GitHub Pages serves only the static built frontend; it does not run API endpoints. The separately deployed Cloudflare Worker provides AI chat, voice WebSocket, WhatsApp sending, and live domain diagnostics. Express endpoints in `server.ts` are for local development only. Firebase Auth and Firestore must have `udecs.store` configured as an authorized domain, and Firestore security rules must remain enabled. Admin sign-in uses authorized Google accounts; no password is embedded in the storefront.
