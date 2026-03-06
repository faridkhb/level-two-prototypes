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
  'forecast-badge': '.planning-header__satiety-badge',
  'graph': '.bg-graph__svg',
  'insulin-bars': '.bg-graph__svg',
  'ship-inventory': '.ship-inventory',
  'intervention-inventory': '.ship-inventory__grid--actions',
  'med-toggles': '.ship-inventory__grid--actions',
  'slot-grid': '.slot-grid',
  'boost-btn': '.pancreas-button',
};

function getHighlightSelector(target: string): string | null {
  // Direct lookup
  if (HIGHLIGHT_SELECTORS[target]) return HIGHLIGHT_SELECTORS[target];

  // slot:N → .slot-container-wrap[data-slot="N"]
  if (target.startsWith('slot:')) {
    const n = target.split(':')[1];
    return `.slot-container-wrap[data-slot="${n}"]`;
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

// Resolve highlight targets to DOMRects
function resolveHighlightRects(highlight: string | string[] | undefined): DOMRect[] {
  if (!highlight) return [];
  const targets = Array.isArray(highlight) ? highlight : [highlight];
  const rects: DOMRect[] = [];
  for (const target of targets) {
    const selector = getHighlightSelector(target);
    if (!selector) continue;
    const el = document.querySelector(selector);
    if (!el) continue;
    rects.push(el.getBoundingClientRect());
  }
  return rects;
}

export function TutorialOverlay({ step, onAdvance }: TutorialOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [spotlightRects, setSpotlightRects] = useState<DOMRect[]>([]);

  // For 'action' steps: overlay is pass-through, user interacts with game
  const isPassthrough = step.advanceOn === 'action';

  // Compute spotlight positions for all highlight targets
  useEffect(() => {
    const rects = resolveHighlightRects(step.highlight);
    setSpotlightRects(rects);
  }, [step]);

  // Handle click on overlay to advance on tap
  const handleOverlayClick = useCallback(() => {
    if (step.advanceOn === 'tap' || step.advanceOn === 'auto') {
      onAdvance();
    }
  }, [step.advanceOn, onAdvance]);

  // Handle click on bubble — only advances for tap steps, NOT action steps
  const handleBubbleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (step.advanceOn === 'tap' || step.advanceOn === 'auto') {
      onAdvance();
    }
    // action steps: bubble click is a no-op
  }, [step.advanceOn, onAdvance]);

  // Bubble CSS class
  const bubbleType = step.bubble?.type ?? 'dialogue';
  const bubblePosition = step.bubble?.position ?? 'bottom';

  // Position bubble near first spotlight rect if available, otherwise center horizontally
  const primaryRect = spotlightRects[0] ?? null;
  const bubbleStyle: React.CSSProperties = {};
  if (primaryRect && bubblePosition !== 'center') {
    if (bubblePosition === 'bottom') {
      // Force bubble below the spotlight, centered horizontally (clamped to viewport)
      const belowTop = primaryRect.bottom + 16;
      bubbleStyle.top = `${Math.min(belowTop, window.innerHeight - 80)}px`;
      bubbleStyle.left = '50%';
    } else if (bubblePosition === 'top' || primaryRect.top > window.innerHeight * 0.5) {
      // Show bubble above the spotlight
      bubbleStyle.bottom = `${window.innerHeight - primaryRect.top + 16}px`;
      bubbleStyle.left = `${Math.max(16, Math.min(primaryRect.left, window.innerWidth - 340))}px`;
    } else {
      // Show bubble below the spotlight (auto)
      bubbleStyle.top = `${primaryRect.bottom + 16}px`;
      bubbleStyle.left = `${Math.max(16, Math.min(primaryRect.left, window.innerWidth - 340))}px`;
    }
  }
  // Floating: centered horizontally with translateX(-50%) — needs special animation
  const needsCenterTransform = bubblePosition === 'bottom' && primaryRect;
  const isFloating = needsCenterTransform || (!primaryRect && bubblePosition !== 'center');
  if (!primaryRect && bubblePosition !== 'center') {
    // No spotlight — center horizontally, 52px from top
    bubbleStyle.top = '52px';
    bubbleStyle.left = '50%';
  }

  // Build clip-path polygon that cuts out ALL highlighted areas
  const buildClipPath = (rects: DOMRect[]): string | undefined => {
    if (rects.length === 0) return undefined;
    const PAD = 8;
    // Start with full screen, then cut out each rect (using evenodd rule)
    let path = '0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%';
    for (const rect of rects) {
      const l = rect.left - PAD;
      const t = rect.top - PAD;
      const r = rect.right + PAD;
      const b = rect.bottom + PAD;
      path += `, ${l}px ${t}px, ${l}px ${b}px, ${r}px ${b}px, ${r}px ${t}px, ${l}px ${t}px`;
    }
    return `polygon(evenodd, ${path})`;
  };

  const clipPath = buildClipPath(spotlightRects);

  return (
    <div
      ref={overlayRef}
      className={`tutorial-overlay ${isPassthrough ? 'tutorial-overlay--passthrough' : ''}`}
      onClick={isPassthrough ? undefined : handleOverlayClick}
    >
      {/* Dark backdrop with spotlight cutouts — hidden in passthrough mode */}
      {!isPassthrough && (
        <div
          className="tutorial-overlay__backdrop"
          style={clipPath ? { clipPath } : undefined}
        />
      )}

      {/* Spotlight highlight borders — shown on ALL targets */}
      {spotlightRects.map((rect, i) => (
        <div
          key={i}
          className={`tutorial-overlay__spotlight tutorial-overlay__spotlight--${step.highlightType ?? 'spotlight'}`}
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Bubble — always visible, only clickable for tap steps */}
      {step.bubble && (
        <div
          className={`tutorial-bubble tutorial-bubble--${bubbleType} ${bubblePosition === 'center' ? 'tutorial-bubble--center' : ''} ${isFloating ? 'tutorial-bubble--floating' : ''} ${isPassthrough ? 'tutorial-bubble--action' : ''}`}
          style={bubblePosition !== 'center' ? bubbleStyle : undefined}
          onClick={handleBubbleClick}
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
              <span className="tutorial-bubble__tap-hint">Complete the action above</span>
            )}
          </div>
        </div>
      )}

      {/* CTA animations — use first spotlight rect */}
      {step.cta?.type === 'tap-pulse' && primaryRect && (
        <div
          className="tutorial-cta tutorial-cta--tap-pulse"
          style={{
            top: primaryRect.top + primaryRect.height / 2,
            left: primaryRect.left + primaryRect.width / 2,
          }}
        />
      )}

      {step.cta?.type === 'bounce' && primaryRect && (
        <div
          className="tutorial-cta tutorial-cta--bounce"
          style={{
            top: primaryRect.top - 20,
            left: primaryRect.left + primaryRect.width / 2,
          }}
        >
          {'\u261d\ufe0f'}
        </div>
      )}
    </div>
  );
}
