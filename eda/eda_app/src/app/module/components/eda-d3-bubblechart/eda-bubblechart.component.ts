import {
  Component,
  Input,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnInit,
  Output,
  EventEmitter
} from '@angular/core'
import * as d3 from 'd3'
import { EdaBubblechart } from './eda-bubblechart'
import * as _ from 'lodash';
import * as dataUtils from '../../../services/utils/transform-data-utils';
import { ChartUtilsService, StyleProviderService, D3TooltipService, lightenHex, darkenHex, sanitizeId } from '@eda/services/service.index';

import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
@Component({
  standalone: true,
  selector: 'eda-bubblechart',
  templateUrl: './eda-bubblechart.component.html',
  styleUrls: ['./eda-bubblechart.component.css'],
  imports: [FormsModule, CommonModule]
})
export class EdaBubblechartComponent implements AfterViewInit, OnInit {
  @Input() inject: EdaBubblechart
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();

  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef

  id: string;
  svg: any;
  data: any;
  colors: Array<string>;
  assignedColors: any[];
  firstColLabels: Array<string>;
  metricIndex: number;
  width: number;
  heigth: number;
  event: any;
  d: any;
  value: any;
  simulation: any;
  resizeObserver!: ResizeObserver;
  private valuesBubble: any[];
  private colorsBubble: any[];
  private colorScale: any;


  constructor(private chartUtilService : ChartUtilsService, private styleProviderService : StyleProviderService, private tooltipService: D3TooltipService) { }

  ngOnInit(): void {
    this.id = `bubblechart_${this.inject.id}`

    this.metricIndex = this.inject.dataDescription.numericColumns[0].index;
    const firstNonNumericColIndex = this.inject.dataDescription.otherColumns[0].index;
    this.firstColLabels = this.inject.data.values.map(row => row[firstNonNumericColIndex]);
    this.firstColLabels = [...new Set(this.firstColLabels)];
    this.data = this.formatData(this.inject.data);
    this.assignedColors = this.inject.assignedColors;
  }

  ngOnDestroy(): void {
    this.tooltipService.hide();
    if (this.resizeObserver)
      this.resizeObserver.disconnect();
  }

  ngAfterViewInit() {
    // SVG container
    const container = this.svgContainer.nativeElement as HTMLElement;

    // Create SVG
    this.svg = d3.select(container).append('svg');
      
    // Create ResizeObserver to resize the chart
    this.resizeObserver = new ResizeObserver(entries => {
      let id = `#${this.id}`;
      this.svg = d3.select(id);
      if (this.svg._groups[0][0] !== null && this.svgContainer.nativeElement.clientHeight > 0) {
        this.draw();
      }
    });
    this.resizeObserver.observe(container);
    
    if (this.svg)
      this.svg.remove();
    let id = `#${this.id}`;
    this.svg = d3.select(id);
    if (this.svg._groups[0][0] !== null && this.svgContainer.nativeElement.clientHeight > 0) {
      this.draw();
    }
  }

  private getToolTipData = (data) => {

    let label = this.inject.dataDescription.otherColumns[this.inject.dataDescription.otherColumns.length - 1];
    label = label.name;
    const firstRow = `${label} : ${data.data.name}`;

    let metricLabel = this.inject.dataDescription.numericColumns[0].name;
    const secondRow = `${metricLabel} : ${data.data.value.toLocaleString('de-DE', { maximumFractionDigits: 6 })}`;

    const thirdRow = this.inject.linkedDashboard ? `${$localize`:@@linkedTo:Vinculado con`} ${this.inject.linkedDashboard.dashboardName}` : '';

    const maxLength = dataUtils.maxLengthElement([firstRow.length, secondRow.length, thirdRow.length * (18 / 12)]);

    const pixelWithRate = 8;
    const width = maxLength * pixelWithRate;

    return { firstRow: firstRow, secondRow: secondRow, thirdRow: thirdRow, width: width }
  }


  private randomID() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  private leafColor(node: any): string {
    let d = node;
    while (d.depth > 1) d = d.parent;
    return this.colorsBubble[this.valuesBubble.findIndex((item) => d.data.name.includes(item))] || this.colorScale(d.data.name);
  }

  private gradientId(colorHex: string): string {
    return `bubble-grad-${this.id}-${sanitizeId(colorHex)}`;
  }

  /** Radial gradient, base color at the center, lighter towards the edge - same convention as eda-doughnut-d3. */
  private bubbleFill(defs: any, hex: string): string {
    if (!(this.inject.useGradient ?? true)) return hex;
    const id = this.gradientId(hex);
    let grad = defs.select(`#${id}`);
    if (grad.empty()) {
      grad = defs.append('radialGradient').attr('id', id);
      grad.append('stop').attr('class', 'grad-inner');
      grad.append('stop').attr('class', 'grad-outer');
    }
    grad.select('.grad-inner').attr('offset', '0%').attr('stop-color', hex);
    grad.select('.grad-outer').attr('offset', '100%').attr('stop-color', lightenHex(hex, 30));
    return `url(#${id})`;
  }

