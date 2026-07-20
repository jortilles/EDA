import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import * as d3 from 'd3';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaLineD3 } from './eda-line';
import { StyleProviderService, D3TooltipService, darkenHex, formatAxisValue, formatDeNumber, formatValueLabel, initD3ResizeObserver, teardownD3Chart, computeYTickCount, measureTextWidth, measureMaxLabelWidth, truncateLabel, DASH_TREND, DASH_PREDICTION } from '@eda/services/service.index';
import { EdaChartLegendComponent } from '../eda-chart-legend/eda-chart-legend.component';

interface LinePoint {
  catIndex: number;
  value: number | null;
}

interface LineSeries {
  label: string;
  color: string;
  originalIndex: number;
  isTrend: boolean;
  isPrediction: boolean;
  /** For trend/prediction series, the label of the real series they derive from - used to hide them together and share styling. */
  sourceLabel?: string;
  points: LinePoint[];
}

const MAX_CATEGORY_CHARS = 8;

@Component({
  standalone: true,
  selector: 'eda-line-d3',
  templateUrl: './eda-line.component.html',
  styleUrls: ['./eda-line.component.css'],
  encapsulation: ViewEncapsulation.Emulated,
  imports: [FormsModule, CommonModule, EdaChartLegendComponent]
})
export class EdaLineComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() inject: EdaLineD3;
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef;

  id: string;
  svg: any;
  resizeObserver!: ResizeObserver;

  chartLegend: boolean;
  legendItems: { label: string; color: string; hidden: boolean }[] = [];

  private categories: string[] = [];
  private series: LineSeries[] = [];
  private hiddenSeriesIndexes: Set<number> = new Set();
  private fontFamily = 'inherit';
  private panelBackgroundColor = '#ffffff';
  private hasRendered = false;

  constructor(private styleProviderService: StyleProviderService, private tooltipService: D3TooltipService) { }

  ngOnInit(): void {
    this.id = `line_${this.inject.id}`;
    this.chartLegend = this.inject.chartLegend ?? !(this.inject.compact ?? false);
    this.styleProviderService.panelFontFamily.subscribe(v => this.fontFamily = v).unsubscribe();
    this.styleProviderService.panelColor.subscribe(v => this.panelBackgroundColor = v || '#ffffff').unsubscribe();
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
      // Trend/prediction rows are independently editable by their own label - only fall back to
      // their source series' color if they don't have their own assignedColors entry yet.
      const assigned = assignedByLabel.get(ds.label)
        || ((ds.isTrend || ds.isPrediction) ? assignedByLabel.get(ds.sourceLabel) : undefined);
      return {
        label: ds.label || '',
        color: assigned?.color || ds.borderColor || ds.backgroundColor || '#4472c4',
        originalIndex: i,
        isTrend: !!ds.isTrend,
        isPrediction: !!ds.isPrediction,
        sourceLabel: ds.sourceLabel,
        points: (ds.data || []).map((v: any, catIdx: number) => ({ catIndex: catIdx, value: v === null || v === undefined ? null : Number(v) }))
      };
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

  /** A trend/prediction series is visible only when its own real source series is (and isn't itself hidden). */
  private isSeriesVisible(s: LineSeries): boolean {
    if (this.hiddenSeriesIndexes.has(s.originalIndex)) return false;
    if (s.sourceLabel) {
      const source = this.series.find(o => o.label === s.sourceLabel && !o.isTrend && !o.isPrediction);
      if (source && this.hiddenSeriesIndexes.has(source.originalIndex)) return false;
    }
    return true;
  }

  private truncate(label: string): string {
    return truncateLabel(label, MAX_CATEGORY_CHARS);
  }

  private percentOfSeries(series: LineSeries, catIndex: number): number {
    const total = series.points.reduce((a, p) => a + (p.value ?? 0), 0);
    const value = series.points.find(p => p.catIndex === catIndex)?.value ?? 0;
    return total ? (value / total) * 100 : 0;
  }

  private formatLabel(series: LineSeries, catIndex: number, value: number): string {
    return formatValueLabel(value, this.percentOfSeries(series, catIndex), this.inject.showLabels, this.inject.showLabelsPercent);
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
    const realVisible = visibleSeries.filter(s => !s.isTrend && !s.isPrediction);
    const hasVisibleData = realVisible.length > 0 && this.categories.length > 0;
    const axisCategories = this.categories;

    // Value domain from every visible series (including trend/prediction, so their lines never
    // get clipped), falling back to the full dataset when nothing is visible (stable frame).
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
    const margin = compact
      ? { top: 4, right: 4, bottom: 4, left: showValueAxis ? leftMargin : 4 }
      : { top: 16, right: 20, bottom: 50, left: leftMargin };
    const innerWidth = Math.max(width - margin.left - margin.right, 10);
    const innerHeight = Math.max(height - margin.top - margin.bottom, 10);

    const defs = this.svg.append('defs');
    const g = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const categoryScale = d3.scaleBand<string>().domain(axisCategories).range([0, innerWidth]).padding(0.25);
    const valueScale = d3.scaleLinear().domain([valueMin, valueMax]).nice().range([innerHeight, 0]);
    const xFor = (catIdx: number) => (categoryScale(axisCategories[catIdx]) ?? 0) + categoryScale.bandwidth() / 2;

    if (showGridLinesOn) {
      g.append('g')
        .attr('class', 'eda-line-grid')
        .call(d3.axisLeft(valueScale).ticks(tickCount).tickSize(-innerWidth).tickFormat(() => '' as any));
    }

    if (showValueAxis) {
      const valueAxis = d3.axisLeft(valueScale).ticks(tickCount).tickFormat((v: any) => formatAxisValue(v));
      g.append('g').attr('class', 'eda-line-axis').call(valueAxis as any);
      g.selectAll('.eda-line-axis text').style('font-family', this.fontFamily).style('font-size', '11px').style('font-weight', 500).style('fill', '#000000');
    }

    if (!compact) {
      const categoryAxis = d3.axisBottom(categoryScale).tickFormat((d: string) => this.truncate(d));

      const catAxisG = g.append('g').attr('class', 'eda-line-axis')
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
    }

    const lineGen: any = d3.line<LinePoint>()
      .defined(d => d.value !== null)
      .x(d => xFor(d.catIndex))
      .y(d => valueScale(d.value as number))
      .curve(d3.curveMonotoneX);

    const straightGen: any = d3.line<LinePoint>()
      .defined(d => d.value !== null)
      .x(d => xFor(d.catIndex))
      .y(d => valueScale(d.value as number))
      .curve(d3.curveLinear);

    const linesGroup = g.append('g').attr('class', 'eda-line-series').style('pointer-events', 'none');
    const pointsGroup = g.append('g').attr('class', 'eda-line-points');
    const labelsGroup = g.append('g').attr('class', 'eda-line-labels').style('pointer-events', 'none');
    const hoverGroup = g.append('g').attr('class', 'eda-line-hover-cols');
    const showLabelsOn = this.inject.showLabels || this.inject.showLabelsPercent;

    const ENTRANCE_MS = compact ? 600 : 1500;
    const animateEntrance = !this.hasRendered;

    // Real (non-derived) series first, so trend/prediction overlays paint on top of their source.
    const drawOrder = [...visibleSeries.filter(s => !s.isTrend && !s.isPrediction), ...visibleSeries.filter(s => s.isTrend || s.isPrediction)];

    drawOrder.forEach(series => {
      let d3attr: string;
      let gen = series.isTrend ? straightGen : lineGen;
      let points = series.points;

      if (series.isPrediction) {
        // Anchor the dashed continuation at the LAST REAL point of its own source series (not the
        // padded/duplicated data the old Chart.js hack relied on), so it visually starts exactly
        // where the real line stops - clean geometry instead of null-padding tricks.
        const source = this.series.find(o => o.label === series.sourceLabel && !o.isTrend && !o.isPrediction);
        const anchor = source ? [...source.points].reverse().find(p => p.value !== null) : null;
        const predPoints = series.points.filter(p => p.value !== null);
        points = anchor ? [anchor, ...predPoints] : predPoints;
      }

      const path = linesGroup.append('path')
        .datum(points)
        .attr('class', series.isTrend ? 'eda-line-trend' : series.isPrediction ? 'eda-line-prediction' : 'eda-line-stroke')
        .attr('fill', 'none')
        .attr('stroke', series.color)
        .attr('stroke-width', series.isTrend ? 1.5 : 2)
        .attr('stroke-dasharray', series.isTrend ? DASH_TREND : series.isPrediction ? DASH_PREDICTION : null)
        .attr('d', gen(points));

      if (animateEntrance) {
        const node = path.node() as SVGPathElement;
        const length = node.getTotalLength();
        path.attr('stroke-dasharray', `${length} ${length}`).attr('stroke-dashoffset', length)
          .transition().duration(ENTRANCE_MS).ease(d3.easeCubicOut)
          .attr('stroke-dashoffset', 0)
          .on('end', function () {
            d3.select(this).attr('stroke-dasharray', series.isTrend ? DASH_TREND : series.isPrediction ? DASH_PREDICTION : null);
          });
      }

      // Trend lines are purely decorative - no points, no hover, no click, no tooltip.
      if (series.isTrend) return;

      const showDots = series.isPrediction || (this.inject.showPointLines ?? false);
      const realPoints = points.filter(p => p.value !== null && (!series.isPrediction || p !== points[0]));

      const vertexData = realPoints.map(p => ({ series, point: p }));
      const dotSel = pointsGroup.selectAll(null)
        .data(vertexData)
        .enter()
        .append('g')
        .attr('class', 'eda-line-point-group');

      if (showLabelsOn && !series.isPrediction) {
        labelsGroup.selectAll(null)
          .data(vertexData)
          .enter()
          .append('text')
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', 'bold')
          .style('font-family', this.fontFamily)
          .style('fill', series.color)
          .attr('x', (d: any) => xFor(d.point.catIndex))
          .attr('y', (d: any) => valueScale(d.point.value) - 10)
          .text((d: any) => this.formatLabel(series, d.point.catIndex, d.point.value));
      }

      dotSel.append('circle')
        .attr('class', 'eda-line-point-hit')
        .attr('cx', (d: any) => xFor(d.point.catIndex))
        .attr('cy', (d: any) => valueScale(d.point.value))
        .attr('r', 8)
        .style('fill', 'transparent')
        .style('cursor', 'pointer');

      dotSel.append('circle')
        .attr('class', 'eda-line-point-dot')
        .attr('cx', (d: any) => xFor(d.point.catIndex))
        .attr('cy', (d: any) => valueScale(d.point.value))
        .attr('r', showDots ? (series.isPrediction ? 3 : 3.5) : 0)
        .style('fill', series.isPrediction ? this.panelBackgroundColor : series.color)
        .style('stroke', series.color)
        .style('stroke-width', series.isPrediction ? 1.5 : 0)
        .style('pointer-events', 'none');

      dotSel
        .on('mouseover', (event: any, d: any) => {
          const hitCircle = d3.select(event.currentTarget).select('.eda-line-point-hit');
          d3.select(event.currentTarget).select('.eda-line-point-dot')
            .interrupt('grow').transition('grow').duration(150)
            .attr('r', 6)
            .style('fill', darkenHex(series.color, 40));

          const category = this.categories[d.point.catIndex];
          const title = `${this.inject.categoryFieldName ? this.inject.categoryFieldName + ' : ' : ''}${category}`;
          const swatch = `<span class="eda-line-tooltip-swatch" style="background-color:${series.color};"></span>`;
          const multiSeries = realVisible.length > 1;
          const seriesPrefix = multiSeries ? `<strong>${series.label}</strong> : ` : '';
          let text = `<div class="eda-line-tooltip-title">${title}</div>` +
            `<div class="eda-line-tooltip-row">${swatch}${seriesPrefix}${formatDeNumber(d.point.value)}</div>`;
          if (linkedDashboard) text += `<h6>${$localize`:@@linkedTo:Vinculado con`} ${linkedDashboard.dashboardName}</h6>`;
          this.tooltipService.show(event, text, 'eda-line-tooltip');
        })
        .on('mousemove', (event: any) => this.tooltipService.move(event))
        .on('mouseout', (event: any, d: any) => {
          d3.select(event.currentTarget).select('.eda-line-point-dot')
            .interrupt('grow').transition('grow').duration(150)
            .attr('r', showDots ? (series.isPrediction ? 3 : 3.5) : 0)
            .style('fill', series.isPrediction ? this.panelBackgroundColor : series.color);
          this.tooltipService.hide();
        })
        .on('click', (event: any, d: any) => {
          const category = this.categories[d.point.catIndex];
          if (linkedDashboard) {
            const url = window.location.href.slice(0, window.location.href.indexOf('/dashboard')) +
              `/dashboard/${linkedDashboard.dashboardID}?${linkedDashboard.table}.${linkedDashboard.col}=${series.label}`;
            window.open(url, '_blank');
          } else {
            this.onClick.emit({ inx: d.point.catIndex, label: category, value: d.point.value, filterBy: series.label });
          }
        });
    });

    // Per-category invisible hover column - highlights every visible real series' point at that
    // category at once and shows one combined tooltip (mirrors Chart.js's mode:'nearest',
    // intersect:false), useful once there are enough categories that hitting one exact point is
    // fiddly. No click handler here - clicking still requires hitting an actual point.
    if (realVisible.length > 0 && !compact) {
      axisCategories.forEach((cat, catIdx) => {
        hoverGroup.append('rect')
          .attr('x', categoryScale(cat) ?? 0)
          .attr('y', 0)
          .attr('width', categoryScale.step())
          .attr('height', innerHeight)
          .style('fill', 'transparent')
          .on('mouseover mousemove', (event: any) => {
            const rows = realVisible
              .map(s => ({ s, p: s.points.find(p => p.catIndex === catIdx) }))
              .filter(r => r.p && r.p.value !== null);
            if (rows.length === 0) return;

            pointsGroup.selectAll('.eda-line-point-group').select('.eda-line-point-dot')
              .filter((d: any) => d.point.catIndex === catIdx)
              .interrupt('colGrow').transition('colGrow').duration(100).attr('r', 5);

            const title = `${this.inject.categoryFieldName ? this.inject.categoryFieldName + ' : ' : ''}${cat}`;
            const rowsHtml = rows.map(r =>
              `<div class="eda-line-tooltip-row"><span class="eda-line-tooltip-swatch" style="background-color:${r.s.color};"></span><strong>${r.s.label}</strong> : ${formatDeNumber(r.p.value as number)}</div>`
            ).join('');
            this.tooltipService.show(event, `<div class="eda-line-tooltip-title">${title}</div>${rowsHtml}`, 'eda-line-tooltip');
          })
          .on('mouseout', () => {
            pointsGroup.selectAll('.eda-line-point-group').select('.eda-line-point-dot')
              .filter((d: any) => d.point.catIndex === catIdx)
              .interrupt('colGrow').transition('colGrow').duration(100)
              .attr('r', (d: any) => (d.series.isPrediction || (this.inject.showPointLines ?? false)) ? (d.series.isPrediction ? 3 : 3.5) : 0);
            this.tooltipService.hide();
          });
      });
    }

    this.hasRendered = true;
  }
}
