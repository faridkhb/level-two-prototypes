// ============================================
// Core Types for BG Graph Planning Game
// ============================================

// === Enums / Unions ===

export type LoadType = 'Glucose' | 'Treatment';

// === Graph Configuration ===

export const GRAPH_CONFIG = {
  startHour: 8,       // 8 AM
  endHour: 20,        // 8 PM
  cellWidthMin: 30,   // minutes per column
  cellHeightMgDl: 25, // mg/dL per row
  bgMin: 50,          // Y axis minimum
  bgMax: 450,         // Y axis maximum (50 + 16×25)
} as const;

// Derived constants
export const TOTAL_MINUTES = (GRAPH_CONFIG.endHour - GRAPH_CONFIG.startHour) * 60; // 720
export const TOTAL_COLUMNS = TOTAL_MINUTES / GRAPH_CONFIG.cellWidthMin; // 24
export const TOTAL_ROWS = (GRAPH_CONFIG.bgMax - GRAPH_CONFIG.bgMin) / GRAPH_CONFIG.cellHeightMgDl; // 8

// X axis tick marks (configurable)
export const DEFAULT_X_TICKS = [8, 11, 14, 17, 20]; // hours

// Y axis tick marks (configurable)
export const DEFAULT_Y_TICKS = [100, 200, 300]; // mg/dL

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
  1: { decayRate: 0.5, cost: 0, label: 'I' },
  2: { decayRate: 0.65, cost: 1, label: 'II' },
  3: { decayRate: 0.75, cost: 1, label: 'III' },
};

export const PANCREAS_TOTAL_BARS = 1;

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
  portion?: string;       // Serving size description (e.g. "1 medium (120g)")
  gi?: number;            // Glycemic Index (0-100)
}

// === Placed Food on Graph ===

export interface PlacedFood {
  id: string;             // Unique placement ID
  shipId: string;         // Reference to Ship.id
  dropColumn: number;     // Column index where dropped (0 = start of graph)
  slotIndex?: number;     // Meal slot index (0-11)
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
  maxDuration?: number;   // Total effect duration cap in minutes (main + tail combined)
  isBreak?: boolean;      // Blocks time, gives WP instead of costing
  slotSize?: number;         // Number of meal slots occupied (default 1)
}

export interface PlacedIntervention {
  id: string;             // Unique placement ID
  interventionId: string; // Reference to Intervention.id
  dropColumn: number;
  slotIndex?: number;     // Meal slot index (0-11)
  slotSize?: number;      // Number of meal slots occupied (default 1)
}

// === Medications ===

export type MedicationType = 'peakReduction' | 'thresholdDrain' | 'slowAbsorption';

export interface Medication {
  id: string;
  name: string;
  emoji: string;
  type: MedicationType;
  description: string;
  burnPattern?: number[];      // row-based burn pattern [skip0, skip1, ...]
  // thresholdDrain (SGLT2)
  floorMgDl?: number;          // don't burn below this level
  // slowAbsorption (GLP-1)
  durationMultiplier?: number; // 1.5 = 50% longer duration
  kcalMultiplier?: number;     // 0.7 = -30% kcal budget
  wpBonus?: number;            // +4 WP
}

export interface MedicationModifiers {
  durationMultiplier: number;    // GLP-1: 1.5
  kcalMultiplier: number;        // GLP-1: 0.7
  wpBonus: number;               // GLP-1: +4
  metforminPattern: number[] | null;
  sglt2: { pattern: number[]; floorRow: number } | null;
  glp1Pattern: number[] | null;
}

export const DEFAULT_MEDICATION_MODIFIERS: MedicationModifiers = {
  durationMultiplier: 1,
  kcalMultiplier: 1,
  wpBonus: 0,
  metforminPattern: null,
  sglt2: null,
  glp1Pattern: null,
};

// === Level Config ===

export interface AvailableFood {
  id: string;
  count: number;
}

export interface PreplacedFood {
  shipId: string;
  slotIndex: number;
}

export interface PreplacedIntervention {
  interventionId: string;
  slotIndex: number;
  slotSize?: number;
}

export interface DayConfig {
  day: number;
  kcalBudget: number;
  wpBudget: number;
  availableFoods: AvailableFood[];
  availableInterventions?: AvailableFood[];
  availableMedications?: string[];
  preplacedFoods?: PreplacedFood[];
  preplacedInterventions?: PreplacedIntervention[];
  lockedSlots?: number[];
  stressSlots?: number[];
  startingBg?: number;          // Starting BG in mg/dL (default 60 = graph bottom)
  bonusBoostBars?: number;      // Extra BOOST charges granted at the start of this day
  pancreasEffectiveness?: number; // 1-5 visual bar sections (default 5 = fully healthy)
}

