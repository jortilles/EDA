import { Injectable } from '@angular/core';
import { URL_SERVICES } from '../../config/config';
import ExcelJS from 'exceljs/dist/exceljs.bare.min.js';
import { saveAs } from 'file-saver';
import * as _ from 'lodash';
import {
    AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun,
    Packer, Paragraph, ShadingType, Table, TableCell, TableLayoutType,
    TableRow, TextRun, VerticalMergeType, WidthType,
} from 'docx';

// Corporate colors for dashboard export
const HEADER_BG   = 'FF2E75B6';   // header blue
const HEADER_FG   = 'FFFFFFFF';   // white text
const TOTAL_BG    = 'FFD6E4F0';   // light blue totals
const SUBTOTAL_BG = 'FFE8F2FA';   // very light blue subtotals
const TITLE_BG    = 'FFDCE6F1';   // panel title background
const TITLE_FG    = 'FF1F3864';   // dark blue title text

function headerCellStyle(cell: any) {
    cell.font   = { bold: true, color: { argb: HEADER_FG }, size: 10 };
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
        top:    { style: 'thin', color: { argb: 'FFBDD7EE' } },
        left:   { style: 'thin', color: { argb: 'FFBDD7EE' } },
        bottom: { style: 'thin', color: { argb: 'FFBDD7EE' } },
        right:  { style: 'thin', color: { argb: 'FFBDD7EE' } },
    };
}

function dataCellStyle(cell: any, isNumeric: boolean) {
    cell.alignment = { vertical: 'middle', horizontal: isNumeric ? 'right' : 'left' };
    cell.border = {
        top:    { style: 'hair', color: { argb: 'FFBDD7EE' } },
        left:   { style: 'hair', color: { argb: 'FFBDD7EE' } },
        bottom: { style: 'hair', color: { argb: 'FFBDD7EE' } },
        right:  { style: 'hair', color: { argb: 'FFBDD7EE' } },
    };
}

function totalCellStyle(cell: any, isSubtotal = false) {
    cell.font   = { bold: true, size: 10 };
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: isSubtotal ? SUBTOTAL_BG : TOTAL_BG } };
    cell.alignment = { vertical: 'middle', horizontal: 'right' };
    cell.border = {
        top:    { style: 'thin', color: { argb: 'FFBDD7EE' } },
        left:   { style: 'thin', color: { argb: 'FFBDD7EE' } },
        bottom: { style: 'thin', color: { argb: 'FFBDD7EE' } },
        right:  { style: 'thin', color: { argb: 'FFBDD7EE' } },
    };
}

export interface DashboardPanelExport {
    title: string;
    type: 'table' | 'crosstable' | 'chart' | 'kpi' | 'other';
    tableData?: any;       // EdaTable instance (for table / crosstable)
    imageBase64?: string;  // PNG dataURL (for chart)
    imageWidth?:  number;  // Natural image width (px, no capture scaling)
    imageHeight?: number;  // Natural image height (px, no capture scaling)
    kpiData?: {            // KPI panel data (value + suffix + style)
        value: any;
        sufix?: string;
        kpiColor?: string;
        modifiedFontPoints?: number;
    };
    // Gridster grid position
    gridX: number;
    gridY: number;
    gridCols: number;
    gridRows: number;
}

@Injectable()
export class FileUtiles {

    connection(route: string, getParams?: {}) {
        let url = `${URL_SERVICES}${route}?token=${localStorage.getItem('token')}`;
        if (!_.isNil(getParams)) {
            _.forEach(getParams, (value: any, key: any) => {
                url += '&' + key + '=' + value;
            });
        }
        return url;
    }

