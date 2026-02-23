import type { PancreasTier } from '../../core/types';
import { PANCREAS_TIERS } from '../../core/types';
import './PancreasButton.css';

interface PancreasButtonProps {
  currentTier: PancreasTier;
  barsAvailable: number;
  onToggle: () => void;
  disabled?: boolean;
}

export function PancreasButton({
  currentTier,
  barsAvailable,
  onToggle,
  disabled = false,
}: PancreasButtonProps) {
  const isBoosted = currentTier === 3;
  const boostCost = PANCREAS_TIERS[3].cost;
  const canAffordBoost = !isBoosted && barsAvailable >= boostCost;
  const tierInfo = PANCREAS_TIERS[currentTier];

  return (
    <button
      className={`pancreas-btn ${isBoosted ? 'pancreas-btn--boost' : ''} ${disabled ? 'pancreas-btn--disabled' : ''}`}
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      title={`Pancreas: ${isBoosted ? 'BOOST' : 'ON'} (decay ${tierInfo.decayRate}/col)${isBoosted ? ` — ${boostCost} bars` : ''}. Tap to toggle.`}
    >
      <span className="pancreas-btn__emoji">{'\uD83E\uDEC1'}</span>
      <span className="pancreas-btn__text">
        {isBoosted ? 'BOOST' : 'ON'}
      </span>
      {isBoosted && (
        <span className="pancreas-btn__cost">{boostCost}</span>
      )}
      {!isBoosted && !canAffordBoost && (
        <span className="pancreas-btn__lock">🔒</span>
      )}
    </button>
  );
}
