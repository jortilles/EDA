import { Component, ViewChild, Input, ElementRef, OnInit, AfterViewInit, OnDestroy, Output, EventEmitter, NgZone } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StyleProviderService, AlertService } from '@eda/services/service.index';
import { Table } from 'primeng/table';
// import { FilterUtils } from 'primeng/utils';
import { EdaTableModel } from './eda-table.model';
import { computeTableColorStyles, getNiceName, ColorStyleSpec } from '@eda/services/utils/eda-table-utils/eda-table.color';
import { DEFAULT_TABLE_HEADER_COLOR, DEFAULT_TABLE_BANDING_COLOR } from '@eda/configs/customizable/customizable_default';
import { registerLocaleData } from '@angular/common';

import es from '@angular/common/locales/es';
import * as _ from 'lodash';
import { StyleService } from '@eda/services/service.index';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';     // if using paginator
import { ButtonModule } from 'primeng/button';          // if you have buttons in the table
import { InputTextModule } from 'primeng/inputtext';    // if using input filters

// tests
import { TooltipModule } from 'primeng/tooltip';
import { MultiSelectModule } from 'primeng/multiselect';
import { EdaLineComponent } from '@eda/components/eda-line-d3/eda-line.component';
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
        EdaLineComponent,
        EdaContextMenuComponent,
        DialogModule,
    ]
})
export class EdaTableComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('table', { static: false }) table: Table;
    @Input() inject: EdaTableModel;
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
        private alertService: AlertService,
        private ngZone: NgZone
    ) {
        registerLocaleData(es);
    }
    ngOnInit(): void {
        if(this?.inject?.styles){
            this.applyStyles(this.inject.styles)
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
                field = getNiceName(field);

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

        const result = computeTableColorStyles(validStyles as ColorStyleSpec[], this.inject.value, 'flat');
        this.applyComputedColorStyles(result);
        this.styles = result.entries;

        } catch (e) {
            console.warn('[applyStyles] Error al aplicar estilos de color:', e);
            this.alertService.addError('Error al aplicar los estilos de color de la tabla');
        }
    }

    private applyComputedColorStyles(result: ReturnType<typeof computeTableColorStyles>) {
        result.cssVars.forEach(({ name, value }) => {
            this.elementRef.nativeElement.style.setProperty(name, value);
        });
        result.cssClasses.forEach(({ selector, declarations }) => {
            this.styleService.setStyles(selector, declarations);
        });
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

    // --- Column resize (drag header border) ---

    private static readonly UTILITY_COL_TYPES = ['EdaColumnContextMenu', 'EdaColumnEditable', 'EdaColumnFunction'];
    private static readonly MIN_COL_WIDTH_PCT = 5;

    private resizeDrag: {
        leftField: string;
        rightField: string;
        startX: number;
        leftStartPx: number;
        rightStartPx: number;
        containerWidthPx: number;
        // The hidden sizing row's <th> elements — table-layout:fixed derives every column's
        // width from this (first) row alone, so updating just these two resizes the whole
        // column (header + every body cell) natively, with no Angular re-render mid-drag.
        leftEl: HTMLElement;
        rightEl: HTMLElement;
    } | null = null;
    private resizeMoveListener = (event: MouseEvent) => this.onColResizeMove(event);
    private resizeUpListener = () => this.onColResizeEnd();

    /** Data columns only — icon/action columns (fixed 40px) never participate in the % trade. */
    private get resizableCols() {
        return (this.inject?.cols || []).filter(c => c.visible && !EdaTableComponent.UTILITY_COL_TYPES.includes(c.type));
    }

    isResizable(col: any): boolean {
        return this.resizableCols.includes(col);
    }

    isLastResizable(col: any): boolean {
        const resizable = this.resizableCols;
        return resizable[resizable.length - 1] === col;
    }

    isResizeActive(col: any): boolean {
        return this.resizeDrag?.leftField === col.field;
    }

    onColResizeStart(event: MouseEvent, col: any): void {
        event.preventDefault();
        event.stopPropagation();

        const resizable = this.resizableCols;
        const idx = resizable.indexOf(col);
        const rightCol = resizable[idx + 1];
        if (!rightCol) return;

        // Both the visible header row and the hidden sizing row have data-field <th>s — read
        // current widths from the visible one (real rendered size), but drive the live drag
        // through the hidden one: table-layout:fixed derives every column's width from that
        // (first) row alone, so updating it resizes the whole column with no Angular involved.
        const table = (event.currentTarget as HTMLElement).closest('table');
        const visibleThs = Array.from(table.querySelectorAll('tr.header-title th[data-field]')) as HTMLElement[];
        const sizingThs = Array.from(table.querySelectorAll('tr.header-invisible th[data-field]')) as HTMLElement[];
        // Match by reading the attribute in JS (not interpolated into a CSS selector) so a
        // field name with quotes/special characters can't break the query.
        const widthsPx: Record<string, number> = {};
        const sizingEls: Record<string, HTMLElement> = {};
        let containerWidthPx = 0;
        resizable.forEach(c => {
            const visibleTh = visibleThs.find(t => t.dataset['field'] === c.field);
            const sizingTh = sizingThs.find(t => t.dataset['field'] === c.field);
            const w = visibleTh?.getBoundingClientRect().width || 0;
            widthsPx[c.field] = w;
            if (sizingTh) sizingEls[c.field] = sizingTh;
            containerWidthPx += w;
        });
        if (!containerWidthPx || !sizingEls[col.field] || !sizingEls[rightCol.field]) return;

        // Pin every resizable column to its exact CURRENT pixel width (not a rounded
        // percentage) — measured values already sum to containerWidthPx exactly, so the
        // browser has nothing to rescale once table-layout goes fixed. Only the two dragged
        // columns' widths change from here; every other column's declared width is never
        // touched again, so it stays put regardless of drag direction.
        resizable.forEach(c => { sizingEls[c.field].style.width = widthsPx[c.field] + 'px'; });
        this.inject.autolayout = false;

        this.resizeDrag = {
            leftField: col.field,
            rightField: rightCol.field,
            startX: event.clientX,
            leftStartPx: widthsPx[col.field],
            rightStartPx: widthsPx[rightCol.field],
            containerWidthPx,
            leftEl: sizingEls[col.field],
            rightEl: sizingEls[rightCol.field],
        };
        // Locked on <body> (not just the handle) so the cursor/selection stay put even when the
        // mouse briefly leaves the thin 6px handle during a fast drag.
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        // Outside Angular's zone: mousemove fires on every pixel, and a full change-detection
        // pass per event (across a whole paginated table) is what made the drag feel laggy
        // instead of tracking the cursor 1:1. The DOM is updated directly instead.
        this.ngZone.runOutsideAngular(() => {
            document.addEventListener('mousemove', this.resizeMoveListener);
            document.addEventListener('mouseup', this.resizeUpListener);
        });
    }

    private onColResizeMove(event: MouseEvent): void {
        const drag = this.resizeDrag;
        if (!drag) return;

        const minWidthPx = EdaTableComponent.MIN_COL_WIDTH_PCT / 100 * drag.containerWidthPx;
        let deltaPx = event.clientX - drag.startX;
        const minDelta = minWidthPx - drag.leftStartPx;
        const maxDelta = drag.rightStartPx - minWidthPx;
        deltaPx = Math.max(minDelta, Math.min(maxDelta, deltaPx));

        // Direct DOM write, no Angular binding involved — this is what makes it track the
        // mouse instantly, in exact pixels, in either direction. The model (col.width) is
        // only synced once, converted to percentages, at drag end.
        drag.leftEl.style.width = (drag.leftStartPx + deltaPx) + 'px';
        drag.rightEl.style.width = (drag.rightStartPx - deltaPx) + 'px';
    }

    private onColResizeEnd(): void {
        document.removeEventListener('mousemove', this.resizeMoveListener);
        document.removeEventListener('mouseup', this.resizeUpListener);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        const drag = this.resizeDrag;
        if (!drag) return;
        this.resizeDrag = null;

        // Re-enter Angular here: this is the only point that touches the model/config, once.
        this.ngZone.run(() => {
            const resizable = this.resizableCols;
            const table = drag.leftEl.closest('table');
            const sizingThs = Array.from(table.querySelectorAll('tr.header-invisible th[data-field]')) as HTMLElement[];
            const pxByField: Record<string, number> = {};
            resizable.forEach(c => {
                const th = sizingThs.find(t => t.dataset['field'] === c.field);
                pxByField[c.field] = th ? parseFloat(th.style.width) || 0 : 0;
            });
            const totalPx = Object.values(pxByField).reduce((a, b) => a + b, 0) || 1;

            // Convert to percentages that sum to EXACTLY 100% — the last column absorbs the
            // rounding remainder, so nothing drifts (and rescales the others) on the next render.
            const widths: Record<string, string> = {};
            let sumPct = 0;
            resizable.forEach((c, i) => {
                if (i === resizable.length - 1) {
                    widths[c.field] = (100 - sumPct).toFixed(2) + '%';
                } else {
                    const pct = parseFloat((pxByField[c.field] / totalPx * 100).toFixed(2));
                    widths[c.field] = pct + '%';
                    sumPct += pct;
                }
            });
            this.inject.resizeColumns(widths);
        });
    }

    ngOnDestroy(): void {
        document.removeEventListener('mousemove', this.resizeMoveListener);
        document.removeEventListener('mouseup', this.resizeUpListener);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
}
