import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import * as d3 from 'd3';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaBarD3 } from './eda-bar';
import { StyleProviderService, D3TooltipService, lightenHex, darkenHex, sanitizeId, formatAxisValue, ensureLinearGradient, formatDeNumber, formatDePercent, formatValueLabel, resolveLabelColor, initD3ResizeObserver, teardownD3Chart, roundedTipRectPath } from '@eda/services/service.index';
import { EdaChartLegendComponent } from '../eda-chart-legend/eda-chart-legend.component';

interface BarSeries {
  label: string;
  color: string;
  data: number[];
  rawValues?: number[];
}

const GRADIENT_LIGHTEN_AMOUNT = 60;
// Bar hover "pop": the hovered bar grows to this fraction of its normal cross-dimension (width for
// vertical bars, height for horizontal ones), and its own lateral gap (see vBarGap/vSeriesGap in
// draw(), capped by HOVER_GAP_CONTRIBUTION_CAP_PX) is added twice on top of that growth - once for
// the growth itself, once again as extra breathing room - so it visibly stands out from its
// neighbors even though, at typical padding values, it ends up overlapping the space they'd
// normally leave clear (acceptable since this is a transient highlight, not a layout change).
// A bar already wider/taller than HOVER_WIDTH_WIDE_THRESHOLD_PX grows by the smaller
// HOVER_WIDTH_SCALE_WIDE factor instead - the same relative growth reads as a much bigger jump in
// absolute pixels on a wide bar than on a thin one, so thin bars get the fuller pop and wide ones a
// subtler one.
const HOVER_WIDTH_WIDE_THRESHOLD_PX = 30;
const HOVER_WIDTH_SCALE_NARROW = 1.2;
const HOVER_WIDTH_SCALE_WIDE = 1.05;
// Cap on the gap's own contribution to the growth (see hoverExtraWidth) - the band padding gap
// scales with the category/series band's own step, so with very few categories (a bar taking up
// most of the chart's width) it can be huge, which would otherwise completely swamp the intended
// 5%/20% width-based growth above. Capping it keeps the "breathing room" a small, fixed amount
// instead of blowing up along with the bar's own width.
const HOVER_GAP_CONTRIBUTION_CAP_PX = 12;
// D3TooltipService's own defaults sit the tooltip right up against the cursor - pin its
// BOTTOM-left corner 20px to the right and 20px above the pointer instead (anchorBottomLeft: true
// below), both on the initial show and on every subsequent mousemove.
const TOOLTIP_OFFSET_X = 20;
const TOOLTIP_OFFSET_Y = -20;

@Component({
  standalone: true,
  selector: 'eda-bar-d3',
  templateUrl: './eda-bar.component.html',
  styleUrls: ['./eda-bar.component.css'],
  encapsulation: ViewEncapsulation.Emulated,
  imports: [FormsModule, CommonModule, EdaChartLegendComponent]
})
export class EdaBarD3Component implements OnInit, AfterViewInit, OnDestroy {
  @Input() inject: EdaBarD3;
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef;

  id: string;
  svg: any;
  resizeObserver!: ResizeObserver;

  chartLegend: boolean;
  legendItems: { label: string; color: string; hidden: boolean }[] = [];

  private categories: string[] = [];
  private series: BarSeries[] = [];
  private categoryColorOverrides: Map<string, string> = new Map();
  private hiddenSeriesIndexes: Set<number> = new Set();
  private fontFamily = 'inherit';
  // Only the very first draw() gets the staggered grow-in animation - a resize or a color/hover
  // triggered redraw shouldn't make every bar shrink to zero and regrow.
  private hasRendered = false;

  constructor(private styleProviderService: StyleProviderService, private tooltipService: D3TooltipService) { }

  ngOnInit(): void {
    this.id = `bar_${this.inject.id}`;
    this.chartLegend = this.inject.chartLegend ?? !(this.inject.compact ?? false);
    this.styleProviderService.panelFontFamily.subscribe(v => this.fontFamily = v).unsubscribe();
    this.buildSeries();
  }

  ngOnDestroy(): void {
    teardownD3Chart(this.tooltipService, this.resizeObserver);
  }

  ngAfterViewInit(): void {
    const container = this.svgContainer.nativeElement as HTMLElement;
    if (!this.svg) this.svg = d3.select(container).append('svg');
    // skipFirstCallback: ResizeObserver.observe() always fires its callback once on its own,
    // asynchronously, right on top of the manual draw() below - without skipping it, it would
    // instantly redraw everything at full size a moment later, wiping out the grow-in animation.
    this.resizeObserver = initD3ResizeObserver(container, this.svg, () => this.draw(), { skipFirstCallback: true });
  }

  /** Called by the shared chart-dialog.component.ts (unconditionally, no `?.`) on every live color edit. */
  updateChart(): void {
    this.chartLegend = this.inject.chartLegend ?? !(this.inject.compact ?? false);
    this.hiddenSeriesIndexes.clear();
    this.buildSeries();
    this.draw();
  }

  private buildSeries(): void {
    const labels: string[] = this.inject.chartLabels || [];
    this.categories = labels.map(l => String(l));
    const assignedByLabel = new Map((this.inject.assignedColors || []).map((c: any) => [c.value, c]));
    const datasets = this.inject.chartDataset || [];
    this.series = datasets.map((ds: any) => {
      const assigned = assignedByLabel.get(ds.label);
      return {
        label: ds.label || '',
        color: assigned?.color || ds.backgroundColor || '#4472c4',
        data: (ds.data || []).map((v: any) => Number(v) || 0),
        rawValues: ds.value ? ds.value.map((v: any) => Number(v) || 0) : undefined
      };
    });

    // Colored-bars-by-threshold / unique-per-bar modes: a per-category color, keyed by category
    // label, takes priority over the series' own color (see barColor()).
    this.categoryColorOverrides = new Map((this.inject.categoryColorOverrides || []).map((c: any) => [c.value, c.color]));

    this.legendItems = this.series.map((s, i) => ({
      label: s.label,
      color: s.color || '#4472c4',
      hidden: this.hiddenSeriesIndexes.has(i)
    }));
  }

  toggleLegend(index: number): void {
    if (this.hiddenSeriesIndexes.has(index)) {
      this.hiddenSeriesIndexes.delete(index);
    } else {
      this.hiddenSeriesIndexes.add(index);
    }
    this.legendItems[index].hidden = this.hiddenSeriesIndexes.has(index);
    // Replay the staggered grow-in animation on every legend toggle, not just the very first draw.
    this.hasRendered = false;

    // Exit animation: draw() only ever grows bars IN (see animateEntrance below) - without this,
    // the outgoing state would just vanish instantly the moment draw() clears the SVG, instead of
    // visibly leaving first. Fade the current bars out, then let draw() clear and rebuild once
    // that's done.
    const EXIT_DURATION_MS = 200;
    const currentBars = this.svg.selectAll('.eda-bar-bars path, .eda-bar-bars rect');
    if (!currentBars.empty()) {
      currentBars.transition().duration(EXIT_DURATION_MS).style('opacity', 0);
      setTimeout(() => this.draw(), EXIT_DURATION_MS);
    } else {
      this.draw();
    }
  }

