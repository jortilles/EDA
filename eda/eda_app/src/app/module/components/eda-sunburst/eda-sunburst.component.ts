import { ChartUtilsService, StyleProviderService, lightenHex, sanitizeId, ensureRadialGradient, initD3ResizeObserver, teardownD3Chart } from '@eda/services/service.index';
import * as d3 from 'd3'
import { Component, AfterViewInit, Input, ViewChild, ElementRef, Output, EventEmitter, OnDestroy} from '@angular/core'
import { SunBurst } from './eda-sunbrust'

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaChartLegendComponent } from '../eda-chart-legend/eda-chart-legend.component';

@Component({
  standalone: true,
  selector: 'eda-sunburst' /* tag assigned to this component */,
  templateUrl: './eda-sunburst.component.html' /** sdf */,
  styleUrls: ['./eda-sunburst.component.css'],
  imports: [FormsModule, CommonModule, EdaChartLegendComponent]
})
export class EdaSunburstComponent implements AfterViewInit, OnDestroy {
  @Input() inject: SunBurst
  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();

  div = null

  id: string
  svg: any
  data: any
  assignedColors: any[];
  labels: Array<string>
  firstColLabels: Array<string>;
  width: number
  heigth: number
  metricIndex: number
  resizeObserver!: ResizeObserver;

  chartLegend: boolean;
  legendItems: { label: string; color: string; hidden: boolean }[] = [];
  private hiddenIndexes: Set<number> = new Set();
  private hasRendered = false;

  constructor(private chartUtilService: ChartUtilsService, private styleProviderService: StyleProviderService) { }

