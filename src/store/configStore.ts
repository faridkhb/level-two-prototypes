import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Override types — only numeric fields that affect gameplay
export interface FoodOverride {
  glucose: number;
  carbs: number;
  protein: number;
  fat: number;
  duration: number;
  kcal: number;
  wpCost: number;
  gi: number;
}

export interface InterventionOverride {
  depth: number;
  duration: number;
  wpCost: number;
  boostCols: number;
  boostExtra: number;
}

export interface PancreasTierOverride {
  decayRate: number;
  cost: number;
}

export interface MedicationOverride {
  multiplier: number;
  depth: number;
  floorMgDl: number;
  durationMultiplier: number;
  glucoseMultiplier: number;
  kcalMultiplier: number;
  wpBonus: number;
}

interface ConfigState {
  foods: Record<string, Partial<FoodOverride>>;
  pancreasTiers: Record<string, Partial<PancreasTierOverride>>;
  interventions: Record<string, Partial<InterventionOverride>>;
  medications: Record<string, Partial<MedicationOverride>>;

  setFoodField: (foodId: string, field: keyof FoodOverride, value: number) => void;
  setPancreasField: (tier: string, field: keyof PancreasTierOverride, value: number) => void;
  setInterventionField: (id: string, field: keyof InterventionOverride, value: number) => void;
  setMedicationField: (id: string, field: keyof MedicationOverride, value: number) => void;
  resetAll: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      foods: {},
      pancreasTiers: {},
      interventions: {},
      medications: {},

      setFoodField: (foodId, field, value) =>
        set((state) => ({
          foods: {
            ...state.foods,
            [foodId]: { ...state.foods[foodId], [field]: value },
          },
        })),

      setPancreasField: (tier, field, value) =>
        set((state) => ({
          pancreasTiers: {
            ...state.pancreasTiers,
            [tier]: { ...state.pancreasTiers[tier], [field]: value },
          },
        })),

      setInterventionField: (id, field, value) =>
        set((state) => ({
          interventions: {
            ...state.interventions,
            [id]: { ...state.interventions[id], [field]: value },
          },
        })),

      setMedicationField: (id, field, value) =>
        set((state) => ({
          medications: {
            ...state.medications,
            [id]: { ...state.medications[id], [field]: value },
          },
        })),

      resetAll: () => set({ foods: {}, pancreasTiers: {}, interventions: {}, medications: {} }),
    }),
    {
      name: 'bg-config-overrides',
      version: 2,
      partialize: (state) => ({
        foods: state.foods,
        pancreasTiers: state.pancreasTiers,
        interventions: state.interventions,
        medications: state.medications,
      }),
    }
  )
);
