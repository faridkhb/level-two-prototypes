import { useState, useEffect } from 'react';
// Types loaded from JSON directly, not from core/types
import { PANCREAS_TIERS } from '../../core/types';
import { useConfigStore } from '../../store/configStore';
import type { FoodOverride, InterventionOverride, PancreasTierOverride, MedicationOverride } from '../../store/configStore';
import './ConfigScreen.css';

type Tab = 'food' | 'pancreas' | 'interventions';

interface ConfigScreenProps {
  onBack: () => void;
}

// Raw food data for defaults (loaded once)
interface RawFood {
  id: string;
  name: string;
  emoji: string;
  glucose: number;
  carbs: number;
  protein: number;
  fat: number;
  duration: number;
  kcal: number;
  wpCost: number;
  portion: string;
  gi: number;
}

interface RawIntervention {
  id: string;
  name: string;
  emoji: string;
  depth: number;
  duration: number;
  wpCost: number;
  boostCols: number;
  boostExtra: number;
}

interface RawMedication {
  id: string;
  name: string;
  emoji: string;
  type: string;
  multiplier?: number;
  depth?: number;
  floorMgDl?: number;
  durationMultiplier?: number;
  glucoseMultiplier?: number;
  kcalMultiplier?: number;
  wpBonus?: number;
}

