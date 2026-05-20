#!/usr/bin/env node
// F1 placeholder. Lectura de markdown + render a body_html se implementa en F2/F6.
// Por ahora: escribe un cronos.json vacío con meta + arrays vacíos para que el webapp
// pueda importarlo sin fallar.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '..', 'src', 'data', 'cronos.json');

const payload = {
  meta: {
    generated_at: new Date().toISOString(),
    placeholder: true,
    polity_count: 0,
    religion_count: 0,
    figure_count: 0,
    event_count: 0,
    time_range: [-5000, new Date().getFullYear()],
  },
  regions: [],
  polities: [],
  religions: [],
  figures: [],
  events: [],
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2));

console.log(`[build-data] F1 placeholder — wrote empty cronos.json to ${outPath}`);
