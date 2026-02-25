import { useDroppable, useDraggable } from '@dnd-kit/core';
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
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `slot-${index}`,
    data: { slotIndex: index },
    disabled: disabled,
  });

  const draggableData = content?.type === 'food'
    ? { ship: content.ship, isFromSlot: true, fromSlotIndex: index }
    : content?.type === 'intervention'
      ? { intervention: content.intervention, isIntervention: true, isFromSlot: true, fromSlotIndex: index }
      : {};

  const { setNodeRef: setDragRef, attributes, listeners, isDragging } = useDraggable({
    id: `placed-slot-${index}`,
    disabled: disabled || !content,
    data: draggableData,
  });

  const combinedRef = (node: HTMLElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  return (
    <div
      ref={combinedRef}
      className={
        'slot-container' +
        (content && !isDragging ? ' slot-container--filled' : '') +
        (content?.type === 'intervention' && !isDragging ? ' slot-container--intervention' : '') +
        (isOver ? ' slot-container--over' : '') +
        (disabled ? ' slot-container--disabled' : '') +
        (isDragging ? ' slot-container--dragging' : '')
      }
      onClick={content && !disabled && !isDragging ? onRemove : undefined}
      {...(content && !disabled ? listeners : {})}
      {...attributes}
    >
      <div className="slot-container__time">{timeLabel}</div>
      {content && !isDragging ? (
        <div className="slot-container__card">
          <span className="slot-container__emoji">
            {content.type === 'food' ? content.ship.emoji : content.intervention.emoji}
          </span>
          <div className="slot-container__info">
            <span className="slot-container__name">
              {content.type === 'food' ? content.ship.name : content.intervention.name}
            </span>
            <span className="slot-container__stats">
              {content.type === 'food' ? (
                <>
                  {content.ship.kcal} kcal · {content.ship.carbs ?? 0}g
                  {(content.ship.wpCost ?? 0) > 0 && <> · {content.ship.wpCost}☀️</>}
                </>
              ) : (
                <>
                  {content.intervention.isBreak
                    ? `+${Math.abs(content.intervention.wpCost)}☀️`
                    : `${content.intervention.duration}m · -${content.intervention.depth} · ${content.intervention.wpCost}☀️`}
                </>
              )}
            </span>
          </div>
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
