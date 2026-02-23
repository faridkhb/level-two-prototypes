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
| `main` | BG Planner | v0.40.3 | Graph-based food planning with cubes, interventions, medications, decay, wave animations, main menu, config screen |
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
Main Menu → TEST MODE / STORY MODE (coming soon) / CONFIG
TEST MODE:
  Single screen: BG Graph (top) + Food Inventory + Actions panel (bottom)
  → Drag food card onto graph → cubes appear with wave animation
  → Drag intervention onto graph → top cubes fade out with wave animation
  → Toggle medications (ON/OFF) in Actions panel
  → Track WP budget (food + interventions share same pool)
  → Track kcal with assessment labels
  → Click cubes to remove placed food/intervention
  → Submit → phased layer reveal animation → penalty → results
CONFIG:
  Editable tables for food, pancreas tiers, interventions, medications
  → Overrides persist in localStorage
```

### Key Files

#### Core Engine
- `src/version.ts` — version number (v0.40.3)
- `src/core/types.ts` — type definitions (Ship, PlacedFood, Intervention, PlacedIntervention, GameSettings, GRAPH_CONFIG)
- `src/core/cubeEngine.ts` — ramp+decay curve algorithm, intervention reduction, graph state calculation

#### App Navigation
- `src/App.tsx` — screen routing (menu / testMode / config) with back button
- `src/App.css` — app layout styles, back button

#### Main Menu (`src/components/menu/`)
- `MainMenu.tsx` — 3 buttons: TEST MODE, STORY MODE (disabled), CONFIG
- `MainMenu.css` — menu button styles

#### Config Screen (`src/components/config/`)
- `ConfigScreen.tsx` — 3-tab editor (Food / Pancreas / Interventions+Medications)
- `ConfigScreen.css` — table, input, medication card styles

#### Graph Component (`src/components/graph/`)
- `BgGraph.tsx` — SVG-based BG graph with grid, cubes, zones, intervention burn rendering, wave animations, drag-and-drop target, reveal phase animation
- `BgGraph.css` — graph styles, cubeAppear/cubeBurn/medAppear/revealLabel keyframe animations
- `index.ts` — exports

#### Planning Phase (`src/components/planning/`)
- `PlanningPhase.tsx` — single-screen orchestrator with DnD context, submit/reveal/results flow
- `PlanningHeader.tsx` — header with day label, WP budget, kcal assessment, settings toggles (time format, BG unit)
- `ShipCard.tsx` — draggable food cards with emoji, kcal, carbs, duration, WP badge
- `ShipInventory.tsx` — food card list from level config
- `InterventionCard.tsx` — draggable intervention cards (green) with emoji, duration, depth, WP badge
- `InterventionCard.css` — intervention card styles
- `InterventionInventory.tsx` — combined Actions panel: medication toggles + intervention cards
- `MedicationPanel.css` — medication toggle styles (purple theme)
- `ResultPanel.tsx` — star rating, penalty breakdown, retry/next buttons

#### State Management
- `src/store/gameStore.ts` — Zustand store: placedFoods, placedInterventions, settings, combined kcal/WP tracking
- `src/store/configStore.ts` — Zustand store: config overrides (food, pancreas, interventions, medications) persisted in localStorage

#### Configuration
- `src/config/loader.ts` — loads and transforms foods.json, interventions.json, level configs; applies config overrides
- `public/data/foods.json` — 24 food items with glucose, carbs, protein, fat, duration, kcal, wpCost
- `public/data/interventions.json` — 2 interventions: Light Walk, Heavy Run
- `public/data/medications.json` — 3 medications: Metformin, SGLT2 Inhibitor, GLP-1 Agonist
- `public/data/levels/level-01.json` — 3-day level config with kcalBudget, wpBudget, availableInterventions per day

#### Shared UI
- `src/components/ui/Tooltip.tsx` — universal tooltip component

### Current State (v0.40.3) — Main Menu, Config Screen, Phased Reveal Animation

- **Main Menu** ✅
  - 3 buttons: TEST MODE (active), STORY MODE (disabled/coming soon), CONFIG
  - Back button on all sub-screens returns to menu

- **Config Screen** ✅
  - 3 tabs: Food, Pancreas, Interventions (+ Medications)
  - Food tab: table of 24 foods with all numeric fields editable
  - Pancreas tab: 4 tiers (OFF/I/II/III) with decayRate and cost
  - Interventions tab: 2 interventions + 3 medications with type-specific params
  - Config overrides persist in localStorage (`bg-config-overrides`)
  - Reset Defaults / Apply & Back buttons
  - Dynamic medication tooltips reflect actual parameter values

- **Combined Actions Panel** ✅
  - Medications and interventions merged into single "Actions" section
  - Purple toggle buttons for medications (ON/OFF)
  - Green draggable cards for interventions (walk/run)

- **Phased Layer Reveal Animation** ✅
  - Submit triggers progressive layer-by-layer reveal (replaces old per-food replay)
  - Phase 1: Food cubes appear with wave animation + food emoji markers + label "🍽️ Food Cubes"
  - Phase 2: Pancreas drain cubes appear + label "🟠 Pancreas"
  - Phase 3: Exercise burns (walk/run) + intervention markers + label "🏃 Exercise"
  - Phase 4: Medication effects (SGLT2 burns + Metformin/GLP-1 prevented cubes) + label "💊 Medications"
  - Empty phases auto-skipped (no pancreas/exercise/meds if not used)
  - Floating label badge in graph upper-right corner during each phase
  - After all phases → penalty overlay + ResultPanel

- **Single-Screen Design** ✅
  - Graph on top, food inventory + Actions panel below (horizontal card layout)
  - No phase transitions within test mode — everything on one screen

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
  - Two interventions: Light Walk (🚶 60m, 2 WP, -3 cubes) and Heavy Run (🏃 180m, 4 WP, -5 cubes)
  - **Two-phase curve** (v0.40.0): main phase at full depth, then tail at reduced depth
    - Main phase: `duration / 15` columns at full `depth` (no ramp, immediate full power)
    - Tail phase: remaining columns at `boostExtra` depth (residual burn)
    - Light Walk: 4 cols at 3 cubes, then 1 cube to end
    - Heavy Run: 12 cols at 5 cubes, then 2 cubes to end
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
  - Centered over columns where the food's visible height (`skylineRow - baseRow`) is maximum
  - **skylineRow vs aliveTop**: `aliveTop` = unclamped per-food boundary; `skylineRow` = clamped by `columnCaps` (responds to interventions)
  - **Stable marker positioning** (v0.39.7): markers use food's OWN visible height (skylineRow - baseRow) for peak finding, skylineRow for tail Y — prevents displacement for 4th+ foods

- **Individual Food Skylines** ✅
  - White outlined step-paths between each food's alive zone (when 2+ foods placed)
  - Trace the boundary of food's ALIVE cubes using `skylineRow` (clamped by columnCaps)
  - Shadow underneath for visibility over cubes
  - Skylines descend when interventions burn cubes — wrap only unburned cells
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
| 1 | Banana | 🍌 | 23g | 1g | 0g | 272 | 1 | 45m | 12 | 3 |
| 2 | Apple | 🍎 | 21g | 1g | 0g | 247 | 1 | 45m | 11 | 3 |
| 3 | Ice Cream | 🍦 | 20g | 4g | 11g | 536 | 0 | 60m | 10 | 4 |
| 4 | Popcorn | 🍿 | 19g | 3g | 2g | 293 | 1 | 45m | 10 | 3 |
| 5 | Cookie | 🍪 | 14g | 2g | 7g | 378 | 2 | 60m | 7 | 4 |
| 6 | Caesar Salad | 🥗 | 8g | 9g | 12g | 491 | 3 | 120m | 4 | 8 |
| 7 | Choco Muffin | 🧁 | 44g | 6g | 18g | 1028 | 0 | 60m | 22 | 4 |
| 8 | Sandwich | 🥪 | 34g | 22g | 28g | 1294 | 2 | 150m | 17 | 10 |
| 9 | Chicken Meal | 🍗 | 3g | 35g | 12g | 725 | 3 | 120m | 2 | 8 |
| 10 | Bowl of Rice | 🍚 | 38g | 4g | 0g | 531 | 4 | 150m | 19 | 10 |
| 11 | Hamburger | 🍔 | 20g | 17g | 14g | 764 | 3 | 180m | 10 | 12 |
| 12 | Oatmeal | 🥣 | 24g | 6g | 4g | 429 | 4 | 120m | 12 | 8 |
| 13 | Pizza | 🍕 | 29g | 12g | 12g | 777 | 3 | 90m | 15 | 6 |
| 14 | Boiled Eggs | 🥚 | 0g | 13g | 10g | 401 | 4 | 150m | 0 | 10 |
| 15 | Mixed Berries | 🫐 | 18g | 2g | 1g | 221 | 2 | 45m | 9 | 3 |
| 16 | Greek Yogurt | 🥛 | 6g | 11g | 11g | 505 | 3 | 90m | 3 | 6 |
| 17 | Milk 2% | 🥛 | 10g | 8g | 5g | 316 | 3 | 45m | 5 | 3 |
| 18 | Vegetable Stew | 🥘 | 17g | 5g | 5g | 435 | 4 | 150m | 9 | 10 |
| 19 | Boiled Carrots | 🥕 | 6g | 1g | 0g | 138 | 4 | 45m | 3 | 3 |
| 20 | Chickpeas | 🫘 | 23g | 9g | 3g | 425 | 3 | 90m | 12 | 6 |
| 21 | Cottage Cheese | 🧀 | 3g | 25g | 9g | 533 | 4 | 120m | 2 | 8 |
| 22 | Hard Cheese | 🧀 | 0g | 7g | 9g | 311 | 3 | 150m | 0 | 10 |
| 23 | Avocado | 🥑 | 7g | 2g | 15g | 414 | 3 | 150m | 4 | 10 |
| 24 | Mixed Nuts | 🥜 | 2g | 5g | 16g | 471 | 2 | 150m | 1 | 10 |

**Derived:** Cubes = glucose / 20 (glucose = carbs × 10), Cols = duration / 15. Kcal = USDA per-serving × 2.5 × 1.15 × 0.9. Sources: USDA FoodData Central, glycemic-index.net

### Intervention Parameters

| Intervention | Emoji | Depth | Duration | WP | Tail | Effect |
|-------------|-------|------:|---------:|---:|-----:|--------|
| Light Walk | 🚶 | 3 cubes | 60m (4 cols) | 2 | 1 cube | Main: 3 cubes for 4 cols, tail: 1 cube to end |
| Heavy Run | 🏃 | 5 cubes | 180m (12 cols) | 4 | 2 cubes | Main: 5 cubes for 12 cols, tail: 2 cubes to end |

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

#### Intervention Algorithm (v0.40.0)
1. `depth` = cubes to remove during main phase
2. `mainCols = Math.round(duration / 15)` = main phase length
3. Main phase: flat at `depth` for `mainCols` columns (no ramp)
4. Tail phase: flat at `boostExtra` from mainCols to right edge of graph
5. Multiple interventions stack (reductions add up)
6. Cubes removed from top — bottom cubes stay visible

#### Food Colors
Progressive blue palette by placement order: 7-color Tailwind sky shades from `#7dd3fc` (lightest) to `#0c4a6e` (darkest). First food placed = lightest, each subsequent food = darker shade.

#### Cube Stacking Model (Decay-Based, v0.39.4)
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

### Milestones
- `alpha-1-stable` (v0.40.0) — Core gameplay: cubes, interventions, medications, markers, decay-based stacking
- `alpha-2-stable` (v0.40.3) — Main menu, config screen, merged Actions panel, phased reveal animation

### Known Issues
- Intervention click on burned cubes always removes the first intervention (not necessarily the one that burned that specific cube)
- Food drag preview starts on top of alive stack (pancreasCaps), not on top of visible pancreas/medication cubes — may show a gap in the preview
- Medication-prevented cubes are approximate — GLP-1 redistributes glucose across more columns, so negative differences (where GLP-1 extended curve) are clamped to 0

---

## Project: Glucose TD (branch: `tower-defense`)

**Glucose TD** — tower defense reimagining of the metabolic simulation. Food generates glucose projectiles that fall through organ defense zones. See full documentation in `docs/td-concept/README.md` on the tower-defense branch.

Current version: v0.4.1 — survival mode, circle indicators, explosion VFX.
