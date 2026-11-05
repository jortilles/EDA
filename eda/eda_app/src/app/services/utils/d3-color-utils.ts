/** Shifts each hex channel by `amount` (positive lightens, negative darkens), clamped to 0-255. */
export function shiftHex(hex: string, amount: number): string {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex || '');
  if (!match) return hex;
  const num = parseInt(match[1], 16);
  const clamp = (c: number) => Math.min(255, Math.max(0, c));
  const r = clamp(((num >> 16) & 0xff) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

export function lightenHex(hex: string, amount: number): string {
  return shiftHex(hex, amount);
}

export function darkenHex(hex: string, amount: number): string {
  return shiftHex(hex, -amount);
}

/** Converts a 0-100 opacity (assignedColors' own unit) to the 0-1 fraction SVG fill-opacity/stop-opacity want. */
export function opacityFraction(opacity: number | undefined, fallback: number = 100): number {
  return (opacity ?? fallback) / 100;
}

/** Sanitizes a string for use as (part of) an SVG element id, e.g. a per-slice/per-bar gradient id. */
export function sanitizeId(value: string): string {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
}

export interface GradientStop {
  offset: string;
  color: string;
  /** stop-opacity, 0-1. Defaults to fully opaque - most charts bake opacity into the stop color itself. */
  opacity?: number;
}

/**
 * Gets-or-creates a <linearGradient> with the given id inside `defs`, then (re)sets its axis/stops
 * every call so it stays correct across redraws even if colors change - shared by every D3 chart's
 * "base color -> lighter" gradient (bar, treemap, ...). Default axis is bottom -> top (bar's
 * convention); pass a different one for a left-to-right flow gradient (e.g. sankey links).
 */
export function ensureLinearGradient(
  defs: any,
  id: string,
  stops: GradientStop[],
  axis: { x1: string; y1: string; x2: string; y2: string } = { x1: '0%', y1: '100%', x2: '0%', y2: '0%' }
): string {
  let grad = defs.select(`#${id}`);
  if (grad.empty()) grad = defs.append('linearGradient').attr('id', id);
  grad.attr('x1', axis.x1).attr('y1', axis.y1).attr('x2', axis.x2).attr('y2', axis.y2);
  const sel = grad.selectAll('stop').data(stops);
  sel.exit().remove();
  sel.enter().append('stop').merge(sel)
    .attr('offset', (s: GradientStop) => s.offset)
    .attr('stop-color', (s: GradientStop) => s.color)
    .attr('stop-opacity', (s: GradientStop) => s.opacity ?? 1);
  return `url(#${id})`;
}

/**
 * Gets-or-creates a <radialGradient>. `circle` is optional and deliberately so: doughnut/polarArea/
 * radar need an explicit userSpaceOnUse circle (one gradient shared across a common center);
 * scatter/bubblechart instead rely on SVG's default per-shape objectBoundingBox gradient (one
 * independent gradient per point/bubble) - passing no `circle` preserves that.
 */
export function ensureRadialGradient(
  defs: any,
  id: string,
  stops: GradientStop[],
  circle?: { cx: number; cy: number; r: number }
): string {
  let grad = defs.select(`#${id}`);
  if (grad.empty()) grad = defs.append('radialGradient').attr('id', id);
  if (circle) {
    grad.attr('gradientUnits', 'userSpaceOnUse').attr('cx', circle.cx).attr('cy', circle.cy).attr('r', Math.max(circle.r, 1));
  }
  const sel = grad.selectAll('stop').data(stops);
  sel.exit().remove();
  sel.enter().append('stop').merge(sel)
    .attr('offset', (s: GradientStop) => s.offset)
    .attr('stop-color', (s: GradientStop) => s.color)
    .attr('stop-opacity', (s: GradientStop) => s.opacity ?? 1);
  return `url(#${id})`;
}
