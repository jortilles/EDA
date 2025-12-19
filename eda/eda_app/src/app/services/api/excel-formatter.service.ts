import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import ExcelJS from 'exceljs/dist/exceljs.bare.min.js';
import { Observable } from 'rxjs/internal/Observable';
import { ApiService } from './api.service';
import { HttpClient } from '@angular/common/http';


@Injectable({
    providedIn: 'root'
})
export class ExcelFormatterService extends ApiService {

    constructor(protected http: HttpClient) {
        super(http);
    }
    private globalExcelRoute = '/excel-sheets';
    /**
     * Reads an Excel file and converts the data to JSON.
     * @param filePath The path to the Excel file.
     */
    async readExcelToJson(file: File): Promise<any[] | null> {
        // Solo aceptar archivos xls/xlsx
        const ext = file.name.toLowerCase();
        if (!ext.endsWith('.xls') && !ext.endsWith('.xlsx')) return null;

        return new Promise<any[]>((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (event: ProgressEvent<FileReader>) => {
                try {
                    const arrayBuffer = event.target?.result;
                    if (!arrayBuffer) {
                        reject('No file data');
                        return;
                    }

                    const workbook = new ExcelJS.Workbook();
                    await workbook.xlsx.load(arrayBuffer as ArrayBuffer);

                    // Tomar la primera hoja
                    const worksheet = workbook.worksheets[0];
                    if (!worksheet) {
                        resolve([]);
                        return;
                    }

                    const jsonData: any[] = [];

                    // Iterar cada fila
                    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                        const rowData: any = {};
                        row.eachCell((cell, colNumber) => {
                            // Usar la primera fila como headers
                            if (rowNumber === 1) {
                                rowData[colNumber] = cell.text;
                            } else {
                                const header = worksheet.getRow(1).getCell(colNumber).text;
                                rowData[header] = cell.text;
                            }
                        });
                        // Ignorar la fila de headers en jsonData
                        if (rowNumber !== 1) {
                            jsonData.push(rowData);
                        }
                    });

                    resolve(jsonData);
                } catch (err) {
                    console.error('Error reading Excel:', err);
                    reject(err);
                }
            };

            reader.onerror = (error) => {
                console.error('FileReader error', error);
                reject(error);
            };

            reader.readAsArrayBuffer(file);
        });
    }
    /**
     * Receives a json and sends it to given route
     * @param json
     */
    addNewCollectionFromJSON(jsonData): Observable<any> {
        return this.post(`${this.globalExcelRoute}/add-json-data-source`, jsonData);
    }

    /**
     * Receives a name and checks the existence of given json name
     * @param json
     */
    checkExistenceFromJSON(nameData): Observable<any> {
        return this.post(`${this.globalExcelRoute}/existent-json-data-source`, nameData);
    }

}