  draw() {
    // Initial removal of other charts
    this.svg.selectAll('*').remove();

    // set margins and color
    const width = this.svgContainer.nativeElement.clientWidth - 10, height = this.svgContainer.nativeElement.clientHeight - 10;

    // Color ordering function for D3
    const valuesBubble = this.assignedColors.map((item) => item.value);
    const colorsBubble = this.assignedColors[0].color ? this.assignedColors.map(item => item.color) : this.colors;
    const color = d3.scaleOrdinal(this.firstColLabels,  colorsBubble);
    this.valuesBubble = valuesBubble;
    this.colorsBubble = colorsBubble;
    this.colorScale = color;

    let defs = this.svg.select('defs');
    if (defs.empty()) defs = this.svg.append('defs');

    // call the circle pack layout
    const treemap = data => d3.pack()
      .size([width, height])
      .padding(1)
      (d3.hierarchy(data)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value))


    // assign a value which is the pack layout result with the data
    const root = treemap(this.data);
    // get svg panel
    const svg = this.svg;

    // Define thresholds and corresponding min/max sizes for circles and their text depending on SVG height

    // TO-DO: REVIEW METHOD
    var min;
    var max;
    var minText;
    var maxText;

    if (height <= 220) { min = 5, max = 58, minText = 2, maxText = 10 }
    else if (height <= 251) { min = 7, max = 38, minText = 3, maxText = 10.5 }
    else if (height <= 277) { min = 10, max = 48, minText = 3.5, maxText = 11 }
    else if (height <= 309) { min = 12, max = 58, minText = 4, maxText = 11.5 }
    else if (height <= 344) { min = 14, max = 68, minText = 5, maxText = 15 }
    else if (height <= 402) { min = 16, max = 78, minText = 6, maxText = 21 }
    else if (height <= 463) { min = 18, max = 118, minText = 7, maxText = 21 }
    else { min = 20, max = 128, minText = 8, maxText = 21 }


    // Size scale for data/circle
    const size = d3.scaleLinear()
      // The algorithms in .domain return the numeric min and max for each circle
      .domain([Math.min.apply(Math, this.data.children.map(function (i) { return i.value })), Math.max.apply(Math, this.data.children.map(function (i) { return i.value }))])
      .range([min, max])  // The circle will measure in px between min and max

    // Text size scale for labels
    const textSize = d3.scaleLinear()
      // The algorithms in .domain return the numeric min and max for each circle
      .domain([Math.min.apply(Math, this.data.children.map(function (i) { return i.value })), Math.max.apply(Math, this.data.children.map(function (i) { return i.value }))])
      .range([minText, maxText])  // The text will measure in px between minText and maxText

    // Create a selection that lets svg select all "g" tags
    var leaf = svg.selectAll("g")
      // bind all data
      .data(root.leaves())

    /* Create and place the "blocks" that contain circles and their text */
    var elemEnter = leaf.enter()
      .append("g")

