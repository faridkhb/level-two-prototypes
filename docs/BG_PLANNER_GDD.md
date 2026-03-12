# BG Planner — Game Design Document

**Version:** v0.43.25 (alpha-5-stable)
**Branch:** `main` / `mobile-layout`
**Deploy:** https://level-two-eight.vercel.app/

---

## 1. Concept

**BG Planner** — обучающая игра по управлению уровнем глюкозы в крови. Игрок размещает карточки еды и упражнений на временной шкале графика BG (Blood Glucose). Еда создаёт цветные "кубики" (блоки по 20 mg/dL) с кривыми нарастания и спада. Упражнения удаляют кубики сверху. Медикаменты модифицируют параметры глобально. Цель — спланировать питание в рамках бюджетов WP и kcal, удерживая уровень глюкозы в зелёной зоне.

**Жанр:** Стратегия планирования / Обучающая
**Платформа:** Web (десктоп, мобильная адаптация в планах)
**Стек:** React 19, TypeScript, Vite, Zustand, @dnd-kit

---

## 2. Экран игры

Один экран без переходов между фазами:

```
┌─────────────────────────────────────┐
│  Day X                              │
│  ☀️ WP: X/Y │ kcal bar │ [Submit]  │
├─────────────────────────────────────┤
│  [BOOST]                            │
│          BG Graph (SVG)             │
│    8 AM ──────────────── 8 PM       │
│    Insulin bars (amber)             │
│    Кубики еды + маркеры + скайлайны │
│                                     │
├─────────────────────────────────────┤
│  Slots: [B1][B2][B3][B4] Breakfast  │
│         [L1][L2][L3][L4] Lunch      │
│         [D1][D2][D3][D4] Dinner     │
├─────────────────────────────────────┤
│  Medications: ON/OFF toggles        │
├─────────────────────────────────────┤
│  Food Cards  │  Intervention Cards  │
├─────────────────────────────────────┤
│  Day 1│2│3                          │
└─────────────────────────────────────┘
```

---

## 3. BG Graph

### 3.1. Оси

| Параметр | Значение |
|----------|----------|
| Ось X | 8:00 — 20:00 (12 часов) |
| Колонки | 48 (по 15 минут) |
| Ось Y | 60 — 400 mg/dL |
| Ряды | 17 (по 20 mg/dL) |
| Размер ячейки SVG | 18×18 px |

### 3.2. Зоны BG

| Зона | Диапазон | Цвет фона | Штраф |
|------|----------|-----------|-------|
| Normal | 60–140 mg/dL | Зелёный | — |
| Elevated | 140–200 mg/dL | Жёлтый | — |
| High | 200–300 mg/dL | Оранжевый | 0.5 за куб |
| Danger | 300–400 mg/dL | Красный | 1.5 за куб |

### 3.3. Визуальные слои (снизу вверх)

1. **Фон** — цветные зоны + сетка
2. **Alive кубики** — цветные (синий по прогрессивной палитре)
3. **Burned кубики** — от упражнений/SGLT2 (зелёные/фиолетовые, opacity 0.55)
4. **Pancreas кубики** — съеденные поджелудочной (оранжевые, тонкий слой)
5. **Medication кубики** — предотвращённые медикаментами (розовые/фиолетовые, opacity 0.45)
6. **Индивидуальные скайлайны** — белые контурные линии между продуктами
7. **Главный скайлайн** — толстая белая линия по верху alive-зоны
8. **Маркеры** — emoji-пузырьки над пиками продуктов и упражнений

---

## 4. Система еды

### 4.1. Конвертация в кубики

```
peakCubes = round(glucose / 20)
riseCols  = round(duration / 15)
```

- **Фаза нарастания:** линейный рост от 1 до peakCubes за riseCols колонок (NO insulin drain)
- **После пика (insulin):** `height = round(peak − cumInsulin)` where cumInsulin accumulates insulin rate per column
- **Без инсулина:** плоская линия на peakCubes до правого края

### 4.2. Стекирование

Кубики разных продуктов стекируются вертикально. Каждый продукт получает прогрессивный оттенок синего:

