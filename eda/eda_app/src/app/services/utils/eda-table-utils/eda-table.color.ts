/**
 * Unified color engine for eda-table / eda-crosstable.
 *
 * Extracted from eda-table.component.ts's `applyStyles()` (flat tables) and
 * `applyPivotSyles()` (crosstables), which computed the same gradient/semaphore
 * math but keyed their output differently: flat keys the result by the logical
 * column field, matrix fans one logical style spec out across several physical
 * `~`-suffixed columns and keys the result by each physical column instead.
 *
 * Gradient and semaphore contributions are flattened into `entries` independently,
 * one right after the other — mirroring the original methods' control flow exactly
 * — rather than through a shared intermediate map, so a (theoretical) collision
 * where the same logical column carries both a gradient and a semaphore spec
 * resolves the same way today's code resolves it (semaphore, computed second,
 * overwrites gradient for that key).
 *
 * This module is pure (no DOM, no Angular services) — the component still owns
 * applying `cssVars`/`cssClasses` via ElementRef/StyleService.
 */

export interface GradientStyleSpec {
  type?: 'gradient';
  col: string;
  max: string;
  min: string;
  /** Physical columns this logical style fans out to. Present only in 'matrix' mode. */
  cols?: string[];
}

export interface SemaphoreStyleSpec {
  type: 'semaphore';
  col: string;
  value1: number;
  value2: number;
  color1: string;
  color2: string;
  color3: string;
  cols?: string[];
}

export type ColorStyleSpec = GradientStyleSpec | SemaphoreStyleSpec;

export interface ColorEntry {
  type?: 'semaphore';
  /** Present in 'flat' mode entries. */
  col?: string;
  /** Present in 'matrix' mode entries: the logical group key this physical column belongs to. */
  value?: string;
  value1?: number;
  value2?: number;
  ranges?: number[];
  max?: number;
  min?: number;
  rangeValue?: number;
}

export interface CssVarDeclaration {
  name: string;
  value: string;
}

export interface CssClassDeclaration {
  selector: string;
  declarations: {
    borderWidth: string;
    borderStyle: string;
    borderColor: string;
    backgroundColor: string;
  };
}

export interface ComputeTableColorStylesResult {
  /** -> component.styles, consumed by getStyleClass(). */
  entries: Record<string, ColorEntry>;
  /** -> elementRef.nativeElement.style.setProperty(name, value). */
  cssVars: CssVarDeclaration[];
  /** -> styleService.setStyles(selector, declarations). */
  cssClasses: CssClassDeclaration[];
}

interface GradientLimits {
  min: number;
  max: number;
  rangeValue: number;
  ranges: number[];
  col?: string;
  cols?: string[];
}

