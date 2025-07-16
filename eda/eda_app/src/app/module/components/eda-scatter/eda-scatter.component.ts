import { ChartUtilsService } from '@eda/services/service.index';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild, ViewEncapsulation } from "@angular/core";
import { ChartsColors } from '@eda/configs/index';
import * as d3 from 'd3';
import { ScatterPlot } from "./eda-scatter";
import * as _ from 'lodash';
import * as dataUtils from '../../../services/utils/transform-data-utils';


@Component({
  selector: 'eda-d3',
  templateUrl: './eda-scatter.component.html',
  styleUrls: ['./eda-scatter.component.css'],
  encapsulation: ViewEncapsulation.Emulated
})


export class EdaScatter implements AfterViewInit {

  @Input() inject: ScatterPlot;
  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef;
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();

  div = null;

  id: string;
  svg: any;
  data: any;
  colors: Array<string>;
  assignedColors: any[];
  firstColLabels: Array<string>;
  metricIndex: number;
  width: number;
  heigth: number;

  constructor(private chartUtilService : ChartUtilsService){

  }

  ngOnInit(): void {
    this.id = `scatterPlot_${this.inject.id}`;
    this.data = this.formatData(this.inject.data);
    this.colors = this.inject.colors && this.inject.colors.length >= this.data.length ? 
    this.inject.colors : this.getColors();
    const firstNonNumericColIndex = this.inject.dataDescription.otherColumns[0].index;
    this.firstColLabels = this.inject.data.values.map(row => row[firstNonNumericColIndex]);
    this.firstColLabels = [...new Set(this.firstColLabels)];
    this.assignedColors = this.inject.assignedColors || []; 
  }
  ngOnDestroy(): void {
    if (this.div)
      this.div.remove();
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

    const svg = this.svg;
    const width = this.svgContainer.nativeElement.clientWidth - 20;
    const height = this.svgContainer.nativeElement.clientHeight - 20;
    const margin = ({ top: 50, right: 50, bottom: 35, left: 100 });

    //Valores de assignedColors separados
    const valuesScatter = this.assignedColors.map((item) => item.value);
    const colorsScatter = this.assignedColors[0].color ? this.assignedColors.map(item => item.color) : this.colors;
    
    //Funcion de ordenación de colores de D3
    const color = d3.scaleOrdinal(this.firstColLabels,  colorsScatter).unknown("#ccc");

    const x_range: Array<any> = d3.extent(this.data, (d: any) => d.x);
    const y_range: Array<any> = d3.extent(this.data, (d: any) => d.y);

    const x = d3.scaleLinear()
      .domain(x_range).nice()
      .range([margin.left, width - margin.right])

    const y = d3.scaleLinear()
      .domain(y_range).nice()
      .range([height - margin.bottom, margin.top])

    const grid = g => g
      .attr("stroke", "currentColor")
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
        .attr("fill", "var(--panel-font-color)")
        .attr("font-family", "var(--panel-font-family)")
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
        .attr("fill", "var(--panel-font-color)")
        .attr("font-family", "var(--panel-font-family)")
        .attr("font-size", "var(--panel-big)")
        .attr("text-anchor", "end")
        .text(`→ ${this.inject.dataDescription.numericColumns[0].name}`));

    svg.append("g")
      .call(xAxis);

      svg.append("g")
      .call(yAxis);

    svg.append("g")
      .call(grid);

    svg.append("g")
      .attr("stroke-width", 1.5)
      .attr("fill", "var(--panel-font-color)")
      .attr("font-family", "var(--panel-font-family)")
      .attr("font-size", 10)
      .selectAll("circle")
      .data(this.data)
      .join("circle")
      .attr("cx", d => x(d.x))
      .attr("cy", d => y(d.y))
      .attr("r", d => d.radius + 1)
      .attr("fill", d => { 
        while (d.depth > 1) d = d.parent;
        //Devolvemos SOLO EL COLOR de assignedColors que comparte la data y colors de assignedColors
        return colorsScatter[valuesScatter.findIndex((item) => d.label.includes(item))] || color(d.label);
      })
      .on('click', (e, data) => {
        if (this.inject.linkedDashboard) {
          const props = this.inject.linkedDashboard;
          const value = data.data.name;
          const url = window.location.href.slice(0, window.location.href.indexOf('/dashboard')) + `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`
          window.open(url, "_blank");
        }
      })
      .on('mouseover', (d, data) => {
        
        
        let categoryText = data.category ? `${this.inject.dataDescription.otherColumns[0].name} : ${data.category} ` : '';
        let serieText = data.category ? `${this.inject.dataDescription.otherColumns[1].name}  : ${data.label}`
        : `${this.inject.dataDescription.otherColumns[0].name} : ${data.label}`;
        let metricText = data.metricValue ?
        ` ${this.inject.dataDescription.numericColumns[2].name} :  ${data.metricValue.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
        : ``;
        
        let linkedText = this.inject.linkedDashboard ? `Linked to ${this.inject.linkedDashboard.dashboardName} </h6>` : '';
        
        const maxLength = dataUtils.maxLengthElement([categoryText.length, serieText.length, metricText.length, linkedText.length]);
        const pixelWithRate = 7;
        const width = maxLength * pixelWithRate;
        
        let text = categoryText ? `${categoryText}<br/>` : '';
        text = serieText ? text + `${serieText}<br/>` : text;
        text = metricText ? text + `${metricText}<br/>` : text;
        text = this.inject.linkedDashboard ? text + `<h6> ${linkedText} </h6>` : text;
        
        let height: any = this.inject.linkedDashboard ? 5 : 3;
        height = data.category ? height + 1 + 'em' : height + 'em';
        
        this.div = d3.select("app-root").append('div')
        .attr('class', 'd3tooltip')
        .attr('id', 'scatterDiv')
        .style('opacity', 0);
        
        this.div.transition()
        .duration(200)
          .style('opacity', .9);
          this.div.html(text)
          .style('left', (d.pageX - 81) + 'px')
          .style('top', (d.pageY - 49) + 'px')
          .style('width', `${width}px`)
          .style('height', height)
          .style('line-height', 1.1);
        })
        .on('mouseout', (d) => {
          this.div.remove();
      }).on("mousemove", (d, data) => {
        const sizes = this.div.node().getBoundingClientRect();
        this.div
          .style("top", (d.pageY - sizes.height - 7) + "px")
          .style("left", (d.pageX - sizes.width / 2) + "px");
        }).on('click', (mouseevent, data) => {
          
        if (this.inject.linkedDashboard) {
          const props = this.inject.linkedDashboard;
          const value = data.category ? data.category : data.label;
          const url = window.location.href.substr(0, window.location.href.indexOf('/dashboard')) + `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`
          window.open(url, "_blank");
        }else {
          //Passem aquestes dades
          const label = data.label;
          const filterBy = this.inject.data.labels[this.inject.data.values[0].findIndex((element) => typeof element === 'string')]
          this.onClick.emit({label, filterBy});
        }
    
      })
  }

getColors () {
     let MAX_ITERATIONS = 1000;
        let out = [];
        let col = ChartsColors;

        for (let i = 0; i < MAX_ITERATIONS; i += 50) {

            for (let j = 0; j < col.length; j++) {
                out.push(`rgba(${(col[j][0] + i) % 255}, ${(col[j][1] + i) % 255}, ${(Math.abs(col[j][2] + i)) % 255}, 0.8)`);
            }
        }
        return out;
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