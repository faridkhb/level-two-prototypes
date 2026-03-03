import type { PlacedFood, Ship, PlacedIntervention, Intervention, Medication, MedicationModifiers, PenaltyResult, InsulinMode, BoostConfig } from './types';
import { GRAPH_CONFIG, TOTAL_COLUMNS, DEFAULT_MEDICATION_MODIFIERS, PENALTY_ORANGE_ROW, PENALTY_RED_ROW, PENALTY_ORANGE_WEIGHT, PENALTY_RED_WEIGHT, calculateStars } from './types';

// === Insulin Parameters ===

export interface InsulinParams {
  rates: number[];    // 48-element array of insulin rates per column
  mode: InsulinMode;  // 'cumulative' | 'per-column'
}

export interface CubeColumn {
  columnOffset: number; // offset from drop column (0, 1, 2, ...)
  cubeCount: number;    // number of cubes (each = cellHeightMgDl) in this column
}

export interface FoodPyramid {
  placementId: string;
  shipId: string;
  dropColumn: number;
  columns: CubeColumn[];
}

/**
 * Calculate glucose curve for a food item.
 *
 * Accepts either a legacy decayRate (number) or new InsulinParams:
 *
 * **Legacy mode** (decayRate number):
 *   Continuous drain from column 0 during ramp-up and after peak.
 *   decayRate > 0: drain accumulates from first column
 *   decayRate === 0: flat plateau to the right edge
 *
 * **Insulin mode** (InsulinParams):
 *   Post-peak insulin — food rises to full peak without drain,
 *   then insulin absorbs cubes after peak.
 *   - cumulative: cumInsulin accumulates over columns → realistic decay
 *   - per-column: each column independently subtracts insulin rate → shifted plateau
 */
export function calculateCurve(
  glucose: number,
  durationMinutes: number,
  dropColumn: number,
  decayOrInsulin: number | InsulinParams = 0.25
): CubeColumn[] {
  const peakCubes = Math.round(glucose / GRAPH_CONFIG.cellHeightMgDl);
  const riseCols = Math.max(1, Math.round(durationMinutes / GRAPH_CONFIG.cellWidthMin));

  if (peakCubes <= 0) return [];

  // Dispatch: legacy number mode vs new InsulinParams
  if (typeof decayOrInsulin === 'number') {
    return _calculateCurveLegacy(peakCubes, riseCols, dropColumn, decayOrInsulin);
  }
  return _calculateCurveInsulin(peakCubes, riseCols, dropColumn, decayOrInsulin);
}

/** Legacy curve: continuous drain from column 0 (backward compat) */
function _calculateCurveLegacy(
  peakCubes: number,
  riseCols: number,
  dropColumn: number,
  decayRate: number,
): CubeColumn[] {
  const result: CubeColumn[] = [];
  const totalCols = TOTAL_COLUMNS - dropColumn;

  for (let i = 0; i < totalCols; i++) {
    let height: number;
    if (i < riseCols) {
      const rawRise = peakCubes * (i + 1) / riseCols;
      height = Math.round(rawRise - decayRate * (i + 1));
    } else if (decayRate > 0) {
      height = Math.round(peakCubes - decayRate * (i + 1));
    } else {
      height = peakCubes;
    }

    if (height <= 0) {
      if (i < riseCols) continue;
      break;
    }
    result.push({ columnOffset: i, cubeCount: height });
  }

  if (result.length === 0 && peakCubes > 0) {
    result.push({ columnOffset: riseCols - 1, cubeCount: 1 });
  }

  return result;
}

/**
 * New insulin curve: post-peak absorption.
 * Ramp-up phase has NO insulin drain — food reaches full peak.
 * After peak, insulin absorbs cubes (cumulative or per-column).
 */
function _calculateCurveInsulin(
  peakCubes: number,
  riseCols: number,
  dropColumn: number,
  insulin: InsulinParams,
): CubeColumn[] {
  const result: CubeColumn[] = [];
  const totalCols = TOTAL_COLUMNS - dropColumn;
  let cumInsulin = 0;

  for (let i = 0; i < totalCols; i++) {
    const col = dropColumn + i;
    let height: number;

    if (i < riseCols) {
      // RAMP: no insulin drain — food rises to full peak
      height = Math.round(peakCubes * (i + 1) / riseCols);
    } else {
      // POST-PEAK: insulin absorbs cubes
      const rate = col < insulin.rates.length ? insulin.rates[col] : 0;

      if (insulin.mode === 'cumulative') {
        cumInsulin += rate;
        height = Math.round(peakCubes - cumInsulin);
      } else {
        // per-column: flat subtraction (no accumulation)
        height = Math.round(peakCubes - rate);
      }
    }

    height = Math.max(0, height);
    if (height <= 0 && i >= riseCols) break;
    if (height > 0) {
      result.push({ columnOffset: i, cubeCount: height });
    }
  }

  // Guarantee at least 1 cube at peak
  if (result.length === 0 && peakCubes > 0) {
    result.push({ columnOffset: riseCols - 1, cubeCount: 1 });
  }

  return result;
}

