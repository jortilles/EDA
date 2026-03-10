import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService, DataSourceService, ExcelFormatterService, SpinnerService } from '@eda/services/service.index';
import { CommonModule } from '@angular/common';
import { SharedModule, SelectItem } from 'primeng/api';
import { lastValueFrom } from 'rxjs';
import { NgxCsvParser } from 'ngx-csv-parser';
import { ChangeDetectorRef } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-datasource-update-file',
    templateUrl: './datasource-update-file.page.html',
    imports: [SharedModule, CommonModule, FormsModule, ReactiveFormsModule]
})
export class DataSourceUpdateFilePage implements OnInit {

    @ViewChild('file') fileInput!: ElementRef<HTMLInputElement>;

    public id: string;
    public connectionName: string = '';
    public connectionType: string = '';

    public form!: FormGroup;

    // Excel
    _excelFileName = signal<string>('');
    _excelFile = signal<File | null>(null);
    isDraggingExcelFile = signal<boolean>(false);
    public excelFileData: JSON[] = [];

    // CSV
    _csvFileName = signal<string>('');
    _csvFile = signal<File | null>(null);
    isDraggingCsvFile = signal<boolean>(false);
    public csvRecords: any;
    public csvHeaders: any;
    public csvColumns: any = [];
    public csvFileData: JSON[] = [];

    public dataTypes: SelectItem[] = [
        { label: 'text', value: 'text' },
        { label: 'integer', value: 'integer' },
        { label: 'numeric', value: 'numeric' },
        { label: 'coordinate', value: 'coordinate' },
        { label: 'html', value: 'html' },
        { label: 'boolean', value: 'boolean' },
        { label: 'date', value: 'timestamp' },
    ];

    public dataFormats: SelectItem[] = [
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

    public decSeparators: SelectItem[] = [
        { label: ',', value: ',' },
        { label: '.', value: '.' }
    ];

    public editFieldsHeaders: Array<string> = [
        $localize`:@@csvField:Campo`,
        $localize`:@@type:Tipo`,
        $localize`:@@dateFormatH4:Formato`,
        $localize`:@@csvSep:Separador Decimal`
    ];

    private names = ['type', 'format', 'separator'];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private dataSourceService: DataSourceService,
        private excelFormatterService: ExcelFormatterService,
        private alertService: AlertService,
        private spinnerService: SpinnerService,
        private fb: FormBuilder,
        private ngxCsvParser: NgxCsvParser,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.id = this.route.snapshot.paramMap.get('id');

        this.form = this.fb.group({
            optimize: [true],
            allowCache: [true],
            separator: [';'],
        });

        this.dataSourceService.getModelById(this.id);
        this.dataSourceService.modelConnection.subscribe(connection => {
            if (connection && connection.type) {
                const conn = this.dataSourceService.getConnectionType() === 'excel' ? { ...connection, source_type: 'excel' } : connection;
                this.form.patchValue({
                    optimize: conn?.optimize ?? true,
                    allowCache: conn?.allowCache ?? true,
                });
            }
        });
        this.dataSourceService.currentTreeData.subscribe(() => {
            const conn = this.dataSourceService.getConnectionType();
            this.connectionName = this.dataSourceService['_modelMetadata']?.getValue()?.model_name || '';
            this.connectionType = conn;
        });
    }

    goBack(): void {
        this.router.navigate(['/data-source/', this.id]);
    }

    async onSubmit(): Promise<void> {
        if (this.connectionType === 'excel') {
            await this.saveExcel();
        } else {
            await this.saveCsv();
        }
    }

    private async saveExcel(): Promise<void> {
        if (!Object.keys(this.excelFileData).length) {
            this.alertService.addError($localize`:@@noExcelFile:Debe cargar un archivo Excel primero`);
            return;
        }
        this.spinnerService.on();
        try {
            const fileData = {
                name: this.connectionName,
                fields: this.excelFileData,
                optimize: this.form.value.optimize,
                allowCache: this.form.value.allowCache,
                source_type: 'excel'
            };
            await lastValueFrom(this.excelFormatterService.updateCollectionFromJSON(this.id, fileData));
            this.alertService.addSuccess($localize`:@@UpdateModelSucess:Modelo actualizado correctamente`);
            this.router.navigate(['/data-source/', this.id]);
        } catch (err) {
            this.alertService.addError(err);
        } finally {
            this.spinnerService.off();
        }
    }

    private async saveCsv(): Promise<void> {
        if (!this.csvFileData || !this.csvFileData.length) {
            this.alertService.addError($localize`:@@noCsvData:Debe cargar un archivo CSV primero`);
            return;
        }
        this.spinnerService.on();
        try {
            const fileData = {
                name: this.connectionName,
                fields: this.csvFileData,
                optimize: this.form.value.optimize,
                allowCache: this.form.value.allowCache,
                columnsConfig: this.csvColumns,
                source_type: 'csv'
            };
            await lastValueFrom(this.excelFormatterService.updateCollectionFromJSON(this.id, fileData));
            this.alertService.addSuccess($localize`:@@UpdateModelSucess:Modelo actualizado correctamente`);
            this.router.navigate(['/data-source/', this.id]);
        } catch (err) {
            this.alertService.addError(err);
        } finally {
            this.spinnerService.off();
        }
    }

