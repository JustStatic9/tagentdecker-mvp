"use client";

import places from "@/data/places";
import { useState, useEffect } from "react";
import {
  calculateDistance,
  weightedRandom,
  getCurrentTimeOfDay,
  candidatesNearby,
  Place,
} from "@/lib/tour";

// we now store the full Place objects; the component only renders a small subset of fields
// but having the rich object makes replacements/removals easier.


const moods = ["Genuss", "Natur", "Kultur", "Entspannt"];




export default function Home() {
  const [selectedMood, setSelectedMood] = useState("Genuss");
  const [stops, setStops] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const [startMode, setStartMode] = useState<"location" | "address">("location");
  const [addressInput, setAddressInput] = useState("");
  const [startPoint, setStartPoint] = useState<{ lat: number; lon: number } | null>(null);

  // ===== interactive stop manipulation =====
  function removeStop(idx: number) {
    setStops((prev) => prev.filter((_, i) => i !== idx));
    setErrorMessage(null);
    setSnackbar("Stopp entfernt");
  }

  function replaceStop(idx: number) {
    if (!startPoint) return;
    const TIME = getCurrentTimeOfDay();
    const RADIUS = 4000;

    let candidates = candidatesNearby(startPoint.lat, startPoint.lon, RADIUS / 1000, TIME);
    // exclude all current stops except the one we're replacing
    const excludeIds = stops.map((s, i) => (i === idx ? null : s.id)).filter(Boolean) as string[];
    candidates = candidates.filter((p: Place) => !excludeIds.includes(p.id));

    // try to maintain the same role
    const desiredRole = stops[idx]?.spot_role;
    let pool = desiredRole ? candidates.filter((p: Place) => p.spot_role === desiredRole) : [];
    if (!pool.length) pool = candidates;

    const replacement = weightedRandom(pool);
    if (replacement) {
      setStops((prev) => prev.map((s, i) => (i === idx ? replacement : s)));
      setErrorMessage(null);
      setSnackbar("Stopp ersetzt");
    } else {
      setErrorMessage("Kein Ersatz verfügbar");
    }
  }

  // snackbar auto-hide
  useEffect(() => {
    if (!snackbar) return;
    const t = setTimeout(() => setSnackbar(null), 3000);
    return () => clearTimeout(t);
  }, [snackbar]);

  function getHookForStop(idx: number, stop: Place) {
    const desc = (stop as any).description_short || "";
    if (idx === 0) return `Einstieg – ${desc}`;
    if (idx === 1) return `Hauptstopp – ${desc}`;
    return `Ausklang – ${desc}`;
  }


  // -------------------------
  // 🌍 Adresse → Koordinaten
  // -------------------------
  async function geocodeAddress() {
    if (!addressInput) return null;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        addressInput
      )}`
    );

    const data = await res.json();
    if (!data || data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    };
  }


  // -------------------------
  // 🚀 Tour generieren
  // -------------------------
async function generateTour() {
  if (isLoading) return;

  setIsLoading(true);
  setStops([]);
  setErrorMessage(null);

  let lat: number | undefined;
  let lon: number | undefined;

  try {
    // 📍 Standort
    if (startMode === "location") {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
          )
      );

      lat = position.coords.latitude;
      lon = position.coords.longitude;
    }

    // 🏙 Adresse
    if (startMode === "address") {
      const coords = await geocodeAddress();
      if (!coords) {
        setErrorMessage("Adresse nicht gefunden.");
        setIsLoading(false);
        return;
      }

      lat = coords.lat;
      lon = coords.lon;
    }

    if (!lat || !lon) {
      setErrorMessage("Kein gültiger Startpunkt.");
      setIsLoading(false);
      return;
    }

    // -----------------------------------------
    // 🎯 CURATED TOUR ENGINE
    // -----------------------------------------

    let RADIUS = 4000; // start 4km
    const MAX_DURATION = 180; // 3h
    const TIME = getCurrentTimeOfDay();

    // 1️⃣ Filter nach Radius & Tageszeit (helper)
    // attempt dynamic radius expansion if too few results
    let candidates = candidatesNearby(lat!, lon!, RADIUS / 1000, TIME);
    if (candidates.length < 3 && RADIUS < 10000) {
      RADIUS = 10000; // extend to 10km
      candidates = candidatesNearby(lat!, lon!, RADIUS / 1000, TIME);
    }
    if (candidates.length === 0) {
      setErrorMessage("Keine passenden Orte im Radius.");
      setIsLoading(false);
      return;
    }

    const tour: Place[] = [];
    let totalDuration = 0;

    // 3️⃣ Anchor (Start)
    const anchors = candidates.filter((p: Place) => p.spot_role === "anchor");
    const start = weightedRandom(anchors) || weightedRandom(candidates);

    if (start) {
      tour.push(start);
      totalDuration += start.duration_estimate_min;
    }

    // 4️⃣ Highlight
    const highlights = candidates.filter(
      (p: Place) =>
        p.spot_role === "highlight" &&
        !tour.find((t) => t.id === p.id)
    );

    const highlight = weightedRandom(highlights);
    if (
      highlight &&
      totalDuration + highlight.duration_estimate_min <= MAX_DURATION
    ) {
      tour.push(highlight);
      totalDuration += highlight.duration_estimate_min;
    }

    // 5️⃣ Supporting / Micro auffüllen bis 4 Stopps
    const remaining = candidates.filter(
      (p: Place) =>
        !tour.find((t) => t.id === p.id) &&
        (p.spot_role === "supporting" || p.spot_role === "micro")
    );

    while (tour.length < 4 && remaining.length) {
      const next = weightedRandom(remaining);
      if (!next) break;

      if (
        totalDuration + next.duration_estimate_min >
        MAX_DURATION
      )
        break;

      tour.push(next);
      totalDuration += next.duration_estimate_min;

      // entfernen damit nicht doppelt
      const index = remaining.findIndex((r: Place) => r.id === next.id);
      if (index !== -1) remaining.splice(index, 1);
    }

    setStartPoint({ lat: lat!, lon: lon! });
    setStops(tour);

  } catch (err) {
    console.error(err);
    setErrorMessage("Fehler bei der Tour-Generierung.");
  } finally {
    setIsLoading(false);
  }
}
      // -------------------------
      // 🧮 Distanz & Dauer
      // -------------------------
      // recalc whenever stops or startPoint change
      let totalDistance = 0;
      let totalDuration = 0;

      if (startPoint && stops.length) {
        let prev = { lat: startPoint.lat, lon: startPoint.lon };
        for (const s of stops) {
          const d = calculateDistance(prev.lat, prev.lon, s.coordinates.lat, s.coordinates.lon);
          totalDistance += d;
          prev = { lat: s.coordinates.lat, lon: s.coordinates.lon };
        }

        // walking at 4.5km/h + fixed stay time per stop
        const walkingTime = (totalDistance / 4.5) * 60;
        const stayTime = stops.length * 25;
        totalDuration = Math.round(walkingTime + stayTime);
      }

      return (
        <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
  <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Tagentdecker</h1>

          <div className="mb-10 p-6 bg-white rounded-2xl shadow-sm border">

            <h2 className="text-lg font-semibold mb-6">
              {selectedMood} – Abend
            </h2>

            {/* Mood */}
            <div className="flex flex-wrap gap-4 mb-6">
              {moods.map((mood) => (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  className={`px-4 py-2 rounded-lg border ${selectedMood === mood
                    ? "bg-black text-white border-black"
                    : "bg-white border-gray-300"
                    }`}
                >
                  {mood}
                </button>
              ))}
            </div>

            {/* Start Auswahl – IMMER sichtbar */}
            <div className="mb-6">
              <p className="text-sm font-medium mb-3">Startpunkt</p>

              <div className="flex gap-3 mb-3">
                <button
                  onClick={() => setStartMode("location")}
                  className={`px-4 py-2 rounded-lg ${startMode === "location"
                    ? "bg-black text-white"
                    : "bg-white border"
                    }`}
                >
                  📍 Standort
                </button>

                <button
                  onClick={() => setStartMode("address")}
                  className={`px-4 py-2 rounded-lg ${startMode === "address"
                    ? "bg-black text-white"
                    : "bg-white border"
                    }`}
                >
                  🏙 Adresse
                </button>
              </div>

              {startMode === "address" && (
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="z.B. Schweinfurt Marktplatz"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              )}
            </div>

            <button
              onClick={generateTour}
              disabled={isLoading}
              className="px-6 py-3 bg-black text-white rounded-xl"
            >
              {isLoading ? "Wird generiert..." : "Lass uns was entdecken ✨"}
            </button>

            {errorMessage && (
              <p className="mt-4 text-red-600 text-sm">{errorMessage}</p>
            )}
          </div>

          {/* Stops */}
          {stops.length > 0 && startPoint && (
            <>
              {/* snackbar */}
              {snackbar && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg shadow">
                  {snackbar}
                </div>
              )}
              <div className="space-y-6">
                <div className="p-4 bg-white rounded-xl shadow border">
                  <p>🕒 {totalDuration} Minuten</p>
                  <p>📍 {totalDistance.toFixed(1)} km</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {stops.map((stop, index) => (
                    <div key={stop.id} className="p-6 bg-white rounded-xl shadow relative">
                  {/* action buttons */}
                  <div className="absolute top-3 right-3 flex gap-2 group">
                    <button
                      onClick={() => replaceStop(index)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      🔁
                    </button>
                    <span className="absolute top-6 right-0 w-max px-2 py-1 text-xs bg-gray-100 rounded shadow invisible group-hover:visible">
                      Neuer Vorschlag für diesen Stopp
                    </span>
                    <button
                      onClick={() => removeStop(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ❌
                    </button>
                    <span className="absolute top-6 right-0 w-max px-2 py-1 text-xs bg-gray-100 rounded shadow invisible group-hover:visible translate-y-6">
                      Stopp löschen
                    </span>
                  </div>

                  <h2 className="text-xl font-semibold mb-2">
                    {index === 0
                      ? "🥂 Einstieg"
                      : index === 1
                        ? "🍽 Hauptstopp"
                        : "🌙 Ausklang"}
                  </h2>

                  <p className="italic text-sm mb-2">
                    {getHookForStop(index, stop)}
                  </p>

                  <h3>{stop.name}</h3>
                  <p className="text-sm text-gray-500">
                    Kategorie: {stop.category}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${stop.coordinates.lat},${stop.coordinates.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 underline mt-2 block"
                  >
                    In Google Maps öffnen
                  </a>
                </div>
                  ))}
                </div> {/* end grid */}
              </div> {/* end space-y-6 */}
            </> 
          )}
      </div>
    </main>
      );
    }