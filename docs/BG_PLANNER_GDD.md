# BG Planner — Game Design Document

**Version:** v0.47.13 (alpha-8-vertical)
**Branch:** `main`
**Deploy:** https://level-two-eight.vercel.app/

---

## 1. Concept

**BG Planner** — обучающая игра по управлению уровнем глюкозы в крови. Игрок размещает карточки еды и упражнений на временной шкале графика BG (Blood Glucose). Еда создаёт цветные "кубики" (блоки по 50 mg/dL) с кривыми нарастания и спада. Упражнения удаляют кубики сверху. Медикаменты модифицируют параметры глобально. Цель — спланировать питание в рамках бюджетов WP и kcal, удерживая уровень глюкозы в зелёной зоне.

**Жанр:** Стратегия планирования / Обучающая
**Платформа:** Web (мобильный + десктоп)
**Стек:** React 19, TypeScript, Vite, Zustand, @dnd-kit

---

## 2. Экран игры

Один экран без переходов между фазами. Вертикальная компоновка (v0.47.x):

```
+-------------------------------------+
|  Day X            ☀️ WP: X/Y    ☰   |  PlanningHeader
+-------------------------------------+
|  [BOOST]                            |
|          BG Graph (SVG)             |
|    8 AM ──────────────── 8 PM       |
|    Insulin bars (amber)             |
|    Кубики еды + маркеры + скайлайны |
|                                     |
+-------------------------------------+
|        🍽️ Optimal                   |  Satiety badge
|   ████████████████░░░░  650 kcal    |  KcalBar
|                          [Submit]   |
+-------------------------------------+
|  [B][B][B][B] [L][L][L][L]          |  SlotGrid
|  [D][D][D][D]                       |
+-------------------------------------+
|  🍌 🍎 🍪 🥗  │  💊 🧪 💉          |  Food + Actions
|  🥪 🍗 🍚 🍔  │  🚶 🏃 ☕ 😴       |  inventory
+-------------------------------------+
|  Day 1│2│3│4                        |  Day nav (cheat)
+-------------------------------------+
```

---

## 3. BG Graph

### 3.1. Оси

| Параметр | Значение |
|----------|----------|
| Ось X | 8:00 — 20:00 (12 часов) |
| Колонки | 24 (по 30 минут) |
| Ось Y | 50 — 450 mg/dL |
| Ряды | 8 (по 50 mg/dL) |
| Размер ячейки SVG | 18×18 px (Y сжимается при расширении) |

**Динамическое расширение Y:** когда кубики выше 450 mg/dL, граф расширяется шагами по 2 ряда (+100 mg/dL). `GRAPH_H = 144px` фиксирован, высота ячеек сжимается.

### 3.2. Зоны BG

| Зона | Диапазон | Цвет фона | Штраф |
|------|----------|-----------|-------|
| Normal | 50–150 mg/dL | Зелёный | — |
| Elevated | 150–200 mg/dL | Жёлтый | — |
| High | 200–300 mg/dL | Оранжевый | 2 за куб |
| Danger | 300+ mg/dL | Красный | 6 за куб |

Красная линия на 200 mg/dL. Рамки графика нет — жирные крайние линии сетки (1.5px).

### 3.3. Визуальные слои (снизу вверх)

1. **Фон** — цветные зоны + сетка
2. **Alive кубики** — цветные (синий по прогрессивной палитре)
3. **Burned кубики** — от упражнений/SGLT2 (зелёные/фиолетовые, opacity 0.55)
4. **Insulin кубики** — поглощённые инсулином (оранжевые, тонкий слой)
5. **Medication кубики** — предотвращённые медикаментами (розовые/фиолетовые, opacity 0.45)
6. **Индивидуальные скайлайны** — белые контурные линии между продуктами
7. **Главный скайлайн** — толстая белая линия по верху alive-зоны
8. **Маркеры** — emoji-пузырьки над пиками продуктов и упражнений

### 3.4. Starting BG (v0.47.0)

Настраиваемый начальный уровень BG за день (`startingBg` в DayConfig, по умолчанию 50 mg/dL = row 0).