| Порядок | Цвет | Hex |
|---------|------|-----|
| 1-й продукт | Sky 300 | `#7dd3fc` |
| 2-й | Sky 400 | `#38bdf8` |
| 3-й | Sky 500 | `#0ea5e9` |
| 4-й | Sky 600 | `#0284c7` |
| 5-й | Sky 700 | `#0369a1` |
| 6-й | Sky 800 | `#075985` |
| 7-й+ | Sky 900 | `#0c4a6e` |

### 4.3. Маркеры еды

- Белый пузырёк с emoji продукта над пиком его skylineRow
- **Drag** — перемещение продукта на другую колонку
- **Drag за пределы графика** — удаление продукта

### 4.4. Таблица продуктов

| # | Продукт | Emoji | Glucose | Carbs | Protein | Fat | Duration | Kcal | WP | Cubes | Cols |
|---|---------|-------|--------:|------:|--------:|----:|---------:|-----:|---:|------:|-----:|
| 1 | Banana | 🍌 | 230 | 23g | 1g | 0g | 45m | 395 | 1 | 12 | 3 |
| 2 | Apple | 🍎 | 210 | 21g | 1g | 0g | 45m | 355 | 1 | 11 | 3 |
| 3 | Ice Cream | 🍦 | 200 | 20g | 4g | 11g | 60m | 780 | 0 | 10 | 4 |
| 4 | Popcorn | 🍿 | 190 | 19g | 3g | 2g | 45m | 420 | 1 | 10 | 3 |
| 5 | Cookie | 🍪 | 140 | 14g | 2g | 7g | 60m | 545 | 2 | 7 | 4 |
| 6 | Caesar Salad | 🥗 | 80 | 8g | 9g | 12g | 120m | 715 | 3 | 4 | 8 |
| 7 | Choco Muffin | 🧁 | 440 | 44g | 6g | 18g | 60m | 1495 | 0 | 22 | 4 |
| 8 | Sandwich | 🥪 | 340 | 34g | 22g | 28g | 150m | 1885 | 2 | 17 | 10 |
| 9 | Chicken Meal | 🍗 | 30 | 3g | 35g | 12g | 120m | 1055 | 3 | 2 | 8 |
| 10 | Bowl of Rice | 🍚 | 380 | 38g | 4g | 0g | 150m | 775 | 4 | 19 | 10 |
| 11 | Hamburger | 🍔 | 200 | 20g | 17g | 14g | 180m | 1110 | 3 | 10 | 12 |
| 12 | Oatmeal | 🥣 | 240 | 24g | 6g | 4g | 120m | 620 | 4 | 12 | 8 |
| 13 | Pizza | 🍕 | 290 | 29g | 12g | 12g | 90m | 1130 | 3 | 15 | 6 |
| 14 | Boiled Eggs | 🥚 | 0 | 0g | 13g | 10g | 150m | 580 | 4 | 0 | 10 |
| 15 | Mixed Berries | 🫐 | 180 | 18g | 2g | 1g | 45m | 325 | 2 | 9 | 3 |
| 16 | Greek Yogurt | 🥛 | 60 | 6g | 11g | 11g | 90m | 730 | 3 | 3 | 6 |
| 17 | Milk 2% | 🥛 | 100 | 10g | 8g | 5g | 45m | 460 | 3 | 5 | 3 |
| 18 | Vegetable Stew | 🥘 | 170 | 17g | 5g | 5g | 150m | 635 | 4 | 9 | 10 |
| 19 | Boiled Carrots | 🥕 | 60 | 6g | 1g | 0g | 45m | 200 | 4 | 3 | 3 |
| 20 | Chickpeas | 🫘 | 230 | 23g | 9g | 3g | 90m | 620 | 3 | 12 | 6 |
| 21 | Cottage Cheese | 🧀 | 30 | 3g | 25g | 9g | 120m | 775 | 4 | 2 | 8 |
| 22 | Hard Cheese | 🧀 | 0 | 0g | 7g | 9g | 150m | 450 | 3 | 0 | 10 |
| 23 | Avocado | 🥑 | 70 | 7g | 2g | 15g | 150m | 600 | 3 | 4 | 10 |
| 24 | Mixed Nuts | 🥜 | 20 | 2g | 5g | 16g | 150m | 685 | 2 | 1 | 10 |

**Формула:** Cubes = round(glucose / 20), Cols = round(duration / 15)

