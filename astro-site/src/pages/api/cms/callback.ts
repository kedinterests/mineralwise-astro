import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// GitHub OAuth — step 2. GitHub redirects here with a code; we exchange it for
// an access token and hand it back to the CMS popup via postMessage.
export const prerender = false;

function handshakePage(status: 'success' | 'error', payload: unknown): Response {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  const body = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<p>Completing sign-in…</p>
<script>
  (function () {
    function receive(e) {
      window.removeEventListener('message', receive, false);
      e.source.postMessage(${JSON.stringify(message)}, e.origin);
    }
    window.addEventListener('message', receive, false);
    (window.opener || window.parent).postMessage('authorizing:github', '*');
  })();
</script>
</body></html>`;
  return new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookie = request.headers.get('Cookie') || '';
  const savedState = /(?:^|;\s*)cms_oauth_state=([^;]+)/.exec(cookie)?.[1];

  if (!code || !state || !savedState || state !== savedState) {
    return handshakePage('error', { error: 'Invalid OAuth state', provider: 'github' });
  }

  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = env as unknown as {
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
  };
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return handshakePage('error', { error: 'CMS auth not configured', provider: 'github' });
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'mineralwise-cms',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/cms/callback`,
    }),
  });

  const data = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!data.access_token) {
    return handshakePage('error', { error: data.error || 'No access token returned', provider: 'github' });
  }

  return handshakePage('success', { token: data.access_token, provider: 'github' });
};
