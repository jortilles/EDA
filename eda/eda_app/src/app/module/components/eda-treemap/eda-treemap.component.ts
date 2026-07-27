
import { ChartUtilsService, StyleProviderService, D3TooltipService, lightenHex, darkenHex, sanitizeId, ensureLinearGradient, initD3ResizeObserver, teardownD3Chart } from '@eda/services/service.index';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild, ViewEncapsulation } from "@angular/core";
import * as d3 from 'd3';
import { TreeMap } from "./eda-treeMap";
import * as _ from 'lodash';
import * as dataUtils from '../../../services/utils/transform-data-utils';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaChartLegendComponent } from '../eda-chart-legend/eda-chart-legend.component';

@Component({
  standalone: true,
  selector: "eda-d3",
  templateUrl: "./eda-treemap.component.html",
  styleUrls: ["./eda-treemap.component.css"],
  encapsulation: ViewEncapsulation.Emulated,
  imports: [FormsModule, CommonModule, EdaChartLegendComponent]
})
export class EdaTreeMap implements AfterViewInit {
  @Input() inject: TreeMap;
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild("svgContainer", { static: false }) svgContainer: ElementRef;

  public update: boolean;
  id: string;
  svg: any;
  resizeObserver!: ResizeObserver;

  data: any;
  colors: Array<string>;
  assignedColors: any[];
  firstColLabels: Array<string>;
  metricIndex: number;
  width: number;
  heigth: number;
  private valuesTree: any[];
  private colorsTree: any[];
  private colorScale: any;

  chartLegend: boolean;
  legendItems: { label: string; color: string; hidden: boolean }[] = [];
  private hiddenIndexes: Set<number> = new Set();
  private hasRendered = false;

  constructor(private chartUtilService : ChartUtilsService, private styleProviderService : StyleProviderService, private tooltipService: D3TooltipService) {
    this.update = true;
  }

