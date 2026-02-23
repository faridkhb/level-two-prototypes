import type { GameSettings, MedicationModifiers } from '../../core/types';
import { getKcalAssessment, DEFAULT_MEDICATION_MODIFIERS, OVEREATING_PENALTY_KCAL, OVEREATING_PENALTY_WP } from '../../core/types';
import { Tooltip } from '../ui/Tooltip';
import './PlanningHeader.css';

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

  const kcalSection = (
    <div className="planning-header__kcal">
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
      <span className="planning-header__kcal-dash">{'\u2014'}</span>
      <span
        className="planning-header__kcal-assessment"
        style={{ color: assessment.color }}
      >
        {assessment.label}
      </span>
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
