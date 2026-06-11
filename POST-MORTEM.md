# MineralWise Astro Migration — SEO Post-Mortem

**Period affected:** Launch of Astro site through June 2026
**Symptom:** Organic traffic near zero. 198 clicks on 53,945 impressions (0.37% CTR, avg position 37.41) in GA4/Search Console.
**Root cause:** Multiple compounding issues, two of which were silent failures.

---

## What Went Wrong

### 1. Cloudflare Pages redirect limit silently truncated after ~112 rules

The `_redirects` file had 344 rules covering hundreds of old flat URLs (terms, operators, states, shale plays) that were restructured to `/resources/...` paths in the new site. Cloudflare Pages free tier silently stops processing `_redirects` after approximately 112 rules — no error, no warning. Every rule beyond that was ignored.

Result: 230+ old URLs returned 404 instead of redirecting. Google de-indexed all of them. The new `/resources/...` URLs had no accumulated authority. This wiped out SEO equity on the most-trafficked content: the oil & gas glossary (200+ term pages), operators, states, and shale plays.

**Fix applied:** Moved all specific slug redirects to `functions/_middleware.js` (a Cloudflare Pages Worker), which has no redirect limit. Trimmed `_redirects` to the `/admin` 200-rewrite, the sitemap rule, artifact redirects, and wildcard rules only.

**Watch for next time:** Never put more than ~80 specific rules in `_redirects` on a Cloudflare Pages free tier project. Use `functions/_middleware.js` for any redirect set over that threshold. Verify redirects actually fire after deploy — don't assume they work just because they're in the file.

---

### 2. PUBLIC_SITE_URL was a dashboard secret — invisible and unverifiable

The Astro site reads `PUBLIC_SITE_URL` at build time to generate canonical URLs, sitemap entries, and JSON-LD structured data. It was set correctly in Cloudflare Pages as a dashboard secret, so the live site always had correct canonicals. However, because it was a secret (encrypted), the value was invisible in the dashboard — there was no way to confirm what it was set to without doing a test deploy.

Additionally, the local `dist/` built without the env var contains localhost URLs throughout. If anyone ran `npm run deploy` locally, they would ship localhost canonicals to production with no warning.

**Fix applied:** `PUBLIC_SITE_URL` moved from a dashboard secret to `wrangler.toml` as a plain `[vars]` entry. It is now visible, version-controlled, and verifiable. Dashboard secret deleted.

**Watch for next time:** `PUBLIC_SITE_URL` is a public domain name — it is not sensitive and should never be a secret. Any env var that affects build output (canonicals, sitemap, structured data) must be in `wrangler.toml` so it can be reviewed. Never run `npm run deploy` locally without first confirming the env var is set. After any deploy, verify with `curl https://mineralwise.com/ | grep canonical`.

---

### 3. www subdomain served the site without a redirect to non-www

The old site's canonical URLs were at `https://www.mineralwise.com/`. The new site launched at `mineralwise.com` (non-www), but `www.mineralwise.com` also resolved to the site with a 200 response instead of redirecting. This meant Google's crawl of old www-indexed URLs landed on www content rather than being told to consolidate to non-www.

The canonical tags correctly pointed to non-www on both versions, which mitigated the worst of the damage, but the lack of a hard redirect left link equity fragmented across both origins while Google sorted it out.

**Fix applied:** Explicit www → non-www redirect added to Cloudflare on June 11, 2026.

**Watch for next time:** On any migration, confirm the www/non-www policy on day one. Set the hard redirect in Cloudflare before the new site goes live. Check with `curl -I https://www.example.com/` and verify it returns 301, not 200.

---

### 4. Astro placeholder content published to production (fixed June 9, 2026)

The default Astro starter template blog posts were never deleted before launch:
- `/blog/first-post/`, `/blog/second-post/`, `/blog/third-post/`, `/blog/markdown-style-guide/`, `/blog/using-mdx/`

These were publicly accessible, in the sitemap, and indexed by Google. Lorem ipsum content signals low quality and can trigger a sitewide quality demotion.

**Fix applied:** Source files deleted, sitemap filter added to exclude them, pages now 404.

---

### 5. Page titles truncated with literal ellipsis in HTML (fixed June 9, 2026)

Title generation logic was truncating strings and appending a literal `…` character to the HTML `<title>` tag. Google reads the raw HTML title, so search results showed incomplete titles, hurting CTR.

**Fix applied:** Truncation logic removed from `BaseHead.astro`. Titles now output full values.

---

### 6. Utility and admin pages in sitemap (fixed June 9, 2026)

`/admin/`, `/adstxt/`, `/search/`, `/thank-you/`, `/offer/`, and the artifact duplicate pages (`/contact-us-2/`, `/depletion-allowance-2/`) were included in the auto-generated sitemap. Wastes crawl budget and introduces low-quality signals.

**Fix applied:** Sitemap filter added to `astro.config.mjs`. `noindex` meta added to admin and utility pages. `robots.txt` updated with `Disallow: /admin/`.

---

## Recovery Steps (post-fix)

1. Resubmit `https://mineralwise.com/sitemap-index.xml` in Google Search Console.
2. Use URL Inspection to request re-indexing on high-value pages: `/resources/oil-and-gas-terms/royalty`, `/resources/oil-and-gas-terms/mineral-rights`, `/resources/oil-and-gas-terms/lease-bonus`, `/resources/oil-and-gas-terms/division-order`, `/resources/oil-and-gas-terms/held-by-production-hbp`.
3. Monitor Coverage report in Search Console — the 404 bucket from the broken-redirect period should drain over 4–8 weeks as Google recrawls.
4. Expect traffic recovery to take 4–8 weeks from June 11, 2026.

---

## Pre-Launch Checklist for Future Migrations

Before go-live on any new Astro/Cloudflare Pages site:

- [ ] `PUBLIC_SITE_URL` is set in `wrangler.toml`, not as a dashboard secret
- [ ] `curl https://domain.com/ | grep canonical` returns the production domain, not localhost
- [ ] `curl https://domain.com/sitemap-index.xml` contains production URLs, not localhost
- [ ] `curl -I https://www.domain.com/` returns 301, not 200
- [ ] Spot-check 5 redirects from old URLs — confirm 301, not 404
- [ ] Count redirect rules in `_redirects` — if over 80, move specifics to `_middleware.js`
- [ ] No placeholder/starter template content in `src/content/` or `src/pages/`
- [ ] Utility pages (`/admin/`, `/search/`, `/thank-you/`) excluded from sitemap and have `noindex`
- [ ] `robots.txt` disallows `/admin/`
- [ ] Page titles render without truncation (check with browser dev tools on 3–4 pages)
- [ ] Resubmit sitemap in Search Console after launch
