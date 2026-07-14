import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import * as d3 from 'd3';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaBarlineD3 } from './eda-barline';
import { StyleProviderService, D3TooltipService, lightenHex, darkenHex, sanitizeId, formatAxisValue, formatDeNumber, formatValueLabel, ensureLinearGradient, initD3ResizeObserver, teardownD3Chart, computeYTickCount, measureTextWidth, measureMaxLabelWidth, truncateLabel, roundedTipRectPath } from '@eda/services/service.index';
import { EdaChartLegendComponent } from '../eda-chart-legend/eda-chart-legend.component';

interface BarlineSeriesBase {
  label: string;
  color: string;
  originalIndex: number;
  data: number[];
}

interface LinePoint {
  catIndex: number;
  value: number | null;
}

const MAX_CATEGORY_CHARS = 8;
const GRADIENT_LIGHTEN_AMOUNT = 60;
const TOOLTIP_OFFSET_X = 20;
const TOOLTIP_OFFSET_Y = -20;
// Same hover "pop" convention as eda-bar-d3: narrow bars grow more (relatively) than wide ones so
// the jump reads similarly in absolute pixels either way, PLUS the bar's own neighbor gap (capped)
// added on top - on eda-bar-d3 that gap term is often the bigger contributor to how "poppy" the
// hover reads, so leaving it out (as an earlier version of this file did) made barline's hover-grow
// feel much weaker than plain bar's despite using the same width-scale formula. See
// eda-bar-d3.component.ts for the full reasoning. No cross-category neighbor-nudge here (barline is
// normally a single bar series, so there's no neighbor slot to push out of the way).
const HOVER_WIDTH_WIDE_THRESHOLD_PX = 30;
const HOVER_WIDTH_SCALE_NARROW = 1.2;
const HOVER_WIDTH_SCALE_WIDE = 1.05;
const HOVER_GAP_CONTRIBUTION_CAP_PX = 12;

