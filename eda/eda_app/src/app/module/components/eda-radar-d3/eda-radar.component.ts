import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import * as d3 from 'd3';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaRadar } from './eda-radar';
import { StyleProviderService, D3TooltipService, lightenHex, darkenHex, sanitizeId, formatAxisValue } from '@eda/services/service.index';
import { EdaChartLegendComponent } from '../eda-chart-legend/eda-chart-legend.component';

interface RadarPoint {
  catIndex: number;
  value: number;
}

interface RadarSeries {
  label: string;
  color: string;
  // 0-100, from assignedColors[i].opacity (the dialog's "Opacidad" slider, same field the
  // still-Chart.js area chart already uses via hexToRgba) - controls the fill's translucency,
  // which matters more here than on non-overlapping charts since radar's series polygons overlap.
  opacity: number;
  originalIndex: number;
  points: RadarPoint[];
  // One radius per category index, kept live by draw() every call - lets enter/update/exit
  // tweens always interpolate from wherever this series' polygon currently is, whether that's
  // a fresh entrance (all zeros), a legend-driven rescale, or a plain resize.
  _current?: number[];
}

const GRADIENT_LIGHTEN_AMOUNT = 30;

@Component({
  standalone: true,
  selector: 'eda-radar-d3',
  templateUrl: './eda-radar.component.html',
  styleUrls: ['./eda-radar.component.css'],
  encapsulation: ViewEncapsulation.Emulated,
  imports: [FormsModule, CommonModule, EdaChartLegendComponent]
})
export class EdaRadarComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() inject: EdaRadar;
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef;

  id: string;
  svg: any;
  resizeObserver!: ResizeObserver;

  chartLegend: boolean;
  legendItems: { label: string; color: string; hidden: boolean }[] = [];

  private categories: string[] = [];
  private series: RadarSeries[] = [];
  private hiddenSeriesIndexes: Set<number> = new Set();
  private hasRendered = false;
  private fontFamily = 'inherit';
  private panelBackgroundColor = '#ffffff';

  constructor(private styleProviderService: StyleProviderService, private tooltipService: D3TooltipService) { }

  ngOnInit(): void {
    this.id = `radar_${this.inject.id}`;
    this.chartLegend = this.inject.chartLegend ?? true;
    this.styleProviderService.panelFontFamily.subscribe(v => this.fontFamily = v).unsubscribe();
    this.styleProviderService.panelColor.subscribe(v => this.panelBackgroundColor = v || '#ffffff').unsubscribe();
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

  // During a LIVE color-dialog edit (before the user hits Confirm/Save), chart-dialog.component.ts's
  // applyColorsToChart() re-bakes the new opacity straight into chartDataset[i].backgroundColor
  // (as an rgba(...) string) but does NOT touch inject.assignedColors[i].opacity - that only gets
  // synced on final save. Reading opacity from assignedColors alone meant the "Opacidad" slider
  // visibly had no effect until the dialog was confirmed. Parsing the alpha the dialog already
  // wrote into backgroundColor is what's actually live during preview.
  private extractOpacity(ds: any, fallback: number): number {
    const bg = ds?.backgroundColor;
    if (typeof bg === 'string') {
      const match = bg.match(/rgba?\([^)]*,\s*([\d.]+)\s*\)/);
      if (match) return Math.round(parseFloat(match[1]) * 100);
    }
    return fallback;
  }

  private buildSeries(): void {
    const labels: string[] = this.inject.chartLabels || [];
    this.categories = labels.map(l => String(l));
    const assignedByLabel = new Map((this.inject.assignedColors || []).map((c: any) => [c.value, c]));
    const datasets = this.inject.chartDataset || [];
    this.series = datasets.map((ds: any, sIdx: number) => {
      const assigned = assignedByLabel.get(ds.label);
      const color = ds.borderColor || assigned?.color || '#4472c4';
      const opacity = this.extractOpacity(ds, assigned?.opacity ?? 100);
      const values: number[] = (ds.data || []).map((v: any) => Number(v) || 0);
      return {
        label: ds.label || '',
        color,
        opacity,
        originalIndex: sIdx,
        points: values.map((v: number, catIdx: number) => ({ catIndex: catIdx, value: v }))
      } as RadarSeries;
    });
    this.legendItems = this.series.map((s, i) => ({ label: s.label, color: s.color, hidden: this.hiddenSeriesIndexes.has(i) }));
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

  /** Called unconditionally by the shared chart-dialog.component.ts on every live color edit. */
  updateChart(): void {
    this.chartLegend = this.inject.chartLegend ?? true;
    this.hiddenSeriesIndexes.clear();
    this.buildSeries();
    this.draw();
  }

  private formatLabel(value: number, percentage: number): string {
    const showLabels = this.inject.showLabels;
    const showLabelsPercent = this.inject.showLabelsPercent;
    if (showLabels && showLabelsPercent) {
      const res = value.toLocaleString('de-DE', { maximumFractionDigits: 6 });
      return `${res} - ${percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
    } else if (showLabels) {
      return value.toLocaleString('de-DE', { maximumFractionDigits: 6 });
    } else if (showLabelsPercent) {
      return `${percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
    }
    return '';
  }

  // D3's angle convention (shared by d3.arc/d3.pie, already relied on by polarArea): 0 = 12
  // o'clock, clockwise-positive. catIndex 0 sits straight up, matching Chart.js's own radar spoke
  // ordering (first axis at top, going clockwise).
  private angleSlice(n: number): number { return n > 0 ? (2 * Math.PI) / n : 0; }
  private angleFor(catIndex: number, n: number): number { return catIndex * this.angleSlice(n) - Math.PI / 2; }
  private xFor(angle: number, r: number): number { return r * Math.cos(angle); }
  private yFor(angle: number, r: number): number { return r * Math.sin(angle); }

  private ringPolygonPath(ringRadius: number, n: number, lineGen: any): string {
    const pts = d3.range(n).map(i => ({ angle: this.angleFor(i, n), r: ringRadius }));
    return lineGen(pts);
  }

  private seriesPathAt(radii: number[], n: number, lineGen: any): string {
    const pts = radii.map((r, i) => ({ angle: this.angleFor(i, n), r: Math.max(r, 0) }));
    return lineGen(pts);
  }

  private gradientId(label: string): string {
    return `radar-grad-${this.id}-${sanitizeId(label)}`;
  }

  // Centered at the shared chart origin (0,0) - unlike polarArea's per-slice gradient, every
  // series here shares the same center, so one radial gradient per series color, spanning to
  // maxRadius, is geometrically consistent across all of them. stop-opacity (not just
  // stop-color) keeps the fill translucent even at the "solid" end, so overlapping series stay
  // legible regardless of gradient vs flat fill.
  private ensureGradient(defs: any, series: RadarSeries, maxRadius: number): string {
    const id = this.gradientId(series.label);
    let grad = defs.select(`#${id}`);
    if (grad.empty()) {
      grad = defs.append('radialGradient').attr('id', id);
      grad.append('stop').attr('class', 'grad-inner');
      grad.append('stop').attr('class', 'grad-outer');
    }
    grad.attr('gradientUnits', 'userSpaceOnUse').attr('cx', 0).attr('cy', 0).attr('r', Math.max(maxRadius, 1));
    grad.select('.grad-inner').attr('offset', '0%').attr('stop-color', series.color).attr('stop-opacity', 0.5);
    grad.select('.grad-outer').attr('offset', '100%').attr('stop-color', lightenHex(series.color, GRADIENT_LIGHTEN_AMOUNT)).attr('stop-opacity', 0.15);
    return `url(#${id})`;
  }

  private baseFill(series: RadarSeries, maxRadius: number, defs: any): string {
    return (this.inject.useGradient ?? true) ? this.ensureGradient(defs, series, maxRadius) : series.color;
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

  private readonly maxCategoryChars = 10;

  private truncateLabel(label: string, maxChars: number = this.maxCategoryChars): string {
    return label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;
  }

  private attachVertexHandlers(selection: any, linkedDashboard: any): void {
    selection
      .on('click', (event: any, d: any) => {
        const category = this.categories[d.point.catIndex];
        if (linkedDashboard) {
          const url = window.location.href.slice(0, window.location.href.indexOf('/dashboard')) +
            `/dashboard/${linkedDashboard.dashboardID}?${linkedDashboard.table}.${linkedDashboard.col}=${category}`;
          window.open(url, '_blank');
        } else {
          this.onClick.emit({
            inx: d.point.catIndex,
            label: category,
            value: d.point.value,
            filterBy: d.series.label
          });
        }
      })
      .on('mouseover', (event: any, d: any) => {
        const target = event.currentTarget;
        d3.select(target)
          .interrupt('grow').transition('grow').duration(150)
          .attr('r', 6)
          .attr('fill', darkenHex(d.series.color, 40));

        const category = this.categories[d.point.catIndex];
        const title = `${this.inject.categoryFieldName ? this.inject.categoryFieldName + ' : ' : ''}${category}`;
        const swatch = `<span class="eda-radar-tooltip-swatch" style="background-color:${d.series.color};"></span>`;
        const multiSeries = this.series.length > 1;
        const seriesPrefix = multiSeries ? `<strong>${d.series.label}</strong> : ` : '';
        let text = `<div class="eda-radar-tooltip-title">${title}</div>` +
          `<div class="eda-radar-tooltip-row">${swatch}${seriesPrefix}${d.point.value.toLocaleString('de-DE', { maximumFractionDigits: 6 })}</div>`;
        if (linkedDashboard) {
          text += `<h6>${$localize`:@@linkedTo:Vinculado con`} ${linkedDashboard.dashboardName}</h6>`;
        }
        this.tooltipService.show(event, text, 'eda-radar-tooltip');
      })
      .on('mousemove', (event: any) => this.tooltipService.move(event))
      .on('mouseout', (event: any, d: any) => {
        d3.select(event.currentTarget)
          .interrupt('grow').transition('grow').duration(150)
          .attr('r', 4)
          .attr('fill', d.series.color);
        this.tooltipService.hide();
      });
  }

  draw(): void {
    const container = this.svgContainer.nativeElement as HTMLElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;

    const n = this.categories.length;
    const linkedDashboard = this.inject.linkedDashboard;
    const visibleSeries = this.series.filter((_, i) => !this.hiddenSeriesIndexes.has(i));
    // Same "stable frame" idea as eda-bar-d3: with nothing visible, keep drawing the grid/labels
    // against the full (unfiltered) data instead of collapsing to an empty/degenerate chart.
    const hasVisibleData = visibleSeries.length > 0 && n > 0;

    const truncatedCats = this.categories.map(c => this.truncateLabel(c));
    const labelMargin = n > 0
      ? Math.min(Math.max(this.measureMaxLabelWidth(truncatedCats, 11) / 2 + 18, 40), Math.min(width, height) * 0.25)
      : 10;
    const maxRadius = Math.max(Math.min(width, height) / 2 - labelMargin, 1);

    const sourceForDomain = hasVisibleData ? visibleSeries : this.series;
    let minValue = 0, maxValue = 0;
    sourceForDomain.forEach(s => s.points.forEach(p => {
      minValue = Math.min(minValue, p.value);
      maxValue = Math.max(maxValue, p.value);
    }));
    if (maxValue === minValue) maxValue = minValue + 1;

    // Linear, not sqrt - unlike polarArea (value = arc AREA), radar encodes value as pure radial
    // POSITION, like a normal axis bent into a circle. .nice(4) matches the ticks(4) hint used
    // for ringValues below, same reasoning as polarArea's domain-rounding fix.
    const radiusScale = d3.scaleLinear().domain([minValue, maxValue]).range([0, maxRadius]).nice(4);

    const lineGen: any = d3.line<{ angle: number; r: number }>()
      .x((d: any) => this.xFor(d.angle, d.r))
      .y((d: any) => this.yFor(d.angle, d.r))
      .curve(d3.curveLinearClosed);

    let defs = this.svg.select('defs');
    if (defs.empty()) defs = this.svg.append('defs');

    // Grid: polygonal (n-sided) rings + radial spokes - a spider chart's rings connect the same
    // radius on each spoke with straight edges, not a smooth circle (matches Chart.js's own
    // RadialLinearScale default of grid.circular:false).
    let gridGroup = this.svg.select('g.radar-grid');
    if (gridGroup.empty()) gridGroup = this.svg.append('g').attr('class', 'radar-grid');
    gridGroup.attr('transform', `translate(${width / 2},${height / 2})`);
    gridGroup.style('display', (this.inject.showGridLines ?? true) ? null : 'none');

    const ringValues = radiusScale.ticks(4).filter((v: number) => v > minValue);
    const domainMax = radiusScale.domain()[1];
    if (domainMax > minValue && !ringValues.includes(domainMax)) ringValues.push(domainMax);

    const spokeData = n > 0 ? d3.range(n) : [];
    const spokes = gridGroup.selectAll('line.radar-grid-spoke').data(spokeData);
    spokes.exit().remove();
    spokes.enter()
      .append('line')
      .attr('class', 'radar-grid-spoke')
      .merge(spokes)
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', (i: number) => this.xFor(this.angleFor(i, n), maxRadius))
      .attr('y2', (i: number) => this.yFor(this.angleFor(i, n), maxRadius));

    const rings = gridGroup.selectAll('path.radar-grid-ring').data(ringValues);
    rings.exit().remove();
    rings.enter()
      .append('path')
      .attr('class', 'radar-grid-ring')
      .merge(rings)
      .attr('fill', 'none')
      .attr('d', (v: number) => this.ringPolygonPath(radiusScale(v), n, lineGen))
      .attr('stroke-opacity', (v: number) => 0.2 + 0.7 * (radiusScale(v) / Math.max(maxRadius, 1)));

    // Ring value labels - own group, rebuilt every draw (same halo-text technique as polarArea).
    // Offset to the gap between spoke 0 and spoke 1 (not straight up) since category 0's own
    // perimeter label already lives at the top.
    let gridLabelsGroup = this.svg.select('g.radar-grid-labels');
    if (gridLabelsGroup.empty()) gridLabelsGroup = this.svg.append('g').attr('class', 'radar-grid-labels');
    gridLabelsGroup.attr('transform', `translate(${width / 2},${height / 2})`);
    gridLabelsGroup.style('display', (this.inject.showGridLines ?? true) ? null : 'none');
    gridLabelsGroup.selectAll('*').remove();
    if (n > 0) {
      const ringLabelAngle = this.angleFor(0, n) + this.angleSlice(n) / 2;
      ringValues.forEach((v: number) => {
        gridLabelsGroup.append('text')
          .attr('class', 'radar-grid-label')
          .attr('x', this.xFor(ringLabelAngle, radiusScale(v)))
          .attr('y', this.yFor(ringLabelAngle, radiusScale(v)))
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .style('font-family', this.fontFamily)
          .style('paint-order', 'stroke')
          .attr('stroke', this.panelBackgroundColor)
          .attr('stroke-width', 3)
          .attr('stroke-linejoin', 'round')
          .text(formatAxisValue(v, 2));
      });
    }

    // Category labels around the perimeter - always shown (unlike today's Chart.js radar, whose
    // pointLabels are transparent/hidden): a spider chart without axis labels is unreadable
    // without hovering every vertex. Not gated by showGridLines - this is axis identity, not grid
    // decoration. Skipped every Nth label when spokes are too close together to fit them all.
    let categoryLabelsGroup = this.svg.select('g.radar-category-labels');
    if (categoryLabelsGroup.empty()) categoryLabelsGroup = this.svg.append('g').attr('class', 'radar-category-labels');
    categoryLabelsGroup.attr('transform', `translate(${width / 2},${height / 2})`);
    categoryLabelsGroup.selectAll('*').remove();
    if (n > 0) {
      const minArcLenPerLabel = 50;
      const arcLen = this.angleSlice(n) * maxRadius;
      const labelSkip = arcLen > 0 ? Math.max(1, Math.ceil(minArcLenPerLabel / arcLen)) : 1;
      const labelRadius = maxRadius + 14;
      this.categories.forEach((cat, i) => {
        if (i % labelSkip !== 0) return;
        const angle = this.angleFor(i, n);
        const cosA = Math.cos(angle), sinA = Math.sin(angle);
        const anchor = Math.abs(cosA) < 0.15 ? 'middle' : (cosA > 0 ? 'start' : 'end');
        const baseline = Math.abs(sinA) < 0.15 ? 'middle' : (sinA > 0 ? 'hanging' : 'baseline');
        categoryLabelsGroup.append('text')
          .attr('class', 'radar-category-label')
          .attr('x', this.xFor(angle, labelRadius))
          .attr('y', this.yFor(angle, labelRadius))
          .attr('text-anchor', anchor)
          .attr('dominant-baseline', baseline)
          .style('font-family', this.fontFamily)
          .style('pointer-events', 'none')
          .text(this.truncateLabel(cat));
      });
    }

    // Series polygons: fill + stroke on ONE path each (unlike polarArea's arcs, a radar polygon
    // never tapers to a point, so a single path can safely carry both without the stroke
    // overwriting itself at some shared vertex).
    let fillGroup = this.svg.select('g.radar-series-fill-group');
    if (fillGroup.empty()) fillGroup = this.svg.append('g').attr('class', 'radar-series-fill-group');
    fillGroup.attr('transform', `translate(${width / 2},${height / 2})`);

    const pathSel = fillGroup.selectAll('path.radar-series-fill')
      .data(visibleSeries, (s: any) => s.label);

    pathSel.exit()
      .transition().duration(500)
      .attrTween('d', (s: RadarSeries) => {
        const start = s._current || s.points.map(() => 0);
        const interpolators = start.map((r0: number) => d3.interpolateNumber(r0, 0));
        return (t: number) => {
          const radii = interpolators.map((fn: any) => fn(t));
          s._current = radii;
          return this.seriesPathAt(radii, n, lineGen);
        };
      })
      .remove();

    const enterPath = pathSel.enter()
      .append('path')
      .attr('class', 'radar-series-fill')
      .style('pointer-events', 'none');
    enterPath.each((s: RadarSeries) => { s._current = s.points.map(() => 0); });

    const mergedPath = enterPath.merge(pathSel);
    mergedPath
      .attr('fill', (s: RadarSeries) => this.baseFill(s, maxRadius, defs))
      .attr('fill-opacity', (s: RadarSeries) => (s.opacity ?? 100) / 100)
      .attr('stroke', (s: RadarSeries) => s.color)
      .attr('stroke-width', 2);

    // No first-render/resize/legend-toggle special-casing (unlike bar's fade+rebuild approach) -
    // every draw() interpolates from wherever each series' _current radii last were. This is what
    // lets hiding a dominant series smoothly rescale the remaining ones instead of snapping.
    mergedPath.transition().duration(this.hasRendered ? 500 : 800)
      .attrTween('d', (s: RadarSeries) => {
        const start = s._current || s.points.map(() => 0);
        const end = s.points.map((p: RadarPoint) => radiusScale(p.value));
        const interpolators = start.map((r0: number, i: number) => d3.interpolateNumber(r0, end[i]));
        return (t: number) => {
          const radii = interpolators.map((fn: any) => fn(t));
          s._current = radii;
          return this.seriesPathAt(radii, n, lineGen);
        };
      })
      .on('end', () => { this.hasRendered = true; });

    // Vertex circles - the actual hover/click/tooltip targets. Polygons overlap, so hovering the
    // fill is ambiguous about which series/category is meant; the fill+stroke path above is
    // pointer-events:none for exactly this reason.
    let vertexGroup = this.svg.select('g.radar-vertex-group');
    if (vertexGroup.empty()) vertexGroup = this.svg.append('g').attr('class', 'radar-vertex-group');
    vertexGroup.attr('transform', `translate(${width / 2},${height / 2})`);

    const vertexData: any[] = [];
    visibleSeries.forEach(s => s.points.forEach(p => vertexData.push({ key: `${s.label}::${p.catIndex}`, series: s, point: p })));

    const vertexSel = vertexGroup.selectAll('circle.radar-vertex')
      .data(vertexData, (d: any) => d.key);

    vertexSel.exit()
      .transition().duration(300)
      .style('opacity', 0)
      .remove();

    const enterVertex = vertexSel.enter()
      .append('circle')
      .attr('class', 'radar-vertex')
      .attr('r', 4)
      .style('cursor', 'pointer')
      .style('opacity', 0);
    this.attachVertexHandlers(enterVertex, linkedDashboard);

    const mergedVertex = enterVertex.merge(vertexSel);
    mergedVertex
      .attr('fill', (d: any) => d.series.color)
      .attr('stroke', this.panelBackgroundColor)
      .attr('stroke-width', 2)
      .style('opacity', 1);

    mergedVertex.transition().duration(this.hasRendered ? 500 : 800)
      .attr('cx', (d: any) => this.xFor(this.angleFor(d.point.catIndex, n), radiusScale(d.point.value)))
      .attr('cy', (d: any) => this.yFor(this.angleFor(d.point.catIndex, n), radiusScale(d.point.value)));

    // Data labels (value/percentage per vertex)
    let valueLabelsGroup = this.svg.select('g.radar-value-labels');
    if (valueLabelsGroup.empty()) valueLabelsGroup = this.svg.append('g').attr('class', 'radar-value-labels');
    valueLabelsGroup.attr('transform', `translate(${width / 2},${height / 2})`);
    valueLabelsGroup.selectAll('*').remove();
    const showLabelsOn = this.inject.showLabels || this.inject.showLabelsPercent;
    if (showLabelsOn) {
      visibleSeries.forEach(s => {
        const seriesTotal = s.points.reduce((sum, p) => sum + p.value, 0);
        s.points.forEach(p => {
          const label = this.formatLabel(p.value, seriesTotal > 0 ? (p.value / seriesTotal) * 100 : 0);
          if (!label) return;
          const angle = this.angleFor(p.catIndex, n);
          const r = radiusScale(p.value) + 10;
          valueLabelsGroup.append('text')
            .attr('class', 'radar-value-label')
            .attr('x', this.xFor(angle, r))
            .attr('y', this.yFor(angle, r))
            .attr('text-anchor', 'middle')
            .style('font-family', this.fontFamily)
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .style('fill', s.color)
            .style('paint-order', 'stroke')
            .attr('stroke', this.panelBackgroundColor)
            .attr('stroke-width', 3)
            .attr('stroke-linejoin', 'round')
            .style('pointer-events', 'none')
            .text(label);
        });
      });
    }
  }
}