---

## 5. Система упражнений (Interventions)

### 5.1. Параметры

| Упражнение | Emoji | Depth | Duration | WP | Tail | SlotSize | Эффект |
|-----------|-------|------:|---------:|---:|-----:|---------:|--------|
| Light Walk | 🚶 | 3 cubes | 60m (4 cols) | 2 | 1 cube | 1 | Main: 3 cubes for 4 cols, tail: 1 cube to end |
| Heavy Run | 🏃 | 5 cubes | 180m (12 cols) | 4 | 2 cubes | 2 | Main: 5 cubes for 12 cols, tail: 2 cubes to end |
| Take a Break | ☕ | 0 | 30m (2 cols) | −1 | 0 | 1 | Refunds 1 WP, no cube effect |
| Take a Rest | 😴 | 0 | 120m (8 cols) | −2 | 0 | 2 | Refunds 2 WP, no cube effect |

### 5.2. Two-Phase Curve (v0.40.0)

```
mainCols = round(duration / 15)
Main phase:  flat at depth for mainCols columns (no ramp, immediate full power)
Tail phase:  flat at boostExtra from mainCols to right edge of graph
```

Break interventions (☕/😴) have no cube effect — they only restore WP.

### 5.3. Механика

- Кубики удаляются **сверху** стека еды
- Несколько упражнений стекируются (reduction суммируется)
- Drag-превью: зелёные оверлеи на кубиках которые будут сожжены (пульсация)
- Multi-slot: Heavy Run и Take a Rest занимают 2 слота (`slotSize=2`)

### 5.4. Per-source burn coloring

Сожжённые кубики окрашиваются по источнику (снизу вверх в burned-зоне):

| Источник | Цвет | Hex | Opacity |
|----------|------|-----|---------|
| Ходьба 🚶 | Светло-зелёный | `#86efac` | 0.55 |
| Бег 🏃 | Насыщенный зелёный | `#22c55e` | 0.55 |
| SGLT2 🧪 | Фиолетовый | `#c084fc` | 0.55 |

### 5.5. Маркеры упражнений

- Белый пузырёк с зелёной границей (`#22c55e`) и emoji упражнения
- Позиция: над пиком reduction кривой на высоте columnCaps
- **Drag** — перемещение упражнения
- **Drag за пределы** — удаление

---

## 6. Система медикаментов

### 6.1. Три медикамента

| Медикамент | Emoji | Тип | Эффект | WP |
|-----------|-------|-----|--------|-----|
| Metformin | 💊 | peakReduction | Glucose ×0.80 (−20%) | 0 |
| SGLT2 Inhibitor | 🧪 | thresholdDrain | −3 cubes/col, floor 200 mg/dL | 0 |
| GLP-1 Agonist | 💉 | slowAbsorption | Duration ×1.5, glucose ×0.90, kcal ×0.70, WP +4 | 0 |

### 6.2. Подробное описание

**Metformin (💊 peakReduction)**
- Умножает glucose всех продуктов на 0.80
- Результат: пики ниже, кубов меньше
- Duration без изменений

**SGLT2 Inhibitor (🧪 thresholdDrain)**
- Удаляет до 3 кубов с каждой колонки
- Не опускает ниже 200 mg/dL (row 7)
- Формула: `reduction[col] = min(depth, max(0, height[col] − floorRow))`
- Визуально: фиолетовая пунктирная линия на 200 mg/dL

**GLP-1 Agonist (💉 slowAbsorption)**
- Duration ×1.5 — кривые шире (медленное всасывание)
- Glucose ×0.90 — пики на 10% ниже (отвязано от duration)
- Kcal budget ×0.70 — аппетит снижен (бюджет kcal −30%)
- WP +4 — дополнительная сила воли

### 6.3. Стекирование

- Glucose: мультипликативно (Metformin × GLP-1 = 0.80 × 0.90 = 0.72)
- Duration: только GLP-1 (×1.5)
- SGLT2 drain: аддитивно с interventions
- WP bonus: аддитивно (+4)

### 6.4. Medication-prevented cubes

Предотвращённые медикаментами кубы отображаются выше pancreas-зоны:

