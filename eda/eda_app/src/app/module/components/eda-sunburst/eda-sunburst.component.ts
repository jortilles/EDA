/* JJ: La meva merda  */
import { ChartUtilsService } from '@eda/services/service.index';
import * as d3 from 'd3'
import { Component, AfterViewInit, Input, ViewChild, ElementRef, Output, EventEmitter} from '@angular/core'
import { SunBurst } from './eda-sunbrust'
import { ChartsColors } from '@eda/configs/index'

@Component({
  selector: 'eda-sunburst' /* tag que jo li dono  */,
  templateUrl: './eda-sunburst.component.html' /** sdf */,
  styleUrls: ['./eda-sunburst.component.css']
})
export class EdaSunburstComponent implements AfterViewInit {
  @Input() inject: SunBurst
  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();

  div = null

  id: string
  svg: any
  data: any
  colors: Array<string>
  assignedColors: any[];
  labels: Array<string>
  firstColLabels: Array<string>;
  width: number
  heigth: number
  metricIndex: number
  constructor(private chartUtilService : ChartUtilsService) {}
  ngOnInit(): void {
    this.id = `sunburst_${this.inject.id}` ;
    this.metricIndex = this.inject.dataDescription.numericColumns[0].index;
    this.data = this.formatData(this.inject.data, this.inject.dataDescription);
    this.labels =  this.generateDomain(this.data);
    this.colors = this.inject.colors && this.inject.colors.length > 0 ? 
      this.inject.colors : this.getColors(this.labels.length, ChartsColors);
    this.assignedColors = this.inject.assignedColors || []; 
    const firstNonNumericColIndex = this.inject.dataDescription.otherColumns[0].index;
    this.firstColLabels = this.inject.data.values.map((row) => row[firstNonNumericColIndex]);
    this.firstColLabels = [...new Set(this.firstColLabels)];
  }

  ngAfterViewInit () {
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
  ngOnDestroy(): void {
    if (this.div)
      this.div.remove();
  }
  draw() {
    const svg = this.svg
    const width = this.svgContainer.nativeElement.clientWidth - 40
    //const height = this.svgContainer.nativeElement.clientHeight - 20
    let radius = width / 2
    /** copio els objectes del d3  */
    let partition = data =>
      d3.partition().size([2 * Math.PI, radius * radius])(
        d3
          .hierarchy(data)
          .sum(d => d.value)
          .sort((a, b) => b.value - a.value)
      );
      
    //Funcion de ordenación de colores de D3
    const valuesSunburst = this.assignedColors.map((item) => item.value);
    const colorsSunburst = this.assignedColors[0].color ? this.assignedColors.map(item => item.color) : this.colors;
    const color = d3.scaleOrdinal(this.firstColLabels,  colorsSunburst).unknown("#ccc");

    let arc = d3
      .arc()
      .startAngle((d: any) => d.x0)
      .endAngle((d: any) => d.x1)
      .padAngle(1 / radius)
      .padRadius(radius)
      .innerRadius((d: any) => Math.sqrt(d.y0))
      .outerRadius((d: any) => Math.sqrt(d.y1) - 1);

    let mousearc = d3
      .arc()
      .startAngle((d: any) => d.x0)
      .endAngle((d: any) => d.x1)
      .innerRadius((d: any) => Math.sqrt(d.y0))
      .outerRadius(radius)

    /** comença la mandanga.... */
    let data = this.buildHierarchy(this.data);
    const root = partition(data)
    // Make this into a view, so that the currently hovered sequence is available to the breadcrumb
    const element = svg.node();
    element.value = { sequence: [], percentage: 0.0 }

    const label = svg
      .append('text')
      .attr('text-anchor', 'middle')
      .style('visibility', 'hidden');

    label
      .append('tspan')
      .attr('class', 'percentage')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '-0.1em')
      .attr('font-size', '4rem')
      .attr('font-weight', 'bold')
      .text('');
    label
      .append('tspan')
      .attr('class', 'values')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '1.5em')
      .attr('font-size', '3rem')
      .text('');

    svg
      .attr('viewBox', `${-radius} ${-radius} ${width} ${width}`)
      .style('max-width', `${width}px`)
    // .style('font', '12px sans-serif')

    const path = svg
      .append('g')
      .selectAll('path')
      .data(
        root.descendants().filter(d => {
          // Don't draw the root node, and for efficiency, filter out nodes that would be too small to see
          return d.depth && d.x1 - d.x0 > 0.001
        })
      )
      .join('path')
      .attr('fill', d => {
        let original = d;
        let opacity = 1;
        
        // Subimos al primer nivel para asignar color base
        while (d.depth > 1) d = d.parent;
        const rgbColor = d3.rgb(colorsSunburst[valuesSunburst.findIndex(item => d.data.name.includes(item))] || color(d.data.name)); 
      
        // Cálculo de opacidad
        if (original.depth > 1) {
          const siblings = original.parent.children;
          const index = siblings.indexOf(original);
          const total = siblings.length;
      
          const minOpacity = 0.25;
          const maxOpacity = 1;
      
          // Distribuye linealmente entre min y max, primero más opaco
          if (total > 1) { opacity = maxOpacity - (index * (maxOpacity - minOpacity) / (total - 1)); }
          else { opacity = maxOpacity; } // Solo un hijo
        }
      
        return `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${opacity})`;
      })
      .attr('d', arc)
      

