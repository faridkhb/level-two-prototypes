import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Intervention } from '../../core/types';
import './InterventionCard.css';

interface InterventionCardProps {
  intervention: Intervention;
  instanceId?: string;
  isLocked?: boolean;
  remainingCount?: number;
  wpDisabled?: boolean;
}

export function InterventionCard({
  intervention,
  instanceId,
  isLocked = false,
  remainingCount,
  wpDisabled = false,
}: InterventionCardProps) {
  const draggableId = instanceId ?? `intervention-${intervention.id}`;
  const disabled = wpDisabled || isLocked;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    disabled,
    data: {
      intervention,
      isIntervention: true,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  const tooltip = `${intervention.name} — lowers blood sugar over ${intervention.duration} min`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'intervention-card',
        isDragging && 'intervention-card--dragging',
        wpDisabled && 'intervention-card--disabled',
        isLocked && 'intervention-card--locked',
      ]
        .filter(Boolean)
        .join(' ')}
      data-intervention={intervention.id}
      data-tooltip={tooltip}
      {...(disabled ? {} : listeners)}
      {...attributes}
    >
      {isLocked && <span className="intervention-card__lock">🔒</span>}
      <span className="intervention-card__emoji">{intervention.emoji}</span>

      {!isLocked && (
        <span className="intervention-card__badge">
          {intervention.isBreak
            ? `+${Math.abs(intervention.wpCost)}`
            : intervention.wpCost}☀️
        </span>
      )}

      <div className="intervention-card__details">
        <span className="intervention-card__name">{intervention.name}</span>
        <span className="intervention-card__info">{intervention.duration}m</span>
        <span className="intervention-card__info">
          {intervention.isBreak ? `+${Math.abs(intervention.wpCost)}☀️ refund` : `-${intervention.depth} cubes`}
        </span>
      </div>

      {remainingCount !== undefined && remainingCount < 99 && (
        <span className="intervention-card__count">×{remainingCount}</span>
      )}
    </div>
  );
}

// Drag overlay version
export function InterventionCardOverlay({ intervention }: { intervention: Intervention }) {
  return (
    <div className="intervention-card intervention-card--overlay">
      <span className="intervention-card__emoji">{intervention.emoji}</span>
      <span className="intervention-card__badge">
        {intervention.isBreak
          ? `+${Math.abs(intervention.wpCost)}`
          : intervention.wpCost}☀️
      </span>
      <div className="intervention-card__details">
        <span className="intervention-card__name">{intervention.name}</span>
        <span className="intervention-card__info">{intervention.duration}m</span>
        <span className="intervention-card__info">
          {intervention.isBreak ? `+${Math.abs(intervention.wpCost)}☀️ refund` : `-${intervention.depth} cubes`}
        </span>
      </div>
    </div>
  );
}
