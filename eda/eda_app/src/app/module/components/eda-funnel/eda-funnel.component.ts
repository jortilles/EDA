import { Component, Input, AfterViewInit, ElementRef, ViewChild, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import { EdaFunnel } from './eda-funnel';
import { ChartUtilsService, StyleProviderService } from '@eda/services/service.index';

import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';

interface FunnelData {
  step: number;
  value: number;
  label: string;
}


@Component({
  standalone: true,
  selector: 'eda-funnel',
  templateUrl: './eda-funnel.component.html',
  styleUrls: [],
  imports: [FormsModule, CommonModule]
})

export class EdaFunnelComponent implements AfterViewInit, OnInit, OnDestroy {

  @Input() inject: EdaFunnel;
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();

  @ViewChild('svgContainer', { static: false }) svgContainer: ElementRef;

  id: string;
  svg: any;
  data: any;
  assignedColors: any[];
  firstColLabels: Array<string>;
  metricIndex: number;
  labelIndex: number;
  width: number;
  heigth: number;
  resizeObserver!: ResizeObserver;
  paleta : any;

  div = null;


  constructor( private styleProviderService : StyleProviderService, private chartUtils : ChartUtilsService) {
  }


  ngOnInit(): void {
    this.id = `funnel_${this.inject.id}`;
    this.metricIndex = this.inject.dataDescription.numericColumns[0].index;
    const firstNonNumericColIndex = this.inject.dataDescription.otherColumns[0].index;
    this.labelIndex = firstNonNumericColIndex;
    this.data = this.inject.data;
    this.assignedColors = this.inject.assignedColors;
    this.firstColLabels = this.data.values.map(row => row[firstNonNumericColIndex]);
    this.firstColLabels = [...new Set(this.firstColLabels)];
  }

  ngAfterViewInit() {
    // Creación del SVG alineada con scatter
    const container = this.svgContainer.nativeElement as HTMLElement;

    // Crear SVG
    this.svg = d3.select(container).append('svg');

    // ResizeObserver sin atributos innecesarios
    this.resizeObserver = new ResizeObserver(entries => {
      let id = `#${this.id}`;
      this.svg = d3.select(id);
      if (this.svg._groups[0][0] !== null && this.svgContainer.nativeElement.clientHeight > 0) {
        this.draw();
      }
    });
    this.resizeObserver.observe(container);

    // Dibujar inicialmente
    if (this.svg) this.svg.remove();
    let id = `#${this.id}`;
    this.svg = d3.select(id);
    if (this.svg._groups[0][0] !== null && this.svgContainer.nativeElement.clientHeight > 0) {
      this.draw();
    }
  }

  ngOnDestroy() {
    if (this.div)
      this.div.remove();
    if (this.resizeObserver) 
      this.resizeObserver.disconnect();
  }

 // ✅ MÉTODO draw() MEJORADO PARA eda-funnel.component.ts
// Reemplazar desde la línea 94

draw() {
  // Borrado inicial de otros charts 
  this.svg.selectAll('*').remove();

  /**Vars */
  const width = this.svgContainer.nativeElement.clientWidth - 20;
  const height = this.svgContainer.nativeElement.clientHeight - 20;
  let values = this.data.values;
  
  // ✅ CORREGIDO: Usar SIEMPRE los colores de assignedColors
  // NO aplicar paleta automática si ya hay colores asignados
  let gradient1: string;
  let gradient2: string;

  if (this.assignedColors && this.assignedColors.length >= 2) {
    // ✅ Usar los colores que ya están en assignedColors
    gradient1 = this.assignedColors[0].color;
    gradient2 = this.assignedColors[1].color;
  } else {
    // ⚠️ Solo como fallback si no hay assignedColors (no debería pasar)
    const paleta = this.styleProviderService.ActualChartPalette?.['paleta'] || 
                   this.styleProviderService.DEFAULT_PALETTE_COLOR?.['paleta'] || 
                   ['#4CAF50', '#2196F3'];
    gradient1 = paleta[0];
    gradient2 = paleta[paleta.length - 1];
  }
  
  let labels = this.data.labels;
  const colorPanel = this.styleProviderService.panelFontColor.source['_value'];
  const fontPanel = this.styleProviderService.panelFontFamily.source['_value'];

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
    .style("font-family",fontPanel)
    .attr("fill", colorPanel)
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
      font-family: ${fontPanel};
      font-size: 14px;
      `)
    .style("cursor", "pointer")
    .attr("fill", colorPanel)
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
        fill: ${colorPanel};
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
    .style('stroke', colorPanel)
    .style('fill', 'none');
}
}