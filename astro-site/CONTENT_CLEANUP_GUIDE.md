# MineralWise Content Cleanup Guide

Content was exported from Brizzy (WordPress page builder). As each page is migrated, apply this cleanup to the HTML content before making it live.

## Quick Reference: What to Remove

| Pattern | Action |
|--------|--------|
| `data-brz-translate-text="1"` | Remove |
| `data-generated-css="brz-css-*"` | Remove |
| `data-uniq-id="*"` | Remove |
| `data-brz-link-type="page"` / `"external"` | Remove |
| `style="color: rgba(var(--brz-global-color*),1);"` | Replace with semantic classes or remove |
| `id=""` (empty) | Remove |
| `id="randomBrizzyId"` (e.g. `bB_BBNEYGX6g_bB_BBNEYGX6g`) | Remove or replace with meaningful id |
| `id="mm-0"` | Remove wrapper div |
| `min-height:20px` on h1 | Remove |

## Structural Cleanup

### 1. Remove Duplicate Footer Blocks

Brizzy exports often include a repeated footer section (copyright, Terms & Conditions, Privacy Policy) inside the page content. **Remove it**—the site already has a global Footer component.

Look for and remove:
- Section containing "Use of this site constitutes acceptance of our Terms & Conditions"
- Section with MineralWise logo + copyright
- Typically in a section with id like `5476867bb5c0d4e2e43a4df2533e422b_*`

### 2. Remove Ad/Third-Party Cruft

- `<ins class="adsbygoogle ...">` and its contents
- `<iframe src="https://www.google.com/recaptcha/api2/aframe" ...>`
- Any `data-adsbygoogle-status`, `data-ad-status` attributes

### 3. Remove Menu/UI Artifacts

- `<div><a href="#mm-0"><span>Close menu</span></a></div>`

### 4. Simplify Wrapper Divs

- Remove `<div id="mm-0">` wrapper if it only contains the main content
- Collapse excessive nested `<div><div><div>...</div></div></div>` where they add no structure

## Color and Styling

### Replace Brizzy Color Variables

Brizzy uses `rgba(var(--brz-global-color2),1)` etc. Replace with:

| Brizzy pattern | Replacement |
|----------------|-------------|
| `style="color: rgba(var(--brz-global-color2),1);"` | Use `.content-section` default or `text-[color]` |
| `style="color: rgba(var(--brz-global-color4),1);"` | Body text color (inherited) |
| `style="color: rgba(var(--brz-global-color8),1);"` | Muted/secondary text |
| Link colors | Use `text-primary` or link styles from starwind |

**Prefer:** Remove inline styles and let `.content-section` typography handle it. Add utility classes only when needed.

## Links

### Internal Links

- Change `https://www.mineralwise.com/owners-guide` → `/owners-guide`
- Remove `data-brz-link-type="page"` (links work without it)
- Fix `href=""` empty links—remove or point to correct URL

### External Links

- Keep `rel="noopener noreferrer"` and `target="_blank"` for external links
- Remove `data-brz-link-type="external"`

## Images

- Add meaningful `alt` text (Brizzy often exports `alt=""`)
- Remove `title` if redundant with alt
- Remove `draggable="false"` unless needed
- Simplify `<picture>` if all sources are identical

## Per-Page-Type Notes

### Glossary Terms

- Keep "Previous Term" / "Next Term" navigation
- Keep "View all Oil & Gas Terms" link
- Remove Brizzy wrapper divs around the term content

### Company Pages

- Keep "View All Oil & Gas Operators" link
- Remove Brizzy wrapper divs

### State Pages

- Keep "Return to All States" / mineral-rights-by-state link
- Fix external URLs in "Additional Reading" to use relative paths where applicable

### Static Pages (About, Contact, etc.)

- Usually cleaner—focus on removing Brizzy attributes and inline styles

## Cleanup Checklist (per page)

- [ ] Remove all `data-brz-*` attributes
- [ ] Remove all `data-generated-css="brz-css-*"`
- [ ] Remove all `data-uniq-id="*"`
- [ ] Remove duplicate footer section (copyright, terms, logo)
- [ ] Remove ad iframes and ins elements
- [ ] Remove "Close menu" div
- [ ] Replace or remove `--brz-global-color*` inline styles
- [ ] Fix internal links to relative paths (no mineralwise.com domain)
- [ ] Fix or remove empty `href=""`
- [ ] Add alt text to images (or remove if decorative)
- [ ] Simplify excessive nested divs where safe
- [ ] Remove meaningless `id=""` and random Brizzy section IDs

## Optional: Cleanup Script

For bulk attribute removal, you could add a regex or HTML parser script. Manual cleanup is recommended for the first pass to ensure no content is lost.

## Example: Before vs After

**Before (Brizzy):**
```html
<div data-brz-translate-text="1"><p data-uniq-id="sg9cI" data-generated-css="brz-css-hM91G"><span style="color: rgba(var(--brz-global-color2),1);">Oil &amp; Gas Terms</span></p></div>
```

**After (clean):**
```html
<p>Oil &amp; Gas Terms</p>
```

## After Cleanup

Once content is clean, migrate the page to use `PageShell` + `ArticleContent` + `Breadcrumbs` if not already done. See `MIGRATION_TRACKER.md` for the pattern.
