/**
 * Generates functions/_middleware.js — the site's redirect layer.
 *
 * Run:  node scripts/build-redirects.mjs
 *
 * Why the redirects live in a Pages Function rather than public/_redirects:
 *   1. Cloudflare Pages silently stops processing _redirects after ~112 rules.
 *      The migration shipped 344 rules; everything past the cutoff was ignored.
 *   2. _redirects matches literal paths, so /foo and /foo/ each need their own
 *      rule. Half the historic URL inventory has no trailing slash.
 *   3. Wildcard rules there cannot check that the destination exists. The
 *      /oil-and-gas-terms/* -> /resources/oil-and-gas-terms/:splat rule turned
 *      235 old URLs into redirect-to-404s, which Google treats as hard errors.
 *
 * This script resolves every legacy URL against the routes that actually exist
 * in src/pages, and refuses to emit a rule whose destination is missing.
 *
 * Glossary terms are not pages of their own. Each one is an anchor on a letter
 * page (/resources/oil-and-gas-terms/p/#pugh-clause). A destination may therefore
 * be written "page#anchor": the page must be a live route AND the anchor must be
 * a term that is filed under that letter, or generation fails.
 *
 * Inputs:
 *   src/pages/**            the authoritative list of live routes
 *   src/content/terms/*.json the glossary terms; the filename is the anchor and
 *                           the first letter of "term" picks the letter page
 *   scripts/retired-term-urls.json
 *                           every single-term URL retired when the glossary moved
 *                           to letter pages, mapped to the anchor that replaced it
 *   scripts/legacy-urls.txt every URL this domain has served across the
 *                           Squarespace, Brizy and Astro eras (Wayback CDX +
 *                           the pre-migration sitemap scrape)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANCHOR_RE, GLOSSARY_BASE, letterFor, letterPath } from '../src/data/glossary-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = path.join(ROOT, 'src/pages');

// ---------------------------------------------------------------- live routes

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
			'/' +
			path
				.relative(PAGES, f)
				.replace(/\.(astro|md|mdx)$/, '')
				.replace(/\/index$/, '')
				.replace(/^index$/, '')
		)
		.map((r) => (r === '/' ? '/' : r.replace(/\/$/, '')))
);

const NOT_A_PAGE = new Set(['/404', '/rss.xml', '/robots.txt', '/llms.txt']);
for (const r of NOT_A_PAGE) routes.delete(r);

const lastSegment = (p) => p.split('/').filter(Boolean).pop() || '';

// ------------------------------------------------------------ glossary terms

// The letter pages come from a dynamic route ([letter].astro), which the walk
// above skips. They exist exactly when the collection has a term for that letter.
const TERMS_DIR = path.join(ROOT, 'src/content/terms');
const termProblems = [];
const TERM_DEST = {}; // anchor -> '/resources/oil-and-gas-terms/<letter>#<anchor>'
const anchorsByLetterPage = new Map(); // letter page -> Set of anchors on it
for (const file of fs.readdirSync(TERMS_DIR).sort()) {
	if (!file.endsWith('.json')) continue;
	const anchor = file.replace(/\.json$/, '');
	if (!ANCHOR_RE.test(anchor)) {
		termProblems.push(`${file}: filename must be lowercase letters, digits and hyphens`);
		continue;
	}
	let data;
	try {
		data = JSON.parse(fs.readFileSync(path.join(TERMS_DIR, file), 'utf8'));
	} catch (err) {
		termProblems.push(`${file}: not valid JSON (${err.message})`);
		continue;
	}
	if (typeof data.term !== 'string' || !data.term.trim() || typeof data.definition !== 'string' || !data.definition.trim()) {
		termProblems.push(`${file}: needs a non-empty "term" and "definition"`);
		continue;
	}
	const page = letterPath(letterFor(data.term));
	if (!anchorsByLetterPage.has(page)) anchorsByLetterPage.set(page, new Set());
	anchorsByLetterPage.get(page).add(anchor);
	TERM_DEST[anchor] = `${page}#${anchor}`;
}
if (termProblems.length) {
	console.error('Refusing to generate: glossary term files are invalid.');
	for (const p of termProblems) console.error('  ' + p);
	process.exit(1);
}
for (const page of anchorsByLetterPage.keys()) {
	if (routes.has(page)) {
		console.error(`Refusing to generate: ${page} is both a static page and a glossary letter page.`);
		process.exit(1);
	}
	routes.add(page);
}

/** Destination for a term, by anchor. Fails loudly if the term has been removed. */
function term(anchor) {
	if (!TERM_DEST[anchor]) {
		console.error(`Refusing to generate: no glossary term with anchor "${anchor}" in src/content/terms.`);
		process.exit(1);
	}
	return TERM_DEST[anchor];
}

