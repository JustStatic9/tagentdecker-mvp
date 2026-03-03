import placesData from "@/data/places";
import { calculateDistance, Place } from "./tour";

type Participants = "couple" | "family" | "solo" | "friends";
type Weather = "sun" | "rain" | "dry" | "any";

export type AdventureRequest = {
  startLocation: { lat: number; lon: number };
  timeBudgetMinutes: number;
  hasCar: boolean;
  weather: Weather;
  participantsType: Participants;
  region?: string; // restrict POIs to region
};

export type AdventurePlan = {
  totalDuration: number;
  driveTimeEstimate: number;
  stops: Place[];
  routeLogicDescription: string;
  reasoning: string[];
  debug?: {
    candidatePoolSize: number;
    rejectedByWeather: number;
    rejectedByDistance: number;
    scoringBreakdownPerStop: Record<string, {score: number; breakdown: Record<string, number>}>;
  };
};

const DEFAULT_REGION = "schweinfurt-stadt";

// map legacy category strings into the new categoryType
function mapCategoryToCategoryType(p: Partial<Place>): Place["categoryType"] {
  if (p.categoryType) return p.categoryType;
  const cat = (p.category || "").toString().toLowerCase();
  if (cat.includes("gastro") || cat.includes("restaurant") || cat.includes("cafe") || cat.includes("imbiss")) return "food";
  if (cat.includes("natur") || cat.includes("park") || cat.includes("ufer") || cat.includes("wiese")) return "nature";
  if (cat.includes("aktiv") || cat.includes("lauf") || cat.includes("klettern") || cat.includes("sport")) return "activity";
  if (cat.includes("kultur") || cat.includes("museum") || cat.includes("theater") || cat.includes("denkmal")) return "culture";
  if (cat.includes("aussicht") || (p.subcategory && p.subcategory.toString().includes("aussichtspunkt")) ) return "viewpoint";
  // fallback heuristics
  if (p.spot_role === "highlight") return "viewpoint";
  return undefined;
}

function mapWeatherDependency(p: Partial<Place>): Place["weatherDependency"] {
  if (p.weatherDependency) return p.weatherDependency;
  const w = (p.weather_dependency || "").toString().toLowerCase();
  if (!w || w === "independent") return "any";
  if (w.includes("good_weather") || w.includes("sun")) return "sun";
  if (w.includes("dry")) return "dry";
  if (w.includes("indoor")) return "indoor";
  return "any";
}

function getDuration(p: Partial<Place>): number {
  return p.durationMinutes || p.recommendedStayMinutes || p.duration_estimate_min || 45;
}

function withinRadius(reqLat: number, reqLon: number, p: Place, radiusKm: number): boolean {
  return calculateDistance(reqLat, reqLon, p.coordinates.lat, p.coordinates.lon) <= radiusKm;
}

// exported helpers for testability
export function estimateDriveTime(a: {lat:number;lon:number}, b: {lat:number;lon:number}): number {
  // drive time estimate = distance(km) / 60 km/h * 60 => minutes
  // simplifies to: minutes ~= distance(km) at 60 km/h
  const distKm = calculateDistance(a.lat, a.lon, b.lat, b.lon);
  return distKm;
}

export function filterByWeather(p: Partial<Place>, weather: Weather): boolean {
  const wd = mapWeatherDependency(p);
  if (weather === "rain" && wd === "sun") return false;
  return true;
}

export function filterByParticipants(p: Partial<Place>, participantsType: Participants): boolean {
  if (participantsType === "family") {
    if (p.suitableForKids === false) return false;
    if (p.suitableForKids === undefined && p.family_friendly === false) return false;
  }
  return true;
}