    // ID generator
    generateUUID() {
        let d = new Date().getTime();
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            d += performance.now();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    // Export to Excel (without fs, browser compatible)
    async exportToExcel(headerDisplay: string[], cols: any[], fileName: string) {
        const workbook = new ExcelJS.Workbook();

        // Create worksheet
        const worksheet = workbook.addWorksheet('Sheet1');

        // Generate dynamic headers from cols
        const headers: string[] = [];
        _.forEach(cols, (c) => {
            _.forEach(Object.keys(c), (o) => {
                if (!headers.includes(o)) {
                    headers.push(o);
                }
            });
        });

        // Override headers with those to display
        const displayHeaders = headerDisplay.length ? headerDisplay : headers;
        worksheet.addRow(displayHeaders);

        // Fill rows with data
        _.forEach(cols, (col) => {
            const row: any[] = [];
            _.forEach(headers, (h) => {
                let text = _.get(col, h);
                if (!_.isNil(text) && !_.isEmpty(text)) {
                    text = text.toString().trim();
                }
                row.push(text);
            });
            worksheet.addRow(row);
        });

        // Generate XLSX as Blob and download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        saveAs(blob, `${fileName}.xlsx`);
    }

    // ─── Export full Dashboard to Excel ────────────────────────────────────

    /**
     * Conversion scale: Gridster grid units → Excel columns.
     * The grid uses 40 columns. With scale 2 → 80 total Excel columns.
     * Each Excel column will have a width of ~12 characters (~90px).
     */
    private static readonly GRID_TOTAL_COLS  = 40;
    private static readonly EXCEL_SCALE      = 0.5;   // Excel cols per grid unit
    private static readonly EXCEL_COL_WIDTH  = 10;  // default width of each Excel column
    private static readonly IMG_ROWS_DEFAULT = 20;  // Excel rows occupied by an image
    private static readonly ROW_GAP          = 1;   // gap rows between bands
    /**
     * Excel cell pixel calibration (empirical, used for aspect ratio).
     * - Row at 18pt: ~24px height.
     * - Column at 12 chars: ~64px width.
     */
    private static readonly EXCEL_ROW_PX = 24;
    private static readonly EXCEL_COL_PX = 64;

    /**
     * Generates a .xlsx with all dashboard panels respecting their
     * 2D position (x/y from the Gridster grid):
     * - Panels on the same grid row → same horizontal band in Excel.
     * - Tables and cross-tables: data + structure + styles.
     * - Charts and KPIs: PNG image captured from the DOM.
     *
     * @param panels        Array with each panel's data + grid coordinates
     * @param dashboardTitle Downloaded file name
     */
    async exportDashboardToExcel(panels: DashboardPanelExport[], dashboardTitle: string): Promise<void> {
        const workbook  = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Dashboard', {
            pageSetup: { fitToPage: true, fitToWidth: 1, orientation: 'landscape' }
        });

        // Set width of the 80 Excel columns (40 grid × scale 2)
        const totalExcelCols = FileUtiles.GRID_TOTAL_COLS * FileUtiles.EXCEL_SCALE;
        for (let c = 1; c <= totalExcelCols; c++) {
            worksheet.getColumn(c).width = FileUtiles.EXCEL_COL_WIDTH;
        }

        // ── Dashboard title ──────────────────────────────────────────────
        const dashTitleRow = worksheet.getRow(1);
        dashTitleRow.height = 28;
        const dashTitleCell = dashTitleRow.getCell(1);
        dashTitleCell.value = dashboardTitle;
        dashTitleCell.font      = { bold: true, size: 16, color: { argb: HEADER_FG } };
        dashTitleCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
        dashTitleCell.alignment = { vertical: 'middle', horizontal: 'left' };
        try { worksheet.mergeCells(1, 1, 1, Math.max(1, totalExcelCols)); } catch (_) {}
        dashTitleRow.commit();

        // ── Group panels by their grid row (gridY) ──────────────────────
        const rowGroups = new Map<number, DashboardPanelExport[]>();
        for (const panel of panels) {
            const key = panel.gridY;
            if (!rowGroups.has(key)) rowGroups.set(key, []);
            rowGroups.get(key).push(panel);
        }

        // Sort groups by y ascending
        const sortedYs = Array.from(rowGroups.keys()).sort((a, b) => a - b);

        let currentExcelRow = 3; // Starts at row 3 (title + blank row)

        for (const groupY of sortedYs) {
            const group = rowGroups.get(groupY)!.sort((a, b) => a.gridX - b.gridX);

            // ── First pass: calculate height (Excel rows) of each panel ──
            const heights = group.map(p => this._estimatePanelHeight(p));
            const bandHeight = Math.max(...heights);

            const bandStartRow = currentExcelRow;

            // ── Second pass: render each panel ────────────────────────
            for (let i = 0; i < group.length; i++) {
                const panel    = group[i];
                const colStart = panel.gridX * FileUtiles.EXCEL_SCALE + 1;   // 1-indexed
                const colEnd   = (panel.gridX + panel.gridCols) * FileUtiles.EXCEL_SCALE; // inclusive

                let panelRow = bandStartRow;

                // Panel title
                if (panel.title) {
                    const tRow  = worksheet.getRow(panelRow);
                    tRow.height = 20;
                    const tCell = tRow.getCell(colStart);
                    tCell.value     = panel.title;
                    tCell.font      = { bold: true, size: 11, color: { argb: TITLE_FG } };
                    tCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: TITLE_BG } };
                    tCell.alignment = { vertical: 'middle' };
                    try { worksheet.mergeCells(panelRow, colStart, panelRow, colEnd); } catch (_) {}
                    panelRow++;
                }

