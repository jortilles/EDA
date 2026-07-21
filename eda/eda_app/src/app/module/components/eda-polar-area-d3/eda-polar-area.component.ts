import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import * as d3 from 'd3';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaPolarArea } from './eda-polar-area';
import { StyleProviderService, D3TooltipService, lightenHex, darkenHex, sanitizeId, formatAxisValue, ensureRadialGradient, formatValueLabel, initD3ResizeObserver, teardownD3Chart } from '@eda/services/service.index';
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

  constructor(private styleProviderService: StyleProviderService, private tooltipService: D3TooltipService) { }

  ngOnInit(): void {
    this.id = `polarArea_${this.inject.id}`;
    this.chartLegend = this.inject.chartLegend ?? true;
    this.styleProviderService.panelFontFamily.subscribe(v => this.fontFamily = v).unsubscribe();
    this.styleProviderService.panelColor.subscribe(v => this.panelBackgroundColor = v || '#ffffff').unsubscribe();
    this.buildSlices();
  }

  ngOnDestroy(): void {
    teardownD3Chart(this.tooltipService, this.resizeObserver);
  }

  ngAfterViewInit(): void {
    const container = this.svgContainer.nativeElement as HTMLElement;
    if (!this.svg) this.svg = d3.select(container).append('svg');
    this.resizeObserver = initD3ResizeObserver(container, this.svg, () => this.draw(), { skipFirstCallback: true });
  }

  private buildSlices(): void {
    const labels: string[] = this.inject.chartLabels || [];
    const dataset = this.inject.chartDataset?.[0] || { data: [] };
    const values: number[] = dataset.data || [];
    const colorByLabel = new Map((this.inject.assignedColors || []).map(c => [c.value, c.color]));

    this.slices = labels.map((rawLabel, i) => {
      const label = String(rawLabel);
      return {
        label,
        value: Number(values[i]) || 0,
        color: colorByLabel.get(rawLabel) || colorByLabel.get(label) || '#cccccc',
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

  private gradientId(label: string): string {
    return `polarArea-grad-${this.id}-${sanitizeId(label)}`;
  }

  private baseFill(label: string, color: string): string {
    return this.inject.useGradient ?? true ? `url(#${this.gradientId(label)})` : color;
  }

  // Unlike the doughnut (a shared outer radius for every slice), each polar-area slice has
  // its own outer radius driven by its value, so the gradient's spread radius is per-slice too.
  private ensureGradient(defs: any, slice: PolarAreaSlice, radius: number): string {
    return ensureRadialGradient(defs, this.gradientId(slice.label), [
      { offset: '0%', color: slice.color },
      { offset: '100%', color: lightenHex(slice.color, GRADIENT_LIGHTEN_AMOUNT) }
    ], { cx: 0, cy: 0, r: Math.max(radius, 1) });
  }

  // One reusable arc generator (outerRadius reads d.radius) for the enter/update/exit tweens below,
  // which interpolate startAngle/endAngle/radius all at once per frame - reused across calls
  // instead of constructing a new d3.arc() on every animation frame for every slice.
  private tweenArcGen: any = d3.arc().innerRadius(0).outerRadius((d: any) => Math.max(d.radius, 0));

  private arcPathAt(startAngle: number, endAngle: number, radius: number): string {
    return this.tweenArcGen({ startAngle, endAngle, radius } as any);
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
          .attr('fill', darkenHex(d.data.color, 60));
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
        // seriesLabel here is the CATEGORY field's own name (e.g. "City" - see
        // chart-utils.service.ts's transformDataQuery, which sets it from
        // dataDescription.otherColumns[0].name), not a metric name - pairing it with the slice's
        // own label ("City : ST Cloud") matches how treemap/bubblechart/scatter build their title.
        const title = seriesLabel ? `${seriesLabel} : ${d.data.label}` : d.data.label;
        let text = `<div class="eda-polar-area-tooltip-title">${title}</div>`;
        text += `<div class="eda-polar-area-tooltip-row">${swatch}` +
          `${d.data.value.toLocaleString('de-DE', { maximumFractionDigits: 6 })} - ` +
          `${percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %</div>`;
        if (linkedDashboard) {
          const t = $localize`:@@linkedTo:Vinculado con`;
          text += `<h6>${t} ${linkedDashboard.dashboardName}</h6>`;
        }
        this.tooltipService.show(event, text, 'eda-polar-area-tooltip');
      })
      .on('mousemove', (event: any) => this.tooltipService.move(event))
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
        this.tooltipService.hide();
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
    // .nice(4) rounds the domain max up (e.g. 510,500 -> 600,000) so the outermost grid ring lands
    // on a round number that actually CONTAINS the largest slice, instead of the ring stopping at
    // a "nice" tick below the true max and the slice visibly poking out past it. The "4" must match
    // the tick count used for ringValues below (ticks(4)) - .nice() with no argument uses its own
    // default count (10) and rounds to a DIFFERENT step, so the "niced" max (e.g. 550,000) can land
    // off the ticks(4) step sequence (100k, 200k...) instead of on its true next value (600,000).
    const radiusScale = d3.scaleSqrt().domain([0, maxValue]).range([0, maxRadius]).nice(4);

    const arcGen: any = d3.arc().innerRadius(0).outerRadius((d: any) => radiusScale(d.data.value));
    const hoverArcGen: any = d3.arc().innerRadius(0).outerRadius((d: any) => radiusScale(d.data.value) + 8);
    this.currentArcGen = arcGen;
    this.currentHoverArcGen = hoverArcGen;

    let defs = this.svg.select('defs');
    if (defs.empty()) {
      defs = this.svg.append('defs');
    }

    const shadowFilterId = `polar-area-shadow-${this.id}`;
    if (defs.select(`#${shadowFilterId}`).empty()) {
      defs.append('filter')
        .attr('id', shadowFilterId)
        .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
        .append('feDropShadow')
        .attr('dx', 0).attr('dy', 2).attr('stdDeviation', 2.5)
        .attr('flood-color', '#000000').attr('flood-opacity', 0.25);
    }

    // Radial guide lines (created before the arcs group so they always paint underneath it).
    let gridGroup = this.svg.select('g.polar-area-grid');
    if (gridGroup.empty()) {
      gridGroup = this.svg.append('g').attr('class', 'polar-area-grid');
    }
    gridGroup.attr('transform', `translate(${width / 2},${height / 2})`);
    gridGroup.style('display', (this.inject.showGridLines ?? true) ? null : 'none');

    // radiusScale.ticks(4) is only a hint - it rounds to whatever "nice" step fits the domain,
    // which often doesn't land exactly on the domain's own (already niced) max - leaving the
    // outermost ring, right at the chart's actual boundary, without a line of its own. Force it
    // in explicitly so the boundary always gets a ring, regardless of what the auto-ticks picked.
    const ringValues = radiusScale.ticks(4).filter((v: number) => v > 0);
    const domainMax = radiusScale.domain()[1];
    if (domainMax > 0 && !ringValues.includes(domainMax)) ringValues.push(domainMax);
    const rings = gridGroup.selectAll('circle.polar-area-grid-ring').data(ringValues);
    rings.exit().remove();
    rings.enter()
      .append('circle')
      .attr('class', 'polar-area-grid-ring')
      .merge(rings)
      .attr('r', (v: number) => radiusScale(v))
      // Radial fade: rings closer to the center (where the wedges are densest) are more
      // recessive, while the outermost ring reads as the chart's actual boundary.
      .attr('stroke-opacity', (v: number) => 0.2 + 0.7 * (radiusScale(v) / maxRadius));

    let g = this.svg.select('g.polar-area-arcs');
    if (g.empty()) {
      g = this.svg.append('g').attr('class', 'polar-area-arcs');
    }
    g.attr('transform', `translate(${width / 2},${height / 2})`);
    this.currentLabelsContainer = g;

    // Ring value labels get their own overlay, appended (once) AFTER the arcs group so they
    // always paint on top of it - otherwise a slice (or a guide line) crossing behind a label
    // made the number unreadable. Instead of a boxy backdrop, each label gets a text "halo": a
    // thick stroke in the panel's own background color drawn BEHIND the fill (paint-order:
    // stroke), the same technique cartography uses for labels over a variable background -
    // legible without a visible rectangle competing with the chart's circular guides.
    let gridLabelsGroup = this.svg.select('g.polar-area-grid-labels');
    if (gridLabelsGroup.empty()) {
      gridLabelsGroup = this.svg.append('g').attr('class', 'polar-area-grid-labels');
    }
    gridLabelsGroup.attr('transform', `translate(${width / 2},${height / 2})`);
    gridLabelsGroup.style('display', (this.inject.showGridLines ?? true) ? null : 'none');
    gridLabelsGroup.selectAll('*').remove();
    ringValues.forEach((v: number) => {
      gridLabelsGroup.append('text')
        .attr('class', 'polar-area-grid-label')
        .attr('transform', `translate(0,${-radiusScale(v)})`)
        .attr('text-anchor', 'middle')
        .attr('dy', '-3')
        .style('font-family', this.fontFamily)
        .style('paint-order', 'stroke')
        .attr('stroke', this.panelBackgroundColor)
        .attr('stroke-width', 3)
        .attr('stroke-linejoin', 'round')
        .text(formatAxisValue(v, 2));
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
      .attr('filter', `url(#${shadowFilterId})`)
      .style('cursor', 'pointer');
    enter.each((d: any) => {
      d.data._current = { startAngle: d.startAngle, endAngle: d.endAngle, radius: 0 };
    });
    this.attachInteractionHandlers(enter, seriesLabel, linkedDashboard, total);

    const merged = enter.merge(path);

    // Equal-angle slots mean the angles themselves only shift when the number of visible
    // slices changes (legend toggle) - the radius is what animates on first render.
    const animateEntrance = !this.hasRendered && (this.inject.chartAnimation ?? true);
    if (!this.hasRendered && !animateEntrance) {
      // Entrance animation disabled: jump straight to the final state, no transition.
      merged.attr('d', (d: any) => {
        const final = { startAngle: d.startAngle, endAngle: d.endAngle, radius: radiusScale(d.data.value) };
        d.data._current = final;
        return this.arcPathAt(final.startAngle, final.endAngle, final.radius);
      });
      this.hasRendered = true;
    } else {
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
    }

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
          .text(formatValueLabel(d.data.value, percentage, this.inject.showLabels, this.inject.showLabelsPercent));
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