export function scorePOI(p: Partial<Place> & {coordinates: {lat:number;lon:number}}, context: {
  weather: Weather;
  participantsType: Participants;
  hasCar: boolean;
  timeBudgetMinutes: number;
  startLocation: {lat:number;lon:number};
  dramaturgyPhase?: "START"|"MIDDLE"|"END";
}) {
  // weights (tunable constants) - chosen small and commented
  const WEIGHTS = {
    proximity: 0.35, // closer POIs preferred
    weather: 0.15, // matches weather dependency
    participants: 0.15, // matches participants group
    priority: 0.2, // higher priorityScore boosts
    dramaturgy: 0.15, // matches required dramaturgy phase
  };

  const breakdown: Record<string, number> = {};

  // proximity score: 1.0 -> same location, decreases with distance
  const dist = calculateDistance(context.startLocation.lat, context.startLocation.lon, p.coordinates.lat, p.coordinates.lon);
  // soft cap for proximity: use roughly 40% of time budget as radius proxy
  const radiusProxy = Math.max(1, context.timeBudgetMinutes * 0.4 / 60 * 8); // convert minutes->km estimate
  const proximityScore = Math.max(0, 1 - dist / radiusProxy);
  breakdown.proximity = proximityScore * WEIGHTS.proximity;

  // weather match: 1 if compatible, 0 otherwise
  const wd = mapWeatherDependency(p);
  const weatherScore = (context.weather === "any" || wd === "any") ? 1 : (context.weather === "rain" && wd === "sun" ? 0 : 1);
  breakdown.weather = weatherScore * WEIGHTS.weather;

  // participants match: family filter already applied; small bonus if explicit match
  let participantsScore = 0.5;
  if (context.participantsType === "family") participantsScore = (p.suitableForKids === true || p.family_friendly === true) ? 1 : 0.2;
  else participantsScore = 0.6; // neutral slight preference
  breakdown.participants = participantsScore * WEIGHTS.participants;

  // priorityScore: optional field 1..5 (default 3)
  const priority = Number(p.priorityScore || p.priority || 3);
  // normalize to [0,1]
  const priorityScore = Math.max(0, Math.min(1, (priority - 1) / 4));
  breakdown.priority = priorityScore * WEIGHTS.priority;

  // dramaturgy match: preferred categories per phase
  let dramaturgyScore = 0.5; // neutral
  if (context.dramaturgyPhase === "START") {
    const ct = mapCategoryToCategoryType(p) || p.categoryType;
    dramaturgyScore = (ct === "activity" || ct === "nature") ? 1 : 0.2;
  } else if (context.dramaturgyPhase === "MIDDLE") {
    const ct = mapCategoryToCategoryType(p) || p.categoryType;
    dramaturgyScore = (ct === "viewpoint" || ct === "culture") ? 1 : 0.2;
  } else if (context.dramaturgyPhase === "END") {
    const ct = mapCategoryToCategoryType(p) || p.categoryType;
    dramaturgyScore = (ct === "food") ? 1 : 0.1;
  }
  breakdown.dramaturgy = dramaturgyScore * WEIGHTS.dramaturgy;

  const finalScore = Object.values(breakdown).reduce((a,b)=>a+b,0);
  return { score: finalScore, breakdown };
}



