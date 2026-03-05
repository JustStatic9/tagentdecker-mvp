"use client";

import { useState } from "react";
import { savePoi } from "@/lib/mockPoiStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, TextArea } from "@/components/ui/Input";
import { Section } from "@/components/ui/Section";

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
    <>
      {/* Headline */}
      <Section className="pt-16 pb-8">
        <div>
          <h1 className="text-5xl font-bold mb-3">Neuen Ort vorschlagen</h1>
          <p className="text-lg text-zinc-600">
            Hilf mit, die Region besser zu machen. Teile deine Lieblingsplätze mit uns.
          </p>
        </div>
      </Section>

      {/* Form Card */}
      <Section className="py-8">
        {!saved ? (
          <Card>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Info - 2 Column on Desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-zinc-700 mb-2">
                    Name des Ortes *
                  </label>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => onChange("name", e.target.value)}
                    placeholder="z.B. Altstadt Spaziergang"
                  />
                </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-semibold text-zinc-700 mb-2">
                    Kategorie *
                  </label>
                  <Input
                    id="category"
                    required
                    value={form.category}
                    onChange={(e) => onChange("category", e.target.value)}
                    placeholder="z.B. Natur, Kultur, Essen"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-zinc-700 mb-2">
                  Beschreibung
                </label>
                <TextArea
                  id="description"
                  value={form.description}
                  onChange={(e) => onChange("description", e.target.value)}
                  placeholder="Was macht diesen Ort besonders?"
                  rows={4}
                />
              </div>

              {/* Duration */}
              <div>
                <label htmlFor="duration" className="block text-sm font-semibold text-zinc-700 mb-2">
                  Empfohlene Dauer (Minuten)
                </label>
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  max={480}
                  value={form.duration}
                  onChange={(e) => onChange("duration", e.target.value)}
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3 border-y border-zinc-200 py-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.suitableForKids}
                    onChange={(e) => onChange("suitableForKids", e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-300 cursor-pointer"
                  />
                  <span className="ml-3 text-sm font-medium text-zinc-700">Geeignet für Kinder</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.parkingAvailable}
                    onChange={(e) => onChange("parkingAvailable", e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-300 cursor-pointer"
                  />
                  <span className="ml-3 text-sm font-medium text-zinc-700">Parkplatz vorhanden</span>
                </label>
              </div>

              {/* Coordinates - 2 Column */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="lat" className="block text-sm font-semibold text-zinc-700 mb-2">
                    Latitude *
                  </label>
                  <Input
                    id="lat"
                    required
                    type="number"
                    step="0.0001"
                    value={form.lat}
                    onChange={(e) => onChange("lat", e.target.value)}
                    placeholder="z.B. 50.044"
                  />
                </div>
                <div>
                  <label htmlFor="lon" className="block text-sm font-semibold text-zinc-700 mb-2">
                    Longitude *
                  </label>
                  <Input
                    id="lon"
                    required
                    type="number"
                    step="0.0001"
                    value={form.lon}
                    onChange={(e) => onChange("lon", e.target.value)}
                    placeholder="z.B. 10.234"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center border-t border-zinc-200 pt-6">
                <Button size="lg" type="submit">
                  Ort vorschlagen
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card className="bg-green-50 border-green-200">
            <div className="text-center space-y-4">
              <div className="text-5xl">✅</div>
              <h3 className="text-2xl font-bold text-green-900">Vielen Dank!</h3>
              <p className="text-green-800">
                Dein Vorschlag wurde lokal gespeichert. <br />
                <span className="text-sm">
                  In einer Live-Version würde er jetzt an unser Team übermittelt.
                </span>
              </p>
              <div className="pt-4">
                <p className="text-xs text-green-700 font-mono bg-green-100 p-3 rounded">
                  Gespeicherter Ort: {saved?.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setSaved(null);
                  setForm({
                    name: "",
                    description: "",
                    category: "",
                    duration: 60,
                    suitableForKids: false,
                    parkingAvailable: false,
                    lat: "",
                    lon: "",
                  });
                }}
                className="mt-6 px-6 py-2 border border-green-300 rounded-lg hover:bg-green-100 transition-colors font-medium"
              >
                Neuen Ort einreichen
              </button>
            </div>
          </Card>
        )}
      </Section>
    </>
  );
}
