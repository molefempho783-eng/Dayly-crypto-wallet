// Screens/ehailing/EhailingScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
  Platform,
  StyleSheet,
  Linking,
  ScrollView,
} from "react-native";
import MapView, {
  Marker,
  LatLng,
  Region,
  Polyline,
  PROVIDER_GOOGLE,
  Callout,
} from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { useTheme } from "../context/ThemeContext";
import createStyles, { BOTTOM_TAB_BAR_HEIGHT } from "../context/appStyles";

import { auth, db } from "../../firebaseConfig";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  limit,
  setDoc,
} from "firebase/firestore";

// Pricing/types from your types file
import { estimateFare, RideOption, RIDE_OPTIONS } from "../../types/ride";
// RideType + listeners from services
import {
  saveRide,
  listenRide,
  listenUserActiveRide,
  getRideOnce,
  type RideType,
} from "../../services/rides";

import {
  listenDriverProfile,
  setDriverOnline,
  listenOnlineDrivers,
  setDriverRideType,
  upsertDriverLive,
} from "../../services/drivers";
import { startRidePayment } from "../../services/payments";

/* ---------------------------------------------------
 * Local helpers & constants
 * --------------------------------------------------*/

type PlaceSuggestion = { place_id: string; description: string };

const { height, width } = Dimensions.get("window");