    // Create the circle inside the "g" block
    var node = elemEnter.append("circle")
      .attr("id", d => (d.leafUid = this.randomID())) // Create and assign a random id to each circle
      .attr("fill", d => this.bubbleFill(defs, this.leafColor(d)))
      .attr("class", "node")
      .attr("r", function (d) {
        return size(d.value)
      })// The size function picks the numeric value and assigns the diameter
      .style("cursor", "pointer")
      .style("fill-opacity", 1)
      .attr("stroke", "black")
      .style("stroke-width", 1)
      .on('click', (mouseevent, data) => {
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
          // Emit these data
          const label = data.data.name;
          const filterBy = this.inject.data.labels[this.inject.data.values[0].findIndex((element) => typeof element === 'string')]
          this.onClick.emit({label, filterBy });
        }
      })
              .on('mouseover', (d, data) => {

                const hex = this.leafColor(data);
                const target = d3.select(d.currentTarget);

                // Increase the bubble border width
                target
                    .transition()
                    .duration(200)
                    .style("stroke-width", 3);

                // Swap the gradient url for its own flat base color first, instantly (no
                // transition), then transition flat -> flat - same approach as eda-doughnut-d3.
                target.attr('fill', hex);
                target.interrupt('color').transition('color').duration(150).attr('fill', darkenHex(hex, 30));

                // Create a label that contains the data for each bubble
                const tooltipData = this.getToolTipData(data);
                const swatch = `<span class="eda-bubblechart-tooltip-swatch" style="background-color:${hex};"></span>`;
                let text = `<div class="eda-bubblechart-tooltip-title">${tooltipData.firstRow}</div>` +
                  `<div class="eda-bubblechart-tooltip-row">${swatch}${tooltipData.secondRow}</div>`;
                text = this.inject.linkedDashboard ? text + `<h6>${tooltipData.thirdRow}</h6>` : text;

                this.tooltipService.show(d, text, 'eda-bubblechart-tooltip');
              })
      .on('mouseout', (d, data) => {

        const hex = this.leafColor(data);
        const target = d3.select(d.currentTarget);

        // Reduce the bubble border back to original size
        target
          .transition()
          .duration(200)

          .style("stroke-width", 1);

        target.interrupt('color').transition('color').duration(150)
          .attr('fill', hex)
          .on('end', () => target.attr('fill', this.bubbleFill(defs, hex)));

        this.tooltipService.hide();
      })
      .on("mousemove", (d) => {
        this.tooltipService.move(d);
      }).call(d3.drag() // Calls a specific function when the node is dragged
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))

    // create and place a text block inside the "g" block
    elemEnter.append("text")
      .attr("font-size", function (d) {
        return textSize(d.value) // The textSize function maps the numeric value to text size
      })
      // tspan elements are created inside the text block, which allows splitting text; each tspan holds a part
      .selectAll("tspan")
      // Before creating and placing text we must analyze the circle diameter and the text length to truncate accordingly
      .data(d => {
        if (d.r >= 100 && d.r <= 150 && d.data.name.trim().length >= 17) {
          return d.data.name.substr(0, 10) + '...';
        }

        else if (d.r >= 80 && d.r <= 100 && d.data.name.trim().length >= 10) {
          return d.data.name.substr(0, 8) + '...';
        }

        else if (d.r >= 60 && d.r <= 80 && d.data.name.trim().length >= 10) {
          return d.data.name.substr(0, 6) + '...';
        }

        else if (d.r >= 0 && d.r <= 60 && d.data.name.trim().length >= 8) {
          return d.data.name.substr(0, 6) + '...';
        }

        else {
          return d.data.name;
        }
      })

      .join("tspan") // Join all tspans inside the text block to avoid letters being scattered across the SVG     
      .style("font-family", this.styleProviderService.panelFontFamily.source['_value'])
      .style("pointer-events", "none")
      .attr("fill", this.styleProviderService.panelFontColor.source['_value'])      
      .attr("fill-opacity", (d, i, nodes) => i === nodes.length - 1 ? 0.9 : null)
      .text(d => d)// Load the text into each tspan



    // Physics properties applied to nodes:
    const simulation = d3.forceSimulation()
      .force("x", d3.forceX().x(width / 2))
      .force("y", d3.forceY().y(height / 2))
      .force("center", d3.forceCenter().x(width / 2).y(height / 2)) // Attraction of nodes toward the center of the SVG area
      .force("charge", d3.forceManyBody().strength(.1)) // Nodes attract each other when value > 0
      // In the .radius inside the function it is MANDATORY that the variable from which the circle data is extracted (d: any) is defined, otherwise it will reference a d3 variable and throw an error
      .force("collide", d3.forceCollide().strength(.2).radius(function (d: any) {

        return (size(d.value) + 3)
      }).iterations(1)) // Force that prevents node overlap 

    // TO-DO: Overlapping of small circles over large ones during drag


    // Apply these forces to the nodes and update their positions.
    // Once the ".force" algorithm is satisfied (alpha is low), simulations stop.
    simulation
      .nodes(root.leaves())
      .on("tick", function () {
        node
          .attr("cx", d => d.x)
          .attr("cy", d => d.y)


        // Here we define the text in the center of the bubble
        elemEnter.select("tspan") // Select tspan elements inside the text block
          .attr("x", d => d.x)
          .style("text-anchor", "middle")// Center the text inside the circle
          .attr("y", d => d.y)
      });

    // What happens when a circle is dragged?
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(.03).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(.03);
      d.fx = null;
      d.fy = null;
    }

  }

  formatData(data) {

    let rootNode = new Map();

    /**Numeric value at end */
    const newData = [];
    data.values.forEach(row => {

      let newRow = [];
      let numericValue = row.splice(this.metricIndex, 1)[0];
      newRow = [...row];
      //Replace nulls by   Null strings
      for (let e = 0; e < newRow.length; e++) {
        if (newRow[e] === null) {
          newRow[e] = 'Null';
        }
      }
      newRow.push(numericValue);
      row.splice(this.metricIndex, 0, numericValue);
      newData.push(newRow);

    });




    newData.forEach(r => {

      if (!r.includes(null)) {
        const row = _.cloneDeep(r);
        rootNode = this.buildTree(row, rootNode);
      }

    });

    const formatedData = { name: 'rootNode', children: [] };

    rootNode.forEach((value, key) => {
      if (typeof value === 'number') {

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
    node.forEach((value, name) => {
      if (typeof value === 'number') {
        values.push({ name: name, value: value });
      } else {
        values.push({ name: name, children: this.unnest(value) })
      }
    })
    return values;
  }


}