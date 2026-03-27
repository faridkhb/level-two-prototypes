# Changelog

## 27–28 марта (v0.56.0 → v0.59.6) — T4 Tutorial + Level Select v2 + Fixes `alpha-15-stable`

### v0.59.6 — Hide days count on level tiles
- `.tutorial-select__card-days { display: none }` — подпись с кол-вом дней скрыта на всех тайлах

### v0.59.5 — High-contrast food cube palette
- Палитра кубиков заменена на экстремальное чередование светлый/тёмный: `#bae6fd` (sky-200) / `#0c4a6e` (sky-900) / `#7dd3fc` / `#1e3a8a` (navy) / `#38bdf8` / `#1e40af` (cobalt) / `#0ea5e9`

### v0.59.4 — Fix intervention tail cap + T4D3 kcal + level tile cleanup
- **Критический баг**: 4 вызова `calculateInterventionCurve` в BgGraph.tsx не передавали `maxDuration` → хвост шёл до конца графика. Исправлено во всех 4 местах (render loop, drag preview, marker positioning, bomb animation)
- T4 D3: `kcalBudget` 1700 → 1800
- Level select: убран WIP-затемнение с 5-го тайла (Under Stress)

### v0.59.3 — Remove last T2 dialog
- Удалён шаг LK-D2-7 ("Well done! Staying in the optimal zone...") из T2 D2

### v0.59.2 — WP counter в скрытом KcalBar
- KcalBar `hidden=true` теперь рендерит `wp-counter` div рядом с Submit — виден в T1 (туториал подсветки WP L1D2-1 работает)
- Причина: PlanningPhase использует только KcalBar, не PlanningHeader; когда `hidden=true` WP не отображался вовсе

### v0.59.1 — Darken Outdated/WIP level tiles
- WIP: `grayscale(55%) brightness(0.60)`; Outdated: `grayscale(70%) brightness(0.50)`

### v0.59.0 — Батч изменений: PANCREAS label, level reorder, T1/T2/T5/T7 rebalance
- **PancreasButton**: добавлена подпись `PANCREAS` рядом с эмодзи
- **T1 D3**: пицца перенесена slot 10 → 7 (3PM); диалог обновлён
- **T2**: D1 kcalBudget 1700→1600; D2 kcalBudget 1200→1600, wpBudget 10→12, caesarsalad→chocolatemuffin@slot9, berriesmixed добавлен
- **T5**: D2 удалён; D3 стал D2; `days: 3→2`; `TUTORIAL_STEPS: {1:L3D1, 2:L3D3}`
- **T7 D1**: pre-placed chocolatemuffin → pizza; диалог LS-D1-4 обновлён
- **TutorialLevelSelect**: T08 → "SGLT2"; T06 → "External Insulin"
- **Reorder** позиций 5–10: T07 Under Stress, T08 SGLT2, T05 Willpower Mgmt, T09 GLP-1, T06 External Insulin, T10 Final Exam
- **Outdated badges** (CSS filter) на тайлах 6–10

### v0.58.0 – v0.58.7 — T4 Pancreas Fatigue Tutorial complete ⭐
- **getEffectivenessPattern(e)**: maps tier 1–5 → burn pattern (tier5=[0,0], tier4=[0,1], tier3=[0], tier2=[1], tier1=[2])
- **New BgGraph props**: `pancreasEffectiveness`, `replayBurnsTrigger`, `highlightBurns`
- **replayBurnsTrigger**: второй `useLayoutEffect` в BgGraph переиграет бомбы для всех колонок
- **New TutorialStep fields**: `showBurnsLayer`, `highlightBurns`, `triggerReburn`, `pancreasEffectivenessOverride`, `pendingUntilResults`
- **T4 D1** (11 шагов): tier-5 demo → bomb replay → tier drops to 4 (`triggerReburn` + `pancreasEffectivenessOverride`) → показ изменённых слоёв с blink; финальный диалог `pendingUntilResults` после полного reveal
- **T4 D2**: pre-placed chocolatemuffin; Metformin шаг: `showBurnsLayer + highlightMedEffect` — моргают фиолетовые кубики; последний диалог удалён
- **T4 D3**: добавлен free-play puzzle (pizza@slot3 + burger@slot5, 1800 kcal, 15 WP, metformin+walk+run); `days: 2→3`
- **highlightMedEffect** bug fix: параметр `_highlightMedEffect` переименован в `highlightMedEffect` (был неактивен)
- **forcedShowBurns**: `tutorialStep.showBurnsLayer` перекрывает `hideBurnedInPlanning` в PlanningPhase

---

## 26 марта (v0.52.1 → v0.54.0) — PancreasButton Redesign + Variant B Reveal + 👁️ Toggle

