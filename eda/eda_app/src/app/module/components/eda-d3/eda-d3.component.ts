import { Component, Input, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import { sankeyLinkHorizontal } from 'd3-sankey'
import { sankey as Sankey } from 'd3-sankey';
import { ChartsColors } from '@eda/configs/index';
import { EdaD3 } from './eda-d3';


@Component({
  selector: 'eda-d3',
  templateUrl: './eda-d3.component.html',
  styleUrls: ['./eda-d3.component.css']
})

export class EdaD3Component implements AfterViewInit {

  @Input() inject: EdaD3;

  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef;

  id: string;
  svg: any;
  data: any;
  colors: Array<string>;
  firstColLabels: Array<string>;
  metricIndex: number;
  width: number;
  heigth: number;


  constructor() {
  }



  ngOnInit(): void {
    this.id = `sankey_${this.inject.id}`;
    this.data = this.inject.data;
    this.colors = this.inject.colors.length > 0 ? this.inject.colors : ChartsColors.map(color => `rgb(${color[0]}, ${color[1]}, ${color[2]} )`);
    this.metricIndex = this.inject.dataDescription.numericColumns[0].index;
    const firstNonNumericColIndex = this.inject.dataDescription.otherColumns[0].index;
    this.firstColLabels = this.data.values.map(row => row[firstNonNumericColIndex]);
    this.firstColLabels = [...new Set(this.firstColLabels)];

  }

  ngAfterViewInit() {

    if (this.svg) this.svg.remove();
    let id = `#${this.id}`;
    this.svg = d3.select(id);
    if (this.svg._groups[0][0] !== null && this.svgContainer.nativeElement.clientHeight > 0) {
      this.draw();
    }

  }


  draw() {
    const width = this.svgContainer.nativeElement.clientWidth - 20, height = this.svgContainer.nativeElement.clientHeight - 20;
    let values = this.data.values;
    let labels = this.data.labels;

    const data = values.map(row => {
      let res: any = {};
      labels.forEach((label, i) => res[label] = row[i]);
      return res;
    });

    const keys = Object.keys(data[0]);

    //Remove metric key and assign value
    const metricKey = keys.splice(this.metricIndex, 1)[0];

    const color = d3.scaleOrdinal(this.firstColLabels, this.colors).unknown("#ccc");

    let { _nodes, _links } = this.graph(keys, data, metricKey);

    //Sort links 
    for (let i = this.inject.dataDescription.otherColumns.length - 1; i >= 0; i--) {
      _links = _links.sort((a, b) => a.names[i] > b.names[i] ? 0 : -1);
    }

    const sankey: any = Sankey()
      .nodeSort(null)
      .linkSort(null)
      .nodeWidth(4)
      .nodePadding(20)
      .extent([[0, 5], [width, height - 5]]);

    const svg = this.svg;

    const { nodes, links } = sankey({
      nodes: _nodes.map(d => Object.assign({}, d)),
      links: _links.map(d => Object.assign({}, d))
    });

    svg.append("g")
      .selectAll("rect")
      .data(nodes)
      .join("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", "#242a33")
      .append("title")
      .text(d => `${d.name}\n${d.value.toLocaleString()}`)

    svg.append("g")
      .attr("fill", "none")
      .selectAll("g")
      .data(links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .on('click', (mouseevent, data) => {
        if (this.inject.linkedDashboard) {
          const props = this.inject.linkedDashboard;
          const url = window.location.href.substr( 0, window.location.href.indexOf('/dashboard')) +`/dashboard/${props.dashboardID}?${props.table}.${props.col}=${data.names[0]}`
          window.open(url, "_blank");
        }
      })
      .attr("stroke", d => color(d.names[0]))
      .attr("stroke-width", d => d.width)
      .style("mix-blend-mode", "multiply")
      .append("title")
      .text(d => {
        const link = this.inject.linkedDashboard ? `\nlinked to ${this.inject.linkedDashboard.dashboardName}` : ''
        return `${d.names.join(" → ")}\n${this.data.labels[this.metricIndex]} : ${d.value.toLocaleString()}${link}`;
      })

    svg.append("g")
      .style("font", "14px Questrial")
      .style("font-weight", 700)
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .attr("fill", "#02414c")
      .text(d => d.name)
      .append("tspan")
      .attr("fill-opacity", 0.7)
      .text(d => ` ${d.value.toLocaleString()}`);
  }


  private graph = (keys: Array<string>, data: Array<any>, metricKey: string) => {
    let index = -1;
    const nodes = [];
    const nodeByKey = new Map;
    const indexByKey = new Map;
    const links = [];

    for (const k of keys) {
      for (const d of data) {
        const key = JSON.stringify([k, d[k]]);
        if (nodeByKey.has(key)) continue;
        const node = { name: d[k] };
        nodes.push(node);
        nodeByKey.set(key, node);
        indexByKey.set(key, ++index);
      }
    }

    for (let i = 1; i < keys.length; ++i) {
      const a = keys[i - 1];
      const b = keys[i];
      const prefix = keys.slice(0, i + 1);
      const linkByKey = new Map;
      for (const d of data) {
        const names = prefix.map(k => d[k]);
        const key = JSON.stringify(names);
        const value = d[metricKey] || 1;
        let link = linkByKey.get(key);
        if (link) { link.value += value; continue; }
        link = {
          source: indexByKey.get(JSON.stringify([a, d[a]])),
          target: indexByKey.get(JSON.stringify([b, d[b]])),
          names,
          value
        };
        links.push(link);
        linkByKey.set(key, link);
      }
    }

    return { _nodes: nodes, _links: links };
  }

}

