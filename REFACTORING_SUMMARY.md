# Tagentdecker - Adventure Engine Refactoring Summary

## Modified Files

| File | Changes |
|------|---------|
| **lib/adventureEngine.ts** | Core refactor: Mode system, central radius logic, legacy removal, comprehensive documentation |
| **app/page.tsx** | Complete rebuild: Uses `generateAdventurePlan()` only, removed weightedRandom/candidatesNearby/spot_role |

## Architecture

### Single Responsibility
- **Engine** (`lib/adventureEngine.ts`): All tour logic, scoring, state machine, radius computation
- **UI** (`app/page.tsx`, `app/heute-raus/page.tsx`): Display results only, minimal interactivity
- **Utilities** (`lib/tour.ts`): Pure functions (distance calculation, exported legacy helpers)
- **Data** (`data/places.ts`): POI definitions (spot_role remains in data only)

### Key Functions

| Function | Purpose |
|----------|---------|
| `getEffectiveRadius()` | Centralized radius formula (replaces 20/30/100 magic numbers) |
| `applyModeOverrides()` | "quick" mode constraints (180min, 3-4 stops, no car, 8km radius) |
| `generateAdventurePlan()` | Main entry point with 11 documented phases |
| `scorePOI()` | Unified scoring with 5 weighted dimensions |
| `selectBestByScore()` | Local optimization for optional 4th stop |

## Engine Flow (6 Phases)

1. **Mode Application** → Apply "quick" overrides (fixed 3h, 8km radius, no car)
2. **Effective Radius** → Compute dynamic search radius based on mode/car/budget
3. **Region Filter** → Exclude POIs outside target region (Schweinfurt)
4. **Weather+Participants** → Fast pre-filter by compatibility constraints
5. **Scoring** → All candidates scored on proximity/weather/priority/dramaturgy
6. **State Machine** → Select START→MIDDLE→END via dramaturgy preferences + Optional 4th stop
7. **Budget Validation** → Check time compliance with 15% safety buffer
8. **Output Assembly** → Return stops, duration, drive time, reasoning, debug info

## Quality Improvements

✅ **Eliminated**
- spot_role filtering from business logic (remains in data)
- weightedRandom/candidatesNearby from UI  
- getCurrentTimeOfDay (time-of-day filtering removed)
- Legacy highlight fallback in category mapping
- Magic radius numbers (20, 30, 100 → dynamic formula)
- Tour generation from Landing Page (moved to Engine)
- Double duration calculation

✅ **Added**
- Comprehensive File Header (30-line documentation)
- 11 phase comments inside generateAdventurePlan
- Weight explanation comments (why 0.35, 0.15 etc)
- Mode system with documented behavior
- effectiveRadius passed to all scoring functions
- Debug block with candidate pool + rejection counts

## Technical Risks

| Risk | Mitigation |
|------|-----------|
| **Limited POI Dataset** | Quality of results depends on places.ts coverage (currently ~20 POIs) |
| **Static Weights** | Scoring weights (0.35 proximity, etc) not field-tunable; requires code redeploy |
| **No Time-of-Day Logic** | Removed time_of_day filtering (was minimal; consider re-adding if data improves) |
| **Hardcoded Dramaturgy Rules** | Category preferences (START=activity, MIDDLE=viewpoint, END=food) not configurable |
| **Simple Drive Time** | Uses distance/60 km/h; ignores traffic, road type, transfers |
| **Region Hardcoded** | Default "schweinfurt-stadt"; other regions untested |
| **No A/B Testing** | Mode system locked to "quick" on landing page; no user preference toggles |

## Validation Results

- ✅ No `spot_role` business logic
- ✅ No `weightedRandom`/`candidatesNearby` in UI
- ✅ No magic radius numbers in app code
- ✅ No tour generation in page components
- ✅ No double duration calculation
- ✅ No TypeScript errors
- ✅ All imports cleaned up

## Next Steps (Future Work)

1. **Expand POI data** → Current 20 POIs limits tour quality
2. **Field-tunable weights** → Admin panel for scoring coefficients
3. **A/B testing** → "advanced" mode on landing page with full controls
4. **Traffic data** → Integrate real drive time estimation
5. **User feedback loop** → Track saved/liked tours for weight tuning
6. **Multi-region support** → Test "schweinfurt-landkreis", neighboring cities
