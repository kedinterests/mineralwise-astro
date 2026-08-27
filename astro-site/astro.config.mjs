// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import UnoCSS from 'unocss/astro';
import tailwind from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// Must be set for production builds. A build without it emits localhost
// canonicals, sitemap entries and JSON-LD. It lives in wrangler.toml [vars]
// rather than as a dashboard secret so the value stays reviewable.
const siteUrl = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';

// Utility pages: real routes, but nothing we want Google spending crawl budget on.
// Content redirects are handled in functions/_middleware.js, not here.
const SITEMAP_EXCLUDE = [
	'/admin/',
	'/adstxt/',
	'/search/',
	'/thank-you/',
	'/offer/',
];

// https://astro.build/config
export default defineConfig({
	site: siteUrl,
	output: 'static',
	integrations: [
		UnoCSS(),
		mdx(),
		sitemap({
			filter: (page) => {
				const pathname = new URL(page).pathname;
				return !SITEMAP_EXCLUDE.includes(pathname);
			},
		}),
	],
	vite: {
		plugins: [tailwind()],
	},
});
