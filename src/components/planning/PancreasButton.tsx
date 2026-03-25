import './PancreasButton.css';

interface PancreasButtonProps {
  isBoostActive: boolean;
  usesRemaining: number;
  onToggle: () => void;
  disabled?: boolean;
  isBlinking?: boolean;
  pancreasEffectiveness?: number; // 1-5, default 5 (fully healthy)
}

const BASE_SECTIONS = 5;
const BOOST_SECTIONS = 2; // matches BOOST_PATTERN.length

type SegType = 'orange' | 'gray' | 'red';

function buildSegments(effectiveness: number, isBoostActive: boolean): SegType[] {
  const eff = Math.max(1, Math.min(5, effectiveness));
  const segs: SegType[] = [
    ...Array<SegType>(eff).fill('orange'),
    ...Array<SegType>(BASE_SECTIONS - eff).fill('gray'),
  ];
  if (isBoostActive) {
    let left = BOOST_SECTIONS;
    for (let i = 0; i < segs.length && left > 0; i++) {
      if (segs[i] === 'gray') {
        segs[i] = 'red';
        left--;
      }
    }
    while (left-- > 0) segs.push('red');
  }
  return segs;
}

export function PancreasButton({
  isBoostActive,
  usesRemaining,
  onToggle,
  disabled = false,
  isBlinking = false,
  pancreasEffectiveness = 5,
}: PancreasButtonProps) {
  const canAffordBoost = !isBoostActive && usesRemaining >= 1;
  const showHint = usesRemaining > 0;
  const segs = buildSegments(pancreasEffectiveness, isBoostActive);

  const classes = [
    'pancreas-btn',
    isBoostActive ? 'pancreas-btn--boost' : '',
    !canAffordBoost && !isBoostActive ? 'pancreas-btn--locked' : '',
    disabled ? 'pancreas-btn--disabled' : '',
    isBlinking ? 'pancreas-btn--blinking' : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      title={`Pancreas (>200 mg/dL): ${isBoostActive ? 'boosted — tap to deactivate' : `${usesRemaining} boost use${usesRemaining !== 1 ? 's' : ''} remaining`}`}
    >
      <div className="pancreas-btn__top">
        <span className="pancreas-btn__emoji">{'\uD83E\uDEC1'}</span>
        <span className={`pancreas-btn__charges${usesRemaining === 0 ? ' pancreas-btn__charges--empty' : ''}`}>
          {usesRemaining}
        </span>
        {showHint && (
          <span className="pancreas-btn__hint">
            {isBoostActive ? 'BOOSTED' : 'TAP TO BOOST'}
          </span>
        )}
      </div>
      <div className="pancreas-btn__bar">
        {segs.map((type, i) => (
          <span key={i} className={`pancreas-btn__seg pancreas-btn__seg--${type}`} />
        ))}
      </div>
    </button>
  );
}
