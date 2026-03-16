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
| `main` | BG Planner | v0.48.10 | Graph-based food planning with cubes, interventions, medications, insulin profiles, BOOST, wave animations, main menu, config screen, dynamic Y-axis, overeating penalties, pre-placed foods, locked slots, level balancing, startingBg, vertical layout redesign, 8 tutorial levels, zone hatching, food speed labels, stress slot pulse animation |
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
- `src/version.ts` — version number (v0.48.10)
- `src/core/types.ts` — type definitions (Ship, PlacedFood, Intervention, PlacedIntervention, GameSettings, GRAPH_CONFIG, overeating penalties)
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

### Current State (v0.48.10) — 8 Tutorials, Zone Hatching, Food Speed Labels, Insulin Viz, Stress Slot Pulse

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
  - Day 1: none, Day 2: Metformin, Day 3: Metformin + GLP-1
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

- **Individual Food Skylines** ✅
  - White outlined step-paths between each food's alive zone (when 2+ foods placed)
  - Trace the boundary of food's ALIVE cubes using `skylineRow` (clamped by columnCaps)
  - Shadow underneath for visibility over cubes
  - Skylines descend when interventions burn cubes — wrap only unburned cells
  - Rendered AFTER all cube layers (Z-order: cubes → med cubes → individual skylines → main skyline)

- **Penalty / Rating System** ✅
  - Submit button triggers penalty calculation on current graph state
  - Orange zone (200-300 mg/dL, rows 3-4): 0.5 penalty weight per cube
  - Red zone (300+ mg/dL, rows 5+): 1.5 penalty weight per cube
  - Star rating: 3★ Perfect (≤12.5), 2★ Good (≤50), 1★ Pass (≤100), 0★ Defeat (>100)
  - Penalty highlight overlays (pulsing orange/red) on cubes above threshold

- **Insulin Profile System** ✅ (v0.43.0, replaces old Pancreas tiers)
  - **Visible insulin bars** on graph: amber background bars showing insulin rate per column
  - **Variable rates** throughout the day: high morning (insulin sensitive) → low evening (insulin resistant)
  - **Post-peak insulin**: food rises to full peak without drain, insulin absorbs only after peak
  - **Cumulative mode** (default): `height = round(peak − cumInsulin)` where `cumInsulin += rate[col]` after peak
  - **Per-column mode** (config option): `height = round(peak − rate[col])` flat subtraction
  - **Integer rates** 1-5: 1 insulin cell absorbs 1 glucose cell per column
  - **Segment-based profiles** per day in level config: `[{from, to, rate}]`
  - **BOOST** — adaptive insulin: ON/OFF toggle, 1 use per level
    - Only enhances columns above 200 mg/dL threshold
    - Extra rate = 4 cubes per column above threshold (configurable)
    - Button overlaid on graph top-left corner
  - Config screen: BOOST threshold and extra rate editable

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

- **Insulin Profile Visualization** ✅ (v0.47.54)
  - Column tinting shows insulin rate intensity per time slot
  - Rate bars displayed inside the graph grid
  - Segment boundaries visible when rate changes throughout the day

- **bonusBoostBars Mechanic** ✅ (v0.47.55)
  - Tutorial-04 introduces extra BOOST bars as a reward mechanic
  - `bonusBoostBars` field in day config grants additional BOOST uses
  - Passed through loader.ts dayConfigs transform

- **Tutorial System** ✅ (v0.47.20-v0.48.10)
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

| Medication | Emoji | Type | Effect | Parameters |
|-----------|-------|------|--------|------------|
| Metformin | 💊 | peakReduction | Glucose ×0.80 (−20%) | multiplier: 0.80 |
| SGLT2 Inhibitor | 🧪 | thresholdDrain | -3 cubes, floor 200 | depth: 3, floorMgDl: 200 |
| GLP-1 Agonist | 💉 | slowAbsorption | Duration ×1.5, glucose ×0.90 (−10%), kcal −30%, WP +4 | durationMult: 1.5, glucoseMult: 0.90, kcalMult: 0.7, wpBonus: 4 |

### Food Parameters Table

Based on USDA FoodData Central, GI databases. `glucose = carbs × 10`, duration from GI + macronutrient composition.

