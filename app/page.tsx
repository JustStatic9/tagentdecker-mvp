"use client";

import { useState } from "react";

type Stop = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  category: string;
};

// ✅ Darf außerhalb stehen (reine Konstante)
const moods = ["Genuss", "Natur", "Kultur", "Entspannt"];

export default function Home() {

  // ✅ Hooks IMMER hier rein
  const [selectedMood, setSelectedMood] = useState("Genuss");
  const [stops, setStops] = useState<Stop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
  lat: number;
  lon: number;
} | null>(null);

  async function generateTour() {
  if (isLoading) return;

  setIsLoading(true);
  setStops([]);
  setErrorMessage(null);

  let lat = 50.0490;  // Default Schweinfurt
  let lon = 10.2217;

  try {
    // Standort abfragen
if (!userLocation && typeof navigator !== "undefined" && navigator.geolocation) {
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });

    lat = position.coords.latitude;
    lon = position.coords.longitude;

    setUserLocation({ lat, lon });

  } catch (error) {
    console.log("Standort nicht verfügbar oder abgelehnt");
    // Default Schweinfurt bleibt bestehen
  }
} else if (userLocation) {
  lat = userLocation.lat;
  lon = userLocation.lon;
}

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lat,
        lon,
        radius: 2000,
        mood: selectedMood,
      }),
    });

    const data = await response.json();

    if (data.stops) {
  setStops(data.stops);
  setErrorMessage(null);
} else if (data.error) {
  setStops([]);
  setErrorMessage(data.error);
}

  } catch (error) {
  console.error("Fehler:", error);
  setErrorMessage("Unerwarteter Fehler");
} finally {
  setIsLoading(false);
}
}

  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <h1 className="text-3xl font-bold mb-6">Tagentdecker</h1>

      {/* Sticky Generator Section */}
      <div className="sticky top-0 z-20 mb-10 p-6 bg-white/95 backdrop-blur rounded-2xl shadow-sm border border-gray-100">

        <h2 className="text-lg font-semibold mb-6">
          {selectedMood} – Abend
        </h2>

        {/* Mood Auswahl */}
        <h3 className="text-sm font-medium mb-3 text-gray-600">
          Stimmung
        </h3>

        <div className="flex flex-wrap gap-4 mb-6">
          {moods.map((mood) => {
            const active = selectedMood === mood;

            return (
              <button
                key={mood}
                onClick={() => setSelectedMood(mood)}
                className={`
                  px-4 py-2 rounded-lg border transition-all
                  cursor-pointer hover:shadow-md
                  ${
                    active
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-gray-300 hover:bg-gray-100"
                  }
                `}
              >
                {mood}
              </button>
            );
          })}
        </div>

        {/* Generate Button */}
        <button
          onClick={generateTour}
          disabled={isLoading}
          className={`
            px-6 py-3 rounded-xl transition-all font-medium
            ${
              isLoading
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-black text-white hover:shadow-lg hover:scale-[1.02]"
            }
          `}
        >
          {isLoading ? "Wird generiert..." : "Vorschlag generieren"}
        </button>
        {errorMessage && (
  <p className="mt-4 text-red-600 text-sm">
    {errorMessage}
  </p>
)}

      </div>

      {/* Stops Anzeige */}
      {stops.length > 0 && (
        <div className="space-y-6">
          {stops.map((stop, index) => (
            <div
              key={stop.id}
              className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">
                {index === 1
                  ? "🍽 Hauptstopp"
                  : index === 0
                  ? "🥂 Einstieg"
                  : "🌙 Ausklang"}
              </h2>

              <h3 className="text-lg font-medium">
                {stop.name}
              </h3>

              <p className="text-sm text-gray-500 mb-4">
                Kategorie: {stop.category}
              </p>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lon}`}
                target="_blank"
                className="text-blue-600 underline text-sm hover:text-blue-800"
              >
                In Google Maps öffnen
              </a>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}