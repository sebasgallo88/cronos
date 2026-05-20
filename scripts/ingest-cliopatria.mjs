#!/usr/bin/env node
/**
 * F3: genera los 50 .md de content/polities/ a partir del SEED curado.
 *
 * Intención original del PLAN: descargar Cliopatria GeoJSON (Harvard Dataverse,
 * CC-BY) y parsearlo. En esta sesión no se accedió al GeoJSON, así que la
 * curación editorial vive en scripts/lib/polities-seed.mjs (documentada en
 * docs/polities-curation.md). El script queda listo para enriquecer con
 * Cliopatria cuando esté disponible (ver `enrichFromCliopatria` placeholder).
 *
 * Comportamiento:
 *   - Lee el SEED.
 *   - Asigna color algorítmico (HSL por macro-región × lightness ramp por idx) si no viene fijado.
 *   - Para cada polity escribe content/polities/{id}.md SOLO si el archivo no existe
 *     (preserva edits manuales como roma.md).
 *   - Reporta written/skipped/totales por región y verifica que cubrimos cuotas.
 *
 * Usage:
 *   node scripts/ingest-cliopatria.mjs              # default: respeta archivos existentes
 *   node scripts/ingest-cliopatria.mjs --overwrite  # regenera todo (peligroso, pierde edits)
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { POLITIES_SEED } from './lib/polities-seed.mjs';
import { REPO_ROOT } from './lib/scan-content.mjs';

const OVERWRITE = process.argv.includes('--overwrite');
const POLITIES_DIR = resolve(REPO_ROOT, 'content', 'polities');

// Cuotas mínimas no-Eurocentric (PLAN §F3/paso-3). Mismas que lint-balance.mjs.
const QUOTAS = {
  'mediterraneo': 4,
  'europa': 4,
  'medio-oriente': 5,
  'norte-africa': 3,
  'africa-subsahariana': 5,
  'sur-asia': 5,
  'este-asia': 5,
  'sudeste-asia': 3,
  'estepa': 5,
  'americas': 5,
};

// Paleta autogenerada (decisión §12.4): hue base por región, lightness ramp por idx.
const REGION_HUES = {
  'mediterraneo':         0,    // rojos / vinos
  'europa':               220,  // azules
  'medio-oriente':        35,   // dorados / mostaza
  'norte-africa':         48,   // amarillos arena
  'africa-subsahariana':  110,  // verdes
  'sur-asia':             295,  // magentas / púrpuras
  'este-asia':            8,    // rojos cinabrio
  'sudeste-asia':         165,  // teal
  'estepa':               200,  // azul acero
  'americas':             22,   // terracotas
};

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function computeColor(region, idx) {
  const hue = REGION_HUES[region] ?? 0;
  // lightness varía entre 28% y 52% según idx (capamos a 7 polities/región por seed)
  const lightness = Math.min(28 + idx * 4, 52);
  return hslToHex(hue, 55, lightness);
}

function escapeYamlString(s) {
  if (s == null) return '';
  if (/^[A-Za-z0-9 _\-./()]+$/.test(s)) return s; // simple, no quotes
  return JSON.stringify(s); // double-quoted with escapes
}

function frontmatterYaml(p, today) {
  const lines = ['---'];
  lines.push('type: polity');
  lines.push(`id: ${p.id}`);
  lines.push(`name: ${escapeYamlString(p.name)}`);
  if (p.name_en) lines.push(`name_en: ${escapeYamlString(p.name_en)}`);
  if (p.name_native) lines.push(`name_native: ${escapeYamlString(p.name_native)}`);
  lines.push(`start_year: ${p.start_year}`);
  lines.push(`end_year: ${p.end_year}`);
  lines.push(`region: ${p.region}`);
  if (p.capital) lines.push(`capital: ${escapeYamlString(p.capital)}`);
  if (p.religion_dominant?.length) {
    lines.push('religion_dominant:');
    for (const x of p.religion_dominant) lines.push(`  - ${x}`);
  }
  if (p.predecessors?.length) {
    lines.push('predecessors:');
    for (const x of p.predecessors) lines.push(`  - ${x}`);
  }
  if (p.successors?.length) {
    lines.push('successors:');
    for (const x of p.successors) lines.push(`  - ${x}`);
  }
  lines.push(`color: "${p.color}"`);
  if (p.tags?.length) {
    lines.push('tags:');
    for (const t of p.tags) lines.push(`  - ${t}`);
  }
  if (p.population_peak != null) lines.push(`population_peak: ${p.population_peak}`);
  if (p.area_peak_km2 != null) lines.push(`area_peak_km2: ${p.area_peak_km2}`);
  if (p.religious_complexity_score != null) lines.push(`religious_complexity_score: ${p.religious_complexity_score}`);
  if (p.wikidata) lines.push(`wikidata: ${p.wikidata}`);
  lines.push('sources:');
  for (const s of p.sources) {
    if (/^[A-Za-z0-9:/._\-?#=&%~+@!,()*'$]+$/.test(s)) lines.push(`  - ${s}`);
    else lines.push(`  - ${JSON.stringify(s)}`);
  }
  lines.push(`created: '${today}'`);
  lines.push(`updated: '${today}'`);
  lines.push('---');
  return lines.join('\n');
}

function renderMarkdown(p, today) {
  const fm = frontmatterYaml(p, today);
  const body = p.body ? p.body.trim() : 'TODO: agregar descripción.';
  return `${fm}\n\n# ${p.name}\n\n${body}\n`;
}

// ─── main ────────────────────────────────────────────────────────────────

mkdirSync(POLITIES_DIR, { recursive: true });
const today = new Date().toISOString().slice(0, 10);

// 1. Asignar colores algorítmicos por (región, idx-en-región).
const regionIdx = new Map();
for (const p of POLITIES_SEED) {
  if (!p.color) {
    const idx = regionIdx.get(p.region) || 0;
    p.color = computeColor(p.region, idx);
    regionIdx.set(p.region, idx + 1);
  }
}

let written = 0, skipped = 0;
const seedIdsByRegion = {};
for (const region of Object.keys(QUOTAS)) seedIdsByRegion[region] = [];

for (const p of POLITIES_SEED) {
  seedIdsByRegion[p.region]?.push(p.id);
  const outPath = join(POLITIES_DIR, `${p.id}.md`);
  if (existsSync(outPath) && !OVERWRITE) {
    skipped++;
    continue;
  }
  writeFileSync(outPath, renderMarkdown(p, today));
  written++;
}

// 2. Verificar que (SEED ∪ archivos existentes) cubren cuotas.
// Para cubrir el caso de polities existentes que no están en el seed (ej. roma.md),
// también escaneamos content/polities/ para contar real.
import('./lib/scan-content.mjs').then(async ({ findMarkdownFiles, readEntity }) => {
  const files = findMarkdownFiles(POLITIES_DIR);
  const byRegion = Object.fromEntries(Object.keys(QUOTAS).map((r) => [r, 0]));
  for (const file of files) {
    const { data } = readEntity(file);
    if (data?.type === 'polity' && byRegion[data.region] != null) {
      byRegion[data.region] += 1;
    }
  }

  console.log(`\n[ingest-cliopatria] wrote ${written}, skipped ${skipped} (already existed)`);
  console.log(`[ingest-cliopatria] total polities en content/polities/: ${files.length}`);
  console.log('[ingest-cliopatria] balance por macro-región vs cuota:');
  let allOk = true;
  for (const [region, count] of Object.entries(byRegion)) {
    const quota = QUOTAS[region];
    const ok = count >= quota;
    if (!ok) allOk = false;
    console.log(`  ${ok ? '✓' : '✗'} ${region.padEnd(22)} ${count} / ${quota}`);
  }
  if (!allOk) {
    console.error('\n[ingest-cliopatria] FALLO: cuotas no cumplidas. Agregar polities al seed.');
    process.exit(1);
  }
  console.log('\n[ingest-cliopatria] OK — balance no-Eurocentric cumplido.');
});
