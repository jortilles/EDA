
import { AfterViewInit, Component, ElementRef, Input, ViewChild, ViewEncapsulation } from "@angular/core";
import { ChartsColors } from '@eda/configs/index';
import * as d3 from 'd3';
import { TreeMap } from "./eda-treeMap";
import * as _ from 'lodash';
import * as dataUtils from '../../../services/utils/transform-data-utils';


@Component({
  selector: 'eda-d3',
  templateUrl: './eda-treemap.component.html',
  styleUrls: ['./eda-treemap.component.css'],
  encapsulation: ViewEncapsulation.Emulated
})


export class EdaTreeMap implements AfterViewInit {

  @Input() inject: TreeMap;
  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef;

  div = d3.select("body").append('div')
    .attr('class', 'd3tooltip')
    .style('opacity', 0);

  id: string;
  svg: any;
  data: any;
  colors: Array<string>;
  firstColLabels: Array<string>;
  metricIndex: number;
  width: number;
  heigth: number;

  ngOnInit(): void {
    this.id = `treeMap_${this.inject.id}`;
    this.data = this.formatData(this.inject.data);

    this.colors = this.inject.colors.length > 0 ? this.inject.colors
      : this.getColors(this.data.children.length, ChartsColors)
        .map(color => `rgb(${color[0]}, ${color[1]}, ${color[2]} )`);

    this.metricIndex = this.inject.dataDescription.numericColumns[0].index;
    const firstNonNumericColIndex = this.inject.dataDescription.otherColumns[0].index;
    this.firstColLabels = this.inject.data.values.map(row => row[firstNonNumericColIndex]);
    this.firstColLabels = [...new Set(this.firstColLabels)];

  }

  getColors(dataLength, colors) {

    const colorsLength = colors.length;
    let outputColors: Array<any> = colors;

    if (dataLength > colorsLength) {
      let repeat = Math.ceil(dataLength / colorsLength);

      for (let i = 0; i < repeat - 1; i++) {
        outputColors = [...outputColors, ...colors]
      }
    }

    return outputColors.filter((_, index) => index < dataLength);

  }



  ngAfterViewInit() {

    if (this.svg) this.svg.remove();
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
    const secondRow = `${metricLabel} : ${data.data.value.toLocaleString('de-DE', {maximumFractionDigits: 6 })}`;

    const thirdRow = this.inject.linkedDashboard ? `Linked to ${this.inject.linkedDashboard.dashboardName}` : '';

    const maxLength = dataUtils.maxLengthElement([firstRow.length, secondRow.length, thirdRow.length * (14 / 12)]);

    const pixelWithRate = 7;
    const width = maxLength * pixelWithRate;

    return { firstRow: firstRow, secondRow: secondRow, thirdRow: thirdRow, width: width }
  }


  private randomID() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  draw() {

    const width = this.svgContainer.nativeElement.clientWidth - 20, height = this.svgContainer.nativeElement.clientHeight - 20;
    const color = d3.scaleOrdinal(this.firstColLabels, this.colors).unknown("#ccc");

    const treemap = data => d3.treemap()
      .tile(d3.treemapBinary)
      .size([width, height])
      .padding(1)
      .round(true)
      (d3.hierarchy(data)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value))

    const root = treemap(this.data);

    const svg = this.svg;

    const leaf = svg.selectAll("g")
      .data(root.leaves())
      .join("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

    // leaf.append("title")
    //   .text(d => `${d.ancestors().reverse().map(d => d.data.name).join("/")}\n${d.value}`);

    leaf.append("rect")
      .attr("id", d => (d.leafUid = this.randomID()))
      .attr("fill", d => {
        while (d.depth > 1) d = d.parent;
        return color(d.data.name);
      })
      .attr("fill-opacity", 0.6)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .on('click', (mouseevent, data) => {

        if (this.inject.linkedDashboard) {
          const props = this.inject.linkedDashboard;
          const value = data.data.name;
          const url = window.location.href.substr(0, window.location.href.indexOf('/dashboard')) + `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`
          window.open(url, "_blank");
        }
      }).on('mouseover', (d, data) => {


        const tooltipData = this.getToolTipData(data);


        let text = `${tooltipData.firstRow} <br/> ${tooltipData.secondRow}`;
        text = this.inject.linkedDashboard ? text + `<br/> <h6>  ${tooltipData.thirdRow} </h6>` : text;
        let height = this.inject.linkedDashboard ? '5em' : '4em';


        this.div.transition()
          .duration(200)
          .style('opacity', .9);
        this.div.html(text)
          .style('left', (d.pageX - 81) + 'px')
          .style('top', (d.pageY - 49) + 'px')
          .style('width', `${tooltipData.width}px`)
          .style('height', height);
      })
      .on('mouseout', (d) => {
        this.div.transition()
          .duration(500)
          .style('opacity', 0);
      }).on("mousemove", (d, data) => {

        const linked = this.inject.linkedDashboard ? 0 : 10;
        const tooltipData = this.getToolTipData(data);

        this.div.style("top", (d.pageY - 70 + linked) + "px")
          .style("left", (d.pageX - tooltipData.width / 2) + "px");
      });;



    leaf.append("text")
      .selectAll("tspan")
      .data(d => {
        let value = (d.x1 - d.x0 < 40) || (d.y1 - d.y0 < 40) ? [''] :
          d.parent ? d.parent.data.name.split(/(?=[A-Z][a-z])|\s+/g).concat(d.data.name.split(/(?=[A-Z][a-z])|\s+/g))
            : d.data.name.split(/(?=[A-Z][a-z])|\s+/g);

        value = value.filter(name => name !== 'root' && name !== 'Node')
        return value
      })
      .join("tspan")
      .style("font-size", "12px")
      .style("font-family", "Questrial")
      .attr("x", 3)
      .attr("y", (d, i, nodes) => `${<number><unknown>(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`)
      .attr("fill-opacity", (d, i, nodes) => i === nodes.length - 1 ? 0.7 : null)
      .text(d => d);


  }



  formatData(data) {

    let rootNode = new Map();

    data.values.forEach(r => {

      if(!r.includes(null)){
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
    node.forEach((value, key) => {
      if (typeof value === 'number') {
        values.push({ name: key, value: value });
      } else {
        values.push({ name: key, children: this.unnest(value) })
      }
    })
    return values;
  }


}