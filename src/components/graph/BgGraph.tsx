import { useMemo, useCallback, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Ship, PlacedFood, PlacedIntervention, Intervention, GameSettings, MedicationModifiers } from '../../core/types';
import {
  TOTAL_COLUMNS,
  TOTAL_ROWS,
  DEFAULT_X_TICKS,
  DEFAULT_Y_TICKS,
  DEFAULT_MEDICATION_MODIFIERS,
  PENALTY_ORANGE_ROW,
  PENALTY_RED_ROW,
  GRAPH_CONFIG,
  columnToTimeString,
  formatBgValue,
} from '../../core/types';
import { calculateCurve, calculateInterventionCurve, calculateInterventionReduction, applyMedicationToFood, calculateSglt2Reduction } from '../../core/cubeEngine';
import './BgGraph.css';

// SVG layout constants
const CELL_SIZE = 18;
const PAD_LEFT = 55;
const PAD_TOP = 12;
const PAD_RIGHT = 12;
const PAD_BOTTOM = 28;

const GRAPH_W = TOTAL_COLUMNS * CELL_SIZE;
const GRAPH_H = TOTAL_ROWS * CELL_SIZE;
const SVG_W = PAD_LEFT + GRAPH_W + PAD_RIGHT;
const SVG_H = PAD_TOP + GRAPH_H + PAD_BOTTOM;

// BG zone thresholds (mg/dL)
const ZONE_NORMAL = 140;
const ZONE_ELEVATED = 200;
const ZONE_HIGH = 300;

// Fixed blue palette: each food gets a progressively darker shade
const FOOD_PALETTE = [
  '#7dd3fc', // sky-300 — light blue (голубой)
  '#38bdf8', // sky-400
  '#0ea5e9', // sky-500
  '#0284c7', // sky-600
  '#0369a1', // sky-700
  '#075985', // sky-800
  '#0c4a6e', // sky-900 — dark navy
];

function getFoodColor(index: number): string {
  return FOOD_PALETTE[Math.min(index, FOOD_PALETTE.length - 1)];
}

const PREVIEW_COLOR = 'rgba(99, 179, 237, 0.4)';
const PREVIEW_PANCREAS_COLOR = 'rgba(246, 153, 63, 0.35)';

// Zone clip bands for skyline coloring (rendered bottom→top, higher zones paint on top)
const ZONE_CLIP_BANDS = [
  { id: 'zone-clip-green', color: '#48bb78', yTop: PAD_TOP + GRAPH_H - 4 * CELL_SIZE - 3, yBot: PAD_TOP + GRAPH_H + 3 },
  { id: 'zone-clip-yellow', color: '#ecc94b', yTop: PAD_TOP + GRAPH_H - 7 * CELL_SIZE - 3, yBot: PAD_TOP + GRAPH_H - 4 * CELL_SIZE + 3 },
  { id: 'zone-clip-orange', color: '#ed8936', yTop: PAD_TOP + GRAPH_H - 12 * CELL_SIZE - 3, yBot: PAD_TOP + GRAPH_H - 7 * CELL_SIZE + 3 },
  { id: 'zone-clip-red', color: '#fc8181', yTop: PAD_TOP - 3, yBot: PAD_TOP + GRAPH_H - 12 * CELL_SIZE + 3 },
];

// Unified render data types
type CubeStatus = 'normal' | 'burned' | 'pancreas';

interface FoodRenderCube {
  col: number;
  row: number;
  status: CubeStatus;
}

interface FoodColumnSummary {
  col: number;
  baseRow: number;
  totalCount: number;
  topNormalRow: number;
  skylineRow: number; // top of this food's alive cubes (clamped by aliveCaps)
}

interface FoodMarkerInfo {
  peakCenterX: number;
  tailRow: number;
}

