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

---

## Second pass — 27 August 2026

The June fixes were real but incomplete. Search Console on 20 August still showed
**235 Not found (404)** and an average position of 34.8. The validation run started
11 June failed on 13 June because the underlying faults were still live.

### 7. The wildcard rules redirected into 404s

Moving the specific slugs into `functions/_middleware.js` (fix 1) fixed the rule
*limit*, but `public/_redirects` kept its wildcards:

```
/oil-and-gas-terms/*   /resources/oil-and-gas-terms/:splat   301
/oil-and-gas-operators/* /resources/oil-and-gas-operators/:splat 301
```

A wildcard cannot check that its destination exists. The migration had also
*renamed* slugs, so these sent Googlebot from a real old URL to a new URL that
was never built. Verified live on 20 August:

| Requested | Redirected to | Result |
|---|---|---|
| `/oil-and-gas-terms/fracking/` | `/resources/oil-and-gas-terms/fracking/` | 404 |
| `/oil-and-gas-terms/drilling-mud/` | `/resources/oil-and-gas-terms/drilling-mud/` | 404 |
| `/oil-and-gas-operators/anadarko-petroleum/` | `/resources/oil-and-gas-operators/anadarko-petroleum/` | 404 |

Those pages existed the whole time, under `fracking-hydraulic-fracturing-fracture-fracing-frac-job`,
`drilling-mud-drilling-fluid`, and at the root as `/anadarko-petroleum/`.
Redirect-to-404 is worse than a plain 404: Google spends the crawl and still
gets nothing.

**Fix applied:** `_redirects` is now 2 rules — the `/admin` 200 rewrite and the
`/sitemap.xml` alias. Everything else moved into a generated middleware whose
build step *refuses to emit a rule whose destination is not a real page*.

### 8. `_redirects` never matched URLs without a trailing slash

`/depletion-allowance-2/` redirected; `/depletion-allowance-2` returned 404.
Cloudflare Pages adds its own 308 for the missing slash only on assets that
exist, so every rule in `_redirects` silently covered half the inventory.
Google holds both variants from the Squarespace era.

**Fix applied:** the middleware normalises the path before lookup and redirects
straight to the slashed form, so each mapping is written once and no redirect
becomes a two-hop chain.

### 9. www redirected on the homepage only

The June Cloudflare rule covered `www.mineralwise.com/`. Deep paths were not
covered — on 27 August `https://www.mineralwise.com/resources/oil-and-gas-terms/royalty/`
still returned **200**, serving a complete duplicate of the site on a second host.

**Fix applied:** host consolidation now happens in the middleware, in code, with
the path and query string preserved. It runs before any path logic so a www
request produces one redirect, not two.

### 10. The Squarespace-era hierarchy had no redirects at all

Before the Brizy rebuild the site used nested paths — `/owners-guide/...`,
`/library/oil-and-gas-terms/...`, `/directory/shale-plays/...`,
`/mineral-rights-by-state/...`. None of these were in any redirect map. They are
the bulk of the 235.

**Fix applied:** `scripts/legacy-urls.txt` captures the full historical inventory
(909 URLs, reconstructed from the Wayback CDX index plus the pre-migration
sitemap scrape). The generator resolves each one against the pages that exist and
matches on the final path segment, so `/library/oil-and-gas-terms/farm-in-definition`,
`/oil-and-gas-terms/farm-in` and `/farm-in` all resolve without one rule each.

### 11. Twenty-six empty pages in the sitemap

`/resources/oil-and-gas-terms/a/` through `/z/` were alphabet stubs containing a
single empty `<div>`. Nothing on the site linked to them; they existed only in
the sitemap, where they invited Google to crawl 26 blank pages. They are a large
part of the 276 "Crawled – currently not indexed".

**Fix applied:** deleted, and redirected to the glossary index.

### 12. Duplicate fracking term page

`hydraulic-fracturing-fracture-fracing-fracking-frac-job` and
`fracking-hydraulic-fracturing-fracture-fracing-frac-job` carried the same
definition under two slugs. Deleted the first, redirected it to the second, and
repaired the prev/next chain either side of it.

---

## What is now enforced

`node scripts/test-redirects.mjs` fails the build if any of these regress:

- a live page redirects away from itself
- a Pages Function or static asset gets rewritten
- a redirect lands on a page that does not exist
- a URL that should stay 404 starts redirecting
- www fails to consolidate onto the apex with path and query intact
- any of the specific 404s from the 20 August Search Console export comes back

Run `node scripts/build-redirects.mjs` after adding, renaming or deleting a page,
then `node scripts/test-redirects.mjs`, and commit the regenerated middleware.

## Still open (content work, not redirects)

- The median page is 61 words. 198 glossary terms run 30–60 words each, which is
  what "Crawled – currently not indexed" is reporting. Expanding the 40–60 terms
  that draw real impressions is the next lever.
- 33 term slugs stack every synonym (`lease-automatic-custody-transfer-unit-lact-unit`).
  Aliases now cover the readable forms, but the canonical slugs are still ugly.
- `/pugh-clause-2/` holds the substantial Pugh Clause article while the glossary
  stub owns `/resources/oil-and-gas-terms/pugh-clause/`. The `-2` is an import
  artifact on the better page. Worth resolving, but it changes a live URL.
- `/what-is-fracking/` is a 10 KB article and should be kept, not merged into the
  40-word glossary entry as the 20 August recovery plan suggested.
- Zoho PageSense and SearchIQ load on every page from `BaseHead.astro`. Confirm
  both are still wanted.
- GA4 is not filtering `trafficheap.cc` referral spam, and `mineralrightsforum.com`
  is not set as a referral exclusion.

---

## Third pass: 17 September 2026, glossary rebuilt as letter pages

The 198 single-term glossary pages ran 30 to 60 words each and were the bulk of
"Crawled, currently not indexed". The Squarespace site never had them as its
main glossary: it had one page per letter. The glossary is now built that way.

- Terms are a content collection: one JSON file per term in
  `astro-site/src/content/terms/` (`term`, `definition`), editable in the CMS as
  "Glossary Terms". The filename is the term's anchor and must not be renamed.
- `/resources/oil-and-gas-terms/<letter>/` is generated per letter that has
  terms. A letter with no terms gets no page (J, K, X, Y, Z today), and its legacy
  letter URLs go to the glossary index instead.
- 199 single-term URLs were retired (198 under `/resources/oil-and-gas-terms/`
  plus the stray `/grantor` page). They are listed in
  `astro-site/scripts/retired-term-urls.json` and each one 301s in one hop to
  `/resources/oil-and-gas-terms/<letter>/#<anchor>`.
- The redirect generator understands `page#anchor` destinations. It refuses to
  generate if the page is missing, if the anchor is not a term filed under that
  letter, or if any destination is itself a redirected URL (no chains).
- `npm run build` now runs the generator and `test-redirects.mjs` first, so a term
  renamed or added in the CMS re-points its redirects on the next deploy, and a
  change that would break a redirect fails the build instead of shipping.
- `/api-number` had been a plain 404: the middleware's passthrough pattern for
  `/api/` matched any path that merely started with `/api`. Folder names in that
  pattern now have to match a whole segment.
- A www legacy URL used to take two hops (www to apex, then apex to the new
  page). Host and path are now corrected in the same redirect.

`/what-is-fracking/` is an article and stays where it is. The `fracking` glossary
entry is a separate, short definition on the F page.
