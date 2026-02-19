# MineralWise Astro Migration Guide

Single source of truth for the migration from Brizzy/WordPress to Astro. Combines plan, decisions, tracker, and content cleanup.

---

## Part 1: Decisions & Scope

### Strategy: Components-First

- Keep `src/styles/starwind.css` + existing utilities. No second design system.
- Build reusable layout components (`PageShell`, `ArticleContent`, `Breadcrumbs`, etc.).
- Apply components across page templates. Parity + consistency only—no redesign.

### Locked Decisions

| Topic | Decision |
|-------|----------|
| **Styling** | `starwind.css` + utilities only |
| **Delivery** | Parity + consistency; no redesign during migration |
| **Rollout** | Family-based templates + incremental batches |
| **Branch naming** | `migration/<phase>-<slice>` (e.g. `migration/phase1-shell`) |
| **Deploy cadence** | 2 slices per week (Tue + Fri) |
| **Content max-width** | Default 1000px; override via `BaseLayout` prop `maxWidth={1200}` |
| **Breadcrumbs** | Required; pass `breadcrumbs={getBreadcrumbs('/path')}` to `PageShell` |
| **Deployment** | Cloudflare (not yet deployed) |

### Scope Additions

- **Content:** Exported from Brizzy into file system. Content cleanup required per page (see Part 4).
- **Hierarchy:** Declared in `src/data/hierarchy.ts`. No built-in parent/child in Astro.
- **Special pages:** Home (custom layout), Contact (embedded form), Search (planned).

---

## Part 2: Active Tracker

**Last updated:** 2026-02-19

### Current Phase

- **Active:** Phase 1 (Shell Stabilization)
- **Next:** Phase 2 (Template Families)

### Prioritized URLs

**Tier 1:** `/`, `/all-oil-and-gas-terms`, `/about`, `/contact-us`, `/owners-guide`  
**Tier 2:** `/oil-and-gas-basics-for-mineral-owners`, `/mineral-owner`, `/unleased-mineral-owner`, `/producing-mineral-owner`, `/non-producing-mineral-owner`, `/leased-but-not-producing`, `/cash-payment-for-oil-and-gas-royalty`, `/texas-mineral-rights`, `/north-dakota-mineral-rights`, `/pennsylvania-mineral-rights`  
**Tier 3:** Remaining glossary/company/state/static pages

### KPI Targets

- [ ] 0 broken internal links
- [ ] 0 missing title/description tags
- [ ] 0 new 404s
- [ ] Build passes per deploy slice

### Phase Checklists

**Phase 0:** [x] Styling, no-redesign, URL list, KPIs, branch workflow, deploy cadence  
**Phase 1:** [x] BaseLayout max-width, PageShell, ArticleContent, SectionHeader, Breadcrumbs; [ ] Exit criteria met  
**Phase 2–4:** See Part 3

### Migration Matrix

| Family | Representative | Status |
|--------|----------------|--------|
| Glossary | `/abandoned-well` | Sample migrated |
| Company | `/chevron` | Sample migrated |
| State | `/texas-mineral-rights` | Sample migrated |
| Static | `/about` | Sample migrated |

### Weekly Snapshot (Week of 2026-02-19)

- Pages migrated: **4 / 409**
- Blockers: **0**
- Critical defects: **0**
- Next: Apply shell + hierarchy + cleanup to next 20 Tier 1/Tier 2 pages

---

## Part 3: Phased Plan & Checklists

### Phase 2: Template Families + Hierarchy

- [ ] Inventory pages into families
- [ ] Define canonical template per family (glossary, company, state, static)
- [ ] Populate `hierarchy.ts` from full sitemap
- [ ] Integrate `getBreadcrumbs(path)` into templates
- [ ] Standardize metadata (title, description, canonical)

### Phase 3: High-Impact Rollout

- [ ] Migrate top 50 URLs
- [ ] Apply content cleanup (Part 4) to each
- [ ] QA: links, images, headings, metadata, breadcrumbs

### Phase 4: Full-Site Completion

- [ ] Migrate remaining pages in batches
- [ ] Content cleanup per batch
- [ ] Remove dead CSS
- [ ] URL parity + redirects
- [ ] Deploy to Cloudflare

### Per-Page Migration Checklist

- [ ] Use `PageShell` + `ArticleContent` (or custom layout for home)
- [ ] Add page to `hierarchy.ts` with correct `parent`
- [ ] Pass `breadcrumbs={getBreadcrumbs('/path')}` to `PageShell`
- [ ] Apply content cleanup (Part 4) if page has Brizzy HTML
- [ ] Verify title, description, canonical, links, image alt text

### 7-Day Quick Start (Compressed)

**Day 1:** Lock scope + shell  
**Day 2:** Template consolidation + hierarchy  
**Day 3:** First slice (20 pages) + content cleanup + QA  
**Day 4:** Second slice (40–50 total)  
**Day 5:** SEO + link integrity pass  
**Day 6:** Launch candidate + regression sweep  
**Day 7:** Deploy + monitor

---

## Part 4: Content Cleanup (Brizzy Export)

Apply as each page goes live. Content was exported from Brizzy; remove cruft before making live.

### Quick Reference: Remove

| Pattern | Action |
|--------|--------|
| `data-brz-translate-text="1"` | Remove |
| `data-generated-css="brz-css-*"` | Remove |
| `data-uniq-id="*"` | Remove |
| `data-brz-link-type="page"` / `"external"` | Remove |
| `style="color: rgba(var(--brz-global-color*),1);"` | Replace with semantic classes or remove |
| `id=""`, `id="mm-0"`, random Brizzy IDs | Remove |
| `min-height:20px` on h1 | Remove |

### Structural Cleanup

1. **Remove duplicate footer** — Section with "Terms & Conditions", copyright, logo (site has global Footer)
2. **Remove ad cruft** — `<ins class="adsbygoogle">`, recaptcha iframe
3. **Remove menu artifacts** — `<div><a href="#mm-0"><span>Close menu</span></a></div>`
4. **Simplify wrappers** — Remove `<div id="mm-0">`, collapse excessive nested divs

### Links & Images

- Internal: `https://www.mineralwise.com/owners-guide` → `/owners-guide`
- Fix or remove empty `href=""`
- Add meaningful `alt` text to images

### Per-Page-Type Notes

- **Glossary:** Keep "Previous Term" / "Next Term", "View all Oil & Gas Terms"
- **Company:** Keep "View All Oil & Gas Operators"
- **State:** Keep "Return to All States"; fix Additional Reading URLs to relative
- **Static:** Focus on Brizzy attributes and inline styles

### Example

**Before:** `<div data-brz-translate-text="1"><p data-uniq-id="x" data-generated-css="brz-css-x"><span style="color: rgba(var(--brz-global-color2),1);">Oil & Gas Terms</span></p></div>`  
**After:** `<p>Oil & Gas Terms</p>`

---

## Part 5: Risk Management

- **Mixed systems:** One global base; no new design system mid-migration
- **Regressions:** Family-based templates + batch QA + incremental deploys
- **Scope creep:** Parity + consistency only
- **Brizzy cruft:** Per-page checklist (Part 4) before go-live
- **Hierarchy drift:** Single source in `hierarchy.ts`; update when adding/moving pages

---

## Part 6: Implementation Standards

1. No per-page custom layout logic unless required
2. No net-new visual features during migration
3. Batch changes by page family
4. Ship in small deployable slices
5. Content cleanup required per page
6. Hierarchy in `hierarchy.ts`; breadcrumbs via `getBreadcrumbs(path)`