| Медикамент | Цвет | Hex | Opacity |
|-----------|------|-----|---------|
| Metformin | Розово-фиолетовый | `#f0abfc` | 0.45 |
| GLP-1 | Сине-фиолетовый | `#a78bfa` | 0.45 |

Атрибуция вычисляется через промежуточную кривую "только Metformin":
- `metforminReduction = originalHeight − afterMetforminHeight`
- `glp1Reduction = afterMetforminHeight − fullyMedicatedHeight`

### 6.5. Доступность по дням (Level-01)

| День | Медикаменты |
|------|------------|
| 1 | Нет |
| 2 | Metformin |
| 3 | Metformin + GLP-1 |

---

## 7. Insulin Profile System (v0.43.0)

Replaces old Pancreas Tier System (OFF/I/II/III).

### 7.1. Segment-Based Profiles

Each day defines insulin rate segments in level config:
```json
"insulinProfile": [
  { "from": 0, "to": 16, "rate": 2 },
  { "from": 16, "to": 25, "rate": 2 },
  { "from": 25, "to": 48, "rate": 1 }
]
```

- Integer rates 1-5 (insulin cells absorbed per column)
- Visible as amber background bars on graph
- Higher rates = faster glucose absorption after peak

### 7.2. Post-Peak Insulin

Food rises to **full peak** without any insulin drain during ramp-up.
Insulin absorbs cubes only **after** the food reaches its peak column.

**Cumulative mode (default):**
```
After peak: height = round(peakCubes − cumInsulin)
where cumInsulin += rate[col] each post-peak column
```

**Per-column mode (config option):**
```
After peak: height = round(peakCubes − rate[col])
```

### 7.3. BOOST — Adaptive Insulin

- ON/OFF toggle, **1 use per level**
- Only enhances columns above 200 mg/dL threshold
- Extra rate = 4 cubes per column above threshold (configurable)
- Button overlaid on graph top-left corner
- Config screen: BOOST threshold and extra rate editable

### 7.4. Visual Layer

- Insulin-eaten cubes rendered as orange (`#f59e0b`) with fall animation
- Darker stroke `#d97706`
- Stacked above alive food cubes

---

## 8. Бюджеты

### 8.1. Willpower Points (WP)

**Назначение:** Мета-ресурс, ограничивающий размещение еды + упражнений + tier выбор

- **Hard cap:** нельзя разместить карту если WP превышает бюджет
- Карты серые (disabled) при недостатке WP
- Источники расхода: еда (0–4 WP), упражнения (2–4 WP), Pancreas tier (0–2 WP)
- GLP-1 даёт +4 WP к бюджету

**Дисплей:** `☀️ WP: X/Y` — зелёный если ок, красный если перебор

### 8.2. Kilocalories (kcal)

**Назначение:** Информационный трекер (без жёсткого ограничения)

| % от бюджета | Оценка | Цвет |
|-------------|--------|------|
| 0% | Fasting | Серый |
| <25% | Starving | Красный |
| 25–50% | Hungry | Оранжевый |
| 50–75% | Light | Жёлтый |
| 75–100% | Well Fed | Зелёный |
| 100–120% | Full | Зелёный |
| 120–150% | Overeating | Оранжевый |
| >150% | Stuffed | Красный |

---

## 9. Штрафы и рейтинг

### 9.1. Подсчёт штрафов

```
penalty = Σ(orange_cubes × 0.5 + red_cubes × 1.5)
```

- **Orange zone** (200–300 mg/dL, rows 7–11): 0.5 баллов за куб
- **Red zone** (300+ mg/dL, rows 12+): 1.5 баллов за куб

### 9.2. Звёздный рейтинг

| Штраф | Звёзды | Уровень |
|-------|--------|---------|
| ≤ 12.5 | ⭐⭐⭐ | Perfect |
| ≤ 50 | ⭐⭐ | Good |
| ≤ 100 | ⭐ | Pass |
| > 100 | ☆ | Defeat |

---

## 10. Slot System (v0.42.0)

### 10.1. Слоты

12 слотов: 4 Breakfast (8-11 AM) + 4 Lunch (11 AM-2 PM) + 4 Dinner (5-8 PM).
Each slot maps to a graph column range.

- Drag food/intervention from inventory → drop into slot
- Drag between slots to swap/reorder
- Drag back to inventory to remove
- Multi-slot items (Heavy Run, Take a Rest) occupy 2 adjacent slots

