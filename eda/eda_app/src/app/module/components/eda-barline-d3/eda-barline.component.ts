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
    const assignedByLabel = new Map((this.inject.assignedColors || []).map((c: any) => [c.value, c]));
    const datasets = this.inject.chartDataset || [];
    this.barSeries = [];
    this.lineSeries = [];
    datasets.forEach((ds: any, i: number) => {
      const color = assignedByLabel.get(ds.label)?.color || ds.borderColor || '#4472c4';
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

    let valueMin = 0, valueMax = 0;
    const barSource = hasVisibleData ? visibleBarSeries : this.barSeries;
    const lineSource = hasVisibleData ? visibleLineSeries : this.lineSeries;
    barSource.forEach(s => s.data.forEach(v => { if (v === null) return; valueMin = Math.min(valueMin, v); valueMax = Math.max(valueMax, v); }));
    lineSource.forEach(s => s.data.forEach(v => { if (v === null) return; valueMin = Math.min(valueMin, v); valueMax = Math.max(valueMax, v); }));
    if (valueMax === valueMin) valueMax = valueMin + 1;

    const tickCount = computeYTickCount(height);

    let leftMargin = 8;
    if (!compact) {
      const probeScale = d3.scaleLinear().domain([valueMin, valueMax]).nice();
      const tickLabels = probeScale.ticks(tickCount).map(v => formatAxisValue(v));
      leftMargin = Math.min(Math.max(measureMaxLabelWidth(tickLabels, 11, this.fontFamily) + 16, 40), width * 0.3);
    }
    const margin = compact
      ? { top: 4, right: 4, bottom: 4, left: 4 }
      : { top: 16, right: 20, bottom: 50, left: leftMargin };
    const innerWidth = Math.max(width - margin.left - margin.right, 10);
    const innerHeight = Math.max(height - margin.top - margin.bottom, 10);

    const defs = this.svg.append('defs');
    const g = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const categoryScale = d3.scaleBand<string>().domain(axisCategories).range([0, innerWidth]).padding(0.25);
    const valueScale = d3.scaleLinear().domain([valueMin, valueMax]).nice().range([innerHeight, 0]);
    const zeroY = valueScale(0);
    const seriesScale = d3.scaleBand<string>().domain(visibleBarSeries.map((_, i) => String(i))).range([0, categoryScale.bandwidth()]).padding(0.1);
    const xForCategoryCenter = (catIdx: number) => (categoryScale(axisCategories[catIdx]) ?? 0) + categoryScale.bandwidth() / 2;
    // Per-side lateral gap a bar normally has towards the next category - same role as eda-bar-d3's
    // vBarGap, feeding the hover-grow's gap contribution (see hoverExtraWidth).
    const vBarGap = (categoryScale.step() - categoryScale.bandwidth()) / 2;

    if (!compact) {
      if (this.inject.showGridLines ?? true) {
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
      g.selectAll('.eda-barline-axis text').style('font-family', this.fontFamily).style('font-size', '11px').style('font-weight', 500).style('fill', '#000000');
    }

    const barsGroup = g.append('g').attr('class', 'eda-barline-bars');
    const labelsGroup = g.append('g').attr('class', 'eda-barline-labels');
    const lineGroup = g.append('g').attr('class', 'eda-barline-lines');

    const ENTRANCE_MS = compact ? 600 : 1500;
    const animateEntrance = !this.hasRendered;
    const singleBarSeries = visibleBarSeries.length === 1;
    const showLabelsOn = (this.inject.showLabels || this.inject.showLabelsPercent) && !compact;

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
          bars.attr('d', zeroD).transition().duration(ENTRANCE_MS).ease(d3.easeCubicOut).attr('d', finalD);
        } else {
          bars.attr('d', finalD);
        }

        if (showLabelsOn) {
          labelsGroup.selectAll(`.eda-barline-label-${sIdx}`)
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
            .text((d: any) => this.formatLabel(d.value, this.percentOfSeries(series, d.catIdx)));
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
      .y(d => valueScale(d.value as number))
      .curve(d3.curveMonotoneX);

    const showDots = this.inject.showPointLines ?? false;

    visibleLineSeries.forEach(series => {
      const points: LinePoint[] = series.data.map((v, catIndex) => ({ catIndex, value: v }));
      const zeroPoints: LinePoint[] = points.map(p => ({ catIndex: p.catIndex, value: p.value === null ? null : 0 }));

      const strokePath = lineGroup.append('path')
        .datum(points)
        .attr('class', 'eda-barline-line-stroke')
        .attr('fill', 'none')
        .attr('stroke', series.color)
        .attr('stroke-width', 2)
        .style('pointer-events', 'none')
        .attr('d', animateEntrance ? lineGen(zeroPoints) : lineGen(points));
      if (series.dash) strokePath.attr('stroke-dasharray', series.dash);

      if (animateEntrance) {
        strokePath.transition().duration(ENTRANCE_MS).ease(d3.easeCubicOut).attr('d', lineGen(points));
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
        .attr('cy', (d: LinePoint) => valueScale(d.value as number))
        .attr('r', 8)
        .style('fill', 'transparent')
        .style('cursor', 'pointer');

      const dots = dotSel.append('circle')
        .attr('class', 'eda-barline-point-dot')
        .attr('cx', (d: LinePoint) => xForCategoryCenter(d.catIndex))
        .attr('cy', (d: LinePoint) => valueScale(d.value as number))
        .attr('r', animateEntrance && showDots ? 0 : (showDots ? 3.5 : 0))
        .style('fill', series.color)
        .style('pointer-events', 'none');

      // Dots pop in once the line itself has finished sweeping in, rather than appearing instantly
      // alongside it - a beat of separation reads more like a deliberate reveal than a glitch.
      if (animateEntrance && showDots) {
        dots.transition().delay(ENTRANCE_MS).duration(250).ease(d3.easeBackOut).attr('r', 3.5);
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
