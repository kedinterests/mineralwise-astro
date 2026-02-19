# MineralWise Astro Migration Plan

## Decision: Theme vs Components

### Recommended direction: **Components-first** (with existing tokens/utilities)

For this project size (800+ imported pages), a full theme migration is slower and riskier. The fastest path is to:

- Keep one base styling system active (your current `starwind.css` + utility classes).
- Build/standardize reusable layout components (`Header`, `Footer`, `PageShell`, `ContentArticle`, etc.).
- Apply those components across page templates and high-traffic pages first.

### Why not a full theme rewrite now?

- A theme switch tends to force global visual/DOM churn across hundreds of pages.
- You already have working generated content and a base layout; replacing structure wholesale creates unnecessary QA load.
- You currently only use a small subset of Starwind components (`button`, `card`), so a complete theme adoption would still require substantial custom work.

### Practical rule

Use **components for structure**, **design tokens/utilities for styling consistency**.

---

## 30-Day Fast Execution Plan

## Phase 0 (Day 1): Freeze stack decisions

1. Confirm one CSS direction for this migration cycle:
   - Keep `src/styles/starwind.css` as the global base.
   - Avoid introducing a second competing design system during migration.
2. Confirm page categories and priorities:
   - Core pages: home, terms index, state pages, top glossary terms, about/contact.
3. Define success criteria:
   - Build passes, no 404 regressions, navigation parity, metadata parity.

Deliverable: written decision log + prioritized page list.

## Phase 1 (Days 1-3): Stabilize app shell

1. Standardize layout contract in `BaseLayout.astro`:
   - Header, content container, footer spacing, max-width behavior.
2. Build 3-4 structural components (not decorative):
   - `PageShell`
   - `ArticleContent`
   - `SectionHeader`
   - `Breadcrumbs` (optional if URL depth needs it)
3. Normalize typography wrappers for long-form glossary content.

Deliverable: one consistent shell used by representative pages.

## Phase 2 (Days 3-7): Template-driven migration

1. Group existing pages into template families:
   - Glossary term pages
   - Company pages
   - State pages
   - Static info pages (about/contact/advertising)
2. For each family, define one canonical Astro template structure.
3. Move shared page logic to helper utilities (title/description defaults, canonical URL logic).

Deliverable: 4 template patterns covering most pages.

## Phase 3 (Week 2): High-impact rollout

1. Apply templates/components to top ~50 traffic pages first.
2. Validate each batch for:
   - Internal links
   - Metadata
   - Image rendering
   - Heading hierarchy
3. Keep visual changes minimal while achieving consistency.

Deliverable: production-ready top pages + regression checklist.

## Phase 4 (Weeks 3-4): Full-site pass + cleanup

1. Roll template updates through remaining pages in batches.
2. Remove dead CSS and one-off legacy classes after each batch.
3. Add redirects for any URL/slug normalization if needed.
4. Final QA run and deploy.

Deliverable: consistent full site on Astro with controlled styling system.

---

## Implementation Standards (to stay fast)

1. **No per-page custom layout logic** unless required by content.
2. **No net-new visual feature work** during migration (animations, redesigns, etc.).
3. **Batch changes** by page family, not random page-by-page edits.
4. **Ship in increments** (small deployable slices).
5. **Track migration status** with a single checklist file.

---

## Suggested Immediate Backlog (next 7 days)

1. Audit and lock top 50 priority URLs.
2. Finalize `BaseLayout` spacing/container behavior.
3. Implement `PageShell` + `ArticleContent` components.
4. Convert glossary template and apply to first 20 pages.
5. Run link/metadata QA on migrated pages.
6. Deploy first migration slice.

---

## Risk Management

- **Risk:** Mixed systems (theme + utility + custom CSS) create inconsistency.
  - **Control:** One global base, component-led patterns, no new system adoption mid-migration.
- **Risk:** Regressions across hundreds of pages.
  - **Control:** Family-based templates + batch QA + incremental deploys.
- **Risk:** Scope creep into redesign.
  - **Control:** Migration goal = parity + consistency, not full rebrand.

---

## Final Recommendation

Choose **components-first** as the migration strategy.

- Keep the current base style setup.
- Use Starwind components selectively as primitives.
- Build your own layout/content components to standardize all imported pages quickly.

