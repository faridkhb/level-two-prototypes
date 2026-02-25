import { useDroppable } from '@dnd-kit/core';
import type { Ship, Intervention, PlacedFood, PlacedIntervention, GameSettings } from '../../core/types';
import { MEAL_SEGMENTS, slotTimeLabel } from '../../core/types';
import './SlotGrid.css';

interface SlotGridProps {
  allShips: Ship[];
  allInterventions: Intervention[];
  placedFoods: PlacedFood[];
  placedInterventions: PlacedIntervention[];
  settings: GameSettings;
  onRemoveFromSlot: (slotIndex: number) => void;
  disabled?: boolean;
}

type SlotContent =
  | { type: 'food'; ship: Ship }
  | { type: 'intervention'; intervention: Intervention }
  | null;

function SlotContainer({
  index,
  content,
  timeLabel,
  onRemove,
  disabled,
}: {
  index: number;
  content: SlotContent;
  timeLabel: string;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${index}`,
    data: { slotIndex: index },
    disabled: disabled || content !== null,
  });

  return (
    <div
      ref={setNodeRef}
      className={
        'slot-container' +
        (content ? ' slot-container--filled' : '') +
        (content?.type === 'intervention' ? ' slot-container--intervention' : '') +
        (isOver && !content ? ' slot-container--over' : '') +
        (disabled ? ' slot-container--disabled' : '')
      }
      onClick={content && !disabled ? onRemove : undefined}
    >
      <div className="slot-container__time">{timeLabel}</div>
      {content ? (
        <div className="slot-container__card">
          <span className="slot-container__emoji">
            {content.type === 'food' ? content.ship.emoji : content.intervention.emoji}
          </span>
          <span className="slot-container__name">
            {content.type === 'food' ? content.ship.name : content.intervention.name}
          </span>
        </div>
      ) : (
        <div className="slot-container__empty">+</div>
      )}
    </div>
  );
}

export function SlotGrid({
  allShips,
  allInterventions,
  placedFoods,
  placedInterventions,
  settings,
  onRemoveFromSlot,
  disabled,
}: SlotGridProps) {
  const getSlotContent = (slotIndex: number): SlotContent => {
    const food = placedFoods.find(f => f.slotIndex === slotIndex);
    if (food) {
      const ship = allShips.find(s => s.id === food.shipId);
      if (ship) return { type: 'food', ship };
    }
    const intervention = placedInterventions.find(i => i.slotIndex === slotIndex);
    if (intervention) {
      const int = allInterventions.find(a => a.id === intervention.interventionId);
      if (int) return { type: 'intervention', intervention: int };
    }
    return null;
  };

  return (
    <div className="slot-grid">
      {MEAL_SEGMENTS.map(segment => (
        <div key={segment.id} className="slot-grid__meal">
          <div className="slot-grid__meal-header">
            <span>{segment.emoji}</span> {segment.label}
          </div>
          <div className="slot-grid__meal-slots">
            {Array.from({ length: segment.slotCount }, (_, i) => {
              const slotIndex = segment.startSlot + i;
              return (
                <SlotContainer
                  key={slotIndex}
                  index={slotIndex}
                  content={getSlotContent(slotIndex)}
                  timeLabel={slotTimeLabel(slotIndex, settings.timeFormat)}
                  onRemove={() => onRemoveFromSlot(slotIndex)}
                  disabled={disabled}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
