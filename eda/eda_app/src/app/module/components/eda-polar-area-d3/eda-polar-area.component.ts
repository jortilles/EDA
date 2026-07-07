import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import * as d3 from 'd3';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaPolarArea } from './eda-polar-area';
import { StyleProviderService } from '@eda/services/service.index';
import { EdaChartLegendComponent } from '../eda-chart-legend/eda-chart-legend.component';

interface PolarAreaSlice {
  label: string;
  value: number;
  color: string;
  originalIndex: number;
  _current?: { startAngle: number; endAngle: number; radius: number };
}

const GRADIENT_LIGHTEN_AMOUNT = 30;

@Component({
  standalone: true,
  selector: 'eda-polar-area-d3',
  templateUrl: './eda-polar-area.component.html',
  styleUrls: ['./eda-polar-area.component.css'],
  encapsulation: ViewEncapsulation.Emulated,
  imports: [FormsModule, CommonModule, EdaChartLegendComponent]
})
export class EdaPolarAreaComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() inject: EdaPolarArea;
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef;

  id: string;
  svg: any;
  resizeObserver!: ResizeObserver;
  div: any = null;

  chartLegend: boolean;
  legendItems: { label: string; color: string; hidden: boolean }[] = [];

  private slices: PolarAreaSlice[] = [];
  private hiddenIndexes: Set<number> = new Set();
  private hasRendered = false;
  private fontFamily = 'inherit';
  private panelBackgroundColor = '#ffffff';
  // Always kept up to date by draw() (every call, including resize-triggered ones). The
  // mouseover/mouseout handlers below read these live instead of closing over the arc
  // generators from whenever the slice's <path> first entered the DOM - otherwise, after a
  // panel resize, existing (non-entering) slices would keep hovering at their pre-resize size.
  private currentArcGen: any;
  private currentHoverArcGen: any;
  // The <g> holding the value-label groups, so mouseover/mouseout can find and scale the label
  // matching the hovered slice (kept live/up-to-date the same way as the arc generators above).
  private currentLabelsContainer: any;

  constructor(private styleProviderService: StyleProviderService) { }

  ngOnInit(): void {
    this.id = `polarArea_${this.inject.id}`;
    this.chartLegend = this.inject.chartLegend ?? true;
    this.styleProviderService.panelFontFamily.subscribe(v => this.fontFamily = v).unsubscribe();
    this.styleProviderService.panelColor.subscribe(v => this.panelBackgroundColor = v || '#ffffff').unsubscribe();
    this.buildSlices();
  }

  ngOnDestroy(): void {
    if (this.div) this.div.remove();
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

  /** Abbreviates large axis values (3.000.000 -> 3M) so the grid ring labels stay readable in a small chart. */
  private formatAxisValue(v: number): string {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return (v / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + 'M';
    if (abs >= 1_000) return (v / 1_000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + 'k';
    return v.toLocaleString('de-DE', { maximumFractionDigits: 2 });
  }

  private buildSlices(): void {
    const labels: string[] = this.inject.chartLabels || [];
    const dataset = this.inject.chartDataset?.[0] || { data: [] };
    const values: number[] = dataset.data || [];
    const colors: string[] = dataset.backgroundColor || this.inject.assignedColors?.map(c => c.color) || [];
    const colorByLabel = new Map((this.inject.assignedColors || []).map(c => [c.value, c.color]));

    this.slices = labels.map((rawLabel, i) => {
      const label = String(rawLabel);
      return {
        label,
        value: Number(values[i]) || 0,
        color: colors[i] || colorByLabel.get(rawLabel) || colorByLabel.get(label) || '#cccccc',
        originalIndex: i
      };
    });

    this.legendItems = this.slices.map((s, i) => ({
      label: s.label,
      color: s.color,
      hidden: this.hiddenIndexes.has(i)
    }));
  }

  toggleLegend(index: number): void {
    if (this.hiddenIndexes.has(index)) {
      this.hiddenIndexes.delete(index);
    } else {
      this.hiddenIndexes.add(index);
    }
    this.legendItems[index].hidden = this.hiddenIndexes.has(index);
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

  private shiftHex(hex: string, amount: number): string {
    const match = /^#?([0-9a-fA-F]{6})$/.exec(hex || '');
    if (!match) return hex;
    const num = parseInt(match[1], 16);
    const clamp = (c: number) => Math.min(255, Math.max(0, c));
    const r = clamp(((num >> 16) & 0xff) + amount);
    const g = clamp(((num >> 8) & 0xff) + amount);
    const b = clamp((num & 0xff) + amount);
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  private lightenHex(hex: string, amount: number): string {
    return this.shiftHex(hex, amount);
  }

  private darkenHex(hex: string, amount: number): string {
    return this.shiftHex(hex, -amount);
  }

  private sanitizeId(value: string): string {
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private gradientId(label: string): string {
    return `polarArea-grad-${this.id}-${this.sanitizeId(label)}`;
  }

  private baseFill(label: string, color: string): string {
    return this.inject.useGradient ?? true ? `url(#${this.gradientId(label)})` : color;
  }

  // Unlike the doughnut (a shared outer radius for every slice), each polar-area slice has
  // its own outer radius driven by its value, so the gradient's spread radius is per-slice too.
  private ensureGradient(defs: any, slice: PolarAreaSlice, radius: number): string {
    const id = this.gradientId(slice.label);
    let grad = defs.select(`#${id}`);
    if (grad.empty()) {
      grad = defs.append('radialGradient').attr('id', id);
      grad.append('stop').attr('class', 'grad-inner');
      grad.append('stop').attr('class', 'grad-outer');
    }
    grad.attr('gradientUnits', 'userSpaceOnUse').attr('cx', 0).attr('cy', 0).attr('r', Math.max(radius, 1));
    grad.select('.grad-inner').attr('offset', '0%').attr('stop-color', slice.color);
    grad.select('.grad-outer').attr('offset', '100%').attr('stop-color', this.lightenHex(slice.color, GRADIENT_LIGHTEN_AMOUNT));
    return `url(#${id})`;
  }

  private removeTooltip(): void {
    if (this.div) {
      this.div.remove();
      this.div = null;
    }
  }

  // Builds the path for one arc at a specific (startAngle, endAngle, radius) - used by the
  // enter/update/exit tweens below, which interpolate all three at once (a plain d3.arc()
  // can't do this directly here since its outerRadius is a per-datum function, not a constant).
  private arcPathAt(startAngle: number, endAngle: number, radius: number): string {
    return d3.arc().innerRadius(0).outerRadius(Math.max(radius, 0))({ startAngle, endAngle } as any);
  }

  private attachInteractionHandlers(selection: any, seriesLabel: string, linkedDashboard: any, total: number): void {
    selection
      .on('click', (event: any, d: any) => {
        if (linkedDashboard) {
          const url = window.location.href.slice(0, window.location.href.indexOf('/dashboard')) +
            `/dashboard/${linkedDashboard.dashboardID}?${linkedDashboard.table}.${linkedDashboard.col}=${d.data.label}`;
          window.open(url, '_blank');
        } else {
          this.onClick.emit({
            inx: d.data.originalIndex,
            label: d.data.label,
            value: d.data.value,
            filterBy: seriesLabel
          });
        }
      })
      .on('mouseover', (event: any, d: any) => {
        const target = event.currentTarget;
        d3.select(target).attr('fill', d.data.color);
        d3.select(target)
          .interrupt('color').transition('color').duration(150)
          .attr('fill', this.darkenHex(d.data.color, 60));
        d3.select(target)
          .interrupt('grow').transition('grow').duration(150)
          .attr('d', this.currentHoverArcGen(d));

        if (this.currentLabelsContainer) {
          this.currentLabelsContainer.selectAll('g.polar-area-label')
            .filter((ld: any) => ld.data.label === d.data.label)
            .interrupt('labelScale').transition('labelScale').duration(150)
            .attr('transform', `translate(${this.currentHoverArcGen.centroid(d)}) scale(1.25)`);
        }

        const percentage = total > 0 ? (d.data.value / total) * 100 : 0;
        const swatch = `<span class="eda-polar-area-tooltip-swatch" style="background-color:${d.data.color};"></span>`;
        let text = seriesLabel ? `<div class="eda-polar-area-tooltip-title">${seriesLabel}</div>` : '';
        text += `<div class="eda-polar-area-tooltip-row">${swatch}` +
          `<strong>${d.data.label}</strong> : ` +
          `${d.data.value.toLocaleString('de-DE', { maximumFractionDigits: 6 })} - ` +
          `${percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %</div>`;
        if (linkedDashboard) {
          const t = $localize`:@@linkedTo:Vinculado con`;
          text += `<br/><h6>${t} ${linkedDashboard.dashboardName}</h6>`;
        }
        this.div = d3.select('body').append('div')
          .attr('class', 'eda-polar-area-tooltip')
          .style('opacity', 0)
          .style('z-index', 9999);
        this.div.transition().duration(200).style('opacity', 0.9);
        this.div.html(text)
          .style('left', (event.pageX - 81) + 'px')
          .style('top', (event.pageY - 25) + 'px');
      })
      .on('mousemove', (event: any) => {
        if (this.div) {
          this.div.style('top', (event.pageY - 60) + 'px')
            .style('left', (event.pageX - 0) + 'px');
        }
      })
      .on('mouseout', (event: any, d: any) => {
        const target = event.currentTarget;
        d3.select(target)
          .interrupt('color').transition('color').duration(150)
          .attr('fill', d.data.color)
          .on('end', () => {
            d3.select(target).attr('fill', this.baseFill(d.data.label, d.data.color));
          });
        d3.select(target)
          .interrupt('grow').transition('grow').duration(150)
          .attr('d', this.currentArcGen(d));

        if (this.currentLabelsContainer) {
          this.currentLabelsContainer.selectAll('g.polar-area-label')
            .filter((ld: any) => ld.data.label === d.data.label)
            .interrupt('labelScale').transition('labelScale').duration(150)
            .attr('transform', `translate(${this.currentArcGen.centroid(d)}) scale(1)`);
        }
        this.removeTooltip();
      });
  }

  draw(): void {
    const container = this.svgContainer.nativeElement as HTMLElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;

    const margin = 10;
    const maxRadius = Math.max(Math.min(width, height) / 2 - margin, 1);
    const visibleSlices = this.slices.filter((_, i) => !this.hiddenIndexes.has(i));
    // Radius (not angle) encodes value here - every slice gets an equal angular slot
    // (d3.pie().value(() => 1) below), and its length along that slot is scaled from 0 up to
    // maxRadius by the largest value among the VISIBLE slices - so hiding a dominant series
    // lets the rest rescale and fill the available radius instead of staying tiny relative to
    // a hidden outlier. Uses sqrt, not linear, so the perceived AREA of a slice is proportional
    // to its value (area grows with r²) - the standard convention for rose/Nightingale charts.
    const maxValue = d3.max(visibleSlices, (s: PolarAreaSlice) => s.value) || 1;
    const radiusScale = d3.scaleSqrt().domain([0, maxValue]).range([0, maxRadius]);

    const arcGen: any = d3.arc().innerRadius(0).outerRadius((d: any) => radiusScale(d.data.value));
    const hoverArcGen: any = d3.arc().innerRadius(0).outerRadius((d: any) => radiusScale(d.data.value) + 8);
    this.currentArcGen = arcGen;
    this.currentHoverArcGen = hoverArcGen;

    let defs = this.svg.select('defs');
    if (defs.empty()) {
      defs = this.svg.append('defs');
    }

    // Radial guide lines (created before the arcs group so they always paint underneath it).
    let gridGroup = this.svg.select('g.polar-area-grid');
    if (gridGroup.empty()) {
      gridGroup = this.svg.append('g').attr('class', 'polar-area-grid');
    }
    gridGroup.attr('transform', `translate(${width / 2},${height / 2})`);
    gridGroup.style('display', (this.inject.showGridLines ?? true) ? null : 'none');

    const ringValues = radiusScale.ticks(4).filter((v: number) => v > 0);
    const rings = gridGroup.selectAll('circle.polar-area-grid-ring').data(ringValues);
    rings.exit().remove();
    rings.enter()
      .append('circle')
      .attr('class', 'polar-area-grid-ring')
      .merge(rings)
      .attr('r', (v: number) => radiusScale(v));

    let g = this.svg.select('g.polar-area-arcs');
    if (g.empty()) {
      g = this.svg.append('g').attr('class', 'polar-area-arcs');
    }
    g.attr('transform', `translate(${width / 2},${height / 2})`);
    this.currentLabelsContainer = g;

    // Ring value labels get their own overlay, appended (once) AFTER the arcs group so they
    // always paint on top of it - otherwise a slice reaching past a ring visually covered its
    // label. Each label also gets a backdrop pill matching the panel background, so legibility
    // doesn't depend on which slice color happens to sit behind it (mirrors Chart.js's
    // ticks.backdropColor for the same 'r' scale).
    let gridLabelsGroup = this.svg.select('g.polar-area-grid-labels');
    if (gridLabelsGroup.empty()) {
      gridLabelsGroup = this.svg.append('g').attr('class', 'polar-area-grid-labels');
    }
    gridLabelsGroup.attr('transform', `translate(${width / 2},${height / 2})`);
    gridLabelsGroup.style('display', (this.inject.showGridLines ?? true) ? null : 'none');
    gridLabelsGroup.selectAll('*').remove();
    ringValues.forEach((v: number) => {
      const labelGroup = gridLabelsGroup.append('g')
        .attr('class', 'polar-area-grid-label-group')
        .attr('transform', `translate(0,${-radiusScale(v)})`);
      const textEl = labelGroup.append('text')
        .attr('class', 'polar-area-grid-label')
        .attr('text-anchor', 'middle')
        .attr('dy', '-3')
        .style('font-family', this.fontFamily)
        .text(this.formatAxisValue(v));
      const bbox = (textEl.node() as SVGTextElement).getBBox();
      const paddingX = 4, paddingY = 2;
      labelGroup.insert('rect', 'text')
        .attr('x', bbox.x - paddingX)
        .attr('y', bbox.y - paddingY)
        .attr('width', bbox.width + paddingX * 2)
        .attr('height', bbox.height + paddingY * 2)
        .attr('rx', 3)
        .attr('fill', this.panelBackgroundColor);
    });

    const total = this.slices.reduce((sum, s) => sum + s.value, 0);
    this.slices.forEach(slice => this.ensureGradient(defs, slice, radiusScale(slice.value)));

    const pie: any = d3.pie().value(() => 1).sort(null);
    const arcs = pie(visibleSlices);

    const showLabelsOn = this.inject.showLabels || this.inject.showLabelsPercent;
    const labelThreshold = width < 200 ? 8 : 3;
    const linkedDashboard = this.inject.linkedDashboard;
    const seriesLabel = this.inject.chartDataset?.[0]?.label || '';

    const path = g.selectAll('path.polar-area-arc')
      .data(arcs, (d: any) => String(d.data.label));

    // EXIT: slice hidden from the legend - collapse its radius and angle, then remove
    path.exit()
      .transition().duration(500)
      .attrTween('d', (d: any) => {
        const current = d.data._current || { startAngle: d.startAngle, endAngle: d.endAngle, radius: radiusScale(d.data.value) };
        const startI = d3.interpolate(current.startAngle, current.startAngle);
        const endI = d3.interpolate(current.endAngle, current.startAngle);
        const radiusI = d3.interpolate(current.radius, 0);
        return (t: number) => {
          const interpolated = { startAngle: startI(t), endAngle: endI(t), radius: radiusI(t) };
          d.data._current = interpolated;
          return this.arcPathAt(interpolated.startAngle, interpolated.endAngle, interpolated.radius);
        };
      })
      .remove();

    // ENTER: brand new slice, or a slice re-shown from the legend - grows out from the center
    const enter = path.enter()
      .append('path')
      .attr('class', 'polar-area-arc')
      .attr('fill', (d: any) => this.baseFill(d.data.label, d.data.color))
      // Unlike the doughnut (a fixed-width ring), every wedge here narrows to a single point at
      // the center - a stroke around the whole outline (including the two straight radial edges)
      // would always overwrite the fill near that point with the border color, since the wedge's
      // local width shrinks below the stroke width right where they should all meet cleanly.
      .style('cursor', 'pointer');
    enter.each((d: any) => {
      d.data._current = { startAngle: d.startAngle, endAngle: d.endAngle, radius: 0 };
    });
    this.attachInteractionHandlers(enter, seriesLabel, linkedDashboard, total);

    const merged = enter.merge(path);

    // Equal-angle slots mean the angles themselves only shift when the number of visible
    // slices changes (legend toggle) - the radius is what animates on first render.
    merged.transition().duration(this.hasRendered ? 500 : 800)
      .attrTween('d', (d: any) => {
        const current = d.data._current || { startAngle: d.startAngle, endAngle: d.endAngle, radius: 0 };
        const startI = d3.interpolate(current.startAngle, d.startAngle);
        const endI = d3.interpolate(current.endAngle, d.endAngle);
        const radiusI = d3.interpolate(current.radius, radiusScale(d.data.value));
        return (t: number) => {
          const interpolated = { startAngle: startI(t), endAngle: endI(t), radius: radiusI(t) };
          d.data._current = interpolated;
          return this.arcPathAt(interpolated.startAngle, interpolated.endAngle, interpolated.radius);
        };
      })
      .on('end', () => { this.hasRendered = true; });

    g.selectAll('g.polar-area-label').remove();
    if (showLabelsOn) {
      // Mirrors the Chart.js datalabels config for doughnut/polarArea: a pill-shaped badge
      // (backgroundColor = the slice's own color, white border, borderRadius bigger than half
      // the box height so it always renders as a full capsule) rather than plain floating text.
      // SVG has no auto-sizing background, so text is measured via getBBox() first, then a
      // <rect> is inserted behind it sized to the measured box + padding.
      const visibleLabelArcs = arcs.filter((d: any) => {
        const percentage = total > 0 ? (d.data.value / total) * 100 : 0;
        return percentage > labelThreshold;
      });

      const labelGroups = g.selectAll('g.polar-area-label')
        .data(visibleLabelArcs, (d: any) => String(d.data.label))
        .join('g')
        .attr('class', 'polar-area-label')
        .attr('transform', (d: any) => `translate(${arcGen.centroid(d)})`)
        .style('pointer-events', 'none');

      labelGroups.each((d: any, i: number, nodes: any) => {
        const group = d3.select(nodes[i] as SVGGElement);
        group.selectAll('*').remove();
        const percentage = total > 0 ? (d.data.value / total) * 100 : 0;
        const textEl = group.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .style('font-size', '12px')
          .style('font-weight', 'bold')
          .style('font-family', this.fontFamily)
          .style('fill', 'white')
          .text(this.formatLabel(d.data.value, percentage));
        const bbox = (textEl.node() as SVGTextElement).getBBox();
        const paddingX = 8, paddingY = 4;
        group.insert('rect', 'text')
          .attr('x', bbox.x - paddingX)
          .attr('y', bbox.y - paddingY)
          .attr('width', bbox.width + paddingX * 2)
          .attr('height', bbox.height + paddingY * 2)
          .attr('rx', (bbox.height + paddingY * 2) / 2)
          .attr('fill', d.data.color)
          .attr('stroke', 'white')
          .attr('stroke-width', 2);
      });
    }
  }
}
