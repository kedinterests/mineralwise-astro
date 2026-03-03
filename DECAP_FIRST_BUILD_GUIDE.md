# Decap-First Site Build Guide

**For another Cursor instance:** Use this guide when building a new site from scraped HTML. Decap CMS is a **core requirement from the start**—content must be editable from the **frontend admin** (`/admin`), not through the code editor. Deploy to Cloudflare Pages, connected to GitHub.

---

## 1. Core Principles

- **Content lives in Markdown** (`src/content/pages/*.md`) so Decap CMS can edit it
- **Astro pages render from content** via `getEntry()` and `render()`—no hardcoded content in `.astro` files for editable pages
- **Decap CMS is required**, not optional—setup before or during initial migration
- **GitHub OAuth** via Cloudflare Functions for production auth
- **Cloudflare Pages** for deployment

---

## 2. Project Structure (Decap-First)

```
your-site/
├── astro-site/
│   ├── public/
│   │   ├── admin/
│   │   │   ├── index.html      # Decap CMS admin UI (required)
│   │   │   └── config.yml      # Decap CMS config (required)
│   │   └── images/
│   ├── functions/
│   │   └── api/
│   │       ├── auth.js         # GitHub OAuth redirect (required)
│   │       └── callback.js     # GitHub OAuth callback (required)
│   ├── scripts/
│   │   ├── download-images.js
│   │   └── convert-html-to-content.js   # Outputs to content/, not pages/
│   ├── src/
│   │   ├── content.config.ts   # Content collection schema
│   │   ├── content/
│   │   │   ├── pages/         # CMS-editable pages (Markdown)
│   │   │   └── blog/          # Optional blog
│   │   ├── pages/             # Astro pages that RENDER from content
│   │   │   ├── index.astro
│   │   │   ├── about.astro
│   │   │   └── [...slug].astro # Dynamic route for content pages
│   │   ├── components/
│   │   ├── data/
│   │   └── layouts/
│   └── scraped/               # Original HTML files
└── scraped/                   # Or at repo root
```

**Bakken project:** Scraped files are at `/Users/chrismalone/Documents/bakken/scraped`

---

## 3. Setup Steps (Day 1)

### 3.1 Create Admin & OAuth

1. **Create `public/admin/index.html`**:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <meta charset="utf-8" />
     <meta name="viewport" content="width=1.0" />
     <title>Content Manager</title>
   </head>
   <body>
     <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
   </body>
   </html>
   ```

2. **Create `public/admin/config.yml`** (see Section 6)

3. **Create `functions/api/auth.js`** and **`functions/api/callback.js`** (see Section 7)

4. **Add `/admin` redirect** – Create `src/pages/admin.astro` that redirects to `/admin/index.html` (Vite dev doesn't always serve index from public subdirs):
   ```astro
   ---
   ---
   <!DOCTYPE html>
   <html><head><meta http-equiv="refresh" content="0;url=/admin/index.html"></head>
   <body><p>Redirecting to <a href="/admin/index.html">admin</a>...</p></body></html>
   ```

### 3.2 Content Collection Schema

Create `src/content.config.ts`:

```typescript
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    heroTitle: z.string().optional(),
    heroTagline: z.string().optional(),
  }),
});

export const collections = { pages };
```

### 3.3 Astro Page Template (Renders from Content)

Example `src/pages/about.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import PageShell from '../components/PageShell.astro';
import ArticleContent from '../components/ArticleContent.astro';
import { getEntry, render } from 'astro:content';
import { getBreadcrumbs } from '../data/hierarchy';

const page = await getEntry('pages', 'about');
if (!page) throw new Error('About page content not found');

const { Content } = await render(page);
const { title, description } = page.data;
---

<BaseLayout title={title} description={description}>
  <PageShell breadcrumbs={getBreadcrumbs('/about')}>
    <ArticleContent>
      <div class="content-page">
        <Content />
      </div>
    </ArticleContent>
  </PageShell>
</BaseLayout>
```

---

## 4. Download Images (Run Before Conversion)

**Run this step before converting HTML to content.** Images in the scraped HTML reference external URLs (CDNs, etc.). You need local copies and a mapping file for the conversion script to rewrite URLs.

### 4.1 Create `scripts/download-images.js`

The script should:
1. **Scan** all HTML files in `scraped/` (or `/Users/chrismalone/Documents/bakken/scraped` for bakken)
2. **Extract** image URLs from `<img src>`, `<source srcset>`, and `background-image: url()`
3. **Download** each unique image to `public/images/` (use a hash or sanitized filename to avoid collisions)
4. **Write** `src/data/image-map.json` mapping original URL → local path (e.g. `"/images/abc123.jpg"`). Ensure `src/data/` exists (create if needed).

### 4.2 Add npm Script

In `package.json`:
```json
"scripts": {
  "download-images": "node scripts/download-images.js"
}
```

### 4.3 Run Before Conversion

```bash
npm run download-images
```

**Output:** `public/images/` populated; `src/data/image-map.json` created. The conversion script uses this map to replace `https://example.com/image.jpg` with `/images/xyz.jpg` in the generated Markdown.

