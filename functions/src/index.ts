import * as dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local" });

import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

import express from "express";
import corsLib from "cors";
import bodyParser from "body-parser";

/* ──────────────────────────────────────────────────────────────────────────────
   CONFIG
────────────────────────────────────────────────────────────────────────────── */
const APP_DEFAULT_CCY = "ZAR";
const getBaseCurrency = (): string =>
  (process.env.APP_BASE_CURRENCY || APP_DEFAULT_CCY).toUpperCase();

const PAYPAL_ENV = (process.env.PAYPAL_ENV || "sandbox").toLowerCase();
const PAYPAL_API_BASE =
  PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

const PAYPAL_SUPPORTED = new Set([
  "AUD","BRL","CAD","CNY","CZK","DKK","EUR","HKD","HUF","ILS","JPY","MYR",
  "MXN","TWD","NZD","NOK","PHP","PLN","GBP","SGD","SEK","CHF","THB","USD"
]);
const PAYPAL_FALLBACK_CCY = "USD";

/* ──────────────────────────────────────────────────────────────────────────────
   ADMIN INIT
────────────────────────────────────────────────────────────────────────────── */
if (getApps().length === 0) initializeApp();
const db = getFirestore();
const cors = corsLib({ origin: true });

/* ──────────────────────────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────────────────────────── */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new HttpsError("failed-precondition", `Missing secret: ${name}`);
  return v;
}

function uidOrThrow(req: { auth?: { uid?: string } }): string {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Not signed in.");
  return uid;
}


async function getPayPalAccessToken(): Promise<string> {
  const client = requireEnv("PAYPAL_CLIENT_ID");
  const secret = requireEnv("PAYPAL_SECRET");
  const creds = Buffer.from(`${client}:${secret}`).toString("base64");

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error("PayPal token error", text);
    throw new HttpsError("internal", `PayPal token error: ${text}`);
  }

  const data: any = await res.json();
  return data.access_token;
}

/* ──────────────────────────────────────────────────────────────────────────────
   FX CONVERSION (v6 -> Frankfurter -> exchangerate.host fallback)
────────────────────────────────────────────────────────────────────────────── */
async function fxConvert(amount: number, from: string, to: string): Promise<number> {
  if (from.toUpperCase() === to.toUpperCase()) return Number(amount);

  const _from = from.toUpperCase();
  const _to = to.toUpperCase();
  const qAmt = encodeURIComponent(String(amount));
  const fxKey = (process.env.FX_API_KEY || "").trim();

  const tryGet = async (url: string) => {
    const res = await fetch(url);
    const text = await res.text();
    try { return { ok: res.ok, json: JSON.parse(text), text }; }
    catch { return { ok: res.ok, json: null, text }; }
  };

  if (fxKey) {
    try {
      const { ok, json } = await tryGet(`https://v6.exchangerate-api.com/v6/${fxKey}/pair/${_from}/${_to}/${qAmt}`);
      if (ok && typeof json?.conversion_result === "number") return json.conversion_result;
    } catch (e) { logger.warn("FX v6 failed", e); }
  }

  try {
    const { ok, json } = await tryGet(`https://api.frankfurter.app/latest?amount=${qAmt}&from=${_from}&to=${_to}`);
    if (ok && typeof json?.rates?.[_to] === "number") return json.rates[_to];
  } catch (e) { logger.warn("FX frankfurter failed", e); }

  const { json } = await tryGet(`https://api.exchangerate.host/convert?from=${_from}&to=${_to}&amount=${qAmt}`);
  if (typeof json?.result === "number") return json.result;
  return Number(amount);
}

/* ──────────────────────────────────────────────────────────────────────────────
   DB SHORTCUTS
────────────────────────────────────────────────────────────────────────────── */
function walletDoc(uid: string) { return db.collection("wallets").doc(uid); }
function txCollection(uid: string) { return walletDoc(uid).collection("transactions"); }


