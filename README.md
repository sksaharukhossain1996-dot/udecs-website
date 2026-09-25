# UNICK DIGITAL E-Commerce Solutions

The customer storefront is built with React, TypeScript, Vite, Tailwind CSS, and Firebase. The custom domain is `udecs.store`.

## GitHub Pages deployment

Pushing to `main` runs `.github/workflows/deploy-pages.yml`, builds the Vite app, and deploys the `dist` directory to GitHub Pages. The workflow expects GitHub Pages to use **GitHub Actions** as its deployment source. `public/CNAME` configures the custom domain.

## Local development

Requirements: Node.js 24 or compatible.

```sh
npm ci
npm run dev
```

Create `.env.local` for server-only development secrets such as `GEMINI_API_KEY`. Never put server secrets in `VITE_*` variables or committed files.

## Static-hosting limits

GitHub Pages serves only the built frontend. Express endpoints in `server.ts` (AI chat, voice WebSocket, WhatsApp sending, and live domain diagnostics) require a separately deployed Node backend. Firebase Auth and Firestore must have `udecs.store` configured as an authorized domain, and Firestore security rules must remain enabled. Admin sign-in uses authorized Google accounts; no password is embedded in the storefront.
