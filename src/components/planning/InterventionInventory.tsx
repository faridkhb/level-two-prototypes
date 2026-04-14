import { useMemo } from 'react';
import type { Intervention, Medication, PlacedIntervention, PlacedMedication, AvailableFood } from '../../core/types';
import { InterventionCard } from './InterventionCard';
import { MedicationCard } from './MedicationCard';
import './ShipInventory.css';
import './MedicationPanel.css';

interface InterventionInventoryProps {
  allInterventions: Intervention[];
  availableInterventions: AvailableFood[];
  placedInterventions: PlacedIntervention[];
  wpRemaining: number;
  allMedications?: Medication[];
  availableMedicationIds?: string[];
  placedMedications?: PlacedMedication[];
}

interface InventoryItem {
  intervention: Intervention;
  index: number;
  remaining: number;
}

export function InterventionInventory({
  allInterventions,
  availableInterventions,
  placedInterventions,
  wpRemaining,
  allMedications = [],
  availableMedicationIds = [],
  placedMedications = [],
}: InterventionInventoryProps) {
  const placedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const placed of placedInterventions) {
      counts.set(placed.interventionId, (counts.get(placed.interventionId) || 0) + 1);
    }
    return counts;
  }, [placedInterventions]);

  const inventoryItems = useMemo(() => {
    const items: InventoryItem[] = [];

    for (const ai of availableInterventions) {
      const intervention = allInterventions.find((i) => i.id === ai.id);
      if (!intervention) continue;

      const placed = placedCounts.get(ai.id) || 0;
      const remaining = ai.count - placed;

      for (let i = 0; i < remaining; i++) {
        items.push({ intervention, index: i, remaining });
      }
    }

    return items;
  }, [allInterventions, availableInterventions, placedCounts]);

  // Available medications: count how many of each are still in inventory (not yet placed)
  const availableMedItems = useMemo(() => {
    return availableMedicationIds.map(medId => {
      const med = allMedications.find(m => m.id === medId);
      const placedCount = placedMedications.filter(p => p.medicationId === medId).length;
      // Each medication type appears once in inventory; if already placed, still show (re-draggable)
      return { med, placedCount };
    }).filter(({ med }) => !!med) as Array<{ med: Medication; placedCount: number }>;
  }, [availableMedicationIds, allMedications, placedMedications]);

  const hasMedications = availableMedItems.length > 0;
  if (availableInterventions.length === 0 && !hasMedications) return null;

  return (
    <div className="ship-inventory__grid ship-inventory__grid--actions">
      {hasMedications && (
        <div className="medication-section">
          {availableMedItems.map(({ med }) => (
            <MedicationCard
              key={med.id}
              medication={med}
              instanceId={`medication-${med.id}`}
            />
          ))}
        </div>
      )}
      {inventoryItems.length === 0 && !hasMedications ? (
        <div className="ship-inventory__empty">All interventions placed!</div>
      ) : (
        inventoryItems.map(({ intervention, index }) => {
          const wpDisabled = intervention.wpCost > wpRemaining;
          return (
            <InterventionCard
              key={`${intervention.id}-${index}`}
              intervention={intervention}
              instanceId={`intervention-${intervention.id}-${index}`}
              wpDisabled={wpDisabled}
            />
          );
        })
      )}
    </div>
  );
}
