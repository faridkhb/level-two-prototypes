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
| `main` | BG Planner | v0.39.2 | Graph-based food planning with cubes, interventions, medications, decay, wave animations |
| `port-planner` | Port Planner | v0.27.1 | Archived — metabolic simulation (WP, slots, organs, SVG pipes) |
| `match3` | Port Planner + Match-3 | v0.28.11 | Match-3 mini-game for food card acquisition |
| `tower-defense` | Glucose TD | v0.4.1 | Tower defense reimagining (projectiles, organ zones) |
| `Dariy` | Port Planner | v0.25.1 | Archived — Mood system branch |

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
Single screen: BG Graph (top) + Food Inventory + Intervention Inventory (bottom)
→ Drag food card onto graph → cubes appear with wave animation
→ Drag intervention onto graph → top cubes fade out with wave animation
→ Track WP budget (food + interventions share same pool)
→ Track kcal with assessment labels
→ Click cubes to remove placed food/intervention
```

### Key Files

#### Core Engine
- `src/version.ts` — version number (v0.39.2)
- `src/core/types.ts` — type definitions (Ship, PlacedFood, Intervention, PlacedIntervention, GameSettings, GRAPH_CONFIG)
- `src/core/cubeEngine.ts` — ramp+decay curve algorithm, intervention reduction, graph state calculation

#### Graph Component (`src/components/graph/`)
- `BgGraph.tsx` — SVG-based BG graph with grid, cubes, zones, intervention burn rendering, wave animations, drag-and-drop target
- `BgGraph.css` — graph styles, cubeAppear/cubeBurn keyframe animations
- `index.ts` — exports

#### Planning Phase (`src/components/planning/`)
- `PlanningPhase.tsx` — single-screen orchestrator with DnD context for food + interventions
- `PlanningHeader.tsx` — header with day label, WP budget, kcal assessment, settings toggles (time format, BG unit, decay ON/OFF)
- `ShipCard.tsx` — draggable food cards with emoji, kcal, carbs, duration, WP badge
- `ShipInventory.tsx` — food card list from level config
- `InterventionCard.tsx` — draggable intervention cards (green) with emoji, duration, depth, WP badge
- `InterventionCard.css` — intervention card styles
- `InterventionInventory.tsx` — intervention card list from level config
- `MedicationPanel.tsx` — medication toggle panel (ON/OFF buttons)
- `MedicationPanel.css` — medication panel styles (purple theme)

#### State Management
- `src/store/gameStore.ts` — Zustand store: placedFoods, placedInterventions, settings, combined kcal/WP tracking

#### Configuration
- `src/config/loader.ts` — loads and transforms foods.json, interventions.json, level configs
- `public/data/foods.json` — 24 food items with glucose, carbs, protein, fat, duration, kcal, wpCost
- `public/data/interventions.json` — 2 interventions: Light Walk, Heavy Run
- `public/data/medications.json` — 3 medications: Metformin, SGLT2 Inhibitor, GLP-1 Agonist
- `public/data/levels/level-01.json` — 3-day level config with kcalBudget, wpBudget, availableInterventions per day

#### Shared UI
- `src/components/ui/Tooltip.tsx` — universal tooltip component
- `src/App.tsx` — root app component (single screen, no phase routing)
- `src/App.css` — app layout styles

### Current State (v0.39.2) — Per-Source Burn Coloring + Medication Cubes + Intervention Markers

- **Single-Screen Design** ✅
  - Graph on top, food inventory + intervention inventory below (horizontal card layout)
  - No phase transitions — everything on one screen

- **BG Graph** ✅
  - SVG graph with X axis (8 AM to 8 PM, 48 columns × 15 min)
  - Y axis (60 to 400 mg/dL, 17 rows × 20 mg/dL)
  - Grid lines: major every hour, minor every 15 min
  - Zone colors: green (60-140), yellow (140-200), orange (200-300), red (300-400)
  - X axis labels: 8 AM, 11 AM, 2 PM, 5 PM, 8 PM
  - Y axis labels: 100, 200, 300, 400 (60 mg/dL label removed)
  - BG line and food emoji on graph — disabled
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
  - Two interventions: Light Walk (🚶 60m, 2 WP, -3 cubes) and Heavy Run (🏃 30m, 4 WP, -5 cubes)
  - Intervention curve: ramp up during duration, then flat to end of graph
  - **Boost zones**: first N columns get extra depth (burst effect)
    - Light Walk: first 3 cols at -4 cubes (base 3 + boost 1)
    - Heavy Run: first 5 cols at -7 cubes (base 5 + boost 2)
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

- **Medication System** ✅
  - Three medications as day-wide toggles (ON/OFF), no WP cost
  - **Metformin** (💊 `peakReduction`): reduces all food glucose by 20% (×0.80) → lower peaks
  - **SGLT2 Inhibitor** (🧪 `thresholdDrain`): removes up to 3 cubes per column, but not below 200 mg/dL
    - Purple dashed drain line at 200 mg/dL threshold
    - Reduction depends on actual food height: `min(depth, max(0, height - floorRow))`
  - **GLP-1 Agonist** (💉 `slowAbsorption`): duration ×1.5 (wider curves), glucose ×0.90 (−10%, decoupled from duration), kcal budget −30%, WP +4
  - Purple toggle panel between graph and food inventory
  - All medications stack multiplicatively (glucose) and additively (drain, WP)
  - Available per day via `availableMedications` in level config
  - Day 1: none, Day 2: Metformin, Day 3: all three
  - **Medication-prevented cubes** (v0.39.1): visual layer above pancreas zone showing cubes that medications prevented
    - Metformin: `#f0abfc` fuchsia-300 (opacity 0.45)
    - GLP-1: `#a78bfa` violet-400 (opacity 0.45)
    - Per-medication attribution via intermediate Metformin-only curve computation
    - `glp1GlucoseMultiplier` field in MedicationModifiers for accurate decomposition

