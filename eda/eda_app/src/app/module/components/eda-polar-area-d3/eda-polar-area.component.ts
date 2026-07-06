import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import * as d3 from 'd3';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaPolarArea } from './eda-polar-area';
import { StyleProviderService } from '@eda/services/service.index';

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
  imports: [FormsModule, CommonModule]
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
  legendFontSize: string;
  legendBoxSize: string;

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

  constructor(private styleProviderService: StyleProviderService) { }

  ngOnInit(): void {
    this.id = `polarArea_${this.inject.id}`;
    this.chartLegend = this.inject.chartLegend ?? true;
    this.styleProviderService.panelFontFamily.subscribe(v => this.fontFamily = v).unsubscribe();
    this.styleProviderService.panelColor.subscribe(v => this.panelBackgroundColor = v || '#ffffff').unsubscribe();
    this.buildSlices();
    this.updateLegendSizing();
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

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateLegendSizing();
  }

  private updateLegendSizing(): void {
    let variador = 0;
    if (window.innerWidth < 1500) variador = -2;
    if (window.innerWidth < 1100) variador = -4;
    const manySeries = this.slices.length > 10;
    this.legendFontSize = '14px';
    this.legendBoxSize = `${(manySeries ? 8 : 10) + variador}px`;
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
    // Radius (not angle) encodes value here - every slice gets an equal angular slot
    // (d3.pie().value(() => 1) below), and its length along that slot is scaled from
    // 0 up to maxRadius by the largest value across ALL slices (not just visible ones,
    // so hiding one via the legend doesn't rescale the rest). Uses sqrt, not linear, so
    // the perceived AREA of a slice is proportional to its value (area grows with r²) -
    // the standard convention for rose/Nightingale charts.
    const maxValue = d3.max(this.slices, (s: PolarAreaSlice) => s.value) || 1;
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

    const ringLabels = gridGroup.selectAll('text.polar-area-grid-label').data(ringValues);
    ringLabels.exit().remove();
    ringLabels.enter()
      .append('text')
      .attr('class', 'polar-area-grid-label')
      .merge(ringLabels)
      .attr('y', (v: number) => -radiusScale(v))
      .attr('dy', '-3')
      .style('font-family', this.fontFamily)
      .text((v: number) => v.toLocaleString('de-DE', { maximumFractionDigits: 2 }));

    let g = this.svg.select('g.polar-area-arcs');
    if (g.empty()) {
      g = this.svg.append('g').attr('class', 'polar-area-arcs');
    }
    g.attr('transform', `translate(${width / 2},${height / 2})`);

    const total = this.slices.reduce((sum, s) => sum + s.value, 0);
    const visibleSlices = this.slices.filter((_, i) => !this.hiddenIndexes.has(i));
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
      .attr('stroke', this.panelBackgroundColor)
      .attr('stroke-width', 2)
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

    g.selectAll('text.polar-area-label').remove();
    if (showLabelsOn) {
      g.selectAll('text.polar-area-label')
        .data(arcs)
        .join('text')
        .attr('class', 'polar-area-label')
        .attr('transform', (d: any) => `translate(${arcGen.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('font-family', this.fontFamily)
        .style('fill', 'white')
        .style('pointer-events', 'none')
        .text((d: any) => {
          const percentage = total > 0 ? (d.data.value / total) * 100 : 0;
          if (percentage <= labelThreshold) return '';
          return this.formatLabel(d.data.value, percentage);
        });
    }
  }
}
