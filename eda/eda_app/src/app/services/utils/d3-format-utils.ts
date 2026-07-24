/** Abbreviates large axis values (3.000.000 -> 3M, 3.500 -> 3,5k) so they take up less space. */
export function formatAxisValue(v: number, maximumFractionDigits: number = 0): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + 'M';
  if (abs >= 1_000) return (v / 1_000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + 'k';
  return v.toLocaleString('de-DE', { maximumFractionDigits });
}

export function formatDeNumber(value: number, maximumFractionDigits: number = 6): string {
  return value.toLocaleString('de-DE', { maximumFractionDigits });
}

export function formatDePercent(pct: number, maximumFractionDigits: number = 1): string {
  return `${pct.toLocaleString('de-DE', { maximumFractionDigits })} %`;
}

/** Shared value/percentage data-label formatter (doughnut/polarArea/bar/radar's showLabels+showLabelsPercent combo). */
export function formatValueLabel(value: number, percentage: number, showValue: boolean, showPercent: boolean): string {
  if (showValue && showPercent) return `${formatDeNumber(value)} - ${formatDePercent(percentage)}`;
  if (showValue) return formatDeNumber(value);
  if (showPercent) return formatDePercent(percentage);
  return '';
}

/** Data label text color: 'black'/'white' fixed, a user-picked hex for 'custom', or 'series' to
 * match whatever it's representing (the passed-in seriesColor) - defaults to black when unset. */
export function resolveLabelColor(labelColorMode: string | undefined, labelCustomColor: string | undefined, seriesColor?: string): string {
  if (labelColorMode === 'series') return seriesColor || '#000000';
  if (labelColorMode === 'white') return '#ffffff';
  if (labelColorMode === 'custom') return labelCustomColor || '#000000';
  return '#000000';
}
