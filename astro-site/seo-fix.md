# MineralWise SEO Fix Brief — Astro Migration Issues

This document describes specific bugs and SEO problems introduced during the migration to Astro. All issues were identified via Google Analytics (GA4) and live site inspection on June 9, 2026. Organic search traffic has declined severely — only 198 organic Google clicks YTD against 53,945 impressions (0.37% CTR, avg position 37.41).

Work through each task below in order of priority.

---

## PRIORITY 1 — Remove / Noindex Astro Placeholder Content

### Problem
The following pages are Astro starter template default content that was never deleted. They are publicly accessible, in the sitemap, and indexed by Google. Lorem ipsum placeholder text signals low quality content to Google and can trigger a sitewide demotion.

### Pages to fix
- `/blog/first-post/`
- `/blog/second-post/`
- `/blog/third-post/`
- `/blog/markdown-style-guide/`
- `/blog/using-mdx/`

### Task
Find the source files for these pages (likely in `src/content/blog/` or `src/pages/blog/`) and **delete them entirely**. They should not exist in any form on the site.

Also check `src/content/` for any `.md` or `.mdx` files with these slugs and remove them.

After deleting, verify the routes return 404 (not a redirect or blank page).

---

## PRIORITY 2 — Fix the `/blog/` Route (Redirecting to CMS Admin)

### Problem
Navigating to `https://mineralwise.com/blog/` shows "Redirecting to admin..." and sends the user to the Decap/Netlify CMS. This is a broken route. Any inbound links or Google search results pointing to `/blog/` are non-functional for users and will be treated as a bad URL by Google.

### Task
Find what is causing `/blog/` to redirect to `/admin/`. Check:
- `src/pages/blog/index.astro` or `src/pages/blog.astro` — does it exist? If not, create it as a proper blog index page listing all real blog posts.
- `netlify.toml` or `public/_redirects` — check for any redirect rule sending `/blog/` to `/admin/`
- `astro.config.mjs` — check for any routing overrides

The `/blog/` route should either:
1. Render a real blog index page listing actual posts, OR
2. Redirect (301) to `/` or another relevant content page if there is no blog

It must NOT redirect to `/admin/`.

---

## PRIORITY 3 — Remove Inappropriate Pages from Sitemap

### Problem
The auto-generated sitemap (`sitemap-0.xml`) includes pages that should never be indexed by Google. This wastes crawl budget and confuses Google's quality signals.

### Pages that must be excluded from the sitemap
- `/admin/` — CMS admin interface
- `/adstxt/` — utility page
- `/blog/first-post/` — placeholder (being deleted per Priority 1)
- `/blog/second-post/` — placeholder (being deleted per Priority 1)
- `/blog/third-post/` — placeholder (being deleted per Priority 1)
- `/blog/markdown-style-guide/` — placeholder (being deleted per Priority 1)
- `/blog/using-mdx/` — placeholder (being deleted per Priority 1)
- `/contact-us-2/` — duplicate/broken contact page
- `/depletion-allowance-2/` — likely a migration artifact duplicate
- `/search/` — internal search results page (should not be indexed)
- `/thank-you/` — form confirmation page (should not be indexed)
- `/offer/` — review whether this should be indexed

### Task
Find how the sitemap is generated. Likely using `@astrojs/sitemap` in `astro.config.mjs`.

Add a `filter` function to the sitemap integration config to exclude the above paths. Example:

```js
// astro.config.mjs
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://mineralwise.com',
  integrations: [
    sitemap({
      filter: (page) => {
        const excluded = [
          'https://mineralwise.com/admin/',
          'https://mineralwise.com/adstxt/',
          'https://mineralwise.com/blog/first-post/',
          'https://mineralwise.com/blog/second-post/',
          'https://mineralwise.com/blog/third-post/',
          'https://mineralwise.com/blog/markdown-style-guide/',
          'https://mineralwise.com/blog/using-mdx/',
          'https://mineralwise.com/contact-us-2/',
          'https://mineralwise.com/depletion-allowance-2/',
          'https://mineralwise.com/search/',
          'https://mineralwise.com/thank-you/',
          'https://mineralwise.com/offer/',
        ];
        return !excluded.includes(page);
      },
    }),
  ],
});
```

Also add `<meta name="robots" content="noindex, nofollow">` to the `<head>` of the `/admin/`, `/search/`, `/thank-you/`, and `/offer/` pages as a belt-and-suspenders measure.