export function generateAdventurePlan(req: AdventureRequest): AdventurePlan {
  const region = req.region || DEFAULT_REGION;
  const maxRadiusKm = req.hasCar ? 100 : 30;
// PHASE 2: Radius clustering + candidate limiting
  const raw = (placesData as Place[]).filter((p:any) => {
    if (p.region && p.region !== region) return false;
    return true; // keep region filtering here; distance filter later
  });

  const rejectedByDistanceCount = raw.reduce((acc, p) => acc + (withinRadius(req.startLocation.lat, req.startLocation.lon, p, maxRadiusKm) ? 0 : 1), 0);

  // apply weather & participants filters first for efficiency
  const prelim = raw.filter((p:any) => filterByWeather(p, req.weather) && filterByParticipants(p, req.participantsType));

  const rejectedByWeatherCount = raw.length - prelim.length - rejectedByDistanceCount;

  // score all prelim candidates relative to start location and phase-agnostic
  const scored = prelim.map((p:any) => ({ p, s: scorePOI(p, { weather: req.weather, participantsType: req.participantsType, hasCar: req.hasCar, timeBudgetMinutes: req.timeBudgetMinutes, startLocation: req.startLocation }) }));

  // sort by score desc then distance asc for tie-break
  scored.sort((a,b) => b.s.score - a.s.score || (calculateDistance(req.startLocation.lat, req.startLocation.lon, a.p.coordinates.lat, a.p.coordinates.lon) - calculateDistance(req.startLocation.lat, req.startLocation.lon, b.p.coordinates.lat, b.p.coordinates.lon)));

  // keep top N candidates (Phase 2.3)
  const CANDIDATE_LIMIT = 20;
  const topCandidates = scored.slice(0, CANDIDATE_LIMIT).map(x => x.p);

  // debug containers
  const scoringBreakdownPerStop: Record<string, {score:number; breakdown:Record<string,number>}> = {};
  for (const s of scored.slice(0, CANDIDATE_LIMIT)) scoringBreakdownPerStop[s.p.id] = { score: s.s.score, breakdown: s.s.breakdown };

  // PHASE 3: Simple state machine to choose stops
  type State = "START" | "MIDDLE" | "END";
  const chosen: Place[] = [];
  const reasoning: string[] = [];

  // helper to pick best matching POI for a given state and optional proximity constraint
  function pickForState(state: State, nearLocation: {lat:number;lon:number}|null, remainingCandidates: Place[], maxAllowedDurationForThisState?: number) {
    // score with dramaturgy emphasis
    const withScores = remainingCandidates.map(p => ({ p, s: scorePOI(p, { weather: req.weather, participantsType: req.participantsType, hasCar: req.hasCar, timeBudgetMinutes: req.timeBudgetMinutes, startLocation: nearLocation || req.startLocation, dramaturgyPhase: state }) }));
    // filter by dramaturgy rules per state
    let filtered = withScores.filter(ws => {
      const ct = mapCategoryToCategoryType(ws.p) || ws.p.categoryType;
      if (state === "START") {
        if (!(ct === "activity" || ct === "nature")) return false;
        // duration constraint: START duration <= 40% budget
        const dur = getDuration(ws.p);
        if (maxAllowedDurationForThisState && dur > maxAllowedDurationForThisState) return false;
      }
      if (state === "MIDDLE") {
        if (!(ct === "viewpoint" || ct === "culture")) return false;
      }
      if (state === "END") {
        if (!(ct === "food")) return false;
        // optional suitableToCloseDay check: prefer places flagged true
        if (ws.p.suitableToCloseDay === false) return false;
      }
      return true;
    });

    // also enforce distance from nearLocation for MIDDLE state
    if (nearLocation && state === "MIDDLE") {
      filtered = filtered.filter(ws => calculateDistance(nearLocation.lat, nearLocation.lon, ws.p.coordinates.lat, ws.p.coordinates.lon) <= 20);
    }

    if (!filtered.length) return null;

    filtered.sort((a,b) => b.s.score - a.s.score || (calculateDistance(req.startLocation.lat, req.startLocation.lon, a.p.coordinates.lat, a.p.coordinates.lon) - calculateDistance(req.startLocation.lat, req.startLocation.lon, b.p.coordinates.lat, b.p.coordinates.lon)));
    return filtered[0].p;
  }

  // time management
  const BUFFER_FACTOR = 1.15; // 15% buffer
  const timeBudgetWithBuffer = req.timeBudgetMinutes * BUFFER_FACTOR;
  let cumulativeDuration = 0; // includes visit durations and estimated drive times
  let cumulativeDrive = 0;

  // pick START
  const maxStartDuration = req.timeBudgetMinutes * 0.4; // rule: start <= 40% budget
  const start = pickForState("START", null, topCandidates, maxStartDuration);
  if (start) {
    chosen.push(start as Place);
    cumulativeDuration += getDuration(start);
  }

  // pick MIDDLE close to START
  const middle = pickForState("MIDDLE", start ? (start.coordinates as {lat:number;lon:number}) : req.startLocation, topCandidates.filter(p => !chosen.find(s=>s.id===p.id)));
  if (middle) {
    const drive = estimateDriveTime(start ? (start.coordinates as {lat:number;lon:number}) : req.startLocation, middle.coordinates as {lat:number;lon:number});
    cumulativeDrive += drive;
    cumulativeDuration += drive + getDuration(middle);
    chosen.push(middle as Place);
  }

  // pick END close to MIDDLE
  const end = pickForState("END", middle ? (middle.coordinates as {lat:number;lon:number}) : (start ? (start.coordinates as {lat:number;lon:number}) : req.startLocation), topCandidates.filter(p => !chosen.find(s=>s.id===p.id)));
  if (end) {
    const drive = estimateDriveTime(middle ? (middle.coordinates as {lat:number;lon:number}) : (start ? (start.coordinates as {lat:number;lon:number}) : req.startLocation), end.coordinates as {lat:number;lon:number});
    cumulativeDrive += drive;
    cumulativeDuration += drive + getDuration(end);
    chosen.push(end as Place);
  }

  // optional additional stop if time remains (local optimization near last stop)
  const remainingCandidates = topCandidates.filter(p => !chosen.find(s=>s.id===p.id));
  if (chosen.length < 5 && remainingCandidates.length) {
    // pick best-scoring remaining that fits remaining time
    const remainingTime = timeBudgetWithBuffer - cumulativeDuration;
    if (remainingTime > 30) { // only add if at least 30 minutes left
      // prioritize nearest to last chosen
      const near = chosen[chosen.length-1] || null;
      const candidate = selectBestByScore(remainingCandidates, { reference: near ? (near.coordinates as {lat:number;lon:number}) : req.startLocation, req });
      if (candidate) {
        const drive = estimateDriveTime(near ? (near.coordinates as {lat:number;lon:number}) : req.startLocation, candidate.coordinates as {lat:number;lon:number});
        if (cumulativeDuration + drive + getDuration(candidate) <= timeBudgetWithBuffer) {
          cumulativeDrive += drive;
          cumulativeDuration += drive + getDuration(candidate);
          chosen.push(candidate as Place);
        }
      }
    }
  }

  // final budget check
  const totalDuration = cumulativeDuration;
  if (totalDuration > req.timeBudgetMinutes) {
    reasoning.push("Plan überschreitet Zeitbudget trotz Buffer; reduziere Stops empfohlen.");
  }

  // build route description
  const routeLogicDescription = `Start: ${chosen[0]?.name || "-"} → Mitte: ${chosen[1]?.name || "-"} → Ende: ${chosen[chosen.length - 1]?.name || "-"}`;

  // debug info
  const debug = {
    candidatePoolSize: topCandidates.length,
    rejectedByWeather: rejectedByWeatherCount,
    rejectedByDistance: rejectedByDistanceCount,
    scoringBreakdownPerStop,
  };

  return {
    totalDuration: Math.round(totalDuration),
    driveTimeEstimate: Math.round(cumulativeDrive),
    stops: chosen,
    routeLogicDescription,
    reasoning,
    debug,
  };
}


// helper: select best remaining candidate by score near reference point
export function selectBestByScore(candidates: Place[], opts: {reference: {lat:number;lon:number}; req?: AdventureRequest}): Place | null {
  if (!candidates.length) return null;
  // compute simple local score: higher priority + closeness to reference
  const scored = candidates.map(p => {
    const dist = calculateDistance(opts.reference.lat, opts.reference.lon, p.coordinates.lat, p.coordinates.lon);
    const proximity = Math.max(0, 1 - dist / 20); // 20km soft cap
    const priority = Number(p.priorityScore || p.priority || 3);
    const score = proximity * 0.6 + (priority/5) * 0.4;
    return {p, score};
  });
  scored.sort((a,b) => b.score - a.score);
  return scored[0].p;
}