| # | Food | Emoji | Carbs | Protein | Fat | Kcal | WP | Duration | Cubes | Cols |
|---|------|-------|------:|--------:|----:|-----:|---:|---------:|------:|-----:|
| 1 | Banana | 🍌 | 23g | 1g | 0g | 395 | 1 | 45m | 12 | 3 |
| 2 | Apple | 🍎 | 21g | 1g | 0g | 355 | 1 | 45m | 11 | 3 |
| 3 | Ice Cream | 🍦 | 20g | 4g | 11g | 780 | 0 | 60m | 10 | 4 |
| 4 | Popcorn | 🍿 | 19g | 3g | 2g | 420 | 1 | 45m | 10 | 3 |
| 5 | Cookie | 🍪 | 14g | 2g | 7g | 545 | 2 | 60m | 7 | 4 |
| 6 | Caesar Salad | 🥗 | 8g | 9g | 12g | 715 | 3 | 120m | 4 | 8 |
| 7 | Choco Muffin | 🧁 | 44g | 6g | 18g | 1495 | 0 | 60m | 22 | 4 |
| 8 | Sandwich | 🥪 | 34g | 22g | 28g | 1885 | 2 | 150m | 17 | 10 |
| 9 | Chicken Meal | 🍗 | 3g | 35g | 12g | 1055 | 3 | 120m | 2 | 8 |
| 10 | Bowl of Rice | 🍚 | 38g | 4g | 0g | 775 | 4 | 150m | 19 | 10 |
| 11 | Hamburger | 🍔 | 20g | 17g | 14g | 1110 | 3 | 180m | 10 | 12 |
| 12 | Oatmeal | 🥣 | 24g | 6g | 4g | 620 | 4 | 120m | 12 | 8 |
| 13 | Pizza | 🍕 | 29g | 12g | 12g | 1130 | 3 | 90m | 15 | 6 |
| 14 | Boiled Eggs | 🥚 | 0g | 13g | 10g | 580 | 4 | 150m | 0 | 10 |
| 15 | Mixed Berries | 🫐 | 18g | 2g | 1g | 325 | 2 | 45m | 9 | 3 |
| 16 | Greek Yogurt | 🥛 | 6g | 11g | 11g | 730 | 3 | 90m | 3 | 6 |
| 17 | Milk 2% | 🥛 | 10g | 8g | 5g | 460 | 3 | 45m | 5 | 3 |
| 18 | Vegetable Stew | 🥘 | 17g | 5g | 5g | 635 | 4 | 150m | 9 | 10 |
| 19 | Boiled Carrots | 🥕 | 6g | 1g | 0g | 200 | 4 | 45m | 3 | 3 |
| 20 | Chickpeas | 🫘 | 23g | 9g | 3g | 620 | 3 | 90m | 12 | 6 |
| 21 | Cottage Cheese | 🧀 | 3g | 25g | 9g | 775 | 4 | 120m | 2 | 8 |
| 22 | Hard Cheese | 🧀 | 0g | 7g | 9g | 450 | 3 | 150m | 0 | 10 |
| 23 | Avocado | 🥑 | 7g | 2g | 15g | 600 | 3 | 150m | 4 | 10 |
| 24 | Mixed Nuts | 🥜 | 2g | 5g | 16g | 685 | 2 | 150m | 1 | 10 |

**Derived:** Cubes = glucose / 20 (glucose = carbs × 10), Cols = duration / 15. Sources: USDA FoodData Central, glycemic-index.net

### Intervention Parameters

| Intervention | Emoji | Depth | Duration | WP | Tail | SlotSize | Effect |
|-------------|-------|------:|---------:|---:|-----:|---------:|--------|
| Light Walk | 🚶 | 3 cubes | 60m (4 cols) | 2 | 1 cube | 1 | Main: 3 cubes for 4 cols, tail: 1 cube to end |
| Heavy Run | 🏃 | 5 cubes | 180m (12 cols) | 4 | 2 cubes | 2 | Main: 5 cubes for 12 cols, tail: 2 cubes to end |
| Take a Break | ☕ | 0 | 30m (2 cols) | −1 | 0 | 1 | Refunds 1 WP, no cube effect |
| Take a Rest | 😴 | 0 | 120m (8 cols) | −2 | 0 | 2 | Refunds 2 WP, no cube effect |

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

| Day | kcal | WP | Pre-placed | Insulin Profile | Locked | Free | Foods | Interventions | Meds | 3★ % |
|-----|-----:|---:|-----------|----------------|--------|------|-------|--------------|------|-----:|
| 1 | 1800 | 10 | burger@0, banana@4 | 2,2,1 | [0,1,3,4,6,7,9,10] | [2,5,8,11] | cookie,milk,chickpeas | walk×1,break×1 | — | 14.8% |
| 2 | 2000 | 10 | banana@0, muffin@5 | 2,2(→25),1 | [1,3,6,8,11] | [2,4,7,9,10] | chickpeas,cookie,oatmeal | walk×2,break×1 | metformin | 13.4% |
| 3 | 2000 | 10 | burger@0, muffin@2, oatmeal@5 | 4,3,2 | [0,2,3,5,6,8,9,11] | [1,4,7,10] | sandwich,cookie,banana,milk | walk×1,break×2 | met+glp1 | 0.7%* |