/** The letter page if that letter has terms, otherwise the glossary index. Never an empty page. */
const letterPageOrIndex = (letter) =>
	anchorsByLetterPage.has(letterPath(letter)) ? letterPath(letter) : GLOSSARY_BASE;

// Single-term URLs that were live pages until the glossary moved to letter pages.
const retiredTermUrls = JSON.parse(
	fs.readFileSync(path.join(ROOT, 'scripts/retired-term-urls.json'), 'utf8')
);
const RETIRED = {}; // retired path -> 'page#anchor'
for (const [retiredPath, anchor] of Object.entries(retiredTermUrls)) {
	if (routes.has(retiredPath)) {
		console.error(`Refusing to generate: ${retiredPath} is listed as retired but is still a live page.`);
		process.exit(1);
	}
	RETIRED[retiredPath] = term(anchor);
}

// For matching legacy URLs, a term can be found by its retired path or by its
// anchor. Both resolve straight to the letter page anchor, never to a retired URL.
const VIRTUAL = { ...RETIRED };
for (const [anchor, dest] of Object.entries(TERM_DEST)) {
	const asPath = `${GLOSSARY_BASE}/${anchor}`;
	if (!routes.has(asPath) && !VIRTUAL[asPath]) VIRTUAL[asPath] = dest;
}

// ------------------------------------------------------------- legacy inputs

const wrangler = fs.readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf8');
const siteUrlMatch = wrangler.match(/PUBLIC_SITE_URL\s*=\s*"([^"]+)"/);
if (!siteUrlMatch) {
	console.error('wrangler.toml has no PUBLIC_SITE_URL — cannot determine the canonical host.');
	process.exit(1);
}
const CANONICAL_HOST = new URL(siteUrlMatch[1]).host;

const legacy = fs
	.readFileSync(path.join(ROOT, 'scripts/legacy-urls.txt'), 'utf8')
	.split('\n')
	.map((s) => s.trim())
	.filter(Boolean);

/** Paths that must keep returning 404: bot probes, dead news archive, starter-template debris. */
const NEVER_REDIRECT = [
	/^\/:80/, /^\/\.well-known/, /^\/api\//, /^\/wp-/, /^\/xmlrpc/, /^\/commerce\//,
	/^\/blog\/(first|second|third)-post$/, /^\/blog\/using-mdx$/, /^\/blog\/markdown-style-guide$/,
	/^\/news\//, /^\/\d{4}\/\d{2}\//,
	/-$/,                      // truncated archive captures, e.g. /library/oil-
	/[^a-z0-9\-/.]/,           // stray capitals and punctuation from bad captures
];

/**
 * Old landing pages whose final segment is not a page slug, so the slug table
 * below cannot resolve them on its own.
 */
