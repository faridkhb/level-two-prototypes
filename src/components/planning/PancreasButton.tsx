import './PancreasButton.css';

interface PancreasButtonProps {
  isBoostActive: boolean;
  usesRemaining: number;
  onToggle: () => void;
  disabled?: boolean;
  isBlinking?: boolean;
}

export function PancreasButton({
  isBoostActive,
  usesRemaining,
  onToggle,
  disabled = false,
  isBlinking = false,
}: PancreasButtonProps) {
  const canAffordBoost = !isBoostActive && usesRemaining >= 1;

  return (
    <button
      className={`pancreas-btn ${isBoostActive ? 'pancreas-btn--boost' : ''} ${!canAffordBoost && !isBoostActive ? 'pancreas-btn--locked' : ''} ${disabled ? 'pancreas-btn--disabled' : ''} ${isBlinking ? 'pancreas-btn--blinking' : ''}`}
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      title={`Insulin boost (>200 mg/dL): ${isBoostActive ? 'active — tap to deactivate' : `${usesRemaining} use${usesRemaining !== 1 ? 's' : ''} left — tap to activate`}`}
    >
      <span className="pancreas-btn__emoji">{'\uD83E\uDEC1'}</span>
      <span className="pancreas-btn__text">
        {isBoostActive ? 'BOOST OFF' : 'BOOST'}
      </span>
      {!isBoostActive && (
        <span className={`pancreas-btn__uses ${usesRemaining === 0 ? 'pancreas-btn__uses--empty' : ''}`}>
          {usesRemaining}
        </span>
      )}
    </button>
  );
}
