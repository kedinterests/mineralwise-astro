/**
 * Cloudflare Pages Function for Decap CMS OAuth
 * Handles GitHub OAuth authentication for Decap CMS
 * 
 * Note: Cloudflare Functions use .js extension, not .ts
 */

export async function onRequest(context) {
	const { request, env } = context;
	const url = new URL(request.url);

	// Handle OAuth callback
	if (url.pathname === '/api/auth/callback') {
		const code = url.searchParams.get('code');
		
		if (!code) {
			return new Response('Missing code parameter', { status: 400 });
		}

		// Exchange code for token
		const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
			body: JSON.stringify({
				client_id: env.GITHUB_CLIENT_ID,
				client_secret: env.GITHUB_CLIENT_SECRET,
				code: code,
			}),
		});

		const tokenData = await tokenResponse.json();
		
		if (tokenData.error) {
			return new Response(`Error: ${tokenData.error_description}`, { status: 400 });
		}

		// Return token to Decap CMS
		return new Response(JSON.stringify({ token: tokenData.access_token }), {
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Handle auth initiation
	if (url.pathname === '/api/auth') {
		const redirectUri = `${url.origin}/api/auth/callback`;
		const authUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo`;

		return Response.redirect(authUrl, 302);
	}

	return new Response('Not found', { status: 404 });
}
