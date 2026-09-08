/**
 * SSE Proxy Endpoint
 * POST /api/proxy/sse
 *
 * Proxies Server-Sent Events streams to the browser with custom headers.
 * EventSource cannot send custom headers, so this endpoint streams the
 * upstream response back to the client.
 */

import { validateSseTargetUrl, buildUpstreamSseHeaders, type SseProxyRequestBody } from '../../utils/sse-proxy';

const DEFAULT_TIMEOUT_MS = 300_000;

export default defineEventHandler(async (event) => {
  const body = await readBody<SseProxyRequestBody>(event);

  if (!body?.url || typeof body.url !== 'string' || !body.url.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required field: url'
    });
  }

  const targetUrl = validateSseTargetUrl(body.url.trim());
  const headers = buildUpstreamSseHeaders(body.headers || {}, body.lastEventId);

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to connect to SSE endpoint';
    throw createError({
      statusCode: 502,
      statusMessage: message
    });
  }

  if (!upstreamResponse.ok) {
    const errorBody = await upstreamResponse.text().catch(() => '');
    throw createError({
      statusCode: upstreamResponse.status,
      statusMessage: errorBody || upstreamResponse.statusText || 'Upstream SSE request failed'
    });
  }

  if (!upstreamResponse.body) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Upstream SSE response has no body'
    });
  }

  const contentType = upstreamResponse.headers.get('content-type') || 'text/event-stream';

  setResponseHeaders(event, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  return sendStream(event, upstreamResponse.body);
});