/**
 * Calculate BOOST reduction: additional insulin drain at columns above threshold.
 * Applied as post-processing AFTER base insulin calculation.
 */
export function calculateBoostReduction(
  totalHeights: number[],
  boostConfig: BoostConfig,
): number[] {
  if (!boostConfig.active) return new Array(TOTAL_COLUMNS).fill(0);
  return totalHeights.map(h =>
    Math.min(boostConfig.extraRate, Math.max(0, h - boostConfig.thresholdRow))
  );
}

/**
 * Calculate the full graph state: BG value at each column.
 */
export function calculateGraphState(
  placedFoods: PlacedFood[],
  allShips: Ship[],
  decayOrInsulin: number | InsulinParams = 0.25
): number[] {
  const bgValues = new Array(TOTAL_COLUMNS).fill(0);

  for (const placed of placedFoods) {
    const ship = allShips.find(s => s.id === placed.shipId);
    if (!ship) continue;

    const curve = calculateCurve(ship.load, ship.duration, placed.dropColumn, decayOrInsulin);
    for (const col of curve) {
      const graphColumn = placed.dropColumn + col.columnOffset;
      if (graphColumn >= 0 && graphColumn < TOTAL_COLUMNS) {
        bgValues[graphColumn] += col.cubeCount * GRAPH_CONFIG.cellHeightMgDl;
      }
    }
  }

  return bgValues;
}

/**
 * Build detailed curve data for each placed food (for rendering).
 */
export function buildFoodPyramids(
  placedFoods: PlacedFood[],
  allShips: Ship[],
  decayOrInsulin: number | InsulinParams = 0.25
): FoodPyramid[] {
  return placedFoods.map(placed => {
    const ship = allShips.find(s => s.id === placed.shipId);
    const columns = ship ? calculateCurve(ship.load, ship.duration, placed.dropColumn, decayOrInsulin) : [];
    return {
      placementId: placed.id,
      shipId: placed.shipId,
      dropColumn: placed.dropColumn,
      columns,
    };
  });
}

/**
 * Calculate intervention curve: main phase at full depth, then tail at reduced depth.
 * Returns cubes to REMOVE per column.
 *
 * Main phase: `duration / cellWidthMin` columns at full `depth` (no ramp).
 * Tail phase: remaining columns at `boostExtra` depth (residual burn).
 */
export function calculateInterventionCurve(
  depth: number,
  durationMinutes: number,
  dropColumn: number,
  _boostCols: number = 0,
  boostExtra: number = 0,
): CubeColumn[] {
  const mainCols = Math.max(1, Math.round(durationMinutes / GRAPH_CONFIG.cellWidthMin));
  if (depth <= 0) return [];

  const result: CubeColumn[] = [];
  const totalCols = TOTAL_COLUMNS - dropColumn;

  for (let i = 0; i < totalCols; i++) {
    const height = i < mainCols ? depth : boostExtra;
    if (height <= 0) continue;
    result.push({ columnOffset: i, cubeCount: height });
  }

  return result;
}

/**
 * Calculate total intervention reduction per column (in cubes).
 */
export function calculateInterventionReduction(
  placedInterventions: PlacedIntervention[],
  allInterventions: Intervention[],
): number[] {
  const reduction = new Array(TOTAL_COLUMNS).fill(0);

  for (const placed of placedInterventions) {
    const intervention = allInterventions.find(i => i.id === placed.interventionId);
    if (!intervention) continue;

    const curve = calculateInterventionCurve(
      intervention.depth, intervention.duration, placed.dropColumn,
      intervention.boostCols ?? 0, intervention.boostExtra ?? 0,
    );
    for (const col of curve) {
      const graphCol = placed.dropColumn + col.columnOffset;
      if (graphCol >= 0 && graphCol < TOTAL_COLUMNS) {
        reduction[graphCol] += col.cubeCount;
      }
    }
  }

  return reduction;
}

// ============================================
// Medication System
// ============================================

/**
 * Aggregate modifiers from all active medications.
 */
