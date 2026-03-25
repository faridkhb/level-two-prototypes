import type { PlacedFood, Ship, PlacedIntervention, Intervention, Medication, MedicationModifiers, PenaltyResult } from './types';
import { GRAPH_CONFIG, TOTAL_COLUMNS, DEFAULT_MEDICATION_MODIFIERS, PENALTY_ORANGE_ROW, PENALTY_RED_ROW, PENALTY_ORANGE_WEIGHT, PENALTY_RED_WEIGHT, calculateStars } from './types';

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
 * Legacy mode (decayRate number):
 *   Continuous drain from column 0 during ramp-up and after peak.
 *   decayRate > 0: drain accumulates from first column
 *   decayRate === 0: flat plateau to the right edge
 */
export function calculateCurve(
  glucose: number,
  durationMinutes: number,
  dropColumn: number,
  decayRate: number = 0.5
): CubeColumn[] {
  const peakCubes = Math.round(glucose / GRAPH_CONFIG.cellHeightMgDl);
  const riseCols = Math.max(1, Math.round(durationMinutes / GRAPH_CONFIG.cellWidthMin));

  if (peakCubes <= 0) return [];

  return _calculateCurveLegacy(peakCubes, riseCols, dropColumn, decayRate);
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
 * Calculate the full graph state: BG value at each column.
 */
export function calculateGraphState(
  placedFoods: PlacedFood[],
  allShips: Ship[],
  decayRate: number = 0.5
): number[] {
  const bgValues = new Array(TOTAL_COLUMNS).fill(0);

  for (const placed of placedFoods) {
    const ship = allShips.find(s => s.id === placed.shipId);
    if (!ship) continue;

    const curve = calculateCurve(ship.load, ship.duration, placed.dropColumn, decayRate);
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
  decayRate: number = 0.5
): FoodPyramid[] {
  return placedFoods.map(placed => {
    const ship = allShips.find(s => s.id === placed.shipId);
    const columns = ship ? calculateCurve(ship.load, ship.duration, placed.dropColumn, decayRate) : [];
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
// Pattern Burn System
// ============================================

/**
 * Calculate the number of burning rows at column `col` for a given skip pattern.
 * Each element in pattern is the skip value for that row:
 *   0 = solid row (all columns burn)
 *   N = alternating N-skip / N-burn starting with skip
 */
export function patternDepth(pattern: number[], col: number): number {
  let count = 0;
  for (const skip of pattern) {
    if (skip === 0) {
      count++;
    } else {
      const group = Math.floor(col / skip);
      if (group % 2 === 1) count++;
    }
  }
  return count;
}

/** Fixed pancreas burn pattern — always active, 2 solid rows */
export const PANCREAS_PATTERN = [0, 0];
/** BOOST burn pattern — added on top of pancreas when active */
export const BOOST_PATTERN = [0, 3];

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
        if (med.burnPattern) modifiers.metforminPattern = med.burnPattern;
        break;
      case 'thresholdDrain': {
        if (med.burnPattern) {
          const floorRow = ((med.floorMgDl ?? 200) - GRAPH_CONFIG.bgMin) / GRAPH_CONFIG.cellHeightMgDl;
          modifiers.sglt2 = { pattern: med.burnPattern, floorRow };
        }
        break;
      }
      case 'slowAbsorption': {
        modifiers.durationMultiplier *= (med.durationMultiplier ?? 1);
        modifiers.kcalMultiplier *= (med.kcalMultiplier ?? 1);
        modifiers.wpBonus += (med.wpBonus ?? 0);
        if (med.burnPattern) modifiers.glp1Pattern = med.burnPattern;
        break;
      }
    }
  }

  return modifiers;
}

/**
 * Apply medication effects to food before curve calculation (GLP-1 effect).
 * GLP-1 extends duration (×1.5) and inversely reduces peak glucose (÷1.5),
 * preserving the same total glucose area under the curve.
 */
export function applyMedicationToFood(
  glucose: number,
  duration: number,
  modifiers: MedicationModifiers,
): { glucose: number; duration: number } {
  return {
    glucose: glucose / modifiers.durationMultiplier,
    duration: duration * modifiers.durationMultiplier,
  };
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
  decayRate: number = 0.5,
  boostActive: boolean = false,
  baselineRow: number = 0,
): PenaltyResult {
  // Build food heights per column (starting from baseline BG level)
  const totalHeights = new Array(TOTAL_COLUMNS).fill(baselineRow);
  for (const placed of placedFoods) {
    const ship = allShips.find(s => s.id === placed.shipId);
    if (!ship) continue;
    const { glucose: effectiveGlucose, duration } = applyMedicationToFood(ship.load, ship.duration, medicationModifiers);
    const curve = calculateCurve(effectiveGlucose, duration, placed.dropColumn, decayRate);
    for (const col of curve) {
      const graphCol = placed.dropColumn + col.columnOffset;
      if (graphCol >= 0 && graphCol < TOTAL_COLUMNS) {
        totalHeights[graphCol] += col.cubeCount;
      }
    }
  }

  // Intervention reduction
  const interventionRed = calculateInterventionReduction(placedInterventions, allInterventions);

  // Column caps using pattern burns
  const columnCaps = totalHeights.map((h, col) => {
    const pancreasD = patternDepth(PANCREAS_PATTERN, col);
    const boostD = boostActive ? patternDepth(BOOST_PATTERN, col) : 0;
    const metforminD = medicationModifiers.metforminPattern
      ? patternDepth(medicationModifiers.metforminPattern, col) : 0;
    const glp1D = medicationModifiers.glp1Pattern
      ? patternDepth(medicationModifiers.glp1Pattern, col) : 0;

    let sglt2D = 0;
    const sglt2 = medicationModifiers.sglt2;
    if (sglt2) {
      const rawSglt2D = patternDepth(sglt2.pattern, col);
      const heightBeforeSglt2 = h - interventionRed[col] - pancreasD - boostD - metforminD - glp1D;
      sglt2D = Math.min(rawSglt2D, Math.max(0, heightBeforeSglt2 - sglt2.floorRow));
    }

    return Math.max(baselineRow,
      h - interventionRed[col] - pancreasD - boostD - metforminD - sglt2D - glp1D
    );
  });

  return calculatePenalty(columnCaps);
}