```
baselineRow = round((startingBg - 50) / 50)
```

Эффекты: все стеки еды начинаются с `baselineRow`, `columnCaps` не опускается ниже `baselineRow`, штрафы считаются с учётом `baselineRow`. Визуально: пунктирная линия baseline.

---

## 4. Система еды

### 4.1. Конвертация в кубики

```
peakCubes = round(glucose / 50)     // cellHeightMgDl = 50
riseCols  = round(duration / 30)    // cellWidthMin = 30
```

- **Фаза нарастания:** линейный рост от 1 до peakCubes за riseCols колонок (NO insulin drain)
- **После пика (insulin, cumulative):** `height = round(peak - cumInsulin)` where cumInsulin accumulates insulin rate per column
- **После пика (insulin, per-column):** `height = round(peak - rate[col])`
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
| 1 | Banana | 🍌 | 180 | 18g | 1g | 0g | 45m | 160 | 1 | 4 | 2 |
| 2 | Apple | 🍎 | 170 | 17g | 1g | 0g | 45m | 140 | 1 | 3 | 2 |
| 3 | Ice Cream | 🍦 | 160 | 16g | 4g | 11g | 60m | 200 | 0 | 3 | 2 |
| 4 | Popcorn | 🍿 | 150 | 15g | 3g | 2g | 45m | 140 | 1 | 3 | 2 |
| 5 | Cookie | 🍪 | 110 | 11g | 2g | 7g | 60m | 230 | 2 | 2 | 2 |
| 6 | Caesar Salad | 🥗 | 80 | 8g | 9g | 12g | 120m | 460 | 3 | 2 | 4 |
| 7 | Choco Muffin | 🧁 | 350 | 35g | 6g | 18g | 60m | 550 | 0 | 7 | 2 |
| 8 | Sandwich | 🥪 | 160 | 16g | 17g | 14g | 180m | 470 | 3 | 3 | 6 |
| 9 | Chicken Meal | 🍗 | 30 | 3g | 35g | 12g | 120m | 370 | 3 | 1 | 4 |
| 10 | Bowl of Rice | 🍚 | 300 | 30g | 4g | 0g | 150m | 360 | 4 | 6 | 5 |
| 11 | Hamburger | 🍔 | 270 | 27g | 22g | 28g | 150m | 620 | 2 | 5 | 5 |
| 12 | Oatmeal | 🥣 | 190 | 19g | 6g | 4g | 120m | 230 | 4 | 4 | 4 |
| 13 | Pizza | 🍕 | 230 | 23g | 12g | 12g | 90m | 460 | 3 | 5 | 3 |
| 14 | Boiled Eggs | 🥚 | 0 | 0g | 13g | 10g | 150m | 230 | 4 | 0 | 5 |
| 15 | Mixed Berries | 🫐 | 140 | 14g | 2g | 1g | 45m | 110 | 2 | 3 | 2 |
| 16 | Greek Yogurt | 🥛 | 60 | 6g | 11g | 11g | 90m | 230 | 3 | 1 | 3 |
| 17 | Milk 2% | 🥛 | 100 | 10g | 8g | 5g | 45m | 180 | 3 | 2 | 2 |
| 18 | Vegetable Stew | 🥘 | 140 | 14g | 5g | 5g | 150m | 230 | 4 | 3 | 5 |
| 19 | Boiled Carrots | 🥕 | 60 | 6g | 1g | 0g | 45m | 80 | 4 | 1 | 2 |
| 20 | Chickpeas | 🫘 | 180 | 18g | 9g | 3g | 90m | 410 | 3 | 4 | 3 |
| 21 | Cottage Cheese | 🧀 | 30 | 3g | 25g | 9g | 120m | 320 | 4 | 1 | 4 |
| 22 | Hard Cheese | 🧀 | 0 | 0g | 7g | 9g | 150m | 170 | 3 | 0 | 5 |
| 23 | Avocado | 🥑 | 70 | 7g | 2g | 15g | 150m | 240 | 3 | 1 | 5 |
| 24 | Mixed Nuts | 🥜 | 20 | 2g | 5g | 16g | 150m | 310 | 2 | 0 | 5 |