*Day 3 requires BOOST (extraRate=4) to achieve 3★. Without BOOST: 0% 3★.

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
| cellHeightMgDl | 50 mg/dL | `types.ts` GRAPH_CONFIG |
| bgMin | 50 mg/dL | `types.ts` GRAPH_CONFIG |
| bgMax | 450 mg/dL | `types.ts` GRAPH_CONFIG |
| TOTAL_COLUMNS | 24 | `types.ts` derived |
| TOTAL_ROWS | 8 | `types.ts` derived |
| CELL_SIZE | 18px (SVG) | `BgGraph.tsx` |
| GRAPH_H | 144px | `BgGraph.tsx` (TOTAL_ROWS × CELL_SIZE) |
| INSULIN_FLOOR_ROW | 1 | `BgGraph.tsx` (100 mg/dL = (100-50)/50) |
| PENALTY_ORANGE_ROW | 3 | `types.ts` (200 mg/dL = (200-50)/50) |
| PENALTY_RED_ROW | 5 | `types.ts` (300 mg/dL = (300-50)/50) |
| PAD_LEFT/TOP/RIGHT | 4 | `BgGraph.tsx` |
| PAD_BOTTOM | 1 | `BgGraph.tsx` |
| PANCREAS_TOTAL_BARS | 1 | `types.ts` — BOOST uses per level |
| BOOST_EXTRA_RATE | 4 | default — cubes absorbed per col above 200 |

### Cube Engine Details

#### Ramp + Insulin Drain Algorithm (v0.43.0)
1. `peakCubes = Math.round(glucose / cellHeightMgDl)` (glucose in mg/dL units, cellHeightMgDl=50)
2. `riseCols = Math.round(duration / cellWidthMin)` (cellWidthMin=30)
3. Rise phase (cols 0..riseCols-1): `height = round(peakCubes × (i+1)/riseCols)` — NO insulin drain during ramp
4. Post-peak (cumulative mode): `height = round(peakCubes − cumInsulin)` where cumInsulin accumulates insulin rate per column
5. Post-peak (per-column mode): `height = round(peakCubes − rate[col])` flat subtraction
6. Drop column = left edge (start of food absorption)
7. Guarantee: at least 1 cube at peak for any food with glucose > 0
8. Legacy fallback: if no insulin profile, uses old decayRate formula (drain from col 0)

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
| Normal | 50-150 mg/dL | Green |
| Elevated | 150-200 mg/dL | Yellow |
| High | 200-300 mg/dL | Orange (+ red line at 200) |
| Danger | 300-450+ mg/dL | Red |

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
- `alpha-2-stable` (v0.40.4) — Main menu, config screen, merged Actions panel, phased reveal animation, dynamic Y-axis
- `alpha-3-stable` (v0.40.25) — WP remaining display, Take a Break/Rest interventions, bidirectional time blocking, level balancing
- `alpha-4-stable` (v0.42.19) — Pre-placed foods, locked slots, balance solver, level-01 3-day puzzle design
- `alpha-5-stable` (v0.43.0) — Insulin profile system, BOOST, visual insulin bars, post-peak drain, re-balanced level-01
- `alpha-8-vertical` (v0.47.12) — startingBg, 50 mg/dL grid cells, Y-axis labels, vertical layout redesign (KcalBar extracted, transparent slot cards, no graph border, red 200 line, dead CSS cleanup)
- `alpha-9-stable` (v0.48.6) — 8 tutorial levels (incl. "Under Stress"), bonusBoostBars, insulin profile visualization, zone-colored hatching, food speed labels, tutorial CTA system (drag-arrow, tap-pulse, lockedTab, noBackdrop, auto-relocate), satiety bonus disabled, result panel reorder, slot grid pull-up on submit, BOOST merged into insulin reveal phase
- `alpha-10-stable` (v0.48.10) — stress slot pulse animation in tutorial (highlightStressSlots prop), brighter stress column (opacity 0.15), T5 tutorial text fixes (TWO→THREE, spotlight bug removed), T5D1 submit dialogue after 2nd food placed, T5D3 wpBudget +3

### Known Issues
- Intervention click on burned cubes always removes the first intervention (not necessarily the one that burned that specific cube)
- Food drag preview starts on top of alive stack (pancreasCaps), not on top of visible pancreas/medication cubes — may show a gap in the preview
- Medication-prevented cubes are approximate — GLP-1 redistributes glucose across more columns, so negative differences (where GLP-1 extended curve) are clamped to 0

---

## Project: Glucose TD (branch: `tower-defense`)

**Glucose TD** — tower defense reimagining of the metabolic simulation. Food generates glucose projectiles that fall through organ defense zones. See full documentation in `docs/td-concept/README.md` on the tower-defense branch.

Current version: v0.4.1 — survival mode, circle indicators, explosion VFX.
