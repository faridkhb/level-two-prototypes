import type { Ship, LevelConfig, LoadType, AvailableFood, Intervention, Medication, MedicationType } from '../core/types';
import { useConfigStore } from '../store/configStore';

// Raw JSON types (before transformation)
interface RawFoodConfig {
  id: string;
  name: string;
  emoji?: string;
  glucose: number;
  carbs: number;
  protein?: number;
  fat?: number;
  duration: number;
  kcal: number;
  description?: string;
  wpCost?: number;
}

interface RawLevelConfig {
  id: string;
  name: string;
  description?: string;
  days: number;
  kcalBudget?: number;
  availableFoods?: AvailableFood[] | string[];
  dayConfigs?: Array<{
    day: number;
    kcalBudget: number;
    wpBudget?: number;
    availableFoods: AvailableFood[] | string[];
    availableInterventions?: AvailableFood[] | string[];
    availableMedications?: string[];
  }>;
}

// Transform raw food config to Ship
function transformFood(raw: RawFoodConfig): Ship {
  return {
    id: raw.id,
    name: raw.name,
    emoji: raw.emoji || '🍽️',
    load: raw.glucose,
    carbs: raw.carbs,
    protein: raw.protein,
    fat: raw.fat,
    duration: raw.duration,
    kcal: raw.kcal,
    loadType: 'Glucose' as LoadType,
    targetContainer: 'bg',
    description: raw.description,
    wpCost: raw.wpCost ?? 0,
  };
}

// Normalize availableFoods to always be AvailableFood[]
function normalizeAvailableFoods(foods?: AvailableFood[] | string[]): AvailableFood[] {
  if (!foods || foods.length === 0) return [];

  if (typeof foods[0] === 'object') {
    return foods as AvailableFood[];
  }

  return (foods as string[]).map(id => ({ id, count: 99 }));
}

// Transform raw level config
function transformLevel(raw: RawLevelConfig): LevelConfig {
  const transformed: LevelConfig = {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    days: raw.days,
    kcalBudget: raw.kcalBudget,
  };

  if (raw.availableFoods) {
    transformed.availableFoods = normalizeAvailableFoods(raw.availableFoods);
  }

  if (raw.dayConfigs) {
    transformed.dayConfigs = raw.dayConfigs.map((dc) => ({
      day: dc.day,
      kcalBudget: dc.kcalBudget,
      wpBudget: dc.wpBudget ?? 10,
      availableFoods: normalizeAvailableFoods(dc.availableFoods),
      availableInterventions: dc.availableInterventions
        ? normalizeAvailableFoods(dc.availableInterventions)
        : undefined,
      availableMedications: dc.availableMedications,
    }));
  }

  return transformed;
}

interface RawInterventionConfig {
  id: string;
  name: string;
  emoji: string;
  depth: number;
  duration: number;
  wpCost: number;
  boostCols?: number;
  boostExtra?: number;
}

function transformIntervention(raw: RawInterventionConfig): Intervention {
  return {
    id: raw.id,
    name: raw.name,
    emoji: raw.emoji,
    depth: raw.depth,
    duration: raw.duration,
    wpCost: raw.wpCost,
    boostCols: raw.boostCols,
    boostExtra: raw.boostExtra,
  };
}

interface RawMedicationConfig {
  id: string;
  name: string;
  emoji: string;
  type: string;
  description?: string;
  multiplier?: number;
  depth?: number;
  floorMgDl?: number;
  durationMultiplier?: number;
  kcalMultiplier?: number;
  wpBonus?: number;
}

function transformMedication(raw: RawMedicationConfig): Medication {
  return {
    id: raw.id,
    name: raw.name,
    emoji: raw.emoji,
    type: raw.type as MedicationType,
    description: raw.description ?? '',
    multiplier: raw.multiplier,
    depth: raw.depth,
    floorMgDl: raw.floorMgDl,
    durationMultiplier: raw.durationMultiplier,
    kcalMultiplier: raw.kcalMultiplier,
    wpBonus: raw.wpBonus,
  };
}

// Cache for loaded configs
let foodsCache: Ship[] | null = null;
let interventionsCache: Intervention[] | null = null;
let medicationsCache: Medication[] | null = null;

export async function loadFoods(): Promise<Ship[]> {
  if (foodsCache) return foodsCache;

  const response = await fetch('/data/foods.json', { cache: 'no-store' });
  const data = await response.json();
  const ships = applyFoodOverrides(data.foods.map(transformFood));
  foodsCache = ships;
  return ships;
}

export async function loadInterventions(): Promise<Intervention[]> {
  if (interventionsCache) return interventionsCache;

  const response = await fetch('/data/interventions.json', { cache: 'no-store' });
  const data = await response.json();
  const interventions = applyInterventionOverrides(data.interventions.map(transformIntervention));
  interventionsCache = interventions;
  return interventions;
}

export async function loadMedications(): Promise<Medication[]> {
  if (medicationsCache) return medicationsCache;

  const response = await fetch('/data/medications.json', { cache: 'no-store' });
  const data = await response.json();
  const medications = data.medications.map(transformMedication);
  medicationsCache = medications;
  return medications;
}

export async function loadLevel(levelId: string): Promise<LevelConfig> {
  const response = await fetch(`/data/levels/${levelId}.json`, { cache: 'no-store' });
  const data = await response.json();
  return transformLevel(data);
}

// Apply config overrides from configStore to loaded data
function applyFoodOverrides(ships: Ship[]): Ship[] {
  const { foods } = useConfigStore.getState();
  if (Object.keys(foods).length === 0) return ships;

  return ships.map(ship => {
    const overrides = foods[ship.id];
    if (!overrides) return ship;
    return {
      ...ship,
      load: overrides.glucose ?? ship.load,
      carbs: overrides.carbs ?? ship.carbs,
      protein: overrides.protein ?? ship.protein,
      fat: overrides.fat ?? ship.fat,
      duration: overrides.duration ?? ship.duration,
      kcal: overrides.kcal ?? ship.kcal,
      wpCost: overrides.wpCost ?? ship.wpCost,
    };
  });
}

function applyInterventionOverrides(interventions: Intervention[]): Intervention[] {
  const { interventions: overrides } = useConfigStore.getState();
  if (Object.keys(overrides).length === 0) return interventions;

  return interventions.map(intv => {
    const ov = overrides[intv.id];
    if (!ov) return intv;
    return {
      ...intv,
      depth: ov.depth ?? intv.depth,
      duration: ov.duration ?? intv.duration,
      wpCost: ov.wpCost ?? intv.wpCost,
      boostCols: ov.boostCols ?? intv.boostCols,
      boostExtra: ov.boostExtra ?? intv.boostExtra,
    };
  });
}

// Get ship by ID from cache
export function getShipById(ships: Ship[], id: string): Ship | undefined {
  return ships.find(s => s.id === id);
}

// Clear cache (useful for testing or applying config changes)
export function clearConfigCache(): void {
  foodsCache = null;
  interventionsCache = null;
  medicationsCache = null;
}
