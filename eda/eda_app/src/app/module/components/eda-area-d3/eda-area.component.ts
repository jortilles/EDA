import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import * as d3 from 'd3';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaAreaD3 } from './eda-area';
import { StyleProviderService, D3TooltipService, lightenHex, darkenHex, formatAxisValue, formatDeNumber, formatValueLabel, resolveLabelColor, ensureLinearGradient, initD3ResizeObserver, teardownD3Chart, computeYTickCount, measureTextWidth, measureMaxLabelWidth, truncateLabel, opacityFraction, DASH_TREND } from '@eda/services/service.index';
import { EdaChartLegendComponent } from '../eda-chart-legend/eda-chart-legend.component';

interface AreaPoint {
  catIndex: number;
  value: number | null;
}

interface AreaSeries {
  label: string;
  color: string;
  opacity: number;
  originalIndex: number;
  isTrend: boolean;
  /** For a trend series, the label of the real series it derives from - used to share its color and hide it together. */
  sourceLabel?: string;
  points: AreaPoint[];
}

const MAX_CATEGORY_CHARS = 8;

@Component({
  standalone: true,
  selector: 'eda-area-d3',
  templateUrl: './eda-area.component.html',
  styleUrls: ['./eda-area.component.css'],
  encapsulation: ViewEncapsulation.Emulated,
  imports: [FormsModule, CommonModule, EdaChartLegendComponent]
})
export class EdaAreaComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() inject: EdaAreaD3;
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef;

  id: string;
  svg: any;
  resizeObserver!: ResizeObserver;

  chartLegend: boolean;
  legendItems: { label: string; color: string; hidden: boolean }[] = [];

  private categories: string[] = [];
  private series: AreaSeries[] = [];
  private hiddenSeriesIndexes: Set<number> = new Set();
  private fontFamily = 'inherit';
  private hasRendered = false;

  constructor(private styleProviderService: StyleProviderService, private tooltipService: D3TooltipService) { }

  ngOnInit(): void {
    this.id = `area_${this.inject.id}`;
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
    this.series = datasets.map((ds: any, i: number) => {
      // Trend rows are independently editable by their own label - only fall back to their source
      // series' color/opacity if they don't have their own assignedColors entry yet.
      const assigned = assignedByLabel.get(ds.label) || (ds.isTrend ? assignedByLabel.get(ds.sourceLabel) : undefined);
      const color = assigned?.color || ds.borderColor || '#4472c4';
      const opacity = assigned?.opacity ?? (ds.isTrend ? 25 : 100);
      return {
        label: ds.label || '',
        color,
        opacity,
        originalIndex: i,
        isTrend: !!ds.isTrend,
        sourceLabel: ds.sourceLabel,
        points: (ds.data || []).map((v: any, catIdx: number) => ({ catIndex: catIdx, value: v === null || v === undefined ? null : Number(v) }))
      } as AreaSeries;
    });
    this.legendItems = this.series
      .map(s => ({ label: s.label, color: s.color, hidden: this.hiddenSeriesIndexes.has(s.originalIndex) }));
  }

  toggleLegend(legendIdx: number): void {
    const s = this.series[legendIdx];
    if (!s) return;
    if (this.hiddenSeriesIndexes.has(s.originalIndex)) this.hiddenSeriesIndexes.delete(s.originalIndex);
    else this.hiddenSeriesIndexes.add(s.originalIndex);
    this.legendItems[legendIdx].hidden = this.hiddenSeriesIndexes.has(s.originalIndex);
    this.draw();
  }

  /** A trend series is visible only when its own real source series is (and isn't itself hidden). */
  private isSeriesVisible(s: AreaSeries): boolean {
    if (this.hiddenSeriesIndexes.has(s.originalIndex)) return false;
    if (s.sourceLabel) {
      const source = this.series.find(o => o.label === s.sourceLabel && !o.isTrend);
      if (source && this.hiddenSeriesIndexes.has(source.originalIndex)) return false;
    }
    return true;
  }

  private truncate(label: string): string {
    return truncateLabel(label, MAX_CATEGORY_CHARS);
  }

  /** Delay (ms) at which the entrance sweep visually reaches a given x position - see eda-line's
   * identical helper for the full reasoning (binary search + easeCubicOut inversion). */
  private lineReachDelay(pathNode: SVGPathElement, totalLength: number, targetX: number, durationMs: number): number {
    if (totalLength <= 0) return 0;
    let lo = 0, hi = totalLength;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (pathNode.getPointAtLength(mid).x < targetX) lo = mid; else hi = mid;
    }
    const lengthFraction = (lo + hi) / 2 / totalLength;
    const timeFraction = 1 - Math.cbrt(1 - lengthFraction);
    return durationMs * timeFraction;
  }

  private percentOfSeries(series: AreaSeries, catIndex: number): number {
    const total = series.points.reduce((a, p) => a + (p.value ?? 0), 0);
    const value = series.points.find(p => p.catIndex === catIndex)?.value ?? 0;
    return total ? (value / total) * 100 : 0;
  }

  private formatLabel(series: AreaSeries, catIndex: number, value: number): string {
    return formatValueLabel(value, this.percentOfSeries(series, catIndex), this.inject.showLabels, this.inject.showLabelsPercent);
  }

  private gradientId(key: number | string): string {
    return `area-grad-${this.id}-${key}`;
  }

  private areaFill(defs: any, series: AreaSeries): string {
    const opacity = opacityFraction(series.opacity);
    if (!(this.inject.useGradient ?? true)) {
      const rgb = d3.rgb(series.color);
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    }
    return ensureLinearGradient(defs, this.gradientId(series.originalIndex), [
      { offset: '0%', color: lightenHex(series.color, 30), opacity },
      { offset: '100%', color: series.color, opacity }
    ], { x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
  }

  draw(): void {
    const container = this.svgContainer.nativeElement as HTMLElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;

    this.svg.selectAll('*').remove();
    const compact = this.inject.compact ?? false;
    const linkedDashboard = this.inject.linkedDashboard;

    const visibleSeries = this.series.filter(s => this.isSeriesVisible(s));
    const realVisible = visibleSeries.filter(s => !s.isTrend);
    const hasVisibleData = realVisible.length > 0 && this.categories.length > 0;
    const axisCategories = this.categories;

    let valueMin = 0, valueMax = 0;
    const domainSource = hasVisibleData ? visibleSeries : this.series;
    domainSource.forEach(s => s.points.forEach(p => {
      if (p.value === null) return;
      valueMin = Math.min(valueMin, p.value);
      valueMax = Math.max(valueMax, p.value);
    }));
    if (valueMax === valueMin) valueMax = valueMin + 1;

    const tickCount = computeYTickCount(height);

    // Grid lines follow showGridLines independently of compact. Value axis LABELS follow the same
    // field but only in compact mode - a full-size chart always shows them regardless of
    // showGridLines (that field has only ever toggled the lines there), matching prior behavior.
    const showGridLinesOn = this.inject.showGridLines ?? !compact;
    const showValueAxis = !compact || this.inject.showGridLines === true;

    let leftMargin = 8;
    if (showValueAxis) {
      const probeScale = d3.scaleLinear().domain([valueMin, valueMax]).nice();
      const tickLabels = probeScale.ticks(tickCount).map(v => formatAxisValue(v));
      leftMargin = Math.min(Math.max(measureMaxLabelWidth(tickLabels, 11, this.fontFamily) + 16, 40), width * 0.3);
    }
    // Compact + explicit grid lines also earns a (capped, horizontal) category axis below - needs
    // a little vertical room the otherwise-axisless compact layout doesn't normally allocate.
    const showCompactCategoryAxis = compact && this.inject.showGridLines === true;
    // Compact + value labels need headroom above the topmost point too, or a point near the very
    // top gets its label clipped by the SVG's own edge.
    const showCompactLabels = compact && (this.inject.showLabels || this.inject.showLabelsPercent);
    const margin = compact
      ? { top: showCompactLabels ? 20 : 4, right: 4, bottom: showCompactCategoryAxis ? 18 : 4, left: showValueAxis ? leftMargin : 4 }
      : { top: 16, right: 20, bottom: 50, left: leftMargin };
    const innerWidth = Math.max(width - margin.left - margin.right, 10);
    const innerHeight = Math.max(height - margin.top - margin.bottom, 10);

    const defs = this.svg.append('defs');
    const g = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const categoryScale = d3.scaleBand<string>().domain(axisCategories).range([0, innerWidth]).padding(0.25);
    const valueScale = d3.scaleLinear().domain([valueMin, valueMax]).nice().range([innerHeight, 0]);
    const xFor = (catIdx: number) => (categoryScale(axisCategories[catIdx]) ?? 0) + categoryScale.bandwidth() / 2;
    const zeroY = valueScale(0);

    if (showGridLinesOn) {
      g.append('g')
        .attr('class', 'eda-area-grid')
        .call(d3.axisLeft(valueScale).ticks(tickCount).tickSize(-innerWidth).tickFormat(() => '' as any));
    }

    if (showValueAxis) {
      const valueAxis = d3.axisLeft(valueScale).ticks(tickCount).tickFormat((v: any) => formatAxisValue(v));
      g.append('g').attr('class', 'eda-area-axis').call(valueAxis as any);
      g.selectAll('.eda-area-axis text').style('font-family', this.fontFamily).style('font-size', '11px').style('font-weight', 500).style('fill', '#000000');
    }

    if (!compact) {
      const categoryAxis = d3.axisBottom(categoryScale).tickFormat((d: string) => this.truncate(d));

      const catAxisG = g.append('g').attr('class', 'eda-area-axis')
        .attr('transform', `translate(0,${innerHeight})`).call(categoryAxis as any);
      catAxisG.selectAll('text').style('text-anchor', 'end').attr('dx', '-0.5em').attr('dy', '0.4em').attr('transform', 'rotate(-30)')
        .style('font-family', this.fontFamily).style('font-size', '11px').style('font-weight', 500).style('fill', '#000000');

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
    } else if (showCompactCategoryAxis) {
      // Compact mode has no room for the full diagonal collision-avoidance axis above - cap to at
      // most 3 evenly-spaced labels (first/middle/last), horizontal instead of rotated.
      const categoryAxis = d3.axisBottom(categoryScale).tickFormat((d: string) => this.truncate(d));
      const catAxisG = g.append('g').attr('class', 'eda-area-axis')
        .attr('transform', `translate(0,${innerHeight})`).call(categoryAxis as any);
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

    const areaGen: any = d3.area<AreaPoint>()
      .defined(d => d.value !== null)
      .x(d => xFor(d.catIndex))
      .y0(zeroY)
      .y1(d => valueScale(d.value as number))
      .curve(d3.curveMonotoneX);

    const lineGen: any = d3.line<AreaPoint>()
      .defined(d => d.value !== null)
      .x(d => xFor(d.catIndex))
      .y(d => valueScale(d.value as number))
      .curve(d3.curveMonotoneX);

    const straightGen: any = d3.line<AreaPoint>()
      .defined(d => d.value !== null)
      .x(d => xFor(d.catIndex))
      .y(d => valueScale(d.value as number))
      .curve(d3.curveLinear);

    const fillGroup = g.append('g').attr('class', 'eda-area-fill-group').style('pointer-events', 'none');
    const pointsGroup = g.append('g').attr('class', 'eda-area-points');
    const labelsGroup = g.append('g').attr('class', 'eda-area-labels').style('pointer-events', 'none');
    const showLabelsOn = this.inject.showLabels || this.inject.showLabelsPercent;

    const ENTRANCE_MS = compact ? 600 : 3000;
    const animateEntrance = !this.hasRendered && (this.inject.chartAnimation ?? true);

    // Real (non-derived) series first, so the trend overlay paints on top of its source.
    const drawOrder = [...visibleSeries.filter(s => !s.isTrend), ...visibleSeries.filter(s => s.isTrend)];

    drawOrder.forEach(series => {
      if (series.isTrend) {
        // Trend is a straight dashed line over its own fill - no points, no tooltip, no click.
        const trendOpacity = opacityFraction(series.opacity);
        const trendFill = (this.inject.useGradient ?? true)
          ? ensureLinearGradient(defs, this.gradientId(`trend-${series.originalIndex}`), [
              { offset: '0%', color: lightenHex(series.color, 30), opacity: trendOpacity },
              { offset: '100%', color: series.color, opacity: trendOpacity }
            ], { x1: '0%', y1: '0%', x2: '0%', y2: '100%' })
          : (() => { const rgb = d3.rgb(series.color); return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${trendOpacity})`; })();

        fillGroup.append('path')
          .datum(series.points)
          .attr('class', 'eda-area-trend-fill')
          .attr('fill', trendFill)
          .attr('d', areaGen(series.points));

        fillGroup.append('path')
          .datum(series.points)
          .attr('class', 'eda-area-trend')
          .attr('fill', 'none')
          .attr('stroke', series.color)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', DASH_TREND)
          .attr('d', straightGen(series.points));

        if (showLabelsOn) {
          const trendVertexData = series.points.filter(p => p.value !== null).map(p => ({ series, point: p }));
          labelsGroup.selectAll(null)
            .data(trendVertexData)
            .enter()
            .append('text')
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('font-weight', 'bold')
            .style('font-family', this.fontFamily)
            .style('fill', resolveLabelColor(this.inject.labelColorMode, this.inject.labelCustomColor, series.color))
            .attr('x', (d: any) => xFor(d.point.catIndex))
            .attr('y', (d: any) => valueScale(d.point.value) - 10)
            .text((d: any) => this.formatLabel(series, d.point.catIndex, d.point.value));
        }
        return;
      }

      const zeroPoints = series.points.map(p => ({ catIndex: p.catIndex, value: p.value === null ? null : 0 }));

      const fillPath = fillGroup.append('path')
        .datum(series.points)
        .attr('class', 'eda-area-fill')
        .attr('fill', this.areaFill(defs, series))
        .attr('d', animateEntrance ? areaGen(zeroPoints) : areaGen(series.points));

      if (animateEntrance) {
        fillPath.transition().duration(ENTRANCE_MS).ease(d3.easeCubicOut).attr('d', areaGen(series.points));
      }

      const strokePath = fillGroup.append('path')
        .datum(series.points)
        .attr('class', 'eda-area-stroke')
        .attr('fill', 'none')
        .attr('stroke', series.color)
        .attr('stroke-width', 2)
        .attr('d', lineGen(series.points));

      // Computed unconditionally (cheap) rather than only inside the animateEntrance branch below,
      // since the dots'/labels' own pop-in/fade-in timing further down needs this path's geometry
      // to know exactly when the sweep passes each one.
      const pathNode = strokePath.node() as SVGPathElement;
      const pathLength = pathNode.getTotalLength();

      if (animateEntrance) {
        strokePath.attr('stroke-dasharray', `${pathLength} ${pathLength}`).attr('stroke-dashoffset', pathLength)
          .transition().duration(ENTRANCE_MS).ease(d3.easeCubicOut)
          .attr('stroke-dashoffset', 0);
      }

      const showDots = this.inject.showPointLines ?? false;
      const baseRadius = showDots ? 3.5 : 0;
      const realPoints = series.points.filter(p => p.value !== null);

      const vertexData = realPoints.map(p => ({ series, point: p }));
      const dotSel = pointsGroup.selectAll(null)
        .data(vertexData)
        .enter()
        .append('g')
        .attr('class', 'eda-area-point-group');

      dotSel.append('circle')
        .attr('class', 'eda-area-point-hit')
        .attr('cx', (d: any) => xFor(d.point.catIndex))
        .attr('cy', (d: any) => valueScale(d.point.value))
        .attr('r', 8)
        .style('fill', 'transparent')
        .style('cursor', 'pointer');

      const dots = dotSel.append('circle')
        .attr('class', 'eda-area-point-dot')
        .attr('cx', (d: any) => xFor(d.point.catIndex))
        .attr('cy', (d: any) => valueScale(d.point.value))
        .attr('r', animateEntrance && showDots ? 0 : baseRadius)
        .style('fill', series.color)
        .style('pointer-events', 'none');

      // Pop each dot in right as the sweep reaches its x position - same idea as eda-line.
      if (animateEntrance && showDots) {
        const POP_MS = 100;
        dots.each((d: any, i: number, nodes: ArrayLike<SVGCircleElement>) => {
          const delay = this.lineReachDelay(pathNode, pathLength, xFor(d.point.catIndex), ENTRANCE_MS);
          d3.select(nodes[i])
            .transition().delay(delay).duration(0).attr('r', baseRadius)
            .transition().duration(POP_MS).ease(d3.easeCubicOut).attr('r', baseRadius * 1.5)
            .transition().duration(POP_MS).ease(d3.easeCubicIn).attr('r', baseRadius);
        });
      }

      if (showLabelsOn) {
        const labelSel = labelsGroup.selectAll(null)
          .data(realPoints)
          .enter()
          .append('text')
          .attr('class', 'eda-area-label')
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', 'bold')
          .style('font-family', this.fontFamily)
          .style('fill', resolveLabelColor(this.inject.labelColorMode, this.inject.labelCustomColor, series.color))
          .attr('x', (d: any) => xFor(d.catIndex))
          .attr('y', (d: any) => valueScale(d.value as number) - 10)
          .text((d: any) => this.formatLabel(series, d.catIndex, d.value as number))
          .style('opacity', animateEntrance ? 0 : 1);

        if (animateEntrance) {
          const LABEL_FADE_MS = 200;
          labelSel.transition()
            .delay((d: any) => this.lineReachDelay(pathNode, pathLength, xFor(d.catIndex), ENTRANCE_MS))
            .duration(LABEL_FADE_MS)
            .style('opacity', 1);
        }
      }

      dotSel
        .on('mouseover', (event: any, d: any) => {
          d3.select(event.currentTarget).select('.eda-area-point-dot')
            .interrupt('grow').transition('grow').duration(150)
            .attr('r', 4.5)
            .style('fill', darkenHex(series.color, 40));

          const category = this.categories[d.point.catIndex];
          const title = `${this.inject.categoryFieldName ? this.inject.categoryFieldName + ' : ' : ''}${category}`;
          const swatch = `<span class="eda-area-tooltip-swatch" style="background-color:${series.color};"></span>`;
          const multiSeries = realVisible.length > 1;
          const seriesPrefix = multiSeries ? `<strong>${series.label}</strong> : ` : '';
          let text = `<div class="eda-area-tooltip-title">${title}</div>` +
            `<div class="eda-area-tooltip-row">${swatch}${seriesPrefix}${formatDeNumber(d.point.value)}</div>`;
          if (linkedDashboard) text += `<h6>${$localize`:@@linkedTo:Vinculado con`} ${linkedDashboard.dashboardName}</h6>`;
          this.tooltipService.show(event, text, 'eda-area-tooltip');
        })
        .on('mousemove', (event: any) => this.tooltipService.move(event))
        .on('mouseout', (event: any) => {
          d3.select(event.currentTarget).select('.eda-area-point-dot')
            .interrupt('grow').transition('grow').duration(150)
            .attr('r', baseRadius)
            .style('fill', series.color);
          this.tooltipService.hide();
        })
        .on('click', (event: any, d: any) => {
          const category = this.categories[d.point.catIndex];
          // Fixes today's Chart.js gap: area's click was simply missing from the filter-emit
          // allowlist upstream (eda-blank-panel.component.ts) - this emits the same generic shape
          // every other chart does; the allowlist itself is updated separately.
          if (linkedDashboard) {
            const url = window.location.href.slice(0, window.location.href.indexOf('/dashboard')) +
              `/dashboard/${linkedDashboard.dashboardID}?${linkedDashboard.table}.${linkedDashboard.col}=${series.label}`;
            window.open(url, '_blank');
          } else {
            this.onClick.emit({ inx: d.point.catIndex, label: category, value: d.point.value, filterBy: series.label });
          }
        });
    });

    this.hasRendered = true;
  }
}
