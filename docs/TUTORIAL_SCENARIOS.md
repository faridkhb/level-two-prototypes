# Tutorial Scenarios — BG Planner

> Full tutorial/onboarding design for Story Mode.
> 8 levels, 20 days, progressive mechanic introduction.
> See also: `BG_PLANNER_GDD.md` § 12 for summary.

---

## 0. Tutorial System

### 0.1. Guide Character — Doctor Alice

**Name:** Doctor Alice
**Visual:** Friendly cartoon doctor with a stethoscope, small avatar (64×64 px) beside dialogue bubbles.

**Expressions** (5 states):

| Expression | When Used |
|-----------|-----------|
| `neutral` | Default — explaining mechanics |
| `happy` | Encouraging, praising |
| `concerned` | Warning about danger zones, penalties |
| `thinking` | Hinting at strategy |
| `celebrating` | Level/day complete, 3-star |

**Tone:** Simple, conversational English. Short sentences (2-3 per bubble max). Addresses the player as "you". Encouraging, never lecturing.

---

### 0.2. Bubble Types

| Type | CSS Class | Icon | Visual | Purpose |
|------|-----------|------|--------|---------|
| **dialogue** | `.tutorial-bubble--dialogue` | — | White rounded bubble with tail, avatar left | Narrative, explanations |
| **hint** | `.tutorial-bubble--hint` | 💡 | Light yellow bubble | Strategy tips (optional, skippable) |
| **warning** | `.tutorial-bubble--warning` | ⚠️ | Light red/orange bubble | Danger zone warnings, penalty info |
| **success** | `.tutorial-bubble--success` | ✨ | Light green bubble | After correct action, congratulations |

**Bubble schema:**
```typescript
interface TutorialBubble {
  type: 'dialogue' | 'hint' | 'warning' | 'success';
  text: string;
  expression?: 'neutral' | 'happy' | 'concerned' | 'thinking' | 'celebrating';
  position: 'top' | 'bottom' | 'center';
}
```

---

### 0.3. Highlight System

Semi-transparent dark overlay covers the entire screen. A "spotlight" cutout reveals the target element.

| Highlight Type | CSS Class | Effect |
|---------------|-----------|--------|
| **Spotlight** | `.tutorial-spotlight` | Dark overlay with cutout around target |
| **Pulse** | `.tutorial-pulse` | Border pulsing: scale 1.0→1.05, opacity cycling |
| **Glow** | `.tutorial-glow` | Soft colored box-shadow around target |
| **Arrow** | `.tutorial-arrow` | Animated SVG arrow from bubble to target |

---

### 0.4. CTA Animations

| CTA Type | CSS Class | Animation | Use Case |
|----------|-----------|-----------|----------|
| **Drag Arrow** | `.cta-drag-arrow` | Animated arrow looping from source to destination | "Drag this card here" |
| **Tap Pulse** | `.cta-tap-pulse` | Concentric circles expanding + fading, looping | "Tap this button" |
| **Glow Border** | `.cta-glow-border` | Pulsing colored border on element | "This element changed" |
| **Bounce** | `.cta-bounce` | Gentle up/down bounce | "Look at this" |

**CTA schema:**
```typescript
interface TutorialCTA {
  type: 'drag-arrow' | 'tap-pulse' | 'glow-border' | 'bounce';
  source?: string;   // highlight target ID (for drag-arrow)
  dest?: string;     // destination target ID (for drag-arrow)
  target?: string;   // element to animate (for other types)
  color?: string;    // default: #38bdf8 (sky-400)
}
```

---

### 0.5. Highlight Target Dictionary

Mapping of logical names to CSS selectors:

```typescript
const HIGHLIGHT_TARGETS = {
  // === Header ===
  'header':             '.planning-header',
  'day-label':          '.planning-header__day',
  'wp-counter':         '.planning-header__wp',
  'kcal-bar':           '.planning-header__kcal-bar-wrap',
  'kcal-zones':         '.planning-header__kcal-bar',
  'submit-btn':         '.planning-header__submit',
  'forecast-badge':     '.planning-header__assessment-badge',

  // === Graph ===
  'graph':              '.bg-graph',
  'graph-zones':        '.bg-graph [data-zone]',       // all zone rects
  'graph-green-zone':   '.bg-graph [data-zone="normal"]',
  'graph-yellow-zone':  '.bg-graph [data-zone="elevated"]',
  'graph-orange-zone':  '.bg-graph [data-zone="high"]',
  'graph-red-zone':     '.bg-graph [data-zone="danger"]',
  'insulin-bars':       '.bg-graph__insulin-bars',
  'boost-btn':          '.pancreas-button',

  // === Slot Grid ===
  'slot-grid':          '.slot-grid',
  'slot:N':             '.slot-container:nth-child(N)',  // parameterized

  // === Food Inventory ===
  'food-inventory':     '.ship-inventory',
  'food-card:ID':       '.ship-card[data-food-id="ID"]', // parameterized
  'food-card:N':        '.ship-card:nth-child(N)',

  // === Actions Panel ===
  'actions-panel':      '.intervention-inventory',
  'intervention:ID':    '.intervention-card[data-id="ID"]',
  'medication:ID':      '.medication-toggle[data-id="ID"]',
  'med-toggles':        '.medication-panel',

  // === Result ===
  'result-panel':       '.result-panel',
  'result-stars':       '.result-panel__stars',
  'result-penalty':     '.result-panel__penalty',
  'result-next-btn':    '.result-panel__btn--next',
} as const;
```

> **Note:** `N` and `ID` are placeholders. Implementation should substitute actual values.

---

### 0.6. Tutorial Step Schema

```typescript
interface TutorialStep {
  id: string;                // e.g. "L1D1-01"
  bubble: TutorialBubble;
  highlight?: string;        // highlight target ID
  highlightType?: 'spotlight' | 'pulse' | 'glow';
  cta?: TutorialCTA;
  expectedAction?: {
    type: 'drag-food' | 'drag-intervention' | 'toggle-medication'
        | 'toggle-boost' | 'click-submit' | 'click-next-day' | 'any' | 'none';
    targetId?: string;       // food/intervention/medication ID
    slotIndex?: number;      // target slot
  };
  advanceOn: 'action' | 'tap' | 'auto';
  autoDelay?: number;        // ms (only for 'auto')
  blockInteraction?: boolean; // block all except expected action
}
```

---

---

## 1. Level 1 — "First Steps" (3 Days)

### 1.0. Level Overview

| | |
|---|---|
| **Theme** | Core interface: graph, zones, food placement, WP, kcal |
| **New Mechanics** | BG graph, food cubes, drag-and-drop, WP budget, kcal assessment, stacking |
| **Days** | 3 |
| **Difficulty** | Very easy (guided) |

---

### 1.1. Day 1 — "What is Glucose?"

**Concept:** Introduce the BG graph, zones, dragging a food card, and submitting.
**New Mechanics:** Graph interface, zones, food→cubes, Submit, star rating.
**Target Rating:** ⭐⭐⭐ (penalty ~1.0)

#### 1.1.1. Level Config

```json
{
  "day": 1,
  "kcalBudget": 400,
  "wpBudget": 5,
  "availableFoods": [
    { "id": "banana", "count": 1 }
  ],
  "availableInterventions": [],
  "availableMedications": [],
  "preplacedFoods": [],
  "preplacedInterventions": [],
  "lockedSlots": [0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [{ "from": 0, "to": 47, "rate": 3 }]
  }
}
```

**Design notes:**
- Only slot 2 (10:00 AM) is open — eliminates placement decision, focuses on drag mechanic
- Banana: 9 cubes, 3 cols rise, insulin rate 3 → rapid decay post-peak
- kcalBudget 400: banana (160 kcal) = 40% → Malnourished, but tutorial doesn't penalize Day 1

#### 1.1.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "Hi! I'm Doctor Alice. Welcome to BG Planner!" | happy | — | — | tap to continue |
| 2 | dialogue | "This is your Blood Glucose graph. The X axis shows time — from 8 AM to 8 PM. The Y axis shows glucose level in mg/dL." | neutral | `graph` (spotlight) | — | tap |
| 3 | dialogue | "See the colored zones? Green (60–140 mg/dL) is the safe range. That's where we want glucose to stay." | neutral | `graph-green-zone` (glow) | — | tap |
| 4 | warning | "Orange (200–300) means elevated glucose — you'll get penalty points. Red (300+) is danger — heavy penalties!" | concerned | `graph-orange-zone` + `graph-red-zone` (glow) | — | tap |
| 5 | dialogue | "Now look at this food card — 🍌 Banana. Each food raises glucose when you eat it." | neutral | `food-card:banana` (spotlight) | bounce on card | tap |
| 6 | dialogue | "Drag the banana card into the open time slot on the graph." | neutral | `slot:2` (pulse) | drag-arrow from `food-card:banana` to `slot:2` | drag banana → slot 2 |
| 7 | success | "Great! See the blue cubes on the graph? Each cube is 20 mg/dL of glucose. The banana creates 9 cubes — peaking at 180 mg/dL." | happy | `graph` (glow) | — | tap |
| 8 | dialogue | "The curve rises over 45 minutes, then insulin from your pancreas gradually absorbs the glucose. Watch it fall!" | neutral | `insulin-bars` (glow) | — | tap |
| 9 | dialogue | "Notice the peak touches the orange zone briefly — that's 2 cubes above 200 mg/dL. A small penalty, but totally manageable." | thinking | `graph-orange-zone` (pulse) | — | tap |
| 10 | dialogue | "Now press Submit to end your day and see the results!" | neutral | `submit-btn` (spotlight) | tap-pulse on `submit-btn` | click submit |
| 11 | — | *(Reveal animation plays: Phase 1 food cubes, Phase 2 insulin drain)* | — | — | — | auto (wait for reveal) |
| 12 | success | "⭐⭐⭐ Perfect! Only 1 penalty point — that's excellent! You kept glucose mostly in the green zone." | celebrating | `result-stars` (glow) | — | tap |
| 13 | dialogue | "Press 'Next Day' to continue!" | happy | `result-next-btn` (pulse) | tap-pulse on `result-next-btn` | click next day |

#### 1.1.3. Balance Notes

- Banana at slot 2 (col 8): peak 9 cubes at col 10
- Post-peak decay (rate 3): col 11→6, col 12→3, col 13→0
- Orange cubes: 2 (at peak column, rows 7-8)
- Penalty: 2 × 0.5 = **1.0**
- Stars: **3★** (≤12.5) ✓

---

### 1.2. Day 2 — "Budget Wisely"