### 10.2. Pre-placed Foods (v0.42.12)

Level config specifies foods already placed when day starts:
```json
"preplacedFoods": [{ "shipId": "burger", "slotIndex": 0 }]
```
- Player **cannot** remove pre-placed foods
- Displayed with grayscale + lock icon
- Creates mandatory stacking the player must manage

### 10.3. Locked Slots (v0.42.12)

Level config specifies slots where player cannot place anything:
```json
"lockedSlots": [0, 1, 3, 4, 6, 7, 9, 10]
```
- Dark gray background with lock visual
- Design rules: max 2 consecutive locked slots, no pre-placed foods in adjacent slots

---

## 11. Level-01: First Steps (v0.43.0)

### 11.1. Конфигурация дней

| День | WP | Kcal | Pre-placed | Insulin Profile | Locked | Free | Продукты | Упражнения | Медикаменты | 3★ % |
|------|---:|-----:|-----------|----------------|--------|------|---------|-----------|------------|-----:|
| 1 | 10 | 1800 | 🍔@0, 🍌@4 | 2,2,1 | [0,1,3,4,6,7,9,10] | [2,5,8,11] | 🍪🥛🫘 | 🚶×1,☕×1 | — | 14.8% |
| 2 | 10 | 2000 | 🍌@0, 🧁@5 | 2,2(→25),1 | [1,3,6,8,11] | [2,4,7,9,10] | 🫘🍪🥣 | 🚶×2,☕×1 | 💊 | 13.4% |
| 3 | 10 | 2000 | 🍔@0, 🧁@2, 🥣@5 | 4,3,2 | [0,2,3,5,6,8,9,11] | [1,4,7,10] | 🥪🍪🍌🥛 | 🚶×1,☕×2 | 💊💉 | 0.7%* |

*Day 3 requires BOOST (extraRate=4) to achieve 3★.

### 11.2. Прогрессия сложности

- **День 1:** 2 pre-placed (burger+banana), 4 free slots. Lightwalk covers overlap at slot 2.
- **День 2:** 2 pre-placed (banana+muffin), 5 free slots. Metformin + 2× lightwalk near muffin spike.
- **День 3:** 3 pre-placed (burger+muffin+oatmeal), 4 free slots. Both meds + BOOST + precise WP management. Without BOOST: 0% 3★ (intentional design).

### 11.3. Key Puzzle Solutions

- **Day 1**: lightwalk@2 covers burger+banana overlap
- **Day 2**: metformin + 2×lightwalk near muffin spike
- **Day 3**: both meds + BOOST + lightwalk@1 + sandwich@7, precise WP management

---

## 12. Tutorial Progression (Story Mode)

Full tutorial scenarios documented in **`docs/TUTORIAL_SCENARIOS.md`**.

### 12.1. Overview

8 levels, 20 days. Each level introduces 1-3 new mechanics. Guide character: **Doctor Alice** (friendly doctor, text bubble dialogues in English).

| Level | Name | Days | New Mechanics |
|-------|------|------|---------------|
| 1 | First Steps | 3 | Graph, zones, food→cubes, WP, kcal, stacking |
| 2 | Keep Moving | 3 | Light Walk, locked slots, Heavy Run |
| 3 | Willpower Management | 3 | Take a Break, overeating, carry-over, Take a Rest |
| 4 | Insulin Rhythm | 2 | Insulin profiles, rate segments |
| 5 | First Medication | 2 | Metformin |
| 6 | Threshold Drain | 2 | SGLT2, stress slots |
| 7 | GLP-1 | 2 | GLP-1 (4 effects), all meds combined |
| 8 | Final Exam | 3 | BOOST, full challenge |

### 12.2. Tutorial System

- **Overlay:** spotlight cutout + dark backdrop, pulse/glow/arrow highlights
- **4 bubble types:** dialogue (white), hint (yellow 💡), warning (red ⚠️), success (green ✨)
- **CTA animations:** drag-arrow, tap-pulse, glow-border, bounce
- **Step schema:** `{ id, bubble, highlight, cta, expectedAction, advanceOn, blockInteraction }`
- Each day has 8-15 tutorial steps, ~200 steps total
- Tutorial data stored in `public/data/tutorials/tutorial-01.json` through `tutorial-08.json`

