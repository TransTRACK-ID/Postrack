export interface ParsedSseEvent {
  event?: string;
  id?: string;
  data: string;
  retry?: number;
}

/**
 * Parse SSE text chunks into discrete events.
 * Returns parsed events and any incomplete trailing buffer.
 */
export function parseSseChunk(
  buffer: string,
  onEvent: (event: ParsedSseEvent) => void
): string {
  const normalized = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split('\n\n');
  const remainder = blocks.pop() ?? '';

  for (const block of blocks) {
    if (!block.trim()) continue;

    let eventName: string | undefined;
    let eventId: string | undefined;
    let retry: number | undefined;
    const dataLines: string[] = [];

    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue;

      const colonIndex = line.indexOf(':');
      const field = colonIndex === -1 ? line : line.slice(0, colonIndex);
      let value = colonIndex === -1 ? '' : line.slice(colonIndex + 1);
      if (value.startsWith(' ')) {
        value = value.slice(1);
      }

      switch (field) {
        case 'event':
          eventName = value;
          break;
        case 'id':
          eventId = value;
          break;
        case 'retry': {
          const parsedRetry = Number.parseInt(value, 10);
          if (!Number.isNaN(parsedRetry)) {
            retry = parsedRetry;
          }
          break;
        }
        case 'data':
          dataLines.push(value);
          break;
        default:
          break;
      }
    }

    if (dataLines.length === 0 && !eventName && !eventId) {
      continue;
    }

    onEvent({
      event: eventName,
      id: eventId,
      data: dataLines.join('\n'),
      retry
    });
  }

  return remainder;
}