logger.info("🔍 PAYPAL_ENV:", process.env.PAYPAL_ENV);
logger.info("🔍 PAYPAL_CLIENT_ID prefix:", (process.env.PAYPAL_CLIENT_ID || "").slice(0, 6));
logger.info("🔍 PAYPAL_API_BASE:", PAYPAL_API_BASE);

/* ──────────────────────────────────────────────────────────────────────────────
   PAYPAL: CREATE ORDER (AUTHED)
────────────────────────────────────────────────────────────────────────────── */
type CreateOrderPayload = {
  amount: string;
  currency: string;
  intent?: 'CAPTURE' | 'AUTHORIZE';
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
};

export const createPayPalOrder = onCall(
  { secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_SECRET', 'PAYPAL_ENV', 'FX_API_KEY'] },
  async (request) => {
    const uid = uidOrThrow(request);
    const data = request.data as CreateOrderPayload;

    const amountStr = data.amount;
    const inputCurrency = (data.currency || getBaseCurrency()).toUpperCase();
    const intent = data.intent ?? 'CAPTURE';
    const description = data.description ?? 'Wallet top-up';

    if (!amountStr || isNaN(Number(amountStr))) {
      throw new HttpsError('invalid-argument', 'amount must be a stringified number');
    }

    // Currency fallback / conversion if not supported by PayPal
    let orderCurrency = inputCurrency;
    let orderAmountStr = amountStr;
    if (!PAYPAL_SUPPORTED.has(orderCurrency)) {
      const converted = await fxConvert(Number(amountStr), inputCurrency, PAYPAL_FALLBACK_CCY);
      orderCurrency = PAYPAL_FALLBACK_CCY;
      orderAmountStr = converted.toFixed(2);
    }

    const returnUrl = data.returnUrl;
    const cancelUrl = data.cancelUrl;

    const accessToken = await getPayPalAccessToken();

    const body = {
      intent,
      purchase_units: [
        {
          amount: {
            currency_code: orderCurrency,
            value: orderAmountStr,
          },
          description,
          custom_id: uid,
        },
      ],
      // ✅ Updated application_context for Fastlane compatibility
      application_context: {
        brand_name: 'Dayly',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',

        // Fastlane-friendly setup
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
        experience_context: {
          payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
          payment_method_selected: 'PAYPAL',
          brand_name: 'Dayly',
          locale: 'en-ZA',
        },

        // Standard redirect URLs
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    };

    const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result: any = await res.json();

    if (!res.ok) {
      logger.error('PayPal create error', result);
      throw new HttpsError('internal', `PayPal create error: ${JSON.stringify(result)}`);
    }

    logger.info('✅ PayPal order created', {
      orderId: result.id,
      env: PAYPAL_ENV,
      currency: orderCurrency,
      amount: orderAmountStr,
    });

    return {
      orderId: result.id,
      status: result.status,
      approveLinks: (result.links || []).filter((l: any) => l.rel === 'approve'),
      orderCurrency,
      originalCurrency: inputCurrency,
      originalAmount: amountStr,
      orderAmount: orderAmountStr,
    };
  }
);


/* ──────────────────────────────────────────────────────────────────────────────
   PAYPAL: CAPTURE ORDER (AUTHED)
────────────────────────────────────────────────────────────────────────────── */
export const capturePayPalOrder = onCall(
  { secrets: ["PAYPAL_CLIENT_ID", "PAYPAL_SECRET", "PAYPAL_ENV"] },
  async (req) => {
    const uid = uidOrThrow(req);
    const { orderId } = req.data as { orderId: string };
    if (!orderId) throw new HttpsError("invalid-argument", "orderId required");

    const token = await getPayPalAccessToken();
    const capRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({}),
    });

    const capBody: any = await capRes.json().catch(async () => ({ raw: await capRes.text() }));
    if (!capRes.ok || capBody?.status !== "COMPLETED") {
      logger.error("PayPal capture error", { status: capRes.status, capBody });
      throw new HttpsError("internal", `PayPal capture error: ${JSON.stringify(capBody)}`);
    }

    const capture = capBody.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture?.amount?.value || !capture?.amount?.currency_code) {
      throw new HttpsError("internal", "Missing capture amount");
    }

    const gross = Number(capture.amount.value);
    const grossCurrency = String(capture.amount.currency_code).toUpperCase();
    const base = getBaseCurrency();
    const credit = grossCurrency === base ? gross : await fxConvert(gross, grossCurrency, base);

    const now = Timestamp.now();
    await db.runTransaction(async (t) => {
      const wRef = walletDoc(uid);
      const wSnap = await t.get(wRef);
      const prev = wSnap.exists ? Number(wSnap.get("balance") || 0) : 0;

      t.set(wRef, {
        uid,
        balance: prev + credit,
        currency: base,
        updatedAt: now,
        createdAt: wSnap.exists ? (wSnap.get("createdAt") || now) : now,
      }, { merge: true });

      t.set(txCollection(uid).doc(), {
        type: "TOP_UP",
        provider: "PAYPAL",
        orderId,
        captureId: capture.id || null,
        grossAmount: gross,
        grossCurrency,
        creditAmount: credit,
        creditCurrency: base,
        status: "SUCCESS",
        createdAt: now,
      });
    });

    return { status: "SUCCESS", credited: Number(credit.toFixed(2)), currency: base, paypal: { id: capture.id, orderId } };
  }
);

