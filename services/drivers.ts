// services/drivers.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebaseConfig";
import type { RideType } from "./rides";

/* =========================================================
 * Types
 * =======================================================*/

export type CarInfo = { make: string; model: string; year: string; plate: string };

export type DriverProfile = {
  uid: string;
  approved: boolean;
  online: boolean;
  rideType?: RideType;
  profile?: {
    fullName?: string;
    car?: CarInfo;
  };
  lat?: number;
  lng?: number;
  heading?: number;
  updatedAt?: any;
};

export type OnlineDriver = {
  uid: string;
  lat: number;
  lng: number;
  heading?: number;
};

export type DriverLive = {
  uid: string;
  online: boolean;
  rideType: RideType; // defaulted to "standard" if missing
  displayName?: string | null;
  car?: { make?: string; model?: string; plate?: string | null } | null;
  loc?: { lat: number; lng: number; heading?: number; updatedAt?: number };
};

export type DriverLiveWrite = {
  lat?: number;
  lng?: number;
  heading?: number;
  rideType?: RideType;
  displayName?: string | null; // allow null (Firestore rejects undefined)
  online?: boolean;
  car?: { plate?: string | null } | null;
};

/* =========================================================
 * Helpers
 * =======================================================*/
const stripUndefined = <T extends Record<string, any>>(obj: T) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;

/* =========================================================
 * Live presence (drivers_live)
 * =======================================================*/

/** Upsert the driver’s live location/status: drivers_live/{uid} */
export async function upsertDriverLive(uid: string, data: DriverLiveWrite) {
  const ref = doc(db, "drivers_live", uid);
  const payload = stripUndefined({
    uid,
    lat: data.lat,
    lng: data.lng,
    heading: typeof data.heading === "number" ? data.heading : 0,
    rideType: (data.rideType ?? "standard") as RideType,
    displayName: data.displayName ?? null, // never undefined
    online: data.online ?? true,
    car: data.car ?? null,
    updatedAt: serverTimestamp(),
  });
  await setDoc(ref, payload, { merge: true });
}

/** Subscribe to all online drivers (raw docs; normalize in UI if needed) */
export function listenOnlineDrivers(cb: (drivers: any[]) => void) {
  const col = collection(db, "drivers_live");
  const qy = query(col, where("online", "==", true));
  return onSnapshot(qy, (snap) => {
    const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    cb(list);
  });
}

/* =========================================================
 * Driver profile & controls (drivers)
 * =======================================================*/

/** Driver sets their car type */
export async function setDriverRideType(uid: string, rideType: RideType): Promise<void> {
  await updateDoc(doc(db, "drivers", uid), { rideType });
}

/** Driver toggles online/offline */
export async function setDriverOnline(uid: string, online: boolean) {
  await updateDoc(doc(db, "drivers", uid), { online, updatedAt: serverTimestamp() });
}

/** Listen to THIS user's driver profile (adds rideType, defaulting to 'standard') */
export function listenDriverProfile(
  uid: string,
  cb: (p: { approved: boolean; online: boolean; rideType: RideType }) => void
): () => void {
  const dref = doc(db, "drivers", uid);
  return onSnapshot(dref, (snap) => {
    const d = snap.data() as any;
    const rideType: RideType =
      d?.rideType === "comfort" || d?.rideType === "xl" ? d.rideType : "standard";
    cb({ approved: !!d?.approved, online: !!d?.online, rideType });
  });
}

/* =========================================================
 * Assignments
 * =======================================================*/

/** Show rides assigned to this driver (status driver_assigned | on_trip) */
export function listenAssignedRides(
  uid: string,
  cb: (
    rides: Array<{
      id: string;
      pickupText: string;
      destinationText: string;
      status: string;
      estimatedFareZAR: number;
    }>
  ) => void
) {
  const ridesRef = collection(db, "rides");
  // filter by driver.id; (ensure backend sets rides.driver.id on assignment)
  const qy = query(ridesRef, where("driver.id", "==", uid));
  return onSnapshot(qy, (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((r: any) => ["driver_assigned", "on_trip"].includes(r.status))
      .map((r: any) => ({
        id: r.id,
        pickupText: r.pickupText,
        destinationText: r.destinationText,
        status: r.status,
        estimatedFareZAR: Number(r.estimatedFareZAR || 0),
      }));
    cb(list);
  });
}

/* =========================================================
 * Optional utilities
 * =======================================================*/

export async function getDriverOnce(uid: string): Promise<DriverProfile | null> {
  const dref = doc(db, "drivers", uid);
  const snap = await getDoc(dref);
  if (!snap.exists()) return null;
  return { uid: snap.id, ...(snap.data() as any) } as DriverProfile;
}

/** Legacy flat fields updater (drivers/{uid}) */
export async function upsertDriverLocation(uid: string, lat: number, lng: number, heading?: number) {
  const dref = doc(db, "drivers", uid);
  await setDoc(
    dref,
    {
      lat,
      lng,
      ...(typeof heading === "number" ? { heading } : {}),
      online: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** Alternative nested location updater (drivers/{uid}.loc) */
export async function updateDriverLocation(
  uid: string,
  loc: { lat: number; lng: number; heading?: number }
) {
  const dref = doc(db, "drivers", uid);
  await updateDoc(dref, { loc, updatedAt: serverTimestamp() });
}

/** One-off query: all currently online drivers with lat/lng on drivers/{uid} */
export async function listNearbyOnlineDrivers(): Promise<OnlineDriver[]> {
  const driversRef = collection(db, "drivers");
  const qy = query(driversRef, where("online", "==", true));
  const snap = await getDocs(qy);
  return snap.docs
    .map((d) => {
      const data = d.data() as any;
      const lat = Number(data.lat);
      const lng = Number(data.lng);
      const heading = typeof data.heading === "number" ? data.heading : undefined;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { uid: d.id, lat, lng, heading } as OnlineDriver;
      }
      return null;
    })
    .filter(Boolean) as OnlineDriver[];
}

/* =========================================================
 * Upload helpers (driver application)
 * =======================================================*/

export async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return await res.blob();
}

async function uploadDriverFile(uid: string, type: "id" | "license" | "car", uri: string): Promise<string> {
  const blob = await uriToBlob(uri);
  const r = ref(storage, `driver_applications/${uid}/${type}.jpg`);
  await uploadBytes(r, blob);
  return await getDownloadURL(r);
}

export async function submitDriverApplication(args: {
  uid: string;
  fullName: string;
  idNumber: string;
  licenseNumber: string;
  car: CarInfo;
  idImageUri: string;
  licenseImageUri: string;
  carImageUri?: string;
}) {
  const idUrl = await uploadDriverFile(args.uid, "id", args.idImageUri);
  const licUrl = await uploadDriverFile(args.uid, "license", args.licenseImageUri);
  const carUrl = args.carImageUri ? await uploadDriverFile(args.uid, "car", args.carImageUri) : null;

  await setDoc(
    doc(db, "driver_applications", args.uid),
    {
      uid: args.uid,
      fullName: args.fullName,
      idNumber: args.idNumber,
      licenseNumber: args.licenseNumber,
      car: args.car,
      files: { idUrl, licenseUrl: licUrl, carUrl },
      status: "pending", // pending | approved | rejected
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    doc(db, "drivers", args.uid),
    {
      uid: args.uid,
      approved: false,
      online: false,
      rideType: "standard" as RideType,
      profile: { fullName: args.fullName, car: args.car },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
