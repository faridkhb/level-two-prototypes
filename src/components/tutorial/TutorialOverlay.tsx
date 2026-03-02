import { useEffect, useRef, useState, useCallback } from 'react';
import type { TutorialStep } from './tutorialData';
import './TutorialOverlay.css';

interface TutorialOverlayProps {
  step: TutorialStep;
  onAdvance: () => void;
}

// Map logical highlight target names to CSS selectors
const HIGHLIGHT_SELECTORS: Record<string, string> = {
  'header': '.planning-header',
  'day-label': '.planning-header__day',
  'wp-counter': '.planning-header__wp',
  'kcal-bar': '.planning-header__kcal-bar-wrap',
  'submit-btn': '.planning-header__submit',
  'forecast-badge': '.planning-header__assessment-badge',
  'graph': '.bg-graph',
  'insulin-bars': '.bg-graph',
  'ship-inventory': '.ship-inventory',
  'intervention-inventory': '.planning-phase__interventions-row',
  'med-toggles': '.medication-panel',
  'slot-grid': '.slot-grid',
  'boost-btn': '.pancreas-button',
};

function getHighlightSelector(target: string): string | null {
  // Direct lookup
  if (HIGHLIGHT_SELECTORS[target]) return HIGHLIGHT_SELECTORS[target];

  // slot:N → .slot-grid__slot[data-slot="N"]
  if (target.startsWith('slot:')) {
    const n = target.split(':')[1];
    return `.slot-grid__slot[data-slot="${n}"]`;
  }

  // food:id → .ship-card[data-food="id"]
  if (target.startsWith('food:')) {
    const id = target.split(':')[1];
    return `.ship-card[data-food="${id}"]`;
  }

  // intervention:id → .intervention-card[data-intervention="id"]
  if (target.startsWith('intervention:')) {
    const id = target.split(':')[1];
    return `.intervention-card[data-intervention="${id}"]`;
  }

  // medication:id → .medication-toggle[data-medication="id"]
  if (target.startsWith('medication:')) {
    const id = target.split(':')[1];
    return `.medication-toggle[data-medication="${id}"]`;
  }

  return null;
}

// Expression emoji for Doctor Alice avatar
function getExpressionEmoji(expression?: string): string {
  switch (expression) {
    case 'happy': return '\ud83d\ude0a';
    case 'concerned': return '\ud83d\ude1f';
    case 'thinking': return '\ud83e\udd14';
    case 'celebrating': return '\ud83c\udf89';
    default: return '\ud83d\udc69\u200d\u2695\ufe0f';
  }
}

// Bubble type icon
function getBubbleIcon(type: string): string {
  switch (type) {
    case 'hint': return '\ud83d\udca1 ';
    case 'warning': return '\u26a0\ufe0f ';
    case 'success': return '\u2728 ';
    default: return '';
  }
}

export function TutorialOverlay({ step, onAdvance }: TutorialOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  // Compute spotlight position
  useEffect(() => {
    if (!step.highlight) {
      setSpotlightRect(null);
      return;
    }

    const selector = getHighlightSelector(step.highlight);
    if (!selector) {
      setSpotlightRect(null);
      return;
    }

    const el = document.querySelector(selector);
    if (!el) {
      setSpotlightRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    setSpotlightRect(rect);
  }, [step]);

  // Handle click to advance on tap
  const handleClick = useCallback(() => {
    if (step.advanceOn === 'tap' || step.advanceOn === 'auto') {
      onAdvance();
    }
  }, [step.advanceOn, onAdvance]);

  // Bubble CSS class
  const bubbleType = step.bubble?.type ?? 'dialogue';
  const bubblePosition = step.bubble?.position ?? 'bottom';

  // Position bubble near spotlight if available, otherwise center
  const bubbleStyle: React.CSSProperties = {};
  if (spotlightRect && bubblePosition !== 'center') {
    if (bubblePosition === 'top' || spotlightRect.top > window.innerHeight * 0.5) {
      // Show bubble above the spotlight
      bubbleStyle.bottom = `${window.innerHeight - spotlightRect.top + 16}px`;
      bubbleStyle.left = `${Math.max(16, Math.min(spotlightRect.left, window.innerWidth - 340))}px`;
    } else {
      // Show bubble below the spotlight
      bubbleStyle.top = `${spotlightRect.bottom + 16}px`;
      bubbleStyle.left = `${Math.max(16, Math.min(spotlightRect.left, window.innerWidth - 340))}px`;
    }
  }

  // Spotlight clip path for dark overlay
  const clipPath = spotlightRect
    ? `polygon(
        0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
        ${spotlightRect.left - 8}px ${spotlightRect.top - 8}px,
        ${spotlightRect.left - 8}px ${spotlightRect.bottom + 8}px,
        ${spotlightRect.right + 8}px ${spotlightRect.bottom + 8}px,
        ${spotlightRect.right + 8}px ${spotlightRect.top - 8}px,
        ${spotlightRect.left - 8}px ${spotlightRect.top - 8}px
      )`
    : undefined;

  return (
    <div
      ref={overlayRef}
      className="tutorial-overlay"
      onClick={handleClick}
    >
      {/* Dark backdrop with spotlight cutout */}
      <div
        className="tutorial-overlay__backdrop"
        style={clipPath ? { clipPath } : undefined}
      />

      {/* Spotlight highlight border */}
      {spotlightRect && (
        <div
          className={`tutorial-overlay__spotlight tutorial-overlay__spotlight--${step.highlightType ?? 'spotlight'}`}
          style={{
            top: spotlightRect.top - 8,
            left: spotlightRect.left - 8,
            width: spotlightRect.width + 16,
            height: spotlightRect.height + 16,
          }}
        />
      )}

      {/* Bubble */}
      {step.bubble && (
        <div
          className={`tutorial-bubble tutorial-bubble--${bubbleType} ${bubblePosition === 'center' ? 'tutorial-bubble--center' : ''}`}
          style={bubblePosition !== 'center' ? bubbleStyle : undefined}
        >
          <span className="tutorial-bubble__avatar">
            {getExpressionEmoji(step.bubble.expression)}
          </span>
          <div className="tutorial-bubble__content">
            <span className="tutorial-bubble__text">
              {getBubbleIcon(bubbleType)}{step.bubble.text}
            </span>
            {step.advanceOn === 'tap' && (
              <span className="tutorial-bubble__tap-hint">Tap to continue</span>
            )}
            {step.advanceOn === 'action' && (
              <span className="tutorial-bubble__tap-hint">Do the action to continue</span>
            )}
          </div>
        </div>
      )}

      {/* CTA animations */}
      {step.cta?.type === 'tap-pulse' && spotlightRect && (
        <div
          className="tutorial-cta tutorial-cta--tap-pulse"
          style={{
            top: spotlightRect.top + spotlightRect.height / 2,
            left: spotlightRect.left + spotlightRect.width / 2,
          }}
        />
      )}

      {step.cta?.type === 'bounce' && spotlightRect && (
        <div
          className="tutorial-cta tutorial-cta--bounce"
          style={{
            top: spotlightRect.top - 20,
            left: spotlightRect.left + spotlightRect.width / 2,
          }}
        >
          {'\u261d\ufe0f'}
        </div>
      )}
    </div>
  );
}