---

## 5. HTML Conversion → Content (Markdown)

**Critical:** The conversion script must output to `src/content/pages/*.md`, NOT to `src/pages/*.astro`.

### 5.1 Output Format

Each scraped HTML file becomes a Markdown file:

```markdown
---
title: "Page Title"
description: "Meta description for SEO"
---
<div class="content-body">
  <h1>Heading</h1>
  <p>Content...</p>
</div>
```

- **Frontmatter:** `title`, `description` (required)
- **Body:** Cleaned HTML is fine—Markdown allows raw HTML. Or convert to Markdown with a library like `turndown`.

### 5.2 Conversion Script Requirements

- **Input:** `scraped/*.html` (or `/Users/chrismalone/Documents/bakken/scraped` for bakken)
- **Output:** `src/content/pages/{slug}.md`
- **Slug:** `about.html` → `about.md`, `contact-us.html` → `contact-us.md`
- **Clean:** Strip Brizzy markup (`data-brz-*`, `data-uniq-id`, etc.), fix internal links to `/path`, replace image URLs with image-map
- **Do NOT** generate `.astro` files with embedded content

### 5.2a Exclude Tag Archive Pages

**Do not create pages for tag archives.** The source site (e.g. bakkenshale.com/sitemap.xml) includes many tag archive URLs (e.g. `/press/tag/Lodging`, `/pmn/tag/Pipeline`, `/bsp-news/tag/Bakken+Production`). These are index pages that list posts by tag—we do not want them in the new site.

**Filter rule:** Skip any HTML file whose filename contains `__tag__`. In the bakken scraped folder, these appear as `bsp-news__tag__Bakken+Production.html`, `pmn__tag__Pipeline.html`, `press__tag__Lodging.html`, etc. Do not convert them; do not add them to the sitemap.

### 5.3 Astro Page Strategy

- **Option A:** One dynamic route `src/pages/[...slug].astro` that renders any page from `content/pages` by slug
- **Option B:** One `.astro` file per page (e.g. `about.astro`, `contact-us.astro`) that calls `getEntry('pages', 'about')` etc.

Option B gives more control per page (e.g. custom layout for home). Option A is simpler for many pages.

### 5.4 Example Conversion Output

For `scraped/about.html`:

**Output:** `src/content/pages/about.md`

```markdown
---
title: "About Us"
description: "Learn about our company and mission."
---
# About Us

Welcome! We provide...

<p>HTML is also allowed in the body.</p>
```

The existing `convert-html-to-astro.js` outputs to `src/pages/*.astro`. For Decap-first, create `convert-html-to-content.js` that:
1. Reads from `scraped/*.html`
2. Extracts title, description, content (same logic as existing script)
3. Writes `src/content/pages/{slug}.md` with frontmatter + body
4. Does NOT write any `.astro` files—those are created separately as templates that call `getEntry('pages', slug)`

---

## 6. Decap CMS Config (`public/admin/config.yml`)

```yaml
local_backend: true   # Enables local dev with decap-server (no GitHub auth)

backend:
  name: github
  repo: YOUR_ORG/YOUR_REPO
  branch: main
  base_url: https://your-site.pages.dev
  auth_endpoint: api/auth

media_folder: astro-site/public/images
public_folder: /images

collections:
  - name: "pages"
    label: "Pages"
    folder: "astro-site/src/content/pages"
    create: true
    slug: "{{slug}}"
    fields:
      - {label: "Title", name: "title", widget: "string"}
      - {label: "Description", name: "description", widget: "text"}
      - {label: "Hero Title", name: "heroTitle", widget: "string", required: false}
      - {label: "Hero Tagline", name: "heroTagline", widget: "string", required: false}
      - {label: "Publish Date", name: "pubDate", widget: "datetime", required: false}
      - {label: "Body", name: "body", widget: "markdown"}
```

**Replace:** `YOUR_ORG/YOUR_REPO`, `base_url`.

---

## 7. Cloudflare Functions (GitHub OAuth)

### 7.1 `functions/api/auth.js`

```javascript
export async function onRequest(context) {
  const { request, env } = context;
  const client_id = env.GITHUB_CLIENT_ID;

  try {
    const url = new URL(request.url);
    const redirectUrl = new URL('https://github.com/login/oauth/authorize');
    redirectUrl.searchParams.set('client_id', client_id);
    redirectUrl.searchParams.set('redirect_uri', url.origin + '/api/callback');
    redirectUrl.searchParams.set('scope', 'repo user');
    redirectUrl.searchParams.set('state', crypto.getRandomValues(new Uint8Array(12)).join(''));
    return Response.redirect(redirectUrl.href, 301);
  } catch (error) {
    console.error(error);
    return new Response(error.message, { status: 500 });
  }
}
```

