import { Component, ViewChild, Input, ElementRef, OnInit, Output, EventEmitter } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StyleProviderService } from '@eda/services/service.index';
import { Table } from 'primeng/table';
// import { FilterUtils } from 'primeng/utils';
import { EdaTable } from './eda-table';
import { registerLocaleData } from '@angular/common';

import es from '@angular/common/locales/es';
import * as _ from 'lodash';
import { StyleService } from '@eda/services/service.index';
import { EdaColumnChartOptions } from './eda-columns/eda-column-chart-options';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';     // si usas paginator
import { ButtonModule } from 'primeng/button';          // si tienes botones en la tabla
import { InputTextModule } from 'primeng/inputtext';    // si usas filtros con input

// tests
import { TooltipModule } from 'primeng/tooltip'; 
import { MultiSelectModule } from 'primeng/multiselect';
import { ChartModule } from 'primeng/chart';
import { EdaContextMenuComponent } from '@eda/shared/components/shared-components.index';
import { DialogModule } from 'primeng/dialog';  // <--- importar módulo de PrimeNG


@Component({
    standalone: true,
    selector: 'eda-table',
    templateUrl: './eda-table.component.html',
    styleUrls: ['./eda-table.component.css'],
    imports: [
        CommonModule,
        FormsModule,
        TableModule,      
        PaginatorModule, 
        ButtonModule,
        InputTextModule,
        TooltipModule,
        MultiSelectModule,
        ChartModule,
        EdaContextMenuComponent,
        DialogModule,
    ]
})
export class EdaTableComponent implements OnInit {
    @ViewChild('table', { static: false }) table: Table;
    @Input() inject: EdaTable;
    @Output() onClick: EventEmitter<any> = new EventEmitter<any>();

    data: any;
    chartOptions: any;

    public lodash: any = _;
    public colors = {};
    public styles = {};

    constructor(
        private elementRef: ElementRef,
        private styleService: StyleService,
        private styleProviderService: StyleProviderService,
        private sanitizer: DomSanitizer
    ) {
        registerLocaleData(es);
        /** Definim les caracteristiques del gràfic dintre de la taula.......................... */
        this.chartOptions = EdaColumnChartOptions;
    }
    ngOnInit(): void {


        if(this?.inject?.styles && !this.inject.pivot){
            this.applyStyles(this.inject.styles)
        }else if(this?.inject?.styles && this.inject.pivot){
            this.applyPivotSyles(this.inject.styles)
        }

    }


    _tableFilter(table: Table, value: any, col: any) {
        return table.filter(value, col.field, col.filter.comparationMethod);
    }

    verifyFilter() {
        return _.find(this.inject.cols, 'filter') && this.inject.value && this.inject.value.length > 0;
    }

    handleClick(item: any, colname: string) {
        if (this.inject.linkedDashboardProps && this.inject.linkedDashboardProps.sourceCol === colname) {
            const props = this.inject.linkedDashboardProps;
            const url = window.location.href.substr(0, window.location.href.indexOf('/dashboard')) + `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${item}`;
            
            window.open(url, "_blank");
            
        } else {
            let filterBy = colname;
            let label = item;
            // Buscar el tipo de columna para verificar si es html
            const col = this.inject.cols.find(c => c.field === colname);
            const colType = col ? col.type : null;
            
            // No emitir evento para columnas numéricas ni HTML
            if (typeof label !== 'number' && colType !== 'EdaColumnHtml') {
                this.onClick.emit({ label, filterBy });
            }}
    }

    getTooltip = (col: any) => {
        if(col.description === undefined) return ``;
        return `${col.description}` || ``
    };

    getLinkTooltip(col) {
        return `${col.header} column linked to:\n${this.inject.linkedDashboardProps.dashboardName}`;
    }

    getSafeHtml(html: string): SafeHtml {
        if (!html) return '';
        return this.sanitizer.bypassSecurityTrustHtml(html);
    }

    handleHtmlClick(event: MouseEvent) {
        event.stopPropagation();
        const target = event.target as HTMLElement;
        // Con pointer-events:none en <a>, los clics siempre aterrizan en el <div>, por lo que se busca <a> en los elementos secundarios.
        const anchor = target.querySelector('a') as HTMLAnchorElement;
        if (anchor) {
            const href = anchor.getAttribute('href');
            const anchorTarget = anchor.getAttribute('target');
            if (href) {
                window.open(href, anchorTarget || '_self');
            }
        }
    }

