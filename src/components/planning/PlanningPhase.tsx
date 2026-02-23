import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { DragStartEvent, DragEndEvent, DragMoveEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { Ship, Intervention, Medication, GamePhase, PenaltyResult, PancreasTier } from '../../core/types';
import { useGameStore, getDayConfig, selectKcalUsed, selectWpUsed, selectWpPenalty } from '../../store/gameStore';
import { loadFoods, loadLevel, loadInterventions, loadMedications } from '../../config/loader';
import { computeMedicationModifiers, calculatePenaltyFromState } from '../../core/cubeEngine';
import { DEFAULT_MEDICATION_MODIFIERS, getKcalAssessment, PANCREAS_TIERS, PANCREAS_TOTAL_BARS, WP_PENALTY_WEIGHT, calculateStars } from '../../core/types';
import { BgGraph, pointerToColumn } from '../graph';
import { PlanningHeader } from './PlanningHeader';
import { ShipInventory } from './ShipInventory';
import { InterventionInventory } from './InterventionInventory';
// MedicationPanel merged into InterventionInventory
import { PancreasButton } from './PancreasButton';
import { ResultPanel } from './ResultPanel';
import { ShipCardOverlay } from './ShipCard';
import { InterventionCardOverlay } from './InterventionCard';
import './PlanningPhase.css';

// Reveal: hold time (ms) after showing each phase before advancing
const REVEAL_INITIAL_DELAY = 300;
const REVEAL_HOLD: Record<number, number> = {
  1: 1500,  // food cubes (longer — wave animation spans full graph)
  2: 1200,  // pancreas
  3: 1200,  // exercise
  4: 1200,  // medications
};

function togglePancreasTier(current: PancreasTier, maxBars: number): PancreasTier {
  if (current === 3) return 1; // BOOST → ON
  // ON → BOOST (if affordable)
  if (PANCREAS_TIERS[3].cost <= maxBars) return 3;
  return 1; // can't afford boost, stay ON
}

export function PlanningPhase() {
  const {
    placedFoods,
    placeFood,
    removeFood,
    placedInterventions,
    placeIntervention,
    removeIntervention,
    moveIntervention,
    activeMedications,
    toggleMedication,
    moveFood,
    clearFoods,
    currentLevel,
    currentDay,
    setLevel,
    goToDay,
    startNextDay,
    settings,
    updateSettings,
    pancreasTierPerDay,
    lockedBarsPerDay,
    setPancreasTier,
    lockPancreasBars,
    unlockPancreasBars,
    submittedWpPerDay,
    submitDayWp,
  } = useGameStore();

  const [allShips, setAllShips] = useState<Ship[]>([]);
  const [allInterventions, setAllInterventions] = useState<Intervention[]>([]);
  const [allMedications, setAllMedications] = useState<Medication[]>([]);
  const [activeShip, setActiveShip] = useState<Ship | null>(null);
  const [activeIntervention, setActiveIntervention] = useState<Intervention | null>(null);
  const [previewColumn, setPreviewColumn] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const graphRef = useRef<HTMLDivElement>(null);

  // Submit / reveal state
  const [gamePhase, setGamePhase] = useState<GamePhase>('planning');
  const [penaltyResult, setPenaltyResult] = useState<PenaltyResult | null>(null);
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

  // Pancreas tier system
  const currentPancreasTier = (pancreasTierPerDay[currentDay] ?? 1) as PancreasTier;
  const currentDecayRate = PANCREAS_TIERS[currentPancreasTier].decayRate;
  const totalLockedBars = Object.values(lockedBarsPerDay).reduce((a, b) => a + b, 0);
  const barsAvailable = PANCREAS_TOTAL_BARS - totalLockedBars;

  // Submit button enabled when kcal >= Light (50%) and in planning phase
  const effectiveKcalBudget = Math.round(kcalBudget * medicationModifiers.kcalMultiplier);
  const assessment = getKcalAssessment(kcalUsed, effectiveKcalBudget);
  const kcalPct = effectiveKcalBudget > 0 ? (kcalUsed / effectiveKcalBudget) * 100 : 0;
  const submitEnabled = gamePhase === 'planning' && kcalPct >= 50 && placedFoods.length > 0;

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

  const handleDragMove = useCallback((_event: DragMoveEvent) => {
    if (!graphRef.current || (!activeShip && !activeIntervention)) {
      setPreviewColumn(null);
      return;
    }

    const graphEl = graphRef.current.querySelector('.bg-graph') as HTMLElement;
    if (!graphEl) {
      setPreviewColumn(null);
      return;
    }

    const { delta, activatorEvent } = _event;
    if (activatorEvent && 'clientX' in activatorEvent) {
      const pointerX = (activatorEvent as PointerEvent).clientX + delta.x;
      const pointerY = (activatorEvent as PointerEvent).clientY + delta.y;
      const graphRect = graphEl.getBoundingClientRect();
      // Only show preview when cursor is within the graph element bounds
      if (pointerY < graphRect.top || pointerY > graphRect.bottom) {
        setPreviewColumn(null);
        return;
      }
      const col = pointerToColumn(graphEl, pointerX);
      setPreviewColumn(col);
    }
  }, [activeShip, activeIntervention]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveShip(null);
      setActiveIntervention(null);
      setPreviewColumn(null);

      if (!over || over.id !== 'bg-graph') return;
      if (gamePhase !== 'planning') return;

      // Compute drop column from pointer position
      const graphEl = document.querySelector('.bg-graph') as HTMLElement;
      if (!graphEl) return;

      const { activatorEvent, delta } = event;
      let col: number | null = null;
      if (activatorEvent && 'clientX' in activatorEvent) {
        const pointerX = (activatorEvent as PointerEvent).clientX + delta.x;
        col = pointerToColumn(graphEl, pointerX);
      }
      if (col == null) return;

      // Check if it's a food or intervention drop
      const isIntervention = active.data.current?.isIntervention === true;

      if (isIntervention) {
        const intervention = active.data.current?.intervention as Intervention | undefined;
        if (!intervention) return;
        if (intervention.wpCost > wpRemaining) return;
        placeIntervention(intervention.id, col);
      } else {
        const ship = active.data.current?.ship as Ship | undefined;
        if (!ship) return;
        const shipWp = ship.wpCost ?? 0;
        if (shipWp > wpRemaining) return;
        placeFood(ship.id, col);
      }
    },
    [placeFood, placeIntervention, wpRemaining, gamePhase]
  );

  const handleFoodClick = useCallback(
    (placementId: string) => {
      if (gamePhase !== 'planning') return;
      removeFood(placementId);
    },
    [removeFood, gamePhase]
  );

  const handleInterventionClick = useCallback(
    (placementId: string) => {
      if (gamePhase !== 'planning') return;
      removeIntervention(placementId);
    },
    [removeIntervention, gamePhase]
  );

  const handleFoodMove = useCallback(
    (placementId: string, newColumn: number) => {
      if (gamePhase !== 'planning') return;
      moveFood(placementId, newColumn);
    },
    [moveFood, gamePhase]
  );

  const handleInterventionMove = useCallback(
    (placementId: string, newColumn: number) => {
      if (gamePhase !== 'planning') return;
      moveIntervention(placementId, newColumn);
    },
    [moveIntervention, gamePhase]
  );

  const handleToggleTimeFormat = useCallback(() => {
    updateSettings({
      timeFormat: settings.timeFormat === '12h' ? '24h' : '12h',
    });
  }, [settings.timeFormat, updateSettings]);

  const handleToggleBgUnit = useCallback(() => {
    updateSettings({
      bgUnit: settings.bgUnit === 'mg/dL' ? 'mmol/L' : 'mg/dL',
    });
  }, [settings.bgUnit, updateSettings]);

  const handleTogglePancreas = useCallback(() => {
    const nextTier = togglePancreasTier(currentPancreasTier, barsAvailable);
    setPancreasTier(currentDay, nextTier);
  }, [currentPancreasTier, barsAvailable, currentDay, setPancreasTier]);

  // === Submit handler: start reveal animation (no graph clear) ===
  const handleSubmit = useCallback(() => {
    if (!submitEnabled) return;

    // Lock pancreas bars for this day
    lockPancreasBars();

    // Save WP state for carry-over penalty
    submitDayWp(currentDay, wpUsed, effectiveWpBudget);

    // Build reveal sequence — only phases that have content
    const phases: number[] = [1]; // food cubes always present
    if (currentDecayRate > 0) phases.push(2); // pancreas
    if (placedInterventions.length > 0) phases.push(3); // exercise
    if (activeMedications.length > 0) phases.push(4); // medications
    revealSequenceRef.current = phases;

    // Start reveal — graph stays populated, revealPhase controls layer visibility
    setGamePhase('replaying');
    setRevealPhase(0);
    setPenaltyResult(null);
  }, [submitEnabled, lockPancreasBars, submitDayWp, currentDay, wpUsed, effectiveWpBudget, currentDecayRate, placedInterventions.length, activeMedications.length]);

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
          currentDecayRate,
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
    unlockPancreasBars(currentDay);
    clearFoods();
    setGamePhase('planning');
    setRevealPhase(undefined);
    setPenaltyResult(null);
  }, [clearFoods, unlockPancreasBars, currentDay]);

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

  // Suppress unused variable warning
  void assessment;

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
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="planning-phase" ref={graphRef}>
        <PlanningHeader
          dayLabel={`Day ${currentDay}/${currentLevel.days}`}
          kcalUsed={kcalUsed}
          kcalBudget={kcalBudget}
          wpUsed={wpUsed}
          wpBudget={wpBudget}
          wpPenalty={wpPenalty}
          settings={settings}
          medicationModifiers={medicationModifiers}
          submitEnabled={submitEnabled}
          onSubmit={handleSubmit}
          onToggleTimeFormat={handleToggleTimeFormat}
          onToggleBgUnit={handleToggleBgUnit}
        />

        {isPlanning && (
          <div className="planning-phase__hint">
            Drag food cards onto the graph to plan your meals!
          </div>
        )}
        {gamePhase === 'replaying' && (
          <div className="planning-phase__hint planning-phase__hint--replay">
            Reviewing your meal plan...
          </div>
        )}

        <div className="planning-phase__content">
          <div className="planning-phase__graph-wrapper">
            <BgGraph
              placedFoods={placedFoods}
              allShips={allShips}
              placedInterventions={placedInterventions}
              allInterventions={allInterventions}
              settings={settings}
              decayRate={currentDecayRate}
              medicationModifiers={medicationModifiers}
              previewShip={isPlanning ? activeShip : null}
              previewIntervention={isPlanning ? activeIntervention : null}
              previewColumn={isPlanning ? previewColumn : null}
              showPenaltyHighlight={showResults}
              revealPhase={gamePhase === 'replaying' ? revealPhase : undefined}
              interactive={isPlanning}
              onFoodClick={handleFoodClick}
              onFoodMove={handleFoodMove}
              onInterventionClick={handleInterventionClick}
              onInterventionMove={handleInterventionMove}
            />
            {isPlanning && (
              <div className="planning-phase__pancreas-overlay">
                <PancreasButton
                  currentTier={currentPancreasTier}
                  barsAvailable={barsAvailable}
                  onToggle={handleTogglePancreas}
                  disabled={gamePhase !== 'planning'}
                />
              </div>
            )}
          </div>

          {isPlanning && (
            <>
              <ShipInventory
                allShips={allShips}
                availableFoods={dayConfig?.availableFoods || []}
                placedFoods={placedFoods}
                wpRemaining={wpRemaining}
              />

              <div className="planning-phase__interventions-row">
                <InterventionInventory
                  allInterventions={allInterventions}
                  availableInterventions={dayConfig?.availableInterventions || []}
                  placedInterventions={placedInterventions}
                  wpRemaining={wpRemaining}
                  allMedications={allMedications}
                  availableMedicationIds={dayConfig?.availableMedications ?? []}
                  activeMedications={activeMedications}
                  onMedicationToggle={toggleMedication}
                />
              </div>
            </>
          )}

          {showResults && penaltyResult && (
            <ResultPanel
              result={penaltyResult}
              currentDay={currentDay}
              totalDays={currentLevel.days}
              unspentWp={effectiveWpBudget - wpUsed}
              onRetry={handleRetry}
              onNextDay={handleNextDay}
            />
          )}

          {/* Day navigation (cheat buttons) — only in planning */}
          {isPlanning && (
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
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeShip && <ShipCardOverlay ship={activeShip} />}
        {activeIntervention && <InterventionCardOverlay intervention={activeIntervention} />}
      </DragOverlay>
    </DndContext>
  );
}
