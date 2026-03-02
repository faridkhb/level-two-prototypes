import { useState, useCallback, useEffect } from 'react';
import { getTutorialSteps } from './tutorialData';
import type { TutorialStep } from './tutorialData';

export interface UseTutorialReturn {
  currentStep: TutorialStep | null;
  stepIndex: number;
  stepsTotal: number;
  advance: () => void;
  isActive: boolean;
}

export function useTutorial(levelId: string | null, day: number): UseTutorialReturn {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = getTutorialSteps(levelId, day);
  const stepsTotal = steps?.length ?? 0;
  const currentStep = steps?.[stepIndex] ?? null;
  const isActive = currentStep !== null;

  // Reset step index when level or day changes
  useEffect(() => {
    setStepIndex(0);
  }, [levelId, day]);

  const advance = useCallback(() => {
    setStepIndex(i => {
      if (!steps || i >= steps.length - 1) return steps?.length ?? 0; // go past end = done
      return i + 1;
    });
  }, [steps]);

  return { currentStep, stepIndex, stepsTotal, advance, isActive };
}
