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

## Layout & Components

- **Content max-width:** Default 1000px. Override per page via `BaseLayout` prop: `maxWidth={1200}` or `maxWidth="100%"`.
- **Breadcrumbs:** Required. Pass `breadcrumbs` prop to `PageShell` with `{ label, href? }[]`. Last item is current page (no href).

## Content Cleanup

- All content exported from Brizzy. Apply cleanup per `CONTENT_CLEANUP_GUIDE.md` as each page goes live.
- Remove Brizzy attributes, duplicate footers, ad cruft; replace `--brz-global-color*` with semantic styles.

## Current Baseline

- Total Astro pages in `src/pages`: **409**
- Pages importing `BaseLayout`: **407**
