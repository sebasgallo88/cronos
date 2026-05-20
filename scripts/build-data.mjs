#!/usr/bin/env node
/**
 * F6 (final): genera src/data/cronos.json desde content/*.md.
 *
 * Produce JSON con:
 *   - meta (counts, time_range, generated_at)
 *   - regions (10 canónicas)
 *   - polities[]   — body_html + event_ids + figure_ids cross-refs
 *   - religions[]  — body_html + polity_ids cross-refs
 *   - figures[]    — body_html
 *   - events[]     — body_html
 *
 * El body raw se descarta del JSON final (sólo body_html lo consume el webapp).
 *
 * Minifica si > 500 KB (PLAN §F6/paso-4).
 *
 * Usage: node scripts/build-data.mjs
 */

import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { marked } from 'marked';
import { findMarkdownFiles, readEntity, CONTENT_DIR, REPO_ROOT } from './lib/scan-content.mjs';

const OUT_PATH = resolve(REPO_ROOT, 'src', 'data', 'cronos.json');

// Macro-regiones canónicas (mismo orden que PLAN §2/D7 y validate-frontmatter.mjs).
const REGIONS = [
  { id: 'mediterraneo',         name: 'Mediterráneo',                 name_en: 'Mediterranean',         order: 1 },
  { id: 'europa',               name: 'Europa (post-Roma)',           name_en: 'Europe',                order: 2 },
  { id: 'medio-oriente',        name: 'Medio Oriente / Mesopotamia',  name_en: 'Middle East',           order: 3 },
  { id: 'norte-africa',         name: 'Norte de África / Egipto',     name_en: 'North Africa / Egypt',  order: 4 },
  { id: 'africa-subsahariana',  name: 'África Sub-Sahariana',         name_en: 'Sub-Saharan Africa',    order: 5 },
  { id: 'sur-asia',             name: 'Sur de Asia',                  name_en: 'South Asia',            order: 6 },
  { id: 'este-asia',            name: 'Este de Asia',                 name_en: 'East Asia',             order: 7 },
  { id: 'sudeste-asia',         name: 'Sudeste Asiático',             name_en: 'Southeast Asia',        order: 8 },
  { id: 'estepa',               name: 'Estepa / Asia Central',        name_en: 'Steppe / Central Asia', order: 9 },
  { id: 'americas',             name: 'Américas',                     name_en: 'Americas',              order: 10 },
];

// Configurar marked: sin sanitize (confiamos en nuestro markdown), GFM on.
marked.use({
  gfm: true,
  breaks: false,
  pedantic: false,
});

