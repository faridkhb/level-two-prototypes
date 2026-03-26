import { useMemo, useRef, useState, useLayoutEffect, useEffect } from 'react';
import type { Ship, PlacedFood, PlacedIntervention, Intervention, GameSettings, MedicationModifiers, BurnAnimMode } from '../../core/types';
import {
  TOTAL_COLUMNS,
  TOTAL_ROWS,
  DEFAULT_MEDICATION_MODIFIERS,
  PENALTY_ORANGE_ROW,
  PENALTY_RED_ROW,
  GRAPH_CONFIG,
  COLS_PER_SLOT,
} from '../../core/types';
import { calculateCurve, calculateInterventionCurve, applyMedicationToFood, patternDepth, PANCREAS_PATTERN, BOOST_PATTERN } from '../../core/cubeEngine';
import './BgGraph.css';

// SVG layout constants
const CELL_SIZE = 18;       // column width (X)
const CELL_HEIGHT = 12;     // row height (Y) — 16 rows × 12 = 192px
const PAD_LEFT = 4;
const PAD_TOP = 4;
const PAD_RIGHT = 4;
const PAD_BOTTOM = 1;

const GRAPH_W = TOTAL_COLUMNS * CELL_SIZE;
const GRAPH_H = TOTAL_ROWS * CELL_HEIGHT;
const SVG_W = PAD_LEFT + GRAPH_W + PAD_RIGHT;

// Distinct blue palette: alternating light/dark shades for maximum contrast between neighbors
const FOOD_PALETTE = [
  '#7dd3fc', // sky-300 — lightest
  '#0369a1', // sky-700 — dark
  '#38bdf8', // sky-400 — light
  '#075985', // sky-800 — darker
  '#0ea5e9', // sky-500 — medium
  '#0c4a6e', // sky-900 — darkest
  '#0284c7', // sky-600 — medium-dark
];

function getFoodColor(index: number): string {
  return FOOD_PALETTE[Math.min(index, FOOD_PALETTE.length - 1)];
}

// Unified render data types
type CubeStatus = 'normal' | 'burned';

interface FoodRenderCube {
  col: number;
  row: number;
  status: CubeStatus;
  burnColor?: string; // per-source color for burned cubes (walk/run/SGLT2)
}

interface FoodColumnSummary {
  col: number;
  baseRow: number;
  aliveCount: number;
  topNormalRow: number;
  aliveTop: number;   // per-food alive boundary (unclamped — for markers)
  skylineRow: number;  // clamped by columnCaps (for skyline paths)
}

interface FoodRenderLayer {
  placementId: string;
  shipId: string;
  dropColumn: number;
  color: string;
  emoji: string;
  carbs: number;
  cubes: FoodRenderCube[];
  colSummary: FoodColumnSummary[];
  skylinePath: string | null;
  // Extra plateau cubes above decayed top (post-peak only), shown in pre-burn phase
  plateauCubes: Array<{ col: number; row: number }>;
}

interface GraphRenderData {
  layers: FoodRenderLayer[];
  mainSkylinePath: string;
  columnCaps: number[];
  pancreasCaps: number[];
  effectiveRows: number;
  // Per-column burn depths (exposed for bomb animation trigger)
  pancreasDepths: number[];
  boostDepths: number[];
  metforminDepths: number[];
  sglt2Depths: number[];
  glp1Depths: number[];
  // Total plateau-extra rows per column (post-peak decay visualized via bombs)
  plateauExtraRows: number[];
}

// Bomb animation: individual meteor drops falling at 70° angle
interface DropBomb {
  id: string;
  col: number;
  dropIndex: number;  // 0-based index within column
  cx: number;         // SVG x start position
  cy: number;         // SVG y start position (PAD_TOP)
  dx: number;         // CSS translate X (negative = leftward)
  dy: number;         // CSS translate Y (positive = downward)
  burnColor: string;  // orange or amber
  delay: number;      // animation delay in ms
}

interface ExitingCube {
  col: number;
  row: number;
  color: string;
  dropColumn: number;
}

interface BgGraphProps {
  placedFoods: PlacedFood[];
  allShips: Ship[];
  placedInterventions: PlacedIntervention[];
  allInterventions: Intervention[];
  settings: GameSettings;
  decayRate: number;
  boostActive?: boolean;
  medicationModifiers?: MedicationModifiers;
  showDangerZone?: boolean;          // show danger-zone colors + penalty overlays (replaces showPenaltyHighlight)
  showHatchFlash?: boolean;          // one-shot flash animation on 200 line + hatching bands
  revealPhase?: number; // undefined = all visible, 0-4 = progressive layer reveal
  previewShip?: Ship;        // food being dragged (for preview on graph)
  previewColumn?: number;    // target column for preview
  previewIntervention?: Intervention;   // intervention being dragged
  previewInterventionColumn?: number;   // target column for intervention preview
  stressSlots?: Set<number>;            // slot indices with stress (reduced insulin)
  highlightStressSlots?: boolean;        // tutorial: pulse animation on stress columns
  highlightMedEffect?: boolean;          // reserved: tutorial pulse (med-prevented cubes removed)
  isMobile?: boolean;                    // mobile-responsive sizing
  baselineRow?: number;                  // row offset for starting BG (default 0 = 60 mg/dL)
  hideBurnedInPlanning?: boolean;        // hide burned cells; show animated bomb/sweep instead
  burnAnimMode?: BurnAnimMode;           // 'incremental' = only new burns; 'full' = all burns
  onPancreasBurnStart?: () => void;      // called when ПЖ bomb animation begins (for blink trigger)
  slowMotionBurns?: boolean;             // tutorial: slow down meteor drop animation 3x
  onBurnAnimComplete?: () => void;       // called when all meteor drops finish
  revealBombsTrigger?: number;           // increment to trigger bomb animation during reveal phase 2
  showHatchingOverride?: boolean;        // force zone hatching visible (results state)
}

// Convert column to SVG x
function colToX(col: number): number {
  return PAD_LEFT + col * CELL_SIZE;
}