### v0.54.0 — Variant B Reveal: реальные бомбы + результаты с burns ⭐
- **Variant B reveal**: фаза 2 (Pancreas) запускает реальные meteor-бомбы через `revealBombsTrigger` prop
  - BgGraph второй `useLayoutEffect` ловит инкремент → анимация идентична planning-режиму
  - Продвижение фазы 2 через `onBurnAnimComplete` callback (не hold-таймер)
- **После всех фаз:** `setShowBurns(true)` вызывается автоматически → все burn-слои видны в результатах
- **Zone hatching в результатах:** `showHatchingOverride={showResults}` prop — штриховка видна независимо от `showBurns`
- **Penalty overlays + hatching** поверх кубиков в зонах опасности на экране результатов
- **Фикс 👁️ на results-экране:** кнопка корректно работает после reveal

### v0.53.1 — UI cleanup: ∂/∑ → удалён, 🔥 → 👁️, перемещён в day-nav
- Удалён cheat-button (∂/∑) из интерфейса
- Кнопка видимости сжигателей переименована: 🔥 → 👁️
- Перемещена из правого верхнего угла графика **в нижнюю day-nav панель**
- Кнопка 👁️ теперь видна и на экране результатов (не только в режиме планирования)

### v0.53.0 — PancreasButton L-shape redesign ⭐
- **PancreasButton** полностью переработан в L-образный overlay на графике:
  - Верхний ряд: 🫀 emoji + кружки зарядов + hint-текст
  - Нижний ряд: effectiveness bar (5 секций), визуальный индикатор глубины ПЖ
  - BOOST активен → добавляются красно-оранжевые секции с `boostSegPulse` анимацией
- `pancreasEffectiveness?: number` в DayConfig — конфигурируется из level config (1–5, default 5)
- Overlay: top-center графика (`position: absolute; left: 50%; transform: translateX(-50%)`)

### v0.52.1 — Fix: slowMotionRef race condition
- `useLayoutEffect` в BgGraph читал устаревший `slowMotionRef` при быстрых обновлениях
- Исправлено: используется `slowMotionBurns` prop напрямую (не через ref)

---

## 25 марта (v0.51.8 → v0.51.12) — GLP-1 Peak Reduction + Burns Toggle + Skylines Off

### v0.51.12 — Burns Visibility Toggle + Disable Skylines
- **🔥 кнопка** в правом верхнем углу графика переключает видимость сжигателей (ПЖ/BOOST/медикаменты) во время планирования
- По умолчанию сжигатели скрыты (`hideBurnedInPlanning=true`); активная кнопка подсвечивается оранжевым
- Кнопка показывается только в режиме планирования, не в туториале
- **Отключены индивидуальные food skylines** (white step-path контуры между продуктами)
- Удалён `burnedCols` state и per-column sync таймеры (упрощение — скайлайн-синхронизация не нужна без скайлайнов)

### v0.51.11 — GLP-1 Peak Reduction ⭐
- **GLP-1** теперь снижает пик продуктов (а не только растягивает кривую)
- Формула: `peakReduction = floor(extraCols / 2)`, где `extraCols = effectiveRiseCols − originalRiseCols`
- Примеры (GLP-1 ×1.5): Pizza 90m→135m → origCols=3, effCols=5, extra=2 → −1 куб (5→4); Oatmeal 120m→180m → extra=2 → −1 куб (4→3); Rice 150m→225m → extra=3 → −1 куб (6→5)
- Продукты с коротким riseCols без изменений: Banana extra=0 → пик без изменений (4)
- Без GLP-1: все продукты без изменений (`durationMultiplier=1 → extraCols=0`)
- Реализация: `applyMedicationToFood` возвращает `{glucose, duration, peakReduction}`; `calculateCurve` принимает `peakReduction` параметр (default=0)

### v0.51.10 — Linear Duration Normalization (Reverted)
- Введена общая нормализация: −1 куб на каждый дополнительный riseCol выше 2, исключение для ≤10г углеводов
- Отменено в v0.51.11 — эффект оказался слишком сильным для всех продуктов

### v0.51.9 — General Duration Normalization (Reverted)
- Расширена нормализация на ВСЕ продукты: `normalizedGlucose = glucose * min(1, 2/riseCols)`
- Отменено — пики упали слишком резко (Rice 6→2/3, Hamburger 5→2)

### v0.51.8 — GLP-1 Explicit Peak Division (Reverted)
- GLP-1: `effectiveGlucose = glucose / durationMultiplier` — явное деление
- Отменено в пользу extraCols-based формулы

---

## 22 февраля (v0.37.0 → v0.38.2) — Unified Rendering + Per-Food Colors + Decay Stacking