    getStyleClass(col, rowData) {
        if (this.styles[col.field]) {
            const styleEntry = this.styles[col.field];
            let field = col.field;
            if(this.inject.pivot) field = styleEntry.value;

            field = this.getNiceName(field);

            const cellValue = parseFloat(rowData[col.field]);
            if (isNaN(cellValue)) return null;

            // Si es semaforo devolveremos uno de los 3 colores
            if (styleEntry.type === 'semaphore') {
                if (cellValue > styleEntry.value1) return `table-semaphore-${field}-0`;
                else if (cellValue >= styleEntry.value2) return `table-semaphore-${field}-1`;
                else return `table-semaphore-${field}-2`;
            }

            // Si es gradiente devolveremos uno de los 5 rangos que generamos
            let cellClass = null;
            if (cellValue < parseFloat(styleEntry.ranges[0])) cellClass = `table-gradient-${field}-${0}`
            else if (cellValue < parseFloat(styleEntry.ranges[1])) cellClass = `table-gradient-${field}-${1}`;
            else if (cellValue < parseFloat(styleEntry.ranges[2])) cellClass = `table-gradient-${field}-${2}`;
            else if (cellValue < parseFloat(styleEntry.ranges[3])) cellClass = `table-gradient-${field}-${3}`;
            else  cellClass = `table-gradient-${field}-${4}`;

            // Devolvemos la clase de estilo que queremos aplicar a la columna
            return cellClass;
        }
        return null;
    }

    getStyle() {
        if(this.styleProviderService.pageStylesApplied.source['_value'] && Object.keys(this.styles).length === 0) 
        return {
            'color': this.styleProviderService.panelFontColor.source['_value'],
            'font-family': this.styleProviderService.panelFontFamily.source['_value'],
            'background': this.styleProviderService.panelColor.source['_value'] 
            }
        return;
    }

    public applyStyles(styles: Array<any>) {
        // Verificamos que tipo de limites numericos estamos trantado
        const gradientStyles = styles.filter(s => !s.type || s.type === 'gradient');
        const semaphoreStyles = styles.filter(s => s.type === 'semaphore');
        const limits = {};

        //Initialize 
        // Si los estilos que entran son gradientes...
        if (gradientStyles.length > 0) {
            const fields = gradientStyles.map(style => style.col);

            fields.forEach(field => {
                limits[field] = { min: Infinity, max: -Infinity, rangeValue: 0, ranges: []};
            });

        //Set values
            this.inject.value.forEach(row => {

                fields.forEach(field => {
                    if (parseFloat(row[field]) > limits[field].max) limits[field].max = parseFloat(row[field]);
                    if (parseFloat(row[field]) < limits[field].min) limits[field].min = parseFloat(row[field]);
                });

            });
        //console.log(limits);

        //Set ranges
            fields.forEach(field => {
                limits[field].rangeValue = (limits[field].max - limits[field].min) / 5;
                let downLimit = limits[field].min;
                for (let i = 0; i < 5; i++) {
                    let value = downLimit + limits[field].rangeValue
                    limits[field].ranges.push(value);
                    downLimit = value;
                }
            });


            Object.keys(limits).forEach((key, i) => {

                const colors = this.generateColor(gradientStyles[i].max, gradientStyles[i].min, 5);

                colors.forEach((color, i) => {
                    const name = this.getNiceName(key)
                    this.elementRef.nativeElement.style.setProperty(`--table-gradient-bg-color-${name}-${i}`, `#${color} `);
                    this.styleService.setStyles(`.table-gradient-${name}-${i}`,
                    {
                        // color:'',
                        borderWidth: '1px ',
                        borderStyle: 'solid ',
                        borderColor: 'white ',
                        backgroundColor:`var(--table-gradient-bg-color-${name}-${i}) `,
                    });
                });
            });
            
        }

        // Si los estilos que entran son SEMAFORICOS<...
        if (semaphoreStyles.length > 0) {
            semaphoreStyles.forEach(style => {
                const field = style.col;
                const name = this.getNiceName(field);

                limits[field] = {
                    type: 'semaphore',
                    value1: style.value1,
                    value2: style.value2
                };

                const semaphoreColors = [style.color1, style.color2, style.color3];
                semaphoreColors.forEach((color, i) => {
                    const hexColor = color.startsWith('#') ? color : `#${color}`;
                    this.elementRef.nativeElement.style.setProperty(`--table-semaphore-bg-color-${name}-${i}`, hexColor);
                    this.styleService.setStyles(`.table-semaphore-${name}-${i}`,
                    {
                        borderWidth: '1px ',
                        borderStyle: 'solid ',
                        borderColor: 'white ',
                        backgroundColor:`var(--table-semaphore-bg-color-${name}-${i}) `,
                    });
                });
            });
        }

        // Devlolvemos los limites para luego saber que color aplicar
        this.styles = limits;

    }

