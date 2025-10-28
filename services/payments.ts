// services/payments.ts
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebaseConfig";

/**
 * CALLABLES (must match functions/src/index.ts exports)
 * - payDriverOnComplete
 * - createPayPalOrder
 * - capturePayPalOrder
 * - transferFunds
 * - getWalletBalance
 */

type PayDriverReq = { rideId: string };
type PayDriverRes = { ok: true };

type CreateOrderReq = {
  amount: string;          // stringified number
  currency: string;        // e.g. 'ZAR'
  intent?: "CAPTURE" | "AUTHORIZE";
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
};
type CreateOrderRes = {
  orderId: string;
  status: string;
  approveLinks: Array<{ href: string; rel: string }>;
  orderCurrency: string;
  originalCurrency: string;
  originalAmount: string;
  orderAmount: string;
};

type CaptureOrderReq = { orderId: string };
type CaptureOrderRes = {
  status: "SUCCESS";
  credited: number;
  currency: string;
  paypal: { id: string; orderId: string };
};

type TransferReq = { toUid: string; amount: number; note?: string };
type TransferRes = { status: "SUCCESS" };

type BalanceRes = { balance: number; currency: string };

const fns = getFunctions(app);

/* ======================================================
 * 1) Complete ride and pay driver (primary path)
 * ==================================================== */
export async function completeRideAndPay(rideId: string): Promise<void> {
  const callable = httpsCallable<PayDriverReq, PayDriverRes>(fns, "payDriverOnComplete");
  const res = await callable({ rideId });
  if (!res?.data?.ok) throw new Error("Payment not confirmed.");
}

/* ======================================================
 * 2) Top-up helpers (PayPal)
 * ==================================================== */

/**
 * Create a PayPal order for wallet top-up.
 * Return the approval URL the app should open in a WebView (or Linking).
 */
export async function createTopUpOrder(params: {
  amountZAR: number;
  returnUrl: string; // e.g. 'dsquare://paypal-return'
  cancelUrl: string; // e.g. 'dsquare://paypal-cancel'
  description?: string;
}): Promise<{ orderId: string; approveUrl: string }> {
  const { amountZAR, returnUrl, cancelUrl, description } = params;
  const callable = httpsCallable<CreateOrderReq, CreateOrderRes>(fns, "createPayPalOrder");
  const res = await callable({
    amount: amountZAR.toFixed(2),
    currency: "ZAR",
    intent: "CAPTURE",
    description: description || "Wallet top-up",
    returnUrl,
    cancelUrl,
  });
  const orderId = res.data.orderId;
  const approveUrl =
    res.data.approveLinks?.find((l) => l.rel === "approve")?.href ||
    res.data.approveLinks?.[0]?.href ||
    "";
  if (!orderId || !approveUrl) throw new Error("Could not create PayPal order.");
  return { orderId, approveUrl };
}

/**
 * After the PayPal approval redirect, call this to capture the order
 * and credit user's wallet in your base currency.
 */
export async function captureTopUpOrder(orderId: string): Promise<CaptureOrderRes> {
  const callable = httpsCallable<CaptureOrderReq, CaptureOrderRes>(fns, "capturePayPalOrder");
  const res = await callable({ orderId });
  return res.data;
}

/* ======================================================
 * 3) Optional: P2P transfer helper (uses your callable)
 * ==================================================== */
export async function transferFunds(toUid: string, amount: number, note?: string): Promise<void> {
  const callable = httpsCallable<TransferReq, TransferRes>(fns, "transferFunds");
  const res = await callable({ toUid, amount, note });
  if (res.data?.status !== "SUCCESS") throw new Error("Transfer failed.");
}

/* ======================================================
 * 4) Optional: get wallet balance
 * ==================================================== */
export async function getWalletBalance(): Promise<BalanceRes> {
  const callable = httpsCallable<unknown, BalanceRes>(fns, "getWalletBalance");
  const res = await callable({});
  return res.data;
}

/* ======================================================
 * 5) Legacy shim: startRidePayment
 *    - Try to complete+pay
 *    - If insufficient balance, return an instruction for top-up (no "no route" dead-end)
 * ==================================================== */
export async function startRidePayment(args: {
  rideId: string;
  amountZAR: number;
  deepLinks?: { returnUrl: string; cancelUrl: string };
}): Promise<
  | { status: "PAID" }
  | { status: "NEED_TOP_UP"; orderId: string; approveUrl: string }
> {
  try {
    await completeRideAndPay(args.rideId);
    return { status: "PAID" };
  } catch (e: any) {
    const msg = String(e?.message || e);

    // If server threw 'Insufficient rider balance.' (from the callable), offer top-up path
    if (/insufficient/i.test(msg) && args.deepLinks) {
      const { orderId, approveUrl } = await createTopUpOrder({
        amountZAR: args.amountZAR,
        returnUrl: args.deepLinks.returnUrl,
        cancelUrl: args.deepLinks.cancelUrl,
        description: "Top-up to complete ride",
      });
      return { status: "NEED_TOP_UP", orderId, approveUrl };
    }

    // Re-throw other errors (permission, state, etc.)
    throw e;
  }
}
