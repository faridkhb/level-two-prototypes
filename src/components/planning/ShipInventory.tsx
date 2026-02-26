import { useMemo } from 'react';
import type { Ship, PlacedFood, AvailableFood } from '../../core/types';
import { ShipCard } from './ShipCard';
import './ShipInventory.css';

interface ShipInventoryProps {
  allShips: Ship[];
  availableFoods: AvailableFood[];
  placedFoods: PlacedFood[];
  wpRemaining: number;
}

interface InventoryItem {
  ship: Ship;
  index: number;
  remaining: number;
}

export function ShipInventory({
  allShips,
  availableFoods,
  placedFoods,
  wpRemaining,
}: ShipInventoryProps) {
  const placedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const placed of placedFoods) {
      counts.set(placed.shipId, (counts.get(placed.shipId) || 0) + 1);
    }
    return counts;
  }, [placedFoods]);

  const inventoryItems = useMemo(() => {
    const items: InventoryItem[] = [];

    for (const af of availableFoods) {
      const ship = allShips.find((s) => s.id === af.id);
      if (!ship) continue;

      const placed = placedCounts.get(af.id) || 0;
      const remaining = af.count - placed;

      for (let i = 0; i < remaining; i++) {
        items.push({ ship, index: i, remaining });
      }
    }

    return items;
  }, [allShips, availableFoods, placedCounts]);

  return (
    <div className="ship-inventory">
      <div className="ship-inventory__title">Food Cards</div>
      <div className="ship-inventory__grid">
        {inventoryItems.length === 0 ? (
          <div className="ship-inventory__empty">All cards placed!</div>
        ) : (
          inventoryItems.map(({ ship, index }) => {
            const wpCost = ship.wpCost ?? 0;
            const wpDisabled = wpCost > wpRemaining;
            return (
              <ShipCard
                key={`${ship.id}-${index}`}
                ship={ship}
                instanceId={`inventory-${ship.id}-${index}`}
                wpDisabled={wpDisabled}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
