import { useState, useMemo, useCallback } from 'react';
import { useDroppable, useDraggable, useDndContext } from '@dnd-kit/core';
import type { Ship, Intervention, PlacedFood, PlacedIntervention, GameSettings } from '../../core/types';
import { MEAL_SEGMENTS, TOTAL_SLOTS, slotTimeLabel } from '../../core/types';
import './SlotGrid.css';

interface SlotGridProps {
  allShips: Ship[];
  allInterventions: Intervention[];
  placedFoods: PlacedFood[];
  placedInterventions: PlacedIntervention[];
  settings: GameSettings;
  onRemoveFromSlot: (slotIndex: number) => void;
  disabled?: boolean;
  lockedSlots?: Set<number>;
}

type SlotContent =
  | { type: 'food'; ship: Ship }
  | { type: 'intervention'; intervention: Intervention }
  | { type: 'continuation'; intervention: Intervention; parentSlotIndex: number }
  | null;

function SlotContainer({
  index,
  content,
  timeLabel,
  onRemove,
  disabled,
  isLocked,
  isParentDragging,
  isGroupHovered,
  isDropTarget,
  onHoverEnter,
  onHoverLeave,
}: {
  index: number;
  content: SlotContent;
  timeLabel: string;
  onRemove: () => void;
  disabled?: boolean;
  isLocked?: boolean;
  isParentDragging?: boolean;
  isGroupHovered?: boolean;
  isDropTarget?: boolean;
  onHoverEnter: (slotIndex: number) => void;
  onHoverLeave: () => void;
}) {
  const isContinuation = content?.type === 'continuation';

  const { setNodeRef: setDropRef } = useDroppable({
    id: `slot-${index}`,
    data: { slotIndex: index },
    disabled: disabled || isContinuation || isLocked,
  });

  const draggableData = content?.type === 'food'
    ? { ship: content.ship, isFromSlot: true, fromSlotIndex: index }
    : content?.type === 'intervention'
      ? { intervention: content.intervention, isIntervention: true, isFromSlot: true, fromSlotIndex: index }
      : {};

  const { setNodeRef: setDragRef, attributes, listeners, isDragging } = useDraggable({
    id: `placed-slot-${index}`,
    disabled: disabled || !content || isContinuation || isLocked,
    data: draggableData,
  });

  const combinedRef = (node: HTMLElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  const showContent = content && !isDragging && !isParentDragging;
  const isMultiStart = content?.type === 'intervention' && (content.intervention.slotSize ?? 1) > 1;

  return (
    <div
      ref={combinedRef}
      className={
        'slot-container' +
        (showContent ? ' slot-container--filled' : '') +
        (showContent && (content.type === 'intervention' || content.type === 'continuation') ? ' slot-container--intervention' : '') +
        (showContent && isContinuation ? ' slot-container--continuation' : '') +
        (showContent && isMultiStart ? ' slot-container--multi-start' : '') +
        (showContent && isGroupHovered ? ' slot-container--hover' : '') +
        (isDropTarget ? ' slot-container--over' : '') +
        (disabled ? ' slot-container--disabled' : '') +
        (isLocked ? ' slot-container--locked' : '') +
        ((isDragging || isParentDragging) ? ' slot-container--dragging' : '')
      }
      onClick={content && !disabled && !isLocked && !isDragging ? onRemove : undefined}
      onMouseEnter={() => content && onHoverEnter(index)}
      onMouseLeave={onHoverLeave}
      {...(content && !disabled && !isContinuation && !isLocked ? listeners : {})}
      {...attributes}
    >
      <div className="slot-container__time">{timeLabel}</div>
      {showContent ? (
        <div className="slot-container__card">
          {isLocked && <span className="slot-container__lock">🔒</span>}
          <span className="slot-container__emoji">
            {content.type === 'food' ? content.ship.emoji : content.intervention.emoji}
          </span>
          <div className="slot-container__info">
            <span className={`slot-container__name${isContinuation ? ' slot-container__name--dim' : ''}`}>
              {content.type === 'food' ? content.ship.name
                : isContinuation ? '⋯' : content.intervention.name}
            </span>
            {!isContinuation && (
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
            )}
          </div>
        </div>
      ) : (
        <div className="slot-container__empty">{isLocked ? '🔒' : '+'}</div>
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
  lockedSlots,
}: SlotGridProps) {
  // Track which slots are being dragged and drop targets (for multi-slot visual)
  const { active, over } = useDndContext();
  const draggingSlots = useMemo(() => {
    const slots = new Set<number>();
    if (active?.data.current?.isFromSlot) {
      const fromSlot = active.data.current.fromSlotIndex as number;
      const pi = placedInterventions.find(i => i.slotIndex === fromSlot);
      if (pi) {
        const size = pi.slotSize ?? 1;
        for (let s = fromSlot; s < fromSlot + size; s++) slots.add(s);
      } else {
        slots.add(fromSlot);
      }
    }
    return slots;
  }, [active, placedInterventions]);

  // Compute drop target slots (for multi-slot drag highlight)
  const dropTargetSlots = useMemo(() => {
    const slots = new Set<number>();
    if (!active || !over) return slots;
    const overId = String(over.id);
    if (!overId.startsWith('slot-')) return slots;
    const targetSlot = parseInt(overId.replace('slot-', ''), 10);
    if (isNaN(targetSlot)) return slots;

    const intervention = active.data.current?.intervention as Intervention | undefined;
    const isIntervention = active.data.current?.isIntervention === true;
    const slotSize = (isIntervention && intervention?.slotSize) ? intervention.slotSize : 1;

    for (let s = targetSlot; s < targetSlot + slotSize && s < TOTAL_SLOTS; s++) {
      slots.add(s);
    }
    return slots;
  }, [active, over]);

  // Track hover group for multi-slot highlight
  const [hoveredGroup, setHoveredGroup] = useState<Set<number>>(new Set());

  const handleSlotHover = useCallback((slotIndex: number) => {
    const pi = placedInterventions.find(i => {
      const start = i.slotIndex ?? -1;
      const size = i.slotSize ?? 1;
      return slotIndex >= start && slotIndex < start + size;
    });
    if (pi && (pi.slotSize ?? 1) > 1) {
      const slots = new Set<number>();
      const start = pi.slotIndex ?? 0;
      const size = pi.slotSize ?? 1;
      for (let s = start; s < start + size; s++) slots.add(s);
      setHoveredGroup(slots);
    } else {
      setHoveredGroup(new Set([slotIndex]));
    }
  }, [placedInterventions]);

  const handleSlotLeave = useCallback(() => {
    setHoveredGroup(new Set());
  }, []);

  const getSlotContent = (slotIndex: number): SlotContent => {
    const food = placedFoods.find(f => f.slotIndex === slotIndex);
    if (food) {
      const ship = allShips.find(s => s.id === food.shipId);
      if (ship) return { type: 'food', ship };
    }
    // Check exact match (start slot)
    const intervention = placedInterventions.find(i => i.slotIndex === slotIndex);
    if (intervention) {
      const int = allInterventions.find(a => a.id === intervention.interventionId);
      if (int) return { type: 'intervention', intervention: int };
    }
    // Check continuation (multi-slot)
    const continuation = placedInterventions.find(i => {
      const size = i.slotSize ?? 1;
      const start = i.slotIndex ?? -1;
      return size > 1 && slotIndex > start && slotIndex < start + size;
    });
    if (continuation) {
      const int = allInterventions.find(a => a.id === continuation.interventionId);
      if (int) return { type: 'continuation', intervention: int, parentSlotIndex: continuation.slotIndex! };
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
                  isLocked={lockedSlots?.has(slotIndex)}
                  isParentDragging={draggingSlots.has(slotIndex)}
                  isGroupHovered={!lockedSlots?.has(slotIndex) && hoveredGroup.has(slotIndex)}
                  isDropTarget={dropTargetSlots.has(slotIndex)}
                  onHoverEnter={handleSlotHover}
                  onHoverLeave={handleSlotLeave}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