---

## PRIORITY 4 — Fix Truncated Page Title Tags

### Problem
Every article/content page has its `<title>` tag ending with a literal Unicode ellipsis character (`…`). For example:

```
<title>Check for Unclaimed Oil and Gas Royalties in Your State - Find…</title>
<title>Surface Rights vs Mineral Rights in Oil & Gas Leasing |…</title>
```

This means the title generation logic is truncating the string and appending a literal `…` to the HTML output. Google reads the raw HTML title, so these appear as incomplete titles in search results, hurting click-through rates.

### Task
Find where page titles are being generated. Likely in:
- A base layout component: `src/layouts/BaseLayout.astro` or `src/layouts/Layout.astro`
- A SEO component: `src/components/SEO.astro` or similar

Look for any code that truncates a title string with an ellipsis — something like:

```js
// Examples of the problematic pattern to find and fix:
title.slice(0, 60) + '…'
title.substring(0, 60) + '...'
truncate(title, 60)
```

**Remove the truncation entirely.** Page titles should output their full value as-is. Google handles title length in its own display; truncating in the HTML source is harmful.

After fixing, verify that `document.querySelector('title').textContent` on multiple pages returns the full, non-truncated title.

---

## PRIORITY 5 — Fix or Remove Duplicate/Artifact Pages

### Problem
The sitemap contains pages that appear to be migration artifacts — duplicates of real pages with `-2` suffixes or old slugs.

### Pages to audit
- `/contact-us-2/` — Currently redirects to CMS admin. Should be deleted or 301-redirected to `/contact-us/`
- `/depletion-allowance-2/` — Likely a duplicate of a real page. Check its content vs `/resources/oil-and-gas-terms/depletion-allowance/` and either delete it or 301-redirect to the canonical version.

### Task
For each page:
1. Check whether the source file exists in `src/pages/` or `src/content/`
2. If it's a duplicate, delete the source file and add a 301 redirect in `netlify.toml` or `public/_redirects`:
```
/contact-us-2/   /contact-us/   301
/depletion-allowance-2/   /resources/oil-and-gas-terms/depletion-allowance/   301
```
3. If it has unique content, add a canonical tag pointing to the primary version

---

## PRIORITY 6 — Add noindex to Admin and Utility Routes

### Problem
`/admin/` (Decap CMS) is publicly accessible and in the sitemap. While it requires authentication to use, Google is crawling and potentially indexing it.

### Task
In the Astro page or layout that renders `/admin/`, ensure the `<head>` includes:
```html
<meta name="robots" content="noindex, nofollow" />
```

Also update `public/robots.txt` to add a Disallow for the admin path:
```
User-agent: *
Allow: /
Disallow: /admin/

Sitemap: https://mineralwise.com/sitemap-index.xml
```

---

## VERIFICATION CHECKLIST

After making all changes, verify the following before deploying:

- [ ] `GET /blog/first-post/` returns 404
- [ ] `GET /blog/second-post/` returns 404
- [ ] `GET /blog/third-post/` returns 404
- [ ] `GET /blog/markdown-style-guide/` returns 404
- [ ] `GET /blog/using-mdx/` returns 404
- [ ] `GET /blog/` returns a real page (not a redirect to admin)
- [ ] `GET /admin/` has `<meta name="robots" content="noindex">` in `<head>`
- [ ] `GET /contact-us-2/` returns 301 redirect to `/contact-us/`
- [ ] `document.querySelector('title').textContent` on any article page returns full title without trailing `…`
- [ ] `sitemap-0.xml` does not contain `/admin/`, `/adstxt/`, any `/blog/first-post/` etc., `/search/`, `/thank-you/`
- [ ] `robots.txt` contains `Disallow: /admin/`

---

## AFTER DEPLOYMENT

Once all fixes are live, do the following in Google Search Console (`search.google.com/search-console`):

1. Go to **Removals** and request temporary removal of the five placeholder blog post URLs while Google processes the 404s
2. Go to **Sitemaps** and resubmit `https://mineralwise.com/sitemap-index.xml`
3. Use **URL Inspection** on your top content pages (e.g. `/unclaimed-oil-and-gas-royalty/`, `/surface-rights-vs-mineral-rights-in-oil-gas-leasing/`) and click "Request Indexing" to prompt a recrawl

Recovery of organic rankings typically takes 4–8 weeks after Google recrawls and reprocesses the site.
