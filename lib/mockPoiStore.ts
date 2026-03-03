import { Place } from "./tour";

const STORAGE_KEY = "tagentdecker:submitted_pois";

export function savePoi(poi: Partial<Place>): Place {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || "[]";
    const existing: any[] = JSON.parse(raw);
    const id = poi.id || `user_${Date.now()}`;
    const stored: any = { ...poi, id };
    existing.push(stored);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return stored as Place;
  } catch (e) {
    // fail gracefully
    const stored: any = { ...poi, id: poi.id || `user_${Date.now()}` };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([stored])); } catch {}
    return stored as Place;
  }
}

export function listSubmitted(): Place[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch (e) {
    return [];
  }
}
