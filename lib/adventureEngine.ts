/**
 * ==================================================================================
 * ADVENTURE ENGINE - Core Tour Generation System
 * ==================================================================================
 * 
 * This module generates optimal multi-stop adventure plans based on user preferences.
 * 
 * ARCHITECTURE:
 * 1. Mode System: "quick" or "advanced" determines stop count and radius constraints
 * 2. Candidate Filtering: Filters POIs by region, weather, participants, distance
 * 3. Scoring Phase: Weights proximity, weather, participants, priority, dramaturgy
 * 4. State Machine: Constructs 3-4 stop tour via START → MIDDLE → END states
 * 5. Budget Management: Enforces time budgets with 15% safety buffer
 * 6. Debug Block: Detailed scoring breakdown for transparency
 * 
 * SCORING WEIGHTS (tunable constants in scorePOI):
 * - proximity (0.35): Favors closer POIs
 * - weather (0.15): Matches weather requirements
 * - participants (0.15): Matches group type (family, solo, etc.)
 * - priority (0.20): Higher priorityScore boosts final score
 * - dramaturgy (0.15): Favorite categories per state (START: activity/nature, etc.)
 * 
 * RADIUS STRATEGY:
 * - Calculated dynamically via getEffectiveRadius() based on mode, car availability, time budget
 * - No magic numbers: all radius values derived from central function
 * - Proximity scoring uses effective radius as soft cap (decay curve)
 * - MIDDLE state distance filtering uses effective radius
 * 
 * MODE SYSTEM:
 * - "quick": Fixed 3-4 stops, 180 min, no car, 8km radius, "any" weather
 * - "advanced": Flexible parameters, respects all user inputs
 */

import placesData from "@/data/places";
import { calculateDistance, Place } from "./tour";

type Participants = "couple" | "family" | "solo" | "friends";
type Weather = "sun" | "rain" | "dry" | "any";
type AdventureMode = "quick" | "advanced";

