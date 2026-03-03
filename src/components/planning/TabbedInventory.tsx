import { useState, useMemo } from 'react';
import type {
  Ship,
  PlacedFood,
  AvailableFood,
  Intervention,
  PlacedIntervention,
  Medication,
} from '../../core/types';
import { ShipInventory } from './ShipInventory';
import { InterventionInventory } from './InterventionInventory';
import './TabbedInventory.css';

type InventoryTab = 'food' | 'actions';

interface TabbedInventoryProps {
  allShips: Ship[];
  availableFoods: AvailableFood[];
  placedFoods: PlacedFood[];
  allInterventions: Intervention[];
  availableInterventions: AvailableFood[];
  placedInterventions: PlacedIntervention[];
  wpRemaining: number;
  allMedications?: Medication[];
  availableMedicationIds?: string[];
  activeMedications?: string[];
  onMedicationToggle?: (medicationId: string) => void;
}

export function TabbedInventory({
  allShips,
  availableFoods,
  placedFoods,
  allInterventions,
  availableInterventions,
  placedInterventions,
  wpRemaining,
  allMedications = [],
  availableMedicationIds = [],
  activeMedications = [],
  onMedicationToggle,
}: TabbedInventoryProps) {
  const [tab, setTab] = useState<InventoryTab>('food');

  const foodCount = useMemo(() => {
    const placed = new Map<string, number>();
    for (const pf of placedFoods) {
      placed.set(pf.shipId, (placed.get(pf.shipId) || 0) + 1);
    }
    let count = 0;
    for (const af of availableFoods) {
      count += af.count - (placed.get(af.id) || 0);
    }
    return count;
  }, [availableFoods, placedFoods]);

  const actionsCount = useMemo(() => {
    const placed = new Map<string, number>();
    for (const pi of placedInterventions) {
      placed.set(pi.interventionId, (placed.get(pi.interventionId) || 0) + 1);
    }
    let count = 0;
    for (const ai of availableInterventions) {
      count += ai.count - (placed.get(ai.id) || 0);
    }
    count += availableMedicationIds.length;
    return count;
  }, [availableInterventions, placedInterventions, availableMedicationIds]);

  return (
    <div className="ship-inventory">
      <div className="tabbed-inventory__tabs">
        <button
          className={`tabbed-inventory__tab${tab === 'food' ? ' tabbed-inventory__tab--active' : ''}`}
          onClick={() => setTab('food')}
        >
          Food ({foodCount})
        </button>
        <button
          className={`tabbed-inventory__tab${tab === 'actions' ? ' tabbed-inventory__tab--active' : ''}`}
          onClick={() => setTab('actions')}
        >
          Actions ({actionsCount})
        </button>
      </div>

      {tab === 'food' ? (
        <ShipInventory
          allShips={allShips}
          availableFoods={availableFoods}
          placedFoods={placedFoods}
          wpRemaining={wpRemaining}
        />
      ) : (
        <InterventionInventory
          allInterventions={allInterventions}
          availableInterventions={availableInterventions}
          placedInterventions={placedInterventions}
          wpRemaining={wpRemaining}
          allMedications={allMedications}
          availableMedicationIds={availableMedicationIds}
          activeMedications={activeMedications}
          onMedicationToggle={onMedicationToggle}
        />
      )}
    </div>
  );
}
