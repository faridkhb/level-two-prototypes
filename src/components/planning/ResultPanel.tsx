import type { PenaltyResult } from '../../core/types';
import './ResultPanel.css';

interface ResultPanelProps {
  result: PenaltyResult;
  currentDay: number;
  totalDays: number;
  unspentWp?: number;
  onRetry: () => void;
  onNextDay: () => void;
  isTutorial?: boolean;
  onNextLevel?: () => void;
  onBackToTutorials?: () => void;
  // Results reveal animation props
  visibleStars?: number;     // 0-3; how many stars are filled (undefined = show all earned)
  showLabel?: boolean;       // show result label (undefined = true)
  displayedPenalty?: number; // animated counter value (undefined = show totalPenalty)
}

function StarDisplay({ earned, visible }: { earned: number; visible: number }) {
  return (
    <div className="result-panel__stars">
      {[0, 1, 2].map(i => {
        const isFilled = i < Math.min(visible, earned);
        return (
          <span
            key={`star-${i}-${isFilled ? 'on' : 'off'}`}
            className={`result-panel__star ${isFilled ? 'result-panel__star--filled' : 'result-panel__star--empty'}`}
          >
            {isFilled ? '\u2B50' : '\u2606'}
          </span>
        );
      })}
    </div>
  );
}

export function ResultPanel({
  result, currentDay, totalDays, unspentWp: _unspentWp = 0,
  onRetry, onNextDay,
  isTutorial, onNextLevel, onBackToTutorials,
  visibleStars, showLabel, displayedPenalty,
}: ResultPanelProps) {
  const isDefeat = result.stars === 0;
  const isPerfect = result.stars === 3;
  const isLastDay = currentDay >= totalDays;
  const isSuccess = result.stars >= 1;

  // During animation: use animated values; in full results: use final values
  const starsToShow = visibleStars ?? result.stars;
  const labelVisible = showLabel ?? true;
  const penaltyValue = displayedPenalty ?? result.totalPenalty;
  const isAnimating = visibleStars !== undefined || showLabel === false;

  return (
    <div className={`result-panel result-panel--${result.label.toLowerCase()}`}>
      <div className="result-panel__penalty">
        <span className="result-panel__penalty-value">
          {Math.round(penaltyValue * 10) / 10}
        </span>
        <span className="result-panel__penalty-text"> Excess Glucose</span>
      </div>

      <StarDisplay earned={result.stars} visible={starsToShow} />

      {labelVisible && (
        <div className={`result-panel__label result-panel__label--animate`}>
          {result.label}!
        </div>
      )}

      {isAnimating && !labelVisible && (
        <div className="result-panel__skip-hint">tap to skip</div>
      )}

      {/* Buttons: only shown when animation is complete */}
      {labelVisible && (
        <>
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
        </>
      )}
    </div>
  );
}