/* ──────────────────────────────────────────────────────────────────────────────
   WALLET: BALANCE + AUTO-CREATE
────────────────────────────────────────────────────────────────────────────── */
export const getWalletBalance = onCall({}, async (req) => {
  const uid = uidOrThrow(req);
  const base = getBaseCurrency();
  const ref = walletDoc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    const now = Timestamp.now();
    await ref.set({ uid, balance: 0, currency: base, createdAt: now, updatedAt: now });
    return { balance: 0, currency: base };
  }
  return { balance: Number(snap.get("balance") || 0), currency: String(snap.get("currency") || base).toUpperCase() };
});

/* ──────────────────────────────────────────────────────────────────────────────
   WALLET: TRANSACTIONS (paged)
────────────────────────────────────────────────────────────────────────────── */
export const getTransactions = onCall({}, async (req) => {
  const uid = uidOrThrow(req);
  const { limit: _limit, cursor } = (req.data || {}) as { limit?: number; cursor?: string };
  const limit = Math.max(1, Math.min(50, Number(_limit ?? 20)));

  let q = txCollection(uid).orderBy("createdAt", "desc").limit(limit);
  if (cursor) {
    const curSnap = await txCollection(uid).doc(String(cursor)).get();
    if (curSnap.exists) q = q.startAfter(curSnap);
  }

  const snaps = await q.get();
  const items = snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
  const nextCursor = snaps.size === limit ? snaps.docs[snaps.docs.length - 1].id : null;
  return { items, nextCursor };
});

/* ──────────────────────────────────────────────────────────────────────────────
   WALLET: P2P TRANSFER
────────────────────────────────────────────────────────────────────────────── */
export const transferFunds = onCall({}, async (req) => {
  const fromUid = uidOrThrow(req);
  const { toUid, amount, note } = req.data as { toUid: string; amount: number | string; note?: string };
  if (!toUid || toUid === fromUid) throw new HttpsError("invalid-argument", "Invalid recipient");
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) throw new HttpsError("invalid-argument", "amount must be > 0");

  const amt = Number(amount);
  const base = getBaseCurrency();
  const now = Timestamp.now();

  await db.runTransaction(async (t) => {
    const fromRef = walletDoc(fromUid);
    const toRef = walletDoc(toUid);
    const [fromSnap, toSnap] = await Promise.all([t.get(fromRef), t.get(toRef)]);

    const fromBal = fromSnap.exists ? Number(fromSnap.get("balance") || 0) : 0;
    if (fromBal < amt) throw new HttpsError("failed-precondition", "Insufficient balance");

    t.set(fromRef, { uid: fromUid, balance: fromBal - amt, currency: base, updatedAt: now, createdAt: fromSnap.exists ? (fromSnap.get("createdAt") || now) : now }, { merge: true });
    t.set(toRef,   { uid: toUid,   balance: (toSnap.exists ? Number(toSnap.get("balance") || 0) : 0) + amt, currency: base, updatedAt: now, createdAt: toSnap.exists ? (toSnap.get("createdAt") || now) : now }, { merge: true });

    t.set(txCollection(fromUid).doc(), { type: "TRANSFER_OUT", counterparty: toUid, amount: amt, currency: base, note: note || null, createdAt: now, status: "SUCCESS" });
    t.set(txCollection(toUid).doc(),   { type: "TRANSFER_IN",  counterparty: fromUid, amount: amt, currency: base, note: note || null, createdAt: now, status: "SUCCESS" });
  });

  return { status: "SUCCESS" };
});

