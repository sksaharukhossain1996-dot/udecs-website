// ../../tmp/udecs-wa-owner-test/owner-test.mjs
var OWNER_PAIRS = {
  "sksaharukhossain1996@gmail.com": "ZAN8rLkaeFNvIKz0WyAN2g2nHOJ2",
  "ecommerceunickdigital@gmail.com": "u2rhAyVJYCMcoWkGfabm2bmaQRv2"
};
var RECIPIENT = "917319190514";
var TEMPLATE = "udecs_order_received_v1";
function exactScope(scope) {
  if (!scope || Object.keys(scope).sort().join() !== "amount,customerName,orderId,paymentStatus,recipient,template,templateLanguage,testId") throw Error("Exact test fields required");
  if (scope.recipient !== RECIPIENT || scope.template !== TEMPLATE || scope.templateLanguage !== "en_US") throw Error("Outside owner English test scope");
  if (!/^owner-test-[a-zA-Z0-9-]{1,60}$/.test(scope.testId) || !/^UDECS-TEST-[a-zA-Z0-9-]{1,60}$/.test(scope.orderId)) throw Error("Synthetic reference required");
  if (typeof scope.customerName !== "string" || !scope.customerName.trim() || scope.customerName.length > 150 || !Number.isFinite(scope.amount) || scope.amount < 0 || Math.round(scope.amount * 100) !== scope.amount * 100 || !["pending", "paid"].includes(scope.paymentStatus)) throw Error("Invalid sample fields");
  return { testId: scope.testId, recipient: scope.recipient, template: scope.template, templateLanguage: scope.templateLanguage, customerName: scope.customerName, orderId: scope.orderId, amount: scope.amount, paymentStatus: scope.paymentStatus };
}
async function scopeHash(scope) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(exactScope(scope))))), (x) => x.toString(16).padStart(2, "0")).join("");
}
async function approvedControl({ scope, approvalRef, approvedHash, chargeCapInr, verifiedMaximumChargeInr, expiresAt, templateCheckedAt }, now = Date.now()) {
  const s = exactScope(scope);
  if (typeof approvalRef !== "string" || !approvalRef.startsWith("wamid.") || approvedHash !== await scopeHash(s)) throw Error("Exact owner approval missing");
  if (!Number.isFinite(chargeCapInr) || chargeCapInr < 0 || !Number.isFinite(verifiedMaximumChargeInr) || verifiedMaximumChargeInr < 0 || verifiedMaximumChargeInr > chargeCapInr) throw Error("Verified charge exceeds approval");
  if (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= now || !Number.isFinite(Date.parse(templateCheckedAt)) || Date.parse(templateCheckedAt) > now) throw Error("Expired or unverified test control");
  return { scope: s, approvalRef, approvedHash, chargeCapInr, verifiedMaximumChargeInr, expiresAt, templateCheckedAt, enabled: true };
}
function verifyOwner(principal2, origin) {
  if (origin !== "https://udecs.store" || principal2?.emailVerified !== true || !OWNER_PAIRS[principal2?.email] || principal2?.uid !== OWNER_PAIRS[principal2?.email]) throw Error("Verified owner required");
}
async function verifySenderGate(input, control, { customerMode = "off", testEnabled = false } = {}, now = Date.now()) {
  if (customerMode !== "off" || testEnabled !== true || control?.enabled !== true) throw Error("Customer mode must remain OFF and isolated test enabled");
  const c = await approvedControl(control, now), s = exactScope(input);
  if (await scopeHash(s) !== c.approvedHash) throw Error("Test scope changed");
  return s;
}
async function invokeOwnerTest({ principal: principal2, origin, scope, control, flags, db, sender, now = () => Date.now() }) {
  verifyOwner(principal2, origin);
  const s = await verifySenderGate(scope, control, flags, now());
  const snapshot = { scopeHash: await scopeHash(s), approvalRef: control.approvalRef, expiresAt: control.expiresAt };
  const claim = await db.claim(s.testId, snapshot);
  if (!claim.claimed) return { state: claim.state || "not_claimed" };
  try {
    const fresh = await db.recheck(s.testId, claim.lease);
    if (!fresh || fresh.suppressed) {
      await db.finish(s.testId, claim.lease, { state: "held", reason: "opted_out_or_control_missing" });
      return { state: "held" };
    }
    await verifySenderGate(s, fresh.control, flags, now());
    if (fresh.control.approvalRef !== snapshot.approvalRef || fresh.control.expiresAt !== snapshot.expiresAt) throw Error("Control changed");
  } catch {
    await db.finish(s.testId, claim.lease, { state: "held", reason: "gate_changed" });
    return { state: "held" };
  }
  let result;
  try {
    result = await sender(s);
  } catch {
    result = { accepted: false };
  }
  if (result?.accepted === true && typeof result.messageId === "string" && /^wamid\./.test(result.messageId)) {
    const saved = await db.finish(s.testId, claim.lease, { state: "submitted", messageId: result.messageId });
    return { state: saved ? "submitted" : "manual_review" };
  }
  await db.finish(s.testId, claim.lease, { state: "manual_review", reason: result?.definiteRejection ? "rejected" : "uncertain_submission" });
  return { state: "manual_review" };
}

// ../../tmp/udecs-wa-owner-test/route.mjs
function ownerTestRouter({ verify, loadCurrent, store, sender, prepare, readiness }) {
  return async function(request, env) {
    const origin = request.headers.get("Origin"), path = new URL(request.url).pathname;
    const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin", ...origin === "https://udecs.store" ? { "Access-Control-Allow-Origin": origin } : {} };
    const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });
    if (!["/api/whatsapp/owner-test", "/api/whatsapp/owner-test/status", "/api/whatsapp/owner-test/prepare", "/api/whatsapp/owner-test/readiness"].includes(path)) return null;
    if (origin !== "https://udecs.store") return reply(403, { error: "Origin not allowed" });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...headers, "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" } });
    try {
      const principal2 = await verify(request.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1], env);
      verifyOwner(principal2, origin);
      if (env.WHATSAPP_ORDER_MODE !== "off") return reply(503, { error: "Customer dispatch must remain OFF" });
      if (path.endsWith("/readiness") && request.method === "GET") return reply(200, await readiness(env));
      const current = await loadCurrent(env);
      if (!current) return reply(503, { error: "Owner test not prepared" });
      if (path.endsWith("/status") && request.method === "GET") return reply(200, { scope: current.scope, state: current.state, approvalRef: current.control.approvalRef });
      if (path.endsWith("/status") || request.method !== "POST") return reply(405, { error: "Method not allowed" });
      const text2 = await request.text();
      if (text2.length > 512) return reply(400, { error: "Invalid test request" });
      const body = JSON.parse(text2);
      if (Object.keys(body).sort().join() !== "scopeHash,testId" || body.testId !== current.scope.testId || body.scopeHash !== await scopeHash(current.scope)) return reply(400, { error: "Exact prepared fixture required" });
      if (path.endsWith("/prepare")) {
        if (env.WHATSAPP_OWNER_TEST_ENABLED !== "true") return reply(503, { error: "Owner test disabled" });
        return reply(200, await prepare(env, current.control));
      }
      const result = await invokeOwnerTest({ principal: principal2, origin, scope: current.scope, control: current.control, flags: { customerMode: env.WHATSAPP_ORDER_MODE, testEnabled: env.WHATSAPP_OWNER_TEST_ENABLED === "true" }, db: store(env), sender: (s) => sender(env, s) });
      return reply(200, result);
    } catch {
      return reply(403, { error: "Owner test unavailable or outside approved scope" });
    }
  };
}

// ../../tmp/udecs-wa-owner-test/receipt-helpers.mjs
var rank = { sent: 1, delivered: 2, read: 3 };
function reconcileReceipt(event, receipt) {
  if (!["submitted", "sent", "delivered", "read", "delivery_failed"].includes(event?.state) || event.messageId !== receipt.messageId || event.recipient !== receipt.recipient) return { apply: false, reason: "unmatched" };
  if (!Number.isSafeInteger(receipt.timestamp) || receipt.timestamp <= 0) return { apply: false, reason: "invalid" };
  const old = Number(event.lastReceiptTimestamp || 0);
  if (receipt.timestamp < old) return { apply: false, reason: "older" };
  const current = event.state === "submitted" ? 0 : rank[event.state] || 0;
  if (receipt.status === "failed") {
    if (current >= 2) return { apply: false, reason: "already_delivered" };
    if (event.state === "delivery_failed" && receipt.timestamp === old) return { apply: false, reason: "duplicate" };
    return { apply: true, update: { state: "delivery_failed", lastReceiptTimestamp: receipt.timestamp, automaticRetry: false } };
  }
  if (!rank[receipt.status] || rank[receipt.status] <= current) return { apply: false, reason: "duplicate_or_regression" };
  return { apply: true, update: { state: receipt.status, lastReceiptTimestamp: receipt.timestamp, automaticRetry: false } };
}
function validateReceipt(r) {
  if (!r || Object.keys(r).some((k) => !["messageId", "recipient", "status", "timestamp"].includes(k)) || !/^wamid\.[A-Za-z0-9_+=\/-]{1,250}$/.test(r.messageId || "") || !/^\d{8,15}$/.test(r.recipient || "") || !["sent", "delivered", "read", "failed"].includes(r.status) || !Number.isSafeInteger(r.timestamp) || r.timestamp <= 0) throw Error("Invalid receipt");
  return r;
}
async function receiptKey(id) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("udecs-whatsapp-receipt-v1:" + id))), (x) => x.toString(16).padStart(2, "0")).join("");
}