  ngOnInit(): void {
    this.id = `treeMap_${this.inject.id}`;
    this.chartLegend = this.inject.chartLegend ?? true;
    this.metricIndex = this.inject.dataDescription.numericColumns[0].index;
    const firstNonNumericColIndex = this.inject.dataDescription.otherColumns[0].index;
    this.firstColLabels = this.inject.data.values.map((row) => row[firstNonNumericColIndex]);
    this.firstColLabels = [...new Set(this.firstColLabels)];
    this.data = this.formatData(this.inject.data);
    this.assignedColors = this.inject.assignedColors;
    // Check this if necessary
    //this.assignedColors.forEach((element, index) => {if(element.value === undefined) element.value = this.firstColLabels[index]}); // Line for when the value is numeric.
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


  private getToolTipData = (data) => {
    let label =
      this.inject.dataDescription.otherColumns[
        this.inject.dataDescription.otherColumns.length - 1
      ];
    label = label.name;
    const firstRow = `${label} : ${data.data.name}`;

    let metricLabel = this.inject.dataDescription.numericColumns[0].name;
    const secondRow = `${metricLabel} : ${data.data.value.toLocaleString(
      "de-DE",
      { maximumFractionDigits: 6 }
    )}`;

    const thirdRow = this.inject.linkedDashboard
      ? `${$localize`:@@linkedTo:Vinculado con`} ${this.inject.linkedDashboard.dashboardName}`
      : "";

    const maxLength = dataUtils.maxLengthElement([
      firstRow.length,
      secondRow.length,
      thirdRow.length * (18 / 12),
    ]);

    const pixelWithRate = 8;
    const width = maxLength * pixelWithRate;

    return {
      firstRow: firstRow,
      secondRow: secondRow,
      thirdRow: thirdRow,
      width: width,
    };
  };

  private randomID() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  private leafColor(node: any): string {
    let d = node;
    while (d.depth > 1) d = d.parent;
    if (typeof d.data.name === 'number') d.data.name = d.data.name.toString();
    const idx = this.valuesTree.findIndex((item) => d.data.name.includes(item));
    return idx === -1 ? this.colorScale(d.data.name) : this.colorsTree[idx];
  }

  private gradientId(colorHex: string): string {
    return `treemap-grad-${this.id}-${sanitizeId(colorHex)}`;
  }

  /** Linear gradient (rects aren't round), base color at the bottom, lighter at the top - same convention as eda-bar-d3. */
  private cellFill(defs: any, hex: string): string {
    if (!(this.inject.useGradient ?? true)) return hex;
    return ensureLinearGradient(defs, this.gradientId(hex), [
      { offset: '0%', color: hex },
      { offset: '100%', color: lightenHex(hex, 30) }
    ]);
  }

  draw() {
    // Initial deletion of other charts
    this.svg.selectAll('*').remove();
    const container = this.svgContainer.nativeElement as HTMLElement;
    const width = container.clientWidth - 20,
    height = container.clientHeight - 20;
    // AssignedColors values separated
    const valuesTree = this.assignedColors.map((item) => item.value);
    const colorsTree = this.assignedColors[0]?.color ? this.assignedColors.map(item => item.color) : this.colors;
    // D3 color sorting function
    const color = d3.scaleOrdinal(this.firstColLabels,  colorsTree);
    this.valuesTree = valuesTree;
    this.colorsTree = colorsTree;
    this.colorScale = color;
    
    const treemap = (data) =>
      d3
        .treemap()
        .tile(d3.treemapBinary)
        .size([width, height])
        .padding(1)
        .round(true)(
        d3
          .hierarchy(data)
          .sum((d) => d.value)
          .sort((a, b) => b.value - a.value)
      );

    // Categories hidden from the legend are excluded before building the hierarchy - matched by
    // name rather than index, since this.data.children's order isn't guaranteed to line up 1:1
    // with firstColLabels (formatData() drops rows containing any null before building the tree).
    const hiddenLabels = new Set(Array.from(this.hiddenIndexes).map(i => String(this.firstColLabels[i])));
    const visibleData = hiddenLabels.size > 0
      ? { ...this.data, children: (this.data.children || []).filter((c: any) => !hiddenLabels.has(String(c.name))) }
      : this.data;
    const root = treemap(visibleData);

    const svg = this.svg;
    const animateEntrance = !this.hasRendered && (this.inject.chartAnimation ?? true);
    // Hover micro-animations (darken, opacity, label grow) - separate from the entrance fade
    // above, should be instant rather than just skipped-on-first-render when chartAnimation is off.
    const HOVER_MS = (this.inject.chartAnimation ?? true) ? 150 : 0;
    // Label font-size growth on hover is skipped entirely (not just instant) when chartAnimation
    // is off - color darken/opacity are left unaffected, still the hover cues left when
    // animation is off.
    const chartAnimOn = this.inject.chartAnimation ?? true;

    let defs = svg.select('defs');
    if (defs.empty()) defs = svg.append('defs');

    const leaf = svg
      .selectAll("g")
      .data(root.leaves())
      .join("g")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
      .style("cursor", "pointer");


    // leaf.append("title")
    //   .text(d => `${d.ancestors().reverse().map(d => d.data.name).join("/")}\n${d.value}`);

    const rects = leaf
      .append("rect")
      .attr("id", (d) => (d.leafUid = this.randomID()))
      .attr("fill", (d) => this.cellFill(defs, this.leafColor(d)))
      .attr("fill-opacity", animateEntrance ? 0 : 0.6)
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .on("click", (mouseevent, data) => {
        if (this.inject.linkedDashboard) {
          const props = this.inject.linkedDashboard;
          const value = data.data.name;
          const url =
            window.location.href.slice(
              0,
              window.location.href.indexOf("/dashboard")
            ) +
            `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`;
          window.open(url, "_blank");
        } else {
          const label = data.data.name;
          const filterBy = this.inject.data.labels[this.inject.data.values[0].findIndex((element) => typeof element === 'string')]
          this.onClick.emit({label, filterBy});
        }
      })
      .on("mouseover", (d, data) => {
        const hex = this.leafColor(data);
        // Swap the gradient url for its own flat base color first, instantly (no transition) -
        // a url(#gradient) reference can't be interpolated against a flat color - then transition
        // flat -> flat, same approach as eda-doughnut-d3/eda-bar-d3.
        const target = d3.select(d.currentTarget);
        target.attr('fill', hex);
        target.interrupt('color').transition('color').duration(HOVER_MS).attr('fill', darkenHex(hex, 30));
        target.interrupt('opacity').transition('opacity').duration(HOVER_MS).attr('fill-opacity', 1);

        // Grow and bold this cell's own label - same hover treatment as eda-bubblechart.
        if (chartAnimOn) {
          d3.select(d.currentTarget.parentNode).selectAll('tspan')
            .interrupt('grow').transition('grow').duration(HOVER_MS)
            .style('font-size', `${(12 + this.styleProviderService.panelFontSize.source['_value'] * 2) * 1.3}px`)
            .style('font-weight', 'bold');
        }

        const tooltipData = this.getToolTipData(data);
        const swatch = `<span class="eda-treemap-tooltip-swatch" style="background-color:${hex};"></span>`;

        let text = `<div class="eda-treemap-tooltip-title">${tooltipData.firstRow}</div>` +
          `<div class="eda-treemap-tooltip-row">${swatch}${tooltipData.secondRow}</div>`;
        text = this.inject.linkedDashboard
          ? text + `<h6>${tooltipData.thirdRow}</h6>`
          : text;

        this.tooltipService.show(d, text, 'eda-treemap-tooltip');
      })
      .on("mouseout", (d, data) => {
        const hex = this.leafColor(data);
        const target = d3.select(d.currentTarget);
        target.interrupt('color').transition('color').duration(HOVER_MS)
          .attr('fill', hex)
          .on('end', () => target.attr('fill', this.cellFill(defs, hex)));
        target.interrupt('opacity').transition('opacity').duration(HOVER_MS).attr('fill-opacity', 0.6);

        if (chartAnimOn) {
          d3.select(d.currentTarget.parentNode).selectAll('tspan')
            .interrupt('grow').transition('grow').duration(HOVER_MS)
            .style('font-size', `${12 + this.styleProviderService.panelFontSize.source['_value'] * 2}px`)
            .style('font-weight', null);
        }

        this.tooltipService.hide();
      })
      .on("mousemove", (d) => {
        this.tooltipService.move(d);
      });

    if (animateEntrance) {
      rects.transition().delay((d: any, i: number) => i * 20).duration(300).attr('fill-opacity', 0.6);
    }

    leaf
      .append("text")
      .style("opacity", animateEntrance ? 0 : 1)
      .selectAll("tspan")
      .data((d) => {
        let value =
          d.x1 - d.x0 < 40 || d.y1 - d.y0 < 40
            ? [""]
            : d.parent
            ? d.parent.data.name
                .split(/(?=[A-Z][a-z])|\s+/g)
                .concat(d.data.name.split(/(?=[A-Z][a-z])|\s+/g))
            : d.data.name.split(/(?=[A-Z][a-z])|\s+/g);
        value = value.filter((name) => name !== "root" && name !== "Node");
        return value;
      })
      .join("tspan")
      .style("font-size", (12 + this.styleProviderService.panelFontSize.source['_value'] * 2)+'px')
      // Check color
      .style("pointer-events", "none")
      .attr("fill", this.styleProviderService.panelFontColor.source['_value'])
      .style("font-family", this.styleProviderService.panelFontFamily.source['_value'])
      .attr("x", 3)
      .attr(
        "y",
        (d, i, nodes) =>
          `${
            <number>(<unknown>(i === nodes.length - 1)) * 0.3 + 1.1 + i * 0.9
          }em`
        )
        .attr("fill-opacity", (d, i, nodes) =>
          i === nodes.length - 1 ? 0.7 : null
      )
      .text((d) => d);

    if (animateEntrance) {
      leaf.select('text').transition().delay((d: any, i: number) => i * 20).duration(300).style('opacity', 1);
    }

    this.hasRendered = true;
  }

  formatData(data) {
    let rootNode = new Map();

    /**Numeric value at end */
    const newData = [];
    data.values.forEach((row) => {
      let newRow = [];
      let numericValue = row.splice(this.metricIndex, 1)[0];
      newRow = [...row];
      //Replace nulls by Null strings
      for (let e = 0; e < newRow.length; e++) {
        if (newRow[e] === null) {
          newRow[e] = "Null";
        }
      }
      newRow.push(numericValue);
      row.splice(this.metricIndex, 0, numericValue);
      newData.push(newRow);
    });

    newData.forEach((r) => {
      if (!r.includes(null)) {
        const row = _.cloneDeep(r);
        rootNode = this.buildTree(row, rootNode);
      }
    });

    const formatedData = { name: "rootNode", children: [] };

    rootNode.forEach((value, key) => {
      if (typeof value === "number") {
        formatedData.children.push({ name: key, value: value });
      } else {
        formatedData.children.push({ name: key, children: this.unnest(value) });
      }
    });
    return formatedData;
  }

  buildTree(values: Array<any>, node: Map<string, any>) {
    let value = values[0];

    if (values.length <= 2) {
      node.set(value, values[1]);
      return node;
    } else {
      if (!node.has(value)) node.set(value, new Map());
      values.shift();
      const newNode = node.get(value);
      node.set(value, this.buildTree(values, newNode));
    }
    return node;
  }

  unnest(node: Map<string, any>) {
    const values = [];
    node.forEach((value, key) => {
      if (typeof value === "number") {
        values.push({ name: key, value: value });
      } else {
        values.push({ name: key, children: this.unnest(value) });
      }
    });
    return values;
  }
}