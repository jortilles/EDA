import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import * as d3 from 'd3';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaBarD3 } from './eda-bar';
import { StyleProviderService, D3TooltipService, lightenHex, darkenHex, sanitizeId, formatAxisValue } from '@eda/services/service.index';
import { EdaChartLegendComponent } from '../eda-chart-legend/eda-chart-legend.component';

interface BarSeries {
  label: string;
  color: string | string[];
  data: number[];
  rawValues?: number[];
}

const GRADIENT_LIGHTEN_AMOUNT = 60;

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
  private hiddenSeriesIndexes: Set<number> = new Set();
  private fontFamily = 'inherit';
  // Only the very first draw() gets the staggered grow-in animation - a resize or a color/hover
  // triggered redraw shouldn't make every bar shrink to zero and regrow.
  private hasRendered = false;

  constructor(private styleProviderService: StyleProviderService, private tooltipService: D3TooltipService) { }

  ngOnInit(): void {
    this.id = `bar_${this.inject.id}`;
    this.chartLegend = this.inject.chartLegend ?? true;
    this.styleProviderService.panelFontFamily.subscribe(v => this.fontFamily = v).unsubscribe();
    this.buildSeries();
  }

  ngOnDestroy(): void {
    this.tooltipService.hide();
    if (this.resizeObserver) this.resizeObserver.disconnect();
  }

  ngAfterViewInit(): void {
    const container = this.svgContainer.nativeElement as HTMLElement;
    if (!this.svg) this.svg = d3.select(container).append('svg');

    // ResizeObserver.observe() always fires its callback once on its own, asynchronously, with
    // the current size - right on top of the manual draw() a few lines below. Without skipping
    // that redundant first callback, it lands a moment later and instantly redraws everything at
    // full size, wiping out the grow-in animation before it's even visible.
    let isFirstResizeCallback = true;
    this.resizeObserver = new ResizeObserver(entries => {
      if (isFirstResizeCallback) {
        isFirstResizeCallback = false;
        return;
      }
      const { width: w, height: h } = entries[0].contentRect;
      if (w > 0 && h > 0) {
        this.svg.attr('width', w).attr('height', h);
        this.draw();
      }
    });
    this.resizeObserver.observe(container);

    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w > 0 && h > 0) {
      this.svg.attr('width', w).attr('height', h);
      this.draw();
    }
  }

  /** Called by the shared chart-dialog.component.ts (unconditionally, no `?.`) on every live color edit. */
  updateChart(): void {
    this.chartLegend = this.inject.chartLegend ?? true;
    this.hiddenSeriesIndexes.clear();
    this.buildSeries();
    this.draw();
  }

  private buildSeries(): void {
    const labels: string[] = this.inject.chartLabels || [];
    this.categories = labels.map(l => String(l));
    const datasets = this.inject.chartDataset || [];
    this.series = datasets.map((ds: any) => ({
      label: ds.label || '',
      color: ds.backgroundColor || '#4472c4',
      data: (ds.data || []).map((v: any) => Number(v) || 0),
      rawValues: ds.value ? ds.value.map((v: any) => Number(v) || 0) : undefined
    }));

    this.legendItems = this.series.map((s, i) => ({
      label: s.label,
      color: Array.isArray(s.color) ? (s.color[0] || '#4472c4') : (s.color || '#4472c4'),
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
    return Array.isArray(series.color) ? (series.color[categoryIdx] || '#4472c4') : (series.color || '#4472c4');
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
    const id = this.gradientId(hex);
    let grad = defs.select(`#${id}`);
    if (grad.empty()) {
      grad = defs.append('linearGradient').attr('id', id);
      grad.append('stop').attr('class', 'grad-start');
      grad.append('stop').attr('class', 'grad-end');
    }
    if (horizontal) {
      grad.attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
    } else {
      grad.attr('x1', '0%').attr('y1', '100%').attr('x2', '0%').attr('y2', '0%');
    }
    grad.select('.grad-start').attr('offset', '0%').attr('stop-color', hex);
    grad.select('.grad-end').attr('offset', '100%').attr('stop-color', lightenHex(hex, GRADIENT_LIGHTEN_AMOUNT));
    return `url(#${id})`;
  }

  /**
   * Path for a rect rounded only on its "tip" end (the end away from the zero baseline) - top for
   * vertical bars, right for horizontal ones - so the base where the bar meets the axis (or, for a
   * stacked bar, the seam with the segment below it) stays flat. A plain <rect rx ry> can't do this,
   * since it rounds all 4 corners uniformly.
   *
   * The base radius is 1/6 of the bar's own cross-dimension (its bandwidth - width for vertical
   * bars, height for horizontal ones): 1/6 for each of the two rounded corners, leaving the middle
   * 4/6 of that edge a straight line. The radius is elliptical, not circular - doubled along the
   * bar's own length axis (ry for vertical, rx for horizontal) for a more pronounced, dome-like cap
   * rather than a small quarter-circle nub.
   *
   * `round=false` forces the radius to 0 - used for stacked segments that aren't their category's
   * own outermost non-zero one (see lastNonZeroSidx in draw()), so they render as plain flat-cornered
   * rects while still being a <path> (needed so every segment can use the same grow-in tween).
   */
  private roundedTipRectPath(x: number, y: number, width: number, height: number, horizontal: boolean, round: boolean = true, flip: boolean = false): string {
    // Global on/off toggle (chart-dialog's "Redondear barras") wins over the per-segment `round`
    // decision (which is about WHICH segment gets the tip treatment, not whether rounding is
    // enabled at all) - false here always forces plain flat-cornered rects.
    const roundedBarsEnabled = this.inject.useRoundedBars ?? true;
    const baseRadius = round && roundedBarsEnabled ? (horizontal ? height : width) / 10 : 0;
    const rx = Math.max(0, Math.min(horizontal ? baseRadius * 2 : baseRadius, width / 2));
    const ry = Math.max(0, Math.min(horizontal ? baseRadius : baseRadius * 2, height / 2));
    if (horizontal) {
      if (!flip) {
        // Positive-direction bar (grows rightward from zero) - round the right end only.
        return `M${x},${y} L${x + width - rx},${y} A${rx},${ry} 0 0,1 ${x + width},${y + ry} ` +
          `L${x + width},${y + height - ry} A${rx},${ry} 0 0,1 ${x + width - rx},${y + height} L${x},${y + height} Z`;
      }
      // Negative-direction bar (grows leftward from zero, e.g. a pyramid's negated side) - its
      // outer tip is on the LEFT, so round the left end only instead. Kept in the SAME clockwise
      // traversal (top edge L->R, right edge, bottom edge R->L, left edge) as the unflipped case
      // above, with sweep=1 only on the two arcs actually drawn - reversing the traversal instead
      // (starting top-right and walking left) would need sweep=0, and using sweep=1 there makes
      // the arc bulge inward (a concave notch) instead of outward.
      return `M${x + rx},${y} L${x + width},${y} L${x + width},${y + height} L${x + rx},${y + height} ` +
        `A${rx},${ry} 0 0,1 ${x},${y + height - ry} L${x},${y + ry} A${rx},${ry} 0 0,1 ${x + rx},${y} Z`;
    }
    if (!flip) {
      // Positive-direction bar (grows upward from zero) - round the top end only.
      return `M${x},${y + height} L${x},${y + ry} A${rx},${ry} 0 0,1 ${x + rx},${y} ` +
        `L${x + width - rx},${y} A${rx},${ry} 0 0,1 ${x + width},${y + ry} L${x + width},${y + height} Z`;
    }
    // Negative-direction bar (grows downward from zero) - its outer tip is on the BOTTOM, so
    // round the bottom end only instead (same clockwise-traversal reasoning as the horizontal case above).
    return `M${x},${y} L${x + width},${y} L${x + width},${y + height - ry} A${rx},${ry} 0 0,1 ${x + width - rx},${y + height} ` +
      `L${x + rx},${y + height} A${rx},${ry} 0 0,1 ${x},${y + height - ry} L${x},${y} Z`;
  }

  private formatValue(value: number): string {
    return value.toLocaleString('de-DE', { maximumFractionDigits: 6 });
  }

  private formatPercent(pct: number): string {
    return `${pct.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
  }

  private formatLabel(value: number, percentage: number): string {
    const showLabels = this.inject.showLabels;
    const showLabelsPercent = this.inject.showLabelsPercent;
    if (showLabels && showLabelsPercent) return `${this.formatValue(value)} - ${this.formatPercent(percentage)}`;
    if (showLabels) return this.formatValue(value);
    if (showLabelsPercent) return this.formatPercent(percentage);
    return '';
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
    const title = `<div class="eda-bar-tooltip-title">${categoryFieldName ? categoryFieldName + ' : ' : ''}${category}</div>`;
    // The series name only earns its own place in the row when there's more than one series to
    // tell apart - with a single series it's frequently the same value as categoryFieldName
    // itself (see chart-utils.service.ts's transformDataQuery), making it a redundant repeat of
    // what the title already said.
    const seriesPrefix = multiSeries ? `<strong>${seriesLabel}</strong> : ` : '';
    if (isPyramid) {
      return title + `<div class="eda-bar-tooltip-row">${swatch}${seriesPrefix}${this.formatValue(Math.abs(value))}</div>${linkedRow}`;
    }
    return title +
      `<div class="eda-bar-tooltip-row">${swatch}${seriesPrefix}${this.formatValue(value)} (${percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })}%)</div>${linkedRow}`;
  }

  private measureCanvas: HTMLCanvasElement;

  private measureTextWidth(label: string, fontSizePx: number): number {
    if (!this.measureCanvas) this.measureCanvas = document.createElement('canvas');
    const ctx = this.measureCanvas.getContext('2d');
    ctx.font = `${fontSizePx}px ${this.fontFamily === 'inherit' ? 'sans-serif' : this.fontFamily}`;
    return ctx.measureText(label).width;
  }

  private measureMaxLabelWidth(labels: string[], fontSizePx: number): number {
    return labels.reduce((max, label) => Math.max(max, this.measureTextWidth(label, fontSizePx)), 0);
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

    const visibleIdx = this.series.map((_, i) => i).filter(i => !this.hiddenSeriesIndexes.has(i));
    const visibleSeries = visibleIdx.map(i => this.series[i]);
    // A category whose only non-zero value belonged to a now-hidden series (toggled off from the
    // legend) has nothing left to show - drop it entirely (row, axis label and all) rather than
    // leaving an empty gap where it used to be.
    const visibleCategories = this.categories.filter((cat, catIdx) => visibleSeries.some(s => (s.data[catIdx] || 0) !== 0));
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
    const margin = { top: 16, right: 20, bottom: horizontal ? 30 : 50, left: leftMargin };
    const innerWidth = Math.max(width - margin.left - margin.right, 10);
    const innerHeight = Math.max(height - margin.top - margin.bottom, 10);

    const defs = this.svg.append('defs');
    const g = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const categoryScale: any = d3.scaleBand().domain(axisCategories).range(horizontal ? [0, innerHeight] : [0, innerWidth]).padding(0.25);
    const valueScale: any = d3.scaleLinear().domain([valueMin, valueMax]).nice().range(horizontal ? [0, innerWidth] : [innerHeight, 0]);
    const zeroPos = valueScale(0);

    const seriesScale: any = d3.scaleBand().domain(visibleSeries.map((_, i) => String(i))).range([0, categoryScale.bandwidth()]).padding(0.05);

    // Grid lines (value axis)
    if (this.inject.showGridLines ?? true) {
      const gridAxis: any = horizontal
        ? d3.axisBottom(valueScale).ticks(horizontalTickCount).tickSize(-innerHeight).tickFormat(() => '')
        : d3.axisLeft(valueScale).ticks(verticalTickCount).tickSize(-innerWidth).tickFormat(() => '');
      g.append('g')
        .attr('class', 'eda-bar-grid')
        .attr('transform', horizontal ? `translate(0,${innerHeight})` : 'translate(0,0)')
        .call(gridAxis);
    }

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
    const ENTRANCE_TOTAL_MS = 2000;
    const animateEntrance = !this.hasRendered;
    const perCatDelay = ENTRANCE_TOTAL_MS / Math.max(visibleCategories.length, 1);

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

        if (horizontal) {
          const finalD = (d: any) => this.roundedTipRectPath(
            valueScale(Math.min(d[0], d[1])), categoryScale(d.data.cat),
            Math.abs(valueScale(d[1]) - valueScale(d[0])), categoryScale.bandwidth(), true, isOuter(d), isNegative(d));
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
          const finalD = (d: any) => this.roundedTipRectPath(
            categoryScale(d.data.cat), valueScale(Math.max(d[0], d[1])),
            categoryScale.bandwidth(), Math.abs(valueScale(d[1]) - valueScale(d[0])), false, isOuter(d), isNegative(d));
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
            .style('fill', 'white')
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
          : null;

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
            if (labelSel) {
              labelSel.filter((ld: any) => ld === d)
                .interrupt('labelGrow').transition('labelGrow').duration(150)
                .style('font-size', '14px');
            }

            const catIdx = this.categories.indexOf(d.data.cat);
            const value = stacked100 ? (series.rawValues?.[catIdx] ?? 0) : series.data[catIdx];
            const percentage = stacked100 ? (series.data[catIdx] || 0) : this.percentOfSeries(series, catIdx);
            this.tooltipService.show(event, this.tooltipHtml(series.label, d.data.cat, value, percentage, isPyramid, hex, visibleSeries.length > 1), 'eda-bar-tooltip');
          })
          .on('mousemove', (event: any) => this.tooltipService.move(event))
          .on('mouseout', (event: any, d: any) => {
            const target = event.currentTarget;
            const hex = this.barColor(series, this.categories.indexOf(d.data.cat));
            d3.select(target)
              .interrupt('color').transition('color').duration(150)
              .attr('fill', hex)
              .on('end', () => {
                d3.select(target).attr('fill', this.barFill(defs, series, this.categories.indexOf(d.data.cat), horizontal));
              });
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
      const singleSeries = visibleSeries.length === 1;
      visibleSeries.forEach((series, sIdx) => {
        const rows = visibleCategories.map((cat) => ({ cat, value: series.data[this.categories.indexOf(cat)], catIdx: this.categories.indexOf(cat) }));

        const bars = barsGroup.selectAll(`.eda-bar-series-${sIdx}`)
          .data(rows)
          .join('path')
          .attr('class', `eda-bar-series-${sIdx}`)
          .attr('fill', (d: any) => this.barFill(defs, series, d.catIdx, horizontal))
          .style('cursor', 'pointer');

        const catDelay = (d: any) => visibleCategories.indexOf(d.cat) * perCatDelay;

        if (horizontal) {
          const finalD = (d: any) => this.roundedTipRectPath(
            valueScale(Math.min(0, d.value)),
            (categoryScale(d.cat) || 0) + (singleSeries ? 0 : seriesScale(String(sIdx))),
            Math.abs(valueScale(d.value) - zeroPos),
            singleSeries ? categoryScale.bandwidth() : seriesScale.bandwidth(),
            true, true, d.value < 0);
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
          const finalD = (d: any) => this.roundedTipRectPath(
            (categoryScale(d.cat) || 0) + (singleSeries ? 0 : seriesScale(String(sIdx))),
            valueScale(Math.max(0, d.value)),
            singleSeries ? categoryScale.bandwidth() : seriesScale.bandwidth(),
            Math.abs(zeroPos - valueScale(d.value)),
            false, true, d.value < 0);
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

        const labelSel = showLabelsOn
          ? labelsGroup.selectAll(`.eda-bar-label-${sIdx}`)
            .data(rows)
            .join('text')
            .style('font-size', '11px')
            .style('font-weight', 'bold')
            .style('font-family', this.fontFamily)
            .style('fill', (d: any) => (horizontal ? innerWidth : innerHeight) > 150 ? this.barColor(series, d.catIdx) : 'white')
            .style('pointer-events', 'none')
            .attr('class', `eda-bar-label-${sIdx}`)
            .attr('text-anchor', (d: any) => horizontal ? (d.value < 0 ? 'end' : 'start') : 'middle')
            .attr('x', (d: any) => horizontal
              ? valueScale(d.value) + (d.value < 0 ? -6 : 6)
              : (categoryScale(d.cat) || 0) + (singleSeries ? 0 : seriesScale(String(sIdx))) + (singleSeries ? categoryScale.bandwidth() : seriesScale.bandwidth()) / 2)
            .attr('y', (d: any) => horizontal
              ? (categoryScale(d.cat) || 0) + (singleSeries ? 0 : seriesScale(String(sIdx))) + (singleSeries ? categoryScale.bandwidth() : seriesScale.bandwidth()) / 2
              : valueScale(d.value) - 6)
            .text((d: any) => this.formatLabel(d.value, this.percentOfSeries(series, d.catIdx)))
          : null;

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
            if (labelSel) {
              labelSel.filter((ld: any) => ld === d)
                .interrupt('labelGrow').transition('labelGrow').duration(150)
                .style('font-size', '14px');
            }

            const percentage = this.percentOfSeries(series, d.catIdx);
            this.tooltipService.show(event, this.tooltipHtml(series.label, d.cat, d.value, percentage, false, hex, visibleSeries.length > 1), 'eda-bar-tooltip');
          })
          .on('mousemove', (event: any) => this.tooltipService.move(event))
          .on('mouseout', (event: any, d: any) => {
            const target = event.currentTarget;
            const hex = this.barColor(series, d.catIdx);
            d3.select(target)
              .interrupt('color').transition('color').duration(150)
              .attr('fill', hex)
              .on('end', () => {
                d3.select(target).attr('fill', this.barFill(defs, series, d.catIdx, horizontal));
              });
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