                if (panel.type === 'chart' && panel.imageBase64) {
                    const base64 = panel.imageBase64.includes(',')
                        ? panel.imageBase64.split(',')[1]
                        : panel.imageBase64;

                    if (!this._isValidPngBase64(base64)) {
                        console.warn('[ExportExcel] PNG inválido, se omite imagen del panel:', panel.title);
                    } else {
                        try {
                            const imageId = workbook.addImage({ base64, extension: 'png' as any });
                            const imgRows = FileUtiles.IMG_ROWS_DEFAULT;

                            // Calculate imgCols from the actual image aspect ratio
                            // to avoid horizontal distortion
                            const imgCols = this._calcImageCols(
                                panel.imageWidth, panel.imageHeight,
                                imgRows, colEnd - colStart
                            );

                            for (let r = panelRow; r < panelRow + imgRows; r++) {
                                worksheet.getRow(r).height = 18;
                            }

                            worksheet.addImage(imageId, {
                                tl: { col: colStart - 1, row: panelRow - 1 },
                                br: { col: colStart - 1 + imgCols, row: panelRow - 1 + imgRows },
                                editAs: 'oneCell',
                            } as any);
                        } catch (imgErr) {
                            console.warn('[ExportExcel] No se pudo insertar imagen:', imgErr);
                        }
                    }

                } else if (panel.type === 'kpi' && panel.kpiData) {
                    const kpi  = panel.kpiData;
                    const text = this._formatKpiValue(kpi.value) + (kpi.sufix ? ' ' + kpi.sufix : '');

                    if (panel.imageBase64) {
                        // kpibar/kpiline/kpiarea: top text (50%) | bottom image (50%)
                        // totalRows proportional to panel gridRows (2 Excel rows per grid unit)
                        const totalRows = panel.gridRows * 2;
                        const halfRows  = Math.round(totalRows / 2);

                        // Top half: KPI text (font reduced to half size)
                        for (let r = panelRow; r < panelRow + halfRows; r++) {
                            worksheet.getRow(r).height = 18;
                        }
                        const kpiCell = worksheet.getRow(panelRow).getCell(colStart);
                        kpiCell.value = text;
                        kpiCell.font  = {
                            bold: true,
                            size: Math.round((28 + (kpi.modifiedFontPoints || 0)) / 2),
                            color: { argb: this._colorToArgb(kpi.kpiColor) },
                        };
                        kpiCell.alignment = { vertical: 'middle', horizontal: 'center' };
                        try { worksheet.mergeCells(panelRow, colStart, panelRow + halfRows - 1, colEnd); } catch (_) {}

                        // Bottom half: chart image
                        const imgStartRow = panelRow + halfRows;
                        const imgRows     = totalRows - halfRows;
                        for (let r = imgStartRow; r < imgStartRow + imgRows; r++) {
                            worksheet.getRow(r).height = 18;
                        }
                        const base64 = panel.imageBase64.includes(',')
                            ? panel.imageBase64.split(',')[1]
                            : panel.imageBase64;
                        if (this._isValidPngBase64(base64)) {
                            try {
                                const imageId = workbook.addImage({ base64, extension: 'png' as any });
                                const imgCols = this._calcImageCols(
                                    panel.imageWidth, panel.imageHeight, imgRows, colEnd - colStart + 1
                                );
                                worksheet.addImage(imageId, {
                                    tl: { col: colStart - 1, row: imgStartRow - 1 },
                                    br: { col: colStart - 1 + imgCols, row: imgStartRow - 1 + imgRows },
                                    editAs: 'oneCell',
                                } as any);
                            } catch (imgErr) {
                                console.warn('[ExportExcel] No se pudo insertar imagen KPI:', imgErr);
                            }
                        }
                    } else {
                        // Pure KPI: full-width text
                        const KPI_ROWS = 6;
                        for (let r = panelRow; r < panelRow + KPI_ROWS; r++) {
                            worksheet.getRow(r).height = 24;
                        }
                        const kpiCell = worksheet.getRow(panelRow).getCell(colStart);
                        kpiCell.value = text;
                        kpiCell.font  = {
                            bold: true,
                            size: 28 + (kpi.modifiedFontPoints || 0),
                            color: { argb: this._colorToArgb(kpi.kpiColor) },
                        };
                        kpiCell.alignment = { vertical: 'middle', horizontal: 'center' };
                        try { worksheet.mergeCells(panelRow, colStart, panelRow + KPI_ROWS - 1, colEnd); } catch (_) {}
                    }

                } else if (panel.type === 'crosstable' && panel.tableData) {
                    this._writeCrossTable(worksheet, panel.tableData, panelRow, colStart);

                } else if (panel.type === 'table' && panel.tableData) {
                    this._writePlainTable(worksheet, panel.tableData, panelRow, colStart);
                }
            }

            // Advance the global row by the maximum band height + gap
            currentExcelRow = bandStartRow + bandHeight + FileUtiles.ROW_GAP;
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        saveAs(blob, `${dashboardTitle}.xlsx`);
    }

    // ─── Flat table ──────────────────────────────────────────────────────────
    /**
     * @param colOffset  Excel column (1-indexed) where the table starts.
     *                   Allows placing multiple tables side by side.
     */
    private _writePlainTable(ws: any, table: any, startRow: number, colOffset = 1): number {
        let row = startRow;

        const cols = (table.cols || []) as any[];
        if (cols.length === 0) return row;

        // Header
        const hRow = ws.getRow(row);
        hRow.height = 18;
        cols.forEach((col: any, i: number) => {
            const cell = hRow.getCell(colOffset + i);
            cell.value = col.header;
            headerCellStyle(cell);
        });
        hRow.commit();
        row++;

        // Data rows
        const values: any[] = table._value || [];
        values.forEach((dataRow: any) => {
            const eRow = ws.getRow(row);
            cols.forEach((col: any, i: number) => {
                const cell = eRow.getCell(colOffset + i);
                const raw  = dataRow[col.field];
                cell.value = this._parseCell(raw, col.type);
                dataCellStyle(cell, col.type === 'EdaColumnNumber');
            });
            eRow.commit();
            row++;
        });

        // Subtotals (per page)
        const partials: any[] = table.partialTotalsRow || [];
        if (partials.length > 0) {
            const sRow = ws.getRow(row);
            sRow.height = 16;
            partials.forEach((item: any, i: number) => {
                const cell = sRow.getCell(colOffset + i);
                cell.value = item.data ?? '';
                totalCellStyle(cell, true);
            });
            sRow.commit();
            row++;
        }

        // Column totals
        const totals: any[] = table.totalsRow || [];
        if (totals.length > 0) {
            const tRow = ws.getRow(row);
            tRow.height = 16;
            totals.forEach((item: any, i: number) => {
                const cell = tRow.getCell(colOffset + i);
                cell.value = item.data ?? '';
                totalCellStyle(cell, false);
            });
            tRow.commit();
            row++;
        }

        return row;
    }

    // ─── Cross table (pivot) ────────────────────────────────────────────────
    /**
     * @param colOffset  Excel column (1-indexed) where the cross table starts.
     */
    private _writeCrossTable(ws: any, table: any, startRow: number, colOffset = 1): number {
        let row = startRow;

        const series: any[]  = table.series || [];
        const cols:   any[]  = table.cols   || [];

        if (cols.length === 0) return row;

        // ── Multi-level headers from series ────────────────────────────────
        if (series.length > 0) {
            series.forEach((serie: any, seriesIdx: number) => {
                const hRow = ws.getRow(row + seriesIdx);
                hRow.height = 18;
                let colPos = colOffset;

                (serie.labels || []).forEach((label: any) => {
                    const cell   = hRow.getCell(colPos);
                    cell.value   = label.title ?? '';
                    headerCellStyle(cell);

                    const cs = label.colspan || 1;
                    const rs = label.rowspan || 1;

                    if (cs > 1 || rs > 1) {
                        const r1 = row + seriesIdx;
                        const c1 = colPos;
                        const r2 = r1 + rs - 1;
                        const c2 = c1 + cs - 1;
                        try {
                            ws.mergeCells(r1, c1, r2, c2);
                            headerCellStyle(ws.getCell(r1, c1));
                        } catch (_) { /* already merged */ }
                    }

                    colPos += cs;
                });

                hRow.commit();
            });

            row += series.length;

        } else {
            // No series: flat header
            const hRow = ws.getRow(row);
            hRow.height = 18;
            cols.forEach((col: any, i: number) => {
                const cell = hRow.getCell(colOffset + i);
                cell.value = col.header;
                headerCellStyle(cell);
            });
            hRow.commit();
            row++;
        }

        // ── Data rows ────────────────────────────────────────────────────
        const values: any[] = table._value || [];
        values.forEach((dataRow: any) => {
            const eRow = ws.getRow(row);
            cols.forEach((col: any, i: number) => {
                const cell = eRow.getCell(colOffset + i);
                const raw  = dataRow[col.field];
                cell.value = this._parseCell(raw, col.type);
                dataCellStyle(cell, col.type === 'EdaColumnNumber');
            });
            eRow.commit();
            row++;
        });

        // ── Subtotals ────────────────────────────────────────────────────────
        const partials: any[] = table.partialTotalsRow || [];
        if (partials.length > 0) {
            const sRow = ws.getRow(row);
            sRow.height = 16;
            partials.forEach((item: any, i: number) => {
                const cell = sRow.getCell(colOffset + i);
                cell.value = item.data ?? '';
                totalCellStyle(cell, true);
            });
            sRow.commit();
            row++;
        }

        // ── Totals ───────────────────────────────────────────────────────────
        const totals: any[] = table.totalsRow || [];
        if (totals.length > 0) {
            const tRow = ws.getRow(row);
            tRow.height = 16;
            totals.forEach((item: any, i: number) => {
                const cell = tRow.getCell(colOffset + i);
                cell.value = item.data ?? '';
                totalCellStyle(cell, false);
            });
            tRow.commit();
            row++;
        }

        return row;
    }

    /**
     * Estimates how many Excel rows a panel occupies (to calculate band height).
     * 1 is added for the title; FileUtiles.ROW_GAP is applied outside.
     */
    private _estimatePanelHeight(panel: DashboardPanelExport): number {
        const TITLE_ROWS = panel.title ? 1 : 0;

        if (panel.type === 'chart') {
            return TITLE_ROWS + FileUtiles.IMG_ROWS_DEFAULT;
        }

        if (panel.type === 'kpi') {
            // With image: half text + half chart → total = gridRows * 2 (2 Excel rows per grid unit)
            // Without image: full-width text → 6 compact rows
            return TITLE_ROWS + (panel.imageBase64 ? panel.gridRows * 2 : 6);
        }

        if ((panel.type === 'table' || panel.type === 'crosstable') && panel.tableData) {
            const t = panel.tableData;
            const headerRows  = (t.series?.length || 0) || 1;   // multi-level header or 1 simple
            const dataRows    = (t._value?.length  || 0);
            const totalRows   = (t.totalsRow?.length    > 0) ? 1 : 0;
            const subtotalRows= (t.partialTotalsRow?.length > 0) ? 1 : 0;
            return TITLE_ROWS + headerRows + dataRows + totalRows + subtotalRows;
        }

        return TITLE_ROWS + FileUtiles.IMG_ROWS_DEFAULT; // 'other': fallback
    }

    /**
     * Calculates how many Excel columns an image should occupy to maintain
     * its original aspect ratio without exceeding the panel's available width.
     *
     * @param imgW       Natural image width (CSS px, without capture scaling)
     * @param imgH       Natural image height (CSS px)
     * @param excelRows  Excel rows assigned to the image
     * @param maxCols    Available Excel columns (panel width in the grid)
     */
    private _calcImageCols(
        imgW: number | undefined,
        imgH: number | undefined,
        excelRows: number,
        maxCols: number
    ): number {
        if (!imgW || !imgH || imgH === 0) {
            // No size information: use fallback proportional to panel
            return Math.min(maxCols, 20);
        }
        // Total height of Excel rows in pixels (calibrated)
        const heightPx    = excelRows * FileUtiles.EXCEL_ROW_PX;
        const aspectRatio = imgW / imgH;
        const widthPx     = heightPx * aspectRatio;
        const cols        = Math.round(widthPx / FileUtiles.EXCEL_COL_PX);
        // At least 4 columns, at most the panel's available width
        return Math.max(4, Math.min(cols, maxCols));
    }

    /**
     * Verifies that a base64 string corresponds to a valid PNG
     * by checking the header signature (magic bytes: 89 50 4E 47 0D 0A 1A 0A)
     */
    private _isValidPngBase64(base64: string): boolean {
        if (!base64 || base64.length < 16) return false;
        try {
            const binary = atob(base64.substring(0, 16));
            // PNG magic bytes: \x89PNG\r\n\x1a\n
            return binary.charCodeAt(0) === 0x89 &&
                   binary.charCodeAt(1) === 0x50 &&  // P
                   binary.charCodeAt(2) === 0x4E &&  // N
                   binary.charCodeAt(3) === 0x47;    // G
        } catch {
            return false;
        }
    }

    /** Formats a KPI value with Spanish locale (same as Angular 'es' pipe) */
    private _formatKpiValue(value: any): string {
        if (value === null || value === undefined) return '';
        const n = typeof value === 'number' ? value : parseFloat(String(value));
        if (isNaN(n)) return String(value);
        return new Intl.NumberFormat('es', { maximumFractionDigits: 10 }).format(n);
    }

    /** Converts a CSS color (#RRGGBB or #RGB) to ARGB for ExcelJS/docx */
    private _colorToArgb(cssColor: string | undefined, defaultArgb = 'FF000000'): string {
        if (!cssColor) return defaultArgb;
        const hex = cssColor.replace('#', '');
        if (hex.length === 3) {
            const [r, g, b] = hex.split('');
            return 'FF' + r + r + g + g + b + b;
        }
        if (hex.length === 6) return 'FF' + hex;
        return defaultArgb;
    }

    /** Converts a CSS color to RRGGBB format for docx (without alpha) */
    private _colorToRgb(cssColor: string | undefined, defaultRgb = '000000'): string {
        if (!cssColor) return defaultRgb;
        const hex = cssColor.replace('#', '');
        if (hex.length === 3) {
            const [r, g, b] = hex.split('');
            return r + r + g + g + b + b;
        }
        if (hex.length === 6) return hex;
        return defaultRgb;
    }

    /** Converts raw cell value to the correct type for ExcelJS */
    private _parseCell(raw: any, colType: string): any {
        if (raw === null || raw === undefined || raw === '') return null;
        if (colType === 'EdaColumnNumber') {
            const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
            return isNaN(n) ? raw : n;
        }
        return raw;
    }

    // ─── Export Dashboard to Word ──────────────────────────────────────────────

    /** Target content width in px (A4 page with 1.25cm margins) */
    private static readonly WORD_CONTENT_PX = 750;

    /** Colors for the Word document (RRGGBB without alpha) */
    private static readonly W_HEADER_BG = 'FFFFFF';   // header: white background
    private static readonly W_HEADER_FG = '2E75B6';   // header: blue text
    private static readonly W_TITLE_BG  = 'FFFFFF';   // panel title: white background
    private static readonly W_TITLE_FG  = '2E75B6';   // panel title: blue text
    private static readonly W_TOTAL_BG  = 'D6E4F0';   // totals row: very light blue
    private static readonly W_DATA_FG   = '000000';   // data: black text

    private static readonly W_NO_BORDER = {
        top:    { style: BorderStyle.NONE, size: 0, color: 'auto' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        left:   { style: BorderStyle.NONE, size: 0, color: 'auto' },
        right:  { style: BorderStyle.NONE, size: 0, color: 'auto' },
        insideH:{ style: BorderStyle.NONE, size: 0, color: 'auto' },
        insideV:{ style: BorderStyle.NONE, size: 0, color: 'auto' },
    };

    /**
     * Generates a .docx with all dashboard panels respecting their
     * 2D position (x/y from the Gridster grid).
     * - Tables: Word table with styled headers and totals.
     * - Cross-tables: multi-level headers with cell merge.
     * - Charts: PNG image embedded at correct scale.
     * - Panels on the same row → side by side in a borderless layout table.
     */
    async exportDashboardToWord(panels: DashboardPanelExport[], dashboardTitle: string): Promise<void> {
        const CW = FileUtiles.WORD_CONTENT_PX;
        const sectionChildren: any[] = [];

        // ── Dashboard title ──────────────────────────────────────────────
        sectionChildren.push(
            new Paragraph({
                children: [new TextRun({ text: dashboardTitle, bold: true, size: 36, color: FileUtiles.W_TITLE_FG })],
                spacing: { after: 160 },
                border:  { bottom: { style: BorderStyle.SINGLE, size: 8, color: FileUtiles.W_HEADER_BG } },
            }),
            new Paragraph({ text: '', spacing: { after: 80 } }),
        );

        // ── Group panels by grid row ──────────────────────────────────────────
        const rowGroups = new Map<number, DashboardPanelExport[]>();
        for (const panel of panels) {
            if (!rowGroups.has(panel.gridY)) rowGroups.set(panel.gridY, []);
            rowGroups.get(panel.gridY).push(panel);
        }
        const sortedYs = Array.from(rowGroups.keys()).sort((a, b) => a - b);

        for (const groupY of sortedYs) {
            const group = rowGroups.get(groupY)!.sort((a, b) => a.gridX - b.gridX);

            if (group.length === 1) {
                const panelWidthPx = Math.round(group[0].gridCols / FileUtiles.GRID_TOTAL_COLS * CW);
                sectionChildren.push(...this._buildWordPanel(group[0], panelWidthPx));
            } else {
                // Panels side by side inside a borderless layout table
                const cells = group.map(panel => {
                    const pct      = Math.round(panel.gridCols / FileUtiles.GRID_TOTAL_COLS * 100);
                    const widthPx  = Math.round(panel.gridCols / FileUtiles.GRID_TOTAL_COLS * CW);
                    return new TableCell({
                        width:   { size: pct, type: WidthType.PERCENTAGE },
                        borders: FileUtiles.W_NO_BORDER,
                        margins: { right: 200, left: 0, top: 0, bottom: 0 },
                        children: this._buildWordPanel(panel, widthPx),
                    });
                });
                sectionChildren.push(
                    new Table({
                        layout: TableLayoutType.FIXED,
                        width:   { size: 100, type: WidthType.PERCENTAGE },
                        borders: FileUtiles.W_NO_BORDER,
                        rows: [new TableRow({ children: cells })],
                    }),
                );
            }

            sectionChildren.push(new Paragraph({ text: '', spacing: { after: 160 } }));
        }

        const doc = new Document({
            sections: [{
                properties: { page: { margin: { top: 720, right: 900, bottom: 720, left: 900 } } },
                children: sectionChildren,
            }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${dashboardTitle}.docx`);
    }

    /** Builds the Word elements of an individual panel (title + content). */
    private _buildWordPanel(panel: DashboardPanelExport, widthPx: number): any[] {
        const items: any[] = [];

        // Panel title (white background, blue text)
        if (panel.title) {
            items.push(new Paragraph({
                children: [new TextRun({ text: panel.title, bold: true, size: 22, color: FileUtiles.W_TITLE_FG })],
                spacing:  { before: 60, after: 80 },
            }));
        }

        if (panel.type === 'kpi' && panel.kpiData) {
            const kpi    = panel.kpiData;
            const text   = this._formatKpiValue(kpi.value) + (kpi.sufix ? ' ' + kpi.sufix : '');
            const fullSizePt = 36 + (kpi.modifiedFontPoints || 0);
            // With chart: font reduced to half size (less available height)
            const sizePt     = panel.imageBase64 ? Math.round(fullSizePt / 2) : fullSizePt;
            const kpiParagraph = new Paragraph({
                children: [new TextRun({
                    text,
                    bold:  true,
                    size:  sizePt * 2,   // docx usa semipuntos
                    color: this._colorToRgb(kpi.kpiColor),
                })],
                alignment: AlignmentType.CENTER,
                spacing:   { before: 120, after: 120 },
            });

            if (panel.imageBase64) {
                // kpibar/kpiline/kpiarea: top text | bottom image
                // The image occupies half the panel height (gridRows / 2 units)
                // Using EXCEL_ROW_PX as height reference per grid row
                items.push(kpiParagraph);
                const base64 = panel.imageBase64.includes(',') ? panel.imageBase64.split(',')[1] : panel.imageBase64;
                if (this._isValidPngBase64(base64)) {
                    const imgData    = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                    const naturalW   = panel.imageWidth  || 600;
                    const naturalH   = panel.imageHeight || 400;
                    // Max height = half the panel in px (gridRows/2 * px per grid row)
                    const halfHeightPx = Math.round((panel.gridRows / 2) * FileUtiles.EXCEL_ROW_PX * 2);
                    const scaleW = widthPx   / naturalW;
                    const scaleH = halfHeightPx / naturalH;
                    const scale  = Math.min(1, scaleW, scaleH);
                    items.push(new Paragraph({
                        children: [new ImageRun({
                            type: 'png',
                            data: imgData,
                            transformation: { width: Math.round(naturalW * scale), height: Math.round(naturalH * scale) },
                        })],
                        spacing: { after: 100 },
                    }));
                }
            } else {
                // Pure KPI: full-width paragraph
                items.push(kpiParagraph);
            }
        } else if (panel.type === 'chart' && panel.imageBase64) {
            const base64 = panel.imageBase64.includes(',') ? panel.imageBase64.split(',')[1] : panel.imageBase64;
            if (this._isValidPngBase64(base64)) {
                const imgData  = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                const naturalW = panel.imageWidth  || 600;
                const naturalH = panel.imageHeight || 400;
                const scale    = Math.min(1, widthPx / naturalW);
                items.push(new Paragraph({
                    children: [new ImageRun({
                        type: 'png',
                        data: imgData,
                        transformation: { width: Math.round(naturalW * scale), height: Math.round(naturalH * scale) },
                    })],
                    spacing: { after: 100 },
                }));
            }
        } else if (panel.type === 'table' && panel.tableData) {
            items.push(this._buildWordPlainTable(panel.tableData));
        } else if (panel.type === 'crosstable' && panel.tableData) {
            items.push(this._buildWordCrossTable(panel.tableData));
        }

        return items;
    }

    /** Flat table → Word Table with blue header, alternate rows and totals. */
    private _buildWordPlainTable(table: any): any {
        const cols: any[] = table.cols || [];
        if (cols.length === 0) return new Paragraph({ text: '' });

        const colPct = Math.round(100 / cols.length);
        const rows:   any[] = [];

        // Header: white background, blue text
        rows.push(new TableRow({
            tableHeader: true,
            children: cols.map(col => new TableCell({
                width:    { size: colPct, type: WidthType.PERCENTAGE },
                children: [new Paragraph({
                    children:  [new TextRun({ text: col.header ?? '', bold: true, color: FileUtiles.W_HEADER_FG, size: 18 })],
                    alignment: AlignmentType.CENTER,
                })],
            })),
        }));

        // Data: white background, black text, no banding
        (table._value || []).forEach((dataRow: any) => {
            rows.push(new TableRow({
                children: cols.map(col => {
                    const val = this._parseCell(dataRow[col.field], col.type);
                    return new TableCell({
                        width:    { size: colPct, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({
                            children:  [new TextRun({ text: val != null ? String(val) : '', size: 18, color: FileUtiles.W_DATA_FG })],
                            alignment: col.type === 'EdaColumnNumber' ? AlignmentType.RIGHT : AlignmentType.LEFT,
                        })],
                    });
                }),
            }));
        });

        // Totals: very light blue
        const totals: any[] = table.totalsRow || [];
        if (totals.length > 0) {
            rows.push(new TableRow({
                children: totals.slice(0, cols.length).map((item: any) => new TableCell({
                    shading:  { fill: FileUtiles.W_TOTAL_BG, type: ShadingType.SOLID },
                    width:    { size: colPct, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({
                        children:  [new TextRun({ text: item.data ?? '', bold: true, size: 18 })],
                        alignment: AlignmentType.RIGHT,
                    })],
                })),
            }));
        }

        return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
    }

    /** Cross table → Word Table with multi-level merged headers. */
    private _buildWordCrossTable(table: any): any {
        const series: any[] = table.series || [];
        const cols:   any[] = table.cols   || [];
        if (cols.length === 0) return new Paragraph({ text: '' });

        const colPct = Math.round(100 / cols.length);
        const rows:   any[] = [];

        if (series.length > 0) {
            // Track how many more rows the rowspan of each column continues
            const rsTracker = new Array(cols.length).fill(0);

            series.forEach((serie: any) => {
                const cells: any[] = [];
                let c = 0;
                let labelIdx = 0;

                while (c < cols.length) {
                    if (rsTracker[c] > 0) {
                        // Empty vertical continuation cell
                        cells.push(new TableCell({
                            verticalMerge: VerticalMergeType.CONTINUE,
                            width:    { size: colPct, type: WidthType.PERCENTAGE },
                            children: [new Paragraph({ text: '' })],
                        }));
                        rsTracker[c]--;
                        c++;
                    } else if (labelIdx < serie.labels.length) {
                        const lbl = serie.labels[labelIdx++];
                        const cs  = lbl.colspan || 1;
                        const rs  = lbl.rowspan || 1;

                        cells.push(new TableCell({
                            columnSpan:    cs > 1 ? cs : undefined,
                            verticalMerge: rs > 1 ? VerticalMergeType.RESTART : undefined,
                            width:    { size: colPct * cs, type: WidthType.PERCENTAGE },
                            children: [new Paragraph({
                                children:  [new TextRun({ text: lbl.title ?? '', bold: true, color: FileUtiles.W_HEADER_FG, size: 18 })],
                                alignment: AlignmentType.CENTER,
                            })],
                        }));

                        // Mark columns covered by rowspan
                        if (rs > 1) {
                            for (let k = c; k < c + cs; k++) rsTracker[k] = rs - 1;
                        }
                        c += cs;
                    } else {
                        c++;
                    }
                }
                rows.push(new TableRow({ children: cells }));
            });

        } else {
            // Flat header: white background, blue text
            rows.push(new TableRow({
                tableHeader: true,
                children: cols.map((col: any) => new TableCell({
                    width:    { size: colPct, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({
                        children:  [new TextRun({ text: col.header ?? '', bold: true, color: FileUtiles.W_HEADER_FG, size: 18 })],
                        alignment: AlignmentType.CENTER,
                    })],
                })),
            }));
        }

        // Data: white background, black text, no banding
        (table._value || []).forEach((dataRow: any) => {
            rows.push(new TableRow({
                children: cols.map((col: any) => {
                    const val = this._parseCell(dataRow[col.field], col.type);
                    return new TableCell({
                        width:    { size: colPct, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({
                            children:  [new TextRun({ text: val != null ? String(val) : '', size: 18, color: FileUtiles.W_DATA_FG })],
                            alignment: col.type === 'EdaColumnNumber' ? AlignmentType.RIGHT : AlignmentType.LEFT,
                        })],
                    });
                }),
            }));
        });

        // Totals: very light blue
        const totals: any[] = table.totalsRow || [];
        if (totals.length > 0) {
            rows.push(new TableRow({
                children: totals.slice(0, cols.length).map((item: any) => new TableCell({
                    shading:  { fill: FileUtiles.W_TOTAL_BG, type: ShadingType.SOLID },
                    width:    { size: colPct, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({
                        children:  [new TextRun({ text: item.data ?? '', bold: true, size: 18 })],
                        alignment: AlignmentType.RIGHT,
                    })],
                })),
            }));
        }

        return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
    }

    // ─── Export individual CSV (no changes) ──────────────────────────────────

    // Export to CSV (without fs, browser compatible)
    async exportToCsv(headerDisplay: string[], cols: any[], fileName: string) {
        const workbook = new ExcelJS.Workbook();

        // Create worksheet
        const worksheet = workbook.addWorksheet('Sheet1');

        // Generate dynamic headers from cols
        const headers: string[] = [];
        _.forEach(cols, (c) => {
            _.forEach(Object.keys(c), (o) => {
                if (!headers.includes(o)) {
                    headers.push(o);
                }
            });
        });

        // Override headers with those to display
        const displayHeaders = headerDisplay.length ? headerDisplay : headers;
        worksheet.addRow(displayHeaders);

        // Fill rows with data
        _.forEach(cols, (col) => {
            const row: any[] = [];
            _.forEach(headers, (h) => {
                let text = _.get(col, h);
                if (!_.isNil(text) && !_.isEmpty(text)) {
                    text = text.toString().trim();
                }
                row.push(text);
            });
            worksheet.addRow(row);
        });

        const csvRows: string[] = [];
        worksheet.eachRow((row) => {
            const values: string[] = [];
            if (Array.isArray(row.values)) {
                for (let i = 1; i < row.values.length; i++) {
                    const val = row.values[i];
                    values.push(val !== undefined && val !== null ? String(val) : '');
                }
            }
            csvRows.push(values.join(','));
        });
        const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        saveAs(csvBlob, `${fileName}.csv`);
    }
}
