import { Component, Input, AfterViewInit, ElementRef, ViewChild, OnInit, Output, EventEmitter } from '@angular/core';
import * as d3 from 'd3';
import { EdaFunnel } from './eda-funnel';
import { ChartsColors } from '@eda/configs/index';
import * as dataUtils from '../../../services/utils/transform-data-utils';

interface FunnelData {
  step: number;
  value: number;
  label: string;
}


@Component({
  selector: 'eda-funnel',
  templateUrl: './eda-funnel.component.html',
  styleUrls: []
})

export class EdaFunnelComponent implements AfterViewInit, OnInit {

  @Input() inject: EdaFunnel;
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();

  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef;

  id: string;
  svg: any;
  data: any;
  colors: Array<string>;
  firstColLabels: Array<string>;
  metricIndex: number;
  labelIndex: number;
  width: number;
  heigth: number;


  // div = d3.select("body").append('div')
  //   .attr('class', 'd3tooltip')
  //   .style('opacity', 0);
  div = null;


  constructor() {
  }



  ngOnInit(): void {

    this.id = `funnel_${this.inject.id}`;
    this.data = this.inject.data;
    this.colors = this.inject.colors.length > 0 ? this.inject.colors : ChartsColors.filter((a, i) => i < 2).map(color => `rgb(${color[0]}, ${color[1]}, ${color[2]} )`);
    this.metricIndex = this.inject.dataDescription.numericColumns[0].index;
    const firstNonNumericColIndex = this.inject.dataDescription.otherColumns[0].index;
    this.labelIndex = firstNonNumericColIndex;
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

    /**Vars */
    const width = this.svgContainer.nativeElement.clientWidth - 20, height = this.svgContainer.nativeElement.clientHeight - 20;
    let values = this.data.values;
    let labels = this.data.labels;
    const gradient1 = this.colors[0];
    const gradient2 = this.colors[1];

    const percentages = '#093a06';
    const margin = ({ top: 25, right: 25, bottom: 35, left: 70 });
    const ledge = 0.2;
    const data: Array<FunnelData> = values.map((row, index) => {
      return { step: index, value: row[this.metricIndex], label: row[this.labelIndex] }
    });

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

    /**Functions */
    const curve = d3.curveCatmullRom.alpha(0.999999999);

    const y = d3.scaleLinear()
      .domain([-d3.max(data, ({ value }) => value), d3.max(data, ({ value }) => value)]).nice()
      .range([height - margin.bottom, margin.top]);

    const x = d3.scaleUtc()
      .domain(d3.extent(data2, ({ step }) => step))
      .range([margin.left, width - margin.right]);


    const area = d3.area()
      .curve(curve)
      .x((d: [number, number]) => x(d['step']))//step
      .y0(y(0))
      .y1((d: [number, number]) => y(d['value'])) //value

    const areaMirror = d3.area()
      .curve(curve)
      .x((d: [number, number]) => x(d['step'])) //step
      .y0(y(0))
      .y1((d: [number, number]) => y(-d['value'])) //value


    const svg = this.svg;

    svg.append('linearGradient')
      .attr('id', `${this.id}_temperature-gradient`)
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', x(1)).attr('y1', 0)
      .attr('x2', x(3)).attr('y2', 0)
      .selectAll('stop')
      .data([
        { offset: '0%', color: gradient1 },
        { offset: '100%', color: gradient2 },
      ])
      .enter().append('stop')
      .attr('offset', function (d) { return d.offset; })
      .attr('stop-color', function (d) { return d.color; });

    svg.append('path')
      .datum(data2)
      .attr('fill', `url(#${this.id}_temperature-gradient)`)
      .attr('d', area);
    svg.append('path')
      .datum(data2)
      .attr('fill',  `url(#${this.id}_temperature-gradient)`)
      .attr('d', areaMirror);
    svg.selectAll('.values')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'values')
      .attr('x', ({ step }) => x(step) + 10)
      .attr('y', 30)
      .text(({ value }) => d3.format(',')(value))
      .attr('style', `
        fill: ${values};
      `)
      .style("font-family", "var(--panel-font-family)")
      .attr("fill", "var(--panel-font-color)")
      .style("font-size", "var(--panel-big)");

    svg.selectAll('.labels')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'labels')
      .attr('x', ({ step }) => x(step) + 10)
      .attr('y', 50)
      .text(({ label }) => label)
      .attr('style', `
          font-family: var(--panel-font-family);
          font-size: 14px;
      `)
      .attr("fill", 'var(--panel-font-color)')
      .on('click', (mouseevent, data) => {
        if (this.inject.linkedDashboard) {
          const props = this.inject.linkedDashboard;
          const value = data?.label
          const url = window.location.href.slice(0, window.location.href.indexOf('/dashboard')) + `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`
          window.open(url, "_blank");
        }else{
          //Passem aquestes dades
          const label = data.label;
          const filterBy = this.inject.data.labels[this.inject.data.values[0].findIndex((element) => typeof element === 'string')]
          this.onClick.emit({label, filterBy });
        }
      });

    svg.selectAll('.percentages')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'percentages')
      .attr('x', ({ step }) =>  x(step) + 10)
      .attr('y', 70)
      .text(({ value }, index) => index === 0 ? '' : d3.format('.1%')(value / data[0].value))
      .attr('style', `
          fill: ${percentages};
          font-size: 18px;
      `);

    svg.selectAll('line')
      .data(d3.range(1, data.length ))
      .enter()
      .append('line')
      .attr('x1', value => x(value))
      .attr('y1', 10)
      .attr('x2', value => x(value))
      .attr('y2', height - 30)
      .style('stroke-width', 1)
      .style('stroke', percentages)
      .style('fill', 'none');
  }

}