/* ──────────────────────────────────────────────────────────────────────────────
   RIDES: COMPLETE & PAY DRIVER (ATOMIC)
────────────────────────────────────────────────────────────────────────────── */
export const payDriverOnComplete = onCall({}, async (req) => {
  const riderUid = uidOrThrow(req);
  const { rideId } = req.data as { rideId: string };
  if (!rideId) throw new HttpsError("invalid-argument", "rideId required");

  const rideRef = db.collection("rides").doc(rideId);
  const feeRate = Number(process.env.APP_PLATFORM_FEE_RATE || "0.20");
  const now = Timestamp.now();
  const base = getBaseCurrency();

  await db.runTransaction(async (t) => {
    const rideSnap = await t.get(rideRef);
    if (!rideSnap.exists) throw new HttpsError("not-found", "Ride not found");

    const ride = rideSnap.data() as any;
    if (ride?.payment?.status === "authorized" || ride?.status === "completed") return;

    if (ride.userId !== riderUid) throw new HttpsError("permission-denied", "Not your ride.");
    if (ride.status !== "on_trip") throw new HttpsError("failed-precondition", `Ride must be on_trip`);
    const driverId = ride?.driver?.id;
    if (!driverId) throw new HttpsError("failed-precondition", "No assigned driver.");

    const amount = Number(ride.estimatedFareZAR || 0);
    if (!Number.isFinite(amount) || amount <= 0) throw new HttpsError("failed-precondition", "Invalid fare amount.");

    const riderW = walletDoc(riderUid);
    const driverW = walletDoc(driverId);
    const [rSnap, dSnap] = await Promise.all([t.get(riderW), t.get(driverW)]);
    const riderBal = rSnap.exists ? Number(rSnap.get("balance") || 0) : 0;
    if (riderBal < amount) throw new HttpsError("failed-precondition", "Insufficient rider balance.");

    const platformFee = Math.round(amount * Math.max(0, Math.min(0.95, feeRate)));
    const payout = amount - platformFee;

    t.set(riderW, { balance: riderBal - amount, currency: base, updatedAt: now, createdAt: rSnap.exists ? (rSnap.get("createdAt") || now) : now }, { merge: true });
    t.set(driverW, { balance: (dSnap.exists ? Number(dSnap.get("balance") || 0) : 0) + payout, currency: base, updatedAt: now, createdAt: dSnap.exists ? (dSnap.get("createdAt") || now) : now }, { merge: true });

    t.set(txCollection(riderUid).doc(), { type: "RIDE_PAYMENT", rideId, counterparty: driverId, amount, currency: base, platformFee, payoutToDriver: payout, createdAt: now, status: "SUCCESS" });
    t.set(txCollection(driverId).doc(), { type: "RIDE_EARN",    rideId, counterparty: riderUid, amount: payout, currency: base, platformFee, createdAt: now, status: "SUCCESS" });

    t.update(rideRef, { status: "completed", payment: { status: "authorized", lastError: null }, updatedAt: now });
    t.set(db.collection("drivers_live").doc(driverId), { occupied: false, updatedAt: now }, { merge: true });
  });

  return { ok: true };
});

