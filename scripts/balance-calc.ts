/**
 * Level Balance Calculator & Solver
 *
 * Usage:
 *   npx tsx scripts/balance-calc.ts calc --foods "banana:0,chicken:6" --decay 0.5
 *   npx tsx scripts/balance-calc.ts solve --level level-01 --day 1 --decay 0.5
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ── Types ──

interface Ship {
  id: string; name: string; emoji: string;
  load: number; carbs: number; duration: number;
  kcal: number; wpCost: number;
}

interface Intervention {
  id: string; name: string; emoji: string;
  depth: number; duration: number; wpCost: number;
  boostExtra?: number; isBreak?: boolean; slotSize?: number;
}

interface Medication {
  id: string; name: string; emoji: string; type: string;
  multiplier?: number; depth?: number; floorMgDl?: number;
  durationMultiplier?: number; glucoseMultiplier?: number;
  kcalMultiplier?: number; wpBonus?: number;
}

interface AvailableItem { id: string; count: number; }

interface DayConfig {
  day: number; kcalBudget: number; wpBudget: number;
  availableFoods: AvailableItem[];
  availableInterventions?: AvailableItem[];
  availableMedications?: string[];
  preplacedFoods?: { shipId: string; slotIndex: number }[];
  preplacedInterventions?: { interventionId: string; slotIndex: number; slotSize?: number }[];
  lockedSlots?: number[];
}

interface MedMods {
  glucoseMultiplier: number; durationMultiplier: number;
  kcalMultiplier: number; wpBonus: number;
  sglt2: { depth: number; floorRow: number } | null;
}

interface PenaltyResult { totalPenalty: number; orangeCount: number; redCount: number; stars: number; label: string; wpPenalty?: number; }

interface Solution {
  foods: { id: string; slot: number }[];
  interventions: { id: string; slot: number }[];
  meds: string[];
  penalty: number; stars: number; label: string; kcal: number; wp: number;
  wpPenalty?: number;
}

// ── Constants ──

const TOTAL_COLUMNS = 48;
const TOTAL_SLOTS = 12;
const COLS_PER_SLOT = 4;
const BG_MIN = 60;
const CELL_H = 20;
const CELL_W = 15;
const P_ORANGE_ROW = 7;
const P_RED_ROW = 12;
const P_ORANGE_W = 0.5;
const P_RED_W = 1.5;
const WP_PENALTY_WEIGHT = 5;

const slotToCol = (s: number) => s * COLS_PER_SLOT;
const slotTime = (s: number) => { const h = 8 + s; return h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`; };

// ── Engine ──

function foodCurve(glucose: number, dur: number, dropCol: number, decay: number): number[] {
  const peak = Math.round(glucose / CELL_H);
  const rise = Math.max(1, Math.round(dur / CELL_W));
  if (peak <= 0) return new Array(TOTAL_COLUMNS).fill(0);
  const h = new Array(TOTAL_COLUMNS).fill(0);
  for (let i = 0; i < TOTAL_COLUMNS - dropCol; i++) {
    let height: number;
    if (i < rise) {
      height = Math.round(peak * (i+1) / rise - decay * (i+1));
    } else if (decay > 0) {
      height = Math.round(peak - decay * (i+1));
    } else {
      height = peak;
    }
    if (height <= 0) { if (i >= rise) break; continue; }
    h[dropCol + i] = height;
  }
  // Guarantee at least 1 cube
  if (h.every(v => v === 0) && peak > 0) h[dropCol + rise - 1] = 1;
  return h;
}

function intCurve(depth: number, dur: number, dropCol: number, boostExtra: number): number[] {
  const main = Math.max(1, Math.round(dur / CELL_W));
  const r = new Array(TOTAL_COLUMNS).fill(0);
  if (depth <= 0) return r;
  for (let i = 0; i < TOTAL_COLUMNS - dropCol; i++) {
    const h = i < main ? depth : boostExtra;
    if (h > 0) r[dropCol + i] = h;
  }
  return r;
}

function getMods(medIds: string[], allMeds: Medication[]): MedMods {
  const m: MedMods = { glucoseMultiplier: 1, durationMultiplier: 1, kcalMultiplier: 1, wpBonus: 0, sglt2: null };
  for (const id of medIds) {
    const med = allMeds.find(x => x.id === id);
    if (!med) continue;
    if (med.type === 'peakReduction') m.glucoseMultiplier *= (med.multiplier ?? 1);
    else if (med.type === 'thresholdDrain') {
      m.sglt2 = { depth: med.depth ?? 3, floorRow: ((med.floorMgDl ?? 200) - BG_MIN) / CELL_H };
    } else if (med.type === 'slowAbsorption') {
      m.durationMultiplier *= (med.durationMultiplier ?? 1);
      m.glucoseMultiplier *= (med.glucoseMultiplier ?? (1 / (med.durationMultiplier ?? 1)));
      m.kcalMultiplier *= (med.kcalMultiplier ?? 1);
      m.wpBonus += (med.wpBonus ?? 0);
    }
  }
  return m;
}

function calcPenalty(heights: number[], intReduction: number[], mods: MedMods): PenaltyResult {
  let total = 0, oc = 0, rc = 0;
  for (let i = 0; i < TOTAL_COLUMNS; i++) {
    let h = heights[i] - intReduction[i];
    if (mods.sglt2) h -= Math.min(mods.sglt2.depth, Math.max(0, heights[i] - mods.sglt2.floorRow));
    h = Math.max(0, h);
    const orange = Math.max(0, Math.min(h, P_RED_ROW) - P_ORANGE_ROW);
    const red = Math.max(0, h - P_RED_ROW);
    oc += orange; rc += red;
    total += orange * P_ORANGE_W + red * P_RED_W;
  }
  total = Math.round(total * 10) / 10;
  const { stars, label } = total <= 12.5 ? { stars: 3, label: 'Perfect' } : total <= 50 ? { stars: 2, label: 'Good' } : total <= 100 ? { stars: 1, label: 'Pass' } : { stars: 0, label: 'Defeat' };
  return { totalPenalty: total, orangeCount: oc, redCount: rc, stars, label };
}

// ── Data Loading ──

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

function loadFoods(): Ship[] {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'foods.json'), 'utf-8'));
  return raw.foods.map((f: any) => ({
    id: f.id, name: f.name, emoji: f.emoji || '🍽️',
    load: f.glucose, carbs: f.carbs, duration: f.duration,
    kcal: f.kcal, wpCost: f.wpCost ?? 0,
  }));
}

function loadInterventions(): Intervention[] {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'interventions.json'), 'utf-8'));
  return raw.interventions.map((i: any) => ({
    id: i.id, name: i.name, emoji: i.emoji,
    depth: i.depth, duration: i.duration, wpCost: i.wpCost,
    boostExtra: i.boostExtra, isBreak: i.isBreak, slotSize: i.slotSize,
  }));
}

function loadMedications(): Medication[] {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'medications.json'), 'utf-8'));
  return raw.medications.map((m: any) => ({
    id: m.id, name: m.name, emoji: m.emoji, type: m.type,
    multiplier: m.multiplier, depth: m.depth, floorMgDl: m.floorMgDl,
    durationMultiplier: m.durationMultiplier, glucoseMultiplier: m.glucoseMultiplier,
    kcalMultiplier: m.kcalMultiplier, wpBonus: m.wpBonus,
  }));
}

function loadDayConfig(levelId: string, day: number): DayConfig & { totalDays: number } {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'levels', `${levelId}.json`), 'utf-8'));
  const dc = raw.dayConfigs?.find((d: any) => d.day === day) ?? raw.dayConfigs?.[0];
  if (!dc) throw new Error(`Day ${day} not found in ${levelId}`);
  const norm = (arr: any[]): AvailableItem[] => {
    if (!arr?.length) return [];
    return typeof arr[0] === 'string' ? arr.map((id: string) => ({ id, count: 99 })) : arr;
  };
  return {
    day: dc.day, kcalBudget: dc.kcalBudget, wpBudget: dc.wpBudget ?? 10,
    availableFoods: norm(dc.availableFoods),
    availableInterventions: dc.availableInterventions ? norm(dc.availableInterventions) : undefined,
    availableMedications: dc.availableMedications,
    preplacedFoods: dc.preplacedFoods, preplacedInterventions: dc.preplacedInterventions,
    lockedSlots: dc.lockedSlots,
    totalDays: raw.days ?? raw.dayConfigs?.length ?? 1,
  };
}

// ── Calc Mode ──

function runCalc(args: Record<string, string>) {
  const allShips = loadFoods();
  const allInts = loadInterventions();
  const allMeds = loadMedications();
  const decay = parseFloat(args['decay'] ?? '0.5');

  // Parse placements
  const foods: { id: string; slot: number }[] = [];
  if (args['foods']) for (const p of args['foods'].split(',')) { const [id, s] = p.split(':'); foods.push({ id, slot: +s }); }
  const ints: { id: string; slot: number }[] = [];
  if (args['interventions']) for (const p of args['interventions'].split(',')) { const [id, s] = p.split(':'); ints.push({ id, slot: +s }); }
  const medIds = args['meds'] ? args['meds'].split(',') : [];
  const mods = getMods(medIds, allMeds);

  // Build heights
  const heights = new Array(TOTAL_COLUMNS).fill(0);
  for (const f of foods) {
    const ship = allShips.find(s => s.id === f.id);
    if (!ship) continue;
    const c = foodCurve(ship.load * mods.glucoseMultiplier, ship.duration * mods.durationMultiplier, slotToCol(f.slot), decay);
    for (let i = 0; i < TOTAL_COLUMNS; i++) heights[i] += c[i];
  }
  const intRed = new Array(TOTAL_COLUMNS).fill(0);
  for (const iv of ints) {
    const intv = allInts.find(x => x.id === iv.id);
    if (!intv) continue;
    const c = intCurve(intv.depth, intv.duration, slotToCol(iv.slot), intv.boostExtra ?? 0);
    for (let i = 0; i < TOTAL_COLUMNS; i++) intRed[i] += c[i];
  }

  const result = calcPenalty(heights, intRed, mods);

  // Budget
  let kcal = 0, wp = 0;
  for (const f of foods) { const s = allShips.find(x => x.id === f.id); if (s) { kcal += Math.round(s.kcal * mods.kcalMultiplier); wp += s.wpCost; } }
  for (const iv of ints) { const intv = allInts.find(x => x.id === iv.id); if (intv) wp += intv.wpCost; }

  const wpBudget = +(args['wp'] ?? '10') + mods.wpBonus;
  const kcalBudget = Math.round(+(args['kcal'] ?? '2000') * mods.kcalMultiplier);

  console.log('\n=== Level Balance Report ===\n');
  console.log('Foods:');
  for (const f of foods) {
    const s = allShips.find(x => x.id === f.id);
    if (!s) { console.log(`  Slot ${f.slot}: ??? (${f.id})`); continue; }
    console.log(`  Slot ${f.slot} (${slotTime(f.slot)}): ${s.emoji} ${s.name} — ${Math.round(s.load * mods.glucoseMultiplier / CELL_H)} peak, ${Math.round(s.kcal * mods.kcalMultiplier)} kcal, ${s.wpCost} WP`);
  }
  if (ints.length) { console.log('\nInterventions:'); for (const iv of ints) { const intv = allInts.find(x => x.id === iv.id); if (intv) console.log(`  Slot ${iv.slot} (${slotTime(iv.slot)}): ${intv.emoji} ${intv.name} — depth ${intv.depth}, ${intv.wpCost} WP`); } }
  if (medIds.length) console.log('\nMeds:', medIds.map(id => { const m = allMeds.find(x => x.id === id); return m ? `${m.emoji} ${m.name}` : id; }).join(', '));
  console.log(`\nBudget: ${kcal}/${kcalBudget} kcal (${Math.round(kcal/kcalBudget*100)}%) | ${wp}/${wpBudget} WP`);
  console.log(`Decay: ${decay}`);
  console.log(`\nPenalty: ${result.totalPenalty} → ${'⭐'.repeat(result.stars)}${result.stars===0?'💀':''} ${result.label}`);
  console.log(`Orange: ${result.orangeCount} | Red: ${result.redCount}\n`);
}

// ── Solver Mode ──

// Top-N tracker per star level (avoids storing all solutions)
class SolverTracker {
  counts = [0, 0, 0, 0]; // per star: 0★, 1★, 2★, 3★
  top: Solution[][] = [[], [], [], []]; // top 10 per star
  maxPerStar = 10;
  evaluated = 0;

  add(sol: Solution) {
    this.evaluated++;
    this.counts[sol.stars]++;
    const arr = this.top[sol.stars];
    if (arr.length < this.maxPerStar) {
      arr.push(sol);
      arr.sort((a, b) => a.penalty - b.penalty);
    } else if (sol.penalty < arr[arr.length - 1].penalty) {
      arr[arr.length - 1] = sol;
      arr.sort((a, b) => a.penalty - b.penalty);
    }
  }
}

function runSolve(args: Record<string, string>) {
  const allShips = loadFoods();
  const allInts = loadInterventions();
  const allMeds = loadMedications();
  const decay = parseFloat(args['decay'] ?? '0.5');
  const maxFoods = parseInt(args['max-foods'] ?? '5', 10);

  // Load config
  let dayConfig: DayConfig;
  let isLastDay = args['last-day'] === 'true';
  if (args['level']) {
    const loaded = loadDayConfig(args['level'], +(args['day'] ?? '1'));
    dayConfig = loaded;
    if (!args['last-day']) isLastDay = loaded.day === loaded.totalDays;
  } else {
    const parse = (s: string) => s.split(',').filter(Boolean).map(x => { const [id, c] = x.split(':'); return { id, count: +(c ?? '1') }; });
    dayConfig = {
      day: 1, kcalBudget: +(args['kcal'] ?? '2000'), wpBudget: +(args['wp'] ?? '10'),
      availableFoods: parse(args['available-foods'] ?? ''),
      availableInterventions: args['available-interventions'] ? parse(args['available-interventions']) : undefined,
      availableMedications: args['available-meds']?.split(','),
      lockedSlots: args['locked']?.split(',').map(Number),
      preplacedFoods: args['preplaced-foods']?.split(',').map(s => { const [id, sl] = s.split(':'); return { shipId: id, slotIndex: +sl }; }),
    };
  }

  // Build constraints
  const locked = new Set<number>(dayConfig.lockedSlots ?? []);
  const preFoods: { id: string; slot: number }[] = [];
  const preInts: { id: string; slot: number; size: number }[] = [];
  let preWp = 0, preKcal = 0;

  for (const pf of dayConfig.preplacedFoods ?? []) {
    locked.add(pf.slotIndex);
    preFoods.push({ id: pf.shipId, slot: pf.slotIndex });
    const ship = allShips.find(s => s.id === pf.shipId);
    if (ship) { preWp += ship.wpCost; preKcal += ship.kcal; }
  }
  for (const pi of dayConfig.preplacedInterventions ?? []) {
    const sz = pi.slotSize ?? 1;
    for (let s = pi.slotIndex; s < pi.slotIndex + sz; s++) locked.add(s);
    preInts.push({ id: pi.interventionId, slot: pi.slotIndex, size: sz });
    const intv = allInts.find(x => x.id === pi.interventionId);
    if (intv) preWp += intv.wpCost;
  }

  const freeSlots: number[] = [];
  for (let s = 0; s < TOTAL_SLOTS; s++) if (!locked.has(s)) freeSlots.push(s);

  // Expand food pool (minus pre-placed)
  const foodPool: string[] = [];
  for (const af of dayConfig.availableFoods) {
    const preCnt = (dayConfig.preplacedFoods ?? []).filter(p => p.shipId === af.id).length;
    for (let i = 0; i < af.count - preCnt; i++) foodPool.push(af.id);
  }

  // Expand intervention pool (minus pre-placed)
  const intPool: { id: string; size: number }[] = [];
  for (const ai of dayConfig.availableInterventions ?? []) {
    const preCnt = (dayConfig.preplacedInterventions ?? []).filter(p => p.interventionId === ai.id).length;
    const intv = allInts.find(x => x.id === ai.id);
    for (let i = 0; i < ai.count - preCnt; i++) intPool.push({ id: ai.id, size: intv?.slotSize ?? 1 });
  }

  const medCombos: string[][] = [[]];
  for (const medId of dayConfig.availableMedications ?? []) {
    const len = medCombos.length;
    for (let i = 0; i < len; i++) medCombos.push([...medCombos[i], medId]);
  }

  console.log('\n=== Solver ===\n');
  console.log(`Level: ${args['level'] ?? 'custom'}, Day: ${dayConfig.day}`);
  console.log(`Budget: ${dayConfig.kcalBudget} kcal, ${dayConfig.wpBudget} WP, decay=${decay}`);
  console.log(`Free slots: [${freeSlots.join(', ')}] (${freeSlots.length}/${TOTAL_SLOTS})`);
  console.log(`Food pool (${foodPool.length}): ${foodPool.join(', ')}`);
  console.log(`Intervention pool (${intPool.length}): ${intPool.map(i => i.id).join(', ')}`);
  console.log(`Med combos: ${medCombos.length}`);
  console.log(`Max foods per solution: ${maxFoods}`);
  if (preFoods.length) console.log(`Pre-placed foods: ${preFoods.map(f => `${f.id}@${f.slot}`).join(', ')}`);
  if (preInts.length) console.log(`Pre-placed interventions: ${preInts.map(i => `${i.id}@${i.slot}`).join(', ')}`);
  if (isLastDay) console.log(`⚠️  Last day — unspent WP penalty: +${WP_PENALTY_WEIGHT} per unspent WP`);
  console.log('\nSearching...');

  const tracker = new SolverTracker();
  const startTime = Date.now();

  // Helper: add solution with optional last-day WP penalty
  function addSolution(sol: Solution, effWpBudget: number) {
    if (isLastDay) {
      const unspent = Math.max(0, effWpBudget - sol.wp);
      if (unspent > 0) {
        const wpPen = unspent * WP_PENALTY_WEIGHT;
        sol.penalty = Math.round((sol.penalty + wpPen) * 10) / 10;
        sol.wpPenalty = wpPen;
        // Recalculate stars
        const { stars, label } = sol.penalty <= 12.5 ? { stars: 3, label: 'Perfect' } : sol.penalty <= 50 ? { stars: 2, label: 'Good' } : sol.penalty <= 100 ? { stars: 1, label: 'Pass' } : { stars: 0, label: 'Defeat' };
        sol.stars = stars;
        sol.label = label;
      }
    }
    tracker.add(sol);
  }

  // Pre-compute intervention curves for pre-placed interventions
  const preIntRed = new Array(TOTAL_COLUMNS).fill(0);
  for (const pi of preInts) {
    const intv = allInts.find(x => x.id === pi.id);
    if (!intv) continue;
    const c = intCurve(intv.depth, intv.duration, slotToCol(pi.slot), intv.boostExtra ?? 0);
    for (let i = 0; i < TOTAL_COLUMNS; i++) preIntRed[i] += c[i];
  }

  for (const medCombo of medCombos) {
    const mods = getMods(medCombo, allMeds);
    const effWp = dayConfig.wpBudget + mods.wpBonus;
    const effKcal = Math.round(dayConfig.kcalBudget * mods.kcalMultiplier);
    const preKcalMod = Math.round(preKcal * mods.kcalMultiplier);

    const foodKcals: Map<string, number> = new Map();
    for (const fid of new Set(foodPool)) {
      const ship = allShips.find(s => s.id === fid);
      if (!ship) continue;
      // We store a "template" curve at column 0, will shift when placing
      foodKcals.set(fid, Math.round(ship.kcal * mods.kcalMultiplier));
    }

    // Recursive food placement
    const heights = new Array(TOTAL_COLUMNS).fill(0);

    // Add pre-placed food curves
    for (const pf of preFoods) {
      const ship = allShips.find(s => s.id === pf.id);
      if (!ship) continue;
      const c = foodCurve(ship.load * mods.glucoseMultiplier, ship.duration * mods.durationMultiplier, slotToCol(pf.slot), decay);
      for (let i = 0; i < TOTAL_COLUMNS; i++) heights[i] += c[i];
    }

    const placedFoodList: { id: string; slot: number }[] = [];
    let currentWp = preWp;
    let currentKcal = preKcalMod;

    function evaluateWithInterventions(foodList: { id: string; slot: number }[], usedSlots: Set<number>) {
      // Try: no interventions, then each single intervention, then pairs
      const baseResult = calcPenalty(heights, preIntRed, mods);

      // Record baseline (no player interventions)
      addSolution({
        foods: [...preFoods, ...foodList],
        interventions: preInts.map(i => ({ id: i.id, slot: i.slot })),
        meds: medCombo, penalty: baseResult.totalPenalty, stars: baseResult.stars,
        label: baseResult.label, kcal: currentKcal, wp: currentWp,
      }, effWp);

      // Try adding single interventions at each free slot
      const remainSlots = freeSlots.filter(s => !usedSlots.has(s));
      // Compute min negative WP from break interventions (for pair pruning)
      const minNegWp = intPool.reduce((min, item) => {
        const iv = allInts.find(x => x.id === item.id);
        return iv && iv.wpCost < 0 ? Math.min(min, iv.wpCost) : min;
      }, 0);

      for (let ii = 0; ii < intPool.length; ii++) {
        const intItem = intPool[ii];
        const intv = allInts.find(x => x.id === intItem.id);
        if (!intv) continue;
        // Allow if: affordable alone, OR could become affordable with a negative-WP partner
        const singleWpOk = currentWp + intv.wpCost <= effWp;
        const pairPossible = currentWp + intv.wpCost + minNegWp <= effWp;
        if (!singleWpOk && !pairPossible) continue;

        for (const slot of remainSlots) {
          // Multi-slot check
          if (intItem.size > 1) {
            let canFit = true;
            for (let s = slot; s < slot + intItem.size; s++) {
              if (s >= TOTAL_SLOTS || usedSlots.has(s) || locked.has(s)) { canFit = false; break; }
              if (!freeSlots.includes(s)) { canFit = false; break; }
            }
            if (!canFit) continue;
          }

          const iRed = new Array(TOTAL_COLUMNS).fill(0);
          for (let i = 0; i < TOTAL_COLUMNS; i++) iRed[i] = preIntRed[i];
          const c = intCurve(intv.depth, intv.duration, slotToCol(slot), intv.boostExtra ?? 0);
          for (let i = 0; i < TOTAL_COLUMNS; i++) iRed[i] += c[i];

          // Record single intervention only if WP fits
          if (singleWpOk) {
            const r = calcPenalty(heights, iRed, mods);
            addSolution({
              foods: [...preFoods, ...foodList],
              interventions: [...preInts.map(i => ({ id: i.id, slot: i.slot })), { id: intItem.id, slot }],
              meds: medCombo, penalty: r.totalPenalty, stars: r.stars,
              label: r.label, kcal: currentKcal, wp: currentWp + intv.wpCost,
            }, effWp);
          }

          // Try adding a second intervention
          for (let jj = ii + 1; jj < intPool.length; jj++) {
            const intItem2 = intPool[jj];
            const intv2 = allInts.find(x => x.id === intItem2.id);
            if (!intv2) continue;
            if (currentWp + intv.wpCost + intv2.wpCost > effWp) continue;

            const occSlots = new Set(usedSlots);
            for (let s = slot; s < slot + intItem.size; s++) occSlots.add(s);
            const remSlots2 = remainSlots.filter(s => !occSlots.has(s));

            for (const slot2 of remSlots2) {
              if (intItem2.size > 1) {
                let canFit = true;
                for (let s = slot2; s < slot2 + intItem2.size; s++) {
                  if (s >= TOTAL_SLOTS || occSlots.has(s) || locked.has(s)) { canFit = false; break; }
                }
                if (!canFit) continue;
              }

              const iRed2 = new Array(TOTAL_COLUMNS).fill(0);
              for (let i = 0; i < TOTAL_COLUMNS; i++) iRed2[i] = iRed[i];
              const c2 = intCurve(intv2.depth, intv2.duration, slotToCol(slot2), intv2.boostExtra ?? 0);
              for (let i = 0; i < TOTAL_COLUMNS; i++) iRed2[i] += c2[i];

              const r2 = calcPenalty(heights, iRed2, mods);
              addSolution({
                foods: [...preFoods, ...foodList],
                interventions: [...preInts.map(i => ({ id: i.id, slot: i.slot })), { id: intItem.id, slot }, { id: intItem2.id, slot: slot2 }],
                meds: medCombo, penalty: r2.totalPenalty, stars: r2.stars,
                label: r2.label, kcal: currentKcal, wp: currentWp + intv.wpCost + intv2.wpCost,
              }, effWp);
            }
          }
        }
      }
    }

    function recursePlaceFoods(startIdx: number, usedSlots: Set<number>) {
      // Evaluate current placement (if any foods placed or pre-placed)
      if (placedFoodList.length > 0 || preFoods.length > 0) {
        // Check kcal minimum
        if (currentKcal >= effKcal * 0.5) {
          evaluateWithInterventions(placedFoodList.slice(), usedSlots);
        }
      }

      // Try adding more foods
      if (placedFoodList.length >= maxFoods) return;

      for (let fi = startIdx; fi < foodPool.length; fi++) {
        // Skip duplicate selections (same food ID already tried at this level)
        if (fi > startIdx && foodPool[fi] === foodPool[fi - 1]) continue;

        const foodId = foodPool[fi];
        const ship = allShips.find(s => s.id === foodId);
        if (!ship) continue;

        const foodWp = ship.wpCost;
        if (currentWp + foodWp > effWp) continue; // WP check

        const foodKcal = foodKcals.get(foodId) ?? 0;

        // Try each free slot
        for (const slot of freeSlots) {
          if (usedSlots.has(slot)) continue;

          // Add food curve to heights
          const curve = foodCurve(ship.load * mods.glucoseMultiplier, ship.duration * mods.durationMultiplier, slotToCol(slot), decay);
          for (let i = 0; i < TOTAL_COLUMNS; i++) heights[i] += curve[i];
          usedSlots.add(slot);
          placedFoodList.push({ id: foodId, slot });
          currentWp += foodWp;
          currentKcal += foodKcal;

          // Recurse
          recursePlaceFoods(fi + 1, usedSlots);

          // Undo
          for (let i = 0; i < TOTAL_COLUMNS; i++) heights[i] -= curve[i];
          usedSlots.delete(slot);
          placedFoodList.pop();
          currentWp -= foodWp;
          currentKcal -= foodKcal;
        }
      }
    }

    const usedSlots = new Set<number>();
    recursePlaceFoods(0, usedSlots);

    // Restore heights (remove pre-placed food curves for next med combo)
    for (const pf of preFoods) {
      const ship = allShips.find(s => s.id === pf.id);
      if (!ship) continue;
      const c = foodCurve(ship.load * mods.glucoseMultiplier, ship.duration * mods.durationMultiplier, slotToCol(pf.slot), decay);
      for (let i = 0; i < TOTAL_COLUMNS; i++) heights[i] -= c[i];
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Done in ${elapsed}s — ${tracker.evaluated} placements evaluated\n`);

  // Output
  const labels: Record<number, string> = { 3: '⭐⭐⭐ Perfect (≤12.5)', 2: '⭐⭐ Good (≤50)', 1: '⭐ Pass (≤100)', 0: '💀 Defeat (>100)' };

  for (const stars of [3, 2, 1, 0]) {
    const count = tracker.counts[stars];
    const top = tracker.top[stars];
    console.log(`${labels[stars]} — ${count} solutions`);
    for (let i = 0; i < top.length; i++) {
      const s = top[i];
      const foodStr = s.foods.map(f => `${f.id}:${f.slot}`).join(', ');
      const intStr = s.interventions.length ? ` | int: ${s.interventions.map(i => `${i.id}:${i.slot}`).join(', ')}` : '';
      const medStr = s.meds.length ? ` | meds: ${s.meds.join(',')}` : '';
      const wpPenStr = s.wpPenalty ? ` (wp_pen=${s.wpPenalty})` : '';
      console.log(`  #${i+1}: ${foodStr}${intStr}${medStr} | p=${s.penalty}${wpPenStr} | ${s.kcal} kcal | ${s.wp} WP`);
    }
    console.log('');
  }

  const total = tracker.counts.reduce((a, b) => a + b, 0);
  if (total > 0) {
    const pct3 = ((tracker.counts[3] / total) * 100).toFixed(1);
    console.log(`Summary: ${tracker.counts[3]}/${total} are 3★ (${pct3}%)`);
    if (tracker.counts[3] <= 10 && tracker.counts[3] > 0) console.log('→ Good puzzle difficulty!');
    else if (tracker.counts[3] === 0) console.log('→ WARNING: No 3★ solutions! Level may be too hard.');
    else console.log('→ Many 3★ solutions — add constraints for puzzle feel.');
  }
  console.log('');
}

// ── CLI ──

function parseArgs(argv: string[]): { command: string; args: Record<string, string> } {
  const command = argv[2] ?? 'help';
  const args: Record<string, string> = {};
  for (let i = 3; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i+1] && !argv[i+1].startsWith('--') ? argv[i+1] : 'true';
      args[key] = val;
      if (val !== 'true') i++;
    }
  }
  return { command, args };
}

function main() {
  const { command, args } = parseArgs(process.argv);
  switch (command) {
    case 'calc': runCalc(args); break;
    case 'solve': runSolve(args); break;
    default:
      console.log(`
Level Balance Calculator & Solver

Usage:
  npx tsx scripts/balance-calc.ts calc [options]
  npx tsx scripts/balance-calc.ts solve [options]

Calc:
  --foods "banana:0,chicken:6"      Food placements (id:slot)
  --interventions "lightwalk:2"     Intervention placements
  --meds "metformin,glp1"           Active medications
  --decay 0.5                       Decay rate (default: 0.5)
  --wp 10 --kcal 2000               Budgets (display only)

Solve:
  --level level-01 --day 1          Load from level config
  --decay 0.5                       Decay rate
  --max-foods 5                     Max foods to place (default: 5)
  --last-day true                   Force last-day WP penalty (auto-detected from level config)

  Custom config:
  --available-foods "banana:1,pizza:1"
  --available-interventions "lightwalk:1"
  --available-meds "metformin"
  --locked "1,5"
  --preplaced-foods "banana:0"
  --wp 10 --kcal 2000
`);
  }
}

main();
