import {
  Component,
  Input,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnInit
} from '@angular/core'
import * as d3 from 'd3'
import { EdaBarchart } from './eda-barchart'
import { ChartsColors } from '@eda/configs/index'

// https://stackblitz.com/edit/angular-d3-v4-barchart?file=app%2Fshared%2Fbarchart%2Fbarchart.component.ts

interface FunnelData {
  step: number
  value: number
  label: string
}

@Component({
  selector: 'eda-barchart',
  templateUrl: './eda-barchart.component.html',
  styleUrls: ['./eda-barchart.component.css']
})
export class EdaBarchartComponent implements AfterViewInit, OnInit {
  @Input() inject: EdaBarchart

  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef

  id: string
  id_div: string
  svg: any
  data: any
  colors: Array<string>
  firstColLabels: Array<string>
  metricIndex: number
  labelIndex: number
  width: number
  heigth: number


  constructor() { }

  ngOnInit(): void {
    this.id = `barchart_${this.inject.id}`
    this.id_div = `barchart_tooltip_${this.inject.id}`
    this.data = this.inject.data
    this.colors =
      this.inject.colors.length > 0
        ? this.inject.colors
        : ChartsColors.filter((a, i) => i < 2).map(
          color => `rgb(${color[0]}, ${color[1]}, ${color[2]} )`
        )
    this.metricIndex = this.inject.dataDescription.numericColumns[0].index
    const firstNonNumericColIndex =
      this.inject.dataDescription.otherColumns[0].index
    this.labelIndex = firstNonNumericColIndex
    this.firstColLabels = this.data.values.map(
      row => row[firstNonNumericColIndex]
    )
    this.firstColLabels = [...new Set(this.firstColLabels)]
  }

  ngAfterViewInit() {
    if (this.svg) this.svg.remove()
    let id = `#${this.id}`
    this.svg = d3.select(id)
    if (
      this.svg._groups[0][0] !== null &&
      this.svgContainer.nativeElement.clientHeight > 0
    ) {
      this.draw()
    }
  }


  /** Determina si una etiqueta se debe mostraar */
  computeLabelShow(d,i, bar_width){
    var res = 1;
    if(bar_width <35){
      if(bar_width <18){
        if( i % 3 == 0){
          res = 0;
        }
      }else{
        if( i % 2 == 0){
          res = 0;
        }
      }
    
    }
    return res;
  }
/** Genera colors per hover */
  shadeColor(color, percent) {

    var R = (parseInt(color.substring(1, 3), 16));
    var G = (parseInt(color.substring(3, 5), 16));
    var B = (parseInt(color.substring(5, 7), 16));

    R = (R * (100 + parseInt(percent))) / 100;
    G = (G * (100 + parseInt(percent))) / 100;
    B = (B * (100 + parseInt(percent))) / 100;


    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    var RR = ((R.toString(16).length == 1) ? "0" + R.toString(16) : R.toString(16));
    var GG = ((G.toString(16).length == 1) ? "0" + G.toString(16) : G.toString(16));
    var BB = ((B.toString(16).length == 1) ? "0" + B.toString(16) : B.toString(16));

    return "#" + RR + GG + BB;
  }

