# BG Planner — Game Design Document

**Version:** v0.51.7 (alpha-13-stable)
**Branch:** `main`
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
│  Day X          ☀️ WP: X/Y          │
├─────────────────────────────────────┤
│  [BOOST]                            │
│          BG Graph (SVG)             │
│    8 AM ──────────────── 8 PM       │
│    Кубики еды + маркеры + скайлайны │
│                                     │
├─────────────────────────────────────┤
│  satiety badge │ kcal bar │[Submit] │
├─────────────────────────────────────┤
│  Slots: [B1][B2][B3][B4] Breakfast  │
│         [L1][L2][L3][L4] Lunch      │
│         [D1][D2][D3][D4] Dinner     │
├─────────────────────────────────────┤
│  Medications: ON/OFF toggles        │
│  Intervention Cards                 │
├─────────────────────────────────────┤
│  Food Cards                         │
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
| Колонки | 24 (по 30 минут) |
| Ось Y | 50 — 450+ mg/dL (динамическое расширение) |
| Ряды | 8 базовых (по 50 mg/dL), расширяется при переполнении |
| Ширина ячейки SVG | 18px; высота = graphH / effectiveRows (динамическая) |

При переполнении (кубики > 450 mg/dL) ось Y расширяется порциями по 2 строки (+100 mg/dL), ячейки становятся ниже.

### 3.2. Зоны BG

| Зона | Диапазон | Цвет фона | Штраф |
|------|----------|-----------|-------|
| Normal | 50–150 mg/dL | Зелёный | — |
| Elevated | 150–200 mg/dL | Жёлтый | — |
| High | 200–300 mg/dL | Оранжевый + штриховка | 0.5 за куб |
| Danger | 300–450+ mg/dL | Красный + штриховка | 1.5 за куб |

Красная линия на 200 mg/dL. Кубики выше 200 mg/dL отображаются с диагональной штриховкой (zone hatching).

### 3.3. Визуальные слои (снизу вверх)

1. **Фон** — цветные зоны + сетка + baseline-линия при startingBg > 50
2. **Alive кубики** — цветные (синий по прогрессивной палитре)
3. **Burned кубики** — от упражнений/медикаментов (7 цветов по источнику, opacity 0.55)
   - В режиме планирования (`hideBurnedInPlanning`) скрыты — показываются через анимацию при размещении еды
4. **Индивидуальные скайлайны** — белые контурные линии между продуктами
5. **Главный скайлайн** — белая линия по верху alive-зоны (обновляется синхронно со взрывами)
6. **Маркеры** — emoji-пузырьки над пиками продуктов и упражнений
7. **Метеоритные капли** — анимация ПЖ/BOOST при размещении еды

---

## 4. Система еды

### 4.1. Конвертация в кубики

```
peakCubes = round(glucose / 50)    (glucose = carbs × 10, cellHeightMgDl = 50)
riseCols  = round(duration / 30)   (cellWidthMin = 30)
```

- **Фаза нарастания:** линейный рост от 1 до peakCubes за riseCols колонок
- **После пика:** постепенный спад (decayRate ≈ 0.5 кубов/колонку ≈ 1 куб/30 мин)
- **GLP-1:** duration × 1.5 перед вычислением кривой (шире + ниже)
- **Pancreas/BOOST/Medications** поглощают кубики сверху стека (row-pattern burns)

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
| 5 | Cookie | 🍪 | 150 | 15g | 2g | 7g | 60m | 230 | 2 | 3 | 2 |
| 6 | Caesar Salad | 🥗 | 80 | 8g | 9g | 12g | 120m | 460 | 3 | 2 | 4 |
| 7 | Choco Muffin | 🧁 | 350 | 35g | 6g | 18g | 60m | 550 | 0 | 7 | 2 |
| 8 | Sandwich | 🥪 | 160 | 16g | 17g | 14g | 180m | 470 | 3 | 3 | 6 |
| 9 | Chicken Meal | 🍗 | 100 | 10g | 35g | 12g | 120m | 370 | 3 | 2 | 4 |
| 10 | Bowl of Rice | 🍚 | 300 | 30g | 4g | 0g | 150m | 360 | 4 | 6 | 5 |
| 11 | Hamburger | 🍔 | 270 | 27g | 22g | 28g | 150m | 620 | 2 | 5 | 5 |
| 12 | Oatmeal | 🥣 | 200 | 20g | 6g | 4g | 120m | 230 | 4 | 4 | 4 |
| 13 | Pizza | 🍕 | 230 | 23g | 12g | 12g | 90m | 460 | 3 | 5 | 3 |
| 14 | Boiled Eggs | 🥚 | 0 | 0g | 13g | 10g | 150m | 230 | 4 | 0 | 5 |
| 15 | Mixed Berries | 🫐 | 150 | 15g | 2g | 1g | 45m | 110 | 2 | 3 | 2 |
| 16 | Greek Yogurt | 🥛 | 50 | 5g | 11g | 11g | 90m | 230 | 3 | 1 | 3 |
| 17 | Milk 2% | 🥛 | 100 | 10g | 8g | 5g | 45m | 180 | 3 | 2 | 2 |
| 18 | Vegetable Stew | 🥘 | 150 | 15g | 5g | 5g | 150m | 230 | 4 | 3 | 5 |
| 19 | Boiled Carrots | 🥕 | 50 | 5g | 1g | 0g | 45m | 80 | 4 | 1 | 2 |
| 20 | Chickpeas | 🫘 | 200 | 20g | 9g | 3g | 90m | 410 | 3 | 4 | 3 |
| 21 | Cottage Cheese | 🧀 | 50 | 5g | 25g | 9g | 120m | 320 | 4 | 1 | 4 |
| 22 | Hard Cheese | 🧀 | 0 | 0g | 7g | 9g | 150m | 170 | 3 | 0 | 5 |
| 23 | Avocado | 🥑 | 70 | 7g | 2g | 15g | 150m | 240 | 3 | 1 | 5 |
| 24 | Mixed Nuts | 🥜 | 100 | 10g | 5g | 16g | 150m | 310 | 2 | 2 | 5 |

