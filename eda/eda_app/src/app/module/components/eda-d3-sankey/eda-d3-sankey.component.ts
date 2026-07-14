import { Component, Input, AfterViewInit, ElementRef, ViewChild, OnInit, Output, EventEmitter } from '@angular/core';
import * as d3 from 'd3';
import { sankeyLinkHorizontal } from 'd3-sankey'
import { sankey as Sankey } from 'd3-sankey';
import { EdaD3 } from './eda-d3-sankey';
import { ChartUtilsService, StyleProviderService, D3TooltipService, lightenHex, sanitizeId, ensureLinearGradient, initD3ResizeObserver, teardownD3Chart } from '@eda/services/service.index';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaChartLegendComponent } from '../eda-chart-legend/eda-chart-legend.component';

@Component({
  standalone: true,
  selector: 'eda-d3',
  templateUrl: './eda-d3-sankey.component.html',
  styleUrls: ['./eda-d3-sankey.component.css'],
  imports: [FormsModule, CommonModule, EdaChartLegendComponent]
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

  chartLegend: boolean;
  legendItems: { label: string; color: string; hidden: boolean }[] = [];
  private hiddenIndexes: Set<number> = new Set();

  constructor(private chartUtilService : ChartUtilsService, private styleProviderService : StyleProviderService, private tooltipService: D3TooltipService) {
  }



  ngOnInit(): void {
    this.id = `sankey_${this.inject.id}`;
    this.chartLegend = this.inject.chartLegend ?? true;
    this.data = this.inject.data;
    this.metricIndex = this.inject.dataDescription.numericColumns[0].index;
    const firstNonNumericColIndex = this.inject.dataDescription.otherColumns[0].index;
    this.firstColLabels = this.inject.data.values.map(row => row[firstNonNumericColIndex]);
    this.firstColLabels = [...new Set(this.firstColLabels)];
    this.assignedColors = this.inject.assignedColors;

    // Set synchronously here (draw() recomputes it later) to avoid an NG0100 on the first check.
    const colorsTree = this.assignedColors?.length > 0 ? this.assignedColors.map(item => item.color) : this.colors;
    this.legendItems = this.firstColLabels.map((label, i) => ({
      label: String(label),
      color: colorsTree?.[i] || '#cccccc',
      hidden: this.hiddenIndexes.has(i)
    }));
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
    this.resizeObserver = initD3ResizeObserver(container, this.svg, () => this.draw());
  }

  ngOnDestroy(): void {
    teardownD3Chart(this.tooltipService, this.resizeObserver);
  }

  private gradientId(colorHex: string): string {
    return `sankey-grad-${this.id}-${sanitizeId(colorHex)}`;
  }

  /** Linear gradient along the link's own flow direction (left -> right), base color -> lighter. */
  private linkStroke(defs: any, hex: string): string {
    if (!(this.inject.useGradient ?? true)) return hex;
    return ensureLinearGradient(defs, this.gradientId(hex), [
      { offset: '0%', color: hex },
      { offset: '100%', color: lightenHex(hex, 30) }
    ], { x1: '0%', y1: '0%', x2: '100%', y2: '0%' });
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

    this.legendItems = this.firstColLabels.map((label, i) => ({
      label: String(label),
      color: colorsTree[i] || '#cccccc',
      hidden: this.hiddenIndexes.has(i)
    }));

    // Rows whose first-column category was hidden from the legend are excluded before rebuilding
    // the graph - node indices are sequential/positional (see graph()'s `++index`), so this can't
    // be done by filtering the already-built _nodes/_links, it has to filter the source rows and
    // let graph() rebuild the whole node/link index from scratch, same as it already does on
    // every normal draw().
    const firstKey = keys[0];
    const hiddenLabels = new Set(Array.from(this.hiddenIndexes).map(i => String(this.firstColLabels[i])));
    const visibleData = hiddenLabels.size > 0 ? data.filter((d: any) => !hiddenLabels.has(String(d[firstKey]))) : data;
    const sourceData = visibleData.length > 0 ? visibleData : data;

    let { _nodes, _links } = this.graph(keys, sourceData, metricKey);

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

    const LINK_DURATION = 700;
    const columnX0s = Array.from(new Set((links as any[]).map(d => d.source.x0))).sort((a: number, b: number) => a - b);
    const columnLevel = (d: any) => columnX0s.indexOf(d.source.x0);
    const numLevels = columnX0s.length;

    svg.append("g")
      .selectAll("rect")
      .data(nodes)
      .join("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", "#242a33")
      .attr("opacity", 0)
      .transition()
      .duration(200)
      .attr("opacity", 1)
      


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
          text += `<h6>${$localize`:@@linkedTo:Vinculado con`} ${this.inject.linkedDashboard.dashboardName}</h6>`;
        }

        this.tooltipService.show(d, text, 'eda-d3-tooltip');
      })
      .on('mouseout', (d) => {

        this.hideLinks();

        this.tooltipService.hide();

      }).on("mousemove", (d) => {

        this.tooltipService.move(d);

      })
      .each(function(d: any) {
        const totalLength = (this as SVGPathElement).getTotalLength();
        d3.select(this)
          .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
          .attr("stroke-dashoffset", totalLength)
          .transition()
          .delay(columnLevel(d) * LINK_DURATION)
          .duration(LINK_DURATION)
          .ease(d3.easeQuadOut)
          .attr("stroke-dashoffset", 0);
      });



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
      .attr("opacity", 0)
      .text(d => d.name)
      .append("tspan")
      .attr("fill-opacity", 0.7)
      .text(d => ` ${d.value.toLocaleString('de-DE', { maximumFractionDigits: 6 })}`);

    svg.selectAll("text")
      .transition()
      .delay(numLevels * LINK_DURATION - 150)
      .duration(300)
      .attr("opacity", 1);
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