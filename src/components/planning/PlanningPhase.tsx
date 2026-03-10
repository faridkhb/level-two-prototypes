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
import type { Ship, Intervention, Medication, GamePhase, PenaltyResult, SatietyPenalty, BoostConfig } from '../../core/types';
import { TOTAL_SLOTS, expandInsulinProfile, applyStressToRates, PENALTY_ORANGE_ROW, slotToColumn, getBaselineRow, GRAPH_CONFIG } from '../../core/types';
import { useGameStore, getDayConfig, selectKcalUsed, selectWpUsed, selectWpPenalty, selectSatietyPenalty } from '../../store/gameStore';
import { loadFoods, loadLevel, loadInterventions, loadMedications } from '../../config/loader';
import { useConfigStore } from '../../store/configStore';
import { computeMedicationModifiers, calculatePenaltyFromState } from '../../core/cubeEngine';
import type { InsulinParams } from '../../core/cubeEngine';
import { DEFAULT_MEDICATION_MODIFIERS, DEFAULT_SATIETY_PENALTY, getSatietyPenalty, SATIETY_PENALTY_FOOD_ID, PANCREAS_TOTAL_BARS, WP_PENALTY_WEIGHT, calculateStars } from '../../core/types';
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
const REVEAL_INITIAL_DELAY = 300;
const REVEAL_HOLD: Record<number, number> = {
  1: 1500,  // food cubes (longer — wave animation spans full graph)
  2: 1200,  // pancreas
  3: 1200,  // exercise
  4: 1200,  // medications
};

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
  'tutorial-05', 'tutorial-06', 'tutorial-07', 'tutorial-08',
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
    satietyPenaltyPerDay,
    setSatietyPenalty,
    tutorialLevelId,
  } = useGameStore();

  const { boostOverride } = useConfigStore();

  // Tutorial overlay system
  const { currentStep: tutorialStep, advance: advanceTutorial, notifyAction: notifyTutorialAction, isActive: isTutorialActive } = useTutorial(
    isTutorial ? tutorialLevelId : null,
    currentDay,
  );

  const [allShips, setAllShips] = useState<Ship[]>([]);
  const [allInterventions, setAllInterventions] = useState<Intervention[]>([]);
  const [allMedications, setAllMedications] = useState<Medication[]>([]);
  const [activeShip, setActiveShip] = useState<Ship | null>(null);
  const [activeIntervention, setActiveIntervention] = useState<Intervention | null>(null);
  const [previewSlot, setPreviewSlot] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Submit / reveal state
  const [gamePhase, setGamePhase] = useState<GamePhase>('planning');
  const [penaltyResult, setPenaltyResult] = useState<PenaltyResult | null>(null);
  const [satietyResult, setSatietyResult] = useState<SatietyPenalty>(DEFAULT_SATIETY_PENALTY);
  const [revealPhase, setRevealPhase] = useState<number | undefined>(undefined);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealSequenceRef = useRef<number[]>([]);

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
  const effectiveLockedSlots = useMemo(() => {
    const slots = new Set<number>(dayConfig?.lockedSlots ?? []);
    for (const pf of dayConfig?.preplacedFoods ?? []) slots.add(pf.slotIndex);
    for (const pi of dayConfig?.preplacedInterventions ?? []) {
      const size = pi.slotSize ?? 1;
      for (let s = pi.slotIndex; s < pi.slotIndex + size; s++) slots.add(s);
    }
    return slots;
  }, [dayConfig]);

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
  const satietyPenalty = selectSatietyPenalty(currentDay, satietyPenaltyPerDay);
  const rawWpBudget = wpBudget + medicationModifiers.wpBonus;
  const wpFloor = Math.ceil(wpBudget * 0.5);
  const effectiveWpBudget = Math.max(rawWpBudget - wpPenalty + satietyPenalty.wpDelta, wpFloor);
  const wpRemaining = effectiveWpBudget - wpUsed;

  // Stress slots
  const stressSlotSet = useMemo(() => {
    return new Set<number>(dayConfig?.stressSlots ?? []);
  }, [dayConfig]);

  // Insulin profile system (with stress slot reduction applied)
  const insulinParams: InsulinParams | number = useMemo(() => {
    if (dayConfig?.insulinProfile) {
      let rates = expandInsulinProfile(dayConfig.insulinProfile);
      if (dayConfig.stressSlots && dayConfig.stressSlots.length > 0) {
        rates = applyStressToRates(rates, dayConfig.stressSlots);
      }
      return {
        rates,
        mode: dayConfig.insulinProfile.mode,
      };
    }
    return 0.5; // legacy fallback
  }, [dayConfig]);

  // BOOST system
  const isBoostActive = boostActivePerDay[currentDay] ?? false;
  const totalLockedBars = Object.values(lockedBarsPerDay).reduce((a, b) => a + b, 0);
  const barsAvailable = PANCREAS_TOTAL_BARS - totalLockedBars;
  const boostThresholdRow = boostOverride.thresholdMgDl
    ? Math.round((boostOverride.thresholdMgDl - GRAPH_CONFIG.bgMin) / GRAPH_CONFIG.cellHeightMgDl)
    : PENALTY_ORANGE_ROW;
  const boostExtraRate = boostOverride.extraRate ?? 4;
  const boostConfig: BoostConfig | undefined = isBoostActive
    ? { active: true, thresholdRow: boostThresholdRow, extraRate: boostExtraRate }
    : undefined;

  // Submit button enabled when kcal >= 50% (Optimal zone) and in planning phase
  const effectiveKcalBudget = Math.round(kcalBudget * medicationModifiers.kcalMultiplier) + satietyPenalty.kcalDelta;
  const kcalPct = effectiveKcalBudget > 0 ? (kcalUsed / effectiveKcalBudget) * 100 : 0;
  const submitEnabled = gamePhase === 'planning' && kcalPct >= 50 && placedFoods.length > 0;

  // Effective available foods: base + satiety penalty foods (0 WP cost)
  const effectiveAvailableFoods = useMemo(() => {
    const base = dayConfig?.availableFoods || [];
    const freeCount = satietyPenalty.freeFood;
    if (freeCount <= 0) return base;
    // Add penalty food copies
    const existing = base.find(f => f.id === SATIETY_PENALTY_FOOD_ID);
    if (existing) {
      return base.map(f =>
        f.id === SATIETY_PENALTY_FOOD_ID
          ? { ...f, count: f.count + freeCount }
          : f
      );
    }
    return [...base, { id: SATIETY_PENALTY_FOOD_ID, count: freeCount }];
  }, [dayConfig, satietyPenalty.freeFood]);

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
        if (effectiveLockedSlots.has(targetSlot)) return;
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
            if (targetSlot + slotSize > TOTAL_SLOTS) return;
            for (let s = targetSlot; s < targetSlot + slotSize; s++) {
              if (effectiveLockedSlots.has(s)) return;
              if (isSlotCovered(s)) return;
            }
            if (intervention.wpCost > wpRemaining) return;
            placeInterventionInSlot(intervention.id, targetSlot, slotSize);
            notifyTutorialAction({ type: 'place-intervention', interventionId: intervention.id, slotIndex: targetSlot });
            return;
          }
        }

        // Block placement on locked slots
        if (effectiveLockedSlots.has(targetSlot)) return;

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
          if (intervention.wpCost > effectiveWp) return;
          if (targetOccupied) removeFromSlot(targetSlot);
          placeInterventionInSlot(intervention.id, targetSlot);
          notifyTutorialAction({ type: 'place-intervention', interventionId: intervention.id, slotIndex: targetSlot });
        } else {
          const ship = activeData?.ship as Ship | undefined;
          if (!ship) return;
          if ((ship.wpCost ?? 0) > effectiveWp) return;
          if (targetOccupied) removeFromSlot(targetSlot);
          placeFoodInSlot(ship.id, targetSlot);
          notifyTutorialAction({ type: 'place-food', foodId: ship.id, slotIndex: targetSlot });
        }
      }
    },
    [placeFoodInSlot, placeInterventionInSlot, removeFromSlot, moveSlotToSlot, wpRemaining, gamePhase, placedFoods, placedInterventions, allShips, allInterventions, effectiveLockedSlots, notifyTutorialAction]
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

    // Calculate and store satiety penalty for next day
    const penalty = getSatietyPenalty(kcalUsed, effectiveKcalBudget);
    setSatietyPenalty(currentDay, penalty);
    setSatietyResult(penalty);

    // Build reveal sequence — only phases that have content
    const hasInsulin = typeof insulinParams !== 'number' || insulinParams > 0;
    const phases: number[] = [1]; // food cubes always present
    if (hasInsulin) phases.push(2); // insulin/pancreas
    if (placedInterventions.length > 0) phases.push(3); // exercise
    if (activeMedications.length > 0) phases.push(4); // medications
    revealSequenceRef.current = phases;

    // Notify tutorial system before phase change
    notifyTutorialAction({ type: 'click-submit' });

    // Start reveal — graph stays populated, revealPhase controls layer visibility
    setGamePhase('replaying');
    setRevealPhase(0);
    setPenaltyResult(null);
  }, [submitEnabled, lockBoostBars, submitDayWp, currentDay, wpUsed, effectiveWpBudget, kcalUsed, effectiveKcalBudget, setSatietyPenalty, insulinParams, placedInterventions.length, activeMedications.length, notifyTutorialAction]);

  // === Reveal animation effect — progressive layer reveal (skips empty phases) ===
  useEffect(() => {
    if (gamePhase !== 'replaying') return;

    const sequence = revealSequenceRef.current;
    let seqIndex = 0;

    function advancePhase() {
      if (seqIndex < sequence.length) {
        const phase = sequence[seqIndex];
        setRevealPhase(phase);
        seqIndex++;
        const holdTime = REVEAL_HOLD[phase] ?? 1200;
        revealTimerRef.current = setTimeout(advancePhase, holdTime);
      } else {
        // All phases done — calculate penalty and show results
        const penalty = calculatePenaltyFromState(
          placedFoods,
          allShips,
          placedInterventions,
          allInterventions,
          medicationModifiers,
          insulinParams,
          boostConfig,
          baselineRow,
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
        setRevealPhase(undefined);
        setGamePhase('results');
      }
    }

    revealTimerRef.current = setTimeout(advancePhase, REVEAL_INITIAL_DELAY);

    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase]);

  // === Result actions ===
  const handleRetry = useCallback(() => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    unlockBoostBars(currentDay);
    clearFoods();
    setGamePhase('planning');
    setRevealPhase(undefined);
    setPenaltyResult(null);
  }, [clearFoods, unlockBoostBars, currentDay]);

  const handleNextDay = useCallback(() => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    startNextDay();
    setGamePhase('planning');
    setRevealPhase(undefined);
    setPenaltyResult(null);
  }, [startNextDay]);

  // Reset phase when day changes (e.g., via cheat buttons)
  const handleGoToDay = useCallback((day: number) => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    goToDay(day);
    setGamePhase('planning');
    setRevealPhase(undefined);
    setPenaltyResult(null);
  }, [goToDay]);

  // Tutorial: next level handler
  const handleNextTutorialLevel = useCallback(() => {
    if (!tutorialLevelId || !onNextLevel) return;
    const idx = TUTORIAL_LEVEL_ORDER.indexOf(tutorialLevelId);
    if (idx < 0 || idx >= TUTORIAL_LEVEL_ORDER.length - 1) return;
    const nextId = TUTORIAL_LEVEL_ORDER[idx + 1];
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    setGamePhase('planning');
    setRevealPhase(undefined);
    setPenaltyResult(null);
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="planning-phase">
        {gamePhase === 'replaying' && (
          <div className="planning-phase__hint planning-phase__hint--replay">
            Reviewing your meal plan...
          </div>
        )}

        <div className="planning-phase__content">
          <div className="planning-phase__graph-wrapper">
            <button
              className="planning-phase__menu-btn"
              disabled
              title="Menu (coming soon)"
            >
              ☰
            </button>
            <BgGraph
              placedFoods={placedFoods}
              allShips={allShips}
              placedInterventions={placedInterventions}
              allInterventions={allInterventions}
              settings={settings}
              decayOrInsulin={insulinParams}
              boostConfig={boostConfig}
              medicationModifiers={medicationModifiers}
              showPenaltyHighlight={showResults}
              revealPhase={gamePhase === 'replaying' ? revealPhase : undefined}
              previewShip={activeShip && previewSlot !== null ? activeShip : undefined}
              previewColumn={previewSlot !== null ? slotToColumn(previewSlot) : undefined}
              previewIntervention={activeIntervention && previewSlot !== null ? activeIntervention : undefined}
              previewInterventionColumn={activeIntervention && previewSlot !== null ? slotToColumn(previewSlot) : undefined}
              stressSlots={stressSlotSet}
              isMobile={isMobile}
              baselineRow={baselineRow}
            />
            {isPlanning && (
              <div className="planning-phase__pancreas-overlay">
                <PancreasButton
                  isBoostActive={isBoostActive}
                  usesRemaining={barsAvailable}
                  onToggle={handleToggleBoost}
                  disabled={gamePhase !== 'planning'}
                />
              </div>
            )}
          </div>

          <KcalBar
            kcalUsed={kcalUsed}
            kcalBudget={kcalBudget}
            dayLabel={`Day ${currentDay}/${currentLevel.days}`}
            wpRemaining={wpRemaining}
            satietyPenalty={satietyPenalty}
            medicationModifiers={medicationModifiers}
            submitEnabled={submitEnabled}
            onSubmit={handleSubmit}
            hidden={isTutorial && tutorialLevelId === 'tutorial-01' && currentDay === 1}
            tutorialActive={isTutorial}
          />

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
                onTabChange={(tab) => notifyTutorialAction({ type: 'switch-tab', tabName: tab })}
              />
            </InventoryDropZone>
          )}

          {showResults && penaltyResult && (
            <ResultPanel
              result={penaltyResult}
              currentDay={currentDay}
              totalDays={currentLevel.days}
              unspentWp={effectiveWpBudget - wpUsed}
              satietyResult={satietyResult}
              onRetry={handleRetry}
              onNextDay={handleNextDay}
              isTutorial={isTutorial}
              onNextLevel={!isLastTutorialLevel ? handleNextTutorialLevel : undefined}
              onBackToTutorials={onBackToTutorials}
            />
          )}

        </div>
      </div>

      {/* Day navigation — fixed to bottom, outside scrollable content */}
      {isPlanning && !isTutorial && (
        <div className="planning-phase__day-nav">
          {Array.from({ length: currentLevel.days }, (_, i) => i + 1).map(day => (
            <button
              key={day}
              className={`planning-phase__day-btn ${day === currentDay ? 'planning-phase__day-btn--active' : ''}`}
              onClick={() => handleGoToDay(day)}
              disabled={day === currentDay}
            >
              Day {day}
            </button>
          ))}
        </div>
      )}

      <DragOverlay dropAnimation={null}>
        {activeShip && <ShipCardOverlay ship={activeShip} />}
        {activeIntervention && <InterventionCardOverlay intervention={activeIntervention} />}
      </DragOverlay>

      {/* Tutorial overlay */}
      {isTutorialActive && tutorialStep && (
        <TutorialOverlay
          step={tutorialStep}
          onAdvance={advanceTutorial}
        />
      )}
    </DndContext>
  );
}