- **Wave Animations** ✅
  - `cubeAppear`: food cubes pop in with scale (0.3→1.08→1) + opacity wave, left-to-right
  - `cubeBurn`: burned cubes fade to 0.55 opacity with wave effect (increased from 0.35 for burn color visibility)
  - Wave delay: 20ms per column offset from drop point

- **WP Budget** ✅
  - Per-day wpBudget from level config (16 for all days)
  - Header shows wpUsed/wpBudget with ☀️ icon
  - **Combined tracking**: food wpCost + intervention wpCost share same pool
  - **Hard limit**: cards disabled (grayed out, non-draggable) when WP insufficient
  - Drop rejected if wpCost exceeds remaining WP

- **Food Cards** ✅
  - Display: emoji, name, kcal, carbs (g), duration (m)
  - WP cost badge (☀️) when wpCost > 0
  - Disabled state (grayed out) when WP insufficient
  - Drag from inventory → drop on graph
  - Click on placed cubes → remove food
  - Inventory below graph, cards arranged horizontally (flex-wrap)

- **Kcal Assessment** ✅
  - No hard calorie limit — kcal is informational
  - All food kcal values multiplied by 2.5 (from original USDA per-serving)
  - Header shows total kcal + text assessment based on % of kcalBudget:
    - 0%: Fasting (gray)
    - <25%: Starving (red)
    - 25-50%: Hungry (orange)
    - 50-75%: Light (yellow)
    - 75-100%: Well Fed (green)
    - 100-120%: Full (green)
    - 120-150%: Overeating (orange)
    - >150%: Stuffed (red)

- **Food Nutritional Data** ✅
  - All 24 foods have: carbs, protein, fat, kcal (from USDA × 2.5)
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
  - Centered over columns where the food's `skylineRow` is maximum
  - **skylineRow vs aliveTop** (v0.38.7): `aliveTop` = unclamped per-food boundary; `skylineRow` = clamped by `columnCaps` (responds to interventions)