// ../../tmp/udecs-wa-owner-test/receipts.mjs
async function finishTestWithIndex(db, id, lease, update, now = () => (/* @__PURE__ */ new Date()).toISOString()) {
  if (!["held", "submitted", "manual_review"].includes(update.state)) throw Error("Invalid test state");
  return db.runTransaction(async (tx) => {
    const ref = db.collection("whatsappOwnerTests").doc(id), d = await tx.get(ref);
    if (!d.exists || d.data().state !== "submitting" || d.data().leaseToken !== lease) return false;
    let receiptUpdate = {};
    if (update.state === "submitted") {
      const key = await receiptKey(update.messageId), index = db.collection("whatsappOwnerTestMessageIndex").doc(key), receipt = db.collection("whatsappMessageReceipts").doc(key);
      const [ix, rc] = await tx.getAll(index, receipt);
      if (ix.exists && ix.data().testId !== id) throw Error("Test message index conflict");
      if (rc.exists) {
        const decision = reconcileReceipt({ ...d.data(), ...update }, rc.data());
        if (decision.apply) receiptUpdate = decision.update;
      }
      if (!ix.exists) tx.create(index, { testId: id, messageId: update.messageId });
    }
    tx.update(ref, { ...update, ...receiptUpdate, leaseToken: null, automaticRetry: false, updatedAt: now() });
    return true;
  });
}
async function reconcileIsolatedReceipt(db, receipt, now = () => (/* @__PURE__ */ new Date()).toISOString()) {
  validateReceipt(receipt);
  const key = await receiptKey(receipt.messageId);
  return db.runTransaction(async (tx) => {
    const ix = await tx.get(db.collection("whatsappOwnerTestMessageIndex").doc(key));
    if (!ix.exists) return { matched: false };
    const ref = db.collection("whatsappOwnerTests").doc(ix.data().testId), d = await tx.get(ref);
    if (!d.exists) return { matched: false };
    const decision = reconcileReceipt(d.data(), receipt);
    if (decision.apply) tx.update(ref, { ...decision.update, automaticRetry: false, updatedAt: now() });
    return { matched: decision.apply };
  });
}

// ../../tmp/udecs-wa-owner-test/store.mjs
function isolatedStore(db, { now = () => Date.now(), random = () => crypto.randomUUID(), recipientKey } = {}) {
  const fixture = (id) => db.collection("whatsappOwnerTests").doc(id);
  const control = db.collection("whatsappOwnerTestControl").doc("once");
  return {
    async claim(id, snapshot) {
      return db.runTransaction(async (tx) => {
        const ref = fixture(id), d = await tx.get(ref);
        if (!d.exists || d.data().state !== "pending" || d.data().attempts !== 0) return { claimed: false, state: d.exists ? d.data().state : "not_prepared" };
        if (d.data().scopeHash !== snapshot.scopeHash || d.data().approvalRef !== snapshot.approvalRef || d.data().expiresAt !== snapshot.expiresAt) return { claimed: false, state: "scope_mismatch" };
        const lease = random();
        tx.update(ref, { state: "submitting", attempts: 1, leaseToken: lease, submitStartedAt: new Date(now()).toISOString() });
        return { claimed: true, lease };
      });
    },
    async recheck(id, lease) {
      return db.runTransaction(async (tx) => {
        const d = await tx.get(fixture(id));
        if (!d.exists || d.data().leaseToken !== lease || d.data().state !== "submitting") return null;
        const [c, s] = await tx.getAll(control, db.collection("whatsappUpdateSuppressions").doc(await recipientKey(d.data().recipient)));
        return { control: c.exists ? c.data() : null, suppressed: s.exists && s.data().suppressed === true };
      });
    },
    async finish(id, lease, update) {
      return finishTestWithIndex(db, id, lease, update, () => new Date(now()).toISOString());
    }
  };
}

// ../../tmp/udecs-wa-owner-test/adapters.mjs
async function currentControl(env) {
  if (env.WHATSAPP_ORDER_MODE !== "off" || env.WHATSAPP_OWNER_TEST_ENABLED !== "true" || !env.WHATSAPP_OWNER_TEST_CONTROL) throw Error("Owner test disabled");
  const c = JSON.parse(env.WHATSAPP_OWNER_TEST_CONTROL);
  if (c.enabled !== true) throw Error("Owner test disabled");
  return approvedControl(c);
}
async function loadFixture(env, db) {
  const c = await currentControl(env), id = c.scope.testId;
  return db.runTransaction(async (tx) => {
    const d = await tx.get(db.collection("whatsappOwnerTests").doc(id));
    return { scope: c.scope, control: c, state: d.exists ? d.data().state : "not_prepared" };
  });
}

// ../../tmp/udecs-wa-owner-test/setup.mjs
async function prepareFixture(db, control, now = () => Date.now()) {
  const c = await approvedControl(control, now());
  if (control.enabled !== true) throw Error("Disabled test");
  const id = c.scope.testId, hash = await scopeHash(c.scope);
  return db.runTransaction(async (tx) => {
    const ref = db.collection("whatsappOwnerTests").doc(id), ctrl = db.collection("whatsappOwnerTestControl").doc("once"), [old, prior] = await tx.getAll(ref, ctrl);
    if (old.exists) {
      const d = old.data();
      if (d.scopeHash !== hash || d.approvalRef !== c.approvalRef || d.expiresAt !== c.expiresAt) throw Error("Fixture exists with different scope");
      return { prepared: true, state: d.state, duplicate: true };
    }
    if (prior.exists && prior.data().scope?.testId !== id) throw Error("Another test control exists");
    tx.create(ref, { scope: c.scope, scopeHash: hash, recipient: c.scope.recipient, approvalRef: c.approvalRef, expiresAt: c.expiresAt, state: "pending", attempts: 0, automaticRetry: false, synthetic: true, createdAt: new Date(now()).toISOString() });
    if (prior.exists) tx.update(ctrl, { ...c, enabled: true });
    else tx.create(ctrl, { ...c, enabled: true });
    return { prepared: true, state: "pending" };
  });
}