**Формула:** Cubes = round(glucose / 50), Cols = round(duration / 30)

---

## 5. Система упражнений (Interventions)

### 5.1. Параметры

| Упражнение | Emoji | Depth | Duration | WP | Tail | SlotSize | Эффект |
|-----------|-------|------:|---------:|---:|-----:|---------:|--------|
| Light Walk | 🚶 | 1 cube | 60m (2 cols) | 2 | 1 cube | 1 | Main: 1 cube for 2 cols, tail: 1 cube to end |
| Heavy Run | 🏃 | 2 cubes | 180m (6 cols) | 4 | 1 cube | 2 | Main: 2 cubes for 6 cols, tail: 1 cube to end |
| Take a Break | ☕ | 0 | 30m (1 col) | -1 | 0 | 1 | Refunds 1 WP, no cube effect |
| Take a Rest | 😴 | 0 | 120m (4 cols) | -2 | 0 | 2 | Refunds 2 WP, no cube effect |

### 5.2. Two-Phase Curve

```
mainCols = round(duration / 30)
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
| Metformin | 💊 | peakReduction | Glucose x0.80 (-20%) | 0 |
| SGLT2 Inhibitor | 🧪 | thresholdDrain | -1 cube/col, floor 200 mg/dL | 0 |
| GLP-1 Agonist | 💉 | slowAbsorption | Duration x1.5, glucose x0.90, kcal x0.85, WP +4 | 0 |

### 6.2. Подробное описание

**Metformin (💊 peakReduction)**
- Умножает glucose всех продуктов на 0.80
- Результат: пики ниже, кубов меньше
- Duration без изменений

**SGLT2 Inhibitor (🧪 thresholdDrain)**
- Удаляет до 1 куба с каждой колонки
- Не опускает ниже 200 mg/dL (row 3)
- Формула: `reduction[col] = min(depth, max(0, height[col] - floorRow))`
- Визуально: фиолетовая пунктирная линия на 200 mg/dL

**GLP-1 Agonist (💉 slowAbsorption)**
- Duration x1.5 — кривые шире (медленное всасывание)
- Glucose x0.90 — пики на 10% ниже (отвязано от duration)
- Kcal budget x0.85 — аппетит снижен (бюджет kcal -15%)
- WP +4 — дополнительная сила воли

### 6.3. Стекирование

- Glucose: мультипликативно (Metformin x GLP-1 = 0.80 x 0.90 = 0.72)
- Duration: только GLP-1 (x1.5)
- SGLT2 drain: аддитивно с interventions
- WP bonus: аддитивно (+4)

### 6.4. Medication-prevented cubes

Предотвращённые медикаментами кубы отображаются выше insulin-зоны:

| Медикамент | Цвет | Hex | Opacity |
|-----------|------|-----|---------|
| Metformin | Розово-фиолетовый | `#f0abfc` | 0.45 |
| GLP-1 | Сине-фиолетовый | `#a78bfa` | 0.45 |

Атрибуция вычисляется через промежуточную кривую "только Metformin":
- `metforminReduction = originalHeight - afterMetforminHeight`
- `glp1Reduction = afterMetforminHeight - fullyMedicatedHeight`

### 6.5. Доступность по дням (Level-01)

| День | Медикаменты |
|------|------------|
| 1 | Нет |
| 2 | Metformin |
| 3 | Metformin + GLP-1 |
| 4 | Metformin + SGLT2 + GLP-1 |

---

## 7. Insulin Profile System (v0.43.0)

Replaces old Pancreas Tier System (OFF/I/II/III).

### 7.1. Segment-Based Profiles

Each day defines insulin rate segments in level config:
```json
"insulinProfile": {
  "mode": "cumulative",
  "segments": [
    { "from": 0, "to": 15, "rate": 1 },
    { "from": 16, "to": 31, "rate": 1 },
    { "from": 32, "to": 47, "rate": 1 }
  ]
}
```