- **Individual Food Skylines** ✅
  - White outlined step-paths between each food's alive zone (when 2+ foods placed)
  - Trace the boundary between food N and food N+1's alive cubes
  - Shadow underneath for visibility over cubes
  - **Clamped by columnCaps** (v0.38.6): skylines descend when interventions remove cubes
  - Rendered AFTER all cube layers (Z-order: cubes → med cubes → individual skylines → main skyline)

- **Penalty / Rating System** ✅
  - Submit button triggers penalty calculation on current graph state
  - Orange zone (200-300 mg/dL, rows 7-11): 0.5 penalty weight per cube
  - Red zone (300+ mg/dL, rows 12+): 1.5 penalty weight per cube
  - Star rating: 3★ Perfect (≤12.5), 2★ Good (≤50), 1★ Pass (≤100), 0★ Defeat (>100)
  - Penalty highlight overlays (pulsing orange/red) on cubes above threshold

- **Pancreas Tier System** ✅
  - 4 tiers: OFF (0), I (0.25), II (0.5), III (0.75) — controls decayRate
  - Tier selection UI with WP costs (Tier I free, Tier II = 1 WP, Tier III = 2 WP)
  - Higher tier = faster glucose processing = shorter food curves
  - 3 visual bars showing current tier level

- **Day Navigation** ✅
  - Cheat buttons at bottom: "Day 1", "Day 2", "Day 3" for quick switching
  - Active day highlighted, disabled when already on that day

- **Game Settings** ✅
  - Time format toggle: 12h ↔ 24h
  - BG unit toggle: mg/dL ↔ mmol/L
  - Decay toggle: ON ↔ OFF (restarts game)
  - Persisted in localStorage

