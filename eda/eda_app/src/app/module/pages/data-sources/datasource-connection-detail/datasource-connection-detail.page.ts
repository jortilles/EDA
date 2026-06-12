import { Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DataSourceService, SpinnerService, AlertService, StyleProviderService, ExcelFormatterService, UploadFileService } from '@eda/services/service.index';
import { SharedModule, SelectItem } from 'primeng/api';
import Swal from 'sweetalert2';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { UploadFileComponent } from '../../data-sources/data-source-detail/upload-file/upload-file.component';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { lastValueFrom } from 'rxjs';
import { NgxCsvParser } from 'ngx-csv-parser';
import { ChangeDetectorRef } from '@angular/core';
import { DATASOURCE_PLUGINS } from '../datasource-plugins/datasource-plugin-registry';
import { PluginFormService } from '../datasource-plugins/plugin-form.service';

import { DropdownModule } from 'primeng/dropdown';
import { HoldedFormComponent } from '../datasource-plugins/holded/holded-form.component';
import { PluginFormService } from '../datasource-plugins/plugin-form.service';

@Component({
  standalone: true,
  selector: 'app-datasource-connection-detail',
  templateUrl: './datasource-connection-detail.page.html',
  styleUrls: ['./datasource-connection-detail.page.css'],
  imports: [SharedModule, CommonModule, FormsModule, ReactiveFormsModule, IconComponent, DropdownModule, NgComponentOutlet]
})
export class DataSourceConnectionDetailPage implements OnInit {
  private uploadFileService  = inject(UploadFileService);
  private pluginFormService  = inject(PluginFormService);

  @ViewChild('fileUploader', { static: false }) fileUploader: UploadFileComponent;
  @ViewChild('excelFile', { static: false }) excelFile: ElementRef<HTMLInputElement>;
  @ViewChild('file') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('duckdbFile') duckdbFileInput!: ElementRef<HTMLInputElement>;

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
    { label: 'ClickHouse', value: 'clickhouse', port: 8123 },
    { label: 'jsonWebService', value: 'jsonwebservice' },
    { label: 'Mongo', value: 'mongo', port: 27017 },
    { label: 'Excel', value: 'excel', port: 27017 },
    { label: 'Csv', value: 'csv', port: 27017 },
    { label: 'DuckDB (CSV)', value: 'duckdb' },
    { label: 'Odoo', value: 'odoo', port: null },
    { label: 'Google Analytics 4', value: 'googleanalytics', port: null },
    { label: 'Holded', value: 'holded', port: null },
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
  _duckdbFileName = signal<string>('');
  _duckdbFile = signal<File | null>(null);
  isDraggingDuckDbFile = signal<boolean>(false);
  public duckdbRawContent: string = '';
  public duckdbCsvList: Array<{ fileName: string; rawContent: string; columnsConfig: any[] }> = [];
  public duckdbFolderOptions: Array<{ label: string; value: string }> = [];
  public selectedDuckdbFolder: string = '__new__';
  duckdbFolderExists = signal<boolean>(false);

  readonly datasourcePlugins = DATASOURCE_PLUGINS;

  get activePlugin() {
      const type = this.connectionForm?.get('type')?.value;
      return DATASOURCE_PLUGINS.find(p => p.type === type) ?? null;
  }

  get pluginFormInputs() {
      return { connectionForm: this.connectionForm };
  }

