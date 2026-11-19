// Serves the 3D configurator alone on configurator.furnisys.co.in.
// Every other host (www.furnisys.co.in etc.) passes straight through untouched.
export default function middleware(request) {
  try {
    const host = (request.headers.get('host') || '').toLowerCase();
    if (!host.startsWith('configurator.')) return;
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '') {
      return new Response(null, {
        headers: { 'x-middleware-rewrite': new URL('/_configurator/app', url).toString() }
      });
    }
    if (url.pathname.startsWith('/_configurator/')) return;
    return Response.redirect('https://www.furnisys.co.in' + url.pathname + url.search, 307);
  } catch (e) {
    return;
  }
}