**Формула:** Cubes = round(glucose / 50), Cols = round(duration / 30). Glucose = carbs × 10.

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

### 6.1. Три медикамента (v0.50.0 — Row-Pattern Burn)

| Медикамент | Emoji | Тип | Burn Pattern | Доп. эффекты | WP |
|-----------|-------|-----|-------------|-------------|-----|
| Metformin | 💊 | peakReduction | `[0,3,1]` — 3 строки, skip-3 | — | 0 |
| SGLT2 Inhibitor | 🧪 | thresholdDrain | `[0,2]` — 2 строки, skip-2 | floor 200 mg/dL | 0 |
| GLP-1 Agonist | 💉 | slowAbsorption | `[0,3]` — 2 строки, skip-3 | Duration ×1.5, kcal ×0.70, WP +4 | 0 |

Паттерны вычисляются через `patternDepth(pattern, col)` — см. Секцию 7.

### 6.2. Подробное описание

**Metformin (💊 peakReduction)**
- Burn pattern `[0,3,1]`: 3 активных строки сжигания, каждая третья группа колонок пропускается
- Результат: более прерывистое поглощение глюкозы (не каждая колонка)
- Визуально: фуксия кубики `#f0abfc` над зоной упражнений

**SGLT2 Inhibitor (🧪 thresholdDrain)**
- Burn pattern `[0,2]`: 2 строки, skip-2
- Floor 200 mg/dL: не опускает ниже floorRow
- Формула: `sglt2D = min(rawSglt2D, max(0, heightBeforeSglt2 − floorRow))`
- Визуально: фиолетовая пунктирная линия на 200 mg/dL; кубики `#c084fc`

**GLP-1 Agonist (💉 slowAbsorption)**
- Burn pattern `[0,3]`: 2 строки сжигания, skip-3
- Duration ×1.5 — кривые шире (медленное всасывание), вычисляется до curve
- Kcal budget ×0.70 — аппетит снижен (бюджет kcal −30%)
- WP +4 — дополнительная сила воли
- Визуально: фиолетовые кубики `#a78bfa`

### 6.3. Стекирование

- Все паттерны суммируются: `columnCaps = h − interventionRed − pancreasD − boostD − metforminD − sglt2D − glp1D`
- SGLT2 применяется с floor-ограничением (после остальных вычетов)
- Duration: только GLP-1 (×1.5)
- WP bonus: аддитивно (+4)

### 6.4. Цвета сожжённых медикаментами кубиков

Сожжённые медикаментами кубики отображаются в burned-зоне (снизу вверх):

| Медикамент | Цвет | Hex | Opacity |
|-----------|------|-----|---------|
| Metformin | Фуксия | `#f0abfc` | 0.55 |
| SGLT2 | Фиолетовый | `#c084fc` | 0.55 |
| GLP-1 | Сине-фиолетовый | `#a78bfa` | 0.55 |

7-уровневый burn stack (снизу вверх): walk → run → pancreas → boost → metformin → sglt2 → glp1

### 6.5. Доступность по дням (Level-01)

| День | Медикаменты |
|------|------------|
| 1 | Нет |
| 2 | Metformin |
| 3 | Metformin + GLP-1 |

---

## 7. Row-Pattern Burn System (v0.50.0)

Заменяет старую Insulin Profile System. Каждый механизм сжигания описывается паттерном `number[]`.

### 7.1. Алгоритм patternDepth

