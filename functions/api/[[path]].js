// Pages Function (root of the Pages project): make the anatomy API same-origin with the
// Pages app by forwarding /api/* to the deployed Worker (anatomy-api). Removes CORS for
// /api/chat, facts, structures, and media. No keys live here (DEEPSEEK_API_KEY is a Worker
// secret). Wrangler detects this `functions/` folder automatically at deploy time.
const WORKER_ORIGIN = "https://anatomy-api.dannyray280579.workers.dev";

export async function onRequest({ request }) {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, WORKER_ORIGIN);

  const headers = new Headers(request.headers);
  headers.delete("host");

  const init = {
    method: request.method,
    headers,
    redirect: "manual"
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const upstream = await fetch(target.toString(), init);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers
  });
}