  private barColor(series: BarSeries, categoryIdx: number): string {
    const override = this.categoryColorOverrides.get(this.categories[categoryIdx]);
    return override || series.color || '#4472c4';
  }

  private gradientId(colorHex: string): string {
    return `bar-grad-${this.id}-${sanitizeId(colorHex)}`;
  }

  /**
   * Linear (not radial - bars aren't round) gradient, base color -> lighter, oriented along
   * the bar's own growth direction: bottom->top for vertical bars, left->right for horizontal ones.
   */
  private barFill(defs: any, series: BarSeries, categoryIdx: number, horizontal: boolean): string {
    const hex = this.barColor(series, categoryIdx);
    if (!(this.inject.useGradient ?? true)) return hex;
    const axis = horizontal
      ? { x1: '0%', y1: '0%', x2: '100%', y2: '0%' }
      : { x1: '0%', y1: '100%', x2: '0%', y2: '0%' };
    return ensureLinearGradient(defs, this.gradientId(hex), [
      { offset: '0%', color: hex },
      { offset: '100%', color: lightenHex(hex, GRADIENT_LIGHTEN_AMOUNT) }
    ], axis);
  }

  /**
   * Thin per-instance wrapper around the shared roundedTipRectPath (d3-xy-chart.util.ts, also used
   * by eda-barline-d3) - fills in the component's own `useRoundedBars` toggle so call sites below
   * don't each have to pass it. `round=false` forces flat corners regardless of the toggle - used
   * for stacked segments that aren't their category's own outermost non-zero one (see
   * lastNonZeroSidx in draw()).
   */
  private roundedTipRectPath(x: number, y: number, width: number, height: number, horizontal: boolean, round: boolean = true, flip: boolean = false): string {
    return roundedTipRectPath(x, y, width, height, horizontal, this.inject.useRoundedBars ?? true, round, flip);
  }

  /**
   * Extra size (width for a vertical bar, height for a horizontal one) a bar grows by on hover
   * (see HOVER_WIDTH_SCALE_NARROW/_WIDE), split evenly across both sides - also the amount its
   * immediate neighbor slot on either side (left/right for vertical, top/bottom for horizontal)
   * must be nudged out of the way (half each) to make room instead of just being overlapped.
   */
  private hoverExtraWidth(width: number, gap: number): number {
    const scale = width > HOVER_WIDTH_WIDE_THRESHOLD_PX ? HOVER_WIDTH_SCALE_WIDE : HOVER_WIDTH_SCALE_NARROW;
    return width * (scale - 1) + Math.min(gap, HOVER_GAP_CONTRIBUTION_CAP_PX) * 2;
  }

  private formatLabel(value: number, percentage: number): string {
    return formatValueLabel(value, percentage, this.inject.showLabels, this.inject.showLabelsPercent);
  }

  private percentOfSeries(series: BarSeries, catIdx: number): number {
    const total = series.data.reduce((a, b) => a + b, 0);
    const value = series.data[catIdx] || 0;
    return total !== 0 ? (value / total) * 100 : 0;
  }

  private tooltipHtml(seriesLabel: string, category: string, value: number, percentage: number, isPyramid: boolean, hex: string, multiSeries: boolean): string {
    const swatch = `<span class="eda-bar-tooltip-swatch" style="background-color:${hex};"></span>`;
    const linkedDashboard = this.inject.linkedDashboard;
    const linkedRow = linkedDashboard ? `<h6>${$localize`:@@linkedTo:Vinculado con`} ${linkedDashboard.dashboardName}</h6>` : '';
    // Field name : category, matching treemap/bubblechart/scatter/doughnut's title convention.
    const categoryFieldName = this.inject.categoryFieldName;
    // stackedbar100's single-text-column mode inverts category/series semantics (same reason as
    // emitClick's own filterBy/label swap): `category` there is a numeric column's own name
    // standing in for a category, while `seriesLabel` holds the text column's real, filterable
    // value that categoryFieldName actually names. Its two-text-column mode needs no such swap -
    // `category` and `seriesLabel` are both genuine dimension values there already, same as every
    // other chart type.
    const measureAsCategory = this.inject.stackedBar100MeasureAsCategory === true;
    const titleValue = measureAsCategory ? seriesLabel : category;
    const title = `<div class="eda-bar-tooltip-title">${categoryFieldName ? categoryFieldName + ' : ' : ''}${titleValue}</div>`;
    // With several series on screen, seriesLabel is what tells them apart (e.g. a grouped bar's
    // sub-category value) and has to stay in the row regardless of what it actually names.
    // With just one, there's nothing to disambiguate, so it's replaced by valueFieldName (the
    // real numeric column's name) when available - seriesLabel there is really the category
    // field's name, not the value's own name (see transformDataQuery's single-dimension branch).
    const valueName = measureAsCategory ? category : multiSeries ? seriesLabel : (this.inject.valueFieldName || seriesLabel);
    const seriesPrefix = `<strong>${valueName}</strong> : `;
    if (isPyramid) {
      return title + `<div class="eda-bar-tooltip-row">${swatch}${seriesPrefix}${formatDeNumber(Math.abs(value))}</div>${linkedRow}`;
    }
    return title +
      `<div class="eda-bar-tooltip-row">${swatch}${seriesPrefix}${formatDeNumber(value)} (${percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })}%)</div>${linkedRow}`;
  }

  private measureCanvas: HTMLCanvasElement;

  private measureTextWidth(label: string, fontSizePx: number, bold: boolean = false): number {
    if (!this.measureCanvas) this.measureCanvas = document.createElement('canvas');
    const ctx = this.measureCanvas.getContext('2d');
    ctx.font = `${bold ? 'bold ' : ''}${fontSizePx}px ${this.fontFamily === 'inherit' ? 'sans-serif' : this.fontFamily}`;
    return ctx.measureText(label).width;
  }

  private measureMaxLabelWidth(labels: string[], fontSizePx: number): number {
    return labels.reduce((max, label) => Math.max(max, this.measureTextWidth(label, fontSizePx)), 0);
  }

  /**
   * Data-label number formatter for vertical bars: falls back to a K/M/MM-abbreviated form
   * (localized unit) when the full number (rendered bold, same as the label itself) would be
   * wider than the bar it sits on/in - e.g. "3.123.123" -> "3,12 M" - so it doesn't overflow past
   * the narrow column of a chart with many categories. Tries 2 decimals first; if even that
   * abbreviated form is still too wide for the column, drops the decimals too ("3 M").
   */
  private compactNumber(value: number, maxWidthPx: number): string {
    const full = formatDeNumber(value);
    if (this.measureTextWidth(full, 11, true) <= maxWidthPx) return full;

    const abs = Math.abs(value);
    let divisor: number, unit: string;
    if (abs >= 1_000_000_000) { divisor = 1_000_000_000; unit = $localize`:@@edaBarUnitBillion:MM`; }
    else if (abs >= 1_000_000) { divisor = 1_000_000; unit = $localize`:@@edaBarUnitMillion:M`; }
    else if (abs >= 1_000) { divisor = 1_000; unit = $localize`:@@edaBarUnitThousand:K`; }
    else return full;

    const withDecimals = `${(value / divisor).toLocaleString('de-DE', { maximumFractionDigits: 2 })} ${unit}`;
    if (this.measureTextWidth(withDecimals, 11, true) <= maxWidthPx) return withDecimals;

    return `${(value / divisor).toLocaleString('de-DE', { maximumFractionDigits: 0 })} ${unit}`;
  }

