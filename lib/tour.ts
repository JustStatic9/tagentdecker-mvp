// utilities for tour generation and manipulation

import places from "@/data/places";

// canonical Place type used across the engine. New fields are optional
// for backwards compatibility with existing data objects.
export interface Place {
  id: string;
  name: string;
  description_short?: string;
  coordinates: { lat: number; lon: number };
  // existing fields (kept for compatibility)
  category?: string;
  subcategory?: string;
  price_level?: number;
  family_friendly?: boolean;
  weather_dependency?: string;
  time_of_day?: string[];
  duration_estimate_min?: number;
  generation_weight?: number;

  // NEW optional standardized fields for the adventure engine
  durationMinutes?: number;
  recommendedStayMinutes?: number;
  elevationGain?: number;
  difficulty?: "easy" | "medium" | "hard";
  suitableForKids?: boolean;
  weatherDependency?: "sun" | "any" | "dry" | "indoor";
  categoryType?: "activity" | "viewpoint" | "food" | "nature" | "culture";
  carRequired?: boolean;
  parkingInfo?: string;
  region?: string; // e.g. schweinfurt-stadt | schweinfurt-landkreis
  priorityScore?: number; // 1..5 general importance
  priority?: number; // legacy fallback
  suitableToCloseDay?: boolean; // prefers as last stop
  spot_role?: string; // legacy field from raw data
}

// Basic Haversine distance in km
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// pick item weighted by generation_weight (fallback 1)
export function weightedRandom(spots: Place[]): Place | null {
  if (!spots.length) return null;

  const totalWeight = spots.reduce(
    (sum, s) => sum + (s.generation_weight || 1),
    0
  );

  const rand = Math.random() * totalWeight;
  let running = 0;

  for (const spot of spots) {
    running += spot.generation_weight || 1;
    if (rand <= running) return spot as Place;
  }

  return spots[0] as Place;
}

// pick item with dampened weights (reduces bias towards high-weight items)
export function weightedRandomDampened(spots: Place[]): Place | null {
  if (!spots.length) return null;

  // Dampen weights using square root to flatten the distribution
  // This gives lower-weight items more chance while still preferring higher weights
  const dampenedWeights = spots.map(s => {
    const baseWeight = s.generation_weight || 1;
    const dampenedWeight = Math.sqrt(baseWeight);
    // Add ±10% random noise for additional variance
    const noiseFactor = 0.9 + Math.random() * 0.2;
    return dampenedWeight * noiseFactor;
  });

  const totalWeight = dampenedWeights.reduce((sum, w) => sum + w, 0);
  const rand = Math.random() * totalWeight;
  let running = 0;

  for (let i = 0; i < spots.length; i++) {
    running += dampenedWeights[i];
    if (rand <= running) return spots[i] as Place;
  }

  return spots[0] as Place;
}

export function getCurrentTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

// filter candidates within radius and by optional time of day
export function candidatesNearby(
  lat: number,
  lon: number,
  radiusKm: number,
  timeOfDay?: string,
  region?: string
) {
  return (places as Place[]).filter((p) => {
    if (region && p.region && p.region !== region) return false;
    // if place has no region, consider it eligible (backwards-compat)
    const d = calculateDistance(lat, lon, p.coordinates.lat, p.coordinates.lon);
    const timeOk = !timeOfDay || (p.time_of_day || []).includes(timeOfDay as any);
    return d <= radiusKm && timeOk;
  });
}

