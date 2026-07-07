import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import * as d3 from 'd3';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaDoughnutD3 } from './eda-doughnut';
import { StyleProviderService } from '@eda/services/service.index';
import { EdaChartLegendComponent } from '../eda-chart-legend/eda-chart-legend.component';

interface DoughnutSlice {
  label: string;
  value: number;
  color: string;
  originalIndex: number;
  _current?: { startAngle: number; endAngle: number };
}

const GRADIENT_LIGHTEN_AMOUNT =30;

@Component({
  standalone: true,
  selector: 'eda-doughnut-d3',
  templateUrl: './eda-doughnut.component.html',
  styleUrls: ['./eda-doughnut.component.css'],
  encapsulation: ViewEncapsulation.Emulated,
  imports: [FormsModule, CommonModule, EdaChartLegendComponent]
})
export class EdaDoughnut implements OnInit, AfterViewInit, OnDestroy {
  @Input() inject: EdaDoughnutD3;
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef;

  id: string;
  svg: any;
  resizeObserver!: ResizeObserver;
  div: any = null;

  chartLegend: boolean;
  legendItems: { label: string; color: string; hidden: boolean }[] = [];

  private slices: DoughnutSlice[] = [];
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
    this.id = `doughnut_${this.inject.id}`;
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

  private buildSlices(): void {
    const labels: string[] = this.inject.chartLabels || [];
    const dataset = this.inject.chartDataset?.[0] || { data: [] };
    const values: number[] = dataset.data || [];
    const colors: string[] = dataset.backgroundColor || this.inject.assignedColors?.map(c => c.color) || [];
    const colorByLabel = new Map((this.inject.assignedColors || []).map(c => [c.value, c.color]));

    this.slices = labels.map((rawLabel, i) => {
      // Category values can come back as numbers (e.g. an "Estrato" 1-6 column) - always
      // normalize to string so the keyed D3 join and gradient ids stay consistent across redraws.
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

  // Shifts each hex channel by `amount` (positive lightens, negative darkens), clamped to 0-255.
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
    return `doughnut-grad-${this.id}-${this.sanitizeId(label)}`;
  }

  private baseFill(label: string, color: string): string {
    return this.inject.useGradient ?? true ? `url(#${this.gradientId(label)})` : color;
  }

  private ensureGradient(defs: any, slice: DoughnutSlice, outerRadius: number): string {
    const id = this.gradientId(slice.label);
    let grad = defs.select(`#${id}`);
    if (grad.empty()) {
      grad = defs.append('radialGradient').attr('id', id);
      grad.append('stop').attr('class', 'grad-inner');
      grad.append('stop').attr('class', 'grad-outer');
    }
    grad.attr('gradientUnits', 'userSpaceOnUse').attr('cx', 0).attr('cy', 0).attr('r', outerRadius);
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

  private attachInteractionHandlers(selection: any, seriesLabel: string, linkedDashboard: any, total: number): void {
    // Base fill is always the radial gradient (set on enter / see draw()). Hover only ever swaps
    // in a flat, darker version of the slice's ORIGINAL color computed from `d.data.color`
    // (never from the currently-applied fill), so mouseover/mouseout can't drift or leave a
    // slice referencing a broken gradient url.
    // The "grow" feedback pushes the OUTER radius out (same start/end angle, same inner radius),
    // so the slice only extends outward, never sideways into its neighbors. It runs in its own
    // named transition ('grow'), independent from the 'color' one, so the two never interrupt
    // each other.
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
        // Swap the gradient url for its own flat base color FIRST, instantly (no transition) -
        // a url(#gradient) reference can't be interpolated against a flat color, so trying to
        // transition straight from the gradient would render `fill:none` (blank) for the
        // duration. Since the flat color matches the gradient's inner stop, this instant swap
        // is visually seamless, and now the transition below only ever animates flat color -> flat color.
        d3.select(target).attr('fill', d.data.color);
        d3.select(target)
          .interrupt('color').transition('color').duration(150)
          .attr('fill', this.darkenHex(d.data.color, 60));
        d3.select(target)
          .interrupt('grow').transition('grow').duration(150)
          .attr('d', this.currentHoverArcGen(d));

        const percentage = total > 0 ? (d.data.value / total) * 100 : 0;
        const swatch = `<span class="eda-doughnut-tooltip-swatch" style="background-color:${d.data.color};"></span>`;
        let text = seriesLabel ? `<div class="eda-doughnut-tooltip-title">${seriesLabel}</div>` : '';
        text += `<div class="eda-doughnut-tooltip-row">${swatch}` +
          `<strong>${d.data.label}</strong> : ` +
          `${d.data.value.toLocaleString('de-DE', { maximumFractionDigits: 6 })} - ` +
          `${percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %</div>`;
        if (linkedDashboard) {
          const t = $localize`:@@linkedTo:Vinculado con`;
          text += `<br/><h6>${t} ${linkedDashboard.dashboardName}</h6>`;
        }
        this.div = d3.select('body').append('div')
          .attr('class', 'eda-doughnut-tooltip')
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
        // Same reasoning as mouseover, in reverse: transition flat darker -> flat base color
        // (both real colors, interpolates smoothly), then swap in the gradient url in one
        // instant, un-transitioned step only once the color transition has actually finished.
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
    const outerRadius = Math.max(Math.min(width, height) / 2 - margin, 1);
    // The dialog's slider goes 0-95: 0 = full pie (inner radius hooks to the center, no hole),
    // 95 = the ring collapsed down to a thin line (inner radius 95% of the outer one). Capped at
    // 95 rather than 99 - past that, the ring gets thinner than its own border stroke, so it
    // visually reduces to just the panel-colored border line instead of disappearing outright.
    const innerRadiusUiValue = Math.min(Math.max(this.inject.innerRadiusPercent ?? 95, 0), 95);
    const innerRadiusRatio = innerRadiusUiValue / 100;
    const innerRadius = outerRadius * innerRadiusRatio;
    const strokeWidth = 2;
    const arcGen: any = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
    const hoverArcGen: any = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius + 8);
    this.currentArcGen = arcGen;
    this.currentHoverArcGen = hoverArcGen;

    let defs = this.svg.select('defs');
    if (defs.empty()) {
      defs = this.svg.append('defs');
    }

    let g = this.svg.select('g.doughnut-arcs');
    if (g.empty()) {
      g = this.svg.append('g').attr('class', 'doughnut-arcs');
    }
    g.attr('transform', `translate(${width / 2},${height / 2})`);

    const total = this.slices.reduce((sum, s) => sum + s.value, 0);
    const visibleSlices = this.slices.filter((_, i) => !this.hiddenIndexes.has(i));
    // Keep every slice's gradient definition (not just the visible ones) so a slice re-shown
    // from the legend already has its gradient ready, and so the gradient radius stays in sync on resize.
    this.slices.forEach(slice => this.ensureGradient(defs, slice, outerRadius));

    const pie: any = d3.pie().value((d: any) => d.value).sort(null);
    const arcs = pie(visibleSlices);

    const showLabelsOn = this.inject.showLabels || this.inject.showLabelsPercent;
    const labelThreshold = width < 200 ? 8 : 3;
    const linkedDashboard = this.inject.linkedDashboard;
    const seriesLabel = this.inject.chartDataset?.[0]?.label || '';

    const path = g.selectAll('path.doughnut-arc')
      .data(arcs, (d: any) => String(d.data.label));

    // EXIT: slice hidden from the legend - shrink it back to zero width, then remove
    path.exit()
      .transition().duration(500)
      .attrTween('d', (d: any) => {
        const current = d.data._current || { startAngle: d.startAngle, endAngle: d.endAngle };
        const startInterpolate = d3.interpolate(current.startAngle, current.startAngle);
        const endInterpolate = d3.interpolate(current.endAngle, current.startAngle);
        return (t: number) => {
          const interpolated = { startAngle: startInterpolate(t), endAngle: endInterpolate(t) };
          d.data._current = interpolated;
          return arcGen(interpolated);
        };
      })
      .remove();

    // ENTER: brand new slice, or a slice re-shown from the legend
    const enter = path.enter()
      .append('path')
      .attr('class', 'doughnut-arc')
      .attr('fill', (d: any) => this.baseFill(d.data.label, d.data.color))
      .attr('stroke', this.panelBackgroundColor)
      .style('cursor', 'pointer');
    enter.each((d: any) => {
      d.data._current = { startAngle: d.startAngle, endAngle: d.startAngle };
    });
    this.attachInteractionHandlers(enter, seriesLabel, linkedDashboard, total);

    const merged = enter.merge(path);
    // Applied every draw (not just on enter) since the same <path> elements are reused across
    // slider drags - only the innerRadius/strokeWidth pairing changes, not the slice keys.
    merged.attr('stroke-width', strokeWidth);

    if (!this.hasRendered) {
      // First render: radial sweep, like a clock hand painting the doughnut clockwise from the top
      merged.transition().duration(2000)
        .attrTween('d', (d: any) => (t: number) => {
          const sweep = t * 2 * Math.PI;
          const scaledArc: any = d3.arc().innerRadius(innerRadius * t).outerRadius(outerRadius * t);
          const current = {
            startAngle: Math.min(d.startAngle, sweep),
            endAngle: Math.min(d.endAngle, sweep)
          };
          d.data._current = { startAngle: d.startAngle, endAngle: d.endAngle };
          return scaledArc(current);
        })
        .on('end', () => { this.hasRendered = true; });
    } else {
      // Subsequent redraws (legend toggle, resize): smoothly interpolate from the last known angle.
      // NOTE: interpolate the two angle numbers directly - never hand d3.interpolate() the full
      // pie datum `d`, since `d.data` is the same slice object we stash `_current` onto below;
      // passing `d` in would make `_current` hold a reference back to its own slice, and the next
      // toggle's interpolateObject would then recurse into that cycle forever (stack overflow).
      merged.transition().duration(500)
        .attrTween('d', (d: any) => {
          const current = d.data._current || { startAngle: d.startAngle, endAngle: d.startAngle };
          const startInterpolate = d3.interpolate(current.startAngle, d.startAngle);
          const endInterpolate = d3.interpolate(current.endAngle, d.endAngle);
          return (t: number) => {
            const interpolated = { startAngle: startInterpolate(t), endAngle: endInterpolate(t) };
            d.data._current = interpolated;
            return arcGen(interpolated);
          };
        });
    }

    g.selectAll('g.doughnut-label').remove();
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

      const labelGroups = g.selectAll('g.doughnut-label')
        .data(visibleLabelArcs, (d: any) => String(d.data.label))
        .join('g')
        .attr('class', 'doughnut-label')
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
