"use client";

import { useState } from "react";
import { generateAdventurePlan, AdventureRequest, AdventurePlan } from "@/lib/adventureEngine";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Section } from "@/components/ui/Section";
import { ResultsDisplay } from "@/components/ResultsDisplay";

const moods = ["Genuss", "Natur", "Kultur", "Entspannt"];

export default function Home() {
  const [selectedMood, setSelectedMood] = useState("Genuss");
  const [plan, setPlan] = useState<AdventurePlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // ==================== TOUR GENERATION ====================
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
      const request: AdventureRequest = {
        startLocation: { lat, lon },
        timeBudgetMinutes: 180,
        hasCar: false,
        weather: "any",
        participantsType: "couple",
        region: "schweinfurt-stadt",
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

  // ==================== REGENERATE ====================
  function regenerateTour() {
    generateTour();
  }

  // ==================== RENDER ====================
  return (
    <>
      {/* Hero Section */}
      <Section className="pt-16 pb-8">
        <div className="space-y-6 text-center">
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight">
            Entdecke<br />deine Region neu.
          </h1>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
            Automatisch kuratierte Micro-Abenteuer in Schweinfurt – passgenau für deine Zeit.
          </p>
          <div className="pt-4">
            <Button size="lg" onClick={generateTour} disabled={isLoading}>
              {isLoading ? "Wird generiert..." : "Jetzt Tour generieren"}
            </Button>
          </div>
        </div>
      </Section>

      {/* Generator Card */}
      <Section className="py-8">
        <Card>
          <div className="space-y-8">
            {/* Mood Selection */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-700 mb-4">Wie ist deine Stimmung?</h3>
              <div className="flex flex-wrap gap-3">
                {moods.map((mood) => (
                  <button
                    key={mood}
                    onClick={() => setSelectedMood(mood)}
                    className={`px-5 py-2 rounded-lg font-medium transition-colors ${
                      selectedMood === mood
                        ? "bg-black text-white"
                        : "bg-zinc-100 text-black hover:bg-zinc-200"
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Location */}
            <div className="border-t border-zinc-200 pt-6">
              <h3 className="text-sm font-semibold text-zinc-700 mb-4">Startpunkt</h3>
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setStartMode("location")}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    startMode === "location"
                      ? "bg-black text-white"
                      : "bg-zinc-100 text-black hover:bg-zinc-200"
                  }`}
                >
                  📍 Standort
                </button>
                <button
                  onClick={() => setStartMode("address")}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    startMode === "address"
                      ? "bg-black text-white"
                      : "bg-zinc-100 text-black hover:bg-zinc-200"
                  }`}
                >
                  🏙 Adresse
                </button>
              </div>

              {startMode === "address" && (
                <Input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="z.B. Schweinfurt Marktplatz"
                />
              )}
            </div>

            {/* Generate Button */}
            <div className="flex justify-center pt-4 border-t border-zinc-200">
              <Button size="lg" onClick={generateTour} disabled={isLoading}>
                {isLoading ? "Wird generiert..." : "Lass uns was entdecken ✨"}
              </Button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {errorMessage}
              </div>
            )}
          </div>
        </Card>
      </Section>

      {/* Results */}
      {plan && (
        <Section className="py-12">
          <ResultsDisplay
            plan={plan}
            onRegenerate={regenerateTour}
          />
        </Section>
      )}
    </>
  );
}