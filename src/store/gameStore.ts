import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  PlacedFood,
  PlacedIntervention,
  LevelConfig,
  DayConfig,
  Ship,
  Intervention,
  GameSettings,
  PancreasTier,
} from '../core/types';
import { DEFAULT_SETTINGS, PANCREAS_TIERS } from '../core/types';

// Helper to get day config
function getDayConfig(level: LevelConfig, day: number): DayConfig | null {
  if (level.dayConfigs) {
    return level.dayConfigs.find(dc => dc.day === day) ?? level.dayConfigs[0] ?? null;
  }
  // Fallback for levels without dayConfigs
  return {
    day,
    kcalBudget: level.kcalBudget ?? 2000,
    wpBudget: 10,
    availableFoods: level.availableFoods ?? [],
  };
}

interface GameState {
  // Current state
  currentLevel: LevelConfig | null;
  currentDay: number;

  // Planning (graph-based)
  placedFoods: PlacedFood[];
  placedInterventions: PlacedIntervention[];
  activeMedications: string[];

  // Pancreas tier system
  pancreasTierPerDay: Record<number, PancreasTier>;
  lockedBarsPerDay: Record<number, number>;

  // WP carry-over tracking
  submittedWpPerDay: Record<number, { wpUsed: number; effectiveWpBudget: number }>;

  // Overeating penalty (steps per submitted day)
  overeatingPenaltyPerDay: Record<number, number>;

  // Settings
  settings: GameSettings;

  // Actions
  setLevel: (level: LevelConfig) => void;
  placeFood: (shipId: string, dropColumn: number) => void;
  removeFood: (placementId: string) => void;
  moveFood: (placementId: string, newDropColumn: number) => void;
  placeIntervention: (interventionId: string, dropColumn: number) => void;
  removeIntervention: (placementId: string) => void;
  moveIntervention: (placementId: string, newDropColumn: number) => void;
  toggleMedication: (medicationId: string) => void;
  clearFoods: () => void;
  goToDay: (day: number) => void;
  startNextDay: () => void;
  restartLevel: () => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  setPancreasTier: (day: number, tier: PancreasTier) => void;
  lockPancreasBars: () => void;
  unlockPancreasBars: (day: number) => void;
  submitDayWp: (day: number, wpUsed: number, effectiveWpBudget: number) => void;
  setOvereatingPenalty: (day: number, steps: number) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      // Initial state
      currentLevel: null,
      currentDay: 1,
      placedFoods: [],
      placedInterventions: [],
      activeMedications: [],
      pancreasTierPerDay: {},
      lockedBarsPerDay: {},
      submittedWpPerDay: {},
      overeatingPenaltyPerDay: {},
      settings: DEFAULT_SETTINGS,

      // Actions
      setLevel: (level) =>
        set({
          currentLevel: level,
          currentDay: 1,
          placedFoods: [],
          placedInterventions: [],
          activeMedications: [],
          pancreasTierPerDay: {},
          lockedBarsPerDay: {},
          submittedWpPerDay: {},
          overeatingPenaltyPerDay: {},
        }),

      placeFood: (shipId, dropColumn) =>
        set((state) => ({
          placedFoods: [
            ...state.placedFoods,
            { id: uuidv4(), shipId, dropColumn },
          ],
        })),

      removeFood: (placementId) =>
        set((state) => ({
          placedFoods: state.placedFoods.filter((f) => f.id !== placementId),
        })),

      moveFood: (placementId, newDropColumn) =>
        set((state) => ({
          placedFoods: state.placedFoods.map((f) =>
            f.id === placementId ? { ...f, dropColumn: newDropColumn } : f
          ),
        })),

      placeIntervention: (interventionId, dropColumn) =>
        set((state) => ({
          placedInterventions: [
            ...state.placedInterventions,
            { id: uuidv4(), interventionId, dropColumn },
          ],
        })),

      removeIntervention: (placementId) =>
        set((state) => ({
          placedInterventions: state.placedInterventions.filter((i) => i.id !== placementId),
        })),

      moveIntervention: (placementId, newDropColumn) =>
        set((state) => ({
          placedInterventions: state.placedInterventions.map((i) =>
            i.id === placementId ? { ...i, dropColumn: newDropColumn } : i
          ),
        })),

