# Versions & Branches

**Last updated:** 2026-03-28 (v0.59.6)

---

## Active Branches

| Branch | Project | Version | Deploy | Description |
|--------|---------|---------|--------|-------------|
| `main` | BG Planner | v0.59.6 | [Vercel (prod)](https://level-two-eight.vercel.app/) | Graph-based food planning game |
| `mobile-layout` | BG Planner (mobile) | v0.43.25 | — | Mobile layout adaptation (iPhone 14+) |

## Archived Branches

| Branch | Project | Version | Description |
|--------|---------|---------|-------------|
| `port-planner` | Port Planner | v0.27.1 | Original metabolic simulation (organs, pipes, slot grid) |
| `match3` | Port Planner + Match-3 | v0.28.11 | Match-3 mini-game for food card acquisition |
| `tower-defense` | Glucose TD | v0.4.1 | Tower defense reimagining (projectiles, organ zones) |
| `vertical-layout` | BG Planner | v0.42.4 | Experimental vertical layout (archived) |
| `Dariy` | Port Planner | v0.25.1 | Mood system branch (archived) |

## Feature Branches (local only)

| Branch | Description |
|--------|-------------|
| `alpha-1-pancreas-burn-each-food` | Experiment: per-food pancreas burn |
| `feature/degradation-ui-circles` | Degradation circle UI |
| `feature/tooltips-wp-hints` | Tooltips and WP hints |

---

## Milestone Tags

Stable checkpoints of major feature sets.

| Tag | Date | Version | Description |
|-----|------|---------|-------------|
| `alpha-15-stable` | 2026-03-28 | v0.59.6 | T4 tutorial complete, level select reordered + badges, intervention tails fixed, high-contrast palette |
| `alpha-14-stable` | 2026-03-26 | v0.55.0 | Animated results reveal sequence (danger flash, counter, stars, bounce-in), tap-to-skip |
| `alpha-5-stable` | — | v0.43.0 | Insulin profiles, BOOST, visual insulin bars, post-peak drain |
| `alpha-4-stable` | 2026-02-26 | v0.42.19 | Pre-placed foods, locked slots, balance solver, level-01 3-day puzzle |
| `alpha-3-stable` | 2026-02-23 | v0.40.25 | WP remaining, Take a Break/Rest, bidirectional blocking, level balancing |
| `alpha-2-stable` | 2026-02-23 | v0.40.4 | Main menu, config screen, merged Actions panel, phased reveal, dynamic Y-axis |
| `alpha-1-stable` | — | v0.40.0 | Core gameplay: cubes, interventions, medications, markers, decay stacking |

---

## Version Tags (chronological, newest first)

| Tag | Date | Commit | Description |
|-----|------|--------|-------------|
| `v0.43.16` | 2026-02-26 | `ae5e693` | Locked slot dark gray bg, keep text/icons bright |
| `v0.43.13` | 2026-02-26 | `683bd96` | GLP-1 kcal -15%, gray pre-placed food cubes |
| `v0.39.2-alpha1` | 2026-02-22 | — | Metformin -20%, GLP-1 glucose -10%, decouple from duration |
| `v0.38.3-pre-thin-pancreas` | 2026-02-22 | — | Revert to v0.38.3 — revert pancreas experiments |
| `v0.38.2` | 2026-02-22 | — | Decay-based stacking: per-food colors, correct skylines & markers |
| `v0.25.0` | 2026-02-09 | — | Mood System Overhaul |
| `v0.22.9-stable-feb8` | 2026-02-09 | — | All Phases stable (Feb 8 snapshot) |
| `v0.21.30` | 2026-02-08 | — | Planning + Simulation stable |
| `v0.21.17` | 2026-02-08 | — | Chevron-shaped flow indicators |
| `v0.20.11` | 2026-02-08 | — | Glucose flight last build |
| `v0.18.3` | 2026-02-07 | — | Muscle drain rates adjustment |
| `v0.17.5` | 2026-02-07 | — | Merged food + intervention inventory |
| `backup/v0.15.6` | 2026-02-07 | — | CHANGELOG + tier circle improvements |

## Named Tags

| Tag | Date | Description |
|-----|------|-------------|
| `feb9-inner-demo` | 2026-02-09 | Inner demo (v0.24.3) |
| `feb-8-all-final` | 2026-02-09 | Planning Rebalance (v0.23.0) |
| `TD-feb10` | 2026-02-10 | Tower Defense: organ circle indicators (v0.4.1) |
| `Pre-Planning-Config-Rebalance` | 2026-02-09 | All Phases stable (v0.22.9) |
| `BG-placement` | 2026-02-25 | BG Planner main branch snapshot |

---

## Version History Summary

### BG Planner (main branch)

| Range | Period | Key Features |
|-------|--------|-------------|
| v0.56.0 – v0.59.6 | Mar 27-28 | T4 Pancreas Fatigue tutorial, level select reorder + badges, T2/T5/T7 rebalance, intervention tail fix, high-contrast palette |
| v0.48.0 – v0.55.19 | Mar 2026 | Tutorial system (T1–T8), BOOST hidden T1-T3, T6 Metformin, row-pattern burns, animated reveal, level select root screen |
| v0.43.0 – v0.43.25 | Feb 26-27 | Insulin profiles, BOOST, visual insulin bars, locked card UI, mobile layout |
| v0.42.0 – v0.42.19 | Feb 25-26 | Pre-placed foods, locked slots, balance solver, level-01 puzzle design |
| v0.40.0 – v0.40.25 | Feb 23 | Main menu, config screen, dynamic Y-axis, phased reveal, Take a Break/Rest |
| v0.39.0 – v0.39.7 | Feb 22 | Per-source burn coloring, medication-prevented cubes, stable markers |
| v0.38.0 – v0.38.4 | Feb 22 | Unified rendering, decay-based stacking, per-food colors |
| v0.37.0 – v0.37.6 | Feb 22 | GraphRenderData refactor, progressive blue palette |
| v0.36.0 – v0.36.8 | Feb 21 | Food skylines, layer-based rendering |
| v0.35.0 – v0.35.3 | Feb 21 | Food markers (emoji labels, draggable) |
| v0.34.0 – v0.34.2 | Feb 21 | Penalty/rating system (submit, stars) |
| v0.33.0 – v0.33.3 | Feb 21 | Pancreas tier system (4 tiers) |
| v0.32.0 – v0.32.5 | Feb 21 | BG main skyline (zone-colored) |
| v0.31.0 – v0.31.6 | Feb 20 | Medications, interventions boost zones, GI colors |
| v0.30.0 – v0.30.4 | Feb 19 | Intervention system, wave animations |
| v0.29.0 – v0.29.4 | Feb 19 | BG graph redesign, ramp+decay curve, WP budget |

### Port Planner (archived branches)

| Range | Period | Key Features |
|-------|--------|-------------|
| v0.23.0 – v0.28.11 | Feb 9 | Planning rebalance, mood overhaul, match-3 mini-game |
| v0.19.0 – v0.22.9 | Feb 8 | Results phase redesign, BG prediction, SVG pipes |
| v0.16.0 – v0.18.3 | Feb 7 | WP system, exercise interventions, blocked slots |
| v0.10.0 – v0.15.6 | Feb 5-7 | Degradation, day configs, fiber, pancreas tiers |
| v0.3.0 – v0.9.2 | Feb 4 | Organ system, particles, mood, tier degradation |
| v0.1.0 – v0.3.0 | Feb 3 | Planning, simulation, results phases, rule engine |
| v0.0.0 | Feb 2 | Project start |

---

## Deployment

| Environment | URL | Branch | Auto-deploy |
|-------------|-----|--------|-------------|
| Production | https://level-two-eight.vercel.app/ | `main` | Yes (on push) |
