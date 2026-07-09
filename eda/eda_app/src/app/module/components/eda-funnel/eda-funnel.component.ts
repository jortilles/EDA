import { Component, Input, AfterViewInit, ElementRef, ViewChild, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import { EdaFunnel } from './eda-funnel';
import { ChartUtilsService, StyleProviderService, D3TooltipService, initD3ResizeObserver, teardownD3Chart } from '@eda/services/service.index';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaChartLegendComponent } from '../eda-chart-legend/eda-chart-legend.component';

interface FunnelData {
  step: number;
  value: number;
  label: string;
}


@Component({
  standalone: true,
  selector: 'eda-funnel',
  templateUrl: './eda-funnel.component.html',
  styleUrls: ['./eda-funnel.component.css'],
  imports: [FormsModule, CommonModule, EdaChartLegendComponent]
})

export class EdaFunnelComponent implements AfterViewInit, OnInit, OnDestroy {

  @Input() inject: EdaFunnel;
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();

  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef;

  id: string;
  svg: any;
  data: any;
  assignedColors: any[];
  firstColLabels: Array<string>;
  metricIndex: number;
  labelIndex: number;
  width: number;
  heigth: number;
  resizeObserver!: ResizeObserver;
  paleta : any;

  chartLegend: boolean;
  legendItems: { label: string; color: string; hidden: boolean }[] = [];
  private hiddenStepIndexes: Set<number> = new Set();

  constructor( private styleProviderService : StyleProviderService, private chartUtils : ChartUtilsService, private tooltipService: D3TooltipService) {
  }


  ngOnInit(): void {
    this.id = `funnel_${this.inject.id}`;
    this.chartLegend = this.inject.chartLegend ?? true;
    this.metricIndex = this.inject.dataDescription.numericColumns[0].index;
    const firstNonNumericColIndex = this.inject.dataDescription.otherColumns[0].index;
    this.labelIndex = firstNonNumericColIndex;
    this.data = this.inject.data;
    this.assignedColors = this.inject.assignedColors;
    this.firstColLabels = this.data.values.map(row => row[firstNonNumericColIndex]);
    this.firstColLabels = [...new Set(this.firstColLabels)];
  }

  toggleLegend(index: number): void {
    if (this.hiddenStepIndexes.has(index)) this.hiddenStepIndexes.delete(index);
    else this.hiddenStepIndexes.add(index);
    this.legendItems[index].hidden = this.hiddenStepIndexes.has(index);
    this.draw();
  }

  ngAfterViewInit() {
    const container = this.svgContainer.nativeElement as HTMLElement;
    if (!this.svg) this.svg = d3.select(container).append('svg');
    this.resizeObserver = initD3ResizeObserver(container, this.svg, () => this.draw());
  }

  ngOnDestroy() {
    teardownD3Chart(this.tooltipService, this.resizeObserver);
  }

