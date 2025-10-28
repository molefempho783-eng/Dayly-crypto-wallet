// types/ride.ts
export type RideOption = {
  id: "standard" | "comfort" | "xl";
  name: string;
  base: number;     // base fare in ZAR
  perKm: number;    // per km ZAR
  multiplier: number;
};

export const RIDE_OPTIONS: RideOption[] = [
  { id: "standard", name: "Standard", base: 25, perKm: 10, multiplier: 1 },
  { id: "comfort",  name: "Comfort",  base: 35, perKm: 13, multiplier: 1.15 },
  { id: "xl",       name: "XL",       base: 45, perKm: 16, multiplier: 1.35 },
];

export function estimateFare(distanceKm: number, multiplier: number) {
  // Basic: base handled per ride; multiply total by surge-ish multiplier
  // Caller supplies base/perKm via selectedRide
  // Here, just return distanceKm * blended rate + base (approx by Standard)
  const base = 25; // vestigial baseline (kept tiny for safety)
  const rate = 10; // vestigial baseline per km
  const raw = base + rate * distanceKm;
  return Math.max(20, raw * multiplier);
}
