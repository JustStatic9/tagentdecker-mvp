// utilities for tour generation and manipulation

import places from "@/data/places";

type Place = typeof places[number];

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
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
    if (rand <= running) return spot;
  }

  return spots[0];
}

export function getCurrentTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

// filter candidates within radius and by time of day
export function candidatesNearby(
  lat: number,
  lon: number,
  radiusKm: number,
  timeOfDay: string
) {
  return places.filter((p) => {
    const d = calculateDistance(lat, lon, p.coordinates.lat, p.coordinates.lon);
    return d <= radiusKm && p.time_of_day.includes(timeOfDay as any);
  });
}

export type { Place };