"use client";

import { useState } from "react";
import { generateAdventurePlan } from "@/lib/adventureEngine";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { Select } from "@/components/ui/Input";
import { ResultsDisplay } from "@/components/ResultsDisplay";

export default function HeuteRausPage() {
  const [timeBudget, setTimeBudget] = useState(240);
  const [hasCar, setHasCar] = useState(true);
  const [weather, setWeather] = useState("any");
  const [participants, setParticipants] = useState("couple");
  const [plan, setPlan] = useState<any | null>(null);

  const handleGenerate = () => {
    const req = {
      startLocation: { lat: 50.044, lon: 10.234 },
      timeBudgetMinutes: Number(timeBudget),
      hasCar,
      weather: weather as any,
      participantsType: participants as any,
      region: "schweinfurt-stadt",
    };
    const p = generateAdventurePlan(req);
    setPlan(p);
  };

  const weatherOptions = [
    { value: "sun", label: "☀️ Sonnig" },
    { value: "rain", label: "🌧️ Regen" },
    { value: "dry", label: "🌤️ Trocken" },
    { value: "any", label: "🌍 Beliebig" },
  ];

  const participantOptions = [
    { value: "couple", label: "Pärchen" },
    { value: "family", label: "Familie" },
    { value: "solo", label: "Allein" },
    { value: "friends", label: "Freunde" },
  ];

  return (
    <>
      {/* Headline */}
      <Section className="pt-16 pb-8">
        <div>
          <h1 className="text-5xl font-bold mb-3">Heute geht's raus</h1>
          <p className="text-lg text-zinc-600">
            Passe deine Tour an deine Verfügbarkeit an.
          </p>
        </div>
      </Section>

      {/* Filter Panel */}
      <Section className="py-8">
        <Card>
          <div className="space-y-8">
            {/* Time Budget with Slider */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-700">Zeitbudget</h3>
                <span className="text-lg font-bold text-black">
                  {Math.floor(timeBudget / 60)}h {timeBudget % 60}m
                </span>
              </div>
              <input
                type="range"
                min={60}
                max={720}
                step={30}
                value={timeBudget}
                onChange={(e) => setTimeBudget(Number(e.target.value))}
                className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-2">
                <span>1h</span>
                <span>12h</span>
              </div>
            </div>

            {/* Auto Toggle */}
            <div className="border-t border-zinc-200 pt-6">
              <div className="flex items-center justify-between">
                <label htmlFor="hasCar" className="text-sm font-semibold text-zinc-700 cursor-pointer">
                  🚗 Auto verfügbar
                </label>
                <button
                  id="hasCar"
                  onClick={() => setHasCar(!hasCar)}
                  className={`relative inline-block w-12 h-6 rounded-full transition-colors ${
                    hasCar ? "bg-black" : "bg-zinc-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      hasCar ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Weather Selection */}
            <div className="border-t border-zinc-200 pt-6">
              <h3 className="text-sm font-semibold text-zinc-700 mb-4">Wetter</h3>
              <div className="flex flex-wrap gap-3">
                {weatherOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setWeather(opt.value)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      weather === opt.value
                        ? "bg-black text-white"
                        : "bg-zinc-100 text-black hover:bg-zinc-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Participants Dropdown */}
            <div className="border-t border-zinc-200 pt-6">
              <label htmlFor="participants" className="block text-sm font-semibold text-zinc-700 mb-3">
                Teilnehmer
              </label>
              <Select
                id="participants"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                options={participantOptions}
              />
            </div>

            {/* Generate Button */}
            <div className="flex justify-center border-t border-zinc-200 pt-6">
              <Button size="lg" onClick={handleGenerate}>
                Plan generieren
              </Button>
            </div>
          </div>
        </Card>
      </Section>

      {/* Results */}
      {plan && (
        <Section className="py-12">
          <ResultsDisplay
            plan={plan}
            onRegenerate={handleGenerate}
          />
        </Section>
      )}
    </>
  );
}