interface FoodRenderLayer {
  placementId: string;
  shipId: string;
  dropColumn: number;
  color: string;
  emoji: string;
  cubes: FoodRenderCube[];
  colSummary: FoodColumnSummary[];
  marker: FoodMarkerInfo | null;
  skylinePath: string | null;
}

interface GraphRenderData {
  layers: FoodRenderLayer[];
  mainSkylinePath: string;
  columnCaps: number[];
  totalHeights: number[];
  aliveCaps: number[];
}

interface BgGraphProps {
  placedFoods: PlacedFood[];
  allShips: Ship[];
  placedInterventions: PlacedIntervention[];
  allInterventions: Intervention[];
  settings: GameSettings;
  pancreasRate: number;
  medicationModifiers?: MedicationModifiers;
  previewShip?: Ship | null;
  previewIntervention?: Intervention | null;
  previewColumn?: number | null;
  showPenaltyHighlight?: boolean;
  interactive?: boolean;
  onFoodClick?: (placementId: string) => void;
  onFoodMove?: (placementId: string, newColumn: number) => void;
  onInterventionClick?: (placementId: string) => void;
}

// Convert row (0 = bottom = bgMin) to SVG y
function rowToY(row: number): number {
  return PAD_TOP + GRAPH_H - (row + 1) * CELL_SIZE;
}

// Convert column to SVG x
function colToX(col: number): number {
  return PAD_LEFT + col * CELL_SIZE;
}

// Convert mg/dL to row index
function mgdlToRow(mgdl: number): number {
  return (mgdl - GRAPH_CONFIG.bgMin) / GRAPH_CONFIG.cellHeightMgDl;
}