- Integer rates 1-5 (insulin cells absorbed per column)
- Visible as amber background bars on graph
- Higher rates = faster glucose absorption after peak
- Segment ranges may use old 0-47 indices; engine clamps to TOTAL_COLUMNS-1 (23)

### 7.2. Post-Peak Insulin

Food rises to **full peak** without any insulin drain during ramp-up.
Insulin absorbs cubes only **after** the food reaches its peak column.

**Cumulative mode (default):**
```
After peak: height = round(peakCubes - cumInsulin)
where cumInsulin += rate[col] each post-peak column
```

**Per-column mode (config option):**
```
After peak: height = round(peakCubes - rate[col])
```

### 7.3. BOOST — Adaptive Insulin

- ON/OFF toggle, **1 use per level**
- Only enhances columns above 200 mg/dL threshold (row 3)
- Extra rate = 4 cubes per column above threshold (configurable)
- Button overlaid on graph top-left corner
- Config screen: BOOST threshold and extra rate editable

### 7.4. Stress Slots

- `stressSlots` in DayConfig — slots where insulin rate is reduced
- `STRESS_INSULIN_REDUCTION = 1` — rate reduced by 1 per column
- `rate[col] = max(0, rate[col] - 1)` for columns in stress slot range
- A slot covers 2 columns (COLS_PER_SLOT = 2)

### 7.5. Visual Layer

- Insulin-eaten cubes rendered as orange (`#f59e0b`) with fall animation
- Darker stroke `#d97706`
- Stacked above alive food cubes

---

## 8. Бюджеты

### 8.1. Willpower Points (WP)

**Назначение:** Мета-ресурс, ограничивающий размещение еды + упражнений

- **Hard cap:** нельзя разместить карту если WP превышает бюджет
- Карты серые (disabled) при недостатке WP
- Источники расхода: еда (0-4 WP), упражнения (2-4 WP)
- Breaks восстанавливают WP (-1 или -2)
- GLP-1 даёт +4 WP к бюджету

**Бюджет:**
```
rawWpBudget = dayConfig.wpBudget + medicationModifiers.wpBonus
wpFloor = ceil(dayConfig.wpBudget * 0.5)
effectiveWpBudget = max(rawWpBudget - wpPenalty + satietyPenalty.wpDelta, wpFloor)
```

**Дисплей:** `☀️ WP: X/Y` — зелёный если ок, красный если перебор

### 8.2. Kilocalories (kcal)

**Назначение:** Информационный трекер с 3-зонной оценкой сытости

| % от бюджета | Оценка | Цвет | Зона |
|-------------|--------|------|------|
| < 50% | Malnourished | Красный | malnourished |
| 50-100% | Optimal | Зелёный | optimal |
| > 100% | Overeating | Оранжевый | overeating |

**Carry-over penalties (на следующий день):**

| Зона | wpDelta | kcalDelta | Free Food |
|------|---------|-----------|-----------|
| Malnourished | -1 | 0 | 1 (Ice Cream) |
| Optimal | +1 | 0 | 0 |
| Overeating | -1 | +100 | 1 (Ice Cream) |

Free food: Ice Cream (`id: "icecream"`) с `wpCost = 0`.

---

## 9. Штрафы и рейтинг

### 9.1. Подсчёт штрафов

```
penalty = sum(orange_cubes * 2 + red_cubes * 6)
```

- **Orange zone** (200-300 mg/dL, rows 3-4): 2 баллов за куб
- **Red zone** (300+ mg/dL, rows 5+): 6 баллов за куб

> **Примечание:** Веса 4x больше чем в ранних версиях (0.5/1.5), компенсируя меньшее количество кубов/колонок в сетке 50 mg/dL / 30 min.

### 9.2. Звёздный рейтинг

| Штраф | Звёзды | Уровень |
|-------|--------|---------|
| <= 12.5 | 3 stars | Perfect |
| <= 50 | 2 stars | Good |
| <= 100 | 1 star | Pass |
| > 100 | 0 stars | Defeat |

