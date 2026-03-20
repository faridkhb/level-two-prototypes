import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Ship } from '../../core/types';
import './ShipCard.css';

function getSpeedLabel(duration: number): { label: string; color: string } {
  if (duration <= 45) return { label: 'High GI', color: '#fc8181' };
  if (duration <= 120) return { label: 'Medium GI', color: '#f6c90e' };
  return { label: 'Low GI', color: '#68d391' };
}

function getCardTooltip(ship: Ship): string {
  const cost = ship.wpCost ?? 0;
  const costText = cost > 0 ? `${cost} ☀️` : 'Free';
  return `${ship.name} · ${ship.kcal} kcal · ${ship.carbs ?? 0}g carbs · ${getSpeedLabel(ship.duration).label} · ${costText}`;
}

interface ShipCardProps {
  ship: Ship;
  instanceId?: string;
  isPlaced?: boolean;
  isLocked?: boolean;
  remainingCount?: number;
  wpDisabled?: boolean;
}

export function ShipCard({
  ship,
  instanceId,
  isPlaced = false,
  isLocked = false,
  remainingCount,
  wpDisabled = false,
}: ShipCardProps) {
  const draggableId = instanceId ?? `inventory-${ship.id}`;
  const disabled = wpDisabled || isLocked;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    disabled,
    data: {
      ship,
      isPlaced,
      instanceId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  const wpCost = ship.wpCost ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'ship-card',
        'ship-card--type-glucose',
        isPlaced && 'ship-card--placed',
        isDragging && 'ship-card--dragging',
        wpDisabled && 'ship-card--disabled',
        isLocked && 'ship-card--locked',
      ]
        .filter(Boolean)
        .join(' ')}
      data-food={ship.id}
      data-tooltip={getCardTooltip(ship)}
      {...(disabled ? {} : listeners)}
      {...attributes}
    >
      {isLocked && <span className="ship-card__lock">🔒</span>}
      <span className="ship-card__emoji">{ship.emoji}</span>

      {/* WP cost badge */}
      {wpCost > 0 && !isLocked && (
        <span className="ship-card__badge ship-card__badge--wp">{wpCost}☀️</span>
      )}

      <div className="ship-card__details">
        <span className="ship-card__name">{ship.name}</span>
        <span className="ship-card__info">{ship.kcal} kcal</span>
        <span className="ship-card__info">{ship.carbs ?? 0}g carbs</span>
        <span className="ship-card__info" style={{ color: getSpeedLabel(ship.duration).color }}>{getSpeedLabel(ship.duration).label}</span>
      </div>

      {remainingCount !== undefined && remainingCount < 99 && (
        <span className="ship-card__count">×{remainingCount}</span>
      )}
    </div>
  );
}

// Drag overlay version (no drag handlers)
export function ShipCardOverlay({ ship }: { ship: Ship }) {
  const wpCost = ship.wpCost ?? 0;

  return (
    <div className="ship-card ship-card--overlay ship-card--type-glucose">
      <span className="ship-card__emoji">{ship.emoji}</span>

      {wpCost > 0 && (
        <span className="ship-card__badge ship-card__badge--wp">{wpCost}☀️</span>
      )}

      <div className="ship-card__details">
        <span className="ship-card__name">{ship.name}</span>
        <span className="ship-card__info">{ship.kcal} kcal</span>
        <span className="ship-card__info">{ship.carbs ?? 0}g carbs</span>
        <span className="ship-card__info" style={{ color: getSpeedLabel(ship.duration).color }}>{getSpeedLabel(ship.duration).label}</span>
      </div>
    </div>
  );
}
