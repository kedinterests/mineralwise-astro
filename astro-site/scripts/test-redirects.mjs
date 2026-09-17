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
 *   5. the legacy URL inventory resolves as expected, with and without a
 *      trailing slash
 *   6. every retired single-term glossary URL redirects, in one hop, to its
 *      letter page and anchor, and that anchor is a real term on that page
 *   7. no chains: no rule's destination is itself a redirected URL
 *   8. www consolidates onto the apex in the same single hop
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { letterFor, letterPath } from '../src/data/glossary-rules.mjs';

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

// Glossary letter pages come from a dynamic route, one per letter that has terms.
// Read the collection directly so this test does not trust the generator's view.
const TERMS_DIR = path.join(ROOT, 'src/content/terms');
const anchorsByPage = new Map(); // letter page -> Set of anchors rendered on it
const pageOfAnchor = new Map(); // anchor -> letter page
for (const file of fs.readdirSync(TERMS_DIR)) {
	if (!file.endsWith('.json')) continue;
	const anchor = file.replace(/\.json$/, '');
	const { term } = JSON.parse(fs.readFileSync(path.join(TERMS_DIR, file), 'utf8'));
	const page = letterPath(letterFor(term));
	if (!anchorsByPage.has(page)) anchorsByPage.set(page, new Set());
	anchorsByPage.get(page).add(anchor);
	pageOfAnchor.set(anchor, page);
	routes.add(page);
}

const NEXT = Symbol('next');
async function hit(pathname, origin = 'https://mineralwise.com') {
	const res = await mw.onRequest({
		request: new Request(origin + pathname),
		next: async () => NEXT,
	});
	if (res === NEXT) return null;
	return new URL(res.headers.get('location')).pathname.replace(/\/$/, '') || '/';
}

/** Like hit(), but keeps the anchor: '/resources/oil-and-gas-terms/p#pugh-clause'. */
async function hitDest(pathname) {
	const location = await hitFull('https://mineralwise.com' + pathname);
	if (location === null) return null;
	const u = new URL(location);
	return (u.pathname.replace(/\/$/, '') || '/') + u.hash;
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
	'/robots.txt', '/sitemap-index.xml', '/sitemap-0.xml', '/images/pugh.jpg', '/rss.xml', '/llms.txt',
	'/favicon.ico', '/admin/config.yml', '/fonts/x.woff2',
]) {
	const got = await hit(p);
	if (got !== null) fail('passthrough rewritten', `${p} -> ${got}`);
}

// 3. must keep 404ing
for (const p of [
	'/blog/first-post', '/blog/using-mdx/', '/wp-login.php', '/xmlrpc.php',
	'/account', '/static', '/news/west-virginia-gives-up-on-forced-pooling',
	'/zzz-not-a-page', '/zzz-not-a-page/', '/resources/oil-and-gas-terms/zzz-not-a-term',
	'/resources/oil-and-gas-terms/zzz-not-a-term/', '/oil-and-gas-terms/zzz-not-a-term',
	'/resources/oil-and-gas-terms/p/zzz', '/what-is-fracking/zzz',
]) {
	const got = await hit(p);
	if (got !== null) fail('should 404', `${p} -> ${got}`);
}

// 4 + 5. the whole legacy inventory: every redirect must land on a real page
const legacy = fs
	.readFileSync(path.join(ROOT, 'scripts/legacy-urls.txt'), 'utf8')
	.split('\n').map((s) => s.trim()).filter(Boolean);

/** A destination is sound when its page exists and its anchor, if any, is a term on that page. */
function checkDestination(label, from, dest) {
	const [page, anchor] = dest.split('#');
	if (!routes.has(page)) fail('redirect to 404', `${label} ${from} -> ${dest}`);
	if (anchor !== undefined && !(anchorsByPage.get(page) || new Set()).has(anchor)) {
		fail('redirect to missing anchor', `${label} ${from} -> ${dest}`);
	}
}

/** One hop: the place a redirect lands must not redirect again. */
async function checkNoSecondHop(label, from, dest) {
	const page = dest.split('#')[0];
	for (const variant of page === '/' ? ['/'] : [page, page + '/']) {
		const again = await hitDest(variant);
		if (again !== null) fail('redirect chain', `${label} ${from} -> ${dest} -> ${again}`);
	}
}

let redirected = 0;
let untouched = 0;
for (const raw of legacy) {
	const bare = raw.replace(/\/+$/, '');
	const variants = bare === '' ? ['/'] : [bare, bare + '/'];
	const results = [];
	for (const variant of variants) {
		const got = await hitDest(variant);
		results.push(got);
		if (got === null) continue;
		checkDestination('legacy', variant, got);
		await checkNoSecondHop('legacy', variant, got);
	}
	if (results.length === 2 && results[0] !== results[1]) {
		fail('slash variants disagree', `${variants[0]} -> ${results[0]} but ${variants[1]} -> ${results[1]}`);
	}
	if (results[0] === null) untouched++;
	else redirected++;
}

