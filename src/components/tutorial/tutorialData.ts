// Tutorial step data for all 8 levels, 20 days
// Each step defines a bubble message, highlight target, CTA, and advance condition

export type BubbleType = 'dialogue' | 'hint' | 'warning' | 'success';
export type Expression = 'neutral' | 'happy' | 'concerned' | 'thinking' | 'celebrating';
export type HighlightType = 'spotlight' | 'pulse' | 'pulse-green' | 'glow' | 'arrow';
export type CTAType = 'drag-arrow' | 'tap-pulse' | 'glow-border' | 'bounce';
export type AdvanceOn = 'tap' | 'action' | 'auto' | 'burn-anim-complete';

export interface TutorialBubble {
  type: BubbleType;
  text: string;
  expression?: Expression;
  position?: 'top' | 'bottom' | 'center' | 'inventory';
}

export interface TutorialCTA {
  type: CTAType;
  target?: string;
  source?: string;
  dest?: string;
}

export interface ExpectedAction {
  type: 'place-food' | 'place-intervention' | 'toggle-medication' | 'toggle-boost' | 'click-submit';
  foodId?: string;
  slotIndex?: number;
  interventionId?: string;
  medicationId?: string;
}

export interface TutorialStep {
  id: string;
  bubble?: TutorialBubble;
  highlight?: string | string[];
  highlightType?: HighlightType;
  noBackdrop?: boolean;
  cta?: TutorialCTA;
  advanceOn: AdvanceOn;
  blockInteraction?: boolean;
  expectedAction?: ExpectedAction;
  highlightMedEffect?: boolean;  // tutorial: pulse animation on med-prevented cubes
  blocksResultsReveal?: boolean; // if true — PlanningPhase holds counting sequence until this step is tapped
  pendingUntilResults?: boolean; // if true — TutorialOverlay hidden until gamePhase === 'results'
  revealKcal?: boolean;          // if true — kcal indicator revealed on food cards from this step forward
  clearPreplaced?: boolean;      // if true — all pre-placed foods moved to available inventory when step activates
  requiresOptimalSubmit?: boolean; // if true — submit button only active when kcal zone === 'optimal'
  kcalBlink?: boolean;           // if true — kcal numbers on all food cards pulse while step is active
  pancreasEffectivenessOverride?: number; // if set — overrides dayConfig.pancreasEffectiveness on PancreasButton (triggers blink when < config value)
  showBurnsLayer?: boolean;    // tutorial: force show burned layer (hideBurnedInPlanning=false)
  highlightBurns?: boolean;    // tutorial: pulse-blink pancreas-burned (orange) cubes
  triggerReburn?: boolean;     // tutorial: trigger bomb animation replay for all food columns
}

// ======= PANCREAS FATIGUE (T4) =======

const L_PF_D1: TutorialStep[] = [
  {
    id: 'LPF-D1-1',
    bubble: { type: 'warning', text: "Unfortunately, type 2 diabetes is a progressive disease — especially without careful diet and lifestyle management.", expression: 'concerned', position: 'center' },
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'LPF-D1-2',
    bubble: { type: 'dialogue', text: "Over time this leads to increased insulin resistance and greater burden on the pancreas, causing it to fatigue.", expression: 'neutral', position: 'inventory' },
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'LPF-D1-3',
    bubble: { type: 'hint', text: "You can monitor pancreas performance right here. Right now it's working at full strength — 5 out of 5.", expression: 'neutral', position: 'inventory' },
    highlight: 'pancreas-btn',
    highlightType: 'pulse',
    pancreasEffectivenessOverride: 5,
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'LPF-D1-4',
    bubble: { type: 'dialogue', text: "Place any food card and watch how the pancreas handles the glucose spike at full strength.", expression: 'neutral', position: 'inventory' },
    pancreasEffectivenessOverride: 5,
    advanceOn: 'action',
    expectedAction: { type: 'place-food' },
  },
  {
    // Silent step: wait for tier-5 bomb animation to complete
    id: 'LPF-D1-4b',
    pancreasEffectivenessOverride: 5,
    highlight: 'graph',
    highlightType: 'spotlight',
    noBackdrop: true,
    blockInteraction: true,
    advanceOn: 'burn-anim-complete',
  },
  {
    // Show burned layer (tier-5 pattern) and explain it
    id: 'LPF-D1-4c',
    bubble: { type: 'hint', text: "At full strength the pancreas burns 2 rows of glucose every interval — that's tier-5 depth.", expression: 'neutral', position: 'inventory' },
    pancreasEffectivenessOverride: 5,
    showBurnsLayer: true,
    highlightBurns: true,
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    // Explain what's coming — effectiveness override NOT applied yet (bar still shows 5)
    id: 'LPF-D1-5',
    bubble: { type: 'hint', text: "Now let's see what happens when the pancreas is slightly fatigued...", expression: 'thinking', position: 'inventory' },
    highlight: 'pancreas-btn',
    highlightType: 'pulse',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    // Silent step: apply tier-4 override + replay bombs with tier-4 pattern
    id: 'LPF-D1-5b',
    pancreasEffectivenessOverride: 4,
    triggerReburn: true,
    noBackdrop: true,
    blockInteraction: true,
    advanceOn: 'burn-anim-complete',
  },
  {
    // Show tier-4 burned layer and explain the difference
    id: 'LPF-D1-6',
    bubble: { type: 'dialogue', text: "Not as sharp as before. The second burn row now skips every other interval — so some glucose slips through. That's what tier 4 looks like.", expression: 'concerned', position: 'inventory' },
    pancreasEffectivenessOverride: 4,
    showBurnsLayer: true,
    highlightBurns: true,
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'LPF-D1-7',
    bubble: { type: 'dialogue', text: "Finish planning for today — I'll explain how we can support the pancreas.", expression: 'neutral', position: 'inventory' },
    pancreasEffectivenessOverride: 4,
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
  {
    id: 'LPF-D1-9',
    bubble: { type: 'dialogue', text: "That's a lot of excess sugar. Tomorrow I'll show you what helps reduce the load on the pancreas.", expression: 'concerned', position: 'inventory' },
    pendingUntilResults: true,
    highlight: 'result-next-btn',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'result-next-btn' },
    noBackdrop: true,
    blockInteraction: false,
    advanceOn: 'tap',
  },
];

