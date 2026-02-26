// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import UnoCSS from 'unocss/astro';
import tailwind from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// Set PUBLIC_SITE_URL when building for production (e.g. https://yourdomain.com)
const siteUrl = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';

// https://astro.build/config
export default defineConfig({
	site: siteUrl,
	output: 'static', // Use 'static' for localhost, change to 'server' when deploying to Cloudflare Pages
	integrations: [UnoCSS(), mdx(), sitemap()],
	vite: {
		plugins: [tailwind()],
	},
});
