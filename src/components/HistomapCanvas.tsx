import { useEffect, useMemo, useRef, useState } from 'react';
import { axisTop } from 'd3-axis';
import { select } from 'd3-selection';
import { zoom, type ZoomBehavior } from 'd3-zoom';
import { brushX, type BrushBehavior } from 'd3-brush';
import { createTimeScale, formatYear, smartTicks } from '../lib/timeScale';
import { computeLayout, LANE_HEIGHT, RELIGION_BAND_HEIGHT, TOP_MARGIN, type RegionMeta } from '../lib/laneLayout';
import {
  filterEvents,
  filterFigures,
  filterPolities,
  filterReligions,
  type FilterState,
} from '../lib/filters';
import { findClosestNarrative, type SnapResult } from '../lib/narrativeIndex';
import type { CronosData, EventCategory, FigureRole, HistoricalEvent, Figure } from '../lib/dataTypes';

interface Props {
  data: CronosData;
  filters: FilterState;
  collapsedRegions: Set<string>;
  onToggleRegion: (regionId: string) => void;
  onSelect?: (entity: { type: string; id: string }) => void;
}

const MARGIN_LEFT = 180;
const MARGIN_RIGHT = 16;

const ROLE_COLORS: Record<FigureRole, string> = {
  militar: '#c62828',
  religioso: '#6a1b9a',
  filosofo: '#1565c0',
  cientifico: '#00838f',
  politico: '#37474f',
  artista: '#ef6c00',
};

const CATEGORY_COLORS: Record<EventCategory, string> = {
  militar: '#c62828',
  politico: '#37474f',
  religioso: '#6a1b9a',
  cientifico: '#1565c0',
  cultural: '#ef6c00',
  economico: '#2e7d32',
  desastre: '#5d4037',
};