```typescript
patternDepth(pattern, col): number
// Для каждого элемента pattern:
//   skip=0  → строка всегда сжигает (+1)
//   skip=N  → group = floor(col/N); сжигает если group%2 === 1
```

### 7.2. Паттерны сжигания

| Механизм | Pattern | Описание |
|----------|---------|---------|
| Pancreas (ПЖ) | `[0, 0]` | 2 строки, каждая колонка |
| BOOST | `[0, 3]` | 2 строки, через каждые 3 группы |
| Metformin | `[0, 3, 1]` | 3 строки, skip-3 |
| SGLT2 | `[0, 2]` | 2 строки, skip-2 |
| GLP-1 | `[0, 3]` | 2 строки, skip-3 |

### 7.3. Формула columnCaps

```
columnCaps[col] = max(baselineRow,
  h − interventionRed[col]
    − pancreasD − boostD − metforminD − sglt2D − glp1D
)

где sglt2D = min(rawSglt2D, max(0, heightBeforeSglt2 − floorRow))
```

### 7.4. BOOST — Дополнительное сжигание

- ON/OFF toggle, **1 использование на уровень**
- Паттерн `[0,3]` добавляется поверх панкреаса
- Кнопка overlaid на graph top-left (скрыта в T1-T3)
- Янтарные кубики `#f59e0b` в burned-зоне

### 7.5. Цвета всей burned-зоны (снизу вверх)

| Слой | Источник | Цвет | Hex |
|------|---------|------|-----|
| 1 | Ходьба | Светло-зелёный | `#86efac` |
| 2 | Бег | Тёмно-зелёный | `#22c55e` |
| 3 | Pancreas | Оранжевый | `#f97316` |
| 4 | BOOST | Янтарный | `#f59e0b` |
| 5 | Metformin | Фуксия | `#f0abfc` |
| 6 | SGLT2 | Фиолетовый | `#c084fc` |
| 7 | GLP-1 | Сине-фиолетовый | `#a78bfa` |

---

## 8. Бюджеты

### 8.1. Willpower Points (WP)

**Назначение:** Мета-ресурс, ограничивающий размещение еды + упражнений + tier выбор

- **Hard cap:** нельзя разместить карту если WP превышает бюджет
- Карты серые (disabled) при недостатке WP
- Источники расхода: еда (0–4 WP), упражнения (2–4 WP)
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

- **Orange zone** (200–300 mg/dL, rows 3–4): 0.5 баллов за куб
- **Red zone** (300+ mg/dL, rows 5+): 1.5 баллов за куб

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

| День | WP | Kcal | Pre-placed | Locked | Free | Продукты | Упражнения | Медикаменты | 3★ % |
|------|---:|-----:|-----------|--------|------|---------|-----------|------------|-----:|
| 1 | 10 | 1800 | 🍔@0, 🍌@4 | [0,1,3,4,6,7,9,10] | [2,5,8,11] | 🍪🥛🫘 | 🚶×1,☕×1 | — | 14.8% |
| 2 | 10 | 2000 | 🍌@0, 🧁@5 | [1,3,6,8,11] | [2,4,7,9,10] | 🫘🍪🥣 | 🚶×2,☕×1 | 💊 | 13.4% |
| 3 | 10 | 2000 | 🍔@0, 🧁@2, 🥣@5 | [0,2,3,5,6,8,9,11] | [1,4,7,10] | 🥪🍪🍌🥛 | 🚶×1,☕×2 | 💊💉 | 0.7%* |

*Day 3 requires BOOST to achieve 3★.

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
| 4 | Insulin Rhythm | 2 | BOOST, burn depth mechanics |
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
| L4D1 | BOOST toggle, burn depth |
| L4D2 | Strategic food placement with BOOST |
| L5D1 | Metformin (💊 burn pattern [0,3,1]) |
| L5D2 | Metformin + exercise combo |
| L6D1 | SGLT2 (🧪 burn pattern [0,2], floor 200) |
| L6D2 | Stress slots, Met + SGLT2 |
| L7D1 | GLP-1 (💉 burn pattern + Duration ×1.5 + kcal ×0.7 + WP +4) |
| L7D2 | All 3 medications stacking |
| L8D1 | Full arsenal exam |
| L8D2 | Stress + carry-over + restrictions |
| L8D3 | BOOST + all mechanics combined |

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

