import { Component, ViewChild, Input, ElementRef, OnInit, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StyleProviderService, AlertService } from '@eda/services/service.index';
import { Table } from 'primeng/table';
import { EdaCrosstableModel } from './eda-crosstable.model';
import { computeTableColorStyles, getNiceName, ColorStyleSpec } from '../eda-table-core/eda-table.color';
import { DEFAULT_TABLE_HEADER_COLOR, DEFAULT_TABLE_BANDING_COLOR } from '@eda/configs/customizable/customizable_default';
import { registerLocaleData } from '@angular/common';

import es from '@angular/common/locales/es';
import * as _ from 'lodash';
import { StyleService } from '@eda/services/service.index';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { TooltipModule } from 'primeng/tooltip';
import { MultiSelectModule } from 'primeng/multiselect';
import { EdaLineComponent } from '@eda/components/eda-line-d3/eda-line.component';
import { EdaContextMenuComponent } from '@eda/shared/components/shared-components.index';
import { DialogModule } from 'primeng/dialog';

/**
 * Crosstable-only sibling of EdaTableComponent — same cell-rendering/color/sort/nav
 * logic (ported verbatim, see eda-table.component.ts), minus every `if(pivot)`/`if(!pivot)`
 * branch, since this component only ever renders a matrix header.
 */
@Component({
    standalone: true,
    selector: 'eda-crosstable',
    templateUrl: './eda-crosstable.component.html',
    styleUrls: ['../eda-table/eda-table.component.css'],
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        PaginatorModule,
        ButtonModule,
        InputTextModule,
        TooltipModule,
        MultiSelectModule,
        EdaLineComponent,
        EdaContextMenuComponent,
        DialogModule,
    ]
})
export class EdaCrosstableComponent implements OnInit, AfterViewInit {
    @ViewChild('table', { static: false }) table: Table;
    @Input() inject: EdaCrosstableModel;
    @Output() onClick: EventEmitter<any> = new EventEmitter<any>();

    data: any;

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
    }

    ngOnInit(): void {
        if (this?.inject?.styles) {
            this.applyStyles(this.inject.styles);
        }
    }

    ngAfterViewInit(): void {
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
            const col = this.inject.cols.find(c => c.field === colname);
            const colType = col ? col.type : null;

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
                const field = getNiceName(styleEntry.value);

                const cellValue = parseFloat(rowData[col.field]);

                if (styleEntry.type === 'semaphore') {
                    if (cellValue > styleEntry.value1) return `table-semaphore-${field}-0`;
                    else if (cellValue >= styleEntry.value2) return `table-semaphore-${field}-1`;
                    else return `table-semaphore-${field}-2`;
                }

                if (isNaN(cellValue)) return null;

                let cellClass = null;
                if (cellValue < parseFloat(styleEntry.ranges[0])) cellClass = `table-gradient-${field}-${0}`
                else if (cellValue < parseFloat(styleEntry.ranges[1])) cellClass = `table-gradient-${field}-${1}`;
                else if (cellValue < parseFloat(styleEntry.ranges[2])) cellClass = `table-gradient-${field}-${2}`;
                else if (cellValue < parseFloat(styleEntry.ranges[3])) cellClass = `table-gradient-${field}-${3}`;
                else  cellClass = `table-gradient-${field}-${4}`;

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
        const result = computeTableColorStyles(styles as ColorStyleSpec[], this.inject.value, 'matrix');
        result.cssVars.forEach(({ name, value }) => {
            this.elementRef.nativeElement.style.setProperty(name, value);
        });
        result.cssClasses.forEach(({ selector, declarations }) => {
            this.styleService.setStyles(selector, declarations);
        });
        this.styles = result.entries;
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
          if (input.includes('<') || input.includes('>')) {
            return parseInt(match[1], 10);
          } else {
            return match[2] ? parseInt(match[2], 10) : null;
          }
        }
        return null;
    }

    public getColor(valor: number) {
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