/* ──────────────────────────────────────────────────────────────────────────────
   BUSINESS: PAY & PLACE ORDER (ATOMIC)
────────────────────────────────────────────────────────────────────────────── */
export const payAndPlaceOrder = onCall({}, async (req) => {
  const uid = uidOrThrow(req);
  const { businessId, items, address, total } = req.data || {};
  if (!businessId || !Array.isArray(items) || !Number.isFinite(Number(total)) || Number(total) <= 0) {
    throw new HttpsError("invalid-argument", "Missing order fields.");
  }

  const orderRef = db.collection("orders").doc();
  const buyerRef = walletDoc(uid);
  const businessRef = db.doc(`businesses/${businessId}`);
  const now = FieldValue.serverTimestamp();
  const base = getBaseCurrency();

  let ownerId = "";

  await db.runTransaction(async (tx) => {
    const bizSnap = await tx.get(businessRef);
    if (!bizSnap.exists) throw new HttpsError("not-found", "Business not found.");

    ownerId = String(bizSnap.get("ownerId") || "");
    if (!ownerId) throw new HttpsError("failed-precondition", "Business owner not set.");

    const sellerRef = walletDoc(ownerId);

    const buyerSnap = await tx.get(buyerRef);
    const buyerBal = buyerSnap.exists ? Number(buyerSnap.get("balance") || 0) : 0;
    const amount = Number(total);
    if (buyerBal < amount) throw new HttpsError("failed-precondition", "Insufficient funds.");

    tx.set(buyerRef,  { uid, balance: buyerBal - amount, currency: base, updatedAt: now }, { merge: true });
    tx.set(sellerRef, { uid: ownerId, balance: FieldValue.increment(amount), currency: base, updatedAt: now }, { merge: true });

    tx.set(orderRef, {
      businessId,
      ownerId,
      userId: uid,
      items,
      subtotal: amount,
      total: amount,
      deliveryAddress: address || null,
      status: "paid",
      createdAt: now,
      updatedAt: now,
    });
  });

  // (Optional) push to owner is below in the push section trigger or do it here by reading tokens

  return { orderId: orderRef.id, status: "paid" };
});

/* ──────────────────────────────────────────────────────────────────────────────
   PUSH (Expo)
────────────────────────────────────────────────────────────────────────────── */
const EXPO_PROJECT_ID = process.env.expo_project_id || "8b40b37d-0d36-40b5-a1e8-c2a55308ab7e";

async function sendExpoPush(to: string[] | string, title: string, body: string, data: Record<string, any> = {}) {
  const list = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!list.length) return;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", "expo-project-id": EXPO_PROJECT_ID },
    body: JSON.stringify(list.map((t) => ({ to: t, sound: "default", title, body, data }))),
  });
}

/* ──────────────────────────────────────────────────────────────────────────────
   ORDER STATUS → NOTIFY BUYER
────────────────────────────────────────────────────────────────────────────── */
export const notifyBuyerOrderStatus = onDocumentUpdated("orders/{orderId}", async (event) => {
  const before: any = event.data?.before?.data();
  const after: any = event.data?.after?.data();
  if (!before || !after) return;
  if (before.status === after.status) return;

  const userId = after.userId;
  if (!userId) return;

  const user = await db.collection("users").doc(userId).get();
  const tokens: string[] = (user.get("expoPushTokens") || []).filter((t: any) => typeof t === "string" && t.startsWith("ExponentPushToken"));
  if (tokens.length) {
    await sendExpoPush(tokens, "Order update", `Your order is now ${String(after.status)}`, {
      orderId: event.params.orderId,
      status: after.status,
    });
  }
});

