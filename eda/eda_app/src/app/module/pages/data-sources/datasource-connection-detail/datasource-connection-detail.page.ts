import { Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DataSourceService, SpinnerService, AlertService, StyleProviderService, ExcelFormatterService, UploadFileService } from '@eda/services/service.index';
import { ConfirmationService, SharedModule, SelectItem } from 'primeng/api';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { UploadFileComponent } from '../../data-sources/data-source-detail/upload-file/upload-file.component';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { lastValueFrom } from 'rxjs';
import { NgxCsvParser } from 'ngx-csv-parser';
import { ChangeDetectorRef } from '@angular/core';


import { DropdownModule } from 'primeng/dropdown';

@Component({
  standalone: true,
  selector: 'app-datasource-connection-detail',
  templateUrl: './datasource-connection-detail.page.html',
  imports: [SharedModule, CommonModule, FormsModule, ReactiveFormsModule, IconComponent, DropdownModule]
})
export class DataSourceConnectionDetailPage implements OnInit {
  private uploadFileService = inject(UploadFileService);
  private confirmationService = inject(ConfirmationService);

  @ViewChild('fileUploader', { static: false }) fileUploader: UploadFileComponent;
  @ViewChild('excelFile', { static: false }) excelFile: ElementRef<HTMLInputElement>;
  @ViewChild('file') fileInput!: ElementRef<HTMLInputElement>;

  public header: string = $localize`:@@DataModelHeader:Configurar nueva fuente de datos`;
  public header2 = true;
  public optimizeString: string = $localize`:@@optimizedQueries:Optimizar consultas`;
  public allowCacheSTR: string = $localize`:@@enableCache: Habilitar caché`;
  public filterTooltip: string = $localize`:@@filterTooltip:Puedes añadir palabras separadas por comas, que se aplicarán como filtros de tipo LIKE a la hora de recuperar las tablas de tu base de datos`;
  public allowSSLSTR: string = $localize`:@@allowSSL:Conexión mediante SSL`;

  public title = $localize`:@@addTableTitle:Añadir Tabla`;
  @ViewChild('file', { static: false }) file: { nativeElement: { files: { [key: string]: File; }; value: string; click: () => void; }; };

  public excelFileName: string = "";
  public csvFileName: string = "";

  public canBeClosed = false;
  public uploading = false;
  public uploadSuccessful = false;
  public excelFileData: JSON[] = [];
  public csvFileData: JSON[] = [];


  connectionForm!: FormGroup
  activeTab: "basic" | "advanced" = "basic"
  showPassword = false

  public databaseTypes: any[] = [
    { label: 'Postgres', value: 'postgres', port: 5432 },
    { label: 'Sql Server', value: 'sqlserver', port: 1433 },
    { label: 'MySQL', value: 'mysql', port: 3306 },
    { label: 'Vertica', value: 'vertica', port: 5433 },
    { label: 'Oracle', value: 'oracle', port: 1521 },
    { label: 'BigQuery', value: 'bigquery', port: null },
    { label: 'SnowFlake', value: 'snowflake', port: null },
    { label: 'jsonWebService', value: 'jsonwebservice' },
    { label: 'Mongo', value: 'mongo', port: 27017 },
    { label: 'Excel', value: 'excel', port: 27017 },
    { label: 'Csv', value: 'csv', port: 27017 },
  ];

  public sidOptions: any[] = [
    { label: 'SID', value: 1 },
    { label: 'SERVICE_NAME', value: 0 }
  ];

  public bigQueryProjectId: any;

  bigQueryFile = signal<File | null>(null);
  bigQueryFileName = signal<string>('');
  isDraggingBigQueryFile = signal<boolean>(false);
  _excelFile = signal<File | null>(null);
  _csvFile = signal<File | null>(null);
  _excelFileName = signal<string>('');
  _csvFileName = signal<string>('');
  isDraggingExcelFile = signal<boolean>(false);
  isDraggingCsvFile = signal<boolean>(false);