    applyPivotSyles(styles){
        const gradientStyles = styles.filter(s => !s.type || s.type === 'gradient');
        const semaphoreStyles = styles.filter(s => s.type === 'semaphore');
        // Si los estilos que entran son gradientes...
        if (gradientStyles.length > 0) {
            const fields = gradientStyles.map(style => style.col);
            const limits = {};

            //Initialize 
            fields.forEach(field => {
                limits[field] = { min: Infinity, max: -Infinity, rangeValue: 0, ranges: [], cols:gradientStyles.filter(s => s.col === field)[0].cols  };
            });

           //Set values
            this.inject.value.forEach(row => {

                fields.forEach(field => {

                    let style = gradientStyles.filter(style => style.col === field)[0];
                    
                    style.cols.forEach(col => {

                        if (parseFloat(row[col]) > limits[field].max) limits[field].max = parseFloat(row[col]);
                        if (parseFloat(row[col]) < limits[field].min) limits[field].min = parseFloat(row[col]);
                    });
                
                });

            });

            //Set ranges
            fields.forEach(field => {
                limits[field].rangeValue = (limits[field].max - limits[field].min) / 5;
                let downLimit = limits[field].min;
                for (let i = 0; i < 5; i++) {
                    let value = downLimit + limits[field].rangeValue
                    limits[field].ranges.push(value);
                    downLimit = value;
                }
            });

            Object.keys(limits).forEach((key, i) => {

                const colors = this.generateColor(gradientStyles[i].max, gradientStyles[i].min, 5);
                colors.forEach((color, i) => {
                    const name = this.getNiceName(key)
                    this.elementRef.nativeElement.style.setProperty(`--table-gradient-bg-color-${name}-${i}`, `#${color}`);
                    this.styleService.setStyles(`.table-gradient-${name}-${i}`,
                    {
                        borderWidth: '1px ',
                        borderStyle: 'solid ',
                        borderColor: 'white ',
                        backgroundColor:`var(--table-gradient-bg-color-${name}-${i})`,
                    });
                });

            });
            let tmpStyles = {};

            Object.keys(limits).forEach(key => {

                const value = limits[key]

                value.cols.forEach(col => {
                    tmpStyles[col] = {
                        max:value.max,
                        min:value.min,
                        rangeValue:value.rangeValue,
                        ranges:value.ranges,
                        value:key
                    }
                });
            });
        }

        let tmpStyles = {};
        // Aplicamos estilos si es semaforico
        if (semaphoreStyles.length > 0) {
            semaphoreStyles.forEach(style => {
                const name = this.getNiceName(style.col);

                const semaphoreColors = [style.color1, style.color2, style.color3];
                semaphoreColors.forEach((color, i) => {
                    const hexColor = color.startsWith('#') ? color : `#${color}`;
                    this.elementRef.nativeElement.style.setProperty(`--table-semaphore-bg-color-${name}-${i}`, hexColor);
                    this.styleService.setStyles(`.table-semaphore-${name}-${i}`,
                    {
                        borderWidth: '1px ',
                        borderStyle: 'solid ',
                        borderColor: 'white ',
                        backgroundColor:`var(--table-semaphore-bg-color-${name}-${i})`,
                    });
                });

                if (style.cols) {
                    style.cols.forEach(col => {
                        tmpStyles[col] = {
                            type: 'semaphore',
                            value1: style.value1,
                            value2: style.value2,
                            value: style.col
                        };
                    });
                }
            });
        }

        this.styles = tmpStyles;

    }

    /**Genertate range colors =>> thanks to Euler Junior: https://stackoverflow.com/a/32257791 */

    public hex = (c) => {
        var s = "0123456789abcdef";
        var i = parseInt(c);
        if (i == 0 || isNaN(c))
            return "00";
        i = Math.round(Math.min(Math.max(0, i), 255));
        return s.charAt((i - i % 16) / 16) + s.charAt(i % 16);
    }

    /* Convert an RGB triplet to a hex string */
    public convertToHex = (rgb) => {
        return this.hex(rgb[0]) + this.hex(rgb[1]) + this.hex(rgb[2]);
    }

    /* Remove '#' in color hex string */
    public trim = (s) => { return (s.charAt(0) == '#') ? s.substring(1, 7) : s }

    /* Convert a hex string to an RGB triplet */
    public convertToRGB = (hex) => {
        var color = [];
        color[0] = parseInt((this.trim(hex)).substring(0, 2), 16);
        color[1] = parseInt((this.trim(hex)).substring(2, 4), 16);
        color[2] = parseInt((this.trim(hex)).substring(4, 6), 16);
        return color;
    }

    public generateColor = (colorStart, colorEnd, colorCount) => {

        // The beginning of your gradient
        var start = this.convertToRGB(colorStart);

        // The end of your gradient
        var end = this.convertToRGB(colorEnd);

        // The number of colors to compute
        var len = colorCount;

        //Alpha blending amount
        var alpha = 0.0;

        var saida = [];

        for (let i = 0; i < len; i++) {
            var c = [];
            alpha += (1.0 / len);

            c[0] = start[0] * alpha + (1 - alpha) * end[0];
            c[1] = start[1] * alpha + (1 - alpha) * end[1];
            c[2] = start[2] * alpha + (1 - alpha) * end[2];

            saida.push(this.convertToHex(c));

        }

        return saida;

    }

    private getNiceName(name) {
        return name.replace('%', 'percent').replace(/ /g, '').replace(/[^a-zA-Z0-9-_-\wáéíóúüñÁÉÍÓÚÜÑ ]/g, '').replace('_','');
    }

    public getColor(valor: number) { 

        // modificar el true por una variable que se modifica en la edición de valores negativos. 

        if(valor<0 && this.inject.negativeNumbers) {
            return '#FF0000' 
        }
    }

}
