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
 * Inputs:
 *   src/pages/**            the authoritative list of live routes
 *   scripts/legacy-urls.txt every URL this domain has served across the
 *                           Squarespace, Brizy and Astro eras (Wayback CDX +
 *                           the pre-migration sitemap scrape)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
	SECTION_INDEX[`/oil-and-gas-terms-${letter}`] = '/resources/oil-and-gas-terms';
	SECTION_INDEX[`/library/oil-and-gas-terms/oil-gas-definitions-${letter}-terms`] =
		'/resources/oil-and-gas-terms';
}

/**
 * Slugs Google still holds that no longer match a filename, either because the
 * migration stacked every synonym into the slug or because two pages merged.
 * Sources: the Search Console 404 export and the 90-day Performance > Pages report.
 */
const SLUG_ALIASES = {
	fracking: '/resources/oil-and-gas-terms/fracking-hydraulic-fracturing-fracture-fracing-frac-job',
	'hydraulic-fracturing': '/resources/oil-and-gas-terms/fracking-hydraulic-fracturing-fracture-fracing-frac-job',
	'frac-job': '/resources/oil-and-gas-terms/fracking-hydraulic-fracturing-fracture-fracing-frac-job',
	// merged duplicate: the two term pages carried the same definition
	'hydraulic-fracturing-fracture-fracing-fracking-frac-job':
		'/resources/oil-and-gas-terms/fracking-hydraulic-fracturing-fracture-fracing-frac-job',
	'drilling-mud': '/resources/oil-and-gas-terms/drilling-mud-drilling-fluid',
	'drilling-fluid': '/resources/oil-and-gas-terms/drilling-mud-drilling-fluid',
	'plugging-and-abandonment': '/resources/oil-and-gas-terms/p-and-a-or-plug-and-abandon',
	'plug-and-abandon': '/resources/oil-and-gas-terms/p-and-a-or-plug-and-abandon',
	'p-and-a': '/resources/oil-and-gas-terms/p-and-a-or-plug-and-abandon',
	'lact-unit': '/resources/oil-and-gas-terms/lease-automatic-custody-transfer-unit-lact-unit',
	orri: '/resources/oil-and-gas-terms/overriding-royalty-interest-orri',
	npri: '/non-participating-royalty-interest-npri',
	nri: '/resources/oil-and-gas-terms/net-revenue-interest-nri',
	hbp: '/resources/oil-and-gas-terms/held-by-production-hbp',
	condensate: '/resources/oil-and-gas-terms/condensate-lease-condensate',
	'forced-pooling': '/resources/oil-and-gas-terms/forced-pooling-or-force-pooled',
	landman: '/resources/oil-and-gas-terms/landman-petroleum-landman',
	waterflood: '/resources/oil-and-gas-terms/waterflood-waterflooding',
	'commercial-well': '/resources/oil-and-gas-terms/commercial-well-aka-producing-well',
	'working-interest': '/resources/oil-and-gas-terms/working-interest-wi',
	'bottom-hole-pressure': '/resources/oil-and-gas-terms/bottom-hole-pressure-bhp',
	'salt-water-disposal-well': '/resources/oil-and-gas-terms/salt-water-disposal-well-swd',
	'sour-gas': '/resources/oil-and-gas-terms/sour-gas-h2s',
	'three-d-seismic': '/resources/oil-and-gas-terms/three-3-d-seismic-three-dimensional-seismic',
	unitization: '/resources/oil-and-gas-terms/unitization-unitization-agreement-unit-agreement',
	'natural-gas-liquids': '/resources/oil-and-gas-terms/natural-gas-liquids-ngl',
	'initial-production': '/resources/oil-and-gas-terms/initial-production-ip',
	'intangible-drilling-costs': '/resources/oil-and-gas-terms/intangible-drilling-costs-idc',
	'gas-oil-ratio': '/resources/oil-and-gas-terms/gas-oil-ratio-gor',
	barrel: '/resources/oil-and-gas-terms/barrel-bbl',
	'british-thermal-unit': '/resources/oil-and-gas-terms/british-thermal-unit-btu',
	'blowout-preventor': '/resources/oil-and-gas-terms/blowout-preventor-bp',
	'christmas-tree': '/resources/oil-and-gas-terms/christmas-tree-wellhead',
	pumper: '/resources/oil-and-gas-terms/pumper-lease-operator-gauger',
	'reserve-pit': '/resources/oil-and-gas-terms/reserve-pit-mud-pit',
	swab: '/resources/oil-and-gas-terms/swab-swabbing',
	'basic-sediment-and-water': '/resources/oil-and-gas-terms/basic-sediment-and-water-bs-and-w',
	'pounds-per-square-inch': '/resources/oil-and-gas-terms/pounds-per-square-inch-psi',
	'progressive-cavity-pump': '/resources/oil-and-gas-terms/progressing-or-progressive-cavity-pump',
	allowable: '/resources/oil-and-gas-terms/allowable-oil-allowable-gas-allowable',
	'cubic-foot-of-gas': '/resources/oil-and-gas-terms/cubic-foot-of-gas-standard-cubic-foot-of-gas',
};
// The 26 alphabet stub pages were empty. They are deleted; send them to the glossary.
for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
	SLUG_ALIASES[letter] = '/resources/oil-and-gas-terms';
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

