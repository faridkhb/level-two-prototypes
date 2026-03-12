// Tutorial step data for all 8 levels, 20 days
// Each step defines a bubble message, highlight target, CTA, and advance condition

export type BubbleType = 'dialogue' | 'hint' | 'warning' | 'success';
export type Expression = 'neutral' | 'happy' | 'concerned' | 'thinking' | 'celebrating';
export type HighlightType = 'spotlight' | 'pulse' | 'glow' | 'arrow';
export type CTAType = 'drag-arrow' | 'tap-pulse' | 'glow-border' | 'bounce';
export type AdvanceOn = 'tap' | 'action' | 'auto';

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
  type: 'place-food' | 'place-intervention' | 'toggle-medication' | 'toggle-boost' | 'click-submit' | 'switch-tab';
  foodId?: string;
  slotIndex?: number;
  interventionId?: string;
  medicationId?: string;
  tabName?: string;
}

export interface TutorialStep {
  id: string;
  bubble?: TutorialBubble;
  highlight?: string | string[];
  highlightType?: HighlightType;
  noBackdrop?: boolean;
  lockedTab?: string;
  cta?: TutorialCTA;
  advanceOn: AdvanceOn;
  blockInteraction?: boolean;
  expectedAction?: ExpectedAction;
}

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
    bubble: { type: 'dialogue', text: 'This is the BG Graph. The Y-axis shows blood glucose levels. Up to 200 is safe, higher blood glucose levels are harmful.', expression: 'neutral' },
    highlight: 'graph',
    highlightType: 'spotlight',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L1D1-3',
    bubble: { type: 'dialogue', text: 'When you eat, carbs raise your blood glucose. More carbs = higher peak. Each food card shows its absorption speed \u2014 Fast foods spike quickly, Slow foods rise gradually.', expression: 'neutral' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L1D1-4',
    bubble: { type: 'dialogue', text: 'Drag the \ud83c\udf4c Banana onto the graph! Place it in the 10:00 AM slot.', expression: 'happy' },
    highlight: ['food:banana', 'slot:2'],
    highlightType: 'glow',
    cta: { type: 'drag-arrow', source: 'food:banana', dest: 'slot:2' },
    advanceOn: 'action',
    expectedAction: { type: 'place-food', foodId: 'banana', slotIndex: 2 },
  },
  {
    id: 'L1D1-5',
    bubble: { type: 'success', text: 'Great! See the glucose curve? The banana\'s carbs raised your blood glucose. It rises during absorption, then insulin brings it back down.', expression: 'happy', position: 'inventory' },
    highlight: 'graph',
    highlightType: 'glow',
    advanceOn: 'tap',
  },
  {
    id: 'L1D1-6',
    bubble: { type: 'dialogue', text: 'Now hit Submit to see your results!', expression: 'neutral' },
    highlight: 'submit-btn',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'submit-btn' },
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
  {
    id: 'L1D1-7',
    bubble: { type: 'success', text: 'The reveal shows how your food, insulin, and exercise interact. Check your star rating!', expression: 'celebrating' },
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
    id: 'L1D2-2',
    bubble: { type: 'dialogue', text: 'The kcal bar shows how much you\'ve eaten. Stay in the green zone \u2014 not too little, not too much!', expression: 'neutral', position: 'center' },
    highlight: 'kcal-bar',
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
    bubble: { type: 'dialogue', text: 'Day 3! Notice the \ud83c\udf7f Popcorn is already on the graph. That\'s a pre-placed food \u2014 you can\'t remove it.', expression: 'neutral' },
    highlight: 'slot:3',
    highlightType: 'spotlight',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L1D3-2',
    bubble: { type: 'warning', text: 'Pre-placed foods are part of the puzzle. You must plan around them!', expression: 'concerned' },
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L1D3-4',
    bubble: { type: 'dialogue', text: 'Place your food and submit!', expression: 'happy', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

// ======= LEVEL 2 — Keep Moving =======

const L2D1: TutorialStep[] = [
  {
    id: 'L2D1-1',
    bubble: { type: 'dialogue', text: 'Today something important happened to your blood glucose. Tap to see.', expression: 'neutral' },
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L2D1-2',
    bubble: { type: 'warning', text: '\u26a0\ufe0f The \ud83c\udf5a Bowl of Rice was already eaten \u2014 its peak reached 380\u00a0mg/dL, well above the 200 danger threshold! Exercises can help lower the spike!', expression: 'concerned', position: 'inventory' },
    highlight: 'slot:2',
    highlightType: 'spotlight',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L2D1-3',
    bubble: { type: 'dialogue', text: 'Open the Actions tab to see your exercise options!', expression: 'neutral' },
    highlight: 'tab-actions',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'tab-actions' },
    advanceOn: 'action',
    expectedAction: { type: 'switch-tab', tabName: 'actions' },
  },
  {
    id: 'L2D1-4',
    bubble: { type: 'dialogue', text: 'The \ud83d\udeb6 Light Walk burns glucose from the top. Drag it next to the rice peak!', expression: 'thinking', position: 'inventory' },
    highlight: ['intervention:lightwalk', 'slot:3'],
    highlightType: 'pulse',
    lockedTab: 'actions',
    cta: { type: 'drag-arrow', source: 'intervention:lightwalk', dest: 'slot:3' },
    advanceOn: 'action',
    expectedAction: { type: 'place-intervention', interventionId: 'lightwalk' },
  },
  {
    id: 'L2D1-5',
    bubble: { type: 'success', text: '\u2728 See the green preview? That shows exactly how much glucose the walk will burn!', expression: 'happy', position: 'inventory' },
    highlight: 'graph',
    highlightType: 'glow',
    noBackdrop: true,
    lockedTab: 'food',
    advanceOn: 'tap',
  },
  {
    id: 'L2D1-6',
    bubble: { type: 'dialogue', text: 'Great! Now switch to the Food tab to place your Chicken Meal!', expression: 'neutral', position: 'inventory' },
    highlight: 'tab-food',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'tab-food' },
    advanceOn: 'action',
    expectedAction: { type: 'switch-tab', tabName: 'food' },
  },
  {
    id: 'L2D1-7',
    bubble: { type: 'dialogue', text: 'Drag the \ud83c\udf57 Chicken Meal onto the graph, then hit Submit!', expression: 'neutral', position: 'inventory' },
    highlight: 'food:chicken',
    highlightType: 'pulse',
    cta: { type: 'drag-arrow', source: 'food:chicken' },
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

const L2D2: TutorialStep[] = [
  {
    id: 'L2D2-1',
    bubble: { type: 'dialogue', text: 'See the \ud83d\udd12 locked slots? You can only place items in unlocked slots. Plan your placements carefully!', expression: 'neutral' },
    highlight: 'locked-slots',
    highlightType: 'pulse',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L2D2-2',
    bubble: { type: 'dialogue', text: 'The \ud83c\udf55 Pizza is pre-placed at slot 4. Use the walk to cover its peak!', expression: 'thinking' },
    highlight: 'slot:4',
    highlightType: 'spotlight',
    noBackdrop: true,
    advanceOn: 'tap',
  },
  {
    id: 'L2D2-3',
    bubble: { type: 'dialogue', text: 'Place everything and submit!', expression: 'happy', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

const L2D3: TutorialStep[] = [
  {
    id: 'L2D3-1',
    bubble: { type: 'dialogue', text: 'Open the Actions tab to find your Heavy Run!', expression: 'neutral' },
    highlight: 'tab-actions',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'tab-actions' },
    advanceOn: 'action',
    expectedAction: { type: 'switch-tab', tabName: 'actions' },
  },
  {
    id: 'L2D3-2',
    bubble: { type: 'dialogue', text: 'New: \ud83c\udfc3 Heavy Run! It reduces glucose much more than a walk \u2014 deeper and over a longer period (3 hours). But it costs 4 WP and takes 2 slots!', expression: 'neutral' },
    highlight: 'intervention:heavyrun',
    highlightType: 'spotlight',
    noBackdrop: true,
    lockedTab: 'actions',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L2D3-3',
    bubble: { type: 'dialogue', text: '\ud83e\uddc1 The Muffin is at slot 1. Drag the Heavy Run right after it to crush the peak!', expression: 'thinking', position: 'inventory' },
    highlight: ['intervention:heavyrun', 'slot:2'],
    highlightType: 'pulse',
    lockedTab: 'actions',
    cta: { type: 'drag-arrow', source: 'intervention:heavyrun', dest: 'slot:2' },
    advanceOn: 'action',
    expectedAction: { type: 'place-intervention', interventionId: 'heavyrun' },
  },
  {
    id: 'L2D3-4',
    bubble: { type: 'dialogue', text: 'Place everything and submit!', expression: 'happy', position: 'inventory' },
    highlight: 'tab-food',
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
    highlight: 'tab-food',
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
    bubble: { type: 'warning', text: '1 WP left, but the last food costs 2! Open the Actions tab \u2014 Take a Break refunds 1 WP.', expression: 'concerned' },
    highlight: 'tab-actions',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'tab-actions' },
    advanceOn: 'action',
    expectedAction: { type: 'switch-tab', tabName: 'actions' },
  },
  {
    id: 'L3D1-5',
    bubble: { type: 'dialogue', text: 'Drag \u2615 Take a Break to a slot \u2014 you\u2019ll get 1 WP back!', expression: 'happy', position: 'inventory' },
    highlight: 'intervention:takeabreak',
    highlightType: 'pulse',
    lockedTab: 'actions',
    cta: { type: 'drag-arrow', source: 'intervention:takeabreak' },
    advanceOn: 'action',
    expectedAction: { type: 'place-intervention', interventionId: 'takeabreak' },
  },
  {
    id: 'L3D1-6',
    bubble: { type: 'success', text: 'You now have 2 WP! Switch back to Food tab.', expression: 'happy' },
    highlight: 'tab-food',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'tab-food' },
    advanceOn: 'action',
    expectedAction: { type: 'switch-tab', tabName: 'food' },
  },
  {
    id: 'L3D1-7',
    bubble: { type: 'dialogue', text: 'Place the last food!', expression: 'neutral', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    lockedTab: 'food',
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

const L3D2: TutorialStep[] = [
  {
    id: 'L3D2-1',
    bubble: { type: 'dialogue', text: 'Watch the kcal bar today! The budget is 1400 kcal \u2014 looks comfortable, but the \ud83c\udf54 Burger and \ud83e\uddc1 Muffin together can easily push you over!', expression: 'concerned' },
    highlight: 'kcal-bar',
    highlightType: 'glow',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L3D2-2',
    bubble: { type: 'warning', text: 'Overeating (>120% kcal) penalizes the next day: \u22121 WP, +100 kcal budget, and a free \ud83c\udf66 Ice Cream appears!', expression: 'concerned' },
    highlight: 'kcal-bar',
    highlightType: 'glow',
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L3D2-3',
    bubble: { type: 'dialogue', text: 'Think twice before piling everything in! Can you stay in the green zone?', expression: 'thinking', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

const L3D3: TutorialStep[] = [
  {
    id: 'L3D3-1',
    bubble: { type: 'dialogue', text: 'Day 3! If you overate yesterday, you\'ll see penalties: less WP, higher kcal budget, and free Ice Cream in your inventory.', expression: 'neutral' },
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
    bubble: { type: 'hint', text: 'Even without BOOST, smart walk placement + good food timing can earn 2 stars. With BOOST: 3 stars are possible!', expression: 'thinking' },
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

const L5D1: TutorialStep[] = [
  {
    id: 'L5D1-1',
    bubble: { type: 'dialogue', text: 'See the purple panel below the graph? That\'s the medication area.', expression: 'neutral' },
    highlight: 'med-toggles',
    highlightType: 'spotlight',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L5D1-2',
    bubble: { type: 'dialogue', text: '\ud83d\udc8a Metformin reduces ALL food glucose by 20%. It costs no WP \u2014 it\'s a free toggle.', expression: 'neutral' },
    highlight: 'medication:metformin',
    highlightType: 'glow',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L5D1-3',
    bubble: { type: 'dialogue', text: 'The muffin has 44g of carbs \u2014 a massive glucose spike! Toggle Metformin ON and watch what happens!', expression: 'neutral' },
    highlight: 'medication:metformin',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'medication:metformin' },
    advanceOn: 'action',
    expectedAction: { type: 'toggle-medication', medicationId: 'metformin' },
  },
  {
    id: 'L5D1-4',
    bubble: { type: 'success', text: 'The glucose peak dropped by 20%! That\'s a big reduction in the danger zone. Metformin reduces glucose from ALL foods.', expression: 'happy', position: 'inventory' },
    highlight: 'graph',
    highlightType: 'glow',
    advanceOn: 'tap',
  },
  {
    id: 'L5D1-5',
    bubble: { type: 'dialogue', text: 'Place your foods and submit.', expression: 'neutral', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

const L5D2: TutorialStep[] = [
  {
    id: 'L5D2-1',
    bubble: { type: 'dialogue', text: 'Two big pre-placed foods today! You\'ll need everything: Metformin AND exercise.', expression: 'neutral' },
    highlight: 'graph',
    highlightType: 'spotlight',
    noBackdrop: true,
    advanceOn: 'tap',
    blockInteraction: true,
  },
  {
    id: 'L5D2-2',
    bubble: { type: 'dialogue', text: 'Toggle Metformin ON first \u2014 it reduces both peaks by 20%.', expression: 'neutral' },
    highlight: 'medication:metformin',
    highlightType: 'pulse',
    cta: { type: 'tap-pulse', target: 'medication:metformin' },
    advanceOn: 'tap',
  },
  {
    id: 'L5D2-3',
    bubble: { type: 'dialogue', text: 'Place a \ud83d\udeb6 Walk near each peak. Fill in your food and submit!', expression: 'neutral', position: 'inventory' },
    highlight: 'ship-inventory',
    highlightType: 'glow',
    advanceOn: 'action',
    expectedAction: { type: 'click-submit' },
  },
];

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
    bubble: { type: 'dialogue', text: 'The muffin is already placed. Your job: put banana and cookie OUTSIDE the red zone.', expression: 'neutral' },
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
    bubble: { type: 'dialogue', text: 'Now there are TWO stress zones. Plan food placement carefully!', expression: 'concerned' },
    advanceOn: 'tap',
  },
  {
    id: 'LS-D2-2',
    bubble: { type: 'warning', text: 'Three red zones from noon to 3 PM. Try to place food before or after them.', expression: 'concerned' },
    highlight: 'stress-slots',
    highlightType: 'spotlight',
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
    highlight: 'submit-btn',
    highlightType: 'pulse',
    advanceOn: 'tap',
  },
];

// ======= STEP LOOKUP =======

const TUTORIAL_STEPS: Record<string, Record<number, TutorialStep[]>> = {
  'tutorial-01': { 1: L1D1, 2: L1D2, 3: L1D3 },
  'tutorial-02': { 1: L2D1, 2: L2D2, 3: L2D3 },
  'tutorial-03': { 1: L3D1, 2: L3D2, 3: L3D3 },
  'tutorial-04': { 1: L4D1, 2: L4D2, 3: L4D3 },
  'tutorial-05': { 1: L_STRESS_D1, 2: L_STRESS_D2, 3: [] },
  'tutorial-06': { 1: L5D1, 2: L5D2 },
  'tutorial-07': { 1: L6D1, 2: L6D2 },
  'tutorial-08': { 1: L7D1, 2: L7D2 },
  'tutorial-09': { 1: L8D1, 2: L8D2, 3: L8D3 },
};

export function getTutorialSteps(levelId: string | null, day: number): TutorialStep[] | null {
  if (!levelId) return null;
  const level = TUTORIAL_STEPS[levelId];
  if (!level) return null;
  return level[day] ?? null;
}