export function BgGraph({
  placedFoods,
  allShips,
  placedInterventions,
  allInterventions,
  settings: _settings,
  decayRate = 0.5,
  boostActive = false,
  medicationModifiers = DEFAULT_MEDICATION_MODIFIERS,
  showDangerZone = false,
  showHatchFlash = false,
  revealPhase,
  previewShip,
  previewColumn,
  previewIntervention,
  previewInterventionColumn,
  stressSlots,
  highlightStressSlots = false,
  highlightMedEffect: _highlightMedEffect = false,
  isMobile = false,
  baselineRow = 0,
  hideBurnedInPlanning = false,
  burnAnimMode = 'incremental',
  onPancreasBurnStart,
  slowMotionBurns = false,
  onBurnAnimComplete,
  revealBombsTrigger = 0,
  showHatchingOverride = false,
}: BgGraphProps) {
  // Mobile-responsive SVG layout: taller cells + smaller fonts for portrait screens
  const graphH = isMobile ? TOTAL_ROWS * 20 : GRAPH_H;  // 320 vs 192 — taller cells on mobile

  const padBottom = isMobile ? 30 : PAD_BOTTOM;
  const localSvgH = PAD_TOP + graphH + padBottom;

  const svgRef = useRef<SVGSVGElement>(null);

  // Exit animation state
  const prevLayersRef = useRef<FoodRenderLayer[]>([]);
  const [exitingCubes, setExitingCubes] = useState<ExitingCube[]>([]);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Intervention fall animation state
  interface BurningIntervention {
    id: string;
    interventionId: string;
    dropColumn: number;
    reduction: number[];
    color: string;
  }
  const [burningInterventions, setBurningInterventions] = useState<Map<string, BurningIntervention>>(new Map());
  const burningIntTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const prevInterventionIdsRef = useRef<Set<string>>(new Set());

  // Bomb animation state (ПЖ/BOOST burns on food placement)
  const [animatingBurnIds, setAnimatingBurnIds] = useState<Set<string>>(new Set());
  const [bombDrops, setBombDrops] = useState<DropBomb[]>([]);
  // Per-column bomb hit delays (ms) — non-null during pre-burn phase (food colored → flash → disappear)
  const [bombHitDelays, setBombHitDelays] = useState<Map<number, number> | null>(null);
  const burnedColTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const animateBurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Staircase cascade: per-column visible height ceiling during bomb animation (null = inactive)
  const [cascadeLevels, setCascadeLevels] = useState<number[] | null>(null);
  const cascadeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const prevMedModifiersRef = useRef(DEFAULT_MEDICATION_MODIFIERS);

  // Calculate intervention reduction per column, split by type (walk/run)
  const interventionReductions = useMemo(() => {
    const walk = new Array(TOTAL_COLUMNS).fill(0);
    const run = new Array(TOTAL_COLUMNS).fill(0);

    for (const placed of placedInterventions) {
      const intervention = allInterventions.find(i => i.id === placed.interventionId);
      if (!intervention) continue;

      const curve = calculateInterventionCurve(
        intervention.depth, intervention.duration, placed.dropColumn,
        intervention.boostCols ?? 0, intervention.boostExtra ?? 0,
      );
      const target = intervention.id === 'lightwalk' ? walk : run;
      for (const col of curve) {
        const graphCol = placed.dropColumn + col.columnOffset;
        if (graphCol >= 0 && graphCol < TOTAL_COLUMNS) {
          target[graphCol] += col.cubeCount;
        }
      }
    }

    const total = walk.map((w, i) => w + run[i]);
    return { walk, run, total };
  }, [placedInterventions, allInterventions]);
  const interventionReduction = interventionReductions.total;

  // Unified graph render data: single source of truth for all visual elements.
  const graphRenderData = useMemo((): GraphRenderData => {
    // Phase 1: Per-food decay curves. Foods stacked by alive (decay) heights.
    const aliveStacks = new Array(TOTAL_COLUMNS).fill(baselineRow);

    const rawFoods: Array<{
      placementId: string;
      shipId: string;
      dropColumn: number;
      color: string;
      emoji: string;
      carbs: number;
      columns: Array<{ col: number; baseRow: number; aliveCount: number }>;
      plateauExtras: Array<{ col: number; startRow: number; extra: number }>;
    }> = [];

    for (const placed of placedFoods) {
      const ship = allShips.find(s => s.id === placed.shipId);
      if (!ship) continue;
      const { glucose: effectiveGlucose, duration, peakReduction } = applyMedicationToFood(ship.load, ship.duration, medicationModifiers);
      const decayCurve = calculateCurve(effectiveGlucose, duration, placed.dropColumn, decayRate, peakReduction);

      // Track per-col {baseRow, aliveCount} for plateau computation
      const decayColMap = new Map<number, { baseRow: number; aliveCount: number }>();
      const cols: Array<{ col: number; baseRow: number; aliveCount: number }> = [];
      for (const dc of decayCurve) {
        const graphCol = placed.dropColumn + dc.columnOffset;
        if (graphCol < 0 || graphCol >= TOTAL_COLUMNS) continue;
        const baseRow = aliveStacks[graphCol];
        const aliveCount = dc.cubeCount;
        decayColMap.set(graphCol, { baseRow, aliveCount });
        cols.push({ col: graphCol, baseRow, aliveCount });
        aliveStacks[graphCol] += aliveCount;
      }

      // Plateau extras: post-peak columns where plateau (decayRate=0) > decay curve
      const plateauExtras: Array<{ col: number; startRow: number; extra: number }> = [];
      if (decayRate > 0) {
        const plateauCurve = calculateCurve(ship.load, duration, placed.dropColumn, 0);
        const riseCols = Math.max(1, Math.round(duration / GRAPH_CONFIG.cellWidthMin));
        for (const pc of plateauCurve) {
          if (pc.columnOffset < riseCols) continue; // ramp phase — skip
          const graphCol = placed.dropColumn + pc.columnOffset;
          if (graphCol < 0 || graphCol >= TOTAL_COLUMNS) continue;
          const decayEntry = decayColMap.get(graphCol);
          const decayH = decayEntry?.aliveCount ?? 0;
          const extra = Math.max(0, pc.cubeCount - decayH);
          if (extra <= 0) continue;
          // For decay columns: startRow = decayEntry.baseRow + decayH
          // For plateau-only columns: startRow = aliveStacks[col] (unmodified by this food)
          const startRow = decayEntry ? decayEntry.baseRow + decayH : aliveStacks[graphCol];
          plateauExtras.push({ col: graphCol, startRow, extra });
        }
      }

      rawFoods.push({
        placementId: placed.id,
        shipId: placed.shipId,
        dropColumn: placed.dropColumn,
        color: '',
        emoji: ship.emoji,
        carbs: ship.carbs ?? 0,
        columns: cols,
        plateauExtras,
      });
    }

    // Assign progressive blue colors
    for (let i = 0; i < rawFoods.length; i++) {
      rawFoods[i].color = getFoodColor(i);
    }

    // Dynamic Y-axis expansion
    let maxVisibleRow = baselineRow;
    for (const food of rawFoods) {
      for (const c of food.columns) {
        const topRow = c.baseRow + c.aliveCount;
        if (topRow > maxVisibleRow) maxVisibleRow = topRow;
      }
    }
    maxVisibleRow += 2;
    const effectiveRows = maxVisibleRow <= TOTAL_ROWS
      ? TOTAL_ROWS
      : TOTAL_ROWS + Math.ceil((maxVisibleRow - TOTAL_ROWS) / 2) * 2;
    const cellHeight = graphH / effectiveRows;

    // pancreasCaps = sum of alive heights (stacked food decay)
    const pancreasCaps = aliveStacks;

    // Phase 2: ColumnCaps using pattern burns for all mechanisms
    const { metforminPattern, sglt2, glp1Pattern } = medicationModifiers;

    const pancreasDepths = new Array(TOTAL_COLUMNS).fill(0);
    const boostDepths = new Array(TOTAL_COLUMNS).fill(0);
    const metforminDepths = new Array(TOTAL_COLUMNS).fill(0);
    const sglt2Depths = new Array(TOTAL_COLUMNS).fill(0);
    const glp1Depths = new Array(TOTAL_COLUMNS).fill(0);
    const columnCaps = new Array(TOTAL_COLUMNS).fill(0);

    for (let col = 0; col < TOTAL_COLUMNS; col++) {
      const h = pancreasCaps[col];
      const pancreasD = patternDepth(PANCREAS_PATTERN, col);
      const boostD = boostActive ? patternDepth(BOOST_PATTERN, col) : 0;
      const metforminD = metforminPattern ? patternDepth(metforminPattern, col) : 0;
      const glp1D = glp1Pattern ? patternDepth(glp1Pattern, col) : 0;

      let sglt2D = 0;
      if (sglt2) {
        const rawSglt2D = patternDepth(sglt2.pattern, col);
        const heightBeforeSglt2 = h - interventionReduction[col] - pancreasD - boostD - metforminD - glp1D;
        sglt2D = Math.min(rawSglt2D, Math.max(0, heightBeforeSglt2 - sglt2.floorRow));
      }

      pancreasDepths[col] = pancreasD;
      boostDepths[col] = boostD;
      metforminDepths[col] = metforminD;
      sglt2Depths[col] = sglt2D;
      glp1Depths[col] = glp1D;
      columnCaps[col] = Math.max(baselineRow,
        h - interventionReduction[col] - pancreasD - boostD - metforminD - sglt2D - glp1D
      );
    }

    // Phase 3: Per-food layers — stamp cubes, compute skylines
    // Accumulate global plateau extra rows per column (for bombs + pre-burn skyline)
    const plateauExtraRows = new Array(TOTAL_COLUMNS).fill(0);
    for (const food of rawFoods) {
      for (const pe of food.plateauExtras) {
        plateauExtraRows[pe.col] += pe.extra;
      }
    }

    const hasMultipleFoods = rawFoods.length >= 2;
    const bottomY = PAD_TOP + graphH;
    const layers: FoodRenderLayer[] = rawFoods.map((food) => {
      const cubes: FoodRenderCube[] = [];
      const colSummary: FoodColumnSummary[] = [];

      // Plateau extra cubes for this food (shown food-colored in pre-burn phase)
      const plateauCubes: Array<{ col: number; row: number }> = [];
      for (const pe of food.plateauExtras) {
        for (let i = 0; i < pe.extra; i++) {
          const row = pe.startRow + i;
          if (row >= effectiveRows) break;
          plateauCubes.push({ col: pe.col, row });
        }
      }

      for (const c of food.columns) {
        let topNormalRow = c.baseRow;

        for (let cubeIdx = 0; cubeIdx < c.aliveCount; cubeIdx++) {
          const row = c.baseRow + cubeIdx;
          if (row >= effectiveRows) break;

          let status: CubeStatus;
          let burnColor: string | undefined;
          if (row >= columnCaps[c.col]) {
            status = 'burned';
            // Burn source: bottom → top: walk → run → pancreas → boost → metformin → sglt2 → glp1
            const offset = row - columnCaps[c.col];
            const walkR = interventionReductions.walk[c.col];
            const runR = interventionReductions.run[c.col];
            const pancreasR = pancreasDepths[c.col];
            const boostR = boostDepths[c.col];
            const metforminR = metforminDepths[c.col];
            const sglt2R = sglt2Depths[c.col];
            if (offset < walkR) {
              burnColor = '#86efac'; // light green (walk)
            } else if (offset < walkR + runR) {
              burnColor = '#22c55e'; // dark green (run)
            } else if (offset < walkR + runR + pancreasR) {
              burnColor = '#f97316'; // orange (pancreas)
            } else if (offset < walkR + runR + pancreasR + boostR) {
              burnColor = '#f59e0b'; // amber (boost)
            } else if (offset < walkR + runR + pancreasR + boostR + metforminR) {
              burnColor = '#f0abfc'; // fuchsia (metformin)
            } else if (offset < walkR + runR + pancreasR + boostR + metforminR + sglt2R) {
              burnColor = '#c084fc'; // purple (sglt2)
            } else {
              burnColor = '#a78bfa'; // violet (glp1)
            }
          } else {
            status = 'normal';
            topNormalRow = row + 1;
          }
          cubes.push({ col: c.col, row, status, burnColor });
        }

        const aliveTop = Math.min(c.baseRow + c.aliveCount, effectiveRows);
        const skylineRow = Math.min(aliveTop, columnCaps[c.col]);

        colSummary.push({
          col: c.col,
          baseRow: c.baseRow,
          aliveCount: c.aliveCount,
          topNormalRow,
          aliveTop,
          skylineRow,
        });
      }

      // Skyline path: trace boundary of food's alive (unburned) cubes
      let skylinePath: string | null = null;
      if (hasMultipleFoods) {
        const parts: string[] = [];
        let inSeg = false;
        let prevCol = -2;
        let lastBaseY = bottomY;
        for (const cs of colSummary) {
          const baseY = PAD_TOP + graphH - cs.baseRow * cellHeight;
          if (cs.skylineRow <= cs.baseRow) {
            if (inSeg) { parts.push(`V ${lastBaseY}`); inSeg = false; }
            prevCol = cs.col;
            continue;
          }
          const y = PAD_TOP + graphH - cs.skylineRow * cellHeight;
          const x = colToX(cs.col);
          if (!inSeg || cs.col !== prevCol + 1) {
            if (inSeg) parts.push(`V ${lastBaseY}`);
            parts.push(`M ${x} ${baseY}`);
            parts.push(`V ${y}`);
            inSeg = true;
          } else {
            parts.push(`V ${y}`);
          }
          parts.push(`H ${x + CELL_SIZE}`);
          lastBaseY = baseY;
          prevCol = cs.col;
        }
        if (inSeg) parts.push(`V ${lastBaseY}`);
        if (parts.length > 0) skylinePath = parts.join(' ');
      }

      return {
        placementId: food.placementId,
        shipId: food.shipId,
        dropColumn: food.dropColumn,
        color: food.color,
        emoji: food.emoji,
        carbs: food.carbs,
        cubes,
        colSummary,
        skylinePath,
        plateauCubes,
      };
    });

    // Phase 4: Main skyline path from columnCaps
    const mainParts: string[] = [];
    let inSegment = false;
    let lastSegCol = -1;
    for (let col = 0; col < TOTAL_COLUMNS; col++) {
      const h = columnCaps[col];
      if (h <= 0) {
        if (inSegment && lastSegCol < TOTAL_COLUMNS - 1) mainParts.push(`V ${bottomY}`);
        inSegment = false;
        continue;
      }
      const y = PAD_TOP + graphH - h * cellHeight;
      if (!inSegment) {
        if (col === 0) {
          mainParts.push(`M ${colToX(col)} ${y}`);
        } else {
          mainParts.push(`M ${colToX(col)} ${bottomY}`);
          mainParts.push(`V ${y}`);
        }
        inSegment = true;
      } else {
        const prevH = columnCaps[col - 1];
        if (prevH !== h) mainParts.push(`V ${y}`);
      }
      mainParts.push(`H ${colToX(col) + CELL_SIZE}`);
      lastSegCol = col;
    }
    if (inSegment && lastSegCol < TOTAL_COLUMNS - 1) mainParts.push(`V ${bottomY}`);
    const mainSkylinePath = mainParts.length > 0 ? mainParts.join(' ') : '';

    return { layers, mainSkylinePath, columnCaps, pancreasCaps, effectiveRows, pancreasDepths, boostDepths, metforminDepths, sglt2Depths, glp1Depths, plateauExtraRows };
  }, [placedFoods, allShips, medicationModifiers, decayRate, boostActive, interventionReduction, interventionReductions, baselineRow, graphH]);

  // Dynamic Y-axis: cellHeight adapts when cubes exceed default 400 mg/dL
  const { effectiveRows } = graphRenderData;
  const cellHeight = graphH / effectiveRows;
  const rowToY = (row: number) => PAD_TOP + graphH - (row + 1) * cellHeight;

  // Preview: food cubes stacked above existing pancreasCaps
  const previewData = useMemo(() => {
    if (!previewShip || previewColumn === undefined) return null;

    const { glucose: effectiveGlucose, duration, peakReduction } = applyMedicationToFood(previewShip.load, previewShip.duration, medicationModifiers);
    // Use decayRate=0 for preview — shows plateau after peak (decay revealed via bombs after drop)
    const decayCurve = calculateCurve(effectiveGlucose, duration, previewColumn, 0, peakReduction);

    const { pancreasCaps, columnCaps } = graphRenderData;
    const foodCubes: Array<{ col: number; row: number }> = [];
    const burnedByIntCubes: Array<{ col: number; row: number }> = [];

    for (const dc of decayCurve) {
      const col = previewColumn + dc.columnOffset;
      if (col < 0 || col >= TOTAL_COLUMNS) continue;
      // When burned cubes are hidden, visual top of existing food is columnCaps, not pancreasCaps
      const baseRow = hideBurnedInPlanning ? columnCaps[col] : pancreasCaps[col];
      const aliveCount = dc.cubeCount;

      // Intervention burn sim: only relevant in non-hideBurn mode
      const interventionBurn = hideBurnedInPlanning ? 0 : Math.max(0, pancreasCaps[col] - columnCaps[col]);
      const burnedByInt = Math.min(aliveCount, interventionBurn);
      const trueAlive = aliveCount - burnedByInt;

      for (let i = 0; i < trueAlive; i++) {
        const row = baseRow + i;
        if (row >= effectiveRows) break;
        foodCubes.push({ col, row });
      }

      for (let i = 0; i < burnedByInt; i++) {
        const row = baseRow + trueAlive + i;
        if (row >= effectiveRows) break;
        burnedByIntCubes.push({ col, row });
      }
    }

    return { foodCubes, burnedByIntCubes, dropColumn: previewColumn };
  }, [previewShip, previewColumn, medicationModifiers, decayRate, graphRenderData, effectiveRows, hideBurnedInPlanning]);

  // Preview: intervention burn overlay — green cubes on food that would be burned
  const interventionPreviewData = useMemo(() => {
    if (!previewIntervention || previewInterventionColumn === undefined) return null;
    if (previewIntervention.depth <= 0) return null;

    const dropCol = previewInterventionColumn;
    const curve = calculateInterventionCurve(
      previewIntervention.depth, previewIntervention.duration, dropCol,
      previewIntervention.boostCols ?? 0, previewIntervention.boostExtra ?? 0,
    );

    const previewReduction = new Array(TOTAL_COLUMNS).fill(0);
    for (const c of curve) {
      const graphCol = dropCol + c.columnOffset;
      if (graphCol >= 0 && graphCol < TOTAL_COLUMNS) {
        previewReduction[graphCol] = c.cubeCount;
      }
    }

    const burnColor = previewIntervention.id === 'lightwalk' ? '#86efac' : '#22c55e';
    const { columnCaps } = graphRenderData;
    const wrapCubes: Array<{ col: number; row: number; color: string }> = [];

    for (let col = 0; col < TOTAL_COLUMNS; col++) {
      const reduction = previewReduction[col];
      if (reduction <= 0) continue;
      const currentTop = columnCaps[col];
      if (currentTop <= 0) continue;
      const wrapCount = Math.min(reduction, currentTop);
      // Show burns WITHIN the food stack (top N cubes that would be removed)
      const burnStart = currentTop - wrapCount;
      for (let i = 0; i < wrapCount; i++) {
        const row = burnStart + i;
        if (row < 0) continue;
        wrapCubes.push({ col, row, color: burnColor });
      }
    }

    return { wrapCubes, dropColumn: dropCol };
  }, [previewIntervention, previewInterventionColumn, graphRenderData, effectiveRows]);

  // Detect removed food layers for exit animation
  useLayoutEffect(() => {
    const prev = prevLayersRef.current;
    const currIds = new Set(graphRenderData.layers.map(l => l.placementId));
    const prevIds = new Set(prev.map(l => l.placementId));

    // Detect removed foods → exit animation
    const removed = prev.filter(l => !currIds.has(l.placementId));
    if (removed.length > 0) {
      const cubes = removed.flatMap(l =>
        l.cubes
          .filter(c => c.status === 'normal')
          .map(c => ({ col: c.col, row: c.row, color: l.color, dropColumn: l.dropColumn }))
      );
      setExitingCubes(cubes);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      exitTimerRef.current = setTimeout(() => setExitingCubes([]), 1200);
    }

    // Detect added foods → re-burn animation for exercise interventions
    const added = graphRenderData.layers.filter(l => !prevIds.has(l.placementId));
    if (added.length > 0) {
      // Re-burn: trigger fall animation for exercise interventions overlapping new food
      // Delayed so food appears first (cubeAppear), then intervention burns play on top
      const addedCols = new Set<number>(
        added.flatMap(a => a.cubes.map(c => c.col))
      );
      const REBURN_DELAY = 800;
      for (const placed of placedInterventions) {
        const intervention = allInterventions.find(i => i.id === placed.interventionId);
        if (!intervention || intervention.depth <= 0) continue;

        const curve = calculateInterventionCurve(
          intervention.depth, intervention.duration, placed.dropColumn,
          intervention.boostCols ?? 0, intervention.boostExtra ?? 0,
        );
        const reduction = new Array(TOTAL_COLUMNS).fill(0);
        let hasOverlap = false;
        for (const c of curve) {
          const graphCol = placed.dropColumn + c.columnOffset;
          if (graphCol >= 0 && graphCol < TOTAL_COLUMNS) {
            reduction[graphCol] = c.cubeCount;
            if (addedCols.has(graphCol)) hasOverlap = true;
          }
        }
        if (!hasOverlap) continue;

        const color = intervention.id === 'lightwalk' ? '#86efac' : '#22c55e';
        const reburnKey = `reburn-${placed.id}`;
        if (burningIntTimersRef.current.has(reburnKey)) clearTimeout(burningIntTimersRef.current.get(reburnKey));

        const reburnTimer = setTimeout(() => {
          burningIntTimersRef.current.delete(reburnKey);
          setBurningInterventions(prev => {
            if (prev.has(placed.id)) return prev; // already animating from explicit placement
            const next = new Map(prev);
            next.set(placed.id, { id: placed.id, interventionId: intervention.id, dropColumn: placed.dropColumn, reduction, color });
            return next;
          });
          const clearTimer = setTimeout(() => {
            setBurningInterventions(prev => { const n = new Map(prev); n.delete(placed.id); return n; });
            burningIntTimersRef.current.delete(`reburnClear-${placed.id}`);
          }, 2000);
          burningIntTimersRef.current.set(`reburnClear-${placed.id}`, clearTimer);
        }, REBURN_DELAY);
        burningIntTimersRef.current.set(reburnKey, reburnTimer);
      }
    }

    // Meteor drop animation trigger: when new food added and hideBurnedInPlanning
    if (added.length > 0 && hideBurnedInPlanning) {
      const newFoodCols = new Set(added.flatMap(a => a.cubes.map(c => c.col)));
      const localCellH = graphH / graphRenderData.effectiveRows;
      const firstDropCol = added[0]?.dropColumn ?? 0;

      const colsToProcess = burnAnimMode === 'full'
        ? Array.from({ length: TOTAL_COLUMNS }, (_, i) => i)
        : Array.from(newFoodCols);

      const drops: DropBomb[] = [];
      const hitDelayMap = new Map<number, number>();
      const colLastHitTime = new Map<number, number>(); // col -> last bomb hit time (for cascade)
      const TAN70 = Math.tan(70 * Math.PI / 180); // ≈ 2.747

      for (const col of colsToProcess) {
        const pancreasR = graphRenderData.pancreasDepths[col];
        const boostR = graphRenderData.boostDepths[col];
        const totalDrops = pancreasR + boostR;
        if (totalDrops <= 0) continue;
        if (graphRenderData.pancreasCaps[col] <= baselineRow) continue;

        const cap = graphRenderData.columnCaps[col];
        const burnColor = boostR > 0 ? '#f59e0b' : '#f97316';
        const SLOW_MO = slowMotionBurns ? 3.0 : 1.0;
        const fallDuration = (boostR > 0 ? 900 : 1000) * SLOW_MO;
        const hitPercent = 0.73; // align with visual impact peak in dropFall keyframe (73%)
        // 400ms base delay (food appear takes ~350ms) + left-to-right wave
        const waveDelay = 400 + Math.abs(col - firstDropCol) * 12;
        const targetXCenter = PAD_LEFT + col * CELL_SIZE + CELL_SIZE / 2;

        for (let i = 0; i < totalDrops; i++) {
          const targetRow = cap + i; // i-th burn row above alive stack
          const targetYCenter = PAD_TOP + graphH - (targetRow + 0.5) * localCellH;
          const dy = Math.max(2, targetYCenter - PAD_TOP);
          const dx = dy / TAN70; // horizontal offset for 70° angle (rightward)
          const cx = targetXCenter - dx; // start to the left of target
          const cy = PAD_TOP;
          const delay = waveDelay + i * 60; // stagger drops within column

          drops.push({ id: `drop-${col}-${i}`, col, dropIndex: i, cx, cy, dx, dy, burnColor, delay });
          // Track last bomb hit time per col (overwrites each i → ends up with last bomb)
          colLastHitTime.set(col, Math.round(delay + fallDuration * hitPercent));

          // hitDelay from first drop in each column (skyline updates at that moment)
          if (i === 0) {
            hitDelayMap.set(col, Math.round(delay + fallDuration * hitPercent));
          }
        }
      }

      if (drops.length > 0) {
        setBombHitDelays(hitDelayMap);
        setBombDrops(drops);
        onPancreasBurnStart?.();

        // Staircase cascade: init to full pancreasCaps, then step down col-by-col
        setCascadeLevels([...graphRenderData.pancreasCaps]);
        for (const t of cascadeTimersRef.current) clearTimeout(t);
        cascadeTimersRef.current = [];
        const cascadeCols = [...colLastHitTime.keys()].sort((a, b) => a - b);
        for (const col of cascadeCols) {
          const lastHitMs = colLastHitTime.get(col)!;
          const ct = setTimeout(() => {
            setCascadeLevels(prev => {
              if (!prev) return prev;
              const next = [...prev];
              const newLevel = graphRenderData.columnCaps[col];
              for (let c = col + 1; c < TOTAL_COLUMNS; c++) {
                if (next[c] > newLevel) next[c] = newLevel;
              }
              return next;
            });
          }, lastHitMs + 40);
          cascadeTimersRef.current.push(ct);
        }

        for (const t of burnedColTimersRef.current) clearTimeout(t);
        burnedColTimersRef.current = [];

        if (animateBurnTimerRef.current) clearTimeout(animateBurnTimerRef.current);
        const maxEnd = Math.max(...drops.map(d => d.delay + (slowMotionBurns ? 3000 : 1000)));
        animateBurnTimerRef.current = setTimeout(() => {
          setBombDrops([]);
          setBombHitDelays(null);
          setCascadeLevels(null);
          for (const t of cascadeTimersRef.current) clearTimeout(t);
          cascadeTimersRef.current = [];
          onBurnAnimComplete?.();
        }, maxEnd + 300);
      }
    }

    prevLayersRef.current = graphRenderData.layers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphRenderData.layers, placedInterventions, allInterventions]);

  // Reveal-triggered bomb animation: fires when revealBombsTrigger increments (reveal phase 2)
  useLayoutEffect(() => {
    if (!revealBombsTrigger) return; // skip initial value (0)
    if (graphRenderData.layers.length === 0) {
      onBurnAnimComplete?.();
      return;
    }

    const localCellH = graphH / graphRenderData.effectiveRows;
    const TAN70 = Math.tan(70 * Math.PI / 180);
    const drops: DropBomb[] = [];
    const hitDelayMap = new Map<number, number>();
    const colLastHitTime = new Map<number, number>();

    for (let col = 0; col < TOTAL_COLUMNS; col++) {
      const pancreasR = graphRenderData.pancreasDepths[col];
      const boostR = graphRenderData.boostDepths[col];
      const totalDrops = pancreasR + boostR;
      if (totalDrops <= 0) continue;
      if (graphRenderData.pancreasCaps[col] <= baselineRow) continue;

      const cap = graphRenderData.columnCaps[col];
      const burnColor = boostR > 0 ? '#f59e0b' : '#f97316';
      const fallDuration = boostR > 0 ? 900 : 1000;
      const hitPercent = 0.73;
      const waveDelay = 400 + col * 12;
      const targetXCenter = PAD_LEFT + col * CELL_SIZE + CELL_SIZE / 2;

      for (let i = 0; i < totalDrops; i++) {
        const targetRow = cap + i;
        const targetYCenter = PAD_TOP + graphH - (targetRow + 0.5) * localCellH;
        const dy = Math.max(2, targetYCenter - PAD_TOP);
        const dx = dy / TAN70;
        const cx = targetXCenter - dx;
        const cy = PAD_TOP;
        const delay = waveDelay + i * 60;

        drops.push({ id: `reveal-drop-${col}-${i}`, col, dropIndex: i, cx, cy, dx, dy, burnColor, delay });
        colLastHitTime.set(col, Math.round(delay + fallDuration * hitPercent));
        if (i === 0) hitDelayMap.set(col, Math.round(delay + fallDuration * hitPercent));
      }
    }

    if (drops.length === 0) {
      onBurnAnimComplete?.();
      return;
    }

    setBombHitDelays(hitDelayMap);
    setBombDrops(drops);
    onPancreasBurnStart?.();

    setCascadeLevels([...graphRenderData.pancreasCaps]);
    for (const t of cascadeTimersRef.current) clearTimeout(t);
    cascadeTimersRef.current = [];
    const cascadeCols = [...colLastHitTime.keys()].sort((a, b) => a - b);
    for (const col of cascadeCols) {
      const lastHitMs = colLastHitTime.get(col)!;
      const ct = setTimeout(() => {
        setCascadeLevels(prev => {
          if (!prev) return prev;
          const next = [...prev];
          const newLevel = graphRenderData.columnCaps[col];
          for (let c = col + 1; c < TOTAL_COLUMNS; c++) {
            if (next[c] > newLevel) next[c] = newLevel;
          }
          return next;
        });
      }, lastHitMs + 40);
      cascadeTimersRef.current.push(ct);
    }

    if (animateBurnTimerRef.current) clearTimeout(animateBurnTimerRef.current);
    const maxEnd = Math.max(...drops.map(d => d.delay + 1000));
    animateBurnTimerRef.current = setTimeout(() => {
      setBombDrops([]);
      setBombHitDelays(null);
      setCascadeLevels(null);
      for (const t of cascadeTimersRef.current) clearTimeout(t);
      cascadeTimersRef.current = [];
      onBurnAnimComplete?.();
    }, maxEnd + 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealBombsTrigger]);

  // Detect added interventions → fall animation
  useLayoutEffect(() => {
    const currIds = new Set(placedInterventions.map(p => p.id));
    const prevIds = prevInterventionIdsRef.current;

    const added = placedInterventions.filter(p => !prevIds.has(p.id));
    if (added.length > 0) {
      const newBurning = new Map(burningInterventions);
      for (const placed of added) {
        const intervention = allInterventions.find(i => i.id === placed.interventionId);
        if (!intervention || intervention.depth <= 0) continue;

        const curve = calculateInterventionCurve(
          intervention.depth, intervention.duration, placed.dropColumn,
          intervention.boostCols ?? 0, intervention.boostExtra ?? 0,
        );
        const reduction = new Array(TOTAL_COLUMNS).fill(0);
        for (const c of curve) {
          const graphCol = placed.dropColumn + c.columnOffset;
          if (graphCol >= 0 && graphCol < TOTAL_COLUMNS) {
            reduction[graphCol] = c.cubeCount;
          }
        }

        const color = intervention.id === 'lightwalk' ? '#86efac' : '#22c55e';
        newBurning.set(placed.id, {
          id: placed.id,
          interventionId: intervention.id,
          dropColumn: placed.dropColumn,
          reduction,
          color,
        });

        const timer = setTimeout(() => {
          setBurningInterventions(prev => {
            const next = new Map(prev);
            next.delete(placed.id);
            return next;
          });
          burningIntTimersRef.current.delete(placed.id);
        }, 2000);
        burningIntTimersRef.current.set(placed.id, timer);
      }
      setBurningInterventions(newBurning);
    }

    prevInterventionIdsRef.current = currIds;
  }, [placedInterventions, allInterventions]);

  // Medication toggle bomb: when meds change while food is on graph, animate newly burned med cells
  useLayoutEffect(() => {
    const prev = prevMedModifiersRef.current;
    const curr = medicationModifiers;
    const metChanged = !!prev.metforminPattern !== !!curr.metforminPattern;
    const sglt2Changed = !!prev.sglt2 !== !!curr.sglt2;
    const glp1Changed = !!prev.glp1Pattern !== !!curr.glp1Pattern;
    prevMedModifiersRef.current = curr;

    if (!hideBurnedInPlanning) return;
    if (!metChanged && !sglt2Changed && !glp1Changed) return;
    if (graphRenderData.layers.length === 0) return;

    // Find newly burned med cubes
    const newBurnIds = new Set<string>();
    for (const layer of graphRenderData.layers) {
      for (const cube of layer.cubes) {
        if (cube.status !== 'burned') continue;
        const c = cube.burnColor;
        if (c === '#f0abfc' || c === '#c084fc' || c === '#a78bfa') {
          newBurnIds.add(`${layer.placementId}-${cube.col}-${cube.row}`);
        }
      }
    }

    if (newBurnIds.size > 0) {
      setAnimatingBurnIds(prev => {
        const next = new Set(prev);
        newBurnIds.forEach(id => next.add(id));
        return next;
      });
      if (animateBurnTimerRef.current) clearTimeout(animateBurnTimerRef.current);
      animateBurnTimerRef.current = setTimeout(() => {
        setAnimatingBurnIds(new Set());
        setBombDrops([]);
      }, 2200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicationModifiers]);

  // Cleanup timers on unmount
  useEffect(() => () => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    for (const timer of burningIntTimersRef.current.values()) clearTimeout(timer);
    if (animateBurnTimerRef.current) clearTimeout(animateBurnTimerRef.current);
    for (const t of burnedColTimersRef.current) clearTimeout(t);
    for (const t of cascadeTimersRef.current) clearTimeout(t);
  }, []);

  // Dynamic zone clip bands (Y-positions from mg/dL thresholds)
  const zoneRow = (mgDl: number) => (mgDl - GRAPH_CONFIG.bgMin) / GRAPH_CONFIG.cellHeightMgDl;
  const zoneClipBands = [
    { id: 'zone-clip-green', color: '#48bb78',
      yTop: PAD_TOP + graphH - zoneRow(200) * cellHeight - 3, yBot: PAD_TOP + graphH + 3 },
    { id: 'zone-clip-orange', color: '#ed8936',
      yTop: PAD_TOP + graphH - zoneRow(300) * cellHeight - 3, yBot: PAD_TOP + graphH - zoneRow(200) * cellHeight + 3 },
    { id: 'zone-clip-red', color: '#fc8181',
      yTop: PAD_TOP - 3, yBot: PAD_TOP + graphH - zoneRow(300) * cellHeight + 3 },
  ];



  return (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${localSvgH}`}
        className="bg-graph__svg"
        preserveAspectRatio="xMidYMid meet"
        style={slowMotionBurns ? {
          '--drop-fall-duration': '3.0s',
          '--drop-fall-duration-boost': '2.7s',
          '--pre-burn-flash-duration': '1.35s',
        } as React.CSSProperties : undefined}
      >
        <defs>
          {/* Zone clip paths for skyline coloring */}
          {zoneClipBands.map(z => (
            <clipPath key={z.id} id={z.id}>
              <rect x={0} y={z.yTop} width={SVG_W} height={z.yBot - z.yTop} />
            </clipPath>
          ))}
          {/* Food marker drop shadow */}
          <filter id="bubble-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.12" />
          </filter>
          {/* Diagonal hatching for danger zone cubes — colored per zone */}
          <pattern id="hatch-orange" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="#ed8936" strokeWidth="3" strokeOpacity="0.55" />
          </pattern>
          <pattern id="hatch-red" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="#fc8181" strokeWidth="3" strokeOpacity="0.55" />
          </pattern>
        </defs>

        {/* Zone backgrounds — hidden */}

        {/* Stress zone column bands */}
        {stressSlots && stressSlots.size > 0 && Array.from(stressSlots).map(slotIndex => {
          const startCol = slotIndex * COLS_PER_SLOT;
          return (
            <rect
              key={`stress-zone-${slotIndex}`}
              x={colToX(startCol)}
              y={PAD_TOP}
              width={CELL_SIZE * COLS_PER_SLOT}
              height={graphH}
              fill="#ef4444"
              opacity={0.15}
              pointerEvents="none"
              className={highlightStressSlots ? 'stress-slot-highlight' : undefined}
            />
          );
        })}

        {/* Danger zone hatching above 200 mg/dL — orange 200-300, red 300+ */}
        {zoneRow(300) > 0 && (
          <rect
            x={PAD_LEFT}
            y={PAD_TOP}
            width={GRAPH_W}
            height={Math.max(0, graphH - zoneRow(300) * cellHeight)}
            fill="url(#hatch-red)"
            opacity={0.35}
            className={showHatchFlash ? 'bg-graph__hatch-band--flash' : undefined}
            pointerEvents="none"
          />
        )}
        <rect
          x={PAD_LEFT}
          y={PAD_TOP + (graphH - zoneRow(300) * cellHeight)}
          width={GRAPH_W}
          height={Math.max(0, (zoneRow(300) - zoneRow(200)) * cellHeight)}
          fill="url(#hatch-orange)"
          opacity={0.35}
          className={showHatchFlash ? 'bg-graph__hatch-band--flash' : undefined}
          pointerEvents="none"
        />

        {/* Grid lines - vertical (time) */}
        {Array.from({ length: TOTAL_COLUMNS + 1 }, (_, i) => (
            <line
              key={`v-${i}`}
              x1={colToX(i)}
              y1={PAD_TOP}
              x2={colToX(i)}
              y2={PAD_TOP + graphH}
              stroke={'#e2e8f0'}
              strokeWidth={i % 4 === 0 ? 0.8 : 0.3}
            />
        ))}

        {/* Grid lines - horizontal (BG) */}
        {Array.from({ length: effectiveRows + 1 }, (_, i) => (
            <line
              key={`h-${i}`}
              x1={PAD_LEFT}
              y1={PAD_TOP + i * cellHeight}
              x2={PAD_LEFT + GRAPH_W}
              y2={PAD_TOP + i * cellHeight}
              stroke={'#e2e8f0'}
              strokeWidth={0.3}
            />
        ))}

        {/* 200 mg/dL danger threshold line */}
        <line
          x1={PAD_LEFT}
          y1={PAD_TOP + graphH - zoneRow(200) * cellHeight}
          x2={PAD_LEFT + GRAPH_W}
          y2={PAD_TOP + graphH - zoneRow(200) * cellHeight}
          stroke="#ef4444"
          strokeWidth={1.5}
          opacity={0.7}
          className={showHatchFlash ? 'bg-graph__danger-line--flash' : undefined}
          pointerEvents="none"
        />

        {/* Baseline BG zone (starting blood sugar level) */}
        {baselineRow > 0 && (
          <>
            <rect
              x={PAD_LEFT}
              y={PAD_TOP + graphH - baselineRow * cellHeight}
              width={GRAPH_W}
              height={baselineRow * cellHeight}
              fill="#94a3b8"
              opacity={0.12}
              pointerEvents="none"
            />
            <line
              x1={PAD_LEFT}
              y1={PAD_TOP + graphH - baselineRow * cellHeight}
              x2={PAD_LEFT + GRAPH_W}
              y2={PAD_TOP + graphH - baselineRow * cellHeight}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="4 2"
              opacity={0.5}
              pointerEvents="none"
            />
          </>
        )}

        {/* Stress zone boundary lines and markers */}
        {stressSlots && stressSlots.size > 0 && Array.from(stressSlots).flatMap(slotIndex => {
          const startCol = slotIndex * COLS_PER_SLOT;
          const endCol = startCol + COLS_PER_SLOT;
          const centerX = colToX(startCol) + (CELL_SIZE * COLS_PER_SLOT) / 2;
          return [
            <line
              key={`stress-left-${slotIndex}`}
              x1={colToX(startCol)}
              y1={PAD_TOP}
              x2={colToX(startCol)}
              y2={PAD_TOP + graphH}
              stroke="#ef4444"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.4}
              pointerEvents="none"
            />,
            <line
              key={`stress-right-${slotIndex}`}
              x1={colToX(endCol)}
              y1={PAD_TOP}
              x2={colToX(endCol)}
              y2={PAD_TOP + graphH}
              stroke="#ef4444"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.4}
              pointerEvents="none"
            />,
            <text
              key={`stress-marker-${slotIndex}`}
              x={centerX}
              y={PAD_TOP - 2}
              textAnchor="middle"
              fontSize={8}
              fontWeight={700}
              fill="#ef4444"
              opacity={0.7}
              pointerEvents="none"
            >
              STRESS
            </text>,
          ];
        })}

        {/* X axis labels — hidden */}

        {/* Insulin profile bars — disabled for now */}

        {/* SGLT2 drain threshold line */}
        {medicationModifiers.sglt2 && (revealPhase === undefined || revealPhase >= 4) && (
          <line
            x1={PAD_LEFT}
            y1={rowToY(medicationModifiers.sglt2.floorRow - 1)}
            x2={PAD_LEFT + GRAPH_W}
            y2={rowToY(medicationModifiers.sglt2.floorRow - 1)}
            stroke="#b794f4"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            opacity={0.7}
          />
        )}

        {/* Drag preview: food cubes stacked above existing food */}
        {previewData && (
          <g className="bg-graph__preview" pointerEvents="none">
            {previewData.foodCubes.map(cube => (
              <rect
                key={`preview-${cube.col}-${cube.row}`}
                x={colToX(cube.col) + 0.5}
                y={rowToY(cube.row) + 0.5}
                width={CELL_SIZE - 1}
                height={cellHeight - 1}
                fill="#38bdf8"
                opacity={0.35}
                rx={2}
                className="bg-graph__cube--preview"
              />
            ))}
            {/* Exercise-burned preview cubes:
                hideBurnedInPlanning → show as food-blue (full glucose curve)
                normal mode → show as green (would be burned) */}
            {previewData.burnedByIntCubes.map(cube => (
              <rect
                key={`preview-intburn-${cube.col}-${cube.row}`}
                x={colToX(cube.col) + 0.5}
                y={rowToY(cube.row) + 0.5}
                width={CELL_SIZE - 1}
                height={cellHeight - 1}
                fill={hideBurnedInPlanning ? '#38bdf8' : '#86efac'}
                opacity={hideBurnedInPlanning ? 0.35 : 0.5}
                rx={2}
                className="bg-graph__cube--preview"
                stroke={hideBurnedInPlanning ? undefined : '#4ade80'}
                strokeWidth={hideBurnedInPlanning ? undefined : 0.5}
              />
            ))}
          </g>
        )}

        {/* Per-food cube layers: last placed rendered first (bottom), first placed last (top) */}
        {[...graphRenderData.layers].reverse().map(layer => (
          <g key={`food-layer-${layer.placementId}`} className="bg-graph__food-group">
            {layer.cubes
              .filter(cube => {
                if (revealPhase === undefined) {
                  if (cube.status === 'normal') return true;
                  if (cube.status === 'burned') {
                    if (!hideBurnedInPlanning) return true; // old behavior
                    const cubeKey = `${layer.placementId}-${cube.col}-${cube.row}`;
                    // Pancreas/BOOST burns: visible as food-color during pre-bomb phase
                    const isPancreasBurn = cube.burnColor === '#f97316' || cube.burnColor === '#f59e0b';
                    if (isPancreasBurn) return bombHitDelays !== null && bombHitDelays.has(cube.col);
                    // Med burns: visible only during med toggle animation
                    return animatingBurnIds.has(cubeKey);
                  }
                  return true;
                }
                // During reveal, progressively show cube layers
                if (cube.status === 'normal') return revealPhase >= 1;
                if (cube.status === 'burned') {
                  const bc = cube.burnColor;
                  const isExercise = bc === '#86efac' || bc === '#22c55e';
                  const isPancreas = bc === '#f97316';
                  const isBoost = bc === '#f59e0b';
                  if (isExercise) return revealPhase >= 3;
                  if (isPancreas || isBoost) return revealPhase >= 1; // show food-colored from phase 1
                  return revealPhase >= 4;
                }
                return false;
              })
              .map(cube => {
              const cubeKey = `${layer.placementId}-${cube.col}-${cube.row}`;
              const isPancreasBurnCube = cube.burnColor === '#f97316' || cube.burnColor === '#f59e0b';
              const cascadeVisible = cascadeLevels === null || cube.row < cascadeLevels[cube.col];
              const isPreBurnCube = hideBurnedInPlanning && cube.status === 'burned' && isPancreasBurnCube && bombHitDelays !== null && bombHitDelays.has(cube.col) && cascadeVisible;
              // Phase 1 of reveal: pancreas-burned cubes appear food-colored (no bombs yet)
              const isRevealPreBurn = revealPhase === 1 && cube.status === 'burned' && isPancreasBurnCube;
              const isAnimatingBurn = !isPreBurnCube && !isRevealPreBurn && hideBurnedInPlanning && cube.status === 'burned' && animatingBurnIds.has(cubeKey);
              const waveDelay = (cube.col - layer.dropColumn) * 20;
              // Per-row stagger: bomb-0 hits row cap, bomb-1 hits row cap+1 (60ms later), etc.
              const burnK = isPreBurnCube ? Math.max(0, cube.row - graphRenderData.columnCaps[cube.col]) : 0;
              // Danger-reveal: normal cubes above 200 flash with sweep animation (left→right)
              const isDangerRevealCube = showDangerZone && cube.status === 'normal' && cube.row >= PENALTY_ORANGE_ROW;
              const effectiveAnimDelay = isPreBurnCube ? (bombHitDelays!.get(cube.col) ?? 0) + burnK * 60
                : isDangerRevealCube ? cube.col * 50  // absolute column sweep
                : waveDelay;
              const cubeClass = isPreBurnCube
                ? 'bg-graph__cube--pre-burn'
                : isRevealPreBurn
                  ? 'bg-graph__cube'
                  : isDangerRevealCube
                    ? 'bg-graph__cube--danger-reveal'
                    : isAnimatingBurn
                      ? 'bg-graph__cube--digest-appear-burn'
                      : cube.status === 'burned'
                        ? 'bg-graph__cube--burned'
                        : 'bg-graph__cube';
              let cubeFill: string;
              if (isPreBurnCube || isRevealPreBurn) {
                cubeFill = layer.color; // food-colored before bomb hits
              } else if (cube.status === 'burned' && cube.burnColor) {
                cubeFill = cube.burnColor;
              } else if (showDangerZone) {
                // Danger zone: color cubes by zone
                if (cube.row >= PENALTY_RED_ROW) {
                  cubeFill = '#f56565'; // red-400
                } else if (cube.row >= PENALTY_ORANGE_ROW) {
                  cubeFill = '#ed8936'; // orange-400
                } else {
                  cubeFill = layer.color;
                }
              } else {
                cubeFill = layer.color;
              }
              const showHatch = cube.status === 'normal' && cube.row >= PENALTY_ORANGE_ROW &&
                ((revealPhase === undefined && !showDangerZone) || showHatchingOverride);
              return (
                <g key={`${layer.placementId}-${cube.col}-${cube.row}`}>
                  <rect
                    x={colToX(cube.col) + 0.5}
                    y={rowToY(cube.row) + 0.5}
                    width={CELL_SIZE - 1}
                    height={cellHeight - 1}
                    fill={cubeFill}
                    rx={2}
                    className={cubeClass}
                    style={{ animationDelay: `${effectiveAnimDelay}ms` }}
                  />
                  {showHatch && (
                    <rect
                      x={colToX(cube.col) + 0.5}
                      y={rowToY(cube.row) + 0.5}
                      width={CELL_SIZE - 1}
                      height={cellHeight - 1}
                      fill={cube.row >= PENALTY_RED_ROW ? 'url(#hatch-red)' : 'url(#hatch-orange)'}
                      rx={2}
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })}
          </g>
        ))}

        {/* Plateau extra cubes per food — food-colored, shown during pre-burn phase only */}
        {bombHitDelays !== null && graphRenderData.layers.map(layer =>
          layer.plateauCubes.map(pc => {
            // Hide plateau cubes clipped by cascade staircase
            if (cascadeLevels !== null && pc.row >= cascadeLevels[pc.col]) return null;
            const baseHitDelay = bombHitDelays.get(pc.col) ?? 0;
            // Plateau cubes above burn zone: stagger by row offset from columnCaps
            const plateauBurnK = Math.max(0, pc.row - graphRenderData.columnCaps[pc.col]);
            const hitDelay = baseHitDelay + plateauBurnK * 60;
            return (
              <rect
                key={`plateau-${layer.placementId}-${pc.col}-${pc.row}`}
                x={colToX(pc.col) + 0.5}
                y={rowToY(pc.row) + 0.5}
                width={CELL_SIZE - 1}
                height={cellHeight - 1}
                fill={layer.color}
                rx={2}
                className="bg-graph__cube--pre-burn"
                style={{ animationDelay: `${hitDelay}ms` }}
                pointerEvents="none"
              />
            );
          })
        )}

        {/* Drag preview: intervention burn overlay — green cubes on food that would burn */}
        {interventionPreviewData && (
          <g pointerEvents="none">
            {interventionPreviewData.wrapCubes.map(cube => {
              const waveDelay = Math.abs(cube.col - interventionPreviewData.dropColumn) * 15;
              return (
                <rect
                  key={`preview-wrap-int-${cube.col}-${cube.row}`}
                  x={colToX(cube.col) + 0.5}
                  y={rowToY(cube.row) + 0.5}
                  width={CELL_SIZE - 1}
                  height={cellHeight - 1}
                  fill={cube.color}
                  opacity={0.5}
                  rx={2}
                  className="bg-graph__cube--preview"
                  stroke={cube.color === '#86efac' ? '#4ade80' : '#16a34a'}
                  strokeWidth={0.5}
                  style={{ animationDelay: `${waveDelay}ms` }}
                />
              );
            })}
          </g>
        )}

        {/* Intervention animation — sweep (planning) or fall (results) */}
        {burningInterventions.size > 0 && (
          <g pointerEvents="none">
            {Array.from(burningInterventions.values()).flatMap(bi => {
              const { columnCaps } = graphRenderData;
              return bi.reduction.flatMap((red, col) => {
                if (red <= 0) return [];
                const currentTop = columnCaps[col];
                const effectiveRed = Math.min(red, currentTop + red);
                if (effectiveRed <= 0) return [];
                const waveDelay = Math.abs(col - bi.dropColumn) * 20;

                if (hideBurnedInPlanning) {
                  // Horizontal sweep flash: one tall rect at the burn zone position
                  const sweepY = rowToY(currentTop + effectiveRed - 1) + 0.5;
                  const sweepH = effectiveRed * cellHeight - 1;
                  return [(
                    <rect
                      key={`sweep-${bi.id}-${col}`}
                      x={colToX(col) + 0.5}
                      y={sweepY}
                      width={CELL_SIZE - 1}
                      height={Math.max(3, sweepH)}
                      fill={bi.color}
                      rx={2}
                      className="bg-graph__sweep-col"
                      style={{ animationDelay: `${waveDelay}ms` }}
                    />
                  )];
                }

                // Original fall animation (non-hideBurnedInPlanning mode)
                const fallDist = effectiveRed * cellHeight;
                return Array.from({ length: effectiveRed }, (_, i) => {
                  const startRow = currentTop + effectiveRed + i;
                  return (
                    <rect
                      key={`ifall-${bi.id}-${col}-${i}`}
                      x={colToX(col) + 0.5}
                      y={rowToY(startRow) + 0.5}
                      width={CELL_SIZE - 1}
                      height={cellHeight - 1}
                      fill={bi.color}
                      rx={2}
                      className="bg-graph__cube--intervention-fall"
                      style={{
                        animationDelay: `${waveDelay}ms`,
                        '--fall-dist': `${fallDist}px`,
                      } as React.CSSProperties}
                    />
                  );
                });
              });
            })}
          </g>
        )}


        {/* Intervention fall during reveal phase 3 */}
        {revealPhase !== undefined && revealPhase >= 3 && placedInterventions.length > 0 && (() => {
          const { columnCaps } = graphRenderData;
          const fallCubes: React.ReactElement[] = [];

          for (const placed of placedInterventions) {
            const intervention = allInterventions.find(i => i.id === placed.interventionId);
            if (!intervention || intervention.depth <= 0) continue;

            const curve = calculateInterventionCurve(
              intervention.depth, intervention.duration, placed.dropColumn,
              intervention.boostCols ?? 0, intervention.boostExtra ?? 0,
            );
            const color = intervention.id === 'lightwalk' ? '#86efac' : '#22c55e';

            for (const c of curve) {
              const col = placed.dropColumn + c.columnOffset;
              if (col < 0 || col >= TOTAL_COLUMNS) continue;
              const currentTop = columnCaps[col];
              const effectiveRed = Math.min(c.cubeCount, currentTop + c.cubeCount);
              if (effectiveRed <= 0) continue;
              const fallDist = effectiveRed * cellHeight;
              const waveDelay = Math.abs(col - placed.dropColumn) * 20;

              for (let i = 0; i < effectiveRed; i++) {
                fallCubes.push(
                  <rect
                    key={`reveal-ifall-${placed.id}-${col}-${i}`}
                    x={colToX(col) + 0.5}
                    y={rowToY(currentTop + effectiveRed + i) + 0.5}
                    width={CELL_SIZE - 1}
                    height={cellHeight - 1}
                    fill={color}
                    rx={2}
                    className="bg-graph__cube--intervention-fall"
                    style={{
                      animationDelay: `${waveDelay}ms`,
                      '--fall-dist': `${fallDist}px`,
                    } as React.CSSProperties}
                  />
                );
              }
            }
          }

          if (fallCubes.length === 0) return null;
          return <g pointerEvents="none">{fallCubes}</g>;
        })()}

        {/* Meteor drop animation — insulin rain falling at 70° angle */}
        {bombDrops.length > 0 && (
          <g pointerEvents="none">
            {bombDrops.map(drop => (
              <ellipse
                key={drop.id}
                cx={drop.cx}
                cy={drop.cy}
                rx={2.5}
                ry={6}
                fill={drop.burnColor}
                className={drop.burnColor === '#f59e0b' ? 'bg-graph__drop--boost' : 'bg-graph__drop'}
                style={{
                  '--drop-dx': `${drop.dx}px`,
                  '--drop-dy': `${drop.dy}px`,
                  animationDelay: `${drop.delay}ms`,
                } as React.CSSProperties}
              />
            ))}
          </g>
        )}

        {/* Exiting cubes — burn-out animation for removed food */}
        {exitingCubes.length > 0 && (
          <g className="bg-graph__exit-cubes" pointerEvents="none">
            {exitingCubes.map((cube, i) => {
              const waveDelay = Math.abs(cube.col - cube.dropColumn) * 15;
              return (
                <rect
                  key={`exit-${i}`}
                  x={colToX(cube.col) + 0.5}
                  y={rowToY(cube.row) + 0.5}
                  width={CELL_SIZE - 1}
                  height={cellHeight - 1}
                  fill={cube.color}
                  rx={2}
                  className="bg-graph__cube--exiting"
                  style={{ animationDelay: `${waveDelay}ms` }}
                />
              );
            })}
          </g>
        )}

        {/* Individual skylines — hidden, contrast via alternating food colors instead */}

        {/* BG skyline — disabled */}

        {/* Penalty highlight overlays (after submit) */}
        {showDangerZone && graphRenderData.layers.map(layer =>
          layer.cubes
            .filter(cube => cube.status === 'normal')
            .map(cube => {
              const isOrange = cube.row >= PENALTY_ORANGE_ROW && cube.row < PENALTY_RED_ROW;
              const isRed = cube.row >= PENALTY_RED_ROW;
              if (!isOrange && !isRed) return null;
              const waveDelay = cube.col * 15;
              return (
                <rect
                  key={`penalty-${layer.placementId}-${cube.col}-${cube.row}`}
                  x={colToX(cube.col) + 0.5}
                  y={rowToY(cube.row) + 0.5}
                  width={CELL_SIZE - 1}
                  height={cellHeight - 1}
                  fill={isRed ? 'rgba(245, 101, 101, 0.7)' : 'rgba(237, 137, 54, 0.6)'}
                  rx={2}
                  className="bg-graph__cube--penalty"
                  style={{ animationDelay: `${waveDelay}ms` }}
                  pointerEvents="none"
                />
              );
            })
        )}

        {/* Penalty threshold line at 200 mg/dL (shown during danger-flash and beyond) */}
        {(showDangerZone || showHatchFlash) && (
          <line
            x1={PAD_LEFT}
            y1={rowToY(PENALTY_ORANGE_ROW - 1)}
            x2={PAD_LEFT + GRAPH_W}
            y2={rowToY(PENALTY_ORANGE_ROW - 1)}
            stroke="#e53e3e"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            opacity={0.8}
          />
        )}

        {/* Reveal phase label overlay */}
        {revealPhase !== undefined && revealPhase >= 1 && (() => {
          const labels: Record<number, { emoji: string; text: string }> = {
            1: { emoji: '🍽️', text: 'Food Cubes' },
            2: { emoji: '🟠', text: 'Pancreas' },
            3: { emoji: '🏃', text: 'Exercise' },
            4: { emoji: '💊', text: 'Medications' },
          };
          const label = labels[revealPhase];
          if (!label) return null;
          return (
            <foreignObject
              x={PAD_LEFT + GRAPH_W - 175}
              y={PAD_TOP + 6}
              width={170}
              height={36}
            >
              <div key={revealPhase} className="bg-graph__reveal-label">
                <span className="reveal-label__emoji">{label.emoji}</span>
                <span className="reveal-label__text">{label.text}</span>
              </div>
            </foreignObject>
          );
        })()}

        {/* Y axis labels — rendered last so they appear on top of all layers */}
        {(() => {
          const maxMgDl = GRAPH_CONFIG.bgMin + effectiveRows * GRAPH_CONFIG.cellHeightMgDl;
          const labels: React.ReactNode[] = [];
          for (let mgDl = 100; mgDl < maxMgDl; mgDl += 100) {
            const rowFrac = (mgDl - GRAPH_CONFIG.bgMin) / GRAPH_CONFIG.cellHeightMgDl;
            labels.push(
              <text
                key={`y-${mgDl}`}
                x={PAD_LEFT + 6}
                y={PAD_TOP + graphH - rowFrac * cellHeight + 6}
                fontSize={18}
                fontWeight={600}
                fill="#ffffff"
                stroke="#1e3a5f"
                strokeWidth={3}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {mgDl}
              </text>
            );
          }
          return labels;
        })()}

      </svg>
  );
}

