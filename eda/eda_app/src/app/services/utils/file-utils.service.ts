import { Injectable } from '@angular/core';
import { URL_SERVICES } from '../../config/config';
import * as XLSX from 'xlsx';
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

    // Generador d'IDs
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

    exportToExcel(headerDisplay: string[], cols: any[], fileName: string) {
        const workbook = XLSX.utils.book_new();

        const excel: any = [];

        const headers = [];

        _.forEach(cols, c => {
            _.forEach(Object.keys(c), o => {
                if (!headers.find(e => e === o) || headers.length === 0) {
                    headers.push(o);
                }
            });
        });

        excel.push(headers);

        _.forEach(cols, (col) => {
            const item: any = [];

            _.forEach(headers, h => {
                let text = _.get(col, h);
                if (!_.isNil(text) && !_.isEmpty(text)) {
                    text = text.trim();
                }
                item.push(text);

                });
            excel.push(item);
        });

        excel[0] = headerDisplay;

        const worksheet = XLSX.utils.aoa_to_sheet(excel);

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

        XLSX.utils.sheet_to_csv(worksheet);

        XLSX.writeFile(workbook, fileName + '.xlsx', {
            bookType: 'xlsx',
        });
    }


}
