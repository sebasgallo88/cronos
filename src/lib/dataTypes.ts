/**
 * Tipos TypeScript que describen la shape de src/data/cronos.json (el build
 * artifact generado por scripts/build-data.mjs).
 *
 * Mantener sincronizado con los schemas Ajv en scripts/validate-frontmatter.mjs
 * y la doc en docs/data-model.md.
 */

export type RegionId =
  | 'mediterraneo'
  | 'europa'
  | 'medio-oriente'
  | 'norte-africa'
  | 'africa-subsahariana'
  | 'sur-asia'
  | 'este-asia'
  | 'sudeste-asia'
  | 'estepa'
  | 'americas';

export type EntityType = 'polity' | 'religion' | 'figure' | 'event';

export type FigureRole =
  | 'militar'
  | 'religioso'
  | 'filosofo'
  | 'cientifico'
  | 'politico'
  | 'artista';

export type EventCategory =
  | 'militar'
  | 'politico'
  | 'religioso'
  | 'cientifico'
  | 'cultural'
  | 'economico'
  | 'desastre';

export interface Region {
  id: RegionId;
  name: string;
  name_en: string;
  order: number;
}

export interface BaseEntity {
  type: EntityType;
  id: string;
  name: string;
  name_en?: string;
  name_native?: string;
  tags?: string[];
  wikidata?: string;
  sources: string[];
  created: string;
  updated: string;
  body_html: string | null;
}

export interface Polity extends BaseEntity {
  type: 'polity';
  start_year: number;
  end_year: number;
  region: RegionId;
  capital?: string;
  religion_dominant?: string[];
  predecessors?: string[];
  successors?: string[];
  color: string;
  population_peak?: number;
  area_peak_km2?: number;
  religious_complexity_score?: number;
  /** Cross-ref calculado en build: events que listan esta polity. */
  event_ids?: string[];
  /** Cross-ref calculado en build: figures asociadas a esta polity. */
  figure_ids?: string[];
}

export interface Religion extends BaseEntity {
  type: 'religion';
  start_year: number;
  end_year: number | null;
  region_birth: RegionId;
  branch_of: string | null;
  branches?: string[];
  color: string;
  /** Cross-ref: polities con esta religion en religion_dominant. */
  polity_ids?: string[];
  /** Cross-ref: figures asociadas (vía polity → religion_dominant). */
  figure_ids?: string[];
}

export interface Figure extends BaseEntity {
  type: 'figure';
  year_born: number;
  year_died: number | null;
  polity?: string[];
  region: RegionId;
  role: FigureRole;
}

export interface HistoricalEvent extends BaseEntity {
  type: 'event';
  year: number;
  year_end?: number | null;
  polities?: string[];
  region: RegionId;
  category: EventCategory;
}

export interface CronosMeta {
  generated_at: string;
  polity_count: number;
  religion_count: number;
  figure_count: number;
  event_count: number;
  time_range: [number, number];
}

export interface CronosData {
  meta: CronosMeta;
  regions: Region[];
  polities: Polity[];
  religions: Religion[];
  figures: Figure[];
  events: HistoricalEvent[];
}
