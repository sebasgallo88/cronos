import { useEffect, useRef, useState } from 'react';
import {
  CHAT_API_URL,
  checkChatHealth,
  streamAsk,
  type ChatMessage,
  type HealthInfo,
} from '../lib/chatApi';

interface ChatWidgetProps {
  /** Cuando true, el widget no se muestra hasta que health responde. */
  hideUntilHealthy?: boolean;
}

/**
 * Floating chat widget bottom-right. Botón flotante → abre panel con
 * input + historial de mensajes. Multi-turn dentro de la sesión.
 *
 * Solo se muestra si checkChatHealth() responde OK (mini accesible).
 */
export default function ChatWidget({ hideUntilHealthy = true }: ChatWidgetProps) {
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [healthChecked, setHealthChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'pending' | 'ready' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Health check on mount
  useEffect(() => {
    let cancelled = false;
    checkChatHealth().then((h) => {
      if (!cancelled) {
        setHealth(h);
        setHealthChecked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, ttsStatus]);

  // Cleanup on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  if (hideUntilHealthy && (!healthChecked || !health?.ok)) return null;

  async function handleSend() {
    const q = input.trim();
    if (!q || streaming) return;
    const userMsg: ChatMessage = { role: 'user', content: q };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setStreaming(true);
    setStreamingText('');
    setTtsStatus('idle');
    setErrorMsg(null);

    const controller = new AbortController();
    abortRef.current = controller;
    let accText = '';
    let finalAudio: string | undefined;

    try {
      await streamAsk(
        history,
        (ev) => {
          if (ev.type === 'text') {
            accText += ev.delta;
            setStreamingText(accText);
          } else if (ev.type === 'tts-starting') {
            setTtsStatus('pending');
          } else if (ev.type === 'audio') {
            finalAudio = `data:${ev.mime};base64,${ev.data}`;
            setTtsStatus('ready');
          } else if (ev.type === 'tts-error') {
            setTtsStatus('error');
          } else if (ev.type === 'error') {
            setErrorMsg(ev.error);
          }
        },
        controller.signal,
      );
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setErrorMsg((e as Error).message || 'error desconocido');
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      // Persist final message
      if (accText) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: accText, audio_url: finalAudio },
        ]);
      }
      setStreamingText('');
    }
  }

  function handleAbort() {
    abortRef.current?.abort();
  }

  function handleClear() {
    if (streaming) handleAbort();
    setMessages([]);
    setStreamingText('');
    setErrorMsg(null);
  }

  return (
    <>
      {!open && (
        <button className="chat-fab" onClick={() => setOpen(true)} aria-label="Abrir chat con Cronos">
          <span className="chat-fab-icon">💬</span>
          <span className="chat-fab-text">Preguntale a Cronos</span>
        </button>
      )}

      {open && (
        <div className="chat-panel" role="dialog" aria-labelledby="chat-title">
          <header className="chat-header">
            <div>
              <h3 id="chat-title">Preguntale a Cronos</h3>
              <p className="chat-model">{health?.model ?? 'qwen2.5:7b'} · streaming</p>
            </div>
            <div className="chat-header-actions">
              {messages.length > 0 && (
                <button className="chat-icon-btn" onClick={handleClear} title="Limpiar conversación">
                  🧹
                </button>
              )}
              <button className="chat-icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar chat">
                ×
              </button>
            </div>
          </header>

          <div className="chat-messages" ref={scrollRef}>
            {messages.length === 0 && !streaming && (
              <div className="chat-empty">
                <p>
                  Preguntale lo que quieras sobre la historia humana. Ej:
                </p>
                <ul>
                  <li>"¿Qué pasó en el Mediterráneo entre 500 y 300 BCE?"</li>
                  <li>"Compará el Imperio Mongol con el Otomano."</li>
                  <li>"¿Quién fue Mansa Musa y por qué importa?"</li>
                </ul>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`chat-msg chat-msg-${m.role}`}>
                <div className="chat-msg-content">{m.content}</div>
                {m.audio_url && (
                  <audio controls preload="metadata" src={m.audio_url} className="chat-msg-audio" />
                )}
              </div>
            ))}

            {streaming && (
              <div className="chat-msg chat-msg-assistant chat-msg-streaming">
                <div className="chat-msg-content">
                  {streamingText || <span className="chat-thinking">pensando…</span>}
                  {streamingText && <span className="chat-cursor">▍</span>}
                </div>
                {ttsStatus === 'pending' && <div className="chat-tts-hint">generando audio…</div>}
                {ttsStatus === 'error' && <div className="chat-tts-hint chat-tts-err">audio falló (texto OK)</div>}
              </div>
            )}

            {errorMsg && <div className="chat-error">⚠ {errorMsg}</div>}
          </div>

          <form
            className="chat-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              className="chat-input"
              placeholder={streaming ? 'esperando respuesta…' : 'Escribí tu pregunta…'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={streaming}
              autoFocus
            />
            {streaming ? (
              <button type="button" className="chat-send-btn chat-stop-btn" onClick={handleAbort}>
                Stop
              </button>
            ) : (
              <button type="submit" className="chat-send-btn" disabled={!input.trim()}>
                Enviar
              </button>
            )}
          </form>

          <footer className="chat-footer">
            <span>conectado a {CHAT_API_URL.replace(/^https?:\/\//, '')}</span>
          </footer>
        </div>
      )}
    </>
  );
}