### v0.38.2 — Decay-Based Stacking (фундаментальный фикс) ⭐
- **Корневая проблема**: plateau stacking (decayRate=0) ставил кубики верхних продуктов выше alive-границы (pancreasCaps) → все кубики были pancreas → одинаковый бледный цвет
- **Решение**: стэкирование кубиков по РЕАЛЬНЫМ decay-кривым вместо plateau
- Alive-кубики всегда ниже pancreasCaps → чёткие индивидуальные цвета
- Pancreas-кубики рисуются ВЫШЕ всего alive-стека (отдельная визуальная зона)
- При decayRate=0: decay=plateau, поведение идентично старому
- Обновлён preview для нового стэкинга
- **Тег**: `v0.38.2`

### v0.38.1 — Глобальные границы alive/pancreas
- Заменена per-food модель на глобальные `pancreasCaps`/`columnCaps`
- Промежуточная версия — не решила проблему полностью (базовые row выше alive-границы)

### v0.38.0 — Гибридная per-food модель
- Per-food cube status (alive/burned/pancreas по индивидуальному decay)
- Глобальные скайлайны/маркеры
- Не решила визуальную проблему: normal/pancreas граница некорректна для 2+ продуктов

### v0.37.9 — Pancreas cubes используют цвет продукта
- Цвет pancreas-кубиков: `layer.color` вместо фиксированного оранжевого

### v0.37.8 — Откат v0.37.7
- Revert per-food модели (ломала скайлайны и маркеры)

