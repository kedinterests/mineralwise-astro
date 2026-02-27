# MineralWise Astro Site — Build Steps

A chronological record of the steps taken to build this site, from initial setup through performance optimization.

---

## 1. Project Foundation

### Initial Setup

- **Source:** Content migrated from a Brizzy/WordPress site
- **Scraped HTML:** Original pages exported to `scraped/` directory
- **Framework:** Astro 5 with static output
- **Styling:** Tailwind CSS v4 + custom `starwind.css` (design tokens, typography)
- **Build:** Vite, UnoCSS, MDX, sitemap

### Project Structure

```
mineralwise-astro/
├── astro-site/           # Main Astro application
│   ├── public/           # Static assets, images, _headers
│   ├── scripts/          # Migration & optimization scripts
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── data/         # Navigation, hierarchy, image map
│   │   ├── layouts/      # BaseLayout
│   │   └── pages/        # Astro pages (400+)
│   └── scraped/          # Original HTML (reference)
├── scraped/              # Scraped HTML files
└── src/
```

---

## 2. Migration from HTML to Astro

### Image Download

- **Script:** `scripts/download-images.js`
- **Command:** `npm run download-images`
- **Purpose:** Extract image URLs from scraped HTML, download to `public/images/`, create `src/data/image-map.json`
- **Output:** Local copies of all images used across the site

### HTML to Astro Conversion

- **Script:** `scripts/convert-html-to-astro.js`
- **Command:** `npm run convert-html`
- **Purpose:** Parse scraped HTML, extract titles/descriptions/content, strip Brizzy markup, convert links and images, generate Astro pages
- **Additional scripts:** Family-specific converters (terms, companies, states, shale plays, etc.)

### Content Cleanup (Brizzy Export)

Per-page cleanup applied during migration:

- Remove `data-brz-*`, `data-uniq-id`, `data-generated-css`
- Remove inline `style="color: rgba(var(--brz-global-color*),1);"`
- Remove duplicate footers, ad cruft, menu artifacts
- Simplify nested divs, fix internal links to relative paths
- Add meaningful `alt` text to images

---

## 3. Component Architecture

### Layout Components

- **BaseLayout:** Wraps all pages; includes BaseHead, TopBar, Header, Footer, main content slot
- **PageShell:** Content wrapper with optional breadcrumbs; uses `content-wrapper` class
- **ArticleContent:** Wraps article body with `content-section` class
- **Breadcrumbs:** Renders trail from `getBreadcrumbs(path)`
- **NavDropdown:** Desktop dropdown navigation
- **TermPage:** Glossary term layout (term, definition, prev/next)
- **OwnerGuideTabs:** Tabbed layout for Owner's Guide articles
- **CompanyPage / StatePage / ShalePlayPage:** Specialized layouts for operators, states, shale plays

### Hierarchy & Breadcrumbs

- **File:** `src/data/hierarchy.ts`
- **Purpose:** Declares parent/child relationships for breadcrumb trails
- **Usage:** `getBreadcrumbs('/path')` returns `{ label, href? }[]`
- **Rule:** Every page added to the site must be in `hierarchy.ts` with correct `parent`

### Navigation

- **File:** `src/data/navigation.ts`
- **Structure:** Top-level items with optional `children` for dropdowns
- **Components:** `Navigation.astro` (desktop nav + mobile menu), `NavDropdown.astro`

---

## 4. Search (SearchIQ)

### Setup

- **Provider:** SearchIQ (`pub.searchiq.co`)
- **Engine key:** Configured in `BaseHead.astro`
- **Search form:** Icon in header/topbar; submits to `/search?s=query`
- **Results page:** `src/pages/search.astro` with `#siq_search_results` container

### Fixes Applied

- **Search icon:** Inline script + event delegation so SearchIQ icon works after DOM updates
- **Blank results page:** Wrapped SearchIQ `SIQ_settings_loaded` callback to inject `resultPageUrl: window.location.origin + '/search'` so the current domain is recognized as the results page

---

## 5. UI & UX Fixes

### Hero Button

