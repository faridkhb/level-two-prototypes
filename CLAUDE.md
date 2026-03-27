# Project Rules for Claude

## Git Workflow

**Always pull before starting work** — Other collaborators may have pushed changes. Run `git pull` at the start of each session.

**Always push after commits** — User tests online, so every commit must be pushed immediately after creation.

```bash
# At start of session:
git pull

# After changes:
git add ... && git commit ... && git push
```

## Repository Structure

This repository contains **independent projects** on separate branches:

| Branch | Project | Version | Description |
|--------|---------|---------|-------------|
| `main` | BG Planner | v0.55.19 | Graph-based food planning with cubes, interventions, medications, row-pattern burn system (ПЖ/BOOST/Metformin/SGLT2/GLP-1), BOOST, meteor drop burn animations, plateau preview, GLP-1 peak reduction, burns visibility toggle (👁️), PancreasButton L-shape redesign, Variant B phased reveal (per-food bomb animations, burn layers persist), animated results reveal (danger sweep, Excess Glucose counter, star-by-star, label bounce-in, tap-to-skip), starts on level select screen, Test Level tile (free play), 9 tutorial levels, intervention tail duration cap (maxDuration), T2 redesigned (Exercises), dynamic Y-axis, overeating penalties, pre-placed foods, locked slots, level balancing, startingBg, vertical layout redesign, zone hatching, food speed labels, stress slot pulse animation, T6 Metformin tutorial redesign, drag rejection animation |

Archived branches (port-planner, match3, tower-defense, Dariy) → see `docs/ARCHIVED_BRANCHES.md`

**Production deploy** (Vercel): `main` branch → https://level-two-eight.vercel.app/

## Version Number

**Always increment version after changes** — Update `src/version.ts` after every change and tell user which version to test.

Format: `v0.X.Y` where X is feature number, Y is fix number within feature.

Example:
```
v0.2.4  →  v0.2.5  (fix within same feature)
v0.2.5  →  v0.3.0  (new feature)
```

## Language

- Communicate in Russian
- Code and comments in English

## Build Verification

**CRITICAL: Always run `npm run build` before committing** — Vercel will reject deployments with TypeScript errors.

Common TypeScript issues to avoid:
- Unused imports → Remove them or prefix with `_`
- Unused function parameters → Prefix with `_` (e.g., `_context`)
- Missing fields in types → Update type definitions when adding new fields
- Optional fields → Use `??` for defaults (e.g., `config.minTier ?? 0`)
- Private method access → Make methods `public` or `static` if needed externally

```bash
# Before committing:
npm run build

# If build fails, fix errors, then commit
```

## Documentation

**Keep documentation up to date** — After making significant changes, update:

