import { AlertService } from './../../../../../services/alerts/alert.service';
import { SpinnerService } from './../../../../../services/shared/spinner.service';
import { SelectItem, SharedModule } from 'primeng/api';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, signal, ViewChild } from '@angular/core';
import { EdaDialog } from '@eda/shared/components/shared-components.index';
import { NgxCsvParser } from 'ngx-csv-parser';
import { AddTableService } from '@eda/services/api/createTable.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { DropdownModule } from 'primeng/dropdown';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@eda/shared/components/icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-add-csv-dialog',
  templateUrl: './add-csv.component.html',
  styleUrls: ['./add-csv.component.css'],
  imports: [SharedModule, CommonModule, FormsModule, ReactiveFormsModule, IconComponent, DropdownModule, EdaDialog2Component]
})

export class AddCsvComponent implements OnInit {
  public display: boolean = false;
  @Input() config: any;
  @Input() model_id: any;
  @Output() close: EventEmitter<any> = new EventEmitter<any>();


  public title = $localize`:@@addTableTitle:Añadir Tabla`;
  @ViewChild('file', { static: false }) file: { nativeElement: { files: { [key: string]: File; }; value: string; click: () => void; }; };
  @ViewChild('file') fileInput!: ElementRef<HTMLInputElement>;

  _csvFile = signal<File | null>(null);
  _csvFileName = signal<string>('');
  isDraggingExcelFile = signal<boolean>(false);
  isDraggingCsvFile = signal<boolean>(false);
  public dialog: EdaDialog;
  public csvRecords: any;
  public csvHeaders: any;
  public csvColumns: any = [];
  public header = true;
  public delimiter: string;
  public decDelimiter : string;
  public tableName: string;
  public dataTypes: SelectItem[];
  public dataFormats: SelectItem[];
  public decSeparators : SelectItem[];
  public editFieldsHeaders: Array<string>;
  public names: Array<string>;
  public tableAdded: boolean = false;

