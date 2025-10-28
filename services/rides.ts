// services/rides.ts
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

/* ======================================================
 * Types
 * ==================================================== */

export type RideType = "standard" | "xl" | "comfort";

export type RideStatus =
  | "requested"         // created by rider, visible to candidates / or waiting for assignment
  | "driver_requested"  // rider targeted a specific driver (waiting for that driver's decision)
  | "driver_declined"   // targeted driver declined -> rider should choose again
  | "driver_assigned"   // driver accepted (assigned)
  | "driver_arrived"    // driver says they arrived at pickup
  | "on_trip"           // driver picked up
  | "completed"         // trip finished (✅ rider only)
  | "cancelled";        // rider cancelled

export type CarInfo = {
  make: string;
  model: string;
  year: string;
  plate: string;
};

export type RideDriver = {
  id: string;                // driver uid
  name?: string | null;
  car?: CarInfo | null;
  rideType: RideType;
};

export type Ride = {
  id: string;
  userId: string;
  riderName?: string;

  pickupText: string;
  destinationText: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;

  distanceKm: number;          // planned distance
  estimatedFareZAR: number;    // computed estimate
  rideType: RideType;
  status: RideStatus;

  // when rider targets a driver
  driverPreferred?: { id: string; name?: string; car?: CarInfo | null; rideType: RideType } | null;

  // when a driver is assigned (after accept)
  driver?: RideDriver | null;

  // payment bookkeeping (simple flags; your payments service can set these)
  payment?: {
    status?: "none" | "attempted" | "authorized" | "failed";
    lastError?: string | null;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type SaveRideArgs = {
  userId: string;
  riderName?: string;
  pickupText: string;
  destinationText: string;
  distanceKm: number;
  estimatedFareZAR: number;
  rideType: RideType;
  pickupLat?: number;
  pickupLng?: number;
  destinationLat?: number;
  destinationLng?: number;

  // optional: rider can target a driver and start at driver_requested
  driverPreferred?: { id: string; name?: string; car?: CarInfo | null; rideType: RideType } | null;
  initialStatus?: RideStatus; // usually "requested" or "driver_requested"
};

/** helpful for callers that pass {latitude, longitude} */
export type LatLng = { latitude: number; longitude: number };

/* ======================================================
 * Pricing (keep aligned with UI)
 * ==================================================== */

type RidePricing = {
  id: RideType;
  name: string;
  base: number;   // base fare in ZAR
  perKm: number;  // ZAR per km
  multiplier: number;
  capacity: number;
};

export const RIDE_OPTIONS: Record<RideType, RidePricing> = {
  standard: {
    id: "standard",
    name: "Standard",
    base: 12,
    perKm: 7,
    multiplier: 1.0,
    capacity: 4,
  },
  xl: {
    id: "xl",
    name: "XL Van",
    base: 20,
    perKm: 11,
    multiplier: 1.6,
    capacity: 6,
  },
  comfort: {
    id: "comfort",
    name: "Comfort",
    base: 15,
    perKm: 8.5,
    multiplier: 1.2,
    capacity: 3,
  },
};

export function computeEstimatedFareZAR(distanceKm: number, type: RideType): number {
  const cfg = RIDE_OPTIONS[type];
  const raw = (cfg.base + cfg.perKm * distanceKm) * cfg.multiplier;
  return Math.max(0, Math.round(raw)); // whole rands
}

/* ======================================================
 * Distance helpers
 * ==================================================== */

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* ======================================================
 * Firestore collections
 * ==================================================== */

const ridesCol = collection(db, "rides");

/* ======================================================
 * Create / Save a ride (RIDER)
 * ==================================================== */
export async function saveRide(args: SaveRideArgs): Promise<string> {
  const payload: Omit<Ride, "id"> = {
    userId: args.userId,
    riderName: args.riderName || undefined,
    pickupText: args.pickupText,
    destinationText: args.destinationText,
    pickupLat: args.pickupLat ?? null,
    pickupLng: args.pickupLng ?? null,
    destinationLat: args.destinationLat ?? null,
    destinationLng: args.destinationLng ?? null,
    distanceKm: Number(args.distanceKm || 0),
    estimatedFareZAR: Number(args.estimatedFareZAR || 0),
    rideType: args.rideType,
    status: (args.initialStatus as RideStatus) || (args.driverPreferred ? "driver_requested" : "requested"),
    driverPreferred: args.driverPreferred || null,
    driver: null,
    payment: { status: "none", lastError: null },
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  };
  const ref = await addDoc(ridesCol, payload);
  return ref.id;
}

/* ======================================================
 * Listen to a user's rides (newest first)
 * ==================================================== */
export function listenUserRides(
  userId: string,
  cb: (rides: Ride[]) => void
): () => void {
  const q = query(
    ridesCol,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    const items: Ride[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Ride, "id">),
    }));
    cb(items);
  });
}

/* ======================================================
 * Listen to the user's *active* ride
 * ==================================================== */
export function listenUserActiveRide(
  userId: string,
  cb: (ride: Ride | null) => void
): () => void {
  const q = query(
    ridesCol,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(5)
  );
  return onSnapshot(q, (snap) => {
    const first = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .find((r) =>
        ["requested", "driver_requested", "driver_assigned", "driver_arrived", "on_trip"].includes(r.status)
      );
    cb(first || null);
  });
}

/* ======================================================
 * Listen to a single ride by id
 * ==================================================== */
