# MineralWise Migration Decisions

Last updated: 2026-02-19

## Scope Decisions (Phase 0)

- **Strategy:** Components-first migration.
- **Styling baseline:** Keep `src/styles/starwind.css` + existing utilities. Do not introduce a second design system.
- **Delivery target:** Parity + consistency. No redesign work during migration slices.
- **Rollout model:** Family-based templates + incremental batches.

## Success Criteria (KPI Gate)

- 0 broken internal links in migrated batches.
- 0 missing title/description tags in migrated batches.
- 0 new 404s for migrated URLs.
- Build passes before each deploy slice.

## Branch Workflow

- Branch naming: `migration/<phase>-<slice>`
  - Examples: `migration/phase1-shell`, `migration/phase3-top20-a`
- One deployable slice per branch.
- Merge only after checklist gate passes.

## Deployment Cadence

- Target: 2 migration slices per week.
- Suggested days: Tuesday + Friday.

## Current Baseline

- Total Astro pages in `src/pages`: **409**
- Pages importing `BaseLayout`: **407**
