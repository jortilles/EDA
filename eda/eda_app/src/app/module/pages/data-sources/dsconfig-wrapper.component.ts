import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarService, DataSourceService, SpinnerService, AlertService, StyleProviderService, ExcelFormatterService } from '@eda/services/service.index';
import { UploadFileComponent } from './data-source-detail/upload-file/upload-file.component';
import { ConfirmationService } from 'primeng/api';
import Swal from 'sweetalert2';

@Component({
	selector: 'dsconfig-wrapper',
	templateUrl: './dsconfig-wrapper.component.html',

})
export class DsConfigWrapperComponent implements OnInit {

	@ViewChild('fileUploader', { static: false }) fileUploader: UploadFileComponent;
	@ViewChild('excelFile', { static: false }) excelFile: ElementRef<HTMLInputElement>;
	public dbTypes: any[] = [
		{ name: 'Postgres', value: 'postgres' },
		{ name: 'Sql Server', value: 'sqlserver' },
		{ name: 'MySQL', value: 'mysql' },
		{ name: 'Vertica', value: 'vertica' },
		/* SDA CUSTOM { name: 'Oracle', value: 'oracle' }, NO HAY CONEXION A ORACLE*/
		{ name: 'BigQuery', value: 'bigquery' },
		{ name: 'SnowFlake', value: 'snowflake' },
		{ name: 'jsonWebService', value: 'jsonwebservice' },
		{ name: 'Excel', value: 'excel' }

	];

	public sidOpts: any[] = [
		{ name: 'SID', value: 1 },
		{ name: 'SERVICE_NAME', value: 0 }
	];

	public form: UntypedFormGroup;
	public type: any;
	public name: string;
	public header: string = $localize`:@@DataModelHeader:Configurar nuevo orígen de datos`;
	public optimizeString: string = $localize`:@@OptimizeQuery:Optimizar consultas`;
	public allowCacheSTR: string = $localize`:@@allowCache: Habilitar caché`;
	public filterTooltip: string = $localize`:@@filterTooltip:Puedes añadir palabras separadas por comas, que se aplicarán como filtros de tipo LIKE a la hora de recuperar las tablas de tu base de datos`;
	public allowSSLSTR: string = $localize`:@@allowSSL:Conexión mediante SSL`;
	public excelFileName:string = "";
	public optimize: boolean = true;
	public allowCache: boolean = true;
	public ssl: boolean;
	private project_id: string;
	public  canBeClosed = false;
  	public uploading = false;
  	public uploadSuccessful = false;
	public excelFileData:JSON[] = [];
	 



	constructor(
		private formBuilder: UntypedFormBuilder,
		private sidebarService: SidebarService,
		private dataSourceService: DataSourceService,
		private spinnerService: SpinnerService,
		private alertService: AlertService,
		private router: Router,
		public styleProviderService: StyleProviderService,
		private excelFormatterService:ExcelFormatterService,
		private confirmationService:ConfirmationService
	) {

		this.form = this.formBuilder.group({
			name: [null, Validators.required],
			type: [null, Validators.required],
			host: [null],
			db: [null],
			port: [null],
			user: [null],
			password: [null],
			schema: [null],
			poolLimit: [null],
			sid: [{ name: 'SID', value: 1 }],
			warehouse: [null],
			optimize: [true],
			allowCache: [true],
			ssl: [false],
			filter: [null]
		});

	}

	ngOnInit(): void {
		this.styleProviderService.setDefaultBackgroundColor();

	}

    async switchTypes() {
        const type = this.form.value.type.value;
        if (this.form.invalid) { this.alertService.addError('Formulario incorrecto, revise los campos'); }
        else if (!['bigquery', 'excel'].includes(type)) {
            this.addDataSource();
        } else if (type === 'excel') {
            if (!this.form.value?.name) this.alertService.addError("No name provided");
            const checker = await this.checkExcelCollection();
            if (checker.existence) {
                this.confirmationService.confirm({
                    message: $localize`:@@confirmationExcelMessage:¿Estás seguro de que quieres sobreescribir este modelo de datos?`,
                    header: $localize`:@@confirmationExcel:Confirmación`,
                    acceptLabel: $localize`:@@si:Si`,
                    rejectLabel: $localize`:@@no:No`,
                    icon: 'pi pi-exclamation-triangle',
                    accept: () => this.sendJSONCollection(),
                })
            } else this.sendJSONCollection();
        }
        else {
            this.addBigQueryDataSource();
        }
    }

