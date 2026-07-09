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

    this.resizeObserver = new ResizeObserver(entries => {
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
    this.draw();
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

  private tooltipHtml(seriesLabel: string, category: string, value: number, percentage: number, isPyramid: boolean, hex: string): string {
    const swatch = `<span class="eda-bar-tooltip-swatch" style="background-color:${hex};"></span>`;
    if (isPyramid) {
      return `<div class="eda-bar-tooltip-row">${swatch}<strong>${seriesLabel}</strong>: ${this.formatValue(Math.abs(value))}</div>`;
    }
    return `<div class="eda-bar-tooltip-title">${category}</div>` +
      `<div class="eda-bar-tooltip-row">${swatch}<strong>${seriesLabel}</strong> : ${this.formatValue(value)} (${percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })}%)</div>`;
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
    if (visibleSeries.length === 0 || this.categories.length === 0) return;

    // Build the stacked layout (stackedbar / stackedbar100 / pyramid) once, shared by all three.
    let stackedSeriesData: any[] = null;
    if (stacked) {
      const rows = this.categories.map((cat, catIdx) => {
        const row: any = { cat };
        visibleSeries.forEach((s, sIdx) => { row[sIdx] = s.data[catIdx] || 0; });
        return row;
      });
      const keys = visibleSeries.map((_, i) => i);
      stackedSeriesData = d3.stack().keys(keys as any)(rows as any);
    }

    // Value domain
    let valueMin = 0, valueMax = 0;
    if (stacked100) {
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
      const skipProbeScale = d3.scaleBand().domain(this.categories).range([0, innerHeightForSkip]).padding(0.25);
      const step = skipProbeScale.step();
      const lineHeight = 14; // ~11px font + a little breathing room between rows
      horizontalVisibleCatIndexes = new Set();
      let lastShownY = -Infinity;
      this.categories.forEach((_, i) => {
        if (lastShownY === -Infinity || i * step - lastShownY >= lineHeight) {
          horizontalVisibleCatIndexes.add(i);
          lastShownY = i * step;
        }
      });
      const visibleLabels = this.categories
        .filter((_, i) => horizontalVisibleCatIndexes.has(i))
        .map(c => this.truncateLabel(c));
      leftMargin = Math.min(Math.max(this.measureMaxLabelWidth(visibleLabels, 11) + 24, 60), width * 0.4);
    } else {
      const probeScale = d3.scaleLinear().domain([valueMin, valueMax]).nice();
      const tickLabels = probeScale.ticks().map(v => formatAxisValue(v));
      leftMargin = Math.min(Math.max(this.measureMaxLabelWidth(tickLabels, 11) + 16, 40), width * 0.3);
    }
    const margin = { top: 16, right: 20, bottom: horizontal ? 30 : 50, left: leftMargin };
    const innerWidth = Math.max(width - margin.left - margin.right, 10);
    const innerHeight = Math.max(height - margin.top - margin.bottom, 10);

    const defs = this.svg.append('defs');
    const g = this.svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const categoryScale: any = d3.scaleBand().domain(this.categories).range(horizontal ? [0, innerHeight] : [0, innerWidth]).padding(0.25);
    const valueScale: any = d3.scaleLinear().domain([valueMin, valueMax]).nice().range(horizontal ? [0, innerWidth] : [innerHeight, 0]);
    const zeroPos = valueScale(0);

    const seriesScale: any = d3.scaleBand().domain(visibleSeries.map((_, i) => String(i))).range([0, categoryScale.bandwidth()]).padding(0.05);

    // Grid lines (value axis)
    if (this.inject.showGridLines ?? true) {
      const gridAxis: any = horizontal
        ? d3.axisBottom(valueScale).tickSize(-innerHeight).tickFormat(() => '')
        : d3.axisLeft(valueScale).tickSize(-innerWidth).tickFormat(() => '');
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
    const valueAxis: any = (horizontal ? d3.axisBottom(valueScale) : d3.axisLeft(valueScale))
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
      const footprints = this.categories.map(c => {
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

    if (stacked) {
      stackedSeriesData.forEach((layer: any, sIdx: number) => {
        const series = visibleSeries[sIdx];

        const bars = barsGroup.selectAll(`.eda-bar-series-${sIdx}`)
          .data(layer)
          .join('rect')
          .attr('class', `eda-bar-series-${sIdx}`)
          .attr('fill', (d: any) => this.barFill(defs, series, this.categories.indexOf(d.data.cat), horizontal))
          .style('cursor', 'pointer');

        if (horizontal) {
          bars
            .attr('y', (d: any) => categoryScale(d.data.cat))
            .attr('height', categoryScale.bandwidth())
            .attr('x', (d: any) => valueScale(Math.min(d[0], d[1])))
            .attr('width', (d: any) => Math.abs(valueScale(d[1]) - valueScale(d[0])));
        } else {
          bars
            .attr('x', (d: any) => categoryScale(d.data.cat))
            .attr('width', categoryScale.bandwidth())
            .attr('y', (d: any) => valueScale(Math.max(d[0], d[1])))
            .attr('height', (d: any) => Math.abs(valueScale(d[1]) - valueScale(d[0])));
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
            if (labelSel) {
              labelSel.filter((ld: any) => ld === d)
                .interrupt('labelGrow').transition('labelGrow').duration(150)
                .style('font-size', '14px');
            }

            const catIdx = this.categories.indexOf(d.data.cat);
            const value = stacked100 ? (series.rawValues?.[catIdx] ?? 0) : series.data[catIdx];
            const percentage = stacked100 ? (series.data[catIdx] || 0) : this.percentOfSeries(series, catIdx);
            this.tooltipService.show(event, this.tooltipHtml(series.label, d.data.cat, value, percentage, isPyramid, hex), 'eda-bar-tooltip');
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
        const rows = this.categories.map((cat, catIdx) => ({ cat, value: series.data[catIdx], catIdx }));

        const bars = barsGroup.selectAll(`.eda-bar-series-${sIdx}`)
          .data(rows)
          .join('rect')
          .attr('class', `eda-bar-series-${sIdx}`)
          .attr('fill', (d: any) => this.barFill(defs, series, d.catIdx, horizontal))
          .style('cursor', 'pointer');

        if (horizontal) {
          bars
            .attr('y', (d: any) => (categoryScale(d.cat) || 0) + (singleSeries ? 0 : seriesScale(String(sIdx))))
            .attr('height', singleSeries ? categoryScale.bandwidth() : seriesScale.bandwidth())
            .attr('x', (d: any) => valueScale(Math.min(0, d.value)))
            .attr('width', (d: any) => Math.abs(valueScale(d.value) - zeroPos));
        } else {
          bars
            .attr('x', (d: any) => (categoryScale(d.cat) || 0) + (singleSeries ? 0 : seriesScale(String(sIdx))))
            .attr('width', singleSeries ? categoryScale.bandwidth() : seriesScale.bandwidth())
            .attr('y', (d: any) => valueScale(Math.max(0, d.value)))
            .attr('height', (d: any) => Math.abs(zeroPos - valueScale(d.value)));
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
            if (labelSel) {
              labelSel.filter((ld: any) => ld === d)
                .interrupt('labelGrow').transition('labelGrow').duration(150)
                .style('font-size', '14px');
            }

            const percentage = this.percentOfSeries(series, d.catIdx);
            this.tooltipService.show(event, this.tooltipHtml(series.label, d.cat, d.value, percentage, false, hex), 'eda-bar-tooltip');
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
}
