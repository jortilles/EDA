import { Component, ViewChild, Input, ElementRef, OnInit, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StyleProviderService, AlertService } from '@eda/services/service.index';
import { Table } from 'primeng/table';
// import { FilterUtils } from 'primeng/utils';
import { EdaTable } from './eda-table';
import { DEFAULT_TABLE_HEADER_COLOR, DEFAULT_TABLE_BANDING_COLOR } from '@eda/configs/customizable/customizable_default';
import { registerLocaleData } from '@angular/common';

import es from '@angular/common/locales/es';
import * as _ from 'lodash';
import { StyleService } from '@eda/services/service.index';
import { EdaColumnChartOptions } from './eda-columns/eda-column-chart-options';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';     // if using paginator
import { ButtonModule } from 'primeng/button';          // if you have buttons in the table
import { InputTextModule } from 'primeng/inputtext';    // if using input filters

// tests
import { TooltipModule } from 'primeng/tooltip'; 
import { MultiSelectModule } from 'primeng/multiselect';
import { ChartModule } from 'primeng/chart';
import { EdaContextMenuComponent } from '@eda/shared/components/shared-components.index';
import { DialogModule } from 'primeng/dialog';  // <--- import PrimeNG module


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
export class EdaTableComponent implements OnInit, AfterViewInit {
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
        public styleProviderService: StyleProviderService,
        private sanitizer: DomSanitizer,
        private alertService: AlertService
    ) {
        registerLocaleData(es);
        /** Define the chart properties inside the table */
        this.chartOptions = EdaColumnChartOptions;
    }
    ngOnInit(): void {
        if(this?.inject?.styles && !this.inject.pivot){
            this.applyStyles(this.inject.styles)
        }else if(this?.inject?.styles && this.inject.pivot){
            this.applyPivotSyles(this.inject.styles)
        }
    }

    ngAfterViewInit(): void {
        // Template is rendered here — querySelector('.eda-table') works correctly.
        // inject is still undefined at this point (set after createComponent returns),
        // so we apply defaults. setTableProperties overrides with saved colors afterwards.
        this.applyBandingColors(this.inject?.headerColor, this.inject?.bandingColor, this.inject?.colorEnabled);
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
            // Find the column type to check if it is HTML
            const col = this.inject.cols.find(c => c.field === colname);
            const colType = col ? col.type : null;

            // Do not emit event for numeric or HTML columns
            const isHtmlValue = typeof label === 'string' && label.trim().startsWith('<');
            if (typeof label !== 'number' && colType !== 'EdaColumnHtml' && !isHtmlValue) {
                this.onClick.emit({ label, filterBy });
            }}
    }

    getTooltip = (col: any) => {
        if (col.description == null) return '';
        return col.description || '';
    };

    isNumericValue(value: any): boolean {
        if (value === null || value === undefined || value === '') return false;
        if (typeof value === 'number') return true;
        if (typeof value === 'string') return !value.trim().startsWith('<') && !isNaN(Number(value));
        return false;
    }

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
        // With pointer-events:none on <a>, clicks always land on the <div>, so we look for <a> in child elements.
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
        try {
            const styleKey = this.styles[col.field] ? col.field : col.header;
            const styleEntry = this.styles[styleKey];
            if (styleEntry) {
                let field = styleEntry.col || styleKey;
                if(this.inject.pivot) field = styleEntry.value;

                field = this.getNiceName(field);

                const cellValue = parseFloat(rowData[col.field]);

                // If it is a semaphore, return one of the 3 colors
                if (styleEntry.type === 'semaphore') {
                    if (cellValue > styleEntry.value1) return `table-semaphore-${field}-0`;
                    else if (cellValue >= styleEntry.value2) return `table-semaphore-${field}-1`;
                    else return `table-semaphore-${field}-2`;
                }

                if (isNaN(cellValue)) return null;

                // If it is a gradient, return one of the 5 ranges we generate
                let cellClass = null;
                if (cellValue < parseFloat(styleEntry.ranges[0])) cellClass = `table-gradient-${field}-${0}`
                else if (cellValue < parseFloat(styleEntry.ranges[1])) cellClass = `table-gradient-${field}-${1}`;
                else if (cellValue < parseFloat(styleEntry.ranges[2])) cellClass = `table-gradient-${field}-${2}`;
                else if (cellValue < parseFloat(styleEntry.ranges[3])) cellClass = `table-gradient-${field}-${3}`;
                else  cellClass = `table-gradient-${field}-${4}`;

                // Return the style class to apply to the column
                return cellClass;
            }
            return null;
        } catch (e) {
            console.warn('[getStyleClass] Error al aplicar estilo de color:', e, '| col:', col?.field);
            this.alertService.addError('Error al aplicar el código de color');
            return null;
        }
    }

    getStyle() {
        if(this.styleProviderService.pageStylesApplied.source['_value'] && Object.keys(this.styles).length === 0) {
            const panelColor = this.styleProviderService.panelColor.source['_value'];
            const bg = this.styleProviderService.backgroundImage
                ? this.hexToRgba(panelColor, 0.5)
                : panelColor;
            return {
                'color': this.styleProviderService.panelFontColor.source['_value'],
                'font-family': this.styleProviderService.panelFontFamily.source['_value'],
                'background': bg,
            };
        }
        return;
    }

    getTextStyle() {
        if(this.styleProviderService.pageStylesApplied.source['_value'] && Object.keys(this.styles).length === 0) {
            return {
                'color': this.styleProviderService.panelFontColor.source['_value'],
                'font-family': this.styleProviderService.panelFontFamily.source['_value'],
            };
        }
        return;
    }

    private hexToRgba(hex: string, alpha: number): string {
        const clean = (hex || '#ffffff').replace('#', '');
        const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
        const n = parseInt(full, 16);
        return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
    }

    public applyBandingColors(headerColor?: string, bandingColor?: string, colorEnabled?: boolean) {
        const el: HTMLElement = this.elementRef.nativeElement.querySelector('.eda-table')
                               || this.elementRef.nativeElement;
        if (colorEnabled === false) {
            el.style.setProperty('--table-header-color', '#ffffff');
            el.style.setProperty('--table-banding-color', '#ffffff');
            el.style.setProperty('--table-total-color', '#ffffff');
            return;
        }
        const hc = this.hexToRgba(headerColor || DEFAULT_TABLE_HEADER_COLOR, 0.4);
        const bc = this.hexToRgba(bandingColor || DEFAULT_TABLE_BANDING_COLOR, 0.15);
        const sc = this.hexToRgba(bandingColor || DEFAULT_TABLE_HEADER_COLOR, 0.30);
        el.style.setProperty('--table-header-color', hc);
        el.style.setProperty('--table-banding-color', bc);
        el.style.setProperty('--table-total-color', sc);
    }

    public applyStyles(styles: Array<any>) {
        try {
        // Orphan style cleanup: keep only those with an active column
        const activeCols = this.inject?.cols || [];
        const validStyles = styles.filter((style: any) =>
            activeCols.some((col: any) => col.field === style.col || col.header === style.col)
        );
        const orphans = styles.filter((s: any) => !validStyles.includes(s));
        if (orphans.length > 0) {
            // Update inject.styles so the cleanup persists
            if (this.inject) this.inject.styles = validStyles as any;
        }
        styles = validStyles;

        // Check what type of numeric limits we are handling
        const gradientStyles = styles.filter(s => !s.type || s.type === 'gradient');
        const semaphoreStyles = styles.filter(s => s.type === 'semaphore');
        const limits = {};

        //Initialize 
        // If the incoming styles are gradients...
        if (gradientStyles.length > 0) {
            const fields = gradientStyles.map(style => style.col);

            fields.forEach(field => {
                limits[field] = { min: Infinity, max: -Infinity, rangeValue: 0, ranges: [], col: field };
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

        // If the incoming styles are SEMAPHORE-based...
        if (semaphoreStyles.length > 0) {
            semaphoreStyles.forEach(style => {
                const field = style.col;
                const name = this.getNiceName(field);
                limits[field] = { type: 'semaphore', col: field, value1: style.value1, value2: style.value2 };
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

        // Return the limits to determine which color to apply
        this.styles = limits;

        } catch (e) {
            console.warn('[applyStyles] Error al aplicar estilos de color:', e);
            this.alertService.addError('Error al aplicar los estilos de color de la tabla');
        }
    }

    applyPivotSyles(styles){
        const gradientStyles = styles.filter(s => !s.type || s.type === 'gradient');
        const semaphoreStyles = styles.filter(s => s.type === 'semaphore');
        let tmpStyles = {};
        // If the incoming styles are gradients...
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

        // Apply styles if it is semaphore-based
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

    
    customSort(event: any, cols: any) {

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
                } else if (actualCol.type === "EdaColumnPercentage"){
                    const match1 =  parseFloat(value1.replace('%', '') )
                    const match2 =  parseFloat(value2.replace('%', '') )
                    result = (match1 < match2) ? -1 : (match1 > match2) ? 1 : 0;
                }else    result = value1.localeCompare(value2);
            }
            else
                result = (value1 < value2) ? -1 : (value1 > value2) ? 1 : 0;

            return (event.order * result);
        });

        // maintains the order of the crosstable
        this.inject.sortedColumn = { field: event.field, order: event.order };
    }

    extractNumberRange(input) {
        const regex = /(?:<|<=|>|>=)?\s*(-?\d+)\s*(?:-|<|<=|>|>=)?\s*(-?\d+)?/;
        const match = input.trim().match(regex);

        if (match) {
          // Determine which number to extract based on the string format
          if (input.includes('<') || input.includes('>')) {
            return parseInt(match[1], 10); // Extract the first number
          } else {
            return match[2] ? parseInt(match[2], 10) : null; // Extract the second number if present
          }
        }
        return null; // No match found
    }

    public getColor(valor: number) { 

        // replace true with a variable that is toggled when editing negative values

        if(valor<0 && this.inject.negativeNumbers) {
            return '#FF0000' 
        }
    }

    // Navigation functions
    handleNavIn(field: string, value: any, event: MouseEvent): void {
        this.inject.onNavIn.emit({ field, value });
    }
    
    handleNavOut(rootKey: string, event: MouseEvent): void {
        this.inject.onNavOut.emit({ rootKey });
    }

    haveChild(colField: string): boolean {
        return (this.inject.parentFields || []).includes(colField);
    }

    isChild(colField: string): boolean {
        return !!(this.inject.childFieldMap || {})[colField];
    }

    getChildRootKey(colField: string): string {
        return (this.inject.childFieldMap || {})[colField] || '';
    }
}
