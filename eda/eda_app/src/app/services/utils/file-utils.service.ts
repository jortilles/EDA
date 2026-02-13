import { Injectable } from '@angular/core';
import { URL_SERVICES } from '../../config/config';
import ExcelJS from 'exceljs/dist/exceljs.bare.min.js';
import { saveAs } from 'file-saver';
import * as _ from 'lodash';

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

    // Exportar a Excel y CSV (sin fs, compatible navegador)
    async exportToExcel(
        headerDisplay: string[],
        cols: any[],
        fileName: string
    ) {
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

        // Generar CSV deshabilitado
        // const csvRows: string[] = [];
        // worksheet.eachRow((row) => {
        //     const values: string[] = [];
        //     if (Array.isArray(row.values)) {
        //         for (let i = 1; i < row.values.length; i++) {
        //             const val = row.values[i];
        //             values.push(val !== undefined && val !== null ? String(val) : '');
        //         }
        //     }
        //     csvRows.push(values.join(','));
        // });
        // const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        // saveAs(csvBlob, `${fileName}.csv`);
    }
}
