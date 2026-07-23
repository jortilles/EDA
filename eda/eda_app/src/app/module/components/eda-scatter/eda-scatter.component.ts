import { ChartUtilsService, StyleProviderService, D3TooltipService, lightenHex, darkenHex, sanitizeId, ensureRadialGradient, initD3ResizeObserver, teardownD3Chart } from '@eda/services/service.index';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild, ViewEncapsulation } from "@angular/core";
import * as d3 from 'd3';
import { ScatterPlot } from "./eda-scatter";
import * as _ from 'lodash';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaChartLegendComponent } from '../eda-chart-legend/eda-chart-legend.component';

@Component({
  standalone: true,
  selector: 'eda-d3',
  templateUrl: './eda-scatter.component.html',
  styleUrls: ['./eda-scatter.component.css'],
  encapsulation: ViewEncapsulation.Emulated,
  imports: [FormsModule, CommonModule, EdaChartLegendComponent]
})


export class EdaScatter implements AfterViewInit {

  @Input() inject: ScatterPlot;
  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef;
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();

  id: string;
  svg: any;
  data: any;
  colors: Array<string>;
  assignedColors: any[];
  firstColLabels: Array<string>;
  metricIndex: number;
  width: number;
  heigth: number;
  resizeObserver!: ResizeObserver;
  private valuesScatter: any[];
  private colorsScatter: any[];
  private colorScale: any;

  chartLegend: boolean;
  legendItems: { label: string; color: string; hidden: boolean }[] = [];
  private hiddenIndexes: Set<number> = new Set();
  private hasRendered = false;

  constructor(private chartUtilService : ChartUtilsService, private styleProviderService : StyleProviderService, private tooltipService: D3TooltipService){

  }

  ngOnInit(): void {
    this.id = `scatterPlot_${this.inject.id}`;
    this.chartLegend = this.inject.chartLegend ?? true;
    this.data = this.formatData(this.inject.data);
    this.metricIndex = this.inject.dataDescription.numericColumns[0].index;

    const firstNonNumericColIndex = this.inject.dataDescription.otherColumns[0].index;
    this.firstColLabels = this.inject.data.values.map(row => row[firstNonNumericColIndex]);
    this.firstColLabels = [...new Set(this.firstColLabels)];
    this.assignedColors = this.inject.assignedColors;

    this.legendItems = this.firstColLabels.map((label, i) => ({
      label: String(label),
      color: this.assignedColors[i]?.color || '#cccccc',
      hidden: this.hiddenIndexes.has(i)
    }));
  }
  ngOnDestroy(): void {
    teardownD3Chart(this.tooltipService, this.resizeObserver);
  }

  toggleLegend(index: number): void {
    if (this.hiddenIndexes.has(index)) this.hiddenIndexes.delete(index);
    else this.hiddenIndexes.add(index);
    this.legendItems[index].hidden = this.hiddenIndexes.has(index);
    this.draw();
  }

  ngAfterViewInit() {
    const container = this.svgContainer.nativeElement as HTMLElement;
    if (!this.svg) this.svg = d3.select(container).append('svg');
    this.resizeObserver = initD3ResizeObserver(container, this.svg, () => this.draw(), { skipFirstCallback: true });
  }


  draw() {
    // Initial cleanup of other charts
    this.svg.selectAll('*').remove();
    const animateEntrance = !this.hasRendered && (this.inject.chartAnimation ?? true);
    // Hover micro-animations (point grow, color darken) - separate from the entrance fly-in
    // above, should be instant rather than just skipped-on-first-render when chartAnimation is off.
    const HOVER_MS = (this.inject.chartAnimation ?? true) ? 150 : 0;
    // Point radius growth on hover is skipped entirely (not just instant) when chartAnimation is
    // off - color darken is left unaffected, still the hover cue left when animation is off.
    const chartAnimOn = this.inject.chartAnimation ?? true;
    
    const svg = this.svg;
    const width = this.svgContainer.nativeElement.clientWidth - 20;
    const height = this.svgContainer.nativeElement.clientHeight - 20;
    const margin = ({ top: 50, right: 50, bottom: 35, left: 100 });

    // Separate assignedColors values
    const valuesScatter = this.assignedColors.map((item) => item.value);
    const colorsScatter = this.assignedColors[0].color ? this.assignedColors.map(item => item.color) : this.colors;
    
    // D3 color sorting function
    const color = d3.scaleOrdinal(this.firstColLabels,  colorsScatter);
    this.valuesScatter = valuesScatter;
    this.colorsScatter = colorsScatter;
    this.colorScale = color;

    const x_range: Array<any> = d3.extent(this.data, (d: any) => d.x);
    const y_range: Array<any> = d3.extent(this.data, (d: any) => d.y);

    const x = d3.scaleLinear()
      .domain(x_range).nice()
      .range([margin.left, width - margin.right])

    const y = d3.scaleLinear()
      .domain(y_range).nice()
      .range([height - margin.bottom, margin.top])

    const grid = g => g
      .attr("stroke", this.styleProviderService.panelFontColor.source['_value'])
      .attr("stroke-opacity", 0.1)
      .call(g => g.append("g")
        .selectAll("line")
        .data(x.ticks())
        .join("line")
        .attr("x1", d => 0.5 + x(d))
        .attr("x2", d => 0.5 + x(d))
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom))
      .call(g => g.append("g")
        .selectAll("line")
        .data(y.ticks())
        .join("line")
        .attr("y1", d => 0.5 + y(d))
        .attr("y2", d => 0.5 + y(d))
        .attr("x1", margin.left)
        .attr("x2", width - margin.right));