const L_PF_D2: TutorialStep[] = [
  {
    id: 'LPF-D2-1',
    bubble: { type: 'dialogue', text: "The muffin is causing a dangerous spike. And today the pancreas is already at 4/5 — it's working harder to compensate.", expression: 'concerned' },
    highlight: 'graph',
    highlightType: 'spotlight',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'LPF-D2-2',
    bubble: { type: 'hint', text: "Even intense physical activity won't flatten this peak alone — but let's try it. Place Heavy Run right after the muffin.", expression: 'thinking', position: 'inventory' },
    highlight: ['intervention:heavyrun', 'slot:4'],
    highlightType: 'spotlight',
    cta: { type: 'drag-arrow', source: 'intervention:heavyrun', dest: 'slot:4' },
    advanceOn: 'action',
    expectedAction: { type: 'place-intervention', interventionId: 'heavyrun' },
  },
  {
    id: 'LPF-D2-3',
    bubble: { type: 'dialogue', text: "Heavy Run reduces the peak — but it's still in the danger zone. We need another approach.", expression: 'thinking' },
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'LPF-D2-4',
    bubble: { type: 'dialogue', text: "\ud83d\udc8a Metformin! It reduces ALL food glucose by 20% — for the entire day.", expression: 'neutral' },
    highlight: 'medication:metformin',
    highlightType: 'spotlight',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'LPF-D2-5',
    bubble: { type: 'hint', text: "No WP cost. Just tap once — it stays active all day.", expression: 'thinking' },
    advanceOn: 'tap',
  },
  {
    id: 'LPF-D2-6',
    bubble: { type: 'dialogue', text: "Tap Metformin ON and watch the peak change!", expression: 'neutral' },
    highlight: 'medication:metformin',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'medication:metformin' },
    advanceOn: 'action',
    expectedAction: { type: 'toggle-medication', medicationId: 'metformin' },
  },
  {
    id: 'LPF-D2-7',
    bubble: { type: 'success', text: "Wow! That was substantial! The purple layer shows the glucose Metformin prevented — the more carbs, the bigger the effect!", expression: 'happy', position: 'bottom' },
    highlight: 'graph',
    highlightType: 'glow',
    noBackdrop: true,
    showBurnsLayer: true,
    highlightMedEffect: true,
    advanceOn: 'tap',
  },
  {
    id: 'LPF-D2-8',
    bubble: { type: 'dialogue', text: "Place your remaining food and submit!", expression: 'neutral', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
  {
    id: 'LPF-D2-10',
    pendingUntilResults: true,
    highlight: 'result-next-btn',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'result-next-btn' },
    blockInteraction: false,
    noBackdrop: true,
    advanceOn: 'tap',
  },
];

// ======= LEVEL 1 — First Steps =======

const L1D1: TutorialStep[] = [
  {
    id: 'L1D1-1',
    bubble: { type: 'dialogue', text: "Welcome to Level Two! I'm Alice, and I'll guide you through our Type 2 Diabetes game.", expression: 'happy', position: 'center' },
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L1D1-2',
    bubble: { type: 'dialogue', text: 'This is our Blood Glucose graph. Our current level is 100\u00a0mg/dL.', expression: 'neutral', position: 'center' },
    highlight: 'baseline-cubes',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L1D1-2b',
    bubble: { type: 'warning', text: 'When planning our day, try to keep blood glucose below 200\u00a0mg/dL. Crossing that red line means we\u2019re in the danger zone!', expression: 'concerned', position: 'center' },
    highlight: 'danger-line',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L1D1-3',
    bubble: { type: 'dialogue', text: 'When we eat, carbs raise our blood glucose. More carbs = higher peak. Each food card shows its absorption speed \u2014 Fast foods spike quickly, Slow foods rise gradually.', expression: 'neutral' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L1D1-4',
    bubble: { type: 'dialogue', text: "Let's plan our first meal! Drag the \ud83c\udf4c Banana to the 10:00\u00a0AM slot.", expression: 'happy' },
    highlight: ['food:banana', 'slot:2'],
    highlightType: 'glow',
    cta: { type: 'drag-arrow', source: 'food:banana', dest: 'slot:2' },
    advanceOn: 'action',
    expectedAction: { type: 'place-food', foodId: 'banana', slotIndex: 2 },
  },
  {
    id: 'L1D1-4b',
    highlight: 'graph',
    highlightType: 'spotlight',
    noBackdrop: false,
    blockInteraction: true,
    advanceOn: 'burn-anim-complete',
  },
  {
    id: 'L1D1-5',
    bubble: { type: 'dialogue', text: 'Wow! Did you see those meteors? Our pancreas detected the glucose rise and released insulin \u2014 working with our body to bring the level back down!', expression: 'happy', position: 'center' },
    blockInteraction: true,
    advanceOn: 'tap',
  },
  {
    id: 'L1D1-7',
    bubble: { type: 'dialogue', text: 'Now hit Submit to see our results!', expression: 'neutral' },
    highlight: 'submit-btn',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'submit-btn' },
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
  {
    id: 'L1D1-8',
    bubble: { type: 'dialogue', text: 'Look at that! Our pancreas kept the glucose from crossing the 200\u00a0mg/dL line \u2014 working with our body to stay in the safe zone!', expression: 'happy', position: 'center' },
    noBackdrop: true,
    blockInteraction: true,
    advanceOn: 'tap',
    blocksResultsReveal: true,
  },
  {
    id: 'L1D1-9',
    pendingUntilResults: true,
    highlight: 'result-next-btn',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'result-next-btn' },
    blockInteraction: false,
    noBackdrop: true,
    advanceOn: 'tap',
  },
];