const routeList = [...routes];
const routesBySegment = new Map();
for (const r of routeList) {
	if (r === '/') continue;
	routesBySegment.set(lastSegment(r), r);
}

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

const SLUGS = {};
for (const r of routeList) if (r !== '/') SLUGS[lastSegment(r)] = r;

const unresolved = [];
for (const raw of legacy) {
	const p = raw.replace(/\/+$/, '') || '/';
	if (p === '/' || routes.has(p)) continue;
	if (NEVER_REDIRECT.some((re) => re.test(p))) continue;
	if (SECTION_INDEX[p]) continue;

	const target = resolveLegacy(p);
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
for (const [from, to] of Object.entries(SECTION_INDEX)) {
	if (SLUGS[lastSegment(from)] === to) continue; // already covered by the slug table
	REDIRECTS[from] = to;
}

// ------------------------------------------------------------------- verify

const dead = [
	...Object.entries(SLUGS).map(([k, v]) => ['SLUGS', k, v]),
	...Object.entries(REDIRECTS).map(([k, v]) => ['REDIRECTS', k, v]),
].filter(([, , target]) => target !== '/' && !routes.has(target));

if (dead.length) {
	console.error('Refusing to generate: these rules point at pages that do not exist.');
	for (const [table, key, target] of dead) console.error(`  ${table}["${key}"] -> ${target}`);
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
// no rule here can redirect into a 404. See the script header for why this
// logic lives in a Pages Function instead of public/_redirects.

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

// Pages Functions, build assets and static files are never rewritten.
const PASSTHROUGH =
	/^\\/(api|_astro|admin|images|fonts|assets|cms\\.html|config\\.yml|favicon|robots\\.txt|sitemap|rss\\.xml|llms\\.txt|_headers|_redirects)/;

// Folders that were flattened or moved by a migration. Paths outside this set
// are left alone, so genuinely dead URLs keep returning 404 rather than being
// swept into a redirect Google would read as a soft 404.
const LEGACY_ROOTS = new Set([
	'resources', 'library', 'directory', 'owners-guide', 'oil-and-gas-terms',
	'oil-and-gas-operators', 'oil-gas-operators', 'oil-and-gas-companies',
	'shale-plays', 'mineral-rights-by-state', 'oil-gas-royalty-taxes',
	'royalty-taxes', 'about', 'glossary',
]);

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

export async function onRequest(context) {
	const url = new URL(context.request.url);

	// Host first: consolidate www onto the apex before doing anything else, so a
	// www request never produces two redirects or lands on a duplicate page.
	if (url.hostname !== CANONICAL_HOST && url.hostname.endsWith('.' + CANONICAL_HOST)) {
		const canonical = new URL(url.toString());
		canonical.hostname = CANONICAL_HOST;
		canonical.protocol = 'https:';
		return Response.redirect(canonical.toString(), 301);
	}

	if (PASSTHROUGH.test(url.pathname)) return context.next();

	const current = normalise(url.pathname);
	const target = resolve(current);

	// Either there is no rule, or this URL is already the canonical one.
	if (!target || target === current) return context.next();

	// Redirect straight to the slashed form: Pages would otherwise add its own
	// 308 for the missing slash and turn every redirect into a two-hop chain.
	const destination = new URL(target === '/' ? '/' : target + '/', url.origin);
	destination.search = url.search;
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
