#!/usr/bin/env node
/**
 * F5/paso-2 (placeholder): enriquece content/polities/ con datos de Seshat
 * (`population_peak`, `area_peak_km2`, `religious_complexity_score`).
 *
 * En esta sesión Seshat no se descargó porque requiere registro (ver
 * docs/ACTION_ITEMS_FOR_SEBAS.md punto 3). Cuando Sebas tenga el CSV:
 *
 *   1. Colocar el dump en `_sources/seshat.csv` (gitignored).
 *   2. Implementar el fuzzy-match polity→seshat-polity en este script
 *      (recomendado: trigrama + jaccard score sobre nombre + start_year
 *       como tiebreaker; ver PLAN §F5/paso-2 "fuzzy match es donde se
 *       pierden datos sin querer").
 *   3. Por cada match, leer `polities/{id}.md`, mutar frontmatter agregando
 *      los campos opcionales, escribir back.
 *   4. Correr `npm run validate` para confirmar que el schema aún pasa.
 *
 * Por ahora: no-op + log.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from './lib/scan-content.mjs';

const SESHAT_CSV = resolve(REPO_ROOT, '_sources', 'seshat.csv');

if (!existsSync(SESHAT_CSV)) {
  console.log('[ingest-seshat] _sources/seshat.csv no existe.');
  console.log('[ingest-seshat] Esto es esperado en v1 — Seshat requiere account.');
  console.log('[ingest-seshat] Ver docs/ACTION_ITEMS_FOR_SEBAS.md punto 3 para los pasos.');
  console.log('[ingest-seshat] no-op exit 0.');
  process.exit(0);
}

// Path para cuando exista el CSV (no implementado en v1 autonomous):
console.log('[ingest-seshat] _sources/seshat.csv encontrado.');
console.log('[ingest-seshat] La lógica de fuzzy-match no está implementada todavía.');
console.log('[ingest-seshat] Ver el header de este script para los pasos a implementar.');
process.exit(0);
