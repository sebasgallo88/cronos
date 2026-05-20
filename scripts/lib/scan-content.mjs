// Shared helpers para escanear content/ y parsear frontmatter.
// Lo usan validate-frontmatter.mjs, build-data.mjs, lint-balance.mjs.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const CONTENT_DIR = resolve(__dirname, '..', '..', 'content');
export const REPO_ROOT = resolve(__dirname, '..', '..');

export function findMarkdownFiles(dir) {
  let out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (e) {
    if (e.code === 'ENOENT') return out;
    throw e;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) {
      out = out.concat(findMarkdownFiles(full));
    } else if (extname(name) === '.md' && name.toLowerCase() !== 'readme.md') {
      out.push(full);
    }
  }
  return out;
}

export function readEntity(file) {
  const raw = readFileSync(file, 'utf8');
  const parsed = matter(raw);
  return {
    data: normalizeDates(parsed.data || {}),
    body: parsed.content || '',
    file,
  };
}

// gray-matter parsea ISO dates en frontmatter como Date objects.
// Normalizamos a 'YYYY-MM-DD' string para que Ajv (format: 'date') las acepte.
export function normalizeDates(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = v instanceof Date ? v.toISOString().slice(0, 10) : v;
  }
  return out;
}

export function entityIdFromFile(file) {
  return basename(file, '.md');
}