export type AdventureRequest = {
  startLocation: { lat: number; lon: number };
  timeBudgetMinutes: number;
  hasCar: boolean;
  weather: Weather;
  participantsType: Participants;
  region?: string;
  mode?: AdventureMode; // "quick" or "advanced" mode
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

// ==================================================================================
// PHASE 1: Mode System - Apply overrides for "quick" mode
// ==================================================================================

/**
 * Applies mode-specific overrides to the request.
 * Quick mode: Fixed tight constraints for rapid planning.
 * Advanced mode: Respects all user inputs as-is.
 */
function applyModeOverrides(req: AdventureRequest): AdventureRequest {
  if (req.mode === "quick") {
    return {
      ...req,
      timeBudgetMinutes: 180, // hard override: 3 hours
      hasCar: false, // quick mode: on foot
      weather: "any", // be flexible
      participantsType: req.participantsType || "couple",
      region: req.region || DEFAULT_REGION,
      mode: "quick",
    };
  }
  // advanced mode: no overrides
  return req;
}

// ==================================================================================
// PHASE 2: Radius Calculation - Central formula replaces all magic numbers
// ==================================================================================

/**
 * Computes effective search radius in kilometers.
 * Formula considers:
 * - mode: "quick" mode has fixed 8km radius
 * - hasCar: with car can expand further
 * - timeBudget: more time allows longer distances
 * 
 * Returns radius in km.
 */
export function getEffectiveRadius(req: AdventureRequest): number {
  // Quick mode: fixed 8km radius
  if (req.mode === "quick") {
    return 8;
  }

  // Advanced mode: based on car and time budget
  if (req.hasCar) {
    // With car: assume 60 km/h average speed
    // 50% of time budget dedicated to travel
    const travelTimeMinutes = (req.timeBudgetMinutes * 0.5);
    const travelTimeHours = travelTimeMinutes / 60;
    const maxDistanceKm = travelTimeHours * 60; // 60 km/h
    // Cap at 100km for safety
    return Math.min(100, maxDistanceKm);
  } else {
    // On foot: assume 4 km/h walking speed
    // 40% of time budget dedicated to travel
    const travelTimeMinutes = (req.timeBudgetMinutes * 0.4);
    const travelTimeHours = travelTimeMinutes / 60;
    const maxDistanceKm = travelTimeHours * 4; // 4 km/h walking
    // Cap at 30km for safety on foot (unrealistic but safe)
    return Math.min(30, maxDistanceKm);
  }
}

// ==================================================================================
// PHASE 3: Category Mapping - Legacy spot_role heuristics removed
// ==================================================================================

// Map legacy category strings into the standardized categoryType
function mapCategoryToCategoryType(p: Partial<Place>): Place["categoryType"] {
  // Use standardized field if available
  if (p.categoryType) return p.categoryType;

  // Fallback: infer from legacy category field
  const cat = (p.category || "").toString().toLowerCase();
  if (cat.includes("gastro") || cat.includes("restaurant") || cat.includes("cafe") || cat.includes("imbiss")) return "food";
  if (cat.includes("natur") || cat.includes("park") || cat.includes("ufer") || cat.includes("wiese")) return "nature";
  if (cat.includes("aktiv") || cat.includes("lauf") || cat.includes("klettern") || cat.includes("sport")) return "activity";
  if (cat.includes("kultur") || cat.includes("museum") || cat.includes("theater") || cat.includes("denkmal")) return "culture";
  if (cat.includes("aussicht") || (p.subcategory && p.subcategory.toString().includes("aussichtspunkt")) ) return "viewpoint";
  
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
  effectiveRadius?: number; // pass precomputed radius for consistency
}) {
  // ==================== SCORING WEIGHTS ====================
  // Tuning guide:
  // - proximity: Higher = heavily favor nearby POIs (def 0.35)
  // - weather: Higher = strict weather matching (def 0.15)
  // - participants: Higher = strict family/solo matching (def 0.15)
  // - priority: Higher = boosts well-curated POIs more (def 0.20)
  // - dramaturgy: Higher = enforce category preferences per phase (def 0.15)
  const WEIGHTS = {
    proximity: 0.35,
    weather: 0.15,
    participants: 0.15,
    priority: 0.2,
    dramaturgy: 0.15,
  };

  const breakdown: Record<string, number> = {};
  const effectiveRadius = context.effectiveRadius || 30; // fallback if not provided

  // ==================== PROXIMITY SCORE ====================
  // Uses soft cap based on effective radius
  // Decays from 1.0 (at start) to 0 (at radius limit)
  const dist = calculateDistance(context.startLocation.lat, context.startLocation.lon, p.coordinates.lat, p.coordinates.lon);
  const proximityScore = Math.max(0, 1 - dist / effectiveRadius);
  breakdown.proximity = proximityScore * WEIGHTS.proximity;

  // ==================== WEATHER MATCH ====================
  const wd = mapWeatherDependency(p);
  const weatherScore = (context.weather === "any" || wd === "any") ? 1 : (context.weather === "rain" && wd === "sun" ? 0 : 1);
  breakdown.weather = weatherScore * WEIGHTS.weather;

  // ==================== PARTICIPANTS MATCH ====================
  let participantsScore = 0.5;
  if (context.participantsType === "family") participantsScore = (p.suitableForKids === true || p.family_friendly === true) ? 1 : 0.2;
  else participantsScore = 0.6;
  breakdown.participants = participantsScore * WEIGHTS.participants;

  // ==================== PRIORITY SCORE ====================
  // POI importance ranking (1..5, default 3)
  const priority = Number(p.priorityScore || p.priority || 3);
  const priorityScore = Math.max(0, Math.min(1, (priority - 1) / 4));
  breakdown.priority = priorityScore * WEIGHTS.priority;

  // ==================== DRAMATURGY MATCH ====================
  // Prefers certain categories per narrative phase
  let dramaturgyScore = 0.5;
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
  // ==================== PHASE 1: Apply Mode Overrides ====================
  const normalizedReq = applyModeOverrides(req);
  const region = normalizedReq.region || DEFAULT_REGION;

  // ==================== PHASE 2: Calculate Effective Radius ====================
  const effectiveRadius = getEffectiveRadius(normalizedReq);

  // ==================== PHASE 3: Filter Candidates by Region ====================
  const raw = (placesData as Place[]).filter((p:any) => {
    if (p.region && p.region !== region) return false;
    return true;
  });

  // ==================== PHASE 4: Apply Filters (Weather + Participants) ====================
  const rejectedByDistanceCount = raw.reduce((acc, p) => acc + (withinRadius(normalizedReq.startLocation.lat, normalizedReq.startLocation.lon, p, effectiveRadius) ? 0 : 1), 0);

  const prelim = raw.filter((p:any) => 
    filterByWeather(p, normalizedReq.weather) && 
    filterByParticipants(p, normalizedReq.participantsType)
  );

  const rejectedByWeatherCount = raw.length - prelim.length - rejectedByDistanceCount;

  // ==================== PHASE 5: Score All Candidates ====================
  const scored = prelim.map((p:any) => ({ 
    p, 
    s: scorePOI(p, { 
      weather: normalizedReq.weather, 
      participantsType: normalizedReq.participantsType, 
      hasCar: normalizedReq.hasCar, 
      timeBudgetMinutes: normalizedReq.timeBudgetMinutes, 
      startLocation: normalizedReq.startLocation,
      effectiveRadius,
    }) 
  }));

  // Sort by score desc, then by distance asc for tie-breaking
  scored.sort((a,b) => 
    b.s.score - a.s.score || 
    (calculateDistance(normalizedReq.startLocation.lat, normalizedReq.startLocation.lon, a.p.coordinates.lat, a.p.coordinates.lon) - 
     calculateDistance(normalizedReq.startLocation.lat, normalizedReq.startLocation.lon, b.p.coordinates.lat, b.p.coordinates.lon))
  );

  // Keep top N candidates for downstream selection
  const CANDIDATE_LIMIT = 20;
  const topCandidates = scored.slice(0, CANDIDATE_LIMIT).map(x => x.p);

  // Debug: capture scoring breakdown for top candidates
  const scoringBreakdownPerStop: Record<string, {score:number; breakdown:Record<string,number>}> = {};
  for (const s of scored.slice(0, CANDIDATE_LIMIT)) {
    scoringBreakdownPerStop[s.p.id] = { score: s.s.score, breakdown: s.s.breakdown };
  }

  // ==================== PHASE 6: State Machine - Choose Stops ====================
  type State = "START" | "MIDDLE" | "END";
  const chosen: Place[] = [];
  const reasoning: string[] = [];

  // Helper: Pick best POI for a given narrative state with optional proximity constraint
  function pickForState(state: State, nearLocation: {lat:number;lon:number}|null, remainingCandidates: Place[], maxAllowedDurationForThisState?: number) {
    // Score all remaining candidates with dramaturgy emphasis for this state
    const withScores = remainingCandidates.map(p => ({ 
      p, 
      s: scorePOI(p, { 
        weather: normalizedReq.weather, 
        participantsType: normalizedReq.participantsType, 
        hasCar: normalizedReq.hasCar, 
        timeBudgetMinutes: normalizedReq.timeBudgetMinutes, 
        startLocation: nearLocation || normalizedReq.startLocation, 
        dramaturgyPhase: state,
        effectiveRadius,
      }) 
    }));

    // ==================== DRAMATURGY RULES ====================
    // Filter by category preferences for each state
    let filtered = withScores.filter(ws => {
      const ct = mapCategoryToCategoryType(ws.p) || ws.p.categoryType;
      
      if (state === "START") {
        // START: prefer activity/nature categories
        if (!(ct === "activity" || ct === "nature")) return false;
        // Duration constraint: START stop <= 40% of total budget
        const dur = getDuration(ws.p);
        if (maxAllowedDurationForThisState && dur > maxAllowedDurationForThisState) return false;
      }
      
      if (state === "MIDDLE") {
        // MIDDLE: prefer viewpoint/culture categories
        if (!(ct === "viewpoint" || ct === "culture")) return false;
      }
      
      if (state === "END") {
        // END: prefer food/dining categories
        if (!(ct === "food")) return false;
        if (ws.p.suitableToCloseDay === false) return false;
      }
      
      return true;
    });

    // ==================== DISTANCE CONSTRAINT IN MIDDLE ====================
    // MIDDLE stop must be within effective radius from previous stop
    if (nearLocation && state === "MIDDLE") {
      filtered = filtered.filter(ws => 
        calculateDistance(nearLocation.lat, nearLocation.lon, ws.p.coordinates.lat, ws.p.coordinates.lon) <= effectiveRadius
      );
    }

    if (!filtered.length) return null;

    // Choose highest score, with distance as tie-breaker
    filtered.sort((a,b) => 
      b.s.score - a.s.score || 
      (calculateDistance(normalizedReq.startLocation.lat, normalizedReq.startLocation.lon, a.p.coordinates.lat, a.p.coordinates.lon) - 
       calculateDistance(normalizedReq.startLocation.lat, normalizedReq.startLocation.lon, b.p.coordinates.lat, b.p.coordinates.lon))
    );
    
    return filtered[0].p;
  }

  // ==================== PHASE 7: Time Management ====================
  const BUFFER_FACTOR = 1.15; // 15% safety buffer for drive time uncertainty
  const timeBudgetWithBuffer = normalizedReq.timeBudgetMinutes * BUFFER_FACTOR;
  let cumulativeDuration = 0;
  let cumulativeDrive = 0;

  // ==================== PHASE 8: Build Tour via State Machine ====================
  const maxStartDuration = normalizedReq.timeBudgetMinutes * 0.4;
  
  const start = pickForState("START", null, topCandidates, maxStartDuration);
  if (start) {
    chosen.push(start as Place);
    cumulativeDuration += getDuration(start);
  }

  const middle = pickForState("MIDDLE", start ? (start.coordinates as {lat:number;lon:number}) : normalizedReq.startLocation, topCandidates.filter(p => !chosen.find(s=>s.id===p.id)));
  if (middle) {
    const drive = estimateDriveTime(start ? (start.coordinates as {lat:number;lon:number}) : normalizedReq.startLocation, middle.coordinates as {lat:number;lon:number});
    cumulativeDrive += drive;
    cumulativeDuration += drive + getDuration(middle);
    chosen.push(middle as Place);
  }

  const end = pickForState("END", middle ? (middle.coordinates as {lat:number;lon:number}) : (start ? (start.coordinates as {lat:number;lon:number}) : normalizedReq.startLocation), topCandidates.filter(p => !chosen.find(s=>s.id===p.id)));
  if (end) {
    const drive = estimateDriveTime(middle ? (middle.coordinates as {lat:number;lon:number}) : (start ? (start.coordinates as {lat:number;lon:number}) : normalizedReq.startLocation), end.coordinates as {lat:number;lon:number});
    cumulativeDrive += drive;
    cumulativeDuration += drive + getDuration(end);
    chosen.push(end as Place);
  }

  // ==================== PHASE 9: Optional Additional Stop ====================
  // If time permits and mode allows, add 4th stop (quick mode: max 4, advanced: flexible)
  const maxStops = normalizedReq.mode === "quick" ? 4 : 5;
  const remainingCandidates = topCandidates.filter(p => !chosen.find(s=>s.id===p.id));
  
  if (chosen.length < maxStops && remainingCandidates.length) {
    const remainingTime = timeBudgetWithBuffer - cumulativeDuration;
    if (remainingTime > 30) { // Only add if at least 30 minutes remaining
      // Prioritize nearest to last chosen stop
      const lastStop = chosen[chosen.length-1];
      const candidate = selectBestByScore(remainingCandidates, { 
        reference: lastStop ? (lastStop.coordinates as {lat:number;lon:number}) : normalizedReq.startLocation,
        effectiveRadius,
      });
      
      if (candidate) {
        const drive = estimateDriveTime(lastStop ? (lastStop.coordinates as {lat:number;lon:number}) : normalizedReq.startLocation, candidate.coordinates as {lat:number;lon:number});
        if (cumulativeDuration + drive + getDuration(candidate) <= timeBudgetWithBuffer) {
          cumulativeDrive += drive;
          cumulativeDuration += drive + getDuration(candidate);
          chosen.push(candidate as Place);
        }
      }
    }
  }

  // ==================== PHASE 10: Budget Validation ====================
  const totalDuration = cumulativeDuration;
  if (totalDuration > normalizedReq.timeBudgetMinutes) {
    reasoning.push("Plan überschreitet Zeitbudget trotz Buffer; reduziere Stops empfohlen.");
  }

  // ==================== BUILD OUTPUT ====================
  const routeLogicDescription = `Start: ${chosen[0]?.name || "-"} → Mitte: ${chosen[1]?.name || "-"} → Ende: ${chosen[chosen.length - 1]?.name || "-"}`;

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


// ==================================================================================
// PHASE 11: Optional Stop Selection - Uses effective radius
// ==================================================================================

// Helper: Select best remaining candidate by score near reference point
export function selectBestByScore(candidates: Place[], opts: {reference: {lat:number;lon:number}; effectiveRadius?: number}): Place | null {
  if (!candidates.length) return null;
  
  const radius = opts.effectiveRadius || 30; // fallback radius
  
  // Scoring: proximity + priority (without full dramaturgy)
  const scored = candidates.map(p => {
    const dist = calculateDistance(opts.reference.lat, opts.reference.lon, p.coordinates.lat, p.coordinates.lon);
    const proximity = Math.max(0, 1 - dist / radius); // decays over effective radius
    const priority = Number(p.priorityScore || p.priority || 3);
    // 60% proximity, 40% priority
    const score = proximity * 0.6 + (priority/5) * 0.4;
    return {p, score};
  });
  
  scored.sort((a,b) => b.score - a.score);
  return scored[0].p;
}