### 12.3. Mechanic Introduction Order

| Day | Mechanic |
|-----|----------|
| L1D1 | BG graph, zones, food→cubes, drag & drop, Submit, stars |
| L1D2 | WP budget, kcal assessment, food selection |
| L1D3 | Pre-placed food, stacking risk, insulin variation |
| L2D1 | Light Walk (exercise burns cubes) |
| L2D2 | Locked slots (🔒) |
| L2D3 | Heavy Run (2-slot, deeper) |
| L3D1 | Take a Break (☕ WP refund) |
| L3D2 | Overeating penalty, kcal zones |
| L3D3 | Carry-over penalties, Take a Rest (😴) |
| L4D1 | Insulin profiles (morning vs evening) |
| L4D2 | Strategic food-to-insulin matching |
| L5D1 | Metformin (💊 −20% glucose) |
| L5D2 | Metformin + exercise combo |
| L6D1 | SGLT2 (🧪 drain above 200) |
| L6D2 | Stress slots (😰 insulin −2), Met + SGLT2 |
| L7D1 | GLP-1 (💉 4 effects) |
| L7D2 | All 3 medications stacking |
| L8D1 | Full arsenal exam |
| L8D2 | Stress + carry-over + restrictions |
| L8D3 | BOOST (🧑‍⚕️ adaptive insulin) |

### 12.4 Level Design Guidelines

#### Kcal Balance

**Goal**: player must place ALL tutorial-prescribed foods to reach the Well Fed zone (75–100% of effective kcalBudget) and cannot accidentally submit before placing required foods.

**Submit gate**: enabled when placed kcal ≥ 50% of effectiveKcalBudget.

**Rules**:
1. `kcalBudget ≤ 2000`, in multiples of 100.
2. Pre-placed food alone must be **< 50%** of budget (submit disabled until player acts).
3. Pre-placed + all required player foods must reach **≥ 75%** (Well Fed zone).
4. Formula: if pre-placed = X kcal, required player food = Y kcal:
   - Constraint 1: `X / budget < 0.50` → `budget > 2X`
   - Constraint 2: `(X + Y) / budget ≥ 0.75` → `budget ≤ (X + Y) / 0.75`
   - Therefore: `Y > 0.5 × X` (player food must exceed half of pre-placed kcal)
5. GLP-1 days: check balance using **effective budget = kcalBudget × 0.70** (GLP-1 kcalMult = 0.70 = −30%).
6. Intentional exceptions: overeating lesson days (deliberate over-budget), days where combined pre-placed already exceeds 50% (submit always enabled — puzzle constraint, not kcal lesson).

#### WP Balance

**Rules**:
1. All tutorial-required actions (food placements + interventions) must fit within `wpBudget`.
2. GLP-1 days gain `+4` effective WP when GLP-1 is toggled on.
3. Break/Rest interventions refund WP (−1 and −2 respectively).
4. Pre-placed foods do **not** charge WP to the player.
5. Default tutorial WP budget: 6–10. Avoid budgets below 5 or above 12.

#### Slot Layout

**Rules**:
1. Pre-placed foods must be in `lockedSlots`.
2. Enough free (non-locked) slots for all required player placements.
3. For size-2 interventions (heavyrun, takearest): at least one **consecutive free slot pair** that is not exclusively stressSlots.
4. Max 2 consecutive locked slots (no long blocked segments).
5. No pre-placed foods in adjacent slots (each pre-placed needs breathing room).

**Verification checklist**:
- [ ] Pre-placed food kcal / budget < 50%
- [ ] (Pre-placed + required player foods) / effectiveBudget ≥ 75%
- [ ] Y > 0.5 × X (player food > half of pre-placed)
- [ ] WP covers all required placements
- [ ] Size-2 intervention has a non-stress consecutive pair
- [ ] No isolated food cutoff by excessive locking

#### Per-Day Design Pattern

| Pattern | When to Use |
|---------|-------------|
| Single pre-placed + 1 player food | Intro/concept days — clear cause-effect |
| Single pre-placed + 2 player foods | Intermediate — adds choice |
| Multiple pre-placed (2+) | Advanced puzzle days — stacking challenge |
| No pre-placed | Pure player choice days (budget sets difficulty) |
| Overeating day | Deliberately over-budget to trigger penalty lesson |

