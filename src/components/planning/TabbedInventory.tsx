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
  return (
    <div className="ship-inventory">
      <ShipInventory
        allShips={allShips}
        availableFoods={availableFoods}
        placedFoods={placedFoods}
        wpRemaining={wpRemaining}
      />
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
    </div>
  );
}
