import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { Ship, Intervention, Medication, GamePhase, PenaltyResult, PancreasTier, SatietyPenalty } from '../../core/types';
import { TOTAL_SLOTS } from '../../core/types';
import { useGameStore, getDayConfig, selectKcalUsed, selectWpUsed, selectWpPenalty, selectSatietyPenalty } from '../../store/gameStore';
import { loadFoods, loadLevel, loadInterventions, loadMedications } from '../../config/loader';
import { computeMedicationModifiers, calculatePenaltyFromState } from '../../core/cubeEngine';
import { DEFAULT_MEDICATION_MODIFIERS, DEFAULT_SATIETY_PENALTY, getSatietyPenalty, SATIETY_PENALTY_FOOD_ID, PANCREAS_TOTAL_BARS, WP_PENALTY_WEIGHT, calculateStars } from '../../core/types';
import { getPancreasTiers } from '../../config/loader';
import { BgGraph } from '../graph';
import { PlanningHeader } from './PlanningHeader';
import { ShipInventory } from './ShipInventory';
import { InterventionInventory } from './InterventionInventory';
import { PancreasButton } from './PancreasButton';
import { ResultPanel } from './ResultPanel';
import { SlotGrid } from './SlotGrid';
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

function togglePancreasTier(current: PancreasTier, maxBars: number): PancreasTier {
  if (current === 3) return 1; // BOOST → ON
  // ON → BOOST (if affordable)
  if (getPancreasTiers()[3].cost <= maxBars) return 3;
  return 1; // can't afford boost, stay ON
}

export function PlanningPhase() {
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
    pancreasTierPerDay,
    lockedBarsPerDay,
    setPancreasTier,
    lockPancreasBars,
    unlockPancreasBars,
    submittedWpPerDay,
    submitDayWp,
    satietyPenaltyPerDay,
    setSatietyPenalty,
  } = useGameStore();

  const [allShips, setAllShips] = useState<Ship[]>([]);
  const [allInterventions, setAllInterventions] = useState<Intervention[]>([]);
  const [allMedications, setAllMedications] = useState<Medication[]>([]);
  const [activeShip, setActiveShip] = useState<Ship | null>(null);
  const [activeIntervention, setActiveIntervention] = useState<Intervention | null>(null);
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

  // Pancreas tier system
  const currentPancreasTier = (pancreasTierPerDay[currentDay] ?? 1) as PancreasTier;
  const currentDecayRate = getPancreasTiers()[currentPancreasTier].decayRate;
  const totalLockedBars = Object.values(lockedBarsPerDay).reduce((a, b) => a + b, 0);
  const barsAvailable = PANCREAS_TOTAL_BARS - totalLockedBars;

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

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveShip(null);
      setActiveIntervention(null);

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
        // Slot → Slot: move or swap
        if (fromSlotIndex === targetSlot) return;
        moveSlotToSlot(fromSlotIndex, targetSlot);
      } else {
        // Inventory → Slot: place (or replace if occupied)
        const isOccupied = placedFoods.some(f => f.slotIndex === targetSlot)
          || placedInterventions.some(i => i.slotIndex === targetSlot);

        // Compute WP freed if replacing an existing card
        let freedWp = 0;
        if (isOccupied) {
          const existingFood = placedFoods.find(f => f.slotIndex === targetSlot);
          if (existingFood) {
            const s = allShips.find(sh => sh.id === existingFood.shipId);
            freedWp = s?.wpCost ?? 0;
          }
          const existingInt = placedInterventions.find(i => i.slotIndex === targetSlot);
          if (existingInt) {
            const inv = allInterventions.find(a => a.id === existingInt.interventionId);
            freedWp = inv?.wpCost ?? 0;
          }
        }

        const effectiveWp = wpRemaining + freedWp;
        const isIntervention = activeData?.isIntervention === true;

        if (isIntervention) {
          const intervention = activeData?.intervention as Intervention | undefined;
          if (!intervention) return;
          if (intervention.wpCost > effectiveWp) return;
          if (isOccupied) removeFromSlot(targetSlot);
          placeInterventionInSlot(intervention.id, targetSlot);
        } else {
          const ship = activeData?.ship as Ship | undefined;
          if (!ship) return;
          if ((ship.wpCost ?? 0) > effectiveWp) return;
          if (isOccupied) removeFromSlot(targetSlot);
          placeFoodInSlot(ship.id, targetSlot);
        }
      }
    },
    [placeFoodInSlot, placeInterventionInSlot, removeFromSlot, moveSlotToSlot, wpRemaining, gamePhase, placedFoods, placedInterventions, allShips, allInterventions]
  );

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

    // Calculate and store satiety penalty for next day
    const penalty = getSatietyPenalty(kcalUsed, effectiveKcalBudget);
    setSatietyPenalty(currentDay, penalty);
    setSatietyResult(penalty);

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
  }, [submitEnabled, lockPancreasBars, submitDayWp, currentDay, wpUsed, effectiveWpBudget, kcalUsed, effectiveKcalBudget, setSatietyPenalty, currentDecayRate, placedInterventions.length, activeMedications.length]);

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
      onDragEnd={handleDragEnd}
    >
      <div className="planning-phase">
        {isPlanning && (
          <div className="planning-phase__hint">
            Drag food cards into meal slots to plan your day!
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
              showPenaltyHighlight={showResults}
              revealPhase={gamePhase === 'replaying' ? revealPhase : undefined}
            />
            {isPlanning && (
              <div className="planning-phase__pancreas-overlay">
                <PancreasButton
                  currentTier={currentPancreasTier}
                  usesRemaining={barsAvailable}
                  onToggle={handleTogglePancreas}
                  disabled={gamePhase !== 'planning'}
                />
              </div>
            )}
          </div>

          <SlotGrid
            allShips={allShips}
            allInterventions={allInterventions}
            placedFoods={placedFoods}
            placedInterventions={placedInterventions}
            settings={settings}
            onRemoveFromSlot={removeFromSlot}
            disabled={!isPlanning}
          />

          <PlanningHeader
            dayLabel={`Day ${currentDay}/${currentLevel.days}`}
            kcalUsed={kcalUsed}
            kcalBudget={kcalBudget}
            wpRemaining={wpRemaining}
            satietyPenalty={satietyPenalty}
            settings={settings}
            medicationModifiers={medicationModifiers}
            submitEnabled={submitEnabled}
            onSubmit={handleSubmit}
          />

          {isPlanning && (
            <InventoryDropZone>
              <ShipInventory
                allShips={allShips}
                availableFoods={effectiveAvailableFoods}
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
