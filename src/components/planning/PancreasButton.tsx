import type { PancreasTier } from '../../core/types';
import { PANCREAS_TIERS } from '../../core/types';
import './PancreasButton.css';

interface PancreasButtonProps {
  currentTier: PancreasTier;
  usesRemaining: number;
  onToggle: () => void;
  disabled?: boolean;
}

export function PancreasButton({
  currentTier,
  usesRemaining,
  onToggle,
  disabled = false,
}: PancreasButtonProps) {
  const isBoosted = currentTier === 3;
  const boostCost = PANCREAS_TIERS[3].cost;
  const canAffordBoost = !isBoosted && usesRemaining >= boostCost;

  return (
    <button
      className={`pancreas-btn ${isBoosted ? 'pancreas-btn--boost' : ''} ${!canAffordBoost && !isBoosted ? 'pancreas-btn--locked' : ''} ${disabled ? 'pancreas-btn--disabled' : ''}`}
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      title={`Pancreas boost: ${isBoosted ? 'active — tap to deactivate' : `${usesRemaining} use${usesRemaining !== 1 ? 's' : ''} left — tap to activate`}`}
    >
      <span className="pancreas-btn__emoji">{'\uD83E\uDEC1'}</span>
      <span className="pancreas-btn__text">
        {isBoosted ? 'BOOST OFF' : 'BOOST'}
      </span>
      {!isBoosted && (
        <span className={`pancreas-btn__uses ${usesRemaining === 0 ? 'pancreas-btn__uses--empty' : ''}`}>
          {usesRemaining}
        </span>
      )}
    </button>
  );
}