/* ──────────────────────────────────────────────────────────────────────────────
   DM MESSAGE → NOTIFY RECIPIENT + CHAT META
────────────────────────────────────────────────────────────────────────────── */
function previewFromMessage(msg: any): string {
  if (typeof msg?.text === "string" && msg.text.trim()) return msg.text.trim().slice(0, 140);
  if (msg?.mediaType === "image") return "Image 📸";
  if (msg?.mediaType === "video") return "Video 🎥";
  if (msg?.mediaType === "file")  return `File 📄${msg?.fileName ? `: ${String(msg.fileName)}` : ""}`;
  return "New message";
}

export const notifyOnNewDM = onDocumentCreated("chats/{chatId}/messages/{messageId}", async (event) => {
  const chatId = event.params.chatId;
  const msg = event.data?.data();
  if (!msg) return;

  const senderId = String(msg.senderId || "");
  if (!senderId) return;

  try {
    const chatRef = db.collection("chats").doc(chatId);
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists) return;

    const chat = chatSnap.data() || {};

    let participants: string[] = [];
    if (Array.isArray(chat.participants)) {
      participants = chat.participants.filter((x: any) => typeof x === "string");
    } else if (chat.participants && typeof chat.participants === "object") {
      participants = Object.keys(chat.participants).filter((k) => chat.participants[k] === true);
    }
    if (participants.length !== 2) return;

    const recipientId = participants.find((p) => p !== senderId);
    if (!recipientId) return;

    const lastMessageText = previewFromMessage(msg);
    await chatRef.set(
      {
        lastMessageText,
        lastMessageSenderId: senderId,
        lastMessageTimestamp: FieldValue.serverTimestamp(),
        unreadFor: { [recipientId]: true, [senderId]: false },
      },
      { merge: true }
    );

    const senderSnap = await db.collection("users").doc(senderId).get();
    const recipientSnap = await db.collection("users").doc(recipientId).get();

    const tokens: string[] = (recipientSnap.get("expoPushTokens") || []).filter(
      (t: any) => typeof t === "string" && t.startsWith("ExponentPushToken")
    );
    if (!tokens.length) return;

    const title = senderSnap.get("username") ? String(senderSnap.get("username")) : "New message";
    await sendExpoPush(tokens, title, lastMessageText, {
      type: "dm",
      chatId,
      recipientId: senderId, // open chat with SENDER
    });
  } catch (e) {
    logger.warn("notifyOnNewDM failed", e);
  }
});

/* ──────────────────────────────────────────────────────────────────────────────
   EXPRESS APP
   - PayPal Webhook verification
   - Guest Checkout (HTTP, no Firebase auth)
────────────────────────────────────────────────────────────────────────────── */
const app = express();
app.use(bodyParser.json());
app.use((req, res, next) => cors(req, res, next));

/** 1) PayPal webhook verify */
app.post("/paypal/webhook", async (req, res) => {
  try {
    const WEBHOOK_ID = requireEnv("PAYPAL_WEBHOOK_ID");
    const token = await getPayPalAccessToken();

    const verifyRes = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        transmission_id: req.header("Paypal-Transmission-Id"),
        transmission_time: req.header("Paypal-Transmission-Time"),
        cert_url: req.header("Paypal-Cert-Url"),
        auth_algo: req.header("Paypal-Auth-Algo"),
        transmission_sig: req.header("Paypal-Transmission-Sig"),
        webhook_id: WEBHOOK_ID,
        webhook_event: req.body,
      }),
    });

    const verifyJson: any = await verifyRes.json();
    if (verifyJson.verification_status !== "SUCCESS") {
      logger.warn("Webhook verification failed", verifyJson);
      return res.status(400).json({ ok: false, reason: "verification_failed" });
    }
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    logger.error("Webhook error", e);
    return res.status(500).json({ ok: false, error: e?.message || "server_error" });
  }
});

/** 2) Guest checkout: create order
 *    POST /guest/paypal/create
 *    body: {recipientUid, amount, currency, returnUrl, cancelUrl, description?}
 */