export function BgGraph({
  placedFoods,
  allShips,
  placedInterventions,
  allInterventions,
  settings,
  pancreasRate,
  medicationModifiers = DEFAULT_MEDICATION_MODIFIERS,
  previewShip,
  previewIntervention,
  previewColumn,
  showPenaltyHighlight = false,
  interactive = true,
  onFoodClick,
  onFoodMove,
  onInterventionClick,
}: BgGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const markerDragRef = useRef<{ placementId: string; lastCol: number } | null>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: 'bg-graph',
  });

  // Calculate intervention reduction per column (in cubes)
  const interventionReduction = useMemo(
    () => calculateInterventionReduction(placedInterventions, allInterventions),
    [placedInterventions, allInterventions]
  );

  // Unified graph render data: single source of truth for all visual elements.
  // Every cube is pre-stamped with status (normal/burned/pancreas), markers and
  // skylines are derived from the SAME data that stamps cubes — no desync possible.
  const graphRenderData = useMemo((): GraphRenderData => {
    // Phase 1: Stack all foods using plateau curves (no decay).
    const totalHeights = new Array(TOTAL_COLUMNS).fill(0);
    const rawFoods: Array<{
      placementId: string;
      shipId: string;
      dropColumn: number;
      color: string;
      emoji: string;
      columns: Array<{ col: number; baseRow: number; count: number }>;
    }> = [];

    for (const placed of placedFoods) {
      const ship = allShips.find(s => s.id === placed.shipId);
      if (!ship) continue;
      const { glucose, duration } = applyMedicationToFood(ship.load, ship.duration, medicationModifiers);

      const curve = calculateCurve(glucose, duration, placed.dropColumn, 0);

      const cols: Array<{ col: number; baseRow: number; count: number }> = [];
      for (const cc of curve) {
        const graphCol = placed.dropColumn + cc.columnOffset;
        if (graphCol >= 0 && graphCol < TOTAL_COLUMNS) {
          cols.push({
            col: graphCol,
            baseRow: totalHeights[graphCol],
            count: cc.cubeCount,
          });
          totalHeights[graphCol] += cc.cubeCount;
        }
      }

      rawFoods.push({
        placementId: placed.id,
        shipId: placed.shipId,
        dropColumn: placed.dropColumn,
        color: '',
        emoji: ship.emoji,
        columns: cols,
      });
    }

    // Assign progressive blue colors
    for (let i = 0; i < rawFoods.length; i++) {
      rawFoods[i].color = getFoodColor(i);
    }

    // Phase 2: Pancreas — accumulating reduction from top.
    // Reduction grows with time elapsed since first food column.
    let firstFoodCol = TOTAL_COLUMNS;
    for (let col = 0; col < TOTAL_COLUMNS; col++) {
      if (totalHeights[col] > 0) { firstFoodCol = col; break; }
    }
    const aliveCaps = totalHeights.map((h, col) => {
      if (h <= 0 || pancreasRate <= 0) return h;
      const elapsed = Math.max(0, col - firstFoodCol);
      const reduction = Math.round(pancreasRate * elapsed);
      return Math.max(0, h - reduction);
    });

    // Phase 3: ColumnCaps (aliveCaps − interventions − SGLT2)
    const sglt2 = medicationModifiers.sglt2;
    const sglt2Reduction = sglt2
      ? calculateSglt2Reduction(aliveCaps, sglt2.depth, sglt2.floorRow)
      : new Array(TOTAL_COLUMNS).fill(0);
    const columnCaps = aliveCaps.map((h, i) =>
      Math.max(0, h - interventionReduction[i] - sglt2Reduction[i])
    );

    // Phase 4: Per-food layers — stamp cubes, compute markers and skylines
    // Cube status determined by absolute row vs global thresholds:
    //   row < columnCap → normal | row < aliveCap → burned | row >= aliveCap → pancreas
    const hasMultipleFoods = rawFoods.length >= 2;
    const bottomY = PAD_TOP + GRAPH_H;
    const layers: FoodRenderLayer[] = rawFoods.map((food) => {
      const cubes: FoodRenderCube[] = [];
      const colSummary: FoodColumnSummary[] = [];

      for (const c of food.columns) {
        let topNormalRow = c.baseRow;

        for (let cubeIdx = 0; cubeIdx < c.count; cubeIdx++) {
          const row = c.baseRow + cubeIdx;
          if (row >= TOTAL_ROWS) break;

          let status: CubeStatus;
          if (row >= aliveCaps[c.col]) {
            status = 'pancreas';
          } else if (row >= columnCaps[c.col]) {
            status = 'burned';
          } else {
            status = 'normal';
            topNormalRow = row + 1;
          }
          cubes.push({ col: c.col, row, status });
        }

        // Skyline: top of this food's alive cubes (clamped by aliveCaps)
        const topOfFood = Math.min(c.baseRow + c.count, aliveCaps[c.col]);
        const skylineRow = Math.max(c.baseRow, topOfFood);

        colSummary.push({
          col: c.col,
          baseRow: c.baseRow,
          totalCount: c.count,
          topNormalRow,
          skylineRow,
        });
      }

      // Marker: centered on food's own alive peak
      let maxSkyline = 0;
      for (const cs of colSummary) {
        if (cs.skylineRow > maxSkyline) maxSkyline = cs.skylineRow;
      }
      const peakCols: number[] = [];
      for (const cs of colSummary) {
        if (cs.skylineRow === maxSkyline && maxSkyline > cs.baseRow) {
          peakCols.push(cs.col);
        }
      }

      let marker: FoodMarkerInfo | null = null;
      if (peakCols.length > 0) {
        const peakCenterX = PAD_LEFT +
          ((peakCols[0] + peakCols[peakCols.length - 1]) / 2 + 0.5) * CELL_SIZE;
        marker = { peakCenterX, tailRow: maxSkyline };
      }

      // Skyline path: trace boundary between this food's alive zone and the next
      // Vertical edges stop at the food's own baseRow (not graph bottom)
      // so skylines don't cross through lower foods' zones
      let skylinePath: string | null = null;
      if (hasMultipleFoods) {
        const parts: string[] = [];
        let inSeg = false;
        let prevCol = -2;
        let lastBaseY = bottomY;
        for (const cs of colSummary) {
          const baseY = PAD_TOP + GRAPH_H - cs.baseRow * CELL_SIZE;
          if (cs.skylineRow <= cs.baseRow) {
            if (inSeg) { parts.push(`V ${lastBaseY}`); inSeg = false; }
            prevCol = cs.col;
            continue;
          }
          const y = PAD_TOP + GRAPH_H - cs.skylineRow * CELL_SIZE;
          const x = colToX(cs.col);
          if (!inSeg || cs.col !== prevCol + 1) {
            if (inSeg) parts.push(`V ${lastBaseY}`);
            parts.push(`M ${x} ${baseY}`);
            parts.push(`V ${y}`);
            inSeg = true;
          } else {
            parts.push(`V ${y}`);
          }
          parts.push(`H ${x + CELL_SIZE}`);
          lastBaseY = baseY;
          prevCol = cs.col;
        }
        if (inSeg) parts.push(`V ${lastBaseY}`);
        if (parts.length > 0) {
          skylinePath = parts.join(' ');
        }
      }

      return {
        placementId: food.placementId,
        shipId: food.shipId,
        dropColumn: food.dropColumn,
        color: food.color,
        emoji: food.emoji,
        cubes,
        colSummary,
        marker,
        skylinePath,
      };
    });

    // Phase 5: Main skyline path from columnCaps
    const mainParts: string[] = [];
    let inSegment = false;
    for (let col = 0; col < TOTAL_COLUMNS; col++) {
      const h = columnCaps[col];
      if (h <= 0) {
        if (inSegment) { mainParts.push(`V ${bottomY}`); inSegment = false; }
        continue;
      }
      const y = PAD_TOP + GRAPH_H - h * CELL_SIZE;
      if (!inSegment) {
        mainParts.push(`M ${colToX(col)} ${bottomY}`);
        mainParts.push(`V ${y}`);
        inSegment = true;
      } else {
        const prevH = columnCaps[col - 1];
        if (prevH !== h) {
          mainParts.push(`V ${y}`);
        }
      }
      mainParts.push(`H ${colToX(col) + CELL_SIZE}`);
    }
    if (inSegment) mainParts.push(`V ${bottomY}`);
    const mainSkylinePath = mainParts.length > 0 ? mainParts.join(' ') : '';

    return { layers, mainSkylinePath, columnCaps, totalHeights, aliveCaps };
  }, [placedFoods, allShips, medicationModifiers, pancreasRate, interventionReduction]);

  // Preview curve (shown during drag hover)
  // Preview uses same accumulating logic: reduction = rate × elapsed from first food col.
  const previewCubes = useMemo(() => {
    if (!previewShip || previewColumn == null) return null;
    const { glucose, duration } = applyMedicationToFood(previewShip.load, previewShip.duration, medicationModifiers);

    const curve = calculateCurve(glucose, duration, previewColumn, 0);

    const { totalHeights } = graphRenderData;
    const cubes: Array<{ col: number; row: number; isPancreasEaten: boolean }> = [];

    // Find first food col considering the preview food
    let firstFoodCol = previewColumn;
    for (let col = 0; col < TOTAL_COLUMNS; col++) {
      if (totalHeights[col] > 0) { firstFoodCol = Math.min(firstFoodCol, col); break; }
    }

    for (const cc of curve) {
      const graphCol = previewColumn + cc.columnOffset;
      if (graphCol < 0 || graphCol >= TOTAL_COLUMNS) continue;

      const startRow = totalHeights[graphCol];
      const newTotal = totalHeights[graphCol] + cc.cubeCount;
      // Accumulating reduction at this column
      const elapsed = Math.max(0, graphCol - firstFoodCol);
      const reduction = pancreasRate > 0 ? Math.round(pancreasRate * elapsed) : 0;
      const newAliveCap = Math.max(0, newTotal - reduction);

      for (let cubeIdx = 0; cubeIdx < cc.cubeCount; cubeIdx++) {
        const row = startRow + cubeIdx;
        if (row >= TOTAL_ROWS) break;
        cubes.push({ col: graphCol, row, isPancreasEaten: row >= newAliveCap });
      }
    }

    return cubes;
  }, [previewShip, previewColumn, graphRenderData, medicationModifiers, pancreasRate]);

  // Intervention preview: per-column reduction array
  const interventionPreviewData = useMemo(() => {
    if (!previewIntervention || previewColumn == null) return null;
    const { depth, duration, boostCols = 0, boostExtra = 0 } = previewIntervention;
    const curve = calculateInterventionCurve(depth, duration, previewColumn, boostCols, boostExtra);
    const reduction = new Array(TOTAL_COLUMNS).fill(0);
    for (const cc of curve) {
      const col = previewColumn + cc.columnOffset;
      if (col >= 0 && col < TOTAL_COLUMNS) {
        reduction[col] = cc.cubeCount;
      }
    }
    return reduction;
  }, [previewIntervention, previewColumn]);

  const handleCubeClick = useCallback(
    (placementId: string, isIntervention: boolean) => {
      if (!interactive) return;
      if (isIntervention) {
        onInterventionClick?.(placementId);
      } else {
        onFoodClick?.(placementId);
      }
    },
    [onFoodClick, onInterventionClick, interactive]
  );

  // Food marker pointer drag handlers
  const handleMarkerPointerDown = useCallback((e: React.PointerEvent<SVGGElement>, placementId: string) => {
    if (!interactive) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    markerDragRef.current = { placementId, lastCol: -1 };
  }, [interactive]);

  const handleMarkerPointerMove = useCallback((e: React.PointerEvent<SVGGElement>) => {
    const drag = markerDragRef.current;
    if (!drag) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scale = rect.width / SVG_W;
    const svgX = (e.clientX - rect.left) / scale;
    const col = Math.max(0, Math.min(Math.floor((svgX - PAD_LEFT) / CELL_SIZE), TOTAL_COLUMNS - 1));
    if (col !== drag.lastCol) {
      drag.lastCol = col;
      onFoodMove?.(drag.placementId, col);
    }
  }, [onFoodMove]);

  const handleMarkerPointerUp = useCallback((e: React.PointerEvent<SVGGElement>) => {
    const drag = markerDragRef.current;
    if (!drag) return;
    markerDragRef.current = null;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scale = rect.width / SVG_W;
    const svgX = (e.clientX - rect.left) / scale;
    const svgY = (e.clientY - rect.top) / scale;
    if (svgX < PAD_LEFT || svgX > PAD_LEFT + GRAPH_W || svgY < PAD_TOP || svgY > PAD_TOP + GRAPH_H) {
      onFoodClick?.(drag.placementId);
    }
  }, [onFoodClick]);

  return (
    <div ref={setNodeRef} className={`bg-graph ${isOver ? 'bg-graph--drag-over' : ''}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="bg-graph__svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Zone clip paths for skyline coloring */}
          {ZONE_CLIP_BANDS.map(z => (
            <clipPath key={z.id} id={z.id}>
              <rect x={0} y={z.yTop} width={SVG_W} height={z.yBot - z.yTop} />
            </clipPath>
          ))}
          {/* Food marker drop shadow */}
          <filter id="bubble-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Zone backgrounds */}
        <rect
          x={PAD_LEFT}
          y={rowToY(mgdlToRow(ZONE_NORMAL) - 1)}
          width={GRAPH_W}
          height={(mgdlToRow(ZONE_NORMAL) - 0) * CELL_SIZE}
          fill="#c6f6d5"
          opacity={0.3}
        />
        <rect
          x={PAD_LEFT}
          y={rowToY(mgdlToRow(ZONE_ELEVATED) - 1)}
          width={GRAPH_W}
          height={(mgdlToRow(ZONE_ELEVATED) - mgdlToRow(ZONE_NORMAL)) * CELL_SIZE}
          fill="#fefcbf"
          opacity={0.3}
        />
        <rect
          x={PAD_LEFT}
          y={rowToY(mgdlToRow(ZONE_HIGH) - 1)}
          width={GRAPH_W}
          height={(mgdlToRow(ZONE_HIGH) - mgdlToRow(ZONE_ELEVATED)) * CELL_SIZE}
          fill="#fed7d7"
          opacity={0.3}
        />
        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={GRAPH_W}
          height={(TOTAL_ROWS - mgdlToRow(ZONE_HIGH)) * CELL_SIZE}
          fill="#fc8181"
          opacity={0.2}
        />

        {/* Grid lines - vertical (time) */}
        {Array.from({ length: TOTAL_COLUMNS + 1 }, (_, i) => (
          <line
            key={`v-${i}`}
            x1={colToX(i)}
            y1={PAD_TOP}
            x2={colToX(i)}
            y2={PAD_TOP + GRAPH_H}
            stroke="#e2e8f0"
            strokeWidth={i % 4 === 0 ? 0.8 : 0.3}
          />
        ))}

        {/* Grid lines - horizontal (BG) */}
        {Array.from({ length: TOTAL_ROWS + 1 }, (_, i) => (
          <line
            key={`h-${i}`}
            x1={PAD_LEFT}
            y1={PAD_TOP + i * CELL_SIZE}
            x2={PAD_LEFT + GRAPH_W}
            y2={PAD_TOP + i * CELL_SIZE}
            stroke="#e2e8f0"
            strokeWidth={0.3}
          />
        ))}

        {/* Graph border */}
        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={GRAPH_W}
          height={GRAPH_H}
          fill="none"
          stroke="#a0aec0"
          strokeWidth={1}
        />

        {/* Y axis labels */}
        {DEFAULT_Y_TICKS.map(tick => {
          const row = mgdlToRow(tick);
          const y = rowToY(row - 1) + CELL_SIZE / 2;
          return (
            <text
              key={`y-${tick}`}
              x={PAD_LEFT - 5}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={9}
              fill="#718096"
            >
              {formatBgValue(tick, settings.bgUnit)}
            </text>
          );
        })}

        {/* X axis labels */}
        {DEFAULT_X_TICKS.map(hour => {
          const col = ((hour - GRAPH_CONFIG.startHour) * 60) / GRAPH_CONFIG.cellWidthMin;
          const x = colToX(col);
          return (
            <text
              key={`x-${hour}`}
              x={x}
              y={PAD_TOP + GRAPH_H + 16}
              textAnchor="middle"
              fontSize={9}
              fill="#718096"
            >
              {columnToTimeString(col, settings.timeFormat)}
            </text>
          );
        })}

        {/* SGLT2 drain threshold line */}
        {medicationModifiers.sglt2 && (
          <line
            x1={PAD_LEFT}
            y1={rowToY(medicationModifiers.sglt2.floorRow - 1)}
            x2={PAD_LEFT + GRAPH_W}
            y2={rowToY(medicationModifiers.sglt2.floorRow - 1)}
            stroke="#b794f4"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            opacity={0.7}
          />
        )}

        {/* Per-food cube layers: last placed rendered first (bottom), first placed last (top) */}
        {[...graphRenderData.layers].reverse().map(layer => (
          <g key={`food-layer-${layer.placementId}`} className="bg-graph__food-group">
            {layer.cubes.map(cube => {
              const waveDelay = (cube.col - layer.dropColumn) * 20;
              const cubeClass = cube.status === 'pancreas'
                ? 'bg-graph__cube--pancreas'
                : cube.status === 'burned'
                  ? 'bg-graph__cube--burned'
                  : 'bg-graph__cube';
              const cubeFill = layer.color;
              return (
                <rect
                  key={`${layer.placementId}-${cube.col}-${cube.row}`}
                  x={colToX(cube.col) + 0.5}
                  y={rowToY(cube.row) + 0.5}
                  width={CELL_SIZE - 1}
                  height={CELL_SIZE - 1}
                  fill={cubeFill}
                  rx={2}
                  className={cubeClass}
                  style={{ animationDelay: `${waveDelay}ms` }}
                  onClick={() => {
                    if (cube.status === 'pancreas') return;
                    if (cube.status === 'burned') {
                      if (placedInterventions.length > 0) {
                        handleCubeClick(placedInterventions[0]?.id ?? layer.placementId, true);
                      }
                    } else {
                      handleCubeClick(layer.placementId, false);
                    }
                  }}
                />
              );
            })}
          </g>
        ))}

        {/* Individual skylines — AFTER all cube layers so they're not hidden by upper food cubes */}
        {[...graphRenderData.layers].reverse().map(layer => (
          layer.skylinePath ? (
            <g key={`skyline-${layer.placementId}`} pointerEvents="none">
              <path
                d={layer.skylinePath}
                fill="none"
                stroke="rgba(0,0,0,0.18)"
                strokeWidth={5}
                strokeLinejoin="round"
                strokeLinecap="round"
                transform="translate(0, 1.5)"
              />
              <path
                d={layer.skylinePath}
                fill="none"
                stroke="white"
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          ) : null
        ))}

        {/* BG skyline — single path with rounded corners + shadow line below */}
        {graphRenderData.mainSkylinePath && (
          <g className="bg-graph__skyline" pointerEvents="none">
            {/* Shadow line — offset 2px below, wider, semi-transparent */}
            <path
              d={graphRenderData.mainSkylinePath}
              fill="none"
              stroke="rgba(0,0,0,0.18)"
              strokeWidth={5}
              strokeLinejoin="round"
              strokeLinecap="round"
              transform="translate(0, 2)"
            />
            {/* Zone-colored skyline — clipped per zone band */}
            {ZONE_CLIP_BANDS.map(z => (
              <path
                key={z.id}
                d={graphRenderData.mainSkylinePath}
                fill="none"
                stroke={z.color}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
                clipPath={`url(#${z.id})`}
              />
            ))}
          </g>
        )}

        {/* Food markers — emoji labels above each food's own peak */}
        {interactive && graphRenderData.layers.map(layer => {
          if (!layer.marker) return null;
          const cx = layer.marker.peakCenterX;
          const tailBottomY = PAD_TOP + GRAPH_H - layer.marker.tailRow * CELL_SIZE;
          const tailH = 11;
          const tailTopY = tailBottomY - tailH;
          const mW = 50;
          const mH = 44;
          const mY = tailTopY - mH;
          return (
            <g
              key={`marker-${layer.placementId}`}
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => handleMarkerPointerDown(e, layer.placementId)}
              onPointerMove={handleMarkerPointerMove}
              onPointerUp={handleMarkerPointerUp}
            >
              {/* Shadow + background + tail */}
              <g filter="url(#bubble-shadow)">
                <rect
                  x={cx - mW / 2} y={mY}
                  width={mW} height={mH}
                  rx={8} fill="white"
                  stroke="#cbd5e0" strokeWidth={0.7}
                />
                <polygon
                  points={`${cx - 6},${tailTopY} ${cx + 6},${tailTopY} ${cx},${tailBottomY}`}
                  fill="white" stroke="#cbd5e0" strokeWidth={0.7}
                />
                {/* Cover the border between rect and tail */}
                <line
                  x1={cx - 5.5} y1={tailTopY} x2={cx + 5.5} y2={tailTopY}
                  stroke="white" strokeWidth={2}
                />
              </g>
              {/* Emoji */}
              <text
                x={cx} y={mY + mH / 2 + 1}
                textAnchor="middle" dominantBaseline="central"
                fontSize={30} style={{ pointerEvents: 'none' }}
              >
                {layer.emoji}
              </text>
            </g>
          );
        })}

        {/* Penalty highlight overlays (after submit) */}
        {showPenaltyHighlight && graphRenderData.layers.map(layer =>
          layer.cubes
            .filter(cube => cube.status === 'normal')
            .map(cube => {
              const isOrange = cube.row >= PENALTY_ORANGE_ROW && cube.row < PENALTY_RED_ROW;
              const isRed = cube.row >= PENALTY_RED_ROW;
              if (!isOrange && !isRed) return null;
              const waveDelay = cube.col * 15;
              return (
                <rect
                  key={`penalty-${layer.placementId}-${cube.col}-${cube.row}`}
                  x={colToX(cube.col) + 0.5}
                  y={rowToY(cube.row) + 0.5}
                  width={CELL_SIZE - 1}
                  height={CELL_SIZE - 1}
                  fill={isRed ? 'rgba(245, 101, 101, 0.7)' : 'rgba(237, 137, 54, 0.6)'}
                  rx={2}
                  className="bg-graph__cube--penalty"
                  style={{ animationDelay: `${waveDelay}ms` }}
                  pointerEvents="none"
                />
              );
            })
        )}

        {/* Intervention preview: green overlay on normal cubes that would be burned */}
        {interventionPreviewData && graphRenderData.layers.map(layer =>
          layer.cubes
            .filter(cube => cube.status === 'normal')
            .map(cube => {
              const red = interventionPreviewData[cube.col];
              if (red <= 0) return null;
              const cap = graphRenderData.columnCaps[cube.col];
              const burnFloor = Math.max(0, cap - red);
              if (cube.row < burnFloor) return null;
              return (
                <rect
                  key={`burn-pv-${layer.placementId}-${cube.col}-${cube.row}`}
                  x={colToX(cube.col) + 0.5}
                  y={rowToY(cube.row) + 0.5}
                  width={CELL_SIZE - 1}
                  height={CELL_SIZE - 1}
                  fill="rgba(34, 197, 94, 0.6)"
                  rx={2}
                  className="bg-graph__cube--preview-burn"
                />
              );
            })
        )}

        {/* Preview cubes (during drag) — blue for normal, orange for pancreas-eaten */}
        {/* Includes correction overlays on existing food's orange cubes that become normal */}
        {previewCubes && previewCubes.map((cube, i) => (
          <rect
            key={`preview-${i}`}
            x={colToX(cube.col) + 0.5}
            y={rowToY(cube.row) + 0.5}
            width={CELL_SIZE - 1}
            height={CELL_SIZE - 1}
            fill={cube.isPancreasEaten ? PREVIEW_PANCREAS_COLOR : PREVIEW_COLOR}
            rx={2}
            className="bg-graph__cube--preview"
          />
        ))}

        {/* Penalty threshold line at 200 mg/dL (shown during results) */}
        {showPenaltyHighlight && (
          <line
            x1={PAD_LEFT}
            y1={rowToY(PENALTY_ORANGE_ROW - 1)}
            x2={PAD_LEFT + GRAPH_W}
            y2={rowToY(PENALTY_ORANGE_ROW - 1)}
            stroke="#e53e3e"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            opacity={0.8}
          />
        )}
      </svg>
    </div>
  );
}

/**
 * Utility: convert pointer position relative to the graph container to a column index.
 * Call this from the parent during drag events.
 */
export function pointerToColumn(
  graphElement: HTMLElement,
  pointerX: number
): number | null {
  const rect = graphElement.getBoundingClientRect();
  const svgWidth = rect.width;
  const scale = svgWidth / SVG_W;
  const relativeX = pointerX - rect.left;
  const svgX = relativeX / scale;
  const col = Math.floor((svgX - PAD_LEFT) / CELL_SIZE);

  if (col < 0 || col >= TOTAL_COLUMNS) return null;
  return col;
}