/** Compute baseline row from starting BG level. Default = 0 (60 mg/dL) */
export function getBaselineRow(startingBg?: number): number {
  if (!startingBg || startingBg <= GRAPH_CONFIG.bgMin) return 0;
  return Math.round((startingBg - GRAPH_CONFIG.bgMin) / GRAPH_CONFIG.cellHeightMgDl);
}

// === Kcal Assessment (3-zone satiety system) ===

export type SatietyZone = 'malnourished' | 'optimal' | 'overeating';

export interface KcalAssessment {
  label: string;
  color: string;
  zone: SatietyZone;
}

export function getKcalAssessment(kcalUsed: number, kcalBudget: number): KcalAssessment {
  if (kcalBudget === 0) return { label: 'Malnourished', color: '#e53e3e', zone: 'malnourished' };
  const pct = (kcalUsed / kcalBudget) * 100;
  if (pct < 60) return { label: 'Malnourished', color: '#e53e3e', zone: 'malnourished' };
  if (pct <= 80) return { label: 'Optimal', color: '#48bb78', zone: 'optimal' };
  return { label: 'Overeating', color: '#ed8936', zone: 'overeating' };
}

// === Satiety Penalty ===

export interface SatietyPenalty {
  zone: SatietyZone;
  wpDelta: number;    // +1 for optimal, -1 for malnourished/overeating
  kcalDelta: number;  // +100 for overeating, 0 otherwise
  freeFood: number;   // 1 for malnourished/overeating, 0 for optimal
}

export const DEFAULT_SATIETY_PENALTY: SatietyPenalty = {
  zone: 'optimal',
  wpDelta: 0,
  kcalDelta: 0,
  freeFood: 0,
};

export function getSatietyPenalty(kcalUsed: number, kcalBudget: number): SatietyPenalty {
  const assessment = getKcalAssessment(kcalUsed, kcalBudget);
  switch (assessment.zone) {
    case 'malnourished':
      return { zone: 'malnourished', wpDelta: -1, kcalDelta: 0, freeFood: 1 };
    case 'optimal':
      return { zone: 'optimal', wpDelta: 1, kcalDelta: 0, freeFood: 0 };
    case 'overeating':
      return { zone: 'overeating', wpDelta: -1, kcalDelta: 100, freeFood: 1 };
  }
}

export const SATIETY_PENALTY_FOOD_ID = 'icecream';

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

/** Controls how burn animations trigger on food placement */
export type BurnAnimMode = 'incremental' | 'full';

export interface PenaltyResult {
  totalPenalty: number;
  orangeCount: number;  // cubes in 200-300 zone
  redCount: number;     // cubes in 300+ zone
  stars: number;        // 0-3
  label: string;        // "Perfect", "Good", "Pass", "Defeat"
}

/** Penalty zone thresholds (in row units from bgMin) */
export const PENALTY_ORANGE_ROW = 6;  // 200 mg/dL = (200-50)/25
export const PENALTY_RED_ROW = 10;    // 300 mg/dL = (300-50)/25
export const PENALTY_ORANGE_WEIGHT = 1;   // halved (twice as many cubes with 25 mg/dL cells)
export const PENALTY_RED_WEIGHT = 3;       // halved

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

// === Meal Slot System ===

export const SLOTS_PER_MEAL = 4;
export const TOTAL_SLOTS = 12;
export const COLS_PER_SLOT = 2; // 1 hour = 2 columns of 30 min

export type MealSegment = 'breakfast' | 'lunch' | 'dinner';

export interface MealSegmentConfig {
  id: MealSegment;
  label: string;
  emoji: string;
  startSlot: number;
  slotCount: number;
}

export const MEAL_SEGMENTS: MealSegmentConfig[] = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅', startSlot: 0, slotCount: 4 },
  { id: 'lunch',     label: 'Lunch',     emoji: '☀️', startSlot: 4, slotCount: 4 },
  { id: 'dinner',    label: 'Dinner',    emoji: '🌙', startSlot: 8, slotCount: 4 },
];

/** Convert slot index (0-11) to graph column (0,2,4,...,22) */
export function slotToColumn(slotIndex: number): number {
  return slotIndex * COLS_PER_SLOT;
}

/** Get time label for a slot */
export function slotTimeLabel(slotIndex: number, format: '12h' | '24h'): string {
  return columnToTimeString(slotToColumn(slotIndex), format);
}
