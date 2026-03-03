import { useMemo, useRef, useState, useLayoutEffect, useEffect } from 'react';
import type { Ship, PlacedFood, PlacedIntervention, Intervention, GameSettings, MedicationModifiers, BoostConfig } from '../../core/types';
import {
  TOTAL_COLUMNS,
  TOTAL_ROWS,
  DEFAULT_X_TICKS,
  DEFAULT_Y_TICKS,
  DEFAULT_MEDICATION_MODIFIERS,
  PENALTY_ORANGE_ROW,
  PENALTY_RED_ROW,
  GRAPH_CONFIG,
  columnToTimeString,
  formatBgValue,
} from '../../core/types';
import { calculateCurve, calculateInterventionCurve, applyMedicationToFood, calculateSglt2Reduction, calculateBoostReduction } from '../../core/cubeEngine';
import type { InsulinParams } from '../../core/cubeEngine';
import './BgGraph.css';

// SVG layout constants
const CELL_SIZE = 18;
const PAD_LEFT = 38;
const PAD_TOP = 8;
const PAD_RIGHT = 8;
const PAD_BOTTOM = 18;

const GRAPH_W = TOTAL_COLUMNS * CELL_SIZE;
const GRAPH_H = TOTAL_ROWS * CELL_SIZE;
const SVG_W = PAD_LEFT + GRAPH_W + PAD_RIGHT;
const SVG_H = PAD_TOP + GRAPH_H + PAD_BOTTOM;

// BG zone thresholds (mg/dL)
const ZONE_NORMAL = 140;
const ZONE_ELEVATED = 200;
const ZONE_HIGH = 300;

// Insulin floor: insulin cannot eat below this row (100 mg/dL)
const INSULIN_FLOOR_ROW = 2; // (100 - 60) / 20 = 2

// Fixed blue palette: each food gets a progressively darker shade
const FOOD_PALETTE = [
  '#7dd3fc', // sky-300 — light blue (голубой)
  '#38bdf8', // sky-400
  '#0ea5e9', // sky-500
  '#0284c7', // sky-600
  '#0369a1', // sky-700
  '#075985', // sky-800
  '#0c4a6e', // sky-900 — dark navy
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
  plateauCount: number;  // total cubes at plateau (before insulin eating)
  aliveCount: number;    // cubes remaining after insulin eating
  eatenCount: number;    // cubes insulin ate (cumulative)
  drainCount: number;    // cubes insulin drains THIS column (incremental)
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
  digestCubes: FoodRenderCube[]; // cubes insulin ate (positioned above food's alive zone)
  colSummary: FoodColumnSummary[];
  skylinePath: string | null;
}

interface MedCube {
  col: number;
  row: number;
  color: string;
}

interface GraphRenderData {
  layers: FoodRenderLayer[];
  mainSkylinePath: string;
  columnCaps: number[];
  plateauHeights: number[];
  pancreasCaps: number[];
  medCubes: MedCube[];
  effectiveRows: number;
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
  decayOrInsulin: number | InsulinParams;
  boostConfig?: BoostConfig;
  medicationModifiers?: MedicationModifiers;
  showPenaltyHighlight?: boolean;
  revealPhase?: number; // undefined = all visible, 0-4 = progressive layer reveal
  previewShip?: Ship;        // food being dragged (for preview on graph)
  previewColumn?: number;    // target column for preview
  previewIntervention?: Intervention;   // intervention being dragged
  previewInterventionColumn?: number;   // target column for intervention preview
  stressSlots?: Set<number>;            // slot indices with stress (reduced insulin)
}

// Convert column to SVG x
function colToX(col: number): number {
  return PAD_LEFT + col * CELL_SIZE;
}

// Convert mg/dL to row index
function mgdlToRow(mgdl: number): number {
  return (mgdl - GRAPH_CONFIG.bgMin) / GRAPH_CONFIG.cellHeightMgDl;
}

