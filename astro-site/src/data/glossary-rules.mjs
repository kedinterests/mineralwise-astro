/**
 * Rules shared by the glossary pages (src/data/glossary.ts) and the redirect
 * generator (scripts/build-redirects.mjs). Both must agree on which letter page
 * a term lives on and what its anchor is, or a redirect would point at an
 * anchor that is not on the page. Keep this file dependency-free plain JS so
 * the Node scripts can import it without Astro.
 */

export const GLOSSARY_BASE = '/resources/oil-and-gas-terms';

/** Terms that start with a digit share one page. */
export const DIGIT_PAGE = '0-9';

/** Anchors are the term's filename: lowercase words joined by single hyphens. */
export const ANCHOR_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The letter page a term belongs on, from the first letter or digit of its name.
 * @param {string} term
 * @returns {string} 'a' to 'z', or DIGIT_PAGE
 */
export function letterFor(term) {
	const first = String(term)
		.normalize('NFD')
		.replace(/[^A-Za-z0-9]/g, '')
		.charAt(0)
		.toLowerCase();
	if (!first) throw new Error(`Glossary term "${term}" has no letter or digit to file it under.`);
	return /[0-9]/.test(first) ? DIGIT_PAGE : first;
}

/** @param {string} letter */
export function letterPath(letter) {
	return `${GLOSSARY_BASE}/${letter}`;
}

/**
 * Site-relative href for a term, in the slashed form the site serves.
 * @param {string} letter
 * @param {string} anchor
 */
export function termHref(letter, anchor) {
	return `${GLOSSARY_BASE}/${letter}/#${anchor}`;
}

/**
 * Alphabetical order used on every glossary page.
 * @param {string} a
 * @param {string} b
 */
export function compareTerms(a, b) {
	return a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true });
}