### v0.37.6 — Фиксированная палитра + полная яркость
- 7-цветная палитра Tailwind sky (#7dd3fc → #0c4a6e)
- cubeAppear анимация: opacity 0→1 (вместо 0.85)

### v0.37.5 — Progressive blue gradient
- Цвет по порядку размещения (1й продукт = голубой, 2й = темнее)
- Заменена GI-based система на index-based

### v0.37.4 — Skyline Z-order + маркер на skylineRow
- Индивидуальные скайлайны рисуются ПОСЛЕ всех слоёв кубиков
- Маркеры центрируются по `max(skylineRow)` вместо `max(foodDecayed)`

### v0.37.0 → v0.37.3 — Unified GraphRenderData
- Единый `graphRenderData` useMemo заменяет 7 отдельных хуков
- Layer-based рендеринг (обратный порядок: последний продукт внизу)
- Интеграция маркеров, скайлайнов, penalty overlays

---

## 21 февраля (v0.32.0 → v0.36.8) — Food Markers + Skylines + Penalty System

### v0.36.5 → v0.36.8 — Layer-based rendering + skyline outlines
- Белые outlines для стекированных продуктов (food skylines)
- Layer-based рендеринг с правильным Z-порядком
- Маркеры используют effective heights
- Shadow для food outlines

### v0.35.0 → v0.35.3 — Food markers (emoji labels)
- Emoji маркеры над пиком каждого продукта
- Белый bubble с хвостом, drop shadow
- Перетаскиваемые маркеры (drag to move/remove food)
- Центрирование по пику продукта

### v0.34.0 → v0.34.2 — Penalty / Rating system
- Submit кнопка для оценки графика
- Penalty zones: orange (200-300), red (300+)
- Звёздный рейтинг: 3★ Perfect → 0★ Defeat
- Penalty highlight overlays с пульсирующей анимацией

### v0.33.0 → v0.33.3 — Pancreas Tier System
- 4 тира: OFF (0), I (0.25), II (0.5), III (0.75)
- UI выбора тира с WP-стоимостью
- Визуальные bars текущего тира

### v0.32.0 → v0.32.5 — BG Main Skyline
- Основная BG скайлайн по верху колонок
- Zone-colored (зелёный/жёлтый/оранжевый/красный)
- Shadow под скайлайном
- Rounded strokeLinejoin

---

## 20 февраля (v0.31.0 → v0.31.6) — Medications + Boost Zones + GI Colors

### v0.31.0 — Medication System
- **Три медикамента** как дневные тогглы (ON/OFF), без WP:
  - **Metformin** (💊 peakReduction): глюкоза ×0.75 → пики на 25% ниже
  - **SGLT2 Inhibitor** (🧪 thresholdDrain): убирает до 3 кубов в столбце, но не ниже 200 mg/dL
  - **GLP-1 Agonist** (💉 slowAbsorption): duration ×1.5, глюкоза ÷1.5, kcal −30%, WP +4
- Пурпурная панель тогглов между графиком и инвентарём
- Доступность по дням: Day 1 — нет, Day 2 — Metformin, Day 3 — все три
- Пурпурная пунктирная линия на 200 mg/dL при SGLT2
- **Новые файлы**: medications.json, MedicationPanel.tsx/css
- **Типы**: Medication, MedicationType, MedicationModifiers в types.ts
- **Engine**: computeMedicationModifiers(), applyMedicationToFood(), calculateSglt2Reduction()

### v0.31.1 — Day Navigation
- Кнопки переключения дней (Day 1/2/3) внизу экрана
- Активный день подсвечен, disabled при текущем дне

### v0.31.2 — Intervention Boost Zones
- **Burst-зоны** для упражнений: первые N столбцов получают +X глубину
  - Light Walk: первые 3 столбца с -4 кубами (база 3 + boost 1)
  - Heavy Run: первые 5 столбцов с -7 кубами (база 5 + boost 2)
- Добавлены `boostCols` и `boostExtra` в Intervention тип и interventions.json
- Подсветка столбцов при drag интервенции (зелёные полупрозрачные колонки)

### v0.31.3 — Per-Cube Burn Preview
- При перетаскивании интервенции — зелёные оверлеи на конкретных кубах еды (а не целых столбцах)
- Показывает именно те кубы, которые были бы сожжены при дропе
- Пульсирующая анимация `previewBurnPulse`

### v0.31.4 — Uniform Green Preview
- Единый ярко-зелёный цвет `rgba(34, 197, 94, 0.6)` для всех preview-burn кубов
- Убрано разделение на boost/normal в визуализации

### v0.31.5 — GI-Based Blue Gradient
- **Цвет кубов по гликемическому индексу**: от светло-синего (медленный рост) до тёмно-синего (быстрый рост)
- Формула: `rate = glucose / duration`, нормализация по всем 24 продуктам
- HSL gradient: `hsl(215, 75%, L%)` где `L = 78 - t*46`
- Заменена старая 8-цветная палитра (blue, red, green, orange...)

### v0.31.6 — Dynamic Color Normalization
- Нормализация GI-градиента только по размещённым продуктам (а не по всем 24)
- Цвета адаптивно меняются при добавлении/удалении еды с графика

---

## 19 февраля (v0.29.0 → v0.30.4) — Graph Redesign + Interventions

### v0.29.0 — WP Budget System, Kcal Assessment
- **WP бюджет**: карточки еды расходуют WP при размещении на графике
- **Kcal assessment**: трекинг калорий с бюджетом на день
- **Protein/fat данные** добавлены в foods.json

### v0.29.1 — UI Cleanup
- Отключена BG линия (красная кривая поверх кубиков)
- Отключены эмодзи еды на графике

### v0.29.2 — Ramp + Plateau Curve
- **Новая модель кривой глюкозы**: линейный подъём (ramp) + плоское плато вместо пирамиды
- Пик на 40% длительности, затем плоский уровень

### v0.29.3 — Glucose Decay Tail
- **Фоновый метаболизм**: после достижения пика глюкоза постепенно снижается
- `DECAY_RATE = 0.5` кубика на колонку (1 куб / 30 мин)
- Кривая: ramp → peak → decay до 0

### v0.29.4 — Decay Toggle
- Кнопка ON/OFF для переключения decay (с перезапуском игры)

### v0.30.0 — Intervention System
- **Kcal × 2.5** для всех 24 продуктов в foods.json
- **WP бюджет = 16** для всех дней
- **Система интервенций**:
  - Light Walk 🚶 (60 мин, 2 WP, -3 куба)
  - Heavy Run 🏃 (30 мин, 4 WP, -5 кубов)
  - Работают как еда наоборот — «сжигают» кубы с верхнего слоя от точки дропа до конца графика
  - Ramp up во время duration, затем плато до конца графика
- **Новые файлы**: interventions.json, InterventionCard.tsx/css, InterventionInventory.tsx
- **Drag-and-drop**: единый DnD контекст для еды и интервенций
- **Комбинированный WP**: общий трекинг WP для еды + интервенций

### v0.30.1 — Visual Fixes
- Штриховка интервенций: цвет темнее (контрастнее к белому фону)
- Убрана отметка 60 mg/dL с Y-оси графика

### v0.30.2 — Wave Animations
- **Сгоревшие кубики**: полупрозрачные вместо штриховки (тот же цвет еды с пониженным opacity)
- **Wave-эффект размещения еды**: кубики появляются с анимацией scale (0.3→1.08→1), волна слева направо
- **Wave-эффект интервенций**: кубики плавно переходят в полупрозрачность, волна слева направо
- CSS keyframes: `cubeAppear` (scale + fade-in), `cubeBurn` (fade-out)
- `transform-box: fill-box` для корректных SVG-трансформаций
- `animationDelay` по 20ms на колонку от точки дропа

### v0.30.3 — Opacity Adjustment
- Снижена opacity сгоревших кубиков до 0.05

### v0.30.4 — Opacity Correction
- Повышена opacity сгоревших кубиков до 0.35 (финальное значение cubeBurn анимации)

---

## 9 февраля (v0.23.0) — Planning Phase Rebalance

### v0.23.0 — Planning Config Rebalance
- **Предустановленные продукты**: 5 уникальных карт (без повторов между днями)
  - День 1: oatmeal (вечер, слот 13)
  - День 2: chocolatemuffin (утро, слот 1) + chicken (день, слот 7)
  - День 3: cookie (утро, слот 4) + icecream (вечер, слот 13)
- **Заблокированные слоты** по нарастающей:
  - День 1: [5, 11] — фрагментация вторых рядов утра и дня
  - День 2: [6, 14] — ограничение утреннего и вечернего рядов
  - День 3: [3, 9, 11, 17] — ни один ряд не вмещает L-карту
- **WP бюджет**: 14/14/15 (было 12/12/12) — больше пространства для комбинаций
- **Инвентарь**: 8/8/7 продуктов (было 6/6/4), больше M и L карт
- **Пересечение инвентарей**: ≤43% между любой парой дней
- **Пазловость**: пространственные ограничения через блокировки + размеры карт
- Все дни проверены на решаемость (мин. лимиты + 2 оптимума на днях 1-2)

---

## 8 февраля (v0.22.0 → v0.22.9) — Results Phase Redesign

### v0.22.0 — Assessment System (replaces Star Rating)
- **Удалена система рангов/звёзд** (calculateRank, getRankMessage, RankDisplay)
- **Новая система оценки** на основе кругов деградации:
  - Excellent (0 кругов) — только Continue
  - Decent (1 круг) — Continue + Retry
  - Poor (2-3 круга) — Continue + Retry
  - Defeat (4-5 кругов) — только Retry
- Win condition: `maxDegradationCircles` в level config (было `minRank`)
- Тип `DayAssessment` и `DEFAULT_ASSESSMENT_THRESHOLDS` в types.ts

### v0.22.1 — BG Graph Zone Coloring
- Зоны фона на графике: зелёная (70-200), оранжевая (200-300), красная (300+)
- Линия и точки графика раскрашены по зонам
- Подпись "X degradations till defeat" под ExcessBG
- Убран зелёный порог (target 100) с графика

### v0.22.2 — Circle Redesign
- Круги заполняются справа (damaged markers fill from right)
- Убрано отображение текстовой оценки (Decent/Poor/etc)

### v0.22.3 — Cross Markers
- Круги деградации заменены на розовые крестики (45°) через CSS ::before/::after
- Заголовок EXCESS BG увеличен до 18px
- Подпись увеличена до 15px

### v0.22.4 — Visual Polish
- Здоровые маркеры = зелёные круги (восстановлены), повреждённые = розовые крестики
- Линия графика в зоне 70-200 зелёного цвета
- Базовый цвет линии серый (#a0aec0)

### v0.22.5 — Dashed Circle Outlines
- Пунктирный круг вокруг крестиков деградации (тёмно-зелёный)

### v0.22.6 — Subtitle & Title Styling
- Пунктир = тот же зелёный что и здоровые круги (#48bb78)
- Крестики чуть тоньше (5px)
- Подпись: 19px, белый, число жирным (`<strong>`)
- DEGRADATION → DEGRADATIONS
- Заголовки EXCESS BG и DEGRADATIONS цветом #718096
- Убрана строка "Day 1 First Steps" из хедера
- Заголовок результатов: "Day X/Y Results" (с общим числом дней)

### v0.22.7 — UI Refinements
- Port Management → **Port Planner**
- Уменьшены отступы хедера и results phase
- EXCESS BG: увеличен padding (20px)
- Пунктир вокруг крестиков: розовый (#ff6b9d) вместо зелёного

### v0.22.8
- Откат увеличения спрайтов органов (80×110px)

### v0.22.9
- Иконки органов в results phase: 48→56px, контейнер 100→110px

---

## 8 февраля (v0.21.0 → v0.21.17)

### v0.21.0 — SVG Pipe System
- **Замена частиц на трубы** — GlucoseParticleSystem заменён на SVG-оверлей с трубами
- Трубы: Ship→Liver (3 маршрута), Liver→BG (normal + passthrough), BG→Muscles, BG→Kidneys, Pancreas→Muscles (insulin)
- Стенка трубы (#4a5568) + внутренняя заливка (синяя для глюкозы, оранжевая для инсулина)
- Анимированные индикаторы потока (dash-стрелки), скорость пропорциональна rate

### v0.21.1 — Pipe Positioning Fix
- Y-координаты сдвинуты вверх на ~7 SVG units (трубы были ~50px ниже нужного)
- X-координаты ship pipes исправлены на реальные позиции слотов (~18%, ~50%, ~82%)

### v0.21.2–v0.21.3
- Slot 0 pipe: полностью вертикальная (без горизонтального отвода)
- Порядок рендера [0, 2, 1]: центральная труба поверх правой

### v0.21.4–v0.21.7
- Горизонтальные трубы печени/почек удлинены и сдвинуты правее
- Труба ПЖ отцентрирована по оси подложки ПЖ (x=82.5)

### v0.21.8–v0.21.9 — Z-index Layering
- pipe-system: z-index 1, контейнеры KC/LC: z-index 2, подложки органов: z-index 3, BG: z-index 10

### v0.21.10 — Non-scaling-stroke
- `vector-effect: non-scaling-stroke` для равномерной ширины стенок (preserveAspectRatio="none" растягивал SVG)
- Размеры в пикселях: стенка 6px, заливка 2px

### v0.21.11–v0.21.13
- Внутренняя часть труб увеличена: 2→4→8px (стенка: 6→8→12px)
- Passthrough: заливка 4→8→16px (стенка: 8→12→20px)
- Подложки органов z-index 2→3 (поверх контейнеров)

### v0.21.14–v0.21.16 — Dash Style Refinements
- Горизонтальные трубы печени сближены (y=35/42 → y=37/40)
- stroke-linecap: round→butt (исправлено слияние dash при широких stroke)
- stroke-dasharray: 3 9, dashoffset: 12

### v0.21.17 — Chevron Flow Indicators
- Замена плоских dash-стрелок на V-образные шевроны `>`
- CSS `offset-path` + `offset-distance` анимация вдоль трубы
- 3 шеврона на активную трубу, равномерно распределены
- Скорость анимации пропорциональна flow rate

---

## 8 февраля (v0.20.0 → v0.20.11)

### v0.20.0 — Body Diagram Layout Overhaul
- **Абсолютное позиционирование** вместо CSS Grid 6×6
- 4 органа по углам: K (top-left), M (top-right), L (bottom-left), P (bottom-right)
- BG контейнер в центре, во всю высоту, pill-shape (полукруглые концы)
- Контейнеры KC/LC наполовину задвинуты за подложки органов
- Подложки органов: 80×110px, цвет #545F73, pulse-анимация при активности
- Tier circles сверху для всех органов (position: 'top')

### v0.20.1
- Удалена emoji из BG контейнера, название перенесено под контейнер
- Включены tier/degradation circles для почек
- Цвет подложки по умолчанию: #545F73 с pulse-анимацией

### v0.20.2
- Контейнеры KC/LC выровнены по нижнему краю подложек
- Круги печени и почек по умолчанию зелёные (colorScheme: 'green')

### v0.20.3
- Исправлено выравнивание контейнера печени (скрыт value под compact-size bar)

### v0.20.4
- BG bar растянут от верха подложек K/M до низа подложек L/P
- Надпись "Blood Glucose" перенесена над контейнером

### v0.20.5
- BG центрирован между контейнерами KC/LC и подложками M/P (`left: calc(50% + 20px)`)
- Скругления контейнеров выровнены с подложками (12px)

### v0.20.6
- BG контейнер pill-shape (border-radius: 50px, полукруглые концы)

### v0.20.7
- Обновлены пути частиц глюкозы для нового layout
- z-index частиц поднят до 20

### v0.20.8
- Частицы летят в центр контейнеров-адресатов
- Глюкоза на иконку: 25 mg/dL (было 15)

### v0.20.9
- Круги ПЖ и мышц по умолчанию жёлтые (#E2BC28)

### v0.20.10
- Круги деградации отображаются с правой стороны (с конца), как в фазе результатов

### v0.20.11
- Fast Insulin: числовой бейдж кол-ва использований (правый верхний угол кнопки)
- Убраны круги зарядов из кнопки Fast Insulin

---

## 8 февраля (v0.19.0)

### v0.19.0
- **BG Prediction Graph** — Sparkline в PlanningHeader: предсказание уровня глюкозы на основе текущего плана. SVG график с зонами (зелёная/жёлтая/красная), пороговыми линиями (200, 300) и разделителями сегментов. Обновляется при каждом изменении плана (debounce 300ms). Reuse SimulationEngine — тот же движок, синхронный прогон.
- **Layout Swap** — Инвентарь перемещён влево, сетка слотов вправо (desktop). Mobile: сетка остаётся сверху через CSS order.
- Новый хук `useBgPrediction` — debounced симуляция для прогноза BG.
- Новый компонент `BgSparkline` — компактный SVG sparkline для хедера.

---

## 7 февраля (v0.17.0 → v0.18.3)

### v0.18.3
- **Muscle Drain Rates adjusted**: `[0, 25, 50, 75, 100, 125, 150]` → `[0, 25, 50, 85, 120, 150, 175]`
- Steeper ramp at tiers 3-6, Fast Insulin tier 6 = 175/h

### v0.18.2
- **Muscle Drain Rates halved**: `[0, 50, 100, 125, 150, 200, 250]` → `[0, 25, 50, 75, 100, 125, 150]`
- Fast Insulin tier 6 now 150/h (was 250/h)


### Ключевые
1. **Exercise Interventions (v0.17.0)** — Карточки упражнений: light_exercise (WP=2, +1 temp tier) и intense_exercise (WP=4, permanent +1 tier). Группа "exercise" — макс 1 на сегмент. `requiresEmptySlotBefore` для intense_exercise.
2. **Blocked Slots (v0.17.1)** — `blockedSlots` в DayConfig: слоты, куда нельзя ставить карточки. Визуальный стиль: серый фон, иконка замка.
3. **Per-Day Interventions (v0.17.2)** — `availableInterventions` перенесён из LevelConfig в DayConfig. Каждый день имеет свой набор интервенций `[{id, count}]`.
4. **Simulation Rebalancing (v0.18.0)** — Смягчена реакция поджелудочной (тиры 2/3/4 вместо 4/5) + ×3 коэффициенты excessBG (1.5 для 200-300, 3.0 для 300+). Деградация стала значимой.
5. **Liver Threshold + Exercise Fix (v0.18.1)** — Печень останавливается при BG ≥300 (было 200), сниженная скорость 75/h при BG ≥250. Упражнения работают только при baseTier ≥ 1 (предотвращает гипогликемию).

### Мелкие
- v0.16.3: Pre-placed cards (preOccupiedSlots), WP auto-deduction
- v0.17.3: Cookie wpCost 0→2
- v0.17.4: Дни 2-3 level-01 расширены (больше еды, выше WP). Скрыт load на карточках интервенций.
- v0.17.5: Объединённый инвентарь без вкладок (еда + интервенции в одном списке). Тег v0.17.5 — точка отката перед ребалансом.
- v0.18.0: Поджелудочная: BG ≥150→Tier 2, BG ≥200→Tier 3, BG ≥300→Tier 4
- v0.18.1: `minBaseTier` в TierModifier, exercise_bonus и intense_exercise_bonus требуют baseTier ≥ 1
- docs: Обновлена вся документация проекта (CLAUDE.md, docs/)

---

## 7 февраля (v0.16.0)

### Ключевые
1. **Willpower Points (v0.16.0)** — Система бюджета WP (по умолчанию 16). Размещение карточек расходует WP, удаление возвращает. Сладкое бесплатно (WP=0), здоровая еда дороже (1-4 WP). Создаёт дилемму risk/reward.
2. **Segment Carb Limits (v0.16.0)** — Лимиты углеводов на каждый сегмент дня (Morning/Day/Evening) вместо дневного. Три параметра: min, optimal, max. Цветовой индикатор: зелёный (оптимально), жёлтый (граница), красный (выход за пределы).
3. **Eye Toggle (v0.16.0)** — Кнопка-глаз (правый нижний угол) скрывает/показывает детальные индикаторы. Скрыты по умолчанию: часы на карточках, числовые индикаторы органов в симуляции. Всегда видны: BG, tier circles.
4. **Mood System Removed (v0.16.0)** — Полностью удалена система настроения (типы, стор, компоненты, CSS, данные). Заменена WP.

### Мелкие
- Обновлены параметры всех продуктов: новые carbs, строгая конвертация glucose = carbs × 10
- WP-стоимость на бейджах карточек (жёлтый цвет, правый верхний угол)
- Segment headers с диапазонами carbs и цветным индикатором текущего значения
- Удалены MoodIndicator.tsx, MoodIndicator.css
- Добавлен EyeToggle.tsx (src/components/ui/)

### v0.16.1
- Удалён общий индикатор углеводов из header (Carbs Xg)
- Валидация: каждый сегмент обязан набрать минимум carbs для запуска симуляции
- Carbs отображаются на карточках размещённых в слотах

### v0.16.2
- Добавлено 11 новых продуктов: eggs, berries, yogurt, milk, vegetable stew, carrots, chickpeas, cottage cheese, cheese, avocado, nuts
- Fiber у: berries, vegetable stew, carrots, chickpeas, avocado
- Всего продуктов: 24 (13 оригинальных + 11 новых)

---

## 6 февраля (v0.13.1 → v0.15.6)

### Ключевые
1. **Liver PassThrough (v0.13.2)** — При печени ≥95% и разгрузке корабля, глюкоза проталкивается в кровь напрямую со скоростью входа.
2. **Unified Degradation Tiers (v0.14.0)** — Оба органа на единой шкале tier 1-5 (tier 1 = здоровый, несгораемый).
3. **Pancreas Tier System (v0.15.0)** — Поджелудочная определяет tier инсулина по BG (0/1/4/5), tier передаётся мышцам. Fast Insulin игнорирует деградацию и открывает 6-й tier.
4. **Liver Boost отключён (v0.15.2)** — Кнопка скрыта из UI, код сохранён.
5. **Liver Capacity 150→100 (v0.15.6)** — Уменьшена ёмкость печени, пересчитана шкала деградации (100→90→80→70→60).

### Мелкие
- v0.13.1: Порог BG high выровнен до 200 в BodyDiagram
- v0.13.3: Убрано правило emergency dump, порог overflow 95%
- v0.13.4: Liver capacity 100→150 (позже обратно на 100)
- v0.15.1: Новые drain rates мышц (50, 100, 125, 150, 200, 250)
- v0.15.3: Порог инсулин-off: 70→80
- v0.15.4: Визуализация tier circles (цвета, анимация)
- v0.15.5: Скорость симуляции по умолчанию 0.5x
- docs: organ-parameters.csv, PassThrough приоритеты

---

## 5 февраля (v0.10.0 → v0.13.0)

### Ключевые
1. **Degradation Buffer System (v0.10.0)** — Excess BG конвертируется в кружки деградации в Results Phase (каждые 100 excess = 1 кружок, чередование liver→pancreas).
2. **Визуализация деградации (v0.10.2)** — Анимированные кружки на органах в Results Phase.
3. **Day Configs (v0.11.0)** — Уровни поддерживают разные конфиги по дням, 3-дневный уровень.
4. **Fiber System (v0.12.0)** — Fiber замедляет поток глюкозы ship→liver на 0.7x для всего сегмента.
5. **Progressive Degradation Zones (v0.13.0)** — Зоны деградации: Normal (0-200), High (200-300, x0.5), Critical (300+, x1.0).

### Мелкие
- v0.10.1: Деградация перенесена из симуляции в Results Phase
- v0.10.3: Исправлен подсчёт кружков деградации
- v0.10.4: Одинаковые иконки органов в Results и Simulation
- v0.10.5: Отрицательный mood (-1) для "полезных" продуктов
- v0.10.6: Версионирование localStorage persist
- v0.10.7: Fiber добавлен в овсянку
- v0.11.1-v0.11.2: Фиксы TypeScript, предотвращение сброса currentDay
- v0.12.1: Mood сбрасывается в нейтраль при старте уровня

---

## 4 февраля (v0.3.1 → v0.9.2)

### Ключевые
1. **Pancreas как отдельный орган (v0.5.0)** — Поджелудочная получила собственную логику и типы деградации.
2. **Tier-based Degradation (v0.6.0)** — Система деградации с тирами 1-5 и визуальными кружками.
3. **Organ Sprites (v0.7.0)** — Иконки органов с подложками, замена текстовых лейблов.
4. **6x6 Grid Layout (v0.7.3-v0.7.4)** — Компактная CSS-сетка с внешними числовыми индикаторами.
5. **Sugar Cube Particles (v0.8.0)** — Кубики сахара 🧊 вместо точек (15g = 1 куб), поддержка fiber.
6. **Mood System (v0.9.0)** — 5-уровневый настрой, еда влияет на mood, вероятность негативных событий.
7. **Substep Simulation** — 10 подшагов на час для плавной анимации контейнеров.
8. **Carbs vs Glucose** — Разделение: UI показывает углеводы (г), симуляция считает глюкозу (mg/dL).

### Мелкие
- v0.3.1: Баланс параметров по Excel v0.6
- v0.7.1-v0.7.2: Подстройка размеров спрайтов и сетки
- v0.7.5: Откат ломающих layout-изменений
- v0.7.6: +5 к uptake мышц на каждый tier
- v0.7.7-v0.7.8: Новые продукты, маппинг mood/fiber из JSON
- v0.7.9: Все новые продукты добавлены в level-01
- v0.9.1-v0.9.2: Расширение carbs indicator до 500px, flex-grow

---

## 3 февраля (v0.1.0 → v0.3.0)

### Ключевые
1. **Фаза планирования** — Drag-and-drop кораблей в тайм-слоты, поддержка multi-slot кораблей.
2. **Фаза симуляции** — Game engine с контейнерами (Liver, BG), потоками глюкозы, очередью кораблей.
3. **Фаза результатов** — Метрики и деградация после дня.
4. **Particle System** — Визуализация потоков глюкозы частицами между органами.
5. **Rule Engine (v0.3.0)** — Поведение органов определяется JSON-конфигом вместо хардкода.

### Мелкие
- Исправление drag-and-drop для multi-slot кораблей (подсветка, превью, ghost)
- Фикс рендера — shallow/deep copy state для React re-render
- Сглаживание анимации dissolve кораблей
- Частицы: позиции, направление, цвет (белые), непрерывность потока
- Добавлен CLAUDE.md с правилами проекта

---

## 2 февраля (v0.0.0)
- **Старт проекта** — Initial project setup