function renderBodyHtml(body) {
  if (!body) return null;
  // Strip leading H1 (típicamente repite el name). Detail panel ya muestra el name.
  // .trim() primero porque gray-matter puede dejar leading \n entre frontmatter y body.
  const stripped = body.trim().replace(/^#\s+[^\n]+\n+/, '');
  if (!stripped) return null;
  return marked.parse(stripped).trim();
}

// ─── escanear ────────────────────────────────────────────────────────────

const entities = { polity: [], religion: [], figure: [], event: [] };

for (const file of findMarkdownFiles(CONTENT_DIR)) {
  const { data, body } = readEntity(file);
  if (!data || !data.type || !entities[data.type]) continue;
  entities[data.type].push({ ...data, _body: body });
}

// ─── cross-refs ──────────────────────────────────────────────────────────

const polityIds = new Set(entities.polity.map((p) => p.id));
const religionIds = new Set(entities.religion.map((r) => r.id));

// events per polity, figures per polity, religion per polity (already in field)
const eventsByPolity = new Map();
for (const e of entities.event) {
  for (const pid of e.polities || []) {
    if (!polityIds.has(pid)) continue;
    if (!eventsByPolity.has(pid)) eventsByPolity.set(pid, []);
    eventsByPolity.get(pid).push(e.id);
  }
}

const figuresByPolity = new Map();
for (const f of entities.figure) {
  for (const pid of f.polity || []) {
    if (!polityIds.has(pid)) continue;
    if (!figuresByPolity.has(pid)) figuresByPolity.set(pid, []);
    figuresByPolity.get(pid).push(f.id);
  }
}

// polities per religion
const politiesByReligion = new Map();
for (const p of entities.polity) {
  for (const rid of p.religion_dominant || []) {
    if (!religionIds.has(rid)) continue;
    if (!politiesByReligion.has(rid)) politiesByReligion.set(rid, []);
    politiesByReligion.get(rid).push(p.id);
  }
}

// figures per religion (derivado vía polity → religion_dominant)
const figuresByReligion = new Map();
for (const f of entities.figure) {
  const seenReligions = new Set();
  for (const pid of f.polity || []) {
    const polity = entities.polity.find((p) => p.id === pid);
    if (!polity) continue;
    for (const rid of polity.religion_dominant || []) {
      if (!religionIds.has(rid)) continue;
      if (seenReligions.has(rid)) continue;
      seenReligions.add(rid);
      if (!figuresByReligion.has(rid)) figuresByReligion.set(rid, []);
      figuresByReligion.get(rid).push(f.id);
    }
  }
}

// ─── render body_html + adjuntar cross-refs ──────────────────────────────

for (const p of entities.polity) {
  p.body_html = renderBodyHtml(p._body);
  p.event_ids = eventsByPolity.get(p.id) || [];
  p.figure_ids = figuresByPolity.get(p.id) || [];
  delete p._body;
}
for (const r of entities.religion) {
  r.body_html = renderBodyHtml(r._body);
  r.polity_ids = politiesByReligion.get(r.id) || [];
  r.figure_ids = figuresByReligion.get(r.id) || [];
  delete r._body;
}
for (const f of entities.figure) {
  f.body_html = renderBodyHtml(f._body);
  delete f._body;
}
for (const e of entities.event) {
  e.body_html = renderBodyHtml(e._body);
  delete e._body;
}

// ─── sort ────────────────────────────────────────────────────────────────

entities.polity.sort((a, b) => a.start_year - b.start_year);
entities.religion.sort((a, b) => a.start_year - b.start_year);
entities.figure.sort((a, b) => a.year_born - b.year_born);
entities.event.sort((a, b) => a.year - b.year);

// ─── meta time_range ─────────────────────────────────────────────────────

const allYears = [];
for (const e of entities.polity) allYears.push(e.start_year, e.end_year);
for (const e of entities.religion) {
  allYears.push(e.start_year);
  if (e.end_year != null) allYears.push(e.end_year);
}
for (const e of entities.figure) {
  allYears.push(e.year_born);
  if (e.year_died != null) allYears.push(e.year_died);
}
for (const e of entities.event) {
  allYears.push(e.year);
  if (e.year_end != null) allYears.push(e.year_end);
}
const minYear = allYears.length ? Math.min(...allYears) : -5000;
const maxYear = allYears.length ? Math.max(...allYears) : new Date().getFullYear();

const payload = {
  meta: {
    generated_at: new Date().toISOString(),
    polity_count: entities.polity.length,
    religion_count: entities.religion.length,
    figure_count: entities.figure.length,
    event_count: entities.event.length,
    time_range: [minYear, maxYear],
  },
  regions: REGIONS,
  polities: entities.polity,
  religions: entities.religion,
  figures: entities.figure,
  events: entities.event,
};

// ─── write con minification condicional ──────────────────────────────────

const SIZE_THRESHOLD_BYTES = 500 * 1024;
const pretty = JSON.stringify(payload, null, 2);
const minified = JSON.stringify(payload);

const useMinified = Buffer.byteLength(pretty, 'utf8') > SIZE_THRESHOLD_BYTES;
const finalOutput = useMinified ? minified : pretty;

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, finalOutput);

const finalKB = (Buffer.byteLength(finalOutput, 'utf8') / 1024).toFixed(1);
const c = payload.meta;
console.log(
  `[build-data] wrote ${OUT_PATH.replace(REPO_ROOT + '/', '')}: ` +
  `${c.polity_count}p + ${c.religion_count}r + ${c.figure_count}f + ${c.event_count}e ` +
  `(range ${c.time_range[0]} → ${c.time_range[1]}, ${finalKB} KB, ${useMinified ? 'minified' : 'pretty'})`
);

// Reportar tamaño top-level por entidad
const sizes = {
  polities: Buffer.byteLength(JSON.stringify(payload.polities), 'utf8'),
  religions: Buffer.byteLength(JSON.stringify(payload.religions), 'utf8'),
  figures: Buffer.byteLength(JSON.stringify(payload.figures), 'utf8'),
  events: Buffer.byteLength(JSON.stringify(payload.events), 'utf8'),
};
const sortedSizes = Object.entries(sizes).sort((a, b) => b[1] - a[1]);
console.log('[build-data] bytes por colección:');
for (const [name, bytes] of sortedSizes) {
  console.log(`  ${name.padEnd(12)} ${(bytes / 1024).toFixed(1)} KB`);
}
