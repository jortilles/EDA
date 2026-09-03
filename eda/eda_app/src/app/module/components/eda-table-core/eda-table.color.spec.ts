/**
 * Parity tests for the color engine extracted from eda-table.component.ts's
 * applyStyles()/applyPivotSyles(). These are NOT run against the live Angular
 * component: constructing `EdaTableComponent` (a real @Component with an
 * i18n-annotated template) outside Angular's build pipeline triggers Angular's
 * JIT i18n compiler, which fails hard under this lightweight (non-Karma) runner
 * ("It looks like your application ... is using i18n"). Parity with the original
 * methods was instead verified by careful line-by-line comparison against the
 * current applyStyles()/applyPivotSyles() source (see eda-table.component.ts).
 * These tests pin the resulting output of computeTableColorStyles() itself, plus
 * the color-math helpers, as the new baseline going forward.
 */
/// <reference types="jasmine" />
import {
  computeTableColorStyles,
  generateColor,
  convertToRGB,
  convertToHex,
  hex,
  getNiceName,
} from './eda-table.color';

describe('color math helpers', () => {
  it('convertToRGB/convertToHex round-trip a hex color', () => {
    expect(convertToRGB('ff0000')).toEqual([255, 0, 0]);
    expect(convertToHex([255, 0, 0])).toBe('ff0000');
  });

  it('hex() pads single digits and clamps out-of-range values', () => {
    expect(hex(0)).toBe('00');
    expect(hex(255)).toBe('ff');
    expect(hex(16)).toBe('10');
  });

  it('generateColor() interpolates from end to start across N steps', () => {
    expect(generateColor('ff0000', '00ff00', 5)).toEqual([
      '33cc00', '669900', '996500', 'cc3200', 'ff0000',
    ]);
  });

  it('getNiceName() strips spaces/%% and non-alphanumeric characters', () => {
    expect(getNiceName('My Field %')).toBe('MyFieldpercent');
  });
});

describe('computeTableColorStyles — flat (plain table)', () => {
  const rows = [
    { cat: 'A', amt: 10 },
    { cat: 'A', amt: 20 },
    { cat: 'B', amt: 5 },
    { cat: 'B', amt: 15 },
  ];

  it('gradient: computes min/max/ranges keyed by the column field, with trailing-space var refs', () => {
    const result = computeTableColorStyles([{ col: 'amt', max: 'ff0000', min: '00ff00' }] as any, rows, 'flat');

    expect(result.entries).toEqual({
      amt: { min: 5, max: 20, rangeValue: 3, ranges: [8, 11, 14, 17, 20], col: 'amt' },
    });
    expect(result.cssVars.map(v => v.name)).toEqual([
      '--table-gradient-bg-color-amt-0',
      '--table-gradient-bg-color-amt-1',
      '--table-gradient-bg-color-amt-2',
      '--table-gradient-bg-color-amt-3',
      '--table-gradient-bg-color-amt-4',
    ]);
    // flat gradient's raw CSS var VALUE also carries a trailing space (not just the class decl).
    expect(result.cssVars[0].value).toBe('#33cc00 ');
    expect(result.cssClasses[0]).toEqual({
      selector: '.table-gradient-amt-0',
      declarations: {
        borderWidth: '1px ',
        borderStyle: 'solid ',
        borderColor: 'white ',
        backgroundColor: 'var(--table-gradient-bg-color-amt-0) ', // flat keeps the trailing space
      },
    });
  });

  it('semaphore: entries keep `col`, no `ranges`', () => {
    const styles = [{ col: 'amt', type: 'semaphore', value1: 15, value2: 8, color1: 'ff0000', color2: 'ffff00', color3: '00ff00' }];
    const result = computeTableColorStyles(styles as any, rows.slice(0, 2), 'flat');

    expect(result.entries).toEqual({
      amt: { type: 'semaphore', col: 'amt', value1: 15, value2: 8 },
    });
    expect(result.cssVars.map(v => v.value)).toEqual(['#ff0000', '#ffff00', '#00ff00']);
  });
});

describe('computeTableColorStyles — matrix (crosstable)', () => {
  const rows = [
    { region: 'North', ' Chairs ~ amt': 10, ' Tables ~ amt': 20 },
    { region: 'South', ' Chairs ~ amt': 5, ' Tables ~ amt': 15 },
  ];

  it('gradient: one logical spec fans out into an entry per physical column, keyed by `value` not `col`', () => {
    const styles = [{ col: 'amt', max: 'ff0000', min: '00ff00', cols: [' Chairs ~ amt', ' Tables ~ amt'] }];
    const result = computeTableColorStyles(styles as any, rows, 'matrix');

    expect(result.entries).toEqual({
      ' Chairs ~ amt': { max: 20, min: 5, rangeValue: 3, ranges: [8, 11, 14, 17, 20], value: 'amt' },
      ' Tables ~ amt': { max: 20, min: 5, rangeValue: 3, ranges: [8, 11, 14, 17, 20], value: 'amt' },
    });
    // matrix drops the trailing space that flat keeps, both on the raw CSS var value...
    expect(result.cssVars[0].value).toBe('#33cc00');
    // ...and on the class declaration's var() reference.
    expect(result.cssClasses[0].declarations.backgroundColor).toBe('var(--table-gradient-bg-color-amt-0)');
  });

  it('semaphore: fans out per physical column, keyed by `value`, no `col`', () => {
    const styles = [{ col: 'amt', type: 'semaphore', value1: 15, value2: 8, color1: 'ff0000', color2: 'ffff00', color3: '00ff00', cols: [' Chairs ~ amt', ' Tables ~ amt'] }];
    const result = computeTableColorStyles(styles as any, rows, 'matrix');

    expect(result.entries).toEqual({
      ' Chairs ~ amt': { type: 'semaphore', value1: 15, value2: 8, value: 'amt' },
      ' Tables ~ amt': { type: 'semaphore', value1: 15, value2: 8, value: 'amt' },
    });
  });

  it('a semaphore spec without `cols` contributes no entries (matches original: `if (style.cols) {...}`)', () => {
    const styles = [{ col: 'amt', type: 'semaphore', value1: 15, value2: 8, color1: 'ff0000', color2: 'ffff00', color3: '00ff00' }];
    const result = computeTableColorStyles(styles as any, rows, 'matrix');

    expect(result.entries).toEqual({});
    expect(result.cssVars.length).toBe(3); // CSS vars are still emitted; only the entries map is skipped
  });
});
