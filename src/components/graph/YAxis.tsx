import type { GameSettings } from '../../core/types';
import { DEFAULT_Y_TICKS, GRAPH_CONFIG, formatBgValue } from '../../core/types';

interface YAxisProps {
  effectiveRows: number;
  cellHeight: number;
  graphH: number;
  padTop: number;
  settings: GameSettings;
  isMobile: boolean;
}

function mgdlToRow(mgdl: number): number {
  return (mgdl - GRAPH_CONFIG.bgMin) / GRAPH_CONFIG.cellHeightMgDl;
}

export function YAxis({ effectiveRows, cellHeight, graphH, padTop, settings, isMobile }: YAxisProps) {
  // Build tick list (expand beyond 400 when graph expands)
  const yTicks = [...DEFAULT_Y_TICKS];
  const maxMgDl = GRAPH_CONFIG.bgMin + effectiveRows * GRAPH_CONFIG.cellHeightMgDl;
  for (let tick = 400; tick <= maxMgDl; tick += 100) {
    if (!yTicks.includes(tick)) yTicks.push(tick);
  }

  const fontSize = isMobile ? 16 : 7;

  return (
    <div className="y-axis" style={{ height: padTop + graphH }}>
      {yTicks.map(tick => {
        const row = mgdlToRow(tick);
        if (row > effectiveRows) return null;
        const y = padTop + graphH - (row) * cellHeight;
        return (
          <span
            key={tick}
            className="y-axis__label"
            style={{ top: y, fontSize }}
          >
            {formatBgValue(tick, settings.bgUnit)}
          </span>
        );
      })}
    </div>
  );
}
