import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// GitHub OAuth — step 1. CMS requests auth, we redirect to GitHub.
export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);

  // Generate a random state for CSRF protection
  const state = crypto.getRandomValues(new Uint8Array(12)).join('');

  const redirectUrl = new URL('https://github.com/login/oauth/authorize');
  redirectUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID as string);
  redirectUrl.searchParams.set('redirect_uri', url.origin + '/api/cms/callback');
  redirectUrl.searchParams.set('scope', 'repo user');
  redirectUrl.searchParams.set('state', state);

  // Store state in a cookie for validation on callback
  const response = new Response(null, {
    status: 301,
    headers: {
      'Location': redirectUrl.toString(),
      'Set-Cookie': `cms_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax`,
    },
  });

  return response;
};