| Анимация | CSS класс | Длительность | Эффект | Задержка |
|----------|-----------|-------------|--------|----------|
| cubeAppear | `.bg-graph__cube` | 350ms | Scale 0.3→1.08→1 + opacity 0→1 | 20ms/col от drop point |
| cubeBurn | `.bg-graph__cube--burned` | 800ms | Multiflash → opacity 0.20 | 20ms/col от intervention |
| previewBurnPulse | `.bg-graph__cube--preview-burn` | 800ms loop | Opacity 0.55↔0.85 | — |
| cubeBurnOut | `.bg-graph__cube--exiting` | 500ms | Brightness flash → opacity 0, scale 0.3 | — |
| preBurnFlash | `.bg-graph__cube--pre-burn` | 450ms | Brightness 3.5 flash → opacity 0, scale 0.1 | per-column hitDelay |
| dropFall | `.bg-graph__drop` | 1000ms | Diagonal travel 70°, impact flash, disappear | wave + 60ms/drop index |
| dropFall boost | `.bg-graph__drop--boost` | 900ms | Аналогично, янтарный цвет | — |
| digestAppearBurn | `.bg-graph__cube--digest-appear-burn` | 1600ms | Появление → удержание → flash → исчезновение | per-column hitDelay |
| insulinFall | `.bg-graph__cube--insulin-fall` | 1600ms | translateY с падением и flash на impact | wave delay |
| interventionFall | `.bg-graph__cube--intervention-fall` | 1400ms | Аналогично для упражнений | wave delay |
| exerciseSweep | `.bg-graph__sweep-col` | 750ms | Горизонтальная волна scaleX 0→1 | per-column |
| medAppear | `.bg-graph__cube--med-reveal` | 700ms | Flash → opacity 0.25 | — |
| penaltyPulse | `.bg-graph__cube--penalty` | 0.4s + 1.2s loop | Pop in → pulsing opacity | — |

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

## 16. Модель стека кубиков (v0.51.x)

### 16.1. Визуальный стек (bottom → top)

```
─────────────────────────────────────────────────────────────────
 GLP-1 burned (фиолетово-синий #a78bfa)       ← glp1D
 SGLT2 burned (фиолетовый #c084fc)            ← sglt2D
 Metformin burned (фуксия #f0abfc)            ← metforminD
 BOOST burned (янтарный #f59e0b)              ← boostD
 Pancreas burned (оранжевый #f97316)          ← pancreasD
 Run burned (тёмно-зелёный #22c55e)           ← interventionRed[heavyrun]
 Walk burned (светло-зелёный #86efac)         ← interventionRed[lightwalk]
 Alive food cubes (синий по прогрессивной палитре) ← row < columnCaps
─────────────────────────────────────────────────────────────────
```

### 16.2. Ключевые границы

| Граница | Формула | Роль |
|---------|---------|------|
| `pancreasCaps[col]` | Сумма alive heights всех продуктов | Верх живой еды (до burns) |
| `columnCaps[col]` | `max(baselineRow, pancreasCaps − interventionRed − burns)` | Верх alive-зоны (после burns) |
| `plateauExtraRows[col]` | Строки, которые были плато и сожжены ПЖ | Для pre-burn skyline |

### 16.3. Определение статуса куба

```
row < columnCaps[col]            → normal (полный цвет еды)
row >= columnCaps[col]           → burned (цвет по offset внутри burned-зоны)

Offset в burned-зоне (снизу вверх):
  0..walkD-1     → walk   #86efac
  walkD..runD-1  → run    #22c55e
  ...            → pancreas → boost → metformin → sglt2 → glp1
```

### 16.4. hideBurnedInPlanning режим

Когда `hideBurnedInPlanning=true` (основной режим игры):
- Burned кубики скрыты визуально
- Видимый верх стека = `columnCaps[col]`
- При размещении еды: метеоритный дождь капель + per-column skyline update через `burnedCols` Set
- Pre-burn skyline = `columnCaps + pancreasD + boostD + plateauExtraRows`

---

## 17. Известные проблемы

1. Клик по burned кубику удаляет первое упражнение, а не то которое сожгло этот конкретный куб
2. GLP-1 перераспределяет glucose на больше колонок — medication burn cubes могут показывать не точную картину на границах

---

## 18. Файловая структура

```
src/
├── version.ts                     — Версия (v0.51.7)
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
│   │   ├── ConfigScreen.tsx       — 3-tab editor (Food/Pancreas/Interventions+Meds)
│   │   └── ConfigScreen.css       — Стили конфига
│   ├── graph/
│   │   ├── BgGraph.tsx            — SVG граф + вся визуализация (DropBomb, burnedCols, row-pattern burns)
│   │   └── BgGraph.css            — Стили, keyframe анимации (cubeAppear, cubeBurn, dropFall, etc.)
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

│   └── ui/
│       └── Tooltip.tsx            — Универсальный тултип
│   └── tutorialData.ts            — Шаги туториала (8 уровней)

public/data/
├── foods.json                     — 24 продукта
├── interventions.json             — 4 упражнения (walk, run, break, rest)
├── medications.json               — 3 медикамента
└── levels/
    └── level-01.json              — 3-дневный уровень

scripts/
└── balance-calc.ts                — CLI balance calculator & solver
```