### 9.3. WP Penalty (last day)

На последнем дне уровня неиспользованные WP добавляют штраф:
```
unspentWp * WP_PENALTY_WEIGHT (= 5)
```

---

## 10. Slot System (v0.42.0)

### 10.1. Слоты

12 слотов: 4 Breakfast (8-12) + 4 Lunch (12-16) + 4 Dinner (16-20).
Each slot = 1 hour = 2 columns of 30 min.

- Drag food/intervention from inventory -> drop into slot
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

## 11. Level-01: First Steps (v0.47.13)

### 11.1. Конфигурация дней

| День | WP | Kcal | Pre-placed | Insulin Profile | Locked | Free | Продукты | Упражнения | Медикаменты |
|------|---:|-----:|-----------|----------------|--------|------|---------|-----------|------------|
| 1 | 10 | 1800 | 🍔@0, 🍌@4 | 1,1,1 | [0,3,4,6,7,9,10] | [1,2,5,8,11] | 🍪🥛🫘 | 🚶x1,🏃x1,☕x1 | — |
| 2 | 10 | 2000 | 🍌@0, 🧁@5 | 1,1,1 | [1,3,6,8,11] | [2,4,7,9,10] | 🫘🍪🥣 | 🚶x2,🏃x1,☕x1 | 💊 |
| 3 | 10 | 2000 | 🍔@0, 🧁@2, 🥣@5 | 2,1,1 | [0,2,3,5,6,8,9,11] | [1,4,7,10] | 🥪🍪🍌🥛 | 🚶x1,☕x2 | 💊💉 |
| 4 | 10 | 2000 | — | 1,1,1 | — | all | all 24 foods | all 4 | 💊🧪💉 |

Day 2 stress slots: [4] (reduces insulin by 1 in cols 8-9).

### 11.2. Прогрессия сложности

- **День 1:** 2 pre-placed (burger+banana), 5 free slots. Walk/run cover overlap.
- **День 2:** 2 pre-placed (banana+muffin), 5 free slots. Metformin + 2x lightwalk near muffin spike. Stress slot.
- **День 3:** 3 pre-placed (burger+muffin+oatmeal), 4 free slots. Both meds + BOOST + precise WP management.
- **День 4 (sandbox):** Свободная игра со всеми продуктами и механиками.

### 11.3. Key Puzzle Solutions

- **Day 1**: lightwalk/heavyrun covers burger+banana overlap
- **Day 2**: metformin + 2x lightwalk near muffin spike
- **Day 3**: both meds + BOOST + lightwalk@1, precise WP management

---

## 12. Tutorial Progression (Story Mode)

Full tutorial scenarios documented in **`docs/TUTORIAL_SCENARIOS.md`**.

### 12.1. Overview

8 levels, 20 days. Each level introduces 1-3 new mechanics. Guide character: **Doctor Alice** (friendly doctor, text bubble dialogues in English).

| Level | Name | Days | New Mechanics |
|-------|------|------|---------------|
| 1 | First Steps | 3 | Graph, zones, food->cubes, WP, kcal, stacking |
| 2 | Keep Moving | 3 | Light Walk, locked slots, Heavy Run |
| 3 | Willpower Management | 3 | Take a Break, overeating, carry-over, Take a Rest |
| 4 | Insulin Rhythm | 2 | Insulin profiles, rate segments |
| 5 | First Medication | 2 | Metformin |
| 6 | Threshold Drain | 2 | SGLT2, stress slots |
| 7 | GLP-1 | 2 | GLP-1 (4 effects), all meds combined |
| 8 | Final Exam | 3 | BOOST, full challenge |

### 12.2. Tutorial System

- **Overlay:** spotlight cutout + dark backdrop, pulse/glow/arrow highlights
- **4 bubble types:** dialogue (white), hint (yellow), warning (red), success (green)
- **CTA animations:** drag-arrow, tap-pulse, glow-border, bounce
- **Step schema:** `{ id, bubble, highlight, cta, expectedAction, advanceOn, blockInteraction }`
- Each day has 8-15 tutorial steps, ~200 steps total
- Tutorial data stored in `src/components/tutorial/tutorialData.ts`
- Level configs in `public/data/levels/tutorial-01.json` through `tutorial-08.json`

