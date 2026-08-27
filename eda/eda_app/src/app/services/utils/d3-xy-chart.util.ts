/**
 * Shared geometry/text helpers for the category-axis D3 charts (bar, line, area, barline) - line/
 * area/barline overlap with each other (and with bar) far more than bar/radar/doughnut do, so this
 * is a plain-function utility module, not a shared base class or a runtime dispatcher: every chart
 * type still owns its own component and draw() method.
 */

/** Same thresholds as eda-bar-d3's verticalTickCount - kept in sync deliberately, not re-derived. */
export function computeYTickCount(height: number): number {
  return height < 150 ? 1 : height < 300 ? 2 : 3;
}

let measureCanvas: HTMLCanvasElement;

export function measureTextWidth(label: string, fontSizePx: number, fontFamily: string): number {
  if (!measureCanvas) measureCanvas = document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  ctx.font = `${fontSizePx}px ${fontFamily === 'inherit' ? 'sans-serif' : fontFamily}`;
  return ctx.measureText(label).width;
}

export function measureMaxLabelWidth(labels: string[], fontSizePx: number, fontFamily: string): number {
  return labels.reduce((max, label) => Math.max(max, measureTextWidth(label, fontSizePx, fontFamily)), 0);
}

export function truncateLabel(label: string, maxChars: number): string {
  return label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;
}

/** Dash pattern for a derived trend-line overlay (thinner, straight regression line). */
export const DASH_TREND = '5,3';
/** Dash pattern for a predicted continuation of a real series - same value eda-kpi-trend already uses for its comparison line. */
export const DASH_PREDICTION = '4,3';

/**
 * Path for a rect rounded only on its "tip" end (the end away from the zero baseline) - top for
 * vertical bars, right for horizontal ones - so the base where the bar meets the axis (or, for a
 * stacked bar, the seam with the segment below it) stays flat. A plain <rect rx ry> can't do this,
 * since it rounds all 4 corners uniformly. Shared by eda-bar-d3 and eda-barline-d3 (identical
 * geometry, same rounding convention).
 *
 * The base radius is 1/6 of the bar's own cross-dimension (its bandwidth - width for vertical
 * bars, height for horizontal ones): 1/6 for each of the two rounded corners, leaving the middle
 * 4/6 of that edge a straight line. The radius is elliptical, not circular - doubled along the
 * bar's own length axis (ry for vertical, rx for horizontal) for a more pronounced, dome-like cap
 * rather than a small quarter-circle nub.
 *
 * `round=false` forces the radius to 0 - used for stacked segments that aren't their category's
 * own outermost non-zero one, so they render as plain flat-cornered rects while still being a
 * <path> (needed so every segment can use the same grow-in tween).
 */
export function roundedTipRectPath(
  x: number, y: number, width: number, height: number, horizontal: boolean,
  useRoundedBars: boolean, round: boolean = true, flip: boolean = false
): string {
  const baseRadius = round && useRoundedBars ? (horizontal ? height : width) / 10 : 0;
  const rx = Math.max(0, Math.min(horizontal ? baseRadius * 2 : baseRadius, width / 2));
  const ry = Math.max(0, Math.min(horizontal ? baseRadius : baseRadius * 2, height / 2));
  if (horizontal) {
    if (!flip) {
      return `M${x},${y} L${x + width - rx},${y} A${rx},${ry} 0 0,1 ${x + width},${y + ry} ` +
        `L${x + width},${y + height - ry} A${rx},${ry} 0 0,1 ${x + width - rx},${y + height} L${x},${y + height} Z`;
    }
    return `M${x + rx},${y} L${x + width},${y} L${x + width},${y + height} L${x + rx},${y + height} ` +
      `A${rx},${ry} 0 0,1 ${x},${y + height - ry} L${x},${y + ry} A${rx},${ry} 0 0,1 ${x + rx},${y} Z`;
  }
  if (!flip) {
    return `M${x},${y + height} L${x},${y + ry} A${rx},${ry} 0 0,1 ${x + rx},${y} ` +
      `L${x + width - rx},${y} A${rx},${ry} 0 0,1 ${x + width},${y + ry} L${x + width},${y + height} Z`;
  }
  return `M${x},${y} L${x + width},${y} L${x + width},${y + height - ry} A${rx},${ry} 0 0,1 ${x + width - rx},${y + height} ` +
    `L${x + rx},${y + height} A${rx},${ry} 0 0,1 ${x},${y + height - ry} L${x},${y} Z`;
}
