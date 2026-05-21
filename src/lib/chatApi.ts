/**
 * Cliente del chat-server (corriendo en el Mac mini, expuesto via CF Tunnel).
 *
 * Endpoints:
 *   POST /api/ask  → SSE stream
 *   GET  /api/health → JSON
 *
 * URL configurable via PUBLIC_CHAT_API_URL (default: https://chat-api.sebastiangallo.com).
 */

export const CHAT_API_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.PUBLIC_CHAT_API_URL) ||
  'https://chat-api.sebastiangallo.com';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** base64 data URL (mp3), set cuando termina el TTS para mensajes assistant */
  audio_url?: string;
}

export interface HealthInfo {
  ok: boolean;
  model: string;
  voice?: string;
  ollama_reachable?: boolean;
  uptime_sec?: number;
}

export type ChatStreamEvent =
  | { type: 'opened' }
  | { type: 'text'; delta: string }
  | { type: 'text-done'; eval_count?: number; total_ms?: number }
  | { type: 'tts-starting'; text_length?: number }
  | { type: 'audio'; mime: string; data: string; tts_ms?: number }
  | { type: 'tts-error'; error: string }
  | { type: 'done'; total_ms?: number }
  | { type: 'error'; error: string };

export async function checkChatHealth(signal?: AbortSignal): Promise<HealthInfo | null> {
  try {
    const r = await fetch(`${CHAT_API_URL}/api/health`, {
      signal: signal ?? AbortSignal.timeout(3000),
      // credentials: 'include' permite que CF Access cookies viajen al endpoint
      credentials: 'include',
    });
    if (!r.ok) return null;
    return (await r.json()) as HealthInfo;
  } catch {
    return null;
  }
}

/**
 * Stream del chat. Llama onEvent por cada evento SSE.
 * Devuelve una promesa que resuelve cuando el server cierra la conexión.
 */
export async function streamAsk(
  messages: ChatMessage[],
  onEvent: (e: ChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${CHAT_API_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
    credentials: 'include',
    signal,
  });

  if (!res.ok) {
    onEvent({ type: 'error', error: `HTTP ${res.status}` });
    return;
  }
  if (!res.body) {
    onEvent({ type: 'error', error: 'no response body' });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE events están separados por doble newline
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';
    for (const block of blocks) {
      const dataLine = block.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      const payload = dataLine.slice(5).trim();
      if (!payload) continue;
      try {
        const ev = JSON.parse(payload) as ChatStreamEvent;
        onEvent(ev);
      } catch {
        // tolerar parse errors
      }
    }
  }
}
