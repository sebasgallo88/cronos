#!/usr/bin/env node
/**
 * F4 + F5: genera content/religions/, content/figures/ y content/events/
 * desde los SEEDs curados.
 *
 * Intención original PLAN: SPARQL queries a Wikidata. En esta sesión los
 * seeds son la fuente — quedan ejecutables como enrich-job futuro.
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
import { EVENTS_SEED } from './lib/events-seed.mjs';
import { REPO_ROOT } from './lib/scan-content.mjs';

const OVERWRITE = process.argv.includes('--overwrite');
const RELIGIONS_DIR = resolve(REPO_ROOT, 'content', 'religions');
const FIGURES_DIR = resolve(REPO_ROOT, 'content', 'figures');
const EVENTS_DIR = resolve(REPO_ROOT, 'content', 'events');

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

function yamlArray(label, arr, indent = '  ') {
  if (!arr?.length) return [];
  return [`${label}:`, ...arr.map((x) => `${indent}- ${x}`)];
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
  lines.push(...yamlArray('branches', r.branches));
  lines.push(`color: "${r.color}"`);
  lines.push(...yamlArray('tags', r.tags));
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
  lines.push(...yamlArray('polity', f.polity));
  lines.push(`region: ${f.region}`);
  lines.push(`role: ${f.role}`);
  lines.push(...yamlArray('tags', f.tags));
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

// ─── render events ───────────────────────────────────────────────────────

function eventFrontmatter(e, today) {
  const lines = ['---'];
  lines.push('type: event');
  lines.push(`id: ${e.id}`);
  lines.push(`name: ${yamlString(e.name)}`);
  if (e.name_en) lines.push(`name_en: ${yamlString(e.name_en)}`);
  lines.push(`year: ${e.year}`);
  if (e.year_end != null) lines.push(`year_end: ${e.year_end}`);
  lines.push(...yamlArray('polities', e.polities));
  lines.push(`region: ${e.region}`);
  lines.push(`category: ${e.category}`);
  lines.push(...yamlArray('tags', e.tags));
  if (e.wikidata) lines.push(`wikidata: ${e.wikidata}`);
  lines.push('sources:');
  for (const s of e.sources) lines.push(`  - ${yamlSource(s)}`);
  lines.push(`created: '${today}'`);
  lines.push(`updated: '${today}'`);
  lines.push('---');
  return lines.join('\n');
}

function renderEventMd(e, today) {
  return `${eventFrontmatter(e, today)}\n\n# ${e.name}\n\n${e.body.trim()}\n`;
}

// ─── helper de generación + counters ─────────────────────────────────────

function generateAll(dir, items, renderFn, today) {
  mkdirSync(dir, { recursive: true });
  let written = 0, skipped = 0;
  for (const item of items) {
    const outPath = join(dir, `${item.id}.md`);
    if (existsSync(outPath) && !OVERWRITE) {
      skipped++;
      continue;
    }
    writeFileSync(outPath, renderFn(item, today));
    written++;
  }
  return { written, skipped };
}

// ─── main ────────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);

const religions = generateAll(RELIGIONS_DIR, RELIGIONS_SEED, renderReligionMd, today);
const figures = generateAll(FIGURES_DIR, FIGURES_SEED, renderFigureMd, today);
const events = generateAll(EVENTS_DIR, EVENTS_SEED, renderEventMd, today);

console.log(`[ingest-wikidata] religions: wrote ${religions.written}, skipped ${religions.skipped}`);
console.log(`[ingest-wikidata] figures:   wrote ${figures.written},   skipped ${figures.skipped}`);
console.log(`[ingest-wikidata] events:    wrote ${events.written},   skipped ${events.skipped}`);

// Reports
const eventsByCategory = {};
for (const e of EVENTS_SEED) eventsByCategory[e.category] = (eventsByCategory[e.category] || 0) + 1;
console.log('\n[ingest-wikidata] events por categoría:');
for (const [cat, count] of Object.entries(eventsByCategory).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat.padEnd(12)} ${count}`);
}

const figuresByRegion = {};
for (const f of FIGURES_SEED) figuresByRegion[f.region] = (figuresByRegion[f.region] || 0) + 1;
console.log('\n[ingest-wikidata] figures por macro-región:');
for (const [region, count] of Object.entries(figuresByRegion).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${region.padEnd(22)} ${count}`);
}

console.log('\n[ingest-wikidata] OK');
