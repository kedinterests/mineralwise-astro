# MineralWise Migration Tracker

Last updated: 2026-02-19 (Phase 1 kickoff)

Use this as the active source-of-truth checklist for migration execution.

## Current Phase

- **Active phase:** Phase 1 (Shell Stabilization)
- **Next phase:** Phase 2 (Template Families)

## Prioritized URL List

### Tier 1 (Core launch-critical)

- `/`
- `/all-oil-and-gas-terms`
- `/about`
- `/contact-us`
- `/owners-guide`

### Tier 2 (High-impact supporting)

- `/oil-and-gas-basics-for-mineral-owners`
- `/mineral-owner`
- `/unleased-mineral-owner`
- `/producing-mineral-owner`
- `/non-producing-mineral-owner`
- `/leased-but-not-producing`
- `/cash-payment-for-oil-and-gas-royalty`
- `/texas-mineral-rights`
- `/north-dakota-mineral-rights`
- `/pennsylvania-mineral-rights`

### Tier 3 (Long-tail)

- Remaining glossary/company/state/static pages not listed above.

## KPI Targets

- [ ] 0 broken internal links in migrated batches.
- [ ] 0 missing title/description tags in migrated batches.
- [ ] 0 new 404s for migrated URLs.
- [ ] Build passes for each deploy slice.

## Phase 0 Checklist (Day 1)

- [x] Confirm styling direction remains `starwind.css` + utilities.
- [x] Freeze no-redesign rule (parity and consistency only).
- [x] Create prioritized URL list (Tier 1/2/3).
- [x] Define migration KPI targets.
- [x] Establish migration branch naming convention.
- [x] Set deployment cadence target.

### Phase 0 Exit Criteria

- [x] Written scope and success criteria published.
- [x] Prioritized URL list published.

## Phase 1 Checklist (Days 1-3)

- [ ] Finalize global layout behavior in `BaseLayout.astro` (container spacing review pending).
- [x] Create structural components:
  - [x] `PageShell`
  - [x] `ArticleContent`
  - [x] `SectionHeader`
  - [ ] `Breadcrumbs` (optional)
- [x] Verify shell on representative page families.

### Phase 1 Exit Criteria

- [ ] Stable reusable shell used by multiple page types.
- [ ] No header/footer/nav regressions.

## Migration Matrix (initial)

| Family | Representative URL | Template Status | Batch Status | Notes |
|---|---|---|---|---|
| Glossary term | `/abandoned-well` | In progress | Sample migrated | Uses `PageShell` + `ArticleContent` |
| Company | `/chevron` | In progress | Sample migrated | Uses `PageShell` + `ArticleContent` |
| State | `/texas-mineral-rights` | In progress | Sample migrated | Uses `PageShell` + `ArticleContent` |
| Static info | `/about` | In progress | Sample migrated | Uses `PageShell` + `ArticleContent` |

## Weekly Snapshot

### Week of 2026-02-19

- Pages migrated this week: **4**
- Total pages migrated: **4 / 409**
- Open blockers: **0**
- Critical defects: **0**
- Planned next batch: **apply shell wrappers to next 20 Tier 1/Tier 2 pages**
