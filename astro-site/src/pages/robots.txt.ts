export const prerender = true;

export async function GET({ site }: { site: URL | undefined }) {
	const base = site?.toString().replace(/\/$/, '') || 'https://mineralwise.com';
	const body = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap-index.xml
`;
	return new Response(body, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
}