- **Issue:** Hero CTA button color didn't match topbar button
- **Fix:** Added `.hero-cta-btn` with `background: var(--accent)` and `hover: var(--accent-dark)` to match topbar (sky blue)

### Mobile Menu — Hamburger to X

- **Issue:** Hamburger icon stayed static when menu opened
- **Fix:** Replaced SVG with three `<span>` elements; CSS transforms top/bottom lines to form X, middle fades out when `menu-open` class is applied
- **File:** `src/components/Navigation.astro`
- **State:** `aria-expanded` and `menu-open` toggled on button click

### Page Template Fixes (e.g. pugh-clause-2)

- **Issue:** Some pages still used old structure (raw HTML Fragment, no breadcrumbs)
- **Fix:** Migrated to `PageShell` + `ArticleContent`, added to `hierarchy.ts`, converted content to semantic HTML with proper styling
- **Pattern:** `content-page`, `content-body`, `additional-reading` sections; styled like `division-orders.astro`

---

## 6. Performance & Lighthouse

### Hero Image Optimization

- **Issue:** Hero PNG was ~2.1 MB; hurt Lighthouse scores
- **Script:** `scripts/optimize-hero.js`
- **Output:** WebP at 480px, 768px, 1200px, 1536px (~260 KB total vs 2.1 MB)
- **Build:** `npm run build` runs `optimize-hero.js` before Astro build
- **Usage:** `<picture>` with `srcset` for responsive loading; `fetchpriority="high"` on hero img

### Layout Shift (CLS) Fixes

- **Issue:** Hero caused layout shift on mobile; parallax script changed dimensions on init
- **Fixes:**
  - Switched from CSS `background-image` to `<img>` with explicit `width`/`height`
  - Added `aspect-ratio` and `min-height` to hero section so space is reserved before image loads
  - Desktop: `aspect-ratio: 2/1`, `min-height: 500px`
  - Mobile: `aspect-ratio: 4/3`, `min-height: 400px`
  - Removed parallax `height: 140%` / `top: -20%` (layout-changing); kept `transform: translateY()` only
  - Added `<link rel="preload">` for hero image in page head

### Caching

- **File:** `astro-site/public/_headers`
- **Purpose:** Cloudflare Pages uses this to set HTTP headers
- **Rules:**
  - `/_astro/*` — 1 year, immutable (hashed assets)
  - `/images/*` — 1 year, immutable
  - `/fonts/*` — 1 year, immutable
  - `/*` — HTML: `max-age=0, must-revalidate`

---

## 7. Deployment

### Cloudflare Pages

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Config:** `wrangler.toml` (optional; `pages_build_output_dir = "dist"`)
- **Deploy:** `npm run deploy` (build + `wrangler pages deploy`)

### Optional: Decap CMS

- **Admin:** `/admin`
- **Auth:** GitHub OAuth via Cloudflare Functions (`functions/api/auth.js`)
- **Collections:** Blog, Pages; see `DEPLOYMENT_AND_SETUP.md` and `README_CMS.md`

---

## 8. Key Commands

| Command | Purpose |
|--------|---------|
| `npm run dev` | Local development server |
| `npm run build` | Build (runs optimize-hero, then Astro) |
| `npm run preview` | Preview production build locally |
| `npm run deploy` | Build and deploy to Cloudflare Pages |
| `npm run download-images` | Download images from scraped HTML |
| `npm run convert-html` | Convert HTML to Astro pages |
| `npm run optimize-hero` | Regenerate hero WebP images only |
| `npm run seo:audit` | Validate metadata/titles/descriptions |

---

## 9. Related Documentation

- **README.md** — Getting started, project structure, migration scripts
- **MIGRATION.md** — Migration plan, tracker, content cleanup, hierarchy
- **DEPLOYMENT_AND_SETUP.md** — Cloudflare Pages, custom domain, Decap CMS
- **README_CMS.md** — Decap CMS configuration
- **THEME_EXPLANATION.md** — Design tokens and styling
- **UNOCSS_GUIDE.md** — UnoCSS usage
