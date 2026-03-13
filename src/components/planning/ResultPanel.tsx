import type { PenaltyResult, SatietyPenalty } from '../../core/types';
import { DEFAULT_SATIETY_PENALTY } from '../../core/types';
import './ResultPanel.css';

interface ResultPanelProps {
  result: PenaltyResult;
  currentDay: number;
  totalDays: number;
  unspentWp?: number;
  satietyResult?: SatietyPenalty;
  onRetry: () => void;
  onNextDay: () => void;
  isTutorial?: boolean;
  onNextLevel?: () => void;
  onBackToTutorials?: () => void;
}

function StarDisplay({ count }: { count: number }) {
  return (
    <div className="result-panel__stars">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={`result-panel__star ${i < count ? 'result-panel__star--filled' : 'result-panel__star--empty'}`}
        >
          {i < count ? '\u2B50' : '\u2606'}
        </span>
      ))}
    </div>
  );
}

export function ResultPanel({
  result, currentDay, totalDays, unspentWp: _unspentWp = 0,
  satietyResult = DEFAULT_SATIETY_PENALTY, onRetry, onNextDay,
  isTutorial, onNextLevel, onBackToTutorials,
}: ResultPanelProps) {
  const isDefeat = result.stars === 0;
  const isPerfect = result.stars === 3;
  const isLastDay = currentDay >= totalDays;
  const isSuccess = result.stars >= 1;

  // Satiety zone result message
  const satietyMessage = (() => {
    if (isLastDay) return null;
    switch (satietyResult.zone) {
      case 'optimal':
        return { text: `Optimal! Day ${currentDay + 1}: +1 \u2600\uFE0F`, color: '#48bb78', icon: '\u2728' };
      case 'malnourished':
        return { text: `Malnourished! Day ${currentDay + 1}: \u22121 \u2600\uFE0F, +1 \ud83c\udf66`, color: '#e53e3e', icon: '\u26a0\ufe0f' };
      case 'overeating':
        return { text: `Overeating! Day ${currentDay + 1}: \u22121 \u2600\uFE0F, +1 \ud83c\udf66, +100 kcal`, color: '#ed8936', icon: '\u26a0\ufe0f' };
    }
  })();

  return (
    <div className={`result-panel result-panel--${result.label.toLowerCase()}`}>
      <div className="result-panel__penalty">
        <span className="result-panel__penalty-value">{result.totalPenalty}</span>
        <span className="result-panel__penalty-text"> excess sugar points</span>
      </div>

      {satietyMessage && (
        <div className="result-panel__satiety" style={{ color: satietyMessage.color }}>
          {satietyMessage.icon} {satietyMessage.text}
        </div>
      )}

      <StarDisplay count={result.stars} />

      <div className="result-panel__label">{result.label}!</div>

      {/* Tutorial mode buttons */}
      {isTutorial ? (
        <div className="result-panel__actions">
          {isDefeat && (
            <button className="result-panel__btn result-panel__btn--retry" onClick={onRetry}>
              Retry Level
            </button>
          )}
          {isSuccess && !isLastDay && (
            <button className="result-panel__btn result-panel__btn--next" onClick={onNextDay}>
              Next Day
            </button>
          )}
          {!isPerfect && !isDefeat && (
            <button className="result-panel__btn result-panel__btn--retry" onClick={onRetry}>
              Retry Day
            </button>
          )}
          {isSuccess && isLastDay && onNextLevel && (
            <button className="result-panel__btn result-panel__btn--next" onClick={onNextLevel}>
              Next Level
            </button>
          )}
          {onBackToTutorials && (
            <button className="result-panel__btn result-panel__btn--back" onClick={onBackToTutorials}>
              Back to Tutorials
            </button>
          )}
        </div>
      ) : (
        <div className="result-panel__actions">
          {!isPerfect && (
            <button className="result-panel__btn result-panel__btn--retry" onClick={onRetry}>
              Retry Day
            </button>
          )}
          {!isDefeat && !isLastDay && (
            <button className="result-panel__btn result-panel__btn--next" onClick={onNextDay}>
              Next Day
            </button>
          )}
          {!isDefeat && isLastDay && (
            <button className="result-panel__btn result-panel__btn--next" onClick={onRetry}>
              Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