    svg
      .append('g')
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseleave', () => {
        path.attr('fill-opacity', 1)
        label.style('visibility', 'hidden')
        // Update the value of this view
        element.value = { sequence: [], percentage: 0.0 }
        element.dispatchEvent(new CustomEvent('input'))
      })
      .selectAll('path')
      .data(
        root.descendants().filter(d => {
          // Don't draw the root node, and for efficiency, filter out nodes that would be too small to see
          return d.depth && d.x1 - d.x0 > 0.001
        })
      )
      .join('path')
      .attr('d', mousearc)
      .on('mouseenter', (event, d) => {
        // Get the ancestors of the current segment, minus the root
        const sequence = d
          .ancestors()
          .reverse()
          .slice(1)

        // Highlight the ancestors
        path.attr('fill-opacity', node =>
          sequence.indexOf(node) >= 0 ? 1.0 : 0.3
        )
        const percentage = ((100 * d.value) / root.value).toPrecision(3)

        // Update the value of this view with the currently hovered sequence and percentage
        element.value = { sequence, percentage }
        element.dispatchEvent(new CustomEvent('input'))

                

        label
          .style('visibility', null)
          .select('.percentage')
          .text(percentage + '%')
          .attr("font-family", "var(--panel-font-family)")
          .attr("fill", "var(--panel-font-color)")

        var my_path = ''
        sequence.forEach(path => {
          my_path = my_path + ', ' + path.data.name
        })
        my_path = my_path.slice(1)

        label
          .style('visibility', null)
          .select('.values')
          .text(
            my_path +
            ': ' +
            d.value.toLocaleString(undefined, { maximumFractionDigits: 6 })
          )
          .attr("font-family", "var(--panel-font-family)")
          .attr("pointer-events", "none")

          .attr("fill", "var(--panel-font-color)")
        // per posar-ho a dalt de tot
        label.raise();
        
      })
      .on('click', (mouseevent, data) => {
        if (this.inject.linkedDashboard) {
          const props = this.inject.linkedDashboard;
          const value = data.data.name;
          const url = window.location.href.slice(0, window.location.href.indexOf('/dashboard')) + `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`
          window.open(url, "_blank");
        } else {
          //Passem aquestes dades
          const label = data.data.name;
          const filterBy = this.inject.data.labels[this.inject.data.values[0].findIndex((element) => typeof element === 'string')]
          this.onClick.emit({label, filterBy });
        }
      });
  }

  formatData (data, dataDescription) {
    let result = [];
    data.values.forEach(row => {
      let path = ''
      let element = [];
      dataDescription.otherColumns.forEach(col => {
        if (!!row[col.index]) {
          path = path + '|+-+|' + row[col.index]
        }else{
          path = path + '|+-+|';
        }
      })
      path = path.slice(5);
      if( row[this.metricIndex] !== null &&  !isNaN(row[this.metricIndex])){
        element.push(path);
        element.push(row[this.metricIndex]);
      }else{
        console.log('Sunbrust Format Data. HERE SHOULD NOT BE NULL DATA ');
      }


      result.push(element);
    })
    return result
  }

  getColors (dataLength, colors) {
    const colorsLength = colors.length
    let outputColors: Array<any> = colors

    if (dataLength > colorsLength) {
      let repeat = Math.ceil(dataLength / colorsLength)
      for (let i = 0; i < repeat - 1; i++) {
        outputColors = [...outputColors, ...colors]
      }
    }

    return outputColors
      .filter((_, index) => index < dataLength)
      .map(color => `rgb(${color[0]}, ${color[1]}, ${color[2]} )`)
  }

  generateDomain (data) {
    // map executa la funció sobre cada element del array. Es a dir sobre cada fila.


    let foo = data.map(elem => elem.filter(value => typeof value !== 'number'))
    let arr = Array.prototype.concat.apply([], foo);
    let ancestors = [];

    if(arr.length > 0 ){
      let row = arr[0].split('|+-+|');
      row.forEach((element,index) => {
        let currentLevel = arr.map(element =>  element.split('|+-+|')[index]  );
        currentLevel = new Set(currentLevel);
        ancestors = [...currentLevel];
      });      

    }
    
    ancestors = ancestors.concat(arr);


    return ancestors;
  }

  /** copio les funcions del d3 */
  private buildHierarchy (data) {
    // Helper function that transforms the given data into a hierarchical format.
    const root = { name: 'root', children: [] }
    for (let i = 0; i < data.length; i++) {
      const sequence = data[i][0]
      const size = +data[i][1]
      if (isNaN(size) || size === null ) {
        // e.g. if this is a header row
        continue
      }
      const parts = sequence.split('|+-+|')
      let currentNode = root
      for (let j = 0; j < parts.length; j++) {
        const children = currentNode['children']
        const nodeName = parts[j]
        let childNode = null
        if (j + 1 < parts.length) {
          // Not yet at the end of the sequence; move down the tree.
          let foundChild = false
          for (let k = 0; k < children.length; k++) {
            if (children[k]['name'] == nodeName) {
              childNode = children[k]
              foundChild = true
              break
            }
          }
          // If we don't already have a child node for this branch, create it.
          if (!foundChild) {
            childNode = { name: nodeName, children: [] }
            children.push(childNode)
          }
          currentNode = childNode
        } else {
          // Reached the end of the sequence; create a leaf node.
          // IF THRE ARE NOT NULL VALUES
          if(size !== null){
            childNode = { name: nodeName, value: size }
            children.push(childNode)
          }else{
            console.log('Here should not be null values ;) ');
          }

        }
      }
    }
    return root;
  }
}
