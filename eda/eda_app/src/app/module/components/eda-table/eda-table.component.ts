import { Component, ViewChild, Input, ElementRef, OnInit } from '@angular/core';
import { Table } from 'primeng/table';
// import { FilterUtils } from 'primeng/utils';
import { EdaTable } from './eda-table';
import { registerLocaleData } from '@angular/common';
import es from '@angular/common/locales/es';

import * as _ from 'lodash';
import { StyleService } from '@eda/services/service.index';
import { EdaColumnChartOptions } from './eda-columns/eda-column-chart-options';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';


@Component({
    selector: 'eda-table',
    templateUrl: './eda-table.component.html',
    styleUrls: ['./eda-table.component.css']
})
export class EdaTableComponent implements OnInit {
    @ViewChild('table', { static: false }) table: Table;
    @Input() inject: EdaTable;

    data: any;
    chartOptions: any;

    public lodash: any = _;
    public colors = {};
    public styles = {};

    constructor(private elementRef: ElementRef, private styleService: StyleService, private sanitizer: DomSanitizer) {
        registerLocaleData(es);
        /** Definim les caracteristiques del gràfic dintre de la taula.......................... */
        this.chartOptions = EdaColumnChartOptions;
    }
    ngOnInit(): void {
        if(this.inject.styles && !this.inject.pivot){
            this.applyStyles(this.inject.styles)
        }else if(this.inject.styles && this.inject.pivot){
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

        }
    }

    getTooltip = (col) => `${col.description}` || ``;


    getLinkTooltip(col) {
        return `${col.header} column linked to:\n${this.inject.linkedDashboardProps.dashboardName}`;
    }

    getStyle(col, rowData) {

        if (this.styles[col.field]) {

            let cellClass = null;
            let field = col.field;
            if(this.inject.pivot) field = this.styles[col.field].value;

            field = this.getNiceName(field);

            if(!parseFloat(rowData[col.field])) cellClass = null;
            else if (parseFloat(rowData[col.field]) < parseFloat(this.styles[col.field].ranges[0])) cellClass = `table-gradient-${field}-${0}`
            else if (parseFloat(rowData[col.field]) < parseFloat(this.styles[col.field].ranges[1])) cellClass = `table-gradient-${field}-${1}`;
            else if (parseFloat(rowData[col.field]) < parseFloat(this.styles[col.field].ranges[2])) cellClass = `table-gradient-${field}-${2}`;
            else if (parseFloat(rowData[col.field]) < parseFloat(this.styles[col.field].ranges[3])) cellClass = `table-gradient-${field}-${3}`;
            else  cellClass = `table-gradient-${field}-${4}`;

            return cellClass;
        }

        return null;
    }

    public applyStyles(styles: Array<any>) {

        const fields = styles.map(style => style.col);
        const limits = {};

        //Initialize
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

            const colors = this.generateColor(styles[i].max, styles[i].min, 5);

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

        })
        this.styles = limits;

    }

    applyPivotSyles(styles){

        const fields = styles.map(style => style.col);
        const limits = {};
        //Initialize
        fields.forEach(field => {
            limits[field] = { min: Infinity, max: -Infinity, rangeValue: 0, ranges: [], cols:styles.filter(s => s.col === field)[0].cols  };
        });

        //Set values
        this.inject.value.forEach(row => {

            fields.forEach(field => {

                let style = styles.filter(style => style.col === field)[0];

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

            const colors = this.generateColor(styles[i].max, styles[i].min, 5);

            colors.forEach((color, i) => {
                const name = this.getNiceName(key)
                console.log(name)
                this.elementRef.nativeElement.style.setProperty(`--table-gradient-bg-color-${name}-${i}`, `#${color}`);
                this.styleService.setStyles(`.table-gradient-${name}-${i}`,
                {
                    // color:'',
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

    formatValoresRango(rowData: any, colField: string): SafeHtml  {
        let valor = _.get(rowData, colField);
        let str = '';

        const regexNegative = /-\d+/g;
        const regexPositive = /(?<!-)\b\d+\b/g;
        let negativos = valor.match(regexNegative)?.map(Number) || [];
        let positivos = valor.match(regexPositive)?.map(Number) || [];


        if(negativos.length === 0) {
            str = `<span>${valor}</span>`;
        } else {
            if(negativos.length === 1) {
                if(valor.includes('<')) {
                    valor = negativos[0];
                    str = `<span>< <span style = "color: red">${valor}</span></span>`;
                }
                else if(valor.includes('>=')){
                    valor = negativos[0];
                    str = `<span>>= <span style = "color: red">${valor}</span></span>`;
                }
                else {
                    valor = negativos[0];
                    str = `<span> <span style = "color: red">${valor}</span> <span> - </span> <span>${positivos[0]}</span> </span>`;
                }
            } 
            else {
                str = `<span> <span style = "color: red">${negativos[0]}</span> <span> - </span> <span style = "color: red">${negativos[1]}</span> </span>`;
            }
        }
        
        return this.sanitizer.bypassSecurityTrustHtml(str);

    }

    extractNumberRange(input) {
        const regex = /(?:<|<=|>|>=)?\s*(-?\d+)\s*(?:-|<|<=|>|>=)?\s*(-?\d+)?/;
        const match = input.trim().match(regex);
        
        if (match) {
          // Determina qué número extraer en base al formato del string
          if (input.includes('<') || input.includes('>')) {
            return parseInt(match[1], 10); // Extrae el primer número
          } else {
            return match[2] ? parseInt(match[2], 10) : null; // Extrae el segundo número si está presente
          }
        }
        return null; // Si no hay coincidencia
    }

    customSort(event, cols) {
        
        const actualField = event.field;
        const actualCol = cols.find(col => col.field === actualField)
        
        event.data.sort((data1, data2) => {
            let value1 = data1[event.field];
            let value2 = data2[event.field];
            let result = null;

            if (value1 == null && value2 != null)
                result = -1;
            else if (value1 != null && value2 == null)
                result = 1;
            else if (value1 == null && value2 == null)
                result = 0;
            else if (typeof value1 === 'string' && typeof value2 === 'string') {
                if(actualCol.rangeOption) {
                    const match1 = this.extractNumberRange(value1)
                    const match2 = this.extractNumberRange(value2)
                    result = (match1 < match2) ? -1 : (match1 > match2) ? 1 : 0;
                } else
                    result = value1.localeCompare(value2);
            }
            else
                result = (value1 < value2) ? -1 : (value1 > value2) ? 1 : 0;

            return (event.order * result);
        });
    }

}
