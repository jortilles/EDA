import { Component, Input, AfterViewInit, ElementRef, ViewChild, OnInit, Output, EventEmitter } from '@angular/core';
import * as d3 from 'd3';
import { sankeyLinkHorizontal } from 'd3-sankey'
import { sankey as Sankey } from 'd3-sankey';
import { EdaD3 } from './eda-d3';
import { ChartUtilsService, StyleProviderService, D3TooltipService, lightenHex, sanitizeId } from '@eda/services/service.index';

import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'eda-d3',
  templateUrl: './eda-d3.component.html',
  styleUrls: ['./eda-d3.component.css'],
  imports: [FormsModule, CommonModule]
})

export class EdaD3Component implements AfterViewInit, OnInit {

  @Input() inject: EdaD3;
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();

  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef;

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


  constructor(private chartUtilService : ChartUtilsService, private styleProviderService : StyleProviderService, private tooltipService: D3TooltipService) {
  }



  ngOnInit(): void {
    this.id = `sankey_${this.inject.id}`;
    this.data = this.inject.data;
    this.metricIndex = this.inject.dataDescription.numericColumns[0].index;
    const firstNonNumericColIndex = this.inject.dataDescription.otherColumns[0].index;
    this.firstColLabels = this.inject.data.values.map(row => row[firstNonNumericColIndex]);
    this.firstColLabels = [...new Set(this.firstColLabels)];
    this.assignedColors = this.inject.assignedColors;

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

  ngOnDestroy(): void {
    this.tooltipService.hide();
    // Disconnect resize observer
    if (this.resizeObserver)
      this.resizeObserver.disconnect();
  }

  private gradientId(colorHex: string): string {
    return `sankey-grad-${this.id}-${sanitizeId(colorHex)}`;
  }

  /** Linear gradient along the link's own flow direction (left -> right), base color -> lighter. */
  private linkStroke(defs: any, hex: string): string {
    if (!(this.inject.useGradient ?? true)) return hex;
    const id = this.gradientId(hex);
    let grad = defs.select(`#${id}`);
    if (grad.empty()) {
      grad = defs.append('linearGradient').attr('id', id);
      grad.append('stop').attr('class', 'grad-start');
      grad.append('stop').attr('class', 'grad-end');
    }
    grad.attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
    grad.select('.grad-start').attr('offset', '0%').attr('stop-color', hex);
    grad.select('.grad-end').attr('offset', '100%').attr('stop-color', lightenHex(hex, 30));
    return `url(#${id})`;
  }

  draw() {
    // Initial removal of other charts 
    this.svg.selectAll('*').remove();
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

    // Values of assignedColors separated
    const valuesTree = this.assignedColors?.length > 0 ? this.assignedColors.map((item) => item.value) : this.firstColLabels;
    const colorsTree = this.assignedColors?.length > 0 ? this.assignedColors.map(item => item.color) : this.colors;

    // Color ordering function for D3
    const color = d3.scaleOrdinal(this.firstColLabels, colorsTree);

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

    let defs = svg.select('defs');
    if (defs.empty()) defs = svg.append('defs');

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
      


    svg.append("g")
      .attr("fill", "none")
      .selectAll("g")
      .data(links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .style("cursor", "pointer")

      .on('click', (mouseevent, data) => {
        if (this.inject.linkedDashboard) {
          const props = this.inject.linkedDashboard;
          const value = this.inject.data.values.filter(row => {
            let allIn = true;
            data.names.forEach(name => {
              if (!row.includes(name)) allIn = false;
            });
            return allIn;
          })[0][this.inject.linkedDashboard.index];

          const url = window.location.href.substr(0, window.location.href.indexOf('/dashboard')) + `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`
          window.open(url, "_blank");

        } else {
          // Emit these data
          const label = data.source.name;
          const filterBy = this.inject.data.labels[this.inject.data.values[0].findIndex((element) => typeof element === 'string')]
          this.onClick.emit({ label, filterBy });
        }
      })
      .on('mouseover', this.showLinks)
      .on('mouseout', this.hideLinks)
      .attr("stroke", d => {
        // Return ONLY THE COLOR from assignedColors that matches the data, otherwise use color scale
        const hex = colorsTree[valuesTree.findIndex((item) => d.names.includes(item))] || color(d.names[0]);
        return this.linkStroke(defs, hex);
      })

      .attr("stroke-width", d => d.width)
      // REVIEW THIS
      //.style("mix-blend-mode", "multiply")
      .on('mouseover', (d, data) => {

        this.showLinks(d, data);
        const metricLabel = this.inject.dataDescription.numericColumns[0].name;

        const linkColor = colorsTree[valuesTree.findIndex((item) => data.names.includes(item))] || color(data.names[0]);
        const swatch = `<span class="eda-d3-tooltip-swatch" style="background-color:${linkColor};"></span>`;
        const valueRow = `${metricLabel} : ${data.value.toLocaleString('de-DE', { maximumFractionDigits: 6 })}`;

        let text = `<div class="eda-d3-tooltip-title">${data.names.join(" → ")}</div>` +
          `<div class="eda-d3-tooltip-row">${swatch}${valueRow}</div>`;
        if (this.inject.linkedDashboard) {
          text += `<h6>linked to ${this.inject.linkedDashboard.dashboardName}</h6>`;
        }

        this.tooltipService.show(d, text, 'eda-d3-tooltip');
      })
      .on('mouseout', (d) => {

        this.hideLinks();

        this.tooltipService.hide();

      }).on("mousemove", (d) => {

        this.tooltipService.move(d);

      })



    svg.append("g")
      .style("font", '14px')
      .style("font-weight", 700)
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .style("font-family", this.styleProviderService.panelFontFamily.source['_value'])
      //.attr("fill", "var(--panel-font-color)")
      .style("pointer-events", "none")
      .attr("fill", this.styleProviderService.panelFontColor.source['_value'])
      .style("font-size", (12 + this.styleProviderService.panelFontSize.source['_value'] * 2) + 'px')
      .text(d => d.name)
      .append("tspan")
      .attr("fill-opacity", 0.7)
      .text(d => ` ${d.value.toLocaleString('de-DE', { maximumFractionDigits: 6 })}`);
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

  showLinks(d: MouseEvent, data: any) {

    const allNamesInArray = (source: Array<string>, target: Array<string>) => {

      const biggerOne = source.length >= target.length ? source : target;
      const smallestOne = source.length < target.length ? source : target;
      let allIn = true;

      smallestOne.forEach(name => {
        if (!biggerOne.includes(name)) allIn = false;
      });

      return allIn;
    }

    d3.selectAll(`#${this.id}`).selectAll('path').filter(p => !!p['source']).style(
      'opacity',
      (p: any) => {
        return (p && allNamesInArray(data.names, p.names)) ? '1' : '0.3'
      }
    )

  }

  hideLinks() {
    d3.selectAll(`#${this.id}`).selectAll('rect').style('opacity', '1');
    d3.selectAll(`#${this.id}`).selectAll('path').style('opacity', '1');
  }

}