  ngOnInit(): void {
    this.id = `sunburst_${this.inject.id}`;
    this.chartLegend = this.inject.chartLegend ?? true;
    this.metricIndex = this.inject.dataDescription.numericColumns[0].index;
    this.data = this.formatData(this.inject.data, this.inject.dataDescription);
    this.labels = this.generateDomain(this.data);
    const firstNonNumericColIndex = this.inject.dataDescription.otherColumns[0].index;
    this.firstColLabels = this.inject.data.values.map((row) => row[firstNonNumericColIndex]);
    this.firstColLabels = [...new Set(this.firstColLabels)];
    this.assignedColors = this.inject.assignedColors;

    this.legendItems = this.firstColLabels.map((label, i) => ({
      label: String(label),
      color: this.assignedColors[i]?.color || '#cccccc',
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
    this.resizeObserver = initD3ResizeObserver(container, this.svg, () => this.draw(), { skipFirstCallback: true });
  }

  ngOnDestroy(): void {
    if (this.div)
      this.div.remove();
    teardownD3Chart(undefined, this.resizeObserver);
  }

  private gradientId(hex: string, opacity: number): string {
    return `sunburst-grad-${this.id}-${sanitizeId(hex)}-${Math.round(opacity * 100)}`;
  }

  /**
   * Radial gradient, base color at the center, lighter towards the edge - same convention as
   * eda-doughnut-d3. The per-sibling opacity is baked into the stop colors (rgba) rather than
   * applied as a separate fill-opacity attribute, since mouseleave resets fill-opacity to 1 for
   * every arc - baking it into fill is what keeps the sibling shading visible at rest.
   */
  private arcFill(defs: any, hex: string, opacity: number): string {
    const inner = d3.rgb(hex);
    if (!(this.inject.useGradient ?? true)) {
      return `rgba(${inner.r}, ${inner.g}, ${inner.b}, ${opacity})`;
    }
    const outer = d3.rgb(lightenHex(hex, 30));
    return ensureRadialGradient(defs, this.gradientId(hex, opacity), [
      { offset: '0%', color: `rgba(${inner.r}, ${inner.g}, ${inner.b}, ${opacity})` },
      { offset: '100%', color: `rgba(${outer.r}, ${outer.g}, ${outer.b}, ${opacity})` }
    ]);
  }

  draw() {
    // Clear SVG before redrawing (prevents accumulation)
    this.svg.selectAll('*').remove();
    const animateEntrance = !this.hasRendered && (this.inject.chartAnimation ?? true);

    const svg = this.svg;
    const width = this.svgContainer.nativeElement.clientWidth - 40;
    let radius = width / 2;
    
    /** copy d3 objects */
    let partition = data =>
      d3.partition().size([2 * Math.PI, radius * radius])(
        d3
          .hierarchy(data)
          .sum(d => d.value)
          .sort((a, b) => b.value - a.value)
      );
      
    // D3 color sorting function
    const valuesSunburst = this.assignedColors.map((item) => item.value);
    const colorsSunburst = this.assignedColors.map(item => item.color);
    const color = d3.scaleOrdinal(this.firstColLabels, colorsSunburst);

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

    let defs = svg.select('defs');
    if (defs.empty()) defs = svg.append('defs');

    /** main processing starts */
    // Rows whose top-level category was hidden from the legend are excluded before building the
    // hierarchy - this.data here is the flat [pathString, value] array from formatData(), so
    // matching is against the first '|+-+|'-delimited segment of each row's path.
    const hiddenLabels = new Set(Array.from(this.hiddenIndexes).map(i => String(this.firstColLabels[i])));
    const visibleFlatData = hiddenLabels.size > 0
      ? this.data.filter((row: any) => !hiddenLabels.has(String(row[0].split('|+-+|')[0])))
      : this.data;
    let data = this.buildHierarchy(visibleFlatData);
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

        // Go up to the first level to assign the base color
        while (d.depth > 1) d = d.parent;
        const hex = colorsSunburst[valuesSunburst.findIndex(item => d.data.name.includes(item))] || color(d.data.name);
        // Opacity calculation
        if (original.depth > 1) {
          const siblings = original.parent.children;
          const index = siblings.indexOf(original);
          const total = siblings?.length;

          const minOpacity = 0.25;
          const maxOpacity = 1;

          // Linearly distribute between min and max, most opaque first
          if (total > 1) { opacity = maxOpacity - (index * (maxOpacity - minOpacity) / (total - 1)); }
          else { opacity = maxOpacity; } // Single child
        }

        return this.arcFill(defs, hex, opacity);
      })


      .attr('d', arc)
      .style('opacity', animateEntrance ? 0 : 1)

    if (animateEntrance) {
      path.transition().delay((d: any, i: number) => i * 15).duration(300).style('opacity', 1);
    }

    svg
      .append('g')
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .style("cursor", "pointer")
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
          .attr("font-family", this.styleProviderService.panelFontFamily.source['_value'])
          .attr("fill", this.styleProviderService.panelFontColor.source['_value'])

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
          .attr("font-family", this.styleProviderService.panelFontFamily.source['_value'])
          .attr("pointer-events", "none")

          .attr("fill", this.styleProviderService.panelFontColor.source['_value'])
        // bring it to the top
        label.raise();
        
      })
    .on('click', (mouseevent, data) => {
      if (this.inject.linkedDashboard) {
        const props = this.inject.linkedDashboard;
        const value = data.data.name;
        const url =
          window.location.href.slice(0, window.location.href.indexOf('/dashboard')) +
          `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`;
        window.open(url, "_blank");
      } else {
        const label = data.data.name;
        // search all rows until a match is found
        let idx = -1;
        for (const row of this.inject.data.values) {
          const tmpIdx = row.indexOf(label);
          if (tmpIdx !== -1) {
            idx = tmpIdx;
            break;
          }
        }
        const filterBy = idx !== -1 ? this.inject.data.labels[idx] : null;
        this.onClick.emit({ label, filterBy });
      }
    })

    this.hasRendered = true;
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

  generateDomain (data) {
    // map executes the function on each element of the array, i.e. on each row.


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

  /** copy d3 functions */
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