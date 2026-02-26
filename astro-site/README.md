# MineralWise Astro Site

Modern Astro site converted from scraped HTML files.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:4321` to see your site.

### SEO Validation

Run the metadata/schema audit before deploy:

```bash
npm run seo:audit
```

This check ensures each Astro page uses `BaseLayout` or `BaseHead`, verifies required `title` and `description` props, and flags likely placeholder metadata.

## Migration Scripts

### 1. Download Images

Download all images from the scraped HTML files:

```bash
npm run download-images
```

This will:
- Extract image URLs from all HTML files
- Download images to `public/images/`
- Create `src/data/image-map.json` mapping original URLs to local paths

### 2. Convert HTML to Astro Pages

Convert scraped HTML files to Astro pages:

```bash
npm run convert-html
```

This will:
- Parse all HTML files in the `scraped/` directory
- Extract titles, descriptions, and content
- Clean up Brizy-specific markup
- Convert links and images
- Generate Astro pages in `src/pages/`

## Project Structure

```
astro-site/
├── public/
│   └── images/          # Downloaded images
├── scripts/
│   ├── download-images.js      # Image download script
│   └── convert-html-to-astro.js # HTML conversion script
├── src/
│   ├── components/
│   │   ├── Header.astro         # Site header with logo
│   │   ├── Navigation.astro     # Main navigation
│   │   ├── NavDropdown.astro    # Dropdown menu component
│   │   ├── Footer.astro         # Site footer
│   │   └── Image.astro           # Optimized image component
│   ├── data/
│   │   ├── navigation.ts        # Navigation structure
│   │   └── image-map.json        # Image URL mapping (generated)
│   ├── layouts/
│   │   └── BaseLayout.astro     # Base page layout
│   ├── pages/                    # Astro pages (generated)
│   └── styles/
│       ├── starwind.css          # Single source of truth for styles/tokens/typography
│       └── tailwind.css          # Utility framework entry
└── scraped/                      # Original HTML files
```

## Migration

See [MIGRATION.md](./MIGRATION.md) for the full migration guide (plan, tracker, content cleanup, hierarchy).

## Deployment

See [DEPLOYMENT_AND_SETUP.md](./DEPLOYMENT_AND_SETUP.md) for Cloudflare Pages deployment and optional Decap CMS setup.

## Features

- ✅ Modern Astro architecture
- ✅ Responsive navigation with dropdowns
- ✅ Image optimization and local storage
- ✅ Clean, maintainable CSS
- ✅ SEO-friendly meta tags
- ✅ Sitemap generation
- ✅ Ready for Cloudflare Pages deployment

## Next Steps

1. Run `npm run download-images` to download all images
2. Run `npm run convert-html` to convert HTML files to Astro pages
3. Review and refine converted pages as needed
4. Test locally with `npm run dev`
5. Deploy to Cloudflare Pages (see DEPLOYMENT_AND_SETUP.md)

## Notes

- The conversion scripts clean up Brizy page builder markup
- Some manual cleanup may be needed for complex pages
- Images are downloaded from the original CDN URLs
- Navigation structure is extracted from HTML and stored in `src/data/navigation.ts`