export function ConfigScreen({ onBack }: ConfigScreenProps) {
  const [tab, setTab] = useState<Tab>('food');
  const [defaultFoods, setDefaultFoods] = useState<RawFood[]>([]);
  const [defaultInterventions, setDefaultInterventions] = useState<RawIntervention[]>([]);
  const [defaultMedications, setDefaultMedications] = useState<RawMedication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    foods: foodOverrides,
    pancreasTiers: pancreasOverrides,
    interventions: interventionOverrides,
    medications: medicationOverrides,
    setFoodField,
    setPancreasField,
    setInterventionField,
    setMedicationField,
    resetAll,
  } = useConfigStore();

  // Load default data from JSON (not from cache — we need originals)
  useEffect(() => {
    async function loadDefaults() {
      try {
        const [foodRes, intvRes, medRes] = await Promise.all([
          fetch('/data/foods.json', { cache: 'no-store' }),
          fetch('/data/interventions.json', { cache: 'no-store' }),
          fetch('/data/medications.json', { cache: 'no-store' }),
        ]);
        const foodData = await foodRes.json();
        const intvData = await intvRes.json();
        const medData = await medRes.json();

        setDefaultFoods(foodData.foods.map((f: RawFood) => ({
          id: f.id,
          name: f.name,
          emoji: f.emoji || '',
          glucose: f.glucose,
          carbs: f.carbs,
          protein: f.protein ?? 0,
          fat: f.fat ?? 0,
          duration: f.duration,
          kcal: f.kcal,
          wpCost: f.wpCost ?? 0,
          portion: f.portion ?? '',
          gi: f.gi ?? 0,
        })));

        setDefaultInterventions(intvData.interventions.map((i: RawIntervention) => ({
          id: i.id,
          name: i.name,
          emoji: i.emoji,
          depth: i.depth,
          duration: i.duration,
          wpCost: i.wpCost,
          boostCols: i.boostCols ?? 0,
          boostExtra: i.boostExtra ?? 0,
        })));

        setDefaultMedications(medData.medications.map((m: RawMedication) => ({
          id: m.id,
          name: m.name,
          emoji: m.emoji,
          type: m.type,
          multiplier: m.multiplier,
          depth: m.depth,
          floorMgDl: m.floorMgDl,
          durationMultiplier: m.durationMultiplier,
          glucoseMultiplier: m.glucoseMultiplier,
          kcalMultiplier: m.kcalMultiplier,
          wpBonus: m.wpBonus,
        })));

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load config defaults:', err);
        setIsLoading(false);
      }
    }
    loadDefaults();
  }, []);

  const handleReset = () => {
    resetAll();
  };

  const handleApply = () => {
    onBack();
  };

  const getFoodValue = (foodId: string, field: keyof FoodOverride, defaultVal: number): number => {
    return foodOverrides[foodId]?.[field] ?? defaultVal;
  };

  const getInterventionValue = (id: string, field: keyof InterventionOverride, defaultVal: number): number => {
    return interventionOverrides[id]?.[field] ?? defaultVal;
  };

  const getPancreasValue = (tier: string, field: keyof PancreasTierOverride, defaultVal: number): number => {
    return pancreasOverrides[tier]?.[field] ?? defaultVal;
  };

  const getMedicationValue = (id: string, field: keyof MedicationOverride, defaultVal: number | undefined): number | string => {
    const ov = medicationOverrides[id]?.[field];
    if (ov !== undefined) return ov;
    if (defaultVal !== undefined) return defaultVal;
    return '';
  };

  if (isLoading) {
    return <div className="config-screen config-screen--loading">Loading...</div>;
  }

  return (
    <div className="config-screen">
      <div className="config-screen__tabs">
        <button
          className={`config-screen__tab ${tab === 'food' ? 'config-screen__tab--active' : ''}`}
          onClick={() => setTab('food')}
        >
          Food
        </button>
        <button
          className={`config-screen__tab ${tab === 'pancreas' ? 'config-screen__tab--active' : ''}`}
          onClick={() => setTab('pancreas')}
        >
          Pancreas
        </button>
        <button
          className={`config-screen__tab ${tab === 'interventions' ? 'config-screen__tab--active' : ''}`}
          onClick={() => setTab('interventions')}
        >
          Interventions
        </button>
      </div>

      <div className="config-screen__content">
        {tab === 'food' && (
          <div className="config-table-wrap">
            <table className="config-table">
              <thead>
                <tr>
                  <th className="config-table__th--name">Food</th>
                  <th>Portion</th>
                  <th>Glucose</th>
                  <th>Carbs</th>
                  <th>Protein</th>
                  <th>Fat</th>
                  <th>Duration</th>
                  <th>Kcal</th>
                  <th>GI</th>
                  <th>WP</th>
                </tr>
              </thead>
              <tbody>
                {defaultFoods.map(food => (
                  <tr key={food.id}>
                    <td className="config-table__td--name">
                      <span className="config-table__emoji">{food.emoji}</span>
                      {food.name}
                    </td>
                    <td className="config-table__td--portion">{food.portion}</td>
                    <td>
                      <input
                        type="number"
                        className="config-input"
                        value={getFoodValue(food.id, 'glucose', food.glucose)}
                        onChange={e => setFoodField(food.id, 'glucose', Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="config-input"
                        value={getFoodValue(food.id, 'carbs', food.carbs)}
                        onChange={e => setFoodField(food.id, 'carbs', Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="config-input"
                        value={getFoodValue(food.id, 'protein', food.protein)}
                        onChange={e => setFoodField(food.id, 'protein', Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="config-input"
                        value={getFoodValue(food.id, 'fat', food.fat)}
                        onChange={e => setFoodField(food.id, 'fat', Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="config-input"
                        value={getFoodValue(food.id, 'duration', food.duration)}
                        onChange={e => setFoodField(food.id, 'duration', Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="config-input"
                        value={getFoodValue(food.id, 'kcal', food.kcal)}
                        onChange={e => setFoodField(food.id, 'kcal', Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="config-input config-input--small"
                        value={getFoodValue(food.id, 'gi', food.gi)}
                        onChange={e => setFoodField(food.id, 'gi', Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="config-input config-input--small"
                        value={getFoodValue(food.id, 'wpCost', food.wpCost)}
                        onChange={e => setFoodField(food.id, 'wpCost', Number(e.target.value))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'pancreas' && (
          <div className="config-table-wrap">
            <table className="config-table">
              <thead>
                <tr>
                  <th className="config-table__th--name">Tier</th>
                  <th>Decay Rate</th>
                  <th>Cost (bars)</th>
                </tr>
              </thead>
              <tbody>
                {([0, 1, 2, 3] as const).map(tier => {
                  const defaults = PANCREAS_TIERS[tier];
                  return (
                    <tr key={tier}>
                      <td className="config-table__td--name">{defaults.label}</td>
                      <td>
                        <input
                          type="number"
                          className="config-input"
                          step={0.05}
                          value={getPancreasValue(String(tier), 'decayRate', defaults.decayRate)}
                          onChange={e => setPancreasField(String(tier), 'decayRate', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="config-input config-input--small"
                          value={getPancreasValue(String(tier), 'cost', defaults.cost)}
                          onChange={e => setPancreasField(String(tier), 'cost', Number(e.target.value))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'interventions' && (
          <>
            <div className="config-table-wrap">
              <table className="config-table">
                <thead>
                  <tr>
                    <th className="config-table__th--name">Intervention</th>
                    <th>Depth</th>
                    <th>Duration</th>
                    <th>WP</th>
                    <th>Boost Cols</th>
                    <th>Boost Extra</th>
                  </tr>
                </thead>
                <tbody>
                  {defaultInterventions.map(intv => (
                    <tr key={intv.id}>
                      <td className="config-table__td--name">
                        <span className="config-table__emoji">{intv.emoji}</span>
                        {intv.name}
                      </td>
                      <td>
                        <input
                          type="number"
                          className="config-input config-input--small"
                          value={getInterventionValue(intv.id, 'depth', intv.depth)}
                          onChange={e => setInterventionField(intv.id, 'depth', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="config-input"
                          value={getInterventionValue(intv.id, 'duration', intv.duration)}
                          onChange={e => setInterventionField(intv.id, 'duration', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="config-input config-input--small"
                          value={getInterventionValue(intv.id, 'wpCost', intv.wpCost)}
                          onChange={e => setInterventionField(intv.id, 'wpCost', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="config-input config-input--small"
                          value={getInterventionValue(intv.id, 'boostCols', intv.boostCols)}
                          onChange={e => setInterventionField(intv.id, 'boostCols', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="config-input config-input--small"
                          value={getInterventionValue(intv.id, 'boostExtra', intv.boostExtra)}
                          onChange={e => setInterventionField(intv.id, 'boostExtra', Number(e.target.value))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="config-section-label">Medications</div>
            {defaultMedications.map(med => (
              <div key={med.id} className="config-med-card">
                <div className="config-med-card__header">
                  <span className="config-table__emoji">{med.emoji}</span>
                  <span className="config-med-card__name">{med.name}</span>
                  <span className="config-med-card__type">{med.type}</span>
                </div>
                <div className="config-med-card__fields">
                  {med.type === 'peakReduction' && (
                    <label className="config-med-field">
                      <span>Multiplier</span>
                      <input
                        type="number"
                        className="config-input"
                        step={0.05}
                        value={getMedicationValue(med.id, 'multiplier', med.multiplier)}
                        onChange={e => setMedicationField(med.id, 'multiplier', Number(e.target.value))}
                      />
                    </label>
                  )}
                  {med.type === 'thresholdDrain' && (
                    <>
                      <label className="config-med-field">
                        <span>Depth</span>
                        <input
                          type="number"
                          className="config-input config-input--small"
                          value={getMedicationValue(med.id, 'depth', med.depth)}
                          onChange={e => setMedicationField(med.id, 'depth', Number(e.target.value))}
                        />
                      </label>
                      <label className="config-med-field">
                        <span>Floor (mg/dL)</span>
                        <input
                          type="number"
                          className="config-input"
                          value={getMedicationValue(med.id, 'floorMgDl', med.floorMgDl)}
                          onChange={e => setMedicationField(med.id, 'floorMgDl', Number(e.target.value))}
                        />
                      </label>
                    </>
                  )}
                  {med.type === 'slowAbsorption' && (
                    <>
                      <label className="config-med-field">
                        <span>Duration ×</span>
                        <input
                          type="number"
                          className="config-input"
                          step={0.1}
                          value={getMedicationValue(med.id, 'durationMultiplier', med.durationMultiplier)}
                          onChange={e => setMedicationField(med.id, 'durationMultiplier', Number(e.target.value))}
                        />
                      </label>
                      <label className="config-med-field">
                        <span>Glucose ×</span>
                        <input
                          type="number"
                          className="config-input"
                          step={0.05}
                          value={getMedicationValue(med.id, 'glucoseMultiplier', med.glucoseMultiplier)}
                          onChange={e => setMedicationField(med.id, 'glucoseMultiplier', Number(e.target.value))}
                        />
                      </label>
                      <label className="config-med-field">
                        <span>Kcal ×</span>
                        <input
                          type="number"
                          className="config-input"
                          step={0.1}
                          value={getMedicationValue(med.id, 'kcalMultiplier', med.kcalMultiplier)}
                          onChange={e => setMedicationField(med.id, 'kcalMultiplier', Number(e.target.value))}
                        />
                      </label>
                      <label className="config-med-field">
                        <span>WP Bonus</span>
                        <input
                          type="number"
                          className="config-input config-input--small"
                          value={getMedicationValue(med.id, 'wpBonus', med.wpBonus)}
                          onChange={e => setMedicationField(med.id, 'wpBonus', Number(e.target.value))}
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="config-screen__actions">
        <button className="config-screen__btn config-screen__btn--reset" onClick={handleReset}>
          Reset Defaults
        </button>
        <button className="config-screen__btn config-screen__btn--apply" onClick={handleApply}>
          Apply & Back
        </button>
      </div>
    </div>
  );
}
