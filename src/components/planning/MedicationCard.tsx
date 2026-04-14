import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Medication } from '../../core/types';
import './InterventionCard.css';

interface MedicationCardProps {
  medication: Medication;
  instanceId?: string;
  isLocked?: boolean;
}

export function MedicationCard({
  medication,
  instanceId,
  isLocked = false,
}: MedicationCardProps) {
  const draggableId = instanceId ?? `medication-${medication.id}`;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    disabled: isLocked,
    data: {
      medication,
      isMedication: true,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'intervention-card',
        'intervention-card--medication',
        isDragging && 'intervention-card--dragging',
        isLocked && 'intervention-card--locked',
      ]
        .filter(Boolean)
        .join(' ')}
      data-medication={medication.id}
      data-tooltip={medication.description}
      {...(isLocked ? {} : listeners)}
      {...attributes}
    >
      {isLocked && <span className="intervention-card__lock">🔒</span>}
      <span className="intervention-card__emoji">{medication.emoji}</span>
      <div className="intervention-card__details">
        <span className="intervention-card__name">{medication.name}</span>
      </div>
    </div>
  );
}

// Drag overlay version
export function MedicationCardOverlay({ medication }: { medication: Medication }) {
  return (
    <div className="intervention-card intervention-card--medication intervention-card--overlay">
      <span className="intervention-card__emoji">{medication.emoji}</span>
      <div className="intervention-card__details">
        <span className="intervention-card__name">{medication.name}</span>
      </div>
    </div>
  );
}
