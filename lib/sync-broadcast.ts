/**
 * Simple in-process SSE broadcaster for immediate Backend → Frontend sync.
 * After every DB sync (runLatestSync), broadcast() notifies all connected SSE clients.
 * Frontend subscribes via EventSource('/api/agents/stream') and refetches only on event,
 * not on a timer (per requirement: sync immediately after DB update, no frequent refresh).
 */
const clients = new Set<any>();

export function addSseClient(res: any) {
  clients.add(res);
  // Remove on close
  const cleanup = () => clients.delete(res);
  try {
    res.on?.('close', cleanup);
    res.on?.('finish', cleanup);
  } catch {}
  return cleanup;
}

export function broadcast(payload: any = { type: 'agents-updated', at: new Date().toISOString() }) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of Array.from(clients)) {
    try {
      res.write(data);
      // @ts-ignore flush for compression
      res.flush?.();
    } catch {
      clients.delete(res);
    }
  }
}

export function clientCount() {
  return clients.size;
}
