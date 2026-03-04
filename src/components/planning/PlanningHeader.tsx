import type { GameSettings, MedicationModifiers, SatietyPenalty } from '../../core/types';
import { getKcalAssessment, getSatietyPenalty, DEFAULT_MEDICATION_MODIFIERS, DEFAULT_SATIETY_PENALTY } from '../../core/types';
import { Tooltip } from '../ui/Tooltip';
import './PlanningHeader.css';

const KCAL_TICKS = [
  { pct: 50, label: 'Malnourished' },
  { pct: 100, label: 'Optimal' },
];

interface PlanningHeaderProps {
  dayLabel: string;
  kcalUsed: number;
  kcalBudget: number;
  wpRemaining: number;
  satietyPenalty?: SatietyPenalty;
  settings: GameSettings;
  medicationModifiers?: MedicationModifiers;
  submitEnabled: boolean;
  onSubmit: () => void;
  hideKcal?: boolean;
}

export function PlanningHeader({
  dayLabel,
  kcalUsed,
  kcalBudget,
  wpRemaining,
  satietyPenalty = DEFAULT_SATIETY_PENALTY,
  settings: _settings,
  medicationModifiers = DEFAULT_MEDICATION_MODIFIERS,
  submitEnabled,
  onSubmit,
  hideKcal,
}: PlanningHeaderProps) {
  const effectiveKcalBudget = Math.round(kcalBudget * medicationModifiers.kcalMultiplier)
    + satietyPenalty.kcalDelta;
  const assessment = getKcalAssessment(kcalUsed, effectiveKcalBudget);
  const hasKcalMod = medicationModifiers.kcalMultiplier !== 1;
  const wpOver = wpRemaining < 0;

  // Past penalty badge info
  const hasPastBonus = satietyPenalty.wpDelta > 0;
  const hasPastPenalty = satietyPenalty.wpDelta < 0;

  // Live forecast: what penalty current kcal level will produce for next day
  const livePenalty = getSatietyPenalty(kcalUsed, effectiveKcalBudget);

  // Build tooltip for past penalty
  const kcalTooltip = hasPastPenalty && satietyPenalty.kcalDelta > 0
    ? `Overeating penalty: +${satietyPenalty.kcalDelta} kcal budget (you must eat more)`
    : hasPastPenalty
    ? `Malnourished penalty: −1 ☀️, +1 🍦`
    : hasPastBonus
    ? `Optimal bonus: +1 ☀️`
    : '';

  const wpSection = (
    <div className="planning-header__wp">
      <span className="planning-header__wp-icon">{'\u2600\uFE0F'}</span>
      <span className={`planning-header__wp-value ${wpOver ? 'planning-header__wp-value--over' : ''}`}>
        {wpRemaining}
      </span>
      {hasPastBonus && (
        <span className="planning-header__penalty-badge planning-header__penalty-badge--bonus">
          +1
        </span>
      )}
      {hasPastPenalty && (
        <span className="planning-header__penalty-badge planning-header__penalty-badge--wp">
          −1
        </span>
      )}
    </div>
  );

  const pct = effectiveKcalBudget > 0 ? (kcalUsed / effectiveKcalBudget) * 100 : 0;
  const barMaxPct = 150;
  const fillPct = Math.min(pct / barMaxPct * 100, 100);

  // Build forecast badge text (effect) and tooltip (zone name)
  let forecastBadge = '';
  let forecastTooltip = '';
  if (livePenalty.zone === 'optimal') {
    forecastBadge = '+1 ☀️';
    forecastTooltip = 'Optimal — next day ☀️ bonus';
  } else if (livePenalty.zone === 'overeating') {
    forecastBadge = `−1 ☀️, +🍦, +${livePenalty.kcalDelta} kcal`;
    forecastTooltip = 'Overeating — next day penalty';
  } else if (livePenalty.zone === 'malnourished' && kcalUsed > 0) {
    forecastBadge = '−1 ☀️, +🍦';
    forecastTooltip = 'Malnourished — next day penalty';
  }

  // Satiety label + forecast combined
  const satietyLabel = kcalUsed > 0 ? assessment.label : '';
  const satietyText = satietyLabel + (forecastBadge ? ` ${forecastBadge}` : '');

  const kcalSection = (
    <div className="planning-header__kcal-bar-wrap">
      {satietyText && (
        <div className="planning-header__satiety-indicator">
          <Tooltip text={forecastTooltip || assessment.label} position="bottom">
            <span
              className="planning-header__satiety-badge"
              style={{ color: assessment.color }}
            >
              {satietyText}
            </span>
          </Tooltip>
        </div>
      )}
      <div className="planning-header__kcal-bar">
        <div
          className="planning-header__kcal-bar-fill"
          style={{ width: `${fillPct}%`, background: assessment.color }}
        />
        {/* Zone backgrounds */}
        <div className="planning-header__kcal-zone planning-header__kcal-zone--red" style={{ left: '0%', width: `${(50 / barMaxPct) * 100}%` }} />
        <div className="planning-header__kcal-zone planning-header__kcal-zone--green" style={{ left: `${(50 / barMaxPct) * 100}%`, width: `${(50 / barMaxPct) * 100}%` }} />
        <div className="planning-header__kcal-zone planning-header__kcal-zone--orange" style={{ left: `${(100 / barMaxPct) * 100}%`, width: `${(50 / barMaxPct) * 100}%` }} />
        {KCAL_TICKS.map(tick => {
          const xPct = (tick.pct / barMaxPct) * 100;
          return (
            <div key={tick.pct} className="planning-header__kcal-tick" style={{ left: `${xPct}%` }}>
              <div className="planning-header__kcal-tick-line planning-header__kcal-tick-line--boundary" />
            </div>
          );
        })}
      </div>
      <div className="planning-header__kcal-bar-footer">
        <div className="planning-header__kcal-counter">
          <span className="planning-header__kcal-value">{kcalUsed}</span>
          <span className="planning-header__kcal-unit">
            /{effectiveKcalBudget} kcal
            {hasKcalMod && <span className="planning-header__kcal-mod"> ({Math.round(medicationModifiers.kcalMultiplier * 100)}%)</span>}
          </span>
          {satietyPenalty.kcalDelta > 0 && (
            <span className="planning-header__penalty-badge planning-header__penalty-badge--kcal">
              +{satietyPenalty.kcalDelta}
            </span>
          )}
        </div>
        <button
          className={`planning-header__submit ${submitEnabled ? '' : 'planning-header__submit--disabled'}`}
          onClick={onSubmit}
          disabled={!submitEnabled}
          title={submitEnabled ? 'Submit your meal plan' : 'Place food to reach Optimal zone (50%+)'}
        >
          Submit
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="planning-header">
        <div className="planning-header__day">{dayLabel}</div>

        {wpSection}

        <button
          className="planning-header__menu-btn"
          disabled
          title="Menu (coming soon)"
        >
          ☰
        </button>
      </div>

      {!hideKcal && (kcalTooltip ? (
        <Tooltip text={kcalTooltip} position="bottom">
          {kcalSection}
        </Tooltip>
      ) : kcalSection)}
    </>
  );
}
