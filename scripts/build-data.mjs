#!/usr/bin/env node
/**
 * Lee todos los .md de content/ y escribe src/data/cronos.json.
 *
 * F2: full frontmatter por entidad, sin body_html ni cross-refs computados.
 * F6: agrega body_html (marked) + cross-refs (events per polity, etc.) + sort/minify.
 *
 * Usage: node scripts/build-data.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { findMarkdownFiles, readEntity, CONTENT_DIR, REPO_ROOT } from './lib/scan-content.mjs';

const OUT_PATH = resolve(REPO_ROOT, 'src', 'data', 'cronos.json');

// Macro-regiones (mismo orden que PLAN §2/D7).
const REGIONS = [
  { id: 'mediterraneo',         name: 'Mediterráneo',                 name_en: 'Mediterranean',         order: 1 },
  { id: 'europa',               name: 'Europa (post-Roma)',           name_en: 'Europe',                order: 2 },
  { id: 'medio-oriente',        name: 'Medio Oriente / Mesopotamia',  name_en: 'Middle East',           order: 3 },
  { id: 'norte-africa',         name: 'Norte de África / Egipto',     name_en: 'North Africa / Egypt',  order: 4 },
  { id: 'africa-subsahariana',  name: 'África Sub-Sahariana',         name_en: 'Sub-Saharan Africa',    order: 5 },
  { id: 'sur-asia',             name: 'Sur de Asia',                   name_en: 'South Asia',            order: 6 },
  { id: 'este-asia',            name: 'Este de Asia',                  name_en: 'East Asia',             order: 7 },
  { id: 'sudeste-asia',         name: 'Sudeste Asiático',              name_en: 'Southeast Asia',        order: 8 },
  { id: 'estepa',               name: 'Estepa / Asia Central',         name_en: 'Steppe / Central Asia', order: 9 },
  { id: 'americas',             name: 'Américas',                      name_en: 'Americas',              order: 10 },
];

const entities = { polity: [], religion: [], figure: [], event: [] };

for (const file of findMarkdownFiles(CONTENT_DIR)) {
  const { data, body } = readEntity(file);
  if (!data || !data.type || !entities[data.type]) continue;
  // F6 reemplazará body con body_html (marked-rendered). Por ahora guardamos raw.
  entities[data.type].push({ ...data, body, body_html: null });
}

entities.polity.sort((a, b) => a.start_year - b.start_year);
entities.religion.sort((a, b) => a.start_year - b.start_year);
entities.figure.sort((a, b) => a.year_born - b.year_born);
entities.event.sort((a, b) => a.year - b.year);

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

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));

const c = payload.meta;
console.log(
  `[build-data] wrote ${OUT_PATH.replace(REPO_ROOT + '/', '')}: ` +
  `${c.polity_count}p + ${c.religion_count}r + ${c.figure_count}f + ${c.event_count}e ` +
  `(range ${c.time_range[0]} → ${c.time_range[1]})`
);
