import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import * as _ from 'lodash';
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
  async readExcelToJson(file: File): Promise<JSON[]> {
    if (!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) return null;
    
    return new Promise<JSON[]>((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = (event) => {
        const data = event.target.result;
        const workbook: XLSX.WorkBook = XLSX.read(data, { type: 'binary'});
  
        const sheetName: string = workbook.SheetNames[0];
        const sheet: XLSX.WorkSheet = workbook.Sheets[sheetName];
  
        const jsonData: JSON[] = XLSX.utils.sheet_to_json(sheet);
        resolve(jsonData);
      };
      fileReader.onerror = (error) => {
        reject(error);
      };
      fileReader.readAsArrayBuffer(file);
    });
  }
  
  addNewCollectionFromJSON(jsonData): Observable<any> {
    return this.post(`${this.globalExcelRoute}/add-json-data-source`, jsonData);
  }

  checkExistenceFromJSON(nameData): Observable<any> {
    return this.post(`${this.globalExcelRoute}/existent-json-data-source`, nameData);
  }
  
}
