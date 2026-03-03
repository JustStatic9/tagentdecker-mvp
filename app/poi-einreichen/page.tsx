"use client";

import { useState } from "react";
import { savePoi } from "@/lib/mockPoiStore";

export default function PoiEinreichenPage() {
  const [form, setForm] = useState<any>({
    name: "",
    description: "",
    category: "",
    duration: 60,
    suitableForKids: false,
    parkingAvailable: false,
    lat: "",
    lon: "",
  });

  const [saved, setSaved] = useState<any | null>(null);

  const onChange = (k: string, v: any) => setForm({ ...form, [k]: v });

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const poi = {
      name: form.name,
      description_short: form.description,
      category: form.category,
      durationMinutes: Number(form.duration),
      suitableForKids: form.suitableForKids,
      parkingInfo: form.parkingAvailable ? "vorhanden" : "keine",
      coordinates: { lat: Number(form.lat), lon: Number(form.lon) },
    };
    const s = savePoi(poi as any);
    setSaved(s);
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>POI einreichen</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name</label>
          <input value={form.name} onChange={(e) => onChange("name", e.target.value)} />
        </div>
        <div>
          <label>Beschreibung</label>
          <textarea value={form.description} onChange={(e) => onChange("description", e.target.value)} />
        </div>
        <div>
          <label>Kategorie</label>
          <input value={form.category} onChange={(e) => onChange("category", e.target.value)} />
        </div>
        <div>
          <label>Dauer (Minuten)</label>
          <input type="number" value={form.duration} onChange={(e) => onChange("duration", e.target.value)} />
        </div>
        <div>
          <label>
            <input type="checkbox" checked={form.suitableForKids} onChange={(e) => onChange("suitableForKids", e.target.checked)} /> Geeignet für Kinder
          </label>
        </div>
        <div>
          <label>
            <input type="checkbox" checked={form.parkingAvailable} onChange={(e) => onChange("parkingAvailable", e.target.checked)} /> Parkplatz vorhanden
          </label>
        </div>
        <div>
          <label>Lat</label>
          <input value={form.lat} onChange={(e) => onChange("lat", e.target.value)} />
        </div>
        <div>
          <label>Lon</label>
          <input value={form.lon} onChange={(e) => onChange("lon", e.target.value)} />
        </div>

        <div style={{ marginTop: 8 }}>
          <button type="submit">Speichern (lokal)</button>
        </div>
      </form>

      {saved && (
        <div style={{ marginTop: 12 }}>
          <h3>Ergebnis</h3>
          <pre>{JSON.stringify(saved, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