const DEFAULT_REGION: Region = {
  latitude: -26.2041,
  longitude: 28.0473,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const SHEET_HEIGHT_RATIO = 0.68;
const PEEK_HEIGHT = 56;

type DriverPin = {
  uid: string;
  lat: number;
  lng: number;
  heading?: number;
  rideType: RideType;
  displayName?: string;
  online?: boolean;
  occupied?: boolean;
  car?: { make?: string; model?: string; plate?: string; year?: string };
};

type DriverCandidate = DriverPin & { distanceKm: number };

const ACTIVE_DRIVER_STATUSES = ["driver_assigned", "driver_arrived", "on_trip"] as const;
type ActiveDriverStatus = (typeof ACTIVE_DRIVER_STATUSES)[number];

function normalizeDriver(raw: any): DriverPin | null {
  let lat: number | undefined;
  let lng: number | undefined;
  let heading: number | undefined;

  if (raw?.loc?.lat != null && raw?.loc?.lng != null) {
    lat = raw.loc.lat;
    lng = raw.loc.lng;
    heading = raw.loc.heading;
  } else if (raw?.location?.lat != null && raw?.location?.lng != null) {
    lat = raw.location.lat;
    lng = raw.location.lng;
    heading = raw.location.heading;
  } else if (raw?.lat != null && raw?.lng != null) {
    lat = raw.lat;
    lng = raw.lng;
    heading = raw.heading;
  } else if (raw?.coords?.latitude != null && raw?.coords?.longitude != null) {
    lat = raw.coords.latitude;
    lng = raw.coords.longitude;
    heading = raw.coords.heading;
  }
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const rt = String(raw?.rideType || "").toLowerCase();
  const rideType: RideType = rt === "comfort" || rt === "xl" ? (rt as RideType) : "standard";

  return {
    uid: raw?.uid || raw?.id || raw?.userId || String(Math.random()),
    lat,
    lng,
    heading,
    rideType,
    displayName: raw?.displayName || raw?.name,
    car: raw?.car,
    online: !!raw?.online,
    occupied: !!raw?.occupied,
  };
}

async function reverseGeocodeToText(coord: LatLng, apiKey?: string | null): Promise<string> {
  try {
    if (apiKey) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coord.latitude},${coord.longitude}&key=${apiKey}`;
      const res = await fetch(url);
      const json = await res.json();
      const formatted = json?.results?.[0]?.formatted_address;
      if (formatted) return formatted;
    }
  } catch {}
  try {
    const res = await Location.reverseGeocodeAsync(coord);
    const g = res?.[0];
    const parts = [g?.name || g?.street || "", g?.subregion || g?.city || "", g?.region || "", g?.postalCode || ""]
      .filter(Boolean)
      .join(", ");
    return parts || "Pinned location";
  } catch {
    return "Pinned location";
  }
}

function haversine(a: LatLng, b: LatLng) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const A =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A)));
}

// Straight-line fallback polyline generator
function straightLine(a: LatLng, b: LatLng, n = 24): Array<LatLng> {
  return Array.from({ length: n + 1 }, (_, i) => ({
    latitude: a.latitude + (b.latitude - a.latitude) * (i / n),
    longitude: a.longitude + (b.longitude - a.longitude) * (i / n),
  }));
}

// Minimal type for MapViewDirections onReady payload
type DirectionsResult = {
  coordinates: Array<{ latitude: number; longitude: number }>;
  distance?: number;
  duration?: number;
};

/* ---------------------------------------------------
 * Component
 * --------------------------------------------------*/
const EhailingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, theme } = useTheme();
  const styles = createStyles(colors).ehailingScreen;
  const insets = useSafeAreaInsets();

  const mapRef = useRef<MapView | null>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);

  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupCoord, setPickupCoord] = useState<LatLng | null>(null);
  const [destCoord, setDestCoord] = useState<LatLng | null>(null);

  const [pickupSug, setPickupSug] = useState<PlaceSuggestion[]>([]);
  const [destSug, setDestSug] = useState<PlaceSuggestion[]>([]);
  const [showPickupSug, setShowPickupSug] = useState(false);
  const [showDestSug, setShowDestSug] = useState(false);

  const [selectedRide, setSelectedRide] = useState<RideOption | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Tabs: driver-only users -> show only "driver"; otherwise "rider" + "myrides"
  const [tab, setTab] = useState<"rider" | "driver" | "myrides">("rider");

  const [driverProfile, setDriverProfile] = useState<{
    approved: boolean;
    online: boolean;
    rideType?: RideType;
    profile?: { fullName?: string; car?: { make?: string; model?: string; plate?: string; year?: string } };
  } | null>(null);

  // Driver lists
  const [incoming, setIncoming] = useState<
    Array<{
      id: string;
      pickupText: string;
      destinationText: string;
      estimatedFareZAR: number;
      riderName?: string;
    }>
  >([]);

  const [driverActive, setDriverActive] = useState<
    Array<{ id: string; pickupText: string; destinationText: string; status: ActiveDriverStatus; estimatedFareZAR: number }>
  >([]);
  const [driverHistory, setDriverHistory] = useState<
    Array<{ id: string; pickupText: string; destinationText: string; status: string; estimatedFareZAR: number; createdAt?: any }>
  >([]);

  const [onlineDrivers, setOnlineDrivers] = useState<DriverPin[]>([]);

  // Fallback route if Directions API fails
  const [fallbackRoute, setFallbackRoute] = useState<Array<LatLng> | null>(null);

  // Choose-driver overlay
  const [choosingDriver, setChoosingDriver] = useState(false);
  const [candidates, setCandidates] = useState<DriverCandidate[]>([]);
  const [picking, setPicking] = useState<string | null>(null);

  // Driver location watcher + last known coord
  const driverWatchRef = useRef<Location.LocationSubscription | null>(null);
  const [myDriverCoord, setMyDriverCoord] = useState<LatLng | null>(null);
  const pingErrorCount = useRef(0);

  // Drawer + sheet
  const DRAWER_W = Math.min(320, Math.round(0.82 * width));
  const drawerX = useRef(new Animated.Value(-DRAWER_W)).current;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const SHEET_HEIGHT = Math.round(height * SHEET_HEIGHT_RATIO);
  const bottomOffset = BOTTOM_TAB_BAR_HEIGHT;
  const COLLAPSED_TRANSLATE = SHEET_HEIGHT - PEEK_HEIGHT;
  const sheetAnim = useRef(new Animated.Value(COLLAPSED_TRANSLATE)).current;
  const [isExpanded, setIsExpanded] = useState(false);
  const startYRef = useRef(0);

  const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  const typeColor: Record<RideType, string> = {
    standard: "#03DAC6",
    comfort: "#3F51B5",
    xl: "#FF9800",
  };

  // Notifications permission
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
          await Notifications.requestPermissionsAsync();
        }
      } catch {}
    })();
  }, []);

  // initial locate
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      const next: Region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      };
      setRegion(next);
      const coord = { latitude: next.latitude, longitude: next.longitude };
      setPickupCoord(coord);
      setPickup("Fetching address…");
      setPickup(await reverseGeocodeToText(coord, GOOGLE_KEY));
      mapRef.current?.animateToRegion(next, 750);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update pickup text when coord moves
  useEffect(() => {
    (async () => {
      if (!pickupCoord) return;
      setPickup("Fetching address…");
      setPickup(await reverseGeocodeToText(pickupCoord, GOOGLE_KEY));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupCoord?.latitude, pickupCoord?.longitude]);

  // driver profile (approved/online/rideType)
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const off1 = listenDriverProfile(uid, (p) => {
      const rideType: RideType = (p?.rideType as RideType) || "standard";
      setDriverProfile((prev) => ({
        approved: !!p?.approved,
        online: !!p?.online,
        rideType,
        profile: prev?.profile,
      }));
      if (!p?.approved && tab !== "rider") setTab("rider");
    });
    const off2 = onSnapshot(doc(db, "drivers", uid), (snap) => {
      const d = snap.data() as any;
      setDriverProfile((prev) => ({
        approved: !!(prev?.approved ?? d?.approved),
        online: !!(prev?.online ?? d?.online),
        rideType:
          (prev?.rideType as RideType) ??
          ((d?.rideType === "comfort" || d?.rideType === "xl") ? d.rideType : "standard"),
        profile: d?.profile,
      }));
    });
    return () => {
      off1 && off1();
      off2 && off2();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==== Driver queries: incoming (targeted), assigned->active/history ====
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Incoming targeted requests
    const qIncoming = query(
      collection(db, "rides"),
      where("driverPreferred.id", "==", uid),
      where("status", "==", "driver_requested")
    );
    const unsubIncoming = onSnapshot(qIncoming, (snap) => {
      const list = snap.docs.map((d) => {
        const r = d.data() as any;
        return {
          id: d.id,
          pickupText: r.pickupText,
          destinationText: r.destinationText,
          estimatedFareZAR: Number(r.estimatedFareZAR || 0),
          riderName: r.riderName || r.userName || r.userId,
        };
      });
      setIncoming(list);
    });

    // Assigned to me: filter client-side into active vs history
    const qAssigned = query(
      collection(db, "rides"),
      where("driver.id", "==", uid),
      orderBy("createdAt", "desc"),
      limit(40)
    );
    const unsubAssigned = onSnapshot(qAssigned, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const active = all
        .filter((r) => ACTIVE_DRIVER_STATUSES.includes(r.status))
        .map((r) => ({
          id: r.id,
          pickupText: r.pickupText,
          destinationText: r.destinationText,
          status: r.status as ActiveDriverStatus,
          estimatedFareZAR: Number(r.estimatedFareZAR || 0),
        }));
      const history = all
        .filter((r) => r.status === "completed" || r.status === "cancelled")
        .map((r) => ({
          id: r.id,
          pickupText: r.pickupText,
          destinationText: r.destinationText,
          status: r.status,
          estimatedFareZAR: Number(r.estimatedFareZAR || 0),
          createdAt: r.createdAt,
        }));
      setDriverActive(active);
      setDriverHistory(history);
    });

    return () => {
      unsubIncoming();
      unsubAssigned();
    };
  }, []);

  // live pings for approved+online drivers
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    async function startDriverPings(userId: string) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location", "Grant location permission to go online.");
        return;
      }
      driverWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 4000,
          distanceInterval: 15,
        },
        async (pos) => {
          try {
            setMyDriverCoord({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            await upsertDriverLive(userId, {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              heading: pos.coords.heading ?? 0,
              rideType: (driverProfile?.rideType as RideType) ?? "standard",
              displayName:
                driverProfile?.profile?.fullName ||
                auth.currentUser?.displayName ||
                auth.currentUser?.email?.split("@")[0] ||
                userId,
              // keep car shape minimal to satisfy typing in drivers_live
              car: { plate: driverProfile?.profile?.car?.plate ?? null },
              online: true,
            });
            pingErrorCount.current = 0;
          } catch (e) {
            pingErrorCount.current += 1;
            if (pingErrorCount.current <= 3) console.log("live ping failed:", e);
          }
        }
      );
    }

    function stopDriverPings() {
      driverWatchRef.current?.remove();
      driverWatchRef.current = null;
    }

    if (driverProfile?.approved && driverProfile.online) {
      startDriverPings(uid);
    } else {
      stopDriverPings();
      upsertDriverLive(uid, { online: false }).catch(() => {});
    }

    return () => {
      driverWatchRef.current?.remove();
      driverWatchRef.current = null;
    };
  }, [
    driverProfile?.approved,
    driverProfile?.online,
    driverProfile?.rideType,
    driverProfile?.profile?.fullName,
    driverProfile?.profile?.car?.plate,
  ]);

  // show all online drivers for rider map
  useEffect(() => {
    const unsub = listenOnlineDrivers((raw: any[]) => {
      const pins = (raw || []).map(normalizeDriver).filter(Boolean) as DriverPin[];
      setOnlineDrivers(pins);
    });
    return unsub;
  }, []);

  // places autocomplete
  async function fetchSuggestions(text: string): Promise<PlaceSuggestion[]> {
    const key = GOOGLE_KEY;
    if (!key || !text.trim()) return [];
    const url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${key}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      return (data?.predictions || []).map((p: any) => ({ place_id: p.place_id, description: p.description }));
    } catch {
      return [];
    }
  }
  async function getPlaceLatLng(place_id: string): Promise<LatLng | null> {
    const key = GOOGLE_KEY;
    if (!key) return null;
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&key=${key}`;
      const res = await fetch(url);
      const data = await res.json();
      const loc = data?.result?.geometry?.location;
      if (!loc) return null;
      return { latitude: loc.lat, longitude: loc.lng };
    } catch {
      return null;
    }
  }

  const onPickupChange = async (txt: string) => {
    setPickup(txt);
    setShowPickupSug(true);
    setShowDestSug(false);
    setPickupSug(await fetchSuggestions(txt));
  };
  const onDestChange = async (txt: string) => {
    setDestination(txt);
    setShowDestSug(true);
    setShowPickupSug(false);
    setDestSug(await fetchSuggestions(txt));
  };
  const selectPickupSuggestion = async (s: PlaceSuggestion) => {
    setPickup(s.description);
    setShowPickupSug(false);
    const coord = await getPlaceLatLng(s.place_id);
    if (coord) {
      setPickupCoord(coord);
      centerOn(coord);
    }
  };
  const selectDestSuggestion = async (s: PlaceSuggestion) => {
    setDestination(s.description);
    setShowDestSug(false);
    const coord = await getPlaceLatLng(s.place_id);
    if (coord) {
      setDestCoord(coord);
      centerOn(coord);
    }
  };

  const onLongPress = (e: any) => {
    const coord: LatLng = e.nativeEvent.coordinate;
    if (!pickupCoord) setPickupCoord(coord);
    else if (!destCoord) setDestCoord(coord);
    else setDestCoord(coord);
  };
  const centerOn = (coord: LatLng | null) => {
    if (!coord) return;
    mapRef.current?.animateToRegion({ ...region, latitude: coord.latitude, longitude: coord.longitude }, 600);
  };

  const distanceKm = useMemo(() => {
    if (!pickupCoord || !destCoord) return 0;
    return +haversine(pickupCoord, destCoord).toFixed(2);
  }, [pickupCoord, destCoord]);

  const estimatedFare = useMemo(() => {
    if (!selectedRide) return 0;
    return estimateFare(distanceKm, selectedRide.multiplier);
  }, [distanceKm, selectedRide]);

  const canConfirm = !!pickupCoord && !!destCoord && !!selectedRide && !submitting;

  // Build nearby list for choose-driver overlay
  useEffect(() => {
    if (!choosingDriver || !pickupCoord || !selectedRide) return;
    const want = selectedRide.id as RideType;
    const list = onlineDrivers
      .filter((d) => d.online)
      .map((d) => ({
        ...d,
        distanceKm: haversine(pickupCoord, { latitude: d.lat, longitude: d.lng }),
      }))
      .filter((d) => d.distanceKm <= 10)
      .sort(
        (a, b) =>
          (a.rideType === want ? 0 : 1) - (b.rideType === want ? 0 : 1) || a.distanceKm - b.distanceKm
      ) as DriverCandidate[];
    setCandidates(list);
  }, [choosingDriver, onlineDrivers, pickupCoord?.latitude, pickupCoord?.longitude, selectedRide?.id]);

  // Rider: notify when driver arrives
  const notifiedArrivals = useRef<Set<string>>(new Set());
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const off = listenUserActiveRide(uid, async (ride) => {
      if (ride && ride.status === "driver_arrived" && !notifiedArrivals.current.has(ride.id)) {
        notifiedArrivals.current.add(ride.id);
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Your driver has arrived",
              body: `Trip: ${ride.pickupText} → ${ride.destinationText}`,
            },
            trigger: null,
          });
        } catch {}
        Alert.alert("Driver arrived", "Your driver is outside.");
      }
    });
    return off;
  }, []);

  async function onConfirmRide() {
    try {
      if (!auth.currentUser) {
        Alert.alert("Login required", "Please sign in to request a ride.");
        return;
      }
      if (!canConfirm) return;
      setChoosingDriver(true);
      setIsExpanded(false);
      Animated.spring(sheetAnim, {
        toValue: COLLAPSED_TRANSLATE,
        useNativeDriver: true,
        bounciness: 0,
        speed: 16,
      }).start();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not create ride.");
    }
  }

  async function pickDriverAndCreateRide(driver: DriverCandidate) {
    try {
      setPicking(driver.uid);
      if (!auth.currentUser || !pickupCoord || !destCoord || !selectedRide) return;

      const riderName =
        auth.currentUser.displayName || auth.currentUser.email?.split("@")[0] || "Rider";

      const rideId = await saveRide({
        userId: auth.currentUser.uid,
        riderName,
        pickupText: pickup.trim() || "Pinned location",
        destinationText: destination.trim() || "Pinned location",
        distanceKm,
        estimatedFareZAR: estimatedFare,
        rideType: selectedRide.id as RideType,
        pickupLat: pickupCoord.latitude,
        pickupLng: pickupCoord.longitude,
        destinationLat: destCoord.latitude,
        destinationLng: destCoord.longitude,
        driverPreferred: {
          id: driver.uid,
          name: driver.displayName || "Driver",
          car: {
            make: driver.car?.make || "",
            model: driver.car?.model || "",
            plate: driver.car?.plate || "",
            year: driver.car?.year || "",
          },
          rideType: driver.rideType,
        },
        initialStatus: "driver_requested",
      });

      // Optional: watch for accept
      const stop = listenRide(rideId, (r) => {
        if (!r) return;
        if (r.status === "driver_assigned" || r.status === "on_trip") {
          stop();
        }
      });

      setChoosingDriver(false);
      Alert.alert("Ride requested", "We’ve notified your chosen driver.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not create ride.");
    } finally {
      setPicking(null);
    }
  }

  // Driver busy flag in drivers_live (occupied) — idempotent
  async function setDriverBusy(busy: boolean) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await setDoc(doc(db, "drivers_live", uid), { occupied: !!busy }, { merge: true });
    } catch {}
  }

  // Rider taps “Mark Complete” -> run payment flow, free driver on success
  const riderMarkComplete = async (rideId: string) => {
    try {
      const ride = await getRideOnce(rideId);
      if (!ride) {
        Alert.alert("Error", "Ride not found.");
        return;
      }
      if (ride.status !== "on_trip") {
        Alert.alert("Hold on", "You can only complete a trip that is in progress.");
        return;
      }

      const res = await startRidePayment({
        rideId,
        amountZAR: Number(ride.estimatedFareZAR || 0),
        deepLinks: {
          returnUrl: "dsquare://paypal-return",
          cancelUrl: "dsquare://paypal-cancel",
        },
      });

      if (res.status === "PAID") {
        await setDriverBusy(false); // ✅ free the driver on confirmed payment
        Alert.alert("Done", "Trip completed and driver paid.");
        return;
      }

      if (res.status === "NEED_TOP_UP") {
        navigation.navigate("PayPalWebView", { orderId: res.orderId, url: res.approveUrl });
        return;
      }

      Alert.alert("Error", "Unexpected payment status.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not complete ride.");
    }
  };

  // If you keep a separate helper, make sure signature includes amount
  const handleComplete = async (rideId: string, amountZAR: number) => {
    const res = await startRidePayment({
      rideId,
      amountZAR,
      deepLinks: { returnUrl: "dsquare://paypal-return", cancelUrl: "dsquare://paypal-cancel" },
    });
    if (res.status === "PAID") {
      await setDriverBusy(false);
      Alert.alert("Done", "Trip completed and driver paid.");
    } else if (res.status === "NEED_TOP_UP") {
      navigation.navigate("PayPalWebView", { orderId: res.orderId, url: res.approveUrl });
    }
  };

  // Rider can cancel before driver arrives (requested/driver_requested/driver_assigned)
  const riderCancelRide = async (rideId: string) => {
    try {
      await updateDoc(doc(db, "rides", rideId), {
        status: "cancelled",
        updatedAt: serverTimestamp(),
      });
      await setDriverBusy(false); // free driver if this was the active one
      Alert.alert("Ride cancelled", "Your ride was cancelled.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not cancel ride.");
    }
  };

  // 🔁 SAFETY NET: Reconcile occupied with real-time active list
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const busy = driverActive.length > 0;
    setDoc(doc(db, "drivers_live", uid), { occupied: busy }, { merge: true }).catch(() => {});
  }, [driverActive.length]);

  // Driver toggles online — going offline should clear occupied
  const toggleOnline = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !driverProfile) return;
    try {
      const next = !driverProfile.online;
      await setDriverOnline(uid, next);
      if (!next) {
        await setDriverBusy(false); // ensure cleared on offline
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not update status.");
    }
  };

  // Sheet drag (attach pan handlers only to the handle for better scroll)
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const getSheetValue = () => {
    const anyAnim = sheetAnim as any;
    if (typeof anyAnim.__getValue === "function") return anyAnim.__getValue();
    if (typeof anyAnim._value === "number") return anyAnim._value;
    return 0;
    };
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6,
      onPanResponderGrant: () => {
        startYRef.current = getSheetValue();
      },
      onPanResponderMove: (_e, g) => {
        sheetAnim.setValue(clamp(startYRef.current + g.dy, 0, COLLAPSED_TRANSLATE));
      },
      onPanResponderRelease: (_e, g) => {
        const cur = getSheetValue();
        const shouldExpand = g.vy < 0 || cur < COLLAPSED_TRANSLATE * 0.5;
        Animated.spring(sheetAnim, {
          toValue: shouldExpand ? 0 : COLLAPSED_TRANSLATE,
          useNativeDriver: true,
          bounciness: 0,
          speed: 16,
        }).start(() => setIsExpanded(shouldExpand));
      },
      onPanResponderTerminate: () => {
        Animated.spring(sheetAnim, {
          toValue: isExpanded ? 0 : COLLAPSED_TRANSLATE,
          useNativeDriver: true,
          bounciness: 0,
          speed: 16,
        }).start();
      },
    })
  ).current;

  // Drawer helpers
  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.timing(drawerX, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  };
  const closeDrawer = () => {
    Animated.timing(drawerX, { toValue: -DRAWER_W, duration: 200, useNativeDriver: true }).start(() =>
      setDrawerOpen(false)
    );
  };
  const expandSheet = () => {
    Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 16 }).start(() =>
      setIsExpanded(true)
    );
  };

  const TabButton = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 10,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? colors.primary : colors.cardBackground,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.borderColor,
        marginHorizontal: 4,
      }}
    >
      <Text style={{ fontWeight: "700", color: active ? "#fff" : colors.textPrimary }}>{label}</Text>
    </TouchableOpacity>
  );

  // Map pins: hide own car when on Driver tab
  const currentUid = auth.currentUser?.uid;
  const visibleDriversOnMap =
    tab === "driver" ? onlineDrivers.filter((d) => d.uid !== currentUid) : onlineDrivers;

  // Tabs rendering logic
  const showDriverTab = !!driverProfile?.approved;
  const renderTabs = () => {
    if (showDriverTab) {
      return (
        <View style={{ flexDirection: "row", paddingHorizontal: 12, paddingVertical: 4 }}>
          <TabButton label="Driver" active={tab === "driver"} onPress={() => setTab("driver")} />
        </View>
      );
    }
    return (
      <View style={{ flexDirection: "row", paddingHorizontal: 12, paddingVertical: 4 }}>
        <TabButton label="Rider" active={tab === "rider"} onPress={() => setTab("rider")} />
        <TabButton label="My Rides" active={tab === "myrides"} onPress={() => setTab("myrides")} />
      </View>
    );
  };

  /* ---------------------------------------------------
   * UI
   * --------------------------------------------------*/
  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={{ flex: 1 }}>
        <MapView
          ref={(r) => {
            mapRef.current = r;
          }}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
          onLongPress={onLongPress}
          showsUserLocation
          showsCompass
          showsMyLocationButton
        >
          {tab !== "driver" && pickupCoord && <Marker coordinate={pickupCoord} title="Pickup" pinColor="#2E7D32" />}
          {tab !== "driver" && destCoord && <Marker coordinate={destCoord} title="Destination" pinColor="#B00020" />}

          {/* Directions overlay (uses Google Directions API) */}
          {pickupCoord && destCoord && (
            <MapViewDirections
              origin={pickupCoord}
              destination={destCoord}
              apikey={GOOGLE_KEY || ""}
              mode="DRIVING"
              strokeWidth={6}
              strokeColor={colors.primary}
              onReady={(result: DirectionsResult) => {
                // clear any previous fallback
                setFallbackRoute(null);
                if (result?.coordinates?.length && mapRef.current) {
                  mapRef.current.fitToCoordinates(result.coordinates, {
                    edgePadding: { top: 80, right: 80, bottom: bottomOffset + 180, left: 80 },
                    animated: true,
                  });
                }
              }}
              onError={(err: unknown) => {
                console.warn("[Directions] error", err);
                // draw a straight line fallback
                if (pickupCoord && destCoord) {
                  setFallbackRoute(straightLine(pickupCoord, destCoord, 24));
                }
              }}
            />
          )}

          {/* Fallback straight line if Directions API fails */}
          {fallbackRoute && (
            <Polyline coordinates={fallbackRoute} strokeWidth={6} strokeColor={colors.primary} />
          )}

          {visibleDriversOnMap.map((d) => (
            <Marker
              key={d.uid}
              coordinate={{ latitude: d.lat, longitude: d.lng }}
              title={d.displayName || "Driver"}
              description={`${d.rideType.toUpperCase()}${d.occupied ? " • Occupied" : ""}`}
              flat
              rotation={d.heading ?? 0}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: d.occupied ? "#9E9E9E" : typeColor[d.rideType],
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "#ffffff",
                  opacity: d.occupied ? 0.85 : 1,
                }}
              >
                <Text style={{ fontWeight: "800" }}>🚗</Text>
              </View>
              <Callout>
                <View style={{ minWidth: 170 }}>
                  <Text style={{ fontWeight: "700" }}>{d.displayName || "Driver"}</Text>
                  <Text>Type: {d.rideType}</Text>
                  {d.car?.make || d.car?.model ? (
                    <Text>{[d.car?.make, d.car?.model].filter(Boolean).join(" ")}</Text>
                  ) : null}
                  {d.car?.plate ? <Text>Plate: {d.car.plate}</Text> : null}
                  {d.occupied ? <Text style={{ color: "#D32F2F", fontWeight: "700" }}>Occupied</Text> : null}
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>

        {/* Legend */}
        <View
          style={{
            position: "absolute",
            left: 12,
            bottom: BOTTOM_TAB_BAR_HEIGHT + 12,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.borderColor,
          }}
        >
          {(["standard", "comfort", "xl"] as RideType[]).map((t) => (
            <View key={t} style={{ flexDirection: "row", alignItems: "center", marginVertical: 2 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: typeColor[t], marginRight: 8 }} />
              <Text style={{ color: colors.textPrimary, textTransform: "capitalize" }}>{t}</Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#9E9E9E", marginRight: 8 }} />
            <Text style={{ color: colors.textPrimary }}>Occupied</Text>
          </View>
        </View>

        {/* Top bar */}
        <View
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            top: insets.top + 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: colors.cardBackground,
            borderRadius: 14,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: colors.borderColor,
          }}
        >
          <TouchableOpacity onPress={openDrawer} style={{ padding: 6 }}>
            <Ionicons name="menu" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontWeight: "700", color: colors.textPrimary }}>E-Hailing</Text>
          <TouchableOpacity onPress={() => centerOn(pickupCoord)} style={{ padding: 6 }}>
            <Ionicons name="locate-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Drawer */}
        {drawerOpen && (
          <Pressable
            onPress={closeDrawer}
            style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" }}
          />
        )}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: DRAWER_W,
            transform: [{ translateX: drawerX }],
            backgroundColor: colors.cardBackground,
            borderRightWidth: 1,
            borderColor: colors.borderColor,
            paddingTop: insets.top + 10,
            paddingHorizontal: 14,
            zIndex: 50,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
            <TouchableOpacity onPress={closeDrawer} style={{ padding: 6, marginRight: 8 }}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={{ fontWeight: "800", fontSize: 16, color: colors.textPrimary }}>Menu</Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              closeDrawer();
              navigation.navigate("BeADriverScreen");
            }}
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12 }}
          >
            <Ionicons name="car-outline" size={20} color={colors.textPrimary} />
            <Text style={{ marginLeft: 10, color: colors.textPrimary, fontWeight: "600" }}>Become a Driver</Text>
          </TouchableOpacity>

          {driverProfile?.approved ? (
            <TouchableOpacity
              onPress={() => {
                closeDrawer();
                setTab("driver");
                expandSheet();
              }}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12 }}
            >
              <Ionicons name="speedometer-outline" size={20} color={colors.textPrimary} />
              <Text style={{ marginLeft: 10, color: colors.textPrimary, fontWeight: "600" }}>
                Driver Dashboard
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={() => {
              closeDrawer();
              setTab("rider");
              expandSheet();
            }}
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12 }}
          >
            <Ionicons name="map-outline" size={20} color={colors.textPrimary} />
            <Text style={{ marginLeft: 10, color: colors.textPrimary, fontWeight: "600" }}>Book a Ride</Text>
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: colors.borderColor, marginVertical: 8 }} />

          <TouchableOpacity
            onPress={() => {
              closeDrawer();
              navigation.navigate("WalletScreen");
            }}
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12 }}
          >
            <Ionicons name="wallet-outline" size={20} color={colors.textPrimary} />
            <Text style={{ marginLeft: 10, color: colors.textPrimary, fontWeight: "600" }}>Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              closeDrawer();
              Alert.alert("Help", "Support and FAQs coming soon.");
            }}
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12 }}
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.textPrimary} />
            <Text style={{ marginLeft: 10, color: colors.textPrimary, fontWeight: "600" }}>Help</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom Sheet (NO pan handlers here) */}
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: bottomOffset,
            height: SHEET_HEIGHT,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.borderColor,
            transform: [
              {
                translateY: sheetAnim.interpolate({
                  inputRange: [0, COLLAPSED_TRANSLATE],
                  outputRange: [0, COLLAPSED_TRANSLATE],
                  extrapolate: "clamp",
                }),
              },
            ],
            overflow: "hidden",
          }}
        >
          {/* Handle (YES pan handlers here) */}
          <View {...panResponder.panHandlers} style={{ alignItems: "center", paddingTop: 8, paddingBottom: 6 }}>
            <View
              style={{
                width: 44,
                height: 5,
                borderRadius: 999,
                backgroundColor: theme === "dark" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)",
              }}
            />
          </View>

          {/* Tabs */}
          {renderTabs()}

          {/* ===== Rider sheet ===== */}
          {tab === "rider" && !showDriverTab && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 }}>
              {/* Pickup */}
              <View style={[styles.inputContainer, { marginBottom: 8 }]}>
                <Ionicons name="location-outline" size={18} color={colors.textPrimary} />
                <TextInput
                  style={[styles.input, { paddingVertical: Platform.OS === "ios" ? 10 : 6 }]}
                  placeholder="Pickup address or long-press map"
                  placeholderTextColor={colors.placeholderText}
                  value={pickup}
                  onChangeText={onPickupChange}
                  returnKeyType="search"
                  onFocus={() => {
                    setShowPickupSug(true);
                    setShowDestSug(false);
                  }}
                />
                <TouchableOpacity onPress={() => setShowPickupSug((s) => !s)}>
                  <Ionicons name="search" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              {showPickupSug && pickupSug.length > 0 && (
                <FlatList
                  data={pickupSug}
                  keyExtractor={(i) => i.place_id}
                  style={{
                    maxHeight: 160,
                    backgroundColor: colors.cardBackground,
                    borderWidth: 1,
                    borderColor: colors.borderColor,
                    borderRadius: 10,
                    marginBottom: 8,
                  }}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => selectPickupSuggestion(item)} style={{ padding: 10 }}>
                      <Text style={{ color: colors.textPrimary }}>{item.description}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}

              {/* Destination */}
              <View style={[styles.inputContainer, { marginBottom: 8 }]}>
                <Ionicons name="flag-outline" size={18} color={colors.textPrimary} />
                <TextInput
                  style={[styles.input, { paddingVertical: Platform.OS === "ios" ? 10 : 6 }]}
                  placeholder="Destination address or long-press map"
                  placeholderTextColor={colors.placeholderText}
                  value={destination}
                  onChangeText={onDestChange}
                  returnKeyType="search"
                  onFocus={() => {
                    setShowDestSug(true);
                    setShowPickupSug(false);
                  }}
                />
                <TouchableOpacity onPress={() => setShowDestSug((s) => !s)}>
                  <Ionicons name="search" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              {showDestSug && destSug.length > 0 && (
                <FlatList
                  data={destSug}
                  keyExtractor={(i) => i.place_id}
                  style={{
                    maxHeight: 160,
                    backgroundColor: colors.cardBackground,
                    borderWidth: 1,
                    borderColor: colors.borderColor,
                    borderRadius: 10,
                    marginBottom: 8,
                  }}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => selectDestSuggestion(item)} style={{ padding: 10 }}>
                      <Text style={{ color: colors.textPrimary }}>{item.description}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}

              {/* Ride type */}
              <Text style={styles.subtitle}>Select Ride</Text>
              <FlatList
                data={RIDE_OPTIONS}
                keyExtractor={(i) => i.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 2 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.cardLarge, selectedRide?.id === item.id && styles.cardSelected]}
                    onPress={() => setSelectedRide(item)}
                  >
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardMeta}>
                      {item.base} base • {item.perKm}/km
                    </Text>
                  </TouchableOpacity>
                )}
              />

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={{ color: colors.textSecondary }}>Distance: {distanceKm} km</Text>
                <Text style={{ color: colors.textSecondary }}>Est. Fare: R{estimatedFare.toFixed(2)}</Text>
              </View>

              <TouchableOpacity style={[styles.button, !canConfirm && styles.buttonDisabled]} disabled={!canConfirm} onPress={onConfirmRide}>
                <Text style={styles.buttonText}>{submitting ? "Processing..." : `Confirm ${selectedRide?.name ?? ""}`}</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ===== My Rides (rider) ===== */}
          {tab === "myrides" && !showDriverTab && (
            <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 8 }}>
              <RiderMyRidesSection colors={colors} onMarkComplete={riderMarkComplete} onCancel={riderCancelRide} />
            </View>
          )}

          {/* ===== Driver sheet ===== */}
          {tab === "driver" && showDriverTab && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 }}>
              {/* header + toggle */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={styles.subtitle}>{driverProfile?.approved ? "Driver (Approved)" : "Driver"}</Text>
                {driverProfile?.approved && (
                  <TouchableOpacity
                    onPress={toggleOnline}
                    style={[
                      styles.smallPill,
                      {
                        backgroundColor: driverProfile.online ? colors.primary : colors.cardBackground,
                        borderColor: driverProfile.online ? colors.primary : colors.borderColor,
                      },
                    ]}
                  >
                    <Text style={{ color: driverProfile.online ? "#fff" : colors.textPrimary, fontWeight: "700" }}>
                      {driverProfile.online ? "Online" : "Offline"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* car type */}
              {driverProfile?.approved && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>Your car type</Text>
                  <View style={{ flexDirection: "row" }}>
                    {(["standard", "comfort", "xl"] as RideType[]).map((t) => {
                      const active = (driverProfile?.rideType || "standard") === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          onPress={async () => {
                            const uid = auth.currentUser?.uid;
                            if (!uid) return;
                            try {
                              await setDriverRideType(uid, t);
                              setDriverProfile((p) => (p ? { ...p, rideType: t } : p));
                            } catch (e: any) {
                              Alert.alert("Error", e?.message ?? "Could not set car type.");
                            }
                          }}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: active ? colors.primary : colors.cardBackground,
                            borderWidth: 1,
                            borderColor: active ? colors.primary : colors.borderColor,
                            marginRight: 6,
                          }}
                        >
                          <Text style={{ fontWeight: "700", color: active ? "#fff" : colors.textPrimary }}>
                            {t.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Incoming (Targeted) */}
              {driverProfile?.approved && incoming.length > 0 && (
                <>
                  <Text style={[styles.subtitle, { marginTop: 6 }]}>Incoming (Targeted)</Text>
                  <FlatList
                    data={incoming}
                    keyExtractor={(i) => i.id}
                    contentContainerStyle={{ paddingBottom: 8 }}
                    renderItem={({ item }) => (
                      <View
                        style={{
                          backgroundColor: colors.cardBackground,
                          borderWidth: 1,
                          borderColor: colors.borderColor,
                          borderRadius: 12,
                          padding: 12,
                          marginTop: 8,
                        }}
                      >
                        <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>{item.riderName ?? "Rider"}</Text>
                        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                          {item.pickupText} → {item.destinationText}
                        </Text>
                        <View style={{ flexDirection: "row", marginTop: 10 }}>
                          <TouchableOpacity
                            style={[styles.button, { flex: 1, marginRight: 8 }]}
                            onPress={async () => {
                              try {
                                const uid = auth.currentUser?.uid!;
                                await updateDoc(doc(db, "rides", item.id), {
                                  status: "driver_assigned",
                                  driver: {
                                    id: uid,
                                    name:
                                      driverProfile?.profile?.fullName ||
                                      auth.currentUser?.displayName ||
                                      auth.currentUser?.email?.split("@")[0] ||
                                      "Driver",
                                    car: driverProfile?.profile?.car || null,
                                    rideType: (driverProfile?.rideType as RideType) || "standard",
                                  },
                                  updatedAt: serverTimestamp(),
                                });
                                await setDriverBusy(true); // now busy
                              } catch (e: any) {
                                Alert.alert("Error", e?.message ?? "Could not accept.");
                              }
                            }}
                          >
                            <Text style={styles.buttonText}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.button, { flex: 1 }]}
                            onPress={async () => {
                              try {
                                await updateDoc(doc(db, "rides", item.id), {
                                  status: "driver_declined",
                                  driverPreferred: null,
                                  updatedAt: serverTimestamp(),
                                });
                              } catch (e: any) {
                                Alert.alert("Error", e?.message ?? "Could not decline.");
                              }
                            }}
                          >
                            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  />
                </>
              )}

              {/* Active */}
              <Text style={[styles.subtitle, { marginTop: 6 }]}>Active</Text>
              <FlatList
                data={driverActive}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{ paddingBottom: 12 }}
                renderItem={({ item }) => {
                  const status = item.status;
                  const showArrived = status === "driver_assigned";
                  const showStartTrip = status === "driver_arrived";
                  const onTrip = status === "on_trip";
                  return (
                    <View
                      style={{
                        backgroundColor: colors.cardBackground,
                        borderWidth: 1,
                        borderColor: colors.borderColor,
                        borderRadius: 12,
                        padding: 12,
                        marginTop: 8,
                      }}
                    >
                      <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>
                        {item.pickupText} → {item.destinationText}
                      </Text>
                      <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                        {status.replace("_", " ")} • R{Number(item.estimatedFareZAR).toFixed(2)}
                      </Text>

                      <View style={{ flexDirection: "row", marginTop: 10 }}>
                        {showArrived && (
                          <TouchableOpacity
                            style={[styles.button, { flex: 1, marginRight: 8 }]}
                            onPress={async () => {
                              try {
                                await updateDoc(doc(db, "rides", item.id), {
                                  status: "driver_arrived",
                                  updatedAt: serverTimestamp(),
                                });
                              } catch (e: any) {
                                Alert.alert("Error", e?.message ?? "Could not set arrived.");
                              }
                            }}
                          >
                            <Text style={styles.buttonText}>Arrived</Text>
                          </TouchableOpacity>
                        )}
                        {showStartTrip && (
                          <TouchableOpacity
                            style={[styles.button, { flex: 1 }]}
                            onPress={async () => {
                              try {
                                await updateDoc(doc(db, "rides", item.id), {
                                  status: "on_trip",
                                  updatedAt: serverTimestamp(),
                                });
                              } catch (e: any) {
                                Alert.alert("Error", e?.message ?? "Could not start trip.");
                              }
                            }}
                          >
                            <Text style={styles.buttonText}>Start Trip</Text>
                          </TouchableOpacity>
                        )}
                        {onTrip && (
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.textSecondary, textAlign: "center", paddingVertical: 12 }}>
                              On Trip…
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <Text style={{ color: colors.textSecondary, marginTop: 6 }}>No active trips.</Text>
                }
              />

              {/* History */}
              <Text style={[styles.subtitle, { marginTop: 12 }]}>History</Text>
              <FlatList
                data={driverHistory}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{ paddingBottom: 12 }}
                renderItem={({ item }) => (
                  <View
                    style={{
                      backgroundColor: colors.cardBackground,
                      borderWidth: 1,
                      borderColor: colors.borderColor,
                      borderRadius: 12,
                      padding: 12,
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>
                      {item.pickupText} → {item.destinationText}
                    </Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                      {item.status} • R{Number(item.estimatedFareZAR).toFixed(2)}
                    </Text>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={{ color: colors.textSecondary, marginTop: 6 }}>No past trips.</Text>
                }
              />
            </ScrollView>
          )}
        </Animated.View>

        {/* Choose Driver Overlay */}
        {choosingDriver && (
          <View style={StyleSheet.absoluteFill}>
            <Pressable
              onPress={() => setChoosingDriver(false)}
              style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" }}
            />
            <View
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                top: insets.top + 24,
                bottom: bottomOffset + 24,
                backgroundColor: colors.cardBackground,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.borderColor,
                padding: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Ionicons name="people-outline" size={18} color={colors.textPrimary} />
                <Text style={{ marginLeft: 8, fontWeight: "800", color: colors.textPrimary }}>
                  Choose your driver
                </Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => setChoosingDriver(false)}>
                  <Ionicons name="close" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
                Drivers within 10 km {selectedRide ? `• ${selectedRide.name}` : ""}
              </Text>

              <FlatList
                data={candidates}
                keyExtractor={(i) => i.uid}
                contentContainerStyle={{ paddingBottom: 8 }}
                renderItem={({ item }) => {
                  const want = (selectedRide?.id as RideType) || "standard";
                  const matchesType = item.rideType === want;
                  const disabled = item.occupied || !matchesType;
                  return (
                    <TouchableOpacity
                      disabled={disabled || !!picking}
                      onPress={() => pickDriverAndCreateRide(item)}
                      style={{
                        opacity: disabled ? 0.55 : 1,
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.borderColor,
                        backgroundColor: colors.cardBackground,
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: item.occupied ? "#9E9E9E" : typeColor[item.rideType],
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 10,
                        }}
                      >
                        <Text>🚗</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>
                          {item.displayName || "Driver"}
                        </Text>
                        <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                          {item.car?.make || item.car?.model
                            ? `${[item.car?.make, item.car?.model].filter(Boolean).join(" ")}`
                            : "—"}
                          {item.car?.plate ? ` • ${item.car.plate}` : ""}
                        </Text>
                        <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                          {item.rideType.toUpperCase()} • {item.distanceKm.toFixed(2)} km away
                        </Text>
                      </View>
                      {item.occupied ? (
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 999,
                            backgroundColor: "#FFE0E0",
                          }}
                        >
                          <Text style={{ color: "#D32F2F", fontWeight: "700" }}>Occupied</Text>
                        </View>
                      ) : !matchesType ? (
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 999,
                            backgroundColor: "#E0E0E0",
                          }}
                        >
                          <Text style={{ color: "#424242", fontWeight: "700" }}>Other type</Text>
                        </View>
                      ) : (
                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 999,
                            backgroundColor: colors.primary,
                          }}
                        >
                          <Text style={{ color: "#fff", fontWeight: "800" }}>
                            {picking === item.uid ? "Selecting…" : "Choose"}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={{ padding: 12 }}>
                    <Text style={{ color: colors.textSecondary }}>
                      No drivers nearby. Try another pickup or ride type.
                    </Text>
                  </View>
                }
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

/* ---------------------------------------------------
 * Rider "My Rides" (scrollable), with Cancel (pre-arrival) & Complete (on_trip)
 * --------------------------------------------------*/
function RiderMyRidesSection({
  colors,
  onMarkComplete,
  onCancel,
}: {
  colors: any;
  onMarkComplete: (rideId: string) => Promise<void>;
  onCancel: (rideId: string) => Promise<void>;
}) {
  const [rides, setRides] = useState<
    Array<{ id: string; pickupText: string; destinationText: string; status: string; estimatedFareZAR: number }>
  >([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const qUser = query(
      collection(db, "rides"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    return onSnapshot(qUser, (snap) => {
      const items = snap.docs.map((d) => {
        const r = d.data() as any;
        return {
          id: d.id,
          pickupText: r.pickupText,
          destinationText: r.destinationText,
          status: r.status,
          estimatedFareZAR: Number(r.estimatedFareZAR || 0),
        };
      });
      setRides(items);
    });
  }, []);

  return (
    <FlatList
      data={rides}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ paddingBottom: 12 }}
      renderItem={({ item }) => {
        const canComplete = item.status === "on_trip";
        const canCancel = ["requested", "driver_requested", "driver_assigned"].includes(item.status);
        return (
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderWidth: 1,
              borderColor: colors.borderColor,
              borderRadius: 12,
              padding: 12,
              marginTop: 8,
            }}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>
              {item.pickupText} → {item.destinationText}
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
              {item.status.replace("_", " ")} • R{Number(item.estimatedFareZAR).toFixed(2)}
            </Text>
            <View style={{ flexDirection: "row", marginTop: 10 }}>
              {canCancel && (
                <TouchableOpacity
                  style={[
                    {
                      flex: 1,
                      marginRight: 8,
                      borderRadius: 10,
                      paddingVertical: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#b00020",
                    },
                  ]}
                  onPress={() => onCancel(item.id)}
                >
                  <Text style={{ color: "#fff", fontWeight: "800" }}>Cancel</Text>
                </TouchableOpacity>
              )}
              {canComplete && (
                <TouchableOpacity
                  style={[
                    {
                      flex: 1,
                      borderRadius: 10,
                      paddingVertical: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#2e7d32",
                    },
                  ]}
                  onPress={() => onMarkComplete(item.id)}
                >
                  <Text style={{ color: "#fff", fontWeight: "800" }}>Mark Complete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      }}
      ListEmptyComponent={<Text style={{ color: colors.textSecondary, marginTop: 6 }}>No rides yet.</Text>}
    />
  );
}

export default EhailingScreen;
