# Deployment & Setup Guide

Cloudflare Pages deployment and Decap CMS setup.

**For a new site built from scraped HTML with Decap as a core requirement**, see **[DECAP_FIRST_BUILD_GUIDE.md](../DECAP_FIRST_BUILD_GUIDE.md)** in the repo root. That guide covers content-first architecture, conversion to Markdown, and frontend editing from day one.

---

## Part 1: Cloudflare Pages Deployment

### Prerequisites

- Cloudflare account
- GitHub repository with your Astro site
- Domain (optional; can use Cloudflare Pages preview URL)

### Deploy with Preview URL

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial Astro site"
   git push origin main
   ```

2. **Connect to Cloudflare Pages**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages → Create a project
   - Connect your GitHub repository and branch (`main`)

3. **Build Settings**
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `astro-site` (if Astro site is in subdirectory)

4. **Deploy** — Cloudflare provides a preview URL (e.g. `your-site.pages.dev`)

### Custom Domain

1. In Pages project settings → Custom domains → Set up a custom domain
2. Enter domain (e.g. `mineralwise.com`) and follow DNS instructions
3. Update `astro.config.mjs`: `site: 'https://mineralwise.com'`
4. Point DNS to Cloudflare; SSL is automatic

### Server-Side Features (Cloudflare Workers)

If you need SSR or API routes:

```bash
npm install @astrojs/cloudflare
```

```javascript
// astro.config.mjs
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  site: 'https://mineralwise.com',
  integrations: [mdx(), sitemap()],
});
```

### Environment Variables

Cloudflare Pages → Settings → Environment variables. Add variables (e.g. `PUBLIC_API_URL`) and redeploy.

### Troubleshooting

- **Build fails:** Check logs; verify `package.json` dependencies; Node 18+
- **Images not loading:** Ensure images in `public/images/`; run `npm run download-images` if needed
- **Links broken:** Use relative paths (`/about` not `about.html`)

### Sitemap

Add `@astrojs/sitemap` for SEO. Requires `site` in `astro.config.mjs`. Output: `sitemap-index.xml`. Add redirect `/sitemap.xml` → `/sitemap-index.xml` in `_redirects`.

### Local Testing

```bash
npm run build
npm run preview
npm run dev
```

---

## Part 2: Decap CMS (Required for Content Editing)

Decap CMS edits Markdown content collections. Content must live in `src/content/` (e.g. `pages/`, `blog/`) so it can be edited from the **frontend admin** at `/admin`, not through the code editor. For a **Decap-first** build from scraped HTML, see **DECAP_FIRST_BUILD_GUIDE.md**.

### What's Configured

- **Admin:** `/admin`
- **Collections:** Blog (`src/content/blog/`), Pages (`src/content/pages/` for future use), Navigation
- **Auth:** GitHub OAuth via Cloudflare Functions proxy

### Setup Steps

1. **Create GitHub OAuth App**
   - [GitHub Settings → OAuth Apps](https://github.com/settings/developers) → New OAuth App
   - Homepage URL: `https://your-site.pages.dev`
   - **Authorization callback URL:** `https://your-site.pages.dev/api/callback` (must be `/api/callback`, not `/api/auth/callback`)
   - Copy Client ID and Client Secret

2. **Cloudflare Environment Variables**
   - Pages → Settings → Environment variables
   - Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`

3. **Update Config**
   - Edit `public/admin/config.yml`
   - Set `base_url` to your Cloudflare Pages URL

4. **Access Admin**
   - Deploy site → Visit `https://your-site.pages.dev/admin` → Login with GitHub

### Content Structure

| Collection | Location | Status |
|------------|----------|--------|
| Blog | `src/content/blog/` | In use |
| Pages | `src/content/pages/` | Future use (main site uses `src/pages/*.astro`) |
| Navigation | `src/data/navigation.ts` | Verify file exists and Header uses it |

### Local Development

```bash
npm run dev
# Visit http://localhost:4321/admin
```

OAuth works only on deployed Cloudflare Pages, not localhost.

### Troubleshooting

- **OAuth not working:** Check callback URL, env vars, `functions/api/auth.js`
- **Can't save:** Verify GitHub token has `repo` scope; check repo permissions
- **Admin not loading:** Verify `public/admin/index.html` exists; check console

### Customizing

Edit `public/admin/config.yml` to add collections, modify fields, change content locations. See [Decap CMS docs](https://decapcms.org/docs/configuration-options/).
