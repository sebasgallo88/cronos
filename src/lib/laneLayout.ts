/**
 * Layout vertical del histomap:
 *   ┌── ReligionBand (Y absoluta 0 → RELIGION_BAND_HEIGHT)
 *   ├── Time axis    (Y MARGIN_TOP)
 *   ├── Region group (header colapsable + lanes intra-grupo)
 *   └── ...
 *
 * computeLayout() recibe polities + estado de colapso por región y devuelve
 * los Y de cada lane + headers de grupo. Sin overlap interno por región
 * (cada polity tiene su propio rail) — si en v2 hay >7 polities/región
 * podemos agregar sub-laning por overlap temporal.
 */

import type { Polity, RegionId } from './dataTypes';

export const RELIGION_BAND_HEIGHT = 80;   // alto reservado para la religion band
export const AXIS_HEIGHT = 28;            // alto reservado para el eje temporal
export const REGION_HEADER_HEIGHT = 24;   // alto de cada header de macro-región
export const LANE_HEIGHT = 26;            // alto de cada lane de polity
export const LANE_GAP = 4;                // gap vertical entre lanes
export const REGION_GAP = 8;              // gap vertical entre macro-regiones
export const TOP_MARGIN = 8;              // padding superior antes de la band

export interface Lane {
  polity: Polity;
  y: number;          // Y absoluta del top de la barra
  centerY: number;    // Y absoluta del centro vertical
}

export interface RegionGroup {
  regionId: RegionId;
  name: string;
  order: number;
  headerY: number;    // Y absoluta del header
  contentStartY: number; // Y absoluta del primer lane
  contentEndY: number;   // Y absoluta del último lane + LANE_HEIGHT
  lanes: Lane[];
  collapsed: boolean;
}

export interface LayoutResult {
  groups: RegionGroup[];
  axisY: number;        // Y absoluta del baseline del eje temporal
  contentTopY: number;  // Y desde donde empiezan las lanes
  totalHeight: number;
}

export interface RegionMeta {
  id: RegionId;
  name: string;
  order: number;
}

export function computeLayout(
  polities: Polity[],
  regions: RegionMeta[],
  collapsedRegions: Set<RegionId>,
): LayoutResult {
  // Agrupar polities por region, ordenar lanes intra-grupo por start_year
  const politiesByRegion = new Map<RegionId, Polity[]>();
  for (const r of regions) politiesByRegion.set(r.id, []);
  for (const p of polities) {
    if (politiesByRegion.has(p.region)) {
      politiesByRegion.get(p.region)!.push(p);
    }
  }
  for (const list of politiesByRegion.values()) {
    list.sort((a, b) => a.start_year - b.start_year);
  }

  const sortedRegions = [...regions].sort((a, b) => a.order - b.order);

  let cursor = TOP_MARGIN + RELIGION_BAND_HEIGHT + AXIS_HEIGHT;
  const axisY = TOP_MARGIN + RELIGION_BAND_HEIGHT + AXIS_HEIGHT - 2;
  const contentTopY = cursor;

  const groups: RegionGroup[] = [];

  for (const region of sortedRegions) {
    const politiesInRegion = politiesByRegion.get(region.id) ?? [];
    if (politiesInRegion.length === 0) continue;

    const headerY = cursor;
    cursor += REGION_HEADER_HEIGHT;
    const collapsed = collapsedRegions.has(region.id);
    const contentStartY = cursor;

    const lanes: Lane[] = [];
    if (!collapsed) {
      for (let i = 0; i < politiesInRegion.length; i++) {
        const y = cursor;
        lanes.push({
          polity: politiesInRegion[i],
          y,
          centerY: y + LANE_HEIGHT / 2,
        });
        cursor += LANE_HEIGHT + LANE_GAP;
      }
      // último lane no necesita el gap final
      cursor -= LANE_GAP;
    } else {
      // Para grupos colapsados: igual computamos lanes en posición plegada
      // (todos en headerY + algo chico) para poder transicionar en F11.
      for (const p of politiesInRegion) {
        lanes.push({
          polity: p,
          y: headerY + 2,
          centerY: headerY + REGION_HEADER_HEIGHT / 2,
        });
      }
    }

    const contentEndY = cursor;
    cursor += REGION_GAP;

    groups.push({
      regionId: region.id,
      name: region.name,
      order: region.order,
      headerY,
      contentStartY,
      contentEndY,
      lanes,
      collapsed,
    });
  }

  return {
    groups,
    axisY,
    contentTopY,
    totalHeight: cursor + TOP_MARGIN,
  };
}

/** Devuelve el lane (con Y) para una polity dada, o null si está fuera de los grupos visibles. */
export function findLane(layout: LayoutResult, polityId: string): Lane | null {
  for (const g of layout.groups) {
    const lane = g.lanes.find((l) => l.polity.id === polityId);
    if (lane) return lane;
  }
  return null;
}