@Component({
  standalone: true,
  selector: 'eda-barline-d3',
  templateUrl: './eda-barline.component.html',
  styleUrls: ['./eda-barline.component.css'],
  encapsulation: ViewEncapsulation.Emulated,
  imports: [FormsModule, CommonModule, EdaChartLegendComponent]
})
export class EdaBarlineComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() inject: EdaBarlineD3;
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef;

  id: string;
  svg: any;
  resizeObserver!: ResizeObserver;

  chartLegend: boolean;
  legendItems: { label: string; color: string; hidden: boolean }[] = [];

  private categories: string[] = [];
  private barSeries: BarlineSeriesBase[] = [];
  private lineSeries: (BarlineSeriesBase & { dash?: string })[] = [];
  private hiddenSeriesIndexes: Set<number> = new Set();
  private fontFamily = 'inherit';
  private hasRendered = false;

  constructor(private styleProviderService: StyleProviderService, private tooltipService: D3TooltipService) { }

  ngOnInit(): void {
    this.id = `barline_${this.inject.id}`;
    this.chartLegend = (this.inject.compact ? false : this.inject.chartLegend) ?? true;
    this.styleProviderService.panelFontFamily.subscribe(v => this.fontFamily = v).unsubscribe();
    this.buildSeries();
  }

  ngOnDestroy(): void {
    teardownD3Chart(this.tooltipService, this.resizeObserver);
  }

  ngAfterViewInit(): void {
    const container = this.svgContainer.nativeElement as HTMLElement;
    if (!this.svg) this.svg = d3.select(container).append('svg');
    this.resizeObserver = initD3ResizeObserver(container, this.svg, () => this.draw(), { skipFirstCallback: true });
  }

  /** Called by the shared chart-dialog.component.ts (unconditionally, no `?.`) on every live color edit. */
  updateChart(): void {
    this.chartLegend = (this.inject.compact ? false : this.inject.chartLegend) ?? true;
    this.hiddenSeriesIndexes.clear();
    this.buildSeries();
    this.draw();
  }

  private buildSeries(): void {
    const labels: string[] = this.inject.chartLabels || [];
    this.categories = labels.map(l => String(l));
    const datasets = this.inject.chartDataset || [];
    this.barSeries = [];
    this.lineSeries = [];
    datasets.forEach((ds: any, i: number) => {
      const color = ds.borderColor || '#4472c4';
      const entry: BarlineSeriesBase = {
        label: ds.label || '',
        color,
        originalIndex: i,
        data: (ds.data || []).map((v: any) => v === null || v === undefined ? null : Number(v))
      };
      if (ds.type === 'line') {
        const dash = Array.isArray(ds.borderDash) ? ds.borderDash.join(',') : undefined;
        this.lineSeries.push({ ...entry, dash });
      } else {
        this.barSeries.push(entry);
      }
    });

    const allSeries = [...this.barSeries, ...this.lineSeries].sort((a, b) => a.originalIndex - b.originalIndex);
    this.legendItems = allSeries.map(s => ({ label: s.label, color: s.color, hidden: this.hiddenSeriesIndexes.has(s.originalIndex) }));
  }

  toggleLegend(legendIdx: number): void {
    const allSeries = [...this.barSeries, ...this.lineSeries].sort((a, b) => a.originalIndex - b.originalIndex);
    const s = allSeries[legendIdx];
    if (!s) return;
    if (this.hiddenSeriesIndexes.has(s.originalIndex)) this.hiddenSeriesIndexes.delete(s.originalIndex);
    else this.hiddenSeriesIndexes.add(s.originalIndex);
    this.legendItems[legendIdx].hidden = this.hiddenSeriesIndexes.has(s.originalIndex);
    // Replay the entrance animation (bar grow-in, line sweep-in, point pop-in) on every legend
    // toggle, not just the very first draw.
    this.hasRendered = false;

    // Exit animation: draw() only ever grows things IN - without this, the outgoing state would
    // just vanish instantly the moment draw() clears the SVG, instead of visibly leaving first.
    const EXIT_DURATION_MS = 200;
    const currentShapes = this.svg.selectAll(
      '.eda-barline-bars path, .eda-barline-labels text, .eda-barline-lines path, .eda-barline-point-dot, .eda-barline-point-hit'
    );
    if (!currentShapes.empty()) {
      currentShapes.transition().duration(EXIT_DURATION_MS).style('opacity', 0);
      setTimeout(() => this.draw(), EXIT_DURATION_MS);
    } else {
      this.draw();
    }
  }

  private truncate(label: string): string {
    return truncateLabel(label, MAX_CATEGORY_CHARS);
  }

  private gradientId(colorHex: string): string {
    return `barline-grad-${this.id}-${sanitizeId(colorHex)}`;
  }

  private barFill(defs: any, hex: string): string {
    if (!(this.inject.useGradient ?? true)) return hex;
    return ensureLinearGradient(defs, this.gradientId(hex), [
      { offset: '0%', color: hex },
      { offset: '100%', color: lightenHex(hex, GRADIENT_LIGHTEN_AMOUNT) }
    ], { x1: '0%', y1: '100%', x2: '0%', y2: '0%' });
  }

  private hoverExtraWidth(width: number, gap: number): number {
    const scale = width > HOVER_WIDTH_WIDE_THRESHOLD_PX ? HOVER_WIDTH_SCALE_WIDE : HOVER_WIDTH_SCALE_NARROW;
    return width * (scale - 1) + Math.min(gap, HOVER_GAP_CONTRIBUTION_CAP_PX) * 2;
  }

  private formatLabel(value: number, percentage: number): string {
    return formatValueLabel(value, percentage, this.inject.showLabels, this.inject.showLabelsPercent);
  }

  private percentOfSeries(series: BarlineSeriesBase, catIdx: number): number {
    const total = series.data.reduce((a, b) => (a || 0) + (b || 0), 0);
    const value = series.data[catIdx] || 0;
    return total !== 0 ? (value / total) * 100 : 0;
  }

  /**
   * Delay (ms) at which the entrance line-sweep's (right-to-left) stroke-dashoffset transition
   * visually reaches a given x position - the mirror of eda-line-d3's lineReachDelay. Same first
   * step (binary search via getPointAtLength to find how far along the path's own length that x
   * sits, since arc length isn't proportional to x on a curveMonotoneX curve), but the second
   * step inverts the OTHER way: this sweep reveals length from the path's END backward (see the
   * -totalLength starting dashoffset where this is used), so a point near the end becomes visible
   * early and one near the start becomes visible late.
   */
  private lineReachDelayFromEnd(pathNode: SVGPathElement, totalLength: number, targetX: number, durationMs: number): number {
    if (totalLength <= 0) return 0;
    let lo = 0, hi = totalLength;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (pathNode.getPointAtLength(mid).x < targetX) lo = mid; else hi = mid;
    }
    const lengthFraction = (lo + hi) / 2 / totalLength;
    const timeFraction = 1 - Math.cbrt(lengthFraction);
    return durationMs * timeFraction;
  }

  private tooltipHtml(seriesLabel: string, category: string, value: number, hex: string): string {
    const linkedDashboard = this.inject.linkedDashboard;
    const linkedRow = linkedDashboard ? `<h6>${$localize`:@@linkedTo:Vinculado con`} ${linkedDashboard.dashboardName}</h6>` : '';
    const categoryFieldName = this.inject.categoryFieldName;
    const title = `<div class="eda-barline-tooltip-title">${categoryFieldName ? categoryFieldName + ' : ' : ''}${category}</div>`;
    const swatch = `<span class="eda-barline-tooltip-swatch" style="background-color:${hex};"></span>`;
    return title + `<div class="eda-barline-tooltip-row">${swatch}<strong>${seriesLabel}</strong> : ${formatDeNumber(value)}</div>${linkedRow}`;
  }

  private emitClick(catIdx: number, seriesLabel: string, value: number): void {
    const category = this.categories[catIdx];
    const linkedDashboard = this.inject.linkedDashboard;
    if (linkedDashboard) {
      const url = window.location.href.slice(0, window.location.href.indexOf('/dashboard')) +
        `/dashboard/${linkedDashboard.dashboardID}?${linkedDashboard.table}.${linkedDashboard.col}=${seriesLabel}`;
      window.open(url, '_blank');
    } else {
      this.onClick.emit({ inx: catIdx, label: category, value, filterBy: seriesLabel });
    }
  }

  draw(): void {
    const container = this.svgContainer.nativeElement as HTMLElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;

    this.svg.selectAll('*').remove();
    const compact = this.inject.compact ?? false;

    const visibleBarSeries = this.barSeries.filter(s => !this.hiddenSeriesIndexes.has(s.originalIndex));
    const visibleLineSeries = this.lineSeries.filter(s => !this.hiddenSeriesIndexes.has(s.originalIndex));
    const hasVisibleData = (visibleBarSeries.length > 0 || visibleLineSeries.length > 0) && this.categories.length > 0;
    const axisCategories = this.categories;
    // With a second axis, the lines get their own independent scale (and a right-side axis) so a
    // measure on a very different magnitude from the bars (e.g. a percentage line over a revenue
    // count) reads at its own natural scale instead of being flattened onto the bars' range.
    // Without it, bars and lines keep sharing one combined domain/axis - existing behavior.
    const secondAxis = this.inject.secondAxis ?? false;

    const barSource = hasVisibleData ? visibleBarSeries : this.barSeries;
    const lineSource = hasVisibleData ? visibleLineSeries : this.lineSeries;
    let barMin = 0, barMax = 0, lineMin = 0, lineMax = 0;
    barSource.forEach(s => s.data.forEach(v => { if (v === null) return; barMin = Math.min(barMin, v); barMax = Math.max(barMax, v); }));
    lineSource.forEach(s => s.data.forEach(v => { if (v === null) return; lineMin = Math.min(lineMin, v); lineMax = Math.max(lineMax, v); }));

    let valueMin = secondAxis ? barMin : Math.min(barMin, lineMin);
    let valueMax = secondAxis ? barMax : Math.max(barMax, lineMax);
    if (valueMax === valueMin) valueMax = valueMin + 1;

    let lineValueMin = secondAxis ? lineMin : valueMin;
    let lineValueMax = secondAxis ? lineMax : valueMax;
    if (lineValueMax === lineValueMin) lineValueMax = lineValueMin + 1;

    const tickCount = computeYTickCount(height);

    let leftMargin = 8;
    let rightMargin = 20;
    if (!compact) {
      const probeScale = d3.scaleLinear().domain([valueMin, valueMax]).nice();
      const tickLabels = probeScale.ticks(tickCount).map(v => formatAxisValue(v));
      leftMargin = Math.min(Math.max(measureMaxLabelWidth(tickLabels, 11, this.fontFamily) + 16, 40), width * 0.3);

      if (secondAxis) {
        const lineProbeScale = d3.scaleLinear().domain([lineValueMin, lineValueMax]).nice();
        const lineTickLabels = lineProbeScale.ticks(tickCount).map(v => formatAxisValue(v));
        rightMargin = Math.min(Math.max(measureMaxLabelWidth(lineTickLabels, 11, this.fontFamily) + 16, 40), width * 0.3);
      }
    }
    const margin = compact
      ? { top: 4, right: 4, bottom: 4, left: 4 }
      : { top: 16, right: rightMargin, bottom: 50, left: leftMargin };
    const innerWidth = Math.max(width - margin.left - margin.right, 10);
    const innerHeight = Math.max(height - margin.top - margin.bottom, 10);

    const defs = this.svg.append('defs');
    const g = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const categoryScale = d3.scaleBand<string>().domain(axisCategories).range([0, innerWidth]).padding(0.25);
    const valueScale = d3.scaleLinear().domain([valueMin, valueMax]).nice().range([innerHeight, 0]);
    const zeroY = valueScale(0);
    // Lines read off their own scale only when secondAxis is on - otherwise they share the bars'
    // valueScale, same as before.
    const lineValueScale = secondAxis
      ? d3.scaleLinear().domain([lineValueMin, lineValueMax]).nice().range([innerHeight, 0])
      : valueScale;
    const seriesScale = d3.scaleBand<string>().domain(visibleBarSeries.map((_, i) => String(i))).range([0, categoryScale.bandwidth()]).padding(0.1);
    const xForCategoryCenter = (catIdx: number) => (categoryScale(axisCategories[catIdx]) ?? 0) + categoryScale.bandwidth() / 2;
    // Per-side lateral gap a bar normally has towards the next category - same role as eda-bar-d3's
    // vBarGap, feeding the hover-grow's gap contribution (see hoverExtraWidth).
    const vBarGap = (categoryScale.step() - categoryScale.bandwidth()) / 2;

    if (!compact) {
      if (this.inject.showGridLines ?? true) {
        // Grid always follows the bars' (left) axis - two overlapping grids from two different
        // scales would just clash visually, and the bars are the chart's primary reference.
        g.append('g')
          .attr('class', 'eda-barline-grid')
          .call(d3.axisLeft(valueScale).ticks(tickCount).tickSize(-innerWidth).tickFormat(() => '' as any));
      }

      const categoryAxis = d3.axisBottom(categoryScale).tickFormat((d: string) => this.truncate(d));
      const valueAxis = d3.axisLeft(valueScale).ticks(tickCount).tickFormat((v: any) => formatAxisValue(v));

      const catAxisG = g.append('g').attr('class', 'eda-barline-axis')
        .attr('transform', `translate(0,${innerHeight})`).call(categoryAxis as any);
      catAxisG.selectAll('text').style('text-anchor', 'end').attr('dx', '-0.5em').attr('dy', '0.4em').attr('transform', 'rotate(-30)');

      const angle = Math.PI / 6;
      const footprints = axisCategories.map(c => measureTextWidth(this.truncate(c), 11, this.fontFamily) * Math.cos(angle) + 11 * Math.sin(angle));
      const step = categoryScale.step();
      let lastShown = -Infinity;
      catAxisG.selectAll('.tick').style('display', (_: any, i: number) => {
        if (lastShown === -Infinity || (i - lastShown) * step >= (footprints[lastShown] + footprints[i]) / 2 + 4) {
          lastShown = i;
          return null;
        }
        return 'none';
      });

      g.append('g').attr('class', 'eda-barline-axis').call(valueAxis as any);

      if (secondAxis) {
        const lineValueAxis = d3.axisRight(lineValueScale).ticks(tickCount).tickFormat((v: any) => formatAxisValue(v));
        g.append('g').attr('class', 'eda-barline-axis eda-barline-axis-right')
          .attr('transform', `translate(${innerWidth},0)`)
          .call(lineValueAxis as any);
      }

      g.selectAll('.eda-barline-axis text').style('font-family', this.fontFamily).style('font-size', '11px').style('font-weight', 500).style('fill', '#000000');
    }

    const barsGroup = g.append('g').attr('class', 'eda-barline-bars');
    const labelsGroup = g.append('g').attr('class', 'eda-barline-labels');
    const lineGroup = g.append('g').attr('class', 'eda-barline-lines');

    const ENTRANCE_MS = compact ? 600 : 1500;
    const animateEntrance = !this.hasRendered;
    const singleBarSeries = visibleBarSeries.length === 1;
    const showLabelsOn = (this.inject.showLabels || this.inject.showLabelsPercent) && !compact;
    // Bars grow left to right, one category at a time (bar i's own growth finishes exactly when
    // bar i+1 starts) - same staggered-handoff convention as eda-bar-d3, so the whole sequence
    // always finishes in ENTRANCE_MS regardless of category count.
    const perCatDelay = ENTRANCE_MS / Math.max(axisCategories.length, 1);
    const catDelay = (catIdx: number) => catIdx * perCatDelay;

    // --- Bars (grouped, never stacked - a combo's bar half always groups side by side) ---
    if (hasVisibleData) {
      visibleBarSeries.forEach((series, sIdx) => {
        const rows = axisCategories.map((cat, catIdx) => ({ cat, catIdx, value: series.data[catIdx] }))
          .filter(r => r.value !== null);

        const barWidth = singleBarSeries ? categoryScale.bandwidth() : seriesScale.bandwidth();
        const barX = (d: any) => (categoryScale(d.cat) || 0) + (singleBarSeries ? 0 : (seriesScale(String(sIdx)) || 0));
        const finalD = (d: any) => roundedTipRectPath(
          barX(d), valueScale(Math.max(0, d.value)), barWidth, Math.abs(zeroY - valueScale(d.value)),
          false, this.inject.useRoundedBars ?? true, true, d.value < 0);
        const zeroD = (d: any) => roundedTipRectPath(barX(d), zeroY, barWidth, 0, false, this.inject.useRoundedBars ?? true, true, d.value < 0);
        const hoverExtra = this.hoverExtraWidth(barWidth, vBarGap);
        const hoverD = (d: any) => roundedTipRectPath(
          barX(d) - hoverExtra / 2, valueScale(Math.max(0, d.value)), barWidth + hoverExtra, Math.abs(zeroY - valueScale(d.value)),
          false, this.inject.useRoundedBars ?? true, true, d.value < 0);

        const bars = barsGroup.selectAll(`.eda-barline-bar-series-${sIdx}`)
          .data(rows)
          .join('path')
          .attr('class', `eda-barline-bar-series-${sIdx}`)
          .attr('fill', this.barFill(defs, series.color))
          .style('cursor', 'pointer');

        if (animateEntrance) {
          bars.attr('d', zeroD)
            .transition().delay((d: any) => catDelay(d.catIdx)).duration(perCatDelay).ease(d3.easeCubicOut)
            .attr('d', finalD);
        } else {
          bars.attr('d', finalD);
        }

        if (showLabelsOn) {
          const labelSel = labelsGroup.selectAll(`.eda-barline-label-${sIdx}`)
            .data(rows)
            .join('text')
            .attr('class', `eda-barline-label-${sIdx}`)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('font-weight', 'bold')
            .style('font-family', this.fontFamily)
            .style('fill', series.color)
            .style('pointer-events', 'none')
            .attr('x', (d: any) => barX(d) + barWidth / 2)
            .attr('y', (d: any) => valueScale(d.value) + (d.value < 0 ? 14 : -6))
            .text((d: any) => this.formatLabel(d.value, this.percentOfSeries(series, d.catIdx)))
            .style('opacity', animateEntrance ? 0 : 1);

          // Left-to-right sequence, same as the bars: a label only fades in once its own bar has
          // finished growing.
          if (animateEntrance) {
            const LABEL_FADE_MS = 200;
            labelSel.transition().delay((d: any) => catDelay(d.catIdx) + perCatDelay).duration(LABEL_FADE_MS).style('opacity', 1);
          }
        }

        bars
          .on('mouseover', (event: any, d: any) => {
            const target = event.currentTarget;
            d3.select(target).attr('fill', series.color)
              .interrupt('color').transition('color').duration(150)
              .attr('fill', darkenHex(series.color, 40));
            d3.select(target).interrupt('widen').transition('widen').duration(150).attr('d', hoverD(d));
            this.tooltipService.show(event, this.tooltipHtml(series.label, d.cat, d.value, series.color), 'eda-barline-tooltip', TOOLTIP_OFFSET_X, TOOLTIP_OFFSET_Y, true);
          })
          .on('mousemove', (event: any) => this.tooltipService.move(event, TOOLTIP_OFFSET_X, TOOLTIP_OFFSET_Y, true))
          .on('mouseout', (event: any, d: any) => {
            const target = event.currentTarget;
            d3.select(target).interrupt('color').transition('color').duration(150)
              .attr('fill', series.color)
              .on('end', () => d3.select(target).attr('fill', this.barFill(defs, series.color)));
            d3.select(target).interrupt('widen').transition('widen').duration(150).attr('d', finalD(d));
            this.tooltipService.hide();
          })
          .on('click', (event: any, d: any) => this.emitClick(d.catIdx, series.label, d.value));
      });
    }

    // --- Lines (drawn after bars, so they sit visually on top - DOM insertion order, not z-index) ---
    const lineGen: any = d3.line<LinePoint>()
      .defined(d => d.value !== null)
      .x(d => xForCategoryCenter(d.catIndex))
      .y(d => lineValueScale(d.value as number))
      .curve(d3.curveMonotoneX);

    const showDots = this.inject.showPointLines ?? false;

    visibleLineSeries.forEach(series => {
      const points: LinePoint[] = series.data.map((v, catIndex) => ({ catIndex, value: v }));

      const strokePath = lineGroup.append('path')
        .datum(points)
        .attr('class', 'eda-barline-line-stroke')
        .attr('fill', 'none')
        .attr('stroke', series.color)
        .attr('stroke-width', 2)
        .style('pointer-events', 'none')
        .attr('d', lineGen(points));

      // Computed unconditionally (cheap) rather than only inside the animateEntrance branch below,
      // since the dots' own pop-in timing further down also needs this path's geometry.
      const pathNode = strokePath.node() as SVGPathElement;
      const pathLength = pathNode.getTotalLength();

      if (animateEntrance) {
        // Right-to-left sweep - the mirror image of eda-line-d3's left-to-right one: same
        // dasharray-as-total-length trick, but starting dashoffset at -length instead of
        // +length. Both starting offsets hide the stroke completely (dasharray's [dash,gap]
        // period is 2*length, and -length ≡ +length mod 2*length), but they reveal from
        // opposite ends as the offset animates toward 0 - +length reveals from the path's own
        // start (left) outward, -length reveals from its end (right) backward. See
        // lineReachDelayFromEnd below for the matching per-point timing.
        strokePath.attr('stroke-dasharray', `${pathLength} ${pathLength}`).attr('stroke-dashoffset', -pathLength)
          .transition().duration(ENTRANCE_MS).ease(d3.easeCubicOut)
          .attr('stroke-dashoffset', 0)
          .on('end', function () {
            d3.select(this).attr('stroke-dasharray', series.dash || null);
          });
      } else if (series.dash) {
        strokePath.attr('stroke-dasharray', series.dash);
      }

      const vertexData = points.filter(p => p.value !== null);
      const dotSel = lineGroup.selectAll(null)
        .data(vertexData)
        .enter()
        .append('g')
        .attr('class', 'eda-barline-point-group');

      dotSel.append('circle')
        .attr('class', 'eda-barline-point-hit')
        .attr('cx', (d: LinePoint) => xForCategoryCenter(d.catIndex))
        .attr('cy', (d: LinePoint) => lineValueScale(d.value as number))
        .attr('r', 8)
        .style('fill', 'transparent')
        .style('cursor', 'pointer');

      const baseRadius = showDots ? 3.5 : 0;
      const dots = dotSel.append('circle')
        .attr('class', 'eda-barline-point-dot')
        .attr('cx', (d: LinePoint) => xForCategoryCenter(d.catIndex))
        .attr('cy', (d: LinePoint) => lineValueScale(d.value as number))
        .attr('r', animateEntrance && showDots ? 0 : baseRadius)
        .style('fill', series.color)
        .style('pointer-events', 'none');

      // Pop each dot in right as the (right-to-left) sweep reaches its x position, same sequence
      // as the line itself, then briefly overshoot before settling - same convention as
      // eda-line-d3's point pop-in, mirrored for the reversed direction.
      if (animateEntrance && showDots) {
        const POP_MS = 100;
        dots.each((d: any, i: number, nodes: ArrayLike<SVGCircleElement>) => {
          const delay = this.lineReachDelayFromEnd(pathNode, pathLength, xForCategoryCenter(d.catIndex), ENTRANCE_MS);
          d3.select(nodes[i])
            .transition().delay(delay).duration(0).attr('r', baseRadius)
            .transition().duration(POP_MS).ease(d3.easeCubicOut).attr('r', baseRadius * 1.5)
            .transition().duration(POP_MS).ease(d3.easeCubicIn).attr('r', baseRadius);
        });
      }

      dotSel
        .on('mouseover', (event: any, d: LinePoint) => {
          d3.select(event.currentTarget).select('.eda-barline-point-dot')
            .interrupt('grow').transition('grow').duration(150)
            .attr('r', 6)
            .style('fill', darkenHex(series.color, 40));
          this.tooltipService.show(event, this.tooltipHtml(series.label, this.categories[d.catIndex], d.value as number, series.color), 'eda-barline-tooltip', TOOLTIP_OFFSET_X, TOOLTIP_OFFSET_Y, true);
        })
        .on('mousemove', (event: any) => this.tooltipService.move(event, TOOLTIP_OFFSET_X, TOOLTIP_OFFSET_Y, true))
        .on('mouseout', (event: any) => {
          d3.select(event.currentTarget).select('.eda-barline-point-dot')
            .interrupt('grow').transition('grow').duration(150)
            .attr('r', showDots ? 3.5 : 0)
            .style('fill', series.color);
          this.tooltipService.hide();
        })
        .on('click', (event: any, d: LinePoint) => this.emitClick(d.catIndex, series.label, d.value as number));
    });

    this.hasRendered = true;
  }
}
