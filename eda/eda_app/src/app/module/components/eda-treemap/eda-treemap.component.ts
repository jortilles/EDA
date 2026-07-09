
import { ChartUtilsService, StyleProviderService, D3TooltipService, lightenHex, darkenHex, sanitizeId } from '@eda/services/service.index';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild, ViewEncapsulation } from "@angular/core";
import * as d3 from 'd3';
import { TreeMap } from "./eda-treeMap";
import * as _ from 'lodash';
import * as dataUtils from '../../../services/utils/transform-data-utils';

import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: "eda-d3",
  templateUrl: "./eda-treemap.component.html",
  styleUrls: ["./eda-treemap.component.css"],
  encapsulation: ViewEncapsulation.Emulated,
  imports: [FormsModule, CommonModule]
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
  constructor(private chartUtilService : ChartUtilsService, private styleProviderService : StyleProviderService, private tooltipService: D3TooltipService) {
    this.update = true;
  }

  ngOnInit(): void {
    this.id = `treeMap_${this.inject.id}`;
    this.metricIndex = this.inject.dataDescription.numericColumns[0].index;
    const firstNonNumericColIndex = this.inject.dataDescription.otherColumns[0].index;
    this.firstColLabels = this.inject.data.values.map((row) => row[firstNonNumericColIndex]);
    this.firstColLabels = [...new Set(this.firstColLabels)];
    this.data = this.formatData(this.inject.data);
    this.assignedColors = this.inject.assignedColors;
    // Check this if necessary
    //this.assignedColors.forEach((element, index) => {if(element.value === undefined) element.value = this.firstColLabels[index]}); // Line for when the value is numeric.
  }

  ngOnDestroy(): void {
    this.tooltipService.hide();
    // Delete resize observer
    if (this.resizeObserver)
      this.resizeObserver.disconnect();
  }


  ngAfterViewInit() {
  const container = this.svgContainer.nativeElement as HTMLElement;

  // Create SVG
    if (!this.svg)
     this.svg = d3.select(container).append('svg'); 

  // ResizeObserver to resize the chart
  this.resizeObserver = new ResizeObserver(entries => {
    const { width: w, height: h } = entries[0].contentRect;
    if (w > 0 && h > 0) {
      this.svg
        .attr('width', w)
        .attr('height', h);
      this.draw();
    }
  });
  this.resizeObserver.observe(container);

  // First draw
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (w > 0 && h > 0) {
    this.svg
      .attr('width', w)
      .attr('height', h);
    this.draw();
  }
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
      ? `Linked to ${this.inject.linkedDashboard.dashboardName}`
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
    const id = this.gradientId(hex);
    let grad = defs.select(`#${id}`);
    if (grad.empty()) {
      grad = defs.append('linearGradient').attr('id', id);
      grad.append('stop').attr('class', 'grad-start');
      grad.append('stop').attr('class', 'grad-end');
    }
    grad.attr('x1', '0%').attr('y1', '100%').attr('x2', '0%').attr('y2', '0%');
    grad.select('.grad-start').attr('offset', '0%').attr('stop-color', hex);
    grad.select('.grad-end').attr('offset', '100%').attr('stop-color', lightenHex(hex, 30));
    return `url(#${id})`;
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

    const root = treemap(this.data);

    const svg = this.svg;

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

    leaf
      .append("rect")
      .attr("id", (d) => (d.leafUid = this.randomID()))
      .attr("fill", (d) => this.cellFill(defs, this.leafColor(d)))
      .attr("fill-opacity", 0.6)
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
        target.interrupt('color').transition('color').duration(150).attr('fill', darkenHex(hex, 30));
        target.interrupt('opacity').transition('opacity').duration(150).attr('fill-opacity', 1);

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
        target.interrupt('color').transition('color').duration(150)
          .attr('fill', hex)
          .on('end', () => target.attr('fill', this.cellFill(defs, hex)));
        target.interrupt('opacity').transition('opacity').duration(150).attr('fill-opacity', 0.6);
        this.tooltipService.hide();
      })
      .on("mousemove", (d) => {
        this.tooltipService.move(d);
      });

    leaf
      .append("text")
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