**Concept:** Multiple foods, WP budget as a constraint, kcal assessment.
**New Mechanics:** WP budget, kcal bar, food selection under constraints.
**Target Rating:** ⭐⭐⭐ (penalty ~3.0)

#### 1.2.1. Level Config

```json
{
  "day": 2,
  "kcalBudget": 500,
  "wpBudget": 5,
  "availableFoods": [
    { "id": "banana", "count": 1 },
    { "id": "apple", "count": 1 },
    { "id": "cookie", "count": 1 }
  ],
  "availableInterventions": [],
  "availableMedications": [],
  "preplacedFoods": [],
  "preplacedInterventions": [],
  "lockedSlots": [0, 1, 4, 5, 7, 8, 10, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [{ "from": 0, "to": 47, "rate": 2 }]
  }
}
```

**Design notes:**
- 4 open slots: 2 (10 AM), 3 (11 AM), 6 (2 PM), 9 (5 PM) — spread across day
- WP = 5: banana(1) + apple(1) + cookie(2) = 4 WP → all fit
- Kcal: 160 + 140 + 230 = 530 / 500 = 106% → slight overeating (educational)
- Alternative: skip cookie → 300/500 = 60% → Optimal
- Insulin rate 2: lower than Day 1, peaks linger longer

#### 1.2.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "Welcome to Day 2! Today you have more food choices — but a limited budget." | neutral | — | — | tap |
| 2 | dialogue | "See the ☀️ number in the header? That's your Willpower (WP). Every food costs WP to place." | neutral | `wp-counter` (spotlight) | bounce on `wp-counter` | tap |
| 3 | dialogue | "You have 5 ☀️ today. Look at the WP badge on each food card — Banana costs 1, Apple costs 1, Cookie costs 2." | neutral | `food-inventory` (spotlight) | — | tap |
| 4 | dialogue | "The calorie bar shows how much you've eaten. Try to stay in the green 'Optimal' zone (50–100%)." | neutral | `kcal-bar` (spotlight) | — | tap |
| 5 | dialogue | "Place the Banana in the morning slot." | neutral | `slot:2` (pulse) | drag-arrow from `food-card:banana` to `slot:2` | drag banana → slot 2 |
| 6 | success | "Nice! Now place the Apple further away — spreading foods out prevents stacking." | happy | `slot:6` (pulse) | drag-arrow from `food-card:apple` to `slot:6` | drag apple → slot 6 |
| 7 | hint | "💡 You still have 3 ☀️ left. The Cookie costs 2 — you can afford it! But check the calorie bar..." | thinking | `kcal-bar` (glow) | — | tap |
| 8 | dialogue | "Place the Cookie in the evening if you want, or skip it to stay Optimal on calories. Your choice!" | neutral | `slot:9` (pulse) | — | drag cookie → slot 9 (or skip) |
| 9 | dialogue | "Ready? Press Submit!" | neutral | `submit-btn` (spotlight) | tap-pulse on `submit-btn` | click submit |
| 10 | — | *(Reveal animation plays)* | — | — | — | auto |
| 11 | success | "Well done! Each food created its own curve. Notice how spreading them apart kept the peaks lower." | celebrating | `result-panel` (glow) | — | tap |
| 12 | dialogue | "Next day awaits!" | happy | `result-next-btn` (pulse) | tap-pulse | click next day |

#### 1.2.3. Balance Notes