export function computeMedicationModifiers(
  activeMedicationIds: string[],
  allMedications: Medication[],
): MedicationModifiers {
  const modifiers: MedicationModifiers = { ...DEFAULT_MEDICATION_MODIFIERS };

  for (const medId of activeMedicationIds) {
    const med = allMedications.find(m => m.id === medId);
    if (!med) continue;

    switch (med.type) {
      case 'peakReduction':
        modifiers.glucoseMultiplier *= (med.multiplier ?? 1);
        break;
      case 'thresholdDrain': {
        const floorRow = ((med.floorMgDl ?? 200) - GRAPH_CONFIG.bgMin) / GRAPH_CONFIG.cellHeightMgDl;
        modifiers.sglt2 = {
          depth: med.depth ?? 3,
          floorRow,
        };
        break;
      }
      case 'slowAbsorption': {
        const durMult = med.durationMultiplier ?? 1;
        modifiers.durationMultiplier *= durMult;
        const glcMult = med.glucoseMultiplier ?? (1 / durMult);
        modifiers.glucoseMultiplier *= glcMult;
        modifiers.glp1GlucoseMultiplier *= glcMult;
        modifiers.kcalMultiplier *= (med.kcalMultiplier ?? 1);
        modifiers.wpBonus += (med.wpBonus ?? 0);
        break;
      }
    }
  }

  return modifiers;
}

/**
 * Apply medication modifiers to food parameters before curve calculation.
 */
export function applyMedicationToFood(
  glucose: number,
  duration: number,
  modifiers: MedicationModifiers,
): { glucose: number; duration: number } {
  return {
    glucose: glucose * modifiers.glucoseMultiplier,
    duration: duration * modifiers.durationMultiplier,
  };
}

/**
 * Calculate SGLT2 threshold drain per column.
 * Removes up to `depth` cubes, but won't drain below `floorRow`.
 */
export function calculateSglt2Reduction(
  totalFoodHeights: number[],
  depth: number,
  floorRow: number,
): number[] {
  return totalFoodHeights.map(h => Math.min(depth, Math.max(0, h - floorRow)));
}

// ============================================
// Penalty / Rating Calculation
// ============================================

/**
 * Calculate penalty from effective column heights (after interventions + medications).
 * Cubes in 200-300 mg/dL (rows 7-11) = 0.5 weight each.
 * Cubes above 300 mg/dL (rows 12+) = 1.5 weight each.
 */
export function calculatePenalty(columnCaps: number[]): PenaltyResult {
  let totalPenalty = 0;
  let orangeCount = 0;
  let redCount = 0;

  for (const h of columnCaps) {
    const orange = Math.max(0, Math.min(h, PENALTY_RED_ROW) - PENALTY_ORANGE_ROW);
    const red = Math.max(0, h - PENALTY_RED_ROW);
    orangeCount += orange;
    redCount += red;
    totalPenalty += orange * PENALTY_ORANGE_WEIGHT + red * PENALTY_RED_WEIGHT;
  }

  const { stars, label } = calculateStars(totalPenalty);
  return {
    totalPenalty: Math.round(totalPenalty * 10) / 10,
    orangeCount,
    redCount,
    stars,
    label,
  };
}

/**
 * Calculate penalty from full game state (all placements + medications).
 */
export function calculatePenaltyFromState(
  placedFoods: PlacedFood[],
  allShips: Ship[],
  placedInterventions: PlacedIntervention[],
  allInterventions: Intervention[],
  medicationModifiers: MedicationModifiers,
  decayOrInsulin: number | InsulinParams,
  boostConfig?: BoostConfig,
): PenaltyResult {
  // Build food heights per column
  const totalHeights = new Array(TOTAL_COLUMNS).fill(0);
  for (const placed of placedFoods) {
    const ship = allShips.find(s => s.id === placed.shipId);
    if (!ship) continue;
    const { glucose, duration } = applyMedicationToFood(ship.load, ship.duration, medicationModifiers);
    const curve = calculateCurve(glucose, duration, placed.dropColumn, decayOrInsulin);
    for (const col of curve) {
      const graphCol = placed.dropColumn + col.columnOffset;
      if (graphCol >= 0 && graphCol < TOTAL_COLUMNS) {
        totalHeights[graphCol] += col.cubeCount;
      }
    }
  }

  // BOOST reduction (applied before interventions)
  const boostRed = boostConfig
    ? calculateBoostReduction(totalHeights, boostConfig)
    : new Array(TOTAL_COLUMNS).fill(0);

  // Intervention reduction
  const interventionRed = calculateInterventionReduction(placedInterventions, allInterventions);

  // SGLT2 reduction
  const sglt2 = medicationModifiers.sglt2;
  const sglt2Red = sglt2
    ? calculateSglt2Reduction(totalHeights.map((h, i) => Math.max(0, h - boostRed[i])), sglt2.depth, sglt2.floorRow)
    : new Array(TOTAL_COLUMNS).fill(0);

  // Column caps (effective visible height)
  const columnCaps = totalHeights.map((h, i) =>
    Math.max(0, h - boostRed[i] - interventionRed[i] - sglt2Red[i])
  );

  return calculatePenalty(columnCaps);
}