const SECTION_INDEX = {
	'/home': '/',
	'/index': '/',
	'/library': '/resources',
	'/library/case-studies': '/resources',
	'/library/testimonials': '/about',
	'/library/oil-and-gas-terms': '/resources/oil-and-gas-terms',
	'/library/oil-and-gas-terms.2': '/resources/oil-and-gas-terms',
	'/library/oil-and-gas-abbreviations': '/resources/oil-and-gas-abbreviations',
	'/all-oil-and-gas-terms': '/resources/oil-and-gas-terms',
	'/oil-and-gas-terms': '/resources/oil-and-gas-terms',
	'/oil-and-gas-abbreviations': '/resources/oil-and-gas-abbreviations',
	'/oil-gas-abbreviations': '/resources/oil-and-gas-abbreviations',
	'/oil-gas-terms': '/resources/oil-and-gas-terms',
	'/glossary-a-165.html': '/resources/oil-and-gas-terms',
	'/directory/field-profiles': '/directory',
	'/directory/shale-plays': '/resources/shale-plays',
	'/directory/oil-and-gas-companies': '/resources/oil-and-gas-operators',
	'/directory/oil-gas-operators': '/resources/oil-and-gas-operators',
	'/oil-and-gas-operators': '/resources/oil-and-gas-operators',
	'/oil-gas-operators': '/resources/oil-and-gas-operators',
	'/oil-gas-company-royalty-owner-relations-contact-information': '/resources/oil-and-gas-operators',
	'/shale-plays': '/resources/shale-plays',
	'/mineral-rights-by-state': '/resources/mineral-rights-by-state',
	'/oil-gas-royalty-taxes': '/royalty-taxes',
	'/owners-guide/leased-and-producing/royalty-taxes': '/royalty-taxes',
	'/about/privacy-policy': '/privacy-policy',
	'/about/terms-and-conditions': '/terms-and-conditions',
	'/how-oil-gas-measured-a-177.html': '/oil-gas-measurement',
	'/selling-mineral-rights': '/mineral-rights-value',
};
// Old letter pages map onto the new letter pages: the Squarespace ones
// (/library/oil-and-gas-terms/oil-gas-definitions-p-terms, real pages of 300 to 700
// words) and the Brizy-era stubs from April 2025 (/oil-and-gas-terms-p, about 21 words).
for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
	SECTION_INDEX[`/oil-and-gas-terms-${letter}`] = letterPageOrIndex(letter);
	SECTION_INDEX[`/library/oil-and-gas-terms/oil-gas-definitions-${letter}-terms`] =
		letterPageOrIndex(letter);
}

/**
 * Slugs Google still holds that match neither a page nor a glossary anchor,
 * either because the migration stacked every synonym into the slug or because
 * two pages merged. Glossary destinations go through term(), so an alias can
 * never outlive the term it points at.
 * Sources: the Search Console 404 export and the 90-day Performance > Pages report.
 */
const SLUG_ALIASES = {
	fracking: term('fracking'),
	'hydraulic-fracturing': term('fracking'),
	'frac-job': term('fracking'),
	// merged duplicate: the two term pages carried the same definition
	'hydraulic-fracturing-fracture-fracing-fracking-frac-job': term('fracking'),
	'drilling-mud': term('drilling-mud'),
	'drilling-fluid': term('drilling-mud'),
	'plugging-and-abandonment': term('plug-and-abandon'),
	'plug-and-abandon': term('plug-and-abandon'),
	'p-and-a': term('plug-and-abandon'),
	'lact-unit': term('lact-unit'),
	orri: term('overriding-royalty-interest'),
	npri: '/non-participating-royalty-interest-npri',
	nri: term('net-revenue-interest'),
	hbp: term('held-by-production'),
	condensate: term('condensate'),
	'forced-pooling': term('forced-pooling'),
	landman: term('landman'),
	waterflood: term('waterflood'),
	'commercial-well': term('commercial-well'),
	'working-interest': term('working-interest'),
	'bottom-hole-pressure': term('bottom-hole-pressure'),
	'salt-water-disposal-well': term('salt-water-disposal-well'),
	'sour-gas': term('sour-gas'),
	'three-d-seismic': term('three-d-seismic'),
	unitization: term('unitization'),
	'natural-gas-liquids': term('natural-gas-liquids'),
	'initial-production': term('initial-production'),
	'intangible-drilling-costs': term('intangible-drilling-costs'),
	'gas-oil-ratio': term('gas-oil-ratio'),
	barrel: term('barrel'),
	'british-thermal-unit': term('british-thermal-unit'),
	'blowout-preventor': term('blowout-preventor'),
	'christmas-tree': term('christmas-tree'),
	pumper: term('pumper'),
	'reserve-pit': term('reserve-pit'),
	swab: term('swab'),
	'basic-sediment-and-water': term('basic-sediment-and-water'),
	'pounds-per-square-inch': term('pounds-per-square-inch'),
	'progressive-cavity-pump': term('progressive-cavity-pump'),
	allowable: term('allowable'),
	'cubic-foot-of-gas': term('cubic-foot-of-gas'),
};
// /oil-and-gas-terms/a and friends: the letter page when that letter has terms,
// otherwise the glossary index. (The empty alphabet stubs deleted on 27 August
// all went to the index; the real letter pages replaced them in September.)
for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
	SLUG_ALIASES[letter] = letterPageOrIndex(letter);
}