This gives the fastest path to a stable, scalable Astro rebuild of MineralWise without a risky full-theme rewrite.

---

## Detailed Phased Checklist

Use this as the source-of-truth tracker during migration.

### Phase 0 Checklist (Day 1): Stack + Scope Lock

- [ ] Confirm primary styling direction remains `starwind.css` + utilities for this migration cycle.
- [ ] Freeze "no redesign" rule (parity and consistency only).
- [ ] Create a prioritized URL list:
   - [ ] Tier 1: Home, glossary index, contact/about, owners guide.
   - [ ] Tier 2: Top glossary pages by traffic.
   - [ ] Tier 3: Remaining long-tail pages.
- [ ] Define migration KPI targets:
   - [ ] 0 broken internal links in migrated batches.
   - [ ] 0 missing title/description tags.
   - [ ] 0 new 404s for migrated URLs.
- [ ] Establish a migration branch workflow and naming convention.
- [ ] Set deployment cadence (e.g., twice weekly migration slices).

**Phase 0 exit criteria**
- [ ] Written scope and success criteria approved.
- [ ] Prioritized URL list published.

### Phase 1 Checklist (Days 1-3): Shell Stabilization

- [ ] Finalize global layout behavior in `BaseLayout.astro`:
   - [ ] Consistent content container width.
   - [ ] Stable header/footer spacing.
   - [ ] Mobile-safe main content spacing.
- [ ] Create structural components:
   - [ ] `PageShell`
   - [ ] `ArticleContent`
   - [ ] `SectionHeader`
   - [ ] `Breadcrumbs` (if URL depth and UX justify it)
- [ ] Normalize typography for content-heavy pages.
- [ ] Verify shell on representative page types:
   - [ ] Glossary page
   - [ ] Company page
   - [ ] State page
   - [ ] Static page

**Phase 1 exit criteria**
- [ ] One stable, reusable shell pattern used by multiple page types.
- [ ] No visual regressions in header/footer/navigation behavior.

### Phase 2 Checklist (Days 3-7): Template Families

- [ ] Inventory and classify all imported pages into families.
- [ ] Define canonical template for each family:
   - [ ] Glossary term template
   - [ ] Company template
   - [ ] State template
   - [ ] Static information template
- [ ] Standardize metadata handling:
   - [ ] Title fallbacks
   - [ ] Description fallbacks
   - [ ] Canonical URL generation
- [ ] Standardize shared content wrappers and spacing rules.
- [ ] Build a page-family migration matrix (family, owner, status, blockers).

**Phase 2 exit criteria**
- [ ] Four template patterns finalized and applied to sample pages.
- [ ] Metadata and canonical behavior consistent across samples.

### Phase 3 Checklist (Week 2): High-Impact Rollout

- [ ] Migrate top 50 priority URLs using finalized templates.
- [ ] Execute QA for each migration batch:
   - [ ] Internal links validated
   - [ ] Images load and size correctly
   - [ ] H1/H2 hierarchy is sane
   - [ ] Titles/descriptions present
   - [ ] Canonical tags correct
- [ ] Track and resolve batch defects before next batch starts.
- [ ] Publish migration slice release notes.

**Phase 3 exit criteria**
- [ ] Top-priority pages migrated and deployed.
- [ ] Defect rate is low enough to scale to full-site rollout.

### Phase 4 Checklist (Weeks 3-4): Full-Site Completion

- [ ] Migrate remaining pages in family-based batches.
- [ ] Remove obsolete CSS and one-off page-level style hacks incrementally.
- [ ] Validate URL parity and redirect rules:
   - [ ] Slug parity check completed
   - [ ] Redirects added where parity is not possible
- [ ] Run final full-site QA pass:
   - [ ] Crawl for 404s
   - [ ] Meta tags spot-check
   - [ ] Navigation path checks
- [ ] Deploy full migration and monitor errors.

**Phase 4 exit criteria**
- [ ] All in-scope pages migrated.
- [ ] No critical navigation/SEO regressions.

### Post-Launch Checklist (Week 5)

- [ ] Monitor production logs and analytics for 7 days.
- [ ] Fix highest-impact regressions first (SEO, nav, rendering).
- [ ] Close remaining low-priority UI polish items.
- [ ] Archive migration tracker and document final architecture decisions.

