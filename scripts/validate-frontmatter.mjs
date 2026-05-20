#!/usr/bin/env node
/**
 * Validates frontmatter of all .md files in content/.
 * - Schema validation per type (polity, religion, figure, event) via Ajv.
 * - Cross-field checks (e.g., start_year < end_year).
 * - Filename ↔ id consistency.
 * - ID uniqueness within type.
 * - Cross-ref warnings (id references to entities not yet ingested).
 *
 * Schema errors → exit 1 (hard-fail; breaks `npm run build`).
 * Cross-ref warnings → printed, exit 0 (unless --strict).
 *
 * Usage:
 *   node scripts/validate-frontmatter.mjs           # warnings allowed
 *   node scripts/validate-frontmatter.mjs --strict  # warnings become errors
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { findMarkdownFiles, readEntity, entityIdFromFile, CONTENT_DIR } from './lib/scan-content.mjs';

const STRICT = process.argv.includes('--strict');

// Macro-regiones canónicas (PLAN §2/D7).
const REGIONS = [
  'mediterraneo', 'europa', 'medio-oriente', 'africa-subsahariana',
  'norte-africa', 'sur-asia', 'este-asia', 'sudeste-asia',
  'estepa', 'americas',
];

const ROLES = ['militar', 'religioso', 'filosofo', 'cientifico', 'politico', 'artista'];
const CATEGORIES = ['militar', 'politico', 'religioso', 'cientifico', 'cultural', 'economico', 'desastre'];

const idPattern = '^[a-z0-9-]+$';
const colorPattern = '^#[0-9A-Fa-f]{6}$';
const wikidataPattern = '^Q[0-9]+$';

const commonFields = {
  id: { type: 'string', pattern: idPattern, minLength: 1, maxLength: 80 },
  name: { type: 'string', minLength: 1 },
  name_en: { type: 'string' },
  name_native: { type: 'string' },
  wikidata: { type: 'string', pattern: wikidataPattern },
  sources: { type: 'array', items: { type: 'string', minLength: 1 }, minItems: 1 },
  created: { type: 'string', format: 'date' },
  updated: { type: 'string', format: 'date' },
  tags: { type: 'array', items: { type: 'string' } },
  color: { type: 'string', pattern: colorPattern },
};

const schemas = {
  polity: {
    type: 'object',
    required: ['type', 'id', 'name', 'start_year', 'end_year', 'region', 'color', 'sources', 'created', 'updated'],
    additionalProperties: false,
    properties: {
      type: { const: 'polity' },
      ...commonFields,
      start_year: { type: 'integer' },
      end_year: { type: 'integer' },
      region: { type: 'string', enum: REGIONS },
      capital: { type: 'string' },
      religion_dominant: { type: 'array', items: { type: 'string', pattern: idPattern } },
      predecessors: { type: 'array', items: { type: 'string', pattern: idPattern } },
      successors: { type: 'array', items: { type: 'string', pattern: idPattern } },
      population_peak: { type: 'integer', minimum: 0 },
      area_peak_km2: { type: 'integer', minimum: 0 },
      religious_complexity_score: { type: 'integer', minimum: 1, maximum: 5 },
    },
  },
  religion: {
    type: 'object',
    required: ['type', 'id', 'name', 'start_year', 'region_birth', 'color', 'sources', 'created', 'updated'],
    additionalProperties: false,
    properties: {
      type: { const: 'religion' },
      ...commonFields,
      start_year: { type: 'integer' },
      end_year: { type: ['integer', 'null'] },
      region_birth: { type: 'string', enum: REGIONS },
      branch_of: { type: ['string', 'null'], pattern: idPattern },
      branches: { type: 'array', items: { type: 'string', pattern: idPattern } },
    },
  },
  figure: {
    type: 'object',
    required: ['type', 'id', 'name', 'year_born', 'region', 'role', 'sources', 'created', 'updated'],
    additionalProperties: false,
    properties: {
      type: { const: 'figure' },
      ...commonFields,
      year_born: { type: 'integer' },
      year_died: { type: ['integer', 'null'] },
      polity: { type: 'array', items: { type: 'string', pattern: idPattern } },
      region: { type: 'string', enum: REGIONS },
      role: { type: 'string', enum: ROLES },
    },
  },
  event: {
    type: 'object',
    required: ['type', 'id', 'name', 'year', 'region', 'category', 'sources', 'created', 'updated'],
    additionalProperties: false,
    properties: {
      type: { const: 'event' },
      ...commonFields,
      year: { type: 'integer' },
      year_end: { type: ['integer', 'null'] },
      polities: { type: 'array', items: { type: 'string', pattern: idPattern } },
      region: { type: 'string', enum: REGIONS },
      category: { type: 'string', enum: CATEGORIES },
    },
  },
};

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validators = Object.fromEntries(
  Object.entries(schemas).map(([t, s]) => [t, ajv.compile(s)])
);

const errors = [];
const warnings = [];
const entities = { polity: new Map(), religion: new Map(), figure: new Map(), event: new Map() };

function crossFieldErrors(type, data) {
  const errs = [];
  if (type === 'polity' && data.start_year >= data.end_year) {
    errs.push(`start_year (${data.start_year}) must be < end_year (${data.end_year})`);
  }
  if (type === 'figure' && data.year_died != null && data.year_born > data.year_died) {
    errs.push(`year_born (${data.year_born}) must be ≤ year_died (${data.year_died})`);
  }
  if (type === 'event' && data.year_end != null && data.year > data.year_end) {
    errs.push(`year (${data.year}) must be ≤ year_end (${data.year_end})`);
  }
  if (type === 'religion' && data.end_year != null && data.start_year > data.end_year) {
    errs.push(`start_year (${data.start_year}) must be ≤ end_year (${data.end_year})`);
  }
  return errs;
}

function checkRefs(srcFile, targetType, refs, fieldName) {
  if (!refs) return;
  const list = Array.isArray(refs) ? refs : [refs];
  for (const ref of list) {
    if (typeof ref !== 'string') continue;
    if (!entities[targetType].has(ref)) {
      warnings.push(`${srcFile}: ${fieldName} → '${ref}' (${targetType} no existe en content/)`);
    }
  }
}

function reportAjvErrors(file, type, validate) {
  for (const err of validate.errors) {
    const path = err.instancePath || '/';
    const detail = err.message + (err.params ? ` ${JSON.stringify(err.params)}` : '');
    errors.push(`${file} (${type}): ${path} ${detail}`);
  }
}

// ─── main ────────────────────────────────────────────────────────────────

const files = findMarkdownFiles(CONTENT_DIR);

if (files.length === 0) {
  console.log('[validate-frontmatter] content/ vacío todavía — skipping (esperado en F1/F2 antes de F3).');
  process.exit(0);
}

for (const file of files) {
  const rel = file.slice(CONTENT_DIR.length + 1);
  let data;
  try {
    ({ data } = readEntity(file));
  } catch (e) {
    errors.push(`${rel}: failed to parse frontmatter — ${e.message}`);
    continue;
  }
  if (!data || !data.type) {
    errors.push(`${rel}: falta campo 'type' en frontmatter (debe ser polity|religion|figure|event)`);
    continue;
  }
  const type = data.type;
  if (!schemas[type]) {
    errors.push(`${rel}: type='${type}' desconocido (válidos: ${Object.keys(schemas).join(', ')})`);
    continue;
  }
  const validate = validators[type];
  if (!validate(data)) {
    reportAjvErrors(rel, type, validate);
    continue;
  }
  // Cross-field
  for (const e of crossFieldErrors(type, data)) errors.push(`${rel} (${type}): ${e}`);
  // Filename = id
  const expectedId = entityIdFromFile(file);
  if (data.id !== expectedId) {
    errors.push(`${rel}: id='${data.id}' no coincide con filename='${expectedId}.md'`);
  }
  // Unique
  if (entities[type].has(data.id)) {
    errors.push(`${rel}: duplicate id '${data.id}' (ya existe en ${entities[type].get(data.id).file})`);
    continue;
  }
  entities[type].set(data.id, { file: rel, data });
}

// Cross-refs (after collecting all entities)
for (const [, { file, data }] of entities.polity) {
  checkRefs(file, 'religion', data.religion_dominant, 'religion_dominant');
  checkRefs(file, 'polity', data.predecessors, 'predecessors');
  checkRefs(file, 'polity', data.successors, 'successors');
}
for (const [, { file, data }] of entities.religion) {
  if (data.branch_of) checkRefs(file, 'religion', [data.branch_of], 'branch_of');
  checkRefs(file, 'religion', data.branches, 'branches');
}
for (const [, { file, data }] of entities.figure) {
  checkRefs(file, 'polity', data.polity, 'polity');
}
for (const [, { file, data }] of entities.event) {
  checkRefs(file, 'polity', data.polities, 'polities');
}

// Report
const counts = Object.fromEntries(Object.entries(entities).map(([t, m]) => [t, m.size]));
console.log(`[validate-frontmatter] scanned ${files.length} files | counts: ${JSON.stringify(counts)}`);

if (warnings.length) {
  console.log(`\n[validate-frontmatter] ${warnings.length} warning(s) (cross-refs):`);
  for (const w of warnings) console.log(`  WARN: ${w}`);
}

if (errors.length) {
  console.error(`\n[validate-frontmatter] ${errors.length} error(s):`);
  for (const e of errors) console.error(`  ERROR: ${e}`);
  process.exit(1);
}

if (STRICT && warnings.length) {
  console.error(`\n[validate-frontmatter] --strict: ${warnings.length} warnings → exit 1`);
  process.exit(1);
}

console.log('[validate-frontmatter] OK');