### 7.2 `functions/api/callback.js`

```javascript
function renderBody(status, content) {
  const html = `
  <script>
  const receiveMessage = (message) => {
    window.opener.postMessage(
      'authorization:github:${status}:${JSON.stringify(content)}',
      message.origin
    );
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
  </script>
  `;
  return new Blob([html]);
}

export async function onRequest(context) {
  const { request, env } = context;
  const client_id = env.GITHUB_CLIENT_ID;
  const client_secret = env.GITHUB_CLIENT_SECRET;

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'cloudflare-github-oauth',
        accept: 'application/json',
      },
      body: JSON.stringify({ client_id, client_secret, code }),
    });
    const result = await response.json();
    if (result.error) {
      return new Response(renderBody('error', result), {
        headers: { 'content-type': 'text/html;charset=UTF-8' },
        status: 401,
      });
    }
    const responseBody = renderBody('success', { token: result.access_token, provider: 'github' });
    return new Response(responseBody, {
      headers: { 'content-type': 'text/html;charset=UTF-8' },
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(error.message, { status: 500 });
  }
}
```

---

## 8. GitHub OAuth App

1. [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers) → **New OAuth App**
2. **Homepage URL:** `https://your-site.pages.dev`
3. **Authorization callback URL:** `https://your-site.pages.dev/api/callback`  
   ⚠️ **Must be `/api/callback`** (not `/api/auth/callback`)—matches `auth.js` redirect_uri
4. Copy **Client ID** and **Client Secret**

---

## 9. Cloudflare Pages

1. **Connect:** GitHub repo → Cloudflare Pages → Create project
2. **Build:** `npm run build`, output `dist`, root `astro-site` (if applicable)
3. **Env vars:** `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
4. **Functions:** Cloudflare auto-deploys `functions/` from project root

---

## 10. Local Development

GitHub OAuth does **not** run on localhost (Cloudflare Functions not active). Use **local backend**:

1. **Terminal 1:** `npx decap-server` (from repo root)
2. **Terminal 2:** `cd astro-site && npm run dev`
3. **Visit:** `http://localhost:4321/admin`

If you see GitHub login, decap-server isn't running.

---

## 11. Conversion Script Checklist

When building the HTML→content conversion script:

- [ ] **Skip tag archive pages** – Do not convert files with `__tag__` in the filename (e.g. `bsp-news__tag__Bakken+Production.html`)
- [ ] Output to `src/content/pages/*.md`, not `src/pages/*.astro`
- [ ] Frontmatter: `title`, `description` (required)
- [ ] Body: cleaned HTML or Markdown
- [ ] Strip Brizzy: `data-brz-*`, `data-uniq-id`, `data-generated-css`
- [ ] Replace image URLs via image-map
- [ ] Convert internal links to `/path` (no .html)
- [ ] Create corresponding Astro pages that use `getEntry('pages', slug)` and `render()`

---

## 12. Summary Checklist

- [ ] Decap CMS admin at `/admin` (index.html + config.yml)
- [ ] Cloudflare Functions: `auth.js`, `callback.js`
- [ ] Content collections: `src/content/pages/`, schema in config
- [ ] Astro pages render from content via `getEntry` + `render`
- [ ] Conversion script outputs Markdown to `content/pages/`
- [ ] GitHub OAuth App with callback `https://yoursite.com/api/callback`
- [ ] Cloudflare env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- [ ] `local_backend: true` in config for local dev with decap-server
- [ ] Sitemap integration (see Section 13)
- [ ] Run `npm run download-images` before conversion (see Section 4)
- [ ] Exclude tag archive pages from conversion (see Section 5.2a)

---

## 13. Sitemap

Add `@astrojs/sitemap` for SEO. The sitemap is generated at build time and includes all pages.

**Install:**
```bash
npm install @astrojs/sitemap
```

**astro.config.mjs:**
```javascript
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://your-site.com',  // Required for sitemap
  integrations: [sitemap()],
});
```

**Output:** `sitemap-index.xml` (and per-section sitemaps) at build. Add to `robots.txt`:
```
Sitemap: https://your-site.com/sitemap-index.xml
```

**Redirect:** Some crawlers expect `/sitemap.xml`. Add to `public/_redirects`:
```
/sitemap.xml /sitemap-index.xml 301
```

---

## 14. Related Documentation

- **DEPLOYMENT_AND_SETUP.md** – Cloudflare Pages, custom domain, Decap details
- **README_CMS.md** – Decap CMS config, collections, troubleshooting
- **BUILD_STEPS.md** – Build history, migration scripts
- **MIGRATION.md** – Content cleanup, Brizzy patterns
