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

/** Sanitizes a string for use as (part of) an SVG element id, e.g. a per-slice/per-bar gradient id. */
export function sanitizeId(value: string): string {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
}
