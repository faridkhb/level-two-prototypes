# Pancreas: Accumulating Variant (Not Implemented)

This document describes an alternative pancreas model that was considered but not implemented in v0.39.0. It is preserved here for potential future use.

## Current Model: Global Flat Reduction (v0.39.0)

The active pancreas system uses **flat depth** — a fixed number of cubes removed from the top of each column globally. The depth is constant across all columns.

```
Tier 0 (OFF): depth = 0
Tier I:       depth = 2   (0 WP)
Tier II:      depth = 4   (1 WP)
Tier III:     depth = 6   (2 WP)
```

Formula per column:
```
aliveCap[col] = max(0, totalHeight[col] - pancreasDepth)
```

## Alternative: Accumulating Reduction

In this model, pancreas reduction grows over time (columns) from the food's drop point. The longer food is in the system, the more cubes the pancreas has processed.

### Concept

Instead of a flat `depth`, the pancreas has a `rate` (cubes per column). The reduction at each column depends on how many columns have elapsed since food first appeared.

```
Tier 0 (OFF): rate = 0
Tier I:       rate = 0.25 cubes/column
Tier II:      rate = 0.5  cubes/column
Tier III:     rate = 0.75 cubes/column
```

### Per-Food Implementation (Previous v0.38.x)

In v0.38.x, the accumulating model was applied **per food** inside `calculateCurve()`:

```typescript
// During ramp-up:
height = Math.round(rawRise - decayRate * (i + 1));

// Post-peak:
height = Math.round(peakCubes - decayRate * (i + 1));
```

This created a decay curve where each food independently lost cubes over time. The decay was embedded in the curve shape itself, producing two curves per food:
- **Decay curve** (with rate): actual alive cubes
- **Plateau curve** (rate=0): total cubes including pancreas-eaten

### Global Implementation (Not Built)

An alternative global approach would accumulate reduction based on the earliest food's drop column:

```typescript
const firstDropCol = Math.min(...placedFoods.map(f => f.dropColumn));
for (let col = 0; col < TOTAL_COLUMNS; col++) {
  if (totalHeights[col] <= 0) continue;
  const elapsed = col - firstDropCol;
  const reduction = Math.round(rate * Math.max(0, elapsed));
  aliveCaps[col] = Math.max(0, totalHeights[col] - reduction);
}
```

### Comparison

| Aspect | Flat | Accumulating |
|--------|------|--------------|
| Complexity | Simple — one constant | Per-column calculation |
| Predictability | Easy for player to understand | Harder — depends on time elapsed |
| Early columns | Full reduction immediately | Little/no reduction |
| Late columns | Same reduction | Heavy reduction |
| Preview accuracy | Exact match | Exact match (if global) |
| Gameplay feel | Consistent, strategic | More realistic, gradual |

### When to Consider Accumulating

- If flat reduction feels too "binary" (either too strong early or too weak late)
- If you want the pancreas to reward spreading meals across the day
- If you want late-day glucose to be more aggressively managed than early-day

### Implementation Notes

The `calculateCurve()` function in `cubeEngine.ts` still supports the `decayRate` parameter. To revert to per-food accumulating, pass `decayRate > 0` to `calculateCurve()` and restore the dual-curve system in `BgGraph.tsx`. For global accumulating, keep the plateau-based stacking and replace the flat `aliveCaps` calculation with the elapsed-column formula above.