      toggleMedication: (medicationId) =>
        set((state) => ({
          activeMedications: state.activeMedications.includes(medicationId)
            ? state.activeMedications.filter(id => id !== medicationId)
            : [...state.activeMedications, medicationId],
        })),

      clearFoods: () => set({ placedFoods: [], placedInterventions: [], activeMedications: [] }),

      goToDay: (day) =>
        set({
          currentDay: day,
          placedFoods: [],
          placedInterventions: [],
          activeMedications: [],
        }),

      startNextDay: () =>
        set((state) => ({
          currentDay: state.currentDay + 1,
          placedFoods: [],
          placedInterventions: [],
          activeMedications: [],
        })),

      restartLevel: () =>
        set({
          currentDay: 1,
          placedFoods: [],
          placedInterventions: [],
          activeMedications: [],
          pancreasTierPerDay: {},
          lockedBarsPerDay: {},
          submittedWpPerDay: {},
          overeatingPenaltyPerDay: {},
        }),

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      setPancreasTier: (day, tier) =>
        set((state) => ({
          pancreasTierPerDay: { ...state.pancreasTierPerDay, [day]: tier },
        })),

      lockPancreasBars: () =>
        set((state) => {
          const tier = (state.pancreasTierPerDay[state.currentDay] ?? 1) as PancreasTier;
          return {
            lockedBarsPerDay: {
              ...state.lockedBarsPerDay,
              [state.currentDay]: PANCREAS_TIERS[tier].cost,
            },
          };
        }),

      unlockPancreasBars: (day) =>
        set((state) => {
          const next = { ...state.lockedBarsPerDay };
          delete next[day];
          return { lockedBarsPerDay: next };
        }),

      submitDayWp: (day, wpUsed, effectiveWpBudget) =>
        set((state) => ({
          submittedWpPerDay: {
            ...state.submittedWpPerDay,
            [day]: { wpUsed, effectiveWpBudget },
          },
        })),

      setOvereatingPenalty: (day, steps) =>
        set((state) => ({
          overeatingPenaltyPerDay: {
            ...state.overeatingPenaltyPerDay,
            [day]: steps,
          },
        })),
    }),
    {
      name: 'bg-graph-save',
      version: 7,
      partialize: (state) => ({
        currentDay: state.currentDay,
        settings: state.settings,
        pancreasTierPerDay: state.pancreasTierPerDay,
        lockedBarsPerDay: state.lockedBarsPerDay,
        submittedWpPerDay: state.submittedWpPerDay,
        overeatingPenaltyPerDay: state.overeatingPenaltyPerDay,
      }),
    }
  )
);

// Export helper for use in components
export { getDayConfig };

// Selector: compute kcal usage
export function selectKcalUsed(placedFoods: PlacedFood[], allShips: Ship[]): number {
  let total = 0;
  for (const placed of placedFoods) {
    const ship = allShips.find(s => s.id === placed.shipId);
    if (ship) total += ship.kcal;
  }
  return total;
}

// Selector: compute WP usage (food + interventions)
export function selectWpUsed(
  placedFoods: PlacedFood[],
  allShips: Ship[],
  placedInterventions: PlacedIntervention[],
  allInterventions: Intervention[],
): number {
  let total = 0;
  for (const placed of placedFoods) {
    const ship = allShips.find(s => s.id === placed.shipId);
    if (ship) total += (ship.wpCost ?? 0);
  }
  for (const placed of placedInterventions) {
    const intervention = allInterventions.find(i => i.id === placed.interventionId);
    if (intervention) total += intervention.wpCost;
  }
  return total;
}

// Selector: overeating penalty steps from previous day
export function selectOvereatingPenalty(
  currentDay: number,
  overeatingPenaltyPerDay: Record<number, number>,
): number {
  if (currentDay <= 1) return 0;
  return overeatingPenaltyPerDay[currentDay - 1] ?? 0;
}

// Selector: compute WP penalty from previous day's unspent WP
export function selectWpPenalty(
  currentDay: number,
  submittedWpPerDay: Record<number, { wpUsed: number; effectiveWpBudget: number }>,
): number {
  if (currentDay <= 1) return 0;
  const prev = submittedWpPerDay[currentDay - 1];
  if (!prev) return 0;
  return Math.max(0, prev.effectiveWpBudget - prev.wpUsed);
}
