export interface SseProxyRequestBody {
  url: string;
  headers?: Record<string, string>;
  lastEventId?: string;
  withCredentials?: boolean;
}

export function isHttpUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

export function validateSseTargetUrl(url: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid SSE URL format');
  }

  if (!isHttpUrl(url)) {
    throw new Error('Target URL must start with http:// or https://');
  }

  return parsed;
}

export function buildUpstreamSseHeaders(
  headers: Record<string, string> = {},
  lastEventId?: string
): Record<string, string> {
  const upstreamHeaders: Record<string, string> = {
    Accept: 'text/event-stream',
    ...headers
  };

  if (lastEventId?.trim()) {
    upstreamHeaders['Last-Event-ID'] = lastEventId.trim();
  }

  return upstreamHeaders;
}
