import { NextResponse } from "next/server";
const cache = new Map<string, POI[]>();

type POI = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  category: string;
};

// helper removed: not used
function distance(a: POI, b: POI) {
  const dx = a.lat - b.lat;
  const dy = a.lon - b.lon;
  return Math.sqrt(dx * dx + dy * dy);
}
export async function POST(req: Request) {
  try {
    const { lat, lon, mood } = await req.json();
    const baseCacheKey = `${mood}-${lat}-${lon}`;

    let pois: POI[] = [];

    // -------------------------
    // 1️⃣ CACHE CHECK
    // -------------------------
    // -------------------------
// 1️⃣ KATEGORIEN
// -------------------------
let categories: string[] = [];

if (mood === "Genuss") {
  categories = ["restaurant", "bar", "cafe", "pub", "biergarten"];
}

if (mood === "Natur") {
  categories = ["park", "garden", "viewpoint"];
}

if (mood === "Kultur") {
  categories = ["museum", "theatre", "gallery", "attraction", "artwork"];
}

if (mood === "Entspannt") {
  categories = ["cafe", "park", "garden", "viewpoint", "ice_cream"];
}

// -------------------------
// 2️⃣ ADAPTIVER RADIUS
// -------------------------
let radiusToUse = 2000;
let cacheKey = `${baseCacheKey}-${radiusToUse}`;

if (cache.has(cacheKey)) {
  console.log("POI Cache hit (2000m)");
  pois = cache.get(cacheKey)!;
} else {
  pois = await fetchPOIs(lat, lon, radiusToUse, categories);
  cache.set(cacheKey, pois);
}

// 🔁 Fallback wenn zu wenig Ergebnisse
if (pois.length < 3) {
  radiusToUse = 4000;
  cacheKey = `${baseCacheKey}-${radiusToUse}`;

  if (cache.has(cacheKey)) {
    console.log("POI Cache hit (4000m)");
    pois = cache.get(cacheKey)!;
  } else {
    console.log("Zu wenige POIs – erhöhe Radius auf 4000m");
    pois = await fetchPOIs(lat, lon, radiusToUse, categories);
    cache.set(cacheKey, pois);
  }
}

// ❌ Immer noch zu wenig
if (pois.length < 3) {
  return NextResponse.json({
    error: "Hier gibt es gerade zu wenig passende Orte in deiner Nähe."
  });
}

    const shuffled = [...pois].sort(() => Math.random() - 0.5);
    const start = shuffled[0];

    const remainingAfterStart = pois.filter(p => p.id !== start.id);

    const second = remainingAfterStart.sort(
      (a, b) => distance(start, a) - distance(start, b)
    )[0];

    const remainingAfterSecond = remainingAfterStart.filter(
      p => p.id !== second.id
    );

    const third = remainingAfterSecond.sort(
      (a, b) => distance(second, a) - distance(second, b)
    )[0];

    const stops: POI[] = [start, second, third];

    return NextResponse.json({ stops });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Fehler bei Generierung" });
  }
  async function fetchPOIs(
  lat: number,
  lon: number,
  radius: number,
  categories: string[]
): Promise<POI[]> {

  const categoryRegex = categories.join("|");

const query = `
  [out:json][timeout:10];
  node["amenity"~"${categoryRegex}"]
  (around:${radius},${lat},${lon});
  out body 50;
`;

  const response = await fetch(
    "https://overpass-api.de/api/interpreter",
    {
      method: "POST",
      body: query,
    }
  );

  if (!response.ok) {
    console.error(`Overpass Fehler: ${response.status}`);
  return [];
  }

  const data = await response.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.elements.map((el: any) => ({
    id: el.id,
    name: el.tags?.name || "Unbenannter Ort",
    lat: el.lat,
    lon: el.lon,
    category: el.tags?.amenity || "unknown",
  }));
}
}