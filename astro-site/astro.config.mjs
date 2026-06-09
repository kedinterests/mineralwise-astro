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
	output: 'hybrid',
	integrations: [
		UnoCSS(),
		mdx(),
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
	vite: {
		plugins: [tailwind()],
	},
});