export function listenRide(
  rideId: string,
  cb: (ride: Ride | null) => void
): () => void {
  const dref = doc(db, "rides", rideId);
  return onSnapshot(dref, (snap) => {
    if (!snap.exists()) return cb(null);
    cb({ id: snap.id, ...(snap.data() as Omit<Ride, "id">) });
  });
}

/* ======================================================
 * Rider cancels their own ride
 * ==================================================== */
export async function cancelRide(rideId: string): Promise<void> {
  const dref = doc(db, "rides", rideId);
  await updateDoc(dref, {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });
}

/* ======================================================
 * Driver flows (target / accept / decline)
 * ==================================================== */

/**
 * Generic helper used by the screen:
 * - action "target": sets driverPreferred (and status -> driver_requested)
 * - action "accept": assigns the driver & status -> driver_assigned
 * - action "decline": clears driverPreferred & sets status -> driver_declined
 */
export async function driverRespondToRequest(
  rideId: string,
  action: "target" | "accept" | "decline",
  driver?: RideDriver
): Promise<void> {
  const dref = doc(db, "rides", rideId);

  if (action === "target" && driver) {
    await updateDoc(dref, {
      driverPreferred: {
        id: driver.id,
        name: driver.name || null,
        car: driver.car || null,
        rideType: driver.rideType,
      },
      status: "driver_requested",
      updatedAt: serverTimestamp(),
    });
    return;
  }

  if (action === "accept" && driver) {
    await updateDoc(dref, {
      status: "driver_assigned",
      driver: {
        id: driver.id,
        name: driver.name || null,
        car: driver.car || null,
        rideType: driver.rideType,
      },
      updatedAt: serverTimestamp(),
    });
    return;
  }

  if (action === "decline") {
    await updateDoc(dref, {
      status: "driver_declined",
      driverPreferred: null,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  throw new Error("Invalid driverRespondToRequest usage");
}

// Convenience wrappers
export async function acceptRide(rideId: string, driver: RideDriver): Promise<void> {
  return driverRespondToRequest(rideId, "accept", driver);
}
export async function declineRide(rideId: string, _driverId: string): Promise<void> {
  return driverRespondToRequest(rideId, "decline");
}

/* ======================================================
 * Driver status transitions (arrived / on_trip)
 * (✅ Driver cannot mark completed here)
 * ==================================================== */

export async function driverMarkArrived(rideId: string): Promise<void> {
  const dref = doc(db, "rides", rideId);
  await updateDoc(dref, {
    status: "driver_arrived",
    updatedAt: serverTimestamp(),
  });
}

export async function driverStartTrip(rideId: string): Promise<void> {
  const dref = doc(db, "rides", rideId);
  await updateDoc(dref, {
    status: "on_trip",
    updatedAt: serverTimestamp(),
  });
}

/* ======================================================
 * Rider ends trip (then you can trigger payout)
 * ==================================================== */
export async function riderCompleteRide(rideId: string): Promise<void> {
  const dref = doc(db, "rides", rideId);
  await updateDoc(dref, {
    status: "completed",
    updatedAt: serverTimestamp(),
  });
}

/* ======================================================
 * Payment bookkeeping helpers (optional)
 * ==================================================== */

export async function markPaymentAttempted(rideId: string, ok: boolean, err?: string) {
  const dref = doc(db, "rides", rideId);
  await updateDoc(dref, {
    payment: { status: ok ? "attempted" : "failed", lastError: err || null },
    updatedAt: serverTimestamp(),
  });
}

export async function markPaymentAuthorized(rideId: string) {
  const dref = doc(db, "rides", rideId);
  await updateDoc(dref, {
    payment: { status: "authorized", lastError: null },
    updatedAt: serverTimestamp(),
  });
}

/* ======================================================
 * Get a ride once (optional utility)
 * ==================================================== */
export async function getRideOnce(rideId: string): Promise<Ride | null> {
  const dref = doc(db, "rides", rideId);
  const snap = await getDoc(dref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Ride, "id">) };
}

/* ======================================================
 * 🔁 Backwards-compatibility exports (fix your TS errors)
 * ==================================================== */

export type AssignedDriver = RideDriver & {
  etaMinutes?: number;
  phone?: string;
};

export type SaveRideRequestArgs = {
  userId: string;
  pickupText: string;
  destinationText: string;
  pickup: LatLng;        // { latitude, longitude }
  destination: LatLng;   // { latitude, longitude }
  rideType: RideType;
  distanceKm: number;
  estimatedFareZAR: number;
  currency?: string;     // ignored by the backend; kept for compatibility
};

export async function saveRideRequest(args: SaveRideRequestArgs): Promise<string> {
  return saveRide({
    userId: args.userId,
    pickupText: args.pickupText,
    destinationText: args.destinationText,
    pickupLat: args.pickup.latitude,
    pickupLng: args.pickup.longitude,
    destinationLat: args.destination.longitude, // <-- note: you likely meant latitude/longitude; keep your current code if already correct
    destinationLng: args.destination.longitude,
    distanceKm: args.distanceKm,
    estimatedFareZAR: args.estimatedFareZAR,
    rideType: args.rideType,
  });
}

export function listenForDriverAssignment(
  rideId: string,
  cb: (driver: AssignedDriver | null) => void
): () => void {
  return listenRide(rideId, (ride) => {
    if (ride && ride.driver && (ride.status === "driver_assigned" || ride.status === "on_trip")) {
      cb(ride.driver as AssignedDriver);
    } else {
      cb(null);
    }
  });
}