const L1D2: TutorialStep[] = [
  {
    id: 'L1D2-1',
    bubble: { type: 'dialogue', text: 'This ☀️ is Willpower — spend it to schedule food and actions. Fast food costs less, healthy options cost more.', expression: 'neutral', position: 'center' },
    highlight: 'wp-counter',
    highlightType: 'glow',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L1D2-3',
    bubble: { type: 'dialogue', text: 'Pick your foods wisely! \ud83c\udf6a Cookie has 14g carbs but costs 2 WP. \ud83c\udf4c Banana has 23g carbs but only 1 WP. More carbs = higher glucose spike!', expression: 'thinking' },
    highlight: 'ship-inventory',
    highlightType: 'spotlight',
    advanceOn: 'tap',
  },
  {
    id: 'L1D2-4',
    bubble: { type: 'dialogue', text: 'Place your foods and submit when ready!', expression: 'happy', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

const L1D3: TutorialStep[] = [
  {
    id: 'L1D3-1',
    bubble: { type: 'dialogue', text: 'Day 3! A friend shared a slice of \ud83c\udf55 pizza during your lunch break \u2014 you ate it without thinking twice.', expression: 'neutral' },
    highlight: 'slot:7',
    highlightType: 'spotlight',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L1D3-2',
    bubble: { type: 'warning', text: 'That pizza pushed our glucose above 200\u00a0mg/dL \u2014 the danger zone. It happens. Some days aren\u2019t perfect.', expression: 'concerned', position: 'bottom' },
    highlight: 'danger-zone',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L1D3-3',
    bubble: { type: 'dialogue', text: 'The good news: you can still plan the rest of your day wisely. Try to keep everything else below 200 and limit the damage!', expression: 'happy', position: 'center' },
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L1D3-4',
    bubble: { type: 'dialogue', text: 'Place your meals and submit when ready!', expression: 'neutral', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

// ======= LEVEL 2 — Exercises =======

const L2D1: TutorialStep[] = [
  {
    id: 'L2D1-1',
    bubble: { type: 'dialogue', text: 'Today something important happened to your blood glucose. Tap to see.', expression: 'neutral' },
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L2D1-2',
    bubble: { type: 'warning', text: '\u26a0\ufe0f The \ud83c\udf55 Pizza is already on the graph. Even with your pancreas working, the glucose peak reached 250\u00a0mg/dL \u2014 above the 200 danger level!', expression: 'concerned', position: 'inventory' },
    highlight: 'danger-zone',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L2D1-3',
    bubble: { type: 'dialogue', text: 'Let\u2019s fix that peak! Drag the \ud83d\udeb6 Light Walk into the schedule right after the pizza.', expression: 'thinking', position: 'inventory' },
    highlight: ['intervention:lightwalk', 'slot:3'],
    highlightType: 'pulse',
    cta: { type: 'drag-arrow', source: 'intervention:lightwalk', dest: 'slot:3' },
    advanceOn: 'action',
    expectedAction: { type: 'place-intervention', interventionId: 'lightwalk' },
  },
  {
    id: 'L2D1-5',
    bubble: { type: 'success', text: '\u2728 It worked! The walk brought the peak below 200. Now finish planning the day.', expression: 'happy', position: 'inventory' },
    noBackdrop: true,
    advanceOn: 'tap',
  },
  {
    id: 'L2D1-8',
    highlight: 'submit-btn',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'submit-btn' },
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

const L2D2: TutorialStep[] = [];

const L2D3: TutorialStep[] = [
  {
    id: 'L2D3-3',
    bubble: { type: 'dialogue', text: '\ud83e\uddc1 The Muffin is at the 8:30 AM slot. Drag the Heavy Run right after it to crush the peak!', expression: 'thinking', position: 'inventory' },
    highlight: ['intervention:heavyrun', 'slot:2'],
    highlightType: 'pulse',
    cta: { type: 'drag-arrow', source: 'intervention:heavyrun', dest: 'slot:2' },
    advanceOn: 'action',
    expectedAction: { type: 'place-intervention', interventionId: 'heavyrun' },
  },
  {
    id: 'L2D3-4',
    bubble: { type: 'dialogue', text: 'Place everything and submit!', expression: 'happy', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

// ======= LEVEL 3 — Willpower Management =======

const L3D1: TutorialStep[] = [
  {
    id: 'L3D1-1',
    bubble: { type: 'dialogue', text: 'Only 5 \u2600\ufe0f today. Three foods to place \u2014 but you might not have enough WP for all of them!', expression: 'concerned' },
    highlight: 'wp-counter',
    highlightType: 'glow',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L3D1-2',
    bubble: { type: 'dialogue', text: 'Place your first food on the graph.', expression: 'neutral', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'place-food' },
  },
  {
    id: 'L3D1-3',
    bubble: { type: 'dialogue', text: 'Place one more food.', expression: 'neutral', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'place-food' },
  },
  {
    id: 'L3D1-4',
    bubble: { type: 'warning', text: '1 WP left, but the last food costs 2! \u2615 Take a Break refunds 1 WP.', expression: 'concerned' },
    highlight: 'intervention:takeabreak',
    highlightType: 'pulse',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L3D1-5',
    bubble: { type: 'dialogue', text: 'Drag \u2615 Take a Break to a slot \u2014 you\u2019ll get 1 WP back!', expression: 'happy', position: 'inventory' },
    highlight: 'intervention:takeabreak',
    highlightType: 'pulse',
    cta: { type: 'drag-arrow', source: 'intervention:takeabreak' },
    advanceOn: 'action',
    expectedAction: { type: 'place-intervention', interventionId: 'takeabreak' },
  },
  {
    id: 'L3D1-7',
    bubble: { type: 'dialogue', text: 'Place the last food!', expression: 'neutral', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'place-food' },
  },
  {
    id: 'L3D1-8',
    bubble: { type: 'success', text: 'All foods placed! Now submit.', expression: 'happy', position: 'inventory' },
    highlight: 'submit-btn',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'submit-btn' },
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

const L3D3: TutorialStep[] = [
  {
    id: 'L3D3-1',
    bubble: { type: 'dialogue', text: 'Day 3! When you overeat, you lose Willpower Points the next day.', expression: 'neutral' },
    highlight: 'wp-counter',
    highlightType: 'glow',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L3D3-2',
    bubble: { type: 'dialogue', text: 'New tool: \ud83d\ude34 Take a Rest! It refunds 2 WP but takes 2 slots and 120 minutes. Great for recovering willpower!', expression: 'neutral' },
    highlight: 'intervention-inventory',
    highlightType: 'spotlight',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L3D3-3',
    bubble: { type: 'dialogue', text: 'The burger is pre-placed. Use your tools to manage the spike and submit!', expression: 'happy', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

// ======= LEVEL 4 — Pancreas Boost =======

const L4D1: TutorialStep[] = [
  {
    id: 'L4D1-1',
    bubble: { type: 'warning', text: 'That \ud83e\uddc1 Muffin spiked way above 200 mg/dL! Today you have no exercise \u2014 but there\'s another tool: the Pancreas BOOST!', expression: 'concerned' },
    highlight: 'boost-btn',
    highlightType: 'spotlight',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L4D1-2',
    bubble: { type: 'hint', text: 'BOOST supercharges insulin ONLY above 200 mg/dL \u2014 it cuts 4 cubes per column in the danger zone!', expression: 'thinking' },
    highlight: 'boost-btn',
    highlightType: 'glow',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L4D1-3',
    bubble: { type: 'dialogue', text: 'Tap BOOST ON and watch the spike drop!', expression: 'happy' },
    highlight: 'boost-btn',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'boost-btn' },
    advanceOn: 'action',
    expectedAction: { type: 'toggle-boost' },
  },
  {
    id: 'L4D1-4',
    bubble: { type: 'success', text: 'See that? BOOST crushed the peak above 200! Now place your food and submit.', expression: 'celebrating' },
    highlight: 'graph',
    highlightType: 'glow',
    advanceOn: 'tap',
  },
  {
    id: 'L4D1-5',
    bubble: { type: 'dialogue', text: 'Place your food and submit!', expression: 'neutral', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

const L4D2: TutorialStep[] = [
  {
    id: 'L4D2-1',
    bubble: { type: 'dialogue', text: 'Day 2! The doctor replenished your BOOST \u2014 you have 1 charge again. But remember: it\'s limited. Use it wisely!', expression: 'neutral' },
    highlight: 'boost-btn',
    highlightType: 'glow',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L4D2-2',
    bubble: { type: 'hint', text: 'Today you have a \ud83c\udfc3 Heavy Run! It burns 5 cubes/col for 3 hours \u2014 very powerful. Try using it near the peak BEFORE reaching for BOOST.', expression: 'thinking' },
    highlight: 'intervention-inventory',
    highlightType: 'spotlight',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L4D2-3',
    bubble: { type: 'hint', text: 'Save BOOST for Day 3 if you can \u2014 the peak there is even bigger!', expression: 'thinking' },
    advanceOn: 'tap',
  },
  {
    id: 'L4D2-4',
    bubble: { type: 'dialogue', text: 'Place your run, food, and submit!', expression: 'happy', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

const L4D3: TutorialStep[] = [
  {
    id: 'L4D3-1',
    bubble: { type: 'warning', text: 'Day 3 \u2014 the hardest! Two big pre-placed foods. The combined peak is brutal.', expression: 'concerned' },
    highlight: 'graph',
    highlightType: 'spotlight',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L4D3-2',
    bubble: { type: 'hint', text: 'If you saved your BOOST from yesterday \u2014 now is the time! BOOST + Light Walk is a powerful combo.', expression: 'thinking' },
    highlight: 'boost-btn',
    highlightType: 'glow',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L4D3-3',
    bubble: { type: 'hint', text: 'Even without BOOST, smart walk placement + good food timing goes a long way. With BOOST: you can flatten the spike significantly!', expression: 'thinking' },
    advanceOn: 'tap',
  },
  {
    id: 'L4D3-4',
    bubble: { type: 'dialogue', text: 'Plan your best day and submit!', expression: 'happy', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

// ======= LEVEL 5 — First Medication =======

// ======= LEVEL 6 — Threshold Drain =======

const L6D1: TutorialStep[] = [
  {
    id: 'L6D1-1',
    bubble: { type: 'dialogue', text: 'New medication: \ud83e\uddea SGLT2 Inhibitor! It works differently from Metformin.', expression: 'neutral' },
    highlight: 'medication:sglt2',
    highlightType: 'spotlight',
    cta: { type: 'bounce', target: 'medication:sglt2' },
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L6D1-2',
    bubble: { type: 'dialogue', text: 'SGLT2 removes excess glucose through the kidneys \u2014 but ONLY above 200 mg/dL. See the purple dashed line on the graph? That\'s the threshold.', expression: 'neutral' },
    highlight: 'graph',
    highlightType: 'glow',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L6D1-3',
    bubble: { type: 'dialogue', text: 'It won\'t lower glucose below 200 mg/dL. Think of it as shaving the top of tall peaks.', expression: 'thinking' },
    advanceOn: 'tap',
  },
  {
    id: 'L6D1-4',
    bubble: { type: 'dialogue', text: 'Toggle \ud83e\uddea SGLT2 ON and watch the pizza peak change!', expression: 'neutral' },
    highlight: 'medication:sglt2',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'medication:sglt2' },
    advanceOn: 'action',
    expectedAction: { type: 'toggle-medication', medicationId: 'sglt2' },
  },
  {
    id: 'L6D1-5',
    bubble: { type: 'success', text: 'The peak dropped! SGLT2 flushed out excess glucose above 200 mg/dL.', expression: 'happy', position: 'inventory' },
    highlight: 'graph',
    highlightType: 'glow',
    advanceOn: 'tap',
  },
  {
    id: 'L6D1-6',
    bubble: { type: 'dialogue', text: 'Place your food and walk, then submit.', expression: 'neutral', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

const L6D2: TutorialStep[] = [
  {
    id: 'L6D2-1',
    bubble: { type: 'dialogue', text: 'See the red-tinted columns on the graph? Those are stress slots!', expression: 'neutral' },
    highlight: 'slot:6',
    highlightType: 'spotlight',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L6D2-2',
    bubble: { type: 'warning', text: '\ud83d\ude30 Stress reduces insulin by 2 in those time slots. If the base rate was 2, it drops to 0 \u2014 no insulin at all!', expression: 'concerned' },
    highlight: 'insulin-bars',
    highlightType: 'glow',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L6D2-3',
    bubble: { type: 'dialogue', text: 'Food placed in stress slots will peak much higher and decay much slower. Avoid putting big food there!', expression: 'thinking' },
    advanceOn: 'tap',
  },
  {
    id: 'L6D2-4',
    bubble: { type: 'dialogue', text: 'You have Metformin AND SGLT2 today. Toggle both ON to reduce glucose across the board.', expression: 'neutral' },
    highlight: 'med-toggles',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'med-toggles' },
    advanceOn: 'tap',
  },
  {
    id: 'L6D2-5',
    bubble: { type: 'hint', text: '\ud83d\udca1 Place food in the morning where insulin is strong. Use the walk to cover the oatmeal peak.', expression: 'thinking' },
    advanceOn: 'tap',
  },
  {
    id: 'L6D2-6',
    bubble: { type: 'dialogue', text: 'Plan carefully and submit!', expression: 'neutral', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

// ======= LEVEL 7 — GLP-1 =======

const L7D1: TutorialStep[] = [
  {
    id: 'L7D1-1',
    bubble: { type: 'dialogue', text: 'Welcome to GLP-1 \u2014 the most complex medication! \ud83d\udc89 It has FOUR effects at once.', expression: 'neutral' },
    highlight: 'medication:glp1',
    highlightType: 'spotlight',
    cta: { type: 'bounce', target: 'medication:glp1' },
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L7D1-2',
    bubble: { type: 'dialogue', text: 'Toggle it ON, and I\'ll explain each effect.', expression: 'neutral' },
    highlight: 'medication:glp1',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'medication:glp1' },
    advanceOn: 'action',
    expectedAction: { type: 'toggle-medication', medicationId: 'glp1' },
  },
  {
    id: 'L7D1-3',
    bubble: { type: 'dialogue', text: 'Effect 1: Duration \u00d71.5 \u2014 food takes 50% longer to absorb. The curve gets WIDER and LOWER.', expression: 'neutral', position: 'inventory' },
    highlight: 'graph',
    highlightType: 'glow',
    noBackdrop: true,
    advanceOn: 'tap',
  },
  {
    id: 'L7D1-4',
    bubble: { type: 'dialogue', text: 'Effect 2: Glucose \u00d70.90 \u2014 10% less glucose overall. Smaller peaks!', expression: 'neutral', position: 'inventory' },
    highlight: 'graph',
    highlightType: 'glow',
    noBackdrop: true,
    advanceOn: 'tap',
  },
  {
    id: 'L7D1-5',
    bubble: { type: 'dialogue', text: 'Effect 3: Check the WP counter \u2014 you got +4 \u2600\ufe0f WP bonus! More willpower to work with.', expression: 'neutral' },
    highlight: 'wp-counter',
    highlightType: 'glow',
    advanceOn: 'tap',
  },
  {
    id: 'L7D1-6',
    bubble: { type: 'warning', text: 'Effect 4: Calorie budget reduced by 30%! Check the kcal bar \u2014 the target is smaller now. You need to eat LESS.', expression: 'concerned' },
    highlight: 'kcal-bar',
    highlightType: 'glow',
    advanceOn: 'tap',
  },
  {
    id: 'L7D1-7',
    bubble: { type: 'dialogue', text: 'GLP-1 is a trade-off: better glucose control, but tighter calorie limits. Plan accordingly!', expression: 'thinking' },
    advanceOn: 'tap',
  },
  {
    id: 'L7D1-8',
    bubble: { type: 'dialogue', text: 'Place your food and walk, then submit.', expression: 'neutral', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

const L7D2: TutorialStep[] = [
  {
    id: 'L7D2-1',
    bubble: { type: 'dialogue', text: 'The ultimate medication test! \ud83e\uddc1 Muffin and \ud83c\udf5a Rice \u2014 two massive pre-placed foods. You have all 3 medications.', expression: 'neutral' },
    highlight: 'graph',
    highlightType: 'spotlight',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L7D2-2',
    bubble: { type: 'dialogue', text: 'Toggle all three medications ON. Watch how they stack!', expression: 'neutral' },
    highlight: 'med-toggles',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'med-toggles' },
    advanceOn: 'tap',
  },
  {
    id: 'L7D2-3',
    bubble: { type: 'dialogue', text: 'Metformin \u00d7 GLP-1: glucose is now 72% of original (\u221228%!). SGLT2 drains the remaining peaks above 200.', expression: 'neutral', position: 'inventory' },
    highlight: 'graph',
    highlightType: 'glow',
    noBackdrop: true,
    advanceOn: 'tap',
  },
  {
    id: 'L7D2-4',
    bubble: { type: 'dialogue', text: 'Place your food, walk, and break. Submit when ready!', expression: 'neutral', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

// ======= LEVEL 8 — Final Exam =======

const L8D1: TutorialStep[] = [
  {
    id: 'L8D1-1',
    bubble: { type: 'dialogue', text: 'The Final Exam! Everything you\'ve learned comes together.', expression: 'neutral', position: 'center' },
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L8D1-2',
    bubble: { type: 'dialogue', text: 'Day 1: You have Metformin, 2 walks, a break, and 4 foods. Two meals are pre-placed. Plan your best day!', expression: 'neutral' },
    advanceOn: 'tap',
  },
  {
    id: 'L8D1-3',
    bubble: { type: 'hint', text: '\ud83d\udca1 Remember: big food in the morning (high insulin), walks near peaks, keep kcal in the green zone!', expression: 'thinking' },
    advanceOn: 'tap',
  },
  {
    id: 'L8D1-4',
    bubble: { type: 'dialogue', text: 'Good luck! No more hand-holding \u2014 show me what you\'ve learned!', expression: 'happy', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

const L8D2: TutorialStep[] = [
  {
    id: 'L8D2-1',
    bubble: { type: 'warning', text: 'Day 2 \u2014 under pressure! Stress slots are active, and two massive foods are pre-placed.', expression: 'concerned' },
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L8D2-2',
    bubble: { type: 'dialogue', text: 'Use both Metformin and SGLT2. The Heavy Run covers the muffin. Place food away from stress zones!', expression: 'thinking' },
    advanceOn: 'tap',
  },
  {
    id: 'L8D2-3',
    bubble: { type: 'dialogue', text: 'Go!', expression: 'neutral', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

const L8D3: TutorialStep[] = [
  {
    id: 'L8D3-1',
    bubble: { type: 'dialogue', text: 'The final day! Three massive pre-placed foods. Even with all medications, the peaks are brutal.', expression: 'concerned' },
    highlight: 'graph',
    highlightType: 'spotlight',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L8D3-2',
    bubble: { type: 'dialogue', text: 'See the \ud83e\uddd1\u200d\u2695\ufe0f button in the top-left of the graph? That\'s BOOST \u2014 your secret weapon!', expression: 'neutral' },
    highlight: 'boost-btn',
    highlightType: 'spotlight',
    cta: { type: 'bounce', target: 'boost-btn' },
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L8D3-3',
    bubble: { type: 'dialogue', text: 'BOOST supercharges your insulin, but ONLY above 200 mg/dL. It dramatically increases glucose absorption in the danger zone.', expression: 'neutral' },
    highlight: 'boost-btn',
    highlightType: 'glow',
    advanceOn: 'tap',
  },
  {
    id: 'L8D3-4',
    bubble: { type: 'warning', text: 'You only get ONE BOOST use per level. This is Day 3 \u2014 now is the time to use it!', expression: 'concerned' },
    highlight: 'boost-btn',
    highlightType: 'pulse',
    advanceOn: 'tap',
  },
  {
    id: 'L8D3-5',
    bubble: { type: 'dialogue', text: 'Toggle BOOST ON!', expression: 'neutral' },
    highlight: 'boost-btn',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'boost-btn' },
    advanceOn: 'action',
    expectedAction: { type: 'toggle-boost' },
  },
  {
    id: 'L8D3-6',
    bubble: { type: 'success', text: 'BOOST is absorbing the dangerous peaks above 200 mg/dL! Combined with medications, the curves are much more manageable.', expression: 'happy', position: 'inventory' },
    highlight: 'graph',
    highlightType: 'glow',
    noBackdrop: true,
    advanceOn: 'tap',
  },
  {
    id: 'L8D3-7',
    bubble: { type: 'dialogue', text: 'Toggle all three medications ON. Place your walk and food. Remember: this is the LAST day \u2014 spend ALL your WP!', expression: 'neutral' },
    highlight: 'med-toggles',
    highlightType: 'pulse',
    advanceOn: 'tap',
  },
  {
    id: 'L8D3-8',
    bubble: { type: 'warning', text: 'Last day penalty: every unspent \u2600\ufe0f WP adds 5 penalty points. Use everything!', expression: 'concerned' },
    highlight: 'wp-counter',
    highlightType: 'glow',
    advanceOn: 'tap',
  },
  {
    id: 'L8D3-9',
    bubble: { type: 'dialogue', text: 'Submit your masterpiece!', expression: 'happy' },
    highlight: 'submit-btn',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'submit-btn' },
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
  {
    id: 'L8D3-10',
    bubble: { type: 'success', text: '\ud83c\udf89 CONGRATULATIONS! You\'ve completed the BG Planner Tutorial! You now know every tool for managing blood glucose. Use your knowledge wisely!', expression: 'celebrating', position: 'center' },
    advanceOn: 'tap',
  },
  {
    id: 'L8D3-11',
    bubble: { type: 'dialogue', text: 'Doctor Alice signing off. Remember: plan your meals, stay active, and keep that glucose in the green zone! \ud83d\udc9a', expression: 'happy', position: 'center' },
    advanceOn: 'tap',
  },
];

// ======= LEVEL 5 — Under Stress =======

const L_STRESS_D1: TutorialStep[] = [
  {
    id: 'LS-D1-1',
    bubble: { type: 'dialogue', text: 'Some time slots are under stress, weakening your insulin!', expression: 'concerned' },
    advanceOn: 'tap',
  },
  {
    id: 'LS-D1-2',
    bubble: { type: 'warning', text: 'See the red column? That\'s a stress slot. Insulin rate drops by 1 there — food placed here will spike higher and decay slower!', expression: 'concerned' },
    highlight: 'stress-slots',
    highlightType: 'spotlight',
    advanceOn: 'tap',
  },
  {
    id: 'LS-D1-3',
    bubble: { type: 'dialogue', text: 'Normally insulin absorbs 2 cubes per column. In the stress zone it only absorbs 1 — glucose stays higher for longer.', expression: 'thinking' },
    highlight: 'insulin-bars',
    highlightType: 'glow',
    advanceOn: 'tap',
  },
  {
    id: 'LS-D1-4',
    bubble: { type: 'dialogue', text: 'The pizza is already placed. Your job: put banana and cookie OUTSIDE the red zone.', expression: 'neutral' },
    highlight: 'stress-slots',
    highlightType: 'pulse',
    advanceOn: 'tap',
  },
  {
    id: 'LS-D1-5',
    bubble: { type: 'dialogue', text: 'Drag your foods to safe slots — any slot without a red tint works.', expression: 'happy' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'tap',
  },
  {
    id: 'LS-D1-6',
    advanceOn: 'action',
    expectedAction: { type: 'place-food' },
  },
  {
    id: 'LS-D1-6b',
    advanceOn: 'action',
    expectedAction: { type: 'place-food' },
  },
  {
    id: 'LS-D1-7',
    bubble: { type: 'dialogue', text: 'Nice! Submit when you\'re ready to see how it went.', expression: 'happy' },
    highlight: 'submit-btn',
    highlightType: 'pulse',
    advanceOn: 'tap',
  },
];

const L_STRESS_D2: TutorialStep[] = [
  {
    id: 'LS-D2-1',
    bubble: { type: 'dialogue', text: 'Now there are THREE stress zones. Plan food placement carefully!', expression: 'concerned' },
    advanceOn: 'tap',
  },
  {
    id: 'LS-D2-2',
    bubble: { type: 'warning', text: 'These red zones weaken your insulin — try to place food outside them!', expression: 'concerned' },
    highlight: 'stress-slots',
    advanceOn: 'tap',
  },
  {
    id: 'LS-D2-3',
    bubble: { type: 'dialogue', text: 'You have a rest and a walk today. Rest recovers WP — walk fights any stray glucose spikes.', expression: 'neutral' },
    highlight: 'intervention-inventory',
    highlightType: 'glow',
    advanceOn: 'tap',
  },
  {
    id: 'LS-D2-4',
    bubble: { type: 'dialogue', text: 'If you must place something in a stress zone, use the walk to compensate!', expression: 'thinking' },
    advanceOn: 'tap',
  },
  {
    id: 'LS-D2-5',
    bubble: { type: 'dialogue', text: 'Good luck — 2\u2605 is achievable if you avoid the red zones.', expression: 'happy' },
    advanceOn: 'tap',
  },
];

// ======= LEVEL 2 — Energy Balance (kcal tutorial) =======

const L_KCAL_D1: TutorialStep[] = [
  {
    id: 'LK-D1-1',
    bubble: { type: 'dialogue', text: 'Did you know your body needs energy to work? We measure that energy in calories \u2014 kcal!', expression: 'happy', position: 'center' },
    advanceOn: 'tap',
    blockInteraction: true,
    revealKcal: true,
  },
  {
    id: 'LK-D1-2',
    bubble: { type: 'dialogue', text: 'See the kcal on each card? Now look at the bar below the graph \u2014 it tracks how much you\u2019ve eaten today.', expression: 'neutral', position: 'center' },
    highlight: 'kcal-bar',
    highlightType: 'glow',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'LK-D1-3',
    bubble: { type: 'hint', text: 'This is the optimal calories zone \u2014 staying in it means just the right amount of energy for your body. Aim to fill it up!', expression: 'happy', position: 'center' },
    highlight: 'kcal-green-zone',
    highlightType: 'pulse-green',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'LK-D1-4',
    bubble: { type: 'dialogue', text: 'Place your meals to reach the green zone, then submit!', expression: 'happy', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
  {
    id: 'LK-D1-5',
    bubble: { type: 'success', text: 'Perfect! Your body has enough energy to stay healthy today. Balance is key!', expression: 'celebrating', position: 'center' },
    noBackdrop: true,
    blockInteraction: true,
    advanceOn: 'tap',
    blocksResultsReveal: true,
  },
  {
    id: 'LK-D1-6',
    pendingUntilResults: true,
    highlight: 'result-next-btn',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'result-next-btn' },
    noBackdrop: true,
    advanceOn: 'tap',
  },
];

const L_KCAL_D2: TutorialStep[] = [
  {
    id: 'LK-D2-1',
    bubble: { type: 'warning', text: 'Overeating puts excessive strain on the pancreas, accelerating disease progression. Notice the calorie bar.', expression: 'concerned', position: 'inventory' },
    highlight: 'kcal-bar',
    highlightType: 'pulse',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'LK-D2-2',
    bubble: { type: 'dialogue', text: 'In this game, overeating means your pancreas starts the next day with reduced effectiveness.', expression: 'concerned', position: 'inventory' },
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'LK-D2-3',
    bubble: { type: 'hint', text: "Let\u2019s replan this day better!", expression: 'thinking', position: 'inventory' },
    clearPreplaced: true,
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'LK-D2-4',
    bubble: { type: 'hint', text: "Aim for the green zone \u2014 that\u2019s your optimal calorie target!", expression: 'thinking', position: 'inventory' },
    highlight: 'kcal-bar',
    highlightType: 'pulse',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'LK-D2-5',
    bubble: { type: 'dialogue', text: 'Each food card shows its calorie content \u2014 use this to plan your intake.', expression: 'happy', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    kcalBlink: true,
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'LK-D2-6',
    bubble: { type: 'dialogue', text: 'Place your meals to reach the optimal zone, then submit.', expression: 'happy', position: 'inventory' },
    requiresOptimalSubmit: true,
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
  {
    id: 'LK-D2-8',
    pendingUntilResults: true,
    highlight: 'result-next-btn',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'result-next-btn' },
    noBackdrop: true,
    advanceOn: 'tap',
  },
];

// ======= STEP LOOKUP =======

const TUTORIAL_STEPS: Record<string, Record<number, TutorialStep[]>> = {
  'tutorial-01': { 1: L1D1, 2: L1D2, 3: L1D3 },
  'tutorial-02': { 1: L_KCAL_D1, 2: L_KCAL_D2 },
  'tutorial-03': { 1: L2D1, 2: L2D3, 3: L2D2 },
  'tutorial-04': { 1: L_PF_D1, 2: L_PF_D2 },            // Pancreas Fatigue (NEW)
  'tutorial-05': { 1: L3D1, 2: L3D3 },                   // Willpower Management (← old T4)
  'tutorial-06': { 1: L4D1, 2: L4D2, 3: L4D3 },         // Pancreas Boost (← old T5)
  'tutorial-07': { 1: L_STRESS_D1, 2: L_STRESS_D2, 3: [] }, // Under Stress (← old T6)
  'tutorial-08': { 1: L6D1, 2: L6D2 },
  'tutorial-09': { 1: L7D1, 2: L7D2 },
  'tutorial-10': { 1: L8D1, 2: L8D2, 3: L8D3 },
};

export function getTutorialSteps(levelId: string | null, day: number): TutorialStep[] | null {
  if (!levelId) return null;
  const level = TUTORIAL_STEPS[levelId];
  if (!level) return null;
  return level[day] ?? null;
}