// ------------------------------------------------------------------ matching

const tokenise = (s) => new Set(s.split('-').filter((t) => t.length > 2));
function similarity(a, b) {
	const A = tokenise(a);
	const B = tokenise(b);
	if (!A.size || !B.size) return 0;
	let shared = 0;
	for (const t of A) if (B.has(t)) shared++;
	return shared / (A.size + B.size - shared);
}

// Live routes plus the glossary's virtual paths. A match on a virtual path is
// swapped for its letter page anchor by finalise(), so nothing resolves to a
// retired URL. Live routes are listed last so they win a shared final segment.
const routeList = [...Object.keys(VIRTUAL), ...routes];
const routesBySegment = new Map();
for (const r of routeList) {
	if (r === '/') continue;
	routesBySegment.set(lastSegment(r), r);
}
const finalise = (matched) => (matched && VIRTUAL[matched]) || matched;

/** Which live section should a legacy path prefer when several slugs are close? */
function preferredSection(p) {
	if (/oil-and-gas-terms|oil-gas-definitions/.test(p)) return '/resources/oil-and-gas-terms';
	if (/oil-and-gas-operators|oil-gas-operators|oil-and-gas-companies/.test(p))
		return '/resources/oil-and-gas-operators';
	if (/shale-plays/.test(p)) return '/resources/shale-plays';
	if (/mineral-rights-by-state/.test(p)) return '/resources/mineral-rights-by-state';
	if (/owners-guide/.test(p)) return '/owners-guide';
	return null;
}

function resolveLegacy(p) {
	const section = preferredSection(p);
	const raw = lastSegment(p);
	const slug = raw
		.replace(/\.html$/, '')
		.replace(/-a-\d+$/, '')
		.replace(/-definition$/, '')
		.replace(/-2$/, '');

	if (routesBySegment.has(raw)) return routesBySegment.get(raw);
	if (routesBySegment.has(slug)) return routesBySegment.get(slug);

	// live slug extends the old one: fracking -> fracking-hydraulic-fracturing-...
	const extended = routeList
		.filter((r) => lastSegment(r).startsWith(slug + '-'))
		.sort((a, b) => a.length - b.length);
	if (extended.length) return extended[0];

	// old slug extends the live one: drilling-mud-drilling-fluid -> drilling-mud
	const reduced = routeList
		.filter((r) => lastSegment(r).length > 3 && slug.startsWith(lastSegment(r) + '-'))
		.sort((a, b) => lastSegment(b).length - lastSegment(a).length);
	if (reduced.length) return reduced[0];

	const pool = section ? routeList.filter((r) => r.startsWith(section + '/')) : routeList;
	let best = null;
	let bestScore = 0;
	for (const r of pool) {
		const score = similarity(slug, lastSegment(r));
		if (score > bestScore) {
			bestScore = score;
			best = r;
		}
	}
	return bestScore >= 0.6 ? best : null;
}

// ------------------------------------------------------------------- build

// Mirrors resolve() in the generated middleware: the slug table is only consulted
// for single-segment paths and for short paths under a known legacy folder.
const LEGACY_ROOTS = [
	'resources', 'library', 'directory', 'owners-guide', 'oil-and-gas-terms',
	'oil-and-gas-operators', 'oil-gas-operators', 'oil-and-gas-companies',
	'shale-plays', 'mineral-rights-by-state', 'oil-gas-royalty-taxes',
	'royalty-taxes', 'about', 'glossary',
];
function isSlugRoutable(p) {
	const segments = p.split('/').filter(Boolean);
	return segments.length === 1 || (segments.length <= 4 && LEGACY_ROOTS.includes(segments[0]));
}