  // Variables added by the add-csv script
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
    private cdr: ChangeDetectorRef,
    private pluginFormService: PluginFormService,
  ) {


    this.names = ['type', 'format', 'separator'];

    this.dataTypes = [
      { label: 'text', value: 'text' },
      { label: 'integer', value: "integer" },
      { label: 'numeric', value: "numeric" },
      { label: 'coordinate', value: "coordinate" },
      { label: 'html', value: "html" },
      { label: 'boolean', value: "boolean" },
      { label: 'date', value: "timestamp" },
    ];

    this.editFieldsHeaders = [$localize`:@@csvField:Campo`, $localize`:@@type:Tipo`, $localize`:@@dateFormatH4:Formato`, $localize`:@@csvSep:Separador Decimal`];

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
    this.loadDuckDbFolders();
  }

  initForm(): void {
    this.connectionForm = this.fb.group({
      name: ["", Validators.required],
      description: [""],
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
      folderName: [""],
    })
  }

  setActiveTab(tab: "basic" | "advanced"): void {
    this.activeTab = tab
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword
  }

  // Helper to mark all fields as touched (for validation)
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

    if (this.activePlugin) {
      this.pluginFormService.triggerSave();
    } else if (this.connectionForm.invalid && !['excel', 'bigquery', 'csv', 'duckdb'].includes(type)) {
      this.alertService.addError($localize`:@@IncorrectForm:Formulario incorrecto. Revise los campos obligatorios.`);
    } else if (type === 'excel') {
      this.saveExcelDataSource();
    } else if (type === 'csv') {
      this.saveCsvDataSource();
    } else if (type === 'duckdb') {
      this.saveDuckDbDataSource();
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
        const result = await Swal.fire({
          title: $localize`:@@confirmationExcel:Confirmación`,
          text: $localize`:@@confirmationExcelMessage:¿Estás seguro de que quieres sobreescribir este modelo de datos?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: $localize`:@@si:Si`,
          cancelButtonText: $localize`:@@no:No`,
        });
        if (result.isConfirmed) {
          this.saveJSONCollection();
        }
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
        const result = await Swal.fire({
          title: $localize`:@@confirmationExcel:Confirmación`,
          text: $localize`:@@confirmationExcelMessage:¿Estás seguro de que quieres sobreescribir este modelo de datos?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: $localize`:@@si:Si`,
          cancelButtonText: $localize`:@@no:No`,
        });
        if (result.isConfirmed) {
          this.saveCsvJSONCollection();
        }
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
      description: value.description || '',
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
          description: value.description || '',
          fields: this.excelFileData,
          optimize: value.optimize,
          allowCache: value.allowCache,
          source_type: 'excel'
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
      this.spinnerService.off();
      this.alertService.addError($localize`:@@noNameProvided:Debe proporcionar un nombre para el datasource`);
    } else if (!this.csvFileData || this.csvFileData.length === 0) {
      this.spinnerService.off();
      this.alertService.addError($localize`:@@noCsvData:Debe cargar un archivo CSV primero`);
    } else if (!this.csvColumns || this.csvColumns.length === 0) {
      this.spinnerService.off();
      this.alertService.addError($localize`:@@noCsvColumns:No se detectaron columnas en el archivo CSV. Verifique el separador.`);
    } else {
      try {
        const fileData = {
          name: value.name,
          description: value.description || '',
          fields: this.csvFileData,
          optimize: value.optimize,
          allowCache: value.allowCache,
          columnsConfig: this.csvColumns,
          source_type: 'csv'
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

  async loadDuckDbFolders(): Promise<void> {
    try {
      const res = await lastValueFrom(this.dataSourceService.getDuckDbFolders());
      const folders: string[] = res?.folders || [];
      this.duckdbFolderOptions = folders.map(f => ({ label: f, value: f }));
    } catch (e) {
      this.duckdbFolderOptions = [];
    }
  }

  onFolderNameInput(event: Event): void {
    const typed = ((event.target as HTMLInputElement).value || '').trim().toLowerCase();
    const exists = this.duckdbFolderOptions.some(f => f.value.toLowerCase() === typed);
    this.duckdbFolderExists.set(exists);
  }

  onFolderOptionChange(event: any): void {
    if (event.value !== '__new__') {
      this.connectionForm.get('folderName')?.setValue(event.value);
    } else {
      this.connectionForm.get('folderName')?.setValue('');
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

  // Drag & drop event handling methods
  handleDrag(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  handleDragIn(e: DragEvent, type: 'bigquery' | 'excel' | 'csv' | 'duckdb') {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'bigquery') {
      this.isDraggingBigQueryFile.set(true);
    } else if (type === 'duckdb') {
      this.isDraggingDuckDbFile.set(true);
    } else {
      this.isDraggingExcelFile.set(true);
    }
  }

  handleDragOut(e: DragEvent, type: 'bigquery' | 'excel' | 'csv' | 'duckdb') {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'bigquery') {
      this.isDraggingBigQueryFile.set(false);
    } else if (type === 'duckdb') {
      this.isDraggingDuckDbFile.set(false);
    } else {
      this.isDraggingExcelFile.set(false);
    }
  }

  handleDrop(e: DragEvent, type: 'bigquery' | 'excel' | 'csv' | 'duckdb') {
    e.preventDefault();
    e.stopPropagation();

    if (type === 'bigquery') {
      this.isDraggingBigQueryFile.set(false);
    } else if (type === 'duckdb') {
      this.isDraggingDuckDbFile.set(false);
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

  handleFileSelect(e: Event, type: 'bigquery' | 'excel' | 'csv' | 'duckdb') {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.handleFiles(files[0], type);
    }
  }

  async retryCsvWithNewSeparator() {
    const input = this.fileInput?.nativeElement;
    if (!input) {
      return;
    }

    const files = input.files;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];

    // Get the form delimiter
    const separator = this.connectionForm.get('separator')?.value || ';';

    try {
      // Re-parse the CSV with the new delimiter
      this.csvRecords = await lastValueFrom(this.ngxCsvParser.parse(file, { header: true, delimiter: separator }));

      if (!this.csvRecords || this.csvRecords.length === 0) {
        this.alertService.addError($localize`:@@emptyCsvFile:El archivo CSV está vacío o no se pudo leer con este separador`);
        return;
      }

      this.csvHeaders = Object.keys(this.csvRecords[0]);
      const types = this.getTypes(this.csvHeaders, this.csvRecords);
      this.csvFileData = this.csvRecords;
      this.csvColumns = [];
      this.csvHeaders.forEach((header: string, h: number) => {
        let row = { field: header };
        for (let i = 0; i < 3; i++) {
          if (i === 0) {
            row[this.names[i]] = types[h]; // type
          } else if (i === 1) {
            row[this.names[i]] = ''; // format
          } else {
            row[this.names[i]] = ','; // Default decimal separator (comma)
          }
        }
        this.csvColumns.push(row);
      });
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error parsing CSV:', err);
      this.alertService.addError($localize`:@@errorParseCsv:Error al parsear el archivo CSV con el separador especificado`);
    }
  }

  async parseCsv(file: File) {
    const separator = this.connectionForm.get('separator')?.value || ';';

    try {
      // Parse with ngxCsvParser to maintain consistency
      this.csvRecords = await lastValueFrom(this.ngxCsvParser.parse(file, { header: true, delimiter: separator }));

      if (!this.csvRecords || this.csvRecords.length === 0) {
        this.csvColumns = [];
        this.csvFileData = [];
        return;
      }

      this.csvHeaders = Object.keys(this.csvRecords[0]);
      const types = this.getTypes(this.csvHeaders, this.csvRecords);
      this.csvFileData = this.csvRecords;
      this.csvColumns = [];

      this.csvHeaders.forEach((header: string, h: number) => {
        let row = { field: header };
        for (let i = 0; i < 3; i++) {
          if (i === 0) {
            row[this.names[i]] = types[h]; // type
          } else if (i === 1) {
            row[this.names[i]] = ''; // format
          } else {
            row[this.names[i]] = ','; // Default decimal separator (comma)
          }
        }
        this.csvColumns.push(row);
      });

      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error parsing CSV:', err);
      this.csvColumns = [];
      this.csvFileData = [];
      this.alertService.addError($localize`:@@errorParseCsv2:Error al parsear el archivo CSV. Verifica el separador.`);
    }
  }

  handleFiles(file: File, type: 'bigquery' | 'excel' | 'csv' | 'duckdb') {
    if (type === 'bigquery') {
      this.bigQueryFileName.set(file.name);
      this.bigQueryFile.set(file);
    } else if (type === 'excel') {
      this._excelFileName.set(file.name);
      this._excelFile.set(file);
    } else if (type === 'csv') {
      this._csvFileName.set(file.name);
      this._csvFile.set(file);
    } else if (type === 'duckdb') {
      this._duckdbFileName.set(file.name);
      this._duckdbFile.set(file);
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
    if (!file) {
      return;
    }

    try {
      // Get the form delimiter (do not overwrite if it already exists)
      const separator = this.connectionForm.get('separator')?.value || ';';

      this.csvRecords = await lastValueFrom(this.ngxCsvParser.parse(file, { header: true, delimiter: separator }));

      if (!this.csvRecords || this.csvRecords.length === 0) {
        this.alertService.addError($localize`:@@emptyCsvFile2:El archivo CSV está vacío o no se pudo leer`);
        return;
      }

      this.csvHeaders = Object.keys(this.csvRecords[0]);
      const types = this.getTypes(this.csvHeaders, this.csvRecords);
      this.csvFileData = this.csvRecords;
      this.csvColumns = [];

      this.csvHeaders.forEach((header: string, h: number) => {
        let row = { field: header };
        for (let i = 0; i < 3; i++) {
          if (i === 0) {
            row[this.names[i]] = types[h]; // type
          } else if (i === 1) {
            row[this.names[i]] = ''; // format
          } else {
            row[this.names[i]] = ','; // Default decimal separator (comma)
          }
        }
        this.csvColumns.push(row);
      });

      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error parsing CSV:', err);
      this.alertService.addError($localize`:@@errorParseCsv3:Error al parsear el archivo CSV. Verifique el separador y formato del archivo.`);
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

  async onDuckDbFilesAdded() {
    const input = this.duckdbFileInput?.nativeElement;
    if (!input) return;
    const files = input.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    this._duckdbFileName.set(file.name);
    this._duckdbFile.set(file);

    this.duckdbRawContent = await file.text();
    await this.parseDuckDbFile(file);
  }

  async retryCsvWithNewSeparatorForDuckDb() {
    const input = this.duckdbFileInput?.nativeElement;
    if (!input) return;
    const files = input.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    this.duckdbRawContent = await file.text();
    await this.parseDuckDbFile(file);
  }

  private async parseDuckDbFile(file: File) {
    const separator = this.connectionForm.get('separator')?.value || ';';
    try {
      this.csvRecords = await lastValueFrom(this.ngxCsvParser.parse(file, { header: true, delimiter: separator }));
      if (!this.csvRecords || this.csvRecords.length === 0) {
        this.csvColumns = [];
        this.cdr.detectChanges();
        return;
      }
      this.csvHeaders = Object.keys(this.csvRecords[0]);
      const types = this.getTypes(this.csvHeaders, this.csvRecords);
      this.csvColumns = [];
      this.csvHeaders.forEach((header: string, h: number) => {
        const row: any = { field: header };
        row[this.names[0]] = types[h];
        row[this.names[1]] = '';
        row[this.names[2]] = ',';
        this.csvColumns.push(row);
      });
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error parsing DuckDB CSV:', err);
      this.csvColumns = [];
      this.csvFileData = [];
      this.alertService.addError($localize`:@@errorParseDuckDb:Error al parsear el archivo CSV. Verifica el separador.`);
    }
  }

  addCsvToList(): void {
    if (!this.duckdbRawContent || !this.csvColumns || this.csvColumns.length === 0) {
      this.alertService.addError($localize`:@@noDuckDbFile:Debe cargar un archivo CSV primero`);
      return;
    }
    this.duckdbCsvList.push({
      fileName: this._duckdbFileName(),
      rawContent: this.duckdbRawContent,
      columnsConfig: [...this.csvColumns]
    });
    this.duckdbRawContent = '';
    this._duckdbFileName.set('');
    this._duckdbFile.set(null);
    this.csvColumns = [];
    this.csvHeaders = [];
    if (this.duckdbFileInput?.nativeElement) {
      this.duckdbFileInput.nativeElement.value = '';
    }
    this.cdr.detectChanges();
  }

  removeCsvFromList(index: number): void {
    this.duckdbCsvList.splice(index, 1);
  }

  async saveDuckDbDataSource(): Promise<void> {
    const value = this.connectionForm.value;
    if (!value.name) {
      this.alertService.addError($localize`:@@noNameProvided:Debe proporcionar un nombre para el datasource`);
      return;
    }
    if (!value.folderName) {
      this.alertService.addError($localize`:@@noFolderName:Debe proporcionar el nombre de la carpeta`);
      return;
    }

    const allCsvs = [...this.duckdbCsvList];
    if (this.duckdbRawContent && this.csvColumns && this.csvColumns.length > 0) {
      allCsvs.push({
        fileName: this._duckdbFileName(),
        rawContent: this.duckdbRawContent,
        columnsConfig: [...this.csvColumns]
      });
    }

    if (allCsvs.length === 0) {
      this.alertService.addError($localize`:@@noDuckDbFile:Debe cargar un archivo CSV primero`);
      return;
    }

    this.spinnerService.on();
    try {
      const payload = {
        name: value.name,
        description: value.description || '',
        folderName: value.folderName,
        csvFiles: allCsvs.map(csv => ({
          fileName: csv.fileName,
          csvContent: csv.rawContent,
          columnsConfig: csv.columnsConfig
        })),
        optimize: value.optimize ? 1 : 0,
        allowCache: value.allowCache ? 1 : 0
      };

      const res = await lastValueFrom(this.excelFormatterService.addDuckDBDataSource(payload));
      this.spinnerService.off();
      this.alertService.addSuccess($localize`:@@duckdbCreated:Fuente de datos DuckDB creada correctamente`);
      this.router.navigate(['/data-source/', res.data_source_id]);
    } catch (err) {
      this.spinnerService.off();
      this.alertService.addError(err);
      throw err;
    }
  }
































}