export function BgGraph({
  placedFoods,
  allShips,
  placedInterventions,
  allInterventions,
  settings,
  decayOrInsulin,
  boostConfig,
  medicationModifiers = DEFAULT_MEDICATION_MODIFIERS,
  showPenaltyHighlight = false,
  revealPhase,
  previewShip,
  previewColumn,
  previewIntervention,
  previewInterventionColumn,
  stressSlots,
}: BgGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Exit animation state
  const prevLayersRef = useRef<FoodRenderLayer[]>([]);
  const [exitingCubes, setExitingCubes] = useState<ExitingCube[]>([]);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Digest animation state: tracks foods currently in "insulin eating" animation
  const [digestingFoodIds, setDigestingFoodIds] = useState<Set<string>>(new Set());
  const digestTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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
  // Replaces 7 separate useMemo hooks (foodCubeData, pancreasCaps, plateauHeights,
  // columnCaps, foodSkylinePaths, markerData, skylinePath) with one coherent pass.
  // Every cube is pre-stamped with status (normal/burned/pancreas), markers and
  // skylines are derived from the SAME data that stamps cubes — no desync possible.
  const graphRenderData = useMemo((): GraphRenderData => {
    // Phase 1: Per-column insulin eating model.
    // Uses ONLY plateau curves. Insulin eating computed per-column with 100 mg/dL floor.
    // Foods stacked by alive heights (after eating).
    const aliveStacks = new Array(TOTAL_COLUMNS).fill(0);
    const plateauHeights = new Array(TOTAL_COLUMNS).fill(0);
    const originalPlateauHeights = new Array(TOTAL_COLUMNS).fill(0);
    const afterMetPlateauHeights = new Array(TOTAL_COLUMNS).fill(0);
    // Decompose medication: Metformin-only glucose multiplier (undo GLP-1's glucose effect)
    const metOnlyGlucoseMult = medicationModifiers.glp1GlucoseMultiplier !== 1
      ? medicationModifiers.glucoseMultiplier / medicationModifiers.glp1GlucoseMultiplier
      : medicationModifiers.glucoseMultiplier;
    const hasMedEffect = medicationModifiers.glucoseMultiplier < 1 || medicationModifiers.durationMultiplier > 1;

    // Determine insulin mode
    const isInsulinProfile = typeof decayOrInsulin !== 'number';
    const insulinRates = isInsulinProfile ? (decayOrInsulin as InsulinParams).rates : null;

    const rawFoods: Array<{
      placementId: string;
      shipId: string;
      dropColumn: number;
      color: string;
      emoji: string;
      carbs: number;
      columns: Array<{ col: number; baseRow: number; aliveCount: number; plateauCount: number; eatenCount: number; drainCount: number }>;
    }> = [];

    for (const placed of placedFoods) {
      const ship = allShips.find(s => s.id === placed.shipId);
      if (!ship) continue;
      const { glucose, duration } = applyMedicationToFood(ship.load, ship.duration, medicationModifiers);

      // Always compute plateau curve (full height, no eating)
      const plateauCurve = calculateCurve(glucose, duration, placed.dropColumn, 0);

      // For legacy numeric decay, compute decay curve for comparison
      const legacyDecayCurve = (!isInsulinProfile && (decayOrInsulin as number) > 0)
        ? calculateCurve(glucose, duration, placed.dropColumn, decayOrInsulin)
        : null;
      const legacyDecayMap: Record<number, number> = {};
      if (legacyDecayCurve) {
        for (const dc of legacyDecayCurve) {
          const graphCol = placed.dropColumn + dc.columnOffset;
          if (graphCol >= 0 && graphCol < TOTAL_COLUMNS) legacyDecayMap[graphCol] = dc.cubeCount;
        }
      }

      // Accumulate plateauHeights (for Y-axis expansion & preview)
      for (const pc of plateauCurve) {
        const graphCol = placed.dropColumn + pc.columnOffset;
        if (graphCol >= 0 && graphCol < TOTAL_COLUMNS) {
          plateauHeights[graphCol] += pc.cubeCount;
        }
      }

      // Original (unmedicated) + after-Metformin-only plateau heights for medication cube display
      if (hasMedEffect) {
        const origCurve = calculateCurve(ship.load, ship.duration, placed.dropColumn, 0);
        for (const oc of origCurve) {
          const graphCol = placed.dropColumn + oc.columnOffset;
          if (graphCol >= 0 && graphCol < TOTAL_COLUMNS) {
            originalPlateauHeights[graphCol] += oc.cubeCount;
          }
        }
        const afterMetGlucose = ship.load * metOnlyGlucoseMult;
        const afterMetCurve = calculateCurve(afterMetGlucose, ship.duration, placed.dropColumn, 0);
        for (const mc of afterMetCurve) {
          const graphCol = placed.dropColumn + mc.columnOffset;
          if (graphCol >= 0 && graphCol < TOTAL_COLUMNS) {
            afterMetPlateauHeights[graphCol] += mc.cubeCount;
          }
        }
      }

      // Build column entries from PLATEAU curve, compute per-column eating
      // Insulin eating: per-column during ramp-up, CUMULATIVE after peak
      const riseCols = Math.max(1, Math.round(duration / GRAPH_CONFIG.cellWidthMin));
      let cumInsulin = 0; // accumulates only after ramp-up
      let prevEatenCount = 0; // for computing incremental drain (legacy mode)

      const cols: Array<{ col: number; baseRow: number; aliveCount: number; plateauCount: number; eatenCount: number; drainCount: number }> = [];
      for (const pc of plateauCurve) {
        const graphCol = placed.dropColumn + pc.columnOffset;
        if (graphCol < 0 || graphCol >= TOTAL_COLUMNS) continue;
        const baseRow = aliveStacks[graphCol];
        const plateauCount = pc.cubeCount;

        let eatenCount: number;
        let drainCount: number;
        if (insulinRates) {
          const rate = graphCol < insulinRates.length ? insulinRates[graphCol] : 0;
          const absoluteTop = baseRow + plateauCount;
          const effectiveFloor = Math.max(baseRow, INSULIN_FLOOR_ROW);
          const cubesAboveFloor = Math.max(0, absoluteTop - effectiveFloor);

          if (pc.columnOffset < riseCols) {
            // Ramp-up: per-column eating (not cumulative)
            eatenCount = Math.min(rate, cubesAboveFloor);
          } else {
            // Post-peak: cumulative eating — creates natural decay slope
            cumInsulin += rate;
            eatenCount = Math.min(cumInsulin, cubesAboveFloor);
          }
          // Flat drain visualization: show insulin rate per column (constant depth)
          drainCount = Math.min(rate, cubesAboveFloor);
        } else if (legacyDecayCurve) {
          // Legacy: use decay curve difference
          const decayCount = legacyDecayMap[graphCol] ?? plateauCount;
          eatenCount = Math.max(0, plateauCount - decayCount);
          drainCount = eatenCount - prevEatenCount;
          prevEatenCount = eatenCount;
        } else {
          eatenCount = 0;
          drainCount = 0;
        }

        const aliveCount = plateauCount - eatenCount;
        cols.push({ col: graphCol, baseRow, aliveCount, plateauCount, eatenCount, drainCount });
        aliveStacks[graphCol] += aliveCount;
      }

      rawFoods.push({
        placementId: placed.id,
        shipId: placed.shipId,
        dropColumn: placed.dropColumn,
        color: '',
        emoji: ship.emoji,
        carbs: ship.carbs ?? 0,
        columns: cols,
      });
    }

    // Assign progressive blue colors
    for (let i = 0; i < rawFoods.length; i++) {
      rawFoods[i].color = getFoodColor(i);
    }

    // Dynamic Y-axis expansion: compute from ACTUAL visible heights (not raw plateau)
    // Visible layers: alive cubes + drain cubes + medication cubes
    let maxVisibleRow = 0;
    for (const food of rawFoods) {
      for (const c of food.columns) {
        const topRow = c.baseRow + c.aliveCount + (c.aliveCount > 0 ? c.drainCount : 0);
        if (topRow > maxVisibleRow) maxVisibleRow = topRow;
      }
    }
    if (hasMedEffect) {
      for (let col = 0; col < TOTAL_COLUMNS; col++) {
        const medReduction = Math.max(0, originalPlateauHeights[col] - plateauHeights[col]);
        const medTop = aliveStacks[col] + medReduction;
        if (medTop > maxVisibleRow) maxVisibleRow = medTop;
      }
    }
    maxVisibleRow += 5; // buffer for visual padding
    const effectiveRows = maxVisibleRow <= TOTAL_ROWS
      ? TOTAL_ROWS
      : TOTAL_ROWS + Math.ceil((maxVisibleRow - TOTAL_ROWS) / 5) * 5;
    const cellHeight = GRAPH_H / effectiveRows;

    // pancreasCaps = sum of alive heights (after insulin eating)
    const pancreasCaps = aliveStacks;

    // Phase 3: ColumnCaps (pancreas − boost − interventions − SGLT2)
    const boostReduction = boostConfig
      ? calculateBoostReduction(pancreasCaps, boostConfig)
      : new Array(TOTAL_COLUMNS).fill(0);
    const afterBoost = pancreasCaps.map((h, i) => Math.max(0, h - boostReduction[i]));
    const sglt2 = medicationModifiers.sglt2;
    const sglt2Reduction = sglt2
      ? calculateSglt2Reduction(afterBoost, sglt2.depth, sglt2.floorRow)
      : new Array(TOTAL_COLUMNS).fill(0);
    const columnCaps = afterBoost.map((h, i) =>
      Math.max(0, h - interventionReduction[i] - sglt2Reduction[i])
    );

    // Phase 4: Per-food layers — stamp cubes, compute markers and skylines
    // Alive cubes use decay-stacked positions. Digest cubes (insulin-eaten) positioned above food's own alive zone.
    const hasMultipleFoods = rawFoods.length >= 2;
    const bottomY = PAD_TOP + GRAPH_H;
    const layers: FoodRenderLayer[] = rawFoods.map((food) => {
      const cubes: FoodRenderCube[] = [];
      const digestCubes: FoodRenderCube[] = [];
      const colSummary: FoodColumnSummary[] = [];

      for (const c of food.columns) {
        let topNormalRow = c.baseRow;

        // Alive cubes (positioned by decay stacking — guaranteed below pancreasCaps)
        for (let cubeIdx = 0; cubeIdx < c.aliveCount; cubeIdx++) {
          const row = c.baseRow + cubeIdx;
          if (row >= effectiveRows) break;

          let status: CubeStatus;
          let burnColor: string | undefined;
          if (row >= columnCaps[c.col]) {
            status = 'burned';
            // Determine burn source by row position within burned zone
            // Stacking order (bottom → top): walk → run → SGLT2 → boost
            const offset = row - columnCaps[c.col];
            const walkR = interventionReductions.walk[c.col];
            const runR = interventionReductions.run[c.col];
            const sglt2R = sglt2Reduction[c.col];
            if (offset < walkR) {
              burnColor = '#86efac'; // light green (walk)
            } else if (offset < walkR + runR) {
              burnColor = '#22c55e'; // darker green (run)
            } else if (offset < walkR + runR + sglt2R) {
              burnColor = '#c084fc'; // purple (SGLT2)
            } else {
              burnColor = '#f59e0b'; // amber-500 (BOOST)
            }
          } else {
            status = 'normal';
            topNormalRow = row + 1;
          }
          cubes.push({ col: c.col, row, status, burnColor });
        }

        // Digest cubes — flat insulin drain (constant depth = rate per column, on top of alive zone)
        if (c.aliveCount > 0) {
          for (let i = 0; i < c.drainCount; i++) {
            const row = c.baseRow + c.aliveCount + i;
            if (row >= effectiveRows) break;
            digestCubes.push({ col: c.col, row, status: 'normal' });
          }
        }

        // aliveTop: food's own alive boundary (for markers — stable, independent)
        const aliveTop = Math.min(c.baseRow + c.aliveCount, effectiveRows);
        // skylineRow: clamped by columnCaps (for skyline paths — descends with interventions)
        const skylineRow = Math.min(aliveTop, columnCaps[c.col]);

        colSummary.push({
          col: c.col,
          baseRow: c.baseRow,
          plateauCount: c.plateauCount,
          aliveCount: c.aliveCount,
          eatenCount: c.eatenCount,
          drainCount: c.drainCount,
          topNormalRow,
          aliveTop,
          skylineRow,
        });
      }

      // Skyline path: trace boundary of food's ALIVE (unburned) cubes
      // Uses skylineRow (clamped by columnCaps) so skylines descend when interventions burn cubes
      let skylinePath: string | null = null;
      if (hasMultipleFoods) {
        const parts: string[] = [];
        let inSeg = false;
        let prevCol = -2;
        let lastBaseY = bottomY;
        for (const cs of colSummary) {
          const baseY = PAD_TOP + GRAPH_H - cs.baseRow * cellHeight;
          if (cs.skylineRow <= cs.baseRow) {
            if (inSeg) { parts.push(`V ${lastBaseY}`); inSeg = false; }
            prevCol = cs.col;
            continue;
          }
          const y = PAD_TOP + GRAPH_H - cs.skylineRow * cellHeight;
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
        if (parts.length > 0) {
          skylinePath = parts.join(' ');
        }
      }

      return {
        placementId: food.placementId,
        shipId: food.shipId,
        dropColumn: food.dropColumn,
        color: food.color,
        emoji: food.emoji,
        carbs: food.carbs,
        cubes,
        digestCubes,
        colSummary,
        skylinePath,
      };
    });

    // Phase 5: Main skyline path from columnCaps
    const mainParts: string[] = [];
    let inSegment = false;
    for (let col = 0; col < TOTAL_COLUMNS; col++) {
      const h = columnCaps[col];
      if (h <= 0) {
        if (inSegment) { mainParts.push(`V ${bottomY}`); inSegment = false; }
        continue;
      }
      const y = PAD_TOP + GRAPH_H - h * cellHeight;
      if (!inSegment) {
        mainParts.push(`M ${colToX(col)} ${bottomY}`);
        mainParts.push(`V ${y}`);
        inSegment = true;
      } else {
        const prevH = columnCaps[col - 1];
        if (prevH !== h) {
          mainParts.push(`V ${y}`);
        }
      }
      mainParts.push(`H ${colToX(col) + CELL_SIZE}`);
    }
    if (inSegment) mainParts.push(`V ${bottomY}`);
    const mainSkylinePath = mainParts.length > 0 ? mainParts.join(' ') : '';

    // Phase 6: Medication cubes — show what medications prevented (above pancreas zone)
    const medCubes: MedCube[] = [];
    if (hasMedEffect) {
      const MET_COLOR = '#f0abfc';  // fuchsia-300 (Metformin)
      const GLP1_COLOR = '#a78bfa'; // violet-400 (GLP-1)
      for (let col = 0; col < TOTAL_COLUMNS; col++) {
        const metReduction = Math.max(0, originalPlateauHeights[col] - afterMetPlateauHeights[col]);
        const glp1Reduction = Math.max(0, afterMetPlateauHeights[col] - plateauHeights[col]);
        const baseRow = pancreasCaps[col];
        // Stack: Metformin cubes first (bottom), then GLP-1 cubes (top)
        for (let i = 0; i < metReduction; i++) {
          const row = baseRow + i;
          if (row >= effectiveRows) break;
          medCubes.push({ col, row, color: MET_COLOR });
        }
        for (let i = 0; i < glp1Reduction; i++) {
          const row = baseRow + metReduction + i;
          if (row >= effectiveRows) break;
          medCubes.push({ col, row, color: GLP1_COLOR });
        }
      }
    }

    return { layers, mainSkylinePath, columnCaps, plateauHeights, pancreasCaps, medCubes, effectiveRows };
  }, [placedFoods, allShips, medicationModifiers, decayOrInsulin, boostConfig, interventionReduction, interventionReductions]);

  // Dynamic Y-axis: cellHeight adapts when cubes exceed default 400 mg/dL
  const { effectiveRows } = graphRenderData;
  const cellHeight = GRAPH_H / effectiveRows;
  const rowToY = (row: number) => PAD_TOP + GRAPH_H - (row + 1) * cellHeight;

  // Preview: alive cubes (post-insulin) + incremental drain layer on top of alive skyline
  const previewData = useMemo(() => {
    if (!previewShip || previewColumn === undefined) return null;

    const isInsulinProfile = typeof decayOrInsulin !== 'number';
    const insulinRates = isInsulinProfile ? (decayOrInsulin as InsulinParams).rates : null;

    const { glucose, duration } = applyMedicationToFood(previewShip.load, previewShip.duration, medicationModifiers);
    const plateauCurve = calculateCurve(glucose, duration, previewColumn, 0);
    const riseCols = Math.max(1, Math.round(duration / GRAPH_CONFIG.cellWidthMin));

    const { pancreasCaps } = graphRenderData;
    const foodCubes: Array<{ col: number; row: number }> = [];
    const wrapCubes: Array<{ col: number; row: number }> = [];

    let cumInsulin = 0;

    for (const pc of plateauCurve) {
      const col = previewColumn + pc.columnOffset;
      if (col < 0 || col >= TOTAL_COLUMNS) continue;
      const baseRow = pancreasCaps[col];
      const plateauCount = pc.cubeCount;

      // Compute insulin eating (same algorithm as main render)
      let eatenCount = 0;
      let drainCount = 0;
      if (insulinRates) {
        const rate = col < insulinRates.length ? insulinRates[col] : 0;
        const absoluteTop = baseRow + plateauCount;
        const effectiveFloor = Math.max(baseRow, INSULIN_FLOOR_ROW);
        const cubesAboveFloor = Math.max(0, absoluteTop - effectiveFloor);

        if (pc.columnOffset < riseCols) {
          eatenCount = Math.min(rate, cubesAboveFloor);
        } else {
          cumInsulin += rate;
          eatenCount = Math.min(cumInsulin, cubesAboveFloor);
        }
        // Flat drain visualization: constant depth = rate per column
        drainCount = Math.min(rate, cubesAboveFloor);
      }

      const aliveCount = plateauCount - eatenCount;

      // Alive cubes — final result after insulin eating
      for (let i = 0; i < aliveCount; i++) {
        const row = baseRow + i;
        if (row >= effectiveRows) break;
        foodCubes.push({ col, row });
      }

      // Insulin drain layer — flat rate on top of alive skyline (only where food exists)
      if (aliveCount > 0) {
        for (let i = 0; i < drainCount; i++) {
          const row = baseRow + aliveCount + i;
          if (row >= effectiveRows) break;
          wrapCubes.push({ col, row });
        }
      }
    }

    return { foodCubes, wrapCubes, dropColumn: previewColumn };
  }, [previewShip, previewColumn, medicationModifiers, decayOrInsulin, graphRenderData, effectiveRows]);

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
      for (let i = 0; i < wrapCount; i++) {
        const row = currentTop + i; // ABOVE food stack (wrap style)
        if (row >= effectiveRows) break;
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

    // Detect added foods → digest animation (insulin eating)
    const added = graphRenderData.layers.filter(l => !prevIds.has(l.placementId));
    if (added.length > 0) {
      setDigestingFoodIds(prev => {
        const next = new Set(prev);
        for (const a of added) next.add(a.placementId);
        return next;
      });
      for (const a of added) {
        const timer = setTimeout(() => {
          setDigestingFoodIds(prev => {
            const next = new Set(prev);
            next.delete(a.placementId);
            return next;
          });
          digestTimersRef.current.delete(a.placementId);
        }, 2000); // 1.6s animation + buffer
        digestTimersRef.current.set(a.placementId, timer);
      }
    }

    prevLayersRef.current = graphRenderData.layers;
  }, [graphRenderData.layers]);

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

  // Cleanup timers on unmount
  useEffect(() => () => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    for (const timer of digestTimersRef.current.values()) clearTimeout(timer);
    for (const timer of burningIntTimersRef.current.values()) clearTimeout(timer);
  }, []);

  // Dynamic zone clip bands (Y-positions depend on cellHeight)
  const zoneClipBands = [
    { id: 'zone-clip-green', color: '#48bb78',
      yTop: PAD_TOP + GRAPH_H - 4 * cellHeight - 3, yBot: PAD_TOP + GRAPH_H + 3 },
    { id: 'zone-clip-yellow', color: '#ecc94b',
      yTop: PAD_TOP + GRAPH_H - 7 * cellHeight - 3, yBot: PAD_TOP + GRAPH_H - 4 * cellHeight + 3 },
    { id: 'zone-clip-orange', color: '#ed8936',
      yTop: PAD_TOP + GRAPH_H - 12 * cellHeight - 3, yBot: PAD_TOP + GRAPH_H - 7 * cellHeight + 3 },
    { id: 'zone-clip-red', color: '#fc8181',
      yTop: PAD_TOP - 3, yBot: PAD_TOP + GRAPH_H - 12 * cellHeight + 3 },
  ];

  // Dynamic Y-axis tick labels (extend beyond 400 when graph expands)
  const yTicks = [...DEFAULT_Y_TICKS];
  const maxMgDl = GRAPH_CONFIG.bgMin + effectiveRows * GRAPH_CONFIG.cellHeightMgDl;
  for (let tick = 500; tick <= maxMgDl; tick += 100) {
    yTicks.push(tick);
  }


  return (
    <div className="bg-graph">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="bg-graph__svg"
        preserveAspectRatio="xMidYMid meet"
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
        </defs>

        {/* Zone backgrounds */}
        <rect
          x={PAD_LEFT}
          y={rowToY(mgdlToRow(ZONE_NORMAL) - 1)}
          width={GRAPH_W}
          height={(mgdlToRow(ZONE_NORMAL) - 0) * cellHeight}
          fill="#c6f6d5"
          opacity={0.3}
        />
        <rect
          x={PAD_LEFT}
          y={rowToY(mgdlToRow(ZONE_ELEVATED) - 1)}
          width={GRAPH_W}
          height={(mgdlToRow(ZONE_ELEVATED) - mgdlToRow(ZONE_NORMAL)) * cellHeight}
          fill="#fefcbf"
          opacity={0.3}
        />
        <rect
          x={PAD_LEFT}
          y={rowToY(mgdlToRow(ZONE_HIGH) - 1)}
          width={GRAPH_W}
          height={(mgdlToRow(ZONE_HIGH) - mgdlToRow(ZONE_ELEVATED)) * cellHeight}
          fill="#fed7d7"
          opacity={0.3}
        />
        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={GRAPH_W}
          height={(effectiveRows - mgdlToRow(ZONE_HIGH)) * cellHeight}
          fill="#fc8181"
          opacity={0.2}
        />

        {/* Stress zone column bands */}
        {stressSlots && stressSlots.size > 0 && Array.from(stressSlots).map(slotIndex => {
          const startCol = slotIndex * 4;
          return (
            <rect
              key={`stress-zone-${slotIndex}`}
              x={colToX(startCol)}
              y={PAD_TOP}
              width={CELL_SIZE * 4}
              height={GRAPH_H}
              fill="#ef4444"
              opacity={0.08}
              pointerEvents="none"
            />
          );
        })}

        {/* Grid lines - vertical (time) */}
        {Array.from({ length: TOTAL_COLUMNS + 1 }, (_, i) => (
          <line
            key={`v-${i}`}
            x1={colToX(i)}
            y1={PAD_TOP}
            x2={colToX(i)}
            y2={PAD_TOP + GRAPH_H}
            stroke="#e2e8f0"
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
            stroke="#e2e8f0"
            strokeWidth={0.3}
          />
        ))}

        {/* Graph border */}
        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={GRAPH_W}
          height={GRAPH_H}
          fill="none"
          stroke="#a0aec0"
          strokeWidth={1}
        />

        {/* Stress zone boundary lines and markers */}
        {stressSlots && stressSlots.size > 0 && Array.from(stressSlots).flatMap(slotIndex => {
          const startCol = slotIndex * 4;
          const endCol = startCol + 4;
          const centerX = colToX(startCol) + (CELL_SIZE * 4) / 2;
          return [
            <line
              key={`stress-left-${slotIndex}`}
              x1={colToX(startCol)}
              y1={PAD_TOP}
              x2={colToX(startCol)}
              y2={PAD_TOP + GRAPH_H}
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
              y2={PAD_TOP + GRAPH_H}
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

        {/* Y axis labels */}
        {yTicks.map(tick => {
          const row = mgdlToRow(tick);
          if (row > effectiveRows) return null;
          const y = rowToY(row - 1) + cellHeight / 2;
          return (
            <text
              key={`y-${tick}`}
              x={PAD_LEFT - 3}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={7}
              fill="#718096"
            >
              {formatBgValue(tick, settings.bgUnit)}
            </text>
          );
        })}

        {/* X axis labels */}
        {DEFAULT_X_TICKS.map(hour => {
          const col = ((hour - GRAPH_CONFIG.startHour) * 60) / GRAPH_CONFIG.cellWidthMin;
          const x = colToX(col);
          return (
            <text
              key={`x-${hour}`}
              x={x}
              y={PAD_TOP + GRAPH_H + 12}
              textAnchor="middle"
              fontSize={7}
              fill="#718096"
            >
              {columnToTimeString(col, settings.timeFormat)}
            </text>
          );
        })}

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

        {/* Drag preview: alive cubes + incremental insulin drain layer */}
        {previewData && (
          <g className="bg-graph__preview" pointerEvents="none">
            {/* Alive cubes — final result after insulin eating */}
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
            {/* Insulin drain — amber cubes showing per-column drain depth */}
            {previewData.wrapCubes.map(cube => (
              <rect
                key={`preview-wrap-${cube.col}-${cube.row}`}
                x={colToX(cube.col) + 0.5}
                y={rowToY(cube.row) + 0.5}
                width={CELL_SIZE - 1}
                height={cellHeight - 1}
                fill="#f59e0b"
                opacity={0.5}
                rx={2}
                className="bg-graph__cube--preview"
                stroke="#d97706"
                strokeWidth={0.5}
              />
            ))}
          </g>
        )}

        {/* Per-food cube layers: last placed rendered first (bottom), first placed last (top) */}
        {[...graphRenderData.layers].reverse().map(layer => (
          <g key={`food-layer-${layer.placementId}`} className="bg-graph__food-group">
            {layer.cubes
              .filter(cube => {
                // Hide exercise-burned cubes entirely (they disappear after intervention fall animation)
                if (cube.status === 'burned') {
                  const isExercise = cube.burnColor === '#86efac' || cube.burnColor === '#22c55e';
                  if (isExercise) return false;
                }
                // During reveal, progressively show cube layers
                if (revealPhase === undefined) return true;
                if (cube.status === 'normal') return revealPhase >= 1;
                if (cube.status === 'burned') return revealPhase >= 4; // only SGLT2 remains
                return false;
              })
              .map(cube => {
              const waveDelay = (cube.col - layer.dropColumn) * 20;
              const cubeClass = cube.status === 'burned'
                ? 'bg-graph__cube--burned'
                : 'bg-graph__cube';
              let cubeFill: string;
              if (cube.status === 'burned' && cube.burnColor) {
                cubeFill = cube.burnColor;
              } else if (revealPhase !== undefined || showPenaltyHighlight) {
                // Results phase: color cubes by danger zone
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
              return (
                <rect
                  key={`${layer.placementId}-${cube.col}-${cube.row}`}
                  x={colToX(cube.col) + 0.5}
                  y={rowToY(cube.row) + 0.5}
                  width={CELL_SIZE - 1}
                  height={cellHeight - 1}
                  fill={cubeFill}
                  rx={2}
                  className={cubeClass}
                  style={{ animationDelay: `${waveDelay}ms` }}
                />
              );
            })}
          </g>
        ))}

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

        {/* Intervention fall animation — green cubes falling into food */}
        {burningInterventions.size > 0 && (
          <g pointerEvents="none">
            {Array.from(burningInterventions.values()).flatMap(bi => {
              const { columnCaps } = graphRenderData;
              return bi.reduction.flatMap((red, col) => {
                if (red <= 0) return [];
                const currentTop = columnCaps[col];
                const effectiveRed = Math.min(red, currentTop + red);
                if (effectiveRed <= 0) return [];

                const fallDist = effectiveRed * cellHeight;
                const waveDelay = Math.abs(col - bi.dropColumn) * 20;

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

        {/* Digest cubes + insulin fall animation (unified reveal/gameplay) */}
        {graphRenderData.layers.map(layer => {
          if (layer.digestCubes.length === 0) return null;

          const isReveal = revealPhase !== undefined;
          const showDigest = isReveal ? revealPhase! >= 1 : digestingFoodIds.has(layer.placementId);
          if (!showDigest) return null;

          // Phase 1 reveal: cubes appear as normal food. Phase 2+/gameplay: burn animation
          const showFall = isReveal ? revealPhase! >= 2 : true;
          const digestCls = showFall ? 'bg-graph__cube--digest-appear-burn' : 'bg-graph__cube';

          return (
            <g key={`digest-${layer.placementId}`} pointerEvents="none">
              {layer.digestCubes.map(cube => {
                const waveDelay = Math.abs(cube.col - layer.dropColumn) * 20;
                // Zone coloring for digest cubes during results
                let fill = layer.color;
                if (isReveal) {
                  if (cube.row >= PENALTY_RED_ROW) fill = '#f56565';
                  else if (cube.row >= PENALTY_ORANGE_ROW) fill = '#ed8936';
                }
                return (
                  <rect
                    key={`${layer.placementId}-digest-${cube.col}-${cube.row}`}
                    x={colToX(cube.col) + 0.5}
                    y={rowToY(cube.row) + 0.5}
                    width={CELL_SIZE - 1}
                    height={cellHeight - 1}
                    fill={fill}
                    rx={2}
                    className={digestCls}
                    style={{ animationDelay: `${waveDelay}ms` }}
                  />
                );
              })}
              {showFall && layer.colSummary
                .filter(cs => cs.drainCount > 0)
                .flatMap(cs => {
                  const drainTop = cs.baseRow + cs.aliveCount + cs.drainCount;
                  const fallDist = cs.drainCount * cellHeight;
                  const waveDelay = Math.abs(cs.col - layer.dropColumn) * 20;
                  return Array.from({ length: cs.drainCount }, (_, i) => (
                    <rect
                      key={`${layer.placementId}-ifall-${cs.col}-${i}`}
                      x={colToX(cs.col) + 0.5}
                      y={rowToY(drainTop + i) + 0.5}
                      width={CELL_SIZE - 1}
                      height={cellHeight - 1}
                      fill="#f59e0b"
                      rx={2}
                      className="bg-graph__cube--insulin-fall"
                      style={{
                        animationDelay: `${waveDelay}ms`,
                        '--fall-dist': `${fallDist}px`,
                      } as React.CSSProperties}
                    />
                  ));
                })}
            </g>
          );
        })}

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

        {/* Medication-prevented cubes (above pancreas zone) */}
        {graphRenderData.medCubes.length > 0 && (revealPhase === undefined || revealPhase >= 4) && (
          <g className="bg-graph__med-cubes" pointerEvents="none">
            {graphRenderData.medCubes.map(mc => {
              const waveDelay = mc.col * 15;
              return (
                <rect
                  key={`med-${mc.col}-${mc.row}`}
                  x={colToX(mc.col) + 0.5}
                  y={rowToY(mc.row) + 0.5}
                  width={CELL_SIZE - 1}
                  height={cellHeight - 1}
                  fill={mc.color}
                  rx={2}
                  className={revealPhase !== undefined ? 'bg-graph__cube--med-reveal' : undefined}
                  opacity={revealPhase !== undefined ? undefined : 0.45}
                  style={revealPhase !== undefined ? { animationDelay: `${waveDelay}ms` } : undefined}
                />
              );
            })}
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

        {/* Individual skylines — AFTER all cube layers so they're not hidden by upper food cubes */}
        {(revealPhase === undefined || revealPhase >= 1) && [...graphRenderData.layers].reverse().map(layer => (
          layer.skylinePath ? (
            <g key={`skyline-${layer.placementId}`} pointerEvents="none">
              <path
                d={layer.skylinePath}
                fill="none"
                stroke="rgba(0,0,0,0.18)"
                strokeWidth={5}
                strokeLinejoin="round"
                strokeLinecap="round"
                transform="translate(0, 1.5)"
              />
              <path
                d={layer.skylinePath}
                fill="none"
                stroke="white"
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          ) : null
        ))}

        {/* BG skyline — single path with rounded corners + shadow line below */}
        {graphRenderData.mainSkylinePath && (revealPhase === undefined || revealPhase >= 1) && (
          <g className="bg-graph__skyline" pointerEvents="none">
            {/* Shadow line — offset 2px below, wider, semi-transparent */}
            <path
              d={graphRenderData.mainSkylinePath}
              fill="none"
              stroke="rgba(0,0,0,0.18)"
              strokeWidth={5}
              strokeLinejoin="round"
              strokeLinecap="round"
              transform="translate(0, 2)"
            />
            {/* Zone-colored skyline — clipped per zone band */}
            {zoneClipBands.map(z => (
              <path
                key={z.id}
                d={graphRenderData.mainSkylinePath}
                fill="none"
                stroke={z.color}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
                clipPath={`url(#${z.id})`}
              />
            ))}
          </g>
        )}

        {/* Penalty highlight overlays (after submit) */}
        {showPenaltyHighlight && graphRenderData.layers.map(layer =>
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

        {/* Penalty threshold line at 200 mg/dL (shown during results) */}
        {showPenaltyHighlight && (
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
            2: { emoji: '🫠', text: 'Insulin' },
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
      </svg>
    </div>
  );
}