  // Improved draw() method for eda-funnel.component.ts
  // Replace from line 94

draw() {
  // Initial cleanup of other charts
  this.svg.selectAll('*').remove();

  /** Variables */
  const width = this.svgContainer.nativeElement.clientWidth - 20;
  const height = this.svgContainer.nativeElement.clientHeight - 20;
  let values = this.data.values;
  
  // Fixed: always use colors from assignedColors
  // Do not apply an automatic palette when colors are already assigned
  let gradient1: string;
  let gradient2: string;

  if (this.assignedColors && this.assignedColors.length >= 2) {
    // Use the colors already in assignedColors
    gradient1 = this.assignedColors[0].color;
    gradient2 = this.assignedColors[1].color;
  } else {
    // Fallback only when assignedColors is missing (should not happen)
    const paleta = this.styleProviderService.ActualChartPalette?.['paleta'] || 
                   this.styleProviderService.DEFAULT_PALETTE_COLOR?.['paleta'] || 
                   ['#4CAF50', '#2196F3'];
    gradient1 = paleta[0];
    gradient2 = paleta[paleta.length - 1];
  }
  
  let labels = this.data.labels;
  const colorPanel = this.styleProviderService.panelFontColor.source['_value'];
  const fontPanel = this.styleProviderService.panelFontFamily.source['_value'];

  const margin = ({ top: 25, right: 25, bottom: 35, left: 70 });
  const ledge = 0.2;
  const allRows: Array<FunnelData> = values.map((row, index) => {
    return { step: index, value: row[this.metricIndex], label: row[this.labelIndex] }
  });

  // assignedColors here is just the 2-stop start/end gradient, not one color per stage - the
  // legend instead gets a swatch per stage interpolated along that same gradient at the stage's
  // position, matching the tooltip's own per-step stepColor below.
  this.legendItems = allRows.map((d, i) => ({
    label: d.label,
    color: allRows.length > 1 ? d3.interpolateRgb(gradient1, gradient2)(i / (allRows.length - 1)) : gradient1,
    hidden: this.hiddenStepIndexes.has(i)
  }));

  // Hidden stages are excluded and the rest re-indexed to contiguous steps (0..m-1) - this closes
  // the gap visually instead of leaving a blank slot, and since every percentage/domain below
  // already reads off `data[0]`/`data.length` (not the original row indices), recomputing "from
  // the first visible stage" falls out of this filter+reindex for free, no separate logic needed.
  const visibleRows = allRows.filter((_, i) => !this.hiddenStepIndexes.has(i));
  const sourceRows = visibleRows.length > 0 ? visibleRows : allRows;
  const data: Array<FunnelData> = sourceRows.map((d, i) => ({ step: i, value: d.value, label: d.label }));

  const data2: Array<FunnelData> = (() => {
    const result = [];
    data.forEach((point, index) => {
      const { step, value } = point;
      if (index !== 0) {
        result.push({ step: step - ledge, value });
      }
      result.push(point);
      if (index !== data.length - 1) {
        result.push({ step: step + ledge, value });
      } else {
        result.push({ step: step + 1, value });
      }
    })
    return result;
  })();

  /** Functions */
  const curve = d3.curveCatmullRom.alpha(0.999999999);

  const y = d3.scaleLinear()
    .domain([-d3.max(data, ({ value }) => value), d3.max(data, ({ value }) => value)]).nice()
    .range([height - margin.bottom, margin.top]);

  const x = d3.scaleUtc()
    .domain(d3.extent(data2, ({ step }) => step))
    .range([margin.left, width - margin.right]);


  const area = d3.area()
    .curve(curve)
    .x((d: [number, number]) => x(d['step'])) // step
    .y0(y(0))
    .y1((d: [number, number]) => y(d['value'])) // value

  const areaMirror = d3.area()
    .curve(curve)
    .x((d: [number, number]) => x(d['step'])) // step
    .y0(y(0))
    .y1((d: [number, number]) => y(-d['value'])) // value


  const svg = this.svg;

  // Gradient spans the FULL data domain (first step -> last step), not a hardcoded x(1)-x(3)
  // window - with more than ~4 categories, that window only covered a narrow band in the middle,
  // clamping to a flat gradient1 before it and a flat gradient2 after it (a hard, uneven jump
  // instead of a smooth transition across every category).
  svg.append('linearGradient')
    .attr('id', `${this.id}_temperature-gradient`)
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('x1', x(data[0].step)).attr('y1', 0)
    .attr('x2', x(data[data.length - 1].step)).attr('y2', 0)
    .selectAll('stop')
    .data([
      { offset: '0%', color: gradient1 },
      { offset: '100%', color: gradient2 },
    ])
    .enter().append('stop')
    .attr('offset', function (d) { return d.offset; })
    .attr('stop-color', function (d) { return d.color; });

  const areaGroup = svg.append('g').style('cursor', 'pointer');

  areaGroup.append('path')
    .datum(data2)
    .attr('fill', `url(#${this.id}_temperature-gradient)`)
    .attr('stroke', colorPanel)
    .attr('stroke-opacity', 0.15)
    .attr('stroke-width', 1)
    .attr('d', area);

  areaGroup.append('path')
    .datum(data2)
    .attr('fill',  `url(#${this.id}_temperature-gradient)`)
    .attr('stroke', colorPanel)
    .attr('stroke-opacity', 0.15)
    .attr('stroke-width', 1)
    .attr('d', areaMirror);

  // Highlight overlay for the hovered step - clipped to that step's column (see hoverAt() below),
  // and drawn with the exact same curve as the shape itself, so it only ever paints on top of the
  // already-drawn funnel, never spilling into the surrounding empty space. Black (not white) so it
  // DARKENS the hovered zone - same "hover = darker" convention as every other D3 chart this session
  // (doughnut/bar/bubble/scatter/treemap), rather than lightening it.
  const highlightClipId = `${this.id}_highlight_clip`;
  const highlightClipRect = svg.append('clipPath').attr('id', highlightClipId)
    .append('rect').attr('y', 0).attr('height', height);

  const highlightGroup = svg.append('g')
    .attr('clip-path', `url(#${highlightClipId})`)
    .style('pointer-events', 'none');
  const highlightTop = highlightGroup.append('path').datum(data2).attr('d', area).attr('fill', 'black').attr('fill-opacity', 0);
  const highlightBottom = highlightGroup.append('path').datum(data2).attr('d', areaMirror).attr('fill', 'black').attr('fill-opacity', 0);

  // A step's "column" runs from its own guide line up to the NEXT step's guide line (matching
  // where the black divider lines and the label/value/percentage text are already drawn - both
  // anchor at x(step), not centered around it) - not a band centered on the step. Keeping the
  // hover zone and the guide lines on the same convention is what keeps the highlighted section,
  // the tooltip's data and the visible guide lines all pointing at the same category. Defined here
  // (rather than further down, where it's also used for hit-testing) so the label truncation below
  // can reuse it too.
  const zoneBounds = (i: number): [number, number] => {
    const x0 = i === 0 ? margin.left : x(data[i].step);
    const x1 = i === data.length - 1 ? width - margin.right : x(data[i + 1].step);
    return [x0, x1];
  };

  // Responsive text: with many categories, a fixed 14px label/18px percentage on every single
  // step overlaps into an unreadable mess - shrink the font as columns get narrower. Truncation
  // (below) takes care of the rest, so every step is always shown - none get hidden anymore.
  const availablePerStep = (width - margin.left - margin.right) / Math.max(data.length, 1);
  const labelFontSize = availablePerStep < 40 ? 10 : availablePerStep < 70 ? 12 : 14;
  const percentFontSize = availablePerStep < 40 ? 12 : availablePerStep < 70 ? 15 : 18;

  // Truncates a string with an ellipsis if it doesn't fit in its own column - SVG <text> has no
  // CSS text-overflow, so the available width has to be measured (via an offscreen canvas, same
  // trick eda-bar-d3 uses) and the string trimmed by hand until it fits. Applied to the value and
  // percentage too, not just the label - a number can overflow a narrow column just as easily.
  const measureCanvas = document.createElement('canvas');
  const measureTextWidth = (text: string, fontSizePx: number): number => {
    const ctx = measureCanvas.getContext('2d');
    ctx.font = `${fontSizePx}px ${fontPanel === 'inherit' ? 'sans-serif' : fontPanel}`;
    return ctx.measureText(text).width;
  };
  const truncateText = (text: string, maxWidth: number, fontSizePx: number): string => {
    if (measureTextWidth(text, fontSizePx) <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 1 && measureTextWidth(truncated + '…', fontSizePx) > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '…';
  };
  const maxWidthFor = (step: number): number => {
    const [, x1] = zoneBounds(step);
    return x1 - (x(step) + 10) - 5;
  };

  svg.selectAll('.values')
    .data(data)
    .enter()
    .append('text')
    .attr('class', 'values')
    .attr('x', ({ step }) => x(step) + 10)
    .attr('y', 30)
    .text((d) => truncateText(d3.format(',')(d.value), maxWidthFor(d.step), labelFontSize))
    .style("font-family",fontPanel)
    .attr("fill", colorPanel)
    .style('font-weight', 'bold')
    .style("font-size", `${labelFontSize}px`);

  svg.selectAll('.labels')
    .data(data)
    .enter()
    .append('text')
    .attr('class', 'labels')
    .attr('id', ({ step }) => `${this.id}_label_${step}`)
    .attr('x', ({ step }) => x(step) + 10)
    .attr('y', 50)
    .text((d) => truncateText(d.label, maxWidthFor(d.step), labelFontSize))
    .style('font-family', fontPanel)
    .style('font-size', `${labelFontSize}px`)
    .style('font-weight', 'normal')
    .attr("fill", colorPanel);

  svg.selectAll('.percentages')
    .data(data)
    .enter()
    .append('text')
    .attr('class', 'percentages')
    .attr('x', ({ step }) =>  x(step) + 10)
    .attr('y', 70)
    .text((d) => truncateText(d3.format('.1%')(d.value / data[0].value), maxWidthFor(d.step), percentFontSize))
    .style('font-size', `${percentFontSize}px`)
    .attr('fill', colorPanel);

  svg.selectAll('line')
    .data(d3.range(1, data.length ))
    .enter()
    .append('line')
    .attr('x1', value => x(value))
    .attr('y1', 10)
    .attr('x2', value => x(value))
    .attr('y2', height - 30)
    .style('stroke-width', 1)
    .style('stroke', colorPanel)
    .style('fill', 'none');

  const stepIndexAt = (mouseX: number): number => {
    for (let i = data.length - 1; i >= 0; i--) {
      if (mouseX >= x(data[i].step)) return i;
    }
    return 0;
  };

  let hoveredIndex = -1;

  const clearHover = () => {
    if (hoveredIndex === -1) return;
    d3.select(`#${this.id}_label_${data[hoveredIndex].step}`).transition().duration(150)
      .style('font-size', `${labelFontSize}px`)
      .style('font-weight', 'normal');
    highlightTop.transition().duration(150).attr('fill-opacity', 0);
    highlightBottom.transition().duration(150).attr('fill-opacity', 0);
    hoveredIndex = -1;
  };

  // mousemove/click are bound to the SHAPE itself (areaGroup), not an invisible full-height
  // overlay - the browser only hit-tests the actual painted region of a path, so hover/click
  // naturally only fire where the funnel is actually drawn, never in the empty space around it.
  areaGroup
    .on('mousemove', (event: any) => {
      // @types/d3 is pinned to v5 (package.json), which predates d3.pointer (added in v6's
      // d3-selection) - the runtime d3 package is v7 and has it, hence the cast.
      const [mx] = (d3 as any).pointer(event, svg.node());
      const i = stepIndexAt(mx);
      if (i !== hoveredIndex) {
        if (hoveredIndex !== -1) {
          d3.select(`#${this.id}_label_${data[hoveredIndex].step}`).transition().duration(150)
            .style('font-size', `${labelFontSize}px`)
            .style('font-weight', 'normal');
        }
        hoveredIndex = i;
        const [x0, x1] = zoneBounds(i);
        highlightClipRect.attr('x', x0).attr('width', x1 - x0);
        d3.select(`#${this.id}_label_${data[i].step}`).transition().duration(150)
          .style('font-size', `${labelFontSize + 2}px`)
          .style('font-weight', 'bold');
        highlightTop.transition().duration(150).attr('fill-opacity', 0.25);
        highlightBottom.transition().duration(150).attr('fill-opacity', 0.25);

        const d = data[i];
        const ratio = data.length > 1 ? d.step / (data.length - 1) : 0;
        const stepColor = d3.interpolateRgb(gradient1, gradient2)(ratio);
        const swatch = `<span class="eda-funnel-tooltip-swatch" style="background-color:${stepColor};"></span>`;

        const valueRow = `${swatch}${d3.format(',')(d.value)}`;
        const percentageRow = `<div class="eda-funnel-tooltip-row">${d3.format('.1%')(d.value / data[0].value)}</div>`;

        // Field name : value, matching treemap/bubblechart/scatter/doughnut's title convention.
        const fieldName = this.inject.dataDescription.otherColumns[0].name;
        const text = `<div class="eda-funnel-tooltip-title">${fieldName} : ${d.label}</div>` +
          `<div class="eda-funnel-tooltip-row">${valueRow}</div>${percentageRow}`;

        this.tooltipService.show(event, text, 'eda-funnel-tooltip');
      }
      this.tooltipService.move(event);
    })
    .on('mouseleave', () => {
      clearHover();
      this.tooltipService.hide();
    })
    .on('click', (event: any) => {
      // @types/d3 is pinned to v5 (package.json), which predates d3.pointer (added in v6's
      // d3-selection) - the runtime d3 package is v7 and has it, hence the cast.
      const [mx] = (d3 as any).pointer(event, svg.node());
      const d = data[stepIndexAt(mx)];
      if (this.inject.linkedDashboard) {
        const props = this.inject.linkedDashboard;
        const value = d?.label;
        const url = window.location.href.slice(0, window.location.href.indexOf('/dashboard')) + `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`
        window.open(url, "_blank");
      } else {
        const label = d.label;
        const filterBy = this.inject.data.labels[this.inject.data.values[0].findIndex((element) => typeof element === 'string')]
        this.onClick.emit({label, filterBy });
      }
    });
}
}