1. **CLAUDE.md** — Update "Current State" and "Known Issues" sections
2. **docs/** — Update relevant design docs if architecture changes
3. **Code comments** — Add/update comments for complex logic

What counts as "significant":
- New features or components
- Changed architecture or data flow
- Fixed or discovered issues
- Changed file structure

---

## Project: BG Planner (branch: `main`)

**BG Planner** — a blood glucose management game where players drag food cards and exercise interventions onto a BG graph timeline. Food converts into colored "cubes" (20 mg/dL blocks) with ramp-up and decay curves. Interventions (walking, running) remove cubes from the top. The goal is to plan meals within WP budget while keeping BG levels reasonable.

### Tech Stack
- React 19 + TypeScript + Vite
- @dnd-kit for drag-and-drop
- Zustand for state management

### Game Flow

```
Level Select (root screen) — 9 tutorial levels + Test Level tile
  → Tutorial Level: loads level config, enters tutorial mode with guided steps
  → Test Level (🎮): free-play PlanningPhase, no tutorial overlay
    Single screen: BG Graph (top) + Food Inventory + Actions panel (bottom)
    → Drag food card onto graph → cubes appear with wave animation
    → Drag intervention onto graph → top cubes fade out with wave animation
    → Toggle medications (ON/OFF) in Actions panel
    → Track WP budget (food + interventions share same pool)
    → Track kcal with assessment labels
    → Click cubes to remove placed food/intervention
    → Submit → phased layer reveal animation → penalty → results
  ← Back button returns to Level Select from any mode
```

### Key Files

#### Core Engine
- `src/version.ts` — version number (v0.55.19)
- `src/core/types.ts` — type definitions (Ship, PlacedFood, Intervention, PlacedIntervention, GameSettings, GRAPH_CONFIG, overeating penalties)
- `src/core/cubeEngine.ts` — ramp+decay curve algorithm, intervention reduction, graph state calculation

#### App Navigation
- `src/App.tsx` — screen routing (tutorialSelect / testMode / tutorialPlay); starts on tutorialSelect
- `src/App.css` — app layout styles

#### Tutorial Level Select (`src/components/tutorial/`)
- `TutorialLevelSelect.tsx` — 10-tile grid (9 tutorials + Test Level); root screen of the app
- `TutorialLevelSelect.css` — tile card styles

#### Graph Component (`src/components/graph/`)
- `BgGraph.tsx` — SVG-based BG graph with grid, cubes, zones, intervention burn rendering, wave animations, drag-and-drop target, reveal phase animation
- `BgGraph.css` — graph styles, cubeAppear/cubeBurn/preBurnFlash/dropFall/medAppear/revealLabel keyframe animations
- `index.ts` — exports

#### Planning Phase (`src/components/planning/`)
- `PlanningPhase.tsx` — single-screen orchestrator with DnD context, submit/reveal/results flow
- `PlanningHeader.tsx` — header (day label, WP budget, menu placeholder) + exported KcalBar component (kcal bar, satiety indicator, submit button)
- `PancreasButton.tsx` — compact ON/BOOST toggle overlay on graph
- `ShipCard.tsx` — draggable food cards with emoji, kcal, carbs, duration, WP badge
- `ShipInventory.tsx` — food card list from level config
- `InterventionCard.tsx` — draggable intervention cards (green) with emoji, duration, depth, WP badge
- `InterventionCard.css` — intervention card styles
- `InterventionInventory.tsx` — combined Actions panel: medication toggles + intervention cards
- `MedicationPanel.css` — medication toggle styles (purple theme)
- `ResultPanel.tsx` — star rating, penalty breakdown, retry/next buttons

#### State Management
- `src/store/gameStore.ts` — Zustand store: placedFoods, placedInterventions, settings, combined kcal/WP tracking, overeating penalty per day
- `src/store/configStore.ts` — Zustand store: config overrides (food, pancreas, interventions, medications) persisted in localStorage

#### Configuration
- `src/config/loader.ts` — loads and transforms foods.json, interventions.json, level configs; applies config overrides
- `public/data/foods.json` — 24 food items with glucose, carbs, protein, fat, duration, kcal, wpCost
- `public/data/interventions.json` — 4 interventions: Light Walk, Heavy Run, Take a Break, Take a Rest
- `public/data/medications.json` — 3 medications: Metformin, SGLT2 Inhibitor, GLP-1 Agonist
- `public/data/levels/level-01.json` — 3-day level config with kcalBudget, wpBudget, availableFoods, availableInterventions, preplacedFoods, lockedSlots, availableMedications per day

#### Balance Tools
- `scripts/balance-calc.ts` — CLI balance calculator & solver for level design (calc single placement, solve enumerate all)

#### Shared UI
- `src/components/ui/Tooltip.tsx` — universal tooltip component

### Current State (v0.55.19) — Level Select Root Screen, Test Level, T2 Redesign, Intervention Tail Cap

- **Level Select Screen** ✅ (v0.55.19, root screen — no main menu)
  - 10-tile grid: 9 tutorial levels + Test Level (🎮, "Free play")
  - Tutorials open in guided mode; Test Level opens free-play PlanningPhase
  - Back button in PlanningPhase returns to Level Select
  - No main menu, no config screen

- **Tutorial 2 — Exercises** ✅ (v0.55.17–18)
  - Renamed from "Keep Moving" to "Exercises" (both level name and select tile)
  - D1 reworked: danger-zone coloring on pizza dialog (cubes above 200 turn orange/red), merged drag step
  - D2 redesigned: burger@3PM, heavy run in inventory, wpBudget=14, kcalBudget=1800, lockedSlots=[1,6,10]
  - D2/D3: no tutorial dialogs (free-play puzzles)

- **Danger Zone Tutorial Highlight** ✅ (v0.55.17)
  - `highlight: 'danger-zone'` in tutorial step triggers `showDangerZone` (cube coloring) without penalty overlays
  - New `showPenaltyOverlay` prop on BgGraph separates pulsing penalty rects from zone coloring
  - Penalty overlays only appear during actual results reveal, not during tutorial dialogs

- **Intervention Tail Duration Cap** ✅ (v0.55.17)
  - `maxDuration?: number` field on Intervention type and JSON
  - `calculateInterventionCurve` caps total cols to `round(maxDuration / cellWidthMin)`
  - Light Walk: `maxDuration: 120` → total 4 cols (2 main + 2 tail)
  - Heavy Run: `maxDuration: 360` → total 12 cols (6 main + 6 tail)

- **Combined Actions Panel** ✅
  - Medications and interventions merged into single "Actions" section
  - Purple toggle buttons for medications (ON/OFF)
  - Green draggable cards for interventions (walk/run)

- **Phased Layer Reveal Animation — Variant B** ✅ (v0.54.0)
  - Submit triggers progressive layer-by-layer reveal
  - Phase 1: Food cubes appear with wave animation + food emoji markers + label "🍽️ Food Cubes"
  - Phase 2: Real bomb animations fire (`revealBombsTrigger` incremented → BgGraph second useLayoutEffect); wait for `onBurnAnimComplete` to advance (no hold timer). Orange/amber burned cubes persist as semi-transparent layers after bombs land
  - Phase 3: Exercise burns (walk/run, green burned cubes) + label "🏃 Exercise" — hold timer 1200ms
  - Phase 4: Medication burns (fuchsia/purple/violet) + label "💊 Medications" — hold timer 1200ms
  - Exercise and meds phases auto-skipped if not used; Pancreas always shown
  - Floating label badge in graph upper-right corner during each phase
  - After all phases: `setShowBurns(true)` → all burn layers + penalty overlays + zone hatching visible → ResultPanel

- **Single-Screen Design** ✅
  - Graph on top, food inventory + Actions panel below (horizontal card layout)
  - No phase transitions within test mode — everything on one screen

- **Dynamic Y-axis Expansion** ✅ (v0.40.4, updated v0.47.2)
  - When cubes exceed 450 mg/dL, graph auto-expands in +100 mg/dL (2-row) sections
  - `GRAPH_H = 144px` stays fixed — cell height compresses to fit more rows
  - `effectiveRows = TOTAL_ROWS + ceil((maxRow - TOTAL_ROWS) / 2) * 2`
  - `cellHeight = GRAPH_H / effectiveRows` (replaces fixed CELL_SIZE for Y)
  - Cubes become rectangular (width = CELL_SIZE-1, height = cellHeight-1)
  - Zone backgrounds, grid lines, Y-axis labels, markers all scale dynamically
  - Y-axis labels: every 100 mg/dL (100, 200, 300...) with white text + dark blue stroke outline
  - Removing food returns graph to normal size (effectiveRows=8)

- **BG Graph** ✅ (updated v0.47.x)
  - SVG graph with X axis (8 AM to 8 PM, 24 columns × 30 min)
  - Y axis (50 to 450+ mg/dL, dynamic rows × 50 mg/dL)
  - Grid lines: major every hour, minor every 30 min; edge lines bold (1.5px)
  - No border — bold edge grid lines instead
  - Red threshold line at 200 mg/dL
  - Zone colors: green (<150), yellow (150-200), orange (200-300), red (300+)
  - Dynamic zone clip bands using `zoneRow()` helper (mg/dL-based, not hardcoded rows)
  - X axis labels: 8 AM, 11 AM, 2 PM, 5 PM, 8 PM
  - Y axis labels: 100, 200, 300, 400 (+ 500, 600...) — white, semi-bold, dark blue stroke outline
  - Droppable zone for @dnd-kit (accepts both food and interventions)

- **Cube Engine** ✅
  - Food → cubes: glucose / 20 = peak cube height
  - Duration → columns: duration / 15 = ramp-up column count
  - **Ramp + Decay curve** (replaces old pyramid):
    - Rise phase: linear from 0 to peak over duration columns
    - Decay ON: gradual decline after peak (~0.5 cubes per column = 1 cube/30 min)
    - Decay OFF: flat plateau from peak to right edge
  - Stacking: cubes from different foods stack vertically
  - Decay toggle: ON/OFF button in header (toggling restarts game)

- **Intervention System** ✅
  - Four interventions: Light Walk, Heavy Run, Take a Break, Take a Rest
  - **Exercise interventions** (walk/run): two-phase curve — main phase at full depth, then tail at reduced depth
    - Main phase: `duration / 15` columns at full `depth` (no ramp, immediate full power)
    - Tail phase: remaining columns at `boostExtra` depth (residual burn)
    - Light Walk: 🚶 4 cols at 3 cubes, then 1 cube to end (2 WP)
    - Heavy Run: 🏃 12 cols at 5 cubes, then 2 cubes to end (4 WP, slotSize=2)
  - **Break interventions** (v0.40.25): restore WP, no cube effect
    - Take a Break: ☕ −1 WP cost (refunds 1 WP), 30m duration
    - Take a Rest: 😴 −2 WP cost (refunds 2 WP), 120m duration, slotSize=2
  - **Drag preview**: when dragging an intervention over the graph, per-cube green overlays show exactly which food cubes would be burned (pulsing animation)
  - Cubes are removed from the **top** of the food stack at each column
  - **Per-source burn coloring** (v0.39.0): burned cubes colored by source, not food color
    - Walk burned: `#86efac` light green (opacity 0.55)
    - Run burned: `#22c55e` darker green (opacity 0.55)
    - SGLT2 burned: `#c084fc` purple (opacity 0.55)
    - Stacking order in burned zone (bottom→top): walk → run → SGLT2
  - Click burned cubes to remove intervention
  - Interventions share WP budget with food
  - **Intervention Markers** (v0.38.8): emoji bubble markers on peak reduction column
    - White bubble with green border (`#22c55e`), same style as food markers
    - Draggable — drag to move intervention, drag off graph to remove
    - Markers use `columnCaps` height (responsive to other interventions)

- **Medication System** ✅ (v0.50.0 — row-pattern burns)
  - Three medications as day-wide toggles (ON/OFF), no WP cost
  - **Metformin** (💊 `peakReduction`): burn pattern `[0,3,1]` — 3 rows, every 3rd column skipped
  - **SGLT2 Inhibitor** (🧪 `thresholdDrain`): burn pattern `[0,2]` — 2 rows, floor at 200 mg/dL
    - Purple dashed drain line at 200 mg/dL threshold
    - `sglt2D = min(rawSglt2D, max(0, heightBeforeSglt2 - floorRow))` — floor preserved
  - **GLP-1 Agonist** (💉 `slowAbsorption`): burn pattern `[0,3]` + duration ×1.5 + peak reduction (`floor(extraCols/2)`) + kcal −30%, WP +4
  - Purple toggle panel between graph and food inventory
  - Available per day via `availableMedications` in level config
  - Day 1: none, Day 2: Metformin, Day 3: Metformin + GLP-1
  - Burned cubes from medications colored: Metformin `#f0abfc` fuchsia, SGLT2 `#c084fc` purple, GLP-1 `#a78bfa` violet

- **Wave Animations** ✅
  - `cubeAppear`: food cubes pop in with scale (0.3→1.08→1) + opacity wave, left-to-right
  - `cubeBurn`: burned cubes fade to 0.55 opacity with wave effect (increased from 0.35 for burn color visibility)
  - Wave delay: 20ms per column offset from drop point

- **Burn Animation System** ✅ (v0.51.0–v0.55.0, `hideBurnedInPlanning=true` by default)
  - During planning, ПЖ/BOOST burned cubes are **hidden** by default — shown only via animated drops
  - **👁️ Burns visibility toggle** (v0.51.12 → v0.53.1): button in bottom day-nav bar, planning + results (not tutorial)
    - Default: hidden (`showBurns=false`); active button: orange highlight, burned cubes fully visible
    - `hideBurnedInPlanning = (isPlanning || showResults) ? !showBurns : gamePhase === 'replaying' && ((revealPhase ?? 99) <= 2)`
  - **Pre-burn phase** (v0.51.2): before drops fall, burn zone rendered as food-colored glucose (class `--pre-burn`)
    - Plateau-extra cubes (above decay top) also rendered food-colored and get bombed away
    - CSS `preBurnFlash` (0.45s): opacity 1 → flash → 0, triggered at each column's hit time
  - **Meteor drops** (v0.51.6–7): N small oval drops per column (N = pancreasR + boostR)
    - Drop shape: `<ellipse rx=2.5 ry=6>`, tilted `rotate(20deg)`, trajectory 70° to horizontal
    - Direction: upper-left → lower-right; `dx = dy / tan(70°) ≈ 0.364 * dy`
    - Wave: `waveDelay = 400 + |col - firstDropCol| * 12 ms`; intra-column stagger: 60ms/drop
    - Animation: `dropFall` 1.0s (ПЖ) / 0.9s (BOOST); brightness flash at impact, disappears
    - BOOST drops: amber `#f59e0b`, slightly faster
  - **Plateau preview** (v0.51.3): hover preview uses `decayRate=0` — shows flat plateau after peak
    - Plateau-extra cubes computed per food: columns where plateau height > decay height (post-peak only)
    - `plateauExtraRows[col]` accumulated globally, used in bomb height and pre-burn skyline
  - **Preview base fix** (v0.51.5): preview uses `columnCaps[col]` as base row (not `pancreasCaps`) when `hideBurnedInPlanning=true` — eliminates gap between visible food and hover preview
  - **Skylines disabled** (v0.51.12): individual food step-path skylines removed from rendering
  - **Stable tag**: `alpha-14-stable` = v0.55.0 (animated results reveal sequence)

- **Phased Layer Reveal — Variant B** ✅ (v0.54.0, replaces old hold-timer-only reveal)
  - Phase 2 (pancreas): real bomb animations fire during reveal via `revealBombsTrigger` prop increment
    - `onBurnAnimComplete` callback advances reveal from phase 2 (instead of hold timer)
    - `advanceRevealRef` stores callback; `handleBurnAnimComplete` calls both tutorial + reveal advance
  - After phase 2: pancreas/boost burned cubes remain visible as semi-transparent colored layers
  - After all phases: `setShowBurns(true)` auto-called → burns visible in results by default
  - Zone hatching visible in results: `showHatchingOverride={showResults}` prop on BgGraph
  - Penalty overlays + hatching + all burn layers shown in final results state

- **Animated Results Reveal Sequence** ✅ (v0.55.0)
  - After all burn phases complete, a 4-phase sub-sequence plays before showing action buttons
  - **Phase 0 — danger flash** (600ms): red 200 mg/dL line + hatching bands flash simultaneously (`dangerLineFlash` / `hatchBandFlash` CSS animations)
  - **Phase 1 — counting** (50ms × columns + min 600ms): cubes above 200 change color food→danger column-by-column left-to-right (`dangerReveal` brightness flash); "Excess Glucose" counter ticks 0→N with ease-out quadratic interpolation
  - **Phase 2 — stars** (250ms × earned stars): 3 empty ☆☆☆ visible immediately, then earned ★ pop in one-by-one (`starReveal` rotation animation); key-based React remount triggers animation on each star
  - **Phase 3 — label** (400ms): result label appears with `labelBounceIn` bounce animation; then action buttons revealed
  - **Tap/click to skip**: click anywhere during animation → `skipResultsReveal()` clears all timers, jumps to final state
  - State: `resultsRevealPhase: 0|1|2|3|undefined`, `displayedPenalty: number`, `visibleStars: number`
  - `showDangerZone` prop on BgGraph: replaces `revealPhase !== undefined || showPenaltyHighlight` bug — danger coloring only when `resultsRevealPhase >= 1 || showResults`
  - `showHatchFlash` prop on BgGraph: triggers one-shot flash on hatching bands and 200 line
  - ResultPanel props: `visibleStars`, `showLabel`, `displayedPenalty`

- **PancreasButton Redesign** ✅ (v0.53.0)
  - L-shape layout: top row (🫀 emoji + charge circles + hint text) + bottom row (effectiveness bar)
  - Effectiveness bar: 5 sections visual-only indicator; BOOST appends extra red-orange sections
  - `pancreasEffectiveness?: number` in DayConfig (1-5, default 5) — passed from level config
  - `boostSegPulse` animation on BOOST sections while boost is active

- **WP Budget** ✅
  - Per-day wpBudget from level config (Day 1: 10, Day 2-3: 10)
  - Header shows wpUsed/wpBudget with ☀️ icon
  - **Combined tracking**: food wpCost + intervention wpCost share same pool
  - **Hard limit**: cards disabled (grayed out, non-draggable) when WP insufficient
  - Drop rejected if wpCost exceeds remaining WP
  - **WP carry-over penalty**: unspent WP from previous day reduces next day's budget
  - **Overeating penalty**: −1 WP per overeating step from previous day
  - Floor: WP cannot drop below 50% of base budget

- **Food Cards** ✅
  - Display: emoji, name, kcal, carbs (g), duration (m)
  - WP cost badge (☀️) when wpCost > 0
  - Disabled state (grayed out) when WP insufficient
  - Drag from inventory → drop on graph
  - Click on placed cubes → remove food
  - Inventory below graph, cards arranged horizontally (flex-wrap)

- **Kcal Assessment** ✅
  - No hard calorie limit — kcal is informational but overeating has penalties
  - Header shows total kcal + text assessment based on % of effectiveKcalBudget:
    - 0%: Fasting (gray)
    - <25%: Starving (red)
    - 25-50%: Hungry (orange)
    - 50-75%: Light (yellow)
    - 75-100%: Well Fed (green)
    - 100-120%: Full (green)
    - 120-150%: Overeating (orange)
    - >150%: Stuffed (red)

- **Food Nutritional Data** ✅
  - All 24 foods have: carbs, protein, fat, kcal
  - protein/fat stored for future use, not displayed on cards yet

- **Food Cube Colors** ✅
  - **Progressive blue palette**: each food gets a progressively darker shade by placement order
  - 7-color Tailwind sky palette: `#7dd3fc` (sky-300) → `#0c4a6e` (sky-900)
  - First food = lightest blue, second = darker, third = even darker, etc.
  - `getFoodColor(index)` returns the hex color for the Nth placed food

- **Decay-Based Stacking** ✅ (v0.38.2)
  - Cubes are positioned using ACTUAL decay curves (with real decayRate)
  - Ensures all alive cubes are below the alive boundary (pancreasCaps)
  - **Thin pancreas layer** (v0.38.4): only render `min(pancreasExtra, tierHeight)` eaten cubes per column
    - `tierHeight = max(1, round(decayRate * 4))` → Tier I=1, II=2, III=3 cubes
  - Pancreas-eaten cubes rendered in orange (`#f97316`) ABOVE the entire alive stack
  - When decayRate=0 (Pancreas OFF): decay=plateau, stacking identical to old flat model
  - Visual model (bottom → top): alive → intervention burned → pancreas eaten → medication prevented

- **Food Markers** ✅
  - Each food gets an emoji label marker above its peak on the graph
  - White bubble with tail pointing to the food's highest alive cubes
  - Markers are draggable — drag to move food, drag off graph to remove
  - Centered over columns where the food's visible height (`skylineRow - baseRow`) is maximum
  - **skylineRow vs aliveTop**: `aliveTop` = unclamped per-food boundary; `skylineRow` = clamped by `columnCaps` (responds to interventions)
  - **Stable marker positioning** (v0.39.7): markers use food's OWN visible height (skylineRow - baseRow) for peak finding, skylineRow for tail Y — prevents displacement for 4th+ foods

- **Individual Food Skylines** — disabled (v0.51.12)
  - White step-path skylines between food layers removed from rendering
  - Were: traced ALIVE boundary per food using `skylineRow` (clamped by columnCaps)

- **Penalty / Rating System** ✅
  - Submit button triggers penalty calculation on current graph state
  - Orange zone (200-300 mg/dL, rows 3-4): 0.5 penalty weight per cube
  - Red zone (300+ mg/dL, rows 5+): 1.5 penalty weight per cube
  - Star rating: 3★ Perfect (≤12.5), 2★ Good (≤50), 1★ Pass (≤100), 0★ Defeat (>100)
  - Penalty highlight overlays (pulsing orange/red) on cubes above threshold

- **Row-Pattern Burn System** ✅ (v0.50.0, replaces insulin profile)
  - Each burn mechanism described by `number[]` array — per-row skip pattern
  - `patternDepth(pattern, col)` — counts active burn rows for a given time column
  - Skip logic: `skip=0` → row always burns; `skip=N` → alternates N-skip/N-burn
  - **Pancreas**: `[0, 0]` — 2 solid rows, every column
  - **BOOST**: `[0, 3]` — 2 rows, every 3rd column group
  - **BOOST** button ON/OFF toggle, 1 use per level, hidden T1-T3
    - Button overlaid on graph top-left corner
  - 7-layer burn zone (bottom→top per column): walk → run → pancreas → boost → metformin → sglt2 → glp1
  - Burn colors: walk `#86efac`, run `#22c55e`, pancreas `#f97316`, boost `#f59e0b`, metformin `#f0abfc`, sglt2 `#c084fc`, glp1 `#a78bfa`

- **Starting BG Level** ✅ (v0.47.0)
  - Configurable `startingBg` per day in level config (default: 50 mg/dL = row 0)
  - Higher values shift all cubes up from a baseline row
  - Formula: `baselineRow = Math.round((startingBg - bgMin) / cellHeightMgDl)`
  - Visual: subtle filled rect + dashed line at baseline when baselineRow > 0
  - Affects: aliveStacks init, columnCaps clamping, penalty calculation

- **Vertical Layout Redesign** ✅ (v0.47.x)
  - KcalBar extracted as standalone component from PlanningHeader
  - Layout order: PlanningHeader → Graph → KcalBar → SlotGrid → Inventory
  - PlanningHeader simplified: day label + WP indicator + disabled menu icon (☰)
  - KcalBar: satiety indicator (centered above) + kcal progress bar + footer (counter + Submit)
  - Slot cards: transparent backgrounds (no plates) for all states
  - Forecast badge: shows ☀️ and kcal only (no food emoji by default)
  - Dead CSS removed (assessment-badge, wp-label classes)

- **Zone Hatching** ✅ (v0.47.17-18)
  - Diagonal hatching on glucose cubes above 200 mg/dL
  - Orange hatching for 200-300 mg/dL zone, red hatching for 300+ mg/dL zone
  - Replaces old solid zone fill for better visual clarity

- **Food Speed Labels** ✅ (v0.47.72)
  - Each food card shows absorption speed: Fast / Medium / Slow
  - Derived from duration: Fast <45m, Medium 45-90m, Slow >90m

- **Insulin Profile Visualization** — removed (v0.50.0)
  - Replaced by row-pattern burn system; insulin rate bars no longer rendered

- **bonusBoostBars Mechanic** ✅ (v0.47.55)
  - Tutorial-04 introduces extra BOOST bars as a reward mechanic
  - `bonusBoostBars` field in day config grants additional BOOST uses
  - Passed through loader.ts dayConfigs transform

- **Tutorial System** ✅ (v0.47.20-v0.48.18)
  - 8 tutorial levels across 3 days each (tutorials 01-08 + tutorial-05 "Under Stress")
  - `tutorialData.ts` — step definitions per level/day with bubble, highlight, CTA, advanceOn
  - CTA types: `drag-arrow` (animated arrow), `tap-pulse` (pulsing target), `glow-border`, `bounce`
  - `lockedTab` — prevents switching tabs during step
  - `noBackdrop` — shows highlight without darkening background
  - Bubble `position` values: `top` | `bottom` | `center` | `inventory`
  - Auto-relocate: bubbles shift to bottom when spotlight is in lower half of screen
  - Passthrough mode: spotlight divs hidden for iOS drag-drop compatibility
  - Tutorial-05 "Under Stress" — stress slot highlighting, 3-day arc
  - **Stress slot pulse** (v0.48.7): when `highlight: 'stress-slots'` in tutorial step, BgGraph pulses stress column (opacity 0.15→0.45 loop) via `highlightStressSlots` prop
  - `spotlight` highlight type must target DOM elements only — SVG-based targets (stress-slots) use `highlightStressSlots` prop instead to avoid beam artifact
  - **BOOST button hidden for T1/T2/T3** (v0.48.14): PancreasButton not rendered until tutorial-04 where BOOST is introduced
  - **Stress slot visual fix** (v0.48.11): BgGraph was using `slotIndex * 4` instead of `slotIndex * COLS_PER_SLOT` — stress zones appeared at double the correct column position
  - **T6 Metformin tutorial redesign** (v0.48.15-18): 9-step narrative — peak spotlight → WP/run hint → BOOST warning → Actions tab → Metformin spotlight → no-WP hint → toggle → med-effect pulse → place+submit; `highlightMedEffect` prop pulses fuchsia prevented-cubes; T6D1 wpBudget=4 (Heavy Run costs all WP)
  - **Drag rejection UX** (v0.48.17): locked slots highlight red (`--drag-blocked`) while dragging; failed drop triggers shake animation (`--rejected`), `rejectedSlot` state in PlanningPhase
  - All tutorials balanced for realistic kcal (1400-2000) and WP (7-12) ranges

- **Satiety Bonus System** — disabled (v0.47.76)
  - WP/kcal bonuses for Well Fed removed from game balance
  - Forecast badge simplified (no bonus display)

- **Overeating Penalty System** ✅ (v0.40.6)
  - Each satiety level beyond Well Fed penalizes the next day:
    - Full (100-120%): +100 kcal budget, −1 WP, +1 free 🍦
    - Overeating (120-150%): +200 kcal budget, −2 WP, +2 free 🍦
    - Stuffed (>150%): +300 kcal budget, −3 WP, +3 free 🍦
  - Penalty stored per-day in Zustand (`overeatingPenaltyPerDay`)
  - Kcal budget increases (must eat more next day)
  - WP budget decreases (less willpower)
  - Free Ice Cream (0 WP) injected into inventory via `effectiveAvailableFoods`
  - Header shows penalty badges: red `−N` near WP, orange `+N00` near kcal
  - Tooltips explain penalty source on hover

- **Pre-placed Foods** ✅ (v0.42.12)
  - Level config specifies foods already on the graph when day starts
  - `preplacedFoods: [{ shipId: "burger", slotIndex: 0 }]`
  - Player cannot remove pre-placed foods — they define the puzzle's constraint
  - Creates mandatory stacking the player must manage with interventions/medications

- **Locked Slots** ✅ (v0.42.12)
  - Level config specifies slots where player cannot place anything
  - `lockedSlots: [0, 1, 3, 4, 6, 7, 9, 10]`
  - Design rule: max 2 consecutive locked slots (no long blocked segments)
  - Design rule: no pre-placed foods in adjacent slots
  - Constrains player choices to create meaningful puzzle decisions

- **Balance Solver** ✅ (v0.42.13+)
  - CLI tool `scripts/balance-calc.ts` for level design
  - `calc` command: calculate penalty for a single placement
  - `solve` command: enumerate all valid placements, count 3★/2★/1★/💀 distribution
  - Last-day unspent WP penalty: +5 per unspent WP (WP_PENALTY_WEIGHT=5)
  - Auto-detects last day from level config, or use `--last-day` flag

- **Day Navigation** ✅
  - Cheat buttons at bottom: "Day 1", "Day 2", "Day 3" for quick switching
  - Active day highlighted, disabled when already on that day

- **Game Settings** ✅
  - Time format toggle: 12h ↔ 24h
  - BG unit toggle: mg/dL ↔ mmol/L
  - Persisted in localStorage

### Food Data Structure
```json
{
  "id": "banana",
  "name": "Banana",
  "emoji": "🍌",
  "glucose": 230,
  "carbs": 23,
  "protein": 1,
  "fat": 0,
  "duration": 45,
  "kcal": 395,
  "wpCost": 1,
  "description": "Natural energy, potassium rich."
}
```

### Intervention Data Structure
```json
{
  "id": "lightwalk",
  "name": "Light Walk",
  "emoji": "🚶",
  "depth": 3,
  "duration": 60,
  "wpCost": 2,
  "boostCols": 3,
  "boostExtra": 1
}
```

### Medication Data Structure
```json
{
  "id": "metformin",
  "name": "Metformin",
  "emoji": "💊",
  "type": "peakReduction",
  "multiplier": 0.80,
  "description": "Reduces peak glucose by 20%"
}
```

### Medication Parameters

| Medication | Emoji | Type | Burn Pattern | Extra Effects |
|-----------|-------|------|-------------|---------------|
| Metformin | 💊 | peakReduction | `[0,3,1]` — 3 rows, skip-3 | — |
| SGLT2 Inhibitor | 🧪 | thresholdDrain | `[0,2]` — 2 rows, skip-2 | floorMgDl: 200 |
| GLP-1 Agonist | 💉 | slowAbsorption | `[0,3]` — 2 rows, skip-3 | durationMult: 1.5, peakReduction: floor(extraCols/2), kcalMult: 0.7, wpBonus: +4 |

### Food Parameters Table

Based on USDA FoodData Central, GI databases. `glucose = carbs × 10`, duration from GI + macronutrient composition.

| # | Food | Emoji | Carbs | Protein | Fat | Kcal | WP | Duration | Cubes | Cols |
|---|------|-------|------:|--------:|----:|-----:|---:|---------:|------:|-----:|
| 1 | Banana | 🍌 | 18g | 1g | 0g | 160 | 1 | 45m | 4 | 2 |
| 2 | Apple | 🍎 | 17g | 1g | 0g | 140 | 1 | 45m | 3 | 2 |
| 3 | Ice Cream | 🍦 | 16g | 4g | 11g | 200 | 0 | 60m | 3 | 2 |
| 4 | Popcorn | 🍿 | 15g | 3g | 2g | 140 | 1 | 45m | 3 | 2 |
| 5 | Cookie | 🍪 | 15g | 2g | 7g | 230 | 2 | 60m | 3 | 2 |
| 6 | Caesar Salad | 🥗 | 8g | 9g | 12g | 460 | 3 | 120m | 2 | 4 |
| 7 | Choco Muffin | 🧁 | 35g | 6g | 18g | 550 | 0 | 60m | 7 | 2 |
| 8 | Sandwich | 🥪 | 16g | 17g | 14g | 470 | 3 | 180m | 3 | 6 |
| 9 | Chicken Meal | 🍗 | 10g | 35g | 12g | 370 | 3 | 120m | 2 | 4 |
| 10 | Bowl of Rice | 🍚 | 30g | 4g | 0g | 360 | 4 | 150m | 6 | 5 |
| 11 | Hamburger | 🍔 | 27g | 22g | 28g | 620 | 2 | 150m | 5 | 5 |
| 12 | Oatmeal | 🥣 | 20g | 6g | 4g | 230 | 4 | 120m | 4 | 4 |
| 13 | Pizza | 🍕 | 23g | 12g | 12g | 460 | 3 | 90m | 5 | 3 |
| 14 | Boiled Eggs | 🥚 | 0g | 13g | 10g | 230 | 4 | 150m | 0 | 5 |
| 15 | Mixed Berries | 🫐 | 15g | 2g | 1g | 110 | 2 | 45m | 3 | 2 |
| 16 | Greek Yogurt | 🥛 | 5g | 11g | 11g | 230 | 3 | 90m | 1 | 3 |
| 17 | Milk 2% | 🥛 | 10g | 8g | 5g | 180 | 3 | 45m | 2 | 2 |
| 18 | Vegetable Stew | 🥘 | 15g | 5g | 5g | 230 | 4 | 150m | 3 | 5 |
| 19 | Boiled Carrots | 🥕 | 5g | 1g | 0g | 80 | 4 | 45m | 1 | 2 |
| 20 | Chickpeas | 🫘 | 20g | 9g | 3g | 410 | 3 | 90m | 4 | 3 |
| 21 | Cottage Cheese | 🧀 | 5g | 25g | 9g | 320 | 4 | 120m | 1 | 4 |
| 22 | Hard Cheese | 🧀 | 0g | 7g | 9g | 170 | 3 | 150m | 0 | 5 |
| 23 | Avocado | 🥑 | 7g | 2g | 15g | 240 | 3 | 150m | 1 | 5 |
| 24 | Mixed Nuts | 🥜 | 10g | 5g | 16g | 310 | 2 | 150m | 2 | 5 |

**Derived:** Cubes = round(glucose / 25) (cellHeightMgDl=25, glucose = carbs × 10), Cols = round(duration / 30) (cellWidthMin=30). Sources: USDA FoodData Central, glycemic-index.net

### Intervention Parameters

| Intervention | Emoji | Depth | Duration | WP | maxDuration | SlotSize | Effect |
|-------------|-------|------:|---------:|---:|------------:|---------:|--------|
| Light Walk | 🚶 | 2 cubes | 60m (2 main cols) | 2 | 120m (4 cols total) | 1 | Main: 2 cubes for 2 cols, tail: 2 cubes for 2 more cols |
| Heavy Run | 🏃 | 4 cubes | 180m (6 main cols) | 4 | 360m (12 cols total) | 2 | Main: 4 cubes for 6 cols, tail: 2 cubes for 6 more cols |
| Take a Break | ☕ | 0 | 30m (1 col) | −1 | — | 1 | Refunds 1 WP, no cube effect |
| Take a Rest | 😴 | 0 | 120m (4 cols) | −2 | — | 2 | Refunds 2 WP, no cube effect |

### Level Config Structure
```json
{
  "id": "level-01",
  "name": "First Steps",
  "days": 3,
  "dayConfigs": [
    {
      "day": 1,
      "kcalBudget": 1800,
      "wpBudget": 10,
      "availableFoods": [
        { "id": "cookie", "count": 1 },
        { "id": "milk", "count": 1 },
        { "id": "chickpeas", "count": 1 }
      ],
      "availableInterventions": [
        { "id": "lightwalk", "count": 1 },
        { "id": "takeabreak", "count": 1 }
      ],
      "preplacedFoods": [
        { "shipId": "burger", "slotIndex": 0 },
        { "shipId": "banana", "slotIndex": 4 }
      ],
      "lockedSlots": [0, 1, 3, 4, 6, 7, 9, 10]
    }
  ]
}
```

### Level 01 Balance (v0.43.0)

| Day | kcal | WP | Pre-placed | Locked | Free | Foods | Interventions | Meds | 3★ % |
|-----|-----:|---:|-----------|--------|------|-------|--------------|------|-----:|
| 1 | 1800 | 10 | burger@0, banana@4 | [0,1,3,4,6,7,9,10] | [2,5,8,11] | cookie,milk,chickpeas | walk×1,break×1 | — | 14.8% |
| 2 | 2000 | 10 | banana@0, muffin@5 | [1,3,6,8,11] | [2,4,7,9,10] | chickpeas,cookie,oatmeal | walk×2,break×1 | metformin | 13.4% |
| 3 | 2000 | 10 | burger@0, muffin@2, oatmeal@5 | [0,2,3,5,6,8,9,11] | [1,4,7,10] | sandwich,cookie,banana,milk | walk×1,break×2 | met+glp1 | 0.7%* |

*Day 3 requires BOOST to achieve 3★. Without BOOST: 0% 3★.

Key puzzle solutions:
- **Day 1**: lightwalk@2 covers burger+banana overlap
- **Day 2**: metformin + 2×lightwalk near muffin spike
- **Day 3**: both meds + BOOST + lightwalk@1 + sandwich@7, precise WP management

### Graph Configuration Constants
| Constant | Value | Location |
|----------|-------|----------|
| startHour | 8 (8 AM) | `types.ts` GRAPH_CONFIG |
| endHour | 20 (8 PM) | `types.ts` GRAPH_CONFIG |
| cellWidthMin | 30 min | `types.ts` GRAPH_CONFIG |
| cellHeightMgDl | 25 mg/dL | `types.ts` GRAPH_CONFIG |
| bgMin | 50 mg/dL | `types.ts` GRAPH_CONFIG |
| bgMax | 450 mg/dL | `types.ts` GRAPH_CONFIG |
| TOTAL_COLUMNS | 24 | `types.ts` derived |
| TOTAL_ROWS | 16 | `types.ts` derived (400 / 25) |
| CELL_SIZE | 18px (SVG) | `BgGraph.tsx` |
| GRAPH_H | 144px | `BgGraph.tsx` |
| PENALTY_ORANGE_ROW | 6 | `types.ts` (200 mg/dL = (200-50)/25) |
| PENALTY_RED_ROW | 10 | `types.ts` (300 mg/dL = (300-50)/25) |
| PAD_LEFT/TOP/RIGHT | 4 | `BgGraph.tsx` |
| PAD_BOTTOM | 1 | `BgGraph.tsx` |
| PANCREAS_TOTAL_BARS | 1 | `types.ts` — BOOST uses per level |
| BOOST_EXTRA_RATE | 4 | default — cubes absorbed per col above 200 |

### Cube Engine Details

#### Ramp + Decay Algorithm (v0.50.0)
1. `peakCubes = Math.round(glucose / cellHeightMgDl)` (glucose in mg/dL units, cellHeightMgDl=25)
2. `riseCols = Math.round(duration / cellWidthMin)` (cellWidthMin=30)
3. Rise phase (cols 0..riseCols-1): `height = round(peakCubes × (i+1)/riseCols)` — linear ramp
4. Post-peak: decay via `decayRate = 0.5` (legacy formula — ~1 cube per 30 min)
5. Drop column = left edge (start of food absorption)
6. GLP-1: `duration × 1.5` before curve calculation (wider curve); peak reduced by `floor(extraCols/2)` where `extraCols = effectiveRiseCols − originalRiseCols`

#### Row-Pattern Burn Algorithm (v0.50.0)
`patternDepth(pattern, col)` — for each element: `skip=0` → always +1; `skip=N` → group=floor(col/N), burn if group%2===1
- `columnCaps[col] = max(baselineRow, pancreasCaps[col] − interventionRed − pancreasD − boostD − metforminD − sglt2D − glp1D)`
- SGLT2 floor: `sglt2D = min(rawSglt2D, max(0, heightBeforeSglt2 − floorRow))`

#### Intervention Algorithm (v0.55.17)
1. `depth` = cubes to remove during main phase
2. `mainCols = Math.round(duration / cellWidthMin)` = main phase length (cellWidthMin=30)
3. Main phase: flat at `depth` for `mainCols` columns (no ramp)
4. Tail phase: flat at `boostExtra`; capped by `maxDuration` if set: `maxTotalCols = round(maxDuration / 30)`
5. Multiple interventions stack (reductions add up)
6. Cubes removed from top — bottom cubes stay visible

#### Food Colors
Progressive blue palette by placement order: 7-color Tailwind sky shades from `#7dd3fc` (lightest) to `#0c4a6e` (darkest). First food placed = lightest, each subsequent food = darker shade.

#### Cube Stacking Model (v0.50.0)
1. Each food's alive cubes positioned by cumulative decay heights (contiguous stacking)
2. `pancreasCaps[col]` = sum of all alive food heights (stacked food top)
3. `columnCaps[col]` = pancreasCaps minus all pattern burns (interventions + ПЖ + BOOST + meds)
4. Global boundaries determine cube status:
   - `row < columnCaps[col]` → **normal** (full food color)
   - `row >= columnCaps[col]` → **burned** — color by offset within burn zone (bottom→top):
     - walk `#86efac` → run `#22c55e` → pancreas `#f97316` → boost `#f59e0b` → metformin `#f0abfc` → sglt2 `#c084fc` → glp1 `#a78bfa`

#### BG Zones
| Zone | Range | Color |
|------|-------|-------|
| Normal | 50-150 mg/dL | Green |
| Elevated | 150-200 mg/dL | Yellow |
| High | 200-300 mg/dL | Orange (+ red line at 200) |
| Danger | 300-450+ mg/dL | Red |

### Milestones
- `alpha-1-stable` (v0.40.0) — Core gameplay: cubes, interventions, medications, markers, decay-based stacking
- `alpha-2-stable` (v0.40.4) — Main menu, config screen, merged Actions panel, phased reveal animation, dynamic Y-axis
- `alpha-3-stable` (v0.40.25) — WP remaining display, Take a Break/Rest interventions, bidirectional time blocking, level balancing
- `alpha-4-stable` (v0.42.19) — Pre-placed foods, locked slots, balance solver, level-01 3-day puzzle design
- `alpha-5-stable` (v0.43.0) — Insulin profile system, BOOST, visual insulin bars, post-peak drain, re-balanced level-01
- `alpha-8-vertical` (v0.47.12) — startingBg, 50 mg/dL grid cells, Y-axis labels, vertical layout redesign (KcalBar extracted, transparent slot cards, no graph border, red 200 line, dead CSS cleanup)
- `alpha-9-stable` (v0.48.6) — 8 tutorial levels (incl. "Under Stress"), bonusBoostBars, insulin profile visualization, zone-colored hatching, food speed labels, tutorial CTA system (drag-arrow, tap-pulse, lockedTab, noBackdrop, auto-relocate), satiety bonus disabled, result panel reorder, slot grid pull-up on submit, BOOST merged into insulin reveal phase
- `alpha-10-stable` (v0.48.14) — stress slot pulse animation, T5 tutorial fixes, BOOST hidden for T1-T3, stress slot visual position fix, food balance rebalance (10 items), T2D1 chicken→chickpeas, archived branch docs cleanup
- `alpha-11-stable` (v0.48.18) — T6 Metformin tutorial redesign (9 steps, highlightMedEffect prop, wpBudget=4), Heavy Run added to T6D1, locked slot drag rejection UX (red highlight + shake animation), T6D1 unlocked slots 9AM/1PM/5PM/6PM
- `alpha-12-stable` (v0.50.0) — Row-pattern burn system replaces insulin profiles: ПЖ=[0,0], BOOST=[0,3], Metformin=[0,3,1], SGLT2=[0,2], GLP-1=[0,3]; removed glucose multipliers; 7-layer burn zone coloring; GLP-1 keeps duration/kcal/WP effects
- `alpha-13-stable` (v0.51.2) — Pre-burn glucose phase: burn zone shown as food-colored before meteor drops; per-column hit timing via `bombHitDelays` Map; branch `stable/v0.51.2` for rollback
- *(v0.51.11)* — GLP-1 peak reduction: `peakReduction = floor(extraCols/2)`, only when GLP-1 active; without GLP-1 all peaks unchanged
- *(v0.51.12)* — Burns visibility toggle (🔥 button), individual food skylines disabled, burnedCols state removed
- *(v0.52.1)* — Fix slowMotionRef race condition: `useLayoutEffect` was reading stale ref; fixed by using `slowMotionBurns` prop directly
- *(v0.53.0)* — PancreasButton redesign: L-shape layout (top: emoji + charges + hint; bottom: effectiveness bar); `pancreasEffectiveness` in DayConfig
- *(v0.53.1)* — UI cleanup: remove ∂/∑ cheat button; rename 🔥→👁️; move 👁️ to bottom day-nav; show 👁️ on results screen
- *(v0.54.0)* — Variant B reveal: real bomb animations in phase 2 (`revealBombsTrigger` prop); burn layers persist after phase 2; zone hatching + penalty overlays in results; auto-show burns on results; fix 👁️ on results screen
- *(v0.54.1)* — Fix: `hideBurnedInPlanning` extended to phases 0-2 (was phase 2 only) — no pre-burned state flash at start of results
- *(v0.54.2)* — Fix: show full glucose stack (pre-burn layer) during reveal phase 1 via `isRevealPreBurn` flag; pancreas/boost cube filter changed to `revealPhase >= 1`
- `alpha-14-stable` (v0.55.0) — Animated results reveal: danger flash → cubes sweep + Excess Glucose counter → stars one-by-one → label bounce-in; `showDangerZone` prop fixes danger-coloring bug during burn phases; tap-to-skip
- *(v0.55.17)* — T2 renamed "Exercises"; L2D1 dialogs reworked (danger-zone coloring, merged drag step, fixed pizza peak 250 mg/dL); `showPenaltyOverlay` prop decouples penalty rects from zone coloring; intervention `maxDuration` field caps tail phase (walk 2h, run 6h)
- *(v0.55.18)* — T2D2 puzzle redesign: burger@3PM, heavyrun in inventory, wpBudget=14, kcalBudget=1800, lockedSlots=[1,6,10]; T2D2/D3 dialogs removed; L2D3-2 "New: Heavy Run!" removed
- *(v0.55.19)* — Remove main menu and config screen; app starts on Level Select; Test Level tile added as 10th tile (🎮 Free play); `TutorialLevelSelect` is now the root screen

### Known Issues
- Intervention click on burned cubes always removes the first intervention (not necessarily the one that burned that specific cube)

