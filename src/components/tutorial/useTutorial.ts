import { useState, useCallback, useEffect } from 'react';
import { getTutorialSteps } from './tutorialData';
import type { TutorialStep, ExpectedAction } from './tutorialData';

export interface UseTutorialReturn {
  currentStep: TutorialStep | null;
  stepIndex: number;
  stepsTotal: number;
  advance: () => void;
  notifyAction: (action: { type: string; foodId?: string; slotIndex?: number; interventionId?: string; medicationId?: string; tabName?: string }) => void;
  notifyBurnAnimComplete: () => void;
  isActive: boolean;
}

function matchesExpectedAction(expected: ExpectedAction, actual: { type: string; foodId?: string; slotIndex?: number; interventionId?: string; medicationId?: string; tabName?: string }): boolean {
  if (expected.type !== actual.type) return false;
  if (expected.foodId !== undefined && expected.foodId !== actual.foodId) return false;
  if (expected.slotIndex !== undefined && expected.slotIndex !== actual.slotIndex) return false;
  if (expected.interventionId !== undefined && expected.interventionId !== actual.interventionId) return false;
  if (expected.medicationId !== undefined && expected.medicationId !== actual.medicationId) return false;
  return true;
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

  const notifyAction = useCallback((action: { type: string; foodId?: string; slotIndex?: number; interventionId?: string; medicationId?: string; tabName?: string }) => {
    if (!currentStep || currentStep.advanceOn !== 'action') return;
    if (!currentStep.expectedAction) return;
    if (matchesExpectedAction(currentStep.expectedAction, action)) {
      advance();
    }
  }, [currentStep, advance]);

  const notifyBurnAnimComplete = useCallback(() => {
    if (!currentStep || currentStep.advanceOn !== 'burn-anim-complete') return;
    advance();
  }, [currentStep, advance]);

  return { currentStep, stepIndex, stepsTotal, advance, notifyAction, notifyBurnAnimComplete, isActive };
}