    const yAxis = g => g
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickFormat(this.chartUtilService.format10thPowers))
      .call(g => g.select(".domain").remove())
      .call(g => g.append("text")
        .attr("x", -margin.left )
        .attr("y", 30)
        .attr("fill", this.styleProviderService.panelFontColor.source['_value'])
        .attr("font-family", this.styleProviderService.panelFontFamily.source['_value'])
        .attr("font-size", "var(--panel-big)")
        .attr("text-anchor", "start")
        .text(`↑ ${this.inject.dataDescription.numericColumns[1].name}`))

    const xAxis = g => g
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(width / 80).tickFormat(this.chartUtilService.format10thPowers))
      .call(g => g.select(".domain").remove())
      .call(g => g.append("text")
        .attr("x", width)
        .attr("y", margin.bottom )
        .attr("fill", this.styleProviderService.panelFontColor.source['_value'])
        .attr("font-family", this.styleProviderService.panelFontFamily.source['_value'])
        .attr("font-size", "var(--panel-big)")
        .attr("text-anchor", "end")
        .text(`→ ${this.inject.dataDescription.numericColumns[0].name}`));

    
    svg.append("g")
      .call(xAxis);

      svg.append("g")
      .call(yAxis);

    svg.append("g")
      .call(grid);

    let defs = svg.select('defs');
    if (defs.empty()) defs = svg.append('defs');

    // Points whose category was hidden from the legend are excluded before binding - axis
    // domains above stay fixed to the full dataset's extent (no rescale needed, only whichever
    // categories are plotted changes).
    const hiddenLabels = new Set(Array.from(this.hiddenIndexes).map(i => String(this.firstColLabels[i])));
    const visiblePoints = hiddenLabels.size > 0
      ? this.data.filter((d: any) => !hiddenLabels.has(String(d.category ?? d.label)))
      : this.data;

    svg.append("g")
      .attr("stroke-width", 1.5)
      .attr("fill", "var(--panel-font-color)")
      .attr("font-family", "var(--panel-font-family)")
      .attr("font-size", 10)
      .style("cursor", "pointer")
      .selectAll("circle")
      .data(visiblePoints)
      .join("circle")
      .attr("cx", d => x(d.x))
      .attr("cy", d => y(d.y))
      .attr("r", animateEntrance ? 0 : (d: any) => d.radius + 1)
      .attr("opacity", animateEntrance ? 0 : 1)
      .attr("fill", d => this.pointFill(defs, this.pointColor(d)))
      .on('click', (e, data) => {
        if (this.inject.linkedDashboard) {
          const props = this.inject.linkedDashboard;
          const value = data.data.name;
          const url = window.location.href.slice(0, window.location.href.indexOf('/dashboard')) + `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`
          window.open(url, "_blank");
        }
      })
      .on('mouseover', (d, data) => {

        const hex = this.pointColor(data);
        const target = d3.select(d.currentTarget);

        // Grow the point outward (skipped when chartAnimation is off) and swap the gradient url
        // for its own flat base color first, instantly (no transition), then transition flat ->
        // flat - same approach as eda-doughnut-d3.
        if (chartAnimOn) {
          target.interrupt('grow').transition('grow').duration(HOVER_MS).attr('r', data.radius + 4);
        }
        target.attr('fill', hex);
        target.interrupt('color').transition('color').duration(HOVER_MS).attr('fill', darkenHex(hex, 30));

        const swatch = `<span class="eda-scatter-tooltip-swatch" style="background-color:${hex};"></span>`;

        let categoryText = data.category ? `<div class="eda-scatter-tooltip-title">${this.inject.dataDescription.otherColumns[0].name} : ${data.category}</div>` : '';
        let serieText = data.category ? `${this.inject.dataDescription.otherColumns[1].name}  : ${data.label}`
        : `${this.inject.dataDescription.otherColumns[0].name} : ${data.label}`;

        // The X/Y axis values themselves - the actual point being plotted, not just its label.
        const xText = `${this.inject.dataDescription.numericColumns[0].name} : ${data.x.toLocaleString('de-DE', { maximumFractionDigits: 6 })}`;
        const yText = `${this.inject.dataDescription.numericColumns[1].name} : ${data.y.toLocaleString('de-DE', { maximumFractionDigits: 6 })}`;

        let metricText = data.metricValue ?
        `${this.inject.dataDescription.numericColumns[2].name} :  ${data.metricValue.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
        : ``;

        let text = categoryText;
        text += `<div class="eda-scatter-tooltip-row">${swatch}${serieText}</div>`;
        text += `<div class="eda-scatter-tooltip-row">${xText}</div>`;
        text += `<div class="eda-scatter-tooltip-row">${yText}</div>`;
        text = metricText ? text + `<div class="eda-scatter-tooltip-row">${metricText}</div>` : text;
        text = this.inject.linkedDashboard ? text + `<h6>${$localize`:@@linkedTo:Vinculado con`} ${this.inject.linkedDashboard.dashboardName}</h6>` : text;

        this.tooltipService.show(d, text, 'eda-scatter-tooltip');
        })
        .on('mouseout', (d, data) => {
          const hex = this.pointColor(data);
          const target = d3.select(d.currentTarget);
          if (chartAnimOn) {
            target.interrupt('grow').transition('grow').duration(HOVER_MS).attr('r', data.radius + 1);
          }
          target.interrupt('color').transition('color').duration(HOVER_MS)
            .attr('fill', hex)
            .on('end', () => target.attr('fill', this.pointFill(defs, hex)));
          this.tooltipService.hide();
      }).on("mousemove", (d) => {
        this.tooltipService.move(d);
        }).on('click', (mouseevent, data) => {
          
        if (this.inject.linkedDashboard) {
          const props = this.inject.linkedDashboard;
          const value = data.category ? data.category : data.label;
          const url = window.location.href.substr(0, window.location.href.indexOf('/dashboard')) + `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`
          window.open(url, "_blank");
        }else {
          // Pass this data
          const label = data.label;
          const filterBy = this.inject.data.labels[this.inject.data.values[0].findIndex((element) => typeof element === 'string')]
          this.onClick.emit({label, filterBy});
        }

    })
    .transition()
    .delay((d: any) => animateEntrance ? ((x(d.x) - x.range()[0]) / (x.range()[1] - x.range()[0])) * 2600 : 0)
    .duration(animateEntrance ? 300 : 0)
    .attr("r", (d: any) => d.radius + 1)
    .attr("opacity", 1);
    svg.selectAll(".tick text")
      .attr("stroke", this.styleProviderService.panelFontColor.source['_value'])
      .attr("font-family", this.styleProviderService.panelFontFamily.source['_value'])

    this.hasRendered = true;
  }

  private pointColor(d: any): string {
    const idx = this.valuesScatter.findIndex((item) => d.label.includes(item));
    return idx !== -1 ? this.colorsScatter[idx] : this.colorScale(d.label);
  }

  private gradientId(colorHex: string): string {
    return `scatter-grad-${this.id}-${sanitizeId(colorHex)}`;
  }

  /** Radial gradient, base color at the center, lighter towards the edge - same convention as eda-doughnut-d3. */
  private pointFill(defs: any, hex: string): string {
    if (!(this.inject.useGradient ?? true)) return hex;
    return ensureRadialGradient(defs, this.gradientId(hex), [
      { offset: '0%', color: hex },
      { offset: '100%', color: lightenHex(hex, 30) }
    ]);
  }

  formatData(data) {

    const dataDescription = this.inject.dataDescription;
    const radiusIndex = dataDescription.numericColumns.length === 3 ? dataDescription.numericColumns[2].index : -1;
    const Xindex = dataDescription.numericColumns[0].index;
    const Yindex = dataDescription.numericColumns[1].index;

    const labelIndex = dataDescription.otherColumns.length === 2 ? dataDescription.otherColumns[1].index : dataDescription.otherColumns[0].index;
    const categoryIndex = dataDescription.otherColumns.length === 2 ? dataDescription.otherColumns[0].index : -1;

    const scale = (min, max, value) => {
      return (value - min) / (max - min) * 20;
    }

    let min, max;
    let radius = 3;
    if (radiusIndex >= 0) {
      [min, max] = d3.extent(data.values, (d: any) => d[radiusIndex]);
    }

    const newData = data.values.map(row => {

      let category = row[categoryIndex];
      let label = row[labelIndex];
      let x = row[Xindex], y = row[Yindex];


      return {
        category: category,
        x: x, y: y,
        label: label,
        radius: radiusIndex >= 0 ? scale(min, max, row[radiusIndex]) : radius,
        metricValue: radiusIndex >= 0 ? row[radiusIndex] : null
      }
    });

    return newData;

  }


}