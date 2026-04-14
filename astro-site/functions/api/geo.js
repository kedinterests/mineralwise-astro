/**
 * Cloudflare Pages Function: /api/geo
 * Returns whether the current visitor requires cookie consent,
 * based on Cloudflare's injected CF-IPCountry and CF-IPRegion headers.
 *
 * Used by CookieBanner.astro in static-output mode as a runtime geo check.
 */

function requiresConsent(country, region) {
	if (!country) return true;
	if (country === 'CA' || country === 'MX') return false;
	if (country === 'US') {
		if (!region) return false;
		const stateCode = region.includes('-') ? region.split('-').pop() : region;
		return ['CA', 'CO', 'CT'].includes(stateCode);
	}
	return true;
}

export async function onRequest(context) {
	const country = context.request.headers.get('CF-IPCountry') || '';
	const region = context.request.headers.get('CF-IPRegion') || '';

	return new Response(
		JSON.stringify({ requiresConsent: requiresConsent(country, region) }),
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'private, no-store',
			},
		}
	);
}