  draw() {
    // Grouped: https://d3-graph-gallery.com/graph/barplot_grouped_basicWide.html
    // https://perials.github.io/responsive-bar-chart-with-d3/
    
    console.log(this.data);
    
    const svg = this.svg;
    const id_div = this.id_div;

    /**Vars */
    const width = this.svgContainer.nativeElement.clientWidth,
      height = Math.floor(this.svgContainer.nativeElement.clientHeight)*0.9,
      margin_h = Math.ceil(height * 0.05),
      margin_w = width < 600 ? Math.ceil(width * 0.1) : Math.ceil(width * 0.05),
      margin_h_bottom = Math.ceil(height * 0.2),
      spacing = 2;
    const data: Array<number> = this.data.values.map((row, index) => {
      return row[this.metricIndex]
    })
    const labels: Array<string> = this.data.values.map((row, index) => {
      return row[this.labelIndex]
    })
    const colors = this.colors;
    const dataset =  this.data.values;



    var Tooltip = d3.select( 'app-root' )
    
    .append("div")
    .attr('class', 'edaD3Tooltip')
    .text("catonsdfs")
    .attr('id', 'tooltip'+id_div)
    .attr('style', 'position: absolute; opacity: 0;')
    .style("z-index","1000")


  // ubico la etiqueta donde toca y la relleno
  var mouseenter = function(d,i) {
     const text = dataset.filter(e => { return e[1] === i     }) // Recupero la etiqueta
    Tooltip
      .attr('style', ` z-index: 1000; position: absolute; opacity: 1;  `)
      .text("The exact value of<br>this cell is: " + text[0])
      .style('left', (d.pageX+10) + 'px')
      .style('top', (d.pageY+10) + 'px')
  }
    // ubico la etiqueta donde toca y la relleno
    var mousemove = function(d,i) {
      const text = dataset.filter(e => { return e[1] === i     }) // Recupero la etiqueta
     Tooltip
       .attr('style', ` z-index: 1000; position: absolute; opacity: 1;  `)
       .text("The exact value of<br>this cell is: " + text[0])
       .style('left', (d.pageX+10) + 'px')
       .style('top', (d.pageY+10) + 'px')
   }

  var mouseleave = function(d) {
    Tooltip
      .style("opacity", 0)
  }


    svg.attr("width", width)
      .attr("height", height);
    const bar_width = Math.round((width - (margin_w * 2)) / data.length);

    const max_value = (Math.ceil(Math.max(...data.map(o => o)) / 1000000) * 1000000);

  



    // Y Axis
    const yScale = d3
      .scaleLinear()
      .domain([max_value, 0])
      .range([0, height - (margin_h + margin_h_bottom)])
    svg
      .append('g')
      .attr('transform', `translate(${margin_w}, ${margin_h} )`)
      .attr("class", "axisLeft")
      .call(d3.axisLeft(yScale).ticks(3).tickFormat(d3.format(".2s")))
      .call(g => g.select(".domain").remove())  // borra la linea de dominio
      .selectAll('text')
      .style("font-family", "var(--panel-font-family)")
      .attr("fill", "var(--panel-font-color)")
      .style("font-size", "var(--panel-big)")


    // X Axis
    const xScale = d3
      .scaleBand()
      .domain(labels)
      .range([0, width - (margin_w * 2)])

    const position = height - (margin_h_bottom)
    svg
      .append('g')
      .attr('transform', `translate(${margin_w}, ${position} )`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-1.2em')
      .attr('dy', '-0.2em')
      .attr('transform', 'rotate(-55)')
     // .attr("transform", "translate(-10,0)rotate(-45)")
      .style("font-family", "var(--panel-font-family)")
      .attr("fill", "var(--panel-font-color)")
      .style("font-size", "var(--panel-big)")
      .attr("opacity", (d,i) =>   this.computeLabelShow(d,i, bar_width) );




  // Another scale for subgroup position?
  var xSubgroup = d3.scaleBand()
    .domain(labels)
    .range([0, xScale.bandwidth()])

  // color palette = one color per subgroup
  var color = d3.scaleOrdinal()
    .domain(labels)
    .range(['#e41a1c','#377eb8','#4daf4a'])



    /**Escala de valores  */
    const scale = d3.scaleLinear();
    scale
      .domain([0, max_value])
      .range([0, height - margin_h - margin_h_bottom]);

  

        // Barras
   let bars =  svg.append("g")
   .selectAll("g")
   .data(data)
   .enter()
   .append("g")
  // .attr("transform", function(d) { return "translate(" + xScale(d[0]) + ",0)"; })
   .selectAll("rect")
   .data(function(d) { return labels.map(function(key) { return {key: key, value: d[key]}; }); })
   .enter().append("rect")
     .attr("x", function(d) { return xSubgroup(d.key); })
     .attr("y", function(d) { return yScale(d.value); })
     .attr("width", xSubgroup.bandwidth())
     .attr("height", (d, i) => scale(d))
     .attr("fill", function(d) { return color(d.key); });
 /*
 bars.append("rect")
   .attr("fill", colors[0])
   .attr("height", (d, i) => scale(d))
   .attr("x", (d, i) => margin_w + (bar_width * i))
   .attr("y", (d, i) => height - margin_h_bottom - scale(d))
   .attr("width", bar_width - spacing)
   */
   bars
   .on("mouseenter", mouseenter)

   .on("mouseleave", mouseleave)
   .on("mousemove", mousemove) 





 


    // Grid lines
      svg.selectAll("line.horizontalGrid").data(yScale.ticks(3)).enter()
      .append("line")
     // .attr('transform', `translate(${margin_w}, ${margin_h} )`)
      .attr("class", "horizontalGrid") 
      .attr('transform', `translate(${margin_w}, ${margin_h} )`)
      .attr("x1",  "0" ) 
      .attr("x2",  (width - (margin_w * 2) ) ) 
      .attr("y1", (d)=>yScale(d)) 
      .attr("y2",  (d)=> yScale(d) ) 
      .attr("stroke", "var(--panel-font-color)") 
      .attr("stroke-width", "0.2px") 



    /**************************************************************************** */
  }
}
