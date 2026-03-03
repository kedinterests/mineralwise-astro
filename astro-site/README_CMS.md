# Decap CMS Setup Complete! 🎉

Decap CMS has been successfully installed and configured for your MineralWise Astro site.

## ✅ What's Been Set Up

1. **Decap CMS Package** - Installed and ready
2. **Admin Interface** - Available at `/admin` (after deployment)
3. **GitHub OAuth** - Authentication configured via Cloudflare Functions
4. **Content Collections** - Pages, Blog Posts, and Navigation
5. **Cloudflare Functions** - OAuth proxy for authentication

## 📋 Next Steps to Complete Setup

### Step 1: Create GitHub OAuth App

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name**: `MineralWise CMS`
   - **Homepage URL**: `https://your-site.pages.dev` (replace with your Cloudflare Pages URL)
   - **Authorization callback URL**: `https://your-site.pages.dev/api/callback` (must be `/api/callback`, not `/api/auth/callback`)
4. Click **"Register application"**
5. **Copy the Client ID** and **generate a Client Secret**

### Step 2: Configure Cloudflare Pages Environment Variables

1. Go to your Cloudflare Pages project dashboard
2. Navigate to **Settings → Environment variables**
3. Add these variables (for Production):
   - `GITHUB_CLIENT_ID` = Your GitHub OAuth Client ID
   - `GITHUB_CLIENT_SECRET` = Your GitHub OAuth Client Secret
4. Save the variables

### Step 3: Update Config File

Edit `public/admin/config.yml`:
- Change `base_url: https://your-site.pages.dev` to your actual Cloudflare Pages URL
- Adjust collections as needed for your content structure

### Step 4: Deploy and Test

1. **Commit and push** your changes to GitHub
2. **Deploy** to Cloudflare Pages (should happen automatically)
3. Visit `https://your-site.pages.dev/admin`
4. Click **"Login with GitHub"**
5. Authorize the app
6. Start editing content!

## 📁 File Structure

**Bakken project:** Scraped files at `/Users/chrismalone/Documents/bakken/scraped`

```
astro-site/
├── public/
│   └── admin/
│       ├── index.html          # Admin interface
│       └── config.yml          # CMS configuration
├── functions/
│   └── api/
│       └── auth.js            # OAuth authentication handler
└── src/
    └── content/
        ├── pages/              # Editable pages (will be created)
        └── blog/               # Blog posts (already exists)
```

## 🎨 Content Collections

### Pages Collection
- **Location**: `src/content/pages/`
- **Format**: Markdown files
- **Fields**: Title, Description, Publish Date, Body

### Blog Collection
- **Location**: `src/content/blog/`
- **Format**: Markdown files  
- **Fields**: Title, Description, Publish Date, Updated Date, Hero Image, Body

### Navigation Collection
- **Location**: `src/data/navigation.ts`
- **Format**: TypeScript file
- **Fields**: Navigation items with title, href, children

## 🔧 Local Development

The `/api/auth` and `/api/callback` endpoints are Cloudflare Functions—they **don't run** during `astro dev`. So GitHub OAuth will not work on localhost.

To use the CMS locally, use the **local backend** (already enabled in `config.yml`):

1. **Start decap-server** (from the repo root, in a separate terminal):
   ```bash
   npx decap-server
   ```
   Runs on port 8081 by default.

2. **Start Astro**:
   ```bash
   cd astro-site && npm run dev
   ```

3. **Visit** `http://localhost:4321/admin` (or `/admin/index.html`)

4. Decap will use the local proxy instead of GitHub—no auth required.

**Note**: If you see a GitHub login prompt instead, decap-server isn't running. Start it first.

## 🐛 Troubleshooting

### OAuth Not Working
- ✅ Verify GitHub OAuth app callback URL matches your Cloudflare Pages URL exactly
- ✅ Check environment variables are set correctly in Cloudflare
- ✅ Ensure Cloudflare Functions are deployed (`functions/api/auth.js` exists)

### Can't Save Changes
- ✅ Verify GitHub token has `repo` scope
- ✅ Check repository permissions
- ✅ Ensure you're logged in with a GitHub account that has write access

### Admin Page Not Loading
- ✅ Verify `public/admin/index.html` exists
- ✅ Check browser console for errors
- ✅ Ensure Decap CMS script is loading from CDN

## 📚 Additional Resources

- [Decap CMS Documentation](https://decapcms.org/docs/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/platform/functions/)
- [GitHub OAuth Apps](https://docs.github.com/en/apps/oauth-apps)

## 🎯 Quick Start Checklist

- [ ] Create GitHub OAuth App
- [ ] Set Cloudflare environment variables
- [ ] Update `config.yml` with your site URL
- [ ] Deploy to Cloudflare Pages
- [ ] Test admin interface at `/admin`
- [ ] Create your first content!

---

**Need help?** See `DEPLOYMENT_AND_SETUP.md` Part 2 for Decap CMS details.
