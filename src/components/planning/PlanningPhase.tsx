import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import type { Ship, Intervention, Medication, GamePhase, PenaltyResult, BurnAnimMode } from '../../core/types';
import { TOTAL_SLOTS, slotToColumn, getBaselineRow, getKcalAssessment } from '../../core/types';
import { useGameStore, getDayConfig, selectKcalUsed, selectWpUsed, selectWpPenalty } from '../../store/gameStore';
import { loadFoods, loadLevel, loadInterventions, loadMedications } from '../../config/loader';
import { computeMedicationModifiers, calculatePenaltyFromState } from '../../core/cubeEngine';
import { DEFAULT_MEDICATION_MODIFIERS, PANCREAS_TOTAL_BARS, WP_PENALTY_WEIGHT, calculateStars } from '../../core/types';
import { BgGraph } from '../graph';
import { KcalBar } from './PlanningHeader';
import { TabbedInventory } from './TabbedInventory';
import { PancreasButton } from './PancreasButton';
import { ResultPanel } from './ResultPanel';
import { SlotGrid } from './SlotGrid';
import { ShipCardOverlay } from './ShipCard';
import { InterventionCardOverlay } from './InterventionCard';
import { TutorialOverlay } from '../tutorial/TutorialOverlay';
import { useTutorial } from '../tutorial/useTutorial';
import { useIsMobile } from '../../hooks/useIsMobile';
import './PlanningPhase.css';

// Reveal: hold time (ms) after showing each phase before advancing

function InventoryDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'inventory-zone' });
  return (
    <div
      ref={setNodeRef}
      className={`planning-phase__inventory-zone${isOver ? ' planning-phase__inventory-zone--over' : ''}`}
    >
      {children}
    </div>
  );
}

interface PlanningPhaseProps {
  isTutorial?: boolean;
  onBackToTutorials?: () => void;
  onNextLevel?: (nextLevelId: string) => void;
}

// Tutorial level order for "Next Level" navigation
const TUTORIAL_LEVEL_ORDER = [
  'tutorial-01', 'tutorial-02', 'tutorial-03', 'tutorial-04',
  'tutorial-05', 'tutorial-06', 'tutorial-07', 'tutorial-08', 'tutorial-09',
];

