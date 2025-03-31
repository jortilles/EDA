import { Component, Input, AfterViewInit, ElementRef, ViewChild, OnInit, Output, EventEmitter } from '@angular/core';
import * as d3 from 'd3';
import { sankeyLinkHorizontal } from 'd3-sankey'
import { sankey as Sankey } from 'd3-sankey';
import { ChartsColors } from '@eda/configs/index';
import { EdaD3 } from './eda-d3';
import * as dataUtils from '../../../services/utils/transform-data-utils';
import { ChartUtilsService } from '@eda/services/service.index';


@Component({
  selector: 'eda-d3',
  templateUrl: './eda-d3.component.html',
  styleUrls: ['./eda-d3.component.css']
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
  div = null;


  constructor(private chartUtilService : ChartUtilsService) {
  }



  ngOnInit(): void {
    this.id = `sankey_${this.inject.id}`;
    this.data = this.inject.data;
    this.colors = this.inject.colors.length > 0 ? this.inject.colors : ChartsColors.map(color => `rgb(${color[0]}, ${color[1]}, ${color[2]} )`);
    this.metricIndex = this.inject.dataDescription.numericColumns[0].index;
    const firstNonNumericColIndex = this.inject.dataDescription.otherColumns[0].index;
    this.firstColLabels = this.data.values.map(row => row[firstNonNumericColIndex]);
    this.firstColLabels = [...new Set(this.firstColLabels)];
    this.assignedColors = this.inject.assignedColors || []; 
  }

  ngAfterViewInit() {

    if (this.svg) this.svg.remove();
    let id = `#${this.id}`;
    this.svg = d3.select(id);
    if (this.svg._groups[0][0] !== null && this.svgContainer.nativeElement.clientHeight > 0) {
      this.draw();
    }

  }

  ngOnDestroy(): void {
    if (this.div)
      this.div.remove();
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

    //Valores de assignedColors separados
    const valuesTree = this.assignedColors.map((item) => item.value);
    const colorsTree = this.assignedColors[0].color ? this.assignedColors.map(item => item.color) : this.colors;
    
    //Funcion de ordenación de colores de D3
    const color = d3.scaleOrdinal(this.firstColLabels,  colorsTree).unknown("#ccc");

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
      
      
      svg.append("g")
      .attr("fill", "none")
      .selectAll("g")
      .data(links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
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
          //Passem aquestes dades
          const label = data.source.name;
          const filterBy = this.inject.data.labels[this.inject.data.values[0].findIndex((element) => typeof element === 'string')]
          this.onClick.emit({ label, filterBy });
        }
      })
      .on('mouseover', this.showLinks)
      .on('mouseout', this.hideLinks)
        .attr("stroke", d => { 
          //Devolvemos SOLO EL COLOR de assignedColors que comparte la data y colors de assignedColors
          return  colorsTree[valuesTree.findIndex((item) => d.names.includes(item))] || color(d.names[0]);
        })
        
      .attr("stroke-width", d => d.width)
      .style("mix-blend-mode", "multiply")
      .on('mouseover', (d, data) => {

        this.showLinks(d, data);
        let metricLabel = this.inject.dataDescription.numericColumns[0].name;

        const firstRow = `${data.names.join(" → ")}`;
        const secondRow = `${metricLabel} : ${data.value.toLocaleString('de-DE', { maximumFractionDigits: 6 })}`;
        const thirdRow = this.inject.linkedDashboard ? `linked to ${this.inject.linkedDashboard.dashboardName}` : '';

        const link = this.inject.linkedDashboard ? `<br/> <h6>${thirdRow}</h6>` : '';
        let text = `${firstRow} <br/> ${secondRow} ${link}`;

        const maxLength = dataUtils.maxLengthElement([firstRow.length, secondRow.length, thirdRow.length * (18 / 12)]);
        const pixelWithRate = 8;
        const width = maxLength * pixelWithRate + 10;

        this.div = d3.select("body").append('div')
          .attr('class', 'd3tooltip')
          .style('opacity', 0);

        this.div
          .style('width', `${width}px`)
          .style('height', 'auto');

        this.div.transition()
          .duration(200)
          .style('opacity', .9);
        this.div.html(text)
          .style('left', (d.pageX - 50 - width) + 'px')
          .style('top', (d.pageY - 80) + 'px')
          // .style('width', width)
          // .style('height', height);

      })
      .on('mouseout', (d) => {

        this.hideLinks();

        this.div.remove();

      }).on("mousemove", (d, data) => {

        this.div
          .style("left", (d.pageX - 70) + "px")
          .style("top", (d.pageY - 80) + "px");

      })



    svg.append("g")
      .style("font", "14px")
      .style("font-weight", 700)
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .style("font-family", "var(--panel-font-family)")
      //.attr("fill", "var(--panel-font-color)")
      .style("pointer-events", "none")
      .attr("fill", "white")
      .style("font-size", "var(--panel-big)")
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

