import { useEffect, useRef, useState } from 'react';
import { axisTop } from 'd3-axis';
import { select, type Selection } from 'd3-selection';
import { zoom, type ZoomBehavior } from 'd3-zoom';
import { createTimeScale, formatYear, smartTicks } from '../lib/timeScale';
import type { CronosData, Polity } from '../lib/dataTypes';

interface Props {
  data: CronosData;
}

const MARGIN = { top: 56, right: 24, bottom: 16, left: 96 };
const LANE_HEIGHT = 36;
const LANE_GAP = 8;
const DEFAULT_DOMAIN: [number, number] = [-3000, 2026];

/**
 * F7: Renderiza UNA lane (Roma) sobre un eje temporal con BCE→CE,
 * con zoom-pan horizontal (d3-zoom). F8 extiende a multi-lane + filtros.
 */
export default function HistomapCanvas({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);

  // Para F7: sólo Roma. F8 mostrará todas con grouping por región.
  const polities: Polity[] = (data.polities ?? []).filter((p) => p.id === 'roma');
  const height = MARGIN.top + MARGIN.bottom + polities.length * (LANE_HEIGHT + LANE_GAP);

  // Observer del width del container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth || 1200);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Render SVG + zoom-pan
  useEffect(() => {
    const svgNode = svgRef.current;
    if (!svgNode) return;

    const svg = select(svgNode);
    svg.selectAll('*').remove();

    const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 200);
    const baseScale = createTimeScale(DEFAULT_DOMAIN, [0, innerWidth]);

    // Layer raíz desplazada por márgenes
    const root = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Eje superior
    const axisG = root.append('g').attr('class', 'axis-top');
    const renderAxis = (scale: typeof baseScale) => {
      const ticks = smartTicks(scale.domain() as [number, number]);
      axisG.call(
        axisTop(scale)
          .tickValues(ticks)
          .tickFormat((d) => formatYear(d as number))
          .tickSizeOuter(0) as Parameters<typeof axisG.call>[0],
      );
      axisG.selectAll('text').attr('font-size', '11px').attr('fill', '#444');
      axisG.selectAll('line').attr('stroke', '#bbb');
      axisG.selectAll('path').attr('stroke', '#bbb');
    };
    renderAxis(baseScale);

    // Grid vertical sutil
    const gridG = root.append('g').attr('class', 'grid');
    const renderGrid = (scale: typeof baseScale, innerH: number) => {
      gridG.selectAll('line').remove();
      const ticks = smartTicks(scale.domain() as [number, number]);
      gridG.selectAll('line')
        .data(ticks)
        .enter()
        .append('line')
        .attr('x1', (d) => scale(d))
        .attr('x2', (d) => scale(d))
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', '#e8e8e3')
        .attr('stroke-width', 1);
    };

    const innerHeight = polities.length * (LANE_HEIGHT + LANE_GAP);
    renderGrid(baseScale, innerHeight);

    // Lanes
    const lanesG = root.append('g').attr('class', 'lanes');
    const laneG = lanesG
      .selectAll<SVGGElement, Polity>('g.lane')
      .data(polities, (d) => d.id)
      .enter()
      .append('g')
      .attr('class', 'lane')
      .attr('transform', (_, i) => `translate(0, ${i * (LANE_HEIGHT + LANE_GAP)})`);

    laneG.append('rect')
      .attr('class', 'polity-bar')
      .attr('x', (d) => baseScale(d.start_year))
      .attr('y', 0)
      .attr('width', (d) => Math.max(baseScale(d.end_year) - baseScale(d.start_year), 1))
      .attr('height', LANE_HEIGHT)
      .attr('fill', (d) => d.color)
      .attr('rx', 4)
      .attr('opacity', 0.9);

    laneG.append('text')
      .attr('class', 'polity-label')
      .attr('x', (d) => baseScale(d.start_year) + 8)
      .attr('y', LANE_HEIGHT / 2 + 4)
      .attr('fill', 'white')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .text((d) => d.name);

    // Labels en el margen izquierdo
    const regionLabels = svg.append('g').attr('class', 'region-labels');
    regionLabels.selectAll('text')
      .data(polities)
      .enter()
      .append('text')
      .attr('x', MARGIN.left - 8)
      .attr('y', (_, i) => MARGIN.top + i * (LANE_HEIGHT + LANE_GAP) + LANE_HEIGHT / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('fill', '#666')
      .text((d) => d.region);

    // d3-zoom: pan + zoom horizontal sobre el eje temporal
    const zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 50])
      .translateExtent([
        [-innerWidth * 2, 0],
        [innerWidth * 3, innerHeight],
      ])
      .on('zoom', (event) => {
        const newScale = event.transform.rescaleX(baseScale);
        renderAxis(newScale);
        renderGrid(newScale, innerHeight);
        laneG.select<SVGRectElement>('rect.polity-bar')
          .attr('x', (d) => newScale(d.start_year))
          .attr('width', (d) => Math.max(newScale(d.end_year) - newScale(d.start_year), 1));
        laneG.select<SVGTextElement>('text.polity-label')
          .attr('x', (d) => newScale(d.start_year) + 8);
      });

    // Aplicar zoom al SVG (no al root) para que pan/wheel funcione sobre toda la área
    svg.call(zoomBehavior);
  }, [data, width, polities, height]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        background: '#fafaf7',
        border: '1px solid #e4e4dd',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <svg ref={svgRef} width={width} height={height} role="img" aria-label="Cronos Histomap">
        <title>Cronos Histomap</title>
      </svg>
    </div>
  );
}
