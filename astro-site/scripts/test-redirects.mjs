/**
 * Verifies functions/_middleware.js against the routes that actually exist.
 *
 * Run:  node scripts/test-redirects.mjs
 *
 * Checks, in order:
 *   1. no live page is redirected away from itself
 *   2. Pages Functions and static assets are never rewritten
 *   3. paths that should stay 404 still do (bot probes, dead news archive,
 *      Astro starter-template debris)
 *   4. every redirect lands on a page that exists — no redirect-to-404, which
 *      is the failure that cost the site its rankings
 *   5. the legacy URL inventory resolves as expected
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = path.join(ROOT, 'src/pages');

const mw = await import(path.join(ROOT, 'functions/_middleware.js'));

function walk(dir, acc = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, acc);
		else acc.push(full);
	}
	return acc;
}

const routes = new Set(
	walk(PAGES)
		.filter((f) => /\.(astro|md|mdx)$/.test(f) && !f.includes('['))
		.map((f) =>
			'/' + path.relative(PAGES, f).replace(/\.(astro|md|mdx)$/, '').replace(/\/index$/, '').replace(/^index$/, '')
		)
		.map((r) => (r === '/' ? '/' : r.replace(/\/$/, '')))
);
for (const r of ['/404', '/rss.xml', '/robots.txt', '/llms.txt']) routes.delete(r);

const NEXT = Symbol('next');
async function hit(pathname, origin = 'https://mineralwise.com') {
	const res = await mw.onRequest({
		request: new Request(origin + pathname),
		next: async () => NEXT,
	});
	if (res === NEXT) return null;
	return new URL(res.headers.get('location')).pathname.replace(/\/$/, '') || '/';
}

async function hitFull(url) {
	const res = await mw.onRequest({ request: new Request(url), next: async () => NEXT });
	return res === NEXT ? null : res.headers.get('location');
}

const failures = [];
const fail = (label, detail) => failures.push(`${label}: ${detail}`);

// 1. live pages must serve themselves, with or without a trailing slash
for (const route of routes) {
	for (const variant of route === '/' ? ['/'] : [route, route + '/']) {
		const got = await hit(variant);
		if (got !== null) fail('live page redirected', `${variant} -> ${got}`);
	}
}

// 2. passthroughs
for (const p of [
	'/api/geo', '/api/subscribe', '/_astro/app.css', '/admin', '/admin/',
	'/robots.txt', '/sitemap-index.xml', '/images/pugh.jpg', '/rss.xml', '/llms.txt',
]) {
	const got = await hit(p);
	if (got !== null) fail('passthrough rewritten', `${p} -> ${got}`);
}

// 3. must keep 404ing
for (const p of [
	'/blog/first-post', '/blog/using-mdx/', '/wp-login.php', '/xmlrpc.php',
	'/account', '/static', '/news/west-virginia-gives-up-on-forced-pooling',
]) {
	const got = await hit(p);
	if (got !== null) fail('should 404', `${p} -> ${got}`);
}

// 4 + 5. the whole legacy inventory: every redirect must land on a real page
const legacy = fs
	.readFileSync(path.join(ROOT, 'scripts/legacy-urls.txt'), 'utf8')
	.split('\n').map((s) => s.trim()).filter(Boolean);

let redirected = 0;
let untouched = 0;
for (const raw of legacy) {
	const got = await hit(raw);
	if (got === null) { untouched++; continue; }
	redirected++;
	if (!routes.has(got)) fail('redirect to 404', `${raw} -> ${got}`);
}

// The specific URLs Search Console reported as 404s on 20 Aug 2026.
const REGRESSIONS = {
	'/oil-and-gas-terms/fracking/': '/resources/oil-and-gas-terms/fracking-hydraulic-fracturing-fracture-fracing-frac-job',
	'/oil-and-gas-terms/drilling-mud/': '/resources/oil-and-gas-terms/drilling-mud-drilling-fluid',
	'/oil-and-gas-terms/plugging-and-abandonment/': '/resources/oil-and-gas-terms/p-and-a-or-plug-and-abandon',
	'/oil-and-gas-operators/anadarko-petroleum/': '/anadarko-petroleum',
	'/resources/oil-and-gas-terms/fracking/': '/resources/oil-and-gas-terms/fracking-hydraulic-fracturing-fracture-fracing-frac-job',
	'/depletion-allowance-2': '/resources/oil-and-gas-terms/depletion-allowance',
	'/depletion-allowance-2/': '/resources/oil-and-gas-terms/depletion-allowance',
	'/home': '/',
	'/home/': '/',
	'/owners-guide/unleased-mineral-owner/mineral-rights-value': '/mineral-rights-value',
	'/owners-guide/leased-and-producing/royalty-taxes/ad-valorem-taxes': '/ad-valorem-taxes',
	'/directory/shale-plays/marcellus-shale-pennsylvania': '/resources/shale-plays/marcellus-shale-pennsylvania',
	'/library/oil-and-gas-abbreviations': '/resources/oil-and-gas-abbreviations',
	'/library/oil-and-gas-terms/farm-in-definition': '/resources/oil-and-gas-terms/farm-in',
	'/resources/oil-and-gas-terms/a/': '/resources/oil-and-gas-terms',
	'/contact-us-2/': '/contact-us',
};
for (const [from, want] of Object.entries(REGRESSIONS)) {
	const got = await hit(from);
	if (got !== want) fail('regression', `${from} -> ${got} (expected ${want})`);
}

// 6. www must consolidate onto the apex with the path and query intact
const WWW = {
	'https://www.mineralwise.com/': 'https://mineralwise.com/',
	'https://www.mineralwise.com/resources/oil-and-gas-terms/royalty/':
		'https://mineralwise.com/resources/oil-and-gas-terms/royalty/',
	'https://www.mineralwise.com/oil-and-gas-terms/fracking/?utm_source=x':
		'https://mineralwise.com/oil-and-gas-terms/fracking/?utm_source=x',
};
for (const [from, want] of Object.entries(WWW)) {
	const got = await hitFull(from);
	if (got !== want) fail('www consolidation', `${from} -> ${got} (expected ${want})`);
}

// query strings must survive a content redirect
const withQuery = await hitFull('https://mineralwise.com/oil-and-gas-terms/fracking/?utm_source=x');
if (!withQuery || !withQuery.endsWith('?utm_source=x')) {
	fail('query dropped', `/oil-and-gas-terms/fracking/?utm_source=x -> ${withQuery}`);
}

console.log(`routes: ${routes.size}`);
console.log(`legacy URLs: ${legacy.length} | redirected: ${redirected} | left alone: ${untouched}`);
if (failures.length) {
	console.error(`\n${failures.length} FAILURES`);
	for (const f of failures) console.error('  ' + f);
	process.exit(1);
}
console.log('\nAll redirect checks passed.');