    // ─── File handling (Excel) ───────────────────────────────────────────────

    async excelFileLoaded(event: any): Promise<void> {
        const file = event.target.files[0];
        if (!file) return;
        this._excelFileName.set(file.name);
        try {
            const jsonData = await this.excelFormatterService.readExcelToJson(file);
            if (jsonData === null) {
                this.alertService.addError($localize`:@@ErrorExcel:Cargue un archivo .xls o .xlsx`);
            } else {
                this.excelFileData = jsonData;
            }
        } catch (err) {
            console.error('Error al leer el archivo Excel:', err);
        }
    }

    handleDrag(e: DragEvent): void { e.preventDefault(); e.stopPropagation(); }

    handleDragIn(e: DragEvent, type: 'excel' | 'csv'): void {
        e.preventDefault(); e.stopPropagation();
        type === 'excel' ? this.isDraggingExcelFile.set(true) : this.isDraggingCsvFile.set(true);
    }

    handleDragOut(e: DragEvent, type: 'excel' | 'csv'): void {
        e.preventDefault(); e.stopPropagation();
        type === 'excel' ? this.isDraggingExcelFile.set(false) : this.isDraggingCsvFile.set(false);
    }

    handleDrop(e: DragEvent, type: 'excel' | 'csv'): void {
        e.preventDefault(); e.stopPropagation();
        type === 'excel' ? this.isDraggingExcelFile.set(false) : this.isDraggingCsvFile.set(false);
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            if (type === 'excel') {
                this._excelFileName.set(files[0].name);
                this._excelFile.set(files[0]);
                this.excelFormatterService.readExcelToJson(files[0]).then(json => { if (json) this.excelFileData = json; });
            } else {
                this._csvFileName.set(files[0].name);
                this._csvFile.set(files[0]);
                this.parseCsv(files[0]);
            }
        }
    }

    handleFileSelect(e: Event, type: 'excel' | 'csv'): void {
        const input = e.target as HTMLInputElement;
        const files = input.files;
        if (files && files.length > 0) {
            if (type === 'excel') {
                this._excelFileName.set(files[0].name);
                this._excelFile.set(files[0]);
            } else {
                this._csvFileName.set(files[0].name);
                this._csvFile.set(files[0]);
            }
        }
    }

    // ─── File handling (CSV) ─────────────────────────────────────────────────

    async onFilesAdded(): Promise<void> {
        const file = this.fileInput?.nativeElement?.files?.[0];
        if (!file) return;
        await this.parseCsv(file);
    }

    async parseCsv(file: File): Promise<void> {
        const separator = this.form.get('separator')?.value || ';';
        try {
            this.csvRecords = await lastValueFrom(this.ngxCsvParser.parse(file, { header: true, delimiter: separator }));
            if (!this.csvRecords || !this.csvRecords.length) { this.csvColumns = []; this.csvFileData = []; return; }
            this.csvHeaders = Object.keys(this.csvRecords[0]);
            const types = this.getTypes(this.csvHeaders, this.csvRecords);
            this.csvFileData = this.csvRecords;
            this.csvColumns = [];
            this.csvHeaders.forEach((header: string, h: number) => {
                let row = { field: header };
                row[this.names[0]] = types[h];
                row[this.names[1]] = '';
                row[this.names[2]] = ',';
                this.csvColumns.push(row);
            });
            this.cdr.detectChanges();
        } catch (err) {
            console.error('Error parsing CSV:', err);
            this.csvColumns = []; this.csvFileData = [];
            this.alertService.addError($localize`:@@errorParseCsv2:Error al parsear el archivo CSV. Verifica el separador.`);
        }
    }

    async retryCsvWithNewSeparator(): Promise<void> {
        const file = this.fileInput?.nativeElement?.files?.[0];
        if (file) await this.parseCsv(file);
    }

    getTypes(headers: Array<string>, data: Array<{}>): string[] {
        const max_rows = Math.min(10000, data.length);
        const types = new Array(headers.length).fill('numeric');
        const nulls = new Array(headers.length).fill(true);
        const onlyNumbers = /^\d+$/;
        for (let i = 0; i < max_rows; i++) {
            headers.forEach((header, j) => {
                const value = data[i][header];
                if (value && !onlyNumbers.test(value)) { types[j] = 'text'; nulls[j] = false; }
                else if (value) { nulls[j] = false; }
            });
        }
        types.forEach((type, i) => { if (nulls[i]) types[i] = 'text'; });
        return types;
    }
}