### 12.3. Mechanic Introduction Order

| Day | Mechanic |
|-----|----------|
| L1D1 | BG graph, zones, food->cubes, drag & drop, Submit, stars |
| L1D2 | WP budget, kcal assessment, food selection |
| L1D3 | Pre-placed food, stacking risk, insulin variation |
| L2D1 | Light Walk (exercise burns cubes) |
| L2D2 | Locked slots |
| L2D3 | Heavy Run (2-slot, deeper) |
| L3D1 | Take a Break (WP refund) |
| L3D2 | Overeating penalty, kcal zones |
| L3D3 | Carry-over penalties, Take a Rest |
| L4D1 | Insulin profiles (morning vs evening) |
| L4D2 | Strategic food-to-insulin matching |
| L5D1 | Metformin (-20% glucose) |
| L5D2 | Metformin + exercise combo |
| L6D1 | SGLT2 (drain above 200) |
| L6D2 | Stress slots (insulin -1), Met + SGLT2 |
| L7D1 | GLP-1 (4 effects) |
| L7D2 | All 3 medications stacking |
| L8D1 | Full arsenal exam |
| L8D2 | Stress + carry-over + restrictions |
| L8D3 | BOOST (adaptive insulin) |

---

## 13. Phased Layer Reveal Animation

Submit triggers progressive layer-by-layer reveal:

| Phase | Label | Content | Hold |
|-------|-------|---------|------|
| 1 | Food Cubes | Food cubes + wave animation + emoji markers | 1500ms |
| 2 | Insulin | Insulin drain cubes | 1200ms |
| 3 | Exercise | Intervention burns + markers | 1200ms |
| 4 | Medications | SGLT2 burns + Met/GLP-1 prevented cubes | 1200ms |

- Initial delay: 300ms before first phase
- Empty phases auto-skipped
- After all phases: penalty overlay + ResultPanel

---

## 14. Анимации

| Анимация | Длительность | Эффект | Задержка |
|----------|-------------|--------|----------|
| cubeAppear | 400ms | Scale 0.3->1.08->1 + opacity 0->1 | 20ms/col от drop point |
| cubeBurn | 400ms | Opacity 0.85->0.45->0.55 | 20ms/col от intervention |
| previewBurnPulse | 600ms loop | Opacity 0.4<->0.8 | — |
| pancreasDigest | 300ms | Opacity 0->0.45 | — |

---

## 15. Взаимодействия (Drag & Drop)

| Действие | Механика |
|----------|----------|
| Карта еды -> слот | Drag-and-drop через @dnd-kit в один из 12 слотов |
| Карта упражнения -> слот | Аналогично, multi-slot для run/rest |
| Карта в слоте -> другой слот | Swap/reorder |
| Карта в слоте -> инвентарь | Drag back to remove |
| Маркер еды -> другая колонка | Pointer capture drag, перемещение продукта |
| Маркер еды -> за пределы | Удаление продукта |
| Маркер упражнения -> другая колонка | Pointer capture drag, перемещение упражнения |
| Маркер упражнения -> за пределы | Удаление упражнения |
| Клик по normal кубу | Удаление этого продукта |
| Клик по burned кубу | Удаление первого упражнения |
| Медикамент toggle | ON/OFF, мгновенный пересчёт |
| BOOST toggle | ON/OFF, 1 use per level, adaptive insulin above 200 |

---

## 16. Настройки

| Настройка | Значения | Default | Persist |
|-----------|----------|---------|---------|
| Формат времени | 12h / 24h | 12h | localStorage |
| Единицы BG | mg/dL / mmol/L | mg/dL | localStorage |

**Конвертация:** `mmol/L = round(mg/dL / 18 * 10) / 10`

---

## 17. Модель стека кубиков (v0.47.x)

### 17.1. Визуальный стек (bottom -> top)

