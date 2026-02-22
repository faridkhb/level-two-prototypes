// ============================================
// Core Types for BG Graph Planning Game
// ============================================

// === Enums / Unions ===

export type LoadType = 'Glucose' | 'Treatment';

// === Graph Configuration ===

export const GRAPH_CONFIG = {
  startHour: 8,       // 8 AM
  endHour: 20,        // 8 PM
  cellWidthMin: 15,   // minutes per column
  cellHeightMgDl: 20, // mg/dL per row
  bgMin: 60,          // Y axis minimum
  bgMax: 400,         // Y axis maximum
} as const;

// Derived constants
export const TOTAL_MINUTES = (GRAPH_CONFIG.endHour - GRAPH_CONFIG.startHour) * 60; // 720
export const TOTAL_COLUMNS = TOTAL_MINUTES / GRAPH_CONFIG.cellWidthMin; // 48
export const TOTAL_ROWS = (GRAPH_CONFIG.bgMax - GRAPH_CONFIG.bgMin) / GRAPH_CONFIG.cellHeightMgDl; // 17

// X axis tick marks (configurable)
export const DEFAULT_X_TICKS = [8, 11, 14, 17, 20]; // hours

// Y axis tick marks (configurable)
export const DEFAULT_Y_TICKS = [100, 200, 300, 400]; // mg/dL

// === Game Settings ===

export interface GameSettings {
  timeFormat: '12h' | '24h';
  bgUnit: 'mg/dL' | 'mmol/L';
}

export const DEFAULT_SETTINGS: GameSettings = {
  timeFormat: '12h',
  bgUnit: 'mg/dL',
};

// === Pancreas Tier System ===

export type PancreasTier = 0 | 1 | 2 | 3;

export const PANCREAS_TIERS: Record<PancreasTier, { decayRate: number; cost: number; label: string }> = {
  0: { decayRate: 0, cost: 0, label: 'OFF' },
  1: { decayRate: 0.25, cost: 0, label: 'I' },
  2: { decayRate: 0.5, cost: 1, label: 'II' },
  3: { decayRate: 0.75, cost: 2, label: 'III' },
};

export const PANCREAS_TOTAL_BARS = 3;

// === WP Carry-Over Penalty ===

/** Each unspent WP on the last day adds this many penalty points */
export const WP_PENALTY_WEIGHT = 5;

// mg/dL to mmol/L conversion factor
export const MGDL_TO_MMOL = 1 / 18;

// === Ship (Food/Intervention) Models ===

export interface Ship {
  id: string;
  name: string;
  emoji: string;
  load: number;           // Glucose amount in mg/dL
  carbs?: number;         // Carbohydrates in grams
  protein?: number;       // Protein in grams
  fat?: number;           // Fat in grams
  duration: number;       // Unload duration in minutes (determines pyramid width)
  kcal: number;           // Kilocalories
  loadType: LoadType;
  targetContainer: string;
  description?: string;
  wpCost?: number;        // Willpower cost (preserved for future use)
}

// === Placed Food on Graph ===

export interface PlacedFood {
  id: string;             // Unique placement ID
  shipId: string;         // Reference to Ship.id
  dropColumn: number;     // Column index where dropped (0 = start of graph)
}

// === Interventions (exercise) ===

export interface Intervention {
  id: string;
  name: string;
  emoji: string;
  depth: number;          // Cubes to remove at peak
  duration: number;       // Ramp-up duration in minutes
  wpCost: number;
  boostCols?: number;     // First N columns get extra depth (burst zone)
  boostExtra?: number;    // Extra cubes removed in burst zone
}

export interface PlacedIntervention {
  id: string;             // Unique placement ID
  interventionId: string; // Reference to Intervention.id
  dropColumn: number;
}

// === Medications ===

export type MedicationType = 'peakReduction' | 'thresholdDrain' | 'slowAbsorption';

export interface Medication {
  id: string;
  name: string;
  emoji: string;
  type: MedicationType;
  description: string;
  // peakReduction (Metformin)
  multiplier?: number;         // 0.75 = -25% glucose
  // thresholdDrain (SGLT2)
  depth?: number;              // max cubes to remove per column
  floorMgDl?: number;          // don't remove below this level
  // slowAbsorption (GLP-1)
  durationMultiplier?: number; // 1.5 = 50% longer duration
  kcalMultiplier?: number;     // 0.7 = -30% kcal budget
  wpBonus?: number;            // +4 WP
}

