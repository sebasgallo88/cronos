/**
 * Estado de filtros del histomap y helpers para aplicar.
 * Definidos por separado para que la lógica sea fácilmente testable.
 */

import type {
  CronosData,
  Figure,
  HistoricalEvent,
  Polity,
  Religion,
  RegionId,
} from './dataTypes';

export type EntityTypeFilter = 'polity' | 'religion' | 'figure' | 'event';

export interface FilterState {
  /** Si está vacío → no se filtra por región. */
  regions: Set<RegionId>;
  /** Si está vacío → no se filtra por religión. */
  religions: Set<string>;
  /** Cuáles tipos de entidad rendear. */
  types: Record<EntityTypeFilter, boolean>;
  /** Rango temporal visible (intersect con start/end de cada entidad). */
  eraRange: [number, number];
}

export function defaultFilterState(data: CronosData): FilterState {
  return {
    regions: new Set(data.regions.map((r) => r.id)),
    religions: new Set(data.religions.map((r) => r.id)),
    types: { polity: true, religion: true, figure: true, event: true },
    eraRange: [data.meta.time_range[0], data.meta.time_range[1]],
  };
}

function inEra(filters: FilterState, start: number, end: number): boolean {
  const [lo, hi] = filters.eraRange;
  return end >= lo && start <= hi;
}

export function filterPolities(polities: Polity[], filters: FilterState): Polity[] {
  if (!filters.types.polity) return [];
  return polities.filter(
    (p) =>
      filters.regions.has(p.region) &&
      inEra(filters, p.start_year, p.end_year),
  );
}

export function filterReligions(religions: Religion[], filters: FilterState): Religion[] {
  if (!filters.types.religion) return [];
  return religions.filter((r) => {
    if (!filters.religions.has(r.id)) return false;
    const end = r.end_year ?? new Date().getFullYear();
    return inEra(filters, r.start_year, end);
  });
}

export function filterFigures(
  figures: Figure[],
  polities: Polity[],
  filters: FilterState,
): Figure[] {
  if (!filters.types.figure) return [];
  const visiblePolityIds = new Set(filterPolities(polities, filters).map((p) => p.id));
  return figures.filter((f) => {
    if (!filters.regions.has(f.region)) return false;
    const yr = f.year_born;
    if (yr < filters.eraRange[0] || yr > filters.eraRange[1]) return false;
    // Sin polity: visible si su región está prendida.
    // Con polity: requerir que al menos uno de sus polities sea visible.
    if (!f.polity?.length) return true;
    return f.polity.some((pid) => visiblePolityIds.has(pid));
  });
}

export function filterEvents(
  events: HistoricalEvent[],
  polities: Polity[],
  filters: FilterState,
): HistoricalEvent[] {
  if (!filters.types.event) return [];
  const visiblePolityIds = new Set(filterPolities(polities, filters).map((p) => p.id));
  return events.filter((e) => {
    if (!filters.regions.has(e.region)) return false;
    const yr = e.year;
    if (yr < filters.eraRange[0] || yr > filters.eraRange[1]) return false;
    if (!e.polities?.length) return true;
    return e.polities.some((pid) => visiblePolityIds.has(pid));
  });
}