export function PlanningPhase({ isTutorial, onBackToTutorials, onNextLevel }: PlanningPhaseProps = {}) {
  const isMobile = useIsMobile();
  const {
    placedFoods,
    placeFoodInSlot,
    placedInterventions,
    placeInterventionInSlot,
    removeFromSlot,
    moveSlotToSlot,
    activeMedications,
    toggleMedication,
    clearFoods,
    currentLevel,
    currentDay,
    setLevel,
    goToDay,
    startNextDay,
    settings,
    boostActivePerDay,
    lockedBarsPerDay,
    toggleBoost,
    lockBoostBars,
    unlockBoostBars,
    submittedWpPerDay,
    submitDayWp,
    tutorialLevelId,
    removePreplacedFoods,
  } = useGameStore();

  // Tutorial overlay system
  const { currentStep: tutorialStep, advance: advanceTutorial, notifyAction: notifyTutorialAction, notifyBurnAnimComplete, isActive: isTutorialActive } = useTutorial(
    isTutorial ? tutorialLevelId : null,
    currentDay,
  );

  const [allShips, setAllShips] = useState<Ship[]>([]);
  const [allInterventions, setAllInterventions] = useState<Intervention[]>([]);
  const [allMedications, setAllMedications] = useState<Medication[]>([]);
  const [activeShip, setActiveShip] = useState<Ship | null>(null);
  const [activeIntervention, setActiveIntervention] = useState<Intervention | null>(null);
  const [previewSlot, setPreviewSlot] = useState<number | null>(null);
  const [rejectedSlot, setRejectedSlot] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Submit / reveal state
  const [gamePhase, setGamePhase] = useState<GamePhase>('planning');
  const [penaltyResult, setPenaltyResult] = useState<PenaltyResult | null>(null);
  const [_revealPhase, setRevealPhase] = useState<number | undefined>(undefined);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Results reveal sub-sequence (after all burn phases)
  const [resultsRevealPhase, setResultsRevealPhase] = useState<number | undefined>(undefined);
  const [displayedPenalty, setDisplayedPenalty] = useState(0);
  const [visibleStars, setVisibleStars] = useState(0);
  const resultsRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const penaltyCounterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const penaltyResultRef = useRef<PenaltyResult | null>(null); // stable ref for use in effects
  const tutorialStepRef = useRef(tutorialStep);  // stable ref so advancePhase closure can read current step
  const pendingResultsRevealRef = useRef(false);  // true when burns done but counting blocked by tutorial step

  // Burn animation mode + PancreasButton blink state
  const [burnAnimMode, _setBurnAnimMode] = useState<BurnAnimMode>('incremental');
  const [isPJBlinking, setIsPJBlinking] = useState(false);
  const [showBurns, setShowBurns] = useState(false);
  const [reburnTrigger, setReburnTrigger] = useState(0);
  const prevEffectivenessRef = useRef<number>(5);
  const prevTriggerStepRef = useRef<string | undefined>(undefined);

  // Kcal visibility: hidden in T1 and T2 until revealKcal tutorial step fires
  const [kcalRevealed, setKcalRevealed] = useState(false);
  const [kcalJustRevealed, setKcalJustRevealed] = useState(false);
  const kcalCardsVisible = !isTutorial
    || !['tutorial-01', 'tutorial-02'].includes(tutorialLevelId ?? '')
    || kcalRevealed;

  // clearPreplaced mechanic: pre-placed foods removed from graph and moved to available inventory
  const [preplacedCleared, setPreplacedCleared] = useState(false);
  const [clearedShipIds, setClearedShipIds] = useState<string[]>([]);
  const [clearingAnimation, setClearingAnimation] = useState(false);
  const [clearedHighlight, setClearedHighlight] = useState(false);
  // Incrementing key forces BgGraph remount (e.g., on Retry) so prevLayersRef resets
  // and pre-placed foods are detected as "added" → bomb animation fires
  const [bgGraphKey, setBgGraphKey] = useState(0);

  const advanceRevealRef = useRef<(() => void) | null>(null);

  const handlePancreasBurnStart = useCallback(() => {
    setIsPJBlinking(true);
    // blink stops in handleBurnAnimComplete when all bombs finish
  }, []);

  // Keep tutorialStepRef current so advancePhase closure can read it without stale closure issues
  useEffect(() => { tutorialStepRef.current = tutorialStep; }, [tutorialStep]);

  // Reveal kcal on food cards when tutorial step has revealKcal flag
  useEffect(() => {
    if (tutorialStep?.revealKcal && !kcalRevealed) {
      setKcalRevealed(true);
      setKcalJustRevealed(true);
      const t = setTimeout(() => setKcalJustRevealed(false), 3500);
      return () => clearTimeout(t);
    }
  }, [tutorialStep, kcalRevealed]);

  // clearPreplaced: when tutorial step has clearPreplaced flag, remove pre-placed foods from graph
  // and move them to available inventory with a brief animation
  useEffect(() => {
    if (!tutorialStep?.clearPreplaced || preplacedCleared) return;
    setClearingAnimation(true);
    const ids = placedFoods
      .filter(f => f.id.startsWith('preplaced-'))
      .map(f => f.shipId);
    const timer = setTimeout(() => {
      removePreplacedFoods();
      setClearedShipIds(ids);
      setPreplacedCleared(true);
      setClearingAnimation(false);
      setClearedHighlight(true);
      setTimeout(() => setClearedHighlight(false), 2500);
    }, 700);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialStep?.id]);

  // Handles bomb animation completion: stops blink, advances tutorial (L1D1 slow-mo step)
  const handleBurnAnimComplete = useCallback(() => {
    setIsPJBlinking(false);
    notifyBurnAnimComplete();
  }, [notifyBurnAnimComplete]);

  // Load configs on mount
  useEffect(() => {
    async function loadConfigs() {
      try {
        const [ships, interventions, medications] = await Promise.all([
          loadFoods(),
          loadInterventions(),
          loadMedications(),
        ]);
        setAllShips(ships);
        setAllInterventions(interventions);
        setAllMedications(medications);

        if (!currentLevel) {
          const level = await loadLevel('level-01');
          setLevel(level);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load configs:', error);
        setIsLoading(false);
      }
    }
    loadConfigs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get day-specific configuration
  const dayConfig = useMemo(() => {
    if (!currentLevel) return null;
    return getDayConfig(currentLevel, currentDay);
  }, [currentLevel, currentDay]);

  // Compute baseline row from day's starting BG level
  const baselineRow = useMemo(() => getBaselineRow(dayConfig?.startingBg), [dayConfig]);

  // Compute effective locked slots (pre-placed items + explicitly locked)
  // When preplacedCleared, pre-placed food slots are freed for the player to use
  const effectiveLockedSlots = useMemo(() => {
    const slots = new Set<number>(dayConfig?.lockedSlots ?? []);
    if (!preplacedCleared) {
      for (const pf of dayConfig?.preplacedFoods ?? []) slots.add(pf.slotIndex);
    }
    for (const pi of dayConfig?.preplacedInterventions ?? []) {
      const size = pi.slotSize ?? 1;
      for (let s = pi.slotIndex; s < pi.slotIndex + size; s++) slots.add(s);
    }
    return slots;
  }, [dayConfig, preplacedCleared]);

  // Compute medication modifiers from active medications
  const medicationModifiers = useMemo(
    () => activeMedications.length > 0
      ? computeMedicationModifiers(activeMedications, allMedications)
      : DEFAULT_MEDICATION_MODIFIERS,
    [activeMedications, allMedications]
  );

  const kcalUsed = useMemo(
    () => selectKcalUsed(placedFoods, allShips),
    [placedFoods, allShips]
  );

  const wpUsed = useMemo(
    () => selectWpUsed(placedFoods, allShips, placedInterventions, allInterventions),
    [placedFoods, allShips, placedInterventions, allInterventions]
  );

  const kcalBudget = dayConfig?.kcalBudget ?? 2000;
  const wpBudget = dayConfig?.wpBudget ?? 16;
  const wpPenalty = selectWpPenalty(currentDay, submittedWpPerDay);
  const rawWpBudget = wpBudget + medicationModifiers.wpBonus;
  const wpFloor = Math.ceil(wpBudget * 0.5);
  const effectiveWpBudget = Math.max(rawWpBudget - wpPenalty, wpFloor);
  const wpRemaining = effectiveWpBudget - wpUsed;

  // Stress slots
  const stressSlotSet = useMemo(() => {
    return new Set<number>(dayConfig?.stressSlots ?? []);
  }, [dayConfig]);

  // BOOST system
  const isBoostActive = boostActivePerDay[currentDay] ?? false;
  const totalLockedBars = Object.values(lockedBarsPerDay).reduce((a, b) => a + b, 0);
  // Compute bonus boost bars directly from level config (sum of bonusBoostBars for days 2..currentDay)
  const bonusBoostBars = useMemo(() => {
    if (!currentLevel?.dayConfigs) return 0;
    return currentLevel.dayConfigs
      .filter(dc => dc.day > 1 && dc.day <= currentDay)
      .reduce((sum, dc) => sum + (dc.bonusBoostBars ?? 0), 0);
  }, [currentLevel, currentDay]);
  const barsAvailable = PANCREAS_TOTAL_BARS + bonusBoostBars - totalLockedBars;
  const configEffectiveness = currentLevel?.dayConfigs?.find(dc => dc.day === currentDay)?.pancreasEffectiveness;
  const stepEffectivenessOverride = tutorialStep?.pancreasEffectivenessOverride;
  const pancreasEffectiveness = stepEffectivenessOverride ?? configEffectiveness;
  const isPancreasBlinkingFromStep = stepEffectivenessOverride !== undefined
    && configEffectiveness !== undefined
    && stepEffectivenessOverride < configEffectiveness;
  // Auto-blink PancreasButton when effectiveness drops (tier transition)
  useEffect(() => {
    const prev = prevEffectivenessRef.current;
    const curr = pancreasEffectiveness ?? 5;
    if (curr < prev) {
      setIsPJBlinking(true);
      const t = setTimeout(() => setIsPJBlinking(false), 2000);
      prevEffectivenessRef.current = curr;
      return () => clearTimeout(t);
    }
    prevEffectivenessRef.current = curr;
  }, [pancreasEffectiveness]);

  // Increment reburnTrigger when tutorial step has triggerReburn (only once per step)
  useEffect(() => {
    if (tutorialStep?.triggerReburn && tutorialStep.id !== prevTriggerStepRef.current) {
      prevTriggerStepRef.current = tutorialStep.id;
      setReburnTrigger(v => v + 1);
    }
  }, [tutorialStep]);

  // Force show burned layer (tutorial showBurnsLayer step) — overrides hideBurnedInPlanning
  const forcedShowBurns = gamePhase === 'planning' && (tutorialStep?.showBurnsLayer ?? false);

  // T1–T5: show PancreasButton but hide BOOST charges; T4 (Pancreas Fatigue) shows indicator prominently
  const showPancreasButton = true;
  const showBoostCharges = !['tutorial-01', 'tutorial-02', 'tutorial-03', 'tutorial-04', 'tutorial-05'].includes(currentLevel?.id ?? '');

  // Submit button enabled when kcal >= 60% (Optimal zone) and in planning phase
  const effectiveKcalBudget = Math.round(kcalBudget * medicationModifiers.kcalMultiplier);
  const kcalPct = effectiveKcalBudget > 0 ? (kcalUsed / effectiveKcalBudget) * 100 : 0;
  const kcalZone = getKcalAssessment(kcalUsed, effectiveKcalBudget).zone;
  const requiresOptimal = tutorialStep?.requiresOptimalSubmit ?? false;
  const submitEnabled = gamePhase === 'planning'
    && kcalPct >= 60
    && placedFoods.length > 0
    && (!requiresOptimal || kcalZone === 'optimal');

  // Effective available foods: base + cleared pre-placed foods
  const effectiveAvailableFoods = useMemo(() => {
    const base = dayConfig?.availableFoods || [];
    if (clearedShipIds.length === 0) return base;
    return [...base, ...clearedShipIds.map(id => ({ id, count: 1 }))];
  }, [dayConfig, clearedShipIds]);

  // Tutorial-aware medication toggle wrapper
  const handleMedicationToggle = useCallback((medId: string) => {
    toggleMedication(medId);
    notifyTutorialAction({ type: 'toggle-medication', medicationId: medId });
  }, [toggleMedication, notifyTutorialAction]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

  const rejectDrop = useCallback((slot: number) => {
    setRejectedSlot(slot);
    setTimeout(() => setRejectedSlot(null), 450);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (gamePhase !== 'planning') return;
    const ship = event.active.data.current?.ship as Ship | undefined;
    const intervention = event.active.data.current?.intervention as Intervention | undefined;
    if (ship) {
      setActiveShip(ship);
      setActiveIntervention(null);
    } else if (intervention) {
      setActiveIntervention(intervention);
      setActiveShip(null);
    }
  }, [gamePhase]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over ? String(event.over.id) : null;
    if (overId && overId.startsWith('slot-')) {
      const slot = parseInt(overId.replace('slot-', ''), 10);
      if (!isNaN(slot) && slot >= 0 && slot < TOTAL_SLOTS) {
        setPreviewSlot(slot);
        return;
      }
    }
    setPreviewSlot(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveShip(null);
      setActiveIntervention(null);
      setPreviewSlot(null);

      if (!over || gamePhase !== 'planning') return;

      const activeData = active.data.current;
      const isFromSlot = activeData?.isFromSlot === true;
      const fromSlotIndex = activeData?.fromSlotIndex as number | undefined;
      const overId = String(over.id);

      // Case: Drop onto inventory zone → remove from slot
      if (overId === 'inventory-zone') {
        if (isFromSlot && fromSlotIndex !== undefined) {
          removeFromSlot(fromSlotIndex);
        }
        return;
      }

      // Only slot targets from here
      if (!overId.startsWith('slot-')) return;
      const targetSlot = parseInt(overId.replace('slot-', ''), 10);
      if (isNaN(targetSlot) || targetSlot < 0 || targetSlot >= TOTAL_SLOTS) return;

      if (isFromSlot && fromSlotIndex !== undefined) {
        // Block drag from locked slot
        if (effectiveLockedSlots.has(fromSlotIndex)) return;
        // Block drag to locked slot
        if (effectiveLockedSlots.has(targetSlot)) { rejectDrop(targetSlot); return; }
        // Slot → Slot: move or swap
        if (fromSlotIndex === targetSlot) return;
        moveSlotToSlot(fromSlotIndex, targetSlot);
      } else {
        // Inventory → Slot: place (or replace if occupied)
        const isIntervention = activeData?.isIntervention === true;

        // Helper: check if a slot is covered (including multi-slot interventions)
        const isSlotCovered = (slot: number): boolean => {
          if (placedFoods.some(f => f.slotIndex === slot)) return true;
          return placedInterventions.some(i => {
            const start = i.slotIndex ?? -1;
            const size = i.slotSize ?? 1;
            return slot >= start && slot < start + size;
          });
        };

        // Multi-slot intervention placement: all target slots must be free and unlocked
        if (isIntervention) {
          const intervention = activeData?.intervention as Intervention | undefined;
          if (!intervention) return;
          const slotSize = intervention.slotSize ?? 1;

          if (slotSize > 1) {
            if (targetSlot + slotSize > TOTAL_SLOTS) { rejectDrop(targetSlot); return; }
            for (let s = targetSlot; s < targetSlot + slotSize; s++) {
              if (effectiveLockedSlots.has(s)) { rejectDrop(targetSlot); return; }
              if (isSlotCovered(s)) { rejectDrop(targetSlot); return; }
            }
            if (intervention.wpCost > wpRemaining) { rejectDrop(targetSlot); return; }
            placeInterventionInSlot(intervention.id, targetSlot, slotSize);
            notifyTutorialAction({ type: 'place-intervention', interventionId: intervention.id, slotIndex: targetSlot });
            return;
          }
        }

        // Block placement on locked slots
        if (effectiveLockedSlots.has(targetSlot)) { rejectDrop(targetSlot); return; }

        // Single-slot placement (food or single-slot intervention)
        const targetOccupied = isSlotCovered(targetSlot);

        // Compute WP freed if replacing an existing card
        let freedWp = 0;
        if (targetOccupied) {
          const existingFood = placedFoods.find(f => f.slotIndex === targetSlot);
          if (existingFood) {
            const s = allShips.find(sh => sh.id === existingFood.shipId);
            freedWp = s?.wpCost ?? 0;
          }
          const coveringInt = placedInterventions.find(i => {
            const start = i.slotIndex ?? -1;
            const size = i.slotSize ?? 1;
            return targetSlot >= start && targetSlot < start + size;
          });
          if (coveringInt) {
            const inv = allInterventions.find(a => a.id === coveringInt.interventionId);
            freedWp = inv?.wpCost ?? 0;
          }
        }

        const effectiveWp = wpRemaining + freedWp;

        if (isIntervention) {
          const intervention = activeData?.intervention as Intervention | undefined;
          if (!intervention) return;
          if (intervention.wpCost > effectiveWp) { rejectDrop(targetSlot); return; }
          if (targetOccupied) removeFromSlot(targetSlot);
          placeInterventionInSlot(intervention.id, targetSlot);
          notifyTutorialAction({ type: 'place-intervention', interventionId: intervention.id, slotIndex: targetSlot });
        } else {
          const ship = activeData?.ship as Ship | undefined;
          if (!ship) return;
          if ((ship.wpCost ?? 0) > effectiveWp) { rejectDrop(targetSlot); return; }
          if (targetOccupied) removeFromSlot(targetSlot);
          placeFoodInSlot(ship.id, targetSlot);
          notifyTutorialAction({ type: 'place-food', foodId: ship.id, slotIndex: targetSlot });
        }
      }
    },
    [placeFoodInSlot, placeInterventionInSlot, removeFromSlot, moveSlotToSlot, wpRemaining, gamePhase, placedFoods, placedInterventions, allShips, allInterventions, effectiveLockedSlots, notifyTutorialAction, rejectDrop]
  );

  const handleToggleBoost = useCallback(() => {
    if (!isBoostActive && barsAvailable <= 0) return;
    toggleBoost(currentDay);
    notifyTutorialAction({ type: 'toggle-boost' });
  }, [isBoostActive, barsAvailable, currentDay, toggleBoost, notifyTutorialAction]);

  // === Submit handler: start reveal animation (no graph clear) ===
  const handleSubmit = useCallback(() => {
    if (!submitEnabled) return;

    // Lock BOOST bars for this day
    lockBoostBars();

    // Save WP state for carry-over penalty
    submitDayWp(currentDay, wpUsed, effectiveWpBudget);

    // Notify tutorial system before phase change
    notifyTutorialAction({ type: 'click-submit' });

    // Jump straight to results (no phased reveal animation)
    setGamePhase('replaying');
    setPenaltyResult(null);
  }, [submitEnabled, lockBoostBars, submitDayWp, currentDay, wpUsed, effectiveWpBudget, placedInterventions.length, activeMedications.length, notifyTutorialAction]);

  // === Submit: instantly show all burn layers, then start results reveal sub-sequence ===
  useEffect(() => {
    if (gamePhase !== 'replaying') return;

    // Calculate penalty immediately — no phased reveal animation
    const penalty = calculatePenaltyFromState(
      placedFoods,
      allShips,
      placedInterventions,
      allInterventions,
      medicationModifiers,
      0.5,
      isBoostActive,
      baselineRow,
      configEffectiveness,
    );

    // Last day: add WP penalty for unspent WP
    const isLastDay = currentLevel && currentDay >= currentLevel.days;
    if (isLastDay) {
      const state = useGameStore.getState();
      const submittedWp = state.submittedWpPerDay[currentDay];
      if (submittedWp) {
        const unspent = submittedWp.effectiveWpBudget - submittedWp.wpUsed;
        if (unspent > 0) {
          const wpPenaltyPoints = unspent * WP_PENALTY_WEIGHT;
          penalty.totalPenalty = Math.round((penalty.totalPenalty + wpPenaltyPoints) * 10) / 10;
          const { stars, label } = calculateStars(penalty.totalPenalty);
          penalty.stars = stars;
          penalty.label = label;
        }
      }
    }

    setPenaltyResult(penalty);
    penaltyResultRef.current = penalty;
    setRevealPhase(undefined);
    setShowBurns(true);
    setDisplayedPenalty(0);
    setVisibleStars(0);
    // If a tutorial step blocks the counting sequence, wait for it to be tapped first
    if (isTutorial && tutorialStepRef.current?.blocksResultsReveal) {
      pendingResultsRevealRef.current = true;
    } else {
      setResultsRevealPhase(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase]);

  // === Results reveal sub-sequence (danger-flash → counting → stars → label → done) ===
  useEffect(() => {
    if (resultsRevealPhase === undefined) return;

    if (resultsRevealPhase === 0) {
      // Phase 0: danger-flash — 600ms, flash 200-line + hatching, then start counting
      resultsRevealTimerRef.current = setTimeout(() => setResultsRevealPhase(1), 600);

    } else if (resultsRevealPhase === 1) {
      // Phase 1: counting — sweep cubes + animate penalty counter
      const penalty = penaltyResultRef.current;
      if (!penalty) { setResultsRevealPhase(2); return; }

      // Animate penalty counter: 0 → totalPenalty over ~1000ms
      const total = penalty.totalPenalty;
      const COUNTER_MS = 1000;
      const INTERVAL_MS = 40;
      const steps = Math.max(1, Math.ceil(COUNTER_MS / INTERVAL_MS));
      let step = 0;
      if (total > 0) {
        penaltyCounterRef.current = setInterval(() => {
          step++;
          const progress = step / steps;
          const eased = 1 - Math.pow(1 - progress, 2); // ease-out quad
          setDisplayedPenalty(Math.round(eased * total * 10) / 10);
          if (step >= steps) {
            clearInterval(penaltyCounterRef.current!);
            penaltyCounterRef.current = null;
            setDisplayedPenalty(total);
          }
        }, INTERVAL_MS);
      }

      // Duration: based on danger cube count for sweep timing (50ms/col, min 800ms)
      const dangerCubes = penalty.orangeCount + penalty.redCount;
      const sweepDuration = Math.max(800, Math.min(1400, dangerCubes > 0 ? 50 * 24 : 800));
      resultsRevealTimerRef.current = setTimeout(() => setResultsRevealPhase(2), sweepDuration);

    } else if (resultsRevealPhase === 2) {
      // Phase 2: stars — light up one by one (250ms each)
      const penalty = penaltyResultRef.current;
      const earnedStars = penalty?.stars ?? 0;
      setVisibleStars(0);

      if (earnedStars === 0) {
        resultsRevealTimerRef.current = setTimeout(() => setResultsRevealPhase(3), 300);
        return;
      }

      let starStep = 0;
      const addStar = () => {
        starStep++;
        setVisibleStars(starStep);
        if (starStep < earnedStars) {
          resultsRevealTimerRef.current = setTimeout(addStar, 280);
        } else {
          resultsRevealTimerRef.current = setTimeout(() => setResultsRevealPhase(3), 400);
        }
      };
      resultsRevealTimerRef.current = setTimeout(addStar, 150);

    } else if (resultsRevealPhase === 3) {
      // Phase 3: label bounce-in, then done
      resultsRevealTimerRef.current = setTimeout(() => {
        setResultsRevealPhase(undefined);
        setGamePhase('results');
      }, 500);
    }

    return () => {
      if (resultsRevealTimerRef.current) clearTimeout(resultsRevealTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultsRevealPhase]);

  // === Start counting after tutorial blocking step is tapped ===
  useEffect(() => {
    if (!pendingResultsRevealRef.current) return;
    if (gamePhase !== 'replaying') return;
    if (resultsRevealPhase !== undefined) return;
    if (tutorialStep?.blocksResultsReveal) return; // still on the blocking step
    // Tutorial step was tapped — start counting after a short pause
    pendingResultsRevealRef.current = false;
    const t = setTimeout(() => {
      setDisplayedPenalty(0);
      setVisibleStars(0);
      setResultsRevealPhase(0);
    }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialStep, gamePhase, resultsRevealPhase]);

  // === Skip results reveal (tap anywhere during animation) ===
  const skipResultsReveal = useCallback(() => {
    // Handle case where counting is pending (tutorial blocking step was just tapped)
    if (pendingResultsRevealRef.current) {
      pendingResultsRevealRef.current = false;
      if (resultsRevealTimerRef.current) clearTimeout(resultsRevealTimerRef.current);
      const penalty = penaltyResultRef.current;
      if (penalty) {
        setDisplayedPenalty(penalty.totalPenalty);
        setVisibleStars(penalty.stars);
      }
      setResultsRevealPhase(undefined);
      setGamePhase('results');
      return;
    }
    if (resultsRevealPhase === undefined) return;
    if (resultsRevealTimerRef.current) clearTimeout(resultsRevealTimerRef.current);
    if (penaltyCounterRef.current) { clearInterval(penaltyCounterRef.current); penaltyCounterRef.current = null; }
    const penalty = penaltyResultRef.current;
    if (penalty) {
      setDisplayedPenalty(penalty.totalPenalty);
      setVisibleStars(penalty.stars);
    }
    setResultsRevealPhase(undefined);
    setGamePhase('results');
  }, [resultsRevealPhase]);

  // === Result actions ===
  const handleRetry = useCallback(() => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    if (resultsRevealTimerRef.current) clearTimeout(resultsRevealTimerRef.current);
    if (penaltyCounterRef.current) { clearInterval(penaltyCounterRef.current); penaltyCounterRef.current = null; }
    advanceRevealRef.current = null;
    pendingResultsRevealRef.current = false;
    unlockBoostBars(currentDay);
    clearFoods();
    setGamePhase('planning');
    setRevealPhase(undefined);
    setResultsRevealPhase(undefined);
    setDisplayedPenalty(0);
    setVisibleStars(0);
    setShowBurns(false);
    setPenaltyResult(null);
    setPreplacedCleared(false);
    setClearedShipIds([]);
    setClearingAnimation(false);
    // Force BgGraph remount so prevLayersRef resets → pre-placed foods detected as "added"
    // → bomb/plateau animation fires for pre-placed foods
    setBgGraphKey(k => k + 1);
  }, [clearFoods, unlockBoostBars, currentDay]);

  const handleNextDay = useCallback(() => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    if (resultsRevealTimerRef.current) clearTimeout(resultsRevealTimerRef.current);
    if (penaltyCounterRef.current) { clearInterval(penaltyCounterRef.current); penaltyCounterRef.current = null; }
    advanceRevealRef.current = null;
    pendingResultsRevealRef.current = false;
    startNextDay();
    setGamePhase('planning');
    setRevealPhase(undefined);
    setResultsRevealPhase(undefined);
    setDisplayedPenalty(0);
    setVisibleStars(0);
    setShowBurns(false);
    setPenaltyResult(null);
    setPreplacedCleared(false);
    setClearedShipIds([]);
    setClearingAnimation(false);
  }, [startNextDay]);

  // Reset phase when day changes (e.g., via cheat buttons)
  const handleGoToDay = useCallback((day: number) => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    if (resultsRevealTimerRef.current) clearTimeout(resultsRevealTimerRef.current);
    if (penaltyCounterRef.current) { clearInterval(penaltyCounterRef.current); penaltyCounterRef.current = null; }
    advanceRevealRef.current = null;
    goToDay(day);
    setGamePhase('planning');
    setRevealPhase(undefined);
    setResultsRevealPhase(undefined);
    setDisplayedPenalty(0);
    setVisibleStars(0);
    setShowBurns(false);
    setPenaltyResult(null);
    setPreplacedCleared(false);
    setClearedShipIds([]);
    setClearingAnimation(false);
  }, [goToDay]);

  // Tutorial: next level handler
  const handleNextTutorialLevel = useCallback(() => {
    if (!tutorialLevelId || !onNextLevel) return;
    const idx = TUTORIAL_LEVEL_ORDER.indexOf(tutorialLevelId);
    if (idx < 0 || idx >= TUTORIAL_LEVEL_ORDER.length - 1) return;
    const nextId = TUTORIAL_LEVEL_ORDER[idx + 1];
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    if (resultsRevealTimerRef.current) clearTimeout(resultsRevealTimerRef.current);
    if (penaltyCounterRef.current) { clearInterval(penaltyCounterRef.current); penaltyCounterRef.current = null; }
    setGamePhase('planning');
    setRevealPhase(undefined);
    setResultsRevealPhase(undefined);
    setDisplayedPenalty(0);
    setVisibleStars(0);
    setShowBurns(false);  // Reset so hideBurnedInPlanning=true when new level's foods are detected as "added"
    setPenaltyResult(null);
    setPreplacedCleared(false);
    setClearedShipIds([]);
    setClearingAnimation(false);
    onNextLevel(nextId);
  }, [tutorialLevelId, onNextLevel]);

  // Is this the last tutorial level?
  const isLastTutorialLevel = tutorialLevelId
    ? TUTORIAL_LEVEL_ORDER.indexOf(tutorialLevelId) >= TUTORIAL_LEVEL_ORDER.length - 1
    : false;

  if (isLoading || !currentLevel) {
    return (
      <div className="planning-phase planning-phase--loading">
        Loading...
      </div>
    );
  }

  const isPlanning = gamePhase === 'planning';
  const showResults = gamePhase === 'results';
  const isResultsRevealing = resultsRevealPhase !== undefined;
  // showDangerZone: true from counting phase (1) through full results, or when tutorial highlights danger zone
  const showDangerZone = showResults || (isResultsRevealing && resultsRevealPhase >= 1) || tutorialStep?.highlight === 'danger-zone';
  // showPenaltyOverlay: pulsing penalty rects only during actual results (not during tutorial)
  const showPenaltyOverlay = showResults || (isResultsRevealing && resultsRevealPhase >= 1);
  // showHatchFlash: true only during danger-flash phase (0) — one-shot
  const showHatchFlash = isResultsRevealing && resultsRevealPhase === 0;
  // ResultPanel shown from counting phase (1) onwards
  const showResultPanel = showResults || (isResultsRevealing && resultsRevealPhase >= 1);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className="planning-phase"
        onClick={isResultsRevealing ? skipResultsReveal : undefined}
      >
        <div className={`planning-phase__content${!isPlanning ? ' planning-phase__content--results' : ''}`}>
          <div className="planning-phase__graph-wrapper">
            <button
              className="planning-phase__menu-btn"
              disabled
              title="Menu (coming soon)"
            >
              ☰
            </button>
            <BgGraph
              key={bgGraphKey}
              placedFoods={placedFoods}
              allShips={allShips}
              placedInterventions={placedInterventions}
              allInterventions={allInterventions}
              settings={settings}
              decayRate={0.5}
              boostActive={isBoostActive}
              medicationModifiers={medicationModifiers}
              showDangerZone={showDangerZone}
              showPenaltyOverlay={showPenaltyOverlay}
              showHatchFlash={showHatchFlash}
              previewShip={activeShip && previewSlot !== null ? activeShip : undefined}
              previewColumn={previewSlot !== null ? slotToColumn(previewSlot) : undefined}
              previewIntervention={activeIntervention && previewSlot !== null ? activeIntervention : undefined}
              previewInterventionColumn={activeIntervention && previewSlot !== null ? slotToColumn(previewSlot) : undefined}
              stressSlots={stressSlotSet}
              highlightStressSlots={tutorialStep?.highlight === 'stress-slots'}
              highlightDangerZone={tutorialStep?.highlight === 'danger-zone'}
              highlightBaselineCubes={tutorialStep?.highlight === 'baseline-cubes'}
              highlightDangerLine={tutorialStep?.highlight === 'danger-line'}
              highlightMedEffect={tutorialStep?.highlightMedEffect ?? false}
              preplacedFading={clearingAnimation}
              isMobile={isMobile}
              baselineRow={baselineRow}
              hideBurnedInPlanning={forcedShowBurns ? false : (gamePhase !== 'replaying' ? !showBurns : false)}
              burnAnimMode={burnAnimMode}
              onPancreasBurnStart={handlePancreasBurnStart}
              slowMotionBurns={tutorialStep?.advanceOn === 'burn-anim-complete' || !!tutorialStep?.slowBurnAnim}
              onBurnAnimComplete={handleBurnAnimComplete}
              showHatchingOverride={isResultsRevealing || showResults}
              pancreasEffectiveness={pancreasEffectiveness ?? 5}
              replayBurnsTrigger={reburnTrigger}
              highlightBurns={tutorialStep?.highlightBurns ?? false}
            />
            {isPlanning && showPancreasButton && (
              <div className="planning-phase__pancreas-overlay">
                <PancreasButton
                  isBoostActive={isBoostActive}
                  usesRemaining={barsAvailable}
                  onToggle={handleToggleBoost}
                  disabled={gamePhase !== 'planning' || !showBoostCharges}
                  isBlinking={isPJBlinking || isPancreasBlinkingFromStep}
                  pancreasEffectiveness={pancreasEffectiveness}
                  hideCharges={!showBoostCharges}
                />
              </div>
            )}
          </div>

          {isPlanning && (
            <KcalBar
              kcalUsed={kcalUsed}
              kcalBudget={kcalBudget}
              dayLabel={`Day ${currentDay}/${currentLevel.days}`}
              wpRemaining={wpRemaining}
              medicationModifiers={medicationModifiers}
              submitEnabled={submitEnabled}
              onSubmit={handleSubmit}
              hidden={isTutorial && tutorialLevelId === 'tutorial-01'}
              tutorialActive={isTutorial}
            />
          )}

          <SlotGrid
            allShips={allShips}
            allInterventions={allInterventions}
            placedFoods={placedFoods}
            placedInterventions={placedInterventions}
            settings={settings}
            onRemoveFromSlot={removeFromSlot}
            disabled={!isPlanning}
            lockedSlots={effectiveLockedSlots}
            stressSlots={stressSlotSet}
            rejectedSlot={rejectedSlot}
          />

          {isPlanning && (
            <InventoryDropZone>
              <TabbedInventory
                allShips={allShips}
                availableFoods={effectiveAvailableFoods}
                placedFoods={placedFoods}
                allInterventions={allInterventions}
                availableInterventions={dayConfig?.availableInterventions || []}
                placedInterventions={placedInterventions}
                wpRemaining={wpRemaining}
                allMedications={allMedications}
                availableMedicationIds={dayConfig?.availableMedications ?? []}
                activeMedications={activeMedications}
                onMedicationToggle={handleMedicationToggle}
                hideKcal={!kcalCardsVisible}
                kcalJustRevealed={kcalJustRevealed || (tutorialStep?.kcalBlink ?? false)}
                clearedFoodsHighlight={clearedHighlight}
                clearedShipIds={clearedShipIds}
              />
            </InventoryDropZone>
          )}

          {showResultPanel && penaltyResult && (
            <ResultPanel
              result={penaltyResult}
              currentDay={currentDay}
              totalDays={currentLevel.days}
              unspentWp={effectiveWpBudget - wpUsed}
              onRetry={handleRetry}
              onNextDay={handleNextDay}
              isTutorial={isTutorial}
              onNextLevel={!isLastTutorialLevel ? handleNextTutorialLevel : undefined}
              onBackToTutorials={onBackToTutorials}
              visibleStars={showResults ? undefined : visibleStars}
              showLabel={showResults ? undefined : resultsRevealPhase !== undefined && resultsRevealPhase >= 3}
              displayedPenalty={showResults ? undefined : displayedPenalty}
            />
          )}

        </div>
      </div>

      {/* Day navigation + burns toggle — fixed to bottom, outside scrollable content */}
      {(isPlanning || showResults) && !isTutorial && (
        <div className="planning-phase__day-nav">
          {isPlanning && Array.from({ length: currentLevel.days }, (_, i) => i + 1).map(day => (
            <button
              key={day}
              className={`planning-phase__day-btn ${day === currentDay ? 'planning-phase__day-btn--active' : ''}`}
              onClick={() => handleGoToDay(day)}
              disabled={day === currentDay}
            >
              Day {day}
            </button>
          ))}
          <button
            className={`planning-phase__show-burns-btn${showBurns ? ' planning-phase__show-burns-btn--active' : ''}`}
            onClick={() => setShowBurns(v => !v)}
            title={showBurns ? 'Burns: visible — click to hide' : 'Burns: hidden — click to show'}
          >
            👁️
          </button>
        </div>
      )}

      <DragOverlay dropAnimation={null}>
        {activeShip && <ShipCardOverlay ship={activeShip} />}
        {activeIntervention && <InterventionCardOverlay intervention={activeIntervention} />}
      </DragOverlay>

      {/* Tutorial overlay — hidden for pendingUntilResults steps until gamePhase='results' */}
      {isTutorialActive && tutorialStep && !(tutorialStep.pendingUntilResults && gamePhase !== 'results') && (
        <TutorialOverlay
          step={tutorialStep}
          onAdvance={advanceTutorial}
        />
      )}
    </DndContext>
  );
}
