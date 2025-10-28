// utils/paypalFlow.ts
//
// PayPal top-up via system browser / custom tabs + deep link return.
// Requires:
//   expo install expo-web-browser expo-linking
//   A custom scheme in app.json (e.g. "dsquare") and Android intent filter
//   Functions deployed: createPayPalOrder, capturePayPalOrder

import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { app, auth } from '../firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';

WebBrowser.maybeCompleteAuthSession();

const functions = getFunctions(app, 'us-central1');

// Route inside your app that PayPal will redirect to after approval/cancel.
// This must match what your Cloud Function sets in application_context.
export const PAYPAL_RETURN_PATH = 'paypal-return';

export function buildReturnUrl() {
  // If app.json contains: "scheme": "dsquare"
  // This becomes: dsquare://paypal-return
  // On web it becomes: http(s)://host/paypal-return
  return Linking.createURL(PAYPAL_RETURN_PATH);
}

type CreateOrderServerResponse = {
  orderId: string;
  status: string;
  approveLinks?: { rel: string; href: string }[];
  links?: { rel: string; href: string }[];
  orderCurrency?: string;
  orderAmount?: string;
};

type CaptureServerResponse = {
  status: 'SUCCESS' | string;
  credited?: number;
  currency?: string;
  paypal?: { id?: string; orderId?: string };
};

export type PayPalTopUpOutcome =
  | { ok: true; orderId: string; credited?: number; currency?: string }
  | { ok: false; reason: 'cancel' | 'dismiss' | 'error'; error?: any };

async function ensureSignedIn() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  // Force fresh token so callable sees request.auth
  await user.getIdToken(true);
}

function pickApprovalUrl(d: CreateOrderServerResponse) {
  return (
    d?.approveLinks?.find((l) => l.rel === 'approve')?.href ||
    d?.links?.find((l) => l.rel === 'approve')?.href ||
    null
  );
}

function extractOrderIdFromUrl(redirectUrl: string, fallback?: string) {
  try {
    const parsed = Linking.parse(redirectUrl);
    const qp = (parsed as any)?.queryParams || {};
    // PayPal usually puts an approval token in ?token=...
    const token = qp.token || qp.orderId || qp.orderID || qp.ec_token;
    return (token as string) || fallback || '';
  } catch {
    return fallback || '';
  }
}

/** Main flow */
export async function topUpWithPayPal(
  amount: number,
  opts?: { currency?: string } // default handled in backend
): Promise<PayPalTopUpOutcome> {
  try {
    await ensureSignedIn();

    const returnUrl = buildReturnUrl();
    const cancelUrl = `${returnUrl}?cancel=true`;

    // 1) Create order
    const createOrder = httpsCallable(functions, 'createPayPalOrder');
    const createRes = await createOrder({
      amount: Number(amount).toFixed(2),
      currency: (opts?.currency || 'ZAR').toUpperCase(),
      returnUrl,  // passed to CF -> PayPal application_context.return_url
      cancelUrl,  // passed to CF -> PayPal application_context.cancel_url
    });
    const data = (createRes.data || {}) as CreateOrderServerResponse;

    const approvalUrl = pickApprovalUrl(data);

    // 👇 The exact log you asked for — place it right after creating the order
    console.log('returnUrl:', returnUrl, 'cancelUrl:', cancelUrl, 'approvalUrl:', approvalUrl);

    if (!approvalUrl) {
      throw new Error('No PayPal approval URL returned');
    }

    // Nice-to-have: warm up custom tabs on Android
    if (Platform.OS === 'android') {
      try { await WebBrowser.warmUpAsync(); } catch {}
    }

    // 2) Open approval page in system browser / custom tab
    const result = await WebBrowser.openAuthSessionAsync(approvalUrl, returnUrl);
    console.log('openAuthSession result:', result);

    // 'cancel' | 'dismiss' (user closed) | 'success' (redirect matched returnUrl)
    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { ok: false, reason: result.type };
    }
    if (result.type !== 'success') {
      return { ok: false, reason: 'error', error: new Error(`Auth session: ${result.type}`) };
    }

    // 3) Pull orderId from deep link (fallback to original response)
    const orderId = extractOrderIdFromUrl(result.url, data.orderId);
    console.log('parsed orderId:', orderId, 'redirectUrl:', result.url);
    if (!orderId) {
      throw new Error('Missing orderId from redirect');
    }

    // 4) Capture the order (credits wallet on your backend)
    const capture = httpsCallable(functions, 'capturePayPalOrder');
    const capRes = await capture({ orderId });
    const cap = (capRes.data || {}) as CaptureServerResponse;
    console.log('capture response:', cap);

    if (cap.status !== 'SUCCESS') {
      throw new Error(`Capture failed: ${cap.status ?? 'UNKNOWN'}`);
    }

    return {
      ok: true,
      orderId,
      credited: typeof cap.credited === 'number' ? cap.credited : undefined,
      currency: cap.currency,
    };
  } catch (error) {
    console.log('topUpWithPayPal error:', error);
    return { ok: false, reason: 'error', error };
  } finally {
    if (Platform.OS === 'android') {
      try { await WebBrowser.coolDownAsync(); } catch {}
    }
  }
}

/** For debugging if you already have an approval URL */
export async function openApprovalUrlDirect(approvalUrl: string) {
  const returnUrl = buildReturnUrl();
  return WebBrowser.openAuthSessionAsync(approvalUrl, returnUrl);
}

/** Optional: external deep-link listener (usually not needed with openAuthSessionAsync) */
export function subscribePayPalReturn(handler: (url: string) => void) {
  const sub = Linking.addEventListener('url', (ev) => handler(ev.url));
  return () => sub.remove();
}
