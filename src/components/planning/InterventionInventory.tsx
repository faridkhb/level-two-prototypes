import { useMemo } from 'react';
import type { Intervention, Medication, PlacedIntervention, AvailableFood } from '../../core/types';
import { InterventionCard } from './InterventionCard';
import './ShipInventory.css';
import './MedicationPanel.css';

function getMedicationTooltip(med: Medication): string {
  switch (med.type) {
    case 'peakReduction': {
      const pct = Math.round((1 - (med.multiplier ?? 1)) * 100);
      return `Glucose -${pct}% (×${med.multiplier ?? 1})`;
    }
    case 'thresholdDrain':
      return `Drain ${med.depth ?? 0} cubes, floor ${med.floorMgDl ?? 200} mg/dL`;
    case 'slowAbsorption': {
      const parts: string[] = [];
      if (med.durationMultiplier) parts.push(`Duration ×${med.durationMultiplier}`);
      if (med.glucoseMultiplier) {
        const pct = Math.round((1 - med.glucoseMultiplier) * 100);
        parts.push(`Glucose -${pct}%`);
      }
      if (med.kcalMultiplier) {
        const pct = Math.round((1 - med.kcalMultiplier) * 100);
        parts.push(`Kcal -${pct}%`);
      }
      if (med.wpBonus) parts.push(`+${med.wpBonus} ☀️`);
      return parts.join(', ');
    }
    default:
      return med.description;
  }
}

interface InterventionInventoryProps {
  allInterventions: Intervention[];
  availableInterventions: AvailableFood[];
  placedInterventions: PlacedIntervention[];
  wpRemaining: number;
  allMedications?: Medication[];
  availableMedicationIds?: string[];
  activeMedications?: string[];
  onMedicationToggle?: (medicationId: string) => void;
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
  activeMedications = [],
  onMedicationToggle,
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

  const hasMedications = availableMedicationIds.length > 0;
  if (availableInterventions.length === 0 && !hasMedications) return null;

  return (
    <div className="ship-inventory__grid ship-inventory__grid--actions">
      {hasMedications && availableMedicationIds.map(medId => {
        const med = allMedications.find(m => m.id === medId);
        if (!med) return null;
        const isActive = activeMedications.includes(medId);
        const tooltip = getMedicationTooltip(med);
        return (
          <button
            key={medId}
            className={`medication-toggle ${isActive ? 'medication-toggle--active' : ''}`}
            onClick={() => onMedicationToggle?.(medId)}
            data-tooltip={tooltip}
          >
            <span className="medication-toggle__emoji">{med.emoji}</span>
            <div className="medication-toggle__details">
              <span className="medication-toggle__name">{med.name}</span>
              <span className="medication-toggle__desc">{tooltip}</span>
            </div>
            <span className="medication-toggle__status">
              {isActive ? 'ON' : 'OFF'}
            </span>
          </button>
        );
      })}
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
