import { describe, it, expect } from 'vitest';
import { parseSseChunk } from '../../server/utils/sse-parser';
import {
  isHttpUrl,
  validateSseTargetUrl,
  buildUpstreamSseHeaders
} from '../../server/utils/sse-proxy';
import {
  isWebSocketUrl,
  isSseUrl,
  validateRequestMethod,
  validateRequestUrl,
  resolveRequestProtocol,
  HTTP_METHODS
} from '../../server/utils/request-protocol';

describe('sse-parser', () => {
  it('parses SSE events from a chunk', () => {
    const events: Array<{ event?: string; id?: string; data: string }> = [];
    const remainder = parseSseChunk(
      'event: update\nid: 42\ndata: hello\n\ndata: world\n\n',
      (event) => events.push(event)
    );

    expect(remainder).toBe('');
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ event: 'update', id: '42', data: 'hello' });
    expect(events[1]).toMatchObject({ data: 'world' });
  });

  it('keeps incomplete trailing data in the buffer', () => {
    const events: Array<{ data: string }> = [];
    const remainder = parseSseChunk('data: partial', (event) => events.push(event));

    expect(events).toHaveLength(0);
    expect(remainder).toBe('data: partial');
  });
});

describe('sse-proxy utils', () => {
  it('detects http URLs', () => {
    expect(isHttpUrl('https://api.example.com/events')).toBe(true);
    expect(isHttpUrl('ws://localhost')).toBe(false);
  });

  it('validates target SSE URLs', () => {
    expect(validateSseTargetUrl('https://api.example.com/stream').hostname).toBe('api.example.com');
  });

  it('builds upstream SSE headers', () => {
    const headers = buildUpstreamSseHeaders({ Authorization: 'Bearer token' }, 'evt-1');
    expect(headers.Accept).toBe('text/event-stream');
    expect(headers.Authorization).toBe('Bearer token');
    expect(headers['Last-Event-ID']).toBe('evt-1');
  });
});

describe('request-protocol', () => {
  it('detects websocket URLs', () => {
    expect(isWebSocketUrl('ws://localhost:3000')).toBe(true);
    expect(isWebSocketUrl('wss://api.example.com/socket')).toBe(true);
    expect(isWebSocketUrl('https://api.example.com')).toBe(false);
  });

  it('detects sse URLs', () => {
    expect(isSseUrl('https://api.example.com/events')).toBe(true);
    expect(isSseUrl('ws://localhost')).toBe(false);
  });

  it('validates HTTP methods for http protocol', () => {
    expect(validateRequestMethod('http', 'get')).toBe('GET');
    expect(HTTP_METHODS).toContain('POST');
  });

  it('requires WS method for websocket protocol', () => {
    expect(validateRequestMethod('websocket', 'WS')).toBe('WS');
  });

  it('requires SSE method for sse protocol', () => {
    expect(validateRequestMethod('sse', 'SSE')).toBe('SSE');
  });

  it('validates websocket URLs', () => {
    expect(validateRequestUrl('websocket', 'wss://echo.example.com')).toBe('wss://echo.example.com');
  });

  it('validates sse URLs', () => {
    expect(validateRequestUrl('sse', 'https://api.example.com/events')).toBe('https://api.example.com/events');
  });

  it('defaults protocol to http', () => {
    expect(resolveRequestProtocol(undefined)).toBe('http');
    expect(resolveRequestProtocol(undefined, 'websocket')).toBe('websocket');
    expect(resolveRequestProtocol(undefined, 'sse')).toBe('sse');
  });
});
