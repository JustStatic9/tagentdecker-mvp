import { NextResponse } from "next/server";
const cache = new Map<string, POI[]>();

type POI = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  category: string;
};

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
function distance(a: POI, b: POI) {
  const dx = a.lat - b.lat;
  const dy = a.lon - b.lon;
  return Math.sqrt(dx * dx + dy * dy);
}
export async function POST(req: Request) {
  try {
    const { lat, lon, radius, mood } = await req.json();
    const cacheKey = `${mood}-${lat}-${lon}-${radius}`;

    let pois: POI[] = [];

    // -------------------------
    // 1️⃣ CACHE CHECK
    // -------------------------
    if (cache.has(cacheKey)) {
      console.log("POI Cache hit");
      pois = cache.get(cacheKey)!;
    } else {
      // -------------------------
      // 2️⃣ KATEGORIEN
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

      const categoryString = categories.join("|");

      const overpassQuery = `
        [out:json][timeout:15];
        (
          node["amenity"~"${categoryString}"](around:${radius},${lat},${lon});
          node["leisure"~"${categoryString}"](around:${radius},${lat},${lon});
          node["tourism"~"${categoryString}"](around:${radius},${lat},${lon});
        );
        out;
      `;

      console.log("OVERPASS FETCH START");

      let response = await fetch(
        "https://overpass-api.de/api/interpreter",
        {
          method: "POST",
          body: overpassQuery,
        }
      );

      // -------------------------
      // 3️⃣ RETRY BEI 429
      // -------------------------
      if (response.status === 429) {
        console.warn("Rate limited. Retry in 1500ms...");
        await new Promise((r) => setTimeout(r, 1500));

        console.log("OVERPASS FETCH RETRY");

        response = await fetch(
          "https://overpass-api.de/api/interpreter",
          {
            method: "POST",
            body: overpassQuery,
          }
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Overpass Status:", response.status);
        console.error("Overpass Antwort:", errorText);

        return NextResponse.json({
          error: `Overpass HTTP Fehler (${response.status})`,
        });
      }

      const text = await response.text();

      if (text.trim().startsWith("<")) {
        console.error("Overpass XML Antwort:", text);
        return NextResponse.json({
          error: "Overpass XML Fehler",
        });
      }

      const data = JSON.parse(text);

      pois = data.elements
        .filter((el: any) => el.tags?.name)
        .map((el: any) => ({
          id: el.id,
          name: el.tags.name,
          lat: el.lat,
          lon: el.lon,
          category:
            el.tags.amenity ||
            el.tags.leisure ||
            el.tags.tourism ||
            "unknown",
        }));

      console.log("POIs gefunden:", pois.length);

      cache.set(cacheKey, pois);
    }

    // -------------------------
    // 4️⃣ ROUTENLOGIK
    // -------------------------
    if (pois.length < 3) {
      return NextResponse.json({
        error: "Nicht genug POIs gefunden",
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
}