  constructor(
    private ngxCsvParser: NgxCsvParser,
    private createTableService: AddTableService,
    private spinnerService: SpinnerService,
    private alertService: AlertService
  ) {

    // this.dialog = new EdaDialog({
    //   show: () => this.onShow(),
    //   hide: () => this.onClose(EdaDialogCloseEvent.NONE),
    //   title: $localize`:@@addTableTitle:Añadir Tabla`
    // });
    // this.dialog.style = { width: '80%', height: '65%', top:"-4em", left:'1em' };

    this.names = ['type', 'format', 'separator'];

    this.dataTypes = [
      { label: 'text', value: 'text' },
      { label: 'integer', value: "integer" },
      { label: 'numeric', value: "numeric" },
      { label: 'boolean', value: "boolean" },
      { label: 'date', value: "timestamp" },
    ];

    this.editFieldsHeaders = [$localize`:@@csvField:Campo`, $localize`:@@type:Tipo`, $localize`:@@csvFormat:Formato`, $localize`:@@csvSep:Separador Decimal`];

    this.dataFormats = [
      { label: '', value: '' },
      { label: '#,###.##', value: '.' },
      { label: '#.###,##', value: ',' },
      { label: 'DD-MM-YYYY', value: 'DD-MM-YYYY' },
      { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
      { label: 'YYYY-MM-DD HH:MI:SS', value: 'YYYY-MM-DD HH:MI:SS' },
      { label: 'DD-MM-YYYY HH:MI:SS', value: 'DD-MM-YYYY HH:MI:SS' },
      { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
      { label: 'YYYY/MM/DD', value: 'YYYY/MM/DD' },
      { label: 'DD/MM/YYYY HH:MI:SS', value: 'DD/MM/YYYY HH:MI:SS' },
      { label: 'YYYY/MM/DD HH:MI:SS', value: 'YYYY/MM/DD HH:MI:SS' },
    ];

    this.decSeparators = [
      { label: ',', value: ',' },
      { label: '.', value: "." }
    ];
  }

  ngOnInit(): void { }
  
  onClose(response?: any): void {
    this.display = false;
    this.close.emit(response);
  }

  closeDialog() {
    this.onClose(this.tableAdded);
  }

  async onFilesAdded() {
    if(!this.delimiter)
        this.delimiter = ';';
    const file = this.file.nativeElement.files[0];
    try {
      this.csvRecords = await this.ngxCsvParser.parse(file, { header: this.header, delimiter: this.delimiter })
        .pipe().toPromise();
      this.csvHeaders = Object.keys(this.csvRecords[0]);
      const types = this.getTypes(this.csvHeaders, this.csvRecords);
      this.csvColumns = [];
      this.csvHeaders.forEach((header, h) => {
        let row = { field: header };
        for (let i = 0; i < 3; i++) {
          row[this.names[i]] = i === 0 ? types[h] : '';
        }
        this.csvColumns.push(row);
      });
    } catch (err) {
      console.log(err);
    }

  }

  getTypes(headers: Array<string>, data: Array<{}>) {
    let max_rows = 10000;
    let types = new Array(headers.length).fill('numeric');
    let nulls = new Array(headers.length).fill(true);

    if (max_rows > data.length) max_rows = data.length;
    let onlyNumbers = /^\d+$/;

    for (let i = 0; i < max_rows; i++) {
      headers.forEach((header, j) => {
        const value = data[i][header];
        if (value && !onlyNumbers.test(value)) {
          types[j] = 'text';
          nulls[j] = false;
        }else if(value){
          nulls[j] = false;
        }
      });
    }
    types.forEach((type, i) => {
      if(nulls[i]) types[i] = 'text';
    });
    return types;
  }

  loadFile() {
    this.csvHeaders = [];
    this.csvColumns = [];
    this.file.nativeElement.value = "";
    this.file.nativeElement.click();
  }

  async generateTable() {
    this.spinnerService.on();
    const createBody = {
      query: {
        tableName: `from_csv_${this.tableName.replace(/[^\w\s]/gi, '').replace(/ /gi, '_')}`,
        columns: this.csvColumns
      },
      model_id: this.model_id
    }

    const BATCH_SIZE = 1000;
    const batches = Math.ceil(this.csvRecords.length / BATCH_SIZE);

    try {
      await this.createTableService.createTable(createBody).toPromise();
      let start = 0;

      for (let i = 0; i < batches; i++) {
        const rows = this.csvRecords.slice(start, start + BATCH_SIZE);
        start = start + BATCH_SIZE;
        const insertBody = {
          query: {
            tableName: `from_csv_${this.tableName.replace(/[^\w\s]/gi, '').replace(/ /gi, '_')}`,
            columns: this.csvColumns,
            data: rows,
          },
          model_id: this.model_id
        }

        await this.createTableService.insertData(insertBody).toPromise();
      }
      this.spinnerService.off();
      this.alertService.addSuccess($localize`:@@succesAddTable:Tabla creada correctamente`);
      this.tableAdded = true;
      this.closeDialog();

    } catch (err) {
      this.spinnerService.off();
      this.alertService.addError(err.text.routine)
    }
  }

  retryCsvWithNewSeparator() {
    const input = this.fileInput?.nativeElement;
    if (!input) {
      return;
    }

    const files = input.files;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    this.parseCsv(file);
  }
  // Métodos para manejar eventos de drag & drop
  handleDrag(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  handleDragIn(e: DragEvent, type: 'bigquery' | 'excel' | 'csv') {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingExcelFile.set(true);
  }

  handleDragOut(e: DragEvent, type: 'bigquery' | 'excel' | 'csv') {
    e.preventDefault();
    e.stopPropagation();
      this.isDraggingExcelFile.set(false);
  }

  handleDrop(e: DragEvent, type: 'bigquery' | 'excel' | 'csv') {
    e.preventDefault();
    e.stopPropagation();

      this.isDraggingExcelFile.set(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
    }
  }

  handleFileSelect(e: Event, type: 'bigquery' | 'excel' | 'csv') {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.handleFiles(files[0], type);
    }
  }

    handleFiles(file: File, type: 'bigquery' | 'excel' | 'csv') {
      this._csvFileName.set(file.name);
      this._csvFile.set(file);
  }


  parseCsv(file: File) {
    const reader = new FileReader();

    reader.onload = () => {
      const text = reader.result as string;

      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      if(this.delimiter === '')
        return
      
      this.csvColumns = [];
      const headers = lines[0].split(this.delimiter);

      // Mapear filas; si field vacío, le ponemos nombre genérico
      const rows = headers.map((header, i) => {
        const fieldName = header?.trim() || `column_${i + 1}`;
        return {
          field: fieldName,
          type: 'string',
          format: '',
          separator: '.'
        };
      });

      this.csvColumns = rows;
    };

    reader.onerror = (err) => {
      this.csvColumns = [];
    };

    reader.readAsText(file);
  }
}