#### Verified Configuration (all tutorial days)

| Level | Day | kcalBudget | WP | Pre-placed | Player foods | Pre-placed% | Total% |
|-------|-----|------------|-----|-----------|-------------|------------|--------|
| T01 | 1 | 200 | 5 | — | banana | — | 80% |
| T01 | 2 | 1500 | 10 | — | banana+burger+sandwich+cookie | — | 99% |
| T01 | 3 | 1000 | 8 | popcorn | banana+apple+cookie+milk (any 3) | 14% | 62–71% |
| T02 | 1 | 800 | 9 | rice | chicken | 45% | 91% |
| T02 | 2 | 1200 | 9 | chocolatemuffin | banana+cookie | 46% | 78% |
| T02 | 3 | 1200 | 11 | chocolatemuffin | nutsmixed+chickpeas | 46% | 85% |
| T03 | 1 | 1200 | 6 | burger | banana | 52% | 65% |
| T03 | 2 | 800 | 6 | — | deliberate overeat | — | >100% |
| T03 | 3 | 1200 | 8 | burger | cookie | 52% | 97% |
| T04 | 1 | 400 | 5 | — | banana×2 | — | 80% |
| T04 | 2 | 1000 | 8 | oatmeal | chickpeas+banana | 62% | 115%* |
| T05 | 1 | 1200 | 8 | rice+cookie | — | 98%* | 98% |
| T05 | 2 | 1600 | 8 | rice+oatmeal | banana+apple | 84%* | 96% |
| T06 | 1 | 1100 | 6 | pizza | sandwich | 42% | 77% |
| T06 | 2 | 1000 | 9 | oatmeal | pizza+chicken | 23% | 80% |
| T07 | 1 | 1800 (eff.1260 w/GLP1) | 6+4 | burger | oatmeal+banana | 49% | 89% |
| T07 | 2 | 1600 | 8 | chocolatemuffin+rice | banana+cookie+chicken | 70%* | submit OK |
| T08 | 1 | 1800 | 8 | sandwich+rice | chicken+banana | 85%* | submit OK |
| T08 | 2 | 2000 | 10 | chocolatemuffin | banana+cookie+oatmeal | 28% | 75% |
| T08 | 3 | 2000 | 12 | rice+chocolatemuffin | banana+sandwich | 57%* | submit OK |

*Exceeds 50% pre-placed or 100% total — intentional puzzle constraint (advanced days). Submit always enabled; challenge is graph score, not kcal.

---

## 13. Анимации

| Анимация | Длительность | Эффект | Задержка |
|----------|-------------|--------|----------|
| cubeAppear | 400ms | Scale 0.3→1.08→1 + opacity 0→1 | 20ms/col от drop point |
| cubeBurn | 400ms | Opacity 0.85→0.45→0.55 | 20ms/col от intervention |
| previewBurnPulse | 600ms loop | Opacity 0.4↔0.8 | — |
| pancreasDigest | 300ms | Opacity 0→0.45 | — |

---

## 14. Взаимодействия (Drag & Drop)

| Действие | Механика |
|----------|----------|
| Карта еды → слот | Drag-and-drop через @dnd-kit в один из 12 слотов |
| Карта упражнения → слот | Аналогично, multi-slot для run/rest |
| Карта в слоте → другой слот | Swap/reorder |
| Карта в слоте → инвентарь | Drag back to remove |
| Маркер еды → другая колонка | Pointer capture drag, перемещение продукта |
| Маркер еды → за пределы | Удаление продукта |
| Маркер упражнения → другая колонка | Pointer capture drag, перемещение упражнения |
| Маркер упражнения → за пределы | Удаление упражнения |
| Клик по normal кубу | Удаление этого продукта |
| Клик по burned кубу | Удаление первого упражнения |
| Медикамент toggle | ON/OFF, мгновенный пересчёт |
| BOOST toggle | ON/OFF, 1 use per level, adaptive insulin above 200 |

---

## 15. Настройки