const SLUGS = {};
for (const r of routes) if (r !== '/') SLUGS[lastSegment(r)] = r;
// Retired term slugs and anchors, unless a live page already owns that segment.
for (const [virtualPath, dest] of Object.entries(VIRTUAL)) {
	if (!SLUGS[lastSegment(virtualPath)]) SLUGS[lastSegment(virtualPath)] = dest;
}

const unresolved = [];
for (const raw of legacy) {
	const p = raw.replace(/\/+$/, '') || '/';
	if (p === '/' || routes.has(p)) continue;
	if (NEVER_REDIRECT.some((re) => re.test(p))) continue;
	if (SECTION_INDEX[p]) continue;

	if (RETIRED[p]) continue; // exact rule below
	const target = finalise(resolveLegacy(p));
	if (!target) {
		unresolved.push(p);
		continue;
	}
	const slug = lastSegment(p);
	// never let a legacy alias shadow a slug that is itself a live page
	if (!SLUGS[slug]) SLUGS[slug] = target;
}

Object.assign(SLUGS, SLUG_ALIASES);

const REDIRECTS = {};
for (const [from, to] of [...Object.entries(SECTION_INDEX), ...Object.entries(RETIRED)]) {
	if (SLUGS[lastSegment(from)] === to && isSlugRoutable(from)) continue; // already covered by the slug table
	REDIRECTS[from] = to;
}

// ------------------------------------------------------------------- verify

const allRules = [
	...Object.entries(SLUGS).map(([k, v]) => ['SLUGS', k, v]),
	...Object.entries(REDIRECTS).map(([k, v]) => ['REDIRECTS', k, v]),
];

// 1. the page must exist, and an anchor must be a term filed on that page
const dead = allRules.filter(([, , target]) => {
	const [page, anchor] = target.split('#');
	if (page !== '/' && !routes.has(page)) return true;
	if (anchor !== undefined && !(anchorsByLetterPage.get(page) || new Set()).has(anchor)) return true;
	return false;
});
if (dead.length) {
	console.error('Refusing to generate: these rules point at pages or anchors that do not exist.');
	for (const [table, key, target] of dead) console.error(`  ${table}["${key}"] -> ${target}`);
	process.exit(1);
}

// 2. no chains: a destination must not itself be redirected
const chained = allRules.filter(([, , target]) => {
	const page = target.split('#')[0];
	if (page === '/') return false;
	if (REDIRECTS[page]) return true;
	const viaSlug = SLUGS[lastSegment(page)];
	return viaSlug !== undefined && viaSlug.split('#')[0] !== page;
});
if (chained.length) {
	console.error('Refusing to generate: these rules point at a URL that is itself redirected.');
	for (const [table, key, target] of chained) console.error(`  ${table}["${key}"] -> ${target}`);
	process.exit(1);
}

const serialise = (obj) =>
	JSON.stringify(
		Object.fromEntries(Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : 1))),
		null,
		2
	);