---

## Weekly Tracking Snapshot (copy/paste each week)

### Week of __________

- [ ] Pages migrated this week: _____
- [ ] Total pages migrated: _____ / _____
- [ ] Open blockers: _____
- [ ] Critical defects: _____
- [ ] Planned next batch: __________________

### Go/No-Go Gate

- [ ] Build passes
- [ ] No unresolved critical defects
- [ ] QA checklist complete for current batch
- [ ] Ready to deploy next slice

---

# 7-Day Quick Start (Compressed Launch Plan)

Use this when speed matters most. This plan is intentionally strict on scope and assumes parity-focused delivery (not redesign).

### Ground Rules for the 7-Day Plan

- [ ] Prioritize launchability over polish.
- [ ] Focus on highest-impact pages first; long-tail pages can follow in Week 2.
- [ ] No net-new features, no visual rebrand, no component overengineering.
- [ ] Ship in daily slices with QA gates.

### Day 1: Lock Scope + Shell

- [ ] Freeze scope for quick launch (parity + consistency only).
- [ ] Finalize Tier 1 URL list (home, key glossary index pages, contact/about, top terms).
- [ ] Stabilize app shell in `BaseLayout.astro` (header/main/footer spacing + container behavior).
- [ ] Confirm metadata baseline (title/description/canonical defaults).

**Day 1 output**
- [ ] Approved Tier 1 list
- [ ] Stable global shell

### Day 2: Template Consolidation

- [ ] Finalize canonical template patterns for:
   - [ ] Glossary pages
   - [ ] Company pages
   - [ ] State pages
   - [ ] Static pages
- [ ] Implement or finalize structural wrappers (`PageShell`, `ArticleContent`, optional `SectionHeader`).
- [ ] Validate one representative page per family.

**Day 2 output**
- [ ] 4 stable templates verified on sample pages

### Day 3: First Migration Slice (Top 20)

- [ ] Migrate first batch of top-priority pages (target: 20).
- [ ] Run focused QA on migrated pages:
   - [ ] Internal links
   - [ ] Metadata
   - [ ] Heading hierarchy
   - [ ] Images
- [ ] Fix all critical blockers same day.

**Day 3 output**
- [ ] First production-ready slice

### Day 4: Second Migration Slice (Next 20-30)

- [ ] Migrate second high-priority batch (target cumulative: 40-50).
- [ ] Repeat QA gate from Day 3.
- [ ] Add required redirects for any unavoidable slug mismatches.

**Day 4 output**
- [ ] 40-50 priority pages migrated

### Day 5: SEO + Link Integrity Pass

- [ ] Run broad internal link checks on migrated scope.
- [ ] Spot-check canonical tags, titles, descriptions, and indexability signals.
- [ ] Verify nav paths and key user journeys.
- [ ] Resolve all critical SEO/navigation issues.

**Day 5 output**
- [ ] Migrated scope is SEO-safe for launch

### Day 6: Launch Candidate + Regression Sweep

- [ ] Build launch candidate.
- [ ] Perform final regression sweep on Tier 1/Tier 2 migrated pages.
- [ ] Confirm no critical rendering issues across desktop/mobile breakpoints.
- [ ] Prepare launch notes and rollback plan.

**Day 6 output**
- [ ] Approved launch candidate

### Day 7: Launch + Monitoring

- [ ] Deploy compressed launch scope.
- [ ] Monitor errors, logs, and key paths post-deploy.
- [ ] Triage and fix highest-impact issues first.
- [ ] Publish Week 2 backlog for long-tail page completion.

**Day 7 output**
- [ ] Live Astro launch with core pages stabilized
- [ ] Clear post-launch queue

### Success Criteria for Quick Start

- [ ] Tier 1/Tier 2 pages migrated and stable.
- [ ] No critical broken links in migrated scope.
- [ ] No critical metadata/canonical regressions.
- [ ] Stable header/navigation/footer experience across migrated pages.

### Week 2 Follow-On (Post Quick Start)

- [ ] Continue long-tail migration in family-based batches.
- [ ] Remove dead CSS and legacy one-offs incrementally.
- [ ] Expand QA coverage as remaining pages are migrated.