| Настройка | Значения | Default | Persist |
|-----------|----------|---------|---------|
| Формат времени | 12h / 24h | 12h | localStorage |
| Единицы BG | mg/dL / mmol/L | mg/dL | localStorage |

**Конвертация:** `mmol/L = mg/dL × 0.0556` (округление до 1 знака)

---

## 16. Модель стека кубиков (v0.43.0)

### 14.1. Визуальный стек (bottom → top)

```
─────────────────────────────────
 Medication prevented (розовый/фиолетовый)    ← GLP-1, Metformin
 Insulin eaten (оранжевый #f59e0b)           ← insulin profile rate
 Burned by SGLT2 (фиолетовый)                ← thresholdDrain
 Burned by Run (тёмно-зелёный)               ← heavyrun
 Burned by Walk (светло-зелёный)             ← lightwalk
 Alive food cubes (синий по палитре)          ← нормальные кубики
─────────────────────────────────
 columnCaps = insulinCaps − interventionReduction − sglt2Reduction
```

### 14.2. Границы

| Граница | Формула | Роль |
|---------|---------|------|
| columnCaps | insulinCaps − interventions − sglt2 | Верх alive-зоны |
| insulinCaps | Сумма insulin-adjusted heights всех продуктов | Верх alive + burned |
| plateauHeights | Сумма plateau heights всех продуктов | Полная высота без insulin |

### 14.3. Определение статуса куба

```
row < columnCaps[col]          → normal (полный цвет еды)
columnCaps ≤ row < insulinCaps → burned (цвет по источнику)
row ≥ insulinCaps             → insulin (оранжевый #f59e0b, fall animation)
```

---

## 17. Известные проблемы

1. Клик по burned кубику удаляет первое упражнение, а не то которое сожгло этот конкретный куб
2. Drag-превью еды начинается с pancreasCaps (а не с верха видимых medication/pancreas кубов) — может быть визуальный зазор
3. GLP-1 перераспределяет glucose на больше колонок — medication-prevented cubes могут показывать не точную картину (отрицательные разницы обрезаются до 0)

---

## 18. Файловая структура

```
src/
├── version.ts                     — Версия (v0.43.25)
├── core/
│   ├── types.ts                   — Типы, константы, GRAPH_CONFIG
│   └── cubeEngine.ts              — Алгоритмы кривых, reduction, penalty
├── store/
│   ├── gameStore.ts               — Zustand store: state + actions
│   └── configStore.ts             — Config overrides (persisted)
├── config/
│   └── loader.ts                  — Загрузка JSON конфигов
├── components/
│   ├── menu/
│   │   ├── MainMenu.tsx           — Главное меню (Test/Story/Config)
│   │   └── MainMenu.css           — Стили кнопок меню
│   ├── config/
│   │   ├── ConfigScreen.tsx       — 3-tab editor (Food/Insulin/Interventions)
│   │   └── ConfigScreen.css       — Стили конфига
│   ├── graph/
│   │   ├── BgGraph.tsx            — SVG граф + вся визуализация
│   │   └── BgGraph.css            — Стили, keyframe анимации
│   ├── planning/
│   │   ├── PlanningPhase.tsx      — Оркестратор DnD + callbacks
│   │   ├── PlanningHeader.tsx     — Хедер: WP, kcal, Submit
│   │   ├── PancreasButton.tsx     — ON/BOOST toggle overlay
│   │   ├── ShipCard.tsx           — Карточка еды
│   │   ├── ShipInventory.tsx      — Инвентарь еды
│   │   ├── InterventionCard.tsx   — Карточка упражнения
│   │   ├── InterventionInventory.tsx — Комбинированный Actions panel
│   │   ├── MedicationPanel.css    — Стили (purple theme)
│   │   └── ResultPanel.tsx        — Звёзды, penalty breakdown, retry/next
│   └── ui/
│       └── Tooltip.tsx            — Универсальный тултип
├── App.tsx                        — Экран-роутер (menu/test/config)
└── App.css                        — Layout стили

public/data/
├── foods.json                     — 24 продукта
├── interventions.json             — 4 упражнения (walk, run, break, rest)
├── medications.json               — 3 медикамента
└── levels/
    └── level-01.json              — 3-дневный уровень (+Day 4 sandbox)

scripts/
└── balance-calc.ts                — CLI balance calculator & solver
```