// 6. every retired single-term URL goes straight to its term on a letter page
const retiredTermUrls = JSON.parse(
	fs.readFileSync(path.join(ROOT, 'scripts/retired-term-urls.json'), 'utf8')
);
const legacySet = new Set(legacy.map((u) => u.replace(/\/+$/, '')));
for (const [retiredPath, anchor] of Object.entries(retiredTermUrls)) {
	if (routes.has(retiredPath)) fail('retired URL is still a page', retiredPath);
	if (!legacySet.has(retiredPath)) fail('retired URL missing from legacy-urls.txt', retiredPath);
	const page = pageOfAnchor.get(anchor);
	if (!page) {
		fail('retired URL has no term', `${retiredPath} -> #${anchor}`);
		continue;
	}
	for (const variant of [retiredPath, retiredPath + '/']) {
		const location = await hitFull('https://mineralwise.com' + variant);
		const want = `https://mineralwise.com${page}/#${anchor}`;
		if (location !== want) fail('retired term URL', `${variant} -> ${location} (expected ${want})`);
	}
}

// 7. no chains anywhere in the generated tables, not only for URLs in the inventory
const generated = fs.readFileSync(path.join(ROOT, 'functions/_middleware.js'), 'utf8');
function readTable(name) {
	const match = generated.match(new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n\\});`));
	if (!match) {
		fail('generated file', `could not read the ${name} table`);
		return {};
	}
	return JSON.parse(match[1]);
}
const REDIRECTS_TABLE = readTable('REDIRECTS');
const SLUGS_TABLE = readTable('SLUGS');
let rulesChecked = 0;
for (const [name, table] of [['REDIRECTS', REDIRECTS_TABLE], ['SLUGS', SLUGS_TABLE]]) {
	for (const [key, dest] of Object.entries(table)) {
		rulesChecked++;
		checkDestination(name, key, dest);
		await checkNoSecondHop(name, key, dest);
		const page = dest.split('#')[0];
		if (retiredTermUrls[page]) fail('rule points at a retired URL', `${name}["${key}"] -> ${dest}`);
	}
}

// The specific URLs Search Console reported as 404s on 20 Aug 2026.
const T = '/resources/oil-and-gas-terms';
const REGRESSIONS = {
	'/oil-and-gas-terms/fracking/': `${T}/f#fracking`,
	'/oil-and-gas-terms/fracking': `${T}/f#fracking`,
	'/oil-and-gas-terms/drilling-mud/': `${T}/d#drilling-mud`,
	'/oil-and-gas-terms/plugging-and-abandonment/': `${T}/p#plug-and-abandon`,
	'/oil-and-gas-operators/anadarko-petroleum/': '/anadarko-petroleum',
	'/oil-and-gas-operators/anadarko-petroleum': '/anadarko-petroleum',
	'/resources/oil-and-gas-terms/fracking/': `${T}/f#fracking`,
	'/depletion-allowance-2': `${T}/d#depletion-allowance`,
	'/depletion-allowance-2/': `${T}/d#depletion-allowance`,
	'/home': '/',
	'/home/': '/',
	'/owners-guide/unleased-mineral-owner/mineral-rights-value': '/mineral-rights-value',
	'/owners-guide/leased-and-producing/royalty-taxes/ad-valorem-taxes': '/ad-valorem-taxes',
	'/directory/shale-plays/marcellus-shale-pennsylvania': '/resources/shale-plays/marcellus-shale-pennsylvania',
	'/library/oil-and-gas-abbreviations': '/resources/oil-and-gas-abbreviations',
	'/library/oil-and-gas-terms/farm-in-definition': `${T}/f#farm-in`,
	'/contact-us-2/': '/contact-us',

	// The glossary moved from one page per term to one page per letter (17 Sep 2026).
	// Retired long slugs, the merged duplicate, and the readable aliases:
	'/resources/oil-and-gas-terms/fracking-hydraulic-fracturing-fracture-fracing-frac-job/': `${T}/f#fracking`,
	'/resources/oil-and-gas-terms/hydraulic-fracturing-fracture-fracing-fracking-frac-job': `${T}/f#fracking`,
	'/resources/oil-and-gas-terms/pugh-clause': `${T}/p#pugh-clause`,
	'/resources/oil-and-gas-terms/royalty/': `${T}/r#royalty`,
	'/resources/oil-and-gas-terms/held-by-production-hbp': `${T}/h#held-by-production`,
	'/oil-and-gas-terms/hbp': `${T}/h#held-by-production`,
	'/oil-and-gas-terms/division-order': `${T}/d#division-order`,
	// Squarespace served each term at the site root too.
	'/abandoned-well': `${T}/a#abandoned-well`,
	'/abandoned-well/': `${T}/a#abandoned-well`,
	'/pugh-clause': `${T}/p#pugh-clause`,
	'/acre-feet': `${T}/a#acre-feet`,
	'/gun-barrel-separator': `${T}/g#gun-barrel-separator`,
	// /api-number was a plain 404: the passthrough pattern for /api/ swallowed it.
	'/api-number': `${T}/a#api-number`,
	'/api-number/': `${T}/a#api-number`,
	// Grantor was a stray single-term page at the root; it is now a term on the G page.
	'/grantor': `${T}/g#grantor`,
	'/grantor/': `${T}/g#grantor`,
	// The Squarespace letter pages (/library/.../oil-gas-definitions-p-terms), the
	// Brizy-era stubs (/oil-and-gas-terms-p) and the Astro-era stubs all go to the
	// matching letter page. A letter with no terms has no page: glossary index.
	'/oil-and-gas-terms-p': `${T}/p`,
	'/oil-and-gas-terms-p/': `${T}/p`,
	'/oil-and-gas-terms-a': `${T}/a`,
	'/library/oil-and-gas-terms/oil-gas-definitions-p-terms': `${T}/p`,
	'/library/oil-and-gas-terms/oil-gas-definitions-c-terms/': `${T}/c`,
	'/oil-and-gas-terms/a/': `${T}/a`,
	'/oil-and-gas-terms/a': `${T}/a`,
	'/all-oil-and-gas-terms': T,
	'/library/oil-and-gas-terms': T,
	'/oil-and-gas-terms': T,
};
for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
	const want = anchorsByPage.has(`${T}/${letter}`) ? `${T}/${letter}` : T;
	REGRESSIONS[`/oil-and-gas-terms-${letter}`] = want;
	REGRESSIONS[`/library/oil-and-gas-terms/oil-gas-definitions-${letter}-terms`] = want;
	if (want === T) REGRESSIONS[`${T}/${letter}/`] = T; // no page for this letter, so not a 404 either
}
for (const [from, want] of Object.entries(REGRESSIONS)) {
	const got = await hitDest(from);
	if (got !== want) fail('regression', `${from} -> ${got} (expected ${want})`);
}

