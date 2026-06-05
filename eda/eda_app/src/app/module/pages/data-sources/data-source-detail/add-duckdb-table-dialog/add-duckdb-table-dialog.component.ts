import { Component, ElementRef, EventEmitter, Input, OnInit, Output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule, SelectItem } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { NgxCsvParser } from 'ngx-csv-parser';
import { lastValueFrom } from 'rxjs';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { DataSourceService } from '@eda/services/api/datasource.service';
import { AlertService } from '@eda/services/alerts/alert.service';
import { SpinnerService } from '@eda/services/shared/spinner.service';

@Component({
  standalone: true,
  selector: 'app-add-duckdb-table-dialog',
  templateUrl: './add-duckdb-table-dialog.component.html',
  imports: [CommonModule, FormsModule, SharedModule, DropdownModule, EdaDialog2Component]
})
export class AddDuckdbTableDialogComponent implements OnInit {
  @Input() datasourceId: string;
  @Output() close = new EventEmitter<any>();

  @ViewChild('duckdbFile') fileInput!: ElementRef<HTMLInputElement>;

  _fileName = signal<string>('');
  isDragging = signal<boolean>(false);

  public separator: string = ';';
  public csvRecords: any[] = [];
  public csvHeaders: string[] = [];
  public csvColumns: any[] = [];
  public rawContent: string = '';

  public dataTypes: SelectItem[] = [
    { label: 'text', value: 'text' },
    { label: 'integer', value: 'integer' },
    { label: 'numeric', value: 'numeric' },
    { label: 'date', value: 'timestamp' },
  ];
  public dataFormats: SelectItem[] = [
    { label: 'Sin formato', value: '' },
    { label: 'DD-MM-YYYY', value: 'DD-MM-YYYY' },
    { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
    { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
    { label: 'YYYY-MM-DD HH:MI:SS', value: 'YYYY-MM-DD HH:MI:SS' },
    { label: 'DD-MM-YYYY HH:MI:SS', value: 'DD-MM-YYYY HH:MI:SS' },
  ];
  public decSeparators: SelectItem[] = [
    { label: ',', value: ',' },
    { label: '.', value: '.' },
  ];

  constructor(
    private ngxCsvParser: NgxCsvParser,
    private dataSourceService: DataSourceService,
    private alertService: AlertService,
    private spinnerService: SpinnerService
  ) {}

  ngOnInit(): void {}

  handleDrag(e: DragEvent) { e.preventDefault(); e.stopPropagation(); }

  handleDragIn(e: DragEvent) {
    e.preventDefault(); e.stopPropagation();
    this.isDragging.set(true);
  }

  handleDragOut(e: DragEvent) {
    e.preventDefault(); e.stopPropagation();
    this.isDragging.set(false);
  }

  async handleDrop(e: DragEvent) {
    e.preventDefault(); e.stopPropagation();
    this.isDragging.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) await this.processFile(file);
  }

  async handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) await this.processFile(file);
  }

  async retryCsvWithNewSeparator() {
    if (!this.fileInput?.nativeElement?.files?.[0]) return;
    await this.processFile(this.fileInput.nativeElement.files[0]);
  }

  private async processFile(file: File) {
    this._fileName.set(file.name);
    this.rawContent = await file.text();
    try {
      this.csvRecords = await this.ngxCsvParser.parse(file, { header: true, delimiter: this.separator || ';' }).pipe().toPromise() as any[];
      if (!this.csvRecords?.length) { this.csvColumns = []; return; }
      this.csvHeaders = Object.keys(this.csvRecords[0]);
      const types = this.detectTypes(this.csvHeaders, this.csvRecords);
      this.csvColumns = this.csvHeaders.map((header, i) => ({
        field: header,
        type: types[i],
        format: '',
        separator: ','
      }));
    } catch {
      this.csvColumns = [];
      this.alertService.addError($localize`:@@errorParseDuckDb:Error al parsear el archivo CSV. Verifica el separador.`);
    }
  }

  private detectTypes(headers: string[], data: any[]): string[] {
    const types = new Array(headers.length).fill('numeric');
    const allNull = new Array(headers.length).fill(true);
    const onlyNumbers = /^\d+$/;
    const rows = Math.min(data.length, 10000);
    for (let i = 0; i < rows; i++) {
      headers.forEach((h, j) => {
        const v = data[i][h];
        if (v && !onlyNumbers.test(v)) { types[j] = 'text'; allNull[j] = false; }
        else if (v) allNull[j] = false;
      });
    }
    return types.map((t, i) => allNull[i] ? 'text' : t);
  }

  get canApply(): boolean {
    return !!this._fileName() && !!this.separator && this.csvColumns.length > 0;
  }

  async applyAdd() {
    if (!this.canApply) return;
    this.spinnerService.on();
    try {
      const res = await lastValueFrom(
        this.dataSourceService.addDuckDbTable(this.datasourceId, {
          fileName: this._fileName(),
          csvContent: this.rawContent,
          columnsConfig: this.csvColumns
        })
      );
      this.alertService.addSuccess($localize`:@@duckdbTableAdded:Tabla añadida correctamente`);
      this.close.emit(res.table);
    } catch (err) {
      this.alertService.addError(err);
    } finally {
      this.spinnerService.off();
    }
  }

  closeDialog() {
    this.close.emit(null);
  }
}
