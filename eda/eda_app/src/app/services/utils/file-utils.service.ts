import { Injectable } from '@angular/core';
import { URL_SERVICES } from '../../config/config';
import ExcelJS from 'exceljs/dist/exceljs.bare.min.js';
import { saveAs } from 'file-saver';
import * as _ from 'lodash';

// Colores corporativos para el export de dashboard
const HEADER_BG   = 'FF2E75B6';   // azul cabecera
const HEADER_FG   = 'FFFFFFFF';   // texto blanco
const TOTAL_BG    = 'FFD6E4F0';   // azul claro totales
const SUBTOTAL_BG = 'FFE8F2FA';   // azul muy claro subtotales
const TITLE_BG    = 'FFDCE6F1';   // fondo título de panel
const TITLE_FG    = 'FF1F3864';   // azul oscuro texto título

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
    type: 'table' | 'crosstable' | 'chart' | 'other';
    tableData?: any;       // Instancia EdaTable (para table / crosstable)
    imageBase64?: string;  // dataURL PNG (para chart)
    imageWidth?:  number;  // ancho natural de la imagen (px, sin escala de captura)
    imageHeight?: number;  // alto natural de la imagen (px, sin escala de captura)
    // Posición en el grid de Gridster
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

    // Generador de IDs
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

    // Exportar a Excel (sin fs, compatible navegador)
    async exportToExcel(headerDisplay: string[], cols: any[], fileName: string) {
        const workbook = new ExcelJS.Workbook();

        // Crear worksheet
        const worksheet = workbook.addWorksheet('Sheet1');

        // Generar headers dinámicos desde cols
        const headers: string[] = [];
        _.forEach(cols, (c) => {
            _.forEach(Object.keys(c), (o) => {
                if (!headers.includes(o)) {
                    headers.push(o);
                }
            });
        });

        // Sobrescribir headers con los que deseas mostrar
        const displayHeaders = headerDisplay.length ? headerDisplay : headers;
        worksheet.addRow(displayHeaders);

        // Llenar filas con los datos
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

        // Generar XLSX como Blob y descargar
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        saveAs(blob, `${fileName}.xlsx`);
    }

    // ─── Export Dashboard completo a Excel ────────────────────────────────────

    /**
     * Escala de conversión: unidades de grid Gridster → columnas de Excel.
     * El grid usa 40 columnas. Con escala 2 → 80 columnas Excel totales.
     * Cada columna Excel tendrá ancho de ~12 caracteres (~90px).
     */
    private static readonly GRID_TOTAL_COLS  = 40;
    private static readonly EXCEL_SCALE      = 1;   // Excel cols por unidad de grid
    private static readonly EXCEL_COL_WIDTH  = 12;  // ancho por defecto de cada columna Excel
    private static readonly IMG_ROWS_DEFAULT = 25;  // filas Excel que ocupa una imagen
    private static readonly ROW_GAP          = 2;   // filas de separación entre bandas
    /**
     * Calibración de píxeles por celda Excel (empírica, usada para aspect ratio).
     * - Fila a 18pt: ~24px de alto.
     * - Columna a 12 chars: ~64px de ancho.
     */
    private static readonly EXCEL_ROW_PX = 24;
    private static readonly EXCEL_COL_PX = 64;

    /**
     * Genera un .xlsx con todos los paneles del dashboard respetando su
     * posición 2D (x/y del grid de Gridster):
     * - Paneles en la misma fila de grid → misma banda horizontal en Excel.
     * - Tablas y tablas cruzadas: datos + estructura + estilos.
     * - Gráficos y KPIs: imagen PNG capturada del DOM.
     *
     * @param panels        Array con datos de cada panel + coordenadas de grid
     * @param dashboardTitle Nombre del archivo descargado
     */
    async exportDashboardToExcel(panels: DashboardPanelExport[], dashboardTitle: string): Promise<void> {
        const workbook  = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Dashboard', {
            pageSetup: { fitToPage: true, fitToWidth: 1, orientation: 'landscape' }
        });

        // Fijar ancho de las 80 columnas Excel (40 grid × escala 2)
        const totalExcelCols = FileUtiles.GRID_TOTAL_COLS * FileUtiles.EXCEL_SCALE;
        for (let c = 1; c <= totalExcelCols; c++) {
            worksheet.getColumn(c).width = FileUtiles.EXCEL_COL_WIDTH;
        }

        // ── Agrupar paneles por su fila de grid (gridY) ──────────────────────
        const rowGroups = new Map<number, DashboardPanelExport[]>();
        for (const panel of panels) {
            const key = panel.gridY;
            if (!rowGroups.has(key)) rowGroups.set(key, []);
            rowGroups.get(key).push(panel);
        }

        // Ordenar grupos por y ascendente
        const sortedYs = Array.from(rowGroups.keys()).sort((a, b) => a - b);

        let currentExcelRow = 1;

        for (const groupY of sortedYs) {
            const group = rowGroups.get(groupY)!.sort((a, b) => a.gridX - b.gridX);

            // ── Primera pasada: calcular altura (filas Excel) de cada panel ──
            const heights = group.map(p => this._estimatePanelHeight(p));
            const bandHeight = Math.max(...heights);

            const bandStartRow = currentExcelRow;

            // ── Segunda pasada: renderizar cada panel ────────────────────────
            for (let i = 0; i < group.length; i++) {
                const panel    = group[i];
                const colStart = panel.gridX * FileUtiles.EXCEL_SCALE + 1;   // 1-indexed
                const colEnd   = (panel.gridX + panel.gridCols) * FileUtiles.EXCEL_SCALE; // inclusive

                let panelRow = bandStartRow;

                // Título del panel
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

                            // Calcular imgCols desde el aspect ratio de la imagen real
                            // para evitar deformación horizontal
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

                } else if (panel.type === 'crosstable' && panel.tableData) {
                    this._writeCrossTable(worksheet, panel.tableData, panelRow, colStart);

                } else if (panel.type === 'table' && panel.tableData) {
                    this._writePlainTable(worksheet, panel.tableData, panelRow, colStart);
                }
            }

            // Avanzar la fila global por la altura máxima de la banda + separación
            currentExcelRow = bandStartRow + bandHeight + FileUtiles.ROW_GAP;
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        saveAs(blob, `${dashboardTitle}.xlsx`);
    }

    // ─── Tabla plana ──────────────────────────────────────────────────────────
    /**
     * @param colOffset  Columna Excel (1-indexed) donde empieza la tabla.
     *                   Permite colocar varias tablas lado a lado.
     */
    private _writePlainTable(ws: any, table: any, startRow: number, colOffset = 1): number {
        let row = startRow;

        const cols = (table.cols || []) as any[];
        if (cols.length === 0) return row;

        // Cabecera
        const hRow = ws.getRow(row);
        hRow.height = 18;
        cols.forEach((col: any, i: number) => {
            const cell = hRow.getCell(colOffset + i);
            cell.value = col.header;
            headerCellStyle(cell);
        });
        hRow.commit();
        row++;

        // Filas de datos
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

        // Subtotales (por página)
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

        // Totales de columna
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

    // ─── Tabla cruzada (pivot) ────────────────────────────────────────────────
    /**
     * @param colOffset  Columna Excel (1-indexed) donde empieza la tabla cruzada.
     */
    private _writeCrossTable(ws: any, table: any, startRow: number, colOffset = 1): number {
        let row = startRow;

        const series: any[]  = table.series || [];
        const cols:   any[]  = table.cols   || [];

        if (cols.length === 0) return row;

        // ── Cabeceras multi-nivel desde series ────────────────────────────────
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
                        } catch (_) { /* ya mergeado */ }
                    }

                    colPos += cs;
                });

                hRow.commit();
            });

            row += series.length;

        } else {
            // Sin series: cabecera plana
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

        // ── Filas de datos ────────────────────────────────────────────────────
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

        // ── Subtotales ────────────────────────────────────────────────────────
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

        // ── Totales ───────────────────────────────────────────────────────────
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
     * Estima cuántas filas Excel ocupa un panel (para calcular la altura de banda).
     * Se añade 1 para el título y FileUtiles.ROW_GAP ya se aplica fuera.
     */
    private _estimatePanelHeight(panel: DashboardPanelExport): number {
        const TITLE_ROWS = panel.title ? 1 : 0;

        if (panel.type === 'chart') {
            return TITLE_ROWS + FileUtiles.IMG_ROWS_DEFAULT;
        }

        if ((panel.type === 'table' || panel.type === 'crosstable') && panel.tableData) {
            const t = panel.tableData;
            const headerRows  = (t.series?.length || 0) || 1;   // cabecera multi-nivel o 1 simple
            const dataRows    = (t._value?.length  || 0);
            const totalRows   = (t.totalsRow?.length    > 0) ? 1 : 0;
            const subtotalRows= (t.partialTotalsRow?.length > 0) ? 1 : 0;
            return TITLE_ROWS + headerRows + dataRows + totalRows + subtotalRows;
        }

        return TITLE_ROWS + FileUtiles.IMG_ROWS_DEFAULT; // 'other': fallback
    }

    /**
     * Calcula cuántas columnas Excel debe ocupar una imagen para mantener
     * su aspect ratio original, sin exceder el ancho disponible del panel.
     *
     * @param imgW       Ancho natural de la imagen (px CSS, sin escala de captura)
     * @param imgH       Alto natural de la imagen (px CSS)
     * @param excelRows  Filas Excel asignadas a la imagen
     * @param maxCols    Columnas Excel disponibles (ancho del panel en el grid)
     */
    private _calcImageCols(
        imgW: number | undefined,
        imgH: number | undefined,
        excelRows: number,
        maxCols: number
    ): number {
        if (!imgW || !imgH || imgH === 0) {
            // Sin información de tamaño: usar fallback proporcional al panel
            return Math.min(maxCols, 20);
        }
        // Altura total de las filas Excel en píxeles (calibrada)
        const heightPx    = excelRows * FileUtiles.EXCEL_ROW_PX;
        const aspectRatio = imgW / imgH;
        const widthPx     = heightPx * aspectRatio;
        const cols        = Math.round(widthPx / FileUtiles.EXCEL_COL_PX);
        // Al menos 4 columnas, como máximo el ancho disponible del panel
        return Math.max(4, Math.min(cols, maxCols));
    }

    /**
     * Verifica que un string base64 corresponda a un PNG válido
     * comprobando la firma de cabecera (magic bytes: 89 50 4E 47 0D 0A 1A 0A)
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

    /** Convierte el valor crudo de celda al tipo correcto para ExcelJS */
    private _parseCell(raw: any, colType: string): any {
        if (raw === null || raw === undefined || raw === '') return null;
        if (colType === 'EdaColumnNumber') {
            const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
            return isNaN(n) ? raw : n;
        }
        return raw;
    }

    // ─── Export CSV individual (sin cambios) ──────────────────────────────────

    // Exportar a CSV (sin fs, compatible navegador)
    async exportToCsv(headerDisplay: string[], cols: any[], fileName: string) {
        const workbook = new ExcelJS.Workbook();

        // Crear worksheet
        const worksheet = workbook.addWorksheet('Sheet1');

        // Generar headers dinámicos desde cols
        const headers: string[] = [];
        _.forEach(cols, (c) => {
            _.forEach(Object.keys(c), (o) => {
                if (!headers.includes(o)) {
                    headers.push(o);
                }
            });
        });

        // Sobrescribir headers con los que deseas mostrar
        const displayHeaders = headerDisplay.length ? headerDisplay : headers;
        worksheet.addRow(displayHeaders);

        // Llenar filas con los datos
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