// 8. www must consolidate onto the apex with the path and query intact, and a
// www legacy URL must reach its final page in the same hop (not www -> apex -> page)
const WWW = {
	'https://www.mineralwise.com/': 'https://mineralwise.com/',
	'https://www.mineralwise.com/resources/oil-and-gas-terms/royalty/':
		'https://mineralwise.com/resources/oil-and-gas-terms/r/#royalty',
	'https://www.mineralwise.com/royalty-taxes/': 'https://mineralwise.com/royalty-taxes/',
	'https://www.mineralwise.com/resources/oil-and-gas-terms/p/': 'https://mineralwise.com/resources/oil-and-gas-terms/p/',
	'https://www.mineralwise.com/what-is-fracking/?a=1': 'https://mineralwise.com/what-is-fracking/?a=1',
	'https://www.mineralwise.com/api/geo': 'https://mineralwise.com/api/geo',
	'https://www.mineralwise.com/zzz-not-a-page': 'https://mineralwise.com/zzz-not-a-page',
	'https://www.mineralwise.com/oil-and-gas-terms/fracking/?utm_source=x':
		'https://mineralwise.com/resources/oil-and-gas-terms/f/?utm_source=x#fracking',
	'https://www.mineralwise.com/pugh-clause': 'https://mineralwise.com/resources/oil-and-gas-terms/p/#pugh-clause',
	'http://www.mineralwise.com/home': 'https://mineralwise.com/',
};
for (const [from, want] of Object.entries(WWW)) {
	const got = await hitFull(from);
	if (got !== want) fail('www consolidation', `${from} -> ${got} (expected ${want})`);
}

// query strings must survive a content redirect
const withQuery = await hitFull('https://mineralwise.com/oil-and-gas-terms/fracking/?utm_source=x');
if (withQuery !== 'https://mineralwise.com/resources/oil-and-gas-terms/f/?utm_source=x#fracking') {
	fail('query dropped', `/oil-and-gas-terms/fracking/?utm_source=x -> ${withQuery}`);
}

console.log(`routes: ${routes.size}`);
console.log(`glossary: ${pageOfAnchor.size} terms on ${anchorsByPage.size} letter pages`);
console.log(`legacy URLs: ${legacy.length} (each tested with and without a trailing slash) | redirected: ${redirected} | left alone: ${untouched}`);
console.log(`retired single-term URLs: ${Object.keys(retiredTermUrls).length} | rules checked for dead ends and chains: ${rulesChecked}`);
if (failures.length) {
	console.error(`\n${failures.length} FAILURES`);
	for (const f of failures) console.error('  ' + f);
	process.exit(1);
}
console.log('\nAll redirect checks passed.');
