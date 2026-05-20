#!/usr/bin/env node
/**
 * Verifica que el contenido de content/polities/ respete el balance no-Eurocentric
 * mínimo por macro-región definido en PLAN §F3/paso-3.
 *
 * F2 stub: corre y reporta counts pero no rompe (sin enough data todavía).
 * F3 (paso 6) lo eleva a hard-fail si no cumple cuotas.
 *
 * Usage:
 *   node scripts/lint-balance.mjs                # warnings, exit 0
 *   node scripts/lint-balance.mjs --strict       # exit 1 si no cumple cuotas
 */

import { findMarkdownFiles, readEntity, CONTENT_DIR } from './lib/scan-content.mjs';
import { resolve } from 'node:path';

const STRICT = process.argv.includes('--strict');

// Cuotas mínimas por macro-región (PLAN §F3/paso-3).
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

const POLITIES_DIR = resolve(CONTENT_DIR, 'polities');
const files = findMarkdownFiles(POLITIES_DIR);

if (files.length === 0) {
  console.log('[lint-balance] content/polities/ vacío todavía — skipping (esperado pre-F3).');
  process.exit(0);
}

const byRegion = Object.fromEntries(Object.keys(QUOTAS).map((r) => [r, 0]));
let unknownRegions = 0;

for (const file of files) {
  const { data } = readEntity(file);
  if (!data || data.type !== 'polity') continue;
  if (byRegion[data.region] === undefined) {
    unknownRegions++;
    continue;
  }
  byRegion[data.region] += 1;
}

const total = Object.values(byRegion).reduce((a, b) => a + b, 0);
const minRequired = Object.values(QUOTAS).reduce((a, b) => a + b, 0);

console.log(`[lint-balance] total polities: ${total} (minimum cuotas: ${minRequired})`);
console.log('[lint-balance] counts por macro-región:');
const failures = [];
for (const [region, count] of Object.entries(byRegion)) {
  const quota = QUOTAS[region];
  const ok = count >= quota;
  const mark = ok ? '✓' : '✗';
  console.log(`  ${mark} ${region.padEnd(20)} ${count} / ${quota}`);
  if (!ok) failures.push({ region, count, quota });
}

if (unknownRegions > 0) {
  console.warn(`[lint-balance] ${unknownRegions} polity con region desconocida (no contada).`);
}

if (failures.length) {
  console.warn(`\n[lint-balance] ${failures.length} región(es) bajo cuota:`);
  for (const f of failures) {
    console.warn(`  ${f.region}: ${f.count} / ${f.quota} (necesita +${f.quota - f.count})`);
  }
  if (STRICT) {
    console.error('[lint-balance] --strict mode: balance check failed.');
    process.exit(1);
  }
  console.log('[lint-balance] WARN: balance no cumple cuotas (no-strict, no fail).');
  process.exit(0);
}

console.log('[lint-balance] OK — balance no-Eurocentric pasa cuotas mínimas.');