export default function HistomapCanvas({ data, filters, collapsedRegions, onToggleRegion, onSelect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);
  const [brushSnap, setBrushSnap] = useState<SnapResult | null>(null);
  const [brushPixels, setBrushPixels] = useState<[number, number] | null>(null);

  const regionsMeta: RegionMeta[] = useMemo(
    () => data.regions.map((r) => ({ id: r.id, name: r.name, order: r.order })),
    [data.regions],
  );

  // Entidades filtradas
  const visiblePolities = useMemo(() => filterPolities(data.polities, filters), [data.polities, filters]);
  const visibleReligions = useMemo(() => filterReligions(data.religions, filters), [data.religions, filters]);
  const visibleFigures = useMemo(() => filterFigures(data.figures, data.polities, filters), [data.figures, data.polities, filters]);
  const visibleEvents = useMemo(() => filterEvents(data.events, data.polities, filters), [data.events, data.polities, filters]);

  // Layout
  const layout = useMemo(
    () => computeLayout(visiblePolities, regionsMeta, collapsedRegions as Set<any>),
    [visiblePolities, regionsMeta, collapsedRegions],
  );

  // Width observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth || 1200);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Map polity id → centerY para posicionar dots de figures/events
  const polityCenterY = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of layout.groups) for (const l of g.lanes) m.set(l.polity.id, l.centerY);
    return m;
  }, [layout]);

  // Render SVG
  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;
    const svg = select(node);
    svg.selectAll('*').remove();

    const innerWidth = Math.max(width - MARGIN_LEFT - MARGIN_RIGHT, 200);
    const baseScale = createTimeScale(filters.eraRange, [0, innerWidth]);

    // Root group desplazado por margen izquierdo
    const root = svg.append('g').attr('transform', `translate(${MARGIN_LEFT},0)`);

    // ── Religion band ──
    const religionBandG = root.append('g').attr('class', 'religion-band');
    if (filters.types.religion) {
      const bandTop = TOP_MARGIN;
      const bandHeight = RELIGION_BAND_HEIGHT - 12;
      const rowHeight = Math.min(10, bandHeight / Math.max(visibleReligions.length, 1));
      const todayYear = new Date().getFullYear();

      const religionRows = religionBandG
        .selectAll<SVGGElement, typeof visibleReligions[number]>('g.religion-row')
        .data(visibleReligions, (d) => d.id)
        .enter()
        .append('g')
        .attr('class', 'religion-row')
        .style('cursor', onSelect ? 'pointer' : 'default')
        .on('click', (_e, d) => onSelect?.({ type: 'religion', id: d.id }));

      religionRows
        .append('rect')
        .attr('class', 'religion-bar')
        .attr('x', (d) => baseScale(d.start_year))
        .attr('y', (_, i) => bandTop + i * (rowHeight + 1))
        .attr('width', (d) => Math.max(baseScale(d.end_year ?? todayYear) - baseScale(d.start_year), 1))
        .attr('height', rowHeight)
        .attr('fill', (d) => d.color)
        .attr('opacity', 0.85)
        .attr('rx', 2);

      religionRows
        .append('title')
        .text((d) => `${d.name} (${formatYear(d.start_year)} → ${d.end_year ? formatYear(d.end_year) : 'presente'})`);
    }

    // ── Eje temporal ──
    const axisG = root.append('g').attr('class', 'axis-top').attr('transform', `translate(0,${layout.axisY})`);
    const renderAxis = (scale: typeof baseScale) => {
      const ticks = smartTicks(scale.domain() as [number, number]);
      axisG.call(
        axisTop(scale)
          .tickValues(ticks)
          .tickFormat((d) => formatYear(d as number))
          .tickSizeOuter(0) as Parameters<typeof axisG.call>[0],
      );
      axisG.selectAll('text').attr('font-size', '11px').attr('fill', '#666');
      axisG.selectAll('line').attr('stroke', '#bbb');
      axisG.selectAll('path').attr('stroke', '#bbb');
    };
    renderAxis(baseScale);

    // ── Grid vertical ──
    const gridG = root.append('g').attr('class', 'grid');
    const renderGrid = (scale: typeof baseScale) => {
      gridG.selectAll('line').remove();
      const ticks = smartTicks(scale.domain() as [number, number]);
      gridG.selectAll('line')
        .data(ticks)
        .enter()
        .append('line')
        .attr('x1', (d) => scale(d))
        .attr('x2', (d) => scale(d))
        .attr('y1', layout.contentTopY)
        .attr('y2', layout.totalHeight - 4)
        .attr('stroke', '#e9e9e2')
        .attr('stroke-width', 1);
    };
    renderGrid(baseScale);

    // ── Region group headers ──
    const regionsG = root.append('g').attr('class', 'regions');
    const regionRows = regionsG
      .selectAll<SVGGElement, typeof layout.groups[number]>('g.region-group')
      .data(layout.groups, (d) => d.regionId)
      .enter()
      .append('g')
      .attr('class', 'region-group');

    regionRows
      .append('rect')
      .attr('x', -MARGIN_LEFT + 8)
      .attr('y', (d) => d.headerY)
      .attr('width', innerWidth + MARGIN_LEFT - 16)
      .attr('height', 22)
      .attr('fill', '#1116')
      .attr('opacity', 0.05);

    regionRows
      .append('text')
      .attr('x', -MARGIN_LEFT + 12)
      .attr('y', (d) => d.headerY + 15)
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', '#444')
      .attr('cursor', 'pointer')
      .text((d) => `${d.collapsed ? '▶' : '▼'}  ${d.name}  (${d.lanes.length})`)
      .on('click', (_e, d) => onToggleRegion(d.regionId));

    // ── Polity lanes ──
    const lanesG = root.append('g').attr('class', 'lanes');
    const allLanes = layout.groups.flatMap((g) =>
      g.lanes.map((l) => ({ ...l, collapsed: g.collapsed })),
    );

    const laneG = lanesG
      .selectAll<SVGGElement, typeof allLanes[number]>('g.lane')
      .data(allLanes, (d) => d.polity.id)
      .enter()
      .append('g')
      .attr('class', 'lane')
      .style('display', (d) => (d.collapsed ? 'none' : 'block'))
      .style('cursor', onSelect ? 'pointer' : 'default')
      .on('click', (_e, d) => onSelect?.({ type: 'polity', id: d.polity.id }));

    laneG
      .append('rect')
      .attr('class', 'polity-bar')
      .attr('x', (d) => baseScale(d.polity.start_year))
      .attr('y', (d) => d.y)
      .attr('width', (d) => Math.max(baseScale(d.polity.end_year) - baseScale(d.polity.start_year), 1))
      .attr('height', LANE_HEIGHT)
      .attr('fill', (d) => d.polity.color)
      .attr('opacity', 0.9)
      .attr('rx', 3)
      .append('title')
      .text((d) => `${d.polity.name} (${formatYear(d.polity.start_year)} → ${formatYear(d.polity.end_year)})`);

    laneG
      .append('text')
      .attr('class', 'polity-label')
      .attr('x', (d) => baseScale(d.polity.start_year) + 6)
      .attr('y', (d) => d.y + LANE_HEIGHT / 2 + 4)
      .attr('fill', 'white')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .text((d) => d.polity.name);

    // Etiqueta lateral (nombre de polity en margen izquierdo)
    const sideLabelsG = svg.append('g').attr('class', 'side-labels');
    sideLabelsG
      .selectAll('text')
      .data(allLanes.filter((l) => !l.collapsed))
      .enter()
      .append('text')
      .attr('x', MARGIN_LEFT - 8)
      .attr('y', (d) => d.y + LANE_HEIGHT / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .text((d) => d.polity.name.length > 22 ? d.polity.name.slice(0, 21) + '…' : d.polity.name);

    // ── Figure dots ──
    const figuresG = root.append('g').attr('class', 'figures');
    figuresG
      .selectAll<SVGCircleElement, Figure>('circle.figure-dot')
      .data(visibleFigures, (d) => d.id)
      .enter()
      .append('circle')
      .attr('class', 'figure-dot')
      .attr('cx', (f) => baseScale(f.year_born))
      .attr('cy', (f) => {
        const pid = f.polity?.[0];
        if (pid && polityCenterY.has(pid)) return polityCenterY.get(pid)!;
        // Sin polity: dot en una banda virtual al fondo
        return layout.totalHeight - 6;
      })
      .attr('r', 3.5)
      .attr('fill', (f) => ROLE_COLORS[f.role])
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', onSelect ? 'pointer' : 'default')
      .on('click', (_e, d) => onSelect?.({ type: 'figure', id: d.id }))
      .append('title')
      .text((f) => `${f.name} (${formatYear(f.year_born)}) · ${f.role}`);

    // ── Event dots ──
    const eventsG = root.append('g').attr('class', 'events');
    eventsG
      .selectAll<SVGRectElement, HistoricalEvent>('rect.event-dot')
      .data(visibleEvents, (d) => d.id)
      .enter()
      .append('rect')
      .attr('class', 'event-dot')
      .attr('x', (e) => baseScale(e.year) - 3)
      .attr('y', (e) => {
        const pid = e.polities?.[0];
        if (pid && polityCenterY.has(pid)) return polityCenterY.get(pid)! - 3;
        return layout.totalHeight - 9;
      })
      .attr('width', 6)
      .attr('height', 6)
      .attr('transform', (e) => {
        const pid = e.polities?.[0];
        const cy = pid && polityCenterY.has(pid) ? polityCenterY.get(pid)! : layout.totalHeight - 6;
        const cx = baseScale(e.year);
        return `rotate(45, ${cx}, ${cy})`;
      })
      .attr('fill', (e) => CATEGORY_COLORS[e.category])
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .style('cursor', onSelect ? 'pointer' : 'default')
      .on('click', (_e, d) => onSelect?.({ type: 'event', id: d.id }))
      .append('title')
      .text((e) => `${e.name} (${formatYear(e.year)}) · ${e.category}`);

    // ── d3-brush: selección de rango temporal para narrativas ──
    const narratives = data.narratives ?? [];
    let brushG: ReturnType<typeof root.append> | null = null;
    let currentBrushBehavior: BrushBehavior<unknown> | null = null;
    if (narratives.length > 0) {
      brushG = root.append('g').attr('class', 'time-brush');

      const onBrushEnd = (event: any, currentScale: typeof baseScale) => {
        const selection = event.selection as [number, number] | null;
        if (!selection) {
          setBrushSnap(null);
          setBrushPixels(null);
          return;
        }
        const [px0, px1] = selection;
        if (Math.abs(px1 - px0) < 8) {
          // brush demasiado chico → tratamos como click, sin acción
          brushG?.call(currentBrushBehavior!.move as any, null);
          setBrushSnap(null);
          setBrushPixels(null);
          return;
        }
        const yearStart = Math.round(currentScale.invert(px0));
        const yearEnd = Math.round(currentScale.invert(px1));
        const snap = findClosestNarrative(yearStart, yearEnd, narratives);
        setBrushSnap(snap);
        setBrushPixels([px0, px1]);
      };

      const makeBrush = (currentScale: typeof baseScale) => {
        const b = brushX()
          .extent([
            [0, 0],
            [innerWidth, 18],
          ])
          .on('end', (event) => onBrushEnd(event, currentScale));
        return b;
      };

      currentBrushBehavior = makeBrush(baseScale);
      brushG.call(currentBrushBehavior);
      // Estilo del overlay (la "captura de clicks") — semi-transparente sobre el eje
      brushG.select('.overlay').attr('fill', 'transparent').attr('cursor', 'crosshair');
      brushG.selectAll('.selection').attr('fill', 'var(--accent)').attr('fill-opacity', 0.18).attr('stroke', 'var(--accent)').attr('stroke-width', 1);
    }

    // ── d3-zoom: pan + zoom horizontal ──
    const xRescaleObservers: ((s: typeof baseScale) => void)[] = [
      renderAxis,
      renderGrid,
      (newScale) => {
        laneG
          .select<SVGRectElement>('rect.polity-bar')
          .attr('x', (d) => newScale(d.polity.start_year))
          .attr('width', (d) => Math.max(newScale(d.polity.end_year) - newScale(d.polity.start_year), 1));
        laneG
          .select<SVGTextElement>('text.polity-label')
          .attr('x', (d) => newScale(d.polity.start_year) + 6);
      },
      (newScale) => {
        religionBandG.selectAll<SVGRectElement, typeof visibleReligions[number]>('rect.religion-bar')
          .attr('x', (d) => newScale(d.start_year))
          .attr('width', (d) => Math.max(newScale(d.end_year ?? new Date().getFullYear()) - newScale(d.start_year), 1));
      },
      (newScale) => {
        figuresG.selectAll<SVGCircleElement, Figure>('circle.figure-dot')
          .attr('cx', (f) => newScale(f.year_born));
      },
      (newScale) => {
        eventsG.selectAll<SVGRectElement, HistoricalEvent>('rect.event-dot')
          .attr('x', (e) => newScale(e.year) - 3)
          .attr('transform', (e) => {
            const pid = e.polities?.[0];
            const cy = pid && polityCenterY.has(pid) ? polityCenterY.get(pid)! : layout.totalHeight - 6;
            const cx = newScale(e.year);
            return `rotate(45, ${cx}, ${cy})`;
          });
      },
    ];

    const zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 80])
      .filter((event) => {
        // No interferir con drags en el brush
        const target = event.target as HTMLElement | null;
        if (target?.closest?.('.time-brush')) return false;
        // Mantener default: permitir wheel + drag normal del root
        return !event.button && (event.type !== 'wheel' ? true : true);
      })
      .on('zoom', (event) => {
        const newScale = event.transform.rescaleX(baseScale);
        for (const fn of xRescaleObservers) fn(newScale);
        // Limpiar brush activo al zoomear (las coords cambian)
        if (brushG) {
          brushG.call((d3brush) => d3brush.select('.selection').attr('display', 'none'));
        }
      });

    svg.call(zoomBehavior);
  }, [
    data,
    width,
    filters,
    visiblePolities,
    visibleReligions,
    visibleFigures,
    visibleEvents,
    layout,
    polityCenterY,
    onSelect,
    onToggleRegion,
  ]);

  // Botón flotante "Explicar este período" cuando hay snap activo
  const explainBtn = brushSnap && brushPixels ? (
    <button
      className="brush-explain-btn"
      style={{
        position: 'absolute',
        left: MARGIN_LEFT + (brushPixels[0] + brushPixels[1]) / 2,
        top: 4,
        transform: 'translateX(-50%)',
      }}
      onClick={() => {
        if (brushSnap && onSelect) {
          onSelect({ type: 'narrative', id: brushSnap.narrative.id });
        }
      }}
    >
      Explicar período: {brushSnap.narrative.label}
      {brushSnap.drift > 0 && <span className="brush-drift"> · snap {brushSnap.drift}a</span>}
    </button>
  ) : null;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        position: 'relative',
        background: 'var(--canvas-bg, #fafaf7)',
        border: '1px solid var(--border, #e4e4dd)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <svg
        ref={svgRef}
        width={width}
        height={layout.totalHeight}
        role="img"
        aria-label="Cronos Histomap"
      >
        <title>Cronos Histomap</title>
      </svg>
      {explainBtn}
    </div>
  );
}