### Food Data Structure
```json
{
  "id": "banana",
  "name": "Banana",
  "emoji": "🍌",
  "glucose": 270,
  "carbs": 27,
  "protein": 1,
  "fat": 0,
  "duration": 45,
  "kcal": 302,
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

| Medication | Emoji | Type | Effect | Parameters |
|-----------|-------|------|--------|------------|
| Metformin | 💊 | peakReduction | Glucose ×0.80 (−20%) | multiplier: 0.80 |
| SGLT2 Inhibitor | 🧪 | thresholdDrain | -3 cubes, floor 200 | depth: 3, floorMgDl: 200 |
| GLP-1 Agonist | 💉 | slowAbsorption | Duration ×1.5, glucose ×0.90 (−10%), kcal −30%, WP +4 | durationMult: 1.5, glucoseMult: 0.90, kcalMult: 0.7, wpBonus: 4 |

### Food Parameters Table

Based on USDA FoodData Central, GI databases. `glucose = carbs × 10`, duration from GI + macronutrient composition. Kcal = USDA per-serving × 2.5 × 1.15.

| # | Food | Emoji | Carbs | Protein | Fat | Kcal | WP | Duration | Cubes | Cols |
|---|------|-------|------:|--------:|----:|-----:|---:|---------:|------:|-----:|
| 1 | Banana | 🍌 | 27g | 1g | 0g | 302 | 1 | 45m | 14 | 3 |
| 2 | Apple | 🍎 | 25g | 1g | 0g | 274 | 1 | 45m | 13 | 3 |
| 3 | Ice Cream | 🍦 | 24g | 4g | 11g | 596 | 0 | 60m | 12 | 4 |
| 4 | Popcorn | 🍿 | 22g | 3g | 2g | 325 | 1 | 45m | 11 | 3 |
| 5 | Cookie | 🍪 | 17g | 2g | 7g | 420 | 2 | 60m | 9 | 4 |
| 6 | Caesar Salad | 🥗 | 10g | 9g | 12g | 546 | 3 | 120m | 5 | 8 |
| 7 | Choco Muffin | 🧁 | 52g | 6g | 18g | 1142 | 0 | 60m | 26 | 4 |
| 8 | Sandwich | 🥪 | 40g | 22g | 28g | 1438 | 2 | 150m | 20 | 10 |
| 9 | Chicken Meal | 🍗 | 5g | 35g | 12g | 805 | 3 | 120m | 3 | 8 |
| 10 | Bowl of Rice | 🍚 | 45g | 4g | 0g | 590 | 4 | 150m | 23 | 10 |
| 11 | Hamburger | 🍔 | 24g | 17g | 14g | 849 | 3 | 180m | 12 | 12 |
| 12 | Oatmeal | 🥣 | 28g | 6g | 4g | 477 | 4 | 120m | 14 | 8 |
| 13 | Pizza | 🍕 | 34g | 12g | 12g | 863 | 3 | 90m | 17 | 6 |
| 14 | Boiled Eggs | 🥚 | 1g | 13g | 10g | 446 | 4 | 150m | 1 | 10 |
| 15 | Mixed Berries | 🫐 | 21g | 2g | 1g | 245 | 2 | 45m | 11 | 3 |
| 16 | Greek Yogurt | 🥛 | 8g | 11g | 11g | 561 | 3 | 90m | 4 | 6 |
| 17 | Milk 2% | 🥛 | 12g | 8g | 5g | 351 | 3 | 45m | 6 | 3 |
| 18 | Vegetable Stew | 🥘 | 20g | 5g | 5g | 483 | 4 | 150m | 10 | 10 |
| 19 | Boiled Carrots | 🥕 | 8g | 1g | 0g | 153 | 4 | 45m | 4 | 3 |
| 20 | Chickpeas | 🫘 | 27g | 9g | 3g | 472 | 3 | 90m | 14 | 6 |
| 21 | Cottage Cheese | 🧀 | 5g | 25g | 9g | 592 | 4 | 120m | 3 | 8 |
| 22 | Hard Cheese | 🧀 | 1g | 7g | 9g | 345 | 3 | 150m | 1 | 10 |
| 23 | Avocado | 🥑 | 9g | 2g | 15g | 460 | 3 | 150m | 5 | 10 |
| 24 | Mixed Nuts | 🥜 | 4g | 5g | 16g | 523 | 2 | 150m | 2 | 10 |

**Derived:** Cubes = glucose / 20 (glucose = carbs × 10), Cols = duration / 15. Sources: USDA FoodData Central, glycemic-index.net

### Intervention Parameters

| Intervention | Emoji | Depth | Duration | WP | Boost | Effect |
|-------------|-------|------:|---------:|---:|-------|--------|
| Light Walk | 🚶 | 3 cubes | 60m | 2 | +1 for 3 cols | Removes 3 cubes (4 in burst zone), ramp 60m then flat |
| Heavy Run | 🏃 | 5 cubes | 30m | 4 | +2 for 5 cols | Removes 5 cubes (7 in burst zone), ramp 30m then flat |

### Level Config Structure
```json
{
  "id": "level-01",
  "name": "First Steps",
  "days": 3,
  "dayConfigs": [
    {
      "day": 1,
      "kcalBudget": 2000,
      "wpBudget": 16,
      "availableFoods": [
        { "id": "banana", "count": 1 }
      ],
      "availableInterventions": [
        { "id": "lightwalk", "count": 1 },
        { "id": "heavyrun", "count": 1 }
      ]
    }
  ]
}
```

### Graph Configuration Constants
| Constant | Value | Location |
|----------|-------|----------|
| startHour | 8 (8 AM) | `types.ts` GRAPH_CONFIG |
| endHour | 20 (8 PM) | `types.ts` GRAPH_CONFIG |
| cellWidthMin | 15 min | `types.ts` GRAPH_CONFIG |
| cellHeightMgDl | 20 mg/dL | `types.ts` GRAPH_CONFIG |
| bgMin | 60 mg/dL | `types.ts` GRAPH_CONFIG |
| bgMax | 400 mg/dL | `types.ts` GRAPH_CONFIG |
| TOTAL_COLUMNS | 48 | `types.ts` derived |
| TOTAL_ROWS | 17 | `types.ts` derived |
| CELL_SIZE | 18px (SVG) | `BgGraph.tsx` |
| DECAY_RATE | 0.5 cubes/col | `cubeEngine.ts` |

### Cube Engine Details

#### Ramp + Decay/Plateau Algorithm
1. `peakCubes = Math.round(glucose / 20)`
2. `riseCols = Math.round(duration / 15)`
3. Rise phase (cols 0..riseCols-1): linear from 1 to peakCubes
4. If decay ON: decline at 0.5 cubes/col until 0
5. If decay OFF: flat plateau at peakCubes to right edge
6. Drop column = left edge (start of food absorption)

#### Intervention Algorithm
1. `depth` = cubes to remove at peak
2. `riseCols = Math.round(duration / 15)`
3. Rise phase: linear from 1 to depth
4. Plateau: flat at depth from peak to right edge of graph
5. **Boost zone**: first `boostCols` columns get `+boostExtra` depth on top of normal curve
6. Multiple interventions stack (reductions add up)
7. Cubes removed from top — bottom cubes stay visible

#### Food Colors
Progressive blue palette by placement order: 7-color Tailwind sky shades from `#7dd3fc` (lightest) to `#0c4a6e` (darkest). First food placed = lightest, each subsequent food = darker shade.