// ../../tmp/udecs-wa-owner-test/orders-integrated.mjs
import { WorkerEntrypoint } from "cloudflare:workers";
var CONSENT_VERSION = "udecs-order-whatsapp-v1";
var CONSENT_TEXT = "I agree to receive WhatsApp order, shipping and delivery updates from UDECS at this number. I can opt out by replying STOP. Optional; I can order without selecting this.";
function canonicalRecipient(phone) {
  if (typeof phone !== "string" || !/^\+?[0-9 ()-]{7,30}$/.test(phone)) throw Error("Invalid WhatsApp number");
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && !phone.startsWith("+")) {
    if (!/^[6-9]/.test(digits)) throw Error("Use a valid Indian mobile number");
    return "91" + digits;
  }
  if (!phone.startsWith("+") || !/^[1-9]\d{7,14}$/.test(digits)) throw Error("Use +country code for an international WhatsApp number");
  return digits;
}
function normalizePreferences(input) {
  const hasConsent = input.whatsappConsent !== void 0, hasLanguage = input.whatsappLanguage !== void 0;
  if (!hasConsent && !hasLanguage) return {};
  if (input.whatsappLanguage !== "en") throw Error("WhatsApp order updates are available only in English");
  const c = input.whatsappConsent;
  if (!c || typeof c !== "object" || Array.isArray(c) || Object.keys(c).some((k) => !["accepted", "version"].includes(k)) || typeof c.accepted !== "boolean" || c.version !== CONSENT_VERSION) throw Error("Review the current WhatsApp consent");
  return { whatsappLanguage: input.whatsappLanguage, whatsappConsent: { accepted: c.accepted, version: CONSENT_VERSION, text: CONSENT_TEXT, ...c.accepted ? { recipient: canonicalRecipient(input.customerPhone) } : {} } };
}
function receivedEvent(id, order) {
  if (order.gatewayVerification || order.nonDelivery || order.taxReportingExcluded || order.whatsappConsent?.accepted !== true) return null;
  if (order.whatsappLanguage !== "en" || order.whatsappConsent.version !== CONSENT_VERSION || order.whatsappConsent.recipient !== canonicalRecipient(order.customerPhone)) throw Error("Order WhatsApp preferences invalid");
  return { eventId: "received_" + id, orderId: id, kind: "received", state: "pending", createdAt: order.createdAt, language: order.whatsappLanguage, recipient: order.whatsappConsent.recipient, attempts: 0 };
}
var rank2 = { sent: 1, delivered: 2, read: 3 };
function reconcileReceipt2(event, receipt) {
  if (!["submitted", "sent", "delivered", "read", "delivery_failed"].includes(event?.state) || event.messageId !== receipt.messageId || event.recipient !== receipt.recipient) return { apply: false, reason: "unmatched" };
  if (!Number.isSafeInteger(receipt.timestamp) || receipt.timestamp <= 0) return { apply: false, reason: "invalid" };
  const old = Number(event.lastReceiptTimestamp || 0);
  if (receipt.timestamp < old) return { apply: false, reason: "older" };
  const current = event.state === "submitted" ? 0 : rank2[event.state] || 0;
  if (receipt.status === "failed") {
    if (current >= 2) return { apply: false, reason: "already_delivered" };
    if (event.state === "delivery_failed" && receipt.timestamp === old) return { apply: false, reason: "duplicate" };
    return { apply: true, update: { state: "delivery_failed", lastReceiptTimestamp: receipt.timestamp, automaticRetry: false } };
  }
  if (!rank2[receipt.status] || rank2[receipt.status] <= current) return { apply: false, reason: "duplicate_or_regression" };
  return { apply: true, update: { state: receipt.status, lastReceiptTimestamp: receipt.timestamp, automaticRetry: false } };
}
function validateReceipt2(r) {
  if (!r || Object.keys(r).some((k) => !["messageId", "recipient", "status", "timestamp"].includes(k)) || !/^wamid\.[A-Za-z0-9_+=\/-]{1,250}$/.test(r.messageId || "") || !/^\d{8,15}$/.test(r.recipient || "") || !["sent", "delivered", "read", "failed"].includes(r.status) || !Number.isSafeInteger(r.timestamp) || r.timestamp <= 0) throw Error("Invalid receipt");
  return r;
}
async function receiptKey2(id) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("udecs-whatsapp-receipt-v1:" + id))), (x) => x.toString(16).padStart(2, "0")).join("");
}
async function persistReceipt(db, receipt, now = () => (/* @__PURE__ */ new Date()).toISOString()) {
  validateReceipt2(receipt);
  const key = await receiptKey2(receipt.messageId), ref = db.collection("whatsappMessageReceipts").doc(key), index = db.collection("whatsappMessageIndex").doc(key);
  return db.runTransaction(async (tx) => {
    const [prior, ix] = await tx.getAll(ref, index);
    const previous = prior.exists ? prior.data() : null;
    if (previous && previous.recipient !== receipt.recipient) throw Error("Receipt recipient conflict");
    let chosen = receipt;
    if (previous) {
      const update = reconcileReceipt2({ state: previous.status === "failed" ? "delivery_failed" : previous.status, messageId: previous.messageId, recipient: previous.recipient, lastReceiptTimestamp: previous.timestamp }, receipt);
      if (!update.apply) return { persisted: true, duplicate: true };
    }
    const eventRef = ix.exists ? db.collection("whatsappOrderOutbox").doc(ix.data().eventId) : null;
    const eventDoc = eventRef ? await tx.get(eventRef) : null;
    if (previous) tx.update(ref, { ...chosen, recordedAt: now() });
    else tx.create(ref, { ...chosen, recordedAt: now() });
    const decision = eventDoc?.exists ? reconcileReceipt2(eventDoc.data(), chosen) : { apply: false };
    if (decision.apply) tx.update(eventRef, { ...decision.update, updatedAt: now() });
    return { persisted: true, matched: !!decision.apply };
  });
}
var PHONE_ID = "1393523580503157";
function eligibility(event, order, control, suppressed) {
  if (!control || control.mode !== "owner-test" && control.mode !== "live") return "paused";
  if (control.phoneNumberId !== PHONE_ID || !control.postReviewRef) return "unapproved_control";
  if (!event || event.kind !== "received" || event.orderId !== order.id || event.eventId !== "received_" + order.id) return "invalid_event";
  if (order.gatewayVerification || order.nonDelivery || order.taxReportingExcluded || order.orderStatus === "cancelled") return "excluded";
  if (order.whatsappConsent?.accepted !== true || order.whatsappConsent.version !== CONSENT_VERSION) return "no_consent";
  if (suppressed) return "opted_out";
  let phone;
  try {
    phone = canonicalRecipient(order.customerPhone);
  } catch {
    return "invalid_recipient";
  }
  if (phone !== event.recipient || phone !== order.whatsappConsent.recipient) return "recipient_changed";
  if (order.whatsappLanguage !== event.language || event.language !== "en") return "language_changed";
  if (control.mode === "owner-test" && (phone !== control.testRecipient || event.eventId !== control.testEventId)) return "outside_test_scope";
  if (control.mode === "live" && (!control.postTestApprovalRef || !Number.isFinite(Date.parse(control.enabledAt)) || !Number.isFinite(Date.parse(event.createdAt)) || Date.parse(event.createdAt) < Date.parse(control.enabledAt))) return "not_live_authorized";
  const approved = control.templates?.[event.language]?.received;
  if (!approved || approved.status !== "APPROVED" || approved.name !== (event.language === "en" ? "udecs_order_received_v1" : "udecs_order_received_hi_v1") || !approved.languageCode || !approved.checkedAt) return "template_unverified";
  return null;
}
async function dispatchOne(id, { store, sender }) {
  const claimed = await store.claim(id);
  if (!claimed) return { state: "not_claimed" };
  const { event, order, control, suppressed, lease } = claimed;
  const blocked = eligibility(event, order, control, suppressed);
  if (blocked) {
    await store.finish(id, lease, { state: "held", reason: blocked });
    return { state: "held", reason: blocked };
  }
  const gate = await store.recheck(id, lease);
  if (!gate || eligibility(gate.event, gate.order, gate.control, gate.suppressed)) {
    await store.finish(id, lease, { state: "held", reason: "gate_changed" });
    return { state: "held", reason: "gate_changed" };
  }
  if (!await store.markSubmitting(id, lease, gate)) return { state: "not_claimed" };
  try {
    const r = await sender({ phoneNumberId: PHONE_ID, to: gate.event.recipient, template: gate.control.templates[gate.event.language].received, order: gate.order });
    if (r?.accepted === true && typeof r.messageId === "string" && /^wamid\./.test(r.messageId)) {
      const recorded = await store.finish(id, lease, { state: "submitted", messageId: r.messageId });
      return { state: recorded ? "submitted" : "manual_review" };
    }
    await store.finish(id, lease, { state: "manual_review", reason: r?.definiteRejection ? "rejected" : "uncertain_submission" });
    return { state: "manual_review" };
  } catch {
    await store.finish(id, lease, { state: "manual_review", reason: "uncertain_submission" });
    return { state: "manual_review" };
  }
}
var END_TIME = "9999-12-31T00:00:00.000Z";
function eventLedger(db, { now = () => Date.now(), random = () => crypto.randomUUID(), recipientKey } = {}) {
  const eventRef = (id) => db.collection("whatsappOrderOutbox").doc(id);
  return {
    async claim(id) {
      if (!/^received_UDECS-ORD-[a-zA-Z0-9-]{1,80}$/.test(id)) throw Error("Invalid event reference");
      return db.runTransaction(async (tx) => {
        const ref = eventRef(id), d = await tx.get(ref);
        if (!d.exists) return null;
        const e = d.data();
        if (["submitting", "submitted", "manual_review"].includes(e.state)) return null;
        if (e.state !== "pending" || e.attempts > 0) return null;
        if (e.leaseUntil && Date.parse(e.leaseUntil) > now()) return null;
        const [od, cd, sd] = await tx.getAll(db.collection("orders").doc(e.orderId), db.collection("whatsappOrderControl").doc("sender"), db.collection("whatsappUpdateSuppressions").doc(await recipientKey(e.recipient)));
        if (!od.exists) return null;
        const order = { id: od.id, ...od.data() }, control = cd.exists ? cd.data() : null, suppressed = sd.exists && sd.data().suppressed === true;
        const block = eligibility(e, order, control, suppressed);
        if (block) {
          tx.update(ref, { state: "held", reason: block, updatedAt: new Date(now()).toISOString() });
          return null;
        }
        const lease = random();
        tx.update(ref, { leaseToken: lease, leaseUntil: new Date(now() + 6e4).toISOString(), updatedAt: new Date(now()).toISOString() });
        return { event: e, order, control, suppressed, lease };
      });
    },
    async recheck(id, lease) {
      return db.runTransaction(async (tx) => {
        const d = await tx.get(eventRef(id));
        if (!d.exists) return null;
        const e = d.data();
        if (e.leaseToken !== lease || e.state !== "pending" || Date.parse(e.leaseUntil) <= now()) return null;
        const [o, c, s] = await tx.getAll(db.collection("orders").doc(e.orderId), db.collection("whatsappOrderControl").doc("sender"), db.collection("whatsappUpdateSuppressions").doc(await recipientKey(e.recipient)));
        if (!o.exists) return null;
        return { event: e, order: { id: o.id, ...o.data() }, control: c.exists ? c.data() : null, suppressed: s.exists && s.data().suppressed === true };
      });
    },
    async markSubmitting(id, lease, expected) {
      return db.runTransaction(async (tx) => {
        const ref = eventRef(id), d = await tx.get(ref);
        if (!d.exists) return false;
        const e = d.data();
        if (e.leaseToken !== lease || e.state !== "pending" || Date.parse(e.leaseUntil) <= now()) return false;
        const [o, c, s] = await tx.getAll(db.collection("orders").doc(e.orderId), db.collection("whatsappOrderControl").doc("sender"), db.collection("whatsappUpdateSuppressions").doc(await recipientKey(e.recipient)));
        if (!o.exists || eligibility(e, { id: o.id, ...o.data() }, c.exists ? c.data() : null, s.exists && s.data().suppressed === true)) return false;
        const current = { event: e, order: { id: o.id, ...o.data() }, control: c.exists ? c.data() : null };
        if (expected && JSON.stringify(sendSnapshot(current)) !== JSON.stringify(sendSnapshot(expected))) return false;
        tx.update(ref, { state: "submitting", attempts: 1, submitStartedAt: new Date(now()).toISOString() });
        return true;
      });
    },
    async finish(id, lease, update) {
      if (!["held", "submitted", "manual_review"].includes(update.state)) throw Error("Invalid event state");
      return db.runTransaction(async (tx) => {
        const ref = eventRef(id), d = await tx.get(ref);
        if (!d.exists || d.data().leaseToken !== lease) return false;
        let receiptUpdate = {};
        if (update.state === "submitted") {
          const key = await receiptKey2(update.messageId), index = db.collection("whatsappMessageIndex").doc(key), receipt = db.collection("whatsappMessageReceipts").doc(key);
          const [ix, rc] = await tx.getAll(index, receipt);
          if (ix.exists && ix.data().eventId !== id) throw Error("Message index conflict");
          if (rc.exists) {
            const decision = reconcileReceipt2({ ...d.data(), ...update }, rc.data());
            if (decision.apply) receiptUpdate = decision.update;
          }
          if (!ix.exists) tx.create(index, { eventId: id, messageId: update.messageId });
        }
        tx.update(ref, { ...update, ...receiptUpdate, leaseToken: null, leaseUntil: null, updatedAt: new Date(now()).toISOString(), nextAttemptAt: END_TIME });
        return true;
      });
    }
  };
}
function sendSnapshot({ event, order, control }) {
  return { recipient: event.recipient, language: event.language, orderId: order.id, name: order.customerName, total: order.totalAmount, payment: order.paymentStatus, template: control?.templates?.[event.language]?.received, mode: control?.mode, review: control?.postReviewRef, postTest: control?.postTestApprovalRef, enabledAt: control?.enabledAt };
}
var WA_UPDATES_PHONE_ID = "1393523580503157";
function validateWaStopEvent(e) {
  if (!e || typeof e !== "object" || Array.isArray(e) || Object.keys(e).some((k) => !["kind", "phoneNumberId", "recipient", "messageId", "timestamp"].includes(k)) || e.kind !== "opt_out" || e.phoneNumberId !== WA_UPDATES_PHONE_ID || !/^\d{8,15}$/.test(e.recipient || "") || typeof e.messageId !== "string" || !/^wamid\.[A-Za-z0-9_+=\/-]{1,250}$/.test(e.messageId) || !/^\d{1,12}$/.test(e.timestamp || "") || !Number.isSafeInteger(Number(e.timestamp)) || Number(e.timestamp) <= 0) throw Error("Invalid opt-out event");
  return e;
}
async function waRecipientKey(recipient) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("udecs-whatsapp-updates-v1:" + recipient)))).map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function persistWaStop(db, event, now = () => (/* @__PURE__ */ new Date()).toISOString()) {
  const e = validateWaStopEvent(event), key = await waRecipientKey(e.recipient), ref = db.collection("whatsappUpdateSuppressions").doc(key);
  return db.runTransaction(async (tx) => {
    const old = await tx.get(ref);
    if (old.exists && old.data().suppressed === true) return { persisted: true, duplicate: true };
    const value = { suppressed: true, source: "signed_meta_inbound", phoneNumberId: e.phoneNumberId, recipientHash: key, reason: "recipient_opt_out", messageId: e.messageId, metaTimestamp: e.timestamp, recordedAt: now() };
    if (old.exists) tx.update(ref, value);
    else tx.create(ref, value);
    return { persisted: true, duplicate: false };
  });
}
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var SENDER = "orders@notifications.udecs.store";
var RECIPIENT2 = "g02rue@mail.instinct.com";
function createdAlert(id, o) {
  if (o.gatewayVerification || o.nonDelivery || o.taxReportingExcluded) return null;
  return { eventId: "created_" + id, payload: { orderId: id, customerName: o.customerName, items: o.items.map((i) => ({ name: i.name, quantity: i.quantity })), amount: o.totalAmount, paymentStatus: o.paymentStatus, time: o.createdAt }, state: "pending", attempts: 0, nextAttemptAt: o.createdAt, leaseUntil: null, leaseToken: null, firstAttemptAt: null, submittedMessageId: null };
}
__name(createdAlert, "createdAlert");
function emailFor(e) {
  const p = e.payload;
  return { from: SENDER, to: [RECIPIENT2], subject: "UDECS new order " + p.orderId, text: [`Order: ${p.orderId}`, `Customer: ${p.customerName}`, ...p.items.map((i) => `${i.name} x ${i.quantity}`), `Amount: INR ${Number(p.amount).toFixed(2)}`, `Payment status: ${p.paymentStatus}`, `Time: ${p.time}`].join("\n") };
}
__name(emailFor, "emailFor");
function alertStore(db) {
  return { async claim(id, now) {
    return db.runTransaction(async (tx) => {
      const ref = db.collection("orderAlertOutbox").doc(id), d = await tx.get(ref);
      if (!d.exists) return null;
      const e = d.data(), time = new Date(now).toISOString();
      if (e.state !== "pending" || Date.parse(e.nextAttemptAt) > now || Date.parse(e.leaseUntil) > now) return null;
      if (e.attempts >= 8 || e.firstAttemptAt && now - Date.parse(e.firstAttemptAt) >= 23 * 36e5) {
        console.error("ORDER_ALERTS_MANUAL_REVIEW", id);
        tx.update(ref, { state: "manual_review", nextAttemptAt: "9999-12-31T00:00:00.000Z", reason: "uncertain_or_attempt_limit", updatedAt: time });
        return null;
      }
      const day = time.slice(0, 10), month = time.slice(0, 7), dr = db.collection("orderAlertQuota").doc("d_" + day), mr = db.collection("orderAlertQuota").doc("m_" + month), control = db.collection("orderAlertControl").doc("sender");
      const [dd, md, cd] = await tx.getAll(dr, mr, control);
      if (cd.exists && cd.data().paused) {
        console.error("ORDER_ALERTS_PAUSED");
        return null;
      }
      const dc = dd.exists ? dd.data().count : 0, mc = md.exists ? md.data().count : 0;
      if (dc >= 95 || mc >= 2900) {
        console.warn("ORDER_ALERTS_QUOTA_QUEUED");
        return null;
      }
      const lease = crypto.randomUUID(), update = { attempts: e.attempts + 1, firstAttemptAt: e.firstAttemptAt || time, leaseToken: lease, leaseUntil: new Date(now + 10 * 6e4).toISOString(), updatedAt: time };
      if (dd.exists) tx.update(dr, { count: dc + 1 });
      else tx.create(dr, { count: 1 });
      if (md.exists) tx.update(mr, { count: mc + 1 });
      else tx.create(mr, { count: 1 });
      tx.update(ref, update);
      return { event: { ...e, ...update }, lease };
    });
  }, async mark(id, lease, update) {
    return db.runTransaction(async (tx) => {
      const ref = db.collection("orderAlertOutbox").doc(id), d = await tx.get(ref);
      if (!d.exists || d.data().leaseToken !== lease) return false;
      tx.update(ref, { ...update, ...update.state !== "pending" ? { nextAttemptAt: "9999-12-31T00:00:00.000Z" } : {}, leaseToken: null, leaseUntil: null });
      return true;
    });
  }, async pause(reason) {
    return db.runTransaction(async (tx) => {
      const r = db.collection("orderAlertControl").doc("sender"), d = await tx.get(r), v = { paused: true, reason, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      if (d.exists) tx.update(r, v);
      else tx.create(r, v);
    });
  } };
}
__name(alertStore, "alertStore");
async function processAlert(id, { store, send, now = /* @__PURE__ */ __name(() => Date.now(), "now") }) {
  const c = await store.claim(id, now());
  if (!c) return "not_claimed";
  const { event: e, lease } = c;
  let r;
  try {
    r = await send(emailFor(e), { idempotencyKey: "udecs-owner-" + e.eventId });
  } catch {
    r = { status: 503 };
  }
  if (r.status >= 200 && r.status < 300 && typeof r.id === "string" && r.id) {
    await store.mark(id, lease, { state: "submitted", submittedMessageId: r.id, submittedAt: new Date(now()).toISOString() });
    return "submitted";
  }
  if ([401, 403].includes(r.status)) {
    await store.pause("provider_auth_or_domain_rejected");
    await store.mark(id, lease, { state: "manual_review", reason: "provider_auth", providerStatus: r.status });
    return "manual_review";
  }
  const retry = r.status === 429 || r.status >= 500;
  await store.mark(id, lease, retry ? { state: "pending", nextAttemptAt: new Date(now() + Math.min(2 ** (e.attempts - 1), 6) * 36e5).toISOString(), lastError: "provider_unavailable" } : { state: "manual_review", reason: "provider_rejected", providerStatus: r.status });
  return retry ? "retry" : "manual_review";
}
__name(processAlert, "processAlert");
async function runAlerts(env, { db, fetcher = fetch, now = /* @__PURE__ */ __name(() => Date.now(), "now") } = {}) {
  if (env.ORDER_ALERTS_ENABLED !== "true") return "disabled";
  if (!env.RESEND_ORDER_ALERT_KEY) throw Error("ORDER_ALERTS_MISSING_KEY");
  const store = alertStore(db);
  const ids = await db.dueAlerts(new Date(now()).toISOString());
  let counts = { submitted: 0, retry: 0, manual_review: 0, not_claimed: 0 };
  for (const id of ids) {
    const state = await processAlert(id, { store, now, send: /* @__PURE__ */ __name(async (body, opts) => {
      const r = await fetcher("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + env.RESEND_ORDER_ALERT_KEY, "Content-Type": "application/json", "Idempotency-Key": opts.idempotencyKey }, body: JSON.stringify(body), signal: AbortSignal.timeout(15e3) });
      let j = {};
      try {
        j = await r.json();
      } catch {
      }
      return { status: r.status, id: j.id };
    }, "send") });
    counts[state]++;
  }
  return counts;
}
__name(runAlerts, "runAlerts");
var fail = /* @__PURE__ */ __name((m) => {
  throw Error(m);
}, "fail");
var validId = /* @__PURE__ */ __name((s) => /^UDECS-ORD-[a-f0-9-]{36}$/.test(s), "validId");
function paymentService(db) {
  return {
    async load(id, user) {
      if (!validId(id)) fail("Invalid order");
      return db.runTransaction(async (tx) => {
        const d = await tx.get(db.collection("orders").doc(id));
        if (!d.exists) fail("Order unavailable");
        const o = { id, ...d.data() };
        if (user && o.customerUid !== user.uid) fail("Wrong customer");
        if (o.paymentMethod !== "payu" || !/^ORD_[a-f0-9]{32}$/.test(o.payuTxnId)) fail("Not a PayU order");
        return o;
      });
    },
    async apply(id, v) {
      if (!validId(id) || v.state !== "paid" || !v.reference) return false;
      return db.runTransaction(async (tx) => {
        const ref = db.collection("orders").doc(id), d = await tx.get(ref);
        if (!d.exists) fail("Order unavailable");
        const o = d.data();
        if (o.paymentMethod !== "payu" || o.payuTxnId !== v.txnid || (Math.round(o.totalAmount * 100) / 100).toFixed(2) !== v.amount) fail("Payment mismatch");
        if (o.paymentStatus === "paid") return true;
        const packedVerification = id === "UDECS-ORD-0d48e171-7263-4efc-a25a-678a5b49313e" && o.customerUid === "ZAN8rLkaeFNvIKz0WyAN2g2nHOJ2" && o.gatewayVerification === true && o.nonDelivery === true && o.totalAmount === 50 && o.orderStatus === "packed" && !o.trackingNumber && !o.courierName && o.shippingFee === 0;
        if (o.paymentStatus !== "pending" || o.orderStatus !== "pending" && !packedVerification || o.reservationState !== "reserved") fail("Payment received but order requires owner review");
        const audit = db.collection("payuOrderReceipts").doc(v.txnid), existing = await tx.get(audit);
        if (existing.exists) fail("Payment audit conflict");
        let verificationProduct;
        if (o.gatewayVerification === true) {
          verificationProduct = db.collection("products").doc("UDECS_OWNER_GATEWAY_50");
          const product = await tx.get(verificationProduct);
          if (!product.exists || product.data().gatewayVerification !== true) fail("Verification item unavailable");
        }
        const now = (/* @__PURE__ */ new Date()).toISOString();
        if (verificationProduct) tx.update(verificationProduct, { hidden: true, featured: false, verificationCompletedAt: now });
        tx.create(audit, { orderId: id, txnid: v.txnid, reference: v.reference, amount: v.amount, state: "paid", verifiedAt: now });
        tx.update(ref, { paymentStatus: "paid", orderStatus: packedVerification ? "packed" : "processing", payuReference: v.reference, paymentVerifiedAt: now, updatedAt: now });
        return true;
      });
    }
  };
}
__name(paymentService, "paymentService");
async function verifyOrder(o, callback, fetcher = fetch) {
  const r = await fetcher("https://udecs-payu-api.sksaharukhossain1996.workers.dev/api/payu/customer/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: o, callback }) });
  if (!r.ok) throw Error("Payment verification unavailable");
  return r.json();
}
__name(verifyOrder, "verifyOrder");
var b64 = /* @__PURE__ */ __name((s) => btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""), "b64");
function encode(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)])) } };
}
__name(encode, "encode");
function decode(v) {
  if ("nullValue" in v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decode);
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decode(x)]));
  throw Error("Unsupported Firestore value");
}
__name(decode, "decode");
var fields = /* @__PURE__ */ __name((o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, encode(v)])), "fields");
var tokens = /* @__PURE__ */ new Map();
async function oauthToken(key, fetcher = fetch) {
  const cached = tokens.get(key.private_key_id);
  if (cached && Date.now() < cached.until) return cached.token;
  const now = Math.floor(Date.now() / 1e3), head = b64(JSON.stringify({ alg: "RS256", typ: "JWT" })), body = b64(JSON.stringify({ iss: key.client_email, scope: "https://www.googleapis.com/auth/datastore", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const pem = key.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, ""), bytes = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const signing = await crypto.subtle.importKey("pkcs8", bytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signed = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", signing, new TextEncoder().encode(head + "." + body)));
  const assertion = head + "." + body + "." + b64(String.fromCharCode(...signed));
  const r = await fetcher("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  if (!r.ok) throw Error("Server credential unavailable");
  const j = await r.json();
  if (!j.access_token) throw Error("Server credential unavailable");
  tokens.set(key.private_key_id, { token: j.access_token, until: Date.now() + Math.min(Number(j.expires_in) || 3600, 3600) * 1e3 - 6e4 });
  return j.access_token;
}
__name(oauthToken, "oauthToken");
function restDb(project, token, fetcher = fetch) {
  const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`, root = base.slice("https://firestore.googleapis.com/v1/".length);
  async function call(suffix, body) {
    const r = await fetcher(base + suffix, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) {
      const e = new Error("Database operation unavailable");
      const remoteError = Array.isArray(j) ? j.find((x) => x?.error)?.error : j.error;
      e.retryable = remoteError?.status === "ABORTED";
      e.safeHttpStatus = Number.isInteger(r.status) && r.status >= 400 && r.status <= 599 ? r.status : null;
      e.safeOperation = [":runQuery", ":beginTransaction", ":batchGet", ":commit", ":rollback"].includes(suffix) ? suffix.slice(1) : "other";
      e.safeStatus = ["ABORTED", "RESOURCE_EXHAUSTED", "PERMISSION_DENIED", "UNAUTHENTICATED", "FAILED_PRECONDITION", "UNAVAILABLE", "DEADLINE_EXCEEDED"].includes(remoteError?.status) ? remoteError.status : "DATABASE_ERROR";
      throw e;
    }
    return j;
  }
  __name(call, "call");
  const ref = /* @__PURE__ */ __name((collection, id) => ({ id, path: `${collection}/${id}`, name: `${root}/${collection}/${id}` }), "ref");
  const document = /* @__PURE__ */ __name((d) => ({ id: d.name.split("/").at(-1), exists: true, data: /* @__PURE__ */ __name(() => Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, decode(v)])), "data") }), "document");
  return {
    collection: /* @__PURE__ */ __name((c) => ({ doc: /* @__PURE__ */ __name((id) => ref(c, id), "doc") }), "collection"),
    async runTransaction(fn) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const { transaction } = await call(":beginTransaction", {});
        const writes = [];
        const getAll = /* @__PURE__ */ __name(async (...refs) => {
          const raw = await call(":batchGet", { documents: refs.map((r) => r.name), transaction });
          const results = Array.isArray(raw) ? raw : [raw], byName = new Map(results.map((x) => [x.found?.name || x.missing, x]));
          return refs.map((r) => {
            const x = byName.get(r.name);
            if (!x) throw Error("Incomplete server read");
            return x.found ? document(x.found) : { id: r.id, exists: false, data: /* @__PURE__ */ __name(() => void 0, "data") };
          });
        }, "getAll");
        const tx = { get: /* @__PURE__ */ __name(async (r) => (await getAll(r))[0], "get"), getAll, create: /* @__PURE__ */ __name((r, v) => writes.push({ update: { name: r.name, fields: fields(v) }, currentDocument: { exists: false } }), "create"), update: /* @__PURE__ */ __name((r, v) => writes.push({ update: { name: r.name, fields: fields(v) }, updateMask: { fieldPaths: Object.keys(v) }, currentDocument: { exists: true } }), "update") };
        try {
          const value = await fn(tx);
          await call(":commit", { writes, transaction });
          return value;
        } catch (e) {
          try {
            await call(":rollback", { transaction });
          } catch {
          }
          if (e.retryable && attempt < 4) continue;
          throw e;
        }
      }
      throw Error("Transaction unavailable");
    },
    async dueAlerts(time) {
      const out = await call(":runQuery", { structuredQuery: { from: [{ collectionId: "orderAlertOutbox" }], where: { fieldFilter: { field: { fieldPath: "nextAttemptAt" }, op: "LESS_THAN_OR_EQUAL", value: { stringValue: time } } }, orderBy: [{ field: { fieldPath: "nextAttemptAt" }, direction: "ASCENDING" }], limit: 30 } });
      return (Array.isArray(out) ? out : [out]).filter((x) => x.document).filter((x) => document(x.document).data().state === "pending").map((x) => document(x.document).id);
    },
    async ownedOrders(uid, cursor) {
      const query = { from: [{ collectionId: "orders" }], where: { fieldFilter: { field: { fieldPath: "customerUid" }, op: "EQUAL", value: { stringValue: uid } } }, orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }, { field: { fieldPath: "__name__" }, direction: "DESCENDING" }], limit: 6 };
      if (cursor) {
        let c;
        try {
          c = JSON.parse(atob(cursor));
        } catch {
          throw Error("Invalid order cursor");
        }
        if (c.uid !== uid || typeof c.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(c.createdAt) || !/^UDECS-ORD-[a-f0-9-]{36}$/.test(c.id)) throw Error("Invalid order cursor");
        query.startAt = { values: [{ stringValue: c.createdAt }, { referenceValue: `${root}/orders/${c.id}` }], before: false };
      }
      const out = await call(":runQuery", { structuredQuery: query });
      const docs = (Array.isArray(out) ? out : [out]).filter((x) => x.document).map((x) => ({ id: x.document.name.split("/").at(-1), ...document(x.document).data() }));
      const orders = docs.slice(0, 5), last = orders.at(-1);
      return { orders, nextCursor: docs.length > 5 ? btoa(JSON.stringify({ uid, createdAt: last.createdAt, id: last.id })) : null };
    }
  };
}
__name(restDb, "restDb");
async function oauthTokenLease(key) {
  await oauthToken(key);
  return { ...tokens.get(key.private_key_id) };
}
__name(oauthTokenLease, "oauthTokenLease");
var randomUUID = /* @__PURE__ */ __name(() => crypto.randomUUID(), "randomUUID");
var digest = /* @__PURE__ */ __name(async (text2) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text2)))).map((b) => b.toString(16).padStart(2, "0")).join(""), "digest");
var round = /* @__PURE__ */ __name((n) => Math.round((n + Number.EPSILON) * 100) / 100, "round");
var fail2 = /* @__PURE__ */ __name((code, message) => {
  const e = new Error(message);
  e.code = code;
  throw e;
}, "fail2");
var text = /* @__PURE__ */ __name((v, min, max, label) => {
  if (typeof v !== "string" || v.trim().length < min || v.trim().length > max) fail2("INVALID", `Invalid ${label}`);
  return v.trim();
}, "text");
function zone(pin) {
  const p3 = Number(pin.slice(0, 3)), p2 = Number(pin.slice(0, 2));
  if (pin.startsWith("721")) return "A";
  if (p3 >= 700 && p3 <= 743) return "B";
  if (p3 === 744 || [78, 79, 18, 19].includes(p2)) return "E";
  if ([110, 400, 411, 560, 600, 500, 380].includes(p3) || p3 >= 750 && p3 <= 770 || p2 >= 80 && p2 <= 85) return "C";
  return "D";
}
__name(zone, "zone");
function delivery(pin, items, cod, subtotal) {
  const z = zone(pin), weight = Math.max(0.5, Math.round(items.reduce((s, i) => s + (i.product.weightKg || 0.5) * i.quantity, 0) * 10) / 10);
  const a = { A: 50.17, B: 57.13, C: 62.35, D: 67.57, E: 105.85 }, b = { A: 82.65, B: 97.15, C: 111.65, D: 126.15, E: 146.45 }, c = { A: 23.2, B: 30.45, C: 37.7, D: 42.05, E: 47.85 };
  return Math.ceil((weight <= 0.5 ? a[z] : b[z] + c[z] * Math.max(0, Math.ceil(weight - 2))) * 1.075 + (cod ? 32 + subtotal * 0.0175 : 0));
}
__name(delivery, "delivery");
function normalized(input) {
  const customerName = text(input.customerName, 1, 150, "name"), customerEmail = text(input.customerEmail, 3, 120, "email"), customerPhone = text(input.customerPhone, 7, 30, "phone");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || !/^\+?[0-9 ()-]{7,30}$/.test(customerPhone)) fail2("INVALID", "Invalid contact");
  const shippingAddress = text(input.shippingAddress, 1, 500, "address"), city = text(input.city, 1, 120, "city"), state = text(input.state, 1, 120, "state"), pincode = text(input.pincode, 6, 6, "PIN");
  if (!/^\d{6}$/.test(pincode)) fail2("INVALID", "Invalid PIN");
  if (!["cod", "upi", "payu"].includes(input.paymentMethod) || input.currency !== "INR") fail2("UNSUPPORTED", "INR payment method unavailable");
  if (!Array.isArray(input.items) || input.items.length < 1) fail2("INVALID", "Invalid items");
  if (input.items.length > 10) fail2("INVALID", "Each order can contain up to 10 different products. Remove extra products before placing this order.");
  const seen = /* @__PURE__ */ new Set();
  const items = input.items.map((i) => {
    const productId = text(i.productId, 1, 128, "product ID");
    if (!/^[a-zA-Z0-9_-]+$/.test(productId) || seen.has(productId) || !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 1e4) fail2("INVALID", "Invalid product/quantity");
    seen.add(productId);
    return { productId, quantity: i.quantity, isWholesale: i.isWholesale === true };
  }).sort((a, b) => a.productId.localeCompare(b.productId));
  if (!Number.isFinite(input.expectedTotal) || input.expectedTotal < 0) fail2("INVALID", "Invalid expected total");
  return { ...normalizePreferences(input), customerName, customerEmail, customerPhone, shippingAddress, city, state, pincode, gstin: input.gstin ? text(input.gstin, 1, 20, "GSTIN") : "", items, paymentMethod: input.paymentMethod, currency: "INR", expectedTotal: input.expectedTotal };
}
__name(normalized, "normalized");
function orderService(db) {
  return {
    async create(input, key, principal2) {
      if (!principal2?.uid || !principal2.emailVerified || !principal2.email) fail2("FORBIDDEN", "Verified email customer sign-in required");
      const data = normalized({ ...input, customerEmail: principal2.email });
      if (typeof key !== "string" || !/^[-a-zA-Z0-9_]{32,128}$/.test(key)) fail2("INVALID", "Invalid idempotency key");
      const hash = await digest(JSON.stringify(data)), ref = db.collection("orderRequests").doc(await digest(principal2.uid + ":" + key));
      const id = "UDECS-ORD-" + randomUUID();
      return db.runTransaction(async (tx) => {
        const request = await tx.get(ref);
        if (request.exists) {
          if (request.data().hash !== hash) fail2("CONFLICT", "Request key was already used for different details");
          const old = await tx.get(db.collection("orders").doc(request.data().orderId));
          if (!old.exists || old.data().customerUid !== principal2.uid) fail2("INCONSISTENT", "Previously saved order unavailable");
          return { order: { id: old.id, ...old.data() }, replayed: true };
        }
        if (data.paymentMethod === "cod") fail2("COD_PAUSED", "New cash-on-delivery orders are temporarily paused while customer confirmation is set up. Please choose PayU online payment.");
        const profile = await tx.get(db.collection("customers").doc(principal2.uid));
        if (!profile.exists || profile.data().email !== principal2.email || profile.data().noticeVersion !== "customer-profile-v2" || typeof profile.data().name !== "string" || profile.data().name.trim().length < 2 || typeof profile.data().address !== "string" || profile.data().address.trim().length < 5) fail2("REGISTRATION_REQUIRED", "Save your customer registration and delivery details before ordering.");
        const refs = data.items.map((i) => db.collection("products").doc(i.productId));
        const docs = await tx.getAll(...refs);
        const rows = docs.map((d, n) => {
          if (!d.exists) fail2("PRODUCT_CHANGED", "Product no longer available");
          const p = d.data(), i = data.items[n];
          if (p.hidden === true) fail2("PRODUCT_CHANGED", "Product unavailable");
          if (p.supplierInStock === false) fail2("OUT_OF_STOCK", "Supplier currently out of stock");
          if (p.gatewayVerification === true) {
            if (i.productId !== "UDECS_OWNER_GATEWAY_50" || principal2.uid !== "ZAN8rLkaeFNvIKz0WyAN2g2nHOJ2" || data.paymentMethod !== "payu" || data.items.length !== 1 || i.quantity !== 1 || p.price !== 50 || p.featured === true) fail2("FORBIDDEN", "Owner gateway verification only");
            return { ...i, product: p, price: 50 };
          }
          if (p.shippingMode === "quote") fail2("QUOTE_REQUIRED", "Use existing shipping quote flow");
          const price = i.isWholesale || i.quantity >= p.minWholesaleQty ? p.wholesalePrice : p.price;
          if (i.isWholesale && i.quantity < p.minWholesaleQty) fail2("WHOLESALE_REVIEW", "Wholesale override below minimum requires approved terms");
          if (!Number.isFinite(price) || price < 0 || ![5, 12, 18, 28].includes(p.gstRate)) fail2("PRODUCT_INVALID", "Invalid catalog price/tax");
          if (p.stockManaged !== false && (!Number.isInteger(p.stock) || p.stock < i.quantity)) fail2("OUT_OF_STOCK", "Insufficient stock");
          return { ...i, product: p, price };
        });
        const verification = rows.length === 1 && rows[0].product.gatewayVerification === true;
        const verificationRef = db.collection("gatewayVerificationClaims").doc("UDECS_OWNER_GATEWAY_50");
        if (verification && (await tx.get(verificationRef)).exists) fail2("MANUAL_REVIEW", "Owner verification order already exists. Check My Orders; do not create another.");
        const subtotal = round(rows.reduce((s, i) => s + i.price * i.quantity, 0)), taxableAmount = verification ? 0 : round(rows.reduce((s, i) => s + (i.product.supplier === "rajkot" && i.product.gstExtra ? i.price * i.quantity : round(i.price * i.quantity / (1 + i.product.gstRate / 100))), 0)), totalGst = verification ? 0 : round(rows.reduce((s, i) => s + (i.product.supplier === "rajkot" && i.product.gstExtra ? round(i.price * i.quantity * i.product.gstRate / 100) : round(i.price * i.quantity - round(i.price * i.quantity / (1 + i.product.gstRate / 100)))), 0)), wb = data.state.toLowerCase().includes("bengal"), cgst = wb ? round(totalGst / 2) : 0, sgst = wb ? round(totalGst - cgst) : 0, igst = wb ? 0 : totalGst, shippingFee = verification || subtotal >= 1e3 ? 0 : delivery(data.pincode, rows, data.paymentMethod === "cod", subtotal), smallOrderDeliveryFee = 0, shoppingCharge = verification || data.paymentMethod !== "payu" ? 0 : round(subtotal * 0.023), totalAmount = verification ? 50 : round(taxableAmount + totalGst + shippingFee + smallOrderDeliveryFee + shoppingCharge);
        if (Math.abs(totalAmount - data.expectedTotal) > 1e-3) fail2("PRICE_CHANGED", "Checkout total changed; review the new total before ordering");
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const order = { ...data, ...verification ? { gatewayVerification: true, nonDelivery: true, taxReportingExcluded: true } : {}, customerUid: principal2.uid, items: rows.map((i) => ({ productId: i.productId, name: i.product.name, sku: i.product.sku, hsn: i.product.hsn || "", quantity: i.quantity, unitPrice: i.price, gstRate: verification ? 0 : i.product.gstRate, gstExtra: i.product.supplier === "rajkot" && i.product.gstExtra === true, taxableValue: verification ? 0 : round(i.product.supplier === "rajkot" && i.product.gstExtra ? i.price * i.quantity : i.price * i.quantity / (1 + i.product.gstRate / 100)), taxAmount: verification ? 0 : round(i.product.supplier === "rajkot" && i.product.gstExtra ? i.price * i.quantity * i.product.gstRate / 100 : i.price * i.quantity - round(i.price * i.quantity / (1 + i.product.gstRate / 100))), invoiceLineTotal: verification ? 0 : round(i.product.supplier === "rajkot" && i.product.gstExtra ? i.price * i.quantity + round(i.price * i.quantity * i.product.gstRate / 100) : i.price * i.quantity), totalPrice: i.price * i.quantity })), subtotal, taxableAmount, totalGst, cgst, sgst, igst, shippingFee, smallOrderDeliveryFee, shoppingCharge, shoppingChargeRate: verification || data.paymentMethod !== "payu" ? 0 : 0.023, chargeBasis: "items-subtotal-excluding-shipping", totalAmount, paymentStatus: "pending", orderStatus: data.paymentMethod === "cod" ? "processing" : "pending", payuTxnId: data.paymentMethod === "payu" ? "ORD_" + id.slice(10).replaceAll("-", "") : data.paymentMethod === "cod" ? "COD_ORDER_PLACED" : `UPI_${id.slice(-8)}`, courierName: "", trackingNumber: "", createdAt: now, updatedAt: now, stockReservations: rows.filter((i) => i.product.stockManaged !== false).map((i) => ({ productId: i.productId, quantity: i.quantity })), reservationState: "reserved" };
        delete order.expectedTotal;
        rows.forEach((i, n) => {
          if (i.product.stockManaged !== false) tx.update(refs[n], { stock: i.product.stock - i.quantity, updatedAt: now });
        });
        if (verification) tx.create(verificationRef, { orderId: id, ownerUid: principal2.uid, createdAt: now });
        if (order.whatsappConsent) order.whatsappConsent = { ...order.whatsappConsent, recordedAt: now };
        tx.create(db.collection("orders").doc(id), order);
        const waEvent = receivedEvent(id, order);
        if (waEvent) tx.create(db.collection("whatsappOrderOutbox").doc(waEvent.eventId), waEvent);
        const alert = createdAlert(id, order);
        if (alert) tx.create(db.collection("orderAlertOutbox").doc(alert.eventId), alert);
        tx.create(ref, { hash, orderId: id, createdAt: now });
        return { order: { id, ...order }, replayed: false };
      });
    },
    async recover(key, principal2) {
      if (!principal2?.uid) fail2("FORBIDDEN", "Customer authorization required");
      if (typeof key !== "string" || !/^[-a-zA-Z0-9_]{32,128}$/.test(key)) fail2("INVALID", "Invalid retry reference");
      const ref = db.collection("orderRequests").doc(await digest(principal2.uid + ":" + key));
      return db.runTransaction(async (tx) => {
        const request = await tx.get(ref);
        if (!request.exists) return { found: false };
        const old = await tx.get(db.collection("orders").doc(request.data().orderId));
        if (!old.exists || old.data().customerUid !== principal2.uid) fail2("INCONSISTENT", "Previously saved order unavailable");
        return { found: true, order: { id: old.id, ...old.data() } };
      });
    },
    async cancel(orderId, adminPrincipal) {
      if (!adminPrincipal) fail2("FORBIDDEN", "Admin authorization required");
      if (typeof orderId !== "string" || !/^UDECS-ORD-[a-f0-9-]{36}$/.test(orderId)) fail2("INVALID", "Invalid order ID");
      const ref = db.collection("orders").doc(orderId);
      return db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        if (!doc.exists) fail2("NOT_FOUND", "Order unavailable");
        const o = doc.data();
        if (o.orderStatus === "cancelled" && o.reservationState === "released") return { id: doc.id, ...o };
        if (o.paymentMethod === "payu") fail2("MANUAL_REVIEW", "PayU order cancellation requires verified gateway review");
        if (!["pending", "processing", "packed"].includes(o.orderStatus) || o.paymentStatus !== "pending" || o.trackingNumber) fail2("MANUAL_REVIEW", "Dispatched/paid order requires manual review");
        if (o.reservationState !== "reserved" || !Array.isArray(o.stockReservations)) fail2("LEGACY_ORDER", "Legacy order cancellation requires manual review");
        const refs = o.stockReservations.map((i) => db.collection("products").doc(i.productId)), docs = refs.length ? await tx.getAll(...refs) : [];
        docs.forEach((d, n) => {
          if (!d.exists || !Number.isInteger(d.data().stock)) fail2("INCONSISTENT", "Product missing; nothing cancelled");
        });
        const now = (/* @__PURE__ */ new Date()).toISOString();
        docs.forEach((d, n) => tx.update(refs[n], { stock: d.data().stock + o.stockReservations[n].quantity, updatedAt: now }));
        const update = { orderStatus: "cancelled", reservationState: "released", cancelledBy: adminPrincipal, updatedAt: now };
        tx.update(ref, update);
        return { id: doc.id, ...o, ...update };
      });
    }
  };
}
__name(orderService, "orderService");
var publicOrder = /* @__PURE__ */ __name((o) => {
  const { stockReservations, reservationState, cancelledBy, ...result } = o;
  return result;
}, "publicOrder");
async function principal(token, env, fetcher = fetch) {
  if (!token) throw Error("SIGN_IN");
  let claims;
  try {
    claims = JSON.parse(atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")));
  } catch {
    throw Error("SIGN_IN");
  }
  if (!["google.com", "password"].includes(claims.firebase?.sign_in_provider) || claims.aud !== env.FIREBASE_PROJECT_ID || claims.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}` || claims.exp <= Date.now() / 1e3) throw Error("SIGN_IN");
  const r = await fetcher(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: token }) });
  if (!r.ok) throw Error("SIGN_IN");
  const j = await r.json(), u = j.users?.[0];
  if (!u?.localId || u.localId !== claims.sub || !u.emailVerified || !u.email || u.disabled || !u.providerUserInfo?.some((p) => ["google.com", "password"].includes(p.providerId))) throw Error("SIGN_IN");
  return { uid: u.localId, email: u.email, emailVerified: true };
}
__name(principal, "principal");
function router({ fetcher = fetch, dbFactory = restDb, verify = principal } = {}) {
  return { async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const headers = { "Access-Control-Allow-Origin": origin || "", "Vary": "Origin", "Cache-Control": "no-store", "Content-Type": "application/json" };
    const reply = /* @__PURE__ */ __name((status, data) => new Response(JSON.stringify(data), { status, headers }), "reply");
    if (!env.ENABLED || env.ENABLED !== "true") return reply(503, { error: "Order service not enabled" });
    if (!env.ORDER_SERVICE_ACCOUNT || !env.RATE_LIMITER || !env.FIREBASE_PROJECT_ID || !env.FIREBASE_WEB_API_KEY) return reply(503, { error: "Order service not configured" });
    const callbackPath = new URL(request.url).pathname;
    if (callbackPath === "/api/payu/return" && request.method === "POST") {
      try {
        const text2 = await request.text();
        if (text2.length > 16e3) throw Error("Too large");
        const p = new URLSearchParams(text2);
        for (const k of ["key", "txnid", "amount", "productinfo", "firstname", "email", "status", "hash", "udf1", "udf2", "udf3", "udf4", "udf5"]) if (p.getAll(k).length !== 1) throw Error("Duplicate callback field");
        const id = p.get("udf1");
        if (!validId(id)) throw Error("Invalid order");
        const db = dbFactory(env.FIREBASE_PROJECT_ID, await sharedServerToken(env), fetcher), service = paymentService(db), o = await service.load(id), v = await verifyOrder(o, Object.fromEntries(p), fetcher);
        const paid = await service.apply(id, v);
        return new Response(paid ? "Payment verified and your order is saved. Open My Orders on udecs.store." : "Payment is not yet verified. Do not pay again. Open My Orders or contact support with your order ID.", { headers: { "Content-Type": "text/plain;charset=utf-8", "Cache-Control": "no-store" } });
      } catch {
        return new Response("Payment verification needs review. Do not pay again. Contact UDECS with your order ID.", { status: 202, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
      }
    }
    if (!["https://udecs.store", "https://www.udecs.store"].includes(origin)) return reply(403, { error: "Origin not allowed" });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...headers, "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" } });
    try {
      const token = request.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1], user = await verify(token, env, fetcher);
      const path = new URL(request.url).pathname;
      if (!["/api/orders/create", "/api/orders/mine", "/api/orders/recover", "/api/orders/cancel", "/api/orders/payment", "/api/orders/payment-status", "/api/orders/verification-product"].includes(path)) return reply(404, { error: "Not found" });
      const rate = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(user.uid));
      const allowed = await rate.fetch("https://limit/consume", { method: "POST" });
      if (!allowed.ok) return reply(429, { error: "Too many requests. Wait before retrying." });
      if (path === "/api/orders/cancel" && !["sksaharukhossain1996@gmail.com", "ecommerceunickdigital@gmail.com"].includes(user.email)) return reply(403, { error: "Verified owner required for cancellation" });
      const serverToken = await sharedServerToken(env), db = dbFactory(env.FIREBASE_PROJECT_ID, serverToken, fetcher);
      if (path === "/api/orders/verification-product" && request.method === "POST") {
        if (user.uid !== "ZAN8rLkaeFNvIKz0WyAN2g2nHOJ2") return reply(403, { error: "Verified owner only" });
        await db.runTransaction(async (tx) => {
          const ref = db.collection("products").doc("UDECS_OWNER_GATEWAY_50"), old = await tx.get(ref);
          if (old.exists) {
            if (old.data().gatewayVerification !== true) throw Error("Product ID already exists");
            return;
          }
          tx.create(ref, { name: "Owner PayU gateway verification - NO DELIVERY", nameBn: "Owner PayU gateway verification - NO DELIVERY", nameHi: "Owner PayU gateway verification - NO DELIVERY", description: "Owner-only real-money gateway verification. INR50 total. No goods, no delivery, no tax invoice. Removed after successful payment.", descriptionBn: "Owner-only gateway verification. No delivery.", sku: "UDECS_OWNER_GATEWAY_50", category: "verification", price: 50, wholesalePrice: 50, minWholesaleQty: 1, stock: 1, stockManaged: false, minStockAlert: 0, gstRate: 0, gstExtra: false, hsn: "", featured: false, hidden: false, gatewayVerification: true, imageIcon: "i-box", imageUrl: "", rating: 0, reviewsCount: 0, ownerApprovalRef: "wamid.HBgMOTE3MzE5MTkwNTE0FQIAEhggQUNBOEIyQzM0QzYwRDhCNDg1RDUyNjJCRUY4NjhFQzkA", createdAt: (/* @__PURE__ */ new Date()).toISOString() });
        });
        return reply(200, { productId: "UDECS_OWNER_GATEWAY_50" });
      }
      if (path === "/api/orders/payment" && request.method === "GET") {
        if (env.CUSTOMER_PAYU_ENABLED !== "true") return reply(503, { error: "Customer PayU temporarily unavailable" });
        const o = await paymentService(db).load(new URL(request.url).searchParams.get("orderId"), user);
        return reply(200, { order: o });
      }
      if (path === "/api/orders/payment-status" && request.method === "POST") {
        const b = await request.json(), service = paymentService(db), o = await service.load(b.orderId, user), v = await verifyOrder(o, void 0, fetcher);
        await service.apply(o.id, v);
        return reply(200, { order: publicOrder(await service.load(o.id, user)) });
      }
      if (path === "/api/orders/mine" && request.method === "GET") {
        const cursor = new URL(request.url).searchParams.get("cursor");
        if (cursor && cursor.length > 1024) return reply(400, { error: "Invalid order cursor" });
        const page = await db.ownedOrders(user.uid, cursor);
        return reply(200, { orders: page.orders.map(publicOrder), nextCursor: page.nextCursor });
      }
      if (path === "/api/orders/cancel" && request.method === "POST") {
        if (request.headers.get("Content-Type")?.split(";")[0] !== "application/json") return reply(400, { error: "JSON required" });
        const text2 = await request.text();
        if (text2.length > 512) return reply(413, { error: "Request too large" });
        const data = JSON.parse(text2);
        return reply(200, { order: publicOrder(await orderService(db).cancel(data.orderId, user.uid)) });
      }
      if (path === "/api/orders/recover" && request.method === "GET") {
        const result = await orderService(db).recover(request.headers.get("Idempotency-Key"), user);
        return reply(200, result.found ? { found: true, order: publicOrder(result.order) } : { found: false });
      }
      if (path === "/api/orders/create" && request.method === "POST") {
        if (request.headers.get("Content-Type")?.split(";")[0] !== "application/json") return reply(400, { error: "JSON required" });
        const text2 = await request.text();
        if (new TextEncoder().encode(text2).length > 32768) return reply(413, { error: "Request too large" });
        const data = JSON.parse(text2);
        if (data.paymentMethod === "payu" && env.CUSTOMER_PAYU_ENABLED !== "true") return reply(503, { error: "Customer PayU temporarily unavailable. No order created." });
        const result = await orderService(db).create(data, request.headers.get("Idempotency-Key"), user);
        return reply(result.replayed ? 200 : 201, { order: publicOrder(result.order), replayed: result.replayed });
      }
      return reply(405, { error: "Method not allowed" });
    } catch (e) {
      if (e.message === "SIGN_IN") return reply(401, { error: "Verified email customer sign-in required" });
      const status = { COD_PAUSED: 409, REGISTRATION_REQUIRED: 409, INVALID: 400, UNSUPPORTED: 400, WHOLESALE_REVIEW: 409, CONFLICT: 409, PRICE_CHANGED: 409, OUT_OF_STOCK: 409, QUOTE_REQUIRED: 409, PRODUCT_CHANGED: 409, PRODUCT_INVALID: 409, FORBIDDEN: 403, NOT_FOUND: 404, MANUAL_REVIEW: 409, LEGACY_ORDER: 409 }[e.code] || 503;
      return reply(status, { code: e.code || "UNAVAILABLE", error: status === 503 ? "Order not confirmed. Keep the same request reference and contact support if needed." : e.message });
    }
  } };
}
__name(router, "router");
var localServerTokens = /* @__PURE__ */ new WeakMap();
async function sharedServerToken(env) {
  const cached = localServerTokens.get(env);
  if (cached && Date.now() < cached.until) return cached.token;
  const service = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName("__order_oauth_cache"));
  const r = await service.fetch("https://internal/oauth");
  if (!r.ok) throw Error("Server credential unavailable");
  const j = await r.json();
  if (!j.token || !j.until || Date.now() >= j.until) throw Error("Server credential unavailable");
  localServerTokens.set(env, j);
  return j.token;
}
__name(sharedServerToken, "sharedServerToken");
function alertDiagnostic(error, stage) {
  const known = ["ABORTED", "RESOURCE_EXHAUSTED", "PERMISSION_DENIED", "UNAUTHENTICATED", "FAILED_PRECONDITION", "UNAVAILABLE", "DEADLINE_EXCEEDED", "DATABASE_ERROR"];
  let code = known.includes(error?.safeStatus) ? error.safeStatus : "UNCLASSIFIED";
  if (error?.message === "ORDER_ALERTS_MISSING_KEY") code = "MISSING_SENDER_KEY";
  if (error?.message === "Server credential unavailable") code = "SERVER_AUTH_UNAVAILABLE";
  const httpStatus = Number.isInteger(error?.safeHttpStatus) && error.safeHttpStatus >= 400 && error.safeHttpStatus <= 599 ? error.safeHttpStatus : null;
  const operation = ["runQuery", "beginTransaction", "batchGet", "commit", "rollback", "other"].includes(error?.safeOperation) ? error.safeOperation : null;
  return { stage, code, httpStatus, operation };
}
__name(alertDiagnostic, "alertDiagnostic");
var worker_default = { ...router(), async scheduled(event, env, ctx) {
  ctx.waitUntil((async () => {
    let stage = "server_auth";
    try {
      const token = await sharedServerToken(env);
      stage = "outbox_processing";
      const db = restDb(env.FIREBASE_PROJECT_ID, token);
      const result = await runAlerts(env, { db });
      console.log("ORDER_ALERTS_RESULT", JSON.stringify(result));
    } catch (error) {
      console.error("ORDER_ALERTS_FAILURE", JSON.stringify(alertDiagnostic(error, stage)));
      throw Error("Order alert sender failed; inspect safe stage/code log");
    }
  })());
} };
var ownerTestDb = async (env) => restDb(env.FIREBASE_PROJECT_ID, await sharedServerToken(env));
var isolatedOwnerRoute = ownerTestRouter({
  verify: principal,
  loadCurrent: async (env) => loadFixture(env, await ownerTestDb(env)),
  store: (env) => ({ claim: async (...a) => isolatedStore(await ownerTestDb(env), { recipientKey: waRecipientKey }).claim(...a), recheck: async (...a) => isolatedStore(await ownerTestDb(env), { recipientKey: waRecipientKey }).recheck(...a), finish: async (...a) => isolatedStore(await ownerTestDb(env), { recipientKey: waRecipientKey }).finish(...a) }),
  prepare: async (env, c) => prepareFixture(await ownerTestDb(env), c),
  readiness: async (env) => env.WA_TEMPLATE_SENDER.ownerTestReadiness(),
  sender: async (env, s) => env.WA_TEMPLATE_SENDER.sendOwnerFixture(s)
});
var preservedOrderFetch = worker_default.fetch;
worker_default = { ...worker_default, async fetch(request, env, ctx) {
  const path = new URL(request.url).pathname;
  if (path.startsWith("/api/whatsapp/owner-test")) return await isolatedOwnerRoute(request, env) || new Response("Not found", { status: 404 });
  return preservedOrderFetch(request, env, ctx);
} };
var CustomerRateLimit = class {
  static {
    __name(this, "CustomerRateLimit");
  }
  constructor(ctx, env) {
    this.env = env;
    this.ctx = ctx;
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS limits (id INTEGER PRIMARY KEY, start INTEGER NOT NULL, count INTEGER NOT NULL)");
  }
  async fetch(request) {
    if (new URL(request.url).pathname === "/oauth") {
      try {
        if (!this.refresh) this.refresh = (async () => {
          const key = JSON.parse(this.env.ORDER_SERVICE_ACCOUNT);
          if (key.project_id !== this.env.FIREBASE_PROJECT_ID) throw Error("Invalid project");
          return await oauthTokenLease(key);
        })().finally(() => {
          this.refresh = null;
        });
        return Response.json(await this.refresh, { headers: { "Cache-Control": "no-store" } });
      } catch {
        return new Response("Server credential unavailable", { status: 503 });
      }
    }
    const now = Date.now();
    let row = this.sql.exec("SELECT start,count FROM limits WHERE id=1").toArray()[0];
    if (!row || now - row.start >= 6e4) {
      this.sql.exec("INSERT OR REPLACE INTO limits(id,start,count) VALUES(1,?,1)", now);
      return new Response("ok");
    }
    if (row.count >= 10) return new Response("rate limited", { status: 429 });
    this.sql.exec("UPDATE limits SET count=count+1 WHERE id=1");
    return new Response("ok");
  }
};
var WhatsAppOrders = class extends WorkerEntrypoint {
  async persistReceipt(receipt) {
    return receiptPersistenceAdapter(this.env, receipt);
  }
  async persistOptOut(event) {
    validateWaStopEvent(event);
    if (!this.env.ORDER_SERVICE_ACCOUNT || !this.env.FIREBASE_PROJECT_ID) throw Error("Suppression unavailable");
    const db = restDb(this.env.FIREBASE_PROJECT_ID, await sharedServerToken(this.env));
    return persistWaStop(db, event);
  }
  async dispatchOwnerTest(eventId) {
    if (this.env.WHATSAPP_ORDER_MODE !== "owner-test" || !this.env.WA_TEMPLATE_SENDER) throw Error("Owner test mode is not enabled");
    const db = restDb(this.env.FIREBASE_PROJECT_ID, await sharedServerToken(this.env));
    return dispatchOne(eventId, { store: eventLedger(db, { recipientKey: waRecipientKey }), sender: (input) => this.env.WA_TEMPLATE_SENDER.sendReceived(input) });
  }
};
async function receiptPersistenceAdapter(env, receipt) {
  if (!env.ORDER_SERVICE_ACCOUNT || !env.FIREBASE_PROJECT_ID) throw Error("Receipts unavailable");
  const db = restDb(env.FIREBASE_PROJECT_ID, await sharedServerToken(env));
  const result = await persistReceipt(db, receipt);
  await reconcileIsolatedReceipt(db, receipt);
  return result;
}
export {
  CustomerRateLimit,
  WhatsAppOrders,
  worker_default as default,
  principal,
  receiptPersistenceAdapter,
  router
};