**If all 3 placed (spread):** banana@2 + apple@6 + cookie@9
- Each food peak is independent (no overlap since they're 4+ slots apart)
- Banana: 9 cubes → 2 orange → 1.0 penalty
- Apple: 9 cubes → 2 orange → 1.0 penalty
- Cookie: 6 cubes → 0 orange → 0 penalty
- Total: **2.0 penalty → 3★**
- Kcal: 530/500 = 106% → Overeating (teaches consequence for Day 3)

**If banana + apple only:** 300/500 = 60% → Optimal, penalty ~2.0 → 3★

---

### 1.3. Day 3 — "Stacking"

**Concept:** When foods overlap in time, cubes stack — causing higher peaks.
**New Mechanics:** Food stacking, pre-placed foods, insulin profile variation (morning vs evening).
**Target Rating:** ⭐⭐⭐ if spread (penalty ~2.0), ⭐⭐ if stacked (~20-30)

#### 1.3.1. Level Config

```json
{
  "day": 3,
  "kcalBudget": 600,
  "wpBudget": 6,
  "availableFoods": [
    { "id": "banana", "count": 1 },
    { "id": "milk", "count": 1 }
  ],
  "availableInterventions": [],
  "availableMedications": [],
  "preplacedFoods": [
    { "shipId": "popcorn", "slotIndex": 3 }
  ],
  "preplacedInterventions": [],
  "lockedSlots": [0, 1, 3, 4, 5, 7, 8, 10, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [
      { "from": 0, "to": 23, "rate": 3 },
      { "from": 24, "to": 47, "rate": 1 }
    ]
  }
}
```

**Design notes:**
- Open slots: 2, 6, 9. Pre-placed popcorn at slot 3 (11:00 AM)
- Morning insulin rate 3 (high) → afternoon rate 1 (low)
- Popcorn (8 cubes, 3 cols) in slot 3 with rate 3: decays fast
- If banana placed at slot 2 (adjacent to popcorn): cubes STACK → peak potentially 17 cubes → deep red zone!
- If banana at slot 6 or 9: no stacking, safe
- Teaches: adjacent foods are dangerous

#### 1.3.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "Day 3! Notice there's already a 🍿 Popcorn on the graph — it's pre-placed. You can't move it." | neutral | `slot:3` (spotlight) | bounce on slot 3 | tap |
| 2 | dialogue | "See the 🔒 icon? Pre-placed foods are part of the puzzle. You need to plan around them." | neutral | `slot:3` (glow) | — | tap |
| 3 | warning | "Be careful where you put your food! If two foods overlap in time, their cubes STACK — making the peak much higher." | concerned | `graph` (spotlight) | — | tap |
| 4 | dialogue | "Also notice the amber bars at the bottom of the graph — they show your insulin rate. Morning insulin (rate 3) is stronger than evening (rate 1)." | neutral | `insulin-bars` (glow) | — | tap |
| 5 | hint | "💡 Try placing the Banana far from the Popcorn to avoid stacking. Morning slots have stronger insulin — food decays faster there." | thinking | `slot:6` (pulse) | — | tap |
| 6 | dialogue | "Place your Banana." | neutral | — | — | drag banana → any open slot |
| 7 | dialogue | "Now place the Milk." | neutral | — | — | drag milk → any remaining slot |
| 8 | dialogue | "Submit when you're ready!" | neutral | `submit-btn` (spotlight) | tap-pulse | click submit |
| 9 | — | *(Reveal animation)* | — | — | — | auto |
| 10 | success | "Good job! If you spread foods apart, the peaks stayed manageable. Stacking is the enemy!" | celebrating | `result-panel` | — | tap |
| 11 | dialogue | "You've completed Level 1 — First Steps! 🎉 Ready for the next challenge?" | happy | — | — | tap |

#### 1.3.3. Balance Notes

**Optimal solution:** banana@2, milk@6
- Banana@2 (cols 8-10, rate 3): peak 9, decays 6→3→0. Orange: 2 cubes → 1.0
- Popcorn@3 (cols 12-14, rate 3): peak 8, decays 5→2→0. Orange: 1 cube → 0.5
- Milk@6 (cols 24-26, rate 1): peak 5, decays 4→3→2→1→0. No orange.
- Total: **1.5 penalty → 3★** ✓

**Bad solution:** banana@2 (adjacent to popcorn@3)
- Banana cols 8-10 + popcorn cols 12-14: minimal overlap (different cols)
- Actually banana (3 cols: 8,9,10) and popcorn (3 cols: 12,13,14) don't overlap!
- True stacking only happens if same columns. Banana@2 = cols 8-11, Popcorn@3 = cols 12-15.
- They're adjacent but NOT overlapping. Stacking demonstration needs overlap.

**Revised approach:** If we want stacking, need to show what happens with same-slot food:
- Tutorial can warn about stacking concept even without demonstrating it on Day 3
- The real stacking lesson comes in Level 2 with pre-placed burger

---

---

## 2. Level 2 — "Keep Moving" (3 Days)

### 2.0. Level Overview

| | |
|---|---|
| **Theme** | Exercise interventions — burning cubes to control peaks |
| **New Mechanics** | Light Walk, locked slots, Heavy Run |
| **Days** | 3 |
| **Difficulty** | Easy-Medium |

---

### 2.1. Day 1 — "Light Walk"

**Concept:** Introduce the Light Walk intervention — it burns cubes from the top of the food stack.
**New Mechanics:** Exercise intervention, burned cubes, drag intervention to graph.
**Target Rating:** ⭐⭐–⭐⭐⭐ (penalty ~5-12)

#### 2.1.1. Level Config

```json
{
  "day": 1,
  "kcalBudget": 1200,
  "wpBudget": 8,
  "availableFoods": [
    { "id": "milk", "count": 1 }
  ],
  "availableInterventions": [
    { "id": "lightwalk", "count": 1 }
  ],
  "availableMedications": [],
  "preplacedFoods": [
    { "shipId": "burger", "slotIndex": 2 }
  ],
  "preplacedInterventions": [],
  "lockedSlots": [0, 1, 2, 4, 5, 7, 8, 10, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [
      { "from": 0, "to": 23, "rate": 2 },
      { "from": 24, "to": 47, "rate": 1 }
    ]
  }
}
```

**Design notes:**
- Open slots: 3, 6, 9. Pre-placed burger at slot 2 (10:00 AM)
- Burger: 14 cubes, 10 cols (cols 8-17). Peak reaches 280 mg/dL → deep orange zone
- Light Walk: depth 3 cubes, 60 min (4 cols), 2 WP. Tail: 1 cube to end
- Walk at slot 3 (11:00 AM, cols 12-15) catches the middle of burger curve
- Milk fills kcal requirement (180 kcal, total 800/1200 = 67% → Optimal)

#### 2.1.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "Welcome to Level 2! Today we learn about exercise — your secret weapon against glucose spikes." | neutral | — | — | tap |
| 2 | dialogue | "A 🍔 Hamburger is pre-placed at 10 AM. It creates 14 cubes — that's 280 mg/dL! Way into the orange zone." | concerned | `slot:2` (spotlight) | — | tap |
| 3 | dialogue | "See the green card below? That's 🚶 Light Walk — an exercise intervention. It burns cubes from the TOP of the glucose stack." | neutral | `intervention:lightwalk` (spotlight) | bounce | tap |
| 4 | dialogue | "Drag the Light Walk to the slot RIGHT AFTER the burger. Exercise works best near the peak!" | neutral | `slot:3` (pulse) | drag-arrow from `intervention:lightwalk` to `slot:3` | drag walk → slot 3 |
| 5 | success | "See the green cubes? Those are BURNED cubes — removed by your walk! The walk burns 3 cubes per column for 1 hour, then 1 cube as a cool-down." | happy | `graph` (glow) | — | tap |
| 6 | dialogue | "Now place your 🥛 Milk somewhere for calories." | neutral | — | — | drag milk → slot 6 or 9 |
| 7 | dialogue | "Submit to see your results!" | neutral | `submit-btn` (spotlight) | tap-pulse | click submit |
| 8 | — | *(Reveal animation — Phase 1: Food, Phase 3: Exercise burns)* | — | — | — | auto |
| 9 | success | "Exercise made a big difference! Without the walk, the burger would have given many more penalty points." | celebrating | `result-panel` | — | tap |
| 10 | dialogue | "Remember: 🚶 Light Walk burns 3 cubes deep for 1 hour. It costs 2 ☀️ WP." | neutral | — | — | tap |

#### 2.1.3. Balance Notes

**Walk@3:** Burns 3 cubes/col in cols 12-15 (main), then 1 cube/col from col 16 onward (tail).
- Burger (14 cubes, cols 8-17, rate 2): curve roughly [2,4,7,9,11,14,12,10,8,6]
- Walk reduces burger heights by 3 in cols 12-15, by 1 from col 16+
- Estimated reduction: ~20 cubes removed from orange zone
- Without walk: penalty ~25-30 (2★)
- With walk@3: penalty ~8-12 → **3★** ✓

---

### 2.2. Day 2 — "Strategic Placement"

**Concept:** Locked slots limit where you can place food/exercises. Plan around constraints.
**New Mechanics:** Locked slots (🔒).
**Target Rating:** ⭐⭐ (penalty ~20-40)

#### 2.2.1. Level Config

```json
{
  "day": 2,
  "kcalBudget": 1400,
  "wpBudget": 8,
  "availableFoods": [
    { "id": "banana", "count": 1 },
    { "id": "cookie", "count": 1 }
  ],
  "availableInterventions": [
    { "id": "lightwalk", "count": 1 }
  ],
  "availableMedications": [],
  "preplacedFoods": [
    { "shipId": "chocolatemuffin", "slotIndex": 4 }
  ],
  "preplacedInterventions": [],
  "lockedSlots": [0, 1, 2, 4, 6, 8, 10, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [
      { "from": 0, "to": 31, "rate": 2 },
      { "from": 32, "to": 47, "rate": 1 }
    ]
  }
}
```

**Design notes:**
- Muffin at slot 4 (12:00 PM): 18 cubes → 360 mg/dL → RED zone
- Free slots: 3, 5, 7, 9
- Walk at slot 5 (1:00 PM) catches muffin's post-peak tail
- Muffin is intentionally overwhelming — teaches that 1 walk can't fix everything (foreshadows Heavy Run)

#### 2.2.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "Day 2 — a Chocolate Muffin 🧁 is pre-placed at noon. Look at that spike — 18 cubes! Deep in the red zone." | concerned | `slot:4` (spotlight) | — | tap |
| 2 | dialogue | "See the gray 🔒 slots? Those are locked — you can't place anything there. You must use the open slots wisely." | neutral | `slot:0` + `slot:1` (glow) | — | tap |
| 3 | dialogue | "You have 4 open slots: 11 AM, 1 PM, 3 PM, and 5 PM. Place your walk right after the muffin to burn as many cubes as possible!" | neutral | `slot:5` (pulse) | — | tap |
| 4 | dialogue | "Place the 🚶 Light Walk." | neutral | — | drag-arrow from `intervention:lightwalk` to `slot:5` | drag walk → slot 5 |
| 5 | dialogue | "The walk helps, but the muffin is just too big for one walk. Place your food in the remaining slots." | thinking | — | — | drag foods to slots |
| 6 | dialogue | "Submit!" | neutral | `submit-btn` (pulse) | tap-pulse | click submit |
| 7 | — | *(Reveal animation)* | — | — | — | auto |
| 8 | dialogue | "The muffin still caused significant penalties. Sometimes one walk isn't enough — tomorrow you'll get a more powerful tool!" | thinking | `result-panel` | — | tap |

#### 2.2.3. Balance Notes

- Muffin@4 (18 cubes, 4 cols rise, rate 2): peak at col 19, post-peak decay slow
- Peak column: 18 cubes = 360 mg/dL. Red cubes: 18-12 = 6. Orange cubes: 12-7 = 5.
- At peak: 6×1.5 + 5×0.5 = 11.5 per peak column. Multiple columns in penalty zone.
- Walk@5 burns 3 cubes from cols 20-23, but peak is at col 19 (not covered by walk)
- Estimated total penalty: **30-50 → 2★** (intentionally hard — motivates Heavy Run)

---

### 2.3. Day 3 — "Heavy Run"

**Concept:** Heavy Run is a powerful exercise (5 depth, 12 cols) but costs more WP and 2 slots.
**New Mechanics:** Heavy Run (2-slot size), comparing exercises.
**Target Rating:** ⭐⭐–⭐⭐⭐ (penalty ~10-20)

#### 2.3.1. Level Config

```json
{
  "day": 3,
  "kcalBudget": 1400,
  "wpBudget": 10,
  "availableFoods": [
    { "id": "banana", "count": 1 },
    { "id": "berriesmixed", "count": 1 }
  ],
  "availableInterventions": [
    { "id": "lightwalk", "count": 1 },
    { "id": "heavyrun", "count": 1 }
  ],
  "availableMedications": [],
  "preplacedFoods": [
    { "shipId": "chocolatemuffin", "slotIndex": 1 }
  ],
  "preplacedInterventions": [],
  "lockedSlots": [0, 1, 4, 8, 10, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [
      { "from": 0, "to": 31, "rate": 2 },
      { "from": 32, "to": 47, "rate": 1 }
    ]
  }
}
```

**Design notes:**
- Muffin at slot 1 (9:00 AM). Free slots: 2, 3, 5, 6, 7, 9
- Heavy Run (2 slots) at slots 2-3 (10-11 AM) covers muffin tail intensely
- Light Walk at slot 5 or 6 for extra coverage
- WP: run(4) + walk(2) + banana(1) + berries(2) = 9 ≤ 10 ✓

#### 2.3.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "That muffin from yesterday? Still here! But today you have a new weapon — 🏃 Heavy Run." | happy | `intervention:heavyrun` (spotlight) | bounce | tap |
| 2 | dialogue | "Heavy Run burns 5 cubes deep for 3 hours — much more powerful than a walk! But it costs 4 ☀️ and takes up 2 slots." | neutral | `intervention:heavyrun` (glow) | — | tap |
| 3 | dialogue | "Compare: 🚶 Walk = 3 deep, 1 hour, 2 WP. 🏃 Run = 5 deep, 3 hours, 4 WP. The run covers way more ground!" | neutral | `actions-panel` (spotlight) | — | tap |
| 4 | dialogue | "Place the Heavy Run right after the muffin to maximize burn!" | neutral | `slot:2` (pulse) | drag-arrow from `intervention:heavyrun` to `slot:2` | drag run → slot 2 |
| 5 | success | "Wow — look at all those green burned cubes! The run covers 12 columns of cube reduction." | happy | `graph` (glow) | — | tap |
| 6 | dialogue | "Now place your food. Remember — keep banana and berries spread apart." | neutral | — | — | drag foods to remaining slots |
| 7 | hint | "💡 You still have a 🚶 Light Walk. If you have WP left, use it for extra burn coverage!" | thinking | `intervention:lightwalk` (glow) | — | tap (or use it) |
| 8 | dialogue | "Submit!" | neutral | `submit-btn` (pulse) | tap-pulse | click submit |
| 9 | — | *(Reveal animation)* | — | — | — | auto |
| 10 | success | "Much better than yesterday! The Heavy Run made a huge difference against the muffin. Level 2 complete!" | celebrating | `result-panel` | — | tap |

#### 2.3.3. Balance Notes

- Muffin@1 (cols 4-7 rise, peak at col 7): 18 cubes
- Heavy Run@2 (cols 8-19 main at depth 5, cols 20+ tail at depth 2): massive burn
- Run covers muffin post-peak. With rate 2 insulin + 5 depth run, effective reduction is huge
- Estimated penalty: **5-15 → 3★ or high 2★** ✓
- WP: run(4) + walk(2) + banana(1) + berries(2) = 9/10. 1 unspent → acceptable

---

---

## 3. Level 3 — "Willpower Management" (3 Days)

### 3.0. Level Overview

| | |
|---|---|
| **Theme** | WP resource management, breaks, overeating consequences |
| **New Mechanics** | Take a Break (☕), overeating carry-over penalties, Take a Rest (😴) |
| **Days** | 3 |
| **Difficulty** | Medium |

---

### 3.1. Day 1 — "Coffee Break"

**Concept:** Take a Break refunds 1 WP. With tight WP budget, breaks enable more placements.
**New Mechanics:** Break intervention (WP refund, blocks time slot).
**Target Rating:** ⭐⭐⭐ (penalty ~3-5)

#### 3.1.1. Level Config

```json
{
  "day": 1,
  "kcalBudget": 600,
  "wpBudget": 4,
  "availableFoods": [
    { "id": "banana", "count": 1 },
    { "id": "apple", "count": 1 },
    { "id": "cookie", "count": 1 }
  ],
  "availableInterventions": [
    { "id": "takeabreak", "count": 1 }
  ],
  "availableMedications": [],
  "preplacedFoods": [],
  "preplacedInterventions": [],
  "lockedSlots": [0, 1, 4, 5, 8, 9, 10, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [{ "from": 0, "to": 47, "rate": 2 }]
  }
}
```

**Design notes:**
- Free slots: 2, 3, 6, 7. WP = 4
- Banana(1) + Apple(1) + Cookie(2) = 4 WP exactly → all fit without break
- WITH break: banana(1) + apple(1) + cookie(2) + break(-1) = 3 effective WP used
- Break teaches the WP refund concept even though it's not strictly required here
- Break occupies a slot (blocks food placement) — tradeoff

#### 3.1.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "Level 3 — managing your willpower! Today's WP budget is tight: only 4 ☀️." | neutral | `wp-counter` (spotlight) | — | tap |
| 2 | dialogue | "See the ☕ Take a Break card? It's special — it REFUNDS 1 ☀️ WP! Look at the green +1 badge." | neutral | `intervention:takeabreak` (spotlight) | bounce | tap |
| 3 | dialogue | "The catch: it blocks a slot for 30 minutes. You give up space to get WP back." | thinking | `intervention:takeabreak` (glow) | — | tap |
| 4 | dialogue | "Try placing your 3 foods first, then use the break in a spare slot if you need WP for later days." | neutral | — | — | tap |
| 5 | dialogue | "Place your foods!" | neutral | `food-inventory` (spotlight) | — | drag 3 foods |
| 6 | hint | "💡 Place the ☕ Break in slot 7 — it doesn't burn cubes, just saves WP for the future." | thinking | `slot:7` (pulse) | — | optional: place break |
| 7 | dialogue | "Submit!" | neutral | `submit-btn` (pulse) | tap-pulse | click submit |
| 8 | — | *(Reveal animation)* | — | — | — | auto |
| 9 | success | "Well managed! Breaks are great when WP is tight." | happy | `result-panel` | — | tap |

#### 3.1.3. Balance Notes

- 3 foods spread across 4 slots: each peak independent, no stacking
- Banana (9 cubes) + Apple (9 cubes): ~2 orange cubes each → 2.0 penalty
- Cookie (6 cubes): 0 orange → 0 penalty
- Total: **~2.0 penalty → 3★** ✓

---

### 3.2. Day 2 — "The Price of Overeating"

**Concept:** Eating too much has consequences for tomorrow. Kcal bar zones matter.
**New Mechanics:** Overeating penalty system, kcal assessment zones, forecast badge.
**Target Rating:** ⭐⭐⭐ (if Optimal), ⭐⭐ (if Overeating — intentional lesson)

#### 3.2.1. Level Config

```json
{
  "day": 2,
  "kcalBudget": 500,
  "wpBudget": 8,
  "availableFoods": [
    { "id": "pizza", "count": 1 },
    { "id": "banana", "count": 1 },
    { "id": "cookie", "count": 1 },
    { "id": "icecream", "count": 1 }
  ],
  "availableInterventions": [
    { "id": "lightwalk", "count": 1 }
  ],
  "availableMedications": [],
  "preplacedFoods": [],
  "preplacedInterventions": [],
  "lockedSlots": [0, 1, 4, 5, 8, 9, 10, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [{ "from": 0, "to": 47, "rate": 2 }]
  }
}
```

**Design notes:**
- Free slots: 2, 3, 6, 7. Generous WP but LOW kcal budget (500)
- Pizza (460 kcal) nearly fills the budget alone!
- Pizza (460) + banana (160) = 620/500 = 124% → Overeating!
- Ice cream is a trap (200 kcal, 0 WP — free but pushes calories over)
- Optimal: pizza only (460/500 = 92%) or banana + cookie (160+230 = 390/500 = 78%)
- Walk available for pizza peak management

#### 3.2.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "Day 2 is about calories. Watch the calorie bar carefully today!" | neutral | `kcal-bar` (spotlight) | — | tap |
| 2 | dialogue | "The bar has three zones: Red (Malnourished, <50%), Green (Optimal, 50-100%), Orange (Overeating, >100%)." | neutral | `kcal-zones` (glow) | — | tap |
| 3 | warning | "If you Overeat today, tomorrow you'll lose 1 ☀️ WP AND get 100 extra calories you must eat. Plus free 🍦 Ice Cream!" | concerned | `forecast-badge` (spotlight) | — | tap |
| 4 | dialogue | "Your budget is 500 kcal. 🍕 Pizza alone is 460 — almost the whole budget! Be smart about what you eat." | neutral | `food-card:pizza` (glow) | — | tap |
| 5 | dialogue | "Place your food. Try to stay in the green zone!" | neutral | `food-inventory` (spotlight) | — | drag foods |
| 6 | dialogue | "Watch the forecast badge — it tells you what happens tomorrow based on your current calories." | thinking | `forecast-badge` (glow) | — | tap |
| 7 | dialogue | "Submit!" | neutral | `submit-btn` (pulse) | tap-pulse | click submit |
| 8 | — | *(Reveal animation)* | — | — | — | auto |
| 9 | dialogue | "Check the satiety message in the results. If you overate, you'll see the penalty for Day 3!" | neutral | `result-panel` (glow) | — | tap |

#### 3.2.3. Balance Notes

**Optimal play:** Pizza@2 + walk@3 → 460/500 = 92% → Optimal (+1 WP tomorrow)
- Pizza: 12 cubes, 6 cols rise. Walk covers post-peak.
- Penalty: ~10-15 → 3★ possible with good walk placement

**Overeating play:** Pizza + banana = 620/500 = 124% → Overeating
- Day 3 penalty: −1 WP, +100 kcal budget, +1 free ice cream

---

### 3.3. Day 3 — "Yesterday's Consequences"

**Concept:** Carry-over penalties from overeating. Take a Rest as a WP recovery tool.
**New Mechanics:** Carry-over penalty (−WP, +kcal, free ice cream), Take a Rest (😴).
**Target Rating:** ⭐⭐ (penalty 20-40, conditions are harder)

#### 3.3.1. Level Config

```json
{
  "day": 3,
  "kcalBudget": 800,
  "wpBudget": 8,
  "availableFoods": [
    { "id": "oatmeal", "count": 1 },
    { "id": "banana", "count": 1 }
  ],
  "availableInterventions": [
    { "id": "lightwalk", "count": 1 },
    { "id": "takearest", "count": 1 }
  ],
  "availableMedications": [],
  "preplacedFoods": [
    { "shipId": "burger", "slotIndex": 0 }
  ],
  "preplacedInterventions": [],
  "lockedSlots": [0, 4, 5, 8, 9, 10, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [
      { "from": 0, "to": 23, "rate": 2 },
      { "from": 24, "to": 47, "rate": 1 }
    ]
  }
}
```

**Design notes:**
- Free slots: 1, 2, 3, 6, 7. Pre-placed burger at slot 0
- If overate on Day 2: effective WP = 8 − 1 = 7, kcalBudget = 800 + 100 = 900, +1 free ice cream
- Take a Rest: 2 slots, refunds 2 WP. Useful for WP recovery
- Burger (14 cubes) + walk manages the peak
- Last day of level: unspent WP penalty applies (WP_PENALTY_WEIGHT=5)

#### 3.3.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "Day 3 — the last day of Level 3. Check your WP..." | neutral | `wp-counter` (spotlight) | — | tap |
| 2 | warning | "If you overate yesterday, you lost 1 ☀️ WP and got a free 🍦 Ice Cream you didn't ask for!" | concerned | `wp-counter` (glow) | — | tap (conditional — only if overate) |
| 3 | dialogue | "New tool: 😴 Take a Rest. It refunds 2 ☀️ WP and takes 2 slots. Great for recovering willpower!" | neutral | `intervention:takearest` (spotlight) | bounce | tap |
| 4 | warning | "This is the last day of the level! Unspent ☀️ WP adds penalty: 5 points per leftover WP. Spend wisely!" | concerned | `wp-counter` (pulse) | — | tap |
| 5 | dialogue | "Plan your day: walk near the burger, food in other slots, rest if you need WP back." | neutral | — | — | tap |
| 6 | dialogue | "Place everything and Submit!" | neutral | — | — | place all, submit |
| 7 | — | *(Reveal animation)* | — | — | — | auto |
| 8 | success | "Level 3 complete! You've learned to manage willpower and the consequences of overeating." | celebrating | `result-panel` | — | tap |

#### 3.3.3. Balance Notes

- Burger@0 (14 cubes, rate 2): high peak in morning
- Walk@1 near burger: burns 3 cubes post-peak
- Oatmeal@3 (10 cubes, rate 2) in late morning
- Banana@6 (9 cubes, rate 1) in afternoon — slow decay
- WP: burger(0 preplaced) + walk(2) + oatmeal(4) + banana(1) = 7. Rest(-2) would give back 2.
- Total penalty depends on placement. Estimated: **15-30 → 2★** ✓

---

---

## 4. Level 4 — "Insulin Rhythm" (2 Days)

### 4.0. Level Overview

| | |
|---|---|
| **Theme** | Insulin profiles — time of day matters for glucose management |
| **New Mechanics** | Variable insulin rates across the day, reading amber insulin bars |
| **Days** | 2 |
| **Difficulty** | Medium |

---

### 4.1. Day 1 — "Morning vs Evening"

**Concept:** Same food peaks differently depending on time of day (insulin rate variation).
**New Mechanics:** Insulin rate segments, morning sensitivity vs evening resistance.
**Target Rating:** ⭐⭐⭐ (penalty ~3.0 with good placement)

#### 4.1.1. Level Config

```json
{
  "day": 1,
  "kcalBudget": 600,
  "wpBudget": 6,
  "availableFoods": [
    { "id": "banana", "count": 2 }
  ],
  "availableInterventions": [],
  "availableMedications": [],
  "preplacedFoods": [],
  "preplacedInterventions": [],
  "lockedSlots": [1, 3, 4, 5, 7, 8, 10, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [
      { "from": 0, "to": 15, "rate": 4 },
      { "from": 16, "to": 31, "rate": 2 },
      { "from": 32, "to": 47, "rate": 1 }
    ]
  }
}
```

**Design notes:**
- Free slots: 0 (8 AM), 2 (10 AM), 6 (2 PM), 9 (5 PM)
- 2 bananas (9 cubes each). Rate: 4 (morning) / 2 (midday) / 1 (evening)
- Banana@0 (rate 4): post-peak decay 5→1→0 — very fast, ~1 col above orange
- Banana@9 (rate 1): post-peak decay 8→7→6→5→4→3→2→1→0 — lingers for 8 cols, cols at 8 and 7 in orange
- Dramatic visual difference: morning banana = tiny spike, evening banana = prolonged bump

#### 4.1.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "Today is about insulin rhythm. Look at the amber bars at the bottom of the graph." | neutral | `insulin-bars` (spotlight) | — | tap |
| 2 | dialogue | "The bars show insulin rate — how fast your body absorbs glucose. Tall bars = fast absorption. Short bars = slow." | neutral | `insulin-bars` (glow) | — | tap |
| 3 | dialogue | "Morning rate is 4 (very strong), midday is 2, evening is 1 (weak). The same food peaks VERY differently!" | neutral | `insulin-bars` (spotlight) | — | tap |
| 4 | dialogue | "You have two 🍌 Bananas. Place one in the morning (8 AM) first." | neutral | `slot:0` (pulse) | drag-arrow from `food-card:banana` to `slot:0` | drag banana → slot 0 |
| 5 | success | "See how fast it decays! Rate 4 insulin eats the cubes quickly — barely any orange zone." | happy | `graph` (glow) | — | tap |
| 6 | dialogue | "Now place the second banana in the evening (5 PM) and compare." | neutral | `slot:9` (pulse) | drag-arrow from `food-card:banana` to `slot:9` | drag banana → slot 9 |
| 7 | warning | "Look at the difference! Evening insulin is only rate 1 — the banana lingers much longer. More cubes in the orange zone!" | concerned | `graph` (glow) | — | tap |
| 8 | hint | "💡 Big meals in the morning when insulin is strong! Light snacks in the evening." | thinking | — | — | tap |
| 9 | dialogue | "Submit!" | neutral | `submit-btn` | tap-pulse | click submit |
| 10 | — | *(Reveal animation)* | — | — | — | auto |
| 11 | success | "Notice the contrast? Morning banana: quick and clean. Evening banana: slow and problematic. Timing is everything!" | celebrating | `result-panel` | — | tap |

#### 4.1.3. Balance Notes

- Banana@0 (col 0, rate 4): peak 9 at col 2, post-peak: 5,1,0. Orange: 2 cubes at peak → 1.0
- Banana@9 (col 36, rate 1): peak 9 at col 38, post-peak: 8,7,6,5,4,3,2,1,0. Orange: 2(col 38), 1(39) → ~1.5
- Total: **~2.5 penalty → 3★** ✓
- Visual lesson: dramatic difference despite same food

---

### 4.2. Day 2 — "Reading Insulin Bars"

**Concept:** Use insulin profile knowledge to place bigger foods at high-insulin times.
**New Mechanics:** Strategic food-to-insulin matching.
**Target Rating:** ⭐⭐–⭐⭐⭐ (penalty ~5-15)

#### 4.2.1. Level Config

```json
{
  "day": 2,
  "kcalBudget": 1200,
  "wpBudget": 10,
  "availableFoods": [
    { "id": "oatmeal", "count": 1 },
    { "id": "chickpeas", "count": 1 },
    { "id": "banana", "count": 1 }
  ],
  "availableInterventions": [
    { "id": "lightwalk", "count": 1 }
  ],
  "availableMedications": [],
  "preplacedFoods": [],
  "preplacedInterventions": [],
  "lockedSlots": [1, 4, 5, 8, 10, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [
      { "from": 0, "to": 15, "rate": 3 },
      { "from": 16, "to": 31, "rate": 2 },
      { "from": 32, "to": 47, "rate": 1 }
    ]
  }
}
```

**Design notes:**
- Free slots: 0, 2, 3, 6, 7, 9
- Oatmeal (10 cubes, 8 cols) should go in morning (rate 3)
- Chickpeas (9 cubes, 6 cols) in midday (rate 2)
- Banana (9 cubes, 3 cols) wherever — flexible
- Walk covers a peak area
- Challenge: player must match food size to insulin rate

#### 4.2.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "Today you have three foods of different sizes. Match them to the right insulin windows!" | neutral | `insulin-bars` (glow) | — | tap |
| 2 | hint | "💡 Oatmeal has the highest peak (10 cubes). Put it in the morning where insulin is 3 — it'll decay fast." | thinking | `food-card:oatmeal` (glow) | — | tap |
| 3 | hint | "💡 Chickpeas (9 cubes, 6 cols) fit well in the afternoon. Banana is flexible — any open slot works." | thinking | — | — | tap |
| 4 | dialogue | "Plan your day and place everything!" | neutral | — | — | place all foods + walk |
| 5 | dialogue | "Submit!" | neutral | `submit-btn` | tap-pulse | click submit |
| 6 | — | *(Reveal animation)* | — | — | — | auto |
| 7 | success | "Level 4 complete! You've mastered insulin rhythm — bigger food in high-insulin slots, lighter food in low-insulin times." | celebrating | `result-panel` | — | tap |

#### 4.2.3. Balance Notes

**Optimal:** Oatmeal@0 (rate 3), Chickpeas@3 (rate 2-3 boundary), Banana@6 (rate 2), Walk near oatmeal
- Oatmeal@0 (10 cubes, rate 3): orange cubes at peak only → ~1.5
- Chickpeas@3 (9 cubes, rate 2-3): ~1.0
- Banana@6 (9 cubes, rate 2): ~1.5
- Walk reduces one peak by 3 cubes
- Estimated: **5-10 penalty → 3★** ✓

---

---

## 5. Level 5 — "First Medication" (2 Days)

### 5.0. Level Overview

| | |
|---|---|
| **Theme** | Metformin — passive glucose reduction |
| **New Mechanics** | Medication toggles, Metformin (peak reduction ×0.80) |
| **Days** | 2 |
| **Difficulty** | Medium |

---

### 5.1. Day 1 — "Metformin"

**Concept:** Metformin reduces ALL food glucose by 20%. Toggle it ON to see the difference.
**New Mechanics:** Medication toggle (ON/OFF), peak reduction effect.
**Target Rating:** ⭐⭐⭐ (penalty ~3-8 with metformin ON)

#### 5.1.1. Level Config

```json
{
  "day": 1,
  "kcalBudget": 1200,
  "wpBudget": 8,
  "availableFoods": [
    { "id": "banana", "count": 1 },
    { "id": "cookie", "count": 1 }
  ],
  "availableInterventions": [],
  "availableMedications": ["metformin"],
  "preplacedFoods": [
    { "shipId": "chocolatemuffin", "slotIndex": 3 }
  ],
  "preplacedInterventions": [],
  "lockedSlots": [0, 1, 3, 5, 6, 8, 9, 10, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [
      { "from": 0, "to": 31, "rate": 2 },
      { "from": 32, "to": 47, "rate": 1 }
    ]
  }
}
```

**Design notes:**
- Muffin at slot 3 (11:00 AM): 18 cubes WITHOUT metformin, 14 cubes WITH
- Free slots: 2, 4, 7. Metformin available.
- Muffin glucose: 350 × 0.80 = 280 → 14 cubes (vs 18 without)
- 4 fewer cubes = significant penalty reduction
- Tutorial guides player to toggle metformin ON, then OFF, to see the visual difference

#### 5.1.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "Level 5 — your first medication! See the purple panel below the graph? That's the medication area." | neutral | `med-toggles` (spotlight) | — | tap |
| 2 | dialogue | "💊 Metformin reduces ALL food glucose by 20%. It costs no WP — it's a free toggle." | neutral | `medication:metformin` (glow) | — | tap |
| 3 | dialogue | "Look at the muffin — 18 cubes without medication. Toggle Metformin ON and watch what happens!" | neutral | `medication:metformin` (pulse) | tap-pulse on `medication:metformin` | toggle metformin ON |
| 4 | success | "The muffin dropped from 18 to 14 cubes! That's 4 fewer cubes in the penalty zone. Metformin affects ALL foods." | happy | `graph` (glow) | — | tap |
| 5 | dialogue | "Place your foods and submit." | neutral | — | — | drag foods, submit |
| 6 | — | *(Reveal animation — Phase 1: Food, Phase 4: Medication prevented cubes in pink)* | — | — | — | auto |
| 7 | dialogue | "See the faint pink cubes above the food? Those are cubes that Metformin PREVENTED. That's glucose your body didn't absorb." | neutral | `graph` (glow) | — | tap |
| 8 | success | "Metformin is a powerful ally! Keep it toggled ON whenever it's available." | celebrating | `result-panel` | — | tap |

#### 5.1.3. Balance Notes

**With Metformin ON:**
- Muffin: 350 × 0.80 = 280 → 14 cubes. Orange: 14-7 = 7 cubes. Red: 14-12 = 2 cubes.
- Penalty at peak column: 7 × 0.5 + 2 × 1.5 = 6.5. Multiple cols in zone.
- Banana (met): 180 × 0.8 = 144 → 7 cubes. No orange (7 is threshold, 0 cubes above).
- Cookie (met): 110 × 0.8 = 88 → 4 cubes. No penalty.
- Estimated total: **10-15 penalty → 3★ or 2★** depending on placement

**Without Metformin:**
- Muffin: 18 cubes → massive red zone. Peak penalty per col: 11×0.5 + 6×1.5 = 14.5
- Estimated total: **40-60 → 2★ or 1★**

---

### 5.2. Day 2 — "Combo: Metformin + Walk"

**Concept:** Combining Metformin with exercise for maximum effect.
**New Mechanics:** Medication + exercise combo synergy.
**Target Rating:** ⭐⭐⭐ (penalty ~5-10)

#### 5.2.1. Level Config

```json
{
  "day": 2,
  "kcalBudget": 1400,
  "wpBudget": 10,
  "availableFoods": [
    { "id": "chickpeas", "count": 1 },
    { "id": "banana", "count": 1 }
  ],
  "availableInterventions": [
    { "id": "lightwalk", "count": 2 }
  ],
  "availableMedications": ["metformin"],
  "preplacedFoods": [
    { "shipId": "burger", "slotIndex": 0 },
    { "shipId": "chocolatemuffin", "slotIndex": 5 }
  ],
  "preplacedInterventions": [],
  "lockedSlots": [0, 1, 5, 8, 10, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [
      { "from": 0, "to": 23, "rate": 2 },
      { "from": 24, "to": 47, "rate": 1 }
    ]
  }
}
```

**Design notes:**
- 2 big pre-placed foods: burger@0 (14→11 with met) and muffin@5 (18→14 with met)
- 2 walks for each peak. Free slots: 2, 3, 4, 6, 7, 9
- WP: walks(2+2) + chickpeas(3) + banana(1) = 8/10 ✓
- Metformin ON reduces both peaks, walks burn the tops

#### 5.2.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "Two big pre-placed foods today! You'll need everything: Metformin AND exercise." | neutral | `graph` (spotlight) | — | tap |
| 2 | dialogue | "Toggle Metformin ON first — it reduces both peaks by 20%." | neutral | `medication:metformin` (pulse) | tap-pulse | toggle metformin |
| 3 | dialogue | "Now place a 🚶 Walk near each peak. Walk@2 covers the burger tail. Walk@6 covers the muffin tail." | neutral | `slot:2` + `slot:6` (pulse) | — | place walks |
| 4 | dialogue | "Fill in your food and submit!" | neutral | — | — | place foods, submit |
| 5 | — | *(Reveal animation)* | — | — | — | auto |
| 6 | success | "The combo is powerful! Metformin lowered the peaks, then the walks burned the remaining high cubes. Level 5 complete!" | celebrating | `result-panel` | — | tap |

#### 5.2.3. Balance Notes

- Burger (met): 270 × 0.8 = 216 → 11 cubes. Walk burns 3/col near peak. Remaining orange ~4 cubes.
- Muffin (met): 350 × 0.8 = 280 → 14 cubes. Walk burns 3/col. Remaining orange ~7, red ~2.
- Combined penalty: **8-15 → 3★ or high 2★** ✓

---

---

## 6. Level 6 — "Threshold Drain" (2 Days)

### 6.0. Level Overview

| | |
|---|---|
| **Theme** | SGLT2 Inhibitor (threshold drain) and stress slots |
| **New Mechanics** | SGLT2 (drain above 200 mg/dL), stress slots (insulin −2) |
| **Days** | 2 |
| **Difficulty** | Medium-Hard |

---

### 6.1. Day 1 — "SGLT2 Inhibitor"

**Concept:** SGLT2 drains up to 3 cubes per column, but only above 200 mg/dL (row 7).
**New Mechanics:** SGLT2 medication, threshold drain, purple dashed line at 200.
**Target Rating:** ⭐⭐⭐ (penalty ~5-10)

#### 6.1.1. Level Config

```json
{
  "day": 1,
  "kcalBudget": 1400,
  "wpBudget": 8,
  "availableFoods": [
    { "id": "banana", "count": 1 },
    { "id": "cookie", "count": 1 }
  ],
  "availableInterventions": [
    { "id": "lightwalk", "count": 1 }
  ],
  "availableMedications": ["sglt2"],
  "preplacedFoods": [
    { "shipId": "pizza", "slotIndex": 3 }
  ],
  "preplacedInterventions": [],
  "lockedSlots": [0, 1, 3, 5, 6, 8, 9, 10, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [
      { "from": 0, "to": 31, "rate": 2 },
      { "from": 32, "to": 47, "rate": 1 }
    ]
  }
}
```

**Design notes:**
- Pizza at slot 3 (11 AM): 12 cubes → 240 mg/dL, deep orange zone
- SGLT2: drains 3 cubes per column above row 7 (200 mg/dL)
- At peak (12 cubes): SGLT2 removes min(3, 12-7) = 3 cubes → effective 9 cubes
- Free slots: 2, 4, 7

#### 6.1.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "New medication: 🧪 SGLT2 Inhibitor! It works differently from Metformin." | neutral | `medication:sglt2` (spotlight) | bounce | tap |
| 2 | dialogue | "SGLT2 drains up to 3 cubes per column — but ONLY above 200 mg/dL. See the purple dashed line on the graph? That's the threshold." | neutral | `graph` (glow) | — | tap |
| 3 | dialogue | "It won't lower glucose below 200 mg/dL. Think of it as shaving the top of tall peaks." | thinking | `graph-orange-zone` (glow) | — | tap |
| 4 | dialogue | "Toggle 🧪 SGLT2 ON and watch the pizza peak change!" | neutral | `medication:sglt2` (pulse) | tap-pulse | toggle sglt2 |
| 5 | success | "The peak dropped! SGLT2 removed cubes above 200 mg/dL. The purple drained cubes show what was removed." | happy | `graph` (glow) | — | tap |
| 6 | dialogue | "Place your food and walk, then submit." | neutral | — | — | place all, submit |
| 7 | — | *(Reveal animation — Phase 4: SGLT2 purple drained cubes)* | — | — | — | auto |
| 8 | success | "SGLT2 is great for cutting tall peaks! It stacks with Metformin too — more on that later." | celebrating | `result-panel` | — | tap |

#### 6.1.3. Balance Notes

- Pizza@3 (12 cubes, rate 2): multiple cols in orange zone
- SGLT2 drains 3 cubes above row 7: effectively caps at row 7+excess where excess = height-7-3 = height-10
- At peak (12): effective = 12-3 = 9, orange = 9-7 = 2 (vs 5 without SGLT2)
- Walk covers a few more columns
- Estimated: **5-10 penalty → 3★** ✓

---

### 6.2. Day 2 — "Stress + Medications"

**Concept:** Stress slots reduce insulin by 2. Must compensate with medications and exercise.
**New Mechanics:** Stress slots (😰 insulin −2), red-tinted columns on graph.
**Target Rating:** ⭐⭐ (penalty ~20-35)

#### 6.2.1. Level Config

```json
{
  "day": 2,
  "kcalBudget": 1400,
  "wpBudget": 10,
  "availableFoods": [
    { "id": "chickpeas", "count": 1 },
    { "id": "banana", "count": 1 }
  ],
  "availableInterventions": [
    { "id": "lightwalk", "count": 1 }
  ],
  "availableMedications": ["metformin", "sglt2"],
  "preplacedFoods": [
    { "shipId": "oatmeal", "slotIndex": 2 }
  ],
  "preplacedInterventions": [],
  "lockedSlots": [0, 1, 2, 5, 8, 10, 11],
  "stressSlots": [6, 7],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [
      { "from": 0, "to": 23, "rate": 3 },
      { "from": 24, "to": 47, "rate": 2 }
    ]
  }
}
```

**Design notes:**
- Stress at slots 6-7 (2:00-4:00 PM): insulin rate drops from 2 to 0 in cols 24-31!
- Oatmeal@2 (10 cubes, rate 3): morning, manageable
- If player places food at slot 6 or 7: stress = 0 insulin → glucose lingers indefinitely
- Both meds available: Metformin (−20% glucose) + SGLT2 (drain above 200)
- Free slots: 3, 4, 6, 7, 9

#### 6.2.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "See the red-tinted columns on the graph? Those are stress slots!" | neutral | `slot:6` + `slot:7` (spotlight) | — | tap |
| 2 | warning | "😰 Stress reduces insulin by 2 in those time slots. If the base rate was 2, it drops to 0 — no insulin at all!" | concerned | `insulin-bars` (glow) | — | tap |
| 3 | dialogue | "Food placed in stress slots will peak much higher and decay much slower. Avoid putting big food there!" | thinking | `slot:6` (pulse, red) | — | tap |
| 4 | dialogue | "You have Metformin AND SGLT2 today. Toggle both ON to reduce glucose across the board." | neutral | `med-toggles` (spotlight) | — | toggle both meds |
| 5 | hint | "💡 Place food in the morning where insulin is strong. Use the walk to cover the oatmeal peak." | thinking | — | — | tap |
| 6 | dialogue | "Plan carefully and submit!" | neutral | — | — | place all, submit |
| 7 | — | *(Reveal animation)* | — | — | — | auto |
| 8 | success | "Stress slots are tricky! When insulin is weakened, medications become even more important." | celebrating | `result-panel` | — | tap |

#### 6.2.3. Balance Notes

- Oatmeal@2 (met): 190 × 0.8 = 152 → 8 cubes, rate 3 → fast decay. Low penalty.
- If food in stress slots (rate 0): glucose never decays → all cubes become permanent penalties
- SGLT2 helps: drains 3 cubes above 200 regardless of insulin
- Estimated: **15-25 penalty → 2★** ✓ (intentionally harder with stress)

---

---

## 7. Level 7 — "GLP-1" (2 Days)

### 7.0. Level Overview

| | |
|---|---|
| **Theme** | GLP-1 Agonist — the complex medication with 4 simultaneous effects |
| **New Mechanics** | GLP-1 (duration ×1.5, glucose ×0.90, kcal ×0.85, WP +4), all 3 meds together |
| **Days** | 2 |
| **Difficulty** | Hard |

---

### 7.1. Day 1 — "Four Effects of GLP-1"

**Concept:** GLP-1 has 4 effects — the tutorial reveals each one step-by-step.
**New Mechanics:** GLP-1 Agonist, multi-effect medication.
**Target Rating:** ⭐⭐–⭐⭐⭐ (penalty ~5-15)

#### 7.1.1. Level Config

```json
{
  "day": 1,
  "kcalBudget": 1200,
  "wpBudget": 6,
  "availableFoods": [
    { "id": "oatmeal", "count": 1 },
    { "id": "banana", "count": 1 }
  ],
  "availableInterventions": [
    { "id": "lightwalk", "count": 1 }
  ],
  "availableMedications": ["glp1"],
  "preplacedFoods": [
    { "shipId": "burger", "slotIndex": 0 }
  ],
  "preplacedInterventions": [],
  "lockedSlots": [0, 1, 4, 5, 8, 9, 10, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [
      { "from": 0, "to": 23, "rate": 2 },
      { "from": 24, "to": 47, "rate": 1 }
    ]
  }
}
```

**Design notes:**
- Burger@0 (14 cubes, 10 cols). WP base = 6.
- With GLP-1: burger glucose 270×0.9=243→12 cubes, duration 150×1.5=225m→15 cols
  - Wider curve, lower peak. WP becomes 6+4=10. kcalBudget: 1200×0.85=1020
- Without GLP-1: burger = 14 cubes, WP = 6 only
- Free slots: 2, 3, 6, 7

#### 7.1.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "Welcome to GLP-1 — the most complex medication! 💉 It has FOUR effects at once." | neutral | `medication:glp1` (spotlight) | bounce | tap |
| 2 | dialogue | "Toggle it ON, and I'll explain each effect." | neutral | `medication:glp1` (pulse) | tap-pulse | toggle glp1 ON |
| 3 | dialogue | "Effect 1: Duration ×1.5 — food takes 50% longer to absorb. The curve gets WIDER and LOWER." | neutral | `graph` (glow) | — | tap |
| 4 | dialogue | "Effect 2: Glucose ×0.90 — 10% less glucose overall. Smaller peaks!" | neutral | `graph` (glow) | — | tap |
| 5 | dialogue | "Effect 3: Check the WP counter — you got +4 ☀️ WP bonus! More willpower to work with." | neutral | `wp-counter` (glow-border) | — | tap |
| 6 | warning | "Effect 4: Calorie budget reduced by 15%! Check the kcal bar — the target is smaller now. You need to eat LESS." | concerned | `kcal-bar` (glow) | — | tap |
| 7 | dialogue | "GLP-1 is a trade-off: better glucose control, but tighter calorie limits. Plan accordingly!" | thinking | — | — | tap |
| 8 | dialogue | "Place your food and walk, then submit." | neutral | — | — | place all, submit |
| 9 | — | *(Reveal animation — Phase 4: GLP-1 prevented cubes in violet)* | — | — | — | auto |
| 10 | success | "See the violet cubes? Those are cubes GLP-1 prevented by slowing absorption. Powerful!" | celebrating | `result-panel` | — | tap |

#### 7.1.3. Balance Notes

**With GLP-1:**
- Burger: 243 glucose → 12 cubes, 15 cols (wider, lower). Orange: 5 cubes at peak.
- WP = 10: can use walk(2) + oatmeal(4) + banana(1) = 7. Plenty.
- kcalBudget: 1020. Burger(620) + oatmeal(230) + banana(160) = 1010 ≈ 99% → Optimal!
- Estimated penalty: **8-15 → 3★ or 2★** ✓

**Without GLP-1:**
- Burger: 14 cubes, 10 cols. Higher peak. WP = 6 only. Can barely place walk + 1 food.
- Estimated penalty: **25-40 → 2★**

---

### 7.2. Day 2 — "All Three Medications"

**Concept:** All 3 medications stacking together for maximum effect.
**New Mechanics:** Triple medication stacking (Metformin×GLP-1 glucose, SGLT2 drain).
**Target Rating:** ⭐⭐–⭐⭐⭐ (penalty ~10-20)

#### 7.2.1. Level Config

```json
{
  "day": 2,
  "kcalBudget": 1600,
  "wpBudget": 8,
  "availableFoods": [
    { "id": "banana", "count": 1 },
    { "id": "cookie", "count": 1 },
    { "id": "chicken", "count": 1 }
  ],
  "availableInterventions": [
    { "id": "lightwalk", "count": 1 },
    { "id": "takeabreak", "count": 1 }
  ],
  "availableMedications": ["metformin", "sglt2", "glp1"],
  "preplacedFoods": [
    { "shipId": "chocolatemuffin", "slotIndex": 1 },
    { "shipId": "rice", "slotIndex": 6 }
  ],
  "preplacedInterventions": [],
  "lockedSlots": [0, 1, 4, 6, 8, 10, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [
      { "from": 0, "to": 15, "rate": 3 },
      { "from": 16, "to": 31, "rate": 2 },
      { "from": 32, "to": 47, "rate": 1 }
    ]
  }
}
```

**Design notes:**
- Muffin (350 glucose) + Rice (300 glucose) = massive pre-placed peaks
- All 3 meds: glucose multiplier = 0.80 × 0.90 = 0.72
  - Muffin: 350 × 0.72 = 252 → 13 cubes (vs 18 raw). Duration: 60 × 1.5 = 90m → 6 cols
  - Rice: 300 × 0.72 = 216 → 11 cubes (vs 15 raw). Duration: 150 × 1.5 = 225m → 15 cols
- SGLT2 drains 3 cubes above 200 from both
- GLP-1: +4 WP (8→12), kcal × 0.85 (1600→1360)
- Free slots: 2, 3, 5, 7, 9

#### 7.2.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "The ultimate medication test! 🧁 Muffin and 🍚 Rice — two massive pre-placed foods. You have all 3 medications." | neutral | `graph` (spotlight) | — | tap |
| 2 | dialogue | "Toggle all three medications ON. Watch how they stack!" | neutral | `med-toggles` (spotlight) | — | toggle all 3 |
| 3 | dialogue | "Metformin × GLP-1: glucose is now 72% of original (−28%!). SGLT2 drains the remaining peaks above 200." | neutral | `graph` (glow) | — | tap |
| 4 | dialogue | "With GLP-1, you get +4 WP (total 12!) but kcal budget drops to 1360. Plan wisely." | thinking | `wp-counter` + `kcal-bar` (glow) | — | tap |
| 5 | dialogue | "Place your food, walk, and break. Submit when ready!" | neutral | — | — | place all, submit |
| 6 | — | *(Reveal animation)* | — | — | — | auto |
| 7 | success | "Level 7 complete! You've mastered all three medications. When stacked together, they transform impossible peaks into manageable curves." | celebrating | `result-panel` | — | tap |

#### 7.2.3. Balance Notes

**All 3 meds ON:**
- Muffin: 252 glucose → 13 cubes, 6 cols. SGLT2 drains 3 above 200. Effective peak ~10.
- Rice: 216 glucose → 11 cubes, 15 cols. SGLT2 drains 3 above 200. Effective peak ~8.
- Walk covers one peak.
- Estimated penalty: **10-20 → 2★ or 3★** ✓

---

---

## 8. Level 8 — "Final Exam" (3 Days)

### 8.0. Level Overview

| | |
|---|---|
| **Theme** | Everything combined — the final test + BOOST |
| **New Mechanics** | BOOST (adaptive insulin above 200 mg/dL) |
| **Days** | 3 |
| **Difficulty** | Hard → Very Hard |

---

### 8.1. Day 1 — "Full Arsenal"

**Concept:** All tools available, moderate difficulty. Test accumulated knowledge.
**New Mechanics:** None (all previously learned mechanics combined).
**Target Rating:** ⭐⭐–⭐⭐⭐ (penalty ~10-20)

#### 8.1.1. Level Config

```json
{
  "day": 1,
  "kcalBudget": 1800,
  "wpBudget": 10,
  "availableFoods": [
    { "id": "sandwich", "count": 1 },
    { "id": "banana", "count": 1 },
    { "id": "cookie", "count": 1 },
    { "id": "milk", "count": 1 }
  ],
  "availableInterventions": [
    { "id": "lightwalk", "count": 2 },
    { "id": "takeabreak", "count": 1 }
  ],
  "availableMedications": ["metformin"],
  "preplacedFoods": [
    { "shipId": "burger", "slotIndex": 0 },
    { "shipId": "oatmeal", "slotIndex": 5 }
  ],
  "preplacedInterventions": [],
  "lockedSlots": [0, 1, 4, 5, 8, 9, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [
      { "from": 0, "to": 15, "rate": 3 },
      { "from": 16, "to": 31, "rate": 2 },
      { "from": 32, "to": 47, "rate": 1 }
    ]
  }
}
```

**Design notes:**
- Burger@0 + Oatmeal@5 pre-placed. Metformin only.
- Free slots: 2, 3, 6, 7, 10
- WP: 2×walk(4) + break(-1) + sandwich(3) + banana(1) + cookie(2) + milk(3) = 12. Budget = 10.
- Must choose carefully what to place. Break helps recover WP.
- No tutorial bubbles except brief encouragement.

#### 8.1.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "The Final Exam! Level 8 — everything you've learned comes together." | neutral | — | — | tap |
| 2 | dialogue | "Day 1: You have Metformin, 2 walks, a break, and 4 foods. Two meals are pre-placed. Plan your best day!" | neutral | — | — | tap |
| 3 | hint | "💡 Remember: big food in the morning (high insulin), walks near peaks, keep kcal in the green zone!" | thinking | — | — | tap |
| 4 | dialogue | "Good luck! No more hand-holding — show me what you've learned!" | happy | — | — | free play, submit |
| 5 | — | *(Reveal animation)* | — | — | — | auto |
| 6 | dialogue | "Well done! How did you do? Day 2 will be harder..." | neutral | `result-panel` | — | tap |

#### 8.1.3. Balance Notes

- Burger (met): 270×0.8=216 → 11 cubes. Walk@2 covers tail.
- Oatmeal (met): 190×0.8=152 → 8 cubes. Walk@6 covers.
- Player foods fill kcal and WP budget.
- Estimated penalty: **10-20 → 2★–3★** ✓

---

### 8.2. Day 2 — "Under Pressure"

**Concept:** Stress slots + carry-over penalties + more restrictions. Tests resilience.
**New Mechanics:** None new, but combining stress + carry-over + meds.
**Target Rating:** ⭐–⭐⭐ (penalty ~30-60)

#### 8.2.1. Level Config

```json
{
  "day": 2,
  "kcalBudget": 1600,
  "wpBudget": 10,
  "availableFoods": [
    { "id": "chickpeas", "count": 1 },
    { "id": "banana", "count": 1 },
    { "id": "apple", "count": 1 }
  ],
  "availableInterventions": [
    { "id": "lightwalk", "count": 1 },
    { "id": "heavyrun", "count": 1 }
  ],
  "availableMedications": ["metformin", "sglt2"],
  "preplacedFoods": [
    { "shipId": "chocolatemuffin", "slotIndex": 2 },
    { "shipId": "pizza", "slotIndex": 7 }
  ],
  "preplacedInterventions": [],
  "lockedSlots": [0, 2, 4, 7, 8, 10, 11],
  "stressSlots": [5, 6],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [
      { "from": 0, "to": 15, "rate": 3 },
      { "from": 16, "to": 31, "rate": 2 },
      { "from": 32, "to": 47, "rate": 1 }
    ]
  }
}
```

**Design notes:**
- Muffin@2 (18→14 with met) + Pizza@7 (12→10 with met)
- Stress at slots 5-6: insulin drops from 2 to 0 (cols 20-27)
- Free slots: 1, 3, 5, 6, 9
- Run (2 slots) at 3-4 covers muffin tail. Walk@9 for pizza.
- Both meds on: SGLT2 drains peaks above 200.
- Carry-over from Day 1 may affect WP.

#### 8.2.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | warning | "Day 2 — under pressure! Stress slots are active, and two massive foods are pre-placed." | concerned | — | — | tap |
| 2 | dialogue | "Use both Metformin and SGLT2. The Heavy Run covers the muffin. Place food away from stress zones!" | thinking | — | — | tap |
| 3 | dialogue | "Go!" | neutral | — | — | free play, submit |
| 4 | — | *(Reveal animation)* | — | — | — | auto |
| 5 | dialogue | "Tough day! Tomorrow is the ultimate challenge — but you'll have a secret weapon..." | thinking | `result-panel` | — | tap |

#### 8.2.3. Balance Notes

- Muffin (met+SGLT2): 14 cubes − 3 drain = effective ~11. Run covers 5/col for 12 cols → massive reduction.
- Pizza (met+SGLT2): 10 cubes − 3 drain = effective ~7. Walk@9 covers tail.
- Stress prevents insulin in afternoon — avoid food there.
- Estimated penalty: **20-40 → 2★** (hard but not impossible)

---

### 8.3. Day 3 — "BOOST — The Key to Victory"

**Concept:** BOOST is the final mechanic — adaptive insulin above 200 mg/dL. Without BOOST, 3★ is impossible.
**New Mechanics:** BOOST (🧑‍⚕️ toggle, 1 use per level, extraRate above threshold).
**Target Rating:** ⭐⭐⭐ ONLY with BOOST (0% without)

#### 8.3.1. Level Config

```json
{
  "day": 3,
  "kcalBudget": 2000,
  "wpBudget": 10,
  "availableFoods": [
    { "id": "sandwich", "count": 1 },
    { "id": "cookie", "count": 1 },
    { "id": "banana", "count": 1 },
    { "id": "milk", "count": 1 }
  ],
  "availableInterventions": [
    { "id": "lightwalk", "count": 1 },
    { "id": "takeabreak", "count": 2 }
  ],
  "availableMedications": ["metformin", "sglt2", "glp1"],
  "preplacedFoods": [
    { "shipId": "burger", "slotIndex": 0 },
    { "shipId": "chocolatemuffin", "slotIndex": 2 },
    { "shipId": "rice", "slotIndex": 5 }
  ],
  "preplacedInterventions": [],
  "lockedSlots": [0, 2, 3, 5, 6, 8, 9, 11],
  "stressSlots": [],
  "insulinProfile": {
    "mode": "cumulative",
    "segments": [
      { "from": 0, "to": 15, "rate": 4 },
      { "from": 16, "to": 31, "rate": 3 },
      { "from": 32, "to": 47, "rate": 2 }
    ]
  }
}
```

**Design notes:**
- 3 massive pre-placed foods: Burger@0, Muffin@2, Rice@5
- All 3 meds: glucose ×0.72 (met×glp1). GLP-1 gives +4 WP (→14), kcal×0.85 (→1700)
- Even with all meds, peaks exceed 200 mg/dL → BOOST needed
- BOOST: extraRate=4 above row 7 (200 mg/dL), 1 use per level
- Free slots: 1, 4, 7, 10
- Walk@1 covers burger tail. Breaks for WP management.
- Last day of level: unspent WP penalty (×5 points each)

#### 8.3.2. Tutorial Scenario

| # | Type | Text | Expr. | Highlight | CTA | Expected Action |
|---|------|------|-------|-----------|-----|-----------------|
| 1 | dialogue | "The final day! Three massive pre-placed foods. Even with all medications, the peaks are brutal." | concerned | `graph` (spotlight) | — | tap |
| 2 | dialogue | "See the 🧑‍⚕️ button in the top-left of the graph? That's BOOST — your secret weapon!" | neutral | `boost-btn` (spotlight) | bounce | tap |
| 3 | dialogue | "BOOST supercharges your insulin, but ONLY above 200 mg/dL. It adds 4 extra cubes of absorption per column in the danger zone." | neutral | `boost-btn` (glow) | — | tap |
| 4 | warning | "You only get ONE BOOST use per level. This is Day 3 — now is the time to use it!" | concerned | `boost-btn` (pulse) | — | tap |
| 5 | dialogue | "Toggle BOOST ON!" | neutral | `boost-btn` (pulse) | tap-pulse on `boost-btn` | toggle BOOST ON |
| 6 | success | "Look at the graph — BOOST is absorbing the dangerous peaks above 200 mg/dL! Combined with medications, the curves are much more manageable." | happy | `graph` (glow) | — | tap |
| 7 | dialogue | "Toggle all three medications ON. Place your walk and food. Remember: this is the LAST day — spend ALL your WP!" | neutral | `med-toggles` (pulse) | — | toggle all meds, place items |
| 8 | warning | "Last day penalty: every unspent ☀️ WP adds 5 penalty points. Use everything!" | concerned | `wp-counter` (glow) | — | tap |
| 9 | dialogue | "Submit your masterpiece!" | happy | `submit-btn` (pulse) | tap-pulse | click submit |
| 10 | — | *(Reveal animation — all 4 phases)* | — | — | — | auto |
| 11 | success | "🎉 CONGRATULATIONS! You've completed the BG Planner Tutorial! You now know every tool for managing blood glucose. Use your knowledge wisely!" | celebrating | `result-panel` | — | tap |
| 12 | dialogue | "Doctor Alice signing off. Remember: plan your meals, stay active, and keep that glucose in the green zone! 💚" | happy | — | — | tap |

#### 8.3.3. Balance Notes

**All meds + BOOST:**
- Burger: 270 × 0.72 = 194 → 10 cubes. Duration: 150×1.5=225m→15 cols. With rate 4 morning + BOOST: fast decay.
- Muffin: 350 × 0.72 = 252 → 13 cubes. Duration: 60×1.5=90m→6 cols. Peak in high insulin zone + BOOST.
- Rice: 300 × 0.72 = 216 → 11 cubes. Duration: 150×1.5=225m→15 cols. Afternoon with rate 3 + BOOST.
- SGLT2 drains additional 3 cubes above 200 from all.
- Walk@1 covers burger tail.
- BOOST extraRate=4: on any column where height > 7, extra 4 cubes absorbed per column.
- With all tools: estimated **5-12 penalty → 3★** ✓

**Without BOOST:**
- Peak cubes remain in orange/red zone much longer
- Estimated penalty: **40-80 → 1★–2★** (3★ impossible)

---

---

## Appendix A. Tutorial Progression Summary

| Level | Name | Days | Cumulative | New Mechanics | Key Foods |
|-------|------|------|-----------|---------------|-----------|
| 1 | First Steps | 3 | 3 | Graph, zones, food, WP, kcal, stacking | banana, apple, cookie, popcorn, milk |
| 2 | Keep Moving | 3 | 6 | Light Walk, locked slots, Heavy Run | burger, muffin, berries |
| 3 | Willpower Management | 3 | 9 | Take a Break, overeating, carry-over, Take a Rest | pizza, oatmeal, ice cream |
| 4 | Insulin Rhythm | 2 | 11 | Insulin profiles, rate segments | chickpeas |
| 5 | First Medication | 2 | 13 | Metformin | — (reuses existing) |
| 6 | Threshold Drain | 2 | 15 | SGLT2, stress slots | — |
| 7 | GLP-1 | 2 | 17 | GLP-1 (4 effects), all meds stacking | chicken, rice |
| 8 | Final Exam | 3 | 20 | BOOST, final challenge | sandwich |

**Total: 8 levels, 20 days, ~200 tutorial steps**

### Mechanic Introduction Order

| Day | Mechanic |
|-----|----------|
| L1D1 | BG graph, zones, food→cubes, drag & drop, Submit, stars |
| L1D2 | WP budget, kcal assessment, food selection |
| L1D3 | Pre-placed food, stacking risk, insulin variation |
| L2D1 | Light Walk (exercise burns cubes from top) |
| L2D2 | Locked slots (🔒 placement constraints) |
| L2D3 | Heavy Run (2-slot, deeper burn, more WP) |
| L3D1 | Take a Break (☕ WP refund) |
| L3D2 | Overeating penalty (kcal zones, forecast badge) |
| L3D3 | Carry-over penalties, Take a Rest (😴 2-slot WP refund) |
| L4D1 | Insulin profiles (morning vs evening rates) |
| L4D2 | Strategic food-to-insulin matching |
| L5D1 | Metformin (💊 −20% glucose, free toggle) |
| L5D2 | Metformin + exercise combo |
| L6D1 | SGLT2 (🧪 drain above 200 mg/dL) |
| L6D2 | Stress slots (😰 insulin −2), Met + SGLT2 |
| L7D1 | GLP-1 (💉 4 effects: duration, glucose, kcal, WP) |
| L7D2 | All 3 medications stacking |
| L8D1 | Full arsenal exam (no new mechanics) |
| L8D2 | Stress + carry-over + restrictions |
| L8D3 | BOOST (🧑‍⚕️ adaptive insulin, 1 use/level) |

---

## Appendix B. Food Quick Reference

Sorted by peak cubes (descending). `cubes = round(glucose / 20)`, `cols = round(duration / 15)`.

| Food | ID | Emoji | Glucose | Cubes | Duration | Cols | Kcal | WP |
|------|----|-------|--------:|------:|---------:|-----:|-----:|---:|
| Chocolate Muffin | chocolatemuffin | 🧁 | 350 | 18 | 60m | 4 | 550 | 0 |
| Bowl of Rice | rice | 🍚 | 300 | 15 | 150m | 10 | 360 | 4 |
| Hamburger | burger | 🍔 | 270 | 14 | 150m | 10 | 620 | 2 |
| Pizza | pizza | 🍕 | 230 | 12 | 90m | 6 | 460 | 3 |
| Oatmeal | oatmeal | 🥣 | 190 | 10 | 120m | 8 | 230 | 4 |
| Banana | banana | 🍌 | 180 | 9 | 45m | 3 | 160 | 1 |
| Chickpeas | chickpeas | 🫘 | 180 | 9 | 90m | 6 | 410 | 3 |
| Apple | apple | 🍎 | 170 | 9 | 45m | 3 | 140 | 1 |
| Ice Cream | icecream | 🍦 | 160 | 8 | 60m | 4 | 200 | 0 |
| Sandwich | sandwich | 🥪 | 160 | 8 | 180m | 12 | 470 | 3 |
| Popcorn | popcorn | 🍿 | 150 | 8 | 45m | 3 | 140 | 1 |
| Mixed Berries | berriesmixed | 🫐 | 140 | 7 | 45m | 3 | 110 | 2 |
| Vegetable Stew | vegetablestew | 🥘 | 140 | 7 | 150m | 10 | 230 | 4 |
| Cookie | cookie | 🍪 | 110 | 6 | 60m | 4 | 230 | 2 |
| Milk 2% | milk | 🥛 | 100 | 5 | 45m | 3 | 180 | 3 |
| Caesar Salad | caesarsalad | 🥗 | 80 | 4 | 120m | 8 | 460 | 3 |
| Avocado | avocado | 🥑 | 70 | 4 | 150m | 10 | 240 | 3 |
| Greek Yogurt | greekyogurt | 🥛 | 60 | 3 | 90m | 6 | 230 | 3 |
| Boiled Carrots | boiledcarrots | 🥕 | 60 | 3 | 45m | 3 | 80 | 4 |
| Cottage Cheese | cottagecheese | 🧀 | 30 | 2 | 120m | 8 | 320 | 4 |
| Chicken Meal | chicken | 🍗 | 30 | 2 | 120m | 8 | 370 | 3 |
| Mixed Nuts | nutsmixed | 🥜 | 20 | 1 | 150m | 10 | 310 | 2 |
| Boiled Eggs | eggsboiled | 🥚 | 0 | 0 | 150m | 10 | 230 | 4 |
| Hard Cheese | cheesewedge | 🧀 | 0 | 0 | 150m | 10 | 170 | 3 |

---

## Appendix C. Balance Solver Commands

To verify each level config, use the balance solver:

```bash
# Single placement check
npx ts-node scripts/balance-calc.ts calc --level level-tutorial-01 --day 1 --foods "banana@2" --boost false

# Enumerate all solutions
npx ts-node scripts/balance-calc.ts solve --level level-tutorial-01 --day 1 --boost false

# With BOOST
npx ts-node scripts/balance-calc.ts solve --level level-tutorial-08 --day 3 --boost true --boost-rate 4

# Last day WP penalty
npx ts-node scripts/balance-calc.ts solve --level level-tutorial-03 --day 3 --last-day
```

> **Note:** Level config files (`level-tutorial-01.json` through `level-tutorial-08.json`) must be created in `public/data/levels/` before running these commands.
