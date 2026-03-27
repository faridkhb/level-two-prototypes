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
} from '../core/types';
import { DEFAULT_SETTINGS, slotToColumn, TOTAL_SLOTS } from '../core/types';

// Build pre-placed items from day config
function getPreplacedItems(dayConfig: DayConfig | null): { foods: PlacedFood[]; interventions: PlacedIntervention[] } {
  if (!dayConfig) return { foods: [], interventions: [] };
  const foods: PlacedFood[] = (dayConfig.preplacedFoods ?? []).map(pf => ({
    id: `preplaced-food-${pf.shipId}-${pf.slotIndex}`,
    shipId: pf.shipId,
    dropColumn: slotToColumn(pf.slotIndex),
    slotIndex: pf.slotIndex,
  }));
  const interventions: PlacedIntervention[] = (dayConfig.preplacedInterventions ?? []).map(pi => ({
    id: `preplaced-int-${pi.interventionId}-${pi.slotIndex}`,
    interventionId: pi.interventionId,
    dropColumn: slotToColumn(pi.slotIndex),
    slotIndex: pi.slotIndex,
    slotSize: pi.slotSize,
  }));
  return { foods, interventions };
}

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

  // Tutorial mode
  isTutorial: boolean;
  tutorialLevelId: string | null;

  // Planning (graph-based)
  placedFoods: PlacedFood[];
  placedInterventions: PlacedIntervention[];
  activeMedications: string[];

  // BOOST system (adaptive insulin above threshold)
  boostActivePerDay: Record<number, boolean>;
  lockedBarsPerDay: Record<number, number>;

  // WP carry-over tracking
  submittedWpPerDay: Record<number, { wpUsed: number; effectiveWpBudget: number }>;

  // Settings
  settings: GameSettings;

  // Actions
  setLevel: (level: LevelConfig) => void;
  setTutorialMode: (isTutorial: boolean, levelId: string | null) => void;
  placeFoodInSlot: (shipId: string, slotIndex: number) => void;
  placeInterventionInSlot: (interventionId: string, slotIndex: number, slotSize?: number) => void;
  removeFromSlot: (slotIndex: number) => void;
  moveSlotToSlot: (fromSlot: number, toSlot: number) => void;
  toggleMedication: (medicationId: string) => void;
  clearFoods: () => void;
  goToDay: (day: number) => void;
  startNextDay: () => void;
  restartLevel: () => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  toggleBoost: (day: number) => void;
  lockBoostBars: () => void;
  unlockBoostBars: (day: number) => void;
  submitDayWp: (day: number, wpUsed: number, effectiveWpBudget: number) => void;
  removePreplacedFoods: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      // Initial state
      currentLevel: null,
      currentDay: 1,
      isTutorial: false,
      tutorialLevelId: null,
      placedFoods: [],
      placedInterventions: [],
      activeMedications: [],
      boostActivePerDay: {},
      lockedBarsPerDay: {},
      submittedWpPerDay: {},
      settings: DEFAULT_SETTINGS,

      // Actions
      setTutorialMode: (isTutorial, levelId) =>
        set({ isTutorial, tutorialLevelId: levelId }),

      setLevel: (level) => {
        const dc = getDayConfig(level, 1);
        const pre = getPreplacedItems(dc);
        return set({
          currentLevel: level,
          currentDay: 1,
          placedFoods: pre.foods,
          placedInterventions: pre.interventions,
          activeMedications: [],
          boostActivePerDay: {},
          lockedBarsPerDay: {},
          submittedWpPerDay: {},
            });
      },

      placeFoodInSlot: (shipId, slotIndex) =>
        set((state) => {
          if (slotIndex < 0 || slotIndex >= TOTAL_SLOTS) return state;
          // Check slot not covered by food or multi-slot intervention
          const occupied = state.placedFoods.some(f => f.slotIndex === slotIndex)
            || state.placedInterventions.some(i => {
              const start = i.slotIndex ?? -1;
              const size = i.slotSize ?? 1;
              return slotIndex >= start && slotIndex < start + size;
            });
          if (occupied) return state;
          return {
            placedFoods: [
              ...state.placedFoods,
              { id: uuidv4(), shipId, dropColumn: slotToColumn(slotIndex), slotIndex },
            ],
          };
        }),

      placeInterventionInSlot: (interventionId, slotIndex, slotSize = 1) =>
        set((state) => {
          if (slotIndex < 0 || slotIndex + slotSize > TOTAL_SLOTS) return state;
          // Check ALL required slots are unoccupied
          for (let s = slotIndex; s < slotIndex + slotSize; s++) {
            const occupied = state.placedFoods.some(f => f.slotIndex === s)
              || state.placedInterventions.some(i => {
                const start = i.slotIndex ?? -1;
                const sz = i.slotSize ?? 1;
                return s >= start && s < start + sz;
              });
            if (occupied) return state;
          }
          return {
            placedInterventions: [
              ...state.placedInterventions,
              { id: uuidv4(), interventionId, dropColumn: slotToColumn(slotIndex), slotIndex, slotSize },
            ],
          };
        }),

      removeFromSlot: (slotIndex) =>
        set((state) => {
          // Block removal of pre-placed items
          const preplacedFood = state.placedFoods.find(f => f.slotIndex === slotIndex && f.id.startsWith('preplaced-'));
          if (preplacedFood) return state;
          // Find multi-slot intervention covering this slot
          const coveringInt = state.placedInterventions.find(i => {
            const start = i.slotIndex ?? -1;
            const size = i.slotSize ?? 1;
            return slotIndex >= start && slotIndex < start + size;
          });
          if (coveringInt?.id.startsWith('preplaced-')) return state;
          return {
            placedFoods: state.placedFoods.filter(f => f.slotIndex !== slotIndex),
            placedInterventions: coveringInt
              ? state.placedInterventions.filter(i => i.id !== coveringInt.id)
              : state.placedInterventions,
          };
        }),

      removePreplacedFoods: () =>
        set((state) => ({
          placedFoods: state.placedFoods.filter(f => !f.id.startsWith('preplaced-')),
        })),

      moveSlotToSlot: (fromSlot, toSlot) =>
        set((state) => {
          if (fromSlot === toSlot) return state;
          const foodFrom = state.placedFoods.find(f => f.slotIndex === fromSlot);
          const intFrom = state.placedInterventions.find(i => i.slotIndex === fromSlot);
          // Block moving pre-placed items
          if (foodFrom?.id.startsWith('preplaced-')) return state;
          if (intFrom?.id.startsWith('preplaced-')) return state;
          if (!foodFrom && !intFrom) return state;

          const fromSize = intFrom ? (intFrom.slotSize ?? 1) : 1;

          // Multi-slot move: only move to free range (no swap)
          if (fromSize > 1) {
            if (toSlot + fromSize > TOTAL_SLOTS) return state;
            for (let s = toSlot; s < toSlot + fromSize; s++) {
              // Skip self slots
              if (intFrom && s >= fromSlot && s < fromSlot + fromSize) continue;
              const occFood = state.placedFoods.some(f => f.slotIndex === s);
              const occInt = state.placedInterventions.some(i => {
                if (intFrom && i.id === intFrom.id) return false;
                const size = i.slotSize ?? 1;
                const start = i.slotIndex ?? -1;
                return s >= start && s < start + size;
              });
              if (occFood || occInt) return state;
            }
            return {
              placedFoods: state.placedFoods,
              placedInterventions: state.placedInterventions.map(i =>
                intFrom && i.id === intFrom.id
                  ? { ...i, slotIndex: toSlot, dropColumn: slotToColumn(toSlot) }
                  : i
              ),
            };
          }

          // Single-slot: check if target is inside a multi-slot (reject swap)
          const covInt = state.placedInterventions.find(i => {
            const size = i.slotSize ?? 1;
            const start = i.slotIndex ?? -1;
            return toSlot >= start && toSlot < start + size;
          });
          if (covInt && (covInt.slotSize ?? 1) > 1) return state;

          const foodTo = state.placedFoods.find(f => f.slotIndex === toSlot);
          const intTo = covInt;

          const newFoods = state.placedFoods.map(f => {
            if (foodFrom && f.id === foodFrom.id)
              return { ...f, slotIndex: toSlot, dropColumn: slotToColumn(toSlot) };
            if (foodTo && f.id === foodTo.id)
              return { ...f, slotIndex: fromSlot, dropColumn: slotToColumn(fromSlot) };
            return f;
          });

          const newInts = state.placedInterventions.map(i => {
            if (intFrom && i.id === intFrom.id)
              return { ...i, slotIndex: toSlot, dropColumn: slotToColumn(toSlot) };
            if (intTo && i.id === intTo.id)
              return { ...i, slotIndex: fromSlot, dropColumn: slotToColumn(fromSlot) };
            return i;
          });

          return { placedFoods: newFoods, placedInterventions: newInts };
        }),

      toggleMedication: (medicationId) =>
        set((state) => ({
          activeMedications: state.activeMedications.includes(medicationId)
            ? state.activeMedications.filter(id => id !== medicationId)
            : [...state.activeMedications, medicationId],
        })),

      clearFoods: () =>
        set((state) => {
          const dc = state.currentLevel ? getDayConfig(state.currentLevel, state.currentDay) : null;
          const pre = getPreplacedItems(dc);
          return { placedFoods: pre.foods, placedInterventions: pre.interventions, activeMedications: [] };
        }),

      goToDay: (day) =>
        set((state) => {
          const dc = state.currentLevel ? getDayConfig(state.currentLevel, day) : null;
          const pre = getPreplacedItems(dc);
          // Clear locked/active boost for target day and beyond (stale persisted data corrupts barsAvailable)
          const cleanedLockedBars = Object.fromEntries(
            Object.entries(state.lockedBarsPerDay).filter(([d]) => Number(d) < day)
          );
          const cleanedBoostActive = Object.fromEntries(
            Object.entries(state.boostActivePerDay).filter(([d]) => Number(d) < day)
          );
          return {
            currentDay: day,
            placedFoods: pre.foods,
            placedInterventions: pre.interventions,
            activeMedications: [],
            lockedBarsPerDay: cleanedLockedBars,
            boostActivePerDay: cleanedBoostActive,
          };
        }),

      startNextDay: () =>
        set((state) => {
          const nextDay = state.currentDay + 1;
          const dc = state.currentLevel ? getDayConfig(state.currentLevel, nextDay) : null;
          const pre = getPreplacedItems(dc);
          // Clear locked/active boost for incoming day (stale persisted data corrupts barsAvailable)
          const cleanedLockedBars = Object.fromEntries(
            Object.entries(state.lockedBarsPerDay).filter(([d]) => Number(d) < nextDay)
          );
          const cleanedBoostActive = Object.fromEntries(
            Object.entries(state.boostActivePerDay).filter(([d]) => Number(d) < nextDay)
          );
          return {
            currentDay: nextDay,
            placedFoods: pre.foods,
            placedInterventions: pre.interventions,
            activeMedications: [],
            lockedBarsPerDay: cleanedLockedBars,
            boostActivePerDay: cleanedBoostActive,
          };
        }),

      restartLevel: () =>
        set({
          currentDay: 1,
          placedFoods: [],
          placedInterventions: [],
          activeMedications: [],
          boostActivePerDay: {},
          lockedBarsPerDay: {},
          submittedWpPerDay: {},
            }),

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      toggleBoost: (day) =>
        set((state) => ({
          boostActivePerDay: {
            ...state.boostActivePerDay,
            [day]: !state.boostActivePerDay[day],
          },
        })),

      lockBoostBars: () =>
        set((state) => {
          const isActive = state.boostActivePerDay[state.currentDay] ?? false;
          return {
            lockedBarsPerDay: {
              ...state.lockedBarsPerDay,
              [state.currentDay]: isActive ? 1 : 0,
            },
          };
        }),

      unlockBoostBars: (day) =>
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

    }),
    {
      name: 'bg-graph-save',
      version: 10,
      migrate: (stored: unknown) => ({
        // Only carry over settings; all BOOST/WP/penalty state resets (clears stale localStorage)
        settings: (stored as { settings?: unknown })?.settings ?? DEFAULT_SETTINGS,
      }),
      partialize: (state) => ({
        currentDay: state.currentDay,
        settings: state.settings,
        boostActivePerDay: state.boostActivePerDay,
        lockedBarsPerDay: state.lockedBarsPerDay,
        submittedWpPerDay: state.submittedWpPerDay,
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
