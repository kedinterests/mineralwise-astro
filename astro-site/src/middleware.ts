import { defineMiddleware } from 'astro:middleware';

/**
 * Returns true if the visitor's location requires cookie consent.
 * Rules:
 *   - Non-North-American countries (not US, CA, MX): always require consent
 *   - US visitors in CA, CO, or CT: require consent
 *   - All other US, Canada, Mexico visitors: no consent required
 *
 * NOTE: This middleware runs at request time in SSR/hybrid mode.
 * The site is currently output:'static', so this file is ready for when
 * you switch to output:'hybrid' with the @astrojs/cloudflare adapter.
 * In static mode, the CookieBanner falls back to /api/geo (Cloudflare Pages Function).
 */
function requiresConsent(country: string | null, region: string | null): boolean {
	if (!country) return true; // Unknown location: show banner to be safe

	// Canada and Mexico: no consent required
	if (country === 'CA' || country === 'MX') return false;

	// US: only specific states require consent
	if (country === 'US') {
		if (!region) return false;
		// CF-IPRegion may be "US-CA", "US-CO", "US-CT" or just "CA", "CO", "CT"
		const stateCode = region.includes('-') ? region.split('-').pop()! : region;
		return ['CA', 'CO', 'CT'].includes(stateCode);
	}

	// All other countries (EU, UK, AU, etc.): require consent
	return true;
}

export const onRequest = defineMiddleware(async (context, next) => {
	const country = context.request.headers.get('CF-IPCountry');
	const region = context.request.headers.get('CF-IPRegion');

	// If CF headers are absent (static build, local dev without CF, etc.),
	// leave showCookieBanner undefined so CookieBanner falls back to /api/geo client-side.
	context.locals.showCookieBanner = country !== null
		? requiresConsent(country, region)
		: (undefined as unknown as boolean);

	context.locals.cookieConsentValue = context.cookies.get('cookie_consent')?.value;

	return next();
});
