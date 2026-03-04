"use client";

import { useState } from "react";
import { generateAdventurePlan, AdventureRequest, AdventurePlan } from "@/lib/adventureEngine";
import { calculateDistance, Place } from "@/lib/tour";

const moods = ["Genuss", "Natur", "Kultur", "Entspannt"];

export default function Home() {
  const [selectedMood, setSelectedMood] = useState("Genuss");
  const [plan, setPlan] = useState<AdventurePlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const [startMode, setStartMode] = useState<"location" | "address">("location");
  const [addressInput, setAddressInput] = useState("");
  const [startPoint, setStartPoint] = useState<{ lat: number; lon: number } | null>(null);

  // ==================== GEOCODING ====================
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

  // ==================== TOUR GENERATION via ENGINE ====================
  async function generateTour() {
    if (isLoading) return;

    setIsLoading(true);
    setPlan(null);
    setErrorMessage(null);

    let lat: number | undefined;
    let lon: number | undefined;

    try {
      // Get start location
      if (startMode === "location") {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            })
        );
        lat = position.coords.latitude;
        lon = position.coords.longitude;
      }

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

      // ==================== CALL ADVENTURE ENGINE ====================
      // Use "quick" mode for fast 3-4 stop generation on landing page
      const request: AdventureRequest = {
        startLocation: { lat, lon },
        timeBudgetMinutes: 180, // will be overridden by quick mode
        hasCar: false,
        weather: "any",
        participantsType: "couple",
        region: "schweinfurt-stadt",
        mode: "quick", // Fixed quick mode for landing page
      };

      const generatedPlan = generateAdventurePlan(request);

      if (!generatedPlan.stops || generatedPlan.stops.length === 0) {
        setErrorMessage("Keine passenden Orte gefunden.");
        setIsLoading(false);
        return;
      }

      setStartPoint({ lat, lon });
      setPlan(generatedPlan);
    } catch (err) {
      console.error(err);
      setErrorMessage("Fehler bei der Tour-Generierung.");
    } finally {
      setIsLoading(false);
    }
  }

  // ==================== INTERACTIVE: REMOVE STOP ====================
  function removeStop(idx: number) {
    if (!plan) return;
    const updatedStops = plan.stops.filter((_, i) => i !== idx);
    setPlan({ ...plan, stops: updatedStops });
    setSnackbar("Stopp entfernt");
    setTimeout(() => setSnackbar(null), 3000);
  }

  // ==================== INTERACTIVE: REGENERATE FULL TOUR ====================
  function regenerateTour() {
    generateTour();
  }

  // ==================== RENDER ====================
  // Calculate totals from plan
  let totalDistance = 0;
  if (plan && startPoint && plan.stops.length) {
    let prev = { lat: startPoint.lat, lon: startPoint.lon };
    for (const s of plan.stops) {
      const d = calculateDistance(prev.lat, prev.lon, s.coordinates.lat, s.coordinates.lon);
      totalDistance += d;
      prev = { lat: s.coordinates.lat, lon: s.coordinates.lon };
    }
  }

      return (
        <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Tagentdecker</h1>

            {/* GENERATION PANEL */}
            <div className="mb-10 p-6 bg-white rounded-2xl shadow-sm border">
              <h2 className="text-lg font-semibold mb-6">
                Dein nächstes Abendteuer
              </h2>

              {/* Mood Selection */}
              <div className="flex flex-wrap gap-4 mb-6">
                {moods.map((mood) => (
                  <button
                    key={mood}
                    onClick={() => setSelectedMood(mood)}
                    className={`px-4 py-2 rounded-lg border ${
                      selectedMood === mood
                        ? "bg-black text-white border-black"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>

              {/* Start Location Selection */}
              <div className="mb-6">
                <p className="text-sm font-medium mb-3">Startpunkt</p>

                <div className="flex gap-3 mb-3">
                  <button
                    onClick={() => setStartMode("location")}
                    className={`px-4 py-2 rounded-lg ${
                      startMode === "location"
                        ? "bg-black text-white"
                        : "bg-white border"
                    }`}
                  >
                    📍 Standort
                  </button>

                  <button
                    onClick={() => setStartMode("address")}
                    className={`px-4 py-2 rounded-lg ${
                      startMode === "address"
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
                className="px-6 py-3 bg-black text-white rounded-xl disabled:opacity-50"
              >
                {isLoading ? "Wird generiert..." : "Lass uns was entdecken ✨"}
              </button>

              {errorMessage && (
                <p className="mt-4 text-red-600 text-sm">{errorMessage}</p>
              )}
            </div>

            {/* PLAN DISPLAY */}
            {plan && startPoint && plan.stops.length > 0 && (
              <>
                {/* Snackbar */}
                {snackbar && (
                  <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg shadow">
                    {snackbar}
                  </div>
                )}

                {/* Summary Card */}
                <div className="p-4 bg-white rounded-xl shadow border mb-6">
                  <p className="mb-2">🕒 <strong>{plan.totalDuration} Minuten</strong></p>
                  <p>📍 <strong>{totalDistance.toFixed(1)} km</strong> Gesamtdistanz</p>
                  <p className="text-sm text-gray-600 mt-2">Auto: {Math.round(plan.driveTimeEstimate)} min</p>
                </div>

                {/* Stops Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {plan.stops.map((stop, index) => (
                    <div
                      key={stop.id}
                      className="p-6 bg-white rounded-xl shadow relative"
                    >
                      {/* Action Buttons */}
                      <div className="absolute top-3 right-3 flex gap-2 group">
                        <button
                          onClick={() => removeStop(index)}
                          className="text-red-500 hover:text-red-700 text-lg"
                        >
                          ❌
                        </button>
                        <span className="absolute top-6 right-8 w-max px-2 py-1 text-xs bg-gray-100 rounded shadow invisible group-hover:visible whitespace-nowrap">
                          Stopp löschen
                        </span>
                      </div>

                      {/* Stop Title */}
                      <h2 className="text-xl font-semibold mb-2">
                        {index === 0
                          ? "🥂 Einstieg"
                          : index === 1
                          ? "🍽 Hauptstopp"
                          : "🌙 Ausklang"}
                      </h2>

                      {/* Stop Details */}
                      <h3 className="font-bold mb-1">{stop.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {stop.description_short || stop.category || "-"}
                      </p>

                      {/* Duration */}
                      <p className="text-xs text-gray-500 mb-3">
                        ⏱ ~{stop.durationMinutes || stop.duration_estimate_min || 45} min
                      </p>

                      {/* Google Maps Link */}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${stop.coordinates.lat},${stop.coordinates.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 underline hover:text-blue-800"
                      >
                        Auf Google Maps öffnen →
                      </a>
                    </div>
                  ))}
                </div>

                {/* Regenerate Button */}
                <div className="mt-8 text-center">
                  <button
                    onClick={regenerateTour}
                    className="px-6 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300"
                  >
                    Andere Vorschläge 🔄
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      );
    }