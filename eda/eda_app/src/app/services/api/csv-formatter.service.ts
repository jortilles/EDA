import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { ApiService } from './api.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class CsvFormatterService extends ApiService {

    constructor(protected http: HttpClient) {
        super(http);
    }

    private globalCsvRoute = '/csv-sheets';

    /**
     * Reads a CSV file and converts the data to JSON.
     * @param file The CSV file to read.
     */
    async readCsvToJson(file: File): Promise<any[] | null> {
        const ext = file.name.toLowerCase();
        if (!ext.endsWith('.csv')) return null;

        return new Promise<any[]>((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event: ProgressEvent<FileReader>) => {
                const text = event.target?.result as string;
                if (!text) {
                    reject('No file data');
                    return;
                }

                try {
                    const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
                    if (lines.length === 0) {
                        resolve([]);
                        return;
                    }

                    const headers = lines[0].split(',').map(h => h.trim());
                    const data: any[] = [];

                    for (let i = 1; i < lines.length; i++) {
                        const row = lines[i].split(',').map(cell => cell.trim());
                        const rowData: any = {};
                        headers.forEach((header, index) => {
                            rowData[header] = row[index] ?? null;
                        });
                        data.push(rowData);
                    }

                    resolve(data);
                } catch (err) {
                    console.error('Error parsing CSV:', err);
                    reject(err);
                }
            };

            reader.onerror = (error) => {
                console.error('FileReader error', error);
                reject(error);
            };

            reader.readAsText(file);
        });
    }

    /**
     * Receives a json and sends it to given route
     * @param json
     */
    addNewCollectionFromJSON(jsonData): Observable<any> {
        return this.post(`${this.globalCsvRoute}/add-json-data-source`, jsonData);
    }

    /**
     * Receives a name and checks the existence of given json name
     * @param json
     */
    checkExistenceFromJSON(nameData): Observable<any> {
        return this.post(`${this.globalCsvRoute}/existent-json-data-source`, nameData);
    }
}
