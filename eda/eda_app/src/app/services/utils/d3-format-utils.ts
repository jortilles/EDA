/** Abbreviates large axis values (3.000.000 -> 3M, 3.500 -> 3,5k) so they take up less space. */
export function formatAxisValue(v: number, maximumFractionDigits: number = 0): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + 'M';
  if (abs >= 1_000) return (v / 1_000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + 'k';
  return v.toLocaleString('de-DE', { maximumFractionDigits });
}