const output = `// AUTO-GENERATED by scripts/build-redirects.mjs — do not hand-edit.
// Re-run that script after adding, renaming or deleting a page.
//
// Every destination below was checked against src/pages at generation time, so
// no rule here can redirect into a 404. A destination written "page#anchor" is a
// glossary term: the page is its letter page and the anchor was checked against
// the terms filed under that letter. No destination is itself a redirected URL.
// See the script header for why this logic lives in a Pages Function instead of
// public/_redirects.

// Legacy landing pages whose final segment is not a page slug.
const REDIRECTS = ${serialise(REDIRECTS)};

// Final path segment -> current page. This covers the flat Brizy-era URLs and
// every legacy folder prefix (/library/..., /directory/..., /oil-and-gas-terms/...)
// without needing one rule per combination.
const SLUGS = ${serialise(SLUGS)};

// Requests on any other host (notably www.) are sent here, path intact. The
// Cloudflare rule added in June only covers the homepage, so deep www URLs were
// still serving a full duplicate of the site.
const CANONICAL_HOST = '${CANONICAL_HOST}';

// Pages Functions, build assets and static files are never rewritten. Folder
// names must match a whole segment: a bare /^\\/api/ also swallowed /api-number,
// a glossary term Google still holds, and left it as a 404.
const PASSTHROUGH =
	/^\\/(?:(?:api|_astro|admin|images|fonts|assets)(?:\\/|$)|cms\\.html|config\\.yml|favicon|robots\\.txt|sitemap|rss\\.xml|llms\\.txt|_headers|_redirects)/;

// Folders that were flattened or moved by a migration. Paths outside this set
// are left alone, so genuinely dead URLs keep returning 404 rather than being
// swept into a redirect Google would read as a soft 404.
const LEGACY_ROOTS = new Set(${JSON.stringify(LEGACY_ROOTS)});

function normalise(pathname) {
	const p = decodeURIComponent(pathname).toLowerCase().replace(/\\/+/g, '/').replace(/\\/+$/, '');
	return p === '' ? '/' : p;
}

// Strip the suffixes the old platforms bolted on: Squarespace "-definition",
// import-collision "-2", and the "-a-123.html" article ids.
function slugVariants(segment) {
	const variants = [segment];
	const stripped = segment
		.replace(/\\.html$/, '')
		.replace(/-a-\\d+$/, '')
		.replace(/-definition$/, '')
		.replace(/-2$/, '');
	if (stripped && stripped !== segment) variants.push(stripped);
	return variants;
}

function resolve(p) {
	if (p === '/') return null;

	const exact = REDIRECTS[p];
	if (exact) return exact;

	const segments = p.split('/').filter(Boolean);
	if (segments.length > 1 && (segments.length > 4 || !LEGACY_ROOTS.has(segments[0]))) return null;

	for (const variant of slugVariants(segments[segments.length - 1])) {
		if (SLUGS[variant]) return SLUGS[variant];
	}
	return null;
}

// Where this path should go, as { page, anchor }, or null when there is no rule
// or the path is already the canonical one.
function destinationFor(pathname) {
	if (PASSTHROUGH.test(pathname)) return null;
	const current = normalise(pathname);
	const target = resolve(current);
	if (!target) return null;
	const [page, anchor] = target.split('#');
	if (page === current) return null;
	return { page, anchor };
}

export async function onRequest(context) {
	const url = new URL(context.request.url);
	const wrongHost = url.hostname !== CANONICAL_HOST && url.hostname.endsWith('.' + CANONICAL_HOST);

	let found;
	try {
		found = destinationFor(url.pathname);
	} catch {
		found = null; // malformed percent-encoding: no rule can match it
	}

	if (!found) {
		if (!wrongHost) return context.next();
		// Consolidate www onto the apex with the path and query intact.
		const canonical = new URL(url.toString());
		canonical.hostname = CANONICAL_HOST;
		canonical.protocol = 'https:';
		return Response.redirect(canonical.toString(), 301);
	}

	// One hop, always. Host and path are fixed in the same redirect, so a www
	// legacy URL does not go www -> apex -> new page. The path is sent in its
	// slashed form because Pages would otherwise add its own 308 for the missing
	// slash. A glossary term carries its anchor so the visitor lands on the term.
	const origin = wrongHost ? 'https://' + CANONICAL_HOST : url.origin;
	const destination = new URL(found.page === '/' ? '/' : found.page + '/', origin);
	destination.search = url.search;
	if (found.anchor) destination.hash = found.anchor;
	return Response.redirect(destination.toString(), 301);
}
`;

fs.writeFileSync(path.join(ROOT, 'functions/_middleware.js'), output);

console.log(`routes: ${routes.size}`);
console.log(`REDIRECTS: ${Object.keys(REDIRECTS).length}  SLUGS: ${Object.keys(SLUGS).length}`);
// Anything the aliases picked up afterwards is no longer unresolved.
const stillDead = unresolved.filter((p) => {
	const slug = lastSegment(p);
	return !SLUGS[slug] && !SLUGS[slug.replace(/\.html$/, '').replace(/-a-\d+$/, '')];
});
console.log(`legacy URLs with no live equivalent (left to 404): ${stillDead.length}`);
if (stillDead.length) console.log(stillDead.map((u) => '  ' + u).join('\n'));