#### Cube Stacking Model (Decay-Based, v0.39.2)
Cubes are stacked using ACTUAL decay curves (not plateau curves):
1. Each food's alive cubes are positioned by cumulative decay heights (contiguous stacking)
2. Pancreas-eaten cubes — thin visual layer (1-3 cubes matching tier) stacked above ALL alive cubes
3. Medication-prevented cubes stacked above pancreas zone (Metformin pink, GLP-1 violet)
4. Global boundaries determine cube status:
   - `row < columnCaps[col]` → **normal** (full food color)
   - `row >= columnCaps[col]` → **burned** — color by source:
     - offset < walkReduction → light green `#86efac`
     - offset < walkReduction + runReduction → dark green `#22c55e`
     - else → purple `#c084fc` (SGLT2)
   - `row >= pancreasCaps[col]` → **pancreas** (orange `#f97316`)
5. When `decayRate=0`: decay=plateau, all cubes alive, no pancreas zone

#### BG Zones
| Zone | Range | Color |
|------|-------|-------|
| Normal | 60-140 mg/dL | Green |
| Elevated | 140-200 mg/dL | Yellow |
| High | 200-300 mg/dL | Orange |
| Danger | 300-400 mg/dL | Red |

### Removed Systems (archived in `port-planner` branch)
- Simulation engine (SimulationEngine, RuleEngine)
- Results system (calculateResults, assessment, degradation)
- Organ system (liver, pancreas, muscles, kidneys)
- Pipe system (SVG flow visualization)
- Slot grid (time slot placement)
- Old WP budget system (spend/refund per slot — replaced by graph-based WP)
- BG sparkline (replaced by main graph)
- Phase transitions (Planning/Simulation/Results)
- Degradation circles
- Metformin, fiber system

### Known Issues
- Intervention click on burned cubes always removes the first intervention (not necessarily the one that burned that specific cube)
- Food drag preview starts on top of alive stack (pancreasCaps), not on top of visible pancreas/medication cubes — may show a gap in the preview
- Medication-prevented cubes are approximate — GLP-1 redistributes glucose across more columns, so negative differences (where GLP-1 extended curve) are clamped to 0

---

## Project: Glucose TD (branch: `tower-defense`)

**Glucose TD** — tower defense reimagining of the metabolic simulation. Food generates glucose projectiles that fall through organ defense zones. See full documentation in `docs/td-concept/README.md` on the tower-defense branch.

Current version: v0.4.1 — survival mode, circle indicators, explosion VFX.