export interface MedicationModifiers {
  glucoseMultiplier: number;     // Metformin: 0.75, GLP-1: 1/durationMult
  durationMultiplier: number;    // GLP-1: 1.5
  sglt2: { depth: number; floorRow: number } | null;
  kcalMultiplier: number;        // GLP-1: 0.7
  wpBonus: number;               // GLP-1: +4
}

export const DEFAULT_MEDICATION_MODIFIERS: MedicationModifiers = {
  glucoseMultiplier: 1,
  durationMultiplier: 1,
  sglt2: null,
  kcalMultiplier: 1,
  wpBonus: 0,
};

// === Level Config ===

export interface AvailableFood {
  id: string;
  count: number;
}

export interface DayConfig {
  day: number;
  kcalBudget: number;
  wpBudget: number;
  availableFoods: AvailableFood[];
  availableInterventions?: AvailableFood[];
  availableMedications?: string[];
}

// === Kcal Assessment ===

export interface KcalAssessment {
  label: string;
  color: string;
}

export function getKcalAssessment(kcalUsed: number, kcalBudget: number): KcalAssessment {
  if (kcalUsed === 0) return { label: 'Fasting', color: '#718096' };
  const pct = (kcalUsed / kcalBudget) * 100;
  if (pct < 25) return { label: 'Starving', color: '#e53e3e' };
  if (pct < 50) return { label: 'Hungry', color: '#ed8936' };
  if (pct < 75) return { label: 'Light', color: '#ecc94b' };
  if (pct < 100) return { label: 'Well Fed', color: '#48bb78' };
  if (pct < 120) return { label: 'Full', color: '#38a169' };
  if (pct < 150) return { label: 'Overeating', color: '#ed8936' };
  return { label: 'Stuffed', color: '#e53e3e' };
}

export interface LevelConfig {
  id: string;
  name: string;
  description?: string;
  days: number;
  dayConfigs?: DayConfig[];
  // Legacy/fallback
  availableFoods?: AvailableFood[];
  kcalBudget?: number;
}

// === Submit / Rating System ===

export type GamePhase = 'planning' | 'replaying' | 'results';

export interface PenaltyResult {
  totalPenalty: number;
  orangeCount: number;  // cubes in 200-300 zone
  redCount: number;     // cubes in 300+ zone
  stars: number;        // 0-3
  label: string;        // "Perfect", "Good", "Pass", "Defeat"
}

/** Penalty zone thresholds (in row units from bgMin) */
export const PENALTY_ORANGE_ROW = 7;  // row 7 = 200 mg/dL
export const PENALTY_RED_ROW = 12;    // row 12 = 300 mg/dL
export const PENALTY_ORANGE_WEIGHT = 0.5;
export const PENALTY_RED_WEIGHT = 1.5;

/** Star rating thresholds (softened 25% from original 10/40/80) */
export function calculateStars(penalty: number): { stars: number; label: string } {
  if (penalty <= 12.5) return { stars: 3, label: 'Perfect' };
  if (penalty <= 50) return { stars: 2, label: 'Good' };
  if (penalty <= 100) return { stars: 1, label: 'Pass' };
  return { stars: 0, label: 'Defeat' };
}

// === Type Guards ===

export function isGlucoseShip(ship: Ship): boolean {
  return ship.loadType === 'Glucose';
}

// === Utility Functions ===

/**
 * Convert column index to time string
 */
export function columnToTimeString(column: number, format: '12h' | '24h'): string {
  const totalMinutes = GRAPH_CONFIG.startHour * 60 + column * GRAPH_CONFIG.cellWidthMin;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (format === '24h') {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  const h12 = hours % 12 || 12;
  const ampm = hours < 12 ? 'AM' : 'PM';
  if (minutes === 0) return `${h12} ${ampm}`;
  return `${h12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Convert mg/dL to mmol/L
 */
export function mgdlToMmol(mgdl: number): number {
  return Math.round(mgdl * MGDL_TO_MMOL * 10) / 10;
}

/**
 * Format BG value based on unit setting
 */
export function formatBgValue(mgdl: number, unit: 'mg/dL' | 'mmol/L'): string {
  if (unit === 'mmol/L') {
    return `${mgdlToMmol(mgdl)}`;
  }
  return `${mgdl}`;
}
