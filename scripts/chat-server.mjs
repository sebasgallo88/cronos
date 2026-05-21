#!/usr/bin/env node
/**
 * v3 — Chat server local que corre en el Mac mini.
 *
 * Expone:
 *   POST /api/ask  → SSE stream:
 *     data: {"type":"text","delta":"..."}     (texto incremental de Ollama)
 *     data: {"type":"tts-starting"}            (texto terminó, generando audio)
 *     data: {"type":"audio","mime":"audio/mp3","data":"<base64>"}
 *     data: {"type":"done"}
 *
 *   GET /api/health → {"ok":true,"model":"qwen2.5:7b","uptime":...}
 *
 * Stack:
 *   - node:http (sin deps)
 *   - ollama @ localhost:11434  (chat API streaming)
 *   - say -v Sandy (TTS)
 *   - ffmpeg (aiff → mp3)
 *
 * Diseñado para correr expuesto vía Cloudflare Tunnel a
 * chat-api.sebastiangallo.com, con CF Access protegiendo el dominio.
 *
 * Usage:
 *   node scripts/chat-server.mjs            # default port 8080
 *   PORT=9000 node scripts/chat-server.mjs  # custom
 */

import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const MODEL = process.env.MODEL || 'qwen2.5:7b';
const VOICE = process.env.VOICE || 'Sandy';
const OLLAMA = process.env.OLLAMA_URL || 'http://localhost:11434';

const SYSTEM_PROMPT = `Sos un historiador conciso para Cronos, un histomap interactivo de la historia humana. Respondés en español rioplatense neutro, sin emojis, sin metadiscurso, con datos verificables.

Cobertura preferente: ~10000 BCE → 1900 CE. Forzá visión global no-Eurocentric — incluí Asia (China, India, Asia Central), África (Sub-Sahariana, Norte), Américas (pre-colombinas), Sudeste Asiático cuando aplique. No te enfoques sólo en Mediterráneo/Europa.

Fechas siempre con BCE/CE explícito (ej. "44 BCE", "1453 CE", no "a.C." ni "-44"). Si no sabés algo, decilo. Si la pregunta es ambigua, pedí aclaración.

Largo: entre 150 y 600 palabras según la complejidad. No uses headings markdown (##) para respuestas cortas. Para respuestas largas (>400 palabras) podés usar headings.`;

const STARTED_AT = Date.now();

// ─── helpers ─────────────────────────────────────────────────────────────

// Origins permitidos para credentialed requests. credentials:'include' del
// browser requiere echo del Origin específico (no '*') y Allow-Credentials.
const ALLOWED_ORIGINS = new Set([
  'https://cronos.sebastiangallo.com',
  'http://localhost:4321',
  'http://localhost:3000',
]);

function corsHeaders(req) {
  const origin = req.headers.origin;
  const headers = {
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    // sin origin (curl directo) o no whitelisted: permite todo sin credentials
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return headers;
}

function jsonResponse(req, res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders(req) });
  res.end(JSON.stringify(body));
}

function sse(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body;
}

function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+(.+)$/gm, '$1.')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function spawnP(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (c) => (err += c.toString()));
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${err.slice(0, 200)}`))));
  });
}

async function generateAudio(text) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'cronos-tts-'));
  const txtPath = join(tmpDir, 'in.txt');
  const aiffPath = join(tmpDir, 'out.aiff');
  const mp3Path = join(tmpDir, 'out.mp3');
  try {
    writeFileSync(txtPath, text, 'utf8');
    await spawnP('say', ['-v', VOICE, '-f', txtPath, '-o', aiffPath]);
    await spawnP('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiffPath, '-codec:a', 'libmp3lame', '-qscale:a', '5', mp3Path]);
    const buf = readFileSync(mp3Path);
    return buf.toString('base64');
  } finally {
    for (const p of [txtPath, aiffPath, mp3Path]) {
      try { unlinkSync(p); } catch {}
    }
  }
}

// ─── handlers ────────────────────────────────────────────────────────────

async function handleHealth(_req, res) {
  // Verify Ollama up
  let ollamaOk = false;
  try {
    const r = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(2000) });
    ollamaOk = r.ok;
  } catch {}
  jsonResponse(req, res,200, {
    ok: true,
    model: MODEL,
    voice: VOICE,
    ollama_reachable: ollamaOk,
    uptime_sec: Math.round((Date.now() - STARTED_AT) / 1000),
  });
}

async function handleAsk(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch (e) {
    return jsonResponse(req, res,400, { error: 'invalid JSON body' });
  }
  const { messages } = payload;
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonResponse(req, res,400, { error: 'messages[] required' });
  }
  // Validate basic shape
  for (const m of messages) {
    if (!m || typeof m.role !== 'string' || typeof m.content !== 'string') {
      return jsonResponse(req, res,400, { error: 'each message needs {role, content}' });
    }
  }

  // Open SSE stream
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    ...corsHeaders(req),
  });
  // Initial event to prime the connection
  sse(res, { type: 'opened' });

  const fullMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];
  let fullText = '';
  let started = Date.now();

  try {
    const ollamaRes = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: fullMessages,
        stream: true,
        options: { temperature: 0.7 },
      }),
    });
    if (!ollamaRes.ok) throw new Error(`ollama HTTP ${ollamaRes.status}`);
    if (!ollamaRes.body) throw new Error('ollama returned no body');

    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const j = JSON.parse(line);
          if (j.message?.content) {
            fullText += j.message.content;
            sse(res, { type: 'text', delta: j.message.content });
          }
          if (j.done) {
            sse(res, { type: 'text-done', eval_count: j.eval_count, total_ms: Date.now() - started });
          }
        } catch (e) {
          // tolerate parse errors mid-line
        }
      }
    }

    // TTS
    if (fullText.trim().length > 0) {
      sse(res, { type: 'tts-starting', text_length: fullText.length });
      const ttsStart = Date.now();
      try {
        const plain = stripMarkdown(fullText);
        const audioB64 = await generateAudio(plain);
        const ttsMs = Date.now() - ttsStart;
        sse(res, { type: 'audio', mime: 'audio/mp3', data: audioB64, tts_ms: ttsMs });
      } catch (e) {
        sse(res, { type: 'tts-error', error: e.message });
      }
    }

    sse(res, { type: 'done', total_ms: Date.now() - started });
  } catch (e) {
    sse(res, { type: 'error', error: e.message });
  } finally {
    res.end();
  }
}

// ─── server ──────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    return res.end();
  }
  if (req.url === '/api/health' && req.method === 'GET') return handleHealth(req, res);
  if (req.url === '/api/ask' && req.method === 'POST') return handleAsk(req, res);
  if (req.url === '/' || req.url === '/api') {
    return jsonResponse(req, res,200, { name: 'cronos-chat-server', version: '1.0', endpoints: ['/api/ask', '/api/health'] });
  }
  jsonResponse(req, res,404, { error: 'not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`[chat-server] listening on ${HOST}:${PORT}`);
  console.log(`[chat-server] model=${MODEL} voice=${VOICE} ollama=${OLLAMA}`);
});

// Graceful shutdown
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`[chat-server] ${sig} received, closing...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