	public async addBigQueryDataSource(): Promise<void> {
		this.spinnerService.on();
		let connection = {
			name: this.form.value.name,
			type: this.form.value.type.value,
			database: this.form.value.db,
			project_id: this.project_id,
			optimize: this.form.value.optimize ? 1 : 0,
			allowCache: this.form.value.allowCache ? 1 : 0,
			filter: this.form.value.filter
		}

		try {
			await this.dataSourceService.testConnection(connection).toPromise();
			const res = await this.dataSourceService.addDataSource(connection).toPromise();
			let title = $localize`:@@DatadourceTitle:Fuente de datos: `
			Swal.fire({
				title: `${title} ${this.form.value.name}`,
				text: $localize`:@@DatasourceText:Creada correctamente`,
				icon: 'success'
			});
			this.reloadDataSources();
			this.spinnerService.off();
			this.router.navigate(['/data-source/', res.data_source_id]);
		} catch (err) {
			this.spinnerService.off();
			this.alertService.addError(err);
			throw err;
		}
	}

	public async addDataSource(): Promise<void> {
		this.spinnerService.on();

		let connection = {
			name: this.form.value.name,
			type: this.form.value.type.value,
			host: this.form.value.host,
			database: this.form.value.db,
			port: this.form.value.port,
			user: this.form.value.user,
			password: this.form.value.password,
			warehouse: this.form.value.warehouse,
			schema: this.form.value.schema,
			poolLimit: this.form.value.poolLimit,
			sid: this.form.value.sid.value,
			optimize: this.form.value.optimize ? 1 : 0,
			allowCache: this.form.value.allowCache ? 1 : 0,
			ssl: this.form.value.ssl ? true : false,
			filter: this.form.value.filter
		};

		try {
			await this.dataSourceService.testConnection(connection).toPromise();
			const res = await this.dataSourceService.addDataSource(connection).toPromise();
			let title = $localize`:@@DatadourceTitle:Fuente de datos: `;
			Swal.fire({
				title: `${title} ${this.form.value.name}`,
				text: $localize`:@@DatasourceText:Creada correctamente`,
				icon: 'success'
			});
			this.reloadDataSources();
			this.spinnerService.off();
			this.router.navigate(['/data-source/', res.data_source_id]);
		} catch (err) {
			this.spinnerService.off();
			this.alertService.addError(err);
			throw err;
		}
	}

	public async sendJSONCollection(): Promise<void> {
		this.spinnerService.on();
		if(!this.form.value?.name) this.alertService.addError("No name provided");
		if(Object.keys(this.excelFileData).length > 0 ){
			try {
				const fileData = 
				{
					name: this.form.value?.name,
					fields: this.excelFileData,
					optimize:this.form.value?.optimize,
					allowCache: this.form.value?.allowCache
				};
				const res = await this.excelFormatterService.addNewCollectionFromJSON(fileData).toPromise();

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

	public async checkExcelCollection():Promise<any>{
		try{
			const nameData = { name:this.form.value?.name}
			const existenceCheck = await this.excelFormatterService.checkExistenceFromJSON(nameData).toPromise();
    		return existenceCheck;
		}catch(error){
			console.log(error);
			return false;
		}
	}

	selectDefaultPort() {
		const type = this.form.value.type.value;
		switch (type) {
			case 'postgres':
				this.form.patchValue({ port: 5432 });
				break;
			case 'vertica':
				this.form.patchValue({ port: 5433 });
				break;
			case 'sqlserver':
				this.form.patchValue({ port: 1433 });
				break;
			case 'mongo': case 'excel':
				this.form.patchValue({ port: 27017 });
				break;
			case 'mysql':
				this.form.patchValue({ port: 3306 });
				break;
			case 'oracle':
				this.form.patchValue({ port: 1521 });
				break;
			default:
				this.form.patchValue({ port: null });
				break;
		}
	}

	reloadDataSources() {
		this.sidebarService.getDataSourceNames();
	}

	goToDataSource(datasource) {
		if (datasource) {
			this.router.navigate(['/data-source/', datasource._id]);
		} else {
			this.alertService.addError($localize`:@@ErrorMessage:Ha ocurrido un error`);
		}
	}

	fileLoaded() {

		this.project_id = this.fileUploader.currentFile.file.project_id;


	}

	addExcelFile() {
		this.excelFile.nativeElement.value = "";
		this.excelFile.nativeElement.click();
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
	  
	

}