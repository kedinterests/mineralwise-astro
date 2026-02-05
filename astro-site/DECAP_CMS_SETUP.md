# Decap CMS Setup Guide

Decap CMS has been installed and configured for your MineralWise Astro site!

## What's Been Set Up

✅ **Admin Interface** - Available at `/admin`  
✅ **GitHub OAuth** - Authentication via GitHub  
✅ **Content Collections** - Pages, Blog Posts, Navigation  
✅ **Cloudflare Functions** - OAuth proxy for authentication  

## Setup Steps

### 1. Create GitHub OAuth App

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: `MineralWise CMS`
   - **Homepage URL**: `https://your-site.pages.dev` (or your Cloudflare Pages URL)
   - **Authorization callback URL**: `https://your-site.pages.dev/api/auth/callback`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**

### 2. Configure Cloudflare Pages Environment Variables

1. Go to your Cloudflare Pages project dashboard
2. Navigate to **Settings → Environment variables**
3. Add these variables:
   - `GITHUB_CLIENT_ID` = Your GitHub OAuth Client ID
   - `GITHUB_CLIENT_SECRET` = Your GitHub OAuth Client Secret
4. Make sure they're set for **Production** environment

### 3. Update Config File

Edit `public/admin/config.yml` and update:
- `base_url`: Change `https://your-site.pages.dev` to your actual Cloudflare Pages URL
- Adjust collections as needed for your content structure

### 4. Access the Admin Dashboard

1. Deploy your site to Cloudflare Pages
2. Visit `https://your-site.pages.dev/admin`
3. Click "Login with GitHub"
4. Authorize the app
5. Start editing content!

## Content Structure

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

## Local Development

For local development, you can use Netlify Dev or test the admin interface:

```bash
# Start dev server
npm run dev

# Visit http://localhost:4321/admin
```

**Note**: OAuth will only work on your deployed Cloudflare Pages site, not localhost.

## Troubleshooting

### OAuth Not Working
- Verify GitHub OAuth app callback URL matches your Cloudflare Pages URL
- Check environment variables are set correctly
- Ensure Cloudflare Functions are deployed (`functions/api/auth.js`)

### Can't Save Changes
- Verify GitHub token has `repo` scope
- Check repository permissions
- Ensure you're logged in with a GitHub account that has write access

### Admin Page Not Loading
- Verify `public/admin/index.html` exists
- Check browser console for errors
- Ensure Decap CMS script is loading

## Next Steps

1. **Deploy to Cloudflare Pages** (if not already deployed)
2. **Set up GitHub OAuth** (follow steps above)
3. **Configure environment variables** in Cloudflare
4. **Test the admin interface** at `/admin`
5. **Customize collections** in `config.yml` as needed

## Customizing Collections

Edit `public/admin/config.yml` to:
- Add new collections
- Modify fields
- Change content locations
- Add custom widgets

See [Decap CMS Documentation](https://decapcms.org/docs/configuration-options/) for more options.