```
---------------------------------
 Medication prevented (розовый/фиолетовый)    <- GLP-1, Metformin
 Insulin eaten (оранжевый #f59e0b)            <- insulin profile rate
 Burned by SGLT2 (фиолетовый)                 <- thresholdDrain
 Burned by Run (тёмно-зелёный)                <- heavyrun
 Burned by Walk (светло-зелёный)              <- lightwalk
 Alive food cubes (синий по палитре)           <- нормальные кубики
---------------------------------
 columnCaps = insulinCaps - interventionReduction - sglt2Reduction
```

### 17.2. Границы

| Граница | Формула | Роль |
|---------|---------|------|
| columnCaps | insulinCaps - interventions - sglt2 | Верх alive-зоны |
| insulinCaps | Сумма insulin-adjusted heights всех продуктов | Верх alive + burned |
| plateauHeights | Сумма plateau heights всех продуктов | Полная высота без insulin |

### 17.3. Определение статуса куба

```
row < columnCaps[col]          -> normal (полный цвет еды)
columnCaps <= row < insulinCaps -> burned (цвет по источнику)
row >= insulinCaps             -> insulin (оранжевый #f59e0b, fall animation)
```

---

## 18. Известные проблемы

1. Клик по burned кубику удаляет первое упражнение, а не то которое сожгло этот конкретный куб
2. Drag-превью еды начинается с pancreasCaps (а не с верха видимых medication/pancreas кубов) — может быть визуальный зазор
3. GLP-1 перераспределяет glucose на больше колонок — medication-prevented cubes могут показывать не точную картину (отрицательные разницы обрезаются до 0)

---

## 19. Файловая структура

```
src/
├── version.ts                     — Версия (v0.47.13)
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
│   │   ├── MainMenu.tsx           — Главное меню (Test/Tutorial/Config)
│   │   └── MainMenu.css           — Стили кнопок меню
│   ├── config/
│   │   ├── ConfigScreen.tsx       — 3-tab editor (Food/Insulin/Interventions)
│   │   └── ConfigScreen.css       — Стили конфига
│   ├── graph/
│   │   ├── BgGraph.tsx            — SVG граф + вся визуализация
│   │   └── BgGraph.css            — Стили, keyframe анимации
│   ├── planning/
│   │   ├── PlanningPhase.tsx      — Оркестратор DnD + callbacks
│   │   ├── PlanningHeader.tsx     — Хедер (day+WP) + экспорт KcalBar
│   │   ├── PlanningHeader.css     — Стили хедера + kcal bar
│   │   ├── PancreasButton.tsx     — ON/BOOST toggle overlay
│   │   ├── ShipCard.tsx           — Карточка еды
│   │   ├── ShipInventory.tsx      — Инвентарь еды
│   │   ├── SlotGrid.tsx           — Сетка слотов (12 слотов)
│   │   ├── InterventionCard.tsx   — Карточка упражнения
│   │   ├── InterventionInventory.tsx — Actions panel (meds + interventions)
│   │   ├── MedicationPanel.css    — Стили (purple theme)
│   │   └── ResultPanel.tsx        — Звёзды, penalty breakdown, retry/next
│   ├── tutorial/
│   │   ├── TutorialOverlay.tsx    — Spotlight + bubble overlay
│   │   ├── TutorialOverlay.css    — Стили overlay
│   │   ├── tutorialData.ts       — Step definitions per level/day
│   │   └── useTutorial.ts        — Tutorial state hook
│   └── ui/
│       └── Tooltip.tsx            — Универсальный тултип
├── App.tsx                        — Экран-роутер (menu/test/tutorial/config)
└── App.css                        — Layout стили

public/data/
├── foods.json                     — 24 продукта (realistic portions)
├── interventions.json             — 4 упражнения (walk, run, break, rest)
├── medications.json               — 3 медикамента
└── levels/
    ├── level-01.json              — 4-дневный уровень (3 puzzle + sandbox)
    └── tutorial-01..08.json       — 8 tutorial levels (20 days total)

scripts/
└── balance-calc.ts                — CLI balance calculator & solver
```
