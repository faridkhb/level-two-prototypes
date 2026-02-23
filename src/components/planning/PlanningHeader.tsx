import type { GameSettings, MedicationModifiers } from '../../core/types';
import { getKcalAssessment, getOvereatingPenalty, DEFAULT_MEDICATION_MODIFIERS, OVEREATING_PENALTY_KCAL, OVEREATING_PENALTY_WP } from '../../core/types';
import { Tooltip } from '../ui/Tooltip';
import './PlanningHeader.css';

const KCAL_TICKS = [
  { pct: 25, label: 'Starving' },
  { pct: 50, label: 'Hungry' },
  { pct: 75, label: 'Light' },
  { pct: 100, label: 'Well Fed' },
  { pct: 120, label: 'Full' },
  { pct: 150, label: 'Overeating' },
];

interface PlanningHeaderProps {
  dayLabel: string;
  kcalUsed: number;
  kcalBudget: number;
  wpUsed: number;
  wpBudget: number;
  wpPenalty?: number;
  overeatingPenalty?: number;
  settings: GameSettings;
  medicationModifiers?: MedicationModifiers;
  submitEnabled: boolean;
  onSubmit: () => void;
  onToggleTimeFormat: () => void;
  onToggleBgUnit: () => void;
}

export function PlanningHeader({
  dayLabel,
  kcalUsed,
  kcalBudget,
  wpUsed,
  wpBudget,
  wpPenalty = 0,
  overeatingPenalty = 0,
  settings,
  medicationModifiers = DEFAULT_MEDICATION_MODIFIERS,
  submitEnabled,
  onSubmit,
  onToggleTimeFormat,
  onToggleBgUnit,
}: PlanningHeaderProps) {
  const effectiveKcalBudget = Math.round(kcalBudget * medicationModifiers.kcalMultiplier)
    + overeatingPenalty * OVEREATING_PENALTY_KCAL;
  const rawWpBudget = wpBudget + medicationModifiers.wpBonus;
  const wpFloor = Math.ceil(wpBudget * 0.5);
  const totalWpPenalty = wpPenalty + overeatingPenalty * OVEREATING_PENALTY_WP;
  const effectiveWpBudget = Math.max(rawWpBudget - totalWpPenalty, wpFloor);
  const assessment = getKcalAssessment(kcalUsed, effectiveKcalBudget);
  const wpOver = wpUsed > effectiveWpBudget;
  const wpPerfect = wpUsed === effectiveWpBudget && wpUsed > 0;
  const hasKcalMod = medicationModifiers.kcalMultiplier !== 1;
  const hasWpMod = medicationModifiers.wpBonus !== 0;
  const hasPenalty = wpPenalty > 0;
  const hasOvereating = overeatingPenalty > 0;

  // Live forecast: penalty being built up on current day
  const liveOvereatingSteps = getOvereatingPenalty(kcalUsed, effectiveKcalBudget);
  const forecastWp = liveOvereatingSteps * OVEREATING_PENALTY_WP;
  const forecastKcal = liveOvereatingSteps * OVEREATING_PENALTY_KCAL;

  const wpTooltip = [
    hasPenalty ? `${wpPenalty} unspent WP from previous day` : '',
    hasOvereating ? `Overeating penalty: −${overeatingPenalty * OVEREATING_PENALTY_WP} WP` : '',
  ].filter(Boolean).join('. ');

  const kcalTooltip = hasOvereating
    ? `Overeating penalty: +${overeatingPenalty * OVEREATING_PENALTY_KCAL} kcal budget (you must eat more)`
    : '';

  const wpSection = (
    <div className="planning-header__wp">
      <span className="planning-header__wp-label">WP</span>
      <span className={`planning-header__wp-value ${wpOver ? 'planning-header__wp-value--over' : ''}`}>
        {wpUsed}/
        {(hasPenalty || hasOvereating) && (
          <span className="planning-header__wp-strikethrough">{rawWpBudget}</span>
        )}
        {(hasPenalty || hasOvereating) ? ' ' : ''}{effectiveWpBudget}
        {hasWpMod && <span className="planning-header__wp-bonus"> (+{medicationModifiers.wpBonus})</span>}
      </span>
      <span className="planning-header__wp-icon">{'\u2600\uFE0F'}</span>
      {wpPerfect && <span className="planning-header__wp-perfect">{'\u2713'}</span>}
      {hasOvereating && (
        <span className="planning-header__penalty-badge planning-header__penalty-badge--wp">
          −{overeatingPenalty * OVEREATING_PENALTY_WP}
        </span>
      )}
    </div>
  );

  const pct = effectiveKcalBudget > 0 ? (kcalUsed / effectiveKcalBudget) * 100 : 0;
  const barMaxPct = 150;
  const fillPct = Math.min(pct / barMaxPct * 100, 100);
  const activeTickPct = pct === 0 ? 0
    : pct < 25 ? 25
    : pct < 50 ? 50
    : pct < 75 ? 75
    : pct < 100 ? 100
    : pct < 120 ? 120
    : 150;

  const kcalSection = (
    <div className="planning-header__kcal-bar-wrap">
      <div className="planning-header__kcal-bar-header">
        <span className="planning-header__kcal-value">{kcalUsed}</span>
        <span className="planning-header__kcal-unit">
          /{effectiveKcalBudget} kcal
          {hasKcalMod && <span className="planning-header__kcal-mod"> ({Math.round(medicationModifiers.kcalMultiplier * 100)}%)</span>}
        </span>
        {hasOvereating && (
          <span className="planning-header__penalty-badge planning-header__penalty-badge--kcal">
            +{overeatingPenalty * OVEREATING_PENALTY_KCAL}
          </span>
        )}
        {liveOvereatingSteps > 0 && (
          <Tooltip text={`Overeating penalty for next day: \u2212${forecastWp} WP, +${forecastKcal} kcal budget`} position="bottom">
            <span className="planning-header__assessment-badge" style={{ background: `${assessment.color}22`, borderColor: `${assessment.color}44` }}>
              <span className="planning-header__forecast-wp">{'\u2212'}{forecastWp} WP</span>
              <span className="planning-header__forecast-kcal">+{forecastKcal} kcal</span>
            </span>
          </Tooltip>
        )}
      </div>
      <div className="planning-header__kcal-bar">
        <div
          className="planning-header__kcal-bar-fill"
          style={{ width: `${fillPct}%`, background: assessment.color }}
        />
        {KCAL_TICKS.map(tick => {
          const xPct = (tick.pct / barMaxPct) * 100;
          const isActive = tick.pct === activeTickPct;
          return (
            <div key={tick.pct} className="planning-header__kcal-tick" style={{ left: `${xPct}%` }}>
              <div
                className={`planning-header__kcal-tick-line${isActive ? ' planning-header__kcal-tick-line--active' : ''}`}
                style={isActive ? { background: assessment.color } : undefined}
              />
            </div>
          );
        })}
      </div>
      <div className="planning-header__kcal-bar-labels">
        {pct === 0 && (
          <span className="planning-header__kcal-bar-fasting">Fasting</span>
        )}
        {KCAL_TICKS.map(tick => {
          const xPct = (tick.pct / barMaxPct) * 100;
          const isActive = tick.pct === activeTickPct;
          if (!isActive) return null;
          return (
            <span
              key={tick.pct}
              className="planning-header__kcal-bar-label planning-header__kcal-bar-label--active"
              style={{ left: `${xPct}%`, color: assessment.color }}
            >
              {tick.label}
            </span>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="planning-header">
      <div className="planning-header__day">{dayLabel}</div>

      {wpTooltip ? (
        <Tooltip text={wpTooltip} position="bottom">
          {wpSection}
        </Tooltip>
      ) : wpSection}

      {kcalTooltip ? (
        <Tooltip text={kcalTooltip} position="bottom">
          {kcalSection}
        </Tooltip>
      ) : kcalSection}

      <button
        className={`planning-header__submit ${submitEnabled ? '' : 'planning-header__submit--disabled'}`}
        onClick={onSubmit}
        disabled={!submitEnabled}
        title={submitEnabled ? 'Submit your meal plan' : 'Eat at least Light to submit'}
      >
        Submit
      </button>

      <div className="planning-header__settings">
        <button
          className="planning-header__toggle"
          onClick={onToggleTimeFormat}
          title="Toggle time format"
        >
          {settings.timeFormat}
        </button>
        <button
          className="planning-header__toggle"
          onClick={onToggleBgUnit}
          title="Toggle BG unit"
        >
          {settings.bgUnit}
        </button>
      </div>
    </div>
  );
}
