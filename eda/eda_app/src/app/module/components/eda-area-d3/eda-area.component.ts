import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import * as d3 from 'd3';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaAreaD3 } from './eda-area';
import { StyleProviderService, D3TooltipService, lightenHex, darkenHex, sanitizeId, formatAxisValue, formatDeNumber, ensureLinearGradient, initD3ResizeObserver, teardownD3Chart, computeYTickCount, measureTextWidth, measureMaxLabelWidth, truncateLabel, opacityFraction } from '@eda/services/service.index';
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
    this.resizeObserver = initD3ResizeObserver(container, this.svg, () => this.draw());
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
    this.series = datasets.map((ds: any, i: number) => {
      const assigned = assignedByLabel.get(ds.label);
      const color = assigned?.color || ds.borderColor || '#4472c4';
      const opacity = assigned?.opacity ?? 100;
      return {
        label: ds.label || '',
        color,
        opacity,
        originalIndex: i,
        points: (ds.data || []).map((v: any, catIdx: number) => ({ catIndex: catIdx, value: v === null || v === undefined ? null : Number(v) }))
      } as AreaSeries;
    });
    this.legendItems = this.series.map(s => ({ label: s.label, color: s.color, hidden: this.hiddenSeriesIndexes.has(s.originalIndex) }));
  }

  toggleLegend(legendIdx: number): void {
    const s = this.series[legendIdx];
    if (!s) return;
    if (this.hiddenSeriesIndexes.has(s.originalIndex)) this.hiddenSeriesIndexes.delete(s.originalIndex);
    else this.hiddenSeriesIndexes.add(s.originalIndex);
    this.legendItems[legendIdx].hidden = this.hiddenSeriesIndexes.has(s.originalIndex);
    this.draw();
  }

  private truncate(label: string): string {
    return truncateLabel(label, MAX_CATEGORY_CHARS);
  }

  private gradientId(label: string): string {
    return `area-grad-${this.id}-${sanitizeId(label)}`;
  }

  private areaFill(defs: any, series: AreaSeries): string {
    const opacity = opacityFraction(series.opacity);
    if (!(this.inject.useGradient ?? true)) {
      const rgb = d3.rgb(series.color);
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    }
    return ensureLinearGradient(defs, this.gradientId(series.label), [
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

    const visibleSeries = this.series.filter((_, i) => !this.hiddenSeriesIndexes.has(i));
    const hasVisibleData = visibleSeries.length > 0 && this.categories.length > 0;
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
    const xFor = (catIdx: number) => (categoryScale(axisCategories[catIdx]) ?? 0) + categoryScale.bandwidth() / 2;
    const zeroY = valueScale(0);

    if (!compact) {
      if (this.inject.showGridLines ?? true) {
        g.append('g')
          .attr('class', 'eda-area-grid')
          .call(d3.axisLeft(valueScale).ticks(tickCount).tickSize(-innerWidth).tickFormat(() => '' as any));
      }

      const categoryAxis = d3.axisBottom(categoryScale).tickFormat((d: string) => this.truncate(d));
      const valueAxis = d3.axisLeft(valueScale).ticks(tickCount).tickFormat((v: any) => formatAxisValue(v));

      const catAxisG = g.append('g').attr('class', 'eda-area-axis')
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

      g.append('g').attr('class', 'eda-area-axis').call(valueAxis as any);
      g.selectAll('.eda-area-axis text').style('font-family', this.fontFamily).style('font-size', '11px').style('font-weight', 500).style('fill', '#000000');
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

    const fillGroup = g.append('g').attr('class', 'eda-area-fill-group').style('pointer-events', 'none');
    const pointsGroup = g.append('g').attr('class', 'eda-area-points');

    const ENTRANCE_MS = compact ? 600 : 1500;
    const animateEntrance = !this.hasRendered;

    visibleSeries.forEach(series => {
      const zeroPoints = series.points.map(p => ({ catIndex: p.catIndex, value: p.value === null ? null : 0 }));

      const fillPath = fillGroup.append('path')
        .datum(series.points)
        .attr('class', 'eda-area-fill')
        .attr('fill', this.areaFill(defs, series))
        .attr('d', animateEntrance ? areaGen(zeroPoints) : areaGen(series.points));

      const strokePath = fillGroup.append('path')
        .datum(series.points)
        .attr('class', 'eda-area-stroke')
        .attr('fill', 'none')
        .attr('stroke', series.color)
        .attr('stroke-width', 2)
        .attr('d', animateEntrance ? lineGen(zeroPoints) : lineGen(series.points));

      if (animateEntrance) {
        fillPath.transition().duration(ENTRANCE_MS).ease(d3.easeCubicOut).attr('d', areaGen(series.points));
        strokePath.transition().duration(ENTRANCE_MS).ease(d3.easeCubicOut).attr('d', lineGen(series.points));
      }

      const vertexData = series.points.filter(p => p.value !== null).map(p => ({ series, point: p }));
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

      dotSel.append('circle')
        .attr('class', 'eda-area-point-dot')
        .attr('cx', (d: any) => xFor(d.point.catIndex))
        .attr('cy', (d: any) => valueScale(d.point.value))
        .attr('r', 0)
        .style('fill', series.color)
        .style('pointer-events', 'none');

      dotSel
        .on('mouseover', (event: any, d: any) => {
          d3.select(event.currentTarget).select('.eda-area-point-dot')
            .interrupt('grow').transition('grow').duration(150)
            .attr('r', 4.5)
            .style('fill', darkenHex(series.color, 40));

          const category = this.categories[d.point.catIndex];
          const title = `${this.inject.categoryFieldName ? this.inject.categoryFieldName + ' : ' : ''}${category}`;
          const swatch = `<span class="eda-area-tooltip-swatch" style="background-color:${series.color};"></span>`;
          const multiSeries = visibleSeries.length > 1;
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
            .attr('r', 0)
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