  // variables añadidas ppor el script add-ccsv
  public csvRecords: any;
  public csvHeaders: any;
  public csvColumns: any = [];
  public delimiter: string;
  public decDelimiter: string;
  public tableName: string;
  public dataTypes: SelectItem[];
  public dataFormats: SelectItem[];
  public decSeparators: SelectItem[];
  public editFieldsHeaders: Array<string>;
  public names: Array<string>;
  public tableAdded: boolean = false;

  constructor(
    private router: Router,
    private dataSourceService: DataSourceService,
    private spinnerService: SpinnerService,
    private alertService: AlertService,
    public styleProviderService: StyleProviderService,
    private excelFormatterService: ExcelFormatterService,
    private ngxCsvParser: NgxCsvParser,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {


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

  ngOnInit(): void {
    this.styleProviderService.setDefaultBackgroundColor();
    this.initForm();
  }

  initForm(): void {
    this.connectionForm = this.fb.group({
      name: ["", Validators.required],
      type: ["postgres", Validators.required],
      host: ["", Validators.required],
      database: ["", Validators.required],
      schema: [""],
      port: ["5432", Validators.required],
      user: ["", Validators.required],
      password: ["••••••", Validators.required],
      filter: [""],
      optimize: [true],
      allowCache: [true],
      ssl: [false],
      sid: [1],
      poolLimit: [],
      warehouse: [],
      separator: [";"],
    })
  }

  setActiveTab(tab: "basic" | "advanced"): void {
    this.activeTab = tab
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword
  }

  // Helper para marcar todos los campos como tocados (para validación)
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched()
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup)
      }
    })
  }

  async onSubmit() {
    const type = this.connectionForm.get('type')?.value;

    if (this.connectionForm.invalid && type !== 'excel' && type !== 'bigquery' && type !== 'csv') {
      this.alertService.addError($localize`:@@IncorrectForm:Formulario incorrecto. Revise los campos obligatorios.`);
    } else if (type === 'excel') {
      this.saveExcelDataSource();
    } else if (type === 'csv') {
      this.saveCsvDataSource();
    } else if (type === 'bigquery') {
      this.saveBigQueryDataSource();
    } else {
      this.saveDataSource();
    }
  }

  public async testConnection() {
    try {
      this.spinnerService.on();

      if (this.connectionForm.invalid) {
        this.alertService.addError($localize`:@@IncorrectForm:Formulario incorrecto. Revise los campos obligatorios.`);
      } else {
        await lastValueFrom(this.dataSourceService.testConnection(this.connectionForm.value));
        this.alertService.addSuccess($localize`:@@connectedWithServer:Conectado con el servidor`);
      }
    } catch (err) {
      this.alertService.addError($localize`:@@dsConnectionRefused:No se ha podido conectar a la base de datos.`);

      throw err;
    } finally {
      this.spinnerService.off();
    }
  }

  public async saveExcelDataSource(): Promise<void> {
    const value = this.connectionForm.value;

    if (!value.name) {
      this.alertService.addError("No name provided");
    } else {
      const checker = await this.checkExcelCollection();
      if (checker.existence) {
        this.confirmationService.confirm({
          message: $localize`:@@confirmationExcelMessage:¿Estás seguro de que quieres sobreescribir este modelo de datos?`,
          header: $localize`:@@confirmationExcel:Confirmación`,
          acceptLabel: $localize`:@@si:Si`,
          rejectLabel: $localize`:@@no:No`,
          icon: 'pi pi-exclamation-triangle',
          accept: () => this.saveJSONCollection(),
        })
      } else {
        this.saveJSONCollection();
      }
    }
  }

  public async saveCsvDataSource(): Promise<void> {
    const value = this.connectionForm.value;
    if (!value.name) {
      this.alertService.addError("No name provided");
    } else {
      const checker = await this.checkExcelCollection();
      if (checker.existence) {
        this.confirmationService.confirm({
          message: $localize`:@@confirmationExcelMessage:¿Estás seguro de que quieres sobreescribir este modelo de datos?`,
          header: $localize`:@@confirmationExcel:Confirmación`,
          acceptLabel: $localize`:@@si:Si`,
          rejectLabel: $localize`:@@no:No`,
          icon: 'pi pi-exclamation-triangle',
          accept: () => this.saveCsvJSONCollection(),
        })
      } else {
        this.saveCsvJSONCollection();
      }
    }
  }

  public async saveBigQueryDataSource(): Promise<void> {
    this.spinnerService.on();
    const value = this.connectionForm.value;

    const connection = {
      name: value.name,
      type: value.type,
      database: value.database,
      project_id: this.bigQueryProjectId,
      optimize: value.optimize,
      allowCache: value.allowCache,
      filter: value.filter
    }

    try {
      await lastValueFrom(this.dataSourceService.testConnection(connection));

      const res = await lastValueFrom(this.dataSourceService.addDataSource(connection));
      const title = $localize`:@@DatadourceTitle:Fuente de datos: `;

      Swal.fire({
        title: `${title} ${connection.name}`,
        text: $localize`:@@DatasourceText:Creada correctamente`,
        icon: 'success'
      });

      this.spinnerService.off();
      this.router.navigate(['/data-source/', res.data_source_id]);
    } catch (err) {
      this.spinnerService.off();
      this.alertService.addError(err);
      throw err;
    }
  }

  public async saveDataSource(): Promise<void> {
    this.spinnerService.on();

    const connection = this.connectionForm.value;

    try {
      await lastValueFrom(this.dataSourceService.testConnection(connection));

      const res = await lastValueFrom(this.dataSourceService.addDataSource(connection));
      const title = $localize`:@@DatadourceTitle:Fuente de datos: `;

      Swal.fire({
        title: `${title} ${connection.name}`,
        text: $localize`:@@DatasourceText:Creada correctamente`,
        icon: 'success'
      });

      this.spinnerService.off();
      this.router.navigate(['/data-source/', res.data_source_id]);
    } catch (err) {
      this.spinnerService.off();
      this.alertService.addError(err);
      throw err;
    }
  }

  public async saveJSONCollection(): Promise<void> {
    this.spinnerService.on();

    const value = this.connectionForm.value;

    if (!value.name) {
      this.alertService.addError("No name provided");
    } else if (Object.keys(this.excelFileData).length > 0) {
      try {
        const fileData = {
          name: value.name,
          fields: this.excelFileData,
          optimize: value.optimize,
          allowCache: value.allowCache
        };

        const res = await lastValueFrom(this.excelFormatterService.addNewCollectionFromJSON(fileData));

        this.spinnerService.off();
        this.alertService.addSuccess($localize`:@@CollectionText:Colección creada correctamente`,);
        this.router.navigate(['/data-source/', res.data_source_id]);
      } catch (err) {
        this.spinnerService.off();
        this.alertService.addError(err);
        throw err;
      }
    }
  }

  public async saveCsvJSONCollection(): Promise<void> {
    this.spinnerService.on();

    const value = this.connectionForm.value;
    if (!value.name) {
      this.alertService.addError("No name provided");
    } else if (Object.keys(this.csvFileData).length > 0) {
      try {
        const fileData = {
          name: value.name,
          fields: this.csvFileData,
          optimize: value.optimize,
          allowCache: value.allowCache
        };

        const res = await lastValueFrom(this.excelFormatterService.addNewCollectionFromJSON(fileData));

        this.spinnerService.off();
        this.alertService.addSuccess($localize`:@@CollectionText:Colección creada correctamente`,);
        this.router.navigate(['/data-source/', res.data_source_id]);
      } catch (err) {
        this.spinnerService.off();
        this.alertService.addError(err);
        throw err;
      }
    }
  }

  public async checkExcelCollection(): Promise<any> {
    try {
      const nameData = { name: this.connectionForm.get('name')?.value }
      const existenceCheck = await this.excelFormatterService.checkExistenceFromJSON(nameData).toPromise();
      return existenceCheck;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  selectDefaultPort() {
    const value = this.connectionForm.get('type')?.value;
    const type = this.databaseTypes.find((t) => t.value === value);

    this.connectionForm.get('port')?.setValue(type.port);
  }

  async excelFileLoaded(event: any) {
    const file = event.target.files[0];

    if (file) {
      this.excelFileName = file.name;
      try {
        const jsonData = await this.excelFormatterService.readExcelToJson(file);

        jsonData === null ? this.alertService.addError($localize`:@@ErrorExcel:Cargue un archivo .xls o .xlsx`) : this.excelFileData = jsonData;
      } catch (error) {
        console.error('Error al leer el archivo Excel:', error);
      }
    }
  }

  async csvFileLoaded(event: any) {
    const file = event.target.files[0];

    if (file) {
      this.csvFileName = file.name;
      try {
        const jsonData = await this.excelFormatterService.readExcelToJson(file);

        jsonData === null ? this.alertService.addError('Cargue un archivo .csv') : this.csvRecords = jsonData;
        this.csvFileData = this.csvRecords;
      } catch (error) {
        console.error('Error al leer el archivo csv:', error);
      }
    }
  }

  // Métodos para manejar eventos de drag & drop
  handleDrag(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  handleDragIn(e: DragEvent, type: 'bigquery' | 'excel' | 'csv') {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'bigquery') {
      this.isDraggingBigQueryFile.set(true);
    } else {
      this.isDraggingExcelFile.set(true);
    }
  }

  handleDragOut(e: DragEvent, type: 'bigquery' | 'excel' | 'csv') {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'bigquery') {
      this.isDraggingBigQueryFile.set(false);
    } else {
      this.isDraggingExcelFile.set(false);
    }
  }

  handleDrop(e: DragEvent, type: 'bigquery' | 'excel' | 'csv') {
    e.preventDefault();
    e.stopPropagation();

    if (type === 'bigquery') {
      this.isDraggingBigQueryFile.set(false);
    } else {
      this.isDraggingExcelFile.set(false);
    }

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.bigQueryFileName.set(file.name);
      this.bigQueryFile.set(file);
    }
  }

  handleFileSelect(e: Event, type: 'bigquery' | 'excel' | 'csv') {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.handleFiles(files[0], type);
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

  parseCsv(file: File) {
    const separator = this.connectionForm.get('separator')?.value || ';';
    const reader = new FileReader();

    reader.onload = () => {
      const text = reader.result as string;

      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      if (lines.length === 0) {
        this.csvColumns = [];
        return;
      }

      const headers = lines[0].split(separator);

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

  handleFiles(file: File, type: 'bigquery' | 'excel' | 'csv') {
    if (type === 'bigquery') {
      this.bigQueryFileName.set(file.name);
      this.bigQueryFile.set(file);
    } else if (type === 'excel') {
      this._excelFileName.set(file.name);
      this._excelFile.set(file);
    } else if (type === 'csv') {
      this._csvFileName.set(file.name);
      this._csvFile.set(file);
    }
  }

  async handleBigQueryImport() {
    if (!this.bigQueryFile()) {
      this.alertService.addError($localize`:@@selectFileImport:Por favor selecciona un archivo para importar`)
      return;
    }

    const data: any = await lastValueFrom(this.uploadFileService.upload(this.bigQueryFile(), '/global/upload/bigqueryCredentials'));
    this.bigQueryProjectId = data?.file?.project_id;
  }

  async onFilesAdded() {
    const file = this.file.nativeElement.files[0];
    try {
      // Si no tiene separador le añado para que no salte un error
      if(!this.delimiter)
        this.delimiter = ';';
      this.csvRecords = await this.ngxCsvParser.parse(file, { header: true, delimiter: this.delimiter }).pipe().toPromise();
      this.csvHeaders = Object.keys(this.csvRecords[0]);
      const types = this.getTypes(this.csvHeaders, this.csvRecords);
      this.csvFileData = this.csvRecords;
      this.csvHeaders.forEach((header, h) => {
        let row = { field: header };
        for (let i = 0; i < 3; i++) {
          row[this.names[i]] = i === 0 ? types[h] : '';
        }
        this.csvColumns = [];
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
        } else if (value) {
          nulls[j] = false;
        }
      });
    }
    types.forEach((type, i) => {
      if (nulls[i]) types[i] = 'text';
    });
    return types;
  }

  loadFile() {
    this.csvHeaders = [];
    this.csvColumns = [];
    this.file.nativeElement.value = "";
    this.file.nativeElement.click();
  }
































}