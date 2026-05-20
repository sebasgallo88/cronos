/**
 * Time scale + formatter para el histomap.
 * Maneja eje continuo BCE (negativo) ↔ CE (positivo) sin "year 0"
 * historiográfico (que nadie usa fuera de matemática).
 */

import { scaleLinear, type ScaleLinear } from 'd3-scale';

export type TimeDomain = [number, number]; // years; negativos = BCE
export type PixelRange = [number, number];

/** Crea un d3.scaleLinear sobre años (incluye negativos para BCE). */
export function createTimeScale(
  domain: TimeDomain,
  range: PixelRange,
): ScaleLinear<number, number> {
  return scaleLinear().domain(domain).range(range);
}

/**
 * Formatter para ticks del eje temporal.
 *   -500 → "500 BCE"
 *    -1 → "1 BCE"
 *     0 → "1 BCE / 1 CE"   (edge case, no existe el año 0 históricamente)
 *     1 → "1 CE"
 *  1500 → "1500 CE"
 *  2026 → "2026"           (años > 1900 sin sufijo, asumido CE)
 */
export function formatYear(year: number): string {
  const y = Math.round(year);
  if (y === 0) return '1 BCE / 1 CE';
  if (y < 0) return `${Math.abs(y)} BCE`;
  if (y >= 1900) return `${y}`;
  return `${y} CE`;
}

/** Versión corta para ticks densos (no usado en v1 pero disponible). */
export function formatYearShort(year: number): string {
  const y = Math.round(year);
  if (y === 0) return '0';
  if (y < 0) return `-${Math.abs(y)}`;
  return `${y}`;
}

/**
 * Tick values "inteligentes" para un dominio dado.
 * Si el span es > 5000 años usa milenios; > 1000 usa medio-milenio;
 * > 200 usa siglos; > 50 usa décadas; resto: ticks d3 default.
 *
 * D3 elige ticks "redondos" pero a veces da números feos para BCE.
 * Acá fuerzo ticks coherentes con BCE → CE.
 */
export function smartTicks(domain: TimeDomain, targetCount = 10): number[] {
  const [min, max] = domain;
  const span = max - min;
  let step: number;
  if (span > 5000) step = 1000;
  else if (span > 2000) step = 500;
  else if (span > 1000) step = 250;
  else if (span > 400) step = 100;
  else if (span > 100) step = 25;
  else if (span > 20) step = 10;
  else step = 5;

  const start = Math.ceil(min / step) * step;
  const end = Math.floor(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end; v += step) ticks.push(v);
  return ticks;
}
