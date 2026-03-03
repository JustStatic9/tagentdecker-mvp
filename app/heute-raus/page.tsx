"use client";

import { useState } from "react";
import { generateAdventurePlan } from "@/lib/adventureEngine";

export default function HeuteRausPage() {
  const [timeBudget, setTimeBudget] = useState(240);
  const [hasCar, setHasCar] = useState(true);
  const [weather, setWeather] = useState("sun");
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

  return (
    <div style={{ padding: 16 }}>
      <h1>Heute geht's raus</h1>

      <label>Zeitbudget: {timeBudget} Minuten</label>
      <input type="range" min={60} max={720} value={timeBudget} onChange={(e) => setTimeBudget(Number(e.target.value))} />

      <div>
        <label>
          <input type="checkbox" checked={hasCar} onChange={(e) => setHasCar(e.target.checked)} /> Auto verfügbar
        </label>
      </div>

      <div>
        <label>Wetter:</label>
        <select value={weather} onChange={(e) => setWeather(e.target.value)}>
          <option value="sun">Sonnig</option>
          <option value="rain">Regen</option>
          <option value="dry">Trocken</option>
          <option value="any">Beliebig</option>
        </select>
      </div>

      <div>
        <label>Teilnehmer:</label>
        <select value={participants} onChange={(e) => setParticipants(e.target.value)}>
          <option value="couple">Pärchen</option>
          <option value="family">Familie</option>
          <option value="solo">Allein</option>
          <option value="friends">Freunde</option>
        </select>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={handleGenerate}>Plan generieren</button>
      </div>

      {plan && (
        <section style={{ marginTop: 20 }}>
          <h2>Dein perfekter Tag</h2>
          <p><strong>Gesamtdauer:</strong> {plan.totalDuration} Minuten</p>
          <p><strong>Route:</strong> {plan.routeLogicDescription}</p>

          <ol>
            {plan.stops.map((s: any, idx: number) => (
              <li key={s.id}>
                <strong>{idx + 1}. {s.name}</strong> — {s.description_short || s.subcategory || "-"}
                <div>Empf. Dauer: {s.durationMinutes || s.duration_estimate_min || 45} min</div>
              </li>
            ))}
          </ol>

          <div>
            <h3>Begründung</h3>
            <ul>
              {plan.reasoning.map((r: string, i: number) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
