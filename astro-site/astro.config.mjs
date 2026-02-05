// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// For localhost development - update to https://mineralwise.com when domain is ready
	site: 'http://localhost:4321',
	output: 'static', // Use 'static' for localhost, change to 'server' when deploying to Cloudflare Pages
	integrations: [mdx(), sitemap()],
});
