#!/usr/bin/env node
/**
 * F4: genera content/religions/ y content/figures/ desde SEED curado.
 *
 * Intención original PLAN: SPARQL queries a Wikidata (religions, founders,
 * rulers-by-polity, key-figures-by-occupation). En esta sesión los seeds
 * son la fuente — quedan ejecutables como enrich-job futuro si se quiere
 * traer rulers adicionales por polity.
 *
 * Sin sobreescribir archivos existentes (preserva edits manuales).
 *
 * Usage:
 *   node scripts/ingest-wikidata.mjs              # default: respeta existentes
 *   node scripts/ingest-wikidata.mjs --overwrite  # regenera (pierde edits)
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { RELIGIONS_SEED } from './lib/religions-seed.mjs';
import { FIGURES_SEED } from './lib/figures-seed.mjs';
import { REPO_ROOT } from './lib/scan-content.mjs';

const OVERWRITE = process.argv.includes('--overwrite');
const RELIGIONS_DIR = resolve(REPO_ROOT, 'content', 'religions');
const FIGURES_DIR = resolve(REPO_ROOT, 'content', 'figures');

// ─── helpers de YAML ─────────────────────────────────────────────────────

function yamlString(s) {
  if (s == null) return '""';
  if (/^[A-Za-z0-9 _\-./()]+$/.test(s)) return s;
  return JSON.stringify(s);
}

function yamlSource(s) {
  if (/^[A-Za-z0-9:/._\-?#=&%~+@!,()*'$]+$/.test(s)) return s;
  return JSON.stringify(s);
}

// ─── render religions ────────────────────────────────────────────────────

function religionFrontmatter(r, today) {
  const lines = ['---'];
  lines.push('type: religion');
  lines.push(`id: ${r.id}`);
  lines.push(`name: ${yamlString(r.name)}`);
  if (r.name_en) lines.push(`name_en: ${yamlString(r.name_en)}`);
  lines.push(`start_year: ${r.start_year}`);
  lines.push(`end_year: ${r.end_year == null ? 'null' : r.end_year}`);
  lines.push(`region_birth: ${r.region_birth}`);
  lines.push(`branch_of: ${r.branch_of == null ? 'null' : r.branch_of}`);
  if (r.branches?.length) {
    lines.push('branches:');
    for (const b of r.branches) lines.push(`  - ${b}`);
  }
  lines.push(`color: "${r.color}"`);
  if (r.tags?.length) {
    lines.push('tags:');
    for (const t of r.tags) lines.push(`  - ${t}`);
  }
  if (r.wikidata) lines.push(`wikidata: ${r.wikidata}`);
  lines.push('sources:');
  for (const s of r.sources) lines.push(`  - ${yamlSource(s)}`);
  lines.push(`created: '${today}'`);
  lines.push(`updated: '${today}'`);
  lines.push('---');
  return lines.join('\n');
}

function renderReligionMd(r, today) {
  return `${religionFrontmatter(r, today)}\n\n# ${r.name}\n\n${r.body.trim()}\n`;
}

// ─── render figures ──────────────────────────────────────────────────────

function figureFrontmatter(f, today) {
  const lines = ['---'];
  lines.push('type: figure');
  lines.push(`id: ${f.id}`);
  lines.push(`name: ${yamlString(f.name)}`);
  if (f.name_en) lines.push(`name_en: ${yamlString(f.name_en)}`);
  if (f.name_native) lines.push(`name_native: ${yamlString(f.name_native)}`);
  lines.push(`year_born: ${f.year_born}`);
  if (f.year_died != null) lines.push(`year_died: ${f.year_died}`);
  if (f.polity?.length) {
    lines.push('polity:');
    for (const p of f.polity) lines.push(`  - ${p}`);
  }
  lines.push(`region: ${f.region}`);
  lines.push(`role: ${f.role}`);
  if (f.tags?.length) {
    lines.push('tags:');
    for (const t of f.tags) lines.push(`  - ${t}`);
  }
  if (f.wikidata) lines.push(`wikidata: ${f.wikidata}`);
  lines.push('sources:');
  for (const s of f.sources) lines.push(`  - ${yamlSource(s)}`);
  lines.push(`created: '${today}'`);
  lines.push(`updated: '${today}'`);
  lines.push('---');
  return lines.join('\n');
}

function renderFigureMd(f, today) {
  return `${figureFrontmatter(f, today)}\n\n# ${f.name}\n\n${f.body.trim()}\n`;
}

// ─── main ────────────────────────────────────────────────────────────────

mkdirSync(RELIGIONS_DIR, { recursive: true });
mkdirSync(FIGURES_DIR, { recursive: true });
const today = new Date().toISOString().slice(0, 10);

// religions
let religionsWritten = 0, religionsSkipped = 0;
for (const r of RELIGIONS_SEED) {
  const outPath = join(RELIGIONS_DIR, `${r.id}.md`);
  if (existsSync(outPath) && !OVERWRITE) {
    religionsSkipped++;
    continue;
  }
  writeFileSync(outPath, renderReligionMd(r, today));
  religionsWritten++;
}

// figures
let figuresWritten = 0, figuresSkipped = 0;
const figuresByRegion = {};
for (const f of FIGURES_SEED) {
  figuresByRegion[f.region] = (figuresByRegion[f.region] || 0) + 1;
  const outPath = join(FIGURES_DIR, `${f.id}.md`);
  if (existsSync(outPath) && !OVERWRITE) {
    figuresSkipped++;
    continue;
  }
  writeFileSync(outPath, renderFigureMd(f, today));
  figuresWritten++;
}

console.log(`[ingest-wikidata] religions: wrote ${religionsWritten}, skipped ${religionsSkipped}`);
console.log(`[ingest-wikidata] figures:   wrote ${figuresWritten}, skipped ${figuresSkipped}`);
console.log('\n[ingest-wikidata] figures por macro-región:');
const sortedRegions = Object.entries(figuresByRegion).sort((a, b) => b[1] - a[1]);
for (const [region, count] of sortedRegions) {
  console.log(`  ${region.padEnd(22)} ${count}`);
}

const minPerRegion = 2;
const failures = sortedRegions.filter(([, c]) => c < minPerRegion);
if (failures.length) {
  console.warn(`\n[ingest-wikidata] WARN: ${failures.length} regiones con < ${minPerRegion} figuras`);
}
console.log('\n[ingest-wikidata] OK');
