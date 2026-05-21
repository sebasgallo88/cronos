#!/usr/bin/env node
/**
 * V2 (period narratives): genera narrativas históricas estructuradas en español
 * para rangos temporales pre-definidos, usando Qwen 2.5 14B local via Ollama,
 * y produce audio TTS con `say` (es_MX) + ffmpeg → mp3.
 *
 * Flujo:
 *   1. Para cada (start, end) en GRID:
 *      - Slice de cronos.json: polities/figures/events activos en el rango.
 *      - Construye prompt con esa data + reglas de 4 secciones.
 *      - Llama Ollama (qwen2.5:14b) vía fetch.
 *      - Parsea respuesta y valida 4 secciones obligatorias.
 *      - Escribe content/narratives/{slug}.md (frontmatter + body).
 *   2. Para cada .md:
 *      - Strip markdown del body → plain text.
 *      - `say -v Sandy -o {aiff}` → ffmpeg → public/narratives/audio/{slug}.mp3.
 *
 * Usage:
 *   node scripts/narrate.mjs --all            # genera GRID completa, skip existentes
 *   node scripts/narrate.mjs --all --overwrite # regenera todo
 *   node scripts/narrate.mjs --range -1000 0  # un solo rango custom
 *   node scripts/narrate.mjs --tts-only       # re-genera audios de .md existentes
 *
 * Requiere:
 *   - `ollama serve` corriendo (http://localhost:11434).
 *   - `qwen2.5:14b` descargado (`ollama pull qwen2.5:14b`).
 *   - `say` (macOS built-in).
 *   - `ffmpeg` o `afconvert` (fallback) para mp3/m4a.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const CRONOS_JSON = resolve(REPO_ROOT, 'src', 'data', 'cronos.json');
const NARRATIVES_DIR = resolve(REPO_ROOT, 'content', 'narratives');
const AUDIO_DIR = resolve(REPO_ROOT, 'public', 'narratives', 'audio');
const TMP_DIR = '/tmp';

// ─── CLI flags ───────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const FLAGS = {
  all: argv.includes('--all'),
  overwrite: argv.includes('--overwrite'),
  ttsOnly: argv.includes('--tts-only'),
  voice: extractFlag('--voice') || 'Paulina',
  model: extractFlag('--model') || 'qwen2.5:7b',
};
let CUSTOM_RANGE = null;
{
  const i = argv.indexOf('--range');
  if (i >= 0 && argv[i + 1] && argv[i + 2]) {
    CUSTOM_RANGE = [parseInt(argv[i + 1], 10), parseInt(argv[i + 2], 10)];
  }
}

function extractFlag(name) {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  return argv[i + 1];
}

// ─── GRID (21 narrativas) ────────────────────────────────────────────────

const GRID = [
  // BCE — milenios largos donde la data es sparse
  { start: -5000, end: -4000, label: 'Quinto milenio BCE' },
  { start: -4000, end: -3000, label: 'Cuarto milenio BCE' },
  { start: -3000, end: -2000, label: 'Tercer milenio BCE' },
  { start: -2000, end: -1500, label: 'Bronce medio' },
  { start: -1500, end: -1000, label: 'Bronce tardío y Edad Oscura' },
  { start: -1000, end: -500,  label: 'Edad de Hierro temprana' },
  { start: -500,  end: -300,  label: 'Era clásica griega' },
  { start: -300,  end: -100,  label: 'Helenismo y ascenso de Roma' },
  { start: -100,  end: 100,   label: 'Bisagra de eras' },
  // CE — clusters de 100-200 años donde la data es más densa
  { start: 100,  end: 300,  label: 'Apogeo de los grandes imperios' },
  { start: 300,  end: 500,  label: 'Cristianización y caída de Occidente' },
  { start: 500,  end: 700,  label: 'Inicio del islam y alta Edad Media' },
  { start: 700,  end: 900,  label: 'Califatos, Carolingio y Tang' },
  { start: 900,  end: 1100, label: 'Reconfiguración euroasiática' },
  { start: 1100, end: 1300, label: 'Mongoles, Cruzadas y universidades' },
  { start: 1300, end: 1450, label: 'Pestes y crisis tardomedieval' },
  { start: 1450, end: 1550, label: 'Caída de Constantinopla y descubrimientos' },
  { start: 1550, end: 1650, label: 'Imperios coloniales y Reforma' },
  { start: 1650, end: 1750, label: 'Absolutismos e Ilustración temprana' },
  { start: 1750, end: 1850, label: 'Revoluciones' },
  { start: 1850, end: 1900, label: 'Modernidad industrial' },
];

// ─── helpers ──────────────────────────────────────────────────────────────

function yearLabel(y) {
  if (y === 0) return '0';
  return y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
}

function makeSlug({ start, end }) {
  const fmt = (y) => (y < 0 ? `${Math.abs(y)}bce` : `${y}ce`);
  return `period-${fmt(start)}-${fmt(end)}`;
}

function makeLabel(period) {
  return period.label || `${yearLabel(period.start)} → ${yearLabel(period.end)}`;
}

function loadCronos() {
  if (!existsSync(CRONOS_JSON)) {
    console.error(`[narrate] cronos.json no existe — corré npm run build-data primero.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(CRONOS_JSON, 'utf8'));
}

// Slice de entidades activas en un rango temporal
function sliceEntities(cronos, start, end) {
  const activeAtStart = cronos.polities.filter(
    (p) => p.start_year <= start && p.end_year >= start,
  );
  const endingInRange = cronos.polities.filter(
    (p) => p.end_year >= start && p.end_year <= end,
  );
  const startingInRange = cronos.polities.filter(
    (p) => p.start_year >= start && p.start_year <= end,
  );
  const religionsActive = cronos.religions.filter((r) => {
    const rEnd = r.end_year ?? 2100;
    return r.start_year <= end && rEnd >= start;
  });
  const figuresInRange = cronos.figures.filter(
    (f) => f.year_born >= start && f.year_born <= end,
  );
  const eventsInRange = cronos.events.filter(
    (e) => e.year >= start && e.year <= end,
  );
  return {
    activeAtStart,
    endingInRange,
    startingInRange,
    religionsActive,
    figuresInRange,
    eventsInRange,
  };
}

function fmtPolities(list) {
  if (!list.length) return '  (ninguna en la data Cronos para este rango)';
  return list
    .map((p) => `  - ${p.name} (${yearLabel(p.start_year)} → ${yearLabel(p.end_year)}, ${p.region})`)
    .join('\n');
}

function fmtReligions(list) {
  if (!list.length) return '  (ninguna)';
  return list
    .map((r) => `  - ${r.name} (${yearLabel(r.start_year)} → ${r.end_year ? yearLabel(r.end_year) : 'vigente'})`)
    .join('\n');
}

function fmtFigures(list) {
  if (!list.length) return '  (ninguna en la data Cronos para este rango)';
  return list
    .slice(0, 25) // cap para no inflar el prompt
    .map((f) => `  - ${f.name} (${yearLabel(f.year_born)}${f.year_died != null ? '–' + yearLabel(f.year_died) : ''}, ${f.role}, ${f.region})`)
    .join('\n');
}

function fmtEvents(list) {
  if (!list.length) return '  (ninguno en la data Cronos para este rango)';
  return list
    .slice(0, 40)
    .map((e) => `  - ${yearLabel(e.year)}: ${e.name} (${e.category}, ${e.region})`)
    .join('\n');
}

function buildPrompt(period, slice) {
  const { start, end } = period;
  const duration = end - start;
  return `Estás escribiendo una narrativa histórica para Cronos, un histomap interactivo de la historia humana.

PERÍODO: ${yearLabel(start)} → ${yearLabel(end)} (${duration} años)

DATA DISPONIBLE de los 50 polities + 10 religions + 125 figures + 99 events curados en Cronos:

Polities activas al INICIO del período:
${fmtPolities(slice.activeAtStart)}

Polities que TERMINAN durante el período:
${fmtPolities(slice.endingInRange)}

Polities que SE FUNDAN durante el período:
${fmtPolities(slice.startingInRange)}

Religiones presentes:
${fmtReligions(slice.religionsActive)}

Figuras notables (nacidas en el rango):
${fmtFigures(slice.figuresInRange)}

Eventos pivotales:
${fmtEvents(slice.eventsInRange)}

ESTRUCTURA OBLIGATORIA — escribí 4 secciones tituladas EXACTAMENTE así, en este orden:

## Al inicio del período

(150 palabras aprox. ¿Qué civilizaciones existían? ¿Qué religiones predominaban? Si la data es sparse — milenios antiguos — contextualizá con tu propio conocimiento general; sos un narrador, no un compilador.)

## Eventos y transiciones pivotales

(250 palabras aprox. ¿Qué cambió durante el período? Batallas, fundaciones, caídas, cismas, descubrimientos. Mencioná las figuras notables si encajan en el flujo. Cohesión narrativa por encima de listado.)

## Al cerrar el período

(150 palabras aprox. ¿Cuál era el panorama al final? Quién quedó en pie, quién había desaparecido, qué tendencias emergían.)

## Mientras tanto en otras regiones

(200 palabras aprox. Contrapunto explícito y obligatorio. Si las secciones anteriores se enfocaron en Mediterráneo/Europa/Medio Oriente, hablá de Asia, África Sub-Sahariana, Américas, Estepa o Sudeste Asiático. Si se enfocaron en Asia, hablá de las otras. Forzá una visión global no-Eurocentric.)

REGLAS:
- Español rioplatense neutro (sin "vos", sin regionalismos).
- Sin emojis. Sin tablas. Sin imágenes. Sin H1.
- Sin metadiscurso ("este texto cubre..."). Empezá directo, mostrá no expliques.
- Fechas siempre con BCE / CE explícito (ej. "44 BCE" no "44 a.C." o "-44").
- Largo total: 600-900 palabras.
- Sólo las 4 secciones listadas, en ese orden, sin secciones extras.`;
}

// ─── Ollama call ──────────────────────────────────────────────────────────

async function callOllama(prompt, { temperature = 0.6, retries = 1 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: FLAGS.model,
          prompt,
          stream: false,
          options: { temperature, num_predict: 2200 },
        }),
      });
      if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
      const j = await res.json();
      if (!j.response) throw new Error('Ollama returned empty response');
      return j.response.trim();
    } catch (e) {
      if (attempt === retries) throw e;
      console.warn(`[narrate] Ollama attempt ${attempt + 1} failed: ${e.message}. Retry con temperature=0.3...`);
      temperature = 0.3;
    }
  }
}

// ─── Parser de las 4 secciones ───────────────────────────────────────────

const REQUIRED_HEADINGS = [
  'Al inicio del período',
  'Eventos y transiciones pivotales',
  'Al cerrar el período',
  'Mientras tanto en otras regiones',
];

function validateFourSections(body) {
  for (const h of REQUIRED_HEADINGS) {
    const re = new RegExp(`^##\\s+${h.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*$`, 'm');
    if (!re.test(body)) {
      throw new Error(`Falta sección obligatoria: "## ${h}"`);
    }
  }
}

// ─── Frontmatter writer ──────────────────────────────────────────────────

function writeNarrativeMd(period, body, slice, audioMeta) {
  const slug = makeSlug(period);
  const today = new Date().toISOString().slice(0, 10);
  const polityIds = [
    ...new Set([
      ...slice.activeAtStart.map((p) => p.id),
      ...slice.endingInRange.map((p) => p.id),
      ...slice.startingInRange.map((p) => p.id),
    ]),
  ];
  const eventIds = slice.eventsInRange.map((e) => e.id);
  const figureIds = slice.figuresInRange.map((f) => f.id);

  const fmLines = ['---'];
  fmLines.push(`type: narrative`);
  fmLines.push(`id: ${slug}`);
  fmLines.push(`label: ${period.label.includes(':') ? JSON.stringify(period.label) : period.label}`);
  fmLines.push(`start_year: ${period.start}`);
  fmLines.push(`end_year: ${period.end}`);
  if (audioMeta?.url) fmLines.push(`audio_url: ${audioMeta.url}`);
  if (audioMeta?.duration_sec != null) fmLines.push(`audio_duration_sec: ${audioMeta.duration_sec}`);
  if (audioMeta?.voice) fmLines.push(`audio_voice: ${audioMeta.voice}`);
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  fmLines.push(`audio_word_count: ${wordCount}`);
  fmLines.push(`generated_at: '${today}'`);
  fmLines.push(`generated_by: ${FLAGS.model}`);
  // Arrays vacíos en YAML inline para evitar el null-parsing
  const emitArr = (label, ids) => {
    if (!ids.length) {
      fmLines.push(`  ${label}: []`);
    } else {
      fmLines.push(`  ${label}:`);
      for (const id of ids) fmLines.push(`    - ${id}`);
    }
  };
  fmLines.push(`sources_used:`);
  emitArr('polity_ids', polityIds);
  emitArr('event_ids', eventIds);
  emitArr('figure_ids', figureIds);
  fmLines.push('---');

  const md = `${fmLines.join('\n')}\n\n${body.trim()}\n`;
  mkdirSync(NARRATIVES_DIR, { recursive: true });
  const outPath = join(NARRATIVES_DIR, `${slug}.md`);
  writeFileSync(outPath, md);
  return outPath;
}

// ─── TTS ──────────────────────────────────────────────────────────────────

function stripMarkdown(body) {
  return body
    .replace(/^##\s+(.+)$/gm, '$1.')  // headings → titles with period for pause
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function probeAudioDuration(mp3Path) {
  // ffprobe (viene con ffmpeg)
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', mp3Path]);
  if (r.status !== 0) return null;
  const sec = parseFloat(r.stdout.toString().trim());
  return Number.isFinite(sec) ? Math.round(sec) : null;
}

function generateAudio(slug, plainText) {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const aiffPath = join(TMP_DIR, `cronos-tts-${slug}.aiff`);
  const mp3Path = join(AUDIO_DIR, `${slug}.mp3`);
  const txtPath = join(TMP_DIR, `cronos-tts-${slug}.txt`);

  // Escribimos el plain text a archivo (say -f es más robusto para textos largos que pasar en args).
  writeFileSync(txtPath, plainText, 'utf8');
  const sayRes = spawnSync('say', ['-v', FLAGS.voice, '-f', txtPath, '-o', aiffPath]);
  if (sayRes.status !== 0) {
    console.warn(`[narrate] say falló para ${slug}: ${sayRes.stderr?.toString() || 'unknown'}`);
    try { unlinkSync(txtPath); } catch {}
    return null;
  }

  // ffmpeg → mp3
  const ffRes = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiffPath,
    '-codec:a', 'libmp3lame', '-qscale:a', '5', mp3Path]);
  if (ffRes.status !== 0) {
    console.warn(`[narrate] ffmpeg falló para ${slug}, intento afconvert m4a...`);
    const m4aPath = join(AUDIO_DIR, `${slug}.m4a`);
    const acRes = spawnSync('afconvert', ['-f', 'mp4f', '-d', 'aac', aiffPath, m4aPath]);
    try { unlinkSync(aiffPath); unlinkSync(txtPath); } catch {}
    if (acRes.status !== 0) {
      console.warn(`[narrate] afconvert también falló para ${slug}`);
      return null;
    }
    return {
      url: `/narratives/audio/${slug}.m4a`,
      duration_sec: probeAudioDuration(m4aPath),
      voice: FLAGS.voice,
    };
  }

  try { unlinkSync(aiffPath); unlinkSync(txtPath); } catch {}
  return {
    url: `/narratives/audio/${slug}.mp3`,
    duration_sec: probeAudioDuration(mp3Path),
    voice: FLAGS.voice,
  };
}

// ─── main ─────────────────────────────────────────────────────────────────

async function generateOne(period, cronos) {
  const slug = makeSlug(period);
  const mdPath = join(NARRATIVES_DIR, `${slug}.md`);

  if (existsSync(mdPath) && !FLAGS.overwrite) {
    console.log(`[narrate] ⊝  skip ${slug} (existe)`);
    return { slug, status: 'skipped' };
  }

  console.log(`[narrate] →  ${slug}: ${period.label}`);
  const slice = sliceEntities(cronos, period.start, period.end);

  const prompt = buildPrompt(period, slice);
  let body;
  try {
    const t0 = Date.now();
    body = await callOllama(prompt);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`     ollama ${dt}s, ${body.length} chars`);
  } catch (e) {
    console.error(`[narrate] ✗  ${slug} ollama error: ${e.message}`);
    return { slug, status: 'failed', error: e.message };
  }

  try {
    validateFourSections(body);
  } catch (e) {
    console.error(`[narrate] ✗  ${slug} parser error: ${e.message}`);
    mkdirSync(resolve(REPO_ROOT, '_sources', 'narrate-failures'), { recursive: true });
    writeFileSync(resolve(REPO_ROOT, '_sources', 'narrate-failures', `${slug}.txt`), body);
    return { slug, status: 'failed', error: e.message };
  }

  // TTS
  const plainText = stripMarkdown(body);
  const audioMeta = generateAudio(slug, plainText);

  writeNarrativeMd(period, body, slice, audioMeta);
  console.log(`     ✓  ${slug} ${audioMeta ? `(audio ${audioMeta.duration_sec}s)` : '(sin audio)'}`);
  return { slug, status: 'ok', audio: !!audioMeta };
}

async function ttsOnlyMode() {
  // Re-genera audios para todos los .md existentes
  if (!existsSync(NARRATIVES_DIR)) {
    console.log('[narrate] no narratives/ todavía');
    return;
  }
  const { findMarkdownFiles, readEntity } = await import('./lib/scan-content.mjs');
  const files = findMarkdownFiles(NARRATIVES_DIR);
  for (const f of files) {
    const { data, body } = readEntity(f);
    if (data.type !== 'narrative') continue;
    const slug = data.id;
    console.log(`[narrate] tts ${slug}`);
    const plain = stripMarkdown(body);
    const audio = generateAudio(slug, plain);
    if (!audio) { console.warn(`     ✗  ${slug}`); continue; }
    // Update frontmatter de audio fields
    let md = readFileSync(f, 'utf8');
    md = md.replace(/^audio_url: .+$/m, `audio_url: ${audio.url}`);
    md = md.replace(/^audio_duration_sec: .+$/m, `audio_duration_sec: ${audio.duration_sec || ''}`);
    md = md.replace(/^audio_voice: .+$/m, `audio_voice: ${audio.voice}`);
    if (!md.includes('audio_url:')) {
      // si no existían los campos, los agregamos antes del cierre del frontmatter
      md = md.replace(/^---\n([\s\S]*?)\n---/m, (_, fm) => {
        const extras = [
          `audio_url: ${audio.url}`,
          `audio_duration_sec: ${audio.duration_sec || ''}`,
          `audio_voice: ${audio.voice}`,
        ].join('\n');
        return `---\n${fm}\n${extras}\n---`;
      });
    }
    writeFileSync(f, md);
    console.log(`     ✓  ${slug} (${audio.duration_sec}s)`);
  }
}

async function main() {
  console.log(`[narrate] modelo=${FLAGS.model} voz=${FLAGS.voice}${FLAGS.overwrite ? ' OVERWRITE' : ''}`);

  if (FLAGS.ttsOnly) {
    await ttsOnlyMode();
    return;
  }

  const cronos = loadCronos();

  // Verify Ollama up
  try {
    const r = await fetch('http://localhost:11434/api/tags');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  } catch (e) {
    console.error(`[narrate] no hay Ollama corriendo en localhost:11434 — arrancalo con \`ollama serve\``);
    process.exit(1);
  }

  let targets;
  if (CUSTOM_RANGE) {
    targets = [{ start: CUSTOM_RANGE[0], end: CUSTOM_RANGE[1], label: `${yearLabel(CUSTOM_RANGE[0])} → ${yearLabel(CUSTOM_RANGE[1])}` }];
  } else if (FLAGS.all) {
    targets = GRID;
  } else {
    console.error('Falta flag: --all | --range <start> <end> | --tts-only');
    process.exit(1);
  }

  console.log(`[narrate] generando ${targets.length} narrativa(s)`);
  const results = [];
  for (const period of targets) {
    results.push(await generateOne(period, cronos));
  }

  const ok = results.filter((r) => r.status === 'ok').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed = results.filter((r) => r.status === 'failed');
  console.log('');
  console.log(`[narrate] ───────────── resumen ─────────────`);
  console.log(`[narrate] OK:      ${ok}`);
  console.log(`[narrate] skipped: ${skipped}`);
  console.log(`[narrate] failed:  ${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(`[narrate]   - ${f.slug}: ${f.error}`);
    console.log(`[narrate] (drafts fallidos guardados en _sources/narrate-failures/)`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('[narrate] fatal:', e);
  process.exit(1);
});
