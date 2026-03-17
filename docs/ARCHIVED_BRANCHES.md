# Archived Branches

Branches that are no longer actively developed. Preserved here for reference.

## Repository Structure

| Branch | Project | Version | Description |
|--------|---------|---------|-------------|
| `port-planner` | Port Planner | v0.27.1 | Archived — metabolic simulation (WP, slots, organs, SVG pipes) |
| `match3` | Port Planner + Match-3 | v0.28.11 | Match-3 mini-game for food card acquisition |
| `tower-defense` | Glucose TD | v0.4.1 | Tower defense reimagining (projectiles, organ zones) |
| `Dariy` | Port Planner | v0.25.1 | Archived — Mood system branch |

---

## Project: Glucose TD (branch: `tower-defense`)

**Glucose TD** — tower defense reimagining of the metabolic simulation. Food generates glucose projectiles that fall through organ defense zones. See full documentation in `docs/td-concept/README.md` on the tower-defense branch.

Current version: v0.4.1 — survival mode, circle indicators, explosion VFX.

---

## Project: Port Planner (branch: `port-planner`)

Version: v0.27.1 — Archived. Original metabolic simulation with WP budget, organ slots, SVG pipes.

### Removed Systems (now in BG Planner main)
- Simulation engine (SimulationEngine, RuleEngine)
- Results system (calculateResults, assessment, degradation)
- Organ system (liver, pancreas, muscles, kidneys)
- Pipe system (SVG flow visualization)
- Slot grid (time slot placement)
- Old WP budget system (spend/refund per slot)
- BG sparkline (replaced by main graph)
- Phase transitions (Planning/Simulation/Results)
- Degradation circles
- Metformin, fiber system

---

## Project: Port Planner + Match-3 (branch: `match3`)

Version: v0.28.11 — Match-3 mini-game for food card acquisition layered on top of Port Planner.

---

## Project: Dariy (branch: `Dariy`)

Version: v0.25.1 — Archived mood system branch, based on Port Planner v0.25.
