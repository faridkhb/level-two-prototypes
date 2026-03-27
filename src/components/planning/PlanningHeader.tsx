import type { MedicationModifiers } from '../../core/types';
import { getKcalAssessment, getSatietyPenalty, DEFAULT_MEDICATION_MODIFIERS } from '../../core/types';
import './PlanningHeader.css';

const KCAL_TICKS = [
  { pct: 60, label: 'Malnourished' },
  { pct: 80, label: 'Optimal' },
];

interface PlanningHeaderProps {
  dayLabel: string;
  wpRemaining: number;
}

export function PlanningHeader({
  dayLabel,
  wpRemaining,
}: PlanningHeaderProps) {
  const wpOver = wpRemaining < 0;

  const wpSection = (
    <div className="planning-header__wp">
      <span className="planning-header__wp-icon">{'\u2600\uFE0F'}</span>
      <span className={`planning-header__wp-value ${wpOver ? 'planning-header__wp-value--over' : ''}`}>
        {wpRemaining}
      </span>
    </div>
  );

  return (
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
  );
}

// Exported KcalBar component for use between graph and slots
interface KcalBarProps {
  kcalUsed: number;
  kcalBudget: number;
  dayLabel: string;
  wpRemaining: number;
  medicationModifiers?: MedicationModifiers;
  submitEnabled: boolean;
  onSubmit: () => void;
  hidden?: boolean;
  tutorialActive?: boolean;
}

export function KcalBar({
  kcalUsed,
  kcalBudget,
  dayLabel,
  wpRemaining,
  medicationModifiers = DEFAULT_MEDICATION_MODIFIERS,
  submitEnabled,
  onSubmit,
  hidden,
  tutorialActive,
}: KcalBarProps) {
  const wpOver = wpRemaining < 0;
  // When hidden, show only the Submit button (no kcal info)
  if (hidden) {
    return (
      <div className="planning-header__kcal-bar-wrap">
        <div className="planning-header__kcal-bar-footer" style={{ justifyContent: 'center' }}>
          <button
            className={`planning-header__submit ${submitEnabled ? '' : 'planning-header__submit--disabled'} ${tutorialActive && submitEnabled ? 'planning-header__submit--tutorial-pulse' : ''}`}
            onClick={onSubmit}
            disabled={!submitEnabled}
            title={submitEnabled ? 'Submit your meal plan' : 'Place food to reach Optimal zone (50%+)'}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  const effectiveKcalBudget = Math.round(kcalBudget * medicationModifiers.kcalMultiplier);
  const assessment = getKcalAssessment(kcalUsed, effectiveKcalBudget);
  const hasKcalMod = medicationModifiers.kcalMultiplier !== 1;

  const pct = effectiveKcalBudget > 0 ? (kcalUsed / effectiveKcalBudget) * 100 : 0;
  const barMaxPct = 150;
  const fillPct = Math.min(pct / barMaxPct * 100, 100);

  const livePenalty = getSatietyPenalty(kcalUsed, effectiveKcalBudget);
  const satietyLabel = kcalUsed > 0 ? assessment.label : '';
  const pancreasFatigue = livePenalty.zone === 'overeating';
  const satietyText = satietyLabel + (pancreasFatigue ? ' +Pancreas Fatigue' : '');

  return (
    <div className="planning-header__kcal-bar-wrap">
      <div className="planning-header__info-row">
        <div className="planning-header__wp">
          <span className="planning-header__wp-icon">{'\u2600\uFE0F'}</span>
          <span className={`planning-header__wp-value ${wpOver ? 'planning-header__wp-value--over' : ''}`}>
            {wpRemaining}
          </span>
        </div>
        {satietyText ? (
          <span
            className="planning-header__satiety-badge"
            style={{ color: assessment.color }}
          >
            {satietyText}
          </span>
        ) : <span />}
        <div className="planning-header__day">{dayLabel}</div>
      </div>
      <div className="planning-header__kcal-row">
        <div className="planning-header__kcal-bar">
          <div
            className="planning-header__kcal-bar-fill"
            style={{ width: `${fillPct}%`, background: assessment.color }}
          />
          <div className="planning-header__kcal-zone planning-header__kcal-zone--red" style={{ left: '0%', width: `${(60 / barMaxPct) * 100}%` }} />
          <div className="planning-header__kcal-zone planning-header__kcal-zone--green" style={{ left: `${(60 / barMaxPct) * 100}%`, width: `${(20 / barMaxPct) * 100}%` }} />
          <div className="planning-header__kcal-zone planning-header__kcal-zone--orange" style={{ left: `${(80 / barMaxPct) * 100}%`, width: `${(70 / barMaxPct) * 100}%` }} />
          {KCAL_TICKS.map(tick => {
            const xPct = (tick.pct / barMaxPct) * 100;
            return (
              <div key={tick.pct} className="planning-header__kcal-tick" style={{ left: `${xPct}%` }}>
                <div className="planning-header__kcal-tick-line planning-header__kcal-tick-line--boundary" />
              </div>
            );
          })}
          <div className="planning-header__kcal-inner-label">
            <span className="planning-header__kcal-value">{kcalUsed}</span>
            <span className="planning-header__kcal-unit">
              /{effectiveKcalBudget} kcal
              {hasKcalMod && <span className="planning-header__kcal-mod"> ({Math.round(medicationModifiers.kcalMultiplier * 100)}%)</span>}
            </span>
          </div>
        </div>
        <button
          className={`planning-header__submit ${submitEnabled ? '' : 'planning-header__submit--disabled'} ${tutorialActive && submitEnabled ? 'planning-header__submit--tutorial-pulse' : ''}`}
          onClick={onSubmit}
          disabled={!submitEnabled}
          title={submitEnabled ? 'Submit your meal plan' : 'Place food to reach Optimal zone (50%+)'}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
