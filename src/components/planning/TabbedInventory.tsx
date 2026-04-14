import { useState, useEffect, useRef, useMemo } from 'react';
import type {
  Ship,
  PlacedFood,
  AvailableFood,
  Intervention,
  PlacedIntervention,
  Medication,
  PlacedMedication,
} from '../../core/types';
import { ShipCard } from './ShipCard';
import { InterventionCard } from './InterventionCard';
import { MedicationCard } from './MedicationCard';
import './TabbedInventory.css';
import './MedicationPanel.css';

function InventoryRow({
  children,
  trackClassName,
}: {
  children: React.ReactNode;
  trackClassName?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const update = () => {
      setFadeLeft(el.scrollLeft > 4);
      setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };

    requestAnimationFrame(update);
    el.addEventListener('scroll', update, { passive: true });

    const ro = new ResizeObserver(() => requestAnimationFrame(update));
    ro.observe(el);

    const mo = new MutationObserver(() => requestAnimationFrame(update));
    mo.observe(el, { childList: true });

    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  const scroll = (dir: 1 | -1) => {
    trackRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });
  };

  return (
    <div
      className={`inv-row${fadeLeft ? ' inv-row--fade-left' : ''}${fadeRight ? ' inv-row--fade-right' : ''}`}
    >
      <button className="inv-row__btn inv-row__btn--left" onClick={() => scroll(-1)} tabIndex={-1}>‹</button>
      <div
        ref={trackRef}
        className={`inv-row__track${trackClassName ? ' ' + trackClassName : ''}`}
      >
        {children}
      </div>
      <button className="inv-row__btn inv-row__btn--right" onClick={() => scroll(1)} tabIndex={-1}>›</button>
    </div>
  );
}

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
  placedMedications?: PlacedMedication[];
  hideKcal?: boolean;
  kcalJustRevealed?: boolean;
  clearedFoodsHighlight?: boolean;
  clearedShipIds?: string[];
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
  placedMedications: _placedMedications = [],
  hideKcal = false,
  kcalJustRevealed = false,
  clearedFoodsHighlight = false,
  clearedShipIds = [],
}: TabbedInventoryProps) {
  const foodItems = useMemo(() => {
    const placed = new Map<string, number>();
    for (const pf of placedFoods) placed.set(pf.shipId, (placed.get(pf.shipId) || 0) + 1);
    const items: Array<{ ship: Ship; index: number }> = [];
    for (const af of availableFoods) {
      const ship = allShips.find((s) => s.id === af.id);
      if (!ship) continue;
      const remaining = af.count - (placed.get(af.id) || 0);
      for (let i = 0; i < remaining; i++) items.push({ ship, index: i });
    }
    return items;
  }, [allShips, availableFoods, placedFoods]);

  const interventionItems = useMemo(() => {
    const placed = new Map<string, number>();
    for (const pi of placedInterventions)
      placed.set(pi.interventionId, (placed.get(pi.interventionId) || 0) + 1);
    const items: Array<{ intervention: Intervention; index: number }> = [];
    for (const ai of availableInterventions) {
      const intervention = allInterventions.find((i) => i.id === ai.id);
      if (!intervention) continue;
      const remaining = ai.count - (placed.get(ai.id) || 0);
      for (let i = 0; i < remaining; i++) items.push({ intervention, index: i });
    }
    return items;
  }, [allInterventions, availableInterventions, placedInterventions]);

  const medicationItems = useMemo(() => {
    return availableMedicationIds
      .map(medId => allMedications.find(m => m.id === medId))
      .filter(Boolean) as Medication[];
  }, [availableMedicationIds, allMedications]);

  const hasMedications = medicationItems.length > 0;
  const hasInterventions = interventionItems.length > 0;

  return (
    <div className="ship-inventory">
      {/* Row 1: Food */}
      <InventoryRow>
        {foodItems.length === 0 ? (
          <div className="inv-row__empty">All cards placed!</div>
        ) : (
          foodItems.map(({ ship, index }) => (
            <ShipCard
              key={`${ship.id}-${index}`}
              ship={ship}
              instanceId={`inventory-${ship.id}-${index}`}
              wpDisabled={(ship.wpCost ?? 0) > wpRemaining}
              hideKcal={hideKcal}
              kcalJustRevealed={kcalJustRevealed}
              clearedIn={clearedFoodsHighlight && clearedShipIds.includes(ship.id)}
            />
          ))
        )}
      </InventoryRow>

      {/* Row 2: Exercise / rest interventions */}
      {hasInterventions && (
        <InventoryRow trackClassName="ship-inventory__grid--actions">
          {interventionItems.map(({ intervention, index }) => (
            <InterventionCard
              key={`${intervention.id}-${index}`}
              intervention={intervention}
              instanceId={`intervention-${intervention.id}-${index}`}
              wpDisabled={intervention.wpCost > wpRemaining}
            />
          ))}
        </InventoryRow>
      )}

      {/* Row 3: Medications — draggable cards */}
      {hasMedications && (
        <InventoryRow trackClassName="medication-section">
          {medicationItems.map((med) => (
            <MedicationCard
              key={med.id}
              medication={med}
              instanceId={`medication-inventory-${med.id}`}
            />
          ))}
        </InventoryRow>
      )}
    </div>
  );
}
