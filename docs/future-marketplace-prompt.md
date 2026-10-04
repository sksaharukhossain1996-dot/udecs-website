You are a senior full-stack architect and product engineer. Build a production-grade multi-vendor E-commerce marketplace (like Flipkart/Amazon) step by step.

## TECH STACK
- Frontend Web: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- Mobile: React Native (Expo)
- Backend: Node.js + NestJS (REST + Swagger docs)
- DB: PostgreSQL (Prisma ORM), Redis (cache, cart, sessions)
- Search: Elasticsearch/Meilisearch
- Storage: S3/Cloudinary, Queue: BullMQ
- Payments: Razorpay/Stripe, Auth: JWT + refresh tokens + OTP login
- Deploy: Docker, CI/CD, Nginx

## USER ROLES
1. Customer  2. Seller/Vendor  3. Admin  4. Delivery partner

## CUSTOMER FEATURES
- Signup/login (email, phone OTP, Google)
- Home page: banners, categories, deals of the day, recommendations
- Search with autocomplete, filters (price, brand, rating), sorting
- Product page: image gallery, variants (size/color), reviews, Q&A, stock status, pincode delivery check
- Cart, wishlist, coupons, address book
- Checkout: UPI/cards/netbanking/COD, order summary
- Order tracking, cancel/return/refund, invoice PDF
- Notifications (email, SMS, push)

## SELLER PANEL
- Onboarding + KYC/GST verification
- Product CRUD, bulk upload (CSV), inventory management
- Order management, shipping labels
- Earnings dashboard, payouts, commission reports

## ADMIN PANEL
- Approve sellers/products, manage categories & commissions
- Users, orders, disputes, refunds
- Coupons, banners, flash sales
- Analytics dashboard (sales, revenue, top products)

## DATABASE
Design full ERD first: users, sellers, products, variants, categories, cart, orders, order_items, payments, reviews, coupons, addresses, shipments, refunds, notifications. Include indexes and relations.

## NON-FUNCTIONAL
- Security: OWASP top 10, rate limiting, input validation, hashed passwords, RBAC
- Performance: caching, pagination, lazy loading, CDN
- SEO, responsive UI, accessibility
- Clean architecture, unit + integration tests, error handling, logging

## WORKING METHOD
1. First give: architecture diagram, folder structure, ERD, API list.
2. Then build module by module (Auth → Products → Cart → Orders → Payments → Seller → Admin).
3. After each module: full code, env variables, run instructions, tests.
4. Ask me before moving to the next module.
5. Never skip code with "etc." — write complete working code.

Start with Step 1 now.