export function computeTableColorStyles(
  styleSpecs: ColorStyleSpec[],
  rows: any[],
  mode: 'flat' | 'matrix',
): ComputeTableColorStylesResult {
  const cssVars: CssVarDeclaration[] = [];
  const cssClasses: CssClassDeclaration[] = [];
  const entries: Record<string, ColorEntry> = {};
  // Trailing space on the var() reference is preserved from the original 'flat' code path
  // (applyStyles) — 'matrix' (applyPivotSyles) never had it. Cosmetically inert in CSS, kept
  // for byte-exact parity with today's behavior.
  const varRefSuffix = mode === 'flat' ? ' ' : '';

  const gradientSpecs = styleSpecs.filter(s => !s.type || s.type === 'gradient') as GradientStyleSpec[];
  const semaphoreSpecs = styleSpecs.filter(s => s.type === 'semaphore') as SemaphoreStyleSpec[];

  if (gradientSpecs.length > 0) {
    const fields = gradientSpecs.map(spec => spec.col);
    const limits: Record<string, GradientLimits> = {};

    fields.forEach((field, i) => {
      limits[field] = mode === 'flat'
        ? { min: Infinity, max: -Infinity, rangeValue: 0, ranges: [], col: field }
        : { min: Infinity, max: -Infinity, rangeValue: 0, ranges: [], cols: gradientSpecs[i].cols };
    });

    rows.forEach(row => {
      fields.forEach((field, i) => {
        const sourceCols = mode === 'matrix' ? (gradientSpecs[i].cols || []) : [field];
        sourceCols.forEach(sourceCol => {
          const val = parseFloat(row[sourceCol]);
          if (val > limits[field].max) limits[field].max = val;
          if (val < limits[field].min) limits[field].min = val;
        });
      });
    });

    fields.forEach(field => {
      const entry = limits[field];
      entry.rangeValue = (entry.max - entry.min) / 5;
      let downLimit = entry.min;
      for (let i = 0; i < 5; i++) {
        const value = downLimit + entry.rangeValue;
        entry.ranges.push(value);
        downLimit = value;
      }
    });

    Object.keys(limits).forEach((key, i) => {
      const colors = generateColor(gradientSpecs[i].max, gradientSpecs[i].min, 5);
      const name = getNiceName(key);
      colors.forEach((color, ci) => {
        // The 'flat' path's raw CSS var VALUE (not just the class declaration below) carries
        // a trailing space too, in the original applyStyles() — preserved for byte-exact parity.
        cssVars.push({ name: `--table-gradient-bg-color-${name}-${ci}`, value: `#${color}${varRefSuffix}` });
        cssClasses.push({
          selector: `.table-gradient-${name}-${ci}`,
          declarations: {
            borderWidth: '1px ',
            borderStyle: 'solid ',
            borderColor: 'white ',
            backgroundColor: `var(--table-gradient-bg-color-${name}-${ci})${varRefSuffix}`,
          },
        });
      });
    });

    if (mode === 'flat') {
      Object.keys(limits).forEach(key => {
        const { cols, ...rest } = limits[key];
        entries[key] = rest;
      });
    } else {
      Object.keys(limits).forEach(key => {
        const value = limits[key];
        (value.cols || []).forEach(physicalCol => {
          entries[physicalCol] = { max: value.max, min: value.min, rangeValue: value.rangeValue, ranges: value.ranges, value: key };
        });
      });
    }
  }

  if (semaphoreSpecs.length > 0) {
    semaphoreSpecs.forEach(spec => {
      const name = getNiceName(spec.col);
      const colors = [spec.color1, spec.color2, spec.color3];
      colors.forEach((color, i) => {
        const hexColor = color.startsWith('#') ? color : `#${color}`;
        cssVars.push({ name: `--table-semaphore-bg-color-${name}-${i}`, value: hexColor });
        cssClasses.push({
          selector: `.table-semaphore-${name}-${i}`,
          declarations: {
            borderWidth: '1px ',
            borderStyle: 'solid ',
            borderColor: 'white ',
            backgroundColor: `var(--table-semaphore-bg-color-${name}-${i})${varRefSuffix}`,
          },
        });
      });

      if (mode === 'flat') {
        entries[spec.col] = { type: 'semaphore', col: spec.col, value1: spec.value1, value2: spec.value2 };
      } else if (spec.cols) {
        spec.cols.forEach(physicalCol => {
          entries[physicalCol] = { type: 'semaphore', value1: spec.value1, value2: spec.value2, value: spec.col };
        });
      }
    });
  }

  return { entries, cssVars, cssClasses };
}

/** Thanks to Euler Junior: https://stackoverflow.com/a/32257791 */
export function hex(c: any): string {
  const s = '0123456789abcdef';
  let i = parseInt(c);
  if (i == 0 || isNaN(c)) return '00';
  i = Math.round(Math.min(Math.max(0, i), 255));
  return s.charAt((i - (i % 16)) / 16) + s.charAt(i % 16);
}

export function convertToHex(rgb: number[]): string {
  return hex(rgb[0]) + hex(rgb[1]) + hex(rgb[2]);
}

export function trim(s: string): string {
  return s.charAt(0) == '#' ? s.substring(1, 7) : s;
}

export function convertToRGB(hexColor: string): number[] {
  const color: number[] = [];
  color[0] = parseInt(trim(hexColor).substring(0, 2), 16);
  color[1] = parseInt(trim(hexColor).substring(2, 4), 16);
  color[2] = parseInt(trim(hexColor).substring(4, 6), 16);
  return color;
}

export function generateColor(colorStart: string, colorEnd: string, colorCount: number): string[] {
  const start = convertToRGB(colorStart);
  const end = convertToRGB(colorEnd);
  const len = colorCount;
  let alpha = 0.0;
  const saida: string[] = [];

  for (let i = 0; i < len; i++) {
    const c: number[] = [];
    alpha += 1.0 / len;
    c[0] = start[0] * alpha + (1 - alpha) * end[0];
    c[1] = start[1] * alpha + (1 - alpha) * end[1];
    c[2] = start[2] * alpha + (1 - alpha) * end[2];
    saida.push(convertToHex(c));
  }

  return saida;
}

export function getNiceName(name: string): string {
  return name.replace('%', 'percent').replace(/ /g, '').replace(/[^a-zA-Z0-9-_-\wáéíóúüñÁÉÍÓÚÜÑ ]/g, '').replace('_', '');
}