  /** Same value/percentage combining convention as formatValueLabel, but with the value portion
   * run through compactNumber() so it can abbreviate to fit maxWidthPx - only meaningful for
   * vertical bars, where the label sits centered on/in a single fixed-width bar. */
  private formatCompactBarLabel(value: number, percentage: number, maxWidthPx: number): string {
    const showValue = this.inject.showLabels;
    const showPercent = this.inject.showLabelsPercent;
    if (showValue && showPercent) return `${this.compactNumber(value, maxWidthPx)} - ${formatDePercent(percentage)}`;
    if (showValue) return this.compactNumber(value, maxWidthPx);
    if (showPercent) return formatDePercent(percentage);
    return '';
  }

  private readonly maxCategoryChars = 8;

  private truncateLabel(label: string, maxChars: number = this.maxCategoryChars): string {
    return label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;
  }

  draw(): void {
    const container = this.svgContainer.nativeElement as HTMLElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;

    this.svg.selectAll('*').remove();

    const edaChart = this.inject.edaChart;
    const horizontal = edaChart === 'horizontalBar' || edaChart === 'pyramid';
    const stacked = ['stackedbar', 'stackedbar100', 'pyramid'].includes(edaChart);
    const stacked100 = edaChart === 'stackedbar100';
    const isPyramid = edaChart === 'pyramid';
    const linkedDashboard = this.inject.linkedDashboard;
    const compact = this.inject.compact ?? false;

    const visibleIdx = this.series.map((_, i) => i).filter(i => !this.hiddenSeriesIndexes.has(i));
    const visibleSeries = visibleIdx.map(i => this.series[i]);
    // A category whose only non-zero value belonged to a now-hidden series (toggled off from the
    // legend) has nothing left to show - drop it entirely (row, axis label and all) rather than
    // leaving an empty gap where it used to be.
    // Histograms are exempt: a zero-count bin is a meaningful gap, not noise to hide.
    const visibleCategories = edaChart === 'histogram'
      ? this.categories
      : this.categories.filter((cat, catIdx) => visibleSeries.some(s => (s.data[catIdx] || 0) !== 0));
    // Every series hidden (or all of the still-visible ones happen to be zero everywhere) - there's
    // nothing to plot, but the chart shouldn't go completely blank: keep showing the axes/grid as a
    // stable frame (using the full, un-filtered category list and value domain), just with no bars
    // drawn on top, rather than returning early and leaving an empty white panel.
    const hasVisibleData = visibleSeries.length > 0 && visibleCategories.length > 0;
    const axisCategories = hasVisibleData ? visibleCategories : this.categories;

    // Build the stacked layout (stackedbar / stackedbar100 / pyramid) once, shared by all three.
    // Not using d3.stack() here: its default offset keeps SEPARATE positive/negative running
    // totals per category, which is right for a genuine 2-group diverging pyramid (each group is
    // consistently the same sign, meant to diverge to its own side) but wrong for per-item custom
    // colors, where several sparse series can end up with inconsistent signs for the SAME category
    // (chart-utils.service.ts's pyramid transform only negates series index 0) even though they're
    // all meant to sit on the same side - d3.stack() would then have both restart from zero in
    // opposite directions and overlap instead of sitting end to end. Decide the shared side per
    // category instead (negative if ANY of its segments is negative) and stack every segment for
    // that category continuously in that one direction, using magnitudes.
    let stackedSeriesData: any[] = null;
    if (stacked && hasVisibleData) {
      stackedSeriesData = visibleSeries.map(() => [] as any[]);
      visibleCategories.forEach((cat) => {
        const catIdx = this.categories.indexOf(cat);
        const values = visibleSeries.map(s => s.data[catIdx] || 0);
        const negative = values.some(v => v < 0);
        let offset = 0;
        values.forEach((v, sIdx) => {
          const magnitude = Math.abs(v);
          const d0 = offset;
          const d1 = offset + magnitude;
          offset = d1;
          const tuple: any = negative ? [-d0, -d1] : [d0, d1];
          tuple.data = { cat };
          stackedSeriesData[sIdx].push(tuple);
        });
      });
    }

    // Value domain
    let valueMin = 0, valueMax = 0;
    if (!hasVisibleData) {
      // No visible series/data to size the axis from - fall back to the full, un-filtered data so
      // the frame stays a sensible size instead of collapsing to the trivial [0,1] default below.
      this.series.forEach(s => s.data.forEach(v => { valueMin = Math.min(valueMin, v); valueMax = Math.max(valueMax, v); }));
    } else if (stacked100) {
      valueMax = 100;
    } else if (stacked) {
      stackedSeriesData.forEach((layer: any) => layer.forEach((d: any) => {
        valueMin = Math.min(valueMin, d[0], d[1]);
        valueMax = Math.max(valueMax, d[0], d[1]);
      }));
    } else {
      visibleSeries.forEach(s => s.data.forEach(v => { valueMin = Math.min(valueMin, v); valueMax = Math.max(valueMax, v); }));
    }
    if (valueMax === valueMin) valueMax = valueMin + 1;

    // A small panel has no room for D3's default ~10 auto ticks on the value axis without the
    // value labels overlapping into an unreadable mess, so cap it to just 1 tick under 150px, 2
    // under 300px, or 3 above that.
    const verticalTickCount = height < 150 ? 1 : height < 300 ? 2 : 3;
    // Horizontal bars get their own (separate, more granular) scale, measured against width - the
    // dimension their value axis actually runs along - with an extra bottom tier: below 100px
    // there's no room for even a single readable value tick, so it drops to 0.
    const horizontalTickCount = width < 200 ? 0 : width < 350 ? 1 : width < 500 ? 2 : width < 900 ? 3 : 6;

    // Chart.js auto-sizes each axis's own space to fit its widest label; a fixed margin clips
    // long region names (horizontal category axis) or large formatted numbers (vertical value
    // axis) instead. Measure the actual widest label - using a throwaway scale/ticks for the
    // vertical case, since the real valueScale's range depends on this same margin - capped so
    // one outlier label can't eat the whole chart.
    // showGridLines drives the value axis and its gridlines independently of compact for vertical
    // bars (mirrors eda-line-d3/eda-area-d3) - horizontal bars keep the existing compact behavior,
    // since their value axis runs along the bottom margin, not the left one this reuses.
    const showGrid = this.inject.showGridLines ?? !compact;

    let leftMargin: number;
    // Which category labels survive auto-skip (populated below for the horizontal case, where
    // - unlike the vertical one - the label footprint is vertical, not affected by left margin,
    // so it can be decided before sizing that margin, and the margin only needs to fit whichever
    // labels actually remain visible instead of the full list.
    let horizontalVisibleCatIndexes: Set<number> = null;
    if (horizontal) {
      const innerHeightForSkip = Math.max(height - 16 - 30, 10);
      const skipProbeScale = d3.scaleBand().domain(axisCategories).range([0, innerHeightForSkip]).padding(0.25);
      const step = skipProbeScale.step();
      const lineHeight = 14; // ~11px font + a little breathing room between rows
      horizontalVisibleCatIndexes = new Set();
      let lastShownY = -Infinity;
      axisCategories.forEach((_, i) => {
        if (lastShownY === -Infinity || i * step - lastShownY >= lineHeight) {
          horizontalVisibleCatIndexes.add(i);
          lastShownY = i * step;
        }
      });
      const visibleLabels = axisCategories
        .filter((_, i) => horizontalVisibleCatIndexes.has(i))
        .map(c => this.truncateLabel(c));
      leftMargin = Math.min(Math.max(this.measureMaxLabelWidth(visibleLabels, 11) + 24, 60), width * 0.4);
    } else {
      const probeScale = d3.scaleLinear().domain([valueMin, valueMax]).nice();
      const tickLabels = probeScale.ticks(verticalTickCount).map(v => formatAxisValue(v));
      leftMargin = Math.min(Math.max(this.measureMaxLabelWidth(tickLabels, 11) + 16, 40), width * 0.3);
    }
    const showCompactCategoryAxis = compact && !horizontal && this.inject.showGridLines === true;
    const showCompactLabels = compact && !horizontal && (this.inject.showLabels || this.inject.showLabelsPercent);
    const margin = compact
      ? { top: showCompactLabels ? 20 : 4, right: 4, bottom: showCompactCategoryAxis ? 18 : 4, left: (!horizontal && showGrid) ? leftMargin : 4 }
      : { top: 16, right: 20, bottom: horizontal ? 30 : 50, left: leftMargin };
    const innerWidth = Math.max(width - margin.left - margin.right, 10);
    const innerHeight = Math.max(height - margin.top - margin.bottom, 10);

    const defs = this.svg.append('defs');
    const g = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const categoryScale: any = d3.scaleBand().domain(axisCategories).range(horizontal ? [0, innerHeight] : [0, innerWidth]).padding(0.25);
    const valueScale: any = d3.scaleLinear().domain([valueMin, valueMax]).nice().range(horizontal ? [0, innerWidth] : [innerHeight, 0]);
    const zeroPos = valueScale(0);

    const seriesScale: any = d3.scaleBand().domain(visibleSeries.map((_, i) => String(i))).range([0, categoryScale.bandwidth()]).padding(0.05);
    // Per-side lateral gap a bar normally has towards its neighbor - a single-series/stacked bar's
    // neighbor is the next category (categoryScale's own gap), a grouped bar's is the next series
    // within the same category (seriesScale's, usually much smaller). Used by hoverExtraWidth for
    // both vertical and horizontal bars.
    const vBarGap = (categoryScale.step() - categoryScale.bandwidth()) / 2;
    const vSeriesGap = (seriesScale.step() - seriesScale.bandwidth()) / 2;

    // Grid lines (value axis) - shown independently of compact when explicitly enabled, so a KPI
    // mini-chart can opt into them without needing full axis labels too.
    if (this.inject.showGridLines ?? !compact) {
      const gridAxis: any = horizontal
        ? d3.axisBottom(valueScale).ticks(horizontalTickCount).tickSize(-innerHeight).tickFormat(() => '')
        : d3.axisLeft(valueScale).ticks(verticalTickCount).tickSize(-innerWidth).tickFormat(() => '');
      g.append('g')
        .attr('class', 'eda-bar-grid')
        .attr('transform', horizontal ? `translate(0,${innerHeight})` : 'translate(0,0)')
        .call(gridAxis);
    }

    // Compact mode explicitly opted into gridlines - also show the vertical value axis' numbers
    // (not the category axis, which still needs the full non-compact layout). Horizontal bars'
    // value axis runs along the bottom margin, which compact doesn't allocate space for, so it
    // stays compact-gated below with the rest.
    if (compact && !horizontal && this.inject.showGridLines === true) {
      const valueAxis: any = d3.axisLeft(valueScale).ticks(verticalTickCount).tickFormat((v: any) => formatAxisValue(v));
      g.append('g').attr('class', 'eda-bar-axis').attr('transform', 'translate(0,0)').call(valueAxis);
      g.selectAll('.eda-bar-axis text').style('font-family', this.fontFamily).style('font-size', '11px').style('font-weight', 500).style('fill', '#000000');
    }

    if (!compact) {
      // Axes. Category labels are truncated to a fixed character count and value numbers
      // abbreviated (500k, 1M...) purely for display - the underlying scale/data keeps the full
      // values, so click handling, tooltips and datalabels are unaffected.
      const categoryAxis: any = (horizontal ? d3.axisLeft(categoryScale) : d3.axisBottom(categoryScale))
        .tickFormat((d: string) => this.truncateLabel(d));
      const valueAxis: any = (horizontal ? d3.axisBottom(valueScale).ticks(horizontalTickCount) : d3.axisLeft(valueScale).ticks(verticalTickCount))
        .tickFormat((v: any) => formatAxisValue(v));

      const catAxisG = g.append('g')
        .attr('class', 'eda-bar-axis')
        .attr('transform', horizontal ? 'translate(0,0)' : `translate(0,${innerHeight})`)
        .call(categoryAxis);

      if (!horizontal) {
        catAxisG.selectAll('text')
          .style('text-anchor', 'end')
          .attr('dx', '-0.5em')
          .attr('dy', '0.4em')
          .attr('transform', 'rotate(-30)');

        // Chart.js's category axis auto-skips ticks so rotated labels never overlap; a plain d3
        // axis renders every one regardless of how little room each category gets, so with many
        // categories crammed into a narrow panel they collide into an unreadable mess. Walk left
        // to right and only hide a label if it would actually overlap the last one left visible -
        // using each label's OWN measured width (not a worst-case max for all of them), so short
        // names still get to show up between long ones instead of being skipped needlessly.
        const angle = Math.PI / 6; // matches the -30deg rotation above
        const footprints = axisCategories.map(c => {
          const w = this.measureTextWidth(this.truncateLabel(c), 11);
          return w * Math.cos(angle) + 11 * Math.sin(angle);
        });
        const step = categoryScale.step();
        let lastShown = -Infinity;
        catAxisG.selectAll('.tick').style('display', (_: any, i: number) => {
          if (lastShown === -Infinity || (i - lastShown) * step >= (footprints[lastShown] + footprints[i]) / 2 + 4) {
            lastShown = i;
            return null;
          }
          return 'none';
        });
      } else {
        // Same auto-skip idea, vertical direction: hides whichever row labels didn't make the
        // cut computed above (before the margin was sized), so the left margin - and the visual
        // density of the chart - only ever account for the labels actually shown.
        catAxisG.selectAll('.tick').style('display', (_: any, i: number) => horizontalVisibleCatIndexes.has(i) ? null : 'none');
      }

      g.append('g')
        .attr('class', 'eda-bar-axis')
        .attr('transform', horizontal ? `translate(0,${innerHeight})` : 'translate(0,0)')
        .call(valueAxis);

      // Matches the shared legend's typography (eda-chart-legend.component.css) so axis labels
      // and legend entries read as the same typographic system.
      g.selectAll('.eda-bar-axis text')
        .style('font-family', this.fontFamily)
        .style('font-size', '11px')
        .style('font-weight', 500)
        .style('fill', '#000000');
    } else if (showCompactCategoryAxis) {
      // Compact mode has no room for the full diagonal collision-avoidance axis above - cap to at
      // most 3 evenly-spaced labels, horizontal instead of rotated.
      const categoryAxis: any = d3.axisBottom(categoryScale).tickFormat((d: string) => this.truncateLabel(d));
      const catAxisG = g.append('g').attr('class', 'eda-bar-axis')
        .attr('transform', `translate(0,${innerHeight})`).call(categoryAxis);
      catAxisG.selectAll('text').style('text-anchor', 'middle')
        .style('font-family', this.fontFamily).style('font-size', '10px').style('font-weight', 500).style('fill', '#000000');

      // At 1/4, 1/2 and 3/4 rather than first/middle/last - the very edge categories sit right at
      // the plot boundary, where a centered label's text overflows past the SVG edge and clips.
      const n = axisCategories.length;
      const keepIdx = n <= 3 ? new Set(axisCategories.map((_, i) => i)) : new Set([
        Math.round((n - 1) * 2 / 8),
        Math.round((n - 1) * 4 / 8),
        Math.round((n - 1) * 6 / 8)
      ]);
      catAxisG.selectAll('.tick').style('display', (_: any, i: number) => keepIdx.has(i) ? null : 'none');
    }

    const showLabelsOn = this.inject.showLabels || this.inject.showLabelsPercent;
    const barsGroup = g.append('g').attr('class', 'eda-bar-bars');
    const labelsGroup = g.append('g').attr('class', 'eda-bar-labels');

    const emitClick = (catIdx: number, seriesLabel: string, value: number) => {
      const category = this.categories[catIdx];
      if (linkedDashboard) {
        const url = window.location.href.slice(0, window.location.href.indexOf('/dashboard')) +
          `/dashboard/${linkedDashboard.dashboardID}?${linkedDashboard.table}.${linkedDashboard.col}=${stacked100 ? category : seriesLabel}`;
        window.open(url, '_blank');
      } else {
        // stackedbar100 inverts filterBy/label: the category is the filterable field there, not the series.
        const [filterBy, label] = stacked100 ? [category, seriesLabel] : [seriesLabel, category];
        this.onClick.emit({ inx: catIdx, label, value, filterBy });
      }
    };

    // Staggered grow-in animation, first draw only (see hasRendered below): the bar for category
    // 0 starts growing immediately, category 1 starts once category 0's grow finishes, and so on,
    // so the whole sequence always finishes in ENTRANCE_TOTAL_MS regardless of category count.
    const ENTRANCE_TOTAL_MS = compact ? 600 : 2000;
    const animateEntrance = !this.hasRendered && (this.inject.chartAnimation ?? true);
    const perCatDelay = ENTRANCE_TOTAL_MS / Math.max(visibleCategories.length, 1);
    const singleSeries = visibleSeries.length === 1;

    // An ordered list of "bar slots" along the category axis (left-to-right for vertical bars,
    // top-to-bottom for horizontal ones), so hovering a bar can nudge its immediate neighbor slot
    // out of the way to make room for its hover-grow (hoverExtraWidth) instead of just silently
    // overlapping it. A slot is one stack column (stacked - all its segments share the same
    // position and move together), one lone bar (single series), or one bar within a group (grouped).
    interface BarSlot { cat: string; sIdxs: number[]; }
    const barSlots: BarSlot[] = [];
    const slotIndexByKey = new Map<string, number>();
    const slotKey = (cat: string, sIdx: number) => (stacked || singleSeries) ? `c:${cat}` : `c:${cat}|s:${sIdx}`;
    if (hasVisibleData) {
      visibleCategories.forEach((cat) => {
        if (stacked) {
          slotIndexByKey.set(slotKey(cat, 0), barSlots.length);
          barSlots.push({ cat, sIdxs: visibleSeries.map((_, i) => i) });
        } else if (singleSeries) {
          slotIndexByKey.set(slotKey(cat, 0), barSlots.length);
          barSlots.push({ cat, sIdxs: [0] });
        } else {
          visibleSeries.forEach((_, sIdx) => {
            slotIndexByKey.set(slotKey(cat, sIdx), barSlots.length);
            barSlots.push({ cat, sIdxs: [sIdx] });
          });
        }
      });
    }
    // Grabs the actual <path> bar(s) - and, if shown, their value-labels - making up one slot, so
    // a hover handler can nudge them sideways. Looked up by class + a data filter rather than kept
    // as direct references, since the bars/labels for every series are built in their own forEach
    // pass below, some of which run after this prepass.
    const slotBars = (slot: BarSlot) => slot.sIdxs.map(si =>
      barsGroup.selectAll(`.eda-bar-series-${si}`).filter((dd: any) => (stacked ? dd.data.cat : dd.cat) === slot.cat));
    const slotLabels = (slot: BarSlot) => slot.sIdxs.map(si =>
      labelsGroup.selectAll(`.eda-bar-label-${si}`).filter((dd: any) => (stacked ? dd.data.cat : dd.cat) === slot.cat));
    const NEIGHBOR_SHIFT_MS = 150;
    // Shifts along the category axis - horizontally (translate(d,0)) for vertical bars, vertically
    // (translate(0,d)) for horizontal ones - so "before"/"after" the hovered slot always nudges
    // towards/away from the previous/next category regardless of orientation.
    const shiftSlot = (slot: BarSlot, delta: number) => {
      const transform = horizontal ? `translate(0,${delta})` : `translate(${delta},0)`;
      [...slotBars(slot), ...slotLabels(slot)].forEach(sel =>
        sel.interrupt('neighborShift').transition('neighborShift').duration(NEIGHBOR_SHIFT_MS).attr('transform', transform));
    };
    // Called from every bar's mouseover/mouseout below - pushes the immediate neighbor slot on
    // either side (left/right for vertical bars, top/bottom for horizontal ones) out of the way
    // (or back) by half the hovered bar's own hover-grow extra size each.
    const nudgeNeighbors = (cat: string, sIdx: number, extra: number, hovering: boolean) => {
      const idx = slotIndexByKey.get(slotKey(cat, sIdx));
      if (idx === undefined) return;
      const before = barSlots[idx - 1];
      const after = barSlots[idx + 1];
      if (before) shiftSlot(before, hovering ? -extra / 2 : 0);
      if (after) shiftSlot(after, hovering ? extra / 2 : 0);
    };

    // Nothing visible to plot (see hasVisibleData above) - the axes/grid above are already drawn,
    // just skip building any bars on top of them.
    if (hasVisibleData) {
    if (stacked) {
      // Which series is each category's own outermost NON-ZERO segment - that's the one that gets
      // the rounded tip. Can't just check "is this the last series overall": with per-item custom
      // colors (each category really carrying just one active value in a different series slot),
      // most categories only have a single non-zero segment, and it isn't necessarily the globally
      // last series - checking that would round only whichever category happens to use that exact
      // series and leave every other one's real tip flat.
      const lastNonZeroSidx = new Map<string, number>();
      visibleCategories.forEach((cat) => {
        const catIdx = this.categories.indexOf(cat);
        let last = 0;
        visibleSeries.forEach((s, sIdx) => { if ((s.data[catIdx] || 0) !== 0) last = sIdx; });
        lastNonZeroSidx.set(cat, last);
      });

      stackedSeriesData.forEach((layer: any, sIdx: number) => {
        const series = visibleSeries[sIdx];
        const isOuter = (d: any) => sIdx === lastNonZeroSidx.get(d.data.cat);

        const bars = barsGroup.selectAll(`.eda-bar-series-${sIdx}`)
          .data(layer)
          .join('path')
          .attr('class', `eda-bar-series-${sIdx}`)
          .attr('fill', (d: any) => this.barFill(defs, series, this.categories.indexOf(d.data.cat), horizontal))
          .style('cursor', 'pointer');

        // Sequential, not simultaneous: every segment of the SAME category's stack grows one
        // after another (series 0 finishes, then series 1 starts, then series 2...), and only
        // once the whole stack for that category is done does the next category's stack start -
        // each category still gets the same overall perCatDelay time slice, just subdivided
        // into visibleSeries.length sequential steps instead of all growing at once.
        const segmentDuration = perCatDelay / Math.max(visibleSeries.length, 1);
        const catDelay = (d: any) => visibleCategories.indexOf(d.data.cat) * perCatDelay + sIdx * segmentDuration;

        // A segment's own tip is away from zero in whichever direction it actually grows - for a
        // pyramid's negated side (or any diverging stack), that's the negative direction, so the
        // rounded corners need to flip to the opposite end.
        const isNegative = (d: any) => d[1] <= 0 && d[0] <= 0;

        // hoverD is the shape the segment animates to on mouseover (see the .on('mouseover',...)
        // below), set separately per orientation so the mouseover/mouseout handlers can apply it
        // unconditionally.
        let finalD: (d: any) => string;
        let hoverD: (d: any) => string;
        // Total extra size (width for vertical bars, height for horizontal ones) the hovered
        // segment grows by - also how far its slot's neighbors get nudged out of the way (see
        // nudgeNeighbors above).
        let hoverExtra = 0;

        if (horizontal) {
          finalD = (d: any) => this.roundedTipRectPath(
            valueScale(Math.min(d[0], d[1])), categoryScale(d.data.cat),
            Math.abs(valueScale(d[1]) - valueScale(d[0])), categoryScale.bandwidth(), true, isOuter(d), isNegative(d));
          // Widens (taller) the whole stack row (all its segments share the category's full
          // bandwidth, unlike the grouped/non-stacked case) around its own vertical center, using
          // the category's own lateral gap (vBarGap) doubled - see hoverExtraWidth.
          const rowHeight = categoryScale.bandwidth();
          hoverExtra = this.hoverExtraWidth(rowHeight, vBarGap);
          hoverD = (d: any) => {
            const y = categoryScale(d.data.cat) - hoverExtra / 2;
            return this.roundedTipRectPath(
              valueScale(Math.min(d[0], d[1])), y,
              Math.abs(valueScale(d[1]) - valueScale(d[0])), rowHeight + hoverExtra, true, isOuter(d), isNegative(d));
          };
          if (animateEntrance) {
            // The zero-width starting point has to sit at THIS segment's own base (d[0] - always
            // the end adjacent to zero/the previous segment, by construction of the stacking
            // above, regardless of sign) rather than Math.min(d[0],d[1]) - for a negative segment
            // Math.min picks the far tip instead, which would grow the bar backwards (starting at
            // the tip and sweeping back towards zero instead of growing outward from the base).
            bars
              .attr('d', (d: any) => this.roundedTipRectPath(
                valueScale(d[0]), categoryScale(d.data.cat), 0, categoryScale.bandwidth(), true, isOuter(d), isNegative(d)))
              .transition().delay(catDelay).duration(segmentDuration).attr('d', finalD);
          } else {
            bars.attr('d', finalD);
          }
        } else {
          finalD = (d: any) => this.roundedTipRectPath(
            categoryScale(d.data.cat), valueScale(Math.max(d[0], d[1])),
            categoryScale.bandwidth(), Math.abs(valueScale(d[1]) - valueScale(d[0])), false, isOuter(d), isNegative(d));
          // Widens the whole stack column (all its segments share the category's full bandwidth,
          // unlike the grouped/non-stacked case) around its own center, using the category's own
          // lateral gap (vBarGap) doubled - see hoverExtraWidth.
          const width = categoryScale.bandwidth();
          hoverExtra = this.hoverExtraWidth(width, vBarGap);
          hoverD = (d: any) => {
            const x = categoryScale(d.data.cat) - hoverExtra / 2;
            return this.roundedTipRectPath(
              x, valueScale(Math.max(d[0], d[1])), width + hoverExtra, Math.abs(valueScale(d[1]) - valueScale(d[0])), false, isOuter(d), isNegative(d));
          };
          if (animateEntrance) {
            bars
              .attr('d', (d: any) => this.roundedTipRectPath(
                categoryScale(d.data.cat), valueScale(d[0]), categoryScale.bandwidth(), 0, false, isOuter(d), isNegative(d)))
              .transition().delay(catDelay).duration(segmentDuration).attr('d', finalD);
          } else {
            bars.attr('d', finalD);
          }
        }

        const labelSel = showLabelsOn
          ? labelsGroup.selectAll(`.eda-bar-label-${sIdx}`)
            .data(layer)
            .join('text')
            .attr('class', `eda-bar-label-${sIdx}`)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('font-weight', 'bold')
            .style('font-family', this.fontFamily)
            .style('fill', (d: any) => resolveLabelColor(this.inject.labelColorMode, this.inject.labelCustomColor, this.barColor(series, this.categories.indexOf(d.data.cat))))
            .style('pointer-events', 'none')
            .attr('x', (d: any) => horizontal
              ? (valueScale(d[0]) + valueScale(d[1])) / 2
              : categoryScale(d.data.cat) + categoryScale.bandwidth() / 2)
            .attr('y', (d: any) => horizontal
              ? categoryScale(d.data.cat) + categoryScale.bandwidth() / 2
              : (valueScale(d[0]) + valueScale(d[1])) / 2)
            .text((d: any) => {
              const catIdx = this.categories.indexOf(d.data.cat);
              const value = stacked100 ? (series.rawValues?.[catIdx] ?? 0) : series.data[catIdx];
              const percentage = stacked100 ? (series.data[catIdx] || 0) : this.percentOfSeries(series, catIdx);
              return this.formatLabel(value, percentage);
            })
            .style('opacity', animateEntrance ? 0 : 1)
          : null;

        // Left-to-right sequence, same as the segments themselves: a label only fades in once its
        // own segment (catDelay(d) above) has finished growing.
        if (animateEntrance && labelSel) {
          const LABEL_FADE_MS = 200;
          labelSel.transition().delay((d: any) => catDelay(d) + segmentDuration).duration(LABEL_FADE_MS).style('opacity', 1);
        }

        bars
          .on('click', (event: any, d: any) => {
            const catIdx = this.categories.indexOf(d.data.cat);
            const rawValue = stacked100 ? (series.rawValues?.[catIdx] ?? series.data[catIdx]) : series.data[catIdx];
            emitClick(catIdx, series.label, rawValue);
          })
          .on('mouseover', (event: any, d: any) => {
            const target = event.currentTarget;
            const hex = this.barColor(series, this.categories.indexOf(d.data.cat));
            // Same reasoning as the doughnut: fill can't be smoothly transitioned straight from
            // a url(#gradient) reference to a flat color (renders blank for the duration), so
            // swap in the flat base color first, instantly, then transition flat -> flat.
            d3.select(target).attr('fill', hex)
              .interrupt('color').transition('color').duration(150)
              .attr('fill', darkenHex(hex, 40));
            d3.select(target).attr('stroke', hex).attr('stroke-width', 1.5);
            d3.select(target).interrupt('widen').transition('widen').duration(150).attr('d', hoverD(d));
            nudgeNeighbors(d.data.cat, sIdx, hoverExtra, true);
            if (labelSel) {
              labelSel.filter((ld: any) => ld === d)
                .interrupt('labelGrow').transition('labelGrow').duration(150)
                .style('font-size', '14px');
            }

            const catIdx = this.categories.indexOf(d.data.cat);
            const value = stacked100 ? (series.rawValues?.[catIdx] ?? 0) : series.data[catIdx];
            const percentage = stacked100 ? (series.data[catIdx] || 0) : this.percentOfSeries(series, catIdx);
            this.tooltipService.show(event, this.tooltipHtml(series.label, d.data.cat, value, percentage, isPyramid, hex, visibleSeries.length > 1), 'eda-bar-tooltip', TOOLTIP_OFFSET_X, TOOLTIP_OFFSET_Y, true);
          })
          .on('mousemove', (event: any) => this.tooltipService.move(event, TOOLTIP_OFFSET_X, TOOLTIP_OFFSET_Y, true))
          .on('mouseout', (event: any, d: any) => {
            const target = event.currentTarget;
            const hex = this.barColor(series, this.categories.indexOf(d.data.cat));
            d3.select(target)
              .interrupt('color').transition('color').duration(150)
              .attr('fill', hex)
              .on('end', () => {
                d3.select(target).attr('fill', this.barFill(defs, series, this.categories.indexOf(d.data.cat), horizontal));
              });
            d3.select(target).interrupt('widen').transition('widen').duration(150).attr('d', finalD(d));
            nudgeNeighbors(d.data.cat, sIdx, hoverExtra, false);
            d3.select(target).attr('stroke', null).attr('stroke-width', null);
            if (labelSel) {
              labelSel.filter((ld: any) => ld === d)
                .interrupt('labelGrow').transition('labelGrow').duration(150)
                .style('font-size', '11px');
            }
            this.tooltipService.hide();
          });
      });
    } else {
      visibleSeries.forEach((series, sIdx) => {
        const rows = visibleCategories.map((cat) => ({ cat, value: series.data[this.categories.indexOf(cat)], catIdx: this.categories.indexOf(cat) }));

        const bars = barsGroup.selectAll(`.eda-bar-series-${sIdx}`)
          .data(rows)
          .join('path')
          .attr('class', `eda-bar-series-${sIdx}`)
          .attr('fill', (d: any) => this.barFill(defs, series, d.catIdx, horizontal))
          .style('cursor', 'pointer');

        const catDelay = (d: any) => visibleCategories.indexOf(d.cat) * perCatDelay;

        // hoverD is the shape the bar animates to on mouseover (see the .on('mouseover',...)
        // below), set separately per orientation so the mouseover/mouseout handlers can apply it
        // unconditionally.
        let finalD: (d: any) => string;
        let hoverD: (d: any) => string;
        // Total extra size (width for vertical bars, height for horizontal ones) the hovered bar
        // grows by - also how far its slot's neighbors get nudged out of the way (see
        // nudgeNeighbors above).
        let hoverExtra = 0;

        if (horizontal) {
          finalD = (d: any) => this.roundedTipRectPath(
            valueScale(Math.min(0, d.value)),
            (categoryScale(d.cat) || 0) + (singleSeries ? 0 : seriesScale(String(sIdx))),
            Math.abs(valueScale(d.value) - zeroPos),
            singleSeries ? categoryScale.bandwidth() : seriesScale.bandwidth(),
            true, true, d.value < 0);
          // Grouped bars widen (taller) within their own series slot (using seriesScale's smaller
          // lateral gap); a lone/single series bar widens within the full category slot
          // (categoryScale's gap) - see hoverExtraWidth.
          const rowHeight = singleSeries ? categoryScale.bandwidth() : seriesScale.bandwidth();
          const gap = singleSeries ? vBarGap : vSeriesGap;
          hoverExtra = this.hoverExtraWidth(rowHeight, gap);
          hoverD = (d: any) => {
            const y = (categoryScale(d.cat) || 0) + (singleSeries ? 0 : seriesScale(String(sIdx))) - hoverExtra / 2;
            return this.roundedTipRectPath(
              valueScale(Math.min(0, d.value)), y, Math.abs(valueScale(d.value) - zeroPos), rowHeight + hoverExtra, true, true, d.value < 0);
          };
          if (animateEntrance) {
            bars
              .attr('d', (d: any) => this.roundedTipRectPath(
                zeroPos,
                (categoryScale(d.cat) || 0) + (singleSeries ? 0 : seriesScale(String(sIdx))),
                0,
                singleSeries ? categoryScale.bandwidth() : seriesScale.bandwidth(),
                true, true, d.value < 0))
              .transition().delay(catDelay).duration(perCatDelay).attr('d', finalD);
          } else {
            bars.attr('d', finalD);
          }
        } else {
          finalD = (d: any) => this.roundedTipRectPath(
            (categoryScale(d.cat) || 0) + (singleSeries ? 0 : seriesScale(String(sIdx))),
            valueScale(Math.max(0, d.value)),
            singleSeries ? categoryScale.bandwidth() : seriesScale.bandwidth(),
            Math.abs(zeroPos - valueScale(d.value)),
            false, true, d.value < 0);
          // Grouped bars widen within their own series slot (using seriesScale's smaller lateral
          // gap); a lone/single series bar widens within the full category slot (categoryScale's
          // gap) - see hoverExtraWidth.
          const width = singleSeries ? categoryScale.bandwidth() : seriesScale.bandwidth();
          const gap = singleSeries ? vBarGap : vSeriesGap;
          hoverExtra = this.hoverExtraWidth(width, gap);
          hoverD = (d: any) => {
            const x = (categoryScale(d.cat) || 0) + (singleSeries ? 0 : seriesScale(String(sIdx))) - hoverExtra / 2;
            return this.roundedTipRectPath(
              x, valueScale(Math.max(0, d.value)), width + hoverExtra, Math.abs(zeroPos - valueScale(d.value)), false, true, d.value < 0);
          };
          if (animateEntrance) {
            bars
              .attr('d', (d: any) => this.roundedTipRectPath(
                (categoryScale(d.cat) || 0) + (singleSeries ? 0 : seriesScale(String(sIdx))),
                zeroPos,
                singleSeries ? categoryScale.bandwidth() : seriesScale.bandwidth(),
                0,
                false, true, d.value < 0))
              .transition().delay(catDelay).duration(perCatDelay).attr('d', finalD);
          } else {
            bars.attr('d', finalD);
          }
        }

        // Below this plot size (bar length for horizontal, bar height for vertical) there's no
        // room to sit the label past the bar's tip readably, so it moves INSIDE the bar (near its
        // tip) instead, in white - recomputed
        // from the current innerWidth/innerHeight on every draw() (including resize-triggered
        // ones), same as the bars themselves, so shrinking/growing the panel actually flips both
        // color AND position together instead of only ever recoloring a label that never moves
        // off its "outside" position. Same threshold/dimension as the fill color check below (bar
        // length for horizontal, bar height for vertical).
        const labelInsideBar = (horizontal ? innerWidth : innerHeight) <= 150;
        // Own width of the single bar/slot a vertical label sits centered on - constant across
        // every category (scaleBand gives every band the same width) - used to decide when the
        // label text needs to shrink to a compact K/M/MM form (see formatCompactBarLabel).
        const barOwnWidth = singleSeries ? categoryScale.bandwidth() : seriesScale.bandwidth();
        // In "inside" mode, the fixed 14px inset can push a very short bar's label out its far
        // side, past the zero-axis, into the category labels below. Clamped per-datum to that
        // bar's own pixel length/height instead - every bar stays in the same inside/white mode
        // (never a per-bar mode switch), just tucked closer to its own tip when the bar is short.
        const insideOffsetFor = (d: any) => Math.min(14, Math.max(2, Math.abs(valueScale(d.value) - zeroPos) - 2));
        const labelSel = showLabelsOn
          ? labelsGroup.selectAll(`.eda-bar-label-${sIdx}`)
            .data(rows)
            .join('text')
            .style('font-size', '11px')
            .style('font-weight', 'bold')
            .style('font-family', this.fontFamily)
            .style('fill', (d: any) => labelInsideBar ? 'white' : resolveLabelColor(this.inject.labelColorMode, this.inject.labelCustomColor, this.barColor(series, d.catIdx)))
            .style('pointer-events', 'none')
            .attr('class', `eda-bar-label-${sIdx}`)
            // Horizontal bars: a positive bar's tip is its right edge. With room to sit past it,
            // the label sits to the right (anchor 'start', extending further right, away from the
            // bar). Without room, it instead sits INSIDE the bar, anchored 'end' so it extends
            // back to the left from a point just inside the tip. A negative bar's tip is its left
            // edge instead, so every case mirrors left<->right.
            .attr('text-anchor', (d: any) => {
              if (!horizontal) return 'middle';
              return (labelInsideBar ? d.value >= 0 : d.value < 0) ? 'end' : 'start';
            })
            // Vertical bars: a positive bar's tip is its top. With room to sit ABOVE it, the label
            // sits 6px above (default alphabetic baseline already extends the text upward from y,
            // away from the bar). Without room, it instead sits inside the bar, below the tip - a
            // 'hanging' baseline there draws the text downward from y, keeping it inside the bar
            // instead of floating in the (now too-short) space above it.
            // A negative bar's tip is its bottom instead, so every case mirrors: outside sits below
            // the tip (hanging baseline), inside sits above it, back into the bar (default baseline).
            .style('dominant-baseline', (d: any) => {
              if (horizontal) return null;
              return (labelInsideBar ? d.value >= 0 : d.value < 0) ? 'hanging' : null;
            })
            .attr('x', (d: any) => {
              if (!horizontal) return (categoryScale(d.cat) || 0) + (singleSeries ? 0 : seriesScale(String(sIdx))) + (singleSeries ? categoryScale.bandwidth() : seriesScale.bandwidth()) / 2;
              const outsideOffset = d.value < 0 ? -6 : 6;
              const insideOffset = d.value < 0 ? insideOffsetFor(d) : -insideOffsetFor(d);
              return valueScale(d.value) + (labelInsideBar ? insideOffset : outsideOffset);
            })
            .attr('y', (d: any) => {
              if (horizontal) return (categoryScale(d.cat) || 0) + (singleSeries ? 0 : seriesScale(String(sIdx))) + (singleSeries ? categoryScale.bandwidth() : seriesScale.bandwidth()) / 2;
              const outsideOffset = d.value < 0 ? 6 : -6;
              const insideOffset = d.value < 0 ? -insideOffsetFor(d) : insideOffsetFor(d);
              return valueScale(d.value) + (labelInsideBar ? insideOffset : outsideOffset);
            })
            .text((d: any) => horizontal
              ? this.formatLabel(d.value, this.percentOfSeries(series, d.catIdx))
              : this.formatCompactBarLabel(d.value, this.percentOfSeries(series, d.catIdx), barOwnWidth))
            .style('opacity', animateEntrance ? 0 : 1)
          : null;

        // Left-to-right sequence, same as the bars themselves: a label only fades in once its own
        // bar (catDelay(d) above) has finished growing, rather than every label appearing at once
        // the instant draw() runs while the bars are still mid-animation.
        if (animateEntrance && labelSel) {
          const LABEL_FADE_MS = 200;
          labelSel.transition().delay((d: any) => catDelay(d) + perCatDelay).duration(LABEL_FADE_MS).style('opacity', 1);
        }

        bars
          .on('click', (event: any, d: any) => emitClick(d.catIdx, series.label, d.value))
          .on('mouseover', (event: any, d: any) => {
            const target = event.currentTarget;
            const hex = this.barColor(series, d.catIdx);
            // Same reasoning as the doughnut: fill can't be smoothly transitioned straight from
            // a url(#gradient) reference to a flat color (renders blank for the duration), so
            // swap in the flat base color first, instantly, then transition flat -> flat.
            d3.select(target).attr('fill', hex)
              .interrupt('color').transition('color').duration(150)
              .attr('fill', darkenHex(hex, 40));
            d3.select(target).attr('stroke', hex).attr('stroke-width', 1.5);
            d3.select(target).interrupt('widen').transition('widen').duration(150).attr('d', hoverD(d));
            nudgeNeighbors(d.cat, sIdx, hoverExtra, true);
            if (labelSel) {
              labelSel.filter((ld: any) => ld === d)
                .interrupt('labelGrow').transition('labelGrow').duration(150)
                .style('font-size', '14px');
            }

            const percentage = this.percentOfSeries(series, d.catIdx);
            this.tooltipService.show(event, this.tooltipHtml(series.label, d.cat, d.value, percentage, false, hex, visibleSeries.length > 1), 'eda-bar-tooltip', TOOLTIP_OFFSET_X, TOOLTIP_OFFSET_Y, true);
          })
          .on('mousemove', (event: any) => this.tooltipService.move(event, TOOLTIP_OFFSET_X, TOOLTIP_OFFSET_Y, true))
          .on('mouseout', (event: any, d: any) => {
            const target = event.currentTarget;
            const hex = this.barColor(series, d.catIdx);
            d3.select(target)
              .interrupt('color').transition('color').duration(150)
              .attr('fill', hex)
              .on('end', () => {
                d3.select(target).attr('fill', this.barFill(defs, series, d.catIdx, horizontal));
              });
            d3.select(target).interrupt('widen').transition('widen').duration(150).attr('d', finalD(d));
            nudgeNeighbors(d.cat, sIdx, hoverExtra, false);
            d3.select(target).attr('stroke', null).attr('stroke-width', null);
            if (labelSel) {
              labelSel.filter((ld: any) => ld === d)
                .interrupt('labelGrow').transition('labelGrow').duration(150)
                .style('font-size', '11px');
            }
            this.tooltipService.hide();
          });
      });
    }
    }

    this.hasRendered = true;
  }
}