app.post("/guest/paypal/create", async (req, res) => {
  try {
    const { recipientUid, amount, currency, returnUrl, cancelUrl, description } = req.body || {};
    if (!recipientUid || !amount || isNaN(Number(amount))) {
      return res.status(400).json({ ok: false, error: "Invalid input" });
    }

    const inputCurrency = String(currency || getBaseCurrency()).toUpperCase();
    let orderCurrency = inputCurrency;
    let orderAmountStr = Number(amount).toFixed(2);

    if (!PAYPAL_SUPPORTED.has(orderCurrency)) {
      const converted = await fxConvert(Number(amount), inputCurrency, PAYPAL_FALLBACK_CCY);
      orderCurrency = PAYPAL_FALLBACK_CCY;
      orderAmountStr = converted.toFixed(2);
    }

    const token = await getPayPalAccessToken();
    const r = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: { currency_code: orderCurrency, value: orderAmountStr },
          custom_id: recipientUid, // store receiver
          description: description || "Guest payment",
        }],
        application_context: {
          brand_name: "Dayly",
          landing_page: "BILLING",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }),
    });

    const body: any = await r.json();
    if (!r.ok) return res.status(500).json({ ok: false, error: body });

    return res.json({
      ok: true,
      orderId: body.id,
      approveLinks: (body.links || []).filter((l: any) => l.rel === "approve"),
      orderCurrency,
      orderAmount: orderAmountStr,
    });
  } catch (e: any) {
    logger.error("guest create error", e);
    return res.status(500).json({ ok: false, error: e?.message || "server_error" });
  }
});

/** 3) Guest checkout: capture and credit recipient
 *    POST /guest/paypal/capture
 *    body: {orderId}
 */
app.post("/guest/paypal/capture", async (req, res) => {
  try {
    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ ok: false, error: "orderId required" });

    const token = await getPayPalAccessToken();
    const cap = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({}),
    });
    const capBody: any = await cap.json();

    if (!cap.ok || capBody?.status !== "COMPLETED") {
      logger.error("guest capture PayPal error", capBody);
      return res.status(500).json({ ok: false, error: capBody });
    }

    const pu = capBody.purchase_units?.[0];
    const capture = pu?.payments?.captures?.[0];
    const recipientUid = pu?.custom_id;
    if (!recipientUid) return res.status(500).json({ ok: false, error: "Missing recipientUid in custom_id" });

    const gross = Number(capture?.amount?.value || 0);
    const grossCurrency = String(capture?.amount?.currency_code || "USD").toUpperCase();
    const base = getBaseCurrency();
    const credit = grossCurrency === base ? gross : await fxConvert(gross, grossCurrency, base);

    const now = Timestamp.now();
    await db.runTransaction(async (t) => {
      const wRef = walletDoc(recipientUid);
      const wSnap = await t.get(wRef);
      const prev = wSnap.exists ? Number(wSnap.get("balance") || 0) : 0;

      t.set(wRef, {
        uid: recipientUid,
        balance: prev + credit,
        currency: base,
        updatedAt: now,
        createdAt: wSnap.exists ? (wSnap.get("createdAt") || now) : now,
      }, { merge: true });

      t.set(txCollection(recipientUid).doc(), {
        type: "TOP_UP",
        provider: "PAYPAL",
        orderId,
        captureId: capture?.id || null,
        grossAmount: gross,
        grossCurrency,
        creditAmount: credit,
        creditCurrency: base,
        status: "SUCCESS",
        createdAt: now,
        source: "GUEST",
      });
    });

    return res.json({ ok: true, credited: Number(credit.toFixed(2)), currency: base });
  } catch (e: any) {
    logger.error("guest capture error", e);
    return res.status(500).json({ ok: false, error: e?.message || "server_error" });
  }
});

/* Export HTTP app */
export const api = onRequest(
  { secrets: ["PAYPAL_CLIENT_ID","PAYPAL_SECRET","PAYPAL_WEBHOOK_ID","FX_API_KEY"] },
  app
);
