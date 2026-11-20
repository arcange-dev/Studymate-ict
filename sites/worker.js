// StudyMate ICT is a static, offline-first single-page app: the Worker only
// serves the built assets. No API, no database, no secrets.
export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    // Ensure the app shell is never cached in a way that pins an old build;
    // the service worker handles offline caching instead.
    const headers = new Headers(response.headers);
    if (response.headers.get('content-type')?.includes('text/html')) {
      headers.set('cache-control', 'no-cache');
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
};
