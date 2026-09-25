# Security Specification & Threat Model — UDECS E-Commerce & Management Suite

## 1. Data Invariants

1. **Product Integrity**:
   - Products require valid SKU, HSN, price (> 0), category, and non-negative stock.
   - Products are publicly readable by customers.
   - Product writes, updates, and deletes are strictly restricted to authenticated store administrators.

2. **Order Lifecycle & Customer Privacy (PII Protection)**:
   - Order creation is permitted for verified checkouts with valid customer contact info and non-negative totals.
   - Once created, sensitive customer details (shipping address, phone, email) are restricted.
   - Order updates (status transition, tracking number, courier assignment) require administrative privileges.
   - Terminal order states (`delivered`, `cancelled`) cannot be altered by non-admins.

3. **Storefront Marketing & Copy CMS**:
   - `/siteContent/main` and `/company/info` are readable by anyone (storefront visitors).
   - Writes and updates require administrative authorization.

4. **B2B Wholesale Inquiries**:
   - Prospective wholesale clients can create quotation requests (`/inquiries/{inquiryId}`).
   - Once created, inquiry documents can only be listed and updated by store administrators.

5. **Audit Logs**:
   - Audit logs are append-only. No deletion or back-dated modification is permitted.

---

## 2. The "Dirty Dozen" Attack Payloads

1. **Payload 1 (Shadow Field Escalation)**: Attempting to insert `isAdmin: true` or `role: "admin"` directly inside an Order or Product document.
2. **Payload 2 (Negative Price Injection)**: Creating a product or order with `price: -500` or `totalAmount: -1000`.
3. **Payload 3 (Arbitrary String Buffer Bomb)**: Submitting a 500KB text payload into product `sku` or customer `phone`.
4. **Payload 4 (Ghost Customer Impersonation)**: Updating an existing order's `customerPhone` or `customerEmail` after creation.
5. **Payload 5 (Unauthenticated Product Price Defacement)**: Anonymous write updating a premium Cookware item price from `₹2499` to `₹1`.
6. **Payload 6 (Terminal Status Reversal)**: Moving an order from `cancelled` back to `shipped` without administrative authorization.
7. **Payload 7 (Path Traversal / Poisoned ID)**: Attempting document path injection using `../../admins` in product or inquiry ID.
8. **Payload 8 (PII Blanket Scraping)**: Attempting an unrestricted `list` query across all customer orders and wholesale inquiries as an unauthenticated visitor.
9. **Payload 9 (Wholesale Inquiry Hijack)**: Updating another company's wholesale quote request notes or pricing terms.
10. **Payload 10 (Company GSTIN Tampering)**: An unauthenticated actor attempting to overwrite the official GSTIN `19AODPH1519N1ZS` with a fraudulent number.
11. **Payload 11 (Audit Log Destruction)**: Deleting past security audit logs to cover unauthorized activities.
12. **Payload 12 (Negative Stock Poisoning)**: Updating product stock to `-9999` to cause denial of inventory.

---

## 3. Test Runner Expectations

All "Dirty Dozen" payloads must be systematically rejected with `PERMISSION_DENIED`.
Rules must enforce:
- Strict key allowlists (`hasAll`, `hasOnly`)
- String length caps (`.size() <= MAX`)
- Numerical boundaries (`price >= 0`, `stock >= 0`)
- Role validation via trusted admin check (`request.auth != null && (request.auth.token.email == 'ecommerceunickdigital@gmail.com' || exists(/databases/$(database)/documents/admins/$(request.auth.uid)))`)
