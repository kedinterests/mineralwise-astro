# Cloudflare Pages Deployment Guide

## Prerequisites

- Cloudflare account
- GitHub repository with your Astro site
- Domain (optional - can use Cloudflare Pages preview URL)

## Deployment Steps

### Option 1: Deploy with Preview URL (No Domain Required)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Initial Astro site"
   git push origin main
   ```

2. **Connect to Cloudflare Pages**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to Pages → Create a project
   - Connect your GitHub repository
   - Select the repository and branch (usually `main`)

3. **Configure Build Settings**
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `astro-site` (if your Astro site is in a subdirectory)

4. **Deploy**
   - Click "Save and Deploy"
   - Cloudflare will provide a preview URL (e.g., `your-site.pages.dev`)

### Option 2: Deploy with Custom Domain

1. **Follow Option 1 steps first** to get your site deployed

2. **Add Custom Domain**
   - In Cloudflare Pages project settings, go to "Custom domains"
   - Click "Set up a custom domain"
   - Enter your domain (e.g., `mineralwise.com`)
   - Follow DNS configuration instructions

3. **Update Astro Config**
   - Update `astro.config.mjs`:
   ```javascript
   export default defineConfig({
     site: 'https://mineralwise.com', // Your domain
     output: 'static', // or 'server' if using server-side features
     integrations: [mdx(), sitemap()],
   });
   ```

4. **Update DNS**
   - Point your domain's DNS to Cloudflare Pages
   - Cloudflare will automatically provision SSL certificate

## Using Cloudflare Workers (Server-Side Features)

If you need server-side rendering or API routes:

1. **Install Cloudflare Adapter**
   ```bash
   npm install @astrojs/cloudflare
   ```

2. **Update astro.config.mjs**
   ```javascript
   import cloudflare from '@astrojs/cloudflare';
   
   export default defineConfig({
     output: 'server',
     adapter: cloudflare(),
     site: 'https://mineralwise.com',
     integrations: [mdx(), sitemap()],
   });
   ```

3. **Create wrangler.toml** (optional, for local testing)
   ```toml
   name = "mineralwise-astro"
   compatibility_date = "2024-01-01"
   pages_build_output_dir = "dist"
   ```

## Environment Variables

If you need environment variables:

1. Go to Cloudflare Pages project settings
2. Navigate to "Environment variables"
3. Add your variables (e.g., `PUBLIC_API_URL`)
4. Redeploy your site

## Continuous Deployment

Cloudflare Pages automatically deploys on every push to your main branch. You can also:

- Set up preview deployments for pull requests
- Configure branch deployments for staging environments
- Use Cloudflare's deployment previews to test before going live

## Troubleshooting

### Build Fails
- Check build logs in Cloudflare Pages dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Cloudflare uses Node 18+ by default)

### Images Not Loading
- Ensure images are in `public/images/` directory
- Run `npm run download-images` if images haven't been downloaded yet
- Check image paths in generated pages

### Links Not Working
- Verify all internal links use relative paths (e.g., `/about` not `about.html`)
- Check that pages were generated correctly with `npm run convert-html`

## Local Testing Before Deployment

```bash
# Build locally
npm run build

# Preview build
npm run preview

# Test on localhost
npm run dev
```
