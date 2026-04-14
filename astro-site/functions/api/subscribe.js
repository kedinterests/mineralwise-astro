export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const email = body.email;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await fetch(
      'https://flow.zoho.com/806242011/flow/webhook/incoming?zapikey=1001.9c5c16450fe42afcce4029e3cc43d92a.f0974967b5b41a95258f71daae449128&isdebug=false',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email }).toString(),